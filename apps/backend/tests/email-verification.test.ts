import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";

/**
 * Email OTP verification — the onboarding channel.
 *
 * WHY THIS FILE EXISTS
 * The signup flow proved control of the phone number over SMS and nothing
 * else. On a hosted testing environment the SMS provider has no key, so the
 * very first step of the onboarding failed for every new user and the account
 * could not be created at all. The code is now sent over email.
 *
 * `User.email` is the login identifier and the destination of every
 * transactional mail, so proving the address is a takeover-prevention
 * control, not a nicety. The interesting properties are therefore all
 * negative, and they are the same ones the phone flow has to satisfy:
 *
 *   - the code is never recoverable from the database,
 *   - a wrong code is bounded and counted,
 *   - an expired code is refused,
 *   - a resend invalidates the previous code,
 *   - the endpoint never says whether an address is registered,
 *   - registration adopts the proof, and leaves an unproven address alone.
 *
 * The mail transport is mocked so the issuing path can actually run. Without
 * it the service treats an undeliverable message as a failure and deletes the
 * challenge, so the tests would only ever exercise verification against rows
 * the test itself wrote — which made the "the code is not stored in
 * plaintext" assertion vacuous.
 */
const sentMessages: { email: string; code: string }[] = [];
let sendSucceeds = true;

vi.mock("../src/lib/email/email.service.js", () => ({
  sendEmailVerificationCodeEmail: async (params: {
    email: string;
    code: string;
  }) => {
    if (!sendSucceeds) return { success: false };
    sentMessages.push({ email: params.email, code: params.code });
    return { success: true };
  },
}));

const {
  requestEmailCode,
  verifyEmailCode,
  hasRecentVerifiedEmailCode,
  clearEmailChallenges,
  normalizeEmail,
  isEmailDeliveryConfigured,
  EmailCodeInvalidError,
  EmailCodeRateLimitedError,
  EmailCodeExpiredError,
  EmailCodeAttemptsExceededError,
  EmailCodeNotFoundError,
  EmailCodeDeliveryFailedError,
} = await import("../src/modules/auth/email-verification.service.js");
const { handleEmailVerificationError } = await import(
  "../src/modules/auth/email-verification.routes.js"
);
const { registerUser, loginUser } = await import(
  "../src/modules/auth/auth.service.js"
);
const { DuplicateUserError, InvalidCredentialsError } = await import(
  "../src/modules/auth/auth.service.js"
);

const STAMP = Date.now();
const A = `alpha-${STAMP}@test.et`;
const B = `bravo-${STAMP}@test.et`;

/** Users created by the registration tests, cleaned up at the end. */
const createdUserIds: string[] = [];

/**
 * Removes a user and everything hanging off it.
 *
 * A bare `prisma.user.delete` fails the ConsentRecord foreign key: the
 * registration flow creates five consent rows, a KYC record and a wallet for
 * every account.
 */
async function deleteUser(userId: string): Promise<void> {
  await prisma.$transaction([
    prisma.consentRecord.deleteMany({ where: { userId } }),
    prisma.kycRecord.deleteMany({ where: { userId } }),
    prisma.wallet.deleteMany({ where: { userId } }),
    prisma.auditLog.deleteMany({ where: { userId } }),
    prisma.user.deleteMany({ where: { id: userId } }),
  ]);
}

async function seedOpenCode(
  email: string,
  code: string,
  opts?: { expiresAt?: Date; userId?: string },
) {
  const salt = "b".repeat(32);
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(`${salt}:${code}`).digest("hex");
  return prisma.emailVerificationCode.create({
    data: {
      email: normalizeEmail(email),
      userId: opts?.userId ?? null,
      salt,
      codeHash: hash,
      expiresAt: opts?.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
    },
  });
}

beforeEach(async () => {
  sentMessages.length = 0;
  sendSucceeds = true;
  await prisma.emailVerificationCode.deleteMany({
    where: { email: { in: [A, B] } },
  });
});

afterAll(async () => {
  await prisma.emailVerificationCode.deleteMany({
    where: { email: { in: [A, B] } },
  });
  for (const id of createdUserIds) {
    await deleteUser(id);
  }
});

describe("address normalisation", () => {
  it("treats the same address in different spellings as one address", () => {
    expect(normalizeEmail("  Alice@Example.COM ")).toBe("alice@example.com");
  });

  it("keeps the local part and the domain together", () => {
    // A proof raised against one spelling has to be found against the other,
    // or the code can be issued for one address and verified for another.
    expect(normalizeEmail("Alice@Example.com")).toBe(
      normalizeEmail("alice@example.com"),
    );
  });
});

describe("the stored challenge is not the code", () => {
  it("never writes the plaintext anywhere in the row it creates", async () => {
    const { devCode } = await requestEmailCode({ email: A });
    expect(devCode).toMatch(/^\d{6}$/);

    const row = await prisma.emailVerificationCode.findFirstOrThrow({
      where: { email: A, verifiedAt: null },
    });
    const serialised = JSON.stringify(row);
    expect(serialised).not.toContain(devCode);
    expect(row.codeHash).not.toBe(devCode);
    expect(row.codeHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("sends the code to the address it was issued for", async () => {
    await requestEmailCode({ email: A });
    expect(sentMessages).toHaveLength(1);
    expect(sentMessages[0].email).toBe(A);
    expect(sentMessages[0].code).toMatch(/^\d{6}$/);
  });

  it("does not leave a live challenge behind when the message cannot be sent", async () => {
    // In production there is no console fallback: a missing SMTP configuration
    // is a misconfiguration, and the caller is told the message was not
    // delivered rather than being handed a code nobody can receive.
    const originalNodeEnv = env.NODE_ENV;
    (env as Record<string, unknown>).NODE_ENV = "production";
    sendSucceeds = false;
    try {
      await expect(requestEmailCode({ email: A })).rejects.toThrow(
        EmailCodeDeliveryFailedError,
      );
    } finally {
      (env as Record<string, unknown>).NODE_ENV = originalNodeEnv;
    }

    const row = await prisma.emailVerificationCode.findFirst({
      where: { email: A, verifiedAt: null },
    });
    expect(row).toBeNull();
  });

  it("still issues the code outside production when SMTP is missing", async () => {
    // The hosted testing environment runs with NODE_ENV=staging and no SMTP
    // credentials. The console fallback is what makes the onboarding work
    // there instead of dead-ending on the first step, and outside production
    // the code is already returned to the caller in the API response — so the
    // server log adds no exposure that does not already exist.
    expect(env.NODE_ENV).not.toBe("production");
    sendSucceeds = false;

    const challenge = await requestEmailCode({ email: A });
    expect(challenge.devCode).toMatch(/^\d{6}$/);

    const row = await prisma.emailVerificationCode.findFirstOrThrow({
      where: { email: A, verifiedAt: null },
    });
    expect(row.id).toBeTruthy();
  });
});

describe("verification", () => {
  it("accepts the code it issued", async () => {
    const { devCode } = await requestEmailCode({ email: A });
    await expect(
      verifyEmailCode({ email: A, code: devCode! }),
    ).resolves.toEqual({ verified: true });
  });

  it("accepts the code regardless of how the address was spelled", async () => {
    const { devCode } = await requestEmailCode({ email: A });
    await expect(
      verifyEmailCode({ email: ` ${A.toUpperCase()} `, code: devCode! }),
    ).resolves.toEqual({ verified: true });
  });

  it("rejects a wrong code and counts the attempt", async () => {
    await requestEmailCode({ email: A });
    await expect(
      verifyEmailCode({ email: A, code: "000000" }),
    ).rejects.toThrow(EmailCodeInvalidError);

    const row = await prisma.emailVerificationCode.findFirstOrThrow({
      where: { email: A },
    });
    expect(row.attempts).toBe(1);
  });

  it("refuses an expired code", async () => {
    await seedOpenCode(A, "123456", {
      expiresAt: new Date(Date.now() - 1000),
    });
    await expect(
      verifyEmailCode({ email: A, code: "123456" }),
    ).rejects.toThrow(EmailCodeExpiredError);
  });

  it("says nothing about whether an address is registered", async () => {
    // "No such code" and "wrong code" must be indistinguishable, or the
    // endpoint is an account-enumeration oracle.
    await requestEmailCode({ email: A });
    const wrong = await verifyEmailCode({ email: A, code: "000000" }).catch(
      (err) => err,
    );
    const missing = await verifyEmailCode({ email: B, code: "000000" }).catch(
      (err) => err,
    );
    expect(wrong.message).toBe(missing.message);
  });

  it("does not let a code issued to one account verify another", async () => {
    const userId = "cm000000000000000000000ee";
    await seedOpenCode(A, "123456", { userId });
    await expect(
      verifyEmailCode({ email: A, code: "123456", userId: "cm000000000000000000000ff" }),
    ).rejects.toThrow(EmailCodeInvalidError);
  });
});

describe("a resend invalidates the previous code", () => {
  it("does not accept the first code after a second one is issued", async () => {
    const first = await requestEmailCode({ email: A });
    // The cooldown is 60s, so the second issue is driven directly rather than
    // by waiting for the clock.
    await prisma.emailVerificationCode.updateMany({
      where: { email: A, verifiedAt: null },
      data: { createdAt: new Date(Date.now() - 5 * 60 * 1000) },
    });
    const second = await requestEmailCode({ email: A });

    await expect(
      verifyEmailCode({ email: A, code: first.devCode! }),
    ).rejects.toThrow(EmailCodeInvalidError);
    await expect(
      verifyEmailCode({ email: A, code: second.devCode! }),
    ).resolves.toEqual({ verified: true });
  });

  it("keeps one outstanding code per address", async () => {
    await requestEmailCode({ email: A });
    await prisma.emailVerificationCode.updateMany({
      where: { email: A, verifiedAt: null },
      data: { createdAt: new Date(Date.now() - 5 * 60 * 1000) },
    });
    await requestEmailCode({ email: A });

    const open = await prisma.emailVerificationCode.count({
      where: { email: A, verifiedAt: null },
    });
    expect(open).toBe(1);
  });
});

describe("per-address throttling", () => {
  it("refuses to issue a second code inside the cooldown", async () => {
    await requestEmailCode({ email: A });
    await expect(requestEmailCode({ email: A })).rejects.toThrow(
      EmailCodeRateLimitedError,
    );
  });
});

describe("registration adopts the proof", () => {
  it("marks a new account verified when its address was proven first", async () => {
    const challenge = await requestEmailCode({ email: A });
    await verifyEmailCode({ email: A, code: challenge.devCode! });

    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);

    const user = await registerUser({
      email: A,
      phone: `+251911${String(STAMP % 1_000_000).padStart(6, "0")}`,
      password: "Sup3rSecret!pass",
      role: "CLIENT",
      languagePreference: "en",
      dateOfBirth: adult.toISOString(),
      consents: {
        kycDataProcessing: true,
        financialDataProcessing: true,
        platformNotifications: false,
        marketingCommunications: false,
        analytics: false,
      },
    } as never);

    expect(user.emailVerified).toBe(true);
    expect(user.emailVerifiedAt).toBeInstanceOf(Date);

    createdUserIds.push(user.id);
  });

  it("leaves an unproven address unverified at registration", async () => {
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);

    const user = await registerUser({
      email: B,
      phone: `+251922${String(STAMP % 1_000_000).padStart(6, "0")}`,
      password: "Sup3rSecret!pass",
      role: "CLIENT",
      languagePreference: "en",
      dateOfBirth: adult.toISOString(),
      consents: {
        kycDataProcessing: true,
        financialDataProcessing: true,
        platformNotifications: false,
        marketingCommunications: false,
        analytics: false,
      },
    } as never);

    expect(user.emailVerified).toBe(false);
    expect(user.emailVerifiedAt).toBeNull();

    createdUserIds.push(user.id);
  });

  it("knows whether an address was proven recently", async () => {
    const challenge = await requestEmailCode({ email: A });
    expect(await hasRecentVerifiedEmailCode(A)).toBe(false);
    await verifyEmailCode({ email: A, code: challenge.devCode! });
    expect(await hasRecentVerifiedEmailCode(A)).toBe(true);
    expect(await hasRecentVerifiedEmailCode(B)).toBe(false);
  });
});

describe("the address is stored in one canonical form", () => {
  /**
   * A registration form does not lower-case what the person typed, and the
   * address is stored on the account as it arrives. Every other path that
   * touches `User.email` — the login lookup, the OAuth path, the OTP proof —
   * uses the lower-cased form. Storing the address as it was typed therefore
   * puts the row outside all of them.
   *
   * The consequence was not theoretical: an account registered as
   * `Alice@Example.com` was created, marked email-verified, and then refused
   * its own password at the sign-in that immediately followed. Because the
   * account existed by then, every retry hit the duplicate path and failed
   * the same way — a permanent lockout.
   */
  it("registers a mixed-case address so the new account can sign in", async () => {
    const mixed = `Mixed.Case.${STAMP}@Example.COM`;
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);

    const challenge = await requestEmailCode({ email: mixed });
    await verifyEmailCode({ email: mixed, code: challenge.devCode! });

    const user = await registerUser({
      email: mixed,
      phone: `+251933${String(STAMP % 1_000_000).padStart(6, "0")}`,
      password: "Sup3rSecret!pass",
      role: "CLIENT",
      languagePreference: "en",
      dateOfBirth: adult.toISOString(),
      consents: {
        kycDataProcessing: true,
        financialDataProcessing: true,
        platformNotifications: false,
        marketingCommunications: false,
        analytics: false,
      },
    } as never);
    createdUserIds.push(user.id);

    expect(user.email).toBe(mixed.toLowerCase());
    expect(user.emailVerified).toBe(true);

    // The account has to be usable, not merely created.
    const session = await loginUser({
      email: mixed,
      password: "Sup3rSecret!pass",
    } as never);
    expect(session.user.id).toBe(user.id);
  });

  it("does not let the same mailbox be registered twice in a different capitalisation", async () => {
    const canonical = `casing-duplicate-${STAMP}@example.com`;
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);

    const first = await registerUser({
      email: canonical,
      phone: `+251944${String(STAMP % 1_000_000).padStart(6, "0")}`,
      password: "Sup3rSecret!pass",
      role: "CLIENT",
      languagePreference: "en",
      dateOfBirth: adult.toISOString(),
      consents: {
        kycDataProcessing: true,
        financialDataProcessing: true,
        platformNotifications: false,
        marketingCommunications: false,
        analytics: false,
      },
    } as never);
    createdUserIds.push(first.id);

    // The same inbox, typed with capitals, is the same inbox.
    await expect(
      registerUser({
        email: canonical.toUpperCase(),
        phone: `+251955${String(STAMP % 1_000_000).padStart(6, "0")}`,
        password: "Sup3rSecret!pass",
        role: "CLIENT",
        languagePreference: "en",
        dateOfBirth: adult.toISOString(),
        consents: {
          kycDataProcessing: true,
          financialDataProcessing: true,
          platformNotifications: false,
          marketingCommunications: false,
          analytics: false,
        },
      } as never),
    ).rejects.toThrow(DuplicateUserError);
  });

  it("marks a signed-in account verified whatever the capitalisation of its stored address", async () => {
    const address = `stored-casing-${STAMP}@example.com`;
    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);

    const user = await registerUser({
      email: address,
      phone: `+251966${String(STAMP % 1_000_000).padStart(6, "0")}`,
      password: "Sup3rSecret!pass",
      role: "CLIENT",
      languagePreference: "en",
      dateOfBirth: adult.toISOString(),
      consents: {
        kycDataProcessing: true,
        financialDataProcessing: true,
        platformNotifications: false,
        marketingCommunications: false,
        analytics: false,
      },
    } as never);
    createdUserIds.push(user.id);

    // A row that predates the canonical form, or was written by something
    // else, can still hold a differently-cased address.
    await prisma.user.update({
      where: { id: user.id },
      data: { email: address.toUpperCase(), emailVerified: false, emailVerifiedAt: null },
    });

    const challenge = await requestEmailCode({
      email: address,
      userId: user.id,
    });
    await verifyEmailCode({
      email: address,
      code: challenge.devCode!,
      userId: user.id,
    });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(after.emailVerified).toBe(true);
    expect(after.emailVerifiedAt).toBeInstanceOf(Date);
  });
});

describe("the error handler", () => {
  it("maps every failure to a status and a stable code", () => {
    const cases: [unknown, number, string][] = [
      [new EmailCodeRateLimitedError("slow down"), 429, "RATE_LIMITED"],
      [new EmailCodeDeliveryFailedError("no mail"), 503, "EMAIL_UNAVAILABLE"],
      [new EmailCodeExpiredError("gone"), 410, "CODE_EXPIRED"],
      [new EmailCodeAttemptsExceededError("too many"), 429, "TOO_MANY_ATTEMPTS"],
      [new EmailCodeNotFoundError("no such code"), 400, "INVALID_CODE"],
      [new EmailCodeInvalidError("wrong code"), 400, "INVALID_CODE"],
    ];

    for (const [err, status, code] of cases) {
      const res = {
        statusCode: 0,
        body: null as unknown,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(body: unknown) {
          this.body = body;
          return this;
        },
      };
      const handled = handleEmailVerificationError(err, res as never);
      expect(handled).toBe(true);
      expect(res.statusCode).toBe(status);
      expect((res.body as { error: string }).error).toBe(code);
    }
  });

  it("does not claim to handle an error it knows nothing about", () => {
    const res = { status: () => res, json: () => res } as never;
    expect(handleEmailVerificationError(new Error("boom"), res)).toBe(false);
  });
});

describe("channel discovery", () => {
  it("reports the email channel as usable outside production", () => {
    // The hosted testing environment runs with NODE_ENV=staging and no SMTP
    // credentials. The console fallback is what makes the onboarding work
    // there, so the channel has to be reported as available.
    expect(env.NODE_ENV).not.toBe("production");
    expect(isEmailDeliveryConfigured()).toBe(true);
  });
});
