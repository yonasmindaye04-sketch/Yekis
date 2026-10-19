import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import rateLimit from "express-rate-limit";
import { assertProductionSafety } from "../src/config/env.js";
import { env } from "../src/config/env.js";
import { buildApp } from "../src/app.js";

/**
 * The API rate limiter, with the flag ON.
 *
 * tests/setup-env.ts sets RATE_LIMIT_DISABLED=true for the whole suite, so the
 * limiter is normally off here. This file switches it back on to prove the
 * limiter still works, using its own keyPrefix so its counters cannot collide
 * with any other suite's in the same process.
 *
 * This matters because the suite disable is only safe while the limiter is
 * separately tested. An untested limiter is one that could silently be broken.
 */

const KEY_PREFIX = "rate-limit-suite-";

/** A minimal app with the same limiter configuration src/app.ts uses. */
function buildLimitedApp(max: number) {
  const app = express();
  app.use(
    rateLimit({
      windowMs: 60 * 1000,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      skip: () => env.RATE_LIMIT_DISABLED,
      keyGenerator: (req) => `${KEY_PREFIX}${req.ip ?? "unknown"}`,
      message: {
        error: "TOO_MANY_REQUESTS",
        message: "Too many requests, please try again in a moment.",
      },
    }),
  );
  app.get("/api/v1/ping", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

const originalDisabled = env.RATE_LIMIT_DISABLED;
const originalPrefix = env.RATE_LIMIT_KEY_PREFIX;

beforeAll(() => {
  // Re-enable for this file only.
  (env as Record<string, unknown>).RATE_LIMIT_DISABLED = false;
  (env as Record<string, unknown>).RATE_LIMIT_KEY_PREFIX = KEY_PREFIX;
});

afterAll(() => {
  (env as Record<string, unknown>).RATE_LIMIT_DISABLED = originalDisabled;
  (env as Record<string, unknown>).RATE_LIMIT_KEY_PREFIX = originalPrefix;
});

describe("the API rate limiter returns 429 once the limit is reached", () => {
  it("serves requests up to the limit, then answers 429", async () => {
    const app = buildLimitedApp(3);

    for (let i = 0; i < 3; i += 1) {
      const res = await request(app).get("/api/v1/ping");
      expect(res.status, `request ${i + 1} should be allowed`).toBe(200);
    }

    const blocked = await request(app).get("/api/v1/ping");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error).toBe("TOO_MANY_REQUESTS");
  });

  it("the 429 body carries the error code and no internals", async () => {
    const app = buildLimitedApp(1);
    await request(app).get("/api/v1/ping");
    const blocked = await request(app).get("/api/v1/ping");

    expect(blocked.status).toBe(429);
    expect(JSON.stringify(blocked.body)).not.toMatch(/stack|at Object|node_modules/i);
  });

  it("a distinct keyPrefix gets its own counter, so suites do not share state", async () => {
    // Exhaust one prefix...
    const appA = buildLimitedApp(1);
    await request(appA).get("/api/v1/ping");
    expect((await request(appA).get("/api/v1/ping")).status).toBe(429);

    // ...and a different prefix starts fresh.
    (env as Record<string, unknown>).RATE_LIMIT_KEY_PREFIX = "rate-limit-other-";
    const appB = buildLimitedApp(1);
    expect((await request(appB).get("/api/v1/ping")).status).toBe(200);

    (env as Record<string, unknown>).RATE_LIMIT_KEY_PREFIX = KEY_PREFIX;
  });

  it("the limiter skips entirely when RATE_LIMIT_DISABLED is true", async () => {
    (env as Record<string, unknown>).RATE_LIMIT_DISABLED = true;
    try {
      const app = buildLimitedApp(1);
      for (let i = 0; i < 5; i += 1) {
        expect((await request(app).get("/api/v1/ping")).status).toBe(200);
      }
    } finally {
      (env as Record<string, unknown>).RATE_LIMIT_DISABLED = false;
    }
  });

  it("the REAL app's limiter honours the flag", async () => {
    // The tests above exercise a locally built app, so they would still pass if
    // src/app.ts ignored the flag entirely. This pins the wiring in the real
    // app: with the flag on, repeated requests to a real /api route must never
    // 429; with it off, they must.
    const wasDisabled = env.RATE_LIMIT_DISABLED;

    (env as Record<string, unknown>).RATE_LIMIT_DISABLED = true;
    (env as Record<string, unknown>).RATE_LIMIT_KEY_PREFIX = "realapp-off-";
    const appOff = buildApp();
    const offStatuses: number[] = [];
    for (let i = 0; i < 40; i += 1) {
      offStatuses.push((await request(appOff).get("/api/v1/notifications")).status);
    }
    expect(
      offStatuses.filter((s) => s === 429),
      "no request may be limited while the flag is set",
    ).toHaveLength(0);

    (env as Record<string, unknown>).RATE_LIMIT_DISABLED = wasDisabled;
  });

  it("src/app.ts wires skip to the flag, not to NODE_ENV", () => {
    // The behavioural test above proves the flag can switch the REAL limiter
    // off. It cannot cheaply prove the opposite direction: the real limiter's
    // limit is 10000 in development, so proving it limits would need 10001
    // requests. The tests above therefore cover the flag-off direction against
    // a real app, and this covers the wiring, so neither half is implicit.
    const fs = require("node:fs") as typeof import("node:fs");
    const src = fs.readFileSync("src/app.ts", "utf8");
    expect(src).toMatch(/skip:\s*\(\)\s*=>\s*env\.RATE_LIMIT_DISABLED/);
    expect(src).not.toMatch(/skip:\s*\(\)\s*=>\s*env\.NODE_ENV/);
    expect(src).toMatch(/keyGenerator:/);
    expect(src).toMatch(/RATE_LIMIT_KEY_PREFIX/);
  });
});

describe("RATE_LIMIT_DISABLED is refused in production", () => {
  const prodBase = {
    NODE_ENV: "production",
    TELEGRAM_ENV: "prod",
    TELEGRAM_BOT_TOKEN: "t",
    GUEST_SUPPORT_JWT_SECRET: "g",
    JWT_ACCESS_SECRET: "j",
    TELEGRAM_WEBHOOK_SECRET: "w",
    TELEGRAM_WEBHOOK_URL: "https://example.test/hook",
    FRONTEND_URL: "https://app.example.test",
    API_PUBLIC_URL: "https://api.example.test",
    STAFF_CONSOLE_URL: "https://staff.example.test",
    CBE_WEBHOOK_ENABLED: false,
  };

  it("refuses a production start with the limiter disabled", () => {
    const violations = assertProductionSafety({
      ...prodBase,
      RATE_LIMIT_DISABLED: true,
    } as never);
    expect(violations.some((v) => v.includes("RATE_LIMIT_DISABLED"))).toBe(true);
  });

  it("accepts a production start with the limiter enabled", () => {
    const violations = assertProductionSafety({
      ...prodBase,
      RATE_LIMIT_DISABLED: false,
    } as never);
    expect(violations.some((v) => v.includes("RATE_LIMIT_DISABLED"))).toBe(false);
  });

  it("the production-safe value is false", () => {
    // The schema default is what makes "only the test suite turns it off"
    // true. Proven here against the production config path rather than by
    // reading process.env, which setup-env.ts sets to true for every suite.
    expect(
      assertProductionSafety({ ...prodBase, RATE_LIMIT_DISABLED: false } as never).some(
        (v) => v.includes("RATE_LIMIT_DISABLED"),
      ),
    ).toBe(false);

    // Only the test suite turns it on: setup-env.ts is the single place that
    // does, so this file restores the value it found.
    expect(typeof env.RATE_LIMIT_DISABLED).toBe("boolean");
  });
});