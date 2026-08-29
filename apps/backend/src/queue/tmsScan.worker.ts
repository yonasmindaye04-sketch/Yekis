// === IMPORTS ===
import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { tmsScanQueue } from "./queues.js";
import { runTmsScan } from "../modules/tms/tms.service.js";
import { env } from "../config/env.js";

/**
 * TMS periodic scan — Master Design §11.4 / AML Proclamation compliance:
 * "an automated background queue scans database entries every 15 minutes."
 *
 * The inline event hooks (runPostFundingChecks on funding, runVelocityCheck
 * on release, runPassThroughCheck at withdrawal) catch single-transaction
 * triggers the moment they happen; this sweep re-evaluates the full rule set
 * across every user with recent activity so windowed patterns are caught
 * regardless of which event happened to fire last:
 *  - Structuring: deposits split across days inside the 7-day window
 *  - Round Amounts: repeated round-figure payments within the window
 *  - Velocity: release rate vs. the 90-day baseline
 * It also sweeps flags whose 24-hour STR filing SLA has been breached and
 * raises a one-time audit event + staff alert per flag.
 */
export const tmsScanWorker = new Worker(
  "tms-scan",
  async () => {
    try {
      await runTmsScan();
    } catch (err) {
      // A failed scan must be loud — silent TMS gaps are an AML failure mode.
      logger.error({ err }, "TMS periodic scan failed");
      throw err;
    }
  },
  { connection: redis },
);

/** Call once at startup — BullMQ deduplicates by jobId, safe on every boot. */
export async function scheduleTmsScanJob() {
  await tmsScanQueue.add(
    "tms-scan-run",
    {},
    { repeat: { pattern: env.TMS_SCAN_CRON }, jobId: "tms-periodic-scan" },
  );
}
