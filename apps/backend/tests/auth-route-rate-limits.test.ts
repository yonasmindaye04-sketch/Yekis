import { describe, it, expect, beforeAll, afterAll } from "vitest";
import express from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { authRouter } from "../src/modules/auth/auth.routes.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * The unauthenticated credential surface had limits on some routes and not
 * others.
 *
 * /register, /login and the reset routes carried their own limiters. Everything
 * else in that file — /refresh, the four Telegram sign-in routes and the three
 * OAuth routes — fell through to the shared per-IP API limiter in app.ts: 2000
 * requests per 15 minutes. That is an availability budget, not an abuse control,
 * and the difference matters most on the endpoints where one unauthenticated
 * request causes real work.
 *
 * /oauth/* in particular verifies a provider-signed idToken over the network on
 * every call, so an unlimited endpoint there is an amplification vector aimed at
 * us and at Google at the same time.
 */

const STAMP = Date.now();
/** Run-scoped, so a previous run's counters can never carry into this one. */
const RUN_RANDOM = Math.floor(Math.random() * 0xffffff);
let app: express.Express;
let userId = "";

function build() {
  const a = express();
  // One trusted hop, exactly as a deployment behind a single reverse proxy
  // configures. Without this Express IGNORES X-Forwarded-For, every request
  // shares the socket address, and one case's budget silently starves the next
  // — which made this file's first version report 429 for the wrong route.
  a.set("trust proxy", 1);
  a.use(express.json({ limit: "1mb" }));
  a.use("/api/v1/auth", authRouter);
  a.use((req, res) => res.status(404).json({ error: "NOT_FOUND" }));
  return a;
}

/**
 * Each case gets an address unique per case AND per run.
 *
 * The first version derived the address from the route name's length and the
 * attempt count, which collided often enough to matter: the limiter is keyed by
 * address and its counters live for the whole 15-minute window, so a collision
 * (or anything left by an earlier run) meant a case started with part of its
 * budget already spent. It failed roughly one run in four. A run-scoped random
 * component removes both.
 */
function ipFor(index: number): string {
  return `198.18.${RUN_RANDOM % 256}.${index}.${(RUN_RANDOM >> 8) % 256}`;
}

/** Each call uses a distinct address per case. */
function asIp(ip: string) {
  return { "X-Forwarded-For": ip, "Content-Type": "application/json" };
}

beforeAll(async () => {
  process.env.RATE_LIMIT_DISABLED = "false";
  app = build();

  const created = await prisma.user.create({
    data: {
      email: `ratelimit-auth-${STAMP}@test.et`,
      phone: `+2519${String(84000000 + (STAMP % 900000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  userId = created.id;
});

afterAll(async () => {
  process.env.RATE_LIMIT_DISABLED = "false";
  if (userId) {
    await prisma.$transaction([
      prisma.wallet.deleteMany({ where: { userId } }),
      prisma.kycRecord.deleteMany({ where: { userId } }),
      prisma.consentRecord.deleteMany({ where: { userId } }),
      prisma.auditLog.deleteMany({ where: { userId } }),
      prisma.user.deleteMany({ where: { id: userId } }),
    ]);
  }
  await prisma.$disconnect();
});

/** Hammers a route from one IP until it answers 429, and reports whether it did. */
async function isLimited(
  route: string,
  ip: string,
  body: unknown,
  attempts: number,
): Promise<{ limited: boolean; status: number; code?: string }> {
  let last = { status: 0, code: undefined as string | undefined };
  for (let i = 0; i < attempts; i++) {
    const res = await request(app).post(route).set(asIp(ip)).send(body as object);
    last = { status: res.status, code: res.body?.error };
    if (res.status === 429) return { limited: true, status: 429, code: res.body?.error };
  }
  return { limited: false, ...last };
}

describe("each unauthenticated credential endpoint has its own budget", () => {
/**
 * Bodies chosen to be VALID JSON that fails the route's own Zod parse.
 *
 * The limiter runs as middleware, before the handler, so a request rejected by
 * validation still consumes budget -- which is exactly what this file needs.
 *
 * The alternative, sending a well-formed idToken, made every request perform a
 * real outbound call to Google/Apple/Facebook. That is the slow way to prove a
 * counter increments: with enough attempts to clear the limit, the file started
 * timing out at 30s roughly one run in four, while the assertion itself was
 * never the problem.
 *
 * Malformed JSON is deliberately avoided: express.json() would reject it before
 * the route's middleware runs, and nothing would be counted at all.
 */
const cases: Array<{
  route: string;
  body: unknown;
  // Comfortably above the route's limit so the assertion cannot be satisfied by
  // accident, and cheap enough to stay fast now that no network call happens.
  attempts: number;
}> = [
  // refreshToken must be at least 20 characters; a short one is refused before
  // any crypto or store access.
  { route: "/api/v1/auth/refresh", body: { refreshToken: "short" }, attempts: 140 },
  // idToken must be at least 20 characters.
  { route: "/api/v1/auth/oauth/google", body: { idToken: "short" }, attempts: 40 },
  { route: "/api/v1/auth/oauth/apple", body: { idToken: "short" }, attempts: 40 },
  { route: "/api/v1/auth/oauth/facebook", body: { accessToken: "short" }, attempts: 40 },
  // Telegram routes need well-formed payloads; an empty object is refused by
  // the handler's own shape checks.
  { route: "/api/v1/auth/telegram", body: {}, attempts: 50 },
  { route: "/api/v1/auth/telegram/miniapp", body: {}, attempts: 50 },
  { route: "/api/v1/auth/telegram/widget", body: {}, attempts: 50 },
  { route: "/api/v1/auth/telegram/miniapp/register", body: {}, attempts: 20 },
];

  for (const [index, c] of cases.entries()) {
    it(`${c.route} refuses once its budget is spent`, async () => {
      const ip = ipFor(index);
      const result = await isLimited(c.route, ip, c.body, c.attempts);

      expect(
        result.limited,
        `${c.route} answered ${result.status} ${result.code ?? ""} after ${c.attempts} attempts and never returned 429`,
      ).toBe(true);
    });
  }
});

describe("the limits do not fire on ordinary traffic", () => {
  it("a handful of refreshes from one IP are served", async () => {
    // The control. Without it, "every route 429s" would satisfy the tests above
    // while shipping a limiter strict enough to lock users out.
    const ip = "203.0.113.7";
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/v1/auth/refresh")
        .set(asIp(ip))
        .send({ refreshToken: "x".repeat(40) });
      codes.push(res.status);
    }
    expect(codes.every((c) => c !== 429), `got ${codes.join(",")}`).toBe(true);
  });

  it("a handful of OAuth attempts are served", async () => {
    const ip = "203.0.113.8";
    const codes: number[] = [];
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/api/v1/auth/oauth/google")
        .set(asIp(ip))
        .send({ idToken: "y".repeat(40), role: "CLIENT" });
      codes.push(res.status);
    }
    expect(codes.every((c) => c !== 429), `got ${codes.join(",")}`).toBe(true);
  });
});