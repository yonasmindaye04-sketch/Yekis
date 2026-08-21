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
import "./queue/withholdingRemittance.worker.js";
import { scheduleRecurringJobs } from "./queue/kycRefresh.worker.js";
import { scheduleWithholdingRemittanceJob } from "./queue/withholdingRemittance.worker.js";

// T2-K: PEP stub safety guard — structurally impossible to run production with the mock.
// A silent mock PEP check in production is a real AML/CTF regulatory violation, not
// just a missing feature. This must throw before the HTTP server starts.
if (env.NODE_ENV === "production" && env.PEP_PROVIDER === "mock") {
  // eslint-disable-next-line no-console
  console.error(
    "FATAL: PEP_PROVIDER is set to 'mock' in production. " +
    "This means all PEP/sanctions checks pass silently. " +
    "Set PEP_PROVIDER=real and wire up a real watchlist provider before deploying. " +
    "See COMPLIANCE_BLOCKERS.md §PEP Screening."
  );
  process.exit(1);
}

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

scheduleRecurringJobs().catch((err) => logger.error({ err }, "Failed to schedule KYC refresh jobs"));
scheduleWithholdingRemittanceJob().catch((err) => logger.error({ err }, "Failed to schedule withholding remittance job"));



// === MAIN FUNCTIONS ===
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  stopBot().catch((err) => logger.error({ err }, "Error stopping bot"));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
