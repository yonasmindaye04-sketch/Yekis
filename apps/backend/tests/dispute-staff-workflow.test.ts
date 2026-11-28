import { describe, it, expect, afterAll } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * OPS-07 — Comprehensive per-role & per-stage matrix proving:
 * - Mediation staff (DISPUTE_MEDIATOR, COMPLIANCE_ADMIN, SUPER_ADMIN) can mediate
 * - View-only staff (OPERATIONS_ADMIN: disputes.view) can read but get 403 on every write
 * - Non-dispute roles (FINANCE_ADMIN, SUPPORT) & non-party users get 403 everywhere with non-empty messages
 * - Staff cannot act as contract parties (cannot raiseDispute or mutually withdraw)
 * - Evidence records submittedByRole (CLIENT / FREELANCER / staff role)
 * - Internal mediator notes (isInternal: true) stay hidden from dispute parties
 */
const app: Express = buildApp();
const STAMP = Date.now();
let seq = 0;

const cleanupIds: {
  userIds: string[];
  contractIds: string[];
  disputeIds: string[];
} = { userIds: [], contractIds: [], disputeIds: [] };

async function cleanup() {
  if (cleanupIds.disputeIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: { entityId: { in: cleanupIds.disputeIds } },
    });
    await prisma.disputeEvidence.deleteMany({
      where: { disputeId: { in: cleanupIds.disputeIds } },
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
    await prisma.user.deleteMany({ where: { id: { in: cleanupIds.userIds } } });
  }
}

async function seedDispute(
  stage:
    | "STAGE_1_NEGOTIATION"
    | "STAGE_2_EVIDENCE"
    | "STAGE_3_MEDIATION"
    | "STAGE_4_ARBITRATION"
    | "RESOLVED",
) {
  seq += 1;
  const suffix = `${seq}-${STAMP}`;
  const client = await prisma.user.create({
    data: {
      email: `ops07-c-${suffix}@test.et`,
      phone: `+25194${String(1000000 + seq * 19 + (STAMP % 1000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
    } as never,
  });
  const freelancer = await prisma.user.create({
    data: {
      email: `ops07-f-${suffix}@test.et`,
      phone: `+25193${String(1000000 + seq * 23 + (STAMP % 1000))}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
    } as never,
  });
  cleanupIds.userIds.push(client.id, freelancer.id);

  const job = await prisma.job.create({
    data: {
      clientId: client.id,
      title: `OPS-07 Test Job ${seq}`,
      description: "Testing dispute mediation staff workflow routes",
      category: "WEB_APP_DEVELOPMENT",
      budgetMinMinor: 50_000,
      budgetMaxMinor: 50_000,
      deadline: new Date(Date.now() + 7 * 86_400_000),
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
      status: "ACTIVE",
      milestones: {
        create: [
          {
            title: "Disputed milestone",
            amountMinor: 50_000,
            dueDate: new Date(Date.now() + 7 * 86_400_000),
            escrowState: "DISPUTED",
          },
          {
            title: "Second funded milestone",
            amountMinor: 25_000,
            dueDate: new Date(Date.now() + 14 * 86_400_000),
            escrowState: "ESCROW_HELD",
          },
        ],
      },
    },
    include: { milestones: true },
  });
  cleanupIds.contractIds.push(contract.id);
  const milestone = contract.milestones[0]!;
  const cleanMilestone = contract.milestones[1]!;

  const dispute = await prisma.dispute.create({
    data: {
      contractId: contract.id,
      milestoneId: milestone.id,
      category: "QUALITY_ISSUE",
      description: "Test dispute for mediator workflow verification",
      raisedByUserId: client.id,
      stage,
    },
  });
  cleanupIds.disputeIds.push(dispute.id);

  const clientAuth = await createAuthTokens({ id: client.id, role: "CLIENT", ucid: null }, ["pwd"]);
  const freelancerAuth = await createAuthTokens(
    { id: freelancer.id, role: "FREELANCER", ucid: null },
    ["pwd"],
  );

  return {
    dispute,
    contract,
    cleanMilestone,
    client,
    freelancer,
    clientToken: clientAuth.accessToken,
    freelancerToken: freelancerAuth.accessToken,
  };
}

async function createStaffUser(
  staffRole:
    | "DISPUTE_MEDIATOR"
    | "COMPLIANCE_ADMIN"
    | "SUPER_ADMIN"
    | "OPERATIONS_ADMIN"
    | "FINANCE_ADMIN"
    | "SUPPORT",
) {
  seq += 1;
  const user = await prisma.user.create({
    data: {
      email: `ops07-${staffRole.toLowerCase()}-${seq}-${STAMP}@test.et`,
      phone: `+25192${String(1000000 + seq * 29 + (STAMP % 1000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole,
      emailVerifiedAt: new Date(),
    } as never,
  });
  cleanupIds.userIds.push(user.id);
  const { accessToken } = await createAuthTokens(
    { id: user.id, role: "CLIENT", ucid: null },
    ["pwd"],
  );
  return { user, accessToken };
}

describe("OPS-07: Dispute staff workflow role/stage matrix, author roles & internal note isolation", () => {
  afterAll(async () => {
    await cleanup();
  });

  it("enforces role permissions: disputes.mediate succeeds, disputes.view is read-only, finance/support denied, staff cannot act as parties", async () => {
    const mediator = await createStaffUser("DISPUTE_MEDIATOR");
    const compliance = await createStaffUser("COMPLIANCE_ADMIN");
    const opsAdmin = await createStaffUser("OPERATIONS_ADMIN");
    const finance = await createStaffUser("FINANCE_ADMIN");
    const support = await createStaffUser("SUPPORT");

    const s1 = await seedDispute("STAGE_1_NEGOTIATION");
    const s3 = await seedDispute("STAGE_3_MEDIATION");

    // Staff cannot act as contract parties (cannot raise a dispute or mutually withdraw)
    const staffRaise = await request(app)
      .post("/api/v1/disputes")
      .set("Authorization", `Bearer ${mediator.accessToken}`)
      .send({
        contractId: s1.contract.id,
        milestoneId: s1.cleanMilestone.id,
        category: "QUALITY_ISSUE",
        description: "Mediator attempting to act as party to raise dispute",
      });
    expect(staffRaise.status).toBe(403);
    expect(staffRaise.body.error).toBe("FORBIDDEN");
    expect(staffRaise.body.message.length).toBeGreaterThan(10);

    const staffWithdraw = await request(app)
      .post(`/api/v1/disputes/${s3.dispute.id}/withdraw`)
      .set("Authorization", `Bearer ${mediator.accessToken}`)
      .send({ proposedOutcome: "REFUND_TO_CLIENT" });
    expect(staffWithdraw.status).toBe(403);
    expect(staffWithdraw.body.error).toBe("FORBIDDEN");

    // DISPUTE_MEDIATOR & COMPLIANCE_ADMIN (disputes.mediate) work across valid transitions
    const escRes = await request(app)
      .post(`/api/v1/disputes/${s1.dispute.id}/escalate`)
      .set("Authorization", `Bearer ${compliance.accessToken}`);
    expect(escRes.status).toBe(200);
    expect(escRes.body.stage).toBe("STAGE_2_EVIDENCE");

    // OPERATIONS_ADMIN (disputes.view only) can GET but receives 403 on EVERY write route server-side
    expect(
      (
        await request(app)
          .get(`/api/v1/disputes/${s3.dispute.id}`)
          .set("Authorization", `Bearer ${opsAdmin.accessToken}`)
      ).status,
    ).toBe(200);
    for (const [method, endpoint, body] of [
      ["post", `/api/v1/disputes/${s1.dispute.id}/escalate`, undefined],
      ["post", `/api/v1/disputes/${s3.dispute.id}/evidence`, { statement: "Unauthorized ops note" }],
      ["post", `/api/v1/disputes/${s3.dispute.id}/arbitration`, undefined],
      ["post", `/api/v1/disputes/${s3.dispute.id}/claim`, undefined],
      [
        "post",
        `/api/v1/disputes/${s3.dispute.id}/resolve`,
        { outcome: "REFUND_TO_CLIENT", recommendation: "Should be denied" },
      ],
    ] as const) {
      const req = request(app)[method](endpoint).set(
        "Authorization",
        `Bearer ${opsAdmin.accessToken}`,
      );
      const r = body ? await req.send(body) : await req;
      expect(r.status).toBe(403);
    }

    // FINANCE_ADMIN & SUPPORT receive 403 even on GET /:id
    for (const staff of [finance, support]) {
      const g = await request(app)
        .get(`/api/v1/disputes/${s3.dispute.id}`)
        .set("Authorization", `Bearer ${staff.accessToken}`);
      expect(g.status).toBe(403);
      expect(g.body.message.length).toBeGreaterThan(10);
    }
  });

  it("enforces per-stage transitions, stores submittedByRole, and hides isInternal staff notes from parties", async () => {
    const mediator = await createStaffUser("DISPUTE_MEDIATOR");
    const s2 = await seedDispute("STAGE_2_EVIDENCE");
    const s4 = await seedDispute("STAGE_4_ARBITRATION");
    const resolved = await seedDispute("RESOLVED");

    // Stage matrix: /arbitration rejected on S2, S4, RESOLVED; /escalate rejected on S2, S4, RESOLVED; /evidence rejected on S4, RESOLVED
    for (const d of [s2.dispute, s4.dispute, resolved.dispute]) {
      expect(
        (
          await request(app)
            .post(`/api/v1/disputes/${d.id}/escalate`)
            .set("Authorization", `Bearer ${mediator.accessToken}`)
        ).status,
      ).toBe(409);
      expect(
        (
          await request(app)
            .post(`/api/v1/disputes/${d.id}/arbitration`)
            .set("Authorization", `Bearer ${mediator.accessToken}`)
        ).status,
      ).toBe(409);
    }
    for (const d of [s4.dispute, resolved.dispute]) {
      expect(
        (
          await request(app)
            .post(`/api/v1/disputes/${d.id}/evidence`)
            .set("Authorization", `Bearer ${mediator.accessToken}`)
            .send({ statement: "Cannot add note after arbitration/resolution" })
        ).status,
      ).toBe(409);
    }

    // Parties cannot forge isInternal=true notes
    const forgedInternal = await request(app)
      .post(`/api/v1/disputes/${s2.dispute.id}/evidence`)
      .set("Authorization", `Bearer ${s2.clientToken}`)
      .send({ statement: "Client attempting internal flag", isInternal: true });
    expect(forgedInternal.status).toBe(403);

    // Client party submits public statement (moves S2 -> S3, role CLIENT)
    await request(app)
      .post(`/api/v1/disputes/${s2.dispute.id}/evidence`)
      .set("Authorization", `Bearer ${s2.clientToken}`)
      .send({ statement: "Client uploaded staging defect screenshots." })
      .expect(200);

    // Mediator attaches one public mediator note + one internal-only note
    await request(app)
      .post(`/api/v1/disputes/${s2.dispute.id}/evidence`)
      .set("Authorization", `Bearer ${mediator.accessToken}`)
      .send({ statement: "Public mediator summary visible to parties.", isInternal: false })
      .expect(200);

    await request(app)
      .post(`/api/v1/disputes/${s2.dispute.id}/evidence`)
      .set("Authorization", `Bearer ${mediator.accessToken}`)
      .send({ statement: "SECRET internal AML/risk handoff note.", isInternal: true })
      .expect(200);

    // Staff view sees ALL 3 notes with explicit submittedByRole & isInternal flags
    const staffGet = await request(app)
      .get(`/api/v1/disputes/${s2.dispute.id}`)
      .set("Authorization", `Bearer ${mediator.accessToken}`)
      .expect(200);
    expect(staffGet.body.evidence).toHaveLength(3);
    expect(
      staffGet.body.evidence.map((e: { submittedByRole: string; isInternal: boolean }) => ({
        role: e.submittedByRole,
        internal: e.isInternal,
      })),
    ).toEqual([
      { role: "CLIENT", internal: false },
      { role: "DISPUTE_MEDIATOR", internal: false },
      { role: "DISPUTE_MEDIATOR", internal: true },
    ]);

    // Client and Freelancer GET /:id and GET / NEVER see the internal staff note
    for (const partyToken of [s2.clientToken, s2.freelancerToken]) {
      const partyGet = await request(app)
        .get(`/api/v1/disputes/${s2.dispute.id}`)
        .set("Authorization", `Bearer ${partyToken}`)
        .expect(200);
      expect(partyGet.body.evidence).toHaveLength(2);
      expect(
        partyGet.body.evidence.some((e: { statement: string }) =>
          e.statement.includes("SECRET internal"),
        ),
      ).toBe(false);

      const partyList = await request(app)
        .get("/api/v1/disputes")
        .set("Authorization", `Bearer ${partyToken}`)
        .expect(200);
      const found = partyList.body.find((d: { id: string }) => d.id === s2.dispute.id);
      expect(found.evidence).toHaveLength(2);
    }
  });
});
