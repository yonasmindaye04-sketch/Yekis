import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { SignJWT } from "jose";
import { env } from "../src/config/env.js";

/**
 * Top-up review endpoints — the decision must come from the URL, not the body.
 *
 * The reject endpoint used to parse
 *   TopUpReviewDecisionInput.safeParse({ decision: "REJECTED", ...req.body })
 * The spread came AFTER the literal, so a body of
 *   { decision: "APPROVED", rejectionReason: "..." }
 * overrode the literal and the endpoint approved a top-up it was asked to
 * reject. This is a staff endpoint, so the blast radius is the review queue.
 *
 * Fixed by parsing a strict TopUpRejectInput that has no `decision` field at
 * all, so such a body is refused with 400 and can never approve.
 */

const app = buildApp();
const STAMP = Date.now();
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

let staffId: string;
let payerId: string;
let topUpId: string;

async function mintFor(userId: string, role: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role, auth_time: now, amr: ["pwd"] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime("15m")
    .sign(accessSecret);
}

async function asStaff() {
  return { Authorization: `Bearer ${await mintFor(staffId, "CLIENT")}` };
}

beforeAll(async () => {
  // Staff is a `staffRole` on a normal user row, not a `role` — UserRole is
  // only CLIENT/FREELANCER/BOTH.
  const staff = await prisma.user.create({
    data: {
      email: `topup-staff-${STAMP}@test.et`,
      phone: `+25194${String(70000000 + (STAMP % 900000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: "COMPLIANCE_OFFICER",
      kyc: { create: { tier: "TIER_3", status: "VERIFIED" } },
    },
  });
  staffId = staff.id;

  const user = await prisma.user.create({
    data: {
      email: `topup-user-${STAMP}@test.et`,
      phone: `+25193${String(80000000 + (STAMP % 900000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      wallet: { create: { balanceMinor: 0 } },
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
    },
    include: { wallet: true },
  });
  payerId = user.id;

  const topUp = await prisma.walletTopUp.create({
    data: {
      userId: user.id,
      walletId: user.wallet!.id,
      amountMinor: 50000,
      provider: "TELEBIRR",
      referenceNumber: `topup-ref-${STAMP}`,
      status: "PENDING",
    },
  });
  topUpId = topUp.id;
});

afterAll(async () => {
  // Scoped strictly to the rows this file created.
  const mine = [staffId, payerId].filter(Boolean);
  if (!mine.length) return;
  await prisma.auditLog.deleteMany({ where: { userId: { in: mine } } });
  await prisma.walletTopUp.deleteMany({ where: { userId: { in: mine } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: mine } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: mine } } });
  await prisma.user.deleteMany({ where: { id: { in: mine } } });
});

describe("a top-up review decision cannot be overridden by the request body", () => {
  it("the reject endpoint refuses a body that tries to set decision=APPROVED", async () => {
    const res = await request(app)
      .post(`/api/v1/wallet/topups/${topUpId}/reject`)
      .set(await asStaff())
      .send({ decision: "APPROVED", rejectionReason: "Looks fine to me." });

    // Must not be a success, and specifically not an approval.
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");

    // The top-up must still be awaiting review — nothing was decided.
    const after = await prisma.walletTopUp.findUniqueOrThrow({
      where: { id: topUpId },
    });
    expect(after.status).toBe("PENDING");
  });

  it("the reject endpoint still works for a well-formed body", async () => {
    // Guards the fix from being an over-correction that breaks the real path.
    const res = await request(app)
      .post(`/api/v1/wallet/topups/${topUpId}/reject`)
      .set(await asStaff())
      .send({ rejectionReason: "The bank reference does not match the receipt." });

    expect(res.status).toBe(200);

    const after = await prisma.walletTopUp.findUniqueOrThrow({
      where: { id: topUpId },
    });
    expect(after.status).toBe("REJECTED");
  });
});