import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { readFileSync } from "node:fs";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";
import {
  resolveDispute,
  escalateToArbitration,
  applyArbitrationAward,
  DisputeNotFoundError,
  InvalidDisputeStageError,
  DisputeAlreadyResolvedError,
} from "../src/modules/disputes/dispute.service.js";

/**
 * F-04 / F-05 — a dispute resolves exactly once.
 *
 * Two defects, one cause: nothing claimed the dispute before money moved.
 *
 *   1. `escalateToArbitration` accepted a RESOLVED dispute, so a settled case
 *      could be pushed back to arbitration and an award applied on top of a
 *      resolution that had already paid someone. `applyArbitrationAward` also
 *      rewound the stage, letting `resolveDispute` run its money movement a
 *      second time.
 *
 *   2. `resolveDispute` had no claim of its own: two concurrent resolutions
 *      both passed the stage check and both moved money.
 *
 * And the refund path had no escrow-state guard, so a REFUND_TO_CLIENT award
 * could credit a wallet for a milestone already RELEASED.
 */

const STAMP = Date.now();
const ids: { clientId?: string; freelancerId?: string; contractId?: string; milestoneId?: string; disputeId?: string } = {};

/**
 * A real staff user, because resolveDispute writes an AuditLog row keyed to
 * staffUserId — a fabricated string violates the AuditLog_userId FK.
 */
const STAFF = { id: "" as string, role: "ADMIN" as const };

/**
 * What the platform takes from the freelancer side of a release. Read from the
 * real config rather than hard-coded so the conservation assertions below do not
 * drift if the rate changes.
 */
function PLATFORM_FEE_MINOR(grossMinor: number): number {
  return Math.round(grossMinor * env.PLATFORM_FEE_RATE_FREELANCER);
}

async function ensureStaff(): Promise<void> {
  const existing = await prisma.user.findFirst({
    where: { email: "f04-staff@test.et" },
    select: { id: true },
  });
  if (existing) {
    STAFF.id = existing.id;
    return;
  }
  const created = await prisma.user.create({
    data: {
      email: "f04-staff@test.et",
      phone: "+251911000099",
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: "ADMIN",
    } as never,
    select: { id: true },
  });
  STAFF.id = created.id;
}

async function cleanup() {
  if (!ids.contractId && !ids.clientId) return;
  const userIds = [ids.clientId, ids.freelancerId].filter(Boolean) as string[];
  // Journal-first: ledger rows reference the milestone, milestones the
  // contract, the contract the job, and the job the client.
  await prisma.ledgerEntry.deleteMany({
    where: { journal: { referenceId: ids.milestoneId } },
  });
  await prisma.ledgerJournal.deleteMany({
    where: { referenceId: ids.milestoneId },
  });
  await prisma.auditLog.deleteMany({ where: { entityId: ids.disputeId } });
  await prisma.$transaction([
    prisma.disputeEvidence.deleteMany({ where: { disputeId: ids.disputeId } }),
    prisma.dispute.deleteMany({ where: { id: ids.disputeId } }),
    prisma.paymentTransaction.deleteMany({
      where: { milestone: { contractId: ids.contractId } },
    }),
    prisma.milestone.deleteMany({ where: { contractId: ids.contractId } }),
    prisma.contract.deleteMany({ where: { id: ids.contractId } }),
    prisma.job.deleteMany({ where: { clientId: { in: userIds } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: userIds } } }),
    prisma.user.deleteMany({ where: { id: { in: userIds } } }),
  ]);
}

async function makeUser(label: string, role: "CLIENT" | "FREELANCER") {
  return prisma.user.create({
    data: {
      email: `f04-${label}-${STAMP}@test.et`,
      phone: `+2519${String(10000000 + Math.abs(label.charCodeAt(0)) * 100000 + (STAMP % 1000))}`,
      passwordHash: "not-a-real-hash",
      role,
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    include: { wallet: true },
  });
}

/**
 * Creates a funded contract with one milestone in DISPUTED and a dispute at the
 * given stage. Returns the ids plus both wallet balances for assertions.
 */
async function seed(stage: "STAGE_3_MEDIATION" | "STAGE_4_ARBITRATION" | "RESOLVED") {
  await cleanup();
  const client = await makeUser("client", "CLIENT");
  const freelancer = await makeUser("freelancer", "FREELANCER");
  ids.clientId = client.id;
  ids.freelancerId = freelancer.id;

  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      title: `F-04 fixture job ${STAMP}`,
      category: "WEB_APP_DEVELOPMENT",
      description: "A description comfortably longer than the twenty character minimum.",
      budgetMinMinor: 100000,
      budgetMaxMinor: 100000,
      deadline: new Date(Date.now() + 86400000 * 30),
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
          amountMinor: 100000,
          dueDate: new Date(Date.now() + 86400000 * 30),
          escrowState: "DISPUTED",
        },
      },
    },
    include: { milestones: true },
  });
  ids.contractId = contract.id;
  ids.milestoneId = contract.milestones[0].id;

  const dispute = await prisma.dispute.create({
    data: {
      contractId: contract.id,
      milestoneId: ids.milestoneId,
      category: "QUALITY_ISSUE",
      stage,
      raisedByUserId: client.id,
      description: "The delivered work does not meet the agreed specification.",
      ...(stage === "RESOLVED"
        ? { resolvedAt: new Date(), resolutionOutcome: "RELEASE_TO_FREELANCER" as const }
        : {}),
    },
  });
  ids.disputeId = dispute.id;

  return {
    client,
    freelancer,
    milestoneId: ids.milestoneId,
    disputeId: dispute.id,
  };
}

async function walletBalances() {
  const [c, f] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { userId: ids.clientId! } }),
    prisma.wallet.findUniqueOrThrow({ where: { userId: ids.freelancerId! } }),
  ]);
  return { client: c.balanceMinor, freelancer: f.balanceMinor };
}

afterAll(async () => {
  await cleanup();
});

beforeEach(async () => {
  await ensureStaff();
});

describe("F-04 a dispute can only be resolved once", () => {
  it("two concurrent resolutions: exactly one moves money", async () => {
    const { disputeId } = await seed("STAGE_3_MEDIATION");
    const before = await walletBalances();

    const results = await Promise.allSettled([
      resolveDispute({
        staffUserId: STAFF.id,
        disputeId,
        outcome: "RELEASE_TO_FREELANCER",
        recommendation: "The work substantially meets the brief.",
      }),
      resolveDispute({
        staffUserId: STAFF.id,
        disputeId,
        outcome: "REFUND_TO_CLIENT",
        recommendation: "The work does not meet the brief.",
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    // The losing caller must be told, not silently succeed.
    expect(fulfilled.length).toBe(1);
    const rejected = results.find((r) => r.status === "rejected");
    expect(rejected).toBeDefined();
    expect((rejected as PromiseRejectedResult).reason).toBeInstanceOf(
      DisputeAlreadyResolvedError,
    );

    const milestone = await prisma.milestone.findUniqueOrThrow({
      where: { id: ids.milestoneId! },
    });

    // Money conservation. A refund returns the full amount to the client; a
    // release pays the freelancer net of the platform fee. Either way the
    // escrow leaves the platform exactly once, in full.
    const after = await walletBalances();
    const movedToClient = after.client - before.client;
    const movedToFreelancer = after.freelancer - before.freelancer;
    if (milestone.escrowState === "REFUNDED") {
      expect(movedToClient).toBe(100000);
      expect(movedToFreelancer).toBe(0);
    } else {
      expect(movedToFreelancer + PLATFORM_FEE_MINOR(100000)).toBe(100000);
      expect(movedToClient).toBe(0);
    }
  });

  it("a second, sequential resolution is refused", async () => {
    const { disputeId } = await seed("STAGE_3_MEDIATION");
    const before = await walletBalances();

    await resolveDispute({
      staffUserId: STAFF.id,
      disputeId,
      outcome: "RELEASE_TO_FREELANCER",
      recommendation: "Accepted.",
    });
    const mid = await walletBalances();

    // After resolution the stage is RESOLVED, so the pre-existing stage guard
    // catches this before the claim is even reached. The assertion that matters
    // is the money: nothing is paid twice.
    await expect(
      resolveDispute({
        staffUserId: STAFF.id,
        disputeId,
        outcome: "REFUND_TO_CLIENT",
        recommendation: "Changed my mind.",
      }),
    ).rejects.toBeTruthy();

    const after = await walletBalances();
    expect(after).toEqual(mid);
    // The release happened exactly once: freelancer net + platform fee.
    expect(after.freelancer - before.freelancer + PLATFORM_FEE_MINOR(100000)).toBe(100000);
    expect(after.client - before.client).toBe(0);
  });

  it("a RESOLVED dispute cannot be escalated to arbitration", async () => {
    // The step that made double payment possible.
    const { disputeId } = await seed("RESOLVED");
    await expect(
      escalateToArbitration({ userId: ids.clientId!, disputeId }),
    ).rejects.toBeInstanceOf(InvalidDisputeStageError);
  });

  it("resolve then arbitration-award pays nobody a second time", async () => {
    const { disputeId } = await seed("STAGE_3_MEDIATION");
    const before = await walletBalances();

    await resolveDispute({
      staffUserId: STAFF.id,
      disputeId,
      outcome: "REFUND_TO_CLIENT",
      recommendation: "Refunded in full.",
    });
    const afterResolve = await walletBalances();

    // F-04: the re-escalation step that made the double payment possible is
    // now refused outright.
    await expect(
      escalateToArbitration({ userId: ids.clientId!, disputeId }),
    ).rejects.toBeInstanceOf(InvalidDisputeStageError);

    // And if a stale page still holds the dispute in STAGE_4 (e.g. the award
    // button was clicked from a cached view), the award itself is refused too.
    await prisma.dispute.update({
      where: { id: disputeId },
      data: { stage: "STAGE_4_ARBITRATION" },
    });
    await expect(
      applyArbitrationAward({
        staffUserId: STAFF.id,
        disputeId,
        awardReferenceNumber: "AACCSA-F04-1",
        outcome: "RELEASE_TO_FREELANCER",
        recommendation: "Arbitrator awards the work to the freelancer.",
      }),
    ).rejects.toBeInstanceOf(DisputeAlreadyResolvedError);

    const after = await walletBalances();
    expect(after).toEqual(afterResolve);
    expect(after.client - before.client).toBe(100000);
    expect(after.freelancer - before.freelancer).toBe(0);
  });
});

describe("F-04 the refund path cannot credit an already-settled milestone", () => {
  it("a REFUND_TO_CLIENT award after a RELEASE changes nothing", async () => {
    // Force the illegal ordering: milestone already RELEASED, dispute still at
    // stage 3 so the resolver would otherwise accept it.
    const { disputeId, milestoneId } = await seed("STAGE_3_MEDIATION");
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { escrowState: "RELEASED", releasedAt: new Date() },
    });
    const before = await walletBalances();

    await expect(
      resolveDispute({
        staffUserId: STAFF.id,
        disputeId,
        outcome: "REFUND_TO_CLIENT",
        recommendation: "Refund.",
      }),
    ).rejects.toBeTruthy();

    const after = await walletBalances();
    expect(after).toEqual(before);
  });
});

describe("F-05 a PARTIAL_SPLIT award must carry a usable share", () => {
  it("the shared schema requires the share, and the local copy is gone", async () => {
    const { ArbitrationAwardInput } = await import("@marketplace/schemas");

    // Missing share is rejected at the edge.
    const missing = ArbitrationAwardInput.safeParse({
      awardReferenceNumber: "AACCSA-1",
      outcome: "PARTIAL_SPLIT",
      recommendation: "Split the difference between the parties.",
    });
    expect(missing.success).toBe(false);

    // A negative or fractional share is rejected.
    for (const bad of [-1, 12.5]) {
      const r = ArbitrationAwardInput.safeParse({
        awardReferenceNumber: "AACCSA-1",
        outcome: "PARTIAL_SPLIT",
        recommendation: "Split the difference between the parties.",
        freelancerShareMinor: bad,
      });
      expect(r.success, `share ${bad} should be rejected`).toBe(false);
    }

    // A valid one passes, and the other outcomes do not require a share.
    expect(
      ArbitrationAwardInput.safeParse({
        awardReferenceNumber: "AACCSA-1",
        outcome: "PARTIAL_SPLIT",
        recommendation: "Split the difference between the parties.",
        freelancerShareMinor: 40000,
      }).success,
    ).toBe(true);
    expect(
      ArbitrationAwardInput.safeParse({
        awardReferenceNumber: "AACCSA-1",
        outcome: "RELEASE_TO_FREELANCER",
        recommendation: "Award to the freelancer outright.",
      }).success,
    ).toBe(true);

    // The route must be using the shared definition, not a private copy.
    const src = readFileSync(
      new URL("../src/modules/disputes/dispute.routes.ts", import.meta.url),
      "utf8",
    );
    expect(src).toContain("ArbitrationAwardInput,");
    expect(src).not.toMatch(/const ArbitrationAwardInput\s*=\s*z\.object/);
  });

  it("a share-less PARTIAL_SPLIT is refused and pays nobody", async () => {
    const { disputeId } = await seed("STAGE_3_MEDIATION");
    const before = await walletBalances();

    await expect(
      resolveDispute({
        staffUserId: STAFF.id,
        disputeId,
        outcome: "PARTIAL_SPLIT",
        recommendation: "Split it somehow.",
        // freelancerShareMinor omitted — the F-05 payload.
      } as never),
    ).rejects.toBeTruthy();

    const after = await walletBalances();
    expect(after).toEqual(before);

    // And the dispute is still open, so a corrected award can be applied.
    const dispute = await prisma.dispute.findUniqueOrThrow({
      where: { id: disputeId },
    });
    expect(dispute.stage).toBe("STAGE_3_MEDIATION");
    expect(dispute.resolvedAt).toBeNull();
  });

  it("an over-amount share is refused and pays nobody", async () => {
    const { disputeId } = await seed("STAGE_3_MEDIATION");
    const before = await walletBalances();

    await expect(
      resolveDispute({
        staffUserId: STAFF.id,
        disputeId,
        outcome: "PARTIAL_SPLIT",
        recommendation: "Give the freelancer more than is in escrow.",
        freelancerShareMinor: 999999,
      }),
    ).rejects.toBeTruthy();

    expect(await walletBalances()).toEqual(before);
    const dispute = await prisma.dispute.findUniqueOrThrow({
      where: { id: disputeId },
    });
    expect(dispute.stage).toBe("STAGE_3_MEDIATION");
    expect(dispute.resolvedAt).toBeNull();
  });

  it("a valid PARTIAL_SPLIT pays both sides and conserves the total", async () => {
    const { disputeId } = await seed("STAGE_3_MEDIATION");
    const before = await walletBalances();

    await resolveDispute({
      staffUserId: STAFF.id,
      disputeId,
      outcome: "PARTIAL_SPLIT",
      recommendation: "Split the difference equally.",
      freelancerShareMinor: 50000,
    });

    const after = await walletBalances();
    // 50000 to the freelancer less the 5% platform fee; 50000 to the client.
    expect(after.freelancer - before.freelancer).toBe(47500);
    expect(after.client - before.client).toBe(50000);

    const milestone = await prisma.milestone.findUniqueOrThrow({
      where: { id: ids.milestoneId! },
    });
    expect(milestone.escrowState).toBe("PARTIAL_REFUND");
  });
});

describe("F-04 the normal arbitration path still works", () => {
  it("stage 3 -> 4 -> award moves money once", async () => {
    const { disputeId } = await seed("STAGE_3_MEDIATION");
    const before = await walletBalances();

    await escalateToArbitration({ userId: ids.clientId!, disputeId });
    const escalated = await prisma.dispute.findUniqueOrThrow({
      where: { id: disputeId },
    });
    expect(escalated.stage).toBe("STAGE_4_ARBITRATION");

    await applyArbitrationAward({
      staffUserId: STAFF.id,
      disputeId,
      awardReferenceNumber: "AACCSA-F04-2",
      outcome: "RELEASE_TO_FREELANCER",
      recommendation: "Award to the freelancer.",
    });

    const after = await walletBalances();
    // Net of the freelancer's 5% platform fee; withholding is 0 because this
    // amount is under the ETB 10,000 threshold and the fixture freelancer has
    // no TIN. Conservation is what matters: the whole escrow left the platform
    // and landed in exactly one wallet.
    expect(after.freelancer - before.freelancer).toBe(95000);
    expect(after.client - before.client).toBe(0);
    const paidOut =
      after.freelancer -
      before.freelancer +
      (after.client - before.client) +
      PLATFORM_FEE_MINOR(100000);
    expect(paidOut).toBe(100000);

    const final = await prisma.dispute.findUniqueOrThrow({ where: { id: disputeId } });
    expect(final.stage).toBe("RESOLVED");
    expect(final.awardReferenceNumber).toBe("AACCSA-F04-2");

    const milestone = await prisma.milestone.findUniqueOrThrow({
      where: { id: ids.milestoneId! },
    });
    expect(milestone.escrowState).toBe("RELEASED");
  });

  it("a nonexistent dispute still raises DisputeNotFoundError", async () => {
    await expect(
      resolveDispute({
        staffUserId: STAFF.id,
        disputeId: "cm0000000000000000000000e",
        outcome: "RELEASE_TO_FREELANCER",
        recommendation: "n/a",
      }),
    ).rejects.toBeInstanceOf(DisputeNotFoundError);
  });
});