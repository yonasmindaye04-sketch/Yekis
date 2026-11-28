// === IMPORTS ===
import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { handleGigAutoReleaseJob } from "./gigAutoRelease.handler.js";

/**
 * Auto-releases a gig order's escrow when the client takes no review action
 * within the auto-release window. Mirrors autoRelease.worker.ts semantics but
 * operates on GigOrder (see docs/GIG_MODEL_PLAN.md §4 reuse of auto-release).
 *
 * The job body lives in gigAutoRelease.handler.ts so the suite can exercise
 * the auto-release path without standing up a live Redis consumer.
 */
export const gigAutoReleaseWorker = new Worker(
  "gig-auto-release",
  async (job) => {
    await handleGigAutoReleaseJob(job as { data: { gigOrderId: string } });
  },
  { connection: redis },
);
