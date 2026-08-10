// === IMPORTS ===
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";

/**
 * Uses SMSEthiopia API to send SMS notifications.
 *
 * Only called for CRITICAL_NOTIFICATION_TYPES (see notification.service.ts)
 * — per the roadmap, SMS is reserved for events that matter even if the
 * user isn't looking at the app: escrow funded, dispute raised, payout sent.
 */

// === MAIN FUNCTIONS ===
export async function sendSms(params: { phone: string; message: string }): Promise<{ sent: boolean }> {
  if (!env.SMS_ETHIOPIA_API_KEY) {
    logger.warn(
      { phone: params.phone },
      "SMS_ETHIOPIA_API_KEY not set — logging instead of sending. Configure to enable real SMS."
    );
    return { sent: false };
  }

  try {
    const response = await fetch("https://smsethiopia.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "KEY": env.SMS_ETHIOPIA_API_KEY,
      },
      body: JSON.stringify({
        msisdn: params.phone.replace("+", ""), // SMSEthiopia expects numbers like 251911234567
        text: params.message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error({ status: response.status, errorText }, "SMSEthiopia API error");
      return { sent: false };
    }

    return { sent: true };
  } catch (error) {
    logger.error({ error }, "Failed to send SMS via SMSEthiopia");
    return { sent: false };
  }
}

