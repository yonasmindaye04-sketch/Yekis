import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";

/**
 * Verifying a phone number has to change something.
 *
 * The OTP flow shipped complete: codes were hashed, salted, rate-limited and
 * brute-force-bounded. `verifyPhoneCode` set `PhoneVerificationCode.verifiedAt`
 * -- and nothing in the codebase read that column. User had no field recording
 * the outcome at all.
 *
 * So "verified" was a fact about a row nobody queried, and the flow it was
 * built to support was advisory. `User.phone` is the Telebirr and M-Pesa payout
 * destination and the TMS identity check, which means an account could be
 * registered against someone else's number -- that needs no credentials, only
 * knowledge of the number -- and then reach the point of instructing a real
 * bank transfer to a stranger. Tier-2 KYC does not close this: a national ID
 * proves who someone is, not whether their phone is theirs.
 *
 * These tests assert the account's state and the payout gate, not that a
 * timestamp was written somewhere.
 */

vi.mock("../src/modules/notifications/sms.client.js", () => ({
  sendSms: async () => ({ sent: true }),
}));

const { requestPhoneCode, verifyPhoneCode, PhoneCodeInvalidError } = await import(
  "../src/modules/auth/phone-verification.service.js"
);
const { withdrawFromWallet, PhoneNotVerifiedError } = await import(
  "../src/modules/escrow/escrow.service.js"
);
const { registerUser } = await import("../src/modules/auth/auth.service.js");

const app: Express = buildApp();
const STAMP = Date.now();
const PHONE = `+251911${String(STAMP % 1_000_000).padStart(6, "0")}`;

const userIds: string[] = [];

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);
  await prisma.phoneVerificationCode.deleteMany({ where: { phone: PHONE } });
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    // Before Wallet: PayoutTransaction holds an FK to it, and a $transaction
    // array runs in order, so deleting the wallet first is a P2003.
    prisma.payoutTransaction.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.transactionFlag.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function makeUser(opts?: { phoneVerified?: boolean; balance?: number }) {
  const seq = userIds.length;
  const u = await prisma.user.create({
    data: {
      email: `phone-verified-${seq}-${STAMP}@test.et`,
      phone: `+2519${String(30000000 + (STAMP % 9000000) + seq * 7)}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      phoneVerifiedAt: opts?.phoneVerified ? new Date() : null,
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: opts?.balance ?? 1_000_000 } },
    } as never,
    include: { wallet: true, kyc: true },
  });
  userIds.push(u.id);
  return u;
}

async function verifiedAtFor(userId: string): Promise<Date | null> {
  const u = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { phoneVerifiedAt: true },
  });
  return u.phoneVerifiedAt;
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("a verified code marks the account", () => {
  it("sets phoneVerifiedAt on the user", async () => {
    const user = await makeUser({ phoneVerified: false });
    expect(await verifiedAtFor(user.id)).toBeNull();

    const challenge = await requestPhoneCode({ phone: user.phone, userId: user.id });
    expect(challenge.devCode, "the code must be readable in tests").toBeTruthy();

    await verifyPhoneCode({
      phone: user.phone,
      code: challenge.devCode!,
      userId: user.id,
    });

    expect(
      await verifiedAtFor(user.id),
      "a verified code must leave a mark on the account",
    ).toBeInstanceOf(Date);
  });

  it("does not mark an account that never verified", async () => {
    const user = await makeUser({ phoneVerified: false });
    expect(await verifiedAtFor(user.id)).toBeNull();
  });

  it("does not mark the account when the code is wrong", async () => {
    const user = await makeUser({ phoneVerified: false });
    const challenge = await requestPhoneCode({ phone: user.phone, userId: user.id });

    await expect(
      verifyPhoneCode({ phone: user.phone, code: "000000", userId: user.id }),
    ).rejects.toBeInstanceOf(PhoneCodeInvalidError);

    expect(await verifiedAtFor(user.id)).toBeNull();
  });

  it("cannot mark a different number on the same account as verified", async () => {
    // The account's phone is B. A code is issued and verified for number A.
    // Both operations succeed — A genuinely was proven — but that says nothing
    // about B, and B is what a payout would go to.
    const user = await makeUser({ phoneVerified: false });
    const otherA = `+251922${String(STAMP % 1_000_000).padStart(6, "0")}`;
    expect(user.phone).not.toBe(otherA);

    const challenge = await requestPhoneCode({ phone: otherA, userId: null });
    await verifyPhoneCode({
      phone: otherA,
      code: challenge.devCode!,
      userId: user.id,
    });

    // The guard is `where: { id, phone }` on the update. Dropping `phone` from
    // that predicate is the bug this pins: it would mark the account verified
    // for a number it has never proven, which is precisely the number that does
    // not match User.phone and does receive the money.
    expect(
      await verifiedAtFor(user.id),
      "proving number A must not verify number B on the same account",
    ).toBeNull();
  });
});

describe("registration carries the proof across", () => {
  it("marks a new account verified when its number was proven first", async () => {
    // The primary flow: verify BEFORE the account exists.
    const challenge = await requestPhoneCode({ phone: PHONE, userId: null });
    await verifyPhoneCode({ phone: PHONE, code: challenge.devCode!, userId: null });

    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);

    const user = await registerUser({
      email: `register-verified-${STAMP}@test.et`,
      phone: PHONE,
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
    userIds.push(user.id);

    expect(
      await verifiedAtFor(user.id),
      "verification happens before the account exists, so registration must adopt it",
    ).toBeInstanceOf(Date);
  });

  it("leaves an unproven number unverified at registration", async () => {
    // A number derived from a per-run random component, and its code history
    // cleared first. `hasRecentVerifiedCode` matches on the phone number alone
    // within a 10-minute window, so a number that any earlier run — in this file
    // or another — happened to verify makes this assertion depend on global
    // database state rather than on the code under test.
    const other = `+251933${String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0")}`;
    await prisma.phoneVerificationCode.deleteMany({ where: { phone: other } });

    const adult = new Date();
    adult.setFullYear(adult.getFullYear() - 30);

    const user = await registerUser({
      email: `register-unverified-${STAMP}-${Math.random().toString(36).slice(2, 8)}@test.et`,
      phone: other,
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
    userIds.push(user.id);

    expect(
      await verifiedAtFor(user.id),
      "a number nobody proved must not be marked verified",
    ).toBeNull();
  });
});

describe("an unverified number cannot receive a payout", () => {
  it("refuses to withdraw when the phone was never proven", async () => {
    const user = await makeUser({ phoneVerified: false });

    await expect(
      withdrawFromWallet({
        userId: user.id,
        amountMinor: 100_000,
        provider: "TELEBIRR" as never,
        payoutAccountIdentifier: user.phone,
      }),
    ).rejects.toBeInstanceOf(PhoneNotVerifiedError);
  });

  it("refuses even when every other withdrawal condition is satisfied", async () => {
    // Tier-2 KYC, money in the wallet, no active contract, no open dispute.
    // Only the phone is unproven -- so this isolates the gate.
    const user = await makeUser({ phoneVerified: false, balance: 5_000_000 });
    expect(user.kyc?.tier).toBe("TIER_2");

    await expect(
      withdrawFromWallet({
        userId: user.id,
        amountMinor: 100_000,
        provider: "TELEBIRR" as never,
        payoutAccountIdentifier: user.phone,
      }),
    ).rejects.toBeInstanceOf(PhoneNotVerifiedError);

    // No payout was created and no money left.
    expect(await prisma.payoutTransaction.count({ where: { userId: user.id } })).toBe(0);
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: user.wallet!.id } });
    expect(wallet.balanceMinor).toBe(5_000_000);
  });

  it("lets a verified phone through the gate", async () => {
    // The control. Without it, 'every withdrawal is refused' would satisfy the
    // two tests above for entirely the wrong reason.
    const user = await makeUser({ phoneVerified: true, balance: 5_000_000 });

    let result: unknown = null;
    try {
      await withdrawFromWallet({
        userId: user.id,
        amountMinor: 100_000,
        provider: "TELEBIRR" as never,
        payoutAccountIdentifier: user.phone,
      });
    } catch (err) {
      result = err;
    }
    expect(
      result,
      "a verified phone must clear the gate (any later failure is a different check)",
    ).not.toBeInstanceOf(PhoneNotVerifiedError);
  });
});

describe("the gate answers with an actionable status", () => {
  it("returns PHONE_NOT_VERIFIED over HTTP, not a generic 500", async () => {
    const user = await makeUser({ phoneVerified: false });
    const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");
    const session = await createAuthTokens(
      { id: user.id, role: "FREELANCER", ucid: null },
      ["pwd"],
    );

    const res = await request(app)
      .post("/api/v1/escrow/wallet/withdraw")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        amountMinor: 100_000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("PHONE_NOT_VERIFIED");
  });
});
