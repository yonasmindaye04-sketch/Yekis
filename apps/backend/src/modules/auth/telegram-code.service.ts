// === IMPORTS ===
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { createAuthTokens } from "./auth.service.js";

// === MAIN FUNCTIONS ===
export class TelegramCodeError extends Error {}
export class TelegramCodeInvalidError extends TelegramCodeError {}
export class TelegramCodeExpiredError extends TelegramCodeError {}

/**
 * Telegram-to-web sign-in codes.
 *
 * WHY THIS EXISTS
 * The bot can prove who someone is: Telegram delivers the update to our
 * webhook/polling connection, so `from.id` is authenticated server-side. The
 * browser cannot present that proof. Its only native option is the official
 * Login Widget, which requires the domain to be pre-registered with
 * @BotFather via /setdomain and is blocked outright by some corporate
 * networks and ad blockers — leaving the button dead with no diagnostic.
 *
 * So the bot mints a short code and the web redeems it for a normal session,
 * the same device-code shape used by CLI and desktop login.
 *
 * SECURITY
 * - Only the SHA-256 of the code is stored, so a database leak yields nothing.
 * - The alphabet omits 0/O/1/I/L so a code read off a screenshot or dictated
 *   over the phone cannot be mistyped into a different valid code.
 * - Single use: consumption is a conditional UPDATE, so two concurrent
 *   redemptions cannot both win.
 * - Issuing a new code revokes every earlier outstanding code for that member,
 *   so a leaked older code is worthless the moment a fresh one is requested.
 * - Redemption is a bare hash-index lookup: no scan, no per-user enumeration.
 */

// === INTERFACES & TYPES ===

/** 8 characters from a 32-symbol, human-transcribable alphabet. */
const CODE_LENGTH = 8;
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
export const TELEGRAM_CODE_TTL_SECONDS = 600; // 10 minutes

function generateCode(): string {
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  }
  return code;
}

function hashCode(code: string): string {
  return createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
}

/** Normalises user input so "ab3d-9f2k" and "AB3D9F2K" are the same code. */
export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .split("")
    .filter((c) => CODE_ALPHABET.includes(c))
    .join("");
}

/**
 * Mints a fresh single-use code for an authenticated member and revokes any
 * code they already had outstanding.
 */
export async function issueTelegramLoginCode(params: {
  userId: string;
  telegramUserId: number;
}) {
  // Revoke first so a leaked earlier code dies before the new one is usable.
  await prisma.telegramLoginCode.updateMany({
    where: { userId: params.userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const code = generateCode();
  const expiresAt = new Date(Date.now() + TELEGRAM_CODE_TTL_SECONDS * 1000);

  await prisma.telegramLoginCode.create({
    data: {
      userId: params.userId,
      telegramUserId: BigInt(params.telegramUserId),
      codeHash: hashCode(code),
      expiresAt,
    },
  });

  await recordAuditEvent({
    userId: params.userId,
    eventType: "TELEGRAM_WEB_CODE_ISSUED",
    entityType: "User",
    entityId: params.userId,
    metadata: { telegramId: params.telegramUserId, expiresAt: expiresAt.toISOString() },
  });

  return { code, expiresAt };
}

/**
 * One message for every failure mode — unknown, malformed, expired, already
 * spent. Distinct wording would tell an attacker which half of the code space
 * they had hit, and the guidance ("ask the bot for a new code") is correct for
 * every case anyway.
 */
const INVALID_CODE_MESSAGE =
  "That code is invalid or has expired. Send /login to the bot for a new one.";

/**
 * Redeems a code for a full session. Consumes it atomically, so a code can
 * never be spent twice even under concurrent requests.
 */
export async function redeemTelegramLoginCode(rawCode: string) {
  const normalized = normalizeCode(rawCode);
  if (normalized.length !== CODE_LENGTH) {
    throw new TelegramCodeInvalidError(INVALID_CODE_MESSAGE);
  }

  const record = await prisma.telegramLoginCode.findUnique({
    where: { codeHash: hashCode(normalized) },
    include: { user: true },
  });

  const invalid = new TelegramCodeInvalidError(INVALID_CODE_MESSAGE);

  if (!record) throw invalid;

  if (record.expiresAt < new Date()) throw invalid;

  // Conditional update: only the request that flips usedAt from NULL wins.
  const claimed = await prisma.telegramLoginCode.updateMany({
    where: { id: record.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count === 0) throw invalid;

  if (record.user.isSuspended) {
    throw new TelegramCodeError("This account is suspended. Contact support.");
  }

  await recordAuditEvent({
    userId: record.userId,
    eventType: "TELEGRAM_WEB_CODE_REDEEMED",
    entityType: "User",
    entityId: record.userId,
    metadata: { telegramId: Number(record.telegramUserId) },
  });

  return {
    ...(await createAuthTokens(record.user)),
    user: {
      id: record.user.id,
      ucid: record.user.ucid,
      role: record.user.role,
      email: record.user.email,
      phone: record.user.phone,
      languagePreference: record.user.languagePreference,
    },
  };
}

/**
 * Constant-time comparison helper exposed for callers that need to verify a
 * secret without leaking length/prefix information through timing.
 */
export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Housekeeping: drop codes that can no longer be redeemed. Cheap to run on an
 * interval; the table stays bounded to one row per member.
 */
export async function purgeExpiredTelegramLoginCodes(): Promise<number> {
  const { count } = await prisma.telegramLoginCode.deleteMany({
    where: {
      OR: [{ expiresAt: { lt: new Date() } }, { usedAt: { not: null } }],
    },
  });
  return count;
}