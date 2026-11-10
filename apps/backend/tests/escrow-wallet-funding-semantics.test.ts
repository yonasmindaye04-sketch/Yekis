import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import {
  fundMilestoneFromWallet,
  submitMilestone,
  acceptMilestone,
  releaseMilestoneFunds,
} from "../src/modules/escrow/escrow.service.js";
import { raiseDispute } from "../src/modules/disputes/dispute.service.js";
import { handleAutoReleaseJob } from "../src/queue/autoRelease.handler.js";
import { fundGigOrderFromWallet } from "../src/modules/gigs/gig.service.js";
import { calculateFees } from "../src/modules/escrow/fees.js";
import { env, AUTO_RELEASE_WINDOW_DAYS_DEFAULT } from "../src/config/env.js";

/**
 * ESC-003 -- the funding source must never change the lifecycle.
 *
 * Commit a03259a made `fundMilestoneFromWallet` credit the freelancer and set
 * the milestone to RELEASED inside the funding transaction. That turned the
 * default funding path into a straight payment: no delivery step, no client
 * acceptance, no 24h warning, no 7-day auto-release timer, and (because
 * `raiseDispute` only accepts ESCROW_HELD | WORK_IN_PROGRESS |
 * SUBMITTED_FOR_REVIEW) no way to dispute at all.
 *
 * Escrow is the platform's core legal mechanism -- Master Design 3A.13.6 and
 * Service Agreement Clause 2.2 both say the freelancer is paid on client
 * approval or after a 7-day deemed-acceptance window, never at funding time.
 * These tests pin that behaviour for every funding method.
 */

// Mock the queues so no BullMQ producer/consumer is created and the
// scheduled auto-release jobs can be inspected.
vi.mock("../src/queue/queues.js", () => ({
  autoReleaseQueue: {
    add: vi.fn().mockResolvedValue({ id: "job-1" }),
    remove: vi.fn().mockResolvedValue(true),
  },
  notificationQueue: {
    add: vi.fn().mockResolvedValue({ id: "notif-1" }),
    remove: vi.fn().mockResolvedValue(true),
  },
  kycRefreshQueue: { add: vi.fn().mockResolvedValue({ id: "kyc-1" }) },
  reviewRevealQueue: { add: vi.fn().mockResolvedValue({ id: "review-1" }) },
  featuredRefreshQueue: { add: vi.fn().mockResolvedValue({ id: "featured-1" }) },
  paymentReconcileQueue: { add: vi.fn().mockResolvedValue({ id: "pay-1" }) },
  tmsScanQueue: { add: vi.fn().mockResolvedValue({ id: "tms-1" }) },
  gigAutoReleaseQueue: {
    add: vi.fn().mockResolvedValue({ id: "gig-1" }),
    remove: vi.fn().mockResolvedValue(true),
  },
}));

// Object storage and PDF generation stay out of the way.
vi.mock("../src/lib/objectStore.js", () => ({
  uploadEvidenceBundle: vi.fn().mockResolvedValue("disputes/evidence-bundle-mock.json"),
  uploadKycDocument: vi.fn().mockResolvedValue("kyc/mock-doc.jpg"),
  uploadTopUpReceipt: vi.fn().mockResolvedValue("topup/mock-receipt.jpg"),
  getPresignedObjectUrl: vi.fn().mockResolvedValue("https://mock-s3.local/file"),
}));

vi.mock("../src/modules/contracts/contractStorage.js", () => ({
  uploadContractDocument: vi.fn().mockResolvedValue("contracts/test-contract-mock.pdf"),
  getContractDocumentUrl: vi.fn().mockResolvedValue("https://mock-s3.local/contract.pdf"),
}));

const { autoReleaseQueue, notificationQueue } = await import(
  "../src/queue/queues.js"
);

const STAMP = Date.now();
const M = 100_000; // ETB 1,000.00

let clientId: string;
let freelancerId: string;
const contractIds: string[] = [];
const milestoneIds: string[] = [];
const jobIds: string[] = [];
const extraUserIds: string[] = [];

async function makeUser(label: string, role: "CLIENT" | "FREELANCER", balance: number) {
  return prisma.user.create({
    data: {
      email: `esc003-${label}-${STAMP}-${Math.floor(Math.random() * 1e6)}@test.et`,
      phone: `+2519${String(70000000 + Math.abs(label.charCodeAt(0)) * 100000 + (STAMP % 900))}`,
      passwordHash: "not-a-real-hash",
      role,
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: balance } },
    } as never,
    include: { wallet: true },
  });
}

/** A fully executed contract with one milestone in the given escrow state. */
async function makeContract(escrowState: string, amountMinor = M, ownerClientId = clientId) {
  const job = await prisma.job.create({
    data: {
      clientId: ownerClientId,
      title: `esc003 fixture ${STAMP}`,
      category: "WEB_APP_DEVELOPMENT",
      description: "A description long enough to satisfy the schema minimum length.",
      budgetMinMinor: amountMinor,
      budgetMaxMinor: amountMinor,
      deadline: new Date(Date.now() + 86400000 * 30),
      proposedMilestones: [],
    },
  });
  const contract = await prisma.contract.create({
    data: {
      jobId: job.id,
      clientId: ownerClientId,
      freelancerId,
      templateVersion: "test",
      documentStoragePath: "test/doc.pdf",
      clientAcceptedAt: new Date(),
      freelancerAcceptedAt: new Date(),
      milestones: {
        create: {
          title: "M1",
          amountMinor,
          dueDate: new Date(Date.now() + 86400000 * 30),
          escrowState,
        },
      },
    },
    include: { milestones: true },
  });
  contractIds.push(contract.id);
  milestoneIds.push(contract.milestones[0].id);
  jobIds.push(job.id);
  return contract.milestones[0];
}

async function cleanup() {
  const users = [clientId, freelancerId, ...extraUserIds].filter(Boolean);
  if (!users.length) return;
  const userFilter = { in: users };
  const ids = contractIds.length ? contractIds : ["__none__"];
  const childFilter = { contractId: { in: ids } };
  const contractFilter = { id: { in: ids } };
  const milestoneFilter = { in: milestoneIds.length ? milestoneIds : ["__none__"] };

  await prisma.auditLog.deleteMany({ where: { userId: userFilter } });
  await prisma.transactionFlag.deleteMany({ where: { userId: userFilter } });
  await prisma.payoutTransaction.deleteMany({ where: { userId: userFilter } });
  await prisma.notification.deleteMany({ where: { userId: userFilter } });
  await prisma.platformFeeCredit.deleteMany({ where: { milestoneId: milestoneFilter } });
  // Scope the ledger cleanup to THIS file's milestones. A pattern like
  // `contains: "escrow-fund-"` would also delete the journals of suites
  // running in parallel against the same database, and the escrow pool
  // assertions of those suites would then read a pool that was never
  // funded.
  await prisma.ledgerEntry.deleteMany({
    where: { journal: { referenceId: milestoneFilter } },
  });
  await prisma.ledgerJournal.deleteMany({
    where: { referenceId: milestoneFilter },
  });
  await prisma.review.deleteMany({ where: childFilter });
  await prisma.disputeEvidence.deleteMany({ where: { dispute: childFilter } });
  await prisma.dispute.deleteMany({ where: childFilter });
  await prisma.milestone.deleteMany({ where: childFilter });
  await prisma.contract.deleteMany({ where: contractFilter });
  await prisma.job.deleteMany({ where: { id: { in: jobIds.length ? jobIds : ["__none__"] } } });
  await prisma.wallet.deleteMany({ where: { userId: userFilter } });
  await prisma.kycRecord.deleteMany({ where: { userId: userFilter } });
  await prisma.user.deleteMany({ where: { id: userFilter } });
}

beforeAll(async () => {
  await cleanup();
  clientId = (await makeUser("client", "CLIENT", 10_000_000)).id;
  freelancerId = (await makeUser("freelancer", "FREELANCER", 0)).id;
});

afterAll(async () => {
  await cleanup();
});

beforeEach(() => {
  vi.mocked(autoReleaseQueue.add).mockClear();
  vi.mocked(autoReleaseQueue.remove).mockClear();
  vi.mocked(notificationQueue.add).mockClear();
});

async function clientBalance() {
  const w = await prisma.wallet.findUniqueOrThrow({ where: { userId: clientId } });
  return w.balanceMinor;
}
async function freelancerBalance() {
  const w = await prisma.wallet.findUniqueOrThrow({ where: { userId: freelancerId } });
  return w.balanceMinor;
}
async function milestoneState(id: string) {
  return (await prisma.milestone.findUniqueOrThrow({ where: { id } })).escrowState;
}

describe("ESC-003: wallet funding places the milestone in escrow, it does not pay out", () => {
  it("ends a wallet-funded milestone in ESCROW_HELD and does not credit the freelancer", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");

    const before = await freelancerBalance();
    const clientBefore = await clientBalance();
    const expectedCharge = calculateFees({
      milestoneAmountMinor: M,
      freelancerHasTin: false,
    }).clientTotalChargeMinor;

    const funded = await fundMilestoneFromWallet({
      clientId,
      milestoneId: milestone.id,
    });

    expect(funded.escrowState).toBe("ESCROW_HELD");
    expect(funded.releasedAt).toBeNull();

    // The client's money moved into escrow...
    expect(await clientBalance()).toBe(clientBefore - expectedCharge);
    // ...and the freelancer has NOT been paid.
    expect(await freelancerBalance()).toBe(before);
    expect(funded.amountMinor).toBe(M);
  });

  it("does not post a release journal at funding time", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    const releaseJournal = await prisma.ledgerJournal.findFirst({
      where: { idempotencyKey: `escrow-release-${milestone.id}` },
    });
    expect(releaseJournal).toBeNull();

    // The funding journal IS posted: client wallet -> escrow pool.
    const fundJournal = await prisma.ledgerJournal.findFirst({
      where: { idempotencyKey: `escrow-fund-${milestone.id}` },
    });
    expect(fundJournal).not.toBeNull();
    expect(fundJournal?.referenceType).toBe("ESCROW_FUND");
  });

  it("does not recognise platform earnings at funding time", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    const feeCredit = await prisma.platformFeeCredit.findFirst({
      where: { milestoneId: milestone.id },
    });
    expect(feeCredit).toBeNull();
  });

  it("records ESCROW_FUNDED_FROM_WALLET, not an immediate release", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    const audit = await prisma.auditLog.findFirst({
      where: { entityId: milestone.id, eventType: "ESCROW_FUNDED_FROM_WALLET" },
    });
    expect(audit).not.toBeNull();

    const released = await prisma.auditLog.findFirst({
      where: { entityId: milestone.id, eventType: "ESCROW_FUNDED_AND_RELEASED" },
    });
    expect(released).toBeNull();
  });
});

describe("ESC-003: a wallet-funded milestone runs the full escrow lifecycle", () => {
  it("goes submit -> accept -> RELEASED, and only then credits the freelancer", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    const before = await freelancerBalance();

    const submitted = await submitMilestone({
      freelancerId,
      milestoneId: milestone.id,
      deliverableUrl: "https://example.test/deliverable.pdf",
    });
    expect(submitted.escrowState).toBe("SUBMITTED_FOR_REVIEW");
    // Still unpaid while the client is reviewing.
    expect(await freelancerBalance()).toBe(before);

    const accepted = await acceptMilestone({ clientId, milestoneId: milestone.id });
    expect(accepted.escrowState).toBe("RELEASED");
    expect(accepted.releasedAt).not.toBeNull();

    const expectedNet = calculateFees({
      milestoneAmountMinor: M,
      freelancerHasTin: false,
    }).freelancerNetMinor;
    expect(await freelancerBalance()).toBe(before + expectedNet);
  });

  it("schedules the 24h warning and the 7-day auto-release on submission", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });
    await submitMilestone({ freelancerId, milestoneId: milestone.id });

    const adds = vi.mocked(autoReleaseQueue.add).mock.calls;
    const warn = adds.find((c) => c[1]?.kind === "warn");
    const release = adds.find((c) => c[1]?.kind === "release");

    expect(warn).toBeDefined();
    expect(release).toBeDefined();

    const DAY = 86_400_000;
    // The release timer sits AUTO_RELEASE_WINDOW_DAYS out; the warning sits
    // exactly 24 hours before it. The window itself is configurable, so the
    // assertion is relative to the configured value rather than a literal.
    const releaseDelay = release?.[2]?.delay as number;
    const warnDelay = warn?.[2]?.delay as number;
    expect(releaseDelay).toBeGreaterThan(DAY * (env.AUTO_RELEASE_WINDOW_DAYS - 1));
    expect(releaseDelay).toBeLessThanOrEqual(DAY * env.AUTO_RELEASE_WINDOW_DAYS);
    expect(releaseDelay - warnDelay).toBe(DAY);
  });

  it("auto-releases a wallet-funded milestone and credits the freelancer", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });
    await submitMilestone({ freelancerId, milestoneId: milestone.id });

    const before = await freelancerBalance();

    // The job the worker would run when the 7-day timer fires.
    await handleAutoReleaseJob({ data: { milestoneId: milestone.id, kind: "release" } });

    expect(await milestoneState(milestone.id)).toBe("RELEASED");
    const expectedNet = calculateFees({
      milestoneAmountMinor: M,
      freelancerHasTin: false,
    }).freelancerNetMinor;
    expect(await freelancerBalance()).toBe(before + expectedNet);
  });

  it("sends the 24h warning without releasing anything", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });
    await submitMilestone({ freelancerId, milestoneId: milestone.id });

    const before = await freelancerBalance();
    await handleAutoReleaseJob({ data: { milestoneId: milestone.id, kind: "warn" } });

    expect(await milestoneState(milestone.id)).toBe("SUBMITTED_FOR_REVIEW");
    expect(await freelancerBalance()).toBe(before);
    expect(
      vi
        .mocked(notificationQueue.add)
        .mock.calls.some((c) => c[0] === "auto-release-warning"),
    ).toBe(true);
  });

  it("lets the client dispute a wallet-funded milestone", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    const funded = await fundMilestoneFromWallet({
      clientId,
      milestoneId: milestone.id,
    });
    expect(funded.escrowState).toBe("ESCROW_HELD");

    const before = await freelancerBalance();

    const dispute = await raiseDispute({
      raisedByUserId: clientId,
      contractId: funded.contractId,
      milestoneId: milestone.id,
      category: "QUALITY_ISSUE",
      description: "The delivered work does not meet the agreed scope.",
    });

    expect(dispute.stage).toBe("STAGE_1_NEGOTIATION");
    expect(await milestoneState(milestone.id)).toBe("DISPUTED");
    // A dispute freezes the money: the freelancer is still not paid.
    expect(await freelancerBalance()).toBe(before);
  });

  it("lets the freelancer dispute a wallet-funded milestone", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    const funded = await fundMilestoneFromWallet({
      clientId,
      milestoneId: milestone.id,
    });

    const dispute = await raiseDispute({
      raisedByUserId: freelancerId,
      contractId: funded.contractId,
      milestoneId: milestone.id,
      category: "NON_PAYMENT",
      description: "The client has not responded to the delivery for weeks.",
    });

    expect(dispute.stage).toBe("STAGE_1_NEGOTIATION");
    expect(await milestoneState(milestone.id)).toBe("DISPUTED");
  });
});

describe("ESC-003: release is only reachable from an accepted, disputed, or submitted milestone", () => {
  it("refuses to release a milestone that was only funded", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });

    const before = await freelancerBalance();

    // releaseMilestoneFunds treats a lost claim as a benign no-op, so the
    // assertion is on the money and the state, not on a thrown error.
    await releaseMilestoneFunds(milestone.id, freelancerId, M);

    expect(await milestoneState(milestone.id)).toBe("ESCROW_HELD");
    expect(await freelancerBalance()).toBe(before);
  });

  it("refuses to release a milestone that is still in progress", async () => {
    const milestone = await makeContract("WORK_IN_PROGRESS");

    const before = await freelancerBalance();

    await releaseMilestoneFunds(milestone.id, freelancerId, M);

    expect(await milestoneState(milestone.id)).toBe("WORK_IN_PROGRESS");
    expect(await freelancerBalance()).toBe(before);
  });

  it("refuses to release a milestone that is still awaiting payment", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");

    const before = await freelancerBalance();

    await releaseMilestoneFunds(milestone.id, freelancerId, M);

    expect(await milestoneState(milestone.id)).toBe("PAYMENT_PENDING");
    expect(await freelancerBalance()).toBe(before);
  });

  it("does not credit the freelancer when the claim is lost", async () => {
    const milestone = await makeContract("SUBMITTED_FOR_REVIEW");

    const before = await freelancerBalance();

    // Two concurrent release paths: exactly one may win.
    const results = await Promise.allSettled([
      releaseMilestoneFunds(milestone.id, freelancerId, M),
      releaseMilestoneFunds(milestone.id, freelancerId, M),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBeGreaterThanOrEqual(1);

    const expectedNet = calculateFees({
      milestoneAmountMinor: M,
      freelancerHasTin: false,
    }).freelancerNetMinor;
    expect(await freelancerBalance()).toBe(before + expectedNet);
    expect(await milestoneState(milestone.id)).toBe("RELEASED");
  });
});

describe("ESC-003: wallet funding guards", () => {
  it("rejects an insufficient balance without touching the milestone", async () => {
    const poor = await makeUser("poor", "CLIENT", 0);
    // The contract must belong to the party that is short of money,
    // otherwise the party check rejects first and the balance check is
    // never reached.
    const milestone = await makeContract("PAYMENT_PENDING", M, poor.id);

    await expect(
      fundMilestoneFromWallet({ clientId: poor.id, milestoneId: milestone.id }),
    ).rejects.toThrow(/Insufficient wallet balance/);

    expect(await milestoneState(milestone.id)).toBe("PAYMENT_PENDING");
    expect(
      (await prisma.wallet.findUniqueOrThrow({ where: { userId: poor.id } })).balanceMinor,
    ).toBe(0);

    // The poor user and their contract are removed by cleanup() at the end of
    // the run, in the right order for the foreign keys.
    extraUserIds.push(poor.id);
  });

  it("refunds the client when a concurrent funding loses the race", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    const clientBefore = await clientBalance();
    const expectedCharge = calculateFees({
      milestoneAmountMinor: M,
      freelancerHasTin: false,
    }).clientTotalChargeMinor;

    // Two concurrent fundings of the SAME milestone. The milestone claim
    // (PAYMENT_PENDING -> ESCROW_HELD) admits exactly one.
    const results = await Promise.allSettled([
      fundMilestoneFromWallet({ clientId, milestoneId: milestone.id }),
      fundMilestoneFromWallet({ clientId, milestoneId: milestone.id }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled.length).toBe(1);

    // Exactly one charge, and the escrow pool holds it.
    expect(await clientBalance()).toBe(clientBefore - expectedCharge);
    expect(await milestoneState(milestone.id)).toBe("ESCROW_HELD");
  });

  it("is idempotent: a retry after success does not charge twice", async () => {
    const milestone = await makeContract("PAYMENT_PENDING");
    const clientBefore = await clientBalance();
    const expectedCharge = calculateFees({
      milestoneAmountMinor: M,
      freelancerHasTin: false,
    }).clientTotalChargeMinor;

    await fundMilestoneFromWallet({ clientId, milestoneId: milestone.id });
    await expect(
      fundMilestoneFromWallet({ clientId, milestoneId: milestone.id }),
    ).rejects.toThrow(/Cannot fund a milestone in state|no longer awaiting payment/);

    expect(await clientBalance()).toBe(clientBefore - expectedCharge);
    expect(await milestoneState(milestone.id)).toBe("ESCROW_HELD");
  });

  it("refuses to fund a milestone that is already funded", async () => {
    const milestone = await makeContract("ESCROW_HELD");
    const clientBefore = await clientBalance();

    await expect(
      fundMilestoneFromWallet({ clientId, milestoneId: milestone.id }),
    ).rejects.toThrow(/Cannot fund a milestone in state|no longer awaiting payment/);

    expect(await clientBalance()).toBe(clientBefore);
  });
});

describe("ESC-003: the gig funding path obeys the same rule", () => {
  it("funds a gig order into escrow instead of paying the freelancer", async () => {
    const gig = await prisma.gig.create({
      data: {
        freelancerId,
        title: `esc003 gig ${STAMP}`,
        category: "WEB_APP_DEVELOPMENT",
        description: "A gig description long enough to satisfy the schema minimum.",
        tags: [],
        requirements: [],
        mediaUrls: [],
        status: "ACTIVE",
      } as never,
    });
    const pkg = await prisma.gigPackage.create({
      data: {
        gigId: gig.id,
        tier: "BASIC",
        title: "Basic",
        description: "The basic package.",
        deliveryDays: 7,
        revisionsIncluded: 1,
        priceMinor: M,
      } as never,
    });
    const order = await prisma.gigOrder.create({
      data: {
        gigId: gig.id,
        packageId: pkg.id,
        clientId,
        status: "PENDING_PAYMENT",
        escrowState: "PAYMENT_PENDING",
        totalChargeMinor: M,
      } as never,
    });

    const before = await freelancerBalance();

    const funded = await fundGigOrderFromWallet({ clientId, orderId: order.id });

    expect(funded.escrowState).toBe("ESCROW_HELD");
    expect(funded.status).toBe("ESCROW_HELD");
    expect(funded.releasedAt).toBeNull();
    expect(await freelancerBalance()).toBe(before);

    await prisma.gigOrder.deleteMany({ where: { id: order.id } });
    await prisma.gigPackage.deleteMany({ where: { id: pkg.id } });
    await prisma.gig.deleteMany({ where: { id: gig.id } });
  });
});

describe("ESC-003: the auto-release window", () => {
  it("defaults to the seven calendar days in Service Agreement Clause 2.2(b)", () => {
    expect(AUTO_RELEASE_WINDOW_DAYS_DEFAULT).toBe(7);
  });
});
