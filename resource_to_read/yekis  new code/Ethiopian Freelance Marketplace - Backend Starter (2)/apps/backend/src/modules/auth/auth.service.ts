import argon2 from "argon2";
import { SignJWT } from "jose";
import type { RegisterInput, LoginInput } from "@marketplace/schemas";
import { prisma } from "../../lib/prisma.js";
import { recordAuditEvent } from "../../lib/audit.js";
import { env } from "../../config/env.js";

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

export class AgeRestrictionError extends Error {}
export class DuplicateUserError extends Error {}
export class InvalidCredentialsError extends Error {}

function calculateAge(dob: Date): number {
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export async function registerUser(input: RegisterInput) {
  const dob = new Date(input.dateOfBirth);

  // Contractual-capacity gate — confirmed with counsel in Phase 0.
  if (calculateAge(dob) < env.MINIMUM_CONTRACTING_AGE) {
    throw new AgeRestrictionError(
      `Must be at least ${env.MINIMUM_CONTRACTING_AGE} years old to register.`
    );
  }

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });
  if (existing) throw new DuplicateUserError("Email or phone already registered.");

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
          create: [
            { purpose: "kyc_data_processing", granted: input.consents.kycDataProcessing },
            { purpose: "marketing_communications", granted: input.consents.marketingCommunications },
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

export async function loginUser(input: LoginInput) {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw new InvalidCredentialsError();

  const valid = await argon2.verify(user.passwordHash, input.password);
  if (!valid) throw new InvalidCredentialsError();

  if (user.isSuspended) {
    throw new InvalidCredentialsError();
  }

  const accessToken = await new SignJWT({ role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(env.JWT_ACCESS_TTL)
    .sign(accessSecret);

  const refreshToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setExpirationTime(env.JWT_REFRESH_TTL)
    .sign(refreshSecret);

  await recordAuditEvent({
    userId: user.id,
    eventType: "USER_LOGIN",
    entityType: "User",
    entityId: user.id,
  });

  return { accessToken, refreshToken, user: { id: user.id, ucid: user.ucid, role: user.role } };
}
