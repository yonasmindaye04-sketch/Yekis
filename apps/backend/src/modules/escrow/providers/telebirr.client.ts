// === IMPORTS ===
import { randomUUID } from "node:crypto";
import { env } from "../../../config/env.js";

export {
  SANDBOX_TELEBIRR_BASE_URL,
  SANDBOX_TELEBIRR_WEB_BASE_URL,
  TELEBIRR_SANDBOX_HOST,
} from "../../../config/env.js";
import { logger } from "../../../lib/logger.js";
import type {
  InitiatePaymentResult,
  PaymentProviderClient,
} from "./paymentProvider.interface.js";
import { PaymentProviderUnavailableError } from "./paymentProvider.interface.js";
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
 * Format: YKS<unix_timestamp><12 cryptographically-random hex chars>
 * This is stored as providerTransactionId and used as merch_order_id
 * in the Telebirr preOrder request.
 */
function generateMerchOrderId(): string {
  const ts = Date.now();
  const rand = randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  return `YKS${ts}${rand}`;
}

export interface TelebirrUrlConfig {
  API_PUBLIC_URL?: string;
  FRONTEND_URL?: string;
  TELEBIRR_NOTIFY_URL?: string;
  TELEBIRR_REDIRECT_URL?: string;
}

/**
 * The settlement callback Telebirr posts to. Built from API_PUBLIC_URL (this
 * service), never from FRONTEND_URL (the web app host), so a money-confirming
 * webhook is never delivered somewhere that cannot process it.
 */
export function deriveTelebirrNotifyUrl(cfg: TelebirrUrlConfig): string | undefined {
  if (cfg.TELEBIRR_NOTIFY_URL) return cfg.TELEBIRR_NOTIFY_URL;
  if (!cfg.API_PUBLIC_URL) return undefined;
  return `${cfg.API_PUBLIC_URL.replace(/\/+$/, "")}/api/v1/webhooks/telebirr`;
}

/**
 * Where the payer is sent after checkout. This is a browser redirect, so
 * FRONTEND_URL is the correct origin here — the opposite of notify_url.
 */
export function deriveTelebirrRedirectUrl(cfg: TelebirrUrlConfig): string | undefined {
  if (cfg.TELEBIRR_REDIRECT_URL) return cfg.TELEBIRR_REDIRECT_URL;
  if (!cfg.FRONTEND_URL) return undefined;
  return `${cfg.FRONTEND_URL}/wallet`;
}

function getNotifyUrl(): string {
  if (!env.TELEBIRR_PUBLIC_KEY) {
    throw new PaymentProviderUnavailableError(
      "Telebirr callback verification is not configured: set TELEBIRR_PUBLIC_KEY.",
    );
  }

const notifyUrl = deriveTelebirrNotifyUrl(env);
  if (!notifyUrl) {
    throw new PaymentProviderUnavailableError(
      "Telebirr callbacks are not configured: set TELEBIRR_NOTIFY_URL to the public API callback URL.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(notifyUrl);
  } catch {
    throw new PaymentProviderUnavailableError("TELEBIRR_NOTIFY_URL must be a valid absolute URL.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.pathname.replace(/\/+$/, "") !== "/api/v1/webhooks/telebirr" ||
    parsed.username || parsed.password || parsed.search || parsed.hash ||
    ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname.toLowerCase())
  ) {
    throw new PaymentProviderUnavailableError(
      "TELEBIRR_NOTIFY_URL must be a public HTTPS URL ending in /api/v1/webhooks/telebirr, without credentials, query, or fragment.",
    );
  }
  return parsed.toString();
}

// === MAIN EXPORT ===

export const telebirrClient: PaymentProviderClient = {
  async initiatePayment(params): Promise<InitiatePaymentResult> {
    if (!hasCredentials()) {
      if (env.NODE_ENV === "production") {
        throw new PaymentProviderUnavailableError("Telebirr payment is disabled in production until merchant credentials are configured.");
      }
      logger.warn(
        "Telebirr credentials not configured — using mock payment initiation.",
      );
      return {
        providerTransactionId: `mock-telebirr-${randomUUID()}`,
        redirectUrl: null,
      };
    }

    // 1. Get fabric token (cached in Redis)
    const fabricToken = await getFabricToken();

    // 2. Generate unique order ID
    const merchOrderId = generateMerchOrderId();
    const notifyUrl = getNotifyUrl();

    // 3. Convert amount from minor units (cents) to decimal string
    //    Telebirr expects amounts like "500.00", not integer cents.
    const amountStr = (params.amountMinor / 100).toFixed(2);

    // 4. Build the preOrder request
    const timestamp = createTimestamp();
    const nonceStr = createNonceStr();

    // Telebirr rejects strings containing: ~`!#$%^*()\-+=|/<>?;:"[]{}&\
    const sanitizedTitle = (
      params.reference
        ? `Yekis ${params.reference} ETB ${amountStr}`
        : `Yekis Escrow ETB ${amountStr}`
    )
      .replace(/[~`!#$%^*()\-+=|/<>?;:"[\]{}\\\\&]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 64);

    const preOrderRequest: Record<string, unknown> = {
      timestamp,
      nonce_str: nonceStr,
      method: "payment.preorder",
      version: "1.0",
      biz_content: {
        // Built from API_PUBLIC_URL, never FRONTEND_URL. Telebirr POSTs the
        // payment confirmation to this URL; FRONTEND_URL is the web app host,
        // so deriving it from there delivered settlement webhooks to a service
        // that cannot route them — and a stale or staging FRONTEND_URL breaks
        // settlement silently rather than loudly.
        //
        // TELEBIRR_NOTIFY_URL still wins when explicitly set, for the rare case
        // where the callback genuinely lives on a different host.
        notify_url: notifyUrl,
        appid: env.TELEBIRR_MERCHANT_APP_ID,
        merch_code: env.TELEBIRR_MERCHANT_CODE,
        merch_order_id: merchOrderId,
        trade_type: "Checkout",
        title: sanitizedTitle,
        total_amount: amountStr,
        trans_currency: params.currency,
        timeout_express: env.TELEBIRR_TIMEOUT_EXPRESS,
        // A USER-FACING redirect, so FRONTEND_URL is correct here.
        redirect_url: deriveTelebirrRedirectUrl(env),
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
          Authorization: `Bearer ${fabricToken}`,
        },
        body: JSON.stringify(preOrderRequest),
      });
    } catch (err) {
      // If the token might have expired, invalidate and let the next attempt re-fetch
      await invalidateFabricToken();
      throw new Error(
        `Telebirr preOrder request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
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

    if ((preOrderData.code !== 200 && preOrderData.code !== 0 && preOrderData.code !== "0" as any) || !preOrderData.biz_content?.prepay_id) {
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

    const rawRequest =
      Object.keys(rawMap)
        .sort()
        .map((k) => `${k}=${encodeURIComponent(rawMap[k]!)}`)
        .join("&") +
      `&sign=${encodeURIComponent(rawSign)}&sign_type=SHA256WithRSA`;

    const checkoutUrl = `${env.TELEBIRR_WEB_BASE_URL}${rawRequest}&version=1.0&trade_type=Checkout`;

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
    amountMinor?: number;
    currency?: string;
  } | null> {
    if (!hasCredentials()) {
      logger.warn(
        "Telebirr credentials not configured — reconciliation query unavailable.",
      );
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
    queryRequest.sign = signRequestObject(
      queryRequest,
      env.TELEBIRR_PRIVATE_KEY!,
    );

    let response: Response;
    try {
      response = await fetch(
        `${env.TELEBIRR_BASE_URL}/payment/v1/merchant/queryOrder`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-APP-Key": env.TELEBIRR_FABRIC_APP_ID!,
            Authorization: `Bearer ${fabricToken}`,
          },
          body: JSON.stringify(queryRequest),
        },
      );
    } catch (err) {
      await invalidateFabricToken();
      throw new Error(
        `Telebirr queryOrder request failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!response.ok) {
      if (response.status === 401) await invalidateFabricToken();
      const body = await response.text().catch(() => "");
      throw new Error(
        `Telebirr queryOrder failed: HTTP ${response.status} — ${body}`,
      );
    }

    const data = (await response.json()) as {
      code?: number;
      msg?: string;
      biz_content?: {
        trade_status?: string;
        trade_voucher?: string;
        total_amount?: string;
        trans_currency?: string;
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
    else if (["fail", "failed", "closed", "cancelled"].includes(s))
      status = "FAILED";
    else status = "PENDING";

    const amountText = data.biz_content.total_amount;
    const amountMinor = amountText && /^\d+(\.\d{1,2})?$/.test(amountText)
      ? Math.round(Number(amountText) * 100)
      : undefined;
    return {
      status,
      ...(amountMinor !== undefined ? { amountMinor } : {}),
      ...(data.biz_content.trans_currency ? { currency: data.biz_content.trans_currency } : {}),
    };
  },

  /**
   * B2C Disbursement to freelancer's Telebirr account.
   */
  async initiateDisbursement(params: {
    amountMinor: number;
    currency: "ETB";
    recipientPhone: string;
    referenceId: string;
  }) {
    if (!hasCredentials()) {
      if (env.NODE_ENV === "production") {
        throw new PaymentProviderUnavailableError("Telebirr disbursement is disabled in production until merchant credentials are configured.");
      }
      logger.warn(
        { recipientPhone: params.recipientPhone, amountMinor: params.amountMinor },
        "Telebirr credentials not configured — using simulated sandbox disbursement.",
      );

      // Deterministic simulation: phone ending with 999 fails, all others succeed
      if (params.recipientPhone.endsWith("999")) {
        return {
          providerPayoutId: `mock-disburse-${randomUUID()}`,
          status: "FAILED" as const,
          errorMessage: "Telebirr account inactive or phone number not registered for mobile money.",
        };
      }

      return {
        providerPayoutId: `mock-disburse-${randomUUID()}`,
        status: "CONFIRMED" as const,
      };
    }

    const fabricToken = await getFabricToken();
    const disburseRequest: Record<string, unknown> = {
      timestamp: createTimestamp(),
      nonce_str: createNonceStr(),
      method: "payment.disbursement",
      version: "1.0",
      biz_content: {
        appid: env.TELEBIRR_MERCHANT_APP_ID,
        merch_code: env.TELEBIRR_MERCHANT_CODE,
        merch_order_id: params.referenceId,
        amount: (params.amountMinor / 100).toFixed(2),
        currency: params.currency,
        receiver_account: params.recipientPhone,
      },
      sign: "",
      sign_type: "SHA256WithRSA",
    };

    disburseRequest.sign = signRequestObject(
      disburseRequest,
      env.TELEBIRR_PRIVATE_KEY!,
    );

    let response: Response;
    try {
      response = await fetch(
        `${env.TELEBIRR_BASE_URL}/payment/v1/merchant/disbursement`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-APP-Key": env.TELEBIRR_FABRIC_APP_ID!,
            Authorization: `Bearer ${fabricToken}`,
          },
          body: JSON.stringify(disburseRequest),
        },
      );
    } catch (err) {
      await invalidateFabricToken();
      logger.error({ err }, "Telebirr disbursement request failed network call");
      return {
        providerPayoutId: params.referenceId,
        status: "PROCESSING" as const,
        errorMessage: "Network timeout communicating with Telebirr — queued for reconciliation",
      };
    }

    if (!response.ok) {
      if (response.status === 401) await invalidateFabricToken();
      const body = await response.text().catch(() => "");
      logger.error({ status: response.status, body }, "Telebirr disbursement HTTP failure");
      return {
        providerPayoutId: params.referenceId,
        status: "FAILED" as const,
        errorMessage: `Telebirr rejected disbursement: HTTP ${response.status}`,
      };
    }

    const data = (await response.json()) as {
      code?: number;
      msg?: string;
      biz_content?: {
        disburse_order_id?: string;
        order_status?: string;
      };
    };

    if (data.code === 200) {
      const orderStatus = data.biz_content?.order_status?.toLowerCase();
      if (orderStatus === "success" || orderStatus === "completed") {
        return {
          providerPayoutId: data.biz_content?.disburse_order_id || params.referenceId,
          status: "CONFIRMED" as const,
        };
      }
      return {
        providerPayoutId: data.biz_content?.disburse_order_id || params.referenceId,
        status: "PROCESSING" as const,
      };
    }

    return {
      providerPayoutId: params.referenceId,
      status: "FAILED" as const,
      errorMessage: data.msg || "Telebirr disbursement rejected",
    };
  },

  async queryDisbursementStatus(params: {
    providerPayoutId: string;
  }) {
    // No provider status-query API has been implemented/verified yet. Unknown
    // must remain unknown; never fabricate payout confirmation.
    logger.warn({ providerPayoutId: params.providerPayoutId }, "Telebirr disbursement status query is not implemented.");
    return null;
  },
};

