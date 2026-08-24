import type { KycDocumentType } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
import { uploadKycDocument, getKycDocumentUrl } from "../../lib/objectStore.js";
import { verifyWithFayda } from "./fayda.client.js";
import { screenForPep } from "./pep.client.js";
import { logger } from "../../lib/logger.js";

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
 * Step 1: a user submits a KYC document (ID, passport, selfie, etc).
 * On the first document for a user, this also kicks off Fayda verification.
 * If Fayda succeeds AND the resulting biometric ID isn't already attached to
 * another account, the user is auto-verified at Tier 1. Any failure —
 * Fayda API failure, or a dedup hit — routes to manual review instead of
 * silently failing, per the roadmap's "manual review fallback queue".
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
  const kyc = await prisma.kycRecord.findUnique({ where: { userId: params.userId } });
  if (!kyc) throw new KycNotFoundError();

  const storageKey = await uploadKycDocument({
    userId: params.userId,
    documentType: params.documentType,
    fileBuffer: params.fileBuffer,
    contentType: params.contentType,
  });

  await prisma.kycDocument.create({
    data: { kycRecordId: kyc.id, documentType: params.documentType, storagePath: storageKey },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "KYC_DOCUMENT_SUBMITTED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: { documentType: params.documentType },
  });

  // Only attempt Fayda verification once per record (on first meaningful
  // document), not on every subsequent document upload.
  if (kyc.faydaVerificationAttempted) {
    return prisma.kycRecord.findUniqueOrThrow({ where: { id: kyc.id } });
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
    metadata: { success: faydaResult.success, failureReason: faydaResult.failureReason },
  });

  if (!faydaResult.success) {
    // Manual review fallback — do not block the user's application, just
    // route a human into the loop.
    await prisma.user.update({ where: { id: params.userId }, data: { cachedKycStatus: "UNDER_REVIEW" } });
    return prisma.kycRecord.update({
      where: { id: kyc.id },
      data: { status: "UNDER_REVIEW", faydaVerificationAttempted: true },
    });
  }

  // Fayda succeeded — check for duplicate accounts BEFORE auto-verifying.
  const existingWithSameBiometric = await prisma.user.findFirst({
    where: { faydaBiometricId: faydaResult.biometricId, id: { not: params.userId } },
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
    await prisma.user.update({ where: { id: params.userId }, data: { cachedKycStatus: "UNDER_REVIEW" } });
    return prisma.kycRecord.update({
      where: { id: kyc.id },
      data: {
        status: "UNDER_REVIEW",
        faydaVerificationAttempted: true,
        rejectionReason: "DUPLICATE_IDENTITY_FLAGGED_FOR_REVIEW",
      },
    });
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
        faydaBiometricId: faydaResult.biometricId,
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
  const kyc = await prisma.kycRecord.findUnique({ where: { userId: params.userId } });
  if (!kyc) throw new KycNotFoundError();

  if (kyc.status !== "VERIFIED" || kyc.tier !== "TIER_1") {
    throw new InvalidTierTransitionError("Tier 1 must be VERIFIED before requesting Tier 2.");
  }

  const pepResult = await screenForPep(params.fullName);

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
  const kyc = await prisma.kycRecord.findUnique({ where: { userId: params.targetUserId } });
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
      highestVerifiedTier: params.decision === "VERIFIED" ? kyc.tier : kyc.highestVerifiedTier,
      reviewedByStaffId: params.staffUserId,
      rejectionReason: params.decision === "REJECTED" ? params.rejectionReason : null,
      lastVerifiedAt: params.decision === "VERIFIED" ? new Date() : kyc.lastVerifiedAt,
      nextReviewDueAt:
        params.decision === "VERIFIED" ? monthsFromNow(REVIEW_CYCLE_MONTHS) : kyc.nextReviewDueAt,
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
      cachedKycStatus: params.decision === "VERIFIED" || hadPriorStanding ? "VERIFIED" : "REJECTED",
      cachedKycTier: params.decision === "VERIFIED" ? kyc.tier : kyc.highestVerifiedTier,
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
    eventType: params.decision === "VERIFIED" ? "KYC_MANUALLY_VERIFIED" : "KYC_REJECTED",
    entityType: "KycRecord",
    entityId: kyc.id,
    metadata: { reviewedBy: params.staffUserId, reason: params.rejectionReason, revertedTier: params.decision === "REJECTED" ? revertedTier : undefined },
  });

  logger.info({ kycId: kyc.id, decision: params.decision }, "KYC manual review decision recorded");

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

export async function getReviewQueue(filters?: { page?: number; limit?: number; search?: string; status?: string }) {
  const where: any = {};
  if (filters?.status) {
    where.status = filters.status;
  } else {
    where.status = "UNDER_REVIEW";
  }
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
  const [total, items] = await Promise.all([
    prisma.kycRecord.count({ where }),
    prisma.kycRecord.findMany({
      where,
      include: { user: { select: { id: true, email: true, phone: true, ucid: true } }, documents: true },
      orderBy: { updatedAt: "asc" }, // oldest-waiting-first
      take: limit,
      skip: (page - 1) * limit,
    }),
  ]);

  return { items, total, page, limit };
}

/**
 * Staff-only. Generates a short-lived signed URL for one submitted document
 * so a reviewer's browser can actually render the image — the raw
 * storagePath is an internal object-store key, never a URL a browser can
 * load directly.
 */
export async function getDocumentViewUrl(documentId: string) {
  const document = await prisma.kycDocument.findUnique({ where: { id: documentId } });
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
  const kyc = await prisma.kycRecord.findUnique({ where: { userId: targetUserId } });
  if (!kyc) throw new KycNotFoundError();

  return prisma.kycReviewEvent.findMany({
    where: { kycRecordId: kyc.id },
    orderBy: { createdAt: "desc" },
  });
}
