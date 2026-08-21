// === IMPORTS ===
import type { TransactionFlagType } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";


// === MAIN FUNCTIONS ===
export class FlagNotFoundError extends Error {}
export class FlagAlreadyResolvedError extends Error {}
export class WithdrawalHeldForReviewError extends Error {}

async function createFlag(params: {
  userId: string;
  type: TransactionFlagType;
  details: Record<string, unknown>;
  relatedEntityId?: string;
}) {
  const flag = await prisma.transactionFlag.create({
    data: {
      userId: params.userId,
      type: params.type,
      details: params.details as never,
      relatedEntityId: params.relatedEntityId,
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "TRANSACTION_FLAGGED",
    entityType: "TransactionFlag",
    entityId: flag.id,
    metadata: { type: params.type },
  });

  logger.warn({ flagId: flag.id, type: params.type, userId: params.userId }, "AML rule triggered — flag created");

  return flag;
}

/**
 * Structuring check — per the roadmap's heuristic: multiple payments each
 * just below the withholding-tax threshold within a short window. Checked
 * on the funding (client) side, since that's who controls transaction
 * sizing.
 */
export async function runStructuringCheck(clientId: string) {
  const windowStart = new Date(Date.now() - env.TMS_STRUCTURING_WINDOW_HOURS * 60 * 60 * 1000);
  const nearThresholdFloor = env.WITHHOLDING_THRESHOLD_MINOR - env.TMS_STRUCTURING_BAND_MINOR;

  const recentPayments = await prisma.paymentTransaction.findMany({
    where: {
      status: "SUCCESS",
      createdAt: { gte: windowStart },
      amountMinor: { gte: nearThresholdFloor, lt: env.WITHHOLDING_THRESHOLD_MINOR },
      milestone: { contract: { clientId } },
    },
  });

  if (recentPayments.length >= env.TMS_STRUCTURING_MIN_COUNT) {
    return createFlag({
      userId: clientId,
      type: "STRUCTURING",
      details: {
        matchedTransactionIds: recentPayments.map((p) => p.id),
        windowHours: env.TMS_STRUCTURING_WINDOW_HOURS,
        count: recentPayments.length,
      },
    });
  }
  return null;
}

/**
 * Velocity check — abnormal job-completion frequency for a freelancer.
 * Roadmap heuristic: e.g. 20 completed milestones in 48 hours.
 */
export async function runVelocityCheck(freelancerId: string) {
  const windowStart = new Date(Date.now() - env.TMS_VELOCITY_WINDOW_HOURS * 60 * 60 * 1000);

  const recentReleases = await prisma.milestone.count({
    where: {
      escrowState: "RELEASED",
      releasedAt: { gte: windowStart },
      contract: { freelancerId },
    },
  });

  if (recentReleases >= env.TMS_VELOCITY_MILESTONE_THRESHOLD) {
    return createFlag({
      userId: freelancerId,
      type: "VELOCITY",
      details: { windowHours: env.TMS_VELOCITY_WINDOW_HOURS, releaseCount: recentReleases },
    });
  }
  return null;
}

/**
 * Pass-through check — funds released and then (nearly) fully withdrawn
 * shortly after, with no other active contract work in between. Called
 * from the withdrawal flow, not on every webhook, since it only makes
 * sense to evaluate at withdrawal time.
 */
export async function runPassThroughCheck(params: { userId: string; withdrawalAmountMinor: number }) {
  const windowStart = new Date(Date.now() - env.TMS_PASS_THROUGH_WINDOW_HOURS * 60 * 60 * 1000);

  const recentRelease = await prisma.milestone.findFirst({
    where: { contract: { freelancerId: params.userId }, escrowState: "RELEASED", releasedAt: { gte: windowStart } },
    orderBy: { releasedAt: "desc" },
  });
  if (!recentRelease) return null;

  const activeContracts = await prisma.contract.count({
    where: { freelancerId: params.userId, job: { status: "IN_PROGRESS" } },
  });

  const isMostlyFullWithdrawal = params.withdrawalAmountMinor >= recentRelease.amountMinor * 0.9;

  if (isMostlyFullWithdrawal && activeContracts === 0) {
    return createFlag({
      userId: params.userId,
      type: "PASS_THROUGH",
      details: {
        relatedMilestoneId: recentRelease.id,
        withdrawalAmountMinor: params.withdrawalAmountMinor,
        windowHours: env.TMS_PASS_THROUGH_WINDOW_HOURS,
      },
      relatedEntityId: recentRelease.id,
    });
  }
  return null;
}

/**
 * Wallet mismatch — the withdrawal destination doesn't match the identity
 * on file (registered phone). A mismatch here is worth holding the
 * withdrawal for, not just logging after the fact — see the route layer's
 * use of WithdrawalHeldForReviewError.
 */
export async function checkWalletMismatch(params: { userId: string; payoutAccountIdentifier: string }) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: params.userId } });

  const normalizedPhone = user.phone.replace(/\s+/g, "");
  const normalizedPayout = params.payoutAccountIdentifier.replace(/\s+/g, "");

  if (normalizedPhone !== normalizedPayout) {
    const existingFlag = await prisma.transactionFlag.findFirst({
      where: { userId: params.userId, type: "WALLET_MISMATCH", status: "PENDING_REVIEW" },
    });

    if (!existingFlag) {
      await createFlag({
        userId: params.userId,
        type: "WALLET_MISMATCH",
        details: { registeredPhone: user.phone, payoutAccountIdentifier: params.payoutAccountIdentifier },
      });
    }
    return false; // mismatch
  }
  return true; // matches
}

/**
 * Convenience wrapper called after a milestone is successfully funded.
 * Failures here must never break the webhook's own success response —
 * callers should wrap this in try/catch (see escrow.service.ts).
 */
export async function runPostFundingChecks(clientId: string) {
  await runStructuringCheck(clientId);
}

export async function getComplianceQueue(params?: { page?: number; limit?: number; search?: string; status?: string; flagType?: string }) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.max(1, Math.min(100, params?.limit || 20));

  const where: any = {};
  
  if (params?.status) {
    where.status = params.status;
  } else {
    // Default to PENDING_REVIEW if no specific status requested
    where.status = "PENDING_REVIEW";
  }

  if (params?.flagType) {
    where.type = params.flagType;
  }

  if (params?.search) {
    where.user = {
      OR: [
        { email: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { ucid: { contains: params.search, mode: 'insensitive' } }
      ]
    };
  }

  const [total, items] = await Promise.all([
    prisma.transactionFlag.count({ where }),
    prisma.transactionFlag.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            ucid: true,
            kyc: { select: { tier: true, status: true } },
            wallet: { select: { balanceMinor: true } },
            transactionFlags: {
              select: { id: true, type: true, status: true, createdAt: true, strFiledAt: true },
              orderBy: { createdAt: "desc" }
            }
          }
        }
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    })
  ]);

  return { items, total, page, pageSize: limit };
}

export async function getActivityFeed() {
  return prisma.auditLog.findMany({
    where: {
      user: {
        staffRole: { not: null }
      }
    },
    include: {
      user: { select: { id: true, email: true, staffRole: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 15
  });
}

/**
 * Records that a Compliance Officer has manually filed an STR with the
 * FIC. There is no FIC filing API — Ethiopia's suspicious-transaction
 * reporting is a real regulatory filing a human completes through
 * official channels; this endpoint records that it happened, the
 * reference number received, and whether it met the 24-hour SLA — it does
 * not automate something that isn't automatable.
 */
export async function fileStr(params: {
  staffUserId: string;
  flagId: string;
  reviewNotes: string;
  strReferenceNumber: string;
}) {
  const flag = await prisma.transactionFlag.findUnique({ where: { id: params.flagId } });
  if (!flag) throw new FlagNotFoundError();
  if (flag.status !== "PENDING_REVIEW") throw new FlagAlreadyResolvedError();

  const filedAt = new Date();
  const slaDeadline = new Date(flag.createdAt.getTime() + env.TMS_STR_FILING_SLA_HOURS * 60 * 60 * 1000);
  const withinSla = filedAt <= slaDeadline;

  const updated = await prisma.transactionFlag.update({
    where: { id: flag.id },
    data: {
      status: "STR_FILED",
      reviewedByStaffId: params.staffUserId,
      reviewNotes: params.reviewNotes,
      strFiledAt: filedAt,
      strReferenceNumber: params.strReferenceNumber,
    },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "STR_FILED",
    entityType: "TransactionFlag",
    entityId: flag.id,
    metadata: { strReferenceNumber: params.strReferenceNumber, withinSla },
  });

  if (!withinSla) {
    logger.error(
      { flagId: flag.id, createdAt: flag.createdAt, filedAt },
      "STR filed outside the 24-hour SLA window — compliance process gap to review."
    );
  }

  return { ...updated, withinSla };
}

export async function dismissFlag(params: { staffUserId: string; flagId: string; reviewNotes: string }) {
  const flag = await prisma.transactionFlag.findUnique({ where: { id: params.flagId } });
  if (!flag) throw new FlagNotFoundError();
  if (flag.status !== "PENDING_REVIEW") throw new FlagAlreadyResolvedError();

  const updated = await prisma.transactionFlag.update({
    where: { id: flag.id },
    data: { status: "DISMISSED", reviewedByStaffId: params.staffUserId, reviewNotes: params.reviewNotes },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "TRANSACTION_FLAG_DISMISSED",
    entityType: "TransactionFlag",
    entityId: flag.id,
  });

  return updated;
}
