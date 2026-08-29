// === IMPORTS ===
import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { recordAuditEvent } from "../lib/audit.js";
import { logger } from "../lib/logger.js";
import { kycRefreshQueue, notificationQueue } from "./queues.js";

/**
 * Scheduled daily (see scheduleRecurringJobs() below). Finds every VERIFIED
 * KYC record whose nextReviewDueAt has passed and routes it back into the
 * manual review queue — ongoing due-diligence practice, not a one-time gate.
 * Does NOT revoke the user's access while re-review is pending; it only
 * flags the record. If you want re-review to also restrict the hard-block
 * middleware, that's a deliberate policy call to make explicitly, not a
 * side effect of this job.
 *
 * T2-J: Also enqueues a notification to the affected user so they are prompted
 * to re-submit their documents. The flag alone (periodicReviewPending) is not
 * enough — staff can see it in the review queue, but the user has no way to
 * know they're due for re-verification without this notification.
 */
export const kycRefreshWorker = new Worker(
  "kyc-refresh",
  async () => {
    const dueRecords = await prisma.kycRecord.findMany({
      where: { status: "VERIFIED", nextReviewDueAt: { lte: new Date() } },
    });

    for (const record of dueRecords) {
      await prisma.kycRecord.update({
        where: { id: record.id },
        data: { periodicReviewPending: true },
      });

      await recordAuditEvent({
        userId: record.userId,
        eventType: "KYC_PERIODIC_REVIEW_TRIGGERED",
        entityType: "KycRecord",
        entityId: record.id,
        metadata: { previousReviewDueAt: record.nextReviewDueAt },
      });

      // T2-J: Notify the user so they know re-submission is needed.
      // Uses the same notificationQueue pattern as dispute-raised, escrow-released etc.
      await notificationQueue.add("kyc-periodic-review-due", {
        userId: record.userId,
        kycRecordId: record.id,
        message:
          "Your identity verification is due for a periodic review. " +
          "Please re-submit your documents to continue using the platform without interruption.",
      });
    }

    logger.info(
      { count: dueRecords.length },
      "KYC periodic refresh sweep complete",
    );
  },
  { connection: redis },
);

/** Call once at startup — BullMQ deduplicates by jobId, so this is safe to call on every boot. */

// === MAIN FUNCTIONS ===
export async function scheduleRecurringJobs() {
  await kycRefreshQueue.add(
    "daily-refresh-sweep",
    {},
    { repeat: { pattern: "0 3 * * *" }, jobId: "kyc-refresh-daily" }, // 03:00 daily
  );
}
