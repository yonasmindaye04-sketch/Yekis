// === IMPORTS ===
import { Worker, Job } from "bullmq";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { featuredRefreshQueue } from "./queues.js";
import { refreshFeaturedCarousel } from "../modules/featured/featured.service.js";

// === MAIN WORKER ===
export const featuredRefreshWorker = new Worker(
  featuredRefreshQueue.name,
  async (job: Job) => {
    try {
      logger.info("featuredRefreshWorker: Starting refresh");
      await refreshFeaturedCarousel();
      logger.info("featuredRefreshWorker: Completed refresh");
    } catch (error) {
      logger.error({ err: error }, "featuredRefreshWorker: Error refreshing carousel");
      throw error;
    }
  },
  { connection: redis }
);

featuredRefreshWorker.on("failed", (job, err) => {
  logger.error({ err }, `Job ${job?.id} failed in featuredRefreshWorker`);
});

/** Call once at startup - BullMQ deduplicates by jobId, safe on every boot.
 *  The carousel also refreshes lazily on GET cache-miss; this keeps it warm
 *  so the first visitor of each window doesn't pay the rebuild cost. */
export async function scheduleFeaturedRefreshJob() {
  await featuredRefreshQueue.add(
    "carousel-refresh",
    {},
    { repeat: { pattern: "0 */6 * * *" }, jobId: "featured-refresh-periodic" } // every 6h
  );
}
