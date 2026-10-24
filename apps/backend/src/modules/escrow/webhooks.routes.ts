// === IMPORTS ===
import { Router, raw } from "express";
import rateLimit from "express-rate-limit";
import type { PaymentProvider } from "../../schemas";
import { getProviderClient, handlePaymentWebhook } from "./escrow.service.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { handleTopUpWebhook } from "../topups/topup.service.js";

export const webhooksRouter = Router();

// Stricter, provider-specific rate limit â€” separate from the general /api
// limit, since these are unauthenticated-by-design endpoints and a more
// likely abuse target.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

// === MAIN FUNCTIONS ===

/**
 * Generic webhook handler for providers that use HTTP-header-based signatures
 * (currently CBE). Telebirr has its own handler below because its
 * signature is embedded in the JSON body, not in an HTTP header.
 */
function buildWebhookHandler(
  provider: PaymentProvider,
  signatureHeaderName: string,
) {
  return async (
    req: import("express").Request,
    res: import("express").Response,
  ) => {
    const rawBody = req.body as Buffer; // populated by express.raw() below, NOT parsed JSON
    const signatureHeader = req.headers[signatureHeaderName] as
      string | undefined;

    const client = getProviderClient(provider);
    const isValid = client.verifyWebhookSignature({ rawBody, signatureHeader });

    if (!isValid) {
      logger.warn(
        { provider },
        "Webhook signature verification failed â€” rejecting.",
      );
      return res.status(401).json({ error: "INVALID_SIGNATURE" });
    }

    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody.toString("utf8"));
    } catch {
      return res.status(400).json({ error: "INVALID_JSON" });
    }

    // NOTE: the exact field names below are placeholders pending each
    // provider's real webhook payload shape (confirm at integration time
    // once sandbox credentials exist) â€” this mapping is the one thing that
    // WILL need adjusting per real provider docs, everything around it
    // (signature check, idempotency, state transition) will not.
    try {
      await handlePaymentWebhook({
        provider,
        providerTransactionId: String(
          payload.transaction_id ?? payload.tx_ref ?? "",
        ),
        status: mapProviderStatus(payload.status),
        rawPayload: payload,
      });
      return res.status(200).json({ received: true });
    } catch (err) {
      logger.error({ err, provider }, "Failed to process payment webhook");
      return res.status(500).json({ error: "INTERNAL_ERROR" });
    }
  };
}

/**
 * Dedicated Telebirr webhook handler.
 *
 * Telebirr differs from other providers in three ways:
 * 1. The signature is in the JSON body ("sign" field), not an HTTP header
 * 2. The field names are Telebirr-specific (merch_order_id, trade_status)
 * 3. Telebirr expects { code: 0, msg: "success" } as the response
 *
 * Additionally, this handler cross-verifies the payment amount against our
 * stored transaction record to detect tampered webhook payloads.
 */
async function handleTelebirrWebhook(
  req: import("express").Request,
  res: import("express").Response,
) {
  const rawBody = req.body as Buffer;

  // 1. Verify signature (extracted from body by the client's verifyWebhookSignature)
  const client = getProviderClient("TELEBIRR");
  const isValid = client.verifyWebhookSignature({
    rawBody,
    signatureHeader: undefined,
  });

  if (!isValid) {
    logger.warn("Telebirr webhook signature verification failed â€” rejecting.");
    return res.status(401).json({ code: -1, msg: "INVALID_SIGNATURE" });
  }

  // 2. Parse the body
  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody.toString("utf8"));
  } catch {
    return res.status(400).json({ code: -1, msg: "INVALID_JSON" });
  }

  // 3. Extract Telebirr-specific fields
  const merchOrderId = String(payload.merch_order_id ?? "");
  const tradeStatus = String(payload.trade_status ?? "");
  const totalAmount = String(payload.total_amount ?? "");
  const currency = String(payload.trans_currency ?? "");

  if (!merchOrderId) {
    logger.warn({ payload }, "Telebirr webhook missing merch_order_id.");
    return res.status(400).json({ code: -1, msg: "MISSING_ORDER_ID" });
  }

  // 4. Map trade_status to our internal status
  const status = mapTelebirrStatus(tradeStatus);

  // A valid provider signature is necessary but not sufficient: bind the
  // signed event to the exact amount/currency we requested before any ledger
  // or escrow state can move.
  if (status === "SUCCESS") {
    const escrowPayment = await prisma.paymentTransaction.findUnique({
      where: { providerTransactionId: merchOrderId },
      select: { provider: true, amountMinor: true },
    });
    const topUp = await prisma.walletTopUp.findUnique({
      where: { providerTransactionId: merchOrderId },
      select: { provider: true, amountMinor: true },
    });
    const expected = escrowPayment ?? topUp;
    const callbackMinor = /^\d+(\.\d{1,2})?$/.test(totalAmount)
      ? Math.round(Number(totalAmount) * 100)
      : NaN;
    if (
      !expected || expected.provider !== "TELEBIRR" || currency !== "ETB" ||
      !Number.isSafeInteger(callbackMinor) || callbackMinor !== expected.amountMinor
    ) {
      logger.error({ merchOrderId, currency, totalAmount }, "Telebirr success callback does not match a local ETB order â€” rejecting.");
      return res.status(400).json({ code: -1, msg: "PAYMENT_DETAILS_MISMATCH" });
    }
  }

  logger.info(
    { merchOrderId, tradeStatus, totalAmount, status },
    "Processing Telebirr payment webhook.",
  );

  // 5. Process the webhook through the shared escrow handler
  try {
    // Check if this merch_order_id belongs to a WalletTopUp first
    const isTopUp = await prisma.walletTopUp.findUnique({
      where: { providerTransactionId: merchOrderId },
      select: { id: true },
    });

    if (isTopUp) {
      await handleTopUpWebhook({
        providerTransactionId: merchOrderId,
        status,
        rawPayload: payload,
      });
    } else {
      await handlePaymentWebhook({
        provider: "TELEBIRR",
        providerTransactionId: merchOrderId,
        status,
        rawPayload: payload,
      });
    }

    // 6. Respond with Telebirr's expected success format
    return res.status(200).json({ code: 0, msg: "success" });
  } catch (err) {
    logger.error(
      { err, merchOrderId },
      "Failed to process Telebirr payment webhook",
    );
    return res.status(500).json({ code: -1, msg: "INTERNAL_ERROR" });
  }
}

/**
 * Maps Telebirr trade_status values to our internal payment status.
 */
function mapTelebirrStatus(
  tradeStatus: string,
): "SUCCESS" | "FAILED" | "PENDING" {
  const s = tradeStatus.toLowerCase();
  if (["completed", "success"].includes(s)) return "SUCCESS";
  if (["fail", "failed", "closed", "cancelled"].includes(s)) return "FAILED";
  return "PENDING";
}

function mapProviderStatus(raw: unknown): "SUCCESS" | "FAILED" | "PENDING" {
  const s = String(raw).toLowerCase();
  if (["success", "successful", "completed", "paid"].includes(s))
    return "SUCCESS";
  if (["failed", "declined", "cancelled", "error"].includes(s)) return "FAILED";
  return "PENDING";
}

const rawBodyParser = raw({ type: "*/*", limit: "1mb" });

// Telebirr uses a dedicated handler (body-embedded RSA-PSS signature)
webhooksRouter.post(
  "/telebirr",
  webhookLimiter,
  rawBodyParser,
  handleTelebirrWebhook,
);

// CBE uses the generic handler (HTTP-header-based HMAC signature).
// PAY-002: Chapa was removed from the approved payment architecture â€”
// its webhook route and client adapter were deleted in the 2026-08-26
// unification (see migrations/20260826090000_tms_rules_and_chapa_removal).
webhooksRouter.post(
  "/cbe",
  webhookLimiter,
  rawBodyParser,
  buildWebhookHandler("CBE_BIRR", "x-cbe-signature"),
);
