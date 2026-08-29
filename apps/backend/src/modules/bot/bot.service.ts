import { Bot, session, webhookCallback } from "grammy";
import { conversations } from "@grammyjs/conversations";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import {
  createRedisSessionStorage,
  createInitialSessionData,
} from "./utils/sessionStorage.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";
import { sceneTimeoutMiddleware } from "./middleware/sceneTimeout.middleware.js";
import { loggingMiddleware } from "./middleware/logging.middleware.js";
import { i18nMiddleware } from "./middleware/i18n.middleware.js";
import { BotContext } from "./types.js";
import { registerCommands } from "./handlers/commands.js";
import { registerCallbacks } from "./handlers/callbacks.js";
import { registerScenes } from "./scenes/index.js";

let botInstance: Bot<BotContext> | null = null;

export function createBot(): Bot<BotContext> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

  // Session storage (Redis with versioning)
  const sessionStorage = createRedisSessionStorage();
  bot.use(
    session({
      initial: () => createInitialSessionData(),
      storage: sessionStorage,
    }),
  );

  // Conversations plugin for scenes
  bot.use(conversations());

  // I18n middleware
  bot.use(i18nMiddleware());

  // Logging middleware (first to capture everything)
  bot.use(loggingMiddleware);

  // Rate limiting
  bot.use(rateLimitMiddleware);

  // Scene timeout enforcement
  bot.use(sceneTimeoutMiddleware);

  // Auth middleware (attaches user, role, KYC to session)
  bot.use(authMiddleware);

  // Error handler
  bot.catch(async (err) => {
    const ctx = err.ctx;
    logger.error(err.error, `Error handling update ${ctx?.update?.update_id}`);

    // Try to notify user
    try {
      const t = ctx?.t ?? ((k: string) => k);
      await ctx?.reply(
        ctx.t("errors_generic") || "Something went wrong. Please try again.",
      );
    } catch {
      // Ignore notification errors
    }
  });

  // Register handlers
  registerCommands(bot);
  registerCallbacks(bot);
  registerScenes(bot);

  botInstance = bot;
  return bot;
}

export function getBot(): Bot<BotContext> | null {
  return botInstance;
}

export async function startBot(): Promise<boolean> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    logger.warn(
      "TELEGRAM_BOT_TOKEN is not configured. Skipping Telegram bot initialization.",
    );
    return false;
  }
  const bot = getBot() || createBot();

  // Pre-flight check: verify bot token validity with Telegram before setting commands or polling
  let me;
  try {
    me = await bot.api.getMe();
  } catch (err: any) {
    logger.warn(
      { error: err?.message || err },
      "Telegram bot token validation failed (Unauthorized/unreachable). Bot will not start. Please verify TELEGRAM_BOT_TOKEN in .env.",
    );
    return false;
  }

  try {
    // 1. Set Chat Menu Button (only works with HTTPS URLs - skip in local dev)
    const frontendUrl = env.FRONTEND_URL || "";
    if (frontendUrl.startsWith("https://")) {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "Open Yekis Jobs",
          web_app: { url: frontendUrl },
        },
      });
    } else {
      logger.info("Skipping Web App menu button in dev (requires HTTPS)");
    }

    // 2. Set Commands for Autocompletion
    await bot.api.setMyCommands([
      { command: "start", description: "Start the bot & open Web App" },
      { command: "menu", description: "Show the main menu panel" },
      { command: "jobs", description: "Browse available jobs" },
      { command: "wallet", description: "View your balance & manage funds" },
      { command: "kyc", description: "Verify your identity" },
      { command: "contracts", description: "View active contracts" },
      { command: "disputes", description: "Manage your cases" },
      { command: "language", description: "Change language (EN/AM)" },
      { command: "help", description: "Show all commands and guides" },
    ]);

    // 3. Set Bot Description (Seen before pressing Start)
    await bot.api.setMyDescription(
      "Welcome to Yekis Jobs! \n\nYour premier Ethiopian freelance marketplace.\n\nWhether you're looking to hire top talent or find your next big gig, we've got you covered with secure escrow payments, KYC verification, and built-in dispute resolution.\n\nHit 'Start' below to begin!",
    );

    // 4. Set Bot Short Description (Seen on profile)
    await bot.api.setMyShortDescription(
      "The trusted Ethiopian Freelance Marketplace.",
    );
  } catch (err) {
    logger.error({ err }, "Failed to configure bot API settings");
  }

  if (env.NODE_ENV === "production" && env.TELEGRAM_WEBHOOK_URL) {
    // Production: Webhook mode
    const secretToken = env.TELEGRAM_WEBHOOK_SECRET;
    await bot.api.setWebhook(env.TELEGRAM_WEBHOOK_URL, {
      secret_token: secretToken,
      allowed_updates: [
        "message",
        "edited_message",
        "callback_query",
        "inline_query",
        "chosen_inline_result",
        "my_chat_member",
        "chat_member",
      ],
      drop_pending_updates: true,
    });
    logger.info(`Bot webhook set to ${env.TELEGRAM_WEBHOOK_URL}`);
  } else {
    try {
      await bot.api.deleteWebhook({ drop_pending_updates: true });
    } catch (e) {
      logger.warn({ err: e }, "Failed to delete webhook, polling might fail");
    }
    bot
      .start({
        onStart: (botInfo) => {
          logger.info(`Bot @${botInfo.username} started in polling mode`);
        },
      })
      .catch((err) => {
        logger.error({ err }, "Telegram bot polling stopped due to error");
      });
  }

  return true;
}

export async function stopBot(): Promise<void> {
  if (botInstance) {
    await botInstance.stop();
    botInstance = null;
    logger.info("Bot stopped");
  }
}

// Export webhook callback for Express integration
export const webhookHandler = (bot: Bot<BotContext>) =>
  webhookCallback(bot, "express");
