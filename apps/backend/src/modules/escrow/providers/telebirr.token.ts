// === IMPORTS ===
import { env } from "../../../config/env.js";
import { redis } from "../../../lib/redis.js";
import { logger } from "../../../lib/logger.js";

/**
 * Telebirr Fabric Token Manager.
 *
 * The fabric token is required for all authenticated Telebirr API calls.
 * It is obtained via POST /payment/v1/token and is valid for 1 hour.
 * This module caches the token in Redis with a 50-minute TTL to avoid
 * unnecessary re-requests while leaving a safety margin before expiry.
 */

const REDIS_KEY = "telebirr:fabric_token";
const CACHE_TTL_SECONDS = 3000; // 50 minutes — well within the 1-hour validity

// === MAIN FUNCTIONS ===

/**
 * Returns a valid Telebirr fabric token, fetching a new one if the cached
 * token is expired or missing.
 *
 * @throws {Error} If the Telebirr token API returns an error
 */
export async function getFabricToken(): Promise<string> {
  // 1. Try Redis cache first
  try {
    const cached = await redis.get(REDIS_KEY);
    if (cached) {
      logger.debug("Using cached Telebirr fabric token.");
      return cached;
    }
  } catch (err) {
    // Redis unavailable — fall through to direct API call
    logger.warn(
      { err },
      "Redis unavailable for Telebirr token cache — fetching directly.",
    );
  }

  // 2. Request a new token from Telebirr
  const tokenUrl = `${env.TELEBIRR_BASE_URL}/payment/v1/token`;

  logger.debug({ url: tokenUrl }, "Requesting new Telebirr fabric token.");

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-APP-Key": env.TELEBIRR_FABRIC_APP_ID!,
    },
    body: JSON.stringify({ appSecret: env.TELEBIRR_APP_SECRET }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Telebirr token request failed: HTTP ${response.status} — ${body}`,
    );
  }

  const data = (await response.json()) as {
    code: number;
    msg: string;
    token?: string;
    expirationDate?: string;
  };

  if (!data.token) {
    throw new Error(
      `Telebirr token request returned error: code=${data.code || data.errorCode}, msg=${data.msg || data.errorMsg}`,
    );
  }

  // The token string from Telebirr may include the "Bearer " prefix — strip
  // it so callers can attach their own prefix consistently.
  const token = data.token.startsWith("Bearer ")
    ? data.token.slice(7)
    : data.token;

  // 3. Cache in Redis
  try {
    await redis.set(REDIS_KEY, token, "EX", CACHE_TTL_SECONDS);
    logger.debug("Cached new Telebirr fabric token in Redis (TTL 50m).");
  } catch (err) {
    logger.warn(
      { err },
      "Failed to cache Telebirr token in Redis — will re-fetch next time.",
    );
  }

  return token;
}

/**
 * Invalidates the cached fabric token. Call this when a Telebirr API
 * returns a 401 or token-expired error to force a fresh fetch on the
 * next call.
 */
export async function invalidateFabricToken(): Promise<void> {
  try {
    await redis.del(REDIS_KEY);
    logger.debug("Invalidated cached Telebirr fabric token.");
  } catch (err) {
    logger.warn({ err }, "Failed to invalidate Telebirr token cache.");
  }
}
