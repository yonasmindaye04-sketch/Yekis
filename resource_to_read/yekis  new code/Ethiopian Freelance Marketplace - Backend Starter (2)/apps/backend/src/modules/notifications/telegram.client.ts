import { logger } from "../../lib/logger.js";

/**
 * STUB — the Telegram bot itself doesn't exist yet (see the Telegram
 * go-to-market discussion). Once it does, this becomes a thin wrapper
 * around the bot's own sendMessage call, keyed by the user's stored
 * Telegram chat ID (a field that doesn't exist on User yet either — add it
 * when the bot's account-linking flow is built).
 *
 * Kept as its own client (rather than folded into sms.client.ts) since the
 * two are genuinely different channels with different delivery guarantees,
 * even though both are currently stubs.
 */
export async function sendTelegramPush(params: {
  userId: string;
  message: string;
}): Promise<{ sent: boolean }> {
  logger.warn(
    { userId: params.userId },
    "Telegram bot not yet built — logging instead of sending. Do not deploy this to production."
  );
  return { sent: false };
}
