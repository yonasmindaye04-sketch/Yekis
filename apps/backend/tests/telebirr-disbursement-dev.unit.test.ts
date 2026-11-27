import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env.js";
import { telebirrClient } from "../src/modules/escrow/providers/telebirr.client.js";

describe("OPS-15: Telebirr dev disbursement stub", () => {
  const originalEnv = {
    NODE_ENV: env.NODE_ENV,
    TELEBIRR_FABRIC_APP_ID: env.TELEBIRR_FABRIC_APP_ID,
    TELEBIRR_APP_SECRET: env.TELEBIRR_APP_SECRET,
    TELEBIRR_MERCHANT_APP_ID: env.TELEBIRR_MERCHANT_APP_ID,
    TELEBIRR_MERCHANT_CODE: env.TELEBIRR_MERCHANT_CODE,
    TELEBIRR_PRIVATE_KEY: env.TELEBIRR_PRIVATE_KEY,
  };

  afterEach(() => {
    Object.assign(env, originalEnv);
  });

  it("uses the succeeding stub in NODE_ENV=development even when C2B merchant credentials are set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    env.NODE_ENV = "development";
    env.TELEBIRR_FABRIC_APP_ID = "dev-app";
    env.TELEBIRR_APP_SECRET = "dev-secret";
    env.TELEBIRR_MERCHANT_APP_ID = "dev-merch-app";
    env.TELEBIRR_MERCHANT_CODE = "dev-merch-code";
    env.TELEBIRR_PRIVATE_KEY = "dev-private-key";

    try {
      const result = await telebirrClient.initiateDisbursement!({
        amountMinor: 100_000,
        currency: "ETB",
        recipientPhone: "+251911000999",
        referenceId: "payout-dev-1",
      });

      expect(result.status).toBe("CONFIRMED");
      expect(result.providerPayoutId).toMatch(/^mock-disburse-/);
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});
