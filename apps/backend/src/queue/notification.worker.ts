// === IMPORTS ===
import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { processNotification } from "../modules/notifications/notification.service.js";
import { sendToUser } from "../lib/socket.js";

/**
 * Every notificationQueue.add(type, { userId, message, ...metadata }) call
 * across the codebase lands here. job.name carries the event type
 * ("dispute-raised", "escrow-funded", etc.) — see notification.service.ts's
 * CRITICAL_NOTIFICATION_TYPES for which of these also trigger SMS.
 *
 * Current call sites, for reference when adding a new one:
 *   auto-release.worker.ts   -> "auto-release-warning", "escrow-released"
 *   escrow.service.ts        -> "escrow-funded", "milestone-submitted"
 *   dispute.service.ts       -> "dispute-raised", "dispute-resolved"
 */
export const notificationWorker = new Worker(
  "notifications",
  async (job) => {
    const { userId, message, ...metadata } = job.data as {
      userId: string;
      message: string;
      [k: string]: unknown;
    };

    // Real-time push over the WebSocket fan-out first — any connected device
    // gets the event instantly; the persistence/SMS/Telegram paths below
    // remain the durable record.
    try {
      sendToUser(userId, `notify:${job.name}`, {
        type: job.name,
        message,
        ...metadata,
      });
    } catch (err) {
      logger.warn({ err, jobName: job.name }, "Real-time socket push failed");
    }

    await processNotification({ userId, type: job.name, message, metadata });
  },
  { connection: redis },
);

notificationWorker.on("failed", (job, err) => {
  logger.error(
    { jobId: job?.id, jobName: job?.name, err },
    "Notification job failed",
  );
});
