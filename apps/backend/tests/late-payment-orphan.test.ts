import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { handlePaymentWebhook } from "../src/modules/escrow/escrow.service.js";

/**
 * A payment that succeeds after the milestone stopped being fundable must not
 * be parked in escrow.
 *
 * handlePaymentWebhook flipped the milestone to ESCROW_HELD with an
 * unconditional update — no escrowState predicate and no contract-status
 * predicate. The concrete case: a client cancels during the cooling-off window,
 * which marks the contract CANCELLED and deliberately LEAVES the milestone in
 * PAYMENT_PENDING. The payment they had already started at the provider then
 * succeeds. The old code locked the money in escrow on a cancelled contract,
 * where no accept, no dispute and no refund path can ever reach it. The client
 * paid, the work was cancelled, and the money is held with no route out.
 *
 * The escrowState predicate alone does NOT fix this, because cooling-off
 * cancellation leaves the milestone in PAYMENT_PENDING. The contract predicate
 * is the one that actually stops it. Both are needed, and the tests below cover
 * each independently so neither can be dropped silently.
 *
 * When the money cannot be placed it is neither silently swallowed nor
 * auto-refunded: the transaction still records SUCCESS (the payment is real),
 * and a staff flag plus a staff alert are raised so a human returns it.
 */

const STAMP = Date.now();
const AMOUNT = 150_000;

let clientId = "";
let freelancerId = "";
let contractId = "";
let milestoneId = "";
let paymentId = "";

async function cleanup() {
  const ids = [clientId, freelancerId].filter(Boolean);
  if (ids.length) {
    await prisma.$transaction([
      prisma.transactionFlag.deleteMany({ where: { userId: { in: ids } } }),
      prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
      prisma.paymentTransaction.deleteMany({ where: { milestoneId } }),
      prisma.milestone.deleteMany({ where: { contractId } }),
      prisma.contract.deleteMany({ where: { id: contractId } }),
      prisma.job.deleteMany({ where: { clientId: { in: ids } } }),
    ]);
  }
  await prisma.auditLog.deleteMany({ where: { entityId: milestoneId } });
  await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  clientId = "";
  freelancerId = "";
  contractId = "";
  milestoneId = "";
  paymentId = "";
}

async function makeUser(label: string, role: "CLIENT" | "FREELANCER") {
  let hash = 0;
  for (const ch of label) hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000;
  const created = await prisma.user.create({
    data: {
      email: `orphan-${label}-${STAMP}@test.et`,
      phone: `+2519${String(75000000 + (STAMP % 900000) + hash)}`,
      passwordHash: "not-a-real-hash",
      role,
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 1_000_000 } },
    } as never,
    include: { wallet: true },
  });
  return created;
}

/**
 * A contract with one milestone in PAYMENT_PENDING and a PENDING provider
 * transaction, i.e. the state a client is in between starting a payment and
 * hearing back about it.
 */
async function seed(contractStatus: "ACTIVE" | "CANCELLED") {
  const client = await makeUser("client", "CLIENT");
  const freelancer = await makeUser("freelancer", "FREELANCER");
  clientId = client.id;
  freelancerId = freelancer.id;

  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      title: `Late webhook fixture ${STAMP}`,
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
      status: contractStatus,
      milestones: {
        create: {
          title: "One milestone",
          amountMinor: AMOUNT,
          dueDate: new Date(Date.now() + 86_400_000 * 30),
          escrowState: "PAYMENT_PENDING",
        },
      },
    },
    include: { milestones: true },
  });
  contractId = contract.id;
  milestoneId = contract.milestones[0].id;

  const payment = await prisma.paymentTransaction.create({
    data: {
      milestoneId,
      provider: "TELEBIRR",
      providerTransactionId: `txn-${STAMP}-${Math.random().toString(36).slice(2, 10)}`,
      // The provider's total charge: gross plus the client-side platform fee.
      amountMinor: AMOUNT,
      status: "PENDING",
    },
  });
  paymentId = payment.id;

  return { client, freelancer, providerTransactionId: payment.providerTransactionId! };
}

async function milestoneState() {
  const m = await prisma.milestone.findUniqueOrThrow({
    where: { id: milestoneId },
    select: { escrowState: true },
  });
  return m.escrowState;
}

async function paymentStatus() {
  const p = await prisma.paymentTransaction.findUniqueOrThrow({
    where: { id: paymentId },
    select: { status: true },
  });
  return p.status;
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("a late success callback on a cancelled contract does not lock the money", () => {
  it("leaves the milestone out of escrow", async () => {
    await seed("CANCELLED");
    expect(await milestoneState()).toBe("PAYMENT_PENDING");

    await handlePaymentWebhook({
      providerTransactionId: (await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: paymentId }, select: { providerTransactionId: true } })).providerTransactionId!,
      provider: "TELEBIRR",
      status: "SUCCESS",
      rawPayload: {},
    });

    expect(
      await milestoneState(),
      "money must not be parked in escrow on a cancelled contract",
    ).not.toBe("ESCROW_HELD");
    expect(await milestoneState()).toBe("PAYMENT_PENDING");
  });

  it("still records that the payment arrived", async () => {
    const { providerTransactionId } = await seed("CANCELLED");

    await handlePaymentWebhook({
      providerTransactionId,
      provider: "TELEBIRR",
      status: "SUCCESS",
      rawPayload: {},
    });

    // The money is real. Losing that record would hide the client's payment and
    // make the whole event invisible.
    expect(await paymentStatus()).toBe("SUCCESS");
  });

  it("raises a staff flag so somebody returns the money", async () => {
    const { providerTransactionId } = await seed("CANCELLED");

    await handlePaymentWebhook({
      providerTransactionId,
      provider: "TELEBIRR",
      status: "SUCCESS",
      rawPayload: {},
    });

    const flags = await prisma.transactionFlag.findMany({
      where: { userId: clientId, status: "PENDING_REVIEW" },
    });
    expect(flags, "an unplaced payment must be visible to a human").toHaveLength(1);
    expect(flags[0].type).toBe("STAFF_FLAGGED");
    expect(flags[0].relatedEntityId).toBe(paymentId);
  });

  // A companion assertion here used to count Notification rows to check the
  // freelancer is not told funds are held. It passed with the fix reverted as
  // well, because the notification is enqueued on BullMQ and no worker runs in
  // tests, so no Notification row is ever created either way. A green check
  // that cannot fail has been deleted rather than kept.
});

describe("the normal case is untouched", () => {
  it("still funds an ACTIVE contract in PAYMENT_PENDING", async () => {
    const { providerTransactionId } = await seed("ACTIVE");

    await handlePaymentWebhook({
      providerTransactionId,
      provider: "TELEBIRR",
      status: "SUCCESS",
      rawPayload: {},
    });

    // The control. Without it, 'the milestone never becomes ESCROW_HELD' would
    // satisfy every test above while breaking all funding.
    expect(await milestoneState()).toBe("ESCROW_HELD");
    expect(await paymentStatus()).toBe("SUCCESS");
    expect(
      await prisma.transactionFlag.count({ where: { userId: clientId } }),
      "a normal funding must not raise a compliance flag",
    ).toBe(0);
  });

  it("still credits the client's lifetime spend on a normal funding", async () => {
    await seed("ACTIVE");
    const providerTransactionId = (
      await prisma.paymentTransaction.findUniqueOrThrow({
        where: { id: paymentId },
        select: { providerTransactionId: true },
      })
    ).providerTransactionId!;

    const before = await prisma.user.findUniqueOrThrow({
      where: { id: clientId },
      select: { totalSpentGrossMinor: true },
    });

    await handlePaymentWebhook({
      providerTransactionId,
      provider: "TELEBIRR",
      status: "SUCCESS",
      rawPayload: {},
    });

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: clientId },
      select: { totalSpentGrossMinor: true },
    });
    expect(after.totalSpentGrossMinor).toBeGreaterThan(before.totalSpentGrossMinor);
  });
});

describe("a milestone already settled is not re-opened by a late callback", () => {
  it("leaves a non-PAYMENT_PENDING milestone alone", async () => {
    const { providerTransactionId } = await seed("ACTIVE");
    await prisma.milestone.update({
      where: { id: milestoneId },
      data: { escrowState: "REFUNDED" },
    });

    await handlePaymentWebhook({
      providerTransactionId,
      provider: "TELEBIRR",
      status: "SUCCESS",
      rawPayload: {},
    });

    // The second predicate: escrowState alone stops this case, and it is the
    // only thing that does.
    expect(await milestoneState()).toBe("REFUNDED");
    expect(
      await prisma.transactionFlag.count({ where: { userId: clientId } }),
      "and the payment is flagged rather than lost",
    ).toBe(1);
  });
});