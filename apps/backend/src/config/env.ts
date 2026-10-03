// === IMPORTS ===
import dotenv from "dotenv";
import path from "node:path";
import { z } from "zod";

// Load .env from apps/backend/.env, repo root, and current working directory.
// (Derived from process.cwd() rather than import.meta.url — the project builds
// as CommonJS under NodeNext, where import.meta is not permitted.)
const envPaths = [
  path.resolve(process.cwd(), ".env"), // run from apps/backend
  path.resolve(process.cwd(), "apps/backend/.env"), // run from repo root
  path.resolve(process.cwd(), "../../.env"), // monorepo parent fallback
];

for (const envPath of envPaths) {
  dotenv.config({ path: envPath, override: false });
}

// Fail fast on startup if required config is missing — better than a
// confusing runtime error three requests into production.
const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL: z.string().default("1h"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  OBJECT_STORE_ENDPOINT: z.string().min(1),
  OBJECT_STORE_BUCKET: z.string().min(1),
  OBJECT_STORE_ACCESS_KEY: z.string().min(1),
  OBJECT_STORE_SECRET_KEY: z.string().min(1),

  // ── Telebirr C2B Web Checkout credentials ──
  // Gateway base URL (test vs production)
  TELEBIRR_BASE_URL: z
    .string()
    .default(
      "https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway",
    ),
  // Web checkout redirect base URL
  TELEBIRR_WEB_BASE_URL: z
    .string()
    .default(
      "https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?",
    ),
  // Fabric App Key — sent as X-APP-Key header
  TELEBIRR_FABRIC_APP_ID: z.string().optional(),
  // Secret for obtaining the fabric token
  TELEBIRR_APP_SECRET: z.string().optional(),
  // Merchant App ID — used as appid in order payloads
  TELEBIRR_MERCHANT_APP_ID: z.string().optional(),
  // 6-digit merchant shortcode / till number
  TELEBIRR_MERCHANT_CODE: z.string().optional(),
  // RSA PKCS#8 PEM private key for signing requests
  TELEBIRR_PRIVATE_KEY: z.string().optional(),
  // Telebirr's RSA public key for verifying webhook signatures
  TELEBIRR_PUBLIC_KEY: z.string().optional(),
  // Server-to-server webhook callback URL
  TELEBIRR_NOTIFY_URL: z.string().optional(),
  // Browser redirect URL after payment completion
  TELEBIRR_REDIRECT_URL: z.string().optional(),
  // Payment link expiry (Telebirr format, e.g. "120m")
  TELEBIRR_TIMEOUT_EXPRESS: z.string().default("120m"),

  SMS_ETHIOPIA_API_KEY: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z
    .string()
    .transform((val) =>
      val
        .trim()
        .replace(/^["']|["']$/g, "")
        .trim(),
    )
    .pipe(z.string().min(1))
    .optional()
    .or(z.literal("").transform(() => undefined)),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  // Served to the client so the login widget and deep links always target the
  // deployed bot. Without it the frontend falls back to a hardcoded handle.
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  // Social sign-in (oauth.service.ts). Each provider independently gated:
  // unset = button hidden client-side + endpoint returns 503.
  APPLE_CLIENT_ID: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  // Replay window for a signed Telegram credential. A captured initData
  // string is a bearer credential, so this must stay short: 15 minutes.
  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(900),

  // Google OAuth & Social Auth
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // Transactional Email Service
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  EMAIL_FROM: z
    .string()
    .default("Yekis Notifications <notifications@yekis.com>"),

  SENTRY_DSN: z.string().optional(),

  // Legal-capacity gate — set once counsel confirms minimum contracting age
  MINIMUM_CONTRACTING_AGE: z.coerce.number().default(18),

  // Withholding tax thresholds/rates — confirm with accountant before changing
  WITHHOLDING_THRESHOLD_MINOR: z.coerce.number().default(1000000), // 10,000 ETB in cents
  WITHHOLDING_RATE_WITH_TIN: z.coerce.number().default(0.03),
  WITHHOLDING_RATE_WITHOUT_TIN: z.coerce.number().default(0.3),

  AUTO_RELEASE_WINDOW_DAYS: z.coerce.number().default(7), // matches Service Agreement Clause 2.2(b): automatic release after SEVEN calendar days

  // Payment reconciliation sweep (paymentReconcile.worker.ts) — the webhook
  // safety net. Polls Telebirr's queryOrder API for escrow transactions still
  // PENDING past STALE minutes; gives up (leaves PENDING for manual review)
  // after GIVE_UP_HOURS, matching the checkout expiry window plus slack.
  PAYMENT_RECONCILE_CRON: z.string().default("*/10 * * * *"), // every 10 min
  PAYMENT_RECONCILE_STALE_MINUTES: z.coerce.number().default(5),
  PAYMENT_RECONCILE_GIVE_UP_HOURS: z.coerce.number().default(3),
  PAYMENT_RECONCILE_BATCH_SIZE: z.coerce.number().default(50),

  // Take-rate — proposed 10% total, split evenly. Confirm final % with the
  // Phase 0 decision log before this stops being a placeholder default.
  PLATFORM_FEE_RATE_CLIENT: z.coerce.number().default(0.05),
  PLATFORM_FEE_RATE_FREELANCER: z.coerce.number().default(0.05),

  // TMS / AML rule thresholds — aligned with the Master Design document
  // (§11.4 Transaction monitoring red flags) as of the 2026-08-26 unification.
  // Structuring = multiple deposits totaling > 500k ETB within 7 days;
  // Velocity = volume >300% of the user's 90-day baseline; Round Amounts =
  // repeated exact round-figure payments. Geographic-risk screening is
  // deferred until any cross-border rail exists (domestic-only at launch).
  // Final AML-policy sign-off still belongs to the Compliance Officer.
  TMS_SCAN_CRON: z.string().default("*/15 * * * *"), // master design: scan every 15 minutes
  TMS_STRUCTURING_WINDOW_HOURS: z.coerce.number().default(168), // 7 days
  TMS_STRUCTURING_MIN_COUNT: z.coerce.number().default(2), // "multiple" deposits
  TMS_STRUCTURING_TOTAL_THRESHOLD_MINOR: z.coerce.number().default(50_000_000), // 500,000 ETB total within window
  TMS_VELOCITY_WINDOW_HOURS: z.coerce.number().default(48),
  TMS_VELOCITY_BASELINE_DAYS: z.coerce.number().default(90),
  TMS_VELOCITY_MULTIPLIER: z.coerce.number().default(3), // >300% of baseline average
  TMS_VELOCITY_FLOOR_RELEASES: z.coerce.number().default(6), // absolute floor so brand-new accounts can't evade review
  TMS_ROUND_AMOUNT_WINDOW_DAYS: z.coerce.number().default(7),
  TMS_ROUND_AMOUNT_MIN_COUNT: z.coerce.number().default(3),
  TMS_ROUND_AMOUNT_UNIT_MINOR: z.coerce.number().default(1_000_000), // exact multiples of 10,000 ETB count as "round"
  TMS_PASS_THROUGH_WINDOW_HOURS: z.coerce.number().default(24),
  TMS_STR_FILING_SLA_HOURS: z.coerce.number().default(24),

  CBE_WEBHOOK_SECRET: z.string().optional(),

  // SECURITY: mock/sandbox auto-settlement of wallet top-ups. Dev-only
  // convenience so local Telebirr checkout testing can settle mock top-ups
  // without a receipt. Default OFF, and topup.service additionally refuses
  // to honour it when NODE_ENV=production — unverified money must never be
  // minted in production. CBE Birr / M-Pesa top-ups are NEVER auto-approved,
  // regardless of this flag (no live verification path exists for them).
  ALLOW_MOCK_PAYMENT_AUTO_APPROVAL: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  // eSignet / Fayda OIDC integration (Tier 1 KYC)
  ESIGNET_DISCOVERY_URL: z.string().optional(),
  ESIGNET_CLIENT_ID: z.string().optional(),
  ESIGNET_REDIRECT_URI: z.string().optional(),
  ESIGNET_PRIVATE_KEY_JWK_B64: z.string().optional(),
  ESIGNET_SCOPES: z.string().default("openid profile phone address"),

  // T2-D: VAT threshold alert — alert logged + TransactionFlag created when
  // PlatformOperatingAccount.accumulatedFeeMinor exceeds this value.
  // Ethiopian VAT applies at 500,000 ETB annual turnover (50,000,000 minor units).
  VAT_THRESHOLD_MINOR: z.coerce.number().default(45_000_000), // 450,000 ETB
  VAT_RATE: z.coerce.number().default(0.15), // 15% VAT rate
  VAT_REGISTERED: z.coerce.boolean().default(false), // flip to true once Finance confirms VAT registration

  // T2-K: PEP provider selection. Set to "mock" in development, "real" in production.
  // The startup check in server.ts refuses to boot in NODE_ENV=production unless
  // this is NOT "mock". This prevents the mock watchlist from silently reaching
  // production — a real AML failure mode, not just a missing feature.
  // Blocked on: Compliance Officer selecting a real screening vendor (UN/OFAC/FIC).
  // See COMPLIANCE_BLOCKERS.md §PEP Screening for details.
  PEP_PROVIDER: z.enum(["mock", "real"]).default("mock"),

  // Number of trusted proxy hops in front of the API (ngrok, nginx, ALB...).
  // Required for correct client IPs (rate limiting, audit logs) whenever the
  // API is not reached directly. Leave unset when running bare on localhost.
  TRUST_PROXY: z.coerce.number().int().min(0).optional(),

  // OpenSearch (optional) — full-text search backend. Unset = search falls
  // back to the existing Postgres queries; no dependency is required to boot.
OPENSEARCH_URL: z.string().url().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "❌ Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;
