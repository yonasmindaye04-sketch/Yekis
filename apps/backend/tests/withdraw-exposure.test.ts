import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  withdrawFromWallet,
  ActiveContractWithdrawalBlockedError,
} from "../src/modules/escrow/escrow.service.js";

/**
 * F-22 — escrow exposure is a fact, not a role.
 *
 * The "you are holding money for someone else" checks lived inside
 * `if (user.role === "CLIENT")`. A BOTH account can hire, so it could accept a
 * contract, have it funded, and then withdraw that balance mid-milestone — the
 * exact thing the check exists to prevent. The same applied to the open-dispute
 * check.
 *
 * These tests pin the behaviour for all three roles, on both sides of a contract.
 */

const STAMP = Date.now();
const M = 100000; // ETB 1,000.00 per milestone

let clientId: string;
let freelancerId: string;
let bothId: string;
let contractId: string;
let milestoneId: string;

async function cleanup() {
  const users = [clientId, freelancerId, bothId].filter(Boolean);
  if (!users.length) return;
  await prisma.auditLog.deleteMany({ where: { userId: { in: users } } });
  // A withdrawal attempt can trip the TMS wallet-mismatch rule and leave a
  // TransactionFlag row pointing at the user.
  await prisma.transactionFlag.deleteMany({ where: { userId: { in: users } } });
  await prisma.payoutTransaction.deleteMany({ where: { userId: { in: users } } });
  await prisma.ledgerEntry.deleteMany({});
  await prisma.ledgerJournal.deleteMany({});
  await prisma.disputeEvidence.deleteMany({});
  await prisma.dispute.deleteMany({ where: { contractId } });
  await prisma.milestone.deleteMany({ where: { contractId } });
  await prisma.contract.deleteMany({ where: { id: contractId } });
  await prisma.job.deleteMany({ where: { clientId: { in: users } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: users } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: users } } });
  await prisma.user.deleteMany({ where: { id: { in: users } } });
}

async function makeUser(label: string, role: "CLIENT" | "FREELANCER" | "BOTH", balance: number) {
  return prisma.user.create({
    data: {
      email: `f22-${label}-${STAMP}@test.et`,
      phone: `+2519${String(30000000 + Math.abs(label.charCodeAt(0)) * 100000 + (STAMP % 900))}`,
      passwordHash: "not-a-real-hash",
      role,
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: balance } },
    } as never,
    include: { wallet: true },
  });
}

/** A contract with one milestone in the given escrow state. */
async function makeContract(
  owner: "client" | "freelancer",
  escrowState: "ESCROW_HELD" | "SUBMITTED_FOR_REVIEW" | "RELEASED" | "REFUNDED",
) {
  const cid = owner === "client" ? clientId : freelancerId;
  const fid = owner === "client" ? freelancerId : clientId;
  const job = await prisma.job.create({
    data: {
      clientId: cid,
      title: `F-22 fixture ${STAMP} ${owner}`,
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
      clientId: cid,
      freelancerId: fid,
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
  contractId = contract.id;
  milestoneId = contract.milestones[0].id;
  return contract;
}

beforeAll(async () => {
  await cleanup();
  clientId = (await makeUser("client", "CLIENT", 500000)).id;
  freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
  bothId = (await makeUser("both", "BOTH", 500000)).id;
});

afterAll(async () => {
  await cleanup();
});

function withdraw(userId: string) {
  return withdrawFromWallet({
    userId,
    amountMinor: 50000,
    provider: "TELEBIRR",
    // Must match the user on file or the TMS identity check holds it for
    // review, which would mask the assertion we care about.
    payoutAccountIdentifier: `+2519${String(30000000 + Math.abs(userId.charCodeAt(4)) * 100000 + (STAMP % 900))}`,
  });
}

describe("F-22 withdrawal is blocked by escrow exposure, not by role", () => {
  it("a BOTH user who is the CLIENT on an in-flight contract cannot withdraw", async () => {
    // The F-22 repro: role === "BOTH" used to skip the check entirely.
    await cleanup();
    bothId = (await makeUser("both", "BOTH", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    clientId = bothId;

    await makeContract("client", "ESCROW_HELD");

    const before = (
      await prisma.wallet.findUniqueOrThrow({ where: { userId: bothId } })
    ).balanceMinor;

    await expect(withdraw(bothId)).rejects.toBeInstanceOf(
      ActiveContractWithdrawalBlockedError,
    );

    const after = await prisma.wallet.findUniqueOrThrow({
      where: { userId: bothId },
    });
    expect(after.balanceMinor).toBe(before);
  });

  it("a plain CLIENT on an in-flight contract cannot withdraw", async () => {
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await makeContract("client", "SUBMITTED_FOR_REVIEW");

    await expect(withdraw(clientId)).rejects.toBeInstanceOf(
      ActiveContractWithdrawalBlockedError,
    );
  });

  it("the FREELANCER payee cannot withdraw mid-milestone either", async () => {
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await makeContract("client", "ESCROW_HELD");

    await expect(withdraw(freelancerId)).rejects.toBeInstanceOf(
      ActiveContractWithdrawalBlockedError,
    );
  });

  it("an open dispute blocks withdrawal for both parties", async () => {
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await makeContract("client", "DISPUTED");
    await prisma.dispute.create({
      data: {
        contractId,
        milestoneId,
        category: "QUALITY_ISSUE",
        stage: "STAGE_1_NEGOTIATION",
        raisedByUserId: clientId,
        description: "The delivered work does not meet the specification.",
      },
    });

    await expect(withdraw(clientId)).rejects.toBeInstanceOf(
      ActiveContractWithdrawalBlockedError,
    );
    await expect(withdraw(freelancerId)).rejects.toBeInstanceOf(
      ActiveContractWithdrawalBlockedError,
    );
  });

  it("a user with only settled contracts is not blocked by the escrow check", async () => {
    // Must get PAST the exposure check. It may still be refused later for an
    // unrelated reason (the mock provider path), so the assertion is that the
    // failure is not the exposure error.
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await makeContract("client", "RELEASED");

    try {
      await withdraw(clientId);
    } catch (err) {
      expect(err).not.toBeInstanceOf(ActiveContractWithdrawalBlockedError);
    }
    // Wallet must be intact regardless of how far it got.
    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: clientId },
    });
    expect(wallet.balanceMinor).toBeLessThanOrEqual(500000);
  });

  it("a user with no contracts at all is not blocked", async () => {
    await cleanup();
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;

    try {
      await withdraw(freelancerId);
    } catch (err) {
      expect(err).not.toBeInstanceOf(ActiveContractWithdrawalBlockedError);
    }
  });
});