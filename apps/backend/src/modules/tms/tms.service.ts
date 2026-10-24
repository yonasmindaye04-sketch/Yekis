// === IMPORTS ===
import type { TransactionFlagType } from "../../schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { notifyStaffOfEvent } from "../../lib/staffAlerts.js";
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
  // STR SLA deadline is fixed at detection time (flag.createdAt + 24h) so the
  // periodic scanner can measure breach against the original clock even if
  // the flag is only reviewed days later.
  const strDeadlineAt = new Date(
    Date.now() + env.TMS_STR_FILING_SLA_HOURS * 60 * 60 * 1000,
  );

  const flag = await prisma.transactionFlag.create({
    data: {
      userId: params.userId,
      type: params.type,
      details: params.details as never,
      relatedEntityId: params.relatedEntityId,
      strDeadlineAt,
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "TRANSACTION_FLAGGED",
    entityType: "TransactionFlag",
    entityId: flag.id,
    metadata: { type: params.type },
  });

  logger.warn(
    { flagId: flag.id, type: params.type, userId: params.userId },
    "AML rule triggered â€” flag created",
  );

  // Staff alert: flags previously landed in a dashboard nobody watched.
  await notifyStaffOfEvent({
    eventType: "tms-flag-raised",
    message: `AML flag raised for user ${params.userId}. Review the compliance queue.`,
    metadata: {
      flagId: flag.id,
      flagType: params.type,
      targetUserId: params.userId,
    },
  });

  return flag;
}

/**
 * Structuring check â€” Master Design Â§11.4: multiple deposits totaling
 * >ETB 500k within 7 days. Checked on the funding (client) side, since
 * that's who controls transaction sizing. Evaluated both inline after
 * each successful funding and by the periodic TMS scanner, so splitting
 * deposits across days inside the window is still caught.
 */
export async function runStructuringCheck(clientId: string) {
  const windowStart = new Date(
    Date.now() - env.TMS_STRUCTURING_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const recentPayments = await prisma.paymentTransaction.findMany({
    where: {
      status: "SUCCESS",
      createdAt: { gte: windowStart },
      milestone: { contract: { clientId } },
    },
    select: { id: true, amountMinor: true },
  });

  const totalMinor = recentPayments.reduce((sum, p) => sum + p.amountMinor, 0);

  if (
    recentPayments.length >= env.TMS_STRUCTURING_MIN_COUNT &&
    totalMinor > env.TMS_STRUCTURING_TOTAL_THRESHOLD_MINOR
  ) {
    return createFlag({
      userId: clientId,
      type: "STRUCTURING",
      details: {
        matchedTransactionIds: recentPayments.map((p) => p.id),
        windowHours: env.TMS_STRUCTURING_WINDOW_HOURS,
        count: recentPayments.length,
        totalMinor,
        thresholdMinor: env.TMS_STRUCTURING_TOTAL_THRESHOLD_MINOR,
      },
    });
  }
  return null;
}

/**
 * Round-amounts check â€” Master Design Â§11.4: repeated transactions of exact
 * round figures (e.g. 50k). Flags clients with several successful payments
 * in the window where every amount lands exactly on a round-unit multiple.
 */
export async function runRoundAmountsCheck(clientId: string) {
  const windowStart = new Date(
    Date.now() - env.TMS_ROUND_AMOUNT_WINDOW_DAYS * 24 * 60 * 60 * 1000,
  );

  const recentPayments = await prisma.paymentTransaction.findMany({
    where: {
      status: "SUCCESS",
      createdAt: { gte: windowStart },
      milestone: { contract: { clientId } },
    },
    select: { id: true, amountMinor: true },
  });

  const roundPayments = recentPayments.filter(
    (p) =>
      p.amountMinor >= env.TMS_ROUND_AMOUNT_UNIT_MINOR &&
      p.amountMinor % env.TMS_ROUND_AMOUNT_UNIT_MINOR === 0,
  );

  if (roundPayments.length >= env.TMS_ROUND_AMOUNT_MIN_COUNT) {
    return createFlag({
      userId: clientId,
      type: "ROUND_AMOUNTS",
      details: {
        matchedTransactionIds: roundPayments.map((p) => p.id),
        windowDays: env.TMS_ROUND_AMOUNT_WINDOW_DAYS,
        count: roundPayments.length,
        unitMinor: env.TMS_ROUND_AMOUNT_UNIT_MINOR,
      },
    });
  }
  return null;
}

/**
 * Velocity check â€” Master Design Â§11.4: volume >300% of the 90-day average.
 *
 * Baseline = the freelancer's release rate over the prior TMS_VELOCITY_BASELINE_DAYS
 * (excluding the recent window), expressed as the expected number of releases
 * in the recent window. A flag fires when actual releases exceed
 * max(TMS_VELOCITY_FLOOR_RELEASES, multiplier Ã— expected).
 *
 * The absolute floor exists so an account with little or no baseline history
 * cannot quietly release unlimited volume â€” new accounts bursting past the
 * floor still get human review.
 */
export async function runVelocityCheck(freelancerId: string) {
  const now = Date.now();
  const recentWindowStart = new Date(
    now - env.TMS_VELOCITY_WINDOW_HOURS * 60 * 60 * 1000,
  );
  const baselineWindowStart = new Date(
    now - env.TMS_VELOCITY_BASELINE_DAYS * 24 * 60 * 60 * 1000,
  );

  const [recentReleases, baselineReleases] = await Promise.all([
    prisma.milestone.count({
      where: {
        escrowState: "RELEASED",
        releasedAt: { gte: recentWindowStart },
        contract: { freelancerId },
      },
    }),
    prisma.milestone.count({
      where: {
        escrowState: "RELEASED",
        releasedAt: { gte: baselineWindowStart, lt: recentWindowStart },
        contract: { freelancerId },
      },
    }),
  ]);

  if (recentReleases === 0) return null;

  const expectedInRecentWindow =
    (baselineReleases / env.TMS_VELOCITY_BASELINE_DAYS) *
    (env.TMS_VELOCITY_WINDOW_HOURS / 24);
  const allowedReleases = Math.max(
    env.TMS_VELOCITY_FLOOR_RELEASES,
    Math.ceil(env.TMS_VELOCITY_MULTIPLIER * expectedInRecentWindow),
  );

  if (recentReleases > allowedReleases) {
    return createFlag({
      userId: freelancerId,
      type: "VELOCITY",
      details: {
        windowHours: env.TMS_VELOCITY_WINDOW_HOURS,
        releaseCount: recentReleases,
        allowedReleases,
        baselineDays: env.TMS_VELOCITY_BASELINE_DAYS,
        baselineReleaseCount: baselineReleases,
        multiplier: env.TMS_VELOCITY_MULTIPLIER,
      },
    });
  }
  return null;
}

/**
 * Pass-through check â€” funds released and then (nearly) fully withdrawn
 * shortly after, with no other active contract work in between. Called
 * from the withdrawal flow, not on every webhook, since it only makes
 * sense to evaluate at withdrawal time.
 */
export async function runPassThroughCheck(params: {
  userId: string;
  withdrawalAmountMinor: number;
}) {
  const windowStart = new Date(
    Date.now() - env.TMS_PASS_THROUGH_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const recentRelease = await prisma.milestone.findFirst({
    where: {
      contract: { freelancerId: params.userId },
      escrowState: "RELEASED",
      releasedAt: { gte: windowStart },
    },
    orderBy: { releasedAt: "desc" },
  });
  if (!recentRelease) return null;

  const activeContracts = await prisma.contract.count({
    where: { freelancerId: params.userId, job: { status: "IN_PROGRESS" } },
  });

  const isMostlyFullWithdrawal =
    params.withdrawalAmountMinor >= recentRelease.amountMinor * 0.9;

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
 * Wallet mismatch â€” the withdrawal destination doesn't match the identity
 * on file (registered phone). A mismatch here is worth holding the
 * withdrawal for, not just logging after the fact â€” see the route layer's
 * use of WithdrawalHeldForReviewError.
 */
export async function checkWalletMismatch(params: {
  userId: string;
  payoutAccountIdentifier: string;
}) {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: params.userId },
  });

  const normalizedPhone = user.phone.replace(/\s+/g, "");
  const normalizedPayout = params.payoutAccountIdentifier.replace(/\s+/g, "");

  if (normalizedPhone !== normalizedPayout) {
    const existingFlag = await prisma.transactionFlag.findFirst({
      where: {
        userId: params.userId,
        type: "WALLET_MISMATCH",
        status: "PENDING_REVIEW",
      },
    });

    if (!existingFlag) {
      await createFlag({
        userId: params.userId,
        type: "WALLET_MISMATCH",
        details: {
          registeredPhone: user.phone,
          payoutAccountIdentifier: params.payoutAccountIdentifier,
        },
      });
    }
    return false; // mismatch
  }
  return true; // matches
}

/**
 * Convenience wrapper called after a milestone is successfully funded.
 * Failures here must never break the webhook's own success response â€”
 * callers should wrap this in try/catch (see escrow.service.ts).
 */
export async function runPostFundingChecks(clientId: string) {
  await runStructuringCheck(clientId);
  await runRoundAmountsCheck(clientId);
}

/**
 * Periodic TMS scan â€” invoked by the tms-scan BullMQ worker every 15
 * minutes (master design: "automated background queue scans database
 * entries every 15 minutes"). Re-runs the windowed rules across every
 * user with recent activity, catching patterns the inline event hooks
 * miss (e.g. deposits split across days inside the structuring window,
 * or velocity building up without an individual release triggering it).
 */
export async function runTmsScan() {
  const fundingWindowStart = new Date(
    Date.now() -
      Math.max(
        env.TMS_STRUCTURING_WINDOW_HOURS,
        env.TMS_ROUND_AMOUNT_WINDOW_DAYS * 24,
      ) *
        60 *
        60 *
        1000,
  );
  const releaseWindowStart = new Date(
    Date.now() - env.TMS_VELOCITY_WINDOW_HOURS * 60 * 60 * 1000,
  );

  const [activeClients, activeFreelancers] = await Promise.all([
    prisma.paymentTransaction.findMany({
      where: { status: "SUCCESS", createdAt: { gte: fundingWindowStart } },
      select: {
        milestone: { select: { contract: { select: { clientId: true } } } },
      },
      distinct: ["milestoneId"],
    }),
    prisma.milestone.findMany({
      where: {
        escrowState: "RELEASED",
        releasedAt: { gte: releaseWindowStart },
      },
      select: { contract: { select: { freelancerId: true } } },
      distinct: ["contractId"],
    }),
  ]);

  const clientIds = [
    ...new Set(activeClients.map((t) => t.milestone.contract.clientId)),
  ];
  const freelancerIds = [
    ...new Set(activeFreelancers.map((m) => m.contract.freelancerId)),
  ];

  let flagsRaised = 0;
  for (const clientId of clientIds) {
    try {
      const s = await runStructuringCheck(clientId);
      if (s) flagsRaised++;
      const r = await runRoundAmountsCheck(clientId);
      if (r) flagsRaised++;
    } catch (err) {
      logger.error({ err, clientId }, "TMS scan check failed for client");
    }
  }
  for (const freelancerId of freelancerIds) {
    try {
      const v = await runVelocityCheck(freelancerId);
      if (v) flagsRaised++;
    } catch (err) {
      logger.error(
        { err, freelancerId },
        "TMS scan check failed for freelancer",
      );
    }
  }

  const strBreaches = await sweepOverdueStrFlags();

  if (flagsRaised > 0 || strBreaches > 0) {
    logger.warn(
      {
        clientsScanned: clientIds.length,
        freelancersScanned: freelancerIds.length,
        flagsRaised,
        strBreaches,
      },
      "TMS periodic scan complete",
    );
  }
  return {
    clientsScanned: clientIds.length,
    freelancersScanned: freelancerIds.length,
    flagsRaised,
    strBreaches,
  };
}

/**
 * STR SLA enforcement â€” Master Design Â§11.4 / compliance calendar: STRs must
 * reach the FIC within 24 hours of suspicion. Flags still PENDING_REVIEW past
 * their detection-time deadline raise a one-time audit event + staff alert so
 * the breach is visible and reportable, without spamming alerts on every scan.
 */
async function sweepOverdueStrFlags(): Promise<number> {
  const overdue = await prisma.transactionFlag.findMany({
    where: {
      status: "PENDING_REVIEW",
      strDeadlineAt: { lt: new Date() },
    },
  });

  let newlyBreached = 0;
  for (const flag of overdue) {
    const details = (flag.details ?? {}) as Record<string, unknown>;
    if (details.strSlaBreachAlertedAt) continue;

    const alertedAt = new Date().toISOString();
    await prisma.transactionFlag.update({
      where: { id: flag.id },
      data: {
        details: { ...details, strSlaBreachAlertedAt: alertedAt } as never,
      },
    });

    await recordAuditEvent({
      userId: flag.userId,
      eventType: "STR_SLA_BREACH",
      entityType: "TransactionFlag",
      entityId: flag.id,
      metadata: { deadline: flag.strDeadlineAt?.toISOString(), alertedAt },
    });

    await notifyStaffOfEvent({
      eventType: "str-sla-breach",
      message: `STR filing deadline breached for flag ${flag.id} â€” file with the FIC immediately.`,
      metadata: {
        flagId: flag.id,
        flagType: flag.type,
        targetUserId: flag.userId,
      },
    });

    logger.error(
      { flagId: flag.id },
      "STR SLA breached â€” flag still unfiled past the 24-hour deadline.",
    );
    newlyBreached++;
  }
  return newlyBreached;
}

export async function getComplianceQueue(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  flagType?: string;
}) {
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
        { email: { contains: params.search, mode: "insensitive" } },
        { phone: { contains: params.search } },
        { ucid: { contains: params.search, mode: "insensitive" } },
      ],
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
              select: {
                id: true,
                type: true,
                status: true,
                createdAt: true,
                strFiledAt: true,
              },
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { items, total, page, pageSize: limit };
}

export async function getActivityFeed() {
  return prisma.auditLog.findMany({
    where: {
      user: {
        staffRole: { not: null },
      },
    },
    include: {
      user: { select: { id: true, email: true, staffRole: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 15,
  });
}

/**
 * Records that a Compliance Officer has manually filed an STR with the
 * FIC. There is no FIC filing API â€” Ethiopia's suspicious-transaction
 * reporting is a real regulatory filing a human completes through
 * official channels; this endpoint records that it happened, the
 * reference number received, and whether it met the 24-hour SLA â€” it does
 * not automate something that isn't automatable.
 *
 * Per Master Design Â§11.4, filing an STR means suspicion was confirmed:
 * "if confirmed, freeze funds, suspend the account, and preserve records."
 * When suspendAccount is set, the user account is suspended immediately
 * (login + all authenticated actions blocked via the auth middleware's
 * per-request suspension check) with a dedicated audit event. Escrow-held
 * milestone funds are untouched â€” they resolve through the dispute path.
 */
export async function fileStr(params: {
  staffUserId: string;
  flagId: string;
  reviewNotes: string;
  strReferenceNumber: string;
  suspendAccount?: boolean;
}) {
  const flag = await prisma.transactionFlag.findUnique({
    where: { id: params.flagId },
  });
  if (!flag) throw new FlagNotFoundError();
  if (flag.status !== "PENDING_REVIEW") throw new FlagAlreadyResolvedError();

  const filedAt = new Date();
  const slaDeadline = new Date(
    flag.createdAt.getTime() + env.TMS_STR_FILING_SLA_HOURS * 60 * 60 * 1000,
  );
  const withinSla = filedAt <= slaDeadline;

  const updated = await prisma.$transaction(async (tx) => {
    const record = await tx.transactionFlag.update({
      where: { id: flag.id },
      data: {
        status: "STR_FILED",
        reviewedByStaffId: params.staffUserId,
        reviewNotes: params.reviewNotes,
        strFiledAt: filedAt,
        strReferenceNumber: params.strReferenceNumber,
      },
    });

    if (params.suspendAccount) {
      await tx.user.update({
        where: { id: flag.userId },
        data: { isSuspended: true },
      });
    }

    return record;
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "STR_FILED",
    entityType: "TransactionFlag",
    entityId: flag.id,
    metadata: {
      strReferenceNumber: params.strReferenceNumber,
      withinSla,
      accountSuspended: !!params.suspendAccount,
    },
  });

  if (params.suspendAccount) {
    await recordAuditEvent({
      userId: flag.userId,
      eventType: "USER_SUSPENDED_STR",
      entityType: "User",
      entityId: flag.userId,
      metadata: { flagId: flag.id, suspendedByStaffId: params.staffUserId },
    });
  }

  if (!withinSla) {
    logger.error(
      { flagId: flag.id, createdAt: flag.createdAt, filedAt },
      "STR filed outside the 24-hour SLA window â€” compliance process gap to review.",
    );
  }

  return { ...updated, withinSla };
}

export async function dismissFlag(params: {
  staffUserId: string;
  flagId: string;
  reviewNotes: string;
}) {
  const flag = await prisma.transactionFlag.findUnique({
    where: { id: params.flagId },
  });
  if (!flag) throw new FlagNotFoundError();
  if (flag.status !== "PENDING_REVIEW") throw new FlagAlreadyResolvedError();

  const updated = await prisma.transactionFlag.update({
    where: { id: flag.id },
    data: {
      status: "DISMISSED",
      reviewedByStaffId: params.staffUserId,
      reviewNotes: params.reviewNotes,
    },
  });

  await recordAuditEvent({
    userId: params.staffUserId,
    eventType: "TRANSACTION_FLAG_DISMISSED",
    entityType: "TransactionFlag",
    entityId: flag.id,
  });

  return updated;
}

export async function liftComplianceHold(params: {
  staffUserId: string;
  userId: string;
  reason?: string;
}) {
  const user = await prisma.user.update({
    where: { id: params.userId },
    data: {
      isComplianceHeld: false,
      complianceHeldAt: null,
      complianceHeldReason: null,
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "USER_COMPLIANCE_LIFTED",
    entityType: "User",
    entityId: params.userId,
    metadata: {
      reason: params.reason || "Manual lift",
      staffUserId: params.staffUserId,
    },
  });

  return user;
}
