import { createHmac } from "node:crypto";
import { BotContext } from "../types.js";
import { logger } from "../../../lib/logger.js";
import { env } from "../../../config/env.js";

/**
 * Stable pseudonym for a Telegram id, safe to write to logs.
 *
 * Telegram user ids are ~10 digits, so a bare SHA-256 of one is trivially
 * brute-forced back to the id — a plain hash would be no better than logging the
 * number. HMAC-ing with a server-side secret makes the mapping irreversible
 * without the key, while still letting us correlate one member's log lines
 * together.
 *
 * Reuses JWT_ACCESS_SECRET rather than introducing a new variable: it is
 * already present in every environment, and its job (keying a secret-derived
 * transformation) is exactly this.
 */
export function hashUserId(id: bigint | number | string | undefined | null): string | undefined {
  if (id === undefined || id === null || id === "") return undefined;
  return createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(String(id))
    .digest("hex")
    .slice(0, 16);
}

/**
 * The command name from an inbound text, or undefined for free text.
 *
 * Deliberately narrow. Message bodies are user-authored and routinely contain
 * things that must never reach a log file: one-time sign-in codes, a PKCE
 * challenge (`/start wl_<sid>`), a phone number, a pasted document. Only a
 * leading slash-command qualifies, and only the command word itself is kept —
 * any arguments are discarded, because the argument is exactly where the secret
 * lives.
 */
export function safeCommandName(text: string | undefined): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return undefined;
  const word = trimmed.slice(1).split(/[\s@]/, 1)[0];
  if (!word) return undefined;
  // Bound the length so a crafted 10k-character "command" cannot bloat the log.
  return word.slice(0, 64);
}

export async function loggingMiddleware(
  ctx: BotContext,
  next: () => Promise<void>,
) {
  const start = Date.now();
  // Defensive: requireChatSession() already stops chat-less updates, but
  // touching ctx.session without a session key throws and would take this
  // middleware (and therefore every handler) down with it.
  const userId = ctx.session?.telegramUserId;
  const chatId = ctx.session?.telegramChatId;
  const username = ctx.from?.username;

  const updateType = getUpdateType(ctx.update);
  const updateId = ctx.update.update_id;

  logger.debug(
    {
      updateId,
      type: updateType,
      // Hashed, never raw: a log line must not be enough to enumerate members.
      userHash: hashUserId(userId),
      chatHash: hashUserId(chatId),
      // A username is public-ish but still identifies a person; the hash is
      // enough to correlate, so the handle is not recorded.
      usernameHash: hashUserId(username),
      command: safeCommandName(ctx.message?.text),
      // callback_data is NOT logged: it embeds filter state, pagination and
      // one-time action tokens.
      scene: ctx.session.scene,
    },
    "Incoming update",
  );

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    logger.info(
      {
        updateId,
        type: updateType,
        userHash: hashUserId(userId),
        durationMs: duration,
        scene: ctx.session.scene,
      },
      "Update processed",
    );
  }
}

function getUpdateType(update: any): string {
  if (update.message) return "message";
  if (update.edited_message) return "edited_message";
  if (update.callback_query) return "callback_query";
  if (update.inline_query) return "inline_query";
  if (update.chosen_inline_result) return "chosen_inline_result";
  if (update.shipping_query) return "shipping_query";
  if (update.pre_checkout_query) return "pre_checkout_query";
  if (update.poll) return "poll";
  if (update.poll_answer) return "poll_answer";
  if (update.my_chat_member) return "my_chat_member";
  if (update.chat_member) return "chat_member";
  if (update.chat_join_request) return "chat_join_request";
  return "unknown";
}
