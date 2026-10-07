import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { createHash, createHmac } from "node:crypto";
import {
  loginWithTelegram,
  registerTelegramUser,
  resolveOrProvisionTelegramUser,
  linkTelegramToUser,
  unlinkTelegramFromUser,
  verifyMiniAppInitData,
  verifyLoginWidget,
  NeedsOnboardingError,
  AuthError,
  TelegramAccountConflictError,
  type TgUser,
} from "../src/modules/auth/telegram.service.js";
import { AccountLinkRequiredError } from "../src/modules/auth/identity.js";
import { prisma } from "../src/lib/prisma.js";

const TEST_BOT_TOKEN = "123456789:ABCdefGHIjklMNOpqrsTUVwxyz";

function dataCheckHash(
  params: URLSearchParams,
  botToken: string,
  kind: "miniapp" | "widget",
) {
  // `hash` is excluded because it is the OUTPUT of this computation, not an
  // input. Filtering matters whenever an already-signed payload is re-signed
  // (the tampering tests below): without it the previous hash would be folded
  // into the data-check string.
  const check = [...params.entries()]
    .filter(([k]) => k !== "hash")
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
function widgetPayload(
  botToken: string,
  user: { id: number; first_name?: string; username?: string },
  authDateOffsetSeconds = 0,
) {
  const flat: Record<string, string> = {
    auth_date: String(Math.floor(Date.now() / 1000) - authDateOffsetSeconds),
    id: String(user.id),
  };
  if (user.first_name) flat.first_name = user.first_name;
  if (user.username) flat.username = user.username;
  flat.hash = dataCheckHash(new URLSearchParams(flat), botToken, "widget");
  return flat;
}

/**
 * Verifies Mini App initData and hands back the identity, which is what a route
 * does before it ever touches the database.
 */
function verifiedMiniApp(
  user: { id: number; first_name?: string; username?: string },
  maxAgeSec = 3600,
): TgUser {
  return verifyMiniAppInitData(miniAppInitData(TEST_BOT_TOKEN, user), TEST_BOT_TOKEN, maxAgeSec);
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
    prisma.telegramLoginCode.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
}

const TRACKED = [88776655, 99887766, 55443322, 66001122];

const LINK_TEST_EMAILS = [
  "link-owner@example.com",
  "tg-owner@example.com",
  "other@example.com",
  "relink@example.com",
  "unlink@example.com",
];

describe("Telegram signature verification (two distinct algorithms)", () => {
  it("rejects initData with missing hash", () => {
    const initData = "query_id=123&user=%7B%22id%22%3A12345%7D&auth_date=1000";
    expect(() => verifyMiniAppInitData(initData, TEST_BOT_TOKEN)).toThrow(AuthError);
    expect(() => verifyMiniAppInitData(initData, TEST_BOT_TOKEN)).toThrow(
      "BAD_SIGNATURE",
    );
  });

  it("rejects initData whose signature was produced with another bot token", () => {
    const fake = miniAppInitData("wrong_bot_token", { id: 987654, first_name: "Abebe" });
    expect(() => verifyMiniAppInitData(fake, TEST_BOT_TOKEN)).toThrow("BAD_SIGNATURE");
  });

  // A captured initData string is a bearer credential: anyone who observes one
  // can replay it. The window must stay short.
  it("rejects a stale initData outside the replay window", () => {
    const stale = miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "Stale" }, 901);
    expect(() => verifyMiniAppInitData(stale, TEST_BOT_TOKEN, 900)).toThrow(
      "STALE_AUTH_DATE",
    );
  });

  it("rejects an auth_date in the future", () => {
    const future = miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "Future" }, -120);
    expect(() => verifyMiniAppInitData(future, TEST_BOT_TOKEN)).toThrow(
      "STALE_AUTH_DATE",
    );
  });

  it("rejects a missing or non-numeric auth_date", () => {
    const params = new URLSearchParams(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "NoDate" }),
    );
    params.set("auth_date", "not-a-number");
    params.set("hash", dataCheckHash(params, TEST_BOT_TOKEN, "miniapp"));
    expect(() => verifyMiniAppInitData(params.toString(), TEST_BOT_TOKEN)).toThrow(
      "INVALID_AUTH_DATE",
    );

    const noDate = new URLSearchParams(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "NoDate" }),
    );
    noDate.delete("auth_date");
    noDate.set("hash", dataCheckHash(noDate, TEST_BOT_TOKEN, "miniapp"));
    expect(() => verifyMiniAppInitData(noDate.toString(), TEST_BOT_TOKEN)).toThrow(
      "NO_AUTH_DATE",
    );
  });

  it("accepts initData inside the replay window and widens the id to BigInt", () => {
    const user = verifiedMiniApp({ id: 88776655, first_name: "Fresh" }, 3600);
    expect(user.id).toBe(BigInt(88776655));
    expect(user.firstName).toBe("Fresh");
  });

  // The two schemes derive DIFFERENT secrets from the same bot token. Accepting
  // one under the other's key would let a Login Widget payload be replayed as
  // Mini App initData (or vice versa) with a longer max age than its scheme allows.
  it("refuses a Login Widget payload that is checked as Mini App initData", () => {
    const flat = widgetPayload(TEST_BOT_TOKEN, { id: 99887766, first_name: "WidgetUser" });
    const asInitData = new URLSearchParams(
      Object.entries(flat).map(([k, v]) => [k, v]),
    ).toString();
    expect(() => verifyMiniAppInitData(asInitData, TEST_BOT_TOKEN)).toThrow(
      "BAD_SIGNATURE",
    );
  });

  it("refuses Mini App initData that is checked as a Login Widget payload", () => {
    const params = new URLSearchParams(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "TestUser" }),
    );
    const asFlat = Object.fromEntries(params.entries());
    expect(() => verifyLoginWidget(asFlat, TEST_BOT_TOKEN)).toThrow("BAD_SIGNATURE");
  });

  it("rejects a tampered user payload inside otherwise valid initData", () => {
    const signed = new URLSearchParams(
      miniAppInitData(TEST_BOT_TOKEN, { id: 88776655, first_name: "Real" }),
    );
    // Swap the identity but keep the original signature.
    signed.set("user", JSON.stringify({ id: 55443322, first_name: "Swapped" }));
    expect(() => verifyMiniAppInitData(signed.toString(), TEST_BOT_TOKEN)).toThrow(
      "BAD_SIGNATURE",
    );
  });

  it("rejects initData carrying no user at all", () => {
    const params = new URLSearchParams();
    params.set("auth_date", String(Math.floor(Date.now() / 1000)));
    params.set("hash", dataCheckHash(params, TEST_BOT_TOKEN, "miniapp"));
    expect(() => verifyMiniAppInitData(params.toString(), TEST_BOT_TOKEN)).toThrow(
      "NO_USER",
    );
  });

  it("authenticates a Login Widget payload (flat id/first_name, no user)", () => {
    const user = verifyLoginWidget(
      widgetPayload(TEST_BOT_TOKEN, { id: 99887766, first_name: "WidgetUser", username: "widget_yekis" }),
      TEST_BOT_TOKEN,
    );
    expect(user.id).toBe(BigInt(99887766));
    expect(user.firstName).toBe("WidgetUser");
    expect(user.username).toBe("widget_yekis");
  });

  it("rejects a stale Login Widget payload", () => {
    const flat = widgetPayload(
      TEST_BOT_TOKEN,
      { id: 99887766, first_name: "StaleWidget" },
      400,
    );
    expect(() => verifyLoginWidget(flat, TEST_BOT_TOKEN, 300)).toThrow(
      "STALE_AUTH_DATE",
    );
  });
});

describe("Telegram login never provisions an account", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("refuses to sign in an unknown Telegram user and creates nothing", async () => {
    const telegram = verifiedMiniApp({ id: 88776655, first_name: "TestUser" });
    await expect(loginWithTelegram(telegram)).rejects.toThrow(NeedsOnboardingError);

    // The whole point: an unauthenticated first contact must not mint a row.
    expect(await findByTelegramId(88776655)).toBeNull();
    expect(
      await prisma.user.count({
        where: { telegramUserId: BigInt(88776655) },
      }),
    ).toBe(0);
  });

  it("registers an account on explicit request and persists the identity columns", async () => {
    const telegram = verifiedMiniApp({
      id: 88776655,
      first_name: "TestUser",
      username: "test_yekis",
    });
    const session = await registerTelegramUser(telegram, "FREELANCER");

    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.user.email).toBe("telegram+88776655@yekis.local");
    expect(session.telegram.id).toBe("88776655");

    // The columns the bot and push notifications depend on.
    const stored = await findByTelegramId(88776655);
    expect(stored?.telegramUserId).toBe(BigInt(88776655));
    expect(stored?.telegramChatId).toBe("88776655");
    expect(stored?.role).toBe("FREELANCER");
    // Federated account: no platform password of its own.
    expect(stored?.passwordSetAt).toBeNull();
  });

  it("refuses a role outside CLIENT/FREELANCER/BOTH", async () => {
    const telegram = verifiedMiniApp({ id: 55443322, first_name: "RoleCheck" });
    // STAFF is not a UserRole at all — staff authority lives in `staffRole` —
    // so the role field can never carry it.
    await expect(
      registerTelegramUser(telegram, "STAFF"),
    ).rejects.toThrow(/invalid role/i);
    await expect(
      registerTelegramUser(telegram, "SUPER_ADMIN"),
    ).rejects.toThrow(/invalid role/i);
  });

  it("never writes a placeholder phone inside an Ethiopian operator range", async () => {
    await registerTelegramUser(
      verifiedMiniApp({ id: 55443322, first_name: "PhoneCheck" }),
      "CLIENT",
    );
    const stored = await findByTelegramId(55443322);
    expect(stored?.phone).toMatch(/^\+2510\d{6}$/);
  });

  it("signs in an existing member without touching their role", async () => {
    await registerTelegramUser(
      verifiedMiniApp({ id: 88776655, first_name: "TestUser" }),
      "FREELANCER",
    );
    const session = await loginWithTelegram(
      verifiedMiniApp({ id: 88776655, first_name: "TestUser", last_name: "Updated" }),
    );

    expect(session.user.role).toBe("FREELANCER");
    expect((await findByTelegramId(88776655))?.lastName).toBe("Updated");
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
      verifiedMiniApp({ id: 88776655, first_name: "Legacy" }),
    );

    expect(session.user.id).toBe(legacy.id);
    expect((await findByTelegramId(88776655))?.id).toBe(legacy.id);
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
      loginWithTelegram(verifiedMiniApp({ id: 88776655, first_name: "Attacker" })),
    ).rejects.toThrow(AccountLinkRequiredError);
  });

  it("never downgrades a member's role on repeat sign-in", async () => {
    await registerTelegramUser(
      verifiedMiniApp({ id: 88776655, first_name: "TestUser" }),
      "FREELANCER",
    );
    const session = await loginWithTelegram(
      verifiedMiniApp({ id: 88776655, first_name: "TestUser" }),
    );
    expect((await prisma.user.findUnique({ where: { id: session.user.id } }))?.role).toBe(
      "FREELANCER",
    );
  });
});

describe("bot-side provisioning (legacy, pending removal)", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  it("provisions from a Telegram-delivered identity with no client credential", async () => {
    const user = await resolveOrProvisionTelegramUser(
      { id: 88776655, first_name: "Bot", last_name: "Member" },
      { role: "FREELANCER" },
    );

    expect(user.telegramUserId).toBe(BigInt(88776655));
    expect(user.telegramChatId).toBe("88776655");
    expect(user.role).toBe("FREELANCER");
    expect(user.passwordSetAt).toBeNull();
    expect(user.phone).toMatch(/^\+2510\d{6}$/);
    expect(user.kyc?.tier).toBe("TIER_1");
    expect(user.kyc?.status).toBe("VERIFIED");
  });

  it("does not downgrade on a repeat visit", async () => {
    const first = await resolveOrProvisionTelegramUser({ id: 88776655, first_name: "Bot" });
    const second = await resolveOrProvisionTelegramUser({
      id: 88776655,
      first_name: "Bot",
      last_name: "Renamed",
    });

    expect(second.id).toBe(first.id);
    expect(second.lastName).toBe("Renamed");
    expect(second.role).toBe("CLIENT");
    expect(
      await prisma.user.count({ where: { telegramUserId: BigInt(88776655) } }),
    ).toBe(1);
  });
});

describe("account linking", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

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
      verifiedMiniApp({ id: 66001122, first_name: "Linked" }),
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
      linkTelegramToUser(other.id, verifiedMiniApp({ id: 66001122, first_name: "Thief" })),
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
        role: "CLIENT",
        telegramUserId: BigInt(66001122),
        telegramChatId: "66001122",
      },
    });

    await expect(
      linkTelegramToUser(
        owner.id,
        verifiedMiniApp({ id: 66001122, first_name: "Same" }),
      ),
    ).resolves.toMatchObject({ telegramUserId: "66001122" });
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
