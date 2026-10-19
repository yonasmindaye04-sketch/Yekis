// === IMPORTS ===
import { Queue, Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../lib/audit.js";
import { logger } from "../lib/logger.js";

/**
 * T2-C: Monthly withholding tax summary batch job.
 *
 * Runs on the 1st of each month at 02:00 EAT (UTC+3 = 23:00 UTC previous night).
 * Runs monthly and aggregates the withholding actually deducted during the
 * prior Ethiopian calendar month into a WithholdingRemittanceReport row.
 *
 * IMPORTANT: This job computes what's owed to ERA — it does NOT file anything.
 * A staff member (Finance/Compliance) must use the generated report to file
 * the withholding tax remittance manually with ERA.
 *
 * TIER 3 BLOCKER: Automated ERA filing is not implemented. ERA does not currently
 * offer a machine-readable API for withholding tax remittance. A human must
 * use the report generated here to complete the paper/portal filing.
 * See COMPLIANCE_BLOCKERS.md §ERA Tax Remittance.
 */

const withholdingRemittanceQueue = new Queue("withholding-remittance", {
  connection: redis,
});

/**
 * Ethiopia Time, UTC+3, no daylight saving.
 *
 * The period boundary has to be an Ethiopian calendar month, because that is
 * what ERA files against. Computing it with `new Date(y, m, d)` uses the HOST's
 * local timezone instead, so the same job computed a different month depending
 * on where it ran -- and a UTC host silently produced UTC months while the
 * comments all claimed EAT. The offset is therefore stated explicitly and
 * applied by hand, making the result identical on any machine.
 */
const EAT_OFFSET_MS = 3 * 60 * 60 * 1000;

/** The prior Ethiopian calendar month, as UTC instants. */
export function priorEatMonthBounds(now: Date) {
  const nowEat = new Date(now.getTime() + EAT_OFFSET_MS);
  const thisYear = nowEat.getUTCFullYear();
  const thisMonth = nowEat.getUTCMonth(); // 0-based
  const year = thisMonth === 0 ? thisYear - 1 : thisYear;
  const month = thisMonth === 0 ? 11 : thisMonth - 1;

  return {
    periodMonth: `${year}-${String(month + 1).padStart(2, "0")}`,
    // EAT month boundaries, converted to the UTC instants they correspond to.
    start: new Date(Date.UTC(year, month, 1) - EAT_OFFSET_MS),
    end: new Date(Date.UTC(year, month + 1, 1) - EAT_OFFSET_MS),
  };
}

/**
 * Builds the report for the prior Ethiopian month.
 *
 * WHICH TABLE IS SUMMED, AND WHY IT IS NOT PaymentTransaction
 *
 * Withholding is not a property of a payment; it is a deduction made when money
 * is RELEASED to a freelancer. Two consequences follow, and both broke the old
 * query:
 *
 *   - PaymentTransaction.withholdingTaxMinor is stamped at FUNDING, and only
 *     the provider rail creates PaymentTransactions at all. A milestone funded
 *     from the platform wallet has no such row, so its withholding was missing
 *     from the return entirely. That is not an edge case: wallet funding is the
 *     normal path.
 *   - Stamping at funding also computes tax on a different number than the one
 *     actually withheld, because the rate depends on the freelancer's TIN and
 *     the threshold depends on the amount released. A TIN added after funding
 *     retroactively moved the figure.
 *
 * PlatformFeeCredit is written by recordPlatformEarnings at release, carries
 * withholdingMinor, and is the single append-only ledger covering BOTH contract
 * milestone releases and gig-order releases. It is therefore the only table
 * that reflects withholding actually deducted, which is the number ERA is owed.
 *
 * Exporting this separately from the BullMQ callback is what makes it testable
 * at all: a Worker body is not reachable without a live queue and a timer.
 */
export async function generateWithholdingRemittanceReport(now = new Date()) {
  const { periodMonth, start: periodStart, end: periodEnd } = priorEatMonthBounds(now);

  const existing = await prisma.withholdingRemittanceReport.findUnique({
    where: { periodMonth },
  });
  if (existing) {
    logger.info(
      { periodMonth },
      "Withholding remittance report already exists for period — skipping",
    );
    return existing;
  }

  const result = await prisma.platformFeeCredit.aggregate({
    where: { createdAt: { gte: periodStart, lt: periodEnd } },
    _sum: { withholdingMinor: true },
    _count: { id: true },
  });

  const totalWithholdingMinor = result._sum.withholdingMinor ?? 0;
  // Counts withholding-bearing releases, not provider payments. A wallet-funded
  // release now contributes one, which it previously did not.
  const transactionCount = result._count.id;

  const report = await prisma.withholdingRemittanceReport.create({
    data: { periodMonth, totalWithholdingMinor, transactionCount },
  });

  await recordAuditEvent({
    eventType: "WITHHOLDING_REMITTANCE_REPORT_GENERATED",
    entityType: "WithholdingRemittanceReport",
    entityId: report.id,
    metadata: { periodMonth, totalWithholdingMinor, transactionCount },
  });

  logger.info(
    { periodMonth, totalWithholdingMinor, transactionCount },
    "Withholding remittance report generated — Finance must use this to file with ERA manually.",
  );

  return report;
}

export const withholdingRemittanceWorker = new Worker(
  "withholding-remittance",
  async () => {
    await generateWithholdingRemittanceReport();
  },
  { connection: redis },
);

/** Call once at startup — BullMQ deduplicates by jobId, safe to call on every boot. */
export async function scheduleWithholdingRemittanceJob() {
  await withholdingRemittanceQueue.add(
    "monthly-withholding-sweep",
    {},
    {
      // 23:00 UTC on the 1st = 02:00 EAT on the 2nd. The prior comment said
      // "02:00 EAT on the 1st", which this pattern never was — it computes the
      // prior month either way, so the report content is unaffected, but the
      // stated run time was wrong and would mislead anyone reading the log when
      // a month looks like it was missed.
      repeat: { pattern: "0 23 1 * *" },
      jobId: "withholding-remittance-monthly",
    },
  );
  logger.info(
    "Monthly withholding remittance job scheduled (23:00 UTC on the 1st = 02:00 EAT on the 2nd)",
  );
}
