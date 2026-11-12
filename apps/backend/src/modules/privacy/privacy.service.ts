// === IMPORTS ===
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { deleteObject } from "../../lib/objectStore.js";
import { notificationQueue } from "../../queue/queues.js";

/**
 * PDPP data-subject rights: access, portability and erasure.
 *
 * Legal basis: Personal Data Protection Proclamation No. 1321/2024 (Ethiopia).
 * The Roadmap's own instruction for the erasure tool is the rule this module
 * implements: "wipe marketing data, photos, chat; preserve AML data".
 *
 * WHY ERASURE IS NOT "DELETE THE USER ROW"
 * A User row is the foreign key that almost everything else hangs off —
 * contracts, milestones, ledger accounts, audit rows, dispute evidence. The
 * financial and AML records must survive a data subject's erasure request
 * for ten years, and a record that points at a user id nobody can resolve is
 * not a record a court or the FIC can use. So erasure here is:
 *
 *   - DESTROY: the personal content (profile text, photos, chat, DMs,
 *     marketing preferences, analytics) and the credentials, and
 *   - RETAIN: the AML evidence (identity, KYC, wallet, ledger, transactions,
 *     audit trail, flags, consent history, contracts and dispute evidence),
 *     which the law requires us to keep, and
 *   - CLOSE: the account (suspend it, revoke its sessions) so it can no
 *     longer be used.
 *
 * The account is therefore pseudonymised, not annihilated. The retained set
 * is listed explicitly in the erasure result and in the docs, because "we
 * erased your data" while keeping your identity hash and date of birth would
 * be a misleading answer.
 *
 * WHAT IS ERASED
 *   - Name, display name, bio, avatar, avatar CDN URLs
 *   - Email (replaced by a non-routable placeholder), password, OAuth ids,
 *     Telegram id
 *   - Notification preferences, notifications, analytics (profile views),
 *     featured-placement logs
 *   - Support chat and direct-message content the user wrote, and the
 *     attachments they uploaded (bytes included)
 *   - Portfolio items, skill claims, and the copy on their gigs, jobs,
 *     proposals, reviews and counter-offers
 *
 * WHAT IS RETAINED, AND WHY
 *   - UCID, Fayda biometric id, date of birth, phone, KYC record and
 *     documents — identity evidence for AML
 *   - Wallet, top-ups, payouts, payments, ledger — financial records
 *   - Audit log, transaction flags, consent history — the compliance trail
 *   - Contracts, milestones, disputes, evidence — the record of what was
 *     agreed and delivered, including the counterparties' rights
 *   - Reviews *about* the user — those are the counterparty's statement
 *
 * The exact retained field list is still pending counsel sign-off (see
 * docs/COMPLIANCE_BLOCKERS.md). The split implemented here follows the
 * Roadmap's wording and is deliberately on the side of retaining too much
 * rather than too little: an over-retention is a complaint, an
 * under-retention is a regulatory breach.
 */

// === CONSTANTS ===
/** Placeholder written over erased free-text fields. */
export const ERASED_TEXT = "[erased]";
/** Placeholder written over erased personal photos. */
export const ERASED_MEDIA = null;
/** Domains that can never be delivered to (RFC 2606 reserved). */
const ERASED_EMAIL_DOMAIN = "erased.invalid";

// === TYPES ===
export class UserNotFoundError extends Error {}
export class ErasureBlockedError extends Error {
  constructor(
    message: string,
    readonly blockers: string[],
  ) {
    super(message);
  }
}

export interface ErasureBlocker {
  code: string;
  message: string;
}

export interface ErasureResult {
  performedAt: string;
  erased: {
    profileFields: number;
    supportChatMessages: number;
    directMessages: number;
    chatAttachmentsDeleted: number;
    proposalsScrubbed: number;
    jobsScrubbed: number;
    gigsScrubbed: number;
    reviewsScrubbed: number;
    portfolioItemsDeleted: number;
    skillsDeleted: number;
    notificationsDeleted: number;
    profileViewsDeleted: number;
    featuredLogsDeleted: number;
    authArtefactsDeleted: number;
  };
  retained: readonly string[];
  accountClosed: boolean;
}

// === MAIN FUNCTIONS ===

/**
 * Builds the complete data-subject export.
 *
 * The previous implementation of `GET /users/me/export` returned an account
 * summary with a handful of counters — not the "complete archive" the API
 * docs claimed it was. This returns everything the platform actually holds
 * about the user, grouped by category, including the content and the
 * compliance records.
 */
export async function buildUserDataExport(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      kyc: {
        include: { documents: { select: { id: true, documentType: true, uploadedAt: true } } },
      },
      wallet: true,
      consents: { orderBy: { grantedAt: "asc" } },
      jobsPosted: {
        include: { proposals: { select: { id: true, coverLetter: true, status: true, createdAt: true } } },
        orderBy: { createdAt: "desc" },
      },
      proposals: {
        include: { counterOffer: true, job: { select: { id: true, title: true } } },
        orderBy: { createdAt: "desc" },
      },
      contractsAsClient: {
        include: {
          milestones: true,
          disputes: { include: { evidence: true } },
          review: true,
        },
        orderBy: { createdAt: "desc" },
      },
      contractsAsFreelancer: {
        include: {
          milestones: true,
          disputes: { include: { evidence: true } },
          review: true,
        },
        orderBy: { createdAt: "desc" },
      },
      notifications: { orderBy: { createdAt: "desc" } },
      chatMessages: { orderBy: { createdAt: "asc" } },
      sentDirectMessages: { orderBy: { createdAt: "asc" } },
      directThreadsAsClient: { include: { messages: true } },
      directThreadsAsFreelancer: { include: { messages: true } },
      conversationParticipants: { include: { conversation: true } },
      conversationsCreated: { include: { messages: true } },
      portfolioItems: true,
      skills: true,
      gigsOwned: { include: { packages: true, orders: true } },
      gigOrders: { include: { gig: { select: { id: true, title: true } } } },
      reviewsGiven: true,
      reviewsReceived: true,
      gigAuthored: true,
      gigReceived: true,
      walletTopUps: true,
      payouts: true,
      transactionFlags: true,
      featuredLogs: true,
    },
  });

  if (!user) throw new UserNotFoundError("User not found.");

  const wallet = user.wallet;
  const topUps = user.walletTopUps;
  const payouts = user.payouts;
  const contracts = [...user.contractsAsClient, ...user.contractsAsFreelancer];

  return {
    platform: "Yekis Jobs",
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    notice:
      "This archive contains every category of personal data Yekis holds about you. " +
      "Categories marked as retained in the erasure flow are financial and AML records " +
      "that Ethiopian law requires us to retain for ten years.",

    account: {
      id: user.id,
      ucid: user.ucid,
      email: user.email,
      phone: user.phone,
      phoneVerified: !!user.phoneVerifiedAt,
      role: user.role,
      staffRole: user.staffRole,
      languagePreference: user.languagePreference,
      timezone: user.timezone,
      isSuspended: user.isSuspended,
      isComplianceHeld: user.isComplianceHeld,
      circumventionAlertCount: user.circumventionAlertCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    },

    profile: {
      firstName: user.firstName,
      lastName: user.lastName,
      displayName: user.displayName,
      bio: user.bio,
      avatarUrl: user.avatarUrl,
      avatarCdnUrls: user.avatarCdnUrls,
      primarySkillId: user.primarySkillId,
      isAvailableForWork: user.isAvailableForWork,
      profileVisibility: user.profileVisibility,
      profileCompleteness: user.profileCompleteness,
      notificationSettings: user.notificationSettings,
      skills: user.skills,
      portfolioItems: user.portfolioItems,
    },

    verification: {
      // The KycRecord is authoritative; `User.cachedKycStatus` is a
      // denormalised copy that defaults to PENDING. Reading the cache first
      // meant a user whose KYC had been verified was still reported as
      // PENDING — which is exactly the kind of wrong answer a data-subject
      // access request must not give.
      kycTier: user.kyc?.tier ?? user.cachedKycTier ?? "TIER_1",
      kycStatus: user.kyc?.status ?? user.cachedKycStatus ?? "PENDING",
      kycRecord: user.kyc,
      kycDocuments: user.kyc?.documents ?? [],
    },

    financials: {
      currency: "ETB",
      balanceMinor: wallet?.balanceMinor ?? 0,
      totalEarnedNetMinor: user.totalEarnedNetMinor,
      totalSpentGrossMinor: user.totalSpentGrossMinor,
      topUps,
      payouts,
    },

    marketplaceActivity: {
      jobsPosted: user.jobsPosted,
      proposals: user.proposals,
      contracts,
      gigsOwned: user.gigsOwned,
      gigOrders: user.gigOrders,
      reviewsGiven: user.reviewsGiven,
      reviewsReceived: user.reviewsReceived,
      gigReviewsAuthored: user.gigAuthored,
      gigReviewsReceived: user.gigReceived,
      featuredLogs: user.featuredLogs,
    },

    communications: {
      consentRecords: user.consents,
      notifications: user.notifications,
      supportConversations: user.conversationParticipants.map((p) => p.conversation),
      conversationsCreated: user.conversationsCreated,
      supportMessages: user.chatMessages,
      directThreadsAsClient: user.directThreadsAsClient,
      directThreadsAsFreelancer: user.directThreadsAsFreelancer,
      directMessages: user.sentDirectMessages,
    },

    compliance: {
      transactionFlags: user.transactionFlags,
      note:
        "Audit-log entries are retained for ten years under AML record-keeping rules. " +
        "They are written append-only and are not deleted when an account is erased.",
    },

    activityCounts: {
      jobsPosted: user.jobsPosted.length,
      proposalsSubmitted: user.proposals.length,
      contractsAsClient: user.contractsAsClient.length,
      contractsAsFreelancer: user.contractsAsFreelancer.length,
      notificationsReceived: user.notifications.length,
      supportMessagesSent: user.chatMessages.length,
      directMessagesSent: user.sentDirectMessages.length,
      portfolioItems: user.portfolioItems.length,
      gigsOwned: user.gigsOwned.length,
    },
  };
}

/**
 * Works out whether the account can be erased right now.
 *
 * A user who still has money in flight cannot simply be erased: the escrow
 * they funded, the payout they are waiting on, or the dispute they are party
 * to all need their counterparty to be able to claim against them. Erasing
 * the identity out from under an open transaction would leave the other side
 * unable to recover what they paid for.
 *
 * So the request is refused with a specific list of what has to be resolved
 * first, rather than half-performed.
 */
export async function findErasureBlockers(userId: string): Promise<ErasureBlocker[]> {
  const blockers: ErasureBlocker[] = [];

  const [balance, pendingPayouts, pendingTopUps, activeContracts, openDisputes] =
    await Promise.all([
      prisma.wallet.findUnique({
        where: { userId },
        select: { balanceMinor: true },
      }),
      prisma.payoutTransaction.count({
        where: { userId, status: { in: ["PENDING", "PROCESSING"] } },
      }),
      prisma.walletTopUp.count({
        where: { userId, status: { in: ["PENDING", "CHECKOUT_PENDING"] } },
      }),
      prisma.contract.count({
        where: {
          OR: [{ clientId: userId }, { freelancerId: userId }],
          status: "ACTIVE",
        },
      }),
      prisma.dispute.count({
        where: {
          stage: { notIn: ["RESOLVED"] },
          contract: { OR: [{ clientId: userId }, { freelancerId: userId }] },
        },
      }),
    ]);

  if ((balance?.balanceMinor ?? 0) > 0) {
    blockers.push({
      code: "WALLET_BALANCE",
      message:
        "Your wallet still holds funds. Withdraw the balance before requesting erasure.",
    });
  }
  if (pendingPayouts > 0) {
    blockers.push({
      code: "PENDING_PAYOUT",
      message: `You have ${pendingPayouts} withdrawal(s) still processing. Wait for them to settle.`,
    });
  }
  if (pendingTopUps > 0) {
    blockers.push({
      code: "PENDING_TOPUP",
      message: `You have ${pendingTopUps} top-up(s) still in progress. Wait for them to settle.`,
    });
  }
  if (activeContracts > 0) {
    blockers.push({
      code: "ACTIVE_CONTRACT",
      message: `You have ${activeContracts} active contract(s). Complete or terminate them first.`,
    });
  }
  if (openDisputes > 0) {
    blockers.push({
      code: "OPEN_DISPUTE",
      message: `You have ${openDisputes} open dispute(s). Let them resolve first.`,
    });
  }

  return blockers;
}

/**
 * Erases the data subject's personal data, preserving the AML and financial
 * records the law requires us to keep, and closes the account.
 *
 * Runs as a sequence of scoped operations rather than one transaction:
 * object-store deletes are network calls that must not be held open across a
 * database transaction, and the row-level work is small enough per table that
 * a failure part-way leaves a recoverable state (and an audit record saying
 * exactly how far it got).
 */
export async function eraseUserData(userId: string): Promise<ErasureResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, ucid: true, email: true, phone: true },
  });
  if (!user) throw new UserNotFoundError("User not found.");

  const blockers = await findErasureBlockers(userId);
  if (blockers.length > 0) {
    throw new ErasureBlockedError(
      "Erasure cannot proceed until the outstanding items below are resolved.",
      blockers.map((b) => b.code),
    );
  }

  const performedAt = new Date();
  const counts = {
    profileFields: 0,
    supportChatMessages: 0,
    directMessages: 0,
    chatAttachmentsDeleted: 0,
    proposalsScrubbed: 0,
    jobsScrubbed: 0,
    gigsScrubbed: 0,
    reviewsScrubbed: 0,
    portfolioItemsDeleted: 0,
    skillsDeleted: 0,
    notificationsDeleted: 0,
    profileViewsDeleted: 0,
    featuredLogsDeleted: 0,
    authArtefactsDeleted: 0,
  };

  // --- 1. Chat content and the bytes behind it ---------------------------
  //
  // Collect the attachment keys BEFORE nulling them, or the bytes are
  // unreachable afterwards.
  const attachmentKeys = (
    await prisma.chatMessage.findMany({
      where: { senderId: userId, attachmentUrl: { not: null } },
      select: { attachmentUrl: true },
    })
  )
    .map((m) => m.attachmentUrl)
    .filter((k): k is string => !!k);

  for (const key of attachmentKeys) {
    const outcome = await deleteObject(key);
    if (outcome.bucketDeleted) counts.chatAttachmentsDeleted++;
    else {
      logger.warn(
        { userId, key, reason: outcome.reason },
        "Chat attachment could not be deleted from the object store — the database reference is still removed",
      );
    }
  }

  // Support chat. Conversations the user created are entirely theirs (the
  // signed-out support widget), so their subject and the visitor's contact
  // address go too.
  const createdConversations = await prisma.conversation.findMany({
    where: { creatorId: userId },
    select: { id: true },
  });
  const createdConversationIds = createdConversations.map((c) => c.id);

  const chatScrub = await prisma.chatMessage.updateMany({
    where: { senderId: userId },
    data: { body: ERASED_TEXT, attachmentUrl: null },
  });
  counts.supportChatMessages += chatScrub.count;

  if (createdConversationIds.length > 0) {
    const convoScrub = await prisma.chatMessage.updateMany({
      where: { conversationId: { in: createdConversationIds } },
      data: { body: ERASED_TEXT, attachmentUrl: null },
    });
    counts.supportChatMessages += convoScrub.count;

    await prisma.conversation.updateMany({
      where: { id: { in: createdConversationIds } },
      data: { subject: ERASED_TEXT, contactEmail: null },
    });
  }

  // Direct messages: the user's own words only. The other party's messages
  // are the other party's data.
  const dmScrub = await prisma.directMessage.updateMany({
    where: { senderId: userId },
    data: { body: ERASED_TEXT },
  });
  counts.directMessages += dmScrub.count;

  // --- 2. Marketplace copy ------------------------------------------------
  const proposalScrub = await prisma.proposal.updateMany({
    where: { freelancerId: userId },
    data: {
      coverLetter: ERASED_TEXT,
      screeningAnswers: Prisma.DbNull,
      attachmentPaths: [],
    },
  });
  counts.proposalsScrubbed += proposalScrub.count;

  const jobScrub = await prisma.job.updateMany({
    where: { clientId: userId },
    data: {
      title: ERASED_TEXT,
      description: ERASED_TEXT,
      screeningQuestions: Prisma.DbNull,
      status: "CANCELLED",
    },
  });
  counts.jobsScrubbed += jobScrub.count;

  const counterScrub = await prisma.counterOffer.updateMany({
    where: { proposedByClientId: userId },
    data: { message: ERASED_TEXT },
  });
  counts.proposalsScrubbed += counterScrub.count;

  // Reviews the user WROTE: their words are their data. Reviews ABOUT them
  // are the counterparty's statement about the counterparty's own experience
  // and are left alone.
  const reviewScrub = await prisma.review.updateMany({
    where: { authorId: userId },
    data: { comment: ERASED_TEXT, response: null },
  });
  counts.reviewsScrubbed += reviewScrub.count;

  const gigReviewScrub = await prisma.gigReview.updateMany({
    where: { authorId: userId },
    data: { comment: ERASED_TEXT, response: null },
  });
  counts.reviewsScrubbed += gigReviewScrub.count;

  // Gigs: a gig with orders cannot be deleted (the orders reference it and
  // are financial records), so it is archived and its copy scrubbed. A gig
  // with no orders is pure catalogue data and goes entirely.
  const gigsWithOrders = await prisma.gig.findMany({
    where: { freelancerId: userId, orders: { some: {} } },
    select: { id: true },
  });
  const gigIdsWithOrders = gigsWithOrders.map((g) => g.id);

  if (gigIdsWithOrders.length > 0) {
    const gigScrub = await prisma.gig.updateMany({
      where: { id: { in: gigIdsWithOrders } },
      data: {
        title: ERASED_TEXT,
        description: ERASED_TEXT,
        thumbnailUrl: null,
        mediaUrls: [],
        status: "ARCHIVED",
      },
    });
    counts.gigsScrubbed += gigScrub.count;
  }

  const gigsWithoutOrders = await prisma.gig.deleteMany({
    where: { freelancerId: userId, orders: { none: {} } },
  });
  counts.gigsScrubbed += gigsWithoutOrders.count;

  // Deliverables uploaded against milestones.
  const deliverableScrub = await prisma.milestone.updateMany({
    where: { contract: { OR: [{ clientId: userId }, { freelancerId: userId }] } },
    data: { deliverableUrl: null },
  });

  // Portfolio and skills.
  const portfolioDeleted = await prisma.portfolioItem.deleteMany({
    where: { userId },
  });
  counts.portfolioItemsDeleted += portfolioDeleted.count;

  const skillsDeleted = await prisma.userSkill.deleteMany({ where: { userId } });
  counts.skillsDeleted += skillsDeleted.count;

  // --- 3. Marketing and analytics ----------------------------------------
  //
  // Consent rows are never deleted: they are the record of what the user
  // agreed to. Marketing and analytics are revoked by appending a
  // `granted: false` row, which is how consent is expressed everywhere else
  // in this codebase.
  await prisma.consentRecord.createMany({
    data: [
      {
        userId,
        purpose: "marketing_communications",
        granted: false,
      },
      {
        userId,
        purpose: "analytics",
        granted: false,
      },
    ],
  });

  const notificationDeleted = await prisma.notification.deleteMany({
    where: { userId },
  });
  counts.notificationsDeleted += notificationDeleted.count;

  // Profile views are analytics in both directions: views the user made and
  // views of the user's profile.
  const profileViewsDeleted = await prisma.profileView.deleteMany({
    where: { OR: [{ viewerId: userId }, { targetUserId: userId }] },
  });
  counts.profileViewsDeleted += profileViewsDeleted.count;

  const featuredDeleted = await prisma.featuredLog.deleteMany({
    where: { userId },
  });
  counts.featuredLogsDeleted += featuredDeleted.count;

  // --- 4. Credentials and auth artefacts ---------------------------------
  const [resetTokens, telegramCodes, phoneCodes] = await Promise.all([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.telegramLoginCode.deleteMany({ where: { userId } }),
    prisma.phoneVerificationCode.deleteMany({ where: { userId } }),
  ]);
  counts.authArtefactsDeleted +=
    resetTokens.count + telegramCodes.count + phoneCodes.count;

  // --- 5. The account itself ---------------------------------------------
  //
  // The email is replaced rather than nulled (the column is unique and
  // non-null) and the password is randomised, so the old credentials cannot
  // be used to get back in. `isSuspended` plus a session-version bump closes
  // every session that is currently open.
  //
  // The UCID, phone, date of birth and Fayda biometric id are deliberately
  // NOT touched: they are the AML join keys for this person's financial
  // history, and the records that use them must stay usable.
  const erasedEmail = `erased-${user.ucid}@${ERASED_EMAIL_DOMAIN}`;
  await prisma.user.update({
    where: { id: userId },
    data: {
      email: erasedEmail,
      passwordHash: randomBytes(48).toString("hex"),
      passwordSetAt: null,
      firstName: "",
      lastName: "",
      displayName: null,
      bio: null,
      avatarUrl: null,
      avatarCdnUrls: Prisma.DbNull,
      primarySkillId: null,
      notificationSettings: Prisma.DbNull,
      googleId: null,
      appleId: null,
      facebookId: null,
      telegramUserId: null,
      telegramChatId: null,
      emailVerified: false,
      isAvailableForWork: false,
      profileVisibility: "PRIVATE",
      profileCompleteness: 0,
      isSuspended: true,
      sessionVersion: { increment: 1 },
    },
  });
  counts.profileFields += 1;

  // --- 6. Record what happened -------------------------------------------
  await recordAuditEvent({
    userId,
    eventType: "PRIVACY_DATA_ERASED",
    entityType: "User",
    entityId: userId,
    metadata: {
      ucid: user.ucid,
      performedAt: performedAt.toISOString(),
      erased: counts,
      retainedCategories: RETAINED_CATEGORIES,
    },
  });

  // Tell the user it happened, from inside the platform. It also reaches
  // them by email because the old address is now dead.
  await notificationQueue.add("account-erased", {
    userId,
    message:
      "Your personal data has been erased in line with your request. Financial and " +
      "AML records are retained as Ethiopian law requires. Your account is now closed.",
    metadata: { performedAt: performedAt.toISOString() },
  });

  logger.info(
    { userId, counts },
    "PDPP erasure completed — personal content destroyed, AML records retained",
  );

  return {
    performedAt: performedAt.toISOString(),
    erased: counts,
    retained: RETAINED_CATEGORIES,
    accountClosed: true,
  };
}

/**
 * The categories of data an erasure request does NOT destroy, and why.
 *
 * Returned to the data subject in the erasure result so the answer is never
 * a bare "done": they are told exactly what was kept.
 */
export const RETAINED_CATEGORIES = [
  "Identity evidence: UCID, date of birth, Fayda biometric id, phone number",
  "KYC record and uploaded KYC documents",
  "Wallet balance, top-ups, withdrawals and payment transactions",
  "Double-entry ledger journals and entries",
  "Audit log (ten-year retention)",
  "Transaction monitoring flags and suspicious-transaction report records",
  "Consent history",
  "Contracts, milestones, disputes and dispute evidence",
  "Reviews written about the user by other people",
] as const;
