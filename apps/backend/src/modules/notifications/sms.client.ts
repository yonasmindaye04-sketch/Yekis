// === IMPORTS ===
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

/**
 * SMSEthiopia SMS delivery.
 *
 * API contract, from the provider's own developer docs
 * (https://smsethiopia.com/developer-docs.txt, April 2026):
 *
 *   POST https://smsethiopia.com/api/sms/send
 *   Headers: KEY: <api key>, Content-Type: application/json
 *   Body:    { "msisdn": "251911234567", "text": "..." }
 *   Success: 200 with { "sent": true, "id": 0, "description": "..." }
 *
 * Deliberately NOT used, because the provider docs call them out as the common
 * hallucination: `Authorization: Bearer`, `api.smsethiopia.com`, `/api/send`,
 * and `sender` / `from` / `username` / `password` body fields. Authentication
 * is the custom `KEY` header and the body carries exactly two fields.
 *
 * Only used for CRITICAL_NOTIFICATION_TYPES (see notification.service.ts) and
 * for phone-verification codes -- events that matter even if the user is not
 * looking at the app.
 */

const SEND_URL = "https://smsethiopia.com/api/sms/send";
/**
 * A hung provider connection must not hold an HTTP request open indefinitely --
 * for phone verification the user is waiting on the response. 10s is well
 * inside the provider's own sub-second delivery claim while still bounding the
 * worst case.
 */
const REQUEST_TIMEOUT_MS = 10_000;

export interface SmsResult {
  sent: boolean;
  /** Present only on failure, for logs. Never contains the message body. */
  reason?: string;
}

/**
 * msisdn must be 251XXXXXXXXX with no plus sign. Sending a malformed number
 * wastes quota and, worse, means a code the user never received is treated as
 * delivered -- which is how people lose access to an account.
 */
function toMsisdn(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (!/^251[1-9]\d{8}$/.test(digits)) return null;
  return digits;
}

export async function sendSms(params: {
  phone: string;
  message: string;
}): Promise<SmsResult> {
  if (!env.SMS_ETHIOPIA_API_KEY) {
    logger.warn(
      { phone: params.phone },
      "SMS_ETHIOPIA_API_KEY not set - logging instead of sending. Configure to enable real SMS.",
    );
    return { sent: false, reason: "not_configured" };
  }

  const msisdn = toMsisdn(params.phone);
  if (!msisdn) {
    logger.error({ phone: params.phone }, "Refusing to send SMS to a malformed number");
    return { sent: false, reason: "invalid_msisdn" };
  }

  try {
    const response = await fetch(SEND_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        KEY: env.SMS_ETHIOPIA_API_KEY,
      },
      body: JSON.stringify({ msisdn, text: params.message }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Logged truncated and unparsed: the body is provider-controlled text and
      // is not a place to echo anything back verbatim.
      const detail = (await response.text()).slice(0, 200);
      logger.error(
        { status: response.status, detail },
        "SMSEthiopia API error",
      );
      return { sent: false, reason: `http_${response.status}` };
    }

    /**
     * A 200 is NOT sufficient. The provider's success body carries
     * `"sent": true`, and a 200 with `"sent": false` is a rejection. Treating
     * HTTP status alone as confirmation is how a phone-verification code ends
     * up reported as delivered to a user who never received it.
     */
    const body = (await response.json().catch(() => null)) as {
      sent?: unknown;
      description?: unknown;
    } | null;

    if (body?.sent !== true) {
      logger.error(
        { description: typeof body?.description === "string" ? body.description.slice(0, 120) : undefined },
        "SMSEthiopia accepted the request but did not confirm delivery",
      );
      return { sent: false, reason: "not_confirmed" };
    }

    return { sent: true };
  } catch (error) {
    const aborted =
      error instanceof Error &&
      (error.name === "TimeoutError" || error.name === "AbortError");
    logger.error(
      { error: aborted ? "timeout" : "network_or_unknown" },
      "Failed to send SMS via SMSEthiopia",
    );
    return { sent: false, reason: aborted ? "timeout" : "network_error" };
  }
}