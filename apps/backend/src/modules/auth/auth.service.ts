// === IMPORTS ===
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import type { RegisterInput, LoginInput } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { Prisma } from "@prisma/client";
import { recordAuditEvent } from "../../lib/audit.js";
import { logger } from "../../lib/logger.js";
import { env } from "../../config/env.js";
import { sendPasswordResetEmail } from "../../lib/email/email.service.js";
import type { AuthMethod } from "./auth-methods.js";
import { hasRecentVerifiedCode } from "./phone-verification.service.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// === MAIN FUNCTIONS ===
export class AgeRestrictionError extends Error {}
export class DuplicateUserError extends Error {}
export class InvalidCredentialsError extends Error {}
export class InvalidTokenError extends Error {}

async function getSessionVersion(userId: string): Promise<number> {
  try {
    const rows = await prisma.$queryRaw<Array<{ sessionVersion: number }>>(
      Prisma.sql`SELECT "sessionVersion" FROM "User" WHERE id = ${userId}`,
    );
    return rows[0]?.sessionVersion ?? 0;
  } catch (err) {
    // The additive migration may be applied after the application starts.
    // Keep authentication available during that rollout; once the column is
    // present, the version check is enforced normally.
    logger.warn({ err }, "Session-version column unavailable; using version 0");
    return 0;
  }
}

function calculateAge(dob: Date): number {
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/**
 * Revokes every live session for a user by bumping `sessionVersion`.
 *
 * Both access and refresh tokens carry the version they were minted at, and
 * `requireAuth` / `refreshSession` compare it against the stored value. One
 * increment therefore retires every outstanding token at once — access tokens
 * on their next request, refresh tokens on their next refresh.
 *
 * This is the only revocation primitive in the system, and it is deliberately
 * coarse: it cannot end one session without ending all of them. That is the
 * right trade for a shared or suspected-compromised machine (a user clicking
 * "log out" expects the next person at the keyboard to be logged out), but it
 * does mean a logout on a phone also signs the user out of their laptop. A
 * per-`sid` denylist would be the fix if per-device logout is ever needed.
 */
export async function revokeAllSessions(userId: string): Promise<number> {
  const rows = await prisma.$executeRaw`
    UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE id = ${userId}
  `;
  logger.info({ userId, rows }, "Revoked all sessions for user");
  return rows;
}

/** Ends the caller's session. See `revokeAllSessions` for the semantics. */
export async function logoutSession(userId: string): Promise<void> {
  await revokeAllSessions(userId);
}

export async function registerUser(input: RegisterInput) {
  const dob = new Date(input.dateOfBirth);

  // Contractual-capacity gate — confirmed with counsel in Phase 0.
  if (calculateAge(dob) < env.MINIMUM_CONTRACTING_AGE) {
    throw new AgeRestrictionError(
      `Must be at least ${env.MINIMUM_CONTRACTING_AGE} years old to register.`,
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });
  if (existing)
    throw new DuplicateUserError("Email or phone already registered.");

  const passwordHash = await argon2.hash(input.password);

  // The OTP was verified while the account did not exist yet, so this is where
  // the proof attaches. Bounded by the code's own lifetime: a number proven
  // weeks ago says nothing about who is registering now.
  const phoneVerifiedAt = (await hasRecentVerifiedCode(input.phone)) ? new Date() : null;

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        phoneVerifiedAt,
        passwordHash,
        // Marks the account as password-owned: a later social sign-in that
        // merely matches this email must not be merged into it.
        passwordSetAt: new Date(),
        role: input.role,
        languagePreference: input.languagePreference,
        dateOfBirth: dob,
        kyc: { create: { tier: "TIER_1", status: "PENDING" } },
        wallet: { create: { balanceMinor: 0 } },
        consents: {
          // Master Design §12.2: granular, unbundled consent — two purposes
          // are legally required (no opt-out), three are optional opt-ins
          // recorded individually with timestamps (PDPP Arts. 8 & 11).
          create: [
            {
              purpose: "kyc_data_processing",
              granted: input.consents.kycDataProcessing,
            },
            {
              purpose: "financial_data_processing",
              granted: input.consents.financialDataProcessing,
            },
            {
              purpose: "platform_notifications",
              granted: input.consents.platformNotifications,
            },
            {
              purpose: "marketing_communications",
              granted: input.consents.marketingCommunications,
            },
            { purpose: "analytics", granted: input.consents.analytics },
          ],
        },
      },
    });
    return created;
  });

  await recordAuditEvent({
    userId: user.id,
    eventType: "USER_REGISTERED",
    entityType: "User",
    entityId: user.id,
  });

  return user;
}

/**
 * Mints an access/refresh pair.
 *
 * `auth_time` is the Unix time of the last moment a credential was actually
 * presented or proven — NOT the time this token was signed. Step-up checks read
 * `auth_time` and must never read `iat`: `iat` moves forward on every silent
 * refresh, so an `iat`-based check would happily pass a session whose owner
 * last typed a password an hour ago and merely left a tab open.
 *
 * `amr` records which methods were exercised in that one credential event.
 * Both claims are copied VERBATIM by refreshSession, so refreshing never counts
 * as re-authentication.
 *
 * `carryOver` is supplied only by refreshSession. Omitting it is what makes
 * this a credential event, which resets auth_time to now.
 */
export async function createAuthTokens(
  user: {
    id: string;
    role: string;
    ucid: string | null;
    staffRole?: string | null;
    sessionVersion?: number;
  },
  amr: AuthMethod[],
  carryOver?: { authTime?: number; sessionIat?: number },
) {
  const now = Math.floor(Date.now() / 1000);
  const authTime = carryOver?.authTime ?? now;
  const sessionIat = carryOver?.sessionIat ?? now;
  const sid = randomBytes(16).toString("base64url");
  const sessionVersion = await getSessionVersion(user.id);

  const accessToken = await new SignJWT({
    role: user.role,
    staffRole: user.staffRole ?? null,
    session_version: sessionVersion,
    sid,
    auth_time: authTime,
    amr,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);

  // The refresh token carries the SAME auth_time/amr so a rotation chain cannot
  // launder a weak factor into a strong-looking session. Its `iat` is the
  // session start, which is what the absolute max-age check below reads.
  const refreshToken = await new SignJWT({ sid, auth_time: authTime, amr, session_version: sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(sessionIat)
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refreshSecret);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, ucid: user.ucid, role: user.role },
  };
}

export function normalizeLoginIdentifier(rawIdentifier: string): {
  email?: string;
  phone?: string;
} {
  const trimmed = rawIdentifier.trim();
  if (trimmed.includes("@")) {
    return { email: trimmed.toLowerCase() };
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("251") && digits.length === 12) {
    return { phone: `+${digits}` };
  }
  if (digits.startsWith("0") && digits.length === 10) {
    return { phone: `+251${digits.slice(1)}` };
  }
  if (digits.startsWith("9") && digits.length === 9) {
    return { phone: `+251${digits}` };
  }
  if (trimmed.startsWith("+")) {
    return { phone: trimmed };
  }
  return {
    phone: digits ? `+251${digits}` : undefined,
    email: trimmed.toLowerCase(),
  };
}

export async function loginUser(input: LoginInput) {
  const rawId = input.identifier || input.email || input.phone || "";
  const normalized = normalizeLoginIdentifier(rawId);

  const orConditions: Array<{ email?: string; phone?: string }> = [];
  if (input.email) orConditions.push({ email: input.email.toLowerCase() });
  if (input.phone) orConditions.push({ phone: input.phone });
  if (normalized.email) orConditions.push({ email: normalized.email });
  if (normalized.phone) orConditions.push({ phone: normalized.phone });

  const user = await prisma.user.findFirst({
    where: {
      OR: orConditions,
    },
  });

  if (!user) throw new InvalidCredentialsError();

  // argon2.verify THROWS on a malformed hash rather than returning false.
  // Legacy/seeded/corrupted rows would otherwise surface as a 500 on the
  // login endpoint, which both misleads the caller and turns a data problem
  // into an availability one. An unverifiable hash is simply not a match.
  let valid = false;
  try {
    valid = await argon2.verify(user.passwordHash, input.password);
  } catch (err) {
    logger.warn(
      { userId: user.id, err },
      "Password hash could not be verified (malformed or unsupported)",
    );
  }
  if (!valid) throw new InvalidCredentialsError();

  if (user.isSuspended) {
    throw new InvalidCredentialsError();
  }

  const result = await createAuthTokens(user, ["pwd"]);

  await recordAuditEvent({
    userId: user.id,
    eventType: "USER_LOGGED_IN",
    entityType: "User",
    entityId: user.id,
  });

  return result;
}

/**
 * Session refresh — exchanges a still-valid refresh token for a fresh
 * access/refresh pair. Added because the refresh token was previously issued
 * at login but never usable (no endpoint consumed it), which forced users to
 * re-authenticate every JWT_ACCESS_TTL (15 minutes by default).
 *
 * The user's suspension status is re-checked on every refresh, so a staff
 * suspension or STR-filed account termination takes effect at the next silent
 * refresh rather than lasting the full refresh window.
 */
export async function refreshSession(refreshToken: string) {
  let userId: string;
  let originalIat: number | undefined;
  let carriedAuthTime: number | undefined;
  let carriedAmr: AuthMethod[] = [];
  let sessionVersion: number | undefined;
  try {
    const { payload } = await jwtVerify(refreshToken, refreshSecret);
    if (typeof payload.sub !== "string") throw new Error("missing sub");
    userId = payload.sub;
    originalIat = payload.iat as number | undefined;
    carriedAuthTime =
      typeof payload.auth_time === "number" ? payload.auth_time : undefined;
    carriedAmr = Array.isArray(payload.amr)
      ? (payload.amr as AuthMethod[])
      : [];
    sessionVersion = typeof payload.session_version === "number" ? payload.session_version : undefined;
  } catch {
    throw new InvalidTokenError("Refresh token is invalid or expired.");
  }

  // A token minted before auth_time existed has no credential timestamp. We do
  // NOT fall back to `iat` — that would let a 30-day-old session look freshly
  // authenticated. The session stays usable; step-up simply demands a real
  // sign-in, which is the fail-closed outcome.
  if (carriedAuthTime === undefined) {
    logger.warn(
      { userId },
      "Refresh token predates auth_time claims; step-up will require re-authentication",
    );
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isSuspended) {
    throw new InvalidTokenError("Session is no longer valid.");
  }

  if (sessionVersion !== undefined && sessionVersion !== await getSessionVersion(user.id)) {
    throw new InvalidTokenError("Session has been revoked. Please log in again.");
  }

  if (originalIat) {
    const isStaff = !!user.staffRole;
    const maxSessionAge = isStaff ? 12 * 60 * 60 : 7 * 24 * 60 * 60; // 12h for staff, 7 days for normal
    if (Math.floor(Date.now() / 1000) - originalIat > maxSessionAge) {
      throw new InvalidTokenError("Session has expired. Please log in again.");
    }
  }

  // Rotation re-signs with auth_time and amr copied UNCHANGED: refreshing is
  // not re-authentication.
  const result = await createAuthTokens(user, carriedAmr, {
    authTime: carriedAuthTime,
    sessionIat: originalIat,
  });

  await recordAuditEvent({
    userId: user.id,
    eventType: "USER_SESSION_REFRESHED",
    entityType: "User",
    entityId: user.id,
  });

  return result;
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    // Return early to prevent email enumeration, but simulate success
    return;
  }

  // Generate a secure random token
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");

  // Expire in 1 hour
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  await recordAuditEvent({
    userId: user.id,
    eventType: "PASSWORD_RESET_REQUESTED",
    entityType: "User",
    entityId: user.id,
  });

  // Dispatch branded transactional email with password reset link and token
  try {
    await sendPasswordResetEmail({
      email,
      name: user.displayName || user.firstName || undefined,
      token,
    });
  } catch (err) {
    console.error("Failed to transmit password reset email:", err);
  }
}

export async function resetPassword(token: string, newPassword: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.used || resetRecord.expiresAt < new Date()) {
    throw new InvalidTokenError("Invalid or expired reset token");
  }

  const passwordHash = await argon2.hash(newPassword);

  await prisma.$transaction(async (tx) => {
    // Conditionally claim the bearer token before changing the password. Only
    // one concurrent request can observe count === 1.
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: resetRecord.id,
        used: false,
        expiresAt: { gt: new Date() },
      },
      data: { used: true },
    });
    if (claimed.count !== 1) {
      throw new InvalidTokenError("Invalid or expired reset token");
    }

    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash, passwordSetAt: new Date() },
    });

    // Changing the password must kill every existing session.
    //
    // A reset is the documented remedy for "I think someone has my account".
    // Without this bump the attacker's outstanding refresh token keeps minting
    // access tokens for up to JWT_REFRESH_TTL (default 30 days) -- so completing
    // the reset hands the account straight back to whoever triggered it, and
    // the legitimate user has no way to evict them.
    //
    // Inside the transaction on purpose: a revocation that can fail separately
    // from the password change is a revocation that can be skipped.
    await tx.$executeRaw`UPDATE "User" SET "sessionVersion" = "sessionVersion" + 1 WHERE id = ${resetRecord.userId}`;
  });

  await recordAuditEvent({
    userId: resetRecord.userId,
    eventType: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: resetRecord.userId,
  });
}
