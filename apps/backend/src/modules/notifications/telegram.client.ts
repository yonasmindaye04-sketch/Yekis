// === IMPORTS ===
import { logger } from "../../lib/logger.js";
import { getBot } from "../bot/bot.service.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Uses the Grammy bot instance to push notifications directly to users
 * on Telegram. The user must have a linked telegramChatId in the DB.
 */

// === MAIN FUNCTIONS ===

/**
 * Sends a 6-digit verification code to a user via the Telegram bot.
 *
 * Used as a fallback delivery channel when SMS is not configured. The
 * recipient is identified by their Telegram chat ID, which the bot has
 * access to after any prior interaction. The bot must already be
 * running (TELEGRAM_BOT_TOKEN set) for this to succeed.
 *
 * The message text is intentionally plain — no emoji, no formatting — to
 * comply with the zero-emoji rule and to keep the code readable on every
 * Telegram client.
 */
export async function sendVerificationCodeViaTelegram(
  telegramChatId: string,
  code: string,
): Promise<{ sent: boolean }> {
  const bot = getBot();
  if (!bot) {
    logger.warn(
      { telegramChatId },
      "Telegram bot is not initialized. Cannot deliver verification code via Telegram.",
    );
    return { sent: false };
  }

  try {
    await bot.api.sendMessage(
      telegramChatId,
      `Your Yekis verification code is ${code}. It expires in 10 minutes. Never share it.`,
    );
    logger.info({ telegramChatId }, "Verification code delivered via Telegram bot");
    return { sent: true };
  } catch (error) {
    logger.error(
      { error, telegramChatId },
      "Failed to deliver verification code via Telegram bot",
    );
    return { sent: false };
  }
}

export async function sendTelegramPush(params: {
  userId: string;
  message: string;
}): Promise<{ sent: boolean }> {
  const bot = getBot();
  if (!bot) {
    logger.warn("Telegram bot is not initialized. Skipping Telegram push.");
    return { sent: false };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
      select: { telegramChatId: true },
    });

    if (!user?.telegramChatId) {
      logger.info(
        { userId: params.userId },
        "User has no Telegram chat ID linked. Skipping push.",
      );
      return { sent: false };
    }

    await bot.api.sendMessage(user.telegramChatId, params.message);
    return { sent: true };
  } catch (error) {
    logger.error(
      { error, userId: params.userId },
      "Failed to send Telegram push notification",
    );
    return { sent: false };
  }
}
