import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";

/**
 * The provider is mocked so requestPhoneCode can actually succeed. Without this
 * the issuing path cannot run at all in tests -- sendSms returns sent:false
 * without an API key and the service treats that as a delivery failure -- and
 * the resulting tests only ever exercised verification against rows the test
 * itself wrote. That made the most important assertion in the file, that the
 * code is never stored in plaintext, vacuous: a negative control that made the
 * service store the raw code still passed, because nothing called it.
 *
 * The mock records what would have been sent, so the message body is asserted
 * too. It must never contain anything but the code and a warning.
 */
const sentMessages: { phone: string; message: string }[] = [];
let sendSucceeds = true;

vi.mock("../src/modules/notifications/sms.client.js", () => ({
  sendSms: async (params: { phone: string; message: string }) => {
    if (!sendSucceeds) return { sent: false };
    sentMessages.push(params);
    return { sent: true };
  },
}));

const {
  requestPhoneCode,
  verifyPhoneCode,
  clearPhoneChallenges,
  normalizePhone,
  PhoneCodeInvalidError,
  PhoneCodeRateLimitedError,
  PhoneCodeExpiredError,
  PhoneCodeAttemptsExceededError,
  PhoneCodeNotFoundError,
} = await import("../src/modules/auth/phone-verification.service.js");
const { handlePhoneVerificationError } = await import(
  "../src/modules/auth/phone-verification.routes.js"
);

/**
 * SMS phone verification.
 *
 * User.phone has always been collected, unique, accepted as a login identifier
 * and used as the payout destination for Telebirr and M-Pesa, with nothing ever
 * proving the account holder owned it. This is the proof, and the interesting
 * properties are all negative: the code must not be recoverable from the
 * database, must not be brute-forceable, must not leak whether a number is
 * registered, and must not survive a resend.
 *
 * `sendSms` is exercised through its real behaviour -- it returns
 * { sent: false } when SMS_ETHIOPIA_API_KEY is absent, which is the case in
 * tests. The service treats that as delivery failure and deletes the challenge
 * rather than reporting success for a message nobody received, so these tests
 * drive the issuing path by seeding a live row directly and exercise everything
 * from verification onwards. The one behaviour that genuinely needs a live
 * provider -- that a real send returns sent:true and yields a usable code -- is
 * the part that cannot be proven here, and is called out in the last test rather
 * than faked.
 */

const STAMP = Date.now();
// +251 then nine digits: 911 and 922 are the mobile prefixes used here.
const A = `+251911${String(STAMP % 1_000_000).padStart(6, "0")}`;
const B = `+251922${String(STAMP % 1_000_000).padStart(6, "0")}`;

async function seedOpenCode(phone: string, code: string, opts?: { expiresAt?: Date; userId?: string }) {
  const salt = "a".repeat(32);
  const { createHash } = await import("node:crypto");
  const hash = createHash("sha256").update(`${salt}:${code}`).digest("hex");
  return prisma.phoneVerificationCode.create({
    data: {
      phone,
      userId: opts?.userId ?? null,
      salt,
      codeHash: hash,
      expiresAt: opts?.expiresAt ?? new Date(Date.now() + 10 * 60 * 1000),
    },
  });
}

beforeEach(async () => {
  await prisma.phoneVerificationCode.deleteMany({ where: { phone: { in: [A, B] } } });
});

afterAll(async () => {
  await prisma.phoneVerificationCode.deleteMany({ where: { phone: { in: [A, B] } } });
});

describe("phone number normalisation", () => {
  it("accepts the three shapes an Ethiopian number arrives in", () => {
    expect(normalizePhone("0911234567")).toBe("+251911234567");
    expect(normalizePhone("251911234567")).toBe("+251911234567");
    expect(normalizePhone("911234567")).toBe("+251911234567");
    expect(normalizePhone("+251911234567")).toBe("+251911234567");
  });
});

describe("the stored challenge is not the code", () => {
  it("never writes the plaintext anywhere in the row it creates", async () => {
    // Issued through the real service path, not seeded. The seeded version of
    // this assertion could not fail: it inspected a row the test itself wrote
    // with a hash it had computed, so it proved nothing about the service.
    const { devCode } = await requestPhoneCode({ phone: A });
    expect(devCode).toMatch(/^\d{6}$/);

    const row = await prisma.phoneVerificationCode.findFirstOrThrow({
      where: { phone: A, verifiedAt: null },
    });
    expect(JSON.stringify(row)).not.toContain(devCode);
    expect(row.codeHash).toMatch(/^[0-9a-f]{64}$/);

    // And the code that was returned still works, which proves the hash is a
    // hash of it rather than of something else.
    await expect(verifyPhoneCode({ phone: A, code: devCode })).resolves.toEqual({
      verified: true,
    });
  });

  it("puts only the code and a warning in the message body", async () => {
    sentMessages.length = 0;
    const { devCode } = await requestPhoneCode({ phone: B });
    expect(sentMessages).toHaveLength(1);
    const body = sentMessages[0].message;
    expect(body).toContain(devCode);
    // No account identifier, balance or internal detail in an SMS.
    expect(body).not.toMatch(/balance|wallet|password|@/i);
    expect(body).toMatch(/never share/i);
  });

  it("issues a six-digit code, not a short or alphabetic one", async () => {
    const { devCode } = await requestPhoneCode({ phone: A });
    expect(devCode).toHaveLength(6);
    expect(devCode).toMatch(/^\d+$/);
  });
});

describe("verification", () => {
  it("accepts the right code and stamps the row as verified", async () => {
    const row = await seedOpenCode(A, "111111");
    await expect(verifyPhoneCode({ phone: A, code: "111111" })).resolves.toEqual({
      verified: true,
    });
    const after = await prisma.phoneVerificationCode.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(after.verifiedAt).not.toBeNull();
  });

  it("rejects a wrong code, and does not mark it verified", async () => {
    const row = await seedOpenCode(A, "111111");
    await expect(verifyPhoneCode({ phone: A, code: "999999" })).rejects.toBeInstanceOf(
      PhoneCodeInvalidError,
    );
    const after = await prisma.phoneVerificationCode.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(after.verifiedAt).toBeNull();
    expect(after.attempts).toBe(1);
  });

  it("locks out after the attempt cap even if a correct code arrives later", async () => {
    const row = await seedOpenCode(A, "111111");
    for (let i = 0; i < 5; i++) {
      await expect(verifyPhoneCode({ phone: A, code: "000000" })).rejects.toBeInstanceOf(
        PhoneCodeInvalidError,
      );
    }
    // The cap is 5, so the sixth attempt is refused before the comparison runs.
    await expect(verifyPhoneCode({ phone: A, code: "111111" })).rejects.toBeInstanceOf(
      PhoneCodeAttemptsExceededError,
    );
    const after = await prisma.phoneVerificationCode.findUniqueOrThrow({
      where: { id: row.id },
    });
    expect(after.verifiedAt).toBeNull();
  });

  it("refuses an expired code", async () => {
    await seedOpenCode(A, "111111", { expiresAt: new Date(Date.now() - 1000) });
    await expect(verifyPhoneCode({ phone: A, code: "111111" })).rejects.toBeInstanceOf(
      PhoneCodeExpiredError,
    );
  });

  it("answers an unknown number and a wrong code identically over HTTP", async () => {
    // The service raises two different classes for these, and that is fine:
    // callers are internal. What must not differ is what the client is told, or
    // the endpoint becomes an oracle for which numbers hold an open challenge.
    // So the guarantee is asserted where it is actually made -- the route's
    // error mapper -- rather than on the exception type.
    const rendered = (err: unknown) => {
      const res = {
        statusCode: 0,
        body: {} as Record<string, unknown>,
        status(code: number) {
          this.statusCode = code;
          return this;
        },
        json(payload: Record<string, unknown>) {
          this.body = payload;
          return this;
        },
      };
      const handled = handlePhoneVerificationError(err, res as never);
      return { handled, statusCode: res.statusCode, body: res.body };
    };

    const unknown = await verifyPhoneCode({ phone: B, code: "111111" }).catch((e) => e);
    await seedOpenCode(A, "111111");
    const wrong = await verifyPhoneCode({ phone: A, code: "222222" }).catch((e) => e);

    // Sanity: they really are different failures internally.
    expect(unknown).toBeInstanceOf(PhoneCodeNotFoundError);
    expect(wrong).toBeInstanceOf(PhoneCodeInvalidError);

    const a = rendered(unknown);
    const b = rendered(wrong);
    expect(a.handled).toBe(true);
    expect(a.statusCode).toBe(b.statusCode);
    expect(a.body.error).toBe(b.body.error);
  });

  it("will not let a code issued to one account verify another", async () => {
    await seedOpenCode(A, "111111", { userId: "user-one" });
    await expect(
      verifyPhoneCode({ phone: A, code: "111111", userId: "user-two" }),
    ).rejects.toBeInstanceOf(PhoneCodeInvalidError);
  });

  it("refuses a verified row being replayed", async () => {
    await seedOpenCode(A, "111111");
    await verifyPhoneCode({ phone: A, code: "111111" });
    // Second attempt: the row is no longer the open challenge.
    await expect(verifyPhoneCode({ phone: A, code: "111111" })).rejects.toBeInstanceOf(
      PhoneCodeNotFoundError,
    );
  });
});

describe("issuing", () => {
  it("rejects a malformed number before touching the database", async () => {
    await expect(requestPhoneCode({ phone: "not-a-number" })).rejects.toBeInstanceOf(
      PhoneCodeInvalidError,
    );
    await expect(requestPhoneCode({ phone: "+15551234567" })).rejects.toBeInstanceOf(
      PhoneCodeInvalidError,
    );
  });

  it("throttles repeat requests for the same number", async () => {
    // With no SMS provider the first request fails delivery, which deletes the
    // row -- so the throttle is proven by seeding a fresh open row directly.
    await seedOpenCode(A, "111111");
    await expect(requestPhoneCode({ phone: A })).rejects.toBeInstanceOf(
      PhoneCodeRateLimitedError,
    );
  });

  it("leaves no live code behind when the SMS cannot be sent", async () => {
    // No SMS_ETHIOPIA_API_KEY in tests, so sendSms returns sent:false. A live
    // challenge the user never received would be a silent trap, and reporting
    // success for a message that was not delivered would be worse.
    sendSucceeds = false;
    await expect(requestPhoneCode({ phone: B })).rejects.toThrow(/could not send/i);
    const rows = await prisma.phoneVerificationCode.count({ where: { phone: B } });
    expect(rows).toBe(0);
  });

  it("is the part that genuinely needs a live provider", () => {
    // A real send must return sent:true and leave exactly one usable open
    // challenge. Without SMS_ETHIOPIA_API_KEY neither is observable, and this
    // is recorded rather than faked: configure the key and a smoke test against
    // a real handset is the only way to prove the end-to-end path.
    sendSucceeds = true;
  });
});