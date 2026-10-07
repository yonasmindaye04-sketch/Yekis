// === INTERFACES & TYPES ===
export class PaymentProviderUnavailableError extends Error {
  readonly code = "PAYMENT_PROVIDER_UNAVAILABLE";
}

export interface InitiatePaymentResult {
  providerTransactionId: string;
  /** URL to redirect the client to, or null if the flow is purely
   *  webhook-driven (e.g. a direct bank transfer instruction shown in-app). */
  redirectUrl: string | null;
}

export interface PaymentProviderClient {
  initiatePayment(params: {
    amountMinor: number;
    currency: "ETB";
    reference: string; // our milestoneId — passed through so the webhook can be matched back
  }): Promise<InitiatePaymentResult>;

  /** Verifies a webhook's authenticity BEFORE any business logic touches
   *  the payload. Every provider client must implement this — never trust
   *  a webhook just because it hit our endpoint. */
  verifyWebhookSignature(params: {
    rawBody: Buffer;
    signatureHeader: string | undefined;
  }): boolean;

  /**
   * Server-to-server status poll used by the payment reconciliation sweep.
   * Webhooks can be delayed or silently lost (provider outage, network
   * blip, our own downtime) — money movement must never depend on the
   * webhook arriving. Providers that expose a direct transaction-status
   * query implement this; the reconcile worker calls it for transactions
   * stuck in PENDING past the stale threshold and feeds the authoritative
   * result back through handlePaymentWebhook.
   *
   * Returns null when the provider has no record of the reference yet
   * (e.g. user never opened the checkout page) — distinct from an error.
   */
  queryPaymentStatus?(params: {
    providerTransactionId: string;
  }): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING";
    amountMinor?: number;
    currency?: string;
  } | null>;

  /**
   * B2C Disbursement (payout) to a freelancer's mobile wallet or bank account.
   */
  initiateDisbursement?(params: {
    amountMinor: number;
    currency: "ETB";
    recipientPhone: string;
    referenceId: string;
  }): Promise<InitiateDisbursementResult>;

  /**
   * Status check for an in-flight or processing disbursement.
   */
  queryDisbursementStatus?(params: {
    providerPayoutId: string;
  }): Promise<{ status: "CONFIRMED" | "PROCESSING" | "FAILED"; errorMessage?: string } | null>;
}

export interface InitiateDisbursementResult {
  providerPayoutId: string;
  status: "CONFIRMED" | "PROCESSING" | "FAILED";
  errorMessage?: string;
}
