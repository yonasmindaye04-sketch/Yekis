import type { KycDocumentType, KycStatus, KycTier } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import { uploadKycDocument, getKycDocumentUrl } from "../../lib/objectStore.js";
import { verifyWithFayda } from "./fayda.client.js";
import {
  screenForPep,
  PepProviderUnavailableError,
} from "./pep.client.js";
import { logger } from "../../lib/logger.js";
import { randomBytes } from "node:crypto";
import { redis } from "../../lib/redis.js";
import * as esignet from "./esignet.client.js";
import { env } from "../../config/env.js";

export class DuplicateIdentityError extends Error {}
export class KycNotFoundError extends Error {}
export class InvalidTierTransitionError extends Error {}

const REVIEW_CYCLE_MONTHS = 12; // periodic refresh cadence for Tier 2/3 — confirm exact cadence with counsel

function monthsFromNow(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Cache values to write when a record enters manual review.
 *
 * A user with prior verified standing keeps their public badge while a *new*
 * application waits for a Compliance Officer — the cache tracks their actual
 * standing, not the newest request. Only a first-time applicant (no
 * highestVerifiedTier) genuinely has nothing to show, so only they regress.
 */
function cacheDataForPendingReview(kyc: { highestVerifiedTier: KycTier | null }) {
  return kyc.highestVerifiedTier
    ? {}
    : { cachedKycStatus: "UNDER_REVIEW" as const };
}

/**
 * Step 1: a user submits a KYC document (ID, passport, selfie, etc).
 *
 * Tier 1 policy: auto-verify only when Fayda actually answers affirmatively
 * and the resulting biometric ID isn't already attached to another account.
 * Everything else routes to manual review and alerts staff:
 *
 *  - Fayda UNAVAILABLE (down / timeout / 5xx) → UNDER_REVIEW. No evidence was
 *    returned, so neither approving nor denying is defensible.
 *  - Fayda REJECTED / NOT_FOUND → UNDER_REVIEW. A definitive non-match is not
 *    ours to adjudicate; a Compliance Officer sees the reason.
 *  - Dedup hit → UNDER_REVIEW, flagged. A stale or reused biometric ID must
 *    not silently lock out a legitimate user.
 *  - Resubmission after a prior rejection → reopened to UNDER_REVIEW.
 *
 * Every one of these paths calls notifyStaffOfEvent, which is what makes the
 * case actually surface in the Ops console queue.
 */
export async function submitKycDocument(params: {
  userId: string;
  documentType: KycDocumentType;
  fileBuffer: Buffer;
  contentType: string;
  fullName: string;
  dateOfBirth: string;
  documentNumber: string;
}) {
  const kyc = await prisma.kycRecord.findUnique({
    where: { userId: params.userId },
  });
  if (!kyc) throw new KycNotFoundError();

  const storageKey = await uploadKycDocument({
    userId: params.userId,
    documentType: params.documentType,
    fileBuffer: params.fileBuffer,
    contentType: params.contentType,
  });

  await prisma.kycDocument.create({
    data: {
      kycRecordId: kyc.id,
      documentType: params.documentType,
      storagePath: storageKey,
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "KYC_DOCUMENT_SUBMITTED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: { documentType: params.documentType },
  });

  // Persist the declared identity alongside the document. These two fields are
  // what the review queue shows a Compliance Officer (name, Fayda number) and
  // what Tier 2 PEP screening matches against; without this the queue renders
  // a blank applicant name and screening has no legal name to check.
  await prisma.kycRecord.update({
    where: { id: kyc.id },
    data: {
      fullName: params.fullName,
      documentNumber: params.documentNumber,
    },
  });

  // Only attempt Fayda verification once per record (on first meaningful
  // document), not on every subsequent document upload — a re-upload is fresh
  // evidence for a human, not a fresh API call.
  //
  // The reopen branch is what makes resubmissions reviewable: without it a
  // user who was REJECTED uploads a better document, the KycDocument row is
  // created, the KycRecord keeps status=REJECTED, and the case never reaches
  // the UNDER_REVIEW queue at all.
  if (kyc.faydaVerificationAttempted) {
    if (kyc.status !== "REJECTED") {
      return prisma.kycRecord.findUniqueOrThrow({ where: { id: kyc.id } });
    }

    const [reopened] = await prisma.$transaction([
      prisma.kycRecord.update({
        where: { id: kyc.id },
        data: { status: "UNDER_REVIEW", rejectionReason: null },
      }),
      prisma.user.update({
        where: { id: params.userId },
        data: cacheDataForPendingReview(kyc),
      }),
    ]);

    await recordAuditEvent({
      userId: params.userId,
      eventType: "KYC_DOCUMENT_RESUBMITTED",
      entityType: "KycRecord",
      entityId: kyc.id,
      metadata: { documentType: params.documentType, previousStatus: kyc.status },
    });

    await notifyStaffOfEvent({
      eventType: "kyc-resubmission-pending-review",
      message: `User ${params.userId} resubmitted KYC evidence after rejection — manual review required.`,
      metadata: { kycRecordId: kyc.id, targetUserId: params.userId },
    });

    return reopened;
  }

  const faydaResult = await verifyWithFayda({
    documentNumber: params.documentNumber,
    fullName: params.fullName,
    dateOfBirth: params.dateOfBirth,
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "FAYDA_VERIFICATION_ATTEMPTED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: {
      success: faydaResult.success,
      failureReason: faydaResult.failureReason,
      failureKind: faydaResult.failureKind,
    },
  });

  if (!faydaResult.success) {
    // Manual review fallback. An unavailable Fayda says nothing about this
    // person, and a definitive non-match is not ours to adjudicate — neither
    // auto-approving (no evidence was returned) nor leaving the record
    // PENDING (nobody would be alerted that work is waiting). A human decides.
    const failureKind = faydaResult.failureKind ?? "UNAVAILABLE";

    await prisma.$transaction([
      prisma.kycRecord.update({
        where: { id: kyc.id },
        data: {
          status: "UNDER_REVIEW",
          faydaVerificationAttempted: true,
          faydaVerificationSucceeded: false,
          rejectionReason: `FAYDA_${failureKind}: ${faydaResult.failureReason ?? "UNKNOWN"}`,
        },
      }),
      prisma.user.update({
        where: { id: params.userId },
        data: cacheDataForPendingReview(kyc),
      }),
    ]);

    await notifyStaffOfEvent({
      eventType: "kyc-pending-review",
      message:
        `KYC Tier 1 submission from user ${params.userId} needs manual review` +
        ` — Fayda ${failureKind === "UNAVAILABLE" ? "service unavailable" : `returned ${failureKind}`}.`,
      metadata: {
        kycRecordId: kyc.id,
        targetUserId: params.userId,
        failureKind,
        failureReason: faydaResult.failureReason,
      },
    });

    return prisma.kycRecord.findUniqueOrThrow({ where: { id: kyc.id } });
  }

  // Fayda succeeded — check for duplicate accounts BEFORE auto-verifying.
  const existingWithSameBiometric = await prisma.user.findFirst({
    where: {
      faydaPsut: faydaResult.biometricId,
      id: { not: params.userId },
    },
  });

  if (existingWithSameBiometric) {
    await recordAuditEvent({
      userId: params.userId,
      eventType: "KYC_DUPLICATE_IDENTITY_DETECTED",
      entityType: "KycRecord",
      entityId: kyc.id,
      metadata: { conflictingUserId: existingWithSameBiometric.id },
    });

    // Route to manual review rather than auto-rejecting — a false positive
    // here (e.g. Fayda API returning a stale/reused ID) shouldn't silently
    // lock out a legitimate user.
    const [flagged] = await prisma.$transaction([
      prisma.kycRecord.update({
        where: { id: kyc.id },
        data: {
          status: "UNDER_REVIEW",
          faydaVerificationAttempted: true,
          rejectionReason: "DUPLICATE_IDENTITY_FLAGGED_FOR_REVIEW",
        },
      }),
      prisma.user.update({
        where: { id: params.userId },
        data: cacheDataForPendingReview(kyc),
      }),
    ]);

    await notifyStaffOfEvent({
      eventType: "kyc-duplicate-identity-pending-review",
      message:
        `User ${params.userId} submitted a Fayda identity already linked to user ` +
        `${existingWithSameBiometric.id} — manual review required.`,
      metadata: {
        kycRecordId: kyc.id,
        targetUserId: params.userId,
        conflictingUserId: existingWithSameBiometric.id,
      },
    });

    return flagged;
  }

  // Clean success path: auto-verify Tier 1.
  const [updatedKyc] = await prisma.$transaction([
    prisma.kycRecord.update({
      where: { id: kyc.id },
      data: {
        status: "VERIFIED",
        tier: "TIER_1",
        highestVerifiedTier: "TIER_1",
        faydaVerificationAttempted: true,
        faydaVerificationSucceeded: true,
        lastVerifiedAt: new Date(),
        nextReviewDueAt: monthsFromNow(REVIEW_CYCLE_MONTHS),
      },
    }),
    prisma.user.update({
      where: { id: params.userId },
      data: {
        faydaPsut: faydaResult.biometricId,
        cachedKycTier: "TIER_1",
        cachedKycStatus: "VERIFIED",
      },
    }),
  ]);

  await recordAuditEvent({
    userId: params.userId,
    eventType: "KYC_TIER1_AUTO_VERIFIED",
    entityType: "KycRecord",
    entityId: kyc.id,
  });

  return updatedKyc;
}

/**
 * Step 2: upgrade to Tier 2 (required for withdrawal). Requires Tier 1
 * already VERIFIED. Always routes through manual review — TIN/business-reg
 * verification and PEP screening both need a human in the loop, even
 * though the screening call itself is automated.
 */
export async function upgradeToTier2(params: {
  userId: string;
  fullName: string;
  tin?: string;
  businessRegNumber?: string;
}) {
  const kyc = await prisma.kycRecord.findUnique({
    where: { userId: params.userId },
  });
  if (!kyc) throw new KycNotFoundError();

  if (kyc.status !== "VERIFIED" || kyc.tier !== "TIER_1") {
    throw new InvalidTierTransitionError(
      "Tier 1 must be VERIFIED before requesting Tier 2.",
    );
  }

  // The screening provider throws rather than returning a clean result when it is
  // not configured in production. Left unhandled that would surface as a 500 and
  // tell the applicant nothing. It must land in manual review instead: the TIN
  // is still captured, the record is not advanced, and a Compliance Officer
  // decides. pepScreenedAt is deliberately left null -- nobody was screened.
  let pepResult: { isMatch: boolean };
  try {
    pepResult = await screenForPep(params.fullName);
  } catch (err) {
    if (!(err instanceof PepProviderUnavailableError)) throw err;
    logger.error(
      { userId: params.userId },
      "PEP screening unavailable; routing Tier 2 request to manual review",
    );
    const pending = await prisma.kycRecord.update({
      where: { id: kyc.id },
      data: {
        tin: params.tin,
        businessRegNumber: params.businessRegNumber,
        status: "UNDER_REVIEW",
      },
    });
    await recordAuditEvent({
      userId: params.userId,
      eventType: "KYC_TIER_UPGRADE_REQUESTED",
      entityType: "KycRecord",
      entityId: kyc.id,
      metadata: { tier: "TIER_2", pepScreening: "UNAVAILABLE" },
    });
    return pending;
  }

  await recordAuditEvent({
    userId: params.userId,
    eventType: "PEP_SCREENING_PERFORMED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: { isMatch: pepResult.isMatch },
  });

  const updated = await prisma.kycRecord.update({
    where: { id: kyc.id },
    data: {
      tin: params.tin,
      businessRegNumber: params.businessRegNumber,
      isPepMatch: pepResult.isMatch,
      pepScreenedAt: new Date(),
      // A PEP match forces Tier 3 enhanced review instead of a standard
    // Tier 2 review — never silently approve a flagged user.
    tier: pepResult.isMatch ? "TIER_3" : "TIER_2",
    status: "UNDER_REVIEW",
    },
  });

  // Deliberately NOT touching User.cachedKycTier/cachedKycStatus here.
  // The user is still in good standing at their highestVerifiedTier
  // (TIER_1) while this upgrade is pending — their public badge should
  // keep showing that, not flicker to "under review" or an unverified
  // higher tier, while a Compliance Officer decides. The cache only
  // changes on a final decision — see reviewKycRecord below.

  await recordAuditEvent({
    userId: params.userId,
    eventType: "KYC_TIER_UPGRADE_REQUESTED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: { requestedTier: updated.tier },
  });

  await notifyStaffOfEvent({
    eventType: "kyc-upgrade-pending-review",
    message: `KYC Tier upgrade requested by user ${params.userId}${pepResult.isMatch ? " - PEP MATCH, enhanced review required" : ""}.`,
    metadata: {
      kycRecordId: kyc.id,
      targetUserId: params.userId,
      isPepMatch: pepResult.isMatch,
    },
  });

  return updated;
}

/**
 * Compliance Officer / Admin action — the human decision point for anything
 * that didn't auto-verify: Fayda failures, duplicate-identity flags, and
 * every Tier 2/3 upgrade.
 */
export async function reviewKycRecord(params: {
  staffUserId: string;
  targetUserId: string;
  decision: "VERIFIED" | "REJECTED";
  rejectionReason?: string;
}) {
  const kyc = await prisma.kycRecord.findUnique({
    where: { userId: params.targetUserId },
  });
  if (!kyc) throw new KycNotFoundError();

  // On rejection, `tier` reverts to the last tier that actually passed —
  // NOT left sitting at the rejected, never-verified tier. If this is a
  // first-time review (no prior verified tier at all), there's nothing to
  // revert to, so it stays as requested but the status makes clear it
  // isn't usable.
  const revertedTier = kyc.highestVerifiedTier ?? kyc.tier;

  const updated = await prisma.kycRecord.update({
    where: { id: kyc.id },
    data: {
      status: params.decision,
      tier: params.decision === "REJECTED" ? revertedTier : kyc.tier,
      highestVerifiedTier:
        params.decision === "VERIFIED" ? kyc.tier : kyc.highestVerifiedTier,
      reviewedByStaffId: params.staffUserId,
      rejectionReason:
        params.decision === "REJECTED" ? params.rejectionReason : null,
      lastVerifiedAt:
        params.decision === "VERIFIED" ? new Date() : kyc.lastVerifiedAt,
      nextReviewDueAt:
        params.decision === "VERIFIED"
          ? monthsFromNow(REVIEW_CYCLE_MONTHS)
          : kyc.nextReviewDueAt,
    },
  });

  // Sync the public-facing cache to the user's ACTUAL current standing,
  // which is not always identical to the raw decision above:
  //  - VERIFIED -> cache shows the newly verified tier.
  //  - REJECTED but they had prior verified standing (a Tier 2/3 upgrade
  //    that didn't pan out) -> cache keeps showing that prior tier as
  //    VERIFIED. Their badge must not regress just because a *higher*
  //    tier request was declined.
  //  - REJECTED with no prior standing at all -> cache genuinely shows
  //    REJECTED; there's nothing to fall back to.
  const hadPriorStanding = !!kyc.highestVerifiedTier;
  await prisma.user.update({
    where: { id: params.targetUserId },
    data: {
      cachedKycStatus:
        params.decision === "VERIFIED" || hadPriorStanding
          ? "VERIFIED"
          : "REJECTED",
      cachedKycTier:
        params.decision === "VERIFIED" ? kyc.tier : kyc.highestVerifiedTier,
    },
  });

  // Preserved permanently — the KycRecord row above only ever holds the
  // LATEST decision, so a reviewer looking at a resubmission after a prior
  // rejection has no way to see that history without this table.
  await prisma.kycReviewEvent.create({
    data: {
      kycRecordId: kyc.id,
      staffUserId: params.staffUserId,
      decision: params.decision,
      tierAtDecision: kyc.tier,
      reason: params.rejectionReason,
    },
  });

  await recordAuditEvent({
    userId: params.targetUserId,
    eventType:
      params.decision === "VERIFIED" ? "KYC_MANUALLY_VERIFIED" : "KYC_REJECTED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: {
      reviewedBy: params.staffUserId,
      reason: params.rejectionReason,
      revertedTier: params.decision === "REJECTED" ? revertedTier : undefined,
    },
  });

  logger.info(
    { kycId: kyc.id, decision: params.decision },
    "KYC manual review decision recorded",
  );

  return updated;
}

export async function getKycStatus(userId: string) {
  const kyc = await prisma.kycRecord.findUnique({
    where: { userId },
    include: { documents: true },
  });
  if (!kyc) throw new KycNotFoundError();

  return {
    tier: kyc.tier,
    status: kyc.status,
    nextReviewDueAt: kyc.nextReviewDueAt?.toISOString() ?? null,
    rejectionReason: kyc.rejectionReason,
    documentsSubmitted: kyc.documents.map((d) => d.documentType),
  };
}

export async function getReviewQueue(filters?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}) {
  const where: any = {};
  if (filters?.status) {
    where.status = filters.status;
  }
  // Deliberately no `else` coercing to UNDER_REVIEW. An absent status filter
  // means "every status". It previously defaulted to UNDER_REVIEW, which made
  // the console's "All statuses" option return byte-identical rows to the
  // explicit UNDER_REVIEW filter — PENDING records were unreachable from the
  // UI through any normal selection.
  const page = Math.max(1, filters?.page ?? 1);
  const limit = Math.min(100, Math.max(1, filters?.limit ?? 25));

  if (filters?.search) {
    const q = filters.search.trim();
    where.user = {
      OR: [
        { email: { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
        { ucid: { contains: q, mode: "insensitive" } },
      ],
    };
  }

  // Audit finding fix: previously ignored page/limit/search entirely and
  // returned an unbounded result set.
  const [total, items, byStatus] = await Promise.all([
    prisma.kycRecord.count({ where }),
    prisma.kycRecord.findMany({
      where,
      include: {
        user: { select: { id: true, email: true, phone: true, ucid: true } },
        documents: true,
      },
      orderBy: { updatedAt: "asc" }, // oldest-waiting-first
      take: limit,
      skip: (page - 1) * limit,
    }),
    // Two populations the console must not conflate:
    //  - underReview: a document was submitted and a human must decide.
    //  - pending: registered, never uploaded a document. There is no evidence
    //    to review, so it is NOT actionable and must stay out of the KPI.
    prisma.kycRecord.groupBy({
      by: ["status"],
      where: { status: { in: ["PENDING", "UNDER_REVIEW"] } },
      _count: { _all: true },
    }),
  ]);

  const count = (status: KycStatus) =>
    byStatus.find((g) => g.status === status)?._count._all ?? 0;

  return {
    items,
    total,
    page,
    limit,
    counts: { underReview: count("UNDER_REVIEW"), pending: count("PENDING") },
  };
}

/**
 * Staff-only. Generates a short-lived signed URL for one submitted document
 * so a reviewer's browser can actually render the image — the raw
 * storagePath is an internal object-store key, never a URL a browser can
 * load directly.
 */
export async function getDocumentViewUrl(documentId: string) {
  const document = await prisma.kycDocument.findUnique({
    where: { id: documentId },
  });
  if (!document) throw new KycNotFoundError();

  const url = await getKycDocumentUrl(document.storagePath);
  return { url, documentType: document.documentType, expiresInSeconds: 300 };
}

/**
 * Full decision history for a user's KYC record — what Prompt 2's detail
 * pane needs to show "this user was rejected before, here's why" instead
 * of a reviewer starting blind on a resubmission.
 */
export async function getReviewHistory(targetUserId: string) {
  const kyc = await prisma.kycRecord.findUnique({
    where: { userId: targetUserId },
  });
  if (!kyc) throw new KycNotFoundError();

  return prisma.kycReviewEvent.findMany({
    where: { kycRecordId: kyc.id },
    orderBy: { createdAt: "desc" },
  });
}

// === eSignet OIDC Flow (Tier 1 KYC) ===

export async function initiateFaydaVerification(userId: string) {
  let kyc = await prisma.kycRecord.findUnique({ where: { userId } });

  if (!kyc) {
    kyc = await prisma.kycRecord.create({
      data: { userId, status: "PENDING", tier: "TIER_1" },
    });
  }

  if (kyc.status === "VERIFIED" && kyc.faydaVerificationSucceeded) {
    throw new InvalidTierTransitionError("User is already Fayda verified");
  }

  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");

  // Store state and nonce in Redis linked to the user's session (10 min TTL)
  await redis.setex(
    `kyc:oidc:${userId}`,
    600,
    JSON.stringify({ state, nonce }),
  );

  if (env.ESIGNET_CLIENT_ID) {
    // Real eSignet flow
    const { authorizeUrl, requestUri } = await esignet.initiatePar({
      state,
      nonce,
    });
    // clientId is returned because a Pushed Authorization Request is a two-step
    // redirect: the browser has to send the user to
    //   authorizeUrl?request_uri=<requestUri>&client_id=<clientId>
    // Without it the frontend cannot build the redirect, and the flow simply
    // was not callable from a browser. It is a public identifier.
    return { authorizeUrl, requestUri, state, clientId: env.ESIGNET_CLIENT_ID };
  } else {
    // Mock fallback for local dev when eSignet is not configured
    return {
      authorizeUrl: "http://localhost:3000/mock-fayda-consent",
      requestUri: "mock_request_uri",
      state,
    };
  }
}

export async function completeFaydaCallback(params: {
  userId: string;
  code: string;
  state: string;
}) {
  const { userId, code, state } = params;

  // 1. Validate State against Redis
  const redisKey = `kyc:oidc:${userId}`;
  const cachedDataStr = await redis.get(redisKey);
  if (!cachedDataStr) {
    throw new Error("KYC session expired or invalid");
  }

  const cachedData = JSON.parse(cachedDataStr);
  if (cachedData.state !== state) {
    throw new Error("Invalid state parameter (CSRF protection)");
  }

  // Consume the state (single-use)
  await redis.del(redisKey);

  let esignetSub = "";
  let verifiedName = "";
  let verifiedDob = "";

  if (env.ESIGNET_CLIENT_ID) {
    // 2. Exchange code for tokens
    const { accessToken } = await esignet.exchangeCodeForTokens(code);

    // 3. Fetch and decrypt nested claims
    const claims = await esignet.fetchAndDecryptUserInfo(accessToken);

    esignetSub = claims.sub;
    verifiedName = claims.name || "";
    verifiedDob = claims.birthdate || "";
  } else {
    // Mock fallback
    esignetSub = `mock-psut-${userId}`;
    verifiedName = "Mock User";
    verifiedDob = "1990-01-01";
  }

  // 4. Dedup check (using PSUT)
  const duplicate = await prisma.user.findFirst({
    where: { faydaPsut: esignetSub, id: { not: userId } },
  });

  if (duplicate) {
    await prisma.kycRecord.update({
      where: { userId },
      data: {
        faydaVerificationAttempted: true,
        faydaVerificationSucceeded: false,
        status: "UNDER_REVIEW",
      },
    });

    await recordAuditEvent({
      userId,
      eventType: "KYC_DUPLICATE_IDENTITY_FLAGGED",
      entityType: "KycRecord",
      entityId: userId,
      metadata: { duplicateOfUserId: duplicate.id },
    });

    await notifyStaffOfEvent({
      eventType: "kyc-duplicate-detected",
      message: `User ${userId} submitted a Fayda identity that is already linked to user ${duplicate.id}.`,
    });

    return { tier: "TIER_1", status: "UNDER_REVIEW" };
  }

  // 5. Clean pass -> Auto-verify Tier 1
  const kyc = await prisma.kycRecord.update({
    where: { userId },
    data: {
      faydaVerificationAttempted: true,
      faydaVerificationSucceeded: true,
      status: "VERIFIED",
      fullName: verifiedName,
      esignetSub: esignetSub,
      esignetVerifiedName: verifiedName,
      esignetVerifiedDob: verifiedDob,
      esignetVerifiedAt: new Date(),
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      faydaPsut: esignetSub,
      dateOfBirth: verifiedDob ? new Date(verifiedDob) : undefined,
    },
  });

  await recordAuditEvent({
    userId,
    eventType: "KYC_ESIGNET_VERIFIED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: { esignetSub, verifiedName },
  });

  return { tier: kyc.tier, status: kyc.status };
}
