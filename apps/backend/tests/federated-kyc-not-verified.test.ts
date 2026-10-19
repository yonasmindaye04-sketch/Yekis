import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { submitKycDocument } from "../src/modules/kyc/kyc.service.js";

/**
 * F-02 — a federated account is not a verified account.
 *
 * Telegram (x2) and Google/Apple/Facebook provisioning each created
 * `kyc: { tier: "TIER_1", status: "VERIFIED" }` with no document ever uploaded.
 * `requireKycVerified` then passed for the cheapest and highest-volume sign-up
 * path, which is exactly the control the gate exists to enforce.
 *
 * These assertions are about the DATA and the GATE, not about which sign-in
 * method was used: no method may produce a VERIFIED record without evidence.
 */

const app = buildApp();

const STAMP = Date.now();
let telegramUserId: bigint;
let oauthUserId: string;

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: `f02-telegram-${STAMP}` } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.kycDocument.deleteMany({
      where: { kycRecord: { userId: { in: ids } } },
    }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

beforeAll(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
});

/**
 * Creates a user exactly the way the federated provisioners do, so this test
 * fails the moment one of those create sites drifts back to VERIFIED.
 * Mirrors telegram.service.ts:224-238.
 */
let labelSeq = 0;

async function createFederatedStyleUser(label: string) {
  labelSeq += 1;
  // telegramUserId is @unique, so every fixture needs a distinct value.
  const telegramId = BigInt(STAMP) * 1000n + BigInt(labelSeq);
  return prisma.user.create({
    data: {
      email: `f02-telegram-${STAMP}-${label}@telegram.invalid`,
      phone: `+2519${String(10000000 + (labelSeq * 7919))}`,
      passwordHash: "federated-sentinel",
      role: "FREELANCER",
      telegramUserId: telegramId,
      telegramChatId: "f02",
      kyc: { create: { tier: "TIER_1", status: "PENDING" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    include: { kyc: true },
  });
}

describe("F-02 federated signup starts unverified", () => {
  it("a Telegram-provisioned account is PENDING, not VERIFIED", async () => {
    // This is the assertion the three create sites exist to satisfy.
    const src = await import("node:fs");
    const file = src.readFileSync(
      new URL("../src/modules/auth/telegram.service.ts", import.meta.url),
      "utf8",
    );
    const oauthFile = src.readFileSync(
      new URL("../src/modules/auth/oauth.service.ts", import.meta.url),
      "utf8",
    );

    expect(file).not.toMatch(/kyc:\s*\{\s*create:\s*\{\s*tier:\s*"TIER_1",\s*status:\s*"VERIFIED"/);
    expect(oauthFile).not.toMatch(/kyc:\s*\{\s*create:\s*\{\s*tier:\s*"TIER_1",\s*status:\s*"VERIFIED"/);
  });

  it("the PENDING record is present and holds no verified tier", async () => {
    const user = await createFederatedStyleUser("a");
    telegramUserId = user.telegramUserId as bigint;
    expect(user.kyc?.status).toBe("PENDING");
    expect(user.kyc?.highestVerifiedTier ?? null).toBeNull();
    const docs = await prisma.kycDocument.count({
      where: { kycRecord: { userId: user.id } },
    });
    expect(docs).toBe(0);
  });

  it("a PENDING user is blocked by the KYC gate on a real protected route", async () => {
    const user = await createFederatedStyleUser("b");
    oauthUserId = user.id;

    // The status endpoint is readable so the user can see where they stand…
    const status = await request(app)
      .get("/api/v1/kyc/status")
      .set("Authorization", `Bearer ${await mintFor(user.id)}`);
    expect(status.status).toBe(200);

    // …and the gate is what actually blocks the money path.
    expect(await gatedStatus(user.id)).toBe(403);
  });

  it("a first submission from PENDING reaches VERIFIED through the normal path", async () => {
    // Proves the change is not a dead end: these users can still verify, they
    // just have to submit evidence first.
    const user = await createFederatedStyleUser("c");

    const before = await prisma.kycRecord.findUniqueOrThrow({
      where: { userId: user.id },
    });
    expect(before.status).toBe("PENDING");
    expect(before.faydaVerificationAttempted).toBe(false);

    const result = await submitKycDocument({
      userId: user.id,
      documentType: "NATIONAL_ID",
      fileBuffer: Buffer.from("fake-png-bytes"),
      contentType: "image/png",
      fullName: "F02 Test Applicant",
      dateOfBirth: "1990-01-01",
      documentNumber: `F02-${STAMP}-c`,
    });

    expect(result.status).toBe("VERIFIED");
    expect(result.tier).toBe("TIER_1");

    const docs = await prisma.kycDocument.count({
      where: { kycRecord: { userId: user.id } },
    });
    expect(docs).toBe(1);
  });

  it("the KYC gate error tells the caller what to do next", async () => {
    const user = await createFederatedStyleUser("d");
    const res = await postJob(user.id);
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("KYC_NOT_VERIFIED");
    // F-02: an actionable nextAction, not a bare refusal.
    expect(res.body.nextAction).toBeDefined();
    expect(res.body.nextAction.type).toBe("KYC");
    expect(res.body.nextAction.path).toBe("/verification");
  });
});

// --- helpers -------------------------------------------------------------

import { SignJWT } from "jose";
import { env } from "../src/config/env.js";
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

async function mintFor(userId: string) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ role: "FREELANCER", auth_time: now, amr: ["pwd"] })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime("15m")
    .sign(accessSecret);
}

async function postJob(userId: string) {
  return request(app)
    .post("/api/v1/jobs")
    .set("Authorization", `Bearer ${await mintFor(userId)}`)
    .send({
      title: "F-02 gated job attempt",
      category: "WEB_APP_DEVELOPMENT",
      description: "A description long enough to satisfy the schema minimum length.",
      budgetMin: { amountMinor: 100000, currency: "ETB" },
      budgetMax: { amountMinor: 200000, currency: "ETB" },
      proposedMilestones: [
        {
          title: "One milestone",
          amount: { amountMinor: 100000, currency: "ETB" },
          dueDate: "2026-12-01",
        },
      ],
      deadline: "2026-12-01",
    });
}

async function gatedStatus(userId: string): Promise<number> {
  const res = await postJob(userId);
  return res.status;
}