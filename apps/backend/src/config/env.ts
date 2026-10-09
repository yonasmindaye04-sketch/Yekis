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
  // F-01: guest-support tokens are signed with a SEPARATE key so they cannot
  // ever verify as an access token. Sharing JWT_ACCESS_SECRET is what turned
  // a support ticket into an account takeover.
  GUEST_SUPPORT_JWT_SECRET: z
    .string()
    .min(32, "GUEST_SUPPORT_JWT_SECRET must be at least 32 chars")
    .optional(),

  OBJECT_STORE_ENDPOINT: z.string().min(1),
  OBJECT_STORE_BUCKET: z.string().min(1),
  OBJECT_STORE_ACCESS_KEY: z.string().min(1),
  OBJECT_STORE_SECRET_KEY: z.string().min(1),

  // ── Telebirr C2B Web Checkout credentials ──
  // Which Telebirr environment these credentials belong to. Required whenever
  // ANY Telebirr credential is set, so a deployment can never be ambiguous
  // about whether it is pointed at the test or the live gateway.
  TELEBIRR_ENV: z.enum(["sandbox", "production"]).optional(),
  // Gateway base URL. No schema default: the value is derived from
  // TELEBIRR_ENV after parsing (see resolveTelebirrUrls). In production it
  // must be supplied explicitly and must not be the developer-portal host —
  // assertProductionSafety refuses to boot otherwise.
  TELEBIRR_BASE_URL: z.string().optional(),
  // Web checkout base URL. Same rules as TELEBIRR_BASE_URL.
  TELEBIRR_WEB_BASE_URL: z.string().optional(),
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
  /**
   * Which Telegram *environment* this process speaks to: dev, staging or prod.
   *
   * This is separate from NODE_ENV on purpose. The single most damaging
   * misconfiguration available in this system is running the production bot
   * token against a locally tweaked build — it makes the local code the
   * authority for real members' money and KYC decisions. Long polling is
   * therefore permitted ONLY when this is "dev" (see assertProductionSafety).
   */
  TELEGRAM_ENV: z.enum(["dev", "staging", "prod"]).optional(),
  /**
   * Explicit opt-in to long polling. Defaults to true only when
   * TELEGRAM_ENV=dev (see resolvePolling). In staging/prod it must stay false,
   * and assertProductionSafety refuses to boot if it is not.
   */
  TELEGRAM_POLLING_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  // Per-call budget for Telegram Bot API requests. Node's fetch has no default
  // timeout, so an unreachable api.telegram.org (firewall DROP, dead route)
  // leaves the promise pending forever — which silently prevented the bot from
  // ever starting to poll. Long polling is allowed a longer budget
  // automatically. Default 10000ms.
  TELEGRAM_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  // Served to the client so the login widget and deep links always target the
  // deployed bot. Without it the frontend falls back to a hardcoded handle.
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  // Social sign-in (oauth.service.ts). Each provider independently gated:
  // unset = button hidden client-side + endpoint returns 503.
  APPLE_CLIENT_ID: z.string().optional(),
  FACEBOOK_APP_ID: z.string().optional(),
  FACEBOOK_APP_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  /**
   * Public https origin of THIS API, with no trailing path.
   *
   * Kept separate from FRONTEND_URL because they are different services and
   * conflating them is how machine-to-machine callbacks end up pointing at a
   * CDN or SPA host that cannot route them:
   *
   *   API_PUBLIC_URL   provider callbacks (Telebirr notify_url, CBE/MPESA
   *                    return URLs). Required in production. Never a
   *                    user-facing link.
   *   FRONTEND_URL     user-facing redirects (payment return, reset-password
   *                    email, bot "open the web app" buttons).
   *
   * Building a provider notify_url from FRONTEND_URL means money-confirming
   * webhooks arrive at whatever serves the marketing site — and if that host
   * ever changes, or a staging FRONTEND_URL is left in place, settlement breaks
   * silently rather than loudly.
   */
  API_PUBLIC_URL: z.string().optional(),

  /**
   * Kill switch for the CBE webhook route.
   *
   * Defaults to FALSE: an unauthenticated-by-design money endpoint should have
   * to be switched on deliberately. While off, the route answers 404 so it is
   * indistinguishable from a route that does not exist.
   */
  CBE_WEBHOOK_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),

  /**
   * Public https origin of the staff console.
   *
   * Required in production. The bot's /staff command only ever shows queue
   * COUNTS and links here, where MFA is enforced — a hardcoded fallback domain
   * would send staff to a host nobody controls, which is either dead or, worse,
   * attacker-registered.
   */
  STAFF_CONSOLE_URL: z.string().optional(),
  // Replay window for a signed Telegram credential. A captured initData
  // string is a bearer credential, so this must stay short: 15 minutes.
  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().int().positive().default(900),

  // ── Hardening rollout flags (plan Section 6) ──
  // Legacy bot-issued one-time sign-in code. Defaults OFF: the PKCE web-login
  // flow is the replacement, and the code is a bearer credential.
  LEGACY_TG_CODE_ENABLED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  // Step-up enforcement on money movement. Starts false so the middleware can
  // run in log-only mode and report what it WOULD have blocked, then flips true.
  WITHDRAW_STEPUP_ENFORCED: z
    .string()
    .optional()
    .transform((v) => v === "true"),
  // Hours a cooling-off lock is applied for after a sensitive account change.
  COOLING_OFF_HOURS: z.coerce.number().int().positive().default(24),
  // Current consent versions. A user who consented to an older version is
  // re-prompted before sensitive actions.
  TERMS_VERSION: z.string().default("1.0"),
  PRIVACY_VERSION: z.string().default("1.0"),

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

  // Dev-only: force every Fayda verification to fail with UNAVAILABLE so the
  // manual-review fallback queue can be exercised end-to-end without waiting
  // for a real outage. Tier 1 then routes to UNDER_REVIEW exactly as it would
  // if the Fayda API were genuinely down — never auto-verified.
  // Must stay OFF in production: there is no "real" client behind this flag yet.
  FAYDA_SIMULATE_UNAVAILABLE: z
    .string()
    .optional()
    .transform((v) => v === "true"),

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
  //
  // This is a HOP COUNT, not a boolean and not a CIDR list. Express walks
  // X-Forwarded-For right-to-left for exactly this many hops; anything the
  // client appends to the left of that point is discarded. Setting it too high
  // lets a client forge its own IP and walk straight through every rate limit;
  // setting it too low collapses all clients onto the proxy's address.
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).optional(),

  // OpenSearch (optional) — full-text search backend. Unset = search falls
  // back to the existing Postgres queries; no dependency is required to boot.
OPENSEARCH_URL: z.string().url().optional(),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment configuration:",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export type TelegramEnv = "dev" | "staging" | "prod";

/** Telebirr gateway environments. */
export type TelebirrEnv = "sandbox" | "production";

/**
 * Telebirr's developer-portal host is their TEST environment. It must never
 * appear in a production configuration: payments created against it are not
 * real money movements.
 */
export const TELEBIRR_SANDBOX_HOST = "developerportal.ethiotelebirr.et";

/** Sandbox gateway base URL (machine-to-machine API). */
export const SANDBOX_TELEBIRR_BASE_URL =
  `https://${TELEBIRR_SANDBOX_HOST}:38443/apiaccess/payment/gateway`;

/** Sandbox web-checkout base URL (browser redirect). */
export const SANDBOX_TELEBIRR_WEB_BASE_URL =
  `https://${TELEBIRR_SANDBOX_HOST}:38443/payment/web/paygate?`;

/**
 * Any Telebirr credential being present means Telebirr is in use, which makes
 * TELEBIRR_ENV mandatory. Without this a deployment could be pointed at the
 * sandbox with no declaration, and nothing would object.
 */
export function telebirrIsConfigured(
  cfg: Partial<Record<string, unknown>>,
): boolean {
  return [
    "TELEBIRR_FABRIC_APP_ID",
    "TELEBIRR_APP_SECRET",
    "TELEBIRR_MERCHANT_APP_ID",
    "TELEBIRR_MERCHANT_CODE",
    "TELEBIRR_PRIVATE_KEY",
    "TELEBIRR_PUBLIC_KEY",
  ].some((key) => {
    const value = cfg[key];
    return typeof value === "string" && value.length > 0;
  });
}

/**
 * Fully resolved configuration.
 *
 * `TELEGRAM_ENV` falls back to NODE_ENV so an existing deployment is not broken
 * by the new variable: production implies "prod", everything else implies "dev".
 * `TELEGRAM_POLLING_ENABLED` defaults to true only for a dev Telegram
 * environment, and assertProductionSafety refuses to boot if a non-dev
 * environment has it turned on.
 */
export type Env = z.infer<typeof EnvSchema> & {
  TELEGRAM_ENV: TelegramEnv;
  TELEBIRR_ENV?: TelebirrEnv;
  // Resolved from TELEBIRR_ENV (or an explicit override). In production these
  // must have been supplied explicitly; assertProductionSafety enforces that
  // and the process will not boot on the sandbox default.
  TELEBIRR_BASE_URL: string;
  TELEBIRR_WEB_BASE_URL: string;
  TELEGRAM_POLLING_ENABLED: boolean;
};

/**
 * Fail-closed production checks (plan T0.2).
 *
 * Kept as a pure function that RETURNS violations rather than exiting, so it
 * can be unit tested without killing the test runner. `env.ts` calls it at
 * import time and exits; tests call it with fabricated configs.
 *
 * Every rule here exists because the failure it prevents is silent: a missing
 * webhook secret does not throw, it just makes the webhook endpoint
 * unauthenticated; a non-https FRONTEND_URL does not throw, it just ships user
 * credentials over cleartext to a Mini App that Telegram may still render.
 */
export function assertProductionSafety(
  cfg: Partial<Env> & {
    NODE_ENV?: string;
    TELEGRAM_ENV?: TelegramEnv;
    TELEBIRR_ENV?: TelebirrEnv;
  },
): string[] {
  const violations: string[] = [];
  const isProd = cfg.NODE_ENV === "production";
  const telegramEnv: TelegramEnv =
    cfg.TELEGRAM_ENV ?? (isProd ? "prod" : "dev");

  if (isProd) {
    if (!cfg.TELEGRAM_BOT_TOKEN) {
      violations.push(
        "TELEGRAM_BOT_TOKEN is required when NODE_ENV=production; the bot would otherwise start unauthorised.",
      );
    }
    // F-01: without a distinct key, a guest-support token verifies against
    // JWT_ACCESS_SECRET and becomes a full session. No silent fallback here.
    if (!cfg.GUEST_SUPPORT_JWT_SECRET) {
      violations.push(
        "GUEST_SUPPORT_JWT_SECRET is required when NODE_ENV=production. Guest-support tokens must be signed with a key distinct from JWT_ACCESS_SECRET, otherwise a signed-out visitor who names an existing email can obtain a full session as that user.",
      );
    } else if (cfg.JWT_ACCESS_SECRET === cfg.GUEST_SUPPORT_JWT_SECRET) {
      violations.push(
        "GUEST_SUPPORT_JWT_SECRET must differ from JWT_ACCESS_SECRET. Sharing the key lets a guest-support token pass requireAuth.",
      );
    }
    if (!cfg.TELEGRAM_WEBHOOK_SECRET) {
      violations.push(
        "TELEGRAM_WEBHOOK_SECRET is required when NODE_ENV=production. Without it POST /api/v1/telegram/webhook accepts updates from anyone who learns the URL, which is a full account-takeover primitive.",
      );
    }
    if (!cfg.TELEGRAM_WEBHOOK_URL) {
      violations.push(
        "TELEGRAM_WEBHOOK_URL is required when NODE_ENV=production. Production uses a webhook; without a URL the process would silently fall back to long polling.",
      );
    }
    if (cfg.TELEGRAM_WEBHOOK_URL) {
      try {
        const webhookUrl = new URL(cfg.TELEGRAM_WEBHOOK_URL);
        if (webhookUrl.protocol !== "https:" || /\s/.test(cfg.TELEGRAM_WEBHOOK_URL)) {
          throw new Error("not a clean https URL");
        }
      } catch {
        violations.push(
          `TELEGRAM_WEBHOOK_URL must be a clean https URL in production (got ${cfg.TELEGRAM_WEBHOOK_URL}).`,
        );
      }
    }
    if (cfg.FRONTEND_URL && !/^https:\/\//i.test(cfg.FRONTEND_URL)) {
      violations.push(
        `FRONTEND_URL must be a public https origin in production (got ${cfg.FRONTEND_URL}). The Mini App and its tokens are otherwise exposed in cleartext.`,
      );
    }

    // Provider callbacks must resolve to THIS service. A missing API_PUBLIC_URL
    // previously meant the Telebirr notify_url was assembled from FRONTEND_URL,
    // which points at the web app host — so settlement webhooks would be
    // delivered somewhere that cannot process them.
    if (!cfg.API_PUBLIC_URL) {
      violations.push(
        "API_PUBLIC_URL is required when NODE_ENV=production. Provider callbacks (Telebirr notify_url and any provider return URL) are built from it; deriving them from FRONTEND_URL delivers money-confirming webhooks to the web app host.",
      );
    } else if (!/^https:\/\//i.test(cfg.API_PUBLIC_URL)) {
      violations.push(
        `API_PUBLIC_URL must be an https origin in production (got ${cfg.API_PUBLIC_URL}).`,
      );
    }

    // A configured secret behind a disabled route is a silent money black hole:
    // the provider believes it has a live endpoint, retries, and every user
    // top-up stays pending forever. Make the contradiction explicit at boot.
    if (cfg.CBE_WEBHOOK_SECRET && cfg.CBE_WEBHOOK_ENABLED !== true) {
      violations.push(
        "CBE_WEBHOOK_SECRET is set but CBE_WEBHOOK_ENABLED is not true. The /api/v1/webhooks/cbe route answers 404 while the provider still believes it is live, so CBE top-ups would settle never. Set CBE_WEBHOOK_ENABLED=true, or remove the secret.",
      );
    }

    // The symmetric contradiction: route on, nothing to verify against. The
    // tempting "fix" in the field is to weaken verification, so refuse to boot
    // instead.
    if (cfg.CBE_WEBHOOK_ENABLED === true && !cfg.CBE_WEBHOOK_SECRET) {
      violations.push(
        "CBE_WEBHOOK_ENABLED is true but CBE_WEBHOOK_SECRET is not set. The route cannot verify any signature. Set the secret, or disable the route.",
      );
    }

    // No hardcoded fallback for the staff console: the bot must never send staff
    // to a domain this deployment does not control.
    if (!cfg.STAFF_CONSOLE_URL) {
      violations.push(
        "STAFF_CONSOLE_URL is required when NODE_ENV=production. The bot's /staff command links to the console, where MFA is enforced; without it there is no safe link to emit.",
      );
    } else if (!/^https:\/\//i.test(cfg.STAFF_CONSOLE_URL)) {
      violations.push(
        `STAFF_CONSOLE_URL must be an https origin in production (got ${cfg.STAFF_CONSOLE_URL}).`,
      );
    }

    if (telegramEnv !== "prod") {
      violations.push(
        `TELEGRAM_ENV is "${telegramEnv}" but NODE_ENV=production. Refusing to run a non-production Telegram environment against production traffic.`,
      );
    }

    // Telebirr: only checked when Telebirr is actually in use. A deployment
    // that does not accept Telebirr payments is unaffected.
    if (telebirrIsConfigured(cfg as Record<string, unknown>)) {
      if (!cfg.TELEBIRR_ENV) {
        violations.push(
          "TELEBIRR_ENV is required when NODE_ENV=production because Telebirr credentials are set. Set it to production; sandbox is refused.",
        );
      } else if (cfg.TELEBIRR_ENV !== "production") {
        violations.push(
          `TELEBIRR_ENV is "${cfg.TELEBIRR_ENV}" but NODE_ENV=production. Refusing to run the Telebirr sandbox gateway against production traffic.`,
        );
      }

      // Both URLs must be stated explicitly, and neither may be the test host.
      // Previously both defaulted to developerportal.ethiotelebirr.et, so a
      // production boot with no Telebirr overrides silently ran against the
      // sandbox and every real top-up went nowhere.
      const telebirrUrls: Array<[string, string | undefined]> = [
        ["TELEBIRR_BASE_URL", cfg.TELEBIRR_BASE_URL],
        ["TELEBIRR_WEB_BASE_URL", cfg.TELEBIRR_WEB_BASE_URL],
      ];
      for (const [name, value] of telebirrUrls) {
        if (!value) {
          violations.push(
            `${name} must be set explicitly when NODE_ENV=production and Telebirr is configured. It has no default; there is no safe guess for a live Telebirr address.`,
          );
        } else if (value.includes(TELEBIRR_SANDBOX_HOST)) {
          violations.push(
            `${name} points at the Telebirr developer portal host "${TELEBIRR_SANDBOX_HOST}", which is the SANDBOX environment. In production that routes live traffic to the test gateway.`,
          );
        }
      }

      // Telebirr's RSA public key is what verifies the settlement webhook.
      // Without it a settlement cannot be attributed to a genuine provider.
      if (!cfg.TELEBIRR_PUBLIC_KEY) {
        violations.push(
          "TELEBIRR_PUBLIC_KEY is required when NODE_ENV=production and Telebirr is configured. Without Telebirr's public key the settlement webhook cannot be signature-verified.",
        );
      }
      if (!cfg.TELEBIRR_MERCHANT_APP_ID) {
        violations.push(
          "TELEBIRR_MERCHANT_APP_ID is required when NODE_ENV=production and Telebirr is configured.",
        );
      }
      if (!cfg.TELEBIRR_MERCHANT_CODE) {
        violations.push(
          "TELEBIRR_MERCHANT_CODE is required when NODE_ENV=production and Telebirr is configured.",
        );
      }
    }
  }

  // Long polling is a DEVELOPMENT convenience. In staging/prod it competes with
  // any webhook deployment for updates, and two consumers of the same
  // getUpdates stream silently halve throughput.
  if (cfg.TELEGRAM_POLLING_ENABLED === true && telegramEnv !== "dev") {
    violations.push(
      `TELEGRAM_POLLING_ENABLED is set but TELEGRAM_ENV="${telegramEnv}". Long polling is only permitted when TELEGRAM_ENV=dev.`,
    );
  }

  return violations;
}

// Telebirr is in use, so the deployment must declare which environment it is
// pointed at. This is checked at load rather than only in production: an
// undeclared sandbox pointer is ambiguous everywhere, not just at boot.
if (telebirrIsConfigured(parsed.data as Record<string, unknown>) && !parsed.data.TELEBIRR_ENV) {
  // eslint-disable-next-line no-console
  console.error(
    "Invalid environment configuration:\n" +
      "   TELEBIRR_ENV is required because Telebirr credentials are set. " +
      'Set TELEBIRR_ENV=sandbox or TELEBIRR_ENV=production. No credential value is shown.',
  );
  process.exit(1);
}

const resolvedTelegramEnv: TelegramEnv =
  parsed.data.TELEGRAM_ENV ??
  (parsed.data.NODE_ENV === "production" ? "prod" : "dev");

const resolved: Env = {
  ...(parsed.data as z.infer<typeof EnvSchema>),
  TELEGRAM_ENV: resolvedTelegramEnv,
  // Derived from TELEBIRR_ENV, never from NODE_ENV: a staging deployment can
  // legitimately be sandbox, and a production deployment must state both its
  // environment and its explicit URLs (enforced below).
  //
  // There is deliberately no default for the production case. If
  // TELEBIRR_ENV=production and no URL is supplied, the sandbox host is used
  // here and assertProductionSafety then refuses to boot — which is the
  // intended outcome, not a silent test-gateway fallback.
  TELEBIRR_BASE_URL:
    parsed.data.TELEBIRR_BASE_URL ?? SANDBOX_TELEBIRR_BASE_URL,
  TELEBIRR_WEB_BASE_URL:
    parsed.data.TELEBIRR_WEB_BASE_URL ?? SANDBOX_TELEBIRR_WEB_BASE_URL,
  // Default: polling on in dev, off everywhere else. An explicit
  // TELEGRAM_POLLING_ENABLED=true in a non-dev environment is caught above.
  TELEGRAM_POLLING_ENABLED:
    parsed.data.TELEGRAM_POLLING_ENABLED ?? resolvedTelegramEnv === "dev",
};

const violations = assertProductionSafety(resolved);
if (violations.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    "\nRefusing to start: unsafe production configuration.\n",
  );
  for (const v of violations) {
    // eslint-disable-next-line no-console
    console.error(`   - ${v}`);
  }
  // eslint-disable-next-line no-console
  console.error("");
  process.exit(1);
}

export const env: Env = resolved;
