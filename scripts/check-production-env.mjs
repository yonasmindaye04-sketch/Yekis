#!/usr/bin/env node
// =============================================================================
// Yekis - production environment pre-flight
// =============================================================================
//
// Runs the checks that config/env.ts and server.ts enforce at boot, plus the
// deployment assumptions those checks cannot see (the staging database, the
// test bucket, a sandbox Telebirr host, a personal-email sender). It prints
// variable NAMES and reasons only - never a value - so the output can be
// pasted into a ticket.
//
// Usage:
//   node scripts/check-production-env.mjs --file .env.production
//   node scripts/check-production-env.mjs --file .env.production --url https://app.example.com
//   node scripts/check-production-env.mjs --self-test
//
// Exit codes: 0 = no errors, 1 = at least one error, 2 = the file could not
// be read. Warnings never change the exit code.
// =============================================================================

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const TELEBIRR_SANDBOX_HOST = "developerportal.ethiotelebirr.et";
const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "icloud.com",
  "proton.me",
  "protonmail.com",
];
const PLACEHOLDER_HOSTS = [".example", ".invalid", ".test", ".localhost"];
const SECRET_KEYS = [
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "GUEST_SUPPORT_JWT_SECRET",
  "TELEGRAM_BOT_TOKEN",
  "TELEGRAM_WEBHOOK_SECRET",
  "OBJECT_STORE_ACCESS_KEY",
  "OBJECT_STORE_SECRET_KEY",
  "BREVO_API_KEY",
  "TELEBIRR_APP_SECRET",
  "TELEBIRR_PRIVATE_KEY",
  "TELEBIRR_PUBLIC_KEY",
];

export function parseEnvFile(text) {
  const out = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const equals = line.indexOf("=");
    if (equals === -1) continue;
    const key = line.slice(0, equals).trim();
    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) continue;
    let value = line.slice(equals + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

function hostOf(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isPlaceholder(value) {
  if (!value) return false;
  return (
    /^<.*>$/.test(value) ||
    /^(changeme|change-me|replace-me|placeholder)$/i.test(value) ||
    /your-domain|your-domain\.example/i.test(value)
  );
}

function isPlaceholderHost(host) {
  if (!host) return true;
  return (
    host === "localhost" ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    host === "::1" ||
    PLACEHOLDER_HOSTS.some((suffix) => host.endsWith(suffix))
  );
}

function originOnly(value) {
  try {
    const url = new URL(value);
    return {
      origin: url.origin.toLowerCase(),
      host: url.hostname.toLowerCase(),
      path: url.pathname,
      search: url.search,
      hash: url.hash,
      protocol: url.protocol,
    };
  } catch {
    return null;
  }
}

export function validateProductionEnv(env) {
  const errors = [];
  const warnings = [];
  const get = (key) => (env[key] ?? "").trim();
  const has = (key) => get(key).length > 0;
  const fail = (message) => errors.push(message);
  const warn = (message) => warnings.push(message);
  const requireValue = (key, why) => {
    if (!has(key)) fail(`${key} is required. ${why}`);
  };

  // --- Core runtime --------------------------------------------------------
  if (get("NODE_ENV") !== "production") {
    fail('NODE_ENV must be "production". Any other value skips the fail-closed boot checks.');
  }
  if (has("PORT") && !/^\d+$/.test(get("PORT"))) {
    fail("PORT must be a number.");
  }
  if (get("SERVE_FRONTEND") !== "true") {
    fail("SERVE_FRONTEND must be true; one container serves the SPA and the API.");
  }
  if (get("RUN_MIGRATIONS") !== "true") {
    warn("RUN_MIGRATIONS is not true; the database schema must be migrated before the API starts.");
  }
  if (get("RATE_LIMIT_DISABLED") === "true") {
    fail("RATE_LIMIT_DISABLED must not be true in production.");
  }
  if (get("ALLOW_MOCK_PAYMENT_AUTO_APPROVAL") === "true") {
    fail("ALLOW_MOCK_PAYMENT_AUTO_APPROVAL must not be true in production.");
  }
  if (get("FAYDA_SIMULATE_UNAVAILABLE") === "true") {
    fail("FAYDA_SIMULATE_UNAVAILABLE must not be true in production.");
  }
  if (get("WITHDRAW_STEPUP_ENFORCED") !== "true") {
    fail("WITHDRAW_STEPUP_ENFORCED must be true; money movement keeps its second factor.");
  }

  // --- Public URLs ---------------------------------------------------------
  for (const key of ["FRONTEND_URL", "API_PUBLIC_URL", "STAFF_CONSOLE_URL"]) {
    requireValue(key, "The public origin is required.");
  }
  const urls = {};
  for (const key of ["FRONTEND_URL", "API_PUBLIC_URL", "STAFF_CONSOLE_URL"]) {
    if (!has(key)) continue;
    const parsed = originOnly(get(key));
    if (!parsed) {
      fail(`${key} is not a valid URL.`);
      continue;
    }
    urls[key] = parsed;
    if (parsed.protocol !== "https:") {
      fail(`${key} must use https.`);
    }
    if (isPlaceholderHost(parsed.host)) {
      fail(`${key} points at a placeholder or local host.`);
    }
    if (parsed.path !== "/" || parsed.search || parsed.hash) {
      fail(`${key} must be an origin only (no path, query or fragment).`);
    }
  }
  const origins = new Set(
    Object.values(urls).map((parsed) => parsed.origin),
  );
  if (origins.size > 1) {
    fail(
      "FRONTEND_URL, API_PUBLIC_URL and STAFF_CONSOLE_URL must share one origin in this single-container deployment.",
    );
  }
  const publicHost = urls.API_PUBLIC_URL?.host ?? urls.FRONTEND_URL?.host ?? "";
  if (publicHost && publicHost.endsWith(".app.aletcloud.com")) {
    if (get("HSTS_INCLUDE_SUBDOMAINS") === "true") {
      fail(
        "HSTS_INCLUDE_SUBDOMAINS must be false on a shared *.app.aletcloud.com host; includeSubDomains would affect other tenants.",
      );
    }
  } else if (get("HSTS_INCLUDE_SUBDOMAINS") !== "true") {
    warn("HSTS_INCLUDE_SUBDOMAINS is not true on a dedicated domain.");
  }
  if (!/^\d+$/.test(get("TRUST_PROXY_HOPS")) || Number(get("TRUST_PROXY_HOPS")) < 1) {
    fail("TRUST_PROXY_HOPS must be at least 1 behind the AletCloud proxy.");
  }

  // --- Database ------------------------------------------------------------
  requireValue("DATABASE_URL", "A production PostgreSQL connection is required.");
  if (has("DATABASE_URL")) {
    const db = originOnly(get("DATABASE_URL"));
    if (!db) {
      fail("DATABASE_URL is not a valid URL.");
    } else {
      if (!/^postgres(ql)?:$/.test(db.protocol)) {
        fail("DATABASE_URL must be a postgres:// or postgresql:// URL.");
      }
      if (isPlaceholderHost(db.host)) {
        fail("DATABASE_URL points at a placeholder or local host.");
      }
      if (db.host.includes("yekis-jobs")) {
        fail(
          "DATABASE_URL points at the staging database (yekis-jobs). Production must use its own instance.",
        );
      }
    }
  }

  // --- Secrets -------------------------------------------------------------
  for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "GUEST_SUPPORT_JWT_SECRET"]) {
    requireValue(key, "A distinct signing secret is required.");
    if (has(key) && get(key).length < 32) {
      fail(`${key} must be at least 32 characters.`);
    }
    if (isPlaceholder(get(key))) {
      fail(`${key} is still a placeholder.`);
    }
  }
  if (
    has("JWT_ACCESS_SECRET") &&
    has("GUEST_SUPPORT_JWT_SECRET") &&
    get("JWT_ACCESS_SECRET") === get("GUEST_SUPPORT_JWT_SECRET")
  ) {
    fail("GUEST_SUPPORT_JWT_SECRET must differ from JWT_ACCESS_SECRET.");
  }
  if (
    has("JWT_ACCESS_SECRET") &&
    has("JWT_REFRESH_SECRET") &&
    get("JWT_ACCESS_SECRET") === get("JWT_REFRESH_SECRET")
  ) {
    fail("JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET.");
  }

  // --- Telegram ------------------------------------------------------------
  if (get("TELEGRAM_ENV") !== "prod") {
    fail('TELEGRAM_ENV must be "prod" when NODE_ENV=production.');
  }
  if (get("TELEGRAM_POLLING_ENABLED") === "true") {
    fail("TELEGRAM_POLLING_ENABLED must not be true outside a dev Telegram environment.");
  }
  requireValue("TELEGRAM_BOT_TOKEN", "The production bot token is required.");
  if (has("TELEGRAM_BOT_TOKEN") && !/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(get("TELEGRAM_BOT_TOKEN"))) {
    warn("TELEGRAM_BOT_TOKEN does not look like a BotFather token.");
  }
  if (isPlaceholder(get("TELEGRAM_BOT_TOKEN"))) {
    fail("TELEGRAM_BOT_TOKEN is still a placeholder.");
  }
  requireValue("TELEGRAM_BOT_USERNAME", "The bot handle is required by the Login Widget and deep links.");
  if (get("TELEGRAM_BOT_USERNAME").startsWith("@")) {
    fail("TELEGRAM_BOT_USERNAME must not include the leading @.");
  }
  requireValue("TELEGRAM_WEBHOOK_SECRET", "Telegram must authenticate every webhook delivery.");
  if (has("TELEGRAM_WEBHOOK_SECRET") && get("TELEGRAM_WEBHOOK_SECRET").length < 16) {
    fail("TELEGRAM_WEBHOOK_SECRET must be at least 16 characters (32+ recommended).");
  }
  if (isPlaceholder(get("TELEGRAM_WEBHOOK_SECRET"))) {
    fail("TELEGRAM_WEBHOOK_SECRET is still a placeholder.");
  }
  requireValue("TELEGRAM_WEBHOOK_URL", "Production uses a webhook, not long polling.");
  if (has("TELEGRAM_WEBHOOK_URL")) {
    const hook = originOnly(get("TELEGRAM_WEBHOOK_URL"));
    if (!hook || hook.protocol !== "https:") {
      fail("TELEGRAM_WEBHOOK_URL must be a clean https URL.");
    } else if (urls.API_PUBLIC_URL && hook.origin !== urls.API_PUBLIC_URL.origin) {
      fail("TELEGRAM_WEBHOOK_URL must live on the API_PUBLIC_URL origin.");
    } else if (hook.path !== "/api/v1/telegram/webhook") {
      fail("TELEGRAM_WEBHOOK_URL must end at /api/v1/telegram/webhook.");
    }
  }
  if (!has("VITE_TELEGRAM_BOT_USERNAME")) {
    warn("VITE_TELEGRAM_BOT_USERNAME is unset; the built SPA falls back to a hardcoded handle.");
  } else if (
    has("TELEGRAM_BOT_USERNAME") &&
    get("VITE_TELEGRAM_BOT_USERNAME").replace(/^@/, "") !==
      get("TELEGRAM_BOT_USERNAME").replace(/^@/, "")
  ) {
    warn("VITE_TELEGRAM_BOT_USERNAME and TELEGRAM_BOT_USERNAME differ.");
  }

  // --- Object storage ------------------------------------------------------
  for (const key of [
    "OBJECT_STORE_ENDPOINT",
    "OBJECT_STORE_BUCKET",
    "OBJECT_STORE_ACCESS_KEY",
    "OBJECT_STORE_SECRET_KEY",
  ]) {
    requireValue(key, "KYC documents, receipts and contract PDFs need the object store.");
  }
  if (has("OBJECT_STORE_ENDPOINT")) {
    const store = originOnly(get("OBJECT_STORE_ENDPOINT"));
    if (!store || store.protocol !== "https:") {
      fail("OBJECT_STORE_ENDPOINT must use https.");
    }
  }
  if (get("OBJECT_STORE_BUCKET").includes("test")) {
    fail("OBJECT_STORE_BUCKET looks like the staging bucket; production needs its own.");
  }
  for (const key of ["OBJECT_STORE_ACCESS_KEY", "OBJECT_STORE_SECRET_KEY"]) {
    if (isPlaceholder(get(key))) fail(`${key} is still a placeholder.`);
  }

  // --- Email ---------------------------------------------------------------
  requireValue("EMAIL_FROM", "Verification and notification mail needs a sender.");
  if (has("EMAIL_FROM")) {
    const address = get("EMAIL_FROM").match(/<([^>]+)>/)?.[1] ?? get("EMAIL_FROM");
    const domain = address.split("@")[1]?.toLowerCase() ?? "";
    if (!domain) {
      fail("EMAIL_FROM does not contain an email address.");
    } else if (PERSONAL_EMAIL_DOMAINS.includes(domain)) {
      warn("EMAIL_FROM uses a personal mailbox; a verified domain sender is expected in production.");
    }
  }
  const transport = get("EMAIL_TRANSPORT") || "auto";
  if (!["smtp", "brevo", "auto"].includes(transport)) {
    fail('EMAIL_TRANSPORT must be "smtp", "brevo" or "auto".');
  }
  const brevo = has("BREVO_API_KEY");
  const smtp = has("SMTP_HOST") && has("SMTP_USER") && has("SMTP_PASS");
  if (transport === "brevo" && !brevo) {
    fail("EMAIL_TRANSPORT=brevo requires BREVO_API_KEY.");
  }
  if (transport === "smtp" && !smtp) {
    fail("EMAIL_TRANSPORT=smtp requires SMTP_HOST, SMTP_USER and SMTP_PASS.");
  }
  if (transport === "auto" && !brevo && !smtp) {
    fail("No mail transport is configured; verification codes cannot be delivered.");
  }
  if (isPlaceholder(get("BREVO_API_KEY"))) {
    fail("BREVO_API_KEY is still a placeholder.");
  }

  // --- SMS -----------------------------------------------------------------
  if (!has("SMS_ETHIOPIA_API_KEY")) {
    warn(
      "SMS_ETHIOPIA_API_KEY is unset; withdrawal approval codes can only reach members with a linked Telegram chat.",
    );
  }

  // --- Social sign-in ------------------------------------------------------
  if (has("GOOGLE_CLIENT_ID")) {
    if (!get("GOOGLE_CLIENT_ID").endsWith(".apps.googleusercontent.com")) {
      warn("GOOGLE_CLIENT_ID does not look like a Google OAuth client id.");
    }
    if (has("VITE_GOOGLE_CLIENT_ID") && get("VITE_GOOGLE_CLIENT_ID") !== get("GOOGLE_CLIENT_ID")) {
      fail("VITE_GOOGLE_CLIENT_ID must equal GOOGLE_CLIENT_ID; the SPA is built with the VITE_ value.");
    }
    if (!has("VITE_GOOGLE_CLIENT_ID")) {
      warn("VITE_GOOGLE_CLIENT_ID is unset; the built SPA will not show the Google button.");
    }
  } else {
    warn("GOOGLE_CLIENT_ID is unset; Google sign-in stays disabled.");
  }

  // --- Telebirr ------------------------------------------------------------
  const telebirrKeys = [
    "TELEBIRR_FABRIC_APP_ID",
    "TELEBIRR_APP_SECRET",
    "TELEBIRR_MERCHANT_APP_ID",
    "TELEBIRR_MERCHANT_CODE",
    "TELEBIRR_PRIVATE_KEY",
    "TELEBIRR_PUBLIC_KEY",
    "TELEBIRR_BASE_URL",
    "TELEBIRR_WEB_BASE_URL",
  ];
  const telebirrConfigured = telebirrKeys.some((key) => has(key));
  if (telebirrConfigured) {
    if (get("TELEBIRR_ENV") !== "production") {
      fail('TELEBIRR_ENV must be "production" when Telebirr credentials are set.');
    }
    for (const key of [
      "TELEBIRR_BASE_URL",
      "TELEBIRR_WEB_BASE_URL",
      "TELEBIRR_FABRIC_APP_ID",
      "TELEBIRR_APP_SECRET",
      "TELEBIRR_MERCHANT_APP_ID",
      "TELEBIRR_MERCHANT_CODE",
      "TELEBIRR_PRIVATE_KEY",
      "TELEBIRR_PUBLIC_KEY",
    ]) {
      requireValue(key, "Telebirr is configured, so the whole production credential set is required.");
    }
    for (const key of ["TELEBIRR_BASE_URL", "TELEBIRR_WEB_BASE_URL"]) {
      if (!has(key)) continue;
      if (get(key).includes(TELEBIRR_SANDBOX_HOST)) {
        fail(`${key} points at the Telebirr sandbox host.`);
      }
      const parsed = originOnly(get(key));
      if (!parsed || parsed.protocol !== "https:") {
        fail(`${key} must use https.`);
      }
    }
    for (const key of ["TELEBIRR_APP_SECRET", "TELEBIRR_PRIVATE_KEY", "TELEBIRR_PUBLIC_KEY"]) {
      if (isPlaceholder(get(key))) fail(`${key} is still a placeholder.`);
    }
  } else {
    warn(
      "Telebirr is not configured; top-ups and payouts will be unavailable until the production credentials are set.",
    );
  }
  if (has("CBE_WEBHOOK_SECRET") && get("CBE_WEBHOOK_ENABLED") !== "true") {
    fail("CBE_WEBHOOK_SECRET is set but CBE_WEBHOOK_ENABLED is not true.");
  }
  if (get("CBE_WEBHOOK_ENABLED") === "true" && !has("CBE_WEBHOOK_SECRET")) {
    fail("CBE_WEBHOOK_ENABLED is true but CBE_WEBHOOK_SECRET is unset.");
  }

  // --- Compliance ----------------------------------------------------------
  if (get("PEP_PROVIDER") !== "real") {
    fail('PEP_PROVIDER must be "real"; the API refuses to boot with the mock in production.');
  } else {
    warn(
      "PEP_PROVIDER=real is a declaration: no screening vendor is implemented, so every Tier 2 screen escalates to manual review.",
    );
  }
  if (get("TIN_FEATURE_ENABLED") === "true") {
    warn("TIN_FEATURE_ENABLED is true; confirm the withholding rates and accountant sign-off.");
  }
  if (!has("TERMS_VERSION") || get("TERMS_VERSION") === "1.0") {
    warn("TERMS_VERSION is unset or the default 1.0; confirm the version counsel approved.");
  }
  if (!has("PRIVACY_VERSION") || get("PRIVACY_VERSION") === "1.0") {
    warn("PRIVACY_VERSION is unset or the default 1.0; confirm the version counsel approved.");
  }

  // --- Monitoring ----------------------------------------------------------
  if (!has("SENTRY_DSN")) {
    warn("SENTRY_DSN is unset; error reporting is limited to the AletCloud runtime log.");
  }
  if (has("SENTRY_DSN")) {
    warn("SENTRY_DSN is declared but no Sentry client is installed; the value currently has no effect.");
  }

  return { errors, warnings };
}

async function probeLive(url) {
  const base = url.replace(/\/+$/, "");
  const results = [];
  const check = async (label, path, assertion) => {
    try {
      const response = await fetch(base + path, {
        headers: { "cache-control": "no-cache" },
      });
      const body = await response.text();
      const ok = assertion(response, body);
      results.push({ label, ok, detail: `status ${response.status}` });
      return { response, body };
    } catch (error) {
      results.push({ label, ok: false, detail: String(error?.message ?? error) });
      return null;
    }
  };

  await check("GET /health answers ok", "/health", (response, body) => {
    if (response.status !== 200) return false;
    try {
      return JSON.parse(body).status === "ok";
    } catch {
      return false;
    }
  });
  await check("GET / serves the SPA", "/", (response, body) => {
    return response.status === 200 && /\/assets\/index-[A-Za-z0-9_-]+\.(js|css)/.test(body);
  });
  await check("GET /api/v1/auth/oauth/providers answers", "/api/v1/auth/oauth/providers", (response, body) => {
    if (response.status !== 200) return false;
    try {
      const parsed = JSON.parse(body);
      return typeof parsed.google === "boolean" && typeof parsed.telegram === "boolean";
    } catch {
      return false;
    }
  });
  await check("GET /api/v1/auth/identities refuses anonymous access", "/api/v1/auth/identities", (response) => {
    return response.status === 401;
  });
  await check("The SPA response carries frame-ancestors", "/", (response) => {
    const csp = response.headers.get("content-security-policy") ?? "";
    return csp.includes("frame-ancestors") && !response.headers.has("x-frame-options");
  });

  return results;
}

function baselineEnv() {
  return {
    NODE_ENV: "production",
    PORT: "8080",
    SERVE_FRONTEND: "true",
    RUN_MIGRATIONS: "true",
    TRUST_PROXY_HOPS: "1",
    HSTS_INCLUDE_SUBDOMAINS: "true",
    RATE_LIMIT_DISABLED: "false",
    ALLOW_MOCK_PAYMENT_AUTO_APPROVAL: "false",
    FAYDA_SIMULATE_UNAVAILABLE: "false",
    WITHDRAW_STEPUP_ENFORCED: "true",
    FRONTEND_URL: "https://app.yekis-prod.et",
    API_PUBLIC_URL: "https://app.yekis-prod.et",
    STAFF_CONSOLE_URL: "https://app.yekis-prod.et",
    DATABASE_URL: "postgresql://yekis:secret@db.internal:5432/yekis_prod",
    JWT_ACCESS_SECRET: "a".repeat(40),
    JWT_REFRESH_SECRET: "b".repeat(40),
    GUEST_SUPPORT_JWT_SECRET: "c".repeat(40),
    TELEGRAM_BOT_TOKEN: "123456789:AAH" + "x".repeat(32),
    TELEGRAM_BOT_USERNAME: "ye_kis_bot",
    TELEGRAM_ENV: "prod",
    TELEGRAM_POLLING_ENABLED: "false",
    TELEGRAM_WEBHOOK_URL: "https://app.yekis-prod.et/api/v1/telegram/webhook",
    TELEGRAM_WEBHOOK_SECRET: "d".repeat(40),
    VITE_TELEGRAM_BOT_USERNAME: "ye_kis_bot",
    OBJECT_STORE_ENDPOINT: "https://s3.aletcloud.com",
    OBJECT_STORE_BUCKET: "yekis-prod-media",
    OBJECT_STORE_ACCESS_KEY: "e".repeat(32),
    OBJECT_STORE_SECRET_KEY: "f".repeat(40),
    EMAIL_TRANSPORT: "brevo",
    BREVO_API_KEY: "g".repeat(40),
    EMAIL_FROM: "Yekis <notifications@yekis-prod.et>",
    SMS_ETHIOPIA_API_KEY: "h".repeat(32),
    GOOGLE_CLIENT_ID: "1040630878719-ebr17ped0975fhb3se34gqq40gn8itlc.apps.googleusercontent.com",
    VITE_GOOGLE_CLIENT_ID: "1040630878719-ebr17ped0975fhb3se34gqq40gn8itlc.apps.googleusercontent.com",
    TELEBIRR_ENV: "production",
    TELEBIRR_BASE_URL: "https://telebirr.yekis-prod.et/api",
    TELEBIRR_WEB_BASE_URL: "https://telebirr.yekis-prod.et/pay",
    TELEBIRR_FABRIC_APP_ID: "i".repeat(24),
    TELEBIRR_APP_SECRET: "j".repeat(40),
    TELEBIRR_MERCHANT_APP_ID: "k".repeat(24),
    TELEBIRR_MERCHANT_CODE: "123456",
    TELEBIRR_PRIVATE_KEY: "-----BEGIN PRIVATE KEY-----" + "l".repeat(64),
    TELEBIRR_PUBLIC_KEY: "-----BEGIN PUBLIC KEY-----" + "m".repeat(64),
    PEP_PROVIDER: "real",
    TERMS_VERSION: "2026-11",
    PRIVACY_VERSION: "2026-11",
  };
}

function runSelfTest() {
  const cases = [];
  const assertNoErrors = (name, env) => {
    const { errors } = validateProductionEnv(env);
    cases.push({ name, ok: errors.length === 0, detail: errors.join("; ") });
  };
  const assertError = (name, mutate) => {
    const env = { ...baselineEnv(), ...mutate };
    const { errors } = validateProductionEnv(env);
    cases.push({ name, ok: errors.length > 0, detail: errors.join("; ") });
  };

  assertNoErrors("a complete production environment passes", baselineEnv());
  assertError("NODE_ENV=staging is rejected", { NODE_ENV: "staging" });
  assertError("TELEGRAM_ENV=staging is rejected", { TELEGRAM_ENV: "staging" });
  assertError("long polling is rejected", { TELEGRAM_POLLING_ENABLED: "true" });
  assertError("step-up cannot be disabled", { WITHDRAW_STEPUP_ENFORCED: "false" });
  assertError("the mock PEP provider is rejected", { PEP_PROVIDER: "mock" });
  assertError("the rate limiter cannot be disabled", { RATE_LIMIT_DISABLED: "true" });
  assertError("mock payment approval is rejected", { ALLOW_MOCK_PAYMENT_AUTO_APPROVAL: "true" });
  assertError("shared JWT and guest secrets are rejected", {
    GUEST_SUPPORT_JWT_SECRET: "a".repeat(40),
  });
  assertError("http public URLs are rejected", { API_PUBLIC_URL: "http://app.yekis-prod.et" });
  assertError("a localhost public URL is rejected", { FRONTEND_URL: "https://localhost:8080" });
  assertError("the staging database is rejected", {
    DATABASE_URL: "postgresql://yekis:secret@yekis-jobs-rw.db-1370:5432/yekis_jobs",
  });
  assertError("the sandbox Telebirr host is rejected", {
    TELEBIRR_BASE_URL: "https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway",
  });
  assertError("the staging bucket is rejected", { OBJECT_STORE_BUCKET: "yekis-test-media" });
  assertError("placeholder secrets are rejected", { JWT_ACCESS_SECRET: "<32+ random characters>" });
  assertError("a missing webhook secret is rejected", { TELEGRAM_WEBHOOK_SECRET: "" });
  assertError("a webhook on the wrong path is rejected", {
    TELEGRAM_WEBHOOK_URL: "https://app.yekis-prod.et/api/v1/webhook",
  });
  assertError("HSTS includeSubDomains on the shared host is rejected", {
    FRONTEND_URL: "https://yekis.app.aletcloud.com",
    API_PUBLIC_URL: "https://yekis.app.aletcloud.com",
    STAFF_CONSOLE_URL: "https://yekis.app.aletcloud.com",
    HSTS_INCLUDE_SUBDOMAINS: "true",
  });

  const failed = cases.filter((entry) => !entry.ok);
  for (const entry of cases) {
    console.log(`${entry.ok ? "PASS" : "FAIL"}  ${entry.name}`);
    if (!entry.ok && entry.detail) console.log(`      ${entry.detail}`);
  }
  console.log(
    `\nself-test ${failed.length === 0 ? "passed" : "FAILED"}: ${cases.length - failed.length}/${cases.length} cases`,
  );
  process.exit(failed.length === 0 ? 0 : 1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--self-test")) {
    runSelfTest();
    return;
  }

  const fileIndex = args.indexOf("--file");
  const urlIndex = args.indexOf("--url");
  const file = fileIndex >= 0 ? args[fileIndex + 1] : ".env.production";
  const url = urlIndex >= 0 ? args[urlIndex + 1] : null;

  let env;
  if (args.includes("--from-process")) {
    env = process.env;
  } else {
    try {
      env = parseEnvFile(readFileSync(resolve(file), "utf8"));
    } catch (error) {
      console.error(`Could not read ${file}: ${error?.message ?? error}`);
      console.error("Pass --file <path>, --from-process, or --self-test.");
      process.exit(2);
    }
  }

  const { errors, warnings } = validateProductionEnv(env);
  console.log("Yekis production environment check");
  console.log(`  source: ${args.includes("--from-process") ? "process environment" : file}`);
  console.log(`  errors: ${errors.length}   warnings: ${warnings.length}\n`);

  for (const warning of warnings) console.log(`WARN  ${warning}`);
  for (const error of errors) console.log(`FAIL  ${error}`);

  let probeFailed = 0;
  if (url) {
    console.log(`\nLive probe: ${url}`);
    const results = await probeLive(url);
    for (const result of results) {
      console.log(`${result.ok ? "PASS" : "FAIL"}  ${result.label} (${result.detail})`);
      if (!result.ok) probeFailed += 1;
    }
  }

  console.log("");
  if (errors.length === 0 && probeFailed === 0) {
    console.log("Production configuration looks ready.");
    process.exit(0);
  }
  console.log("Production configuration is NOT ready. Fix the FAIL lines above.");
  process.exit(1);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
if (invokedDirectly) {
  await main();
}
