// === IMPORTS ===
import { env } from "../../config/env.js";

// === INTERFACES & TYPES ===
export interface FeeBreakdown {
  grossAmountMinor: number;
  platformFeeFromFreelancerMinor: number;
  platformFeeFromClientMinor: number; // added on top of what the client pays into escrow
  /** Payment/disbursement provider fee. Second component of the fee engine. */
  paymentProviderFeeMinor: number;
  withholdingTaxMinor: number;
  freelancerNetMinor: number;
  clientTotalChargeMinor: number;
}

/**
 * All amounts are integer minor units (ETB cents) in and out — never
 * floats. Rounding uses Math.round at each step rather than truncating, so
 * fee-splitting cents don't silently disappear.
 */

// === MAIN FUNCTIONS ===
export function calculateFees(params: {
  milestoneAmountMinor: number;
  freelancerHasTin?: boolean;
}): FeeBreakdown {
  const gross = params.milestoneAmountMinor;

  const platformFeeFromFreelancer = Math.round(
    gross * env.PLATFORM_FEE_RATE_FREELANCER,
  );
  const platformFeeFromClient = Math.round(
    gross * env.PLATFORM_FEE_RATE_CLIENT,
  );

  /**
   * The payment/disbursement provider fee, charged on the transaction gross
   * alongside the platform fee. With the default rates the platform's overall
   * take on a transaction is 7.5%: 7% platform commission + 0.5% provider fee,
   * leaving the freelancer 92.5%.
   *
   * It used to be a hardcoded 0.005 literal inside withdrawFromWallet, applied
   * to every provider at payout time — neither configurable nor routed by the
   * fee engine. Collecting it once, at release, makes the take a single
   * visible number on the transaction instead of a surprise at cash-out.
   */
  const paymentProviderFee = Math.round(
    gross * env.PAYMENT_PROVIDER_FEE_RATE,
  );

  /**
   * STATUTORY WITHHOLDING TAX — DEFERRED, NOT YET IN FORCE.
   *
   * The Income Tax Proclamation requires 3% withholding for a freelancer with
   * a TIN on file and 30% without, on payouts at or above ETB 10,000. The
   * rates and the threshold are configured below and in env.ts, but the ERA
   * remittance channel, the form numbers, the filing frequency and the
   * responsible party are all unconfirmed (TAX-002, OPEN ACTION), and the
   * accountant has not signed off on the figures. Applying an unverified
   * statutory deduction to freelancer payouts before that confirmation would
   * take money from workers on the strength of a guess.
   *
   * The block is therefore commented out and withholding is held at 0. The
   * `TIN_FEATURE_ENABLED` flag is kept as the switch that turns it back on
   * once the accountant confirms, and the rates below are kept so the
   * reactivation is a one-line change rather than a reconstruction.
   */
  let withholdingTax = 0;
  // if (env.TIN_FEATURE_ENABLED && gross >= env.WITHHOLDING_THRESHOLD_MINOR) {
  //   const withholdingRate = params.freelancerHasTin
  //     ? env.WITHHOLDING_RATE_WITH_TIN
  //     : env.WITHHOLDING_RATE_WITHOUT_TIN;
  //   withholdingTax = Math.round(gross * withholdingRate);
  // }

  const freelancerNet =
    gross - platformFeeFromFreelancer - paymentProviderFee - withholdingTax;
  const clientTotalCharge = gross + platformFeeFromClient;

  return {
    grossAmountMinor: gross,
    platformFeeFromFreelancerMinor: platformFeeFromFreelancer,
    platformFeeFromClientMinor: platformFeeFromClient,
    paymentProviderFeeMinor: paymentProviderFee,
    withholdingTaxMinor: withholdingTax,
    freelancerNetMinor: freelancerNet,
    clientTotalChargeMinor: clientTotalCharge,
  };
}
