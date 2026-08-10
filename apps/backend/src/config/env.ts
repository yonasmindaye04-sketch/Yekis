// === IMPORTS ===
import "dotenv/config";
import { z } from "zod";

// Fail fast on startup if required config is missing — better than a
// confusing runtime error three requests into production.
const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET must be at least 32 chars"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("30d"),

  OBJECT_STORE_ENDPOINT: z.string().min(1),
  OBJECT_STORE_BUCKET: z.string().min(1),
  OBJECT_STORE_ACCESS_KEY: z.string().min(1),
  OBJECT_STORE_SECRET_KEY: z.string().min(1),

  TELEBIRR_MERCHANT_ID: z.string().optional(),
  TELEBIRR_API_KEY: z.string().optional(),
  TELEBIRR_WEBHOOK_SECRET: z.string().optional(),

  SMS_ETHIOPIA_API_KEY: z.string().optional(),

  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_URL: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  TELEGRAM_INIT_DATA_MAX_AGE_SECONDS: z.coerce.number().default(86400),

  CHAPA_SECRET_KEY: z.string().optional(),

  SENTRY_DSN: z.string().optional(),

  // Legal-capacity gate — set once counsel confirms minimum contracting age
  MINIMUM_CONTRACTING_AGE: z.coerce.number().default(18),

  // Withholding tax thresholds/rates — confirm with accountant before changing
  WITHHOLDING_THRESHOLD_MINOR: z.coerce.number().default(1000000), // 10,000 ETB in cents
  WITHHOLDING_RATE_WITH_TIN: z.coerce.number().default(0.03),
  WITHHOLDING_RATE_WITHOUT_TIN: z.coerce.number().default(0.3),

  AUTO_RELEASE_WINDOW_DAYS: z.coerce.number().default(5),

  // Take-rate — proposed 10% total, split evenly. Confirm final % with the
  // Phase 0 decision log before this stops being a placeholder default.
  PLATFORM_FEE_RATE_CLIENT: z.coerce.number().default(0.05),
  PLATFORM_FEE_RATE_FREELANCER: z.coerce.number().default(0.05),

  // TMS / AML rule thresholds — these are placeholder defaults matching the
  // roadmap's stated heuristics, NOT confirmed AML-policy figures. A prior
  // legal-research pass separately suggested a different structuring
  // definition (3+ deposits totaling >500,000 ETB within 7 days) — reconcile
  // both with the Compliance Officer/counsel before treating either as final.
  TMS_STRUCTURING_WINDOW_HOURS: z.coerce.number().default(24),
  TMS_STRUCTURING_MIN_COUNT: z.coerce.number().default(3),
  TMS_STRUCTURING_BAND_MINOR: z.coerce.number().default(100000), // within this much below the withholding threshold counts as "near"
  TMS_VELOCITY_WINDOW_HOURS: z.coerce.number().default(48),
  TMS_VELOCITY_MILESTONE_THRESHOLD: z.coerce.number().default(20),
  TMS_PASS_THROUGH_WINDOW_HOURS: z.coerce.number().default(24),
  TMS_STR_FILING_SLA_HOURS: z.coerce.number().default(24),

  TELEBIRR_WEBHOOK_SECRET_HEADER: z.string().default("x-telebirr-signature"),
  CHAPA_WEBHOOK_SECRET_HEADER: z.string().default("x-chapa-signature"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error("❌ Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
