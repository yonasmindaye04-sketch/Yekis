// === IMPORTS ===
import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { logger } from "./lib/logger.js";
import { startBot, stopBot } from "./modules/bot/bot.service.js";
// Importing the worker file starts it listening on the queue as a side effect.
// In production, run workers as a separate process/container from the API
// server so a traffic spike on one doesn't starve the other.
import "./queue/autoRelease.worker.js";
import "./queue/kycRefresh.worker.js";
import "./queue/notification.worker.js";
import { scheduleRecurringJobs } from "./queue/kycRefresh.worker.js";

const app = buildApp();

const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 API listening on port ${env.PORT} (${env.NODE_ENV})`);
  
  // Start Telegram bot
  try {
    await startBot();
    logger.info("🤖 Telegram bot started");
  } catch (error) {
    logger.error({ error }, "Failed to start Telegram bot");
  }
});

scheduleRecurringJobs().catch((err) => logger.error({ err }, "Failed to schedule recurring jobs"));


// === MAIN FUNCTIONS ===
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  stopBot().catch((err) => logger.error({ err }, "Error stopping bot"));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
