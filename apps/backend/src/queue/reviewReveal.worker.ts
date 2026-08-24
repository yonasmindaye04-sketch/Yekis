// === IMPORTS ===
import { Worker, Job } from "bullmq";
import { prisma } from "../lib/prisma.js";
import { redis } from "../lib/redis.js";
import { logger } from "../lib/logger.js";
import { reviewRevealQueue } from "./queues.js";

// === MAIN WORKER ===
export const reviewRevealWorker = new Worker(
  reviewRevealQueue.name,
  async (job: Job) => {
    try {
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

      // Find blind reviews older than 14 days that haven't been revealed
      const reviewsToReveal = await prisma.review.findMany({
        where: {
          isBlind: true,
          createdAt: { lt: fourteenDaysAgo },
          revealedAt: null
        },
        select: { id: true, targetUserId: true }
      });

      if (reviewsToReveal.length === 0) {
        logger.info("reviewRevealWorker: No reviews to reveal.");
        return;
      }

      const reviewIds = reviewsToReveal.map(r => r.id);
      const targetUserIds = [...new Set(reviewsToReveal.map(r => r.targetUserId))];

      // Update reviews
      await prisma.review.updateMany({
        where: { id: { in: reviewIds } },
        data: {
          isBlind: false,
          revealedAt: new Date()
        }
      });

      // Simple rating recalculation for affected users
      for (const userId of targetUserIds) {
        const userReviews = await prisma.review.aggregate({
          where: { targetUserId: userId, isBlind: false },
          _avg: { rating: true },
          _count: { id: true }
        });

        await prisma.user.update({
          where: { id: userId },
          data: {
            ratingAverage: userReviews._avg.rating || 0,
            ratingCount: userReviews._count.id || 0
          }
        });
      }

      logger.info(`reviewRevealWorker: Revealed ${reviewIds.length} reviews and updated ratings for ${targetUserIds.length} users.`);
    } catch (error) {
      logger.error({ err: error }, "reviewRevealWorker: Error revealing reviews");
      throw error;
    }
  },
  { connection: redis }
);

reviewRevealWorker.on("failed", (job, err) => {
  logger.error({ err }, `Job ${job?.id} failed in reviewRevealWorker`);
});

/** Call once at startup - BullMQ deduplicates by jobId, safe on every boot. */
export async function scheduleReviewRevealJob() {
  await reviewRevealQueue.add(
    "reveal-sweep",
    {},
    { repeat: { pattern: "0 4 * * *" }, jobId: "review-reveal-daily" } // 04:00 daily
  );
}
