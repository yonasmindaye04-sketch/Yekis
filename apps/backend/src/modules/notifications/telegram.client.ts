// === IMPORTS ===
import { logger } from "../../lib/logger.js";
import { getBot } from "../bot/bot.service.js";
import { prisma } from "../../lib/prisma.js";

/**
 * Uses the Grammy bot instance to push notifications directly to users
 * on Telegram. The user must have a linked telegramChatId in the DB.
 */

// === MAIN FUNCTIONS ===
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
      select: { telegramChatId: true }
    });

    if (!user?.telegramChatId) {
      logger.info({ userId: params.userId }, "User has no Telegram chat ID linked. Skipping push.");
      return { sent: false };
    }

    await bot.api.sendMessage(user.telegramChatId, params.message);
    return { sent: true };
  } catch (error) {
    logger.error({ error, userId: params.userId }, "Failed to send Telegram push notification");
    return { sent: false };
  }
}
