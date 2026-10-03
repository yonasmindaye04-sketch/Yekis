import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createHash, createHmac } from "node:crypto";
import {
  loginWithTelegram,
  linkTelegramToUser,
  unlinkTelegramFromUser,
  TelegramAuthError,
  TelegramNotConfiguredError,
  TelegramAccountConflictError,
} from "../src/modules/auth/telegram.service.js";
import { AccountLinkRequiredError } from "../src/modules/auth/identity.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const TEST_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";

function dataCheckHash(
  params: URLSearchParams,
  botToken: string,
  kind: "miniapp" | "widget",
) {
  const check = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret =
    kind === "widget"
      ? createHash("sha256").update(botToken).digest()
      : createHmac("sha256", "WebAppData").update(botToken).digest();
  return createHmac("sha256", secret).update(check).digest("hex");
}

/** Genuinely signed Telegram Mini App initData. */
function miniAppInitData(
  botToken: string,
  user: { id: number; first_name?: string; username?: string; language_code?: string },
  authDateOffsetSeconds = 0,
) {
  const params = new URLSearchParams();
  params.set(
    "auth_date",
    String(Math.floor(Date.now() / 1000) - authDateOffsetSeconds),
  );
  params.set("query_id", "AAHdF6IQAAAAAN0XohDhrOrc");
  params.set("user", JSON.stringify(user));
  params.set("hash", dataCheckHash(params, botToken, "miniapp"));
  return params.toString();
}

/** Genuinely signed Telegram Login Widget payload (flat, id/first_name, no user). */
function widgetInitData(
  botToken: string,
  user: { id: number; first_name?: string; username?: string },
  authDateOffsetSeconds = 0,
) {
  const params = new URLSearchParams();
  params.set(
    "auth_date",
    String(Math.floor(Date.now() / 1000) - authDateOffsetSeconds),
  );
  params.set("id", String(user.id));
  if (user.first_name) params.set("first_name", user.first_name);
  if (user.username) params.set("username", user.username);
  params.set("hash", dataCheckHash(params, botToken, "widget"));
  return params.toString();
}

async function findByTelegramId(id: number) {
  return prisma.user.findUnique({ where: { telegramUserId: BigInt(id) } });
}

/** Removes every account this suite provisions so reruns stay idempotent. */
async function cleanup() {
  const scope = {
    OR: [
      { email: { in: TRACKED.map((id) => `telegram+${id}@yekis.local`) } },
      { telegramUserId: { in: TRACKED.map((id) => BigInt(id)) } },
      { email: { in: LINK_TEST_EMAILS } },
    ],
  };
  const users = await prisma.user.findMany({
    where: scope,
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return;

  // ConsentRecord / KycRecord / Wallet / AuditLog reference User without
  // onDelete: Cascade, so they must be cleared first.
  await prisma.$transaction([
    prisma.consentRecord.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.notification.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
}

const TRACKED = [88776655, 99887766, 55443322, 66001122];

const LINK_TEST_EMAILS = [
  "link-owner@example.com",
  "tg-owner@example.com",
  "other@example.com",
  "relink@example.com",
  "unsigned@example.com",
  "unlink@example.com",
];

describe("Telegram Authentication Service", () => {
  const originalToken = env.TELEGRAM_BOT_TOKEN;
  const originalMaxAge = env.TELEGRAM_INIT_DATA_MAX_AGE_SECONDS;

  beforeEach(async () => {
    (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = TEST_BOT_TOKEN;
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = originalToken;
    (env as Record<string, unknown>).TELEGRAM_INIT_DATA_MAX_AGE_SECONDS =
      originalMaxAge;
  });

  it("throws TelegramNotConfiguredError when bot token is not configured", async () => {
    (env as Record<string, unknown>).TELEGRAM_BOT_TOKEN = undefined;
    await expect(
      loginWithTelegram("query_id=123&user={}&auth_date=1000&hash=abc"),
    ).rejects.toThrow(TelegramNotConfiguredError);
  });

  it("rejects initData with missing hash", async () => {
    const initData = "query_id=123&user=%7B%22id%22%3A12345%7D&auth_date=1000";
    await expect(loginWithTelegram(initData)).rejects.toThrow(
      "Telegram auth data is missing hash.",
    );
  });

  it("rejects initData with invalid signature/hash mismatch", async () => {
    const fake = miniAppInitData("wrong_bot_token", {
      id: 987654,
      first_name: "Abebe",
    });
    await expect(loginWithTelegram(fake)).rejects.toThrow(
      "Telegram authentication signature is invalid.",
    );
  });

  // A captured initData string is a bearer credential: anyone who observes one
  // can replay it. The window must stay short.
  it("rejects a stale initData outside the replay window", async () => {
    (env as Record<string, unknown>).TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 900;
    const stale = miniAppInitData(
      TEST_BOT_TOKEN,
      { id: 88776655, first_name: "Stale" },
      901,
    );
    await expect(loginWithTelegram(stale)).rejects.toThrow(
      "Telegram auth data is stale.",
    );
  });

  it("rejects an initData dated in the future", async () => {
    const future = miniAppInitData(
      TEST_BOT_TOKEN,
      { id: 88776655, first_name: "Future" },
      -120,
    );
    await expect(loginWithTelegram(future)).rejects.toThrow(
      "Telegram auth data is stale.",
    );
  });

  it("accepts initData inside the replay window", async () => {
    (env as Record<string, unknown>).TELEGRAM_INIT_DATA_MAX_AGE_SECONDS = 900;
    const fresh = miniAppInitData(
      TEST_BOT_TOKEN,
      { id: 88776655, first_name: "Fresh" },
      60,
    );
    const session = await loginWithTelegram(fresh);
    expect(session.accessToken).toBeTruthy();
  });

  it("authenticates Mini App initData and persists telegram identity columns", async () => {
    const session = await loginWithTelegram(
      miniAppInitData(TEST_BOT_TOKEN, {
        id: 88776655,
        first_name: "TestUser",
        username: "test_yekis",
      }),
      "FREELANCER",
    );

    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.user.email).toBe("telegram+88776655@yekis.local");
    expect(session.telegram.id).toBe(88776655);
    expect(session.telegram.firstName).toBe("TestUser");

    // The columns the bot and push notifications depend on. Previously these
    // were never written, so the bot fell back to an email-pattern lookup and
    // Telegram push was permanently unreachable.
    const stored = await findByTelegramId(88776655);
    expect(stored?.telegramUserId).toBe(BigInt(88776655));
    expect(stored?.telegramChatId).toBe("88776655");
    expect(stored?.role).toBe("FREELANCER");
    // Federated account: no platform password of its own.
    expect(stored?.passwordSetAt).toBeNull();
  });

  it("never writes a placeholder phone inside an Ethiopian operator range", async () => {
    await loginWithTelegram(
      miniAppInitData(TEST_BOT_TOKEN, {
        id: 55443322,
        first_name: "PhoneCheck",
      }),
    );
    const stored = await findByTelegramId(55443322);
    expect(stored?.phone).toMatch(/^\+2510\d{6}$/);
  });

  it("authenticates a Login Widget payload (flat id/first_name, no user)", async () => {
    const session = await loginWithTelegram(
      widgetInitData(TEST_BOT_TOKEN, {
        id: 99887766,
        first_name: "WidgetUser",
        username: "widget_yekis",
      }),
    );

    expect(session.user.email).toBe("telegram+99887766@yekis.local");
    expect(session.telegram.id).toBe(99887766);
    expect((await findByTelegramId(99887766))?.telegramUserId).toBe(
      BigInt(99887766),
    );
  });

  it("resolves a returning member by telegramUserId, not by email", async () => {
    const first = await loginWithTelegram(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "TestUser" }),
      "FREELANCER",
    );
    const second = await loginWithTelegram(
      miniAppInitData(TEST_BOT_TOKEN, {
        id: 88776655,
        first_name: "TestUser",
        last_name: "Updated",
      }),
    );

    expect(second.user.id).toBe(first.user.id);
    expect(second.user.role).toBe("FREELANCER");
    const stored = await findByTelegramId(88776655);
    expect(stored?.lastName).toBe("Updated");
  });

  it("does not downgrade a member's role on repeat sign-in", async () => {
    const first = await loginWithTelegram(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "TestUser" }),
      "FREELANCER",
    );
    // A later client asking for CLIENT must not silently rewrite the member.
    await loginWithTelegram(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "TestUser" }),
      "CLIENT",
    );

    const stored = await prisma.user.findUnique({ where: { id: first.user.id } });
    expect(stored?.role).toBe("FREELANCER");
  });

  it("backfills telegramUserId on a legacy account that only has the synthetic email", async () => {
    const legacy = await prisma.user.create({
      data: {
        email: "telegram+88776655@yekis.local",
        phone: "+25101234567",
        passwordHash: "sentinel",
        role: "CLIENT",
        telegramUserId: null,
      },
    });

    const session = await loginWithTelegram(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "Legacy" }),
    );

    expect(session.user.id).toBe(legacy.id);
    const stored = await findByTelegramId(88776655);
    expect(stored?.id).toBe(legacy.id);
  });

  it("refuses to auto-claim a password-owned account holding the synthetic email", async () => {
    await prisma.user.create({
      data: {
        email: "telegram+88776655@yekis.local",
        phone: "+25101234568",
        passwordHash: "real-password-hash",
        passwordSetAt: new Date(),
        role: "CLIENT",
        telegramUserId: null,
      },
    });

    await expect(
      loginWithTelegram(
        miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "Attacker" }),
      ),
    ).rejects.toThrow(AccountLinkRequiredError);
  });

  it("rejects a tampered user payload inside otherwise valid initData", async () => {
    const signed = new URLSearchParams(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "Real" }),
    );
    // Swap the identity but keep the original signature.
    signed.set("user", JSON.stringify({ id: 55443322, first_name: "Swapped" }));

    await expect(loginWithTelegram(signed.toString())).rejects.toThrow(
      "Telegram authentication signature is invalid.",
    );
  });

  describe("account linking", () => {
    it("binds Telegram to the authenticated account", async () => {
      const owner = await prisma.user.create({
        data: {
          email: "link-owner@example.com",
          phone: "+25101234570",
          passwordHash: "hash",
          passwordSetAt: new Date(),
          role: "CLIENT",
        },
      });

      const result = await linkTelegramToUser(
        owner.id,
        miniAppInitData(TEST_BOT_TOKEN, { id: 66001122, first_name: "Linked" }),
      );

      expect(result.telegramUserId).toBe("66001122");
      const stored = await prisma.user.findUnique({ where: { id: owner.id } });
      expect(stored?.telegramUserId).toBe(BigInt(66001122));
      expect(stored?.telegramChatId).toBe("66001122");
    });

    it("refuses to steal a Telegram identity already owned by another account", async () => {
      const owner = await prisma.user.create({
        data: {
          email: "tg-owner@example.com",
          phone: "+25101234571",
          passwordHash: "hash",
          role: "CLIENT",
          telegramUserId: BigInt(66001122),
          telegramChatId: "66001122",
        },
      });
      const other = await prisma.user.create({
        data: {
          email: "other@example.com",
          phone: "+25101234572",
          passwordHash: "hash",
          passwordSetAt: new Date(),
          role: "CLIENT",
        },
      });

      await expect(
        linkTelegramToUser(
          other.id,
          miniAppInitData(TEST_BOT_TOKEN, { id: 66001122, first_name: "Thief" }),
        ),
      ).rejects.toThrow(TelegramAccountConflictError);

      const stored = await prisma.user.findUnique({ where: { id: owner.id } });
      expect(stored?.telegramUserId).toBe(BigInt(66001122));
    });

    it("is idempotent for the account that already owns the identity", async () => {
      const owner = await prisma.user.create({
        data: {
          email: "relink@example.com",
          phone: "+25101234573",
          passwordHash: "hash",
          passwordSetAt: new Date(),
          role: "CLIENT",
          telegramUserId: BigInt(66001122),
          telegramChatId: "66001122",
        },
      });

      await expect(
        linkTelegramToUser(
          owner.id,
          miniAppInitData(TEST_BOT_TOKEN, { id: 66001122, first_name: "Same" }),
        ),
      ).resolves.toMatchObject({ telegramUserId: "66001122" });
    });

    it("rejects an unsigned credential", async () => {
      const owner = await prisma.user.create({
        data: {
          email: "unsigned@example.com",
          phone: "+25101234574",
          passwordHash: "hash",
          passwordSetAt: new Date(),
          role: "CLIENT",
        },
      });

      await expect(
        linkTelegramToUser(
          owner.id,
          "auth_date=1&id=66001122&hash=deadbeef",
        ),
      ).rejects.toThrow(TelegramAuthError);
    });

    it("detaches Telegram so the identity can be claimed elsewhere", async () => {
      const owner = await prisma.user.create({
        data: {
          email: "unlink@example.com",
          phone: "+25101234575",
          passwordHash: "hash",
          role: "CLIENT",
          telegramUserId: BigInt(66001122),
          telegramChatId: "66001122",
        },
      });

      await unlinkTelegramFromUser(owner.id);

      const stored = await prisma.user.findUnique({ where: { id: owner.id } });
      expect(stored?.telegramUserId).toBeNull();
      expect(stored?.telegramChatId).toBeNull();
    });
  });
});