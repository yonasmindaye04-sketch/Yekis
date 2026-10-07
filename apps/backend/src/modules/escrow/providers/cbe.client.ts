// === IMPORTS ===
import type {
  InitiatePaymentResult,
  PaymentProviderClient,
} from "./paymentProvider.interface.js";
import { PaymentProviderUnavailableError } from "./paymentProvider.interface.js";

/**
 * CBE Birr — tertiary option. Per the legal/design document, CBE currently
 * has no confirmed direct developer API — this may end up being a bank
 * transfer instruction shown in-app (redirectUrl: null) rather than a
 * redirect checkout, confirmed via manual reconciliation until CBE
 * publishes a real API path. This client is a placeholder for whichever
 * flow Phase 0 actually confirms.
 */
export const cbeClient: PaymentProviderClient = {
  async initiatePayment(): Promise<InitiatePaymentResult> {
    throw new PaymentProviderUnavailableError("CBE Birr checkout is unavailable until the approved merchant API is configured.");
  },

  verifyWebhookSignature(): boolean {
    // No provider-approved signing contract is configured. Never accept a
    // locally invented HMAC convention as proof that CBE sent the callback.
    return false;
  },
};
