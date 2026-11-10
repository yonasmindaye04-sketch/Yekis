// === IMPORTS ===
import { Worker } from "bullmq";
import { redis } from "../lib/redis.js";
import { handleAutoReleaseJob } from "./autoRelease.handler.js";

/**
 * Two jobs land on this queue per milestone submission:
 *  1. "warn"    - scheduled 24h before autoReleaseAt, sends the heads-up notice
 *  2. "release" - scheduled at autoReleaseAt, releases escrow if still untouched
 *
 * Both are scheduled with BullMQ's delayed-job feature when a freelancer
 * submits a milestone (see modules/escrow/escrow.service.ts). If the client
 * explicitly accepts or disputes before the release job fires, that job
 * should be removed by ID - see the submission service for the cancel logic.
 *
 * The job body lives in autoRelease.handler.ts so the suite can exercise the
 * auto-release path without standing up a live Redis consumer.
 */
export const autoReleaseWorker = new Worker(
  "auto-release",
  async (job) => {
    await handleAutoReleaseJob(job as { data: { milestoneId: string; kind: "warn" | "release" } });
  },
  { connection: redis },
);
