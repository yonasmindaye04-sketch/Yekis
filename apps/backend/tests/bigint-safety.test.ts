import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { SignJWT, jwtVerify } from "jose";
import request from "supertest";
import "../src/lib/json.js";
import { safeStringify, toTelegramBigInt } from "../src/lib/json.js";
import { prisma } from "../src/lib/prisma.js";
import { redis } from "../src/lib/redis.js";
import { buildApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { verifyMiniAppInitData, buildAuthResponse } from "../src/modules/auth/telegram.service.js";
import { createRedisSessionStorage, createInitialSessionData } from "../src/modules/bot/utils/sessionStorage.js";
import { miniAppInitData, TEST_BOT_TOKEN } from "./fixtures/telegram.js";

/**
 * T0.6 — BigInt / H7.
 *
 * `User.telegramUserId` is `BigInt` in Postgres. The hazard is the three places
 * a BigInt has to survive: the database, the Redis bot session, and a signed
 * JWT. Each has a different failure mode:
 *
 *   database  — silent precision loss if it round-trips through a JS number
 *   session   — `JSON.stringify` THROWS on a BigInt, which inside the session
 *               store's try/catch means a silently dropped write
 *   JWT       — a claim value that cannot be encoded
 *
 * The id used here is 7_000_000_000_000_000_001 — above 2^53, so it is NOT
 * exactly representable as a JS number. Anything that round-trips it through
 * `Number` will produce a different value, which is what these assertions catch.
 */
const BIG_ID = 7_000_000_000_000_000_001n; // > 2^53
const BIG_ID_STR = BIG_ID.toString();
/** What a lossy `Number()` round-trip would produce, for contrast. */
const LOSSY_NUMBER = Number(BIG_ID_STR);

const app = buildApp();
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

let userId: string;

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { telegramUserId: BIG_ID },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  const keys = await redis.keys("bot:session:*");
  if (keys.length) await redis.del(...keys);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

beforeAll(async () => {
  await cleanup();
  const user = await prisma.user.create({
    data: {
      email: `bigint-${BIG_ID_STR}@test.et`,
      phone: "+25191234567",
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      telegramUserId: BIG_ID,
      telegramChatId: BIG_ID_STR,
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    },
    include: { kyc: true },
  });
  userId = user.id;
}, 60_000);

afterAll(async () => {
  await cleanup();
});

describe("T0.6 the boundary conversion is genuinely lossy", () => {
  it("proves the test id cannot survive a JS number", () => {
    // Guards the whole suite: if this ever stops holding, the other tests
    // would pass for the wrong reason.
    expect(BIG_ID > BigInt(Number.MAX_SAFE_INTEGER)).toBe(true);
    // Reading it back as a Number rounds, and converting the rounded value to
    // a BigInt yields a DIFFERENT id — so any code path that goes through
    // `Number` would look up (or worse, create) the wrong account.
    expect(BigInt(LOSSY_NUMBER)).not.toBe(BIG_ID);
    expect(LOSSY_NUMBER).toBe(Number(BIG_ID_STR));
  });

  it("toTelegramBigInt accepts string, number and bigint", () => {
    expect(toTelegramBigInt(BIG_ID_STR)).toBe(BIG_ID);
    expect(toTelegramBigInt(BIG_ID)).toBe(BIG_ID);
    // A number that has already lost precision cannot be recovered.
    expect(toTelegramBigInt(LOSSY_NUMBER)).not.toBe(BIG_ID);
  });

  it("toTelegramBigInt returns null rather than 0n for junk", () => {
    // 0n would match a real member's row.
    for (const bad of ["", null, undefined, "not-a-number", "12abc"]) {
      expect(toTelegramBigInt(bad)).toBeNull();
    }
  });
});

describe("T0.6 database round-trip", () => {
  it("stores and returns the exact BigInt", async () => {
    const row = await prisma.user.findUnique({ where: { id: userId } });
    expect(row?.telegramUserId).toBe(BIG_ID);
    expect(typeof row?.telegramUserId).toBe("bigint");
    expect(row?.telegramUserId?.toString()).toBe(BIG_ID_STR);
  });

  it("is reachable by exact lookup and not by the lossy number", async () => {
    const exact = await prisma.user.findUnique({ where: { telegramUserId: BIG_ID } });
    expect(exact?.id).toBe(userId);

    const lossy = await prisma.user.findUnique({
      where: { telegramUserId: BigInt(LOSSY_NUMBER) },
    });
    expect(lossy).toBeNull();
  });
});

describe("T0.6 JSON serialisation", () => {
  it("JSON.stringify no longer throws on a BigInt", () => {
    expect(() => JSON.stringify({ telegramUserId: BIG_ID })).not.toThrow();
    expect(JSON.parse(JSON.stringify({ telegramUserId: BIG_ID }))).toEqual({
      telegramUserId: BIG_ID_STR,
    });
  });

  it("safeStringify works without relying on the prototype patch", () => {
    const out = safeStringify({ a: BIG_ID, nested: { b: [BIG_ID] } });
    // Serialised as a decimal string, so parse+BigInt recovers the exact value.
    expect(JSON.parse(out)).toEqual({ a: BIG_ID_STR, nested: { b: [BIG_ID_STR] } });
  });

  it("does not reserialise a user row with an unpatched BigInt", async () => {
    const row = await prisma.user.findUnique({ where: { id: userId } });
    // The exact call shape a route handler makes when returning a row.
    expect(() => JSON.stringify(row)).not.toThrow();
  });
});

describe("T0.6 bot session round-trip", () => {
  it("survives a write/read cycle through Redis without throwing", async () => {
    const storage = createRedisSessionStorage();
    const session = { ...createInitialSessionData(), telegramUserId: BIG_ID_STR, telegramChatId: BIG_ID_STR };

    // A BigInt reaching the store must not throw — the store swallows errors,
    // so a throw here would look like a lost session with no stack trace.
    await storage.write(`t06-${BIG_ID_STR}`, { ...session, telegramUserId: BIG_ID as never });

    const read = await storage.read(`t06-${BIG_ID_STR}`);
    expect(read?.telegramUserId).toBe(BIG_ID_STR);
    expect(BigInt(read!.telegramUserId)).toBe(BIG_ID);
  });

  it("defaults to an empty string rather than 0", async () => {
    const initial = createInitialSessionData();
    expect(initial.telegramUserId).toBe("");
    expect(initial.telegramChatId).toBe("");
    // The falsy-vs-real-id trap the type change was meant to close.
    expect(initial.telegramUserId).not.toBe(0 as never);
  });
});

describe("T0.6 JWT round-trip", () => {
  it("carries the id as a string claim without loss", async () => {
    const token = await new SignJWT({ telegramId: BIG_ID_STR })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(userId)
      .setIssuedAt()
      .setExpirationTime("5m")
      .sign(accessSecret);

    const { payload } = await jwtVerify(token, accessSecret);
    expect(payload.telegramId).toBe(BIG_ID_STR);
    expect(BigInt(payload.telegramId as string)).toBe(BIG_ID);
  });

  it("survives the full login path for a large Telegram id", async () => {
    // End to end: signed initData -> verifier -> account lookup -> session.
    const telegram = verifyMiniAppInitData(
      miniAppInitData({ id: BIG_ID_STR as unknown as number }, { botToken: TEST_BOT_TOKEN }),
      TEST_BOT_TOKEN,
      3600,
    );
    expect(telegram.id).toBe(BIG_ID);

    const user = await prisma.user.findUnique({ where: { telegramUserId: BIG_ID } });
    const session = await buildAuthResponse(user, telegram, "tg_miniapp");
    expect(session.telegram.id).toBe(BIG_ID_STR);

    // And the session is JSON-serialisable for the HTTP response.
    expect(() => JSON.stringify(session)).not.toThrow();
  });
});

describe("T0.6 HTTP response", () => {
  it("returns a BigInt column without a 500", async () => {
    // /auth/me does not select telegramUserId today, so this asserts the
    // general property: the JSON patch is installed for the HTTP path.
    const res = await request(app).get("/api/v1/auth/me");
    // 401 is correct (no token); the point is it is not a 500 from BigInt.
    expect(res.status).not.toBe(500);
  });
});
