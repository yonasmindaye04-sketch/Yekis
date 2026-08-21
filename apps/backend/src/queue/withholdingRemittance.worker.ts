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
 * Aggregates withholdingTaxMinor across all SUCCESS PaymentTransactions in the
 * prior calendar month into a WithholdingRemittanceReport row.
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

const withholdingRemittanceQueue = new Queue("withholding-remittance", { connection: redis });

export const withholdingRemittanceWorker = new Worker(
  "withholding-remittance",
  async () => {
    const now = new Date();
    // Prior month: if today is Aug 2026, compute for Jul 2026
    const priorMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodStart = new Date(priorMonthDate.getFullYear(), priorMonthDate.getMonth(), 1);
    const periodEnd = new Date(priorMonthDate.getFullYear(), priorMonthDate.getMonth() + 1, 1);

    // ISO month string e.g. "2026-07"
    const periodMonth = `${priorMonthDate.getFullYear()}-${String(priorMonthDate.getMonth() + 1).padStart(2, "0")}`;

    // Check if already computed for this period (idempotent — safe to run again if job retries).
    const existing = await prisma.withholdingRemittanceReport.findUnique({ where: { periodMonth } });
    if (existing) {
      logger.info({ periodMonth }, "Withholding remittance report already exists for period — skipping");
      return;
    }

    // Aggregate withholdingTaxMinor across SUCCESS transactions in the prior month.
    const result = await prisma.paymentTransaction.aggregate({
      where: {
        status: "SUCCESS",
        createdAt: { gte: periodStart, lt: periodEnd },
      },
      _sum: { withholdingTaxMinor: true },
      _count: { id: true },
    });

    const totalWithholdingMinor = result._sum.withholdingTaxMinor ?? 0;
    const transactionCount = result._count.id;

    const report = await prisma.withholdingRemittanceReport.create({
      data: {
        periodMonth,
        totalWithholdingMinor,
        transactionCount,
      },
    });

    await recordAuditEvent({
      eventType: "WITHHOLDING_REMITTANCE_REPORT_GENERATED",
      entityType: "WithholdingRemittanceReport",
      entityId: report.id,
      metadata: { periodMonth, totalWithholdingMinor, transactionCount },
    });

    logger.info(
      { periodMonth, totalWithholdingMinor, transactionCount },
      "Withholding remittance report generated — Finance must use this to file with ERA manually."
    );
  },
  { connection: redis }
);

/** Call once at startup — BullMQ deduplicates by jobId, safe to call on every boot. */
export async function scheduleWithholdingRemittanceJob() {
  await withholdingRemittanceQueue.add(
    "monthly-withholding-sweep",
    {},
    {
      // 1st of each month at 02:00 EAT (23:00 UTC, UTC+3)
      repeat: { pattern: "0 23 1 * *" },
      jobId: "withholding-remittance-monthly",
    }
  );
  logger.info("Monthly withholding remittance job scheduled (1st of month at 02:00 EAT)");
}
