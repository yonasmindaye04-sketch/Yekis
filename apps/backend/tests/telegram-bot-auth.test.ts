import { describe, it, expect, beforeEach, afterAll } from "vitest";
import {
  issueTelegramLoginCode,
  redeemTelegramLoginCode,
  normalizeCode,
  TelegramCodeError,
  TELEGRAM_CODE_TTL_SECONDS,
} from "../src/modules/auth/telegram-code.service.js";
import { resolveOrProvisionTelegramUser } from "../src/modules/auth/telegram.service.js";
import { prisma } from "../src/lib/prisma.js";

const TG_ID = 51500100;

/**
 * The bot path and the web path must resolve to the same account. These tests
 * drive the bot's entry point (a verified Telegram identity, no client-supplied
 * credential) and then the web's code redemption.
 */
async function cleanup() {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { telegramUserId: BigInt(TG_ID) },
        { email: `telegram+${TG_ID}@yekis.local` },
      ],
    },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.telegramLoginCode.deleteMany({ where: { userId: { in: ids } } }),
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

describe("Telegram bot-to-web sign-in codes", () => {
  beforeEach(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  // This is the flow that was entirely missing: a member pressing /start in the
  // bot had no account, so every command rejected them.
  it("provisions an account from a bot-delivered Telegram identity", async () => {
    const user = await resolveOrProvisionTelegramUser(
      { id: TG_ID, first_name: "Bot", last_name: "Member" },
      { chatId: TG_ID, role: "FREELANCER" },
    );

    expect(user.telegramUserId).toBe(BigInt(TG_ID));
    expect(user.telegramChatId).toBe(String(TG_ID));
    expect(user.role).toBe("FREELANCER");
    expect(user.passwordSetAt).toBeNull();
    expect(user.phone).toMatch(/^\+2510\d{6}$/);
    // The KYC relation must be returned so the bot can seed its session.
    expect(user.kyc?.tier).toBe("TIER_1");
    // F-02: a bot-delivered identity is not a verified identity. Previously
    // asserted VERIFIED, which let a Telegram signup satisfy every
    // requireKycVerified gate without submitting a document.
    expect(user.kyc?.status).toBe("PENDING");
  });

  it("resolves to the same account when the member returns", async () => {
    const first = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const second = await resolveOrProvisionTelegramUser({
      id: TG_ID,
      first_name: "Bot",
      last_name: "Renamed",
    });

    expect(second.id).toBe(first.id);
    expect(second.lastName).toBe("Renamed");
    // A repeat visit must not silently downgrade the role.
    expect(second.role).toBe("CLIENT");

    const count = await prisma.user.count({
      where: { telegramUserId: BigInt(TG_ID) },
    });
    expect(count).toBe(1);
  });

  it("issues a code and redeems it for a full session", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code, expiresAt } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });

    expect(code).toHaveLength(8);
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + TELEGRAM_CODE_TTL_SECONDS * 1000 + 1000,
    );

    const session = await redeemTelegramLoginCode(code);
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.user.id).toBe(user.id);
  });

  it("stores only a hash of the code, never the code itself", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });

    const rows = await prisma.telegramLoginCode.findMany({
      where: { userId: user.id },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.codeHash).not.toBe(code);
    expect(rows[0]!.codeHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("is single use — a second redemption fails", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });

    await expect(redeemTelegramLoginCode(code)).resolves.toBeDefined();
    await expect(redeemTelegramLoginCode(code)).rejects.toThrow(
      TelegramCodeError,
    );
  });

  it("lets only one of two concurrent redemptions win", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });

    const results = await Promise.allSettled([
      redeemTelegramLoginCode(code),
      redeemTelegramLoginCode(code),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  });

  it("revokes any outstanding code when a new one is issued", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const first = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });
    const second = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });

    await expect(redeemTelegramLoginCode(second.code)).resolves.toBeDefined();
    // The leaked older code is dead the moment a fresh one is minted.
    await expect(redeemTelegramLoginCode(first.code)).rejects.toThrow(
      TelegramCodeError,
    );
  });

  it("rejects an expired code", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });
    await prisma.telegramLoginCode.updateMany({
      where: { userId: user.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    await expect(redeemTelegramLoginCode(code)).rejects.toThrow(
      TelegramCodeError,
    );
  });

  it("refuses to issue a session for a suspended member", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });
    await prisma.user.update({
      where: { id: user.id },
      data: { isSuspended: true },
    });

    await expect(redeemTelegramLoginCode(code)).rejects.toThrow(/suspended/i);
  });

  it("gives the same rejection for unknown, spent and malformed codes", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });
    await redeemTelegramLoginCode(code);

    const messages = await Promise.all(
      ["ZZZZZZZZ", code, "abc", ""].map(async (input) => {
        try {
          await redeemTelegramLoginCode(input);
          return "NO THROW";
        } catch (err) {
          return (err as Error).message;
        }
      }),
    );

    // Identical wording: an attacker must not learn which codes ever existed.
    expect(new Set(messages).size).toBe(1);
  });

  it("accepts a code the member typed with different casing or separators", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    const { code } = await issueTelegramLoginCode({
      userId: user.id,
      telegramUserId: TG_ID,
    });

    const messy = `${code.slice(0, 4)}-${code.slice(4).toLowerCase()}`;
    await expect(redeemTelegramLoginCode(messy)).resolves.toBeDefined();
  });

  it("never generates a code containing an ambiguous character", async () => {
    const user = await resolveOrProvisionTelegramUser({ id: TG_ID, first_name: "Bot" });
    for (let i = 0; i < 50; i++) {
      const { code } = await issueTelegramLoginCode({
        userId: user.id,
        telegramUserId: TG_ID,
      });
      expect(code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
      // 0/O/1/I/L are excluded so a code read aloud cannot be mistyped into a
      // different valid code.
      expect(code).not.toMatch(/[01OIL]/);
    }
  });

  it("strips characters outside the alphabet when normalising", () => {
    expect(normalizeCode("ab3d-9f2k")).toBe("AB3D9F2K");
    expect(normalizeCode(" AB3D 9F2K ")).toBe("AB3D9F2K");
    // 0/O/1/I/L are dropped rather than mapped onto a valid symbol.
    expect(normalizeCode("0O1IL")).toBe("");
  });
});