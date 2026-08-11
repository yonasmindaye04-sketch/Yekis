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
      logger.error("featuredRefreshWorker: Error refreshing carousel", error);
      throw error;
    }
  },
  { connection: redis }
);

featuredRefreshWorker.on("failed", (job, err) => {
  logger.error(`Job ${job?.id} failed in featuredRefreshWorker`, err);
});
