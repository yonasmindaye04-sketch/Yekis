// === IMPORTS ===
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import { logger } from "./lib/logger.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { kycRouter } from "./modules/kyc/kyc.routes.js";
import { jobsRouter } from "./modules/jobs/jobs.routes.js";
import { contractsRouter } from "./modules/contracts/contracts.routes.js";
import { escrowRouter } from "./modules/escrow/escrow.routes.js";
import { webhooksRouter } from "./modules/escrow/webhooks.routes.js";
import { disputesRouter } from "./modules/disputes/dispute.routes.js";
import { notificationsRouter } from "./modules/notifications/notification.routes.js";
import { tmsRouter } from "./modules/tms/tms.routes.js";
import { topupsRouter } from "./modules/topups/topup.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import botRouter from "./modules/bot/bot.routes.js";
export function buildApp() {
  const app = express();

  app.use(helmet());
  app.use(cors()); // tighten to your actual frontend origin(s) before production
  app.use(pinoHttp({ logger })); // doesn't touch the body, safe to run before the raw-body webhook routes

  // Payment webhooks MUST be mounted before express.json() — their routes
  // parse the raw body themselves (via express.raw()) so the signature can
  // be verified against the exact bytes the provider sent. Mounting them
  // after express.json() would mean verifying a signature against
  // re-serialized JSON, which can differ byte-for-byte from the original
  // and silently break verification.
  app.use("/api/v1/webhooks", webhooksRouter);
  
  // Telegram bot webhook also needs raw body for secret token verification
  app.use("/api/v1/telegram", botRouter);

  app.use(express.json({ limit: "1mb" }));

  // Generic API rate limit — payment webhook routes get their own, stricter
  // limit defined alongside the webhook handlers themselves.
  app.use(
    "/api",
    rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false })
  );

  app.get("/health", (_req, res) => res.json({ status: "ok" }));

  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/kyc", kycRouter);
  app.use("/api/v1/jobs", jobsRouter);
  app.use("/api/v1/contracts", contractsRouter);
  app.use("/api/v1/escrow", escrowRouter);
  app.use("/api/v1/disputes", disputesRouter);
  app.use("/api/v1/notifications", notificationsRouter);
  app.use("/api/v1/tms", tmsRouter);
  app.use("/api/v1/wallet/topups", topupsRouter);
  app.use("/api/v1/chat", chatRouter);

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: "NOT_FOUND", path: req.path });
  });

  // Central error handler — catches anything that slips past route-level
  // try/catch. Never leak err.stack in production responses.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err, path: req.path }, "Unhandled error");
    res.status(500).json({ error: "INTERNAL_ERROR" });
  });

  return app;
}
