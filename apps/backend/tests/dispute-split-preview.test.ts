import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { assertProductionSafety, env } from "../src/config/env.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import { computeDisputeSplit } from "../src/modules/disputes/dispute.service.js";
import { recordEscrowFundingLedger } from "../src/modules/finance/ledger.service.js";

/**
 * Allows `0.3` WHT split verification tests to exercise the deferred statutory
 * 3%/30% WHT path (`TAX-002`) without enabling live WHT deductions in `fees.ts`
 * before ERA remittance sign-off. Inactive for all other tests.
 */
const whtTestOverride: { active: boolean; thresholdMinor?: number } = {
  active: false,
};

vi.mock("../src/modules/escrow/fees.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/modules/escrow/fees.js")>();
  return {
    ...actual,
    calculateFees: (params: { milestoneAmountMinor: number; freelancerHasTin?: boolean }) => {
      const base = actual.calculateFees(params);
      if (!whtTestOverride.active) return base;
      const threshold = whtTestOverride.thresholdMinor ?? env.WITHHOLDING_THRESHOLD_MINOR;
      const gross = params.milestoneAmountMinor;
      if (gross < threshold) return base;
      const rate = params.freelancerHasTin
        ? env.WITHHOLDING_RATE_WITH_TIN
        : env.WITHHOLDING_RATE_WITHOUT_TIN;
      const withholdingTax = Math.round(gross * rate);
      return {
        ...base,
        withholdingTaxMinor: withholdingTax,
        freelancerNetMinor:
          gross -
          base.platformFeeFromFreelancerMinor -
          base.paymentProviderFeeMinor -
          withholdingTax,
      };
    },
  };
});

/**
 * OPS-01 — Authoritative server-side Partial Split preview, unambiguous
 * percentage/minor input contract, feature-flag containment, and exact settlement
 * accounting (1,000 ETB @ 50% -> ETB 462.50 net, not ETB 0.46).
 */
const app: Express = buildApp();
const STAMP = Date.now();

let seq = 0;
const cleanupIds: {
  userIds: string[];
  contractIds: string[];
  milestoneIds: string[];
  disputeIds: string[];
} = { userIds: [], contractIds: [], milestoneIds: [], disputeIds: [] };

const prevPartialSplit = env.PARTIAL_SPLIT_ENABLED;

async function cleanup() {
  if (cleanupIds.milestoneIds.length > 0) {
    await prisma.platformFeeCredit.deleteMany({
      where: { milestoneId: { in: cleanupIds.milestoneIds } },
    });
    await prisma.ledgerEntry.deleteMany({
      where: { journal: { referenceId: { in: cleanupIds.milestoneIds } } },
    });
    await prisma.ledgerJournal.deleteMany({
      where: { referenceId: { in: cleanupIds.milestoneIds } },
    });
  }
  if (cleanupIds.disputeIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: cleanupIds.disputeIds } },
    });
    await prisma.dispute.deleteMany({
      where: { id: { in: cleanupIds.disputeIds } },
    });
  }
  if (cleanupIds.contractIds.length > 0) {
    await prisma.milestone.deleteMany({
      where: { contractId: { in: cleanupIds.contractIds } },
    });
    await prisma.contract.deleteMany({
      where: { id: { in: cleanupIds.contractIds } },
    });
  }
  if (cleanupIds.userIds.length > 0) {
    await prisma.job.deleteMany({ where: { clientId: { in: cleanupIds.userIds } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: cleanupIds.userIds } } });
    await prisma.kycRecord.deleteMany({ where: { userId: { in: cleanupIds.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds.userIds } } });
  }
  cleanupIds.userIds = [];
  cleanupIds.contractIds = [];
  cleanupIds.milestoneIds = [];
  cleanupIds.disputeIds = [];
}

async function seedDisputeFixture(params?: {
  disputedAmountMinor?: number;
  extraMilestoneAmountMinor?: number;
  freelancerTin?: string;
}) {
  seq += 1;
  const disputedAmountMinor = params?.disputedAmountMinor ?? 100_000;
  const extraAmountMinor = params?.extraMilestoneAmountMinor ?? 100_000;

  const client = await prisma.user.create({
    data: {
      email: `ops01-client-${seq}-${STAMP}@test.et`,
      phone: `+25195${String(1000000 + seq * 13 + (STAMP % 1000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  const freelancer = await prisma.user.create({
    data: {
      email: `ops01-fl-${seq}-${STAMP}@test.et`,
      phone: `+25196${String(1000000 + seq * 17 + (STAMP % 1000))}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      wallet: { create: { balanceMinor: 0 } },
      ...(params?.freelancerTin
        ? {
            kyc: {
              create: {
                tier: "TIER_2",
                status: "VERIFIED",
                tin: params.freelancerTin,
              },
            },
          }
        : {}),
    } as never,
  });
  const mediator = await prisma.user.create({
    data: {
      email: `ops01-med-${seq}-${STAMP}@test.et`,
      phone: `+25197${String(1000000 + seq * 19 + (STAMP % 1000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: "DISPUTE_MEDIATOR",
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  cleanupIds.userIds.push(client.id, freelancer.id, mediator.id);

  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      title: `Split test contract ${seq}`,
      description: "Scope",
      category: "WEB_APP_DEVELOPMENT",
      budgetMinMinor: disputedAmountMinor,
      budgetMaxMinor: disputedAmountMinor + extraAmountMinor,
      deadline: new Date(Date.now() + 7 * 86400_000),
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
        create: [
          {
            title: "Disputed deliverable",
            amountMinor: disputedAmountMinor,
            dueDate: new Date(Date.now() + 7 * 86_400_000),
            escrowState: "DISPUTED",
          },
          {
            title: "Unrelated completed milestone",
            amountMinor: extraAmountMinor,
            dueDate: new Date(Date.now() + 14 * 86_400_000),
            escrowState: "RELEASED",
          },
        ],
      },
    },
    include: { milestones: true },
  });
  cleanupIds.contractIds.push(contract.id);

  const disputedMs = contract.milestones.find((m) => m.title === "Disputed deliverable")!;
  const otherMs = contract.milestones.find((m) => m.title === "Unrelated completed milestone")!;
  cleanupIds.milestoneIds.push(disputedMs.id, otherMs.id);

  await prisma.$transaction(async (tx) => {
    await recordEscrowFundingLedger(tx, {
      clientId: client.id,
      milestoneId: disputedMs.id,
      totalChargedMinor: disputedMs.amountMinor,
      milestoneGrossMinor: disputedMs.amountMinor,
      platformFeeFromClientMinor: 0,
    });
  });

  const dispute = await prisma.dispute.create({
    data: {
      contractId: contract.id,
      milestoneId: disputedMs.id,
      category: "QUALITY_ISSUE",
      stage: "STAGE_3_MEDIATION",
      raisedByUserId: client.id,
      description: "Milestone incomplete",
    },
  });
  cleanupIds.disputeIds.push(dispute.id);

  const session = await createAuthTokens(
    { id: mediator.id, role: "CLIENT", ucid: null },
    ["pwd"],
  );

  return {
    clientId: client.id,
    freelancerId: freelancer.id,
    mediatorId: mediator.id,
    disputedMsId: disputedMs.id,
    disputeId: dispute.id,
    authHeader: `Bearer ${session.accessToken}`,
  };
}

beforeEach(async () => {
  env.PARTIAL_SPLIT_ENABLED = true;
});

afterEach(() => {
  whtTestOverride.active = false;
  whtTestOverride.thresholdMinor = undefined;
});

afterAll(async () => {
  env.PARTIAL_SPLIT_ENABLED = prevPartialSplit;
  await cleanup();
  await prisma.$disconnect();
});

describe("OPS-01: computeDisputeSplit & server preview", () => {
  it("computes exact 50% split on 1,000 ETB (100,000 minor): gross 500.00, fee 37.50, net 462.50, refund 500.00", () => {
    const split = computeDisputeSplit({
      disputedAmountMinor: 100_000,
      outcome: "PARTIAL_SPLIT",
      freelancerSharePct: 50,
    });
    expect(split.disputedAmountMinor).toBe(100_000);
    expect(split.freelancerGrossMinor).toBe(50_000);
    expect(split.clientRefundMinor).toBe(50_000);
    expect(split.platformFeeMinor).toBe(3_500);
    expect(split.providerFeeMinor).toBe(250);
    expect(split.totalFeeMinor).toBe(3_750);
    expect(split.freelancerNetMinor).toBe(46_250);
    expect(split.freelancerGrossMinor + split.clientRefundMinor).toBe(100_000);
  });

  it("handles 0%, 100%, and 33% rounding on exact disputed amounts", () => {
    const zero = computeDisputeSplit({
      disputedAmountMinor: 100_000,
      outcome: "PARTIAL_SPLIT",
      freelancerSharePct: 0,
    });
    expect(zero.freelancerGrossMinor).toBe(0);
    expect(zero.clientRefundMinor).toBe(100_000);
    expect(zero.totalFeeMinor).toBe(0);
    expect(zero.freelancerNetMinor).toBe(0);

    const full = computeDisputeSplit({
      disputedAmountMinor: 100_000,
      outcome: "PARTIAL_SPLIT",
      freelancerSharePct: 100,
    });
    expect(full.freelancerGrossMinor).toBe(100_000);
    expect(full.clientRefundMinor).toBe(0);
    expect(full.totalFeeMinor).toBe(7_500);
    expect(full.freelancerNetMinor).toBe(92_500);

    const odd33 = computeDisputeSplit({
      disputedAmountMinor: 10_050,
      outcome: "PARTIAL_SPLIT",
      freelancerSharePct: 33,
    });
    expect(odd33.freelancerGrossMinor).toBe(3_317);
    expect(odd33.clientRefundMinor).toBe(6_733);
    expect(odd33.freelancerGrossMinor + odd33.clientRefundMinor).toBe(10_050);
    expect(odd33.totalFeeMinor).toBe(232 + 17);
    expect(odd33.freelancerNetMinor).toBe(3_317 - 249);

    // Explicit rounding check on 12,345 minor @ 33%: fee components sum exactly to totalFeeMinor
    const odd12345 = computeDisputeSplit({
      disputedAmountMinor: 12_345,
      outcome: "PARTIAL_SPLIT",
      freelancerSharePct: 33,
    });
    expect(odd12345.freelancerGrossMinor).toBe(4_074);
    expect(odd12345.clientRefundMinor).toBe(8_271);
    expect(odd12345.freelancerGrossMinor + odd12345.clientRefundMinor).toBe(12_345);
    expect(odd12345.platformFeeMinor + odd12345.providerFeeMinor).toBe(odd12345.totalFeeMinor);
    expect(odd12345.freelancerNetMinor).toBe(
      odd12345.freelancerGrossMinor - odd12345.totalFeeMinor - odd12345.withholdingTaxMinor,
    );
  });

  it("refuses PARTIAL_SPLIT_ENABLED=true when NODE_ENV=production", () => {
    const violations = assertProductionSafety({
      NODE_ENV: "production",
      PARTIAL_SPLIT_ENABLED: true,
      TELEGRAM_BOT_TOKEN: "tok",
      GUEST_SUPPORT_JWT_SECRET: "guest-secret-that-differs-from-access",
      JWT_ACCESS_SECRET: "access-secret-different-from-guest",
      TELEGRAM_WEBHOOK_SECRET: "webhook-secret-32-chars-minimum",
      TELEGRAM_WEBHOOK_URL: "https://api.yekis.example/webhook",
      API_PUBLIC_URL: "https://api.yekis.example",
      STAFF_CONSOLE_URL: "https://ops.yekis.example",
      TELEGRAM_ENV: "prod",
    });
    expect(violations.some((v) => v.includes("PARTIAL_SPLIT_ENABLED"))).toBe(true);
  });

  it("rejects ambiguous or out-of-range split inputs", async () => {
    const f = await seedDisputeFixture();

    const both = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({
        outcome: "PARTIAL_SPLIT",
        freelancerSharePct: 50,
        freelancerShareMinor: 50_000,
      });
    expect(both.status).toBe(400);

    const neither = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT" });
    expect(neither.status).toBe(400);

    const overPct = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 101 });
    expect(overPct.status).toBe(400);

    const overMinor = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT", freelancerShareMinor: 150_000 });
    expect(overMinor.status).toBe(409);
  });

  it("blocks PARTIAL_SPLIT preview and resolution with 403 FEATURE_DISABLED when flag is off", async () => {
    const f = await seedDisputeFixture();
    env.PARTIAL_SPLIT_ENABLED = false;

    const previewRes = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 50 });
    expect(previewRes.status).toBe(403);
    expect(previewRes.body.error).toBe("FEATURE_DISABLED");

    const resolveRes = await request(app)
      .post(`/api/v1/disputes/${f.disputeId}/resolve`)
      .set("Authorization", f.authHeader)
      .send({
        outcome: "PARTIAL_SPLIT",
        freelancerSharePct: 50,
        recommendation: "Attempt while containment flag is disabled",
      });
    expect(resolveRes.status).toBe(403);
    expect(resolveRes.body.error).toBe("FEATURE_DISABLED");
  });

  it("preview matches resolved wallet movements on a multi-milestone contract and keeps every journal balanced", async () => {
    const f = await seedDisputeFixture({
      disputedAmountMinor: 100_000,
      extraMilestoneAmountMinor: 100_000,
    });

    const previewRes = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 50 });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.disputedAmountMinor).toBe(100_000);
    expect(previewRes.body.freelancerGrossMinor).toBe(50_000);
    expect(previewRes.body.clientRefundMinor).toBe(50_000);
    expect(previewRes.body.totalFeeMinor).toBe(3_750);
    expect(previewRes.body.freelancerNetMinor).toBe(46_250);

    const queueRes = await request(app)
      .get(`/api/v1/disputes/staff/queue?search=ops01-client-${seq}`)
      .set("Authorization", f.authHeader);
    expect(queueRes.status).toBe(200);
    const queued = queueRes.body.items.find((d: { id: string }) => d.id === f.disputeId);
    expect(queued).toBeTruthy();
    expect(queued.disputedAmountMinor).toBe(100_000);
    expect(queued.disputedMilestone?.id).toBe(f.disputedMsId);

    const resolveRes = await request(app)
      .post(`/api/v1/disputes/${f.disputeId}/resolve`)
      .set("Authorization", f.authHeader)
      .send({
        outcome: "PARTIAL_SPLIT",
        freelancerSharePct: 50,
        // Client-injected money fields must be ignored; DB milestone.amountMinor governs
        disputedAmountMinor: 999_999,
        freelancerNetMinor: 999_999,
        totalFeeMinor: 0,
        recommendation: "50% split on disputed ETB 1,000 milestone",
      });
    expect(resolveRes.status).toBe(200);

    const [clientWallet, freelancerWallet] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.clientId } }),
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.freelancerId } }),
    ]);
    expect(clientWallet.balanceMinor).toBe(50_000);
    expect(freelancerWallet.balanceMinor).toBe(46_250);

    const journals = await prisma.ledgerJournal.findMany({
      where: { referenceId: f.disputedMsId },
      include: { entries: { include: { account: true } } },
    });
    expect(journals.length).toBeGreaterThanOrEqual(3);
    for (const j of journals) {
      const debits = j.entries.reduce((s, e) => s + e.debitMinor, 0);
      const credits = j.entries.reduce((s, e) => s + e.creditMinor, 0);
      expect(debits).toBe(credits);
    }

    // Assert exact settlement ledger entries for the ETB 1,000 (100,000 minor) 50% split
    const releaseAndRefund = journals.filter((j) =>
      ["MILESTONE_RELEASE", "DISPUTE_REFUND"].includes(j.referenceType),
    );
    const byAccount = new Map<string, { debit: number; credit: number }>();
    for (const j of releaseAndRefund) {
      for (const e of j.entries) {
        const cur = byAccount.get(e.account.code) ?? { debit: 0, credit: 0 };
        cur.debit += e.debitMinor;
        cur.credit += e.creditMinor;
        byAccount.set(e.account.code, cur);
      }
    }
    expect(byAccount.get("2000-LIABILITY-ESCROW")).toEqual({ debit: 100_000, credit: 0 });
    expect(byAccount.get(`2100-USER-${f.clientId}`)).toEqual({ debit: 0, credit: 50_000 });
    expect(byAccount.get(`2100-USER-${f.freelancerId}`)).toEqual({ debit: 0, credit: 46_250 });
    expect(byAccount.get("4000-REVENUE-PLATFORM-FEES")).toEqual({ debit: 0, credit: 3_500 });
    expect(byAccount.get("4010-REVENUE-DISBURSEMENT-FEES")).toEqual({ debit: 0, credit: 250 });
  });

  it("isolates two disputes on different milestones of the same contract in queue and split-preview", async () => {
    const f = await seedDisputeFixture({
      disputedAmountMinor: 2_200_000,
      extraMilestoneAmountMinor: 900_000,
    });
    const secondMs = await prisma.milestone.findFirstOrThrow({
      where: { contract: { milestones: { some: { id: f.disputedMsId } } }, NOT: { id: f.disputedMsId } },
    });
    await prisma.milestone.update({
      where: { id: secondMs.id },
      data: { escrowState: "DISPUTED" },
    });
    const secondDispute = await prisma.dispute.create({
      data: {
        contractId: secondMs.contractId,
        milestoneId: secondMs.id,
        category: "SCOPE_CREEP",
        stage: "STAGE_3_MEDIATION",
        raisedByUserId: f.clientId,
        description: "Second disputed milestone on same contract",
      },
    });
    cleanupIds.disputeIds.push(secondDispute.id);

    const queueRes = await request(app)
      .get(`/api/v1/disputes/staff/queue?search=ops01-client-${seq}`)
      .set("Authorization", f.authHeader);
    expect(queueRes.status).toBe(200);
    const d1 = queueRes.body.items.find((d: { id: string }) => d.id === f.disputeId);
    const d2 = queueRes.body.items.find((d: { id: string }) => d.id === secondDispute.id);
    expect(d1?.disputedAmountMinor).toBe(2_200_000);
    expect(d2?.disputedAmountMinor).toBe(900_000);

    const [p1, p2] = await Promise.all([
      request(app)
        .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
        .set("Authorization", f.authHeader)
        .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 50 }),
      request(app)
        .post(`/api/v1/admin/disputes/${secondDispute.id}/split-preview`)
        .set("Authorization", f.authHeader)
        .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 50 }),
    ]);
    expect(p1.body.disputedAmountMinor).toBe(2_200_000);
    expect(p2.body.disputedAmountMinor).toBe(900_000);
  });
});

describe("0.3: Partial split withholding tax verification", () => {
  it("applies 3% WHT when freelancerHasTin=true, matches preview to actual release, and posts 2050-LIABILITY-WITHHOLDING-ERA", async () => {
    whtTestOverride.active = true;
    const f = await seedDisputeFixture({
      disputedAmountMinor: 2_000_000, // ETB 20,000 -> 50% share = 1,000,000 (meets WHT threshold)
      freelancerTin: "ET-TIN-009911",
    });

    const previewRes = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 50 });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.freelancerGrossMinor).toBe(1_000_000);
    expect(previewRes.body.clientRefundMinor).toBe(1_000_000);
    expect(previewRes.body.platformFeeMinor).toBe(70_000);
    expect(previewRes.body.providerFeeMinor).toBe(5_000);
    expect(previewRes.body.totalFeeMinor).toBe(75_000);
    expect(previewRes.body.withholdingTaxMinor).toBe(30_000);
    expect(previewRes.body.freelancerNetMinor).toBe(895_000);
    expect(previewRes.body.freelancerNetMinor).toBe(
      previewRes.body.freelancerGrossMinor -
        previewRes.body.totalFeeMinor -
        previewRes.body.withholdingTaxMinor,
    );

    const resolveRes = await request(app)
      .post(`/api/v1/disputes/${f.disputeId}/resolve`)
      .set("Authorization", f.authHeader)
      .send({
        outcome: "PARTIAL_SPLIT",
        freelancerSharePct: 50,
        recommendation: "50% split with 3% TIN WHT",
      });
    expect(resolveRes.status).toBe(200);

    const [clientWallet, freelancerWallet, feeCredit, releaseJournal] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.clientId } }),
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.freelancerId } }),
      prisma.platformFeeCredit.findFirstOrThrow({ where: { milestoneId: f.disputedMsId } }),
      prisma.ledgerJournal.findFirstOrThrow({
        where: { referenceId: f.disputedMsId, referenceType: "MILESTONE_RELEASE" },
        include: { entries: { include: { account: true } } },
      }),
    ]);

    expect(clientWallet.balanceMinor).toBe(previewRes.body.clientRefundMinor);
    expect(freelancerWallet.balanceMinor).toBe(previewRes.body.freelancerNetMinor);
    expect(feeCredit.withholdingMinor).toBe(30_000);

    const whtEntry = releaseJournal.entries.find(
      (e) => e.account.code === "2050-LIABILITY-WITHHOLDING-ERA",
    );
    expect(whtEntry).toBeDefined();
    expect(whtEntry!.debitMinor).toBe(0);
    expect(whtEntry!.creditMinor).toBe(30_000);

    const totalDr = releaseJournal.entries.reduce((s, e) => s + e.debitMinor, 0);
    const totalCr = releaseJournal.entries.reduce((s, e) => s + e.creditMinor, 0);
    expect(totalDr).toBe(1_000_000);
    expect(totalCr).toBe(1_000_000);
  });

  it("applies 30% WHT when freelancerHasTin=false, matches preview to actual release, and posts 2050-LIABILITY-WITHHOLDING-ERA", async () => {
    whtTestOverride.active = true;
    const f = await seedDisputeFixture({
      disputedAmountMinor: 2_000_000,
    });

    const previewRes = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 50 });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.freelancerGrossMinor).toBe(1_000_000);
    expect(previewRes.body.clientRefundMinor).toBe(1_000_000);
    expect(previewRes.body.totalFeeMinor).toBe(75_000);
    expect(previewRes.body.withholdingTaxMinor).toBe(300_000);
    expect(previewRes.body.freelancerNetMinor).toBe(625_000);
    expect(previewRes.body.freelancerNetMinor).toBe(
      previewRes.body.freelancerGrossMinor -
        previewRes.body.totalFeeMinor -
        previewRes.body.withholdingTaxMinor,
    );

    const resolveRes = await request(app)
      .post(`/api/v1/disputes/${f.disputeId}/resolve`)
      .set("Authorization", f.authHeader)
      .send({
        outcome: "PARTIAL_SPLIT",
        freelancerSharePct: 50,
        recommendation: "50% split with 30% non-TIN WHT",
      });
    expect(resolveRes.status).toBe(200);

    const [clientWallet, freelancerWallet, releaseJournal] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.clientId } }),
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.freelancerId } }),
      prisma.ledgerJournal.findFirstOrThrow({
        where: { referenceId: f.disputedMsId, referenceType: "MILESTONE_RELEASE" },
        include: { entries: { include: { account: true } } },
      }),
    ]);

    expect(clientWallet.balanceMinor).toBe(previewRes.body.clientRefundMinor);
    expect(freelancerWallet.balanceMinor).toBe(previewRes.body.freelancerNetMinor);

    const whtEntry = releaseJournal.entries.find(
      (e) => e.account.code === "2050-LIABILITY-WITHHOLDING-ERA",
    );
    expect(whtEntry?.creditMinor).toBe(300_000);

    const totalDr = releaseJournal.entries.reduce((s, e) => s + e.debitMinor, 0);
    const totalCr = releaseJournal.entries.reduce((s, e) => s + e.creditMinor, 0);
    expect(totalDr).toBe(totalCr);
  });

  it("preserves exact integer rounding across fees, WHT, and net payout on small odd amounts", async () => {
    whtTestOverride.active = true;
    whtTestOverride.thresholdMinor = 1; // Exercise WHT rounding on a small odd split

    const withTin = computeDisputeSplit({
      disputedAmountMinor: 333,
      outcome: "PARTIAL_SPLIT",
      freelancerSharePct: 33,
      freelancerHasTin: true,
    });
    expect(withTin.freelancerGrossMinor).toBe(110);
    expect(withTin.clientRefundMinor).toBe(223);
    expect(withTin.platformFeeMinor).toBe(8);
    expect(withTin.providerFeeMinor).toBe(1);
    expect(withTin.totalFeeMinor).toBe(9);
    expect(withTin.withholdingTaxMinor).toBe(3);
    expect(withTin.freelancerNetMinor).toBe(98);
    expect(withTin.platformFeeMinor + withTin.providerFeeMinor).toBe(withTin.totalFeeMinor);
    expect(withTin.freelancerNetMinor).toBe(
      withTin.freelancerGrossMinor - withTin.totalFeeMinor - withTin.withholdingTaxMinor,
    );

    const f = await seedDisputeFixture({
      disputedAmountMinor: 333,
    });
    const previewRes = await request(app)
      .post(`/api/v1/admin/disputes/${f.disputeId}/split-preview`)
      .set("Authorization", f.authHeader)
      .send({ outcome: "PARTIAL_SPLIT", freelancerSharePct: 33 });
    expect(previewRes.status).toBe(200);
    expect(previewRes.body.withholdingTaxMinor).toBe(33); // 30% of 110
    expect(previewRes.body.totalFeeMinor).toBe(9);
    expect(previewRes.body.freelancerNetMinor).toBe(68);

    const resolveRes = await request(app)
      .post(`/api/v1/disputes/${f.disputeId}/resolve`)
      .set("Authorization", f.authHeader)
      .send({
        outcome: "PARTIAL_SPLIT",
        freelancerSharePct: 33,
        recommendation: "Odd small-amount WHT rounding check",
      });
    expect(resolveRes.status).toBe(200);

    const [clientWallet, freelancerWallet, releaseJournal] = await Promise.all([
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.clientId } }),
      prisma.wallet.findUniqueOrThrow({ where: { userId: f.freelancerId } }),
      prisma.ledgerJournal.findFirstOrThrow({
        where: { referenceId: f.disputedMsId, referenceType: "MILESTONE_RELEASE" },
        include: { entries: true },
      }),
    ]);
    expect(clientWallet.balanceMinor).toBe(223);
    expect(freelancerWallet.balanceMinor).toBe(68);
    const totalDr = releaseJournal.entries.reduce((s, e) => s + e.debitMinor, 0);
    const totalCr = releaseJournal.entries.reduce((s, e) => s + e.creditMinor, 0);
    expect(totalDr).toBe(110);
    expect(totalCr).toBe(110);
  });
});
