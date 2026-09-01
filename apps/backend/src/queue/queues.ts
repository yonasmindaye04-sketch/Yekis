// === IMPORTS ===
import { Queue } from "bullmq";
import { redis } from "../lib/redis.js";

// One queue per background job family, per your roadmap:
// - autoRelease: releases escrow if the client takes no action within the window
// - kycRefresh: periodic re-verification for Tier 2/3 users
// - notifications: SMS/Telegram push for critical events
// - reviewReveal: reveals blind reviews after 14 days
// - featuredRefresh: refreshes the featured carousel periodically
// - paymentReconcile: polls provider status APIs for webhook-missed payments

export const autoReleaseQueue = new Queue("auto-release", {
  connection: redis,
});
export const kycRefreshQueue = new Queue("kyc-refresh", { connection: redis });
export const notificationQueue = new Queue("notifications", {
  connection: redis,
});
export const reviewRevealQueue = new Queue("review-reveal", {
  connection: redis,
});
export const featuredRefreshQueue = new Queue("featured-refresh", {
  connection: redis,
});
export const paymentReconcileQueue = new Queue("payment-reconcile", {
  connection: redis,
});
// Master Design §11.4: automated AML scan every 15 minutes
export const tmsScanQueue = new Queue("tms-scan", { connection: redis });
// Gig order auto-release (see docs/GIG_MODEL_PLAN.md) — mirrors auto-release
// for milestone contracts but keyed on gigOrderId instead of milestoneId.
export const gigAutoReleaseQueue = new Queue("gig-auto-release", {
  connection: redis,
});
