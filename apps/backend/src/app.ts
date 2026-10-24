// === IMPORTS ===
// Side-effect import: makes BigInt survive JSON.stringify, so a Prisma row
// holding `telegramUserId` cannot turn into a 500 (or a silently dropped
// response) the moment a handler returns it. Defined once in lib/json.ts.
import "./lib/json.js";
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
import { profileRouter } from "./modules/profiles/profile.routes.js";
import { skillsRouter } from "./modules/skills/skills.routes.js";
import { reviewRouter } from "./modules/reviews/review.routes.js";
import { featuredRouter } from "./modules/featured/featured.routes.js";
import { portfolioRouter } from "./modules/portfolio/portfolio.routes.js";
import { gigsRouter } from "./modules/gigs/gig.routes.js";
import { staffProfileRouter } from "./modules/profiles/staff-profile.routes.js";
import { financeRouter } from "./modules/finance/finance.routes.js";
import { adminRouter } from "./modules/admin/admin.routes.js";
import botRouter from "./modules/bot/bot.routes.js";
import { env } from "./config/env.js";
export function buildApp() {
  const app = express();

  // Behind a reverse proxy (cloudflared in dev, nginx/ALB in prod) Express must be
  // told how many hops to trust, otherwise req.ip is the proxy's IP — which
  // breaks rate limiting (all users share one bucket) and audit attribution.
  //
  // TRUST_PROXY_HOPS is a COUNT. Express then walks X-Forwarded-For
  // right-to-left that many times and ignores anything further left. Set it
  // too high and a client can prepend forged addresses to choose its own rate
  // limit bucket; too low and every client collapses onto the proxy address.
  // Unset means "no proxy in front", which is correct for bare localhost.
  if (env.TRUST_PROXY_HOPS !== undefined) {
    app.set("trust proxy", env.TRUST_PROXY_HOPS);
  }

  // Security headers.
  //
  // helmet's DEFAULT content-security-policy is written for a page that loads
  // stylesheets and scripts, but this service only ever returns JSON — the
  // only HTML it produces goes out by email. The default also shipped
  // `style-src 'self' https: 'unsafe-inline'` (a wildcard scheme source plus
  // unsafe-inline) and `upgrade-insecure-requests`, which in a browser
  // rewrites plain-http API calls to https and breaks local development.
  //
  // The policy below is explicit instead: no wildcards, no unsafe-inline, no
  // unsafe-eval, and `default-src 'none'` gives every other directive a
  // fallback, so no directive is left open by omission.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          "default-src": ["'none'"],
          "base-uri": ["'none'"],
          "form-action": ["'none'"],
          "frame-ancestors": ["'none'"],
          "object-src": ["'none'"],
          "script-src": ["'none'"],
          "style-src": ["'none'"],
          "img-src": ["'none'"],
          "font-src": ["'none'"],
          "connect-src": ["'none'"],
          "manifest-src": ["'none'"],
          "media-src": ["'none'"],
          "worker-src": ["'none'"],
          "frame-src": ["'none'"],
        },
      },
      // Nothing frames the API, so deny it outright rather than allowing
      // same-origin framing.
      frameguard: { action: "deny" },
      strictTransportSecurity: { maxAge: 31536000, includeSubDomains: true },
    }),
  );
  // Keep browser access explicit so future cookie-based flows cannot silently
  // become cross-origin readable.
  app.use(cors({ origin: env.FRONTEND_URL, credentials: false }));
  app.use(pinoHttp({ logger })); // doesn't touch the body, safe to run before the raw-body webhook routes

  // Payment webhooks MUST be mounted before express.json() â€” their routes
  // parse the raw body themselves (via express.raw()) so the signature can
  // be verified against the exact bytes the provider sent. Mounting them
  // after express.json() would mean verifying a signature against
  // re-serialized JSON, which can differ byte-for-byte from the original
  // and silently break verification.
  app.use("/api/v1/webhooks", webhooksRouter);

  // Telegram bot webhook also needs raw body for secret token verification
  app.use("/api/v1/telegram", botRouter);

  app.use(express.json({ limit: "1mb" }));

  // API responses are user-specific or machine-specific and must never be
  // written to a shared cache. Without an explicit Cache-Control a proxy or
  // corporate cache is free to keep a copy of one user's balance, profile or
  // wallet response and hand it to the next person who asks for the same URL
  // — which is the "Re-examine Cache-control Directives" finding, and a real
  // account-mixing risk rather than a cosmetic one.
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });

  // Generic API rate limit â€” payment webhook routes get their own, stricter
  // limit defined alongside the webhook handlers themselves.
  app.use(
    "/api",
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: env.NODE_ENV === "production" ? 2000 : 10000,
      standardHeaders: true,
      legacyHeaders: false,
      // RATE_LIMIT_DISABLED, not NODE_ENV. A bare NODE_ENV check would let any
      // environment that happened to set NODE_ENV=test switch the abuse control
      // off; the flag is explicit, defaults to false, and assertProductionSafety
      // refuses it in production. tests/setup-env.ts is the only thing that sets
      // it, because every suite builds its own app inside one process and the
      // shared counter otherwise starves whichever suite runs last.
      skip: () => env.RATE_LIMIT_DISABLED,
      // Lets a suite that exercises the limiter isolate its counters.
      keyGenerator: (req) =>
        `${env.RATE_LIMIT_KEY_PREFIX}${req.ip ?? "unknown"}`,
      message: {
        error: "TOO_MANY_REQUESTS",
        message: "Too many requests, please try again in a moment.",
      },
    }),
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
  app.use("/api/v1/users", profileRouter);
  app.use("/api/v1/skills", skillsRouter);
  app.use("/api/v1/reviews", reviewRouter);
  app.use("/api/v1/featured", featuredRouter);
  app.use("/api/v1/portfolio", portfolioRouter);
  app.use("/api/v1/gigs", gigsRouter);
  app.use("/api/v1/staff", staffProfileRouter);
  app.use("/api/v1/finance", financeRouter);
  app.use("/api/v1/admin", adminRouter);

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: "NOT_FOUND", path: req.path });
  });

  // Central error handler â€” catches anything that slips past route-level
  // try/catch. Never leak err.stack in production responses.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      _next: express.NextFunction,
    ) => {
      logger.error({ err, path: req.path }, "Unhandled error");
      res.status(500).json({ 
        error: "INTERNAL_ERROR",
        message:
          env.NODE_ENV === "development"
            ? err.message
            : "An unexpected error occurred.",
        stack: env.NODE_ENV === "development" ? err.stack : undefined,
      });
    },
  );

  return app;
}
