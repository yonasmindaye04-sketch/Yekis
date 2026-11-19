// === IMPORTS ===
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { sendEmailVerificationCodeEmail } from "../../lib/email/email.service.js";

// === TYPES ===
export class EmailCodeNotFoundError extends Error {}
export class EmailCodeExpiredError extends Error {}
export class EmailCodeAttemptsExceededError extends Error {}
export class EmailCodeRateLimitedError extends Error {}
export class EmailCodeDeliveryFailedError extends Error {}
export class EmailCodeInvalidError extends Error {}

/**
 * What an email code proves. Each purpose has its own outstanding code, so an
 * onboarding code cannot be redeemed as a different kind of proof, and asking
 * for one kind does not cancel another.
 */
export type EmailCodePurpose = "EMAIL_VERIFICATION";

export interface EmailChallenge {
  /** Only returned in non-production so tests and local dev can read the code. */
  devCode?: string;
  expiresAt: Date;
  retryAfterSec: number;
}

// === CONSTANTS ===
const CODE_TTL_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_ATTEMPTS = 5;
/** After this many failures on an address, stop issuing codes to it entirely. */
const MAX_ISSUES_PER_WINDOW = 5;
const ISSUE_WINDOW_MS = 60 * 60 * 1000;

function now(): number {
  return Date.now();
}

/**
 * sha256(salt + code), hex. Salted so one leaked row cannot be tabulated.
 *
 * Deliberately the same construction as `hashCode` in
 * phone-verification.service.ts: both hashes are salted and neither stores the
 * code, so a row lifted from one table cannot be replayed against the other.
 */
export function hashEmailCode(salt: string, code: string): string {
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

/**
 * Canonical form of an address.
 *
 * Lower-cased and trimmed, so `Alice@Example.com ` and `alice@example.com`
 * are the same account and the same code row. This is the form `User.email`
 * is compared in, so a proof raised against one spelling is found against the
 * other.
 *
 * Only the domain is lower-cased for the local part in the strictest reading
 * of RFC 5321, but in practice every provider treats the local part
 * case-insensitively and the platform's uniqueness constraint is on the whole
 * string. Normalising both halves is what stops a second account being
 * created for the same inbox with a different capitalisation.
 */
export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

/**
 * A conservative address shape check.
 *
 * This is a delivery-readiness gate, not a deliverability proof: the code
 * itself is the proof. It rejects the shapes that are certainly undeliverable
 * (no `@`, no domain, a space) so we do not burn a send on them, and it caps
 * the length so a megabyte of text cannot be posted at the mail transport.
 */
export function isDeliverableEmailShape(email: string): boolean {
  if (email.length > 254) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return false;
  return true;
}

// === MAIN FUNCTIONS ===

/**
 * Issues a fresh code for an address, replacing any outstanding one.
 *
 * The previous outstanding challenge is deleted first so an earlier code
 * cannot be used after a resend.
 */
export async function requestEmailCode(params: {
  email: string;
  userId?: string | null;
  purpose?: EmailCodePurpose;
  /** Shown to the recipient so they can tell what the code is for. */
  purposeLabel?: string;
}): Promise<EmailChallenge> {
  const email = normalizeEmail(params.email);
  const purpose = params.purpose ?? "EMAIL_VERIFICATION";

  if (!isDeliverableEmailShape(email)) {
    throw new EmailCodeInvalidError("Enter a valid email address.");
  }

  // Throttle by address AND purpose. Without this, anyone can burn a target's
  // mail quota.
  const issuesSince = await prisma.emailVerificationCode.count({
    where: { email, purpose, createdAt: { gte: new Date(now() - ISSUE_WINDOW_MS) } },
  });
  if (issuesSince >= MAX_ISSUES_PER_WINDOW) {
    throw new EmailCodeRateLimitedError(
      "Too many codes requested for this address. Try again in an hour.",
    );
  }

  const existing = await prisma.emailVerificationCode.findFirst({
    where: { email, purpose, verifiedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (existing && now() - existing.createdAt.getTime() < RESEND_COOLDOWN_MS) {
    const wait = Math.ceil(
      (RESEND_COOLDOWN_MS - (now() - existing.createdAt.getTime())) / 1000,
    );
    throw new EmailCodeRateLimitedError(
      `Wait ${wait}s before requesting another code.`,
    );
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const salt = randomBytes(16).toString("hex");
  const expiresAt = new Date(now() + CODE_TTL_MS);

  const row = await prisma.$transaction(async (tx) => {
    // Replacing inside one transaction is what makes "one outstanding code per
    // address" true. Prisma 5.22 cannot express a partial unique index and
    // adding it with raw SQL alone would make the migrated schema diverge from
    // schema.prisma (db:check-fresh compares the two and would fail), so the
    // rule is enforced here instead — the same way the phone-code service does
    // it. The check is inside the transaction so a concurrent second send
    // cannot slip a row in between the delete and the insert.
    await tx.emailVerificationCode.deleteMany({
      where: { email, purpose, verifiedAt: null },
    });

    const created = await tx.emailVerificationCode.create({
      data: {
        email,
        userId: params.userId ?? null,
        purpose,
        codeHash: hashEmailCode(salt, code),
        salt,
        expiresAt,
      },
    });

    // Belt and braces: if anything else inserted an open row for this address
    // while we were working, the oldest is discarded so only the newest code
    // is ever live. An older live code is the thing an attacker would replay.
    const stillOpen = await tx.emailVerificationCode.findMany({
      where: { email, purpose, verifiedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (stillOpen.length > 1) {
      await tx.emailVerificationCode.deleteMany({
        where: { id: { in: stillOpen.slice(1).map((r) => r.id) } },
      });
    }

    return created;
  });

  const { sent } = await deliverVerificationCode({
    email,
    code,
    purposeLabel: params.purposeLabel,
  });

  if (!sent) {
    // Do not leave a live code behind that the user could never receive, and do
    // not report success for a message that was not delivered.
    await prisma.emailVerificationCode.delete({ where: { id: row.id } });
    throw new EmailCodeDeliveryFailedError(
      "Could not send an email to that address. Check it and try again.",
    );
  }

  logger.info({ email, purpose }, "Email verification code issued");

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
 * Deliberately says nothing about whether the address is registered anywhere:
 * "that address has no account" is an account-enumeration oracle.
 */
export async function verifyEmailCode(params: {
  email: string;
  code: string;
  userId?: string | null;
  purpose?: EmailCodePurpose;
}): Promise<{ verified: true }> {
  const email = normalizeEmail(params.email);
  const submitted = params.code.trim();
  const purpose = params.purpose ?? "EMAIL_VERIFICATION";

  const row = await prisma.emailVerificationCode.findFirst({
    where: { email, purpose, verifiedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!row) {
    // Same shape of error as a wrong code, on purpose.
    throw new EmailCodeNotFoundError("That code is not valid.");
  }
  if (row.expiresAt.getTime() < now()) {
    throw new EmailCodeExpiredError("That code has expired. Request a new one.");
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw new EmailCodeAttemptsExceededError(
      "Too many incorrect attempts. Request a new code.",
    );
  }

  const expected = row.codeHash;
  const actual = hashEmailCode(row.salt, submitted);
  const ok = safeEqual(expected, actual);

  if (!ok) {
    await prisma.emailVerificationCode.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw new EmailCodeInvalidError("That code is not valid.");
  }

  // A code issued to one account must not verify another.
  if (row.userId && params.userId && row.userId !== params.userId) {
    throw new EmailCodeInvalidError("That code is not valid.");
  }

  const verifiedAt = new Date();
  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationCode.update({
      where: { id: row.id },
      data: { verifiedAt, attempts: { increment: 1 } },
    });

    // Record the outcome on the account.
    //
    // Only when there IS an account to mark. The primary case is registration,
    // where the user does not exist yet; `registerUser` picks the proof up
    // from this same row instead.
    //
    // Conditional on `email` so a verification for one address can never mark a
    // *different* address on the same account as verified.
    if (params.userId) {
      await tx.user.updateMany({
        where: {
          id: params.userId,
          // The stored address may have been registered with a different
          // capitalisation, so this cannot be an exact match: `equals` is
          // case-sensitive on PostgreSQL, and an exact match would silently
          // update nothing while the endpoint answered `verified: true`.
          email: { equals: email, mode: "insensitive" },
        },
        data: { emailVerified: true, emailVerifiedAt: verifiedAt },
      });
    }
  });

  return { verified: true };
}

/**
 * Whether an address was proven before this moment.
 *
 * Used by registration, where the code is verified while the account still does
 * not exist. A code older than `maxAgeMs` no longer counts: proving control of
 * an address weeks before creating the account says little about who is
 * sitting at the keyboard now.
 */
export async function hasRecentVerifiedEmailCode(
  email: string,
  maxAgeMs = CODE_TTL_MS,
  purpose: EmailCodePurpose = "EMAIL_VERIFICATION",
): Promise<boolean> {
  const row = await prisma.emailVerificationCode.findFirst({
    where: {
      email: normalizeEmail(email),
      purpose,
      verifiedAt: { not: null, gte: new Date(now() - maxAgeMs) },
    },
    orderBy: { verifiedAt: "desc" },
    select: { verifiedAt: true },
  });
  return row !== null;
}

/**
 * Test/maintenance helper: clear outstanding challenges for an address.
 */
export async function clearEmailChallenges(
  email: string,
  purpose: EmailCodePurpose | "ALL" = "EMAIL_VERIFICATION",
): Promise<number> {
  const { count } = await prisma.emailVerificationCode.deleteMany({
    where: {
      email: normalizeEmail(email),
      verifiedAt: null,
      ...(purpose === "ALL" ? {} : { purpose }),
    },
  });
  return count;
}

/**
 * Whether SMTP is actually configured.
 *
 * `sendEmail` only builds a transport when all three credentials are present.
 * This is the same question, asked without side effects.
 */
export function isSmtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);
}

/**
 * Whether the platform can actually deliver a code right now.
 *
 * Used by the onboarding UI's channel discovery: on a host with no SMTP
 * credentials the email step would 503, and on a host with no SMS key the
 * phone step would 503. Returning booleans derived from the configuration is
 * the same shape as `GET /auth/oauth/providers` and reveals nothing about any
 * account.
 *
 * Outside production the console fallback is available, so the channel IS
 * usable — the code lands in the server log instead of an inbox. On a hosted
 * testing environment that is the difference between a signup that works and
 * a signup that dead-ends at the first step.
 */
export function isEmailDeliveryConfigured(): boolean {
  if (env.NODE_ENV !== "production") return true;
  return isSmtpConfigured();
}

/**
 * Delivers the code, with a console fallback for non-production hosts.
 *
 * WHY THE FALLBACK EXISTS
 * The first onboarding step has to be deliverable on a host that has no SMTP
 * credentials — a testing deployment usually does not. `sendEmail` refuses to
 * pretend a message was delivered when SMTP is missing outside development,
 * which is correct for the password-reset token (a live bearer credential).
 * An onboarding code is a different thing: it authorises creating an account,
 * not entering one, and outside production it is already returned to the
 * caller in the API response. Writing it to the server log therefore adds no
 * exposure that does not already exist, and it turns a dead signup into a
 * working one.
 *
 * In production there is no fallback: a missing SMTP configuration is a
 * misconfiguration and the caller is told the message was not delivered.
 */
async function deliverVerificationCode(params: {
  email: string;
  code: string;
  purposeLabel?: string;
}): Promise<{ sent: boolean }> {
  const result = await sendEmailVerificationCodeEmail({
    email: params.email,
    code: params.code,
    purposeLabel: params.purposeLabel,
  });
  if (result.success) return { sent: true };

  // SMTP is configured but the send failed: a real delivery failure. Report
  // it; do not paper over a broken mail server.
  if (isSmtpConfigured()) return { sent: false };

  if (env.NODE_ENV === "production") return { sent: false };

  // No SMTP, not production: print the code to the server log so a testing
  // host can complete the flow.
  //
  // Deliberately NOT logged through `logger`: the logger redacts every key
  // named `code` (it is a one-time code, and redaction is the right default).
  // This mirrors the development-only fallback in lib/email/email.service.ts.
  // eslint-disable-next-line no-console
  console.log(
    `\n================== [DEV - NOT SENT] EMAIL OTP ==================\n` +
      `To: ${params.email}\n` +
      `Code: ${params.code}\n` +
      `SMTP is not configured on this host, so the code was not delivered by mail.\n` +
      `===============================================================\n`,
  );
  return { sent: true };
}
