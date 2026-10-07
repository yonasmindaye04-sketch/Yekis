// === IMPORTS ===
import type {
  InitiatePaymentResult,
  PaymentProviderClient,
} from "./paymentProvider.interface.js";
import { PaymentProviderUnavailableError } from "./paymentProvider.interface.js";

/**
 * Safaricom M-PESA Ethiopia — mobile money provider client.
 * Deliberately disabled until Safaricom merchant credentials, callback
 * contract, and API product are supplied. A configured URL is not a payment
 * integration and must never create a locally fabricated transaction.
 */
export const mpesaClient: PaymentProviderClient = {
  async initiatePayment(): Promise<InitiatePaymentResult> {
    throw new PaymentProviderUnavailableError("M-Pesa checkout is unavailable until the approved Safaricom merchant API is configured.");
  },

  verifyWebhookSignature(): boolean {
    // Safaricom callback authentication is not interchangeable with a
    // generic HMAC. Reject until the merchant callback contract is known.
    return false;
  },

  async queryPaymentStatus(): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING";
  } | null> {
    // SECURITY: no live M-Pesa Daraja status query is wired up yet. Never
    // fabricate SUCCESS here — the reconciliation sweep treats this result
    // as authoritative and would credit wallets for unpaid transactions.
    // Returning null means "unknown": the transaction stays pending for a
    // verified webhook or manual review.
    return null;
  },
};
