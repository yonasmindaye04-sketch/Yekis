// === IMPORTS ===
import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import type { InitiatePaymentResult, PaymentProviderClient } from "./paymentProvider.interface.js";
import { getFabricToken, invalidateFabricToken } from "./telebirr.token.js";
import {
  createTimestamp,
  createNonceStr,
  signRequestObject,
  buildSigningString,
  verifyWithRsaPss,
} from "./telebirr.signing.js";

/**
 * Telebirr C2B Web Checkout — the primary payment rail.
 *
 * Implements the full Telebirr payment flow:
 * 1. Obtains a fabric token (cached in Redis via telebirr.token.ts)
 * 2. Creates a preOrder via the Telebirr Merchant API
 * 3. Assembles a web checkout URL for browser redirect
 * 4. Verifies incoming webhook signatures (RSA-PSS in the body)
 *
 * When credentials are not configured, falls back to mock mode
 * (returns a fake transaction ID and triggers an auto-webhook).
 */

/**
 * Checks whether the required Telebirr credentials are configured.
 * All five core credentials must be present for live mode.
 */
function hasCredentials(): boolean {
  return !!(
    env.TELEBIRR_FABRIC_APP_ID &&
    env.TELEBIRR_APP_SECRET &&
    env.TELEBIRR_MERCHANT_APP_ID &&
    env.TELEBIRR_MERCHANT_CODE &&
    env.TELEBIRR_PRIVATE_KEY
  );
}

/**
 * Generates a unique merchant order ID.
 * Format: YKS-<unix_timestamp>-<6_char_random>
 * This is stored as providerTransactionId and used as merch_order_id
 * in the Telebirr preOrder request.
 */
function generateMerchOrderId(): string {
  const ts = Date.now();
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `YKS-${ts}-${rand}`;
}


// === MAIN EXPORT ===

export const telebirrClient: PaymentProviderClient = {
  async initiatePayment(params): Promise<InitiatePaymentResult> {
    if (!hasCredentials()) {
      logger.warn("Telebirr credentials not configured — using mock payment initiation.");
      return {
        providerTransactionId: `mock-telebirr-${randomUUID()}`,
        redirectUrl: null,
      };
    }

    // 1. Get fabric token (cached in Redis)
    const fabricToken = await getFabricToken();

    // 2. Generate unique order ID
    const merchOrderId = generateMerchOrderId();

    // 3. Convert amount from minor units (cents) to decimal string
    //    Telebirr expects amounts like "500.00", not integer cents.
    const amountStr = (params.amountMinor / 100).toFixed(2);

    // 4. Build the preOrder request
    const timestamp = createTimestamp();
    const nonceStr = createNonceStr();

    const preOrderRequest: Record<string, unknown> = {
      timestamp,
      nonce_str: nonceStr,
      method: "payment.preorder",
      version: "1.0",
      biz_content: {
        notify_url: env.TELEBIRR_NOTIFY_URL || `${env.FRONTEND_URL}/api/v1/webhooks/telebirr`,
        appid: env.TELEBIRR_MERCHANT_APP_ID,
        merch_code: env.TELEBIRR_MERCHANT_CODE,
        merch_order_id: merchOrderId,
        trade_type: "Checkout",
        title: `Yekis Escrow — ${params.reference}`,
        total_amount: amountStr,
        trans_currency: params.currency,
        timeout_express: env.TELEBIRR_TIMEOUT_EXPRESS,
      },
      sign: "",
      sign_type: "SHA256WithRSA",
    };

    // 5. Sign the request
    preOrderRequest.sign = signRequestObject(
      preOrderRequest,
      env.TELEBIRR_PRIVATE_KEY!,
    );

    // 6. Call the preOrder API
    const preOrderUrl = `${env.TELEBIRR_BASE_URL}/payment/v1/merchant/preOrder`;

    logger.info(
      { merchOrderId, amountStr, reference: params.reference },
      "Creating Telebirr preOrder.",
    );

    let preOrderResponse: Response;
    try {
      preOrderResponse = await fetch(preOrderUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-APP-Key": env.TELEBIRR_FABRIC_APP_ID!,
          "Authorization": `Bearer ${fabricToken}`,
        },
        body: JSON.stringify(preOrderRequest),
      });
    } catch (err) {
      // If the token might have expired, invalidate and let the next attempt re-fetch
      await invalidateFabricToken();
      throw new Error(`Telebirr preOrder request failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    if (!preOrderResponse.ok) {
      const body = await preOrderResponse.text().catch(() => "");
      // Invalidate token on 401 — might be expired
      if (preOrderResponse.status === 401) {
        await invalidateFabricToken();
      }
      throw new Error(
        `Telebirr preOrder failed: HTTP ${preOrderResponse.status} — ${body}`,
      );
    }

    const preOrderData = (await preOrderResponse.json()) as {
      code: number;
      msg: string;
      biz_content?: { prepay_id?: string };
    };

    if (preOrderData.code !== 200 || !preOrderData.biz_content?.prepay_id) {
      throw new Error(
        `Telebirr preOrder returned error: code=${preOrderData.code}, msg=${preOrderData.msg}`,
      );
    }

    const prepayId = preOrderData.biz_content.prepay_id;

    // 7. Assemble the web checkout URL
    //    This is the URL the client browser will be redirected to.
    const rawMap: Record<string, string> = {
      appid: env.TELEBIRR_MERCHANT_APP_ID!,
      merch_code: env.TELEBIRR_MERCHANT_CODE!,
      nonce_str: createNonceStr(),
      prepay_id: prepayId,
      timestamp: createTimestamp(),
    };

    const rawSign = signRequestObject(rawMap, env.TELEBIRR_PRIVATE_KEY!);

    const rawRequest = Object.keys(rawMap)
      .sort()
      .map((k) => `${k}=${encodeURIComponent(rawMap[k]!)}`)
      .join("&")
      + `&sign=${encodeURIComponent(rawSign)}&sign_type=SHA256WithRSA`;

    const checkoutUrl =
      `${env.TELEBIRR_WEB_BASE_URL}${rawRequest}&version=1.0&trade_type=Checkout`;

    logger.info(
      { merchOrderId, prepayId },
      "Telebirr preOrder created — checkout URL assembled.",
    );

    return {
      providerTransactionId: merchOrderId,
      redirectUrl: checkoutUrl,
    };
  },

  /**
   * Verifies an incoming Telebirr webhook signature.
   *
   * Telebirr embeds the signature inside the JSON body (as the "sign" field),
   * NOT in an HTTP header. This method:
   * 1. Parses the raw body to extract "sign"
   * 2. Rebuilds the canonical signing string from remaining fields
   * 3. Verifies using Telebirr's RSA public key with RSA-PSS
   *
   * The signatureHeader parameter is ignored (kept for interface compliance).
   */
  verifyWebhookSignature({ rawBody }): boolean {
    if (!env.TELEBIRR_PUBLIC_KEY) {
      logger.error(
        "TELEBIRR_PUBLIC_KEY not set — rejecting webhook rather than trusting an unverifiable payload.",
      );
      return false;
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      logger.error("Failed to parse Telebirr webhook body as JSON.");
      return false;
    }

    const signature = payload.sign;
    if (!signature || typeof signature !== "string") {
      logger.warn("Telebirr webhook missing 'sign' field.");
      return false;
    }

    // Build signing string from the payload (excluding sign and sign_type)
    const signingString = buildSigningString(payload);

    const isValid = verifyWithRsaPss(
      signingString,
      signature,
      env.TELEBIRR_PUBLIC_KEY,
    );

    if (!isValid) {
      logger.warn("Telebirr webhook RSA-PSS signature verification failed.");
    }

    return isValid;
  },

  /**
   * Direct transaction-status query (payment.query.order) used by the
   * payment reconciliation sweep. Signed exactly like preOrder: fabric
   * token + canonical signing string + merchant private key.
   *
   * Returns null when Telebirr has no record of the merch_order_id yet —
   * that means the user likely never opened/confirmed the checkout page,
   * which is a normal PENDING, not an error.
   */
  async queryPaymentStatus({ providerTransactionId }): Promise<{
    status: "SUCCESS" | "FAILED" | "PENDING";
  } | null> {
    if (!hasCredentials()) {
      logger.warn("Telebirr credentials not configured — reconciliation query unavailable.");
      return null;
    }

    const fabricToken = await getFabricToken();

    const queryRequest: Record<string, unknown> = {
      timestamp: createTimestamp(),
      nonce_str: createNonceStr(),
      method: "payment.query.order",
      version: "1.0",
      biz_content: {
        appid: env.TELEBIRR_MERCHANT_APP_ID,
        merch_code: env.TELEBIRR_MERCHANT_CODE,
        merch_order_id: providerTransactionId,
      },
      sign: "",
      sign_type: "SHA256WithRSA",
    };
    queryRequest.sign = signRequestObject(queryRequest, env.TELEBIRR_PRIVATE_KEY!);

    let response: Response;
    try {
      response = await fetch(`${env.TELEBIRR_BASE_URL}/payment/v1/merchant/queryOrder`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-APP-Key": env.TELEBIRR_FABRIC_APP_ID!,
          Authorization: `Bearer ${fabricToken}`,
        },
        body: JSON.stringify(queryRequest),
      });
    } catch (err) {
      await invalidateFabricToken();
      throw new Error(
        `Telebirr queryOrder request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      if (response.status === 401) await invalidateFabricToken();
      const body = await response.text().catch(() => "");
      throw new Error(`Telebirr queryOrder failed: HTTP ${response.status} — ${body}`);
    }

    const data = (await response.json()) as {
      code?: number;
      msg?: string;
      biz_content?: {
        trade_status?: string;
        trade_voucher?: string;
        total_amount?: string;
      };
    };

    // Telebirr returns a non-200 business code when the order is unknown.
    if (data.code !== 200 || !data.biz_content?.trade_status) {
      logger.info(
        { providerTransactionId, code: data.code, msg: data.msg },
        "Telebirr has no record of this order yet — treating as still PENDING.",
      );
      return null;
    }

    // Same status vocabulary as the webhook handler in webhooks.routes.ts.
    const s = data.biz_content.trade_status.toLowerCase();
    let status: "SUCCESS" | "FAILED" | "PENDING";
    if (["completed", "success"].includes(s)) status = "SUCCESS";
    else if (["fail", "failed", "closed", "cancelled"].includes(s)) status = "FAILED";
    else status = "PENDING";

    return { status };
  },
};
