
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
  verifyWebhookSignature(params: { rawBody: Buffer; signatureHeader: string | undefined }): boolean;
}
