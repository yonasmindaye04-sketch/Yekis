// === IMPORTS ===
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import type { InitiatePaymentResult, PaymentProviderClient } from "./paymentProvider.interface.js";

/**
 * Chapa — secondary/fallback gateway (also viable as the primary aggregator
 * if Phase 0 decides against a direct Telebirr integration; see the earlier
 * escrow-architecture and payment-integration discussion).
 * Same stub/real split as telebirr.client.ts — see that file's header for
 * the reasoning.
 */
export const chapaClient: PaymentProviderClient = {
  async initiatePayment(params): Promise<InitiatePaymentResult> {
    if (!env.CHAPA_SECRET_KEY) {
      logger.warn("Chapa credentials not configured — using mock payment initiation.");
      return {
        providerTransactionId: `mock-chapa-${randomUUID()}`,
        redirectUrl: null,
      };
    }

    // TODO: real Chapa "Initialize Transaction" API call once the secret
    // key is live — POST amount/currency/reference/callback_url to Chapa's
    // API, return the checkout_url it responds with as redirectUrl.
    throw new Error("Chapa live integration not yet implemented — credentials present but no API call wired.");
  },

  verifyWebhookSignature({ rawBody, signatureHeader }): boolean {
    if (!env.CHAPA_SECRET_KEY) {
      logger.error("CHAPA_SECRET_KEY not set — rejecting webhook rather than trusting an unverifiable payload.");
      return false;
    }
    if (!signatureHeader) return false;

    // Chapa signs webhooks with HMAC-SHA256 of the raw body using the
    // secret key itself (confirm against current Chapa docs at
    // integration time — webhook signing schemes do change).
    const expected = createHmac("sha256", env.CHAPA_SECRET_KEY).update(rawBody).digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },
};
