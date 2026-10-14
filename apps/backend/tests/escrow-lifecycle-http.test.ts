import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { prisma } from "../src/lib/prisma.js";
import { escrowRouter } from "../src/modules/escrow/escrow.routes.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import { calculateFees } from "../src/modules/escrow/fees.js";

/**
 * The escrow lifecycle has to work over HTTP, not just in the service layer.
 *
 * These five endpoints were deleted in Phase 0 while the frontend calls for them
 * were left in place, so the entire money flow returned 404: a contract could be
 * signed, but nothing could be funded, no delivery could be submitted and no
 * payment could be released. `acceptContract` even tells the client that escrow
 * funding "is now available" -- to a route that did not exist.
 *
 * The existing escrow suites call `withdrawFromWallet` and friends directly
 * against the service module, which is exactly why the missing routes went
 * unnoticed: nothing ever asked the HTTP layer whether they existed. These tests
 * go through the router, because that is the layer that was broken.
 *
 * Authorisation is not re-litigated here; escrow.service.ts owns it and has its
 * own coverage. What is pinned is that the routes exist, are authenticated, and
 * carry money end to end.
 */

const STAMP = Date.now();
const M = 100000; // ETB 1,000.00

let clientId: string;
let freelancerId: string;
let outsiderId: string;
// Every contract this file creates, not just the newest. A single variable left
// earlier contracts behind, and the job delete then failed on Contract_jobId.
const contractIds: string[] = [];
let ucidCounter = 0;

const tokenCache = new Map<string, string>();

/**
 * Real signed tokens, because requireAuth verifies a JWT and re-reads the user
 * row; faking `req.user` would bypass exactly the middleware under test. `amr`
 * is "pwd" so requireFreshAuth on the accept route is satisfied the same way a
 * genuine password login satisfies it.
 */
async function tokenFor(userId: string, role: "CLIENT" | "FREELANCER") {
  const cached = tokenCache.get(userId);
  if (cached) return cached;
  const { accessToken } = await createAuthTokens(
    { id: userId, role, ucid: null, sessionVersion: 0 },
    ["pwd"],
  );
  tokenCache.set(userId, accessToken);
  return accessToken;
}

const escrowApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/v1/escrow", escrowRouter);
  return app;
};

async function authed(method: "get" | "post", url: string, userId: string, role: "CLIENT" | "FREELANCER", body?: unknown) {
  const token = await tokenFor(userId, role);
  let req = request(escrowApp())[method](url).set("Authorization", `Bearer ${token}`);
  if (body !== undefined) req = req.send(body as object);
  return req;
}

async function makeUser(label: string, role: "CLIENT" | "FREELANCER", balance: number) {
  return prisma.user.create({
    data: {
      email: `escrow-http-${label}-${STAMP}@test.et`,
      phone: `+2519${String(40000000 + Math.abs(label.charCodeAt(0)) * 100000 + (STAMP % 900))}`,
      passwordHash: "not-a-real-hash",
      role,
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: balance } },
    } as never,
    include: { wallet: true },
  });
}

async function cleanup() {
  const users = [clientId, freelancerId, outsiderId].filter(Boolean);
  if (!users.length) return;
  const userFilter = { in: users };
  // Two shapes: children carry contractId, the contract itself is keyed on id.
  // Using the contract's primary key for the children matches nothing, which
  // leaves the rows behind and makes the contract delete fail on its FK.
  const ids = contractIds.length ? contractIds : ["__none__"];
  const childFilter = { contractId: { in: ids } };
  const contractFilter = { id: { in: ids } };

await prisma.auditLog.deleteMany({ where: { userId: userFilter } });
  await prisma.transactionFlag.deleteMany({ where: { userId: userFilter } });
  await prisma.payoutTransaction.deleteMany({ where: { userId: userFilter } });
  await prisma.ledgerEntry.deleteMany({
    where: { journal: { idempotencyKey: { contains: "escrow-http-" } } },
  });
  await prisma.ledgerJournal.deleteMany({
    where: { idempotencyKey: { contains: "escrow-http-" } },
  });
  await prisma.ledgerAccount.deleteMany({ where: { code: { startsWith: "escrow-http" } } });
  // Contract has three inbound FKs (Dispute, Milestone, Review); Review and
  // Dispute have to go before the contract itself or the delete is refused.
  await prisma.review.deleteMany({ where: childFilter });
  await prisma.disputeEvidence.deleteMany({ where: { dispute: childFilter } });
  await prisma.dispute.deleteMany({ where: childFilter });
  await prisma.milestone.deleteMany({ where: childFilter });
  await prisma.contract.deleteMany({ where: contractFilter });
  await prisma.job.deleteMany({ where: { clientId: userFilter } });
  await prisma.wallet.deleteMany({ where: { userId: userFilter } });
  await prisma.kycRecord.deleteMany({ where: { userId: userFilter } });
  await prisma.user.deleteMany({ where: { id: userFilter } });
}

/** A fully executed contract with one milestone in the given escrow state. */
async function makeContract(escrowState: string) {
  const job = await prisma.job.create({
    data: {
      clientId,
      title: `escrow-http fixture ${STAMP}`,
      category: "WEB_APP_DEVELOPMENT",
      description: "A description long enough to satisfy the schema minimum length.",
      budgetMinMinor: M,
      budgetMaxMinor: M,
      deadline: new Date(Date.now() + 86400000 * 30),
      proposedMilestones: [],
    },
  });
  const contract = await prisma.contract.create({
    data: {
      jobId: job.id,
      clientId,
      freelancerId,
      templateVersion: "test",
      documentStoragePath: "test/doc.pdf",
      clientAcceptedAt: new Date(),
      freelancerAcceptedAt: new Date(),
      milestones: {
        create: {
          title: "M1",
          amountMinor: M,
          dueDate: new Date(Date.now() + 86400000 * 30),
          escrowState,
        },
      },
    },
    include: { milestones: true },
  });
  contractIds.push(contract.id);
  return contract.milestones[0];
}

beforeAll(async () => {
  await cleanup();
  clientId = (await makeUser("client", "CLIENT", 500000)).id;
  freelancerId = (await makeUser("freelancer", "FREELANCER", 0)).id;
  outsiderId = (await makeUser("outsider", "CLIENT", 0)).id;
});

afterAll(async () => {
  await cleanup();
});

describe("the escrow lifecycle exists over HTTP", () => {
  it("moves money end to end: fund -> submit -> accept", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");

    const walletBefore = await prisma.wallet.findUniqueOrThrow({ where: { userId: clientId } });
    expect(walletBefore.balanceMinor).toBe(500000);

    // 1. Client funds from wallet.
    const funded = await authed("post", "/api/v1/escrow/fund-from-wallet", clientId, "CLIENT", {
      milestoneId: milestone.id,
    });
    expect(funded.status).toBe(200);
    expect(funded.body.escrowState).toBe("ESCROW_HELD");

    // The money left the client's wallet, which is the whole point. The charge
    // is the milestone amount plus the client-side platform fee, so the
    // expectation is taken from calculateFees rather than hardcoded -- a test
    // that asserts a magic number would silently rot when the fee changes.
    const expectedCharge = calculateFees({
      milestoneAmountMinor: M,
      freelancerHasTin: false,
    }).clientTotalChargeMinor;
    expect(expectedCharge).toBeGreaterThan(M);

    const walletAfter = await prisma.wallet.findUniqueOrThrow({ where: { userId: clientId } });
    expect(walletAfter.balanceMinor).toBe(500000 - expectedCharge);

    // 2. Freelancer submits the delivery.
    const submitted = await authed(
      "post",
      `/api/v1/escrow/milestones/${milestone.id}/submit`,
      freelancerId,
      "FREELANCER",
    );
    expect(submitted.status).toBe(200);
    expect(submitted.body.escrowState).toBe("SUBMITTED_FOR_REVIEW");

    // 3. Client accepts, which releases the funds.
    const accepted = await authed(
      "post",
      `/api/v1/escrow/milestones/${milestone.id}/accept`,
      clientId,
      "CLIENT",
    );
    expect(accepted.status).toBe(200);
    expect(accepted.body.escrowState).toBe("RELEASED");

    // 4. The freelancer was actually paid, net of the platform fee.
    const freelancerWallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: freelancerId },
    });
    expect(freelancerWallet.balanceMinor).toBeGreaterThan(0);
    expect(freelancerWallet.balanceMinor).toBeLessThan(M);
  });

  it("lists only milestones the caller is party to", async () => {
    const mine = await makeContract("PAYMENT_PENDING");

    const asClient = await authed("get", "/api/v1/escrow/milestones", clientId, "CLIENT");
    expect(asClient.status).toBe(200);
    expect(asClient.body.map((m: { id: string }) => m.id)).toContain(mine.id);

    const asOutsider = await authed("get", "/api/v1/escrow/milestones", outsiderId, "CLIENT");
    expect(asOutsider.status).toBe(200);
    expect(asOutsider.body.map((m: { id: string }) => m.id)).not.toContain(mine.id);
  });

  it("refuses to let a non-party fund, submit or accept", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");

    const funded = await authed(
      "post",
      "/api/v1/escrow/fund-from-wallet",
      outsiderId,
      "CLIENT",
      { milestoneId: milestone.id },
    );
    expect(funded.status).toBe(403);

    const submitted = await authed(
      "post",
      `/api/v1/escrow/milestones/${milestone.id}/submit`,
      outsiderId,
      "CLIENT",
    );
    expect(submitted.status).toBe(403);

    const accepted = await authed(
      "post",
      `/api/v1/escrow/milestones/${milestone.id}/accept`,
      outsiderId,
      "CLIENT",
    );
    expect(accepted.status).toBe(403);
  });

  it("rejects an unknown milestone rather than crashing", async () => {
    const res = await authed(
      "post",
      "/api/v1/escrow/fund-from-wallet",
      clientId,
      "CLIENT",
      { milestoneId: "__no_such_milestone__" },
    );
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
  });

  it("rejects a malformed body with a validation error", async () => {
    const res = await authed("post", "/api/v1/escrow/fund-from-wallet", clientId, "CLIENT", {});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

it("requires authentication on every route", async () => {
    // Each of these returned 404 before this change; a route that does not
    // exist also "fails closed", so pinning the status proves they are mounted
    // AND protected rather than silently open.
    const cases: [string, string][] = [
      ["get", "/api/v1/escrow/milestones"],
      ["post", "/api/v1/escrow/fund-from-wallet"],
      ["post", "/api/v1/escrow/milestones/__x__/submit"],
      ["post", "/api/v1/escrow/milestones/__x__/accept"],
      ["get", "/api/v1/escrow/payouts"],
    ];
    for (const [method, url] of cases) {
      const res = await request(escrowApp())[method as "get" | "post"](url);
      expect(res.status, `${method.toUpperCase()} ${url}`).toBe(401);
    }
  });
});

describe("payout history is the user's own and no one else's", () => {
  it("returns the caller's payouts and withholds another user's", async () => {
    const walletFor = async (id: string) =>
      (await prisma.wallet.findUniqueOrThrow({ where: { userId: id } })).id;

    const mine = await prisma.payoutTransaction.create({
      data: {
        userId: freelancerId,
        walletId: await walletFor(freelancerId),
        amountMinor: 25000,
        feeMinor: 125,
        netAmountMinor: 24875,
        provider: "TELEBIRR",
        payoutAccountIdentifier: "+251900000001",
        status: "CONFIRMED",
        settledAt: new Date(),
      },
    });
    // A different user's payout on the same rail. The listing must not leak it.
    const theirs = await prisma.payoutTransaction.create({
      data: {
        userId: outsiderId,
        walletId: await walletFor(outsiderId),
        amountMinor: 99000,
        feeMinor: 0,
        netAmountMinor: 99000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: "+251900000002",
        status: "PROCESSING",
      },
    });

    const res = await authed("get", "/api/v1/escrow/payouts", freelancerId, "FREELANCER");
    expect(res.status).toBe(200);
    expect(res.body.page).toBe(1);
    const ids = res.body.items.map((p: { id: string }) => p.id);
    expect(ids).toContain(mine.id);
    expect(ids).not.toContain(theirs.id);

    // The fields a user needs for a receipt and a tax record.
    const first = res.body.items.find((p: { id: string }) => p.id === mine.id);
    expect(first.netAmountMinor).toBe(24875);
    expect(first.feeMinor).toBe(125);
    expect(first.provider).toBe("TELEBIRR");
    expect(first.status).toBe("CONFIRMED");
    expect(first.settledAt).not.toBeNull();
  });

  it("returns an empty list rather than erroring for a user with no payouts", async () => {
    const res = await authed("get", "/api/v1/escrow/payouts", clientId, "CLIENT");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
  });
});
