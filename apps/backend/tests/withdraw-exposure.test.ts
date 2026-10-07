import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  withdrawFromWallet,
  ActiveContractWithdrawalBlockedError,
} from "../src/modules/escrow/escrow.service.js";

/**
 * F-22 — escrow exposure is a fact about who you are on the contract, not a
 * role string.
 *
 * The "you are holding money for other people" checks lived inside
 * `if (user.role === "CLIENT")`. A BOTH account can hire, so it could accept a
 * contract, have it funded, and then withdraw that balance mid-milestone — the
 * exact thing the check exists to prevent.
 *
 * The fix gates on the *paying* side rather than the role string: only a user
 * who is the client on a contract with funded escrow is blocked. A freelancer
 * is the payee, and their available balance is their own earned money, so it
 * must remain withdrawable while contracts are live. A BOTH user is blocked
 * when they are acting as the client, and free to withdraw otherwise.
 *
 * These tests pin both directions so the guard can neither be bypassed by a
 * BOTH role nor over-applied to a freelancer.
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
  escrowState:
    | "ESCROW_HELD"
    | "SUBMITTED_FOR_REVIEW"
    | "RELEASED"
    | "REFUNDED"
    | "PAYMENT_PENDING",
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

/**
 * Asserts the exposure guards did NOT fire.
 *
 * Only the error type is asserted. A permitted withdrawal may go on to fail at
 * the payment provider (the mock TMS destination is not reachable in tests), so
 * any non-exposure error is acceptable. The balance is deliberately NOT
 * asserted: a withdrawal that is correctly allowed is expected to debit the
 * wallet, so balance movement is not a signal of whether the guard fired.
 */
async function expectNotBlocked(userId: string, label: string) {
  let err: unknown = null;
  try {
    await withdraw(userId);
  } catch (e) {
    err = e;
  }

  expect(
    err,
    `${label}: must not be blocked by an escrow-exposure guard`,
  ).not.toBeInstanceOf(ActiveContractWithdrawalBlockedError);
}

describe("F-22 withdrawal is blocked by escrow exposure, not by role", () => {
  it("a BOTH user acting as CLIENT on an in-flight contract cannot withdraw", async () => {
    // The F-22 repro: `role === "CLIENT"` skipped the check, so a BOTH user
    // could hire, get funded, and withdraw the same balance mid-milestone.
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

  it("PAYMENT_PENDING does NOT block the client: no money is in escrow yet", async () => {
    // Pre-funding. The client has not paid, so nothing is at risk and a
    // cancellation would return nothing. Blocking here would trap money the
    // user never actually committed.
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await makeContract("client", "PAYMENT_PENDING");

    await expectNotBlocked(clientId, "CLIENT with an unfunded contract");
  });

  it("a FREELANCER can withdraw while contracts are live", async () => {
    // Their balance is earned money from other work. Being the payee on an
    // in-flight milestone must not trap it.
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await makeContract("client", "ESCROW_HELD");

    await expectNotBlocked(freelancerId, "FREELANCER payee");
  });

  it("a BOTH user with only freelancer-side contracts can withdraw", async () => {
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("both", "BOTH", 500000)).id;
    // bothId is the freelancer here; the contract's client is the other user.
    bothId = freelancerId;
    await makeContract("client", "ESCROW_HELD");

    await expectNotBlocked(bothId, "BOTH acting as freelancer");
  });

  it("an open dispute blocks the CLIENT but not the freelancer", async () => {
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    // Settle the milestone so the dispute rule — not the exposure rule — is
    // what blocks the client.
    await makeContract("client", "RELEASED");
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

    // Client holds the escrowed funds and the outcome decides whose they are.
    await expect(withdraw(clientId)).rejects.toBeInstanceOf(
      ActiveContractWithdrawalBlockedError,
    );
    // The freelancer's available balance is not affected by that dispute.
    await expectNotBlocked(freelancerId, "FREELANCER in a disputed contract");
  });

  it("a client with only settled contracts is not blocked by the escrow check", async () => {
    await cleanup();
    clientId = (await makeUser("client", "CLIENT", 500000)).id;
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await makeContract("client", "RELEASED");
    await expectNotBlocked(clientId, "CLIENT with a settled contract");
  });

  it("a user with no contracts at all is not blocked", async () => {
    await cleanup();
    freelancerId = (await makeUser("freelancer", "FREELANCER", 500000)).id;
    await expectNotBlocked(freelancerId, "no contracts");
  });
});