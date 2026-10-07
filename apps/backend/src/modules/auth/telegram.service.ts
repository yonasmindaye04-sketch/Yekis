// === IMPORTS ===
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import argon2 from "argon2";
import { z } from "zod";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { createAuthTokens } from "./auth.service.js";
import type { AuthMethod } from "./auth-methods.js";
import {
  AccountLinkRequiredError,
  accountLinkRequiredMessage,
  isPasswordOwnedAccount,
  isUniqueConstraintViolation,
  withPlaceholderPhone,
} from "./identity.js";

// === MAIN FUNCTIONS ===
export class TelegramAuthError extends Error {}
export class TelegramNotConfiguredError extends Error {}
export class TelegramAccountConflictError extends Error {}
export class NeedsOnboardingError extends Error {
  constructor(message: string = "User not found, needs onboarding.") {
    super(message);
    this.name = "NeedsOnboardingError";
  }
}
export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// === INTERFACES & TYPES ===
export type TgUser = {
  id: bigint;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  photoUrl?: string;
};

const NL = '\n';

function dataCheckString(entries: [string, string][]) {
  return entries
    .filter(([k]) => k !== 'hash')
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([k, v]) => `${k}=${v}`)
    .join(NL);
}

function safeEqualHex(a: string, b: string) {
  const x = Buffer.from(a, 'hex');
  const y = Buffer.from(b, 'hex');
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

function assertFresh(authDateRaw: string | null | undefined, maxAgeSec: number) {
  if (!authDateRaw) throw new AuthError('NO_AUTH_DATE');
  const authDateSeconds = Number(authDateRaw);
  if (!Number.isFinite(authDateSeconds)) throw new AuthError('INVALID_AUTH_DATE');
  const ageSeconds = Math.floor(Date.now() / 1000) - authDateSeconds;
  if (ageSeconds < 0 || ageSeconds > maxAgeSec) throw new AuthError('STALE_AUTH_DATE');
}

export function verifyMiniAppInitData(raw: string, botToken: string, maxAgeSec = 3600): TgUser {
  const p = new URLSearchParams(raw);
  const hash = p.get('hash') ?? '';
  const secret = createHmac('sha256', 'WebAppData').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString([...p.entries()])).digest('hex');
  if (!safeEqualHex(expected, hash)) throw new AuthError('BAD_SIGNATURE');
  assertFresh(p.get('auth_date'), maxAgeSec);
  const u = JSON.parse(p.get('user') ?? 'null');
  if (!u?.id) throw new AuthError('NO_USER');
  return { 
    id: BigInt(u.id), 
    firstName: u.first_name || "", 
    lastName: u.last_name, 
    username: u.username, 
    languageCode: u.language_code,
    photoUrl: u.photo_url 
  };
}

export function verifyLoginWidget(payload: Record<string, string | number>, botToken: string, maxAgeSec = 300): TgUser {
  const entries = Object.entries(payload).map(([k, v]) => [k, String(v)] as [string, string]);
  const hash = String(payload.hash ?? '');
  const secret = createHash('sha256').update(botToken).digest();
  const expected = createHmac('sha256', secret).update(dataCheckString(entries)).digest('hex');
  if (!safeEqualHex(expected, hash)) throw new AuthError('BAD_SIGNATURE');
  assertFresh(String(payload.auth_date), maxAgeSec);
  return { 
    id: BigInt(payload.id as string), 
    firstName: String(payload.first_name || ""),
    lastName: payload.last_name ? String(payload.last_name) : undefined,
    username: payload.username as string | undefined,
    photoUrl: payload.photo_url as string | undefined
  };
}

function telegramEmail(telegramId: bigint) {
  return `telegram+${telegramId}@yekis.local`;
}

function telegramChatId(telegramId: bigint) {
  return String(telegramId);
}

function profileFields(telegram: TgUser) {
  const displayName = telegram.firstName
    ? `${telegram.firstName}${telegram.lastName ? " " + telegram.lastName : ""}`
    : undefined;

  return {
    firstName: telegram.firstName || undefined,
    lastName: telegram.lastName || undefined,
    displayName,
    avatarUrl: telegram.photoUrl || undefined,
    languagePreference: telegram.languageCode === "am" ? "am" : "en",
  };
}

export async function findUserByTelegramIdentity(telegramId: bigint) {
  return prisma.user.findUnique({
    where: { telegramUserId: telegramId },
  });
}

async function findUserBySyntheticEmail(telegramId: bigint) {
  return prisma.user.findUnique({ where: { email: telegramEmail(telegramId) } });
}

/**
 * The shape Telegram delivers on an inbound update (`from`). Kept separate
 * from {@link TgUser} because the field names are snake_case here and `id` is
 * still a JS number — it must be widened to BigInt exactly once, at this
 * boundary, rather than compared as a number anywhere downstream.
 */
export type TelegramIdentity = {
  id: bigint | string | number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

function toTgUser(identity: TelegramIdentity): TgUser {
  return {
    id: BigInt(identity.id),
    firstName: identity.first_name ?? "",
    lastName: identity.last_name,
    username: identity.username,
    languageCode: identity.language_code,
    photoUrl: identity.photo_url,
  };
}

/**
 * Resolves the Yekis account behind an ALREADY-VERIFIED Telegram identity,
 * provisioning one if this Telegram account has never been seen.
 *
 * LEGACY. Retained for the bot entry point (handlers/commands.ts) and its test
 * suite; the route layer no longer provisions (POST /telegram/miniapp returns
 * 409 NEEDS_ONBOARDING instead). Removed once the onboarding conversation
 * replaces bot-side provisioning.
 *
 * Trust anchor: Telegram delivers the update to our own webhook/polling
 * connection, so `from.id` is authenticated by Telegram itself. That is the
 * same assurance as a verified Login Widget payload and involves no
 * client-supplied data.
 *
 * A requested `role` only applies at provisioning time, so a repeat sign-in
 * can never silently downgrade a member.
 */
export async function resolveOrProvisionTelegramUser(
  identity: TelegramIdentity,
  options: { role?: string; chatId?: string | number } = {},
) {
  const telegram = toTgUser(identity);
  const chatId = String(options.chatId ?? telegramChatId(telegram.id));
  const profile = profileFields(telegram);
  const selectedRole =
    options.role === "FREELANCER" || options.role === "BOTH"
      ? options.role
      : "CLIENT";

  const existing = await findUserByTelegramIdentity(telegram.id);
  if (existing) {
    // Returning member: refresh the mutable profile fields and re-assert the
    // chat target, which the bot clears when a member blocks it.
    return prisma.user.update({
      where: { id: existing.id },
      data: { ...profile, telegramChatId: chatId },
      include: { kyc: { select: { tier: true, status: true } } },
    });
  }

  const legacy = await findUserBySyntheticEmail(telegram.id);
  if (legacy) {
    // The synthetic address is only ever issued to Telegram, so an email hit is
    // the same human on an account provisioned before telegramUserId was
    // persisted. A password-owned account is the exception: it came from the
    // public sign-up form and must be claimed from an authenticated session.
    if (isPasswordOwnedAccount(legacy)) {
      throw new AccountLinkRequiredError(accountLinkRequiredMessage(legacy.email));
    }
    return prisma.user.update({
      where: { id: legacy.id },
      data: { ...profile, telegramUserId: telegram.id, telegramChatId: chatId },
      include: { kyc: { select: { tier: true, status: true } } },
    });
  }

  // Sentinel hash of a random secret: the account has no platform password.
  // passwordSetAt stays NULL to mark it federated-owned, which is what lets a
  // later social sign-in on the same address merge into it safely.
  const sentinelHash = await argon2.hash(randomBytes(32).toString("hex"));

  return withPlaceholderPhone((phone) =>
    prisma.user.create({
      data: {
        email: telegramEmail(telegram.id),
        phone,
        passwordHash: sentinelHash,
        role: selectedRole as any,
        firstName: telegram.firstName || "",
        lastName: telegram.lastName || "",
        displayName: profile.displayName ?? "Telegram Member",
        avatarUrl: telegram.photoUrl || null,
        languagePreference: profile.languagePreference,
        telegramUserId: telegram.id,
        telegramChatId: chatId,
        kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
        wallet: { create: { balanceMinor: 0 } },
        consents: {
          create: [
            { purpose: "kyc_data_processing", granted: true },
            { purpose: "financial_data_processing", granted: true },
            { purpose: "platform_notifications", granted: true },
            { purpose: "telegram_account_linking", granted: true },
            { purpose: "marketing_communications", granted: false },
            { purpose: "analytics", granted: false },
          ],
        },
      },
      include: { kyc: { select: { tier: true, status: true } } },
    }),
  );
}

export async function loginWithTelegram(telegram: TgUser, method: AuthMethod = "tg_miniapp") {
  const existing = await findUserByTelegramIdentity(telegram.id);
  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { ...profileFields(telegram), telegramChatId: telegramChatId(telegram.id) },
      include: { kyc: { select: { tier: true, status: true } } },
    });
    return buildAuthResponse(updated, telegram, method);
  }

  const legacy = await findUserBySyntheticEmail(telegram.id);
  if (legacy) {
    if (isPasswordOwnedAccount(legacy)) {
      throw new AccountLinkRequiredError(accountLinkRequiredMessage(legacy.email));
    }
    const updated = await prisma.user.update({
      where: { id: legacy.id },
      data: {
        ...profileFields(telegram),
        telegramUserId: telegram.id,
        telegramChatId: telegramChatId(telegram.id),
      },
      include: { kyc: { select: { tier: true, status: true } } },
    });
    return buildAuthResponse(updated, telegram, method);
  }

  throw new NeedsOnboardingError("User not found, needs onboarding.");
}

export async function registerTelegramUser(telegram: TgUser, role: string) {
  if (role !== "CLIENT" && role !== "FREELANCER") {
    throw new Error("Invalid role");
  }

  const sentinelHash = await argon2.hash(randomBytes(32).toString("hex"));
  const profile = profileFields(telegram);

  const user = await withPlaceholderPhone((phone) =>
    prisma.user.create({
      data: {
        email: telegramEmail(telegram.id),
        phone,
        passwordHash: sentinelHash,
        role: role as any,
        firstName: telegram.firstName || "",
        lastName: telegram.lastName || "",
        displayName: profile.displayName ?? "Telegram Member",
        avatarUrl: telegram.photoUrl || null,
        languagePreference: profile.languagePreference,
        telegramUserId: telegram.id,
        telegramChatId: telegramChatId(telegram.id),
        kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
        wallet: { create: { balanceMinor: 0 } },
        consents: {
          create: [
            { purpose: "kyc_data_processing", granted: true },
            { purpose: "financial_data_processing", granted: true },
            { purpose: "platform_notifications", granted: true },
            { purpose: "telegram_account_linking", granted: true },
            { purpose: "marketing_communications", granted: false },
            { purpose: "analytics", granted: false },
          ],
        },
      },
      include: { kyc: { select: { tier: true, status: true } } },
    })
  );

  return buildAuthResponse(user, telegram, "tg_miniapp");
}

/**
 * Shared session envelope for every Telegram entry point.
 *
 * `method` becomes the token's `amr`, and it is never `pwd`/`totp`/`email_otp`:
 * a Telegram proof is not a strong factor, so a session minted here can browse
 * and transact but cannot move money or change credentials without a step-up.
 */
export async function buildAuthResponse(user: any, telegram: TgUser, method: AuthMethod) {
  await recordAuditEvent({
    userId: user.id,
    eventType: "TELEGRAM_LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: {
      telegramId: telegram.id.toString(),
      username: telegram.username ?? null,
      firstName: telegram.firstName ?? null,
      lastName: telegram.lastName ?? null,
    },
  });

  return {
    ...(await createAuthTokens(user, [method])),
    user: {
      id: user.id,
      ucid: user.ucid,
      role: user.role,
      email: user.email,
      phone: user.phone,
      languagePreference: user.languagePreference,
    },
    telegram: {
      id: telegram.id.toString(),
      username: telegram.username ?? null,
      firstName: telegram.firstName ?? null,
      lastName: telegram.lastName ?? null,
      photoUrl: telegram.photoUrl ?? null,
    },
  };
}

export async function linkTelegramToUser(userId: string, telegram: TgUser) {
  const chatId = telegramChatId(telegram.id);

  const owner = await findUserByTelegramIdentity(telegram.id);
  if (owner && owner.id !== userId) {
    throw new TelegramAccountConflictError("This Telegram account is already linked to a different Yekis account.");
  }

  try {
    const user = await prisma.user.update({
      where: { id: userId },
      data: { telegramUserId: telegram.id, telegramChatId: chatId },
    });

    await recordAuditEvent({
      userId: user.id,
      eventType: "TELEGRAM_ACCOUNT_LINKED",
      entityType: "User",
      entityId: user.id,
      metadata: { telegramId: telegram.id.toString(), username: telegram.username ?? null },
    });

    return { telegramUserId: telegram.id.toString(), telegramChatId: chatId };
  } catch (err) {
    if (isUniqueConstraintViolation(err)) {
      throw new TelegramAccountConflictError("This Telegram account is already linked to a different Yekis account.");
    }
    throw err;
  }
}

export async function unlinkTelegramFromUser(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { telegramUserId: null, telegramChatId: null },
  });

  await recordAuditEvent({
    userId,
    eventType: "TELEGRAM_ACCOUNT_UNLINKED",
    entityType: "User",
    entityId: userId,
  });

  return { unlinked: true };
}
