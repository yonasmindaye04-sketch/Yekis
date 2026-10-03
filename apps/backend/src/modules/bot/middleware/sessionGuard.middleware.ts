import { Bot } from "grammy";
import { BotContext } from "../types.js";
import { logger } from "../../../lib/logger.js";

/**
 * Refuses updates that grammY cannot give a session for.
 *
 * grammY derives the session key from the originating chat. Updates without one
 * — inline-mode callback queries, inline queries — have no key, and merely
 * TOUCHING `ctx.session` then throws:
 *
 *   Error in middleware: Cannot access session data because this update does
 *   not belong to a chat, so the session key is undefined!
 *
 * Because the logging, rate-limit, scene-timeout and auth middleware all read
 * the session, that single throw aborted the whole chain and the member saw
 * only "Something went wrong. Please try again." — with no indication that
 * inline mode is simply unsupported.
 *
 * This guard runs immediately after the session plugin so the chain never
 * reaches session-dependent code for such an update, and tells the member
 * plainly what to do instead.
 */
export function requireChatSession() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    // `ctx.chat` is exactly what grammY uses to derive the session key.
    if (!ctx.chat) {
      logger.warn(
        { updateType: Object.keys(ctx.update)[0] },
        "Ignoring update with no chat (no session key): inline mode is not supported",
      );

      const notice =
        "This action needs to run inside our chat with the bot. " +
        "Open @ye_kis_bot and send /start there, then use the buttons.";

      try {
        // A callback query can be answered even without a chat — Telegram shows
        // it as an alert. This is the ONLY channel available in inline mode,
        // since ctx.reply needs a chat to send into.
        if (ctx.callbackQuery) {
          await ctx.answerCallbackQuery({ text: notice, show_alert: true });
        } else if (ctx.inlineQuery) {
          // Nothing sensible to return for an inline result.
          await ctx.answerInlineQuery([], { cache_time: 0 });
        } else {
          await ctx.reply(notice);
        }
      } catch {
        // Never let the guard itself break the update pipeline.
      }
      return;
    }

    await next();
  };
}

/**
 * Registers the guard on a bot. Kept separate so it can be unit-tested.
 */
export function installChatSessionGuard(bot: Bot<BotContext>) {
  bot.use(requireChatSession());
}