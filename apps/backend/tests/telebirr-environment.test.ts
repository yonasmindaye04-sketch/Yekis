import { describe, it, expect } from "vitest";
import { assertProductionSafety } from "../src/config/env.js";
import {
  deriveTelebirrNotifyUrl,
  deriveTelebirrRedirectUrl,
  SANDBOX_TELEBIRR_BASE_URL,
  SANDBOX_TELEBIRR_WEB_BASE_URL,
} from "../src/modules/escrow/providers/telebirr.client.js";

/**
 * Telebirr environment safety (Batch 0.6, item 10).
 *
 * Every TELEBIRR_* value was optional and both gateway URLs defaulted to
 * developerportal.ethiotelebirr.et, which is Telebirr's test host. A
 * production boot with no Telebirr configuration at all therefore looked
 * identical to one pointing at the sandbox, and nothing refused to start.
 */

/** A complete, valid production-shaped config we then break one field at a time. */
function prodConfig(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: "production",
    TELEGRAM_BOT_TOKEN: "t",
    GUEST_SUPPORT_JWT_SECRET: "g",
    JWT_ACCESS_SECRET: "j",
    TELEGRAM_WEBHOOK_SECRET: "w",
    TELEGRAM_WEBHOOK_URL: "https://example.test/hook",
    TELEGRAM_ENV: "prod",
    FRONTEND_URL: "https://app.example.test",
    API_PUBLIC_URL: "https://api.example.test",
    STAFF_CONSOLE_URL: "https://staff.example.test",
    CBE_WEBHOOK_ENABLED: false,

    // Telebirr is configured for production.
    TELEBIRR_ENV: "production",
    TELEBIRR_BASE_URL: "https://payment.example.test/apiaccess/payment/gateway",
    TELEBIRR_WEB_BASE_URL: "https://payment.example.test/payment/web/paygate?",
    TELEBIRR_MERCHANT_APP_ID: "app-id",
    TELEBIRR_MERCHANT_CODE: "123456",
    TELEBIRR_PUBLIC_KEY: "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----",
    ...overrides,
  } as never;
}

/** True when any violation mentions the given fragment. */
function violates(cfg: unknown, fragment: string): boolean {
  return assertProductionSafety(cfg).some((v) => v.includes(fragment));
}

describe("production Telebirr configuration is checked at boot", () => {
  it("accepts a fully specified production Telebirr config", () => {
    const violations = assertProductionSafety(prodConfig());
    expect(violations.filter((v) => v.includes("TELEBIRR"))).toEqual([]);
  });

  it("refuses when TELEBIRR_ENV is missing while Telebirr is configured", () => {
    expect(violates(prodConfig({ TELEBIRR_ENV: undefined }), "TELEBIRR_ENV")).toBe(true);
  });

  it("refuses TELEBIRR_ENV=sandbox in production", () => {
    expect(
      violates(
        prodConfig({
          TELEBIRR_ENV: "sandbox",
          TELEBIRR_BASE_URL: SANDBOX_TELEBIRR_BASE_URL,
          TELEBIRR_WEB_BASE_URL: SANDBOX_TELEBIRR_WEB_BASE_URL,
        }),
        "sandbox",
      ),
    ).toBe(true);
  });

  it("refuses when the gateway URL still points at the developer portal host", () => {
    // The default was the test host, so an unset override silently meant
    // "production traffic to the sandbox".
    expect(
      violates(prodConfig({ TELEBIRR_BASE_URL: SANDBOX_TELEBIRR_BASE_URL }), "developerportal"),
    ).toBe(true);
  });

  it("refuses when the web checkout URL still points at the developer portal host", () => {
    expect(
      violates(
        prodConfig({ TELEBIRR_WEB_BASE_URL: SANDBOX_TELEBIRR_WEB_BASE_URL }),
        "developerportal",
      ),
    ).toBe(true);
  });

  it("refuses when TELEBIRR_BASE_URL is absent entirely", () => {
    expect(violates(prodConfig({ TELEBIRR_BASE_URL: undefined }), "TELEBIRR_BASE_URL")).toBe(true);
  });

  it("refuses when TELEBIRR_PUBLIC_KEY is missing", () => {
    // Without it the webhook handler cannot verify Telebirr's signature, so
    // settlements are unverifiable.
    expect(violates(prodConfig({ TELEBIRR_PUBLIC_KEY: undefined }), "TELEBIRR_PUBLIC_KEY")).toBe(true);
  });

  it("refuses when the merchant values are missing", () => {
    expect(
      violates(prodConfig({ TELEBIRR_MERCHANT_APP_ID: undefined }), "TELEBIRR_MERCHANT_APP_ID"),
    ).toBe(true);
    expect(
      violates(prodConfig({ TELEBIRR_MERCHANT_CODE: undefined }), "TELEBIRR_MERCHANT_CODE"),
    ).toBe(true);
  });

  it("refuses a non-https API_PUBLIC_URL", () => {
    // Provider callbacks must be verifiable in transit.
    expect(violates(prodConfig({ API_PUBLIC_URL: "http://api.example.test" }), "API_PUBLIC_URL")).toBe(
      true,
    );
  });

  it("does not demand Telebirr configuration when none of it is set", () => {
    const violations = assertProductionSafety(
      prodConfig({
        TELEBIRR_ENV: undefined,
        TELEBIRR_BASE_URL: undefined,
        TELEBIRR_WEB_BASE_URL: undefined,
        TELEBIRR_MERCHANT_APP_ID: undefined,
        TELEBIRR_MERCHANT_CODE: undefined,
        TELEBIRR_PUBLIC_KEY: undefined,
        TELEBIRR_APP_SECRET: undefined,
        TELEBIRR_FABRIC_APP_ID: undefined,
        TELEBIRR_PRIVATE_KEY: undefined,
      }),
    );
    expect(violations.filter((v) => v.includes("TELEBIRR"))).toEqual([]);
  });

  it("treats a lone credential as Telebirr being configured", async () => {
    // Setting only the fabric app id means Telebirr is in use, so the whole
    // production battery of checks applies even though nothing else is set.
    const violations = assertProductionSafety(
      prodConfig({
        TELEBIRR_ENV: undefined,
        TELEBIRR_APP_SECRET: "s",
        // No explicit URL either, so the resolver would otherwise supply the
        // sandbox default — which must be caught rather than used.
        TELEBIRR_BASE_URL: undefined,
      }),
    );
    expect(violations.some((v) => v.includes("TELEBIRR_ENV"))).toBe(true);
    expect(violations.some((v) => v.includes("TELEBIRR_BASE_URL"))).toBe(true);
  });
});

describe("sandbox Telebirr starts in development", () => {
  const devConfig = {
    NODE_ENV: "development",
    TELEGRAM_ENV: "dev",
    TELEBIRR_ENV: "sandbox",
    TELEBIRR_BASE_URL: SANDBOX_TELEBIRR_BASE_URL,
    TELEBIRR_WEB_BASE_URL: SANDBOX_TELEBIRR_WEB_BASE_URL,
    TELEBIRR_MERCHANT_APP_ID: "app-id",
    TELEBIRR_MERCHANT_CODE: "123456",
    TELEBIRR_PUBLIC_KEY: "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----",
  } as never;

  it("raises no violations", () => {
    expect(assertProductionSafety(devConfig).filter((v) => v.includes("TELEBIRR"))).toEqual([]);
  });

  it("also starts with no TELEBIRR_ENV at all, using the sandbox defaults", () => {
    expect(
      assertProductionSafety({ ...(devConfig as object), TELEBIRR_ENV: undefined }).filter((v) =>
        v.includes("TELEBIRR"),
      ),
    ).toEqual([]);
  });
});

describe("callback and redirect URLs are built from the right origins", () => {
  const cfg = {
    API_PUBLIC_URL: "https://api.example.test",
    FRONTEND_URL: "https://app.example.test",
    TELEBIRR_NOTIFY_URL: undefined,
    TELEBIRR_REDIRECT_URL: undefined,
  };

  it("builds the notify URL from API_PUBLIC_URL, not FRONTEND_URL", () => {
    expect(deriveTelebirrNotifyUrl(cfg)).toBe(
      "https://api.example.test/api/v1/webhooks/telebirr",
    );
  });

  it("builds the redirect URL from FRONTEND_URL", () => {
    expect(deriveTelebirrRedirectUrl(cfg)).toBe("https://app.example.test/wallet");
  });

  it("lets an explicit override win in both cases", () => {
    expect(
      deriveTelebirrNotifyUrl({ ...cfg, TELEBIRR_NOTIFY_URL: "https://cb.example.test/tb" }),
    ).toBe("https://cb.example.test/tb");
    expect(
      deriveTelebirrRedirectUrl({ ...cfg, TELEBIRR_REDIRECT_URL: "https://cb.example.test/done" }),
    ).toBe("https://cb.example.test/done");
  });

  it("returns undefined rather than inventing an origin when none is set", () => {
    const bare = { TELEBIRR_NOTIFY_URL: undefined, TELEBIRR_REDIRECT_URL: undefined };
    expect(deriveTelebirrNotifyUrl({ ...bare, API_PUBLIC_URL: undefined, FRONTEND_URL: undefined })).toBeUndefined();
    expect(deriveTelebirrRedirectUrl({ ...bare, API_PUBLIC_URL: undefined, FRONTEND_URL: undefined })).toBeUndefined();
  });

  it("tolerates a trailing slash on API_PUBLIC_URL without doubling it", () => {
    expect(
      deriveTelebirrNotifyUrl({ ...cfg, API_PUBLIC_URL: "https://api.example.test/" }),
    ).toBe("https://api.example.test/api/v1/webhooks/telebirr");
  });
});