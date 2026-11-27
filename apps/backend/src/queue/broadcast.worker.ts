// === IMPORTS ===
import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import {
  markBroadcastFailure,
  runBroadcast,
} from "../modules/bot/broadcast.service.js";

interface BroadcastJobData {
  broadcastId: string;
}

/**
 * Admin Telegram broadcasts run here, one at a time.
 *
 * Serial on purpose: a run is a rate-limited fan-out to potentially thousands
 * of chats, and two concurrent runs would double the message rate and trip
 * Telegram's 429 limit for both of them.
 */
export const broadcastWorker = new Worker<BroadcastJobData>(
  "telegram-broadcasts",
  async (job) => {
    await runBroadcast(job.data.broadcastId);
  },
  { connection: redis, concurrency: 1 },
);

broadcastWorker.on("failed", async (job, err) => {
  logger.error(
    { jobId: job?.id, broadcastId: job?.data?.broadcastId, err: err.message },
    "Broadcast job failed",
  );
  const broadcastId = job?.data?.broadcastId;
  if (!broadcastId) return;
  try {
    await markBroadcastFailure(broadcastId, err);
  } catch (markErr) {
    logger.error(
      { broadcastId, err: markErr instanceof Error ? markErr.message : String(markErr) },
      "Could not mark a failed broadcast as FAILED",
    );
  }
});

broadcastWorker.on("error", (err) => {
  logger.error({ err: err.message }, "Broadcast worker error");
});
