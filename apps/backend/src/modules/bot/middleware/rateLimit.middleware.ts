import { BotContext } from "../types.js";
import { redis } from "../../../lib/redis.js";
import { logger } from "../../../lib/logger.js";

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix: string;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  default: { windowMs: 60_000, maxRequests: 30, keyPrefix: "ratelimit:default" },
  mutation: { windowMs: 60_000, maxRequests: 10, keyPrefix: "ratelimit:mutation" },
  staff: { windowMs: 60_000, maxRequests: 100, keyPrefix: "ratelimit:staff" },
  scene: { windowMs: 60_000, maxRequests: 20, keyPrefix: "ratelimit:scene" },
};

function getRateLimitKey(ctx: BotContext, type: keyof typeof RATE_LIMITS): string {
  const userId = ctx.session.telegramUserId || ctx.session.telegramChatId;
  return `${RATE_LIMITS[type]!.keyPrefix}:${userId}`;
}

function getLimitType(ctx: BotContext): keyof typeof RATE_LIMITS {
  if (ctx.session.role === "STAFF") return "staff";

  const update = ctx.update;
  if (update.callback_query?.data?.startsWith("staff:")) return "staff";
  if (update.callback_query?.data?.includes(":")) return "mutation";
  if (update.message?.text?.startsWith("/")) {
    const command = update.message.text.split(" ")[0]!.slice(1);
    const mutationCommands = ["propose", "withdraw", "topup", "kyc", "dispute", "accept", "reject", "approve", "sign", "fund", "deliver", "broadcast"];
    if (mutationCommands.some(c => command.startsWith(c))) return "mutation";
  }
  if (ctx.session.scene) return "scene";

  return "default";
}

export async function rateLimitMiddleware(ctx: BotContext, next: () => Promise<void>) {
  const type = getLimitType(ctx);
  const config = RATE_LIMITS[type];
  if (!config) return next();
  
  const key = getRateLimitKey(ctx, type);

  try {
    const current = await redis.incr(key);

    if (current === 1) {
      await redis.pexpire(key, config.windowMs);
    }

    const ttl = await redis.pttl(key);
    const remaining = Math.max(0, config.maxRequests - current);

    (ctx as any).rateLimit = {
      limit: config.maxRequests,
      remaining,
      resetMs: ttl > 0 ? ttl : config.windowMs,
    };

    if (current > config.maxRequests) {
      const t = ctx.i18n?.t ?? ((k: string) => k);
      await ctx.reply(ctx.t("errors_rate_limited") || "Too many requests. Please wait a moment.");
      logger.warn({ userId: ctx.session.telegramUserId, type, current, limit: config.maxRequests }, "Rate limit exceeded");
      return;
    }
  } catch (error) {
    logger.error({ error, key }, "Rate limit check failed");
  }

  await next();
}
