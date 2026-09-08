// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { objectStoreClient } from "../../lib/objectStore.js";
import { env } from "../../config/env.js";

// === RECONCILIATION ===
/**
 * Reconciliation between payment-provider records (PaymentTransaction) and the
 * internal escrow/ledger state (Milestone escrowState). Produces a real status
 * per provider transaction without fabricating provider data.
 */
export async function listReconciliation(params: {
  page: number;
  limit: number;
  recStatus?: string;
  provider?: string;
}) {
  const { page, limit } = params;
  const where: Record<string, unknown> = {};
  if (params.provider && params.provider !== "ALL") {
    where.provider = params.provider;
  }

  const [items, total] = await prisma.$transaction([
    prisma.paymentTransaction.findMany({
      where,
      include: {
        milestone: {
          select: {
            id: true,
            title: true,
            escrowState: true,
            amountMinor: true,
            contract: {
              select: {
                job: { select: { title: true } },
                client: { select: { email: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.paymentTransaction.count({ where }),
  ]);

  let all = items;
  const augmented = all.map((tx) => {
    let recStatus = "PENDING";
    let internalAmountMinor: number | null = null;
    const escrow = tx.milestone?.escrowState;
    if (tx.status === "FAILED") {
      recStatus = "FAILED";
    } else if (tx.status === "SUCCESS") {
      if (
        escrow &&
        ["ESCROW_HELD", "SUBMITTED_FOR_REVIEW", "RELEASED", "ACCEPTED"].includes(
          escrow,
        )
      ) {
        recStatus = "MATCHED";
        internalAmountMinor = tx.milestone?.amountMinor ?? null;
      } else {
        // Provider said paid, internal escrow never held → investigation.
        recStatus = "MISMATCH";
      }
    }
    const internalAmount = internalAmountMinor ?? (tx.milestone?.amountMinor ?? null);
    const diff =
      internalAmount != null ? tx.amountMinor - internalAmount : null;

    return { ...tx, reconciliationStatus: recStatus, differenceMinor: diff };
  });

  if (params.recStatus && params.recStatus !== "ALL") {
    const filtered = augmented.filter(
      (r) => r.reconciliationStatus === params.recStatus,
    );
    return { items: filtered, total: filtered.length, page, pageSize: limit };
  }

  return { items: augmented, total, page, pageSize: limit };
}

// === REPORTS SUMMARY ===
export async function getReportsSummary() {
  const [
    paymentsAgg,
    milestonesAgg,
    refundsAgg,
    payoutsAgg,
    platformAccount,
    clientCount,
    freelancerCount,
    contractAgg,
    disputeAgg,
    flagCount,
  ] = await Promise.all([
    prisma.paymentTransaction.aggregate({
      _sum: { amountMinor: true },
      where: { status: "SUCCESS" },
    }),
    prisma.milestone.aggregate({
      _sum: { amountMinor: true },
      where: { escrowState: "RELEASED" },
    }),
    prisma.milestone.aggregate({
      _sum: { amountMinor: true },
      where: { escrowState: { in: ["REFUNDED", "PARTIAL_REFUND"] } },
    }),
    prisma.payoutTransaction.aggregate({
      _sum: { netAmountMinor: true },
      where: { status: "CONFIRMED" },
    }),
    prisma.platformOperatingAccount.findUnique({ where: { id: "singleton" } }),
    prisma.user.count({ where: { role: { in: ["CLIENT", "BOTH"] } } }),
    prisma.user.count({ where: { role: { in: ["FREELANCER", "BOTH"] } } }),
    prisma.contract.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.dispute.count({ where: { stage: { not: "RESOLVED" } } }),
    prisma.transactionFlag.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  const contractCounts: Record<string, number> = {};
  for (const row of contractAgg) contractCounts[row.status] = row._count.status;
  const totalContracts = Object.values(contractCounts).reduce((a, b) => a + b, 0);
  const failedPayments = await prisma.paymentTransaction.count({
    where: { status: "FAILED" },
  });
  const failedPayouts = await prisma.payoutTransaction.count({
    where: { status: { in: ["FAILED", "REVERSED"] } },
  });

  return {
    financial: {
      transactionVolumeMinor: paymentsAgg._sum.amountMinor ?? 0,
      releasedFundsMinor: milestonesAgg._sum.amountMinor ?? 0,
      refundedFundsMinor: refundsAgg._sum.amountMinor ?? 0,
      payoutsMinor: payoutsAgg._sum.netAmountMinor ?? 0,
      platformFeesMinor: platformAccount?.accumulatedFeeMinor ?? 0,
      withholdingMinor: platformAccount?.accumulatedWithholdingMinor ?? 0,
      failedPaymentCount: failedPayments,
      failedPayoutCount: failedPayouts,
    },
    marketplace: {
      clientCount,
      freelancerCount,
      totalContracts,
      contractsByStatus: contractCounts,
      openDisputes: disputeAgg,
      openRiskFlags: flagCount,
    },
    generatedAt: new Date().toISOString(),
  };
}

// === DASHBOARD SUMMARY (Phase 8 overview) ===
export async function getDashboardSummary() {
  const [
    totalUsers,
    activeContracts,
    escrowHeld,
    pendingPayouts,
    openDisputes,
    pendingKyc,
    openChats,
    pendingPayments,
    pendingTopups,
    recentActivity,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.contract.count({ where: { status: "ACTIVE" } }),
    prisma.milestone.aggregate({
      _sum: { amountMinor: true },
      where: { escrowState: { in: ["ESCROW_HELD", "SUBMITTED_FOR_REVIEW", "WORK_IN_PROGRESS"] } },
    }),
    prisma.payoutTransaction.count({ where: { status: { in: ["PENDING", "PROCESSING"] } } }),
    prisma.dispute.count({ where: { stage: { not: "RESOLVED" } } }),
    prisma.kycRecord.count({ where: { status: "PENDING" } }),
    prisma.conversation.count({ where: { status: "OPEN" } }),
    prisma.paymentTransaction.count({ where: { status: "PENDING" } }),
    prisma.walletTopUp.count({ where: { status: "PENDING" } }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 12,
      select: {
        id: true,
        eventType: true,
        action: true,
        entityType: true,
        entityId: true,
        createdAt: true,
        actorRole: true,
        amountMinor: true,
      },
    }),
  ]);

  return {
    metrics: {
      totalUsers,
      activeContracts,
      fundsInEscrowMinor: escrowHeld._sum.amountMinor ?? 0,
      pendingPayouts,
      openDisputes,
      pendingIdentity: pendingKyc,
      openSupportTickets: openChats,
      pendingPayments,
      pendingTopUps: pendingTopups,
    },
    recentActivity,
  };
}

// === MONITORING / SYSTEM HEALTH ===
export async function getSystemHealth() {
  const checks: Record<string, { ok: boolean; detail?: string }> = {};

  // Database
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    checks.database = { ok: true };
  } catch (err) {
    checks.database = { ok: false, detail: String(err) };
  }

  // Redis
  try {
    await redis.ping();
    checks.redis = { ok: true };
  } catch (err) {
    checks.redis = { ok: false, detail: String(err) };
  }

  // Object store reachability (best-effort S3 HeadBucket)
  try {
    await objectStoreClient.send(
      new HeadBucketCommand({ Bucket: env.OBJECT_STORE_BUCKET }),
    );
    checks.objectStore = { ok: true };
  } catch (err) {
    checks.objectStore = { ok: false, detail: String(err) };
  }

  // Payment provider configuration presence (no outbound call — signals whether
  // the rails are wired, not whether the PSP is reachable).
  checks.telebirrConfigured = {
    ok: Boolean(
      env.TELEBIRR_APP_SECRET &&
        env.TELEBIRR_FABRIC_APP_ID &&
        env.TELEBIRR_MERCHANT_APP_ID,
    ),
  };

  const integrity = await prisma.ledgerEntry.aggregate({
    _sum: { debitMinor: true, creditMinor: true },
  });

  return {
    checks,
    ledger: {
      debitsMinor: integrity._sum.debitMinor ?? 0,
      creditsMinor: integrity._sum.creditMinor ?? 0,
      isBalanced:
        (integrity._sum.debitMinor ?? 0) === (integrity._sum.creditMinor ?? 0),
    },
    checkedAt: new Date().toISOString(),
  };
}