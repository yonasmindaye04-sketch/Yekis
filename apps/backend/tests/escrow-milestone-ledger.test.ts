import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { prisma } from "../src/lib/prisma.js";
import { escrowRouter } from "../src/modules/escrow/escrow.routes.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * The workspace ledger used to be assembled on the client out of a demo map:
 * a fixed counterparty ("Hanna Tadesse"), a made-up contract name, a category
 * and a payment rail picked by row index. A brand-new account therefore saw a
 * populated ledger full of another account's business.
 *
 * These tests pin the other half of the fix: the API hands the workspace the
 * facts it actually holds — the real counterparty, the real contract title,
 * the real payment rail and the real funding timestamp — and only ever
 * returns milestones the caller is party to.
 */

const STAMP = Date.now();
const M = 100000; // ETB 1,000.00

let clientId: string;
let freelancerId: string;
let outsiderId: string;
let clientEmail: string;
let freelancerEmail: string;

const contractIds: string[] = [];
const tokenCache = new Map<string, string>();

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

async function authed(
  method: "get" | "post",
  url: string,
  userId: string,
  role: "CLIENT" | "FREELANCER",
  body?: unknown,
) {
  const token = await tokenFor(userId, role);
  let req = request(escrowApp())[method](url).set("Authorization", `Bearer ${token}`);
  if (body !== undefined) req = req.send(body as object);
  return req;
}

async function makeUser(
  label: string,
  role: "CLIENT" | "FREELANCER",
  balance: number,
  displayName: string,
) {
  const user = await prisma.user.create({
    data: {
      email: `escrow-ledger-${label}-${STAMP}@test.et`,
      phone: `+2519${String(70000000 + Math.abs(label.charCodeAt(0)) * 100000 + (STAMP % 900))}`,
      passwordHash: "not-a-real-hash",
      role,
      displayName,
      firstName: displayName.split(" ")[0],
      lastName: displayName.split(" ")[1] ?? "",
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: balance } },
    } as never,
    include: { wallet: true },
  });
  return user;
}

/** A fully executed contract with one milestone in the given escrow state. */
async function makeContract(escrowState: string, title: string) {
  const job = await prisma.job.create({
    data: {
      clientId,
      title,
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
          title: `Milestone of ${title}`,
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

async function cleanup() {
  const users = [clientId, freelancerId, outsiderId].filter(Boolean);
  if (!users.length) return;
  const userFilter = { in: users };
  const ids = contractIds.length ? contractIds : ["__none__"];
  const childFilter = { contractId: { in: ids } };
  const contractFilter = { id: { in: ids } };

  await prisma.auditLog.deleteMany({ where: { userId: userFilter } });
  await prisma.transactionFlag.deleteMany({ where: { userId: userFilter } });
  await prisma.payoutTransaction.deleteMany({ where: { userId: userFilter } });
  await prisma.paymentTransaction.deleteMany({ where: { milestone: childFilter } });
  await prisma.ledgerEntry.deleteMany({
    where: { journal: { referenceId: { in: ids } } },
  });
  await prisma.ledgerJournal.deleteMany({ where: { referenceId: { in: ids } } });
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

beforeAll(async () => {
  await cleanup();
  const client = await makeUser("client", "CLIENT", 500000, "Client Owner");
  const freelancer = await makeUser("freelancer", "FREELANCER", 0, "Talent Owner");
  const outsider = await makeUser("outsider", "CLIENT", 0, "Nobody Here");
  clientId = client.id;
  freelancerId = freelancer.id;
  outsiderId = outsider.id;
  clientEmail = client.email;
  freelancerEmail = freelancer.email;
});

afterAll(async () => {
  await cleanup();
});

describe("the workspace milestone list carries the caller's own facts", () => {
  it("names the real counterparty and contract instead of a demo placeholder", async () => {
    const milestone = await makeContract("PAYMENT_PENDING", "Addis Logistics Telemetry");

    const asClient = await authed("get", "/api/v1/escrow/milestones", clientId, "CLIENT");
    expect(asClient.status).toBe(200);
    const row = asClient.body.find((m: { id: string }) => m.id === milestone.id);
    expect(row).toBeDefined();

    // The client sees the freelancer as the counterparty.
    expect(row.counterparty.role).toBe("FREELANCER");
    expect(row.counterparty.name).toBe("Talent Owner");
    expect(row.counterparty.email).toBe(freelancerEmail);
    expect(row.contract.title).toBe("Addis Logistics Telemetry");
    expect(row.contract.category).toBe("WEB_APP_DEVELOPMENT");

    // The freelancer sees the client.
    const asFreelancer = await authed(
      "get",
      "/api/v1/escrow/milestones",
      freelancerId,
      "FREELANCER",
    );
    const freelancerRow = asFreelancer.body.find(
      (m: { id: string }) => m.id === milestone.id,
    );
    expect(freelancerRow.counterparty.role).toBe("CLIENT");
    expect(freelancerRow.counterparty.email).toBe(clientEmail);
  });

  it("returns nothing at all to an account that is not a party to the contract", async () => {
    const milestone = await makeContract("PAYMENT_PENDING", "Coffee Export ERP");

    const asOutsider = await authed("get", "/api/v1/escrow/milestones", outsiderId, "CLIENT");
    expect(asOutsider.status).toBe(200);
    expect(asOutsider.body).toHaveLength(0);
    expect(
      asOutsider.body.map((m: { id: string }) => m.id),
    ).not.toContain(milestone.id);
  });

  it("reports the real payment rail and funding timestamp", async () => {
    const milestone = await makeContract("ESCROW_HELD", "Telebirr Checkout API");
    const fundedAt = new Date(Date.now() - 60000);

    // A rail-funded milestone: the money moved over a payment provider, so
    // the milestone knows which rail it travelled on.
    await prisma.paymentTransaction.create({
      data: {
        milestoneId: milestone.id,
        provider: "TELEBIRR",
        providerTransactionId: `ledger-${STAMP}-${milestone.id}`,
        amountMinor: M,
        status: "SUCCESS",
        createdAt: fundedAt,
      },
    });

    const asClient = await authed("get", "/api/v1/escrow/milestones", clientId, "CLIENT");
    const row = asClient.body.find((m: { id: string }) => m.id === milestone.id);
    expect(row.paymentRail).toBe("TELEBIRR");
    expect(row.fundedAt).toBe(fundedAt.toISOString());

    // A milestone funded from the caller's own wallet has no payment rail --
    // it was an internal transfer, not a rail payment.
    const walletFunded = await makeContract("PAYMENT_PENDING", "M-Pesa USSD Fallback");
    const funded = await authed(
      "post",
      "/api/v1/escrow/fund-from-wallet",
      clientId,
      "CLIENT",
      { milestoneId: walletFunded.id },
    );
    expect(funded.status).toBe(200);

    const afterFunding = await authed("get", "/api/v1/escrow/milestones", clientId, "CLIENT");
    const walletRow = afterFunding.body.find(
      (m: { id: string }) => m.id === walletFunded.id,
    );
    expect(walletRow.paymentRail).toBeNull();
    // The escrow-funding journal is what dates a wallet-funded milestone;
    // without it the cash-flow chart would be empty for wallet users.
    expect(walletRow.fundedAt).toBeTruthy();
    expect(new Date(walletRow.fundedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });
});
