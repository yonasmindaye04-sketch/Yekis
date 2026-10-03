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
import {
  buildPublicWebAppUrl,
  isPublicFrontendUrl,
} from "./utils/deepLink.js";

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

  // Every "open the web app" link the bot emits is built from FRONTEND_URL.
  // If it points somewhere a member's phone cannot reach, say so once, loudly,
  // at boot — previously the bot silently substituted a hardcoded domain and
  // members got "site can't be reached" with no clue why.
  if (!isPublicFrontendUrl()) {
    logger.warn(
      { frontendUrl: env.FRONTEND_URL },
      "FRONTEND_URL is not a public https origin. Bot web links will only work " +
        "for someone on the same machine/network. Set FRONTEND_URL to your " +
        "public origin (an https tunnel works for local testing) before " +
        "releasing the bot to members.",
    );
  }

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
    const menuButtonUrl = buildPublicWebAppUrl("/");
    if (menuButtonUrl) {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "Open Yekis Jobs",
          web_app: { url: menuButtonUrl },
        },
      });
    } else {
      logger.warn(
        { frontendUrl: env.FRONTEND_URL },
        "Skipping Web App menu button: FRONTEND_URL is not a public https origin " +
          "(Telegram rejects localhost/LAN/http for web_app buttons). Set " +
          "FRONTEND_URL to your public origin, e.g. via an https tunnel, to enable it.",
      );
    }

    // 2. Set Commands for Autocompletion
    await bot.api.setMyCommands([
      { command: "start", description: "Sign in and open the Mini App" },
      { command: "login", description: "Get a one-time code to sign in on the web" },
      { command: "account", description: "Show which Yekis account you are signed in as" },
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
      "Yekis Jobs — Ethiopia's escrow-protected freelance marketplace.\n\n" +
        "Press Start to sign in. This bot IS your account: you can browse jobs, " +
        "track contracts, check your wallet and complete KYC right here.\n\n" +
        "Need the web app? Tap \"Sign in on the web\" after /start and you'll be " +
        "signed in automatically — no password needed.",
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
