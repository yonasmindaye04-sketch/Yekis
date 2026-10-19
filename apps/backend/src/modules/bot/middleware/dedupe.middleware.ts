import { NextFunction } from "grammy";
import { BotContext } from "../types.js";
import { redis } from "../../../lib/redis.js";

// H2: Webhook idempotency. Prevent duplicate update processing.
export async function dedupeMiddleware(ctx: BotContext, next: NextFunction) {
  const updateId = ctx.update.update_id;
  if (!updateId) return next();

  // Mark this update as processed. NX ensures only the first request sets it.
  const key = `telegram_update:${updateId}`;
  const isNew = await redis.set(key, "1", "EX", 3600, "NX");
  
  if (!isNew) {
    // Duplicate update, drop it.
    return;
  }

  return next();
}
