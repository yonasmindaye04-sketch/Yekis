"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
// === IMPORTS ===
var dotenv_1 = __importDefault(require("dotenv"));
var node_path_1 = __importDefault(require("node:path"));
var zod_1 = require("zod");
// Load .env from apps/backend/.env, repo root, and current working directory.
// (Derived from process.cwd() rather than import.meta.url — the project builds
// as CommonJS under NodeNext, where import.meta is not permitted.)
var envPaths = [
    node_path_1.default.resolve(process.cwd(), ".env"), // run from apps/backend
    node_path_1.default.resolve(process.cwd(), "apps/backend/.env"), // run from repo root
    node_path_1.default.resolve(process.cwd(), "../../.env"), // monorepo parent fallback
];
for (var _i = 0, envPaths_1 = envPaths; _i < envPaths_1.length; _i++) {
    var envPath = envPaths_1[_i];
    dotenv_1.default.config({ path: envPath, override: false });
}
// Fail fast on startup if required config is missing — better than a
// confusing runtime error three requests into production.
var EnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    PORT: zod_1.z.coerce.number().default(4000),
    DATABASE_URL: zod_1.z.string().min(1, "DATABASE_URL is required"),
    REDIS_URL: zod_1.z.string().min(1, "REDIS_URL is required"),
    JWT_ACCESS_SECRET: zod_1.z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
    JWT_ACCESS_TTL: zod_1.z.string().default("15m"),
    JWT_REFRESH_TTL: zod_1.z.string().default("30d"),
    OBJECT_STORE_ENDPOINT: zod_1.z.string().min(1),
    OBJECT_STORE_BUCKET: zod_1.z.string().min(1),
    OBJECT_STORE_ACCESS_KEY: zod_1.z.string().min(1),
    OBJECT_STORE_SECRET_KEY: zod_1.z.string().min(1),
    // ── Telebirr C2B Web Checkout credentials ──
    // Gateway base URL (test vs production)
    TELEBIRR_BASE_URL: zod_1.z.string().default("https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway"),
    // Web checkout redirect base URL
    TELEBIRR_WEB_BASE_URL: zod_1.z.string().default("https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?"),
    // Fabric App Key — sent as X-APP-Key header
    TELEBIRR_FABRIC_APP_ID: zod_1.z.string().optional(),
    // Secret for obtaining the fabric token
    TELEBIRR_APP_SECRET: zod_1.z.string().optional(),
    // Merchant App ID — used as appid in order payloads
    TELEBIRR_MERCHANT_APP_ID: zod_1.z.string().optional(),
    // 6-digit merchant shortcode / till number
    TELEBIRR_MERCHANT_CODE: zod_1.z.string().optional(),
    // RSA PKCS#8 PEM private key for signing requests
    TELEBIRR_PRIVATE_KEY: zod_1.z.string().optional(),
    // Telebirr's RSA public key for verifying webhook signatures
    TELEBIRR_PUBLIC_KEY: zod_1.z.string().optional(),
    // Server-to-server webhook callback URL
    TELEBIRR_NOTIFY_URL: zod_1.z.string().optional(),
    // Browser redirect URL after payment completion
    TELEBIRR_REDIRECT_URL: zod_1.z.string().optional(),
    // Payment link expiry (Telebirr format, e.g. "120m")
    TELEBIRR_TIMEOUT_EXPRESS: zod_1.z.string().default("120m"),
    SMS_ETHIOPIA_API_KEY: zod_1.z.string().optional(),
    TELEGRAM_BOT_TOKEN: zod_1.z
        .string()
        .transform(function (val) { return val.trim().replace(/^["']|["']$/g, "").trim(); })
        .pipe(zod_1.z.string().min(1))
        .optional()
        .or(zod_1.z.literal("").transform(function () { return undefined; })),
    TELEGRAM_WEBHOOK_URL: zod_1.z.string().optional(),
    TELEGRAM_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Social sign-in (oauth.service.ts). Each provider independently gated:
    // unset = button hidden client-side + endpoint returns 503.
    APPLE_CLIENT_ID: zod_1.z.string().optional(),
    FACEBOOK_APP_ID: zod_1.z.string().optional(),
    FACEBOOK_APP_SECRET: zod_1.z.string().optional(),
    FRONTEND_URL: zod_1.z.string().default("http://localhost:5173"),
    TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: zod_1.z.coerce.number().default(86400),
    CHAPA_SECRET_KEY: zod_1.z.string().optional(),
    // Google OAuth & Social Auth
    GOOGLE_CLIENT_ID: zod_1.z.string().optional(),
    GOOGLE_CLIENT_SECRET: zod_1.z.string().optional(),
    // Transactional Email Service
    SMTP_HOST: zod_1.z.string().optional(),
    SMTP_PORT: zod_1.z.coerce.number().default(587),
    SMTP_USER: zod_1.z.string().optional(),
    SMTP_PASS: zod_1.z.string().optional(),
    SMTP_SECURE: zod_1.z.coerce.boolean().default(false),
    EMAIL_FROM: zod_1.z.string().default("Yekis Notifications <notifications@yekis.com>"),
    SENTRY_DSN: zod_1.z.string().optional(),
    // Legal-capacity gate — set once counsel confirms minimum contracting age
    MINIMUM_CONTRACTING_AGE: zod_1.z.coerce.number().default(18),
    // Withholding tax thresholds/rates — confirm with accountant before changing
    WITHHOLDING_THRESHOLD_MINOR: zod_1.z.coerce.number().default(1000000), // 10,000 ETB in cents
    WITHHOLDING_RATE_WITH_TIN: zod_1.z.coerce.number().default(0.03),
    WITHHOLDING_RATE_WITHOUT_TIN: zod_1.z.coerce.number().default(0.3),
    AUTO_RELEASE_WINDOW_DAYS: zod_1.z.coerce.number().default(5),
    // Payment reconciliation sweep (paymentReconcile.worker.ts) — the webhook
    // safety net. Polls Telebirr's queryOrder API for escrow transactions still
    // PENDING past STALE minutes; gives up (leaves PENDING for manual review)
    // after GIVE_UP_HOURS, matching the checkout expiry window plus slack.
    PAYMENT_RECONCILE_CRON: zod_1.z.string().default("*/10 * * * *"), // every 10 min
    PAYMENT_RECONCILE_STALE_MINUTES: zod_1.z.coerce.number().default(5),
    PAYMENT_RECONCILE_GIVE_UP_HOURS: zod_1.z.coerce.number().default(3),
    PAYMENT_RECONCILE_BATCH_SIZE: zod_1.z.coerce.number().default(50),
    // Take-rate — proposed 10% total, split evenly. Confirm final % with the
    // Phase 0 decision log before this stops being a placeholder default.
    PLATFORM_FEE_RATE_CLIENT: zod_1.z.coerce.number().default(0.05),
    PLATFORM_FEE_RATE_FREELANCER: zod_1.z.coerce.number().default(0.05),
    // TMS / AML rule thresholds — these are placeholder defaults matching the
    // roadmap's stated heuristics, NOT confirmed AML-policy figures. A prior
    // legal-research pass separately suggested a different structuring
    // definition (3+ deposits totaling >500,000 ETB within 7 days) — reconcile
    // both with the Compliance Officer/counsel before treating either as final.
    TMS_STRUCTURING_WINDOW_HOURS: zod_1.z.coerce.number().default(24),
    TMS_STRUCTURING_MIN_COUNT: zod_1.z.coerce.number().default(3),
    TMS_STRUCTURING_BAND_MINOR: zod_1.z.coerce.number().default(100000), // within this much below the withholding threshold counts as "near"
    TMS_VELOCITY_WINDOW_HOURS: zod_1.z.coerce.number().default(48),
    TMS_VELOCITY_MILESTONE_THRESHOLD: zod_1.z.coerce.number().default(20),
    TMS_PASS_THROUGH_WINDOW_HOURS: zod_1.z.coerce.number().default(24),
    TMS_STR_FILING_SLA_HOURS: zod_1.z.coerce.number().default(24),
    CHAPA_WEBHOOK_SECRET_HEADER: zod_1.z.string().default("x-chapa-signature"),
    // T2-D: VAT threshold alert — alert logged + TransactionFlag created when
    // PlatformOperatingAccount.accumulatedFeeMinor exceeds this value.
    // Ethiopian VAT applies at 500,000 ETB annual turnover (50,000,000 minor units).
    // Set conservatively lower to give Finance lead time. Confirm with accountant.
    VAT_THRESHOLD_MINOR: zod_1.z.coerce.number().default(45000000), // 450,000 ETB
    // T2-K: PEP provider selection. Set to "mock" in development, "real" in production.
    // The startup check in server.ts refuses to boot in NODE_ENV=production unless
    // this is NOT "mock". This prevents the mock watchlist from silently reaching
    // production — a real AML failure mode, not just a missing feature.
    // Blocked on: Compliance Officer selecting a real screening vendor (UN/OFAC/FIC).
    // See COMPLIANCE_BLOCKERS.md §PEP Screening for details.
    PEP_PROVIDER: zod_1.z.enum(["mock", "real"]).default("mock"),
    // Number of trusted proxy hops in front of the API (ngrok, nginx, ALB...).
    // Required for correct client IPs (rate limiting, audit logs) whenever the
    // API is not reached directly. Leave unset when running bare on localhost.
    TRUST_PROXY: zod_1.z.coerce.number().int().min(0).optional(),
});
var parsed = EnvSchema.safeParse(process.env);
if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
    process.exit(1);
}
exports.env = parsed.data;
