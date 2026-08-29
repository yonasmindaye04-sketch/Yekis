// === INTERFACES & TYPES ===
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
  }): Promise<{ status: "SUCCESS" | "FAILED" | "PENDING" } | null>;
}
