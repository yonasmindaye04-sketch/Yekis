import { BotContext } from "../types.js";
import { logger } from "../../../lib/logger.js";
import { safeCommandName, hashUserId } from "./logging.middleware.js";

/**
 * Reads the signed-in user id without making the error handler itself fragile.
 *
 * `ctx.session` is a getter that throws when grammY cannot derive a session
 * key. This boundary runs OUTSIDE the session middleware, so an error raised
 * there would otherwise escape while the boundary was trying to report it.
 */
function readSessionUserId(ctx: BotContext): string | undefined {
  try {
    return ctx.chat ? ctx.session.userId : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Outermost error boundary for the update pipeline.
 *
 * WHY THIS EXISTS
 *
 * grammY's `bot.catch` only guards the BATCH API. `Bot.handleUpdates()` (used
 * by long polling) catches a failed update and routes it to the error handler,
 * but the WEBHOOK adapter calls `Bot.handleUpdate()` directly, and that call
 * is not wrapped: an error thrown by any middleware or handler propagates out
 * of the adapter, out of the Express route, and the endpoint answers HTTP 500.
 *
 * Telegram treats a 5xx as "the delivery failed" and RETRIES the same update,
 * forever. The member's message is re-delivered, the handler throws again, and
 * the bot answers nothing at all — the symptom is "the bot is not responding
 * at all", with the member stuck in a retry loop that never produces a reply.
 *
 * That is exactly what happened in production: the bot received `/help`,
 * tried to answer with the raw translation key `help_commands`, Telegram
 * rejected the formatting (an unterminated `_` is invalid Markdown), grammY
 * raised a BotError, the webhook answered 500, and Telegram kept redelivering
 * the same update every few seconds.
 *
 * WHAT THIS DOES
 *
 * The error is caught at the outermost level, logged with the same context the
 * existing error handler uses, and the member gets a plain-text apology. The
 * delivery is then acknowledged, so Telegram stops retrying.
 *
 * The apology is sent WITHOUT `parse_mode`: the reply that failed may have
 * failed precisely because of its formatting, and a second formatted reply
 * would fail the same way.
 */
export function errorBoundaryMiddleware() {
  return async (ctx: BotContext, next: () => Promise<void>) => {
    try {
      await next();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));

      logger.error(
        {
          errorName: error.name,
          errorMessage: error.message,
          updateId: ctx.update?.update_id,
          updateType: Object.keys(ctx.update ?? {}).find(
            (k) => k !== "update_id",
          ),
          // Only a slash-command name is recorded, never the message body:
          // free text carries one-time codes, the PKCE sid and pasted
          // documents.
          command: safeCommandName(ctx.message?.text),
          // Hashed so a log line cannot be used to enumerate members.
          // `ctx.from` is safe even when no session could be created.
          telegramUserHash: hashUserId(ctx.from?.id),
          userId: readSessionUserId(ctx),
          stack: error.stack,
        },
        `Bot error in update ${ctx.update?.update_id}: [${error.name}] ${error.message}`,
      );

      try {
        const translated =
          typeof ctx.t === "function" ? ctx.t("errors_generic") : "";
        const message =
          translated && translated !== "errors_generic"
            ? translated
            : "Something went wrong. Please try again.";
        await ctx.reply(message, { parse_mode: undefined });
      } catch (replyErr) {
        logger.warn(
          {
            replyErr:
              replyErr instanceof Error ? replyErr.message : String(replyErr),
          },
          "Failed to send error reply to user",
        );
      }
    }
  };
}
