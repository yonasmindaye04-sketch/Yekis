// === IMPORTS ===
// MUST be the first import: patches Express 4 so rejected promises from
// async route handlers forward to the central error handler instead of
// becoming unhandled rejections (which crash Node >= 15).
import "express-async-errors";
import { env } from "./config/env.js";

// Telebirr's developer portal uses a self-signed/untrusted certificate.
// We must bypass Node's strict TLS validation in development, otherwise
// fetch() calls to their API will fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE.
if (env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

import { buildApp } from "./app.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";
import { initWebSocketServer } from "./lib/socket.js";
import { ensureObjectStoreReady } from "./lib/objectStore.js";
import { startBot, stopBot } from "./modules/bot/bot.service.js";
// Importing the worker file starts it listening on the queue as a side effect.
// In production, run workers as a separate process/container from the API
// server so a traffic spike on one doesn't starve the other.
import "./queue/autoRelease.worker.js";
import "./queue/kycRefresh.worker.js";
import "./queue/notification.worker.js";
import "./queue/withholdingRemittance.worker.js";
import "./queue/paymentReconcile.worker.js";
import "./queue/reviewReveal.worker.js";
import "./queue/featuredRefresh.worker.js";
import "./queue/tmsScan.worker.js";
import "./queue/gigAutoRelease.worker.js";
import { scheduleRecurringJobs } from "./queue/kycRefresh.worker.js";
import { scheduleWithholdingRemittanceJob } from "./queue/withholdingRemittance.worker.js";
import { schedulePaymentReconcileJob } from "./queue/paymentReconcile.worker.js";
import { scheduleReviewRevealJob } from "./queue/reviewReveal.worker.js";
import { scheduleFeaturedRefreshJob } from "./queue/featuredRefresh.worker.js";
import { scheduleTmsScanJob } from "./queue/tmsScan.worker.js";

// T2-K: PEP stub safety guard — structurally impossible to run production with the mock.
// A silent mock PEP check in production is a real AML/CTF regulatory violation, not
// just a missing feature. This must throw before the HTTP server starts.
if (env.NODE_ENV === "production" && env.PEP_PROVIDER === "mock") {
  // eslint-disable-next-line no-console
  console.error(
    "FATAL: PEP_PROVIDER is set to 'mock' in production. " +
      "This means all PEP/sanctions checks pass silently. " +
      "Set PEP_PROVIDER=real and wire up a real watchlist provider before deploying. " +
      "See COMPLIANCE_BLOCKERS.md §PEP Screening.",
  );
  process.exit(1);
}

const app = buildApp();

const server = app.listen(env.PORT, async () => {
  logger.info(`🚀 API listening on port ${env.PORT} (${env.NODE_ENV})`);

  // Initialize Real-Time WebSocket Server
  try {
    initWebSocketServer(server);
  } catch (error) {
    logger.error({ error }, "Failed to mount WebSocket server");
  }

  // Verify Database Connection at startup
  prisma
    .$connect()
    .then(() => {
      logger.info("🐘 Database connected to PostgreSQL");
    })
    .catch((err) => {
      logger.error(
        { err },
        "❌ PostgreSQL is unreachable at localhost:5433! Make sure Docker is running ('docker compose up -d').",
      );
    });

  // Ensure MinIO / S3 object store bucket is initialized
  ensureObjectStoreReady().catch((err) =>
    logger.error({ err }, "Failed to initialize object store bucket"),
  );

  // Start Telegram bot.
  //
  // Deliberately NOT awaited: the Bot API is an external dependency, and an
  // unreachable api.telegram.org must never delay or wedge the HTTP server.
  // startBot() fails fast on its own (see TELEGRAM_API_TIMEOUT_MS) and logs a
  // precise reason, so fire-and-forget is safe here.
  startBot()
    .then((started) => {
      if (started) logger.info("🤖 Telegram bot started");
    })
    .catch((error) => {
      logger.error({ error }, "Failed to start Telegram bot");
    });
});

scheduleRecurringJobs().catch((err) =>
  logger.error({ err }, "Failed to schedule KYC refresh jobs"),
);
scheduleWithholdingRemittanceJob().catch((err) =>
  logger.error({ err }, "Failed to schedule withholding remittance job"),
);
schedulePaymentReconcileJob().catch((err) =>
  logger.error({ err }, "Failed to schedule payment reconciliation job"),
);
scheduleReviewRevealJob().catch((err) =>
  logger.error({ err }, "Failed to schedule review reveal job"),
);
scheduleFeaturedRefreshJob().catch((err) =>
  logger.error({ err }, "Failed to schedule featured refresh job"),
);
scheduleTmsScanJob().catch((err) =>
  logger.error({ err }, "Failed to schedule TMS scan job"),
);

// === MAIN FUNCTIONS ===
function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully`);
  stopBot().catch((err) => logger.error({ err }, "Error stopping bot"));
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Last-resort safety net: log rather than crash. express-async-errors
// handles the route-level cases; this catches anything outside a request
// lifecycle (e.g. a worker's error event).
process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "Unhandled promise rejection");
});
