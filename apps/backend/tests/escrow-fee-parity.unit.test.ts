import { afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../src/config/env.js";
import { calculateFees, getEscrowFeeConfig } from "../src/modules/escrow/fees.js";

describe("escrow fee config & server-side fee parity", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("computes 0 client fee, 7% freelancer platform fee, and 0.5% provider fee by default", () => {
    const config = getEscrowFeeConfig();
    const fees = calculateFees({ milestoneAmountMinor: 100_000 });

    expect(config.clientPlatformFeeRate).toBe(0);
    expect(fees.platformFeeFromClientMinor).toBe(0);
    expect(fees.clientTotalChargeMinor).toBe(100_000);

    expect(config.freelancerPlatformFeeRate).toBe(0.07);
    expect(config.paymentProviderFeeRate).toBe(0.005);
    expect(fees.platformFeeFromFreelancerMinor).toBe(7_000);
    expect(fees.paymentProviderFeeMinor).toBe(500);
    expect(fees.freelancerNetMinor).toBe(92_500);
  });

  it("updates both getEscrowFeeConfig() and calculateFees() when PLATFORM_FEE_RATE_FREELANCER changes", () => {
    vi.spyOn(env, "PLATFORM_FEE_RATE_FREELANCER", "get").mockReturnValue(0.05);

    const config = getEscrowFeeConfig();
    const fees = calculateFees({ milestoneAmountMinor: 200_000 });

    expect(config.freelancerPlatformFeeRate).toBe(0.05);
    expect(fees.platformFeeFromFreelancerMinor).toBe(10_000);
    expect(fees.paymentProviderFeeMinor).toBe(1_000);
    expect(fees.freelancerNetMinor).toBe(189_000);
  });
});
