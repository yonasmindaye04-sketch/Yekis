// === IMPORTS ===
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import type { InitiatePaymentResult, PaymentProviderClient } from "./paymentProvider.interface.js";

/**
 * Telebirr Merchant API — the primary payment rail per the roadmap.
 *
 * initiatePayment is STUBBED (returns a mock transaction reference) pending
 * TELEBIRR_MERCHANT_ID / TELEBIRR_API_KEY from a real merchant agreement —
 * a Phase 0 blocking item, not something engineering can shortcut.
 *
 * verifyWebhookSignature is REAL and safe to rely on once
 * TELEBIRR_WEBHOOK_SECRET is set — implemented as HMAC-SHA256 over the raw
 * request body, compared with a timing-safe equality check. Confirm the
 * exact signing scheme against Telebirr's actual API docs once merchant
 * onboarding provides them; this is the standard pattern, not a guess at
 * Telebirr's specific header/encoding, which needs verification.
 */
export const telebirrClient: PaymentProviderClient = {
  async initiatePayment(params): Promise<InitiatePaymentResult> {
    if (!env.TELEBIRR_MERCHANT_ID || !env.TELEBIRR_API_KEY) {
      logger.warn("Telebirr credentials not configured — using mock payment initiation.");
      return {
        providerTransactionId: `mock-telebirr-${randomUUID()}`,
        redirectUrl: null,
      };
    }

    // TODO: real Telebirr Merchant API call once credentials exist. Expected
    // shape per the roadmap: POST to Telebirr's payment endpoint with
    // merchant ID + amount + reference, receive a redirect URL for the
    // client to complete payment, and a provider transaction ID to match
    // against the eventual webhook.
    throw new Error("Telebirr live integration not yet implemented — credentials present but no API call wired.");
  },

  verifyWebhookSignature({ rawBody, signatureHeader }): boolean {
    if (!env.TELEBIRR_WEBHOOK_SECRET) {
      logger.error("TELEBIRR_WEBHOOK_SECRET not set — rejecting webhook rather than trusting an unverifiable payload.");
      return false;
    }
    if (!signatureHeader) return false;

    const expected = createHmac("sha256", env.TELEBIRR_WEBHOOK_SECRET).update(rawBody).digest("hex");

    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signatureHeader, "utf8");
    if (a.length !== b.length) return false; // timingSafeEqual requires equal length
    return timingSafeEqual(a, b);
  },
};
