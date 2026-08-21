// === IMPORTS ===
import { prisma } from "../../lib/prisma.js";

/**
 * T2-B: Finance reconciliation read model — staff-only.
 *
 * Returns three pool figures as required by the Master Design Document §Finance:
 *  1. escrowHeldMinor   — funds currently locked in escrow (derived from milestone states)
 *  2. totalReleasedMinor — total ever released to freelancers
 *  3. platformFeeAccumulatedMinor — total platform fee revenue in PlatformOperatingAccount
 *  4. withholdingAccumulatedMinor — total withholding tax deducted, pending ERA remittance
 *
 * This is a read model over data that already exists — it does not require any
 * new payment infrastructure and does not move money.
 *
 * IMPORTANT: escrowHeldMinor is DERIVED from Milestone.escrowState — it represents
 * the sum of all milestone amounts currently in ESCROW_HELD or SUBMITTED_FOR_REVIEW.
 * This is the source of truth; it must match what's actually in the platform's
 * bank/Telebirr account once physical escrow separation is completed (TIER 3 blocker).
 */


// === MAIN FUNCTIONS ===
export async function getFinanceReconciliation(params?: {
  periodMonth?: string; // ISO format "2026-08" — if provided, also returns that month's withholding report
}) {
  const [
    escrowHeldResult,
    totalReleasedResult,
    platformAccount,
    withholdingReport,
  ] = await Promise.all([
    // Pool 1: Current escrow — sum of all milestones in flight
    prisma.milestone.aggregate({
      where: { escrowState: { in: ["ESCROW_HELD", "SUBMITTED_FOR_REVIEW", "DISPUTED"] } },
      _sum: { amountMinor: true },
      _count: { id: true },
    }),
    // Pool 2: Total ever released — historical total (not affected by withdrawals)
    prisma.milestone.aggregate({
      where: { escrowState: "RELEASED" },
      _sum: { amountMinor: true },
      _count: { id: true },
    }),
    // Pool 3: Platform operating revenue
    prisma.platformOperatingAccount.findUnique({ where: { id: "singleton" } }),
    // Optional: specific month's withholding report
    params?.periodMonth
      ? prisma.withholdingRemittanceReport.findUnique({ where: { periodMonth: params.periodMonth } })
      : Promise.resolve(null),
  ]);

  return {
    escrowHeldMinor: escrowHeldResult._sum.amountMinor ?? 0,
    escrowHeldMilestoneCount: escrowHeldResult._count.id,
    totalReleasedMinor: totalReleasedResult._sum.amountMinor ?? 0,
    totalReleasedMilestoneCount: totalReleasedResult._count.id,
    platformFeeAccumulatedMinor: platformAccount?.accumulatedFeeMinor ?? 0,
    withholdingAccumulatedMinor: platformAccount?.accumulatedWithholdingMinor ?? 0,
    platformAccountUpdatedAt: platformAccount?.updatedAt ?? null,
    // Monthly withholding detail if requested
    periodWithholdingReport: withholdingReport ?? null,
  };
}

/**
 * Returns a paginated list of PlatformFeeCredit records for per-milestone
 * fee reconciliation — Finance can cross-check each credit against the
 * corresponding PaymentTransaction and PaymentProvider receipt.
 */
export async function getFeeCreditLedger(params?: { page?: number; limit?: number }) {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.max(1, Math.min(200, params?.limit ?? 50));

  const [total, items] = await Promise.all([
    prisma.platformFeeCredit.count(),
    prisma.platformFeeCredit.findMany({
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { items, total, page, pageSize: limit };
}

/**
 * Returns all WithholdingRemittanceReport rows for Finance's ERA filing reference.
 */
export async function getWithholdingReports(params?: { page?: number; limit?: number }) {
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.max(1, Math.min(50, params?.limit ?? 12));

  const [total, items] = await Promise.all([
    prisma.withholdingRemittanceReport.count(),
    prisma.withholdingRemittanceReport.findMany({
      orderBy: { periodMonth: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return { items, total, page, pageSize: limit };
}

/**
 * Staff marks a withholding report as filed with ERA.
 * Does NOT submit anything to ERA — that is a manual human step (TIER 3).
 */
export async function markWithholdingReportFiled(params: {
  reportId: string;
  staffUserId: string;
  eraReferenceNumber: string;
}) {
  return prisma.withholdingRemittanceReport.update({
    where: { id: params.reportId },
    data: {
      filedAt: new Date(),
      filedByStaffId: params.staffUserId,
      eraReferenceNumber: params.eraReferenceNumber,
    },
  });
}
