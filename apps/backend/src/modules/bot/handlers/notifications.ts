import { Bot } from "grammy";
import { BotContext } from "../types.js";
import { prisma } from "../../../lib/prisma.js";
import { logger } from "../../../lib/logger.js";
import { formatNotification } from "../formatters/index.js";
import { webAppRoutes } from "../utils/deepLink.js";

interface NotificationPayload {
  userId: string;
  event: string;
  data: Record<string, any>;
}

/**
 * Send a notification to a user via Telegram
 * Handles bot-blocked users, rate limits, and language preferences
 */
export async function sendNotification(
  bot: Bot<BotContext>,
  payload: NotificationPayload
): Promise<{ sent: boolean; error?: string }> {
  const { userId, event, data } = payload;

  try {
    // Fetch user with notification preferences and chat ID
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        telegramChatId: true,
        languagePreference: true,
        notificationSettings: true,
      },
    });

    if (!user?.telegramChatId) {
      logger.debug({ userId }, "User has no telegramChatId, skipping notification");
      return { sent: false, error: "no_chat_id" };
    }

    // Check user notification preferences
    const settings = user.notificationSettings as Record<string, boolean> | null;
    if (settings) {
      const category = getEventCategory(event);
      if (settings[category] === false) {
        logger.debug({ userId, event, category }, "Notification disabled by user preference");
        return { sent: false, error: "disabled_by_user" };
      }
    }

    // Build message with user's language
    const locale = user.languagePreference === "am" ? "am" : "en";
    const message = formatNotification(event, data, { i18n: { t: (k: string) => k, locale } as any } as BotContext);

    // Determine deep link if applicable
    const deepLink = getDeepLink(event, data);

    // Send message
    await bot.api.sendMessage(user.telegramChatId, message, {
      parse_mode: "MarkdownV2",
      ...(deepLink && {
        reply_markup: {
          inline_keyboard: [[{ text: "View", web_app: { url: deepLink } }]],
        },
      }),
    });

    return { sent: true };
  } catch (error: any) {
    // Handle bot blocked (403) or chat not found
    if (error?.error_code === 403 || error?.description?.includes("blocked")) {
      logger.warn({ userId, error: error.message }, "User blocked bot, clearing telegramChatId");
      await prisma.user.update({
        where: { id: userId },
        data: { telegramChatId: null },
      }).catch(() => {});
      return { sent: false, error: "bot_blocked" };
    }

    // Handle chat not found
    if (error?.error_code === 400 && error?.description?.includes("chat not found")) {
      await prisma.user.update({
        where: { id: userId },
        data: { telegramChatId: null },
      }).catch(() => {});
      return { sent: false, error: "chat_not_found" };
    }

    logger.error({ userId, event, error }, "Failed to send notification");
    return { sent: false, error: error?.message || "unknown_error" };
  }
}

/**
 * Map event type to notification category for user preferences
 */
function getEventCategory(event: string): keyof NonNullable<BotContext["session"]["notificationSettings"]> {
  const categoryMap: Record<string, keyof NonNullable<BotContext["session"]["notificationSettings"]>> = {
    "job.new_match": "jobs",
    "job.applied": "jobs",
    "proposal.received": "proposals",
    "proposal.accepted": "proposals",
    "proposal.rejected": "proposals",
    "proposal.shortlisted": "proposals",
    "escrow.funded": "escrow",
    "milestone.submitted": "escrow",
    "milestone.auto_release_warning": "escrow",
    "milestone.released": "escrow",
    "milestone.refunded": "escrow",
    "dispute.raised": "disputes",
    "dispute.mediation_proposal": "disputes",
    "dispute.resolved": "disputes",
    "wallet.topup_approved": "wallet",
    "wallet.withdrawal_completed": "wallet",
    "wallet.withdrawal_failed": "wallet",
    "kyc.status_changed": "kyc",
    "kyc.tier2_approved": "kyc",
  };
  return categoryMap[event] || "escrow";
}

/**
 * Get deep link URL for notification based on event
 */
function getDeepLink(event: string, data: Record<string, any>): string | null {
  const linkMap: Record<string, (data: Record<string, any>) => string | null> = {
    "job.new_match": (d) => webAppRoutes.jobDetail(d.jobId),
    "job.applied": (d) => webAppRoutes.jobDetail(d.jobId),
    "proposal.received": (d) => webAppRoutes.proposals(d.jobId),
    "proposal.accepted": (d) => webAppRoutes.contract(d.contractId),
    "proposal.shortlisted": (d) => webAppRoutes.proposals(d.jobId),
    "escrow.funded": (d) => webAppRoutes.contract(d.contractId),
    "milestone.submitted": (d) => webAppRoutes.contract(d.contractId),
    "milestone.auto_release_warning": (d) => webAppRoutes.contract(d.contractId),
    "milestone.released": (d) => webAppRoutes.contract(d.contractId),
    "dispute.raised": (d) => webAppRoutes.staffDisputeMediation(d.disputeId),
    "dispute.mediation_proposal": (d) => webAppRoutes.contract(d.contractId),
    "wallet.topup_approved": (d) => webAppRoutes.wallet(),
    "wallet.withdrawal_completed": (d) => webAppRoutes.wallet(),
    "kyc.status_changed": (d) => webAppRoutes.kyc(),
    "kyc.tier2_approved": (d) => webAppRoutes.kyc(),
  };

  const builder = linkMap[event];
  return builder ? builder(data) : null;
}

/**
 * Send notification to multiple users (broadcast)
 */
export async function sendBroadcast(
  bot: Bot<BotContext>,
  userIds: string[],
  event: string,
  data: Record<string, any>,
  concurrency = 10
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Process in batches to avoid rate limits
  for (let i = 0; i < userIds.length; i += concurrency) {
    const batch = userIds.slice(i, i + concurrency);
    const results = await Promise.all(
      batch.map((userId) => sendNotification(bot, { userId, event, data }))
    );

    for (const result of results) {
      if (result.sent) sent++;
      else failed++;
    }

    // Small delay between batches
    if (i + concurrency < userIds.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return { sent, failed };
}

/**
 * Send notification to all staff members
 */
export async function notifyStaff(
  bot: Bot<BotContext>,
  event: string,
  data: Record<string, any>
): Promise<{ sent: number; failed: number }> {
  const staff = await prisma.user.findMany({
    where: {
      staffRole: { in: ["COMPLIANCE_OFFICER", "ADMIN"] },
      telegramChatId: { not: null },
    },
    select: { id: true },
  });

  return sendBroadcast(bot, staff.map((s) => s.id), event, data);
}
