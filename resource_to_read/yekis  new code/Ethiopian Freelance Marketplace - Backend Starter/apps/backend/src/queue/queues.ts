import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

// One queue per background job family, per your roadmap:
// - autoRelease: releases escrow if the client takes no action within the window
// - kycRefresh: periodic re-verification for Tier 2/3 users
// - notifications: SMS/Telegram push for critical events

export const autoReleaseQueue = new Queue("auto-release", { connection: redis });
export const kycRefreshQueue = new Queue("kyc-refresh", { connection: redis });
export const notificationQueue = new Queue("notifications", { connection: redis });
