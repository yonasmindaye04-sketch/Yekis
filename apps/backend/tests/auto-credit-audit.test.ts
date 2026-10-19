import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  assertTopUpIsCreditable,
  isSimulatedProviderTransactionId,
  SimulatedProviderTransactionError,
} from "../src/modules/topups/topup.service.js";

/**
 * Auto-credit audit: can money reach a wallet without evidence of payment?
 *
 * Every path that increments Wallet.balanceMinor was enumerated and checked.
 * The result was clean, which is worth recording rather than assuming, and
 * worth locking so it cannot quietly regress.
 *
 * What was checked, and what holds:
 *
 *  1. Telebirr top-up webhook (src/modules/escrow/webhooks.routes.ts)
 *     Signature is verified FIRST and 401s on failure. It then binds the signed
 *     event to our own record: the merch_order_id must resolve to a stored
 *     PaymentTransaction or WalletTopUp, its provider must be TELEBIRR, the
 *     currency must be ETB, and the callback amount must equal the amount we
 *     requested to the minor unit. Only then does it call handleTopUpWebhook,
 *     which itself calls assertTopUpIsCreditable.
 *
 *  2. CBE webhook -- verifyWebhookSignature is a placeholder that returns false,
 *     so the route always 401s. Fails closed, which is correct for a rail with
 *     no live integration. CBE checkout is separately refused by
 *     isCheckoutProviderEnabled, so no WalletTopUp is ever created for it.
 *
 *  3. The simulate-success route is 404 in production, and the wallet credit
 *     behind it goes through assertTopUpIsCreditable as well. Two independent
 *     gates, either of which is sufficient.
 *
 *  4. The mock auto-approval inside initiateCheckoutTopUp is gated on
 *     NODE_ENV !== production AND ALLOW_MOCK_PAYMENT_AUTO_APPROVAL, and only
 *     ever mints a mock-* id, which the production assert refuses.
 *
 *  5. The reconciliation worker (queue/paymentReconcile.worker.ts) touches
 *     PaymentTransaction only. It never reads or writes WalletTopUp and never
 *     increments a wallet, so a CHECKOUT_PENDING top-up can never be auto-credited
 *     by a sweep. handlePaymentWebhook additionally requires a provider-reported
 *     SUCCESS and takes an atomic PENDING->settled claim, so a webhook and a
 *     sweep racing cannot both settle.
 *
 *  6. The staff manual approval route is COMPLIANCE_OFFICER/ADMIN only. A null
 *     providerTransactionId is correct there, not a hole: those are receipt-based
 *     top-ups where a human is the evidence.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = (rel: string) =>
  readFileSync(join(HERE, "..", "src", ...rel.split("/")), "utf8");

const WEBHOOKS = SRC("modules/escrow/webhooks.routes.ts");
const TOPUP_SERVICE = SRC("modules/topups/topup.service.ts");
const TOPUP_ROUTES = SRC("modules/topups/topup.routes.ts");
const RECONCILE = SRC("queue/paymentReconcile.worker.ts");

describe("the mock-transaction gate", () => {
  it("refuses a mock-* id in production", () => {
    for (const id of ["mock-telebirr-abc", "MOCK_X", "mock_1", "  mock-9  "]) {
      expect(isSimulatedProviderTransactionId(id)).toBe(true);
      expect(() =>
        assertTopUpIsCreditable({ providerTransactionId: id, nodeEnv: "production" }),
      ).toThrow(SimulatedProviderTransactionError);
    }
  });

  it("allows the same id outside production, which is what the sandbox is for", () => {
    expect(() =>
      assertTopUpIsCreditable({ providerTransactionId: "mock-telebirr-abc", nodeEnv: "test" }),
    ).not.toThrow();
  });

  it("does not mistake a real-looking id for a simulated one", () => {
    for (const id of ["TXN-2026-0918-ABC123", "telebirr-order-9912", "MPESA7788123"]) {
      expect(isSimulatedProviderTransactionId(id)).toBe(false);
    }
  });

  it("treats a null id as not-simulated, because manual receipt top-ups legitimately have none", () => {
    // Documented rather than assumed: this is the case the staff approval path
    // depends on. The human reviewer is the evidence there, not a transaction
    // id, and that route is staff-only.
    expect(isSimulatedProviderTransactionId(null)).toBe(false);
    expect(isSimulatedProviderTransactionId(undefined)).toBe(false);
    expect(isSimulatedProviderTransactionId("")).toBe(false);
  });
});

describe("LOCK (source text) — the Telebirr webhook cannot credit before verifying", () => {
  it("verifies the signature before any crediting call", () => {
    const verify = WEBHOOKS.indexOf("verifyWebhookSignature");
    const credit = WEBHOOKS.indexOf("handleTopUpWebhook({", verify);
    expect(verify).toBeGreaterThan(-1);
    expect(credit).toBeGreaterThan(verify);
    // And the failure path returns 401 rather than falling through.
    const reject = WEBHOOKS.indexOf("INVALID_SIGNATURE");
    expect(reject).toBeGreaterThan(verify);
    expect(reject).toBeLessThan(credit);
  });

  it("binds the signed event to our own amount and currency", () => {
    // A valid signature over a tampered amount would otherwise credit the wrong
    // sum to a real order.
    expect(WEBHOOKS).toMatch(/currency !== "ETB"/);
    expect(WEBHOOKS).toMatch(/callbackMinor !== expected\.amountMinor/);
    expect(WEBHOOKS).toMatch(/PAYMENT_DETAILS_MISMATCH/);
  });

  it("rejects a success callback for an order it has never issued", () => {
    expect(WEBHOOKS).toMatch(/if \(\s*!expected \|\|/);
  });
});

describe("LOCK (source text) — no auto-credit path is unguarded", () => {
  it("the reconciliation sweep cannot credit a wallet", () => {
    // This is the specific thing the earlier report left unverified.
    expect(RECONCILE).not.toMatch(/WalletTopUp|walletTopUp/);
    expect(RECONCILE).not.toMatch(/balanceMinor/);
    expect(RECONCILE).not.toMatch(/handleTopUpWebhook|approveTopUp/);
  });

  it("the simulation route is closed in production and behind the gate regardless", () => {
    const s = TOPUP_ROUTES.indexOf("/checkout/:topUpId/simulate-success");
    expect(s).toBeGreaterThan(-1);
    const segment = TOPUP_ROUTES.slice(s, s + 2400);
    expect(segment).toMatch(/NODE_ENV === "production"/);
    expect(segment).toMatch(/404/);
    // And it funnels through the same gate rather than a private credit path.
    expect(segment).toMatch(/handleTopUpWebhook/);
  });

  it("both wallet crediting functions call the gate", () => {
    const calls = TOPUP_SERVICE.match(/assertTopUpIsCreditable\(\{/g) ?? [];
    // approveTopUp and handleTopUpWebhook, one each.
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });

  it("mock auto-approval needs both the env flag and a non-production run", () => {
    expect(TOPUP_SERVICE).toMatch(/ALLOW_MOCK_PAYMENT_AUTO_APPROVAL/);
    expect(TOPUP_SERVICE).toMatch(/NODE_ENV !== "production"/);
  });

  it("the staff approval route is staff-only", () => {
    const s = TOPUP_ROUTES.indexOf("/:topUpId/approve");
    const segment = TOPUP_ROUTES.slice(s, s + 320);
    expect(segment).toMatch(/requireStaffRole\(/);
  });
});