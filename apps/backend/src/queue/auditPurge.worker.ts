// === IMPORTS ===
import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { recordAuditEvent } from "../lib/audit.js";
import { env } from "../config/env.js";
import { auditPurgeQueue } from "./queues.js";

/**
 * Daily purge of audit rows whose retention period has expired.
 *
 * WHY A WORKER AND NOT A DELETE IN THE APP
 * `prisma/README.md` revokes UPDATE and DELETE on "AuditLog" from the
 * application runtime role, so the API process cannot delete audit rows even
 * by accident. The purge therefore goes through the SECURITY DEFINER
 * function `purge_expired_audit_logs()` (migration
 * 20261110120000_audit_log_retention), which is owned by the migration role
 * and callable by the app role.
 *
 * WHY THE FUNCTION ENFORCES ITS OWN FLOOR
 * The function deletes a row only when BOTH its retention stamp has expired
 * AND it is at least ten years old. The second condition lives in SQL on
 * purpose: a misconfigured AUDIT_RETENTION_YEARS must not be able to shorten
 * a statutory retention period.
 *
 * WHY THE PURGE IS ITSELF AUDITED
 * Deleting the evidence is exactly the kind of action an audit trail has to
 * record. Each run writes an AUDIT_LOG_PURGE row saying how many rows went
 * and when — so the record of the record's destruction survives the
 * destruction.
 */

// === CONSTANTS ===
/** Rows deleted per database call. The function handles the batching. */
const BATCH_SIZE = 5000;
/** Safety valve so a pathological backlog cannot hold the worker forever. */
const MAX_BATCHES_PER_RUN = 50;

// === MAIN WORKER ===
export const auditPurgeWorker = new Worker(
  auditPurgeQueue.name,
  async (_job: Job) => {
    const startedAt = new Date();
    let totalDeleted = 0;
    let batches = 0;

    try {
      // Loop until the function reports a partial batch (i.e. it has run out
      // of expired rows) or the safety valve trips.
      for (;;) {
        const rows = await prisma.$queryRaw<Array<{ purged: bigint }>>`
          SELECT purge_expired_audit_logs(${BATCH_SIZE}) AS purged
        `;

        const deleted = Number(rows[0]?.purged ?? 0);
        totalDeleted += deleted;
        batches++;

        if (deleted < BATCH_SIZE) break;
        if (batches >= MAX_BATCHES_PER_RUN) {
          logger.warn(
            { batches, totalDeleted },
            "auditPurgeWorker: batch ceiling reached — remaining expired rows will be purged on the next run",
          );
          break;
        }
      }

      if (totalDeleted > 0) {
        await recordAuditEvent({
          eventType: "AUDIT_LOG_PURGE",
          entityType: "AuditLog",
          entityId: `purge-${startedAt.toISOString()}`,
          metadata: {
            rowsDeleted: totalDeleted,
            batches,
            retentionYears: env.AUDIT_RETENTION_YEARS,
            startedAt: startedAt.toISOString(),
            finishedAt: new Date().toISOString(),
          },
        });

        logger.info(
          { rowsDeleted: totalDeleted, batches },
          "auditPurgeWorker: purged expired audit rows",
        );
      } else {
        logger.debug(
          { batches },
          "auditPurgeWorker: no expired audit rows to purge",
        );
      }

      return { rowsDeleted: totalDeleted, batches };
    } catch (error) {
      logger.error(
        { err: error },
        "auditPurgeWorker: failed to purge expired audit rows",
      );
      throw error;
    }
  },
  { connection: redis },
);

auditPurgeWorker.on("failed", (job, err) => {
  logger.error({ err }, `Job ${job?.id} failed in auditPurgeWorker`);
});

/** Call once at startup - BullMQ deduplicates by jobId, safe on every boot. */
export async function scheduleAuditPurgeJob() {
  await auditPurgeQueue.add(
    "retention-sweep",
    {},
    { repeat: { pattern: "0 5 * * *" }, jobId: "audit-purge-daily" }, // 05:00 daily
  );
}
