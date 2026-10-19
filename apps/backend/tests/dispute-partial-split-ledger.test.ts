import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";
import { resolveDispute } from "../src/modules/disputes/dispute.service.js";
import {
  recordEscrowFundingLedger,
  recordDisputeRefundLedger,
  CHART_OF_ACCOUNTS,
  getUserAccountCode,
} from "../src/modules/finance/ledger.service.js";

/**
 * A partial split has to relieve the escrow pool for BOTH shares.
 *
 * PARTIAL_SPLIT sends the freelancer's share out through
 * releaseMilestoneFunds, which posts a journal debiting 2000-LIABILITY-ESCROW.
 * The client's share was a bare `tx.wallet.update({ increment })` — credited,
 * unjournalled, and the pool never debited for it.
 *
 * The consequence is not visible in any single balance. Both parties were paid
 * the right amounts and the milestone read PARTIAL_REFUND. But the funding
 * journal credited the pool with the whole milestone and only the freelancer's
 * portion was ever debited, so the pool permanently carried the client's share
 * as a liability the platform had already paid out. Aggregate over enough
 * partial splits and the books claim the platform still owes every client
 * their disputed money.
 *
 * The second half is the idempotency key. It ended in `-${Date.now()}`, which
 * made it unique per call by construction, so the dedupe could never fire and a
 * retried refund posted a second journal — double-counting the relief.
 */

const STAMP = Date.now();
const AMOUNT = 100_000; // ETB 1,000.00
const FREELANCER_SHARE = 40_000;
const CLIENT_SHARE = AMOUNT - FREELANCER_SHARE;

const ids = {
  clientId: "" as string,
  freelancerId: "" as string,
  contractId: "" as string,
  milestoneId: "" as string,
  disputeId: "" as string,
  staffId: "" as string,
};

function platformFeeFromClientMinor(): number {
  return Math.round(AMOUNT * env.PLATFORM_FEE_RATE_CLIENT);
}

async function ensureStaff(): Promise<string> {
  const email = `f-partial-staff-${STAMP}@test.et`;
  const existing = await prisma.user.findFirst({ where: { email }, select: { id: true } });
  if (existing) return existing.id;
  const created = await prisma.user.create({
    data: {
      email,
      phone: `+2519110${String(STAMP % 10000).padStart(5, "0")}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: "ADMIN",
    } as never,
    select: { id: true },
  });
  return created.id;
}

async function cleanup() {
  if (!ids.milestoneId) return;
  // Ledger first: entries reference the journal, journals reference the
  // milestone, and the per-user liability accounts reference nothing else.
  await prisma.ledgerEntry.deleteMany({
    where: { journal: { referenceId: ids.milestoneId } },
  });
  await prisma.ledgerJournal.deleteMany({ where: { referenceId: ids.milestoneId } });
  await prisma.auditLog.deleteMany({ where: { entityId: ids.disputeId } });

  const userIds = [ids.clientId, ids.freelancerId].filter(Boolean);
  await prisma.$transaction([
    prisma.disputeEvidence.deleteMany({ where: { disputeId: ids.disputeId } }),
    prisma.dispute.deleteMany({ where: { id: ids.disputeId } }),
    prisma.milestone.deleteMany({ where: { contractId: ids.contractId } }),
    prisma.contract.deleteMany({ where: { id: ids.contractId } }),
    prisma.job.deleteMany({ where: { clientId: { in: userIds } } }),
  ]);
  await prisma.ledgerAccount.deleteMany({
    where: { code: { in: userIds.map(getUserAccountCode) } },
  });
  await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });

  Object.assign(ids, {
    clientId: "",
    freelancerId: "",
    contractId: "",
    milestoneId: "",
    disputeId: "",
  });
}

async function makeUser(label: string, role: "CLIENT" | "FREELANCER") {
  return prisma.user.create({
    data: {
      email: `f-partial-${label}-${STAMP}@test.et`,
      phone: `+2519${String(60000000 + Math.abs(label.charCodeAt(0)) * 100000 + (STAMP % 900))}`,
      passwordHash: "not-a-real-hash",
      role,
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    include: { wallet: true },
  });
}

/** Funded contract, one milestone in DISPUTED, dispute at mediation. */
async function seed() {
  await cleanup();
  const client = await makeUser("client", "CLIENT");
  const freelancer = await makeUser("freelancer", "FREELANCER");
  ids.clientId = client.id;
  ids.freelancerId = freelancer.id;

  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      title: `Partial split fixture ${STAMP}`,
      category: "WEB_APP_DEVELOPMENT",
      description: "A description comfortably longer than the twenty character minimum.",
      budgetMinMinor: AMOUNT,
      budgetMaxMinor: AMOUNT,
      deadline: new Date(Date.now() + 86_400_000 * 30),
      proposedMilestones: [],
    },
  });

  const contract = await prisma.contract.create({
    data: {
      jobId: job.id,
      clientId: client.id,
      freelancerId: freelancer.id,
      templateVersion: "test",
      documentStoragePath: "test/doc.pdf",
      clientAcceptedAt: new Date(),
      freelancerAcceptedAt: new Date(),
      milestones: {
        create: {
          title: "One milestone",
          amountMinor: AMOUNT,
          dueDate: new Date(Date.now() + 86_400_000 * 30),
          escrowState: "DISPUTED",
        },
      },
    },
    include: { milestones: true },
  });
  ids.contractId = contract.id;
  ids.milestoneId = contract.milestones[0].id;

  // Post the funding journal so the pool actually holds this money. Without it
  // the conservation assertion below has nothing to conserve.
  await prisma.$transaction(async (tx) => {
    await recordEscrowFundingLedger(tx, {
      clientId: client.id,
      milestoneId: ids.milestoneId,
      totalChargedMinor: AMOUNT + platformFeeFromClientMinor(),
      milestoneGrossMinor: AMOUNT,
      platformFeeFromClientMinor: platformFeeFromClientMinor(),
    });
  });

  const dispute = await prisma.dispute.create({
    data: {
      contractId: contract.id,
      milestoneId: ids.milestoneId,
      category: "QUALITY_ISSUE",
      stage: "STAGE_3_MEDIATION",
      raisedByUserId: client.id,
      description: "The delivered work does not meet the agreed specification.",
    },
  });
  ids.disputeId = dispute.id;

  return { client, freelancer };
}

/**
 * Escrow-pool movement attributable to THIS milestone.
 *
 * Scoped to the milestone's own journals rather than read off the shared pool
 * account, so a test file running in parallel cannot make this flaky.
 * Sign convention: credit - debit for a liability, so a fully settled
 * milestone nets to zero.
 */
async function poolMovementForMilestone(): Promise<number> {
  const entries = await prisma.ledgerEntry.findMany({
    where: {
      journal: { referenceId: ids.milestoneId },
      account: { code: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.code },
    },
    select: { debitMinor: true, creditMinor: true },
  });
  return entries.reduce((sum, e) => sum + e.creditMinor - e.debitMinor, 0);
}

async function journalsForMilestone() {
  return prisma.ledgerJournal.findMany({
    where: { referenceId: ids.milestoneId },
    select: { id: true, idempotencyKey: true, referenceType: true },
  });
}

async function walletBalances() {
  const [c, f] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { userId: ids.clientId } }),
    prisma.wallet.findUniqueOrThrow({ where: { userId: ids.freelancerId } }),
  ]);
  return { client: c.balanceMinor, freelancer: f.balanceMinor };
}

beforeEach(async () => {
  ids.staffId = await ensureStaff();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("PARTIAL_SPLIT pays both parties and relieves the pool for both", () => {
  it("nets the escrow pool to zero for the milestone", async () => {
    await seed();

    expect(
      await poolMovementForMilestone(),
      "funding credits the pool for the whole milestone",
    ).toBe(AMOUNT);

    await resolveDispute({
      staffUserId: ids.staffId,
      disputeId: ids.disputeId,
      outcome: "PARTIAL_SPLIT",
      freelancerShareMinor: FREELANCER_SHARE,
      recommendation: "Partial delivery; the remainder is not payable.",
    });

    // Both parties were paid — this already worked.
    const balances = await walletBalances();
    const feeMinor = Math.round(FREELANCER_SHARE * env.PLATFORM_FEE_RATE_FREELANCER);
    expect(balances.client).toBe(CLIENT_SHARE);
    expect(balances.freelancer).toBe(FREELANCER_SHARE - feeMinor);

    // And the pool is relieved for the WHOLE milestone, not just the
    // freelancer's share. Before the fix this read FREELANCER_SHARE: the
    // client's portion was credited and never debited from the pool.
    expect(
      await poolMovementForMilestone(),
      "a settled milestone must leave nothing behind in the escrow pool",
    ).toBe(0);
  });

  it("posts a refund journal for the client's share", async () => {
    await seed();

    await resolveDispute({
      staffUserId: ids.staffId,
      disputeId: ids.disputeId,
      outcome: "PARTIAL_SPLIT",
      freelancerShareMinor: FREELANCER_SHARE,
      recommendation: "Partial delivery; the remainder is not payable.",
    });

    const journals = await journalsForMilestone();
    const refund = journals.find((j) => j.referenceType === "DISPUTE_REFUND");
    expect(refund, "the client's share must leave a journal behind").toBeTruthy();

    // Exact amounts, not merely "a journal exists".
    const lines = await prisma.ledgerEntry.findMany({
      where: { journalId: refund!.id },
      include: { account: { select: { code: true } } },
    });
    const pool = lines.find((l) => l.account.code === CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.code);
    const client = lines.find((l) => l.account.code === getUserAccountCode(ids.clientId));

    expect(pool?.debitMinor).toBe(CLIENT_SHARE);
    expect(pool?.creditMinor).toBe(0);
    expect(client?.creditMinor).toBe(CLIENT_SHARE);
    expect(client?.debitMinor).toBe(0);
  });

  it("posts exactly one refund journal, not one per call", async () => {
    await seed();

    await resolveDispute({
      staffUserId: ids.staffId,
      disputeId: ids.disputeId,
      outcome: "PARTIAL_SPLIT",
      freelancerShareMinor: FREELANCER_SHARE,
      recommendation: "Partial delivery; the remainder is not payable.",
    });

    const refundJournals = (await journalsForMilestone()).filter(
      (j) => j.referenceType === "DISPUTE_REFUND",
    );
    expect(refundJournals).toHaveLength(1);
  });
});

describe("the refund journal is idempotent", () => {
  it("does not post twice for the same milestone", async () => {
    // Direct, because the service-level path can only legitimately refund once
    // (the escrow-state claim stops a second caller before it gets here), so
    // the dedupe cannot be exercised through resolveDispute. Calling the
    // helper twice is the only way to reach the code the key guards.
    await seed();

    const before = await poolMovementForMilestone();

    await prisma.$transaction(async (tx) => {
      await recordDisputeRefundLedger(tx, {
        clientId: ids.clientId,
        milestoneId: ids.milestoneId,
        amountMinor: CLIENT_SHARE,
      });
      await recordDisputeRefundLedger(tx, {
        clientId: ids.clientId,
        milestoneId: ids.milestoneId,
        amountMinor: CLIENT_SHARE,
      });
    });

    const journals = await journalsForMilestone();
    expect(
      journals.filter((j) => j.referenceType === "DISPUTE_REFUND"),
      "a retried refund must not post a second journal",
    ).toHaveLength(1);

    // And the money moved once.
    expect(
      await poolMovementForMilestone(),
      "the pool must be relieved exactly once",
    ).toBe(before - CLIENT_SHARE);
  });

  it("uses a stable key, so the same milestone cannot be refunded twice", async () => {
    await seed();

    const keys = new Set<string>();
    for (let i = 0; i < 3; i++) {
      await prisma.$transaction(async (tx) => {
        const journal = await recordDisputeRefundLedger(tx, {
          clientId: ids.clientId,
          milestoneId: ids.milestoneId,
          amountMinor: CLIENT_SHARE,
        });
        keys.add(journal.idempotencyKey);
      });
    }

    // A key carrying a timestamp differs on every call, so the dedupe is dead
    // code and every retry posts. One key means the dedupe is live.
    expect(keys.size, "the idempotency key must not embed the call time").toBe(1);
    expect(
      await prisma.ledgerJournal.count({
        where: { referenceId: ids.milestoneId, referenceType: "DISPUTE_REFUND" },
      }),
    ).toBe(1);
  });
});