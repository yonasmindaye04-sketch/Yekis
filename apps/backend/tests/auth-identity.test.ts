import { describe, it, expect, afterAll } from "vitest";
import argon2 from "argon2";
import {
  loginUser,
  registerUser,
  InvalidCredentialsError,
  DuplicateUserError,
  AgeRestrictionError,
  resetPassword,
} from "../src/modules/auth/auth.service.js";
import { prisma } from "../src/lib/prisma.js";
import {
  withPlaceholderPhone,
  buildPlaceholderPhone,
  isUniqueConstraintViolation,
  isPasswordOwnedAccount,
} from "../src/modules/auth/identity.js";

const SUFFIX = Date.now();
const TEST_EMAILS = [
  `login.${SUFFIX}@example.com`,
  `reset.${SUFFIX}@example.com`,
  `malformed.${SUFFIX}@example.com`,
  `federated.${SUFFIX}@example.com`,
];

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { in: TEST_EMAILS } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } }),
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

function validRegistration(overrides: Record<string, unknown> = {}) {
  const adult = new Date();
  adult.setFullYear(adult.getFullYear() - 30);
  return {
    email: TEST_EMAILS[0],
    phone: `+25109${String(SUFFIX % 1000000).padStart(6, "0")}`,
    password: "Sup3rSecret!pass",
    role: "CLIENT" as const,
    languagePreference: "en",
    dateOfBirth: adult.toISOString(),
    consents: {
      kycDataProcessing: true,
      financialDataProcessing: true,
      platformNotifications: true,
      marketingCommunications: false,
      analytics: false,
    },
    ...overrides,
  };
}

describe("Password login", () => {
  afterAll(async () => {
    await cleanup();
  });

  it("registers a password account, stamps passwordSetAt, and logs in", async () => {
    const input = validRegistration();
    const user = await registerUser(input);
    expect(user.passwordSetAt).toBeInstanceOf(Date);

    const session = await loginUser({
      identifier: input.email,
      password: input.password,
    });
    expect(session.accessToken).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
  });

  it("rejects the wrong password with InvalidCredentialsError", async () => {
    await expect(
      loginUser({ identifier: TEST_EMAILS[0], password: "wrong-password" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("logs in by phone number as well as email", async () => {
    const input = validRegistration({
      email: TEST_EMAILS[1],
      phone: `+25109${String((SUFFIX + 1) % 1000000).padStart(6, "0")}`,
    });
    await registerUser(input);
    const session = await loginUser({
      identifier: input.phone,
      password: input.password,
    });
    expect(session.accessToken).toBeTruthy();
  });

  it("rejects a duplicate email", async () => {
    // TEST_EMAILS[0] was already registered by the first test.
    await expect(registerUser(validRegistration())).rejects.toThrow(
      DuplicateUserError,
    );
  });

  it("enforces the minimum contracting age", async () => {
    const child = new Date();
    child.setFullYear(child.getFullYear() - 10);
    await expect(
      registerUser(
        validRegistration({
          email: `minor.${SUFFIX}@example.com`,
          dateOfBirth: child.toISOString(),
        }),
      ),
    ).rejects.toThrow(AgeRestrictionError);
  });

  // argon2.verify throws on a malformed hash instead of returning false. A
  // 500 from the login endpoint (rather than a clean 401) is what the failure
  // looked like before this was caught.
  it("treats a malformed password hash as a failed login, not a server error", async () => {
    await prisma.user.create({
      data: {
        email: TEST_EMAILS[2],
        phone: `+25109${String((SUFFIX + 2) % 1000000).padStart(6, "0")}`,
        passwordHash: "not-a-real-argon2-hash",
        passwordSetAt: new Date(),
        role: "CLIENT",
      },
    });

    await expect(
      loginUser({ identifier: TEST_EMAILS[2], password: "anything" }),
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("stamps passwordSetAt when a federated account sets a password via reset", async () => {
    const user = await prisma.user.create({
      data: {
        email: TEST_EMAILS[3],
        phone: `+25109${String((SUFFIX + 3) % 1000000).padStart(6, "0")}`,
        // Federated sentinel: random secret, no real password yet.
        passwordHash: await argon2.hash("placeholder"),
        role: "CLIENT",
        passwordSetAt: null,
      },
    });

    const { randomBytes, createHash } = await import("node:crypto");
    const token = randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: createHash("sha256").update(token).digest("hex"),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    await resetPassword(token, "BrandNewSecret!1");

    const updated = await prisma.user.findUnique({ where: { id: user.id } });
    expect(updated?.passwordSetAt).toBeInstanceOf(Date);
    // From here on the account is password-owned, so a social sign-in on the
    // same address must be refused rather than merged.
    expect(isPasswordOwnedAccount(updated!)).toBe(true);

    const session = await loginUser({
      identifier: TEST_EMAILS[3],
      password: "BrandNewSecret!1",
    });
    expect(session.accessToken).toBeTruthy();
  });
});

describe("Federated identity guards", () => {
  it("never generates a placeholder phone inside an Ethiopian operator range", () => {
    for (let i = 0; i < 500; i++) {
      const phone = buildPlaceholderPhone();
      // +251 then a national number. Allocated mobile prefixes are 9x (Ethio
      // Telecom) and 7x (Safaricom); 0x is reserved/unallocated.
      expect(phone).toMatch(/^\+2510\d{6}$/);
      const national = phone.slice(4);
      expect(national.startsWith("9")).toBe(false);
      expect(national.startsWith("7")).toBe(false);
    }
  });

  it("retries past a unique-constraint violation on the placeholder phone", async () => {
    const taken = buildPlaceholderPhone();
    const holder = await prisma.user.create({
      data: {
        email: `placeholder.${SUFFIX}@example.com`,
        phone: taken,
        passwordHash: "hash",
        passwordSetAt: new Date(),
        role: "CLIENT",
      },
    });

    let attempts = 0;
    const result = await withPlaceholderPhone(async (phone) => {
      attempts++;
      // Simulate the collision on the first draw only.
      if (attempts === 1) {
        expect(phone).not.toBe(taken);
        throw Object.assign(new Error("Unique constraint failed"), {
          code: "P2002",
        });
      }
      return phone;
    });

    expect(attempts).toBe(2);
    expect(result).not.toBe(taken);

    await prisma.user.delete({ where: { id: holder.id } });
  });

  it("does not retry on an unrelated error", async () => {
    let attempts = 0;
    await expect(
      withPlaceholderPhone(async () => {
        attempts++;
        throw new Error("database is down");
      }),
    ).rejects.toThrow("database is down");
    expect(attempts).toBe(1);
  });

  it("recognises Prisma unique-constraint errors and ignores others", () => {
    expect(
      isUniqueConstraintViolation(
        Object.assign(new Error("x"), { code: "P2002" }),
      ),
    ).toBe(true);
    expect(
      isUniqueConstraintViolation(
        Object.assign(new Error("x"), { code: "P2025" }),
      ),
    ).toBe(false);
    expect(isUniqueConstraintViolation(null)).toBe(false);
    expect(isUniqueConstraintViolation("P2002")).toBe(false);
  });

  it("treats a NULL passwordSetAt as federated-owned", () => {
    expect(isPasswordOwnedAccount({ passwordSetAt: null })).toBe(false);
    expect(isPasswordOwnedAccount({ passwordSetAt: new Date() })).toBe(true);
  });
});