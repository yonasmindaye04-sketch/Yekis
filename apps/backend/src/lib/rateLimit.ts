// === IMPORTS ===
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { redis } from "./redis.js";
import { logger } from "./logger.js";
import { env } from "../config/env.js";

// === INTERFACES & TYPES ===
export interface RateLimitRule {
  /** Namespace, so two rules with the same window cannot share a counter. */
  scope: string;
  windowSec: number;
  limit: number;
}

/**
 * The client address a rate limit is accounted against.
 *
 * ALWAYS `req.ip`, never the raw `X-Forwarded-For` header. `req.ip` is what
 * Express derives after walking the chain of trusted proxies configured via
 * `app.set("trust proxy", n)`; reading the header directly hands the bucket
 * choice to whoever sent the request.
 */
export function clientIp(req: Request): string {
  return req.ip ?? req.socket.remoteAddress ?? "unknown";
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  /** Seconds until the window resets. */
  resetSec: number;
}

// === MAIN FUNCTIONS ===
/**
 * Fixed-window counter in Redis, keyed `rl:{scope}:{ip}`.
 *
 * Fixed window rather than sliding: it is one INCR per request, which matters
 * on the unauthenticated auth endpoints where this is the outermost defence.
 * The known trade-off (up to 2x the limit across a window boundary) is
 * acceptable at these thresholds.
 *
 * Fails OPEN when Redis is unreachable: taking the whole API down because a
 * cache is down would turn a degradation into an outage. Auth endpoints that
 * must not fail open should additionally carry a local in-memory limit.
 */
export async function consumeRateLimit(
  rule: RateLimitRule,
  ip: string,
): Promise<RateLimitResult> {
  const key = `${env.RATE_LIMIT_KEY_PREFIX}rl:${rule.scope}:${ip}`;
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, rule.windowSec);
  }
  const ttl = await redis.ttl(key);
  const resetSec = ttl > 0 ? ttl : rule.windowSec;
  return {
    allowed: current <= rule.limit,
    limit: rule.limit,
    remaining: Math.max(0, rule.limit - current),
    resetSec,
  };
}

/**
 * Express middleware form of {@link consumeRateLimit}.
 *
 * Responds 429 with the plan's RATE_LIMITED code and standard RateLimit-*
 * headers so a client can back off correctly.
 */
export function rateLimit(rule: RateLimitRule): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    // RATE_LIMIT_DISABLED gates this limiter too, not just the express-rate-limit
    // in app.ts. It previously did not, which meant the flag did not actually
    // disable rate limiting in tests: the auth limiters stayed live, keyed on
    // `rl:<scope>:<ip>` in Redis with no test prefix, so counters survived
    // between suites and between runs. That surfaced as an intermittent
    // "Too many requests" in suites that have nothing to do with auth, depending
    // on how many logins earlier suites had performed against the same counter.
    //
    // Read at request time, not at module load, so a suite that flips the flag
    // (tests/rate-limiter.test.ts, tests/trust-proxy.test.ts) takes effect
    // without reimporting the module.
    if (env.RATE_LIMIT_DISABLED) {
      return next();
    }
    let result: RateLimitResult;
    try {
      result = await consumeRateLimit(rule, clientIp(req));
    } catch (err) {
      logger.error({ err, scope: rule.scope }, "Rate limiter unavailable; failing open");
      return next();
    }

    res.setHeader("RateLimit-Limit", String(result.limit));
    res.setHeader("RateLimit-Remaining", String(result.remaining));
    res.setHeader("RateLimit-Reset", String(result.resetSec));

    if (!result.allowed) {
      res.setHeader("Retry-After", String(result.resetSec));
      return res.status(429).json({
        error: "RATE_LIMITED",
        code: "RATE_LIMITED",
        message: "Too many requests. Please try again shortly.",
      });
    }
    return next();
  };
}
