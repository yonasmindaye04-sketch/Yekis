import { logger } from "../../lib/logger.js";

/**
 * STUB — no SMS gateway has been selected yet (this is a Product/Finance
 * decision — options include Ethio Telecom's bulk SMS API or a third-party
 * aggregator). Structured the same way as fayda.client.ts and pep.client.ts:
 * swap the implementation, keep the signature.
 *
 * Only called for CRITICAL_NOTIFICATION_TYPES (see notification.service.ts)
 * — per the roadmap, SMS is reserved for events that matter even if the
 * user isn't looking at the app: escrow funded, dispute raised, payout sent.
 */
export async function sendSms(params: { phone: string; message: string }): Promise<{ sent: boolean }> {
  logger.warn(
    { phone: params.phone },
    "SMS gateway not yet selected — logging instead of sending. Do not deploy this to production."
  );
  return { sent: false };
}
