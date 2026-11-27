// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";
import { redis } from "../../lib/redis.js";
import { HeadBucketCommand } from "@aws-sdk/client-s3";
import { objectStoreClient } from "../../lib/objectStore.js";
import { env } from "../../config/env.js";

const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

function eatMonthKey(date: Date): string {
  const eat = new Date(date.getTime() + EAT_OFFSET_MS);
  return `${eat.getUTCFullYear()}-${String(eat.getUTCMonth() + 1).padStart(2, "0")}`;
}

function trailingEatMonthKeys(now: Date, count = 6): string[] {
  const eatNow = new Date(now.getTime() + EAT_OFFSET_MS);
  const out: string[] = [];
  for (let i = count - 1; i >= 0; i -= 1) {
    const d = new Date(
      Date.UTC(eatNow.getUTCFullYear(), eatNow.getUTCMonth() - i, 1),
    );
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`,
    );
  }
  return out;
}

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

  const filterByRecStatus = Boolean(params.recStatus && params.recStatus !== "ALL");
  if (params.recStatus === "FAILED") {
    where.status = "FAILED";
  }

  const [items, total] = filterByRecStatus
    ? await prisma.$transaction([
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
        }),
        prisma.paymentTransaction.count({ where }),
      ])
    : await prisma.$transaction([
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

  const augmented = items.map((tx) => {
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
        // Provider said paid, internal escrow never held -> investigation.
        recStatus = "MISMATCH";
      }
    }
    const internalAmount = internalAmountMinor ?? tx.milestone?.amountMinor ?? null;
    const diff =
      internalAmount != null ? tx.amountMinor - internalAmount : null;

    return { ...tx, reconciliationStatus: recStatus, differenceMinor: diff };
  });

  if (filterByRecStatus) {
    const filtered = augmented.filter(
      (r) => r.reconciliationStatus === params.recStatus,
    );
    const paged = filtered.slice((page - 1) * limit, page * limit);
    return { items: paged, total: filtered.length, page, pageSize: limit };
  }

  return { items: augmented, total, page, pageSize: limit };
}

// === REPORTS SUMMARY ===
export async function getReportsSummary() {
  const now = new Date();
  const monthKeys = trailingEatMonthKeys(now, 6);
  const firstMonth = monthKeys[0] ?? "2026-01";
  const [startY = 2026, startM = 1] = firstMonth.split("-").map(Number);
  const windowStart = new Date(Date.UTC(startY, startM - 1, 1) - EAT_OFFSET_MS);

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
    failedPayments,
    failedPayouts,
    windowPayments,
    windowPayouts,
    windowRefundedMilestones,
    windowFeeCredits,
    paymentByRail,
    payoutByRail,
    completedContracts,
    completedGigOrders,
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
    prisma.paymentTransaction.count({ where: { status: "FAILED" } }),
    prisma.payoutTransaction.count({
      where: { status: { in: ["FAILED", "REVERSED"] } },
    }),
    prisma.paymentTransaction.findMany({
      where: { createdAt: { gte: windowStart } },
      select: { provider: true, status: true, amountMinor: true, createdAt: true },
    }),
    prisma.payoutTransaction.findMany({
      where: { createdAt: { gte: windowStart }, status: "CONFIRMED" },
      select: { provider: true, netAmountMinor: true, createdAt: true },
    }),
    prisma.milestone.findMany({
      where: {
        createdAt: { gte: windowStart },
        escrowState: { in: ["REFUNDED", "PARTIAL_REFUND"] },
      },
      select: { amountMinor: true, createdAt: true },
    }),
    prisma.platformFeeCredit.findMany({
      where: { createdAt: { gte: windowStart } },
      select: {
        feeFromFreelancerMinor: true,
        feeFromClientMinor: true,
        createdAt: true,
      },
    }),
    prisma.paymentTransaction.groupBy({
      by: ["provider", "status"],
      _sum: { amountMinor: true },
      _count: { id: true },
    }),
    prisma.payoutTransaction.groupBy({
      by: ["provider", "status"],
      _sum: { netAmountMinor: true },
      _count: { id: true },
    }),
    prisma.contract.findMany({
      where: { status: "COMPLETED" },
      select: {
        job: { select: { category: true } },
        milestones: { select: { amountMinor: true, escrowState: true } },
      },
    }),
    prisma.gigOrder.findMany({
      where: { status: "COMPLETED" },
      select: {
        totalChargeMinor: true,
        gig: { select: { category: true } },
      },
    }),
  ]);

  const contractCounts: Record<string, number> = {};
  for (const row of contractAgg) contractCounts[row.status] = row._count.status;
  const totalContracts = Object.values(contractCounts).reduce((a, b) => a + b, 0);

  const monthMap = new Map(
    monthKeys.map((month) => [
      month,
      {
        month,
        label: month.slice(2),
        volumeMinor: 0,
        payoutMinor: 0,
        refundMinor: 0,
        feeMinor: 0,
        telebirrMinor: 0,
        cbeBirrMinor: 0,
        mpesaMinor: 0,
      },
    ]),
  );

  for (const p of windowPayments) {
    if (p.status !== "SUCCESS") continue;
    const bucket = monthMap.get(eatMonthKey(p.createdAt));
    if (!bucket) continue;
    bucket.volumeMinor += p.amountMinor;
    if (p.provider === "TELEBIRR") bucket.telebirrMinor += p.amountMinor;
    else if (p.provider === "CBE_BIRR") bucket.cbeBirrMinor += p.amountMinor;
    else if (p.provider === "M_PESA") bucket.mpesaMinor += p.amountMinor;
  }

  for (const po of windowPayouts) {
    const bucket = monthMap.get(eatMonthKey(po.createdAt));
    if (bucket) bucket.payoutMinor += po.netAmountMinor;
  }

  for (const m of windowRefundedMilestones) {
    const bucket = monthMap.get(eatMonthKey(m.createdAt));
    if (bucket) bucket.refundMinor += m.amountMinor;
  }

  for (const fc of windowFeeCredits) {
    const bucket = monthMap.get(eatMonthKey(fc.createdAt));
    if (bucket) {
      bucket.feeMinor += fc.feeFromFreelancerMinor + fc.feeFromClientMinor;
    }
  }

  type RailKey = "TELEBIRR" | "CBE_BIRR" | "M_PESA";
  const railMap: Record<
    RailKey,
    { provider: RailKey; volumeMinor: number; payoutMinor: number; count: number; failedCount: number }
  > = {
    TELEBIRR: { provider: "TELEBIRR", volumeMinor: 0, payoutMinor: 0, count: 0, failedCount: 0 },
    CBE_BIRR: { provider: "CBE_BIRR", volumeMinor: 0, payoutMinor: 0, count: 0, failedCount: 0 },
    M_PESA: { provider: "M_PESA", volumeMinor: 0, payoutMinor: 0, count: 0, failedCount: 0 },
  };
  for (const row of paymentByRail) {
    if (!(row.provider in railMap)) continue;
    const target = railMap[row.provider as RailKey];
    if (row.status === "SUCCESS") {
      target.volumeMinor += row._sum.amountMinor ?? 0;
      target.count += row._count.id;
    } else if (row.status === "FAILED") {
      target.failedCount += row._count.id;
    }
  }
  for (const row of payoutByRail) {
    if (!(row.provider in railMap)) continue;
    const target = railMap[row.provider as RailKey];
    if (row.status === "CONFIRMED") {
      target.payoutMinor += row._sum.netAmountMinor ?? 0;
    } else if (row.status === "FAILED" || row.status === "REVERSED") {
      target.failedCount += row._count.id;
    }
  }

  const categoryMap = new Map<string, { category: string; count: number; volumeMinor: number }>();
  for (const c of completedContracts) {
    const cat = c.job.category;
    const cur = categoryMap.get(cat) ?? { category: cat, count: 0, volumeMinor: 0 };
    cur.count += 1;
    cur.volumeMinor += c.milestones.reduce((s, m) => s + m.amountMinor, 0);
    categoryMap.set(cat, cur);
  }
  for (const o of completedGigOrders) {
    const cat = o.gig.category;
    const cur = categoryMap.get(cat) ?? { category: cat, count: 0, volumeMinor: 0 };
    cur.count += 1;
    cur.volumeMinor += o.totalChargeMinor;
    categoryMap.set(cat, cur);
  }
  const categories = [...categoryMap.values()]
    .sort((a, b) => b.count - a.count || b.volumeMinor - a.volumeMinor)
    .slice(0, 8);

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
    feeConfiguration: {
      freelancerFeeRate: env.PLATFORM_FEE_RATE_FREELANCER,
      clientFeeRate: env.PLATFORM_FEE_RATE_CLIENT,
      providerFeeRate: env.PAYMENT_PROVIDER_FEE_RATE,
      withholdingEnabled: env.TIN_FEATURE_ENABLED,
    },
    months: [...monthMap.values()],
    rails: Object.values(railMap),
    categories,
    generatedAt: now.toISOString(),
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
    // Only records a Compliance Officer can actually decide on. PENDING means
    // "registered, never uploaded a document" — no evidence exists, so there
    // is nothing to review. Counting it reported bare signups as pending KYC
    // (128 users => 10 "pending KYC" whose documentNumber was null), and the
    // review queue it was meant to mirror does not list them either. Keep this
    // in lockstep with getReviewQueue's default filter.
    prisma.kycRecord.count({ where: { status: "UNDER_REVIEW" } }),
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
    feeConfiguration: {
      freelancerFeeRate: env.PLATFORM_FEE_RATE_FREELANCER,
      clientFeeRate: env.PLATFORM_FEE_RATE_CLIENT,
      providerFeeRate: env.PAYMENT_PROVIDER_FEE_RATE,
      withholdingEnabled: env.TIN_FEATURE_ENABLED,
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
  checks.cbeConfigured = {
    ok: Boolean(env.CBE_BIRR_CHECKOUT_ENABLED || env.CBE_WEBHOOK_ENABLED),
    detail: env.CBE_BIRR_CHECKOUT_ENABLED
      ? "CBE checkout enabled"
      : env.CBE_WEBHOOK_ENABLED
        ? "CBE webhook enabled"
        : "Disabled via config",
  };
  checks.mpesaConfigured = {
    ok: Boolean(env.MPESA_CHECKOUT_ENABLED),
    detail: env.MPESA_CHECKOUT_ENABLED ? "M-Pesa checkout enabled" : "Disabled via config",
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