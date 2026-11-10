import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";

/**
 * Two-factor approval is mandatory for withdrawals.
 *
 * The Roadmap puts it plainly: "2FA (SMS OTP) optional at MVP, mandatory for
 * withdrawals". Until now the only thing standing between a stolen session and
 * a bank transfer to an attacker's phone number was a five-minute re-auth —
 * which proves the session is recent, not that the person in front of the
 * screen approved THIS payout.
 *
 * These tests pin the three properties that matter:
 *
 *   1. A withdrawal with no approval code does not move money.
 *   2. A withdrawal with a wrong code does not move money.
 *   3. An approved code authorises ONE payout. Replaying it does not move
 *      money a second time.
 *
 * And the reason the code is scoped to a purpose: a phone-verification code
 * must not be able to approve a payout, or the "two factors" would be one
 * factor and a login message would double as a money approval.
 */

vi.mock("../src/modules/notifications/sms.client.js", () => ({
  sendSms: async () => ({ sent: true }),
}));

const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");
const { requestPhoneCode } = await import(
  "../src/modules/auth/phone-verification.service.js"
);

const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.payoutTransaction.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.transactionFlag.deleteMany({ where: { userId: { in: ids } } }),
    prisma.phoneVerificationCode.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function makeUser() {
  const seq = userIds.length;
  const u = await prisma.user.create({
    data: {
      email: `withdraw-2fa-${seq}-${STAMP}@test.et`,
      phone: `+2518${String(70000000 + (STAMP % 9000000) + seq * 7)}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      phoneVerifiedAt: new Date(),
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 5_000_000 } },
    } as never,
    include: { wallet: true },
  });
  userIds.push(u.id);
  return u;
}

async function authHeader(userId: string) {
  const session = await createAuthTokens(
    { id: userId, role: "FREELANCER", ucid: null },
    ["pwd"],
  );
  return `Bearer ${session.accessToken}`;
}

async function balanceOf(userId: string): Promise<number> {
  const w = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  return w.balanceMinor;
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("a withdrawal needs an SMS approval code", () => {
  it("refuses to move money without a code", async () => {
    const user = await makeUser();
    const before = await balanceOf(user.id);

    const res = await request(app)
      .post("/api/v1/escrow/wallet/withdraw")
      .set("Authorization", await authHeader(user.id))
      .send({
        amountMinor: 100_000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
        otpCode: "000000",
      });

    expect([400, 403]).toContain(res.status);
    expect(res.body.error).toMatch(/WITHDRAWAL_CODE/);
    expect(await balanceOf(user.id)).toBe(before);
    expect(await prisma.payoutTransaction.count({ where: { userId: user.id } })).toBe(0);
  });

  it("refuses a code that was never issued", async () => {
    const user = await makeUser();
    const before = await balanceOf(user.id);

    // No challenge exists for this user at all.
    const res = await request(app)
      .post("/api/v1/escrow/wallet/withdraw")
      .set("Authorization", await authHeader(user.id))
      .send({
        amountMinor: 100_000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
        otpCode: "123456",
      });

    expect([400, 403]).toContain(res.status);
    expect(await balanceOf(user.id)).toBe(before);
  });

  it("issues a code on request and moves money with it", async () => {
    const user = await makeUser();
    const before = await balanceOf(user.id);

    const otp = await request(app)
      .post("/api/v1/escrow/wallet/withdraw/otp")
      .set("Authorization", await authHeader(user.id))
      .send({});

    expect(otp.status).toBe(200);
    expect(otp.body.devCode, "the code must be readable outside production").toMatch(
      /^\d{6}$/,
    );

    const res = await request(app)
      .post("/api/v1/escrow/wallet/withdraw")
      .set("Authorization", await authHeader(user.id))
      .send({
        amountMinor: 100_000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
        otpCode: otp.body.devCode,
      });

    expect(res.status).toBe(200);
    expect(res.body.payoutId).toBeTruthy();
    expect(await balanceOf(user.id)).toBe(before - 100_000);
  });

  it("does not let one code authorise two payouts", async () => {
    const user = await makeUser();
    const before = await balanceOf(user.id);

    const otp = await request(app)
      .post("/api/v1/escrow/wallet/withdraw/otp")
      .set("Authorization", await authHeader(user.id))
      .send({});
    const code = otp.body.devCode as string;

    const first = await request(app)
      .post("/api/v1/escrow/wallet/withdraw")
      .set("Authorization", await authHeader(user.id))
      .send({
        amountMinor: 100_000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
        otpCode: code,
      });
    expect(first.status).toBe(200);

    // The same code, a second payout. The approval is spent.
    const second = await request(app)
      .post("/api/v1/escrow/wallet/withdraw")
      .set("Authorization", await authHeader(user.id))
      .send({
        amountMinor: 100_000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
        otpCode: code,
      });

    expect([400, 403]).toContain(second.status);
    expect(await balanceOf(user.id)).toBe(before - 100_000);
    expect(await prisma.payoutTransaction.count({ where: { userId: user.id } })).toBe(1);
  });
});

describe("a code proves one thing only", () => {
  it("a phone-verification code cannot approve a payout", async () => {
    const user = await makeUser();
    const before = await balanceOf(user.id);

    // A code issued to prove control of the number — the login/registration
    // flow. It is not an approval to move money.
    const challenge = await requestPhoneCode({
      phone: user.phone,
      userId: user.id,
    });
    const code = challenge.devCode!;

    const res = await request(app)
      .post("/api/v1/escrow/wallet/withdraw")
      .set("Authorization", await authHeader(user.id))
      .send({
        amountMinor: 100_000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
        otpCode: code,
      });

    expect([400, 403]).toContain(res.status);
    expect(await balanceOf(user.id)).toBe(before);
  });

  it("requesting a payout code does not cancel a pending phone verification", async () => {
    // The two are separate proofs. If they shared one outstanding code per
    // number, asking for a payout code would silently un-verify the account
    // whose phone proof had just been sent — a denial of service on a
    // security control, reachable by anyone who knows the number.
    const user = await makeUser();

    const phoneChallenge = await requestPhoneCode({
      phone: user.phone,
      userId: user.id,
    });

    await request(app)
      .post("/api/v1/escrow/wallet/withdraw/otp")
      .set("Authorization", await authHeader(user.id))
      .send({});

    // The phone-verification code still verifies.
    const { verifyPhoneCode } = await import(
      "../src/modules/auth/phone-verification.service.js"
    );
    await expect(
      verifyPhoneCode({
        phone: user.phone,
        code: phoneChallenge.devCode!,
        userId: user.id,
      }),
    ).resolves.toEqual({ verified: true });
  });
});
