// === IMPORTS ===
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { randomBytes, createHash } from "crypto";
import type { RegisterInput, LoginInput } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { env } from "../../config/env.js";
import { sendPasswordResetEmail } from "../../lib/email/email.service.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

// === MAIN FUNCTIONS ===
export class AgeRestrictionError extends Error {}
export class DuplicateUserError extends Error {}
export class InvalidCredentialsError extends Error {}
export class InvalidTokenError extends Error {}

function calculateAge(dob: Date): number {
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
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

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        email: input.email,
        phone: input.phone,
        passwordHash,
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

export async function createAuthTokens(user: {
  id: string;
  role: string;
  ucid: string | null;
  staffRole?: string | null;
}) {
  const accessToken = await new SignJWT({
    role: user.role,
    staffRole: user.staffRole ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);

  const refreshToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
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

  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) throw new InvalidCredentialsError();

  if (user.isSuspended) {
    throw new InvalidCredentialsError();
  }

  const result = await createAuthTokens(user);

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
  try {
    const { payload } = await jwtVerify(refreshToken, refreshSecret);
    if (typeof payload.sub !== "string") throw new Error("missing sub");
    userId = payload.sub;
  } catch {
    throw new InvalidTokenError("Refresh token is invalid or expired.");
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || user.isSuspended) {
    throw new InvalidTokenError("Session is no longer valid.");
  }

  const result = await createAuthTokens(user);

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
    await tx.user.update({
      where: { id: resetRecord.userId },
      data: { passwordHash },
    });

    await tx.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { used: true },
    });
  });

  await recordAuditEvent({
    userId: resetRecord.userId,
    eventType: "PASSWORD_RESET_COMPLETED",
    entityType: "User",
    entityId: resetRecord.userId,
  });
}
