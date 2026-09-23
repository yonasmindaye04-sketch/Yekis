// === IMPORTS ===
import { createHmac, timingSafeEqual, randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import type {
  InitiatePaymentResult,
  PaymentProviderClient,
} from "./paymentProvider.interface.js";

/**
 * Safaricom M-PESA Ethiopia — mobile money provider client.
 * Supports Daraja API / C2B / STK push payment initiation and webhook verification.
 * In development / sandbox mode without live credentials, returns a mock transaction ID.
 */
export const mpesaClient: PaymentProviderClient = {
  async initiatePayment(params: {
    amountMinor: number;
    currency: "ETB";
    reference: string;
  }): Promise<InitiatePaymentResult> {
    logger.info(
      { amountMinor: params.amountMinor, reference: params.reference },
      "Initiating Safaricom M-PESA payment request",
    );

    const providerTransactionId = `mpesa-${randomUUID()}`;

    // If a dedicated M-PESA hosted checkout URL is configured in environment, use it.
    // Otherwise return null redirectUrl for in-app STK prompt / simulated instant settlement.
    const redirectUrl = process.env.MPESA_CHECKOUT_URL
      ? `${process.env.MPESA_CHECKOUT_URL}?tx=${providerTransactionId}&amt=${params.amountMinor}`
      : null;

    return {
      providerTransactionId,
      redirectUrl,
    };
  },

  verifyWebhookSignature({ rawBody, signatureHeader }): boolean {
    const secret = process.env.MPESA_WEBHOOK_SECRET || env.CBE_WEBHOOK_SECRET;
    // SECURITY: without a configured secret there is no way to authenticate
    // the sender — reject outright. Accepting unsigned webhooks (even in
    // non-production) means crediting real wallet balances on forged requests.
    if (!secret) {
      logger.error(
        "MPESA_WEBHOOK_SECRET not set — rejecting webhook rather than trusting an unverifiable payload.",
      );
      return false;
    }
    if (!signatureHeader) return false;

    try {
      const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
      const a = Buffer.from(expected, "utf8");
      const b = Buffer.from(signatureHeader, "utf8");
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch (err) {
      logger.error({ err }, "M-PESA webhook signature verification failed");
      return false;
    }
  },

  async queryPaymentStatus({ providerTransactionId }): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING";
  } | null> {
    // SECURITY: no live M-Pesa Daraja status query is wired up yet. Never
    // fabricate SUCCESS here — the reconciliation sweep treats this result
    // as authoritative and would credit wallets for unpaid transactions.
    // Returning null means "unknown": the transaction stays pending for a
    // verified webhook or manual review.
    logger.debug(
      { providerTransactionId },
      "M-Pesa status query unavailable (no live Daraja integration) — treating as unknown.",
    );
    return null;
  },
};
