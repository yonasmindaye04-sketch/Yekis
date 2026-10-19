import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { redis } from "../src/lib/redis.js";
import { rateLimit } from "../src/lib/rateLimit.js";
import { env } from "../src/config/env.js";

/**
 * T0.5 �?" a client must not be able to choose its own rate-limit bucket by
 * forging X-Forwarded-For.
 *
 * Express computes `req.ip` by walking X-Forwarded-For from the RIGHT for
 * exactly `trust proxy` hops. A proxy appends the address it observed, so the
 * rightmost entries are the trustworthy ones and anything a client prepends to
 * the left is discarded. The limiter keys on `req.ip`, so prepended garbage
 * lands in the same bucket.
 *
 * The discriminating control is the last test: if the rightmost entry DOES
 * change the bucket, then the earlier tests are not passing vacuously.
 */

const SCOPE = "t05-trust-proxy";

/**
 * src/lib/rateLimit.ts now honours RATE_LIMIT_DISABLED, which tests/setup-env.ts
 * sets to true for the whole suite. These tests are specifically about the
 * limiter refusing and permitting requests, so they need it live. Flipped here
 * rather than in setup-env so the opt-in is visible at the point of use, and
 * restored afterwards so no later suite inherits it.
 */
let originalDisabled: boolean;
beforeAll(() => {
  originalDisabled = env.RATE_LIMIT_DISABLED;
  (env as Record<string, unknown>).RATE_LIMIT_DISABLED = false;
});
afterAll(() => {
  (env as Record<string, unknown>).RATE_LIMIT_DISABLED = originalDisabled;
});

/** Builds a minimal app wired exactly like src/app.ts for trust proxy. */
function appWith(name: string, limit: number, hops: number | undefined) {
  const app = express();
  if (hops !== undefined) app.set("trust proxy", hops);
  app.use(
    rateLimit({
      // Unique per test: the counter lives in Redis and outlives the test, so
      // reusing a scope would let one test's requests exhaust the next's budget.
      scope: `${SCOPE}-${name}`,
      windowSec: 60,
      limit,
    }),
  );
  app.get("/ping", (_req, res) => res.json({ ok: true }));
  return app;
}

/** A unique, obviously-fake client address (TEST-NET-3, RFC 5737). */
const REAL_CLIENT = "203.0.113.9";

async function clearKeys() {
  const keys = await redis.keys(`rl:${SCOPE}-*`);
  if (keys.length) await redis.del(...keys);
}

beforeAll(async () => {
  await clearKeys();
});

afterAll(async () => {
  await clearKeys();
});

describe("T0.5 trust proxy", () => {
  it("ignores X-Forwarded-For entirely when no proxy is trusted", async () => {
    const app = appWith("noproxy", 3, undefined);
    // Every request claims a different client. With hops unset, Express uses
    // the socket address and never reads the header, so all four share one
    // bucket and the fourth is limited.
    for (let i = 0; i < 3; i++) {
      await request(app).get("/ping").set("X-Forwarded-For", `10.0.0.${i}`).expect(200);
    }
    await request(app).get("/ping").set("X-Forwarded-For", "10.0.0.99").expect(429);
  });

  it("does not let a forged X-Forwarded-For change the limiter bucket", async () => {
    const app = appWith("forged-xff", 3, 1);
    // The client prepends junk to the left of the address the real proxy
    // appended. hops=1 makes Express take the RIGHTMOST entry, so every one of
    // these is the same bucket as far as the limiter is concerned.
    for (let i = 0; i < 3; i++) {
      const res = await request(app)
        .get("/ping")
        .set("X-Forwarded-For", `10.0.0.${i}, 192.0.2.${i}, ${REAL_CLIENT}`)
        .expect(200);
      expect(res.body.ok).toBe(true);
    }

    const limited = await request(app)
      .get("/ping")
      .set("X-Forwarded-For", `172.16.0.1, ${REAL_CLIENT}`)
      .expect(429);
    expect(limited.body.error).toBe("RATE_LIMITED");
  });

  it("resists a long forged X-Forwarded-For chain", async () => {
    const app = appWith("long-chain", 1, 1);
    const forged = Array.from({ length: 20 }, (_, i) => `10.${i}.0.1`).join(", ");
    await request(app).get("/ping").set("X-Forwarded-For", `${forged}, ${REAL_CLIENT}`).expect(200);
    // A completely different forged chain, but the same trusted rightmost entry
    // — so the budget of 1 is already spent.
    await request(app)
      .get("/ping")
      .set("X-Forwarded-For", `192.168.5.5, ${REAL_CLIENT}`)
      .expect(429);
  });

  it("CONTROL: a different rightmost entry DOES get its own bucket", async () => {
    // Proves the previous tests are not passing because the limiter is simply
    // broken or globally saturated: with hops=1 the rightmost entry is what
    // Express trusts, so changing it must move the bucket.
    const app = appWith("control", 1, 1);
    await request(app).get("/ping").set("X-Forwarded-For", "198.51.100.1").expect(200);
    await request(app).get("/ping").set("X-Forwarded-For", "198.51.100.1").expect(429);
    // A genuinely different observed client is a different bucket.
    await request(app).get("/ping").set("X-Forwarded-For", "198.51.100.2").expect(200);
  });

  it("reports RateLimit headers so a client can back off", async () => {
    const app = appWith("headers", 2, 1);
    const res = await request(app).get("/ping").set("X-Forwarded-For", REAL_CLIENT).expect(200);
    expect(res.headers["ratelimit-limit"]).toBe("2");
    expect(res.headers["ratelimit-remaining"]).toBe("1");

    await request(app).get("/ping").set("X-Forwarded-For", REAL_CLIENT).expect(200);
    const limited = await request(app).get("/ping").set("X-Forwarded-For", REAL_CLIENT).expect(429);
    expect(limited.headers["retry-after"]).toBeDefined();
  });
});
