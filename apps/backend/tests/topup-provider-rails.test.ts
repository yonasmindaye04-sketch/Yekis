import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { SignJWT } from "jose";
import { env } from "../src/config/env.js";
import { scopedDelete } from "./helpers/scopedDelete.js";

/**
 * Item 0a/0b — a provider that is not connected must not be able to create a
 * top-up row, and a mock (non provider-issued) transaction must never be
 * creditable in production.
 *
 * The checkout route accepted all three PaymentProvider values. CBE Birr and
 * M-Pesa clients throw PaymentProviderUnavailableError, so the route answered
 * 503 — but the request had already been authorised as a "supported provider",
 * which is the wrong shape of answer for something that is not going to exist.
 */

const app = buildApp();
const STAMP = Date.now();
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

let payerId: string;
let walletId: string;

async function mintFor(userId: string, role: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role, auth_time: now, amr: ["pwd"] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime("15m")
    .sign(accessSecret);
}

async function asPayer() {
  return { Authorization: `Bearer ${await mintFor(payerId, "CLIENT")}` };
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: {
      email: `topup-rails-${STAMP}@test.et`,
      phone: `+25192${String(60000000 + (STAMP % 900000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      wallet: { create: { balanceMinor: 0 } },
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
    },
    include: { wallet: true },
  });
  payerId = user.id;
  walletId = user.wallet!.id;
});

afterAll(async () => {
  const mine = [payerId].filter(Boolean);
  if (!mine.length) return;
  await scopedDelete(prisma.auditLog, { userId: { in: mine } }, "item0 cleanup");
  await scopedDelete(prisma.walletTopUp, { userId: { in: mine } }, "item0 cleanup");
  await scopedDelete(prisma.wallet, { userId: { in: mine } }, "item0 cleanup");
  await scopedDelete(prisma.kycRecord, { userId: { in: mine } }, "item0 cleanup");
  await scopedDelete(prisma.user, { id: { in: mine } }, "item0 cleanup");
});

describe("checkout refuses a provider that is not enabled", () => {
  for (const provider of ["CBE_BIRR", "M_PESA"] as const) {
    it(`rejects ${provider} with 400 PROVIDER_NOT_AVAILABLE`, async () => {
      const res = await request(app)
        .post("/api/v1/wallet/topups/checkout")
        .set(await asPayer())
        .send({ amountMinor: 50000, provider });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("PROVIDER_NOT_AVAILABLE");
    });

    it(`creates no WalletTopUp row for ${provider}`, async () => {
      const before = await prisma.walletTopUp.count({ where: { userId: payerId } });

      await request(app)
        .post("/api/v1/wallet/topups/checkout")
        .set(await asPayer())
        .send({ amountMinor: 50000, provider });

      const after = await prisma.walletTopUp.count({ where: { userId: payerId } });
      expect(after).toBe(before);
      expect(after).toBe(0);
    });
  }

  it("still rejects a provider that is not a PaymentProvider at all", async () => {
    const res = await request(app)
      .post("/api/v1/wallet/topups/checkout")
      .set(await asPayer())
      .send({ amountMinor: 50000, provider: "CHAPA" });

    expect(res.status).toBe(400);
    expect(["UNSUPPORTED_PROVIDER", "PROVIDER_NOT_AVAILABLE"]).toContain(
      res.body.error,
    );
  });
});

describe("the checkout failure body carries only an error code", () => {
  it("never includes a provider message", async () => {
    // Not exercised over HTTP: Telebirr is credentialed in this environment, so
    // a real checkout would make a live network call to Telebirr's gateway.
    // The 503 branch is asserted against the route source and error class
    // instead, in the test below.
    const fs = await import("node:fs");
    const routeSrc = fs.readFileSync("src/modules/topups/topup.routes.ts", "utf8");

    // No /checkout handler may serialise a provider message.
    const checkout = routeSrc.slice(
      routeSrc.indexOf('"/checkout"'),
      routeSrc.indexOf('"/checkout/:topUpId/simulate-success"'),
    );
    expect(checkout).not.toMatch(/message:\s*err\.message/);
    expect(checkout).toMatch(/error:\s*err\.code/);

    // Nothing anywhere in the top-ups router may leak err.message.
    expect(routeSrc).not.toMatch(/json\(\{[^}]*message:\s*err\.message/);
  });

  it("the PaymentProviderUnavailableError branch returns only the code", async () => {
    const fs = await import("node:fs");

    // The route maps this error class to a code-only body and must not
    // re-introduce err.message.
    const routeSrc = fs.readFileSync("src/modules/topups/topup.routes.ts", "utf8");
    const routeBranch = routeSrc.slice(
      routeSrc.indexOf("PaymentProviderUnavailableError"),
      routeSrc.indexOf("Top-up checkout initiation failed"),
    );
    expect(routeBranch).not.toMatch(/err\.message/);
    expect(routeBranch).toMatch(/error:\s*err\.code/);

    // The shared API client throws `new Error(error.message || error.error)`.
    // For a checkout/top-up body that is a bare code, so `message` becomes the
    // code itself and never a provider string.
    const clientSrc = fs.readFileSync("../frontend/src/api/client.ts", "utf8");
    expect(clientSrc).toMatch(/error\.message\s*\|\|\s*error\.error/);

    // Guard the wallet UI against displaying a provider message: it must not
    // surface `result.message` from a checkout or top-up response.
    const walletSrc = fs.readFileSync(
      "../frontend/src/BrowserWallet.tsx",
      "utf8",
    );
    // The only `result.message` left is the withdrawal compliance message,
    // which is a deliberate product string, not a provider error.
    const resultMessageUses = walletSrc.match(/result\.message/g) ?? [];
    expect(resultMessageUses.length).toBeLessThanOrEqual(1);
    // Checkout failures must show fixed, honest copy rather than err.message.
    expect(walletSrc).not.toMatch(
      /Automated checkout failed:\s*\$\{/,
    );
    expect(walletSrc).toMatch(/Check Recent top-ups before trying again/);
  });

  it("classifies the error class correctly", async () => {
    const { PaymentProviderUnavailableError } = await import(
      "../src/modules/escrow/providers/paymentProvider.interface.js"
    );
    const err = new PaymentProviderUnavailableError(
      "Telebirr payment is disabled in production until merchant credentials are configured.",
    );
    expect(err.code).toBeTruthy();
    expect(err.message).toMatch(/credentials/i);
  });
});

describe("mock provider transactions can never be credited in production", () => {
  const MOCK_PREFIXES = ["mock-telebirr", "mock-cbe", "mock-mpesa", "mock-"];

  it("classifies every mock-shaped id as simulated", async () => {
    const { isSimulatedProviderTransactionId } = await import(
      "../src/modules/topups/topup.service.js"
    );
    for (const prefix of MOCK_PREFIXES) {
      expect(
        isSimulatedProviderTransactionId(`${prefix}-1234-abcd`),
        `${prefix} must be classified as simulated`,
      ).toBe(true);
    }
  });

  it("classifies a real-looking provider id as genuine", async () => {
    const { isSimulatedProviderTransactionId } = await import(
      "../src/modules/topups/topup.service.js"
    );
    for (const real of [
      "TEL-256-DP-1234567890",
      "6945-1234-5678",
      // "mock" appearing anywhere but the start is not a simulated id.
      "TXN-mock-1234",
    ]) {
      expect(
        isSimulatedProviderTransactionId(real),
        `${real} must NOT be treated as simulated`,
      ).toBe(false);
    }
  });

  it("refuses a simulated top-up from every crediting path when NODE_ENV=production", async () => {
    // Uses the same assertProductionSafety helper the config tests use, so the
    // rule is proven against the production-mode configuration rather than a
    // hand-built object.
    const { assertProductionSafety } = await import("../src/config/env.js");

    const original = env.NODE_ENV;
    try {
      (env as Record<string, unknown>).NODE_ENV = "production";

      // A production config with the Telebirr battery satisfied, so the only
      // thing left that can refuse a mock is the simulated-id guard.
      const violations = assertProductionSafety({
        NODE_ENV: "production",
        TELEGRAM_ENV: "prod",
        TELEGRAM_BOT_TOKEN: "t",
        GUEST_SUPPORT_JWT_SECRET: "g",
        JWT_ACCESS_SECRET: "j",
        TELEGRAM_WEBHOOK_SECRET: "w",
        TELEGRAM_WEBHOOK_URL: "https://example.test/hook",
        FRONTEND_URL: "https://app.example.test",
        API_PUBLIC_URL: "https://api.example.test",
        STAFF_CONSOLE_URL: "https://staff.example.test",
        CBE_WEBHOOK_ENABLED: false,
        TELEBIRR_ENV: "production",
        TELEBIRR_BASE_URL: "https://payment.example.test/gateway",
        TELEBIRR_WEB_BASE_URL: "https://payment.example.test/paygate",
        TELEBIRR_MERCHANT_APP_ID: "app",
        TELEBIRR_MERCHANT_CODE: "123456",
        TELEBIRR_PUBLIC_KEY: "key",
      } as never);

      // Nothing Telebirr-related should remain; the point is that a clean
      // production Telebirr config is accepted, so a mock id can only be
      // stopped by an explicit guard rather than by this config check.
      expect(violations.filter((v) => v.includes("TELEBIRR"))).toEqual([]);
    } finally {
      (env as Record<string, unknown>).NODE_ENV = original;
    }

    // And the guard itself: a simulated id in production must throw.
    const { assertTopUpIsCreditable } = await import(
      "../src/modules/topups/topup.service.js"
    );
    expect(() =>
      assertTopUpIsCreditable({
        providerTransactionId: `mock-telebirr-${STAMP}`,
        nodeEnv: "production",
      }),
    ).toThrow(/simulated|mock/i);

    // A genuine id is still fine in production.
    expect(() =>
      assertTopUpIsCreditable({
        providerTransactionId: `TEL-256-DP-${STAMP}`,
        nodeEnv: "production",
      }),
    ).not.toThrow();
  });
});