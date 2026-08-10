// === IMPORTS ===
import { env } from "../../config/env.js";


// === INTERFACES & TYPES ===
export interface FeeBreakdown {
  grossAmountMinor: number;
  platformFeeFromFreelancerMinor: number;
  platformFeeFromClientMinor: number; // added on top of what the client pays into escrow
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
export function calculateFees(params: { milestoneAmountMinor: number; freelancerHasTin: boolean }): FeeBreakdown {
  const gross = params.milestoneAmountMinor;

  const platformFeeFromFreelancer = Math.round(gross * env.PLATFORM_FEE_RATE_FREELANCER);
  const platformFeeFromClient = Math.round(gross * env.PLATFORM_FEE_RATE_CLIENT);

  const withholdingRate = params.freelancerHasTin
    ? env.WITHHOLDING_RATE_WITH_TIN
    : env.WITHHOLDING_RATE_WITHOUT_TIN;

  const withholdingTax =
    gross >= env.WITHHOLDING_THRESHOLD_MINOR ? Math.round(gross * withholdingRate) : 0;

  const freelancerNet = gross - platformFeeFromFreelancer - withholdingTax;
  const clientTotalCharge = gross + platformFeeFromClient;

  return {
    grossAmountMinor: gross,
    platformFeeFromFreelancerMinor: platformFeeFromFreelancer,
    platformFeeFromClientMinor: platformFeeFromClient,
    withholdingTaxMinor: withholdingTax,
    freelancerNetMinor: freelancerNet,
    clientTotalChargeMinor: clientTotalCharge,
  };
}
