// === IMPORTS ===
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import type {
  InitiatePaymentResult,
  PaymentProviderClient,
} from "./paymentProvider.interface.js";

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
    logger.warn(
      "CBE Birr integration not yet confirmed — using mock payment initiation.",
    );
    return {
      providerTransactionId: `mock-cbe-${randomUUID()}`,
      redirectUrl: null,
    };
  },

  verifyWebhookSignature({ rawBody, signatureHeader }): boolean {
    // Placeholder scheme matching the other two clients' shape until CBE's
    // actual (if any) webhook signing method is confirmed. Do not deploy
    // this to production without replacing this with CBE's real scheme —
    // or removing CBE as a webhook-driven provider entirely if it turns
    // out to be manual-reconciliation-only.
    const secret = env.CBE_WEBHOOK_SECRET;
    if (!secret || !signatureHeader) return false;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },
};
