import { NextFunction } from "grammy";
import { BotContext } from "../types.js";

// H5: Group-chat leakage. Restrict bot to private chats.
export async function privateChatOnlyMiddleware(ctx: BotContext, next: NextFunction) {
  if (ctx.chat && ctx.chat.type !== "private") {
    // Optionally reply to tell them it's disabled in groups, or just drop it silently
    return;
  }
  return next();
}
