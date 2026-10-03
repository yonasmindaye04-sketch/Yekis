import { BotContext } from "../types.js";
import { logger } from "../../../lib/logger.js";

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

  // Log incoming update
  const updateType = getUpdateType(ctx.update);
  const updateId = ctx.update.update_id;

  logger.debug(
    {
      updateId,
      type: updateType,
      userId,
      chatId,
      username,
      command: ctx.message?.text?.split(" ")[0],
      callbackData: ctx.callbackQuery?.data,
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
        userId,
        chatId,
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
