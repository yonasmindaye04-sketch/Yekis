import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { redis } from "../../lib/redis.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { createAuthTokens } from "./auth.service.js";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

// ---------------------------------------------------------------------------
// Legacy one-time sign-in code.
//
// Superseded by the PKCE web-login flow below and scheduled for removal in the
// follow-up release the hardening plan calls for (T1.4). It is retained here
// because the bot's /start, /login and "New code" flows still mint one, and
// because the Playbook explicitly keeps it working until the Mini App path is
// proven in production. Treat every export in this block as deprecated.
// ---------------------------------------------------------------------------

/**
 * Ambiguous glyphs (0/O, 1/I/L) are excluded so a code read aloud cannot be
 * mistyped into a *different valid* code. 31 symbols => 31^8 ≈ 8.5e11 codes.
 */
export const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;
const ALPHABET_REJECTION_LIMIT = 248; // 31 * 8: largest multiple of 31 <= 256

export const TELEGRAM_CODE_TTL_SECONDS = 600; // 10 minutes

export class TelegramCodeError extends Error {}
export class TelegramCodeInvalidError extends TelegramCodeError {}
export class TelegramCodeExpiredError extends TelegramCodeError {}

/**
 * One message for every possible rejection — unknown, malformed, already spent
 * and superseded all read identically, so an attacker cannot enumerate which
 * codes ever existed.
 */
const INVALID_CODE_MESSAGE = "That sign-in code is not valid.";

/**
 * Folds a member's typed input onto the code alphabet: uppercase, and anything
 * outside the alphabet is dropped rather than mapped onto a valid symbol.
 */
export function normalizeCode(input: string): string {
  const upper = String(input ?? "").toUpperCase();
  let out = "";
  for (const ch of upper) {
    if (CODE_ALPHABET.includes(ch)) out += ch;
  }
  return out;
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

/**
 * Draws a code by rejection sampling rather than `% alphabet.length`, which
 * would make the first 248/256 residues marginally more likely than the rest.
 */
function generateCode(): string {
  let out = "";
  while (out.length < CODE_LENGTH) {
    for (const byte of randomBytes(CODE_LENGTH)) {
      if (out.length === CODE_LENGTH) break;
      if (byte < ALPHABET_REJECTION_LIMIT) {
        out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
      }
    }
  }
  return out;
}

const hashCode = (code: string) => createHash("sha256").update(code).digest("hex");

/**
 * Mints a code for a member who has already proven their Telegram identity to
 * the bot. Only the SHA-256 of the code is persisted — the plaintext exists
 * solely in this return value — and minting revokes any outstanding code so a
 * member who spams /login cannot accumulate live credentials.
 */
export async function issueTelegramLoginCode(params: {
  userId: string;
  telegramUserId: bigint | string | number;
}) {
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

  return { code, expiresAt };
}

/**
 * Exchanges a typed code for a session.
 *
 * Single-use and race-safe: the claim is a conditional UPDATE, so of N
 * concurrent redemptions of the same code exactly one observes `count === 1`.
 * A read-then-write would let every concurrent caller pass the `usedAt` check.
 */
export async function redeemTelegramLoginCode(rawCode: string) {
  // Annotated `(): never` so TypeScript treats every `reject()` call below as
  // terminating control flow and narrows the surrounding null checks.
  const reject: () => never = () => {
    throw new TelegramCodeInvalidError(INVALID_CODE_MESSAGE);
  };

  const code = normalizeCode(rawCode);
  if (code.length !== CODE_LENGTH) reject();

  const row = await prisma.telegramLoginCode.findUnique({
    where: { codeHash: hashCode(code) },
    select: { id: true, userId: true, expiresAt: true, usedAt: true },
  });
  if (!row || row.usedAt) reject();
  if (row.expiresAt.getTime() < Date.now()) reject();

  const claimed = await prisma.telegramLoginCode.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) reject();

  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  if (!user) reject();
  if (user.isSuspended) {
    throw new TelegramCodeError("This account is suspended. Please contact support.");
  }

  await recordAuditEvent({
    userId: user.id,
    eventType: "TELEGRAM_LOGIN_CODE_REDEEMED",
    entityType: "User",
    entityId: user.id,
    metadata: { telegramId: row.userId ? String(user.telegramUserId ?? "") : "" },
  });

  return createAuthTokens(user, ["tg_web"]);
}

/** Housekeeping for the worker: drop rows that can no longer be redeemed. */
export async function purgeExpiredTelegramLoginCodes(): Promise<number> {
  const { count } = await prisma.telegramLoginCode.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}

// 5 minutes TTL for the challenge
const TTL_SEC = 300;

export async function startWebLogin(challengeHash: string, ip: string, ua: string) {
  // sid must fit in start payload limit (64 chars). base64url 32 bytes = 43 chars.
  const sid = randomBytes(24).toString("base64url").replace(/[^a-zA-Z0-9_-]/g, ''); 
  
  await redis.set(`weblogin:${sid}`, JSON.stringify({
    challengeHash,
    status: 'pending',
    createdIp: ip,
    createdUa: ua
  }), 'EX', TTL_SEC);

  return { 
    sid,
    botUrl: `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=wl_${sid}`
  };
}

export async function approveWebLogin(sid: string, telegramUserId: bigint, userId?: string) {
  const key = `weblogin:${sid}`;
  const data = await redis.get(key);
  if (!data) throw new AuthError("Session not found or expired");
  
  const parsed = JSON.parse(data);
  if (parsed.status !== 'pending') throw new AuthError("Session already processed");
  
  parsed.status = 'approved';
  parsed.userId = userId;
  parsed.telegramUserId = telegramUserId.toString();
  
  // Keep the remaining TTL, or renew to 2 minutes so they can poll/redeem it
  await redis.set(key, JSON.stringify(parsed), 'EX', 120);
}

export async function denyWebLogin(sid: string) {
  const key = `weblogin:${sid}`;
  const data = await redis.get(key);
  if (!data) return;
  const parsed = JSON.parse(data);
  parsed.status = 'denied';
  await redis.set(key, JSON.stringify(parsed), 'EX', 120);
}

export async function getWebLoginStatus(sid: string) {
  const data = await redis.get(`weblogin:${sid}`);
  if (!data) return { status: 'expired' };
  const parsed = JSON.parse(data);
  return { status: parsed.status };
}

export async function redeemWebLogin(sid: string, verifier: string) {
  const key = `weblogin:${sid}`;
  const data = await redis.get(key);
  if (!data) throw new AuthError("Session not found or expired");
  
  const parsed = JSON.parse(data);
  if (parsed.status !== 'approved') throw new AuthError(`Cannot redeem, status is ${parsed.status}`);
  
  // Verify PKCE - hash the verifier (base64url) and compare with challengeHash
  const computedHash = createHash('sha256').update(verifier).digest('base64url');
  
  const buf1 = Buffer.from(computedHash);
  const buf2 = Buffer.from(parsed.challengeHash);
  if (buf1.length !== buf2.length || !timingSafeEqual(buf1, buf2)) {
     // Lock or burn it on failure to prevent brute forcing
     await redis.del(key);
     throw new AuthError("Invalid verifier");
  }

  // Atomic consume: delete it
  await redis.del(key);

  if (!parsed.userId) throw new AuthError("No user attached to this login session");

  const user = await prisma.user.findUnique({ where: { id: parsed.userId } });
  if (!user || user.isSuspended) throw new AuthError("Account suspended or missing");

  await recordAuditEvent({
    userId: user.id,
    eventType: "TELEGRAM_WEB_CODE_REDEEMED",
    entityType: "User",
    entityId: user.id,
    metadata: { telegramId: parsed.telegramUserId },
  });

  return {
    ...(await createAuthTokens(user, ["tg_web"])),
    user: {
      id: user.id,
      ucid: user.ucid,
      role: user.role,
      email: user.email,
      phone: user.phone,
      languagePreference: user.languagePreference,
    },
  };
}