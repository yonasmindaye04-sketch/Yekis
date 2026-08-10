// === IMPORTS ===
import { Router, raw } from "express";
import rateLimit from "express-rate-limit";
import type { PaymentProvider } from "@marketplace/schemas";
import { getProviderClient, handlePaymentWebhook } from "./escrow.service.js";
import { logger } from "../../lib/logger.js";

export const webhooksRouter = Router();

// Stricter, provider-specific rate limit — separate from the general /api
// limit, since these are unauthenticated-by-design endpoints and a more
// likely abuse target.
const webhookLimiter = rateLimit({ windowMs: 60 * 1000, max: 120, standardHeaders: true, legacyHeaders: false });


// === MAIN FUNCTIONS ===
function buildWebhookHandler(provider: PaymentProvider, signatureHeaderName: string) {
  return async (req: import("express").Request, res: import("express").Response) => {
    const rawBody = req.body as Buffer; // populated by express.raw() below, NOT parsed JSON
    const signatureHeader = req.headers[signatureHeaderName] as string | undefined;

    const client = getProviderClient(provider);
    const isValid = client.verifyWebhookSignature({ rawBody, signatureHeader });

    if (!isValid) {
      logger.warn({ provider }, "Webhook signature verification failed — rejecting.");
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
    // once sandbox credentials exist) — this mapping is the one thing that
    // WILL need adjusting per real provider docs, everything around it
    // (signature check, idempotency, state transition) will not.
    try {
      await handlePaymentWebhook({
        provider,
        providerTransactionId: String(payload.transaction_id ?? payload.tx_ref ?? ""),
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

function mapProviderStatus(raw: unknown): "SUCCESS" | "FAILED" | "PENDING" {
  const s = String(raw).toLowerCase();
  if (["success", "successful", "completed", "paid"].includes(s)) return "SUCCESS";
  if (["failed", "declined", "cancelled", "error"].includes(s)) return "FAILED";
  return "PENDING";
}

const rawBodyParser = raw({ type: "*/*", limit: "1mb" });

webhooksRouter.post("/telebirr", webhookLimiter, rawBodyParser, buildWebhookHandler("TELEBIRR", "x-telebirr-signature"));
webhooksRouter.post("/chapa", webhookLimiter, rawBodyParser, buildWebhookHandler("CHAPA", "x-chapa-signature"));
webhooksRouter.post("/cbe", webhookLimiter, rawBodyParser, buildWebhookHandler("CBE_BIRR", "x-cbe-signature"));
