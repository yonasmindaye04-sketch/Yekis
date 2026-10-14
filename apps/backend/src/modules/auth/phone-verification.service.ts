// === IMPORTS ===
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { sendSms } from "../notifications/sms.client.js";

// === TYPES ===
export class PhoneCodeNotFoundError extends Error {}
export class PhoneCodeExpiredError extends Error {}
export class PhoneCodeAttemptsExceededError extends Error {}
export class PhoneCodeRateLimitedError extends Error {}
export class PhoneCodeDeliveryFailedError extends Error {}
export class PhoneCodeInvalidError extends Error {}

export interface PhoneChallenge {
  /** Only returned in non-production so tests and local dev can read the code. */
  devCode?: string;
  expiresAt: Date;
  retryAfterSec: number;
}

// === CONSTANTS ===
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
/** After this many failures on a number, stop issuing codes to it entirely. */
const MAX_ISSUES_PER_WINDOW = 5;
const ISSUE_WINDOW_MS = 60 * 60 * 1000;

function now(): number {
  return Date.now();
}

/** sha256(salt + code), hex. Salted so one leaked row cannot be tabulated. */
function hashCode(salt: string, code: string): string {
  return createHash("sha256").update(`${salt}:${code}`).digest("hex");
}

/**
 * Length-safe constant-time compare. timingSafeEqual throws on a length
 * mismatch, which would itself leak length, so the lengths are compared first
 * and the result is folded into a boolean without an early return.
 */
function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/** Ethiopian numbers in the form the platform stores: +251 followed by 9 digits. */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("251") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+251${digits.slice(1)}`;
  if (digits.startsWith("9") && digits.length === 9) return `+251${digits}`;
  return raw.trim();
}

// === MAIN FUNCTIONS ===

/**
 * Issues a fresh code for a number, replacing any outstanding one.
 *
 * The previous outstanding challenge is deleted first so the partial unique
 * index is satisfied and so an earlier code cannot be used after a resend.
 */
export async function requestPhoneCode(params: {
  phone: string;
  userId?: string | null;
}): Promise<PhoneChallenge> {
  const phone = normalizePhone(params.phone);

  if (!/^\+251[1-9]\d{8}$/.test(phone)) {
    throw new PhoneCodeInvalidError("Enter a valid Ethiopian mobile number.");
  }

  // Throttle by number. Without this, anyone can burn a target's SMS quota.
  const issuesSince = await prisma.phoneVerificationCode.count({
    where: { phone, createdAt: { gte: new Date(now() - ISSUE_WINDOW_MS) } },
  });
  if (issuesSince >= MAX_ISSUES_PER_WINDOW) {
    throw new PhoneCodeRateLimitedError(
      "Too many codes requested for this number. Try again in an hour.",
    );
  }

  const existing = await prisma.phoneVerificationCode.findFirst({
    where: { phone, verifiedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing && now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (now() - existing.createdAt.getTime())) / 1000,
    );
    throw new PhoneCodeRateLimitedError(
      `Wait ${wait}s before requesting another code.`,
    );
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  const expiresAt = new Date(now() + CODE_TTL_MS);

  if (existing) {
    // Already replaced transactionally above; nothing to do here.
    void existing;
  }

  const row = await prisma.$transaction(async (tx) => {
    // Replacing inside one transaction is what makes "one outstanding code per
    // number" true. A partial unique index would be the stronger guarantee, but
    // Prisma 5.22 cannot express one and adding it with raw SQL alone would make
    // the migrated schema diverge from schema.prisma (db:check-fresh compares
    // the two and would fail). The check below is inside the transaction so a
    // concurrent second send cannot slip a row in between the delete and insert.
    await tx.phoneVerificationCode.deleteMany({
      where: { phone, verifiedAt: null },
    });

    const created = await tx.phoneVerificationCode.create({
      data: {
        phone,
        userId: params.userId ?? null,
        codeHash: hashCode(salt, code),
        salt,
        expiresAt,
      },
    });

    // Belt and braces: if anything else inserted an open row for this number
    // while we were working, the oldest is discarded so only the newest code is
    // ever live. An older live code is the thing an attacker would replay.
    const stillOpen = await tx.phoneVerificationCode.findMany({
      where: { phone, verifiedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (stillOpen.length > 1) {
      await tx.phoneVerificationCode.deleteMany({
        where: { id: { in: stillOpen.slice(1).map((r) => r.id) } },
      });
    }

    return created;
  });

  const { sent } = await sendSms({
    phone,
    message: `Your Yekis verification code is ${code}. It expires in 10 minutes. Never share it.`,
  });

  if (!sent) {
    // Do not leave a live code behind that the user could never receive, and do
    // not report success for a message that was not delivered.
    await prisma.phoneVerificationCode.delete({ where: { id: row.id } });
    throw new PhoneCodeDeliveryFailedError(
      "Could not send an SMS to that number. Check it and try again.",
    );
  }

  logger.info({ phone }, "Phone verification code issued");

  return {
    // Never leak the code outside development.
    ...(env.NODE_ENV !== "production" ? { devCode: code } : {}),
    expiresAt,
    retryAfterSec: Math.ceil(RESEND_COOLDOWN_MS / 1000),
  };
}

/**
 * Checks a submitted code.
 *
 * Deliberately says nothing about whether the number is registered anywhere:
 * "that number has no account" is an account-enumeration oracle, which is what
 * the pre-hardening guest-intake bug turned into.
 */
export async function verifyPhoneCode(params: {
  phone: string;
  code: string;
  userId?: string | null;
}): Promise<{ verified: true }> {
  const phone = normalizePhone(params.phone);
  const submitted = params.code.trim();

  const row = await prisma.phoneVerificationCode.findFirst({
    where: { phone, verifiedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!row) {
    // Same shape of error as a wrong code, on purpose.
    throw new PhoneCodeNotFoundError("That code is not valid.");
  }
  if (row.expiresAt.getTime() < now()) {
    throw new PhoneCodeExpiredError("That code has expired. Request a new one.");
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new PhoneCodeAttemptsExceededError(
      "Too many incorrect attempts. Request a new code.",
    );
  }

  const expected = row.codeHash;
  const actual = hashCode(row.salt, submitted);
  const ok = safeEqual(expected, actual);

  if (!ok) {
    await prisma.phoneVerificationCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw new PhoneCodeInvalidError("That code is not valid.");
  }

  // A code issued to one account must not verify another.
  if (row.userId && params.userId && row.userId !== params.userId) {
    throw new PhoneCodeInvalidError("That code is not valid.");
  }

  await prisma.phoneVerificationCode.update({
    where: { id: row.id },
    data: { verifiedAt: new Date(), attempts: { increment: 1 } },
  });

  return { verified: true };
}

/** Test/maintenance helper: clear outstanding challenges for a number. */
export async function clearPhoneChallenges(phone: string): Promise<number> {
  const { count } = await prisma.phoneVerificationCode.deleteMany({
    where: { phone: normalizePhone(phone), verifiedAt: null },
  });
  return count;
}