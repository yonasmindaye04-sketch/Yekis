import { describe, it, expect } from "vitest";
import { assertProductionSafety } from "../src/config/env.js";

/**
 * T0.2 — the app must refuse to BOOT on an unsafe production configuration.
 *
 * `assertProductionSafety` is a pure function returning violations precisely so
 * this can be asserted directly; asserting on `process.exit` would kill the test
 * runner. `config/env.ts` calls it at import time and exits when it returns
 * anything, which is what `config-fail-closed.test.ts` covers at the boot level.
 */

/** A configuration that passes every rule; each test breaks exactly one thing. */
function validProd(overrides: Record<string, unknown> = {}) {
  return {
    NODE_ENV: "production",
    TELEGRAM_ENV: "prod" as const,
    TELEGRAM_BOT_TOKEN: "123456:AAEtestestestestestestestestestest",
    TELEGRAM_WEBHOOK_SECRET: "a-sufficiently-long-webhook-secret",
    TELEGRAM_WEBHOOK_URL: "https://api.yekis.com/api/v1/telegram/webhook",
    // Two distinct hosts on purpose: the web app and this API are different
    // services, and conflating them is how provider callbacks end up pointing
    // at something that cannot route them.
    FRONTEND_URL: "https://app.yekis.com",
    API_PUBLIC_URL: "https://api.yekis.com",
    STAFF_CONSOLE_URL: "https://console.yekis.com",
    TELEGRAM_POLLING_ENABLED: false,
    CBE_WEBHOOK_ENABLED: false,
    // F-01: guest-support tokens are signed on their own key. Must be present
    // and must differ from JWT_ACCESS_SECRET in production.
    GUEST_SUPPORT_JWT_SECRET: "a-distinct-guest-support-signing-secret",
    JWT_ACCESS_SECRET: "the-ordinary-access-token-signing-secret",
    ...overrides,
  };
}

describe("T0.2 fail-closed production configuration", () => {
  it("accepts a complete production configuration", () => {
    expect(assertProductionSafety(validProd())).toEqual([]);
  });

  it("refuses to start without TELEGRAM_WEBHOOK_SECRET", () => {
    const v = assertProductionSafety(
      validProd({ TELEGRAM_WEBHOOK_SECRET: undefined }),
    );
    expect(v.join(" ")).toMatch(/TELEGRAM_WEBHOOK_SECRET is required/);
  });

  it("refuses to start without TELEGRAM_BOT_TOKEN", () => {
    const v = assertProductionSafety(validProd({ TELEGRAM_BOT_TOKEN: undefined }));
    expect(v.join(" ")).toMatch(/TELEGRAM_BOT_TOKEN is required/);
  });

  it("refuses to start without TELEGRAM_WEBHOOK_URL", () => {
    const v = assertProductionSafety(validProd({ TELEGRAM_WEBHOOK_URL: undefined }));
    expect(v.join(" ")).toMatch(/TELEGRAM_WEBHOOK_URL is required/);
  });

  it("refuses a non-https FRONTEND_URL in production", () => {
    for (const url of [
      "http://localhost:5173",
      "http://yekis.com",
      "yekis.com",
    ]) {
      const v = assertProductionSafety(validProd({ FRONTEND_URL: url }));
      expect(v.join(" "), `expected ${url} to be rejected`).toMatch(
        /FRONTEND_URL must be a public https origin/,
      );
    }
  });

  it("accepts an https FRONTEND_URL in production", () => {
    expect(
      assertProductionSafety(validProd({ FRONTEND_URL: "https://app.yekis.com" })),
    ).toEqual([]);
  });

  it("refuses long polling anywhere except TELEGRAM_ENV=dev", () => {
    for (const telegramEnv of ["staging", "prod"] as const) {
      const v = assertProductionSafety(
        validProd({ TELEGRAM_ENV: telegramEnv, TELEGRAM_POLLING_ENABLED: true }),
      );
      expect(v.join(" ")).toMatch(
        /Long polling is only permitted when TELEGRAM_ENV=dev/,
      );
    }
  });

  it("allows long polling when TELEGRAM_ENV=dev", () => {
    expect(
      assertProductionSafety({
        NODE_ENV: "development",
        TELEGRAM_ENV: "dev",
        TELEGRAM_POLLING_ENABLED: true,
        FRONTEND_URL: "http://localhost:5173",
      }),
    ).toEqual([]);
  });

  it("refuses a non-prod Telegram environment running as production", () => {
    for (const telegramEnv of ["dev", "staging"] as const) {
      const v = assertProductionSafety(validProd({ TELEGRAM_ENV: telegramEnv }));
      expect(v.join(" ")).toMatch(/Refusing to run a non-production Telegram environment/);
    }
  });

  it("defaults TELEGRAM_ENV to prod under NODE_ENV=production", () => {
    // Without the explicit variable, production must still be treated as prod —
    // otherwise the previous rule would be trivially bypassed by omission.
    expect(assertProductionSafety({ ...validProd(), TELEGRAM_ENV: undefined })).toEqual([]);
  });

  it("does not apply production rules in development", () => {
    expect(
      assertProductionSafety({
        NODE_ENV: "development",
        FRONTEND_URL: "http://localhost:5173",
      }),
    ).toEqual([]);
  });

  it("F-01: refuses to start without GUEST_SUPPORT_JWT_SECRET", () => {
    const v = assertProductionSafety(
      validProd({ GUEST_SUPPORT_JWT_SECRET: undefined }),
    );
    expect(v.join(" ")).toMatch(/GUEST_SUPPORT_JWT_SECRET is required/);
  });

  it("F-01: refuses a guest key identical to the access key", () => {
    // Sharing the key is the takeover: a guest token would verify as a session.
    const shared = "the-ordinary-access-token-signing-secret";
    const v = assertProductionSafety(
      validProd({ GUEST_SUPPORT_JWT_SECRET: shared, JWT_ACCESS_SECRET: shared }),
    );
    expect(v.join(" ")).toMatch(/must differ from JWT_ACCESS_SECRET/);
  });

  it("reports every violation at once rather than only the first", () => {
    const v = assertProductionSafety({
      NODE_ENV: "production",
      TELEGRAM_ENV: "prod",
      FRONTEND_URL: "http://yekis.com",
    });
    // bot token, webhook secret, webhook url, the https rule, API_PUBLIC_URL
    // and STAFF_CONSOLE_URL all fire together.
    expect(v.length).toBeGreaterThanOrEqual(6);
  });
});
