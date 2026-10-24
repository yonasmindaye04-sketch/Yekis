import { describe, it, expect, afterAll } from "vitest";
import {
  AmountMinor,
  MAX_MONEY_MINOR,
  Money,
  SubmitTopUpInput,
  WithdrawInput,
} from "../src/schemas";

/**
 * Every amount is an integer number of minor units in a Postgres `Int`.
 *
 * The hosted-checkout route validated with
 * `typeof amountMinor !== "number" || amountMinor <= 0`, which accepts 100.5 â€”
 * a value that cannot be written to an Int column. It reached
 * initiateCheckoutTopUp, created a real provider order, and only then failed at
 * the database: the route returned 500 and left an order sitting at the
 * provider.
 *
 * Separately, nothing anywhere in the money chain declared a maximum. Every
 * amount column is a 32-bit integer, so a value above 2,147,483,647 was equally
 * accepted at validation and equally unpersistable.
 *
 * These are schema-level assertions because that is where the fix lives: a
 * per-route check can be forgotten by the next route that moves money.
 */

const INT32_MAX = 2_147_483_647;

describe("a single money amount cannot be outside what the column can hold", () => {
  it("rejects a fractional amount", () => {
    for (const bad of [100.5, 0.1, 1.0000001, 999_999.99, Number.EPSILON]) {
      expect(AmountMinor.safeParse(bad).success, `${bad} must be rejected`).toBe(false);
    }
  });

  it("rejects a value above the Int32 ceiling", () => {
    expect(AmountMinor.safeParse(INT32_MAX).success).toBe(true);
    expect(AmountMinor.safeParse(INT32_MAX + 1).success).toBe(false);
    expect(AmountMinor.safeParse(Number.MAX_SAFE_INTEGER).success).toBe(false);
  });

  it("rejects the values that survive a float conversion", () => {
    // These are what a browser produces for `Number(x) * 100`. The frontend
    // audit found three such call sites; the backend is where it has to stop.
    for (const [input, produced] of [
      [0.29, 28.999999999999996],
      [1.15, 114.99999999999999],
      [8.29, 828.9999999999999],
      [4.35, 434.99999999999994],
      [19.99, 1998.9999999999998],
    ] as const) {
      expect(
        AmountMinor.safeParse(produced).success,
        `${input} * 100 produced ${produced}, which must be rejected`,
      ).toBe(false);
    }
  });

  it("accepts ordinary amounts", () => {
    for (const good of [1, 100, 150_000, 1_000_000, INT32_MAX]) {
      expect(AmountMinor.safeParse(good).success, `${good} must be accepted`).toBe(true);
    }
  });

  it("declares the ceiling it enforces", () => {
    expect(MAX_MONEY_MINOR).toBe(INT32_MAX);
  });
});

describe("every schema on the money path uses it", () => {
  it("Money, SubmitTopUpInput and WithdrawInput all bound the amount", () => {
    // A new money field written as a bare z.number().int() reintroduces the
    // whole gap, so each schema is asserted individually rather than trusting
    // that they all point at the shared helper.
    expect(Money.safeParse({ amountMinor: INT32_MAX + 1, currency: "ETB" }).success).toBe(false);
    expect(Money.safeParse({ amountMinor: 100.5, currency: "ETB" }).success).toBe(false);

    expect(SubmitTopUpInput.safeParse({ provider: "TELEBIRR", amountMinor: INT32_MAX + 1, referenceNumber: "abc" }).success).toBe(false);
    expect(SubmitTopUpInput.safeParse({ provider: "TELEBIRR", amountMinor: 100.5, referenceNumber: "abc" }).success).toBe(false);

    expect(WithdrawInput.safeParse({ provider: "TELEBIRR", amountMinor: INT32_MAX + 1, payoutAccountIdentifier: "+251911000000" }).success).toBe(false);
    expect(WithdrawInput.safeParse({ provider: "TELEBIRR", amountMinor: 100.5, payoutAccountIdentifier: "+251911000000" }).success).toBe(false);
  });

  it("still rejects zero and negatives on the positive-only paths", () => {
    expect(SubmitTopUpInput.safeParse({ provider: "TELEBIRR", amountMinor: 0, referenceNumber: "abc" }).success).toBe(false);
    expect(WithdrawInput.safeParse({ provider: "TELEBIRR", amountMinor: -1, payoutAccountIdentifier: "+251911000000" }).success).toBe(false);
  });

  it("still accepts valid amounts on each path", () => {
    // The control. Without it, "everything is rejected" would satisfy every
    // assertion above.
    expect(Money.safeParse({ amountMinor: 150_000, currency: "ETB" }).success).toBe(true);
    expect(SubmitTopUpInput.safeParse({ provider: "TELEBIRR", amountMinor: 250_000, referenceNumber: "abc" }).success).toBe(true);
    expect(WithdrawInput.safeParse({ provider: "TELEBIRR", amountMinor: 100_000, payoutAccountIdentifier: "+251911000000" }).success).toBe(true);
  });
});