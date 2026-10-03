import { Bot, session, webhookCallback } from "grammy";
import { conversations } from "@grammyjs/conversations";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import {
  createRedisSessionStorage,
  createInitialSessionData,
} from "./utils/sessionStorage.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { requireChatSession } from "./middleware/sessionGuard.middleware.js";
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

/**
 * Per-call budget for ordinary Bot API methods.
 *
 * WHY THIS EXISTS: Node's fetch has no default timeout, so when api.telegram.org
 * is unreachable in a way that blackholes the connection (a firewall DROP, a
 * dead DNS route — no RST, just silence) the request promise NEVER settles.
 * `startBot()` awaits `getMe()` before starting polling, so a single blackholed
 * request meant polling never began and the bot silently answered nothing — no
 * error, no log line, no `/command` ever reaching a handler. Every call is now
 * bounded so that failure mode becomes a fast, loud, typed error instead.
 */
const API_CALL_TIMEOUT_MS = env.TELEGRAM_API_TIMEOUT_MS ?? 10_000;

/**
 * Long polling intentionally holds a getUpdates request open for ~30s, so it
 * needs a budget comfortably above that. Applying the short control timeout to
 * it would abort every poll cycle and starve the bot.
 */
const LONG_POLLING_METHODS = new Set(["getUpdates"]);
const POLL_CALL_TIMEOUT_MS = API_CALL_TIMEOUT_MS + 35_000;

/**
 * Rejects with a TelegramApiTimeoutError if `promise` has not settled in time.
 * Used for call sites outside the grammY transformer (health checks, probes).
 */
export async function withApiTimeout<T>(
  label: string,
  promise: Promise<T>,
  timeoutMs: number = API_CALL_TIMEOUT_MS,
): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new TelegramApiTimeoutError(
                `${label} did not respond within ${timeoutMs}ms`,
              ),
            ),
          timeoutMs,
        );
        // Don't hold the event loop open just for this timer.
        timer.unref?.();
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export class TelegramApiTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TelegramApiTimeoutError";
  }
}

/**
 * Applies the timeout to every Bot API call grammY makes.
 */
function applyApiTimeout(bot: Bot<BotContext>) {
  bot.api.config.use(async (prev, method, payload, signal) => {
    const budget = LONG_POLLING_METHODS.has(method)
      ? POLL_CALL_TIMEOUT_MS
      : API_CALL_TIMEOUT_MS;

    const controller = new AbortController();
    // grammY's typings still reference the `abort-controller` package's
    // AbortSignal and `reason` postdates the lib.dom available here, so this one
    // boundary is bridged structurally rather than nominally.
    const callerSignal = signal as unknown as {
      aborted?: boolean;
      reason?: unknown;
      addEventListener?: (t: "abort", fn: () => void, o?: { once?: boolean }) => void;
      removeEventListener?: (t: "abort", fn: () => void) => void;
    } | null;

    const onCallerAbort = () => controller.abort(callerSignal?.reason);
    if (callerSignal) {
      if (callerSignal.aborted) controller.abort(callerSignal.reason);
      else
        callerSignal.addEventListener?.("abort", onCallerAbort, {
          once: true,
        });
    }

    const timer = setTimeout(
      () =>
        controller.abort(
          new TelegramApiTimeoutError(
            `Telegram API ${method} did not respond within ${budget}ms`,
          ),
        ),
      budget,
    );
    timer.unref?.();

    try {
      return await prev(
        method,
        payload,
        controller.signal as unknown as NonNullable<
          Parameters<typeof prev>[2]
        >,
      );
    } finally {
      clearTimeout(timer);
      callerSignal?.removeEventListener?.("abort", onCallerAbort);
    }
  });
}

export function createBot(): Bot<BotContext> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    throw new Error("TELEGRAM_BOT_TOKEN is not configured");
  }

  const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);
  applyApiTimeout(bot);

  // Session storage (Redis with versioning)
  const sessionStorage = createRedisSessionStorage();
  bot.use(
    session({
      initial: () => createInitialSessionData(),
      storage: sessionStorage,
    }),
  );

  // Must come immediately after the session plugin and before ANY middleware
  // that reads ctx.session: an update with no chat has no session key, and
  // touching ctx.session throws, which would abort the entire chain.
  bot.use(requireChatSession());

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
    logger.error(
      {
        err: err.error,
        updateId: ctx?.update?.update_id,
        method: (ctx as any)?.match,
      },
      `Error handling update ${ctx?.update?.update_id}`,
    );

    // Try to notify user
    try {
      await ctx?.reply(ctx.t("errors_generic") || "Something went wrong. Please try again.");
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

/**
 * Verifies the bot token with the Bot API, retrying transient failures.
 *
 * Connectivity to api.telegram.org is unreliable on typical dev/corporate
 * networks (intermittent connect timeouts, not refusals). Treating the FIRST
 * timeout as fatal left the bot permanently dead with no way to recover short
 * of a restart, and no error the user could act on beyond "it doesn't work".
 */
async function verifyBotIdentity(
  bot: Bot<BotContext>,
  attempts = 3,
): Promise<{ ok: true; username: string } | { ok: false; timedOut: boolean; message: string }> {
  let lastTimedOut = false;
  let lastMessage = "unknown error";

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const me = await bot.api.getMe();
      return { ok: true, username: me.username };
    } catch (err: any) {
      const message = err?.message || String(err);
      lastMessage = message;
      lastTimedOut =
        err instanceof TelegramApiTimeoutError ||
        err?.name === "TelegramApiTimeoutError" ||
        err?.name === "AbortError" ||
        err?.name === "TimeoutError" ||
        /timeout/i.test(message);

      // A rejected token will never become valid; do not retry that.
      if (/Unauthorized|401|invalid token/i.test(message)) {
        return { ok: false, timedOut: false, message };
      }

      if (attempt < attempts) {
        const backoff = 1000 * 2 ** (attempt - 1);
        logger.warn(
          { attempt, attempts, backoffMs: backoff, error: message },
          "Telegram Bot API unreachable — retrying",
        );
        await new Promise((resolve) => setTimeout(resolve, backoff));
      }
    }
  }

  return { ok: false, timedOut: lastTimedOut, message: lastMessage };
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

  const identity = await verifyBotIdentity(bot);
  if (!identity.ok) {
    logger.error(
      { error: identity.message, timedOut: identity.timedOut },
      identity.timedOut
        ? "Telegram Bot API is UNREACHABLE after retries (no response). The bot " +
          "cannot receive updates and will not answer any command. Check outbound " +
          "access to api.telegram.org, any firewall/proxy, and DNS. The rest of " +
          "the platform is unaffected."
        : "Telegram bot token validation failed. Bot will not start. Verify " +
          "TELEGRAM_BOT_TOKEN in .env.",
    );
    return false;
  }

  try {
    // 1. Chat menu button.
    //
    // Telegram PERSISTS this server-side. If a previous session pointed it at a
    // tunnel that is now dead, the menu button keeps launching a Mini App that
    // cannot load — which looks exactly like "the Mini App is crashing". So we
    // always reconcile it: set it when the origin is publicly reachable, and
    // explicitly RESET it to the commands menu when it is not. Skipping the
    // call is not enough, because the stale value survives.
    const menuButtonUrl = buildPublicWebAppUrl("/");
    if (menuButtonUrl) {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "Open Yekis Jobs",
          web_app: { url: menuButtonUrl },
        },
      });
      logger.info({ menuButtonUrl }, "Chat menu button -> Mini App");
    } else {
      await bot.api.setChatMenuButton({ menu_button: { type: "commands" } });
      logger.warn(
        { frontendUrl: env.FRONTEND_URL },
        "FRONTEND_URL is not a public https origin, so the Mini App menu button " +
          "was RESET to the commands menu. Telegram requires https for web_app " +
          "buttons, and any previously configured (possibly dead) tunnel URL " +
          "would otherwise keep launching a Mini App that cannot load. Set " +
          "FRONTEND_URL to your public origin to re-enable it.",
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
      // drop_pending_updates MUST stay false here. Any message a member sent
      // while the bot was restarting is queued by Telegram; discarding it makes
      // the bot look dead ("it doesn't answer any command") because their
      // /start simply vanished. Replaying them is the correct behaviour.
      await bot.api.deleteWebhook({ drop_pending_updates: false });
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
