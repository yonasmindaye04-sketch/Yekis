import { describe, it, expect, afterAll } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * OPS-07 — Staff mediation permissions and descriptive error handling across
 * dispute workflow routes (/escalate, /evidence, /arbitration, GET /:id).
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

async function seedDispute(stage: "STAGE_1_NEGOTIATION" | "STAGE_3_MEDIATION") {
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
            title: "Milestone 1",
            amountMinor: 50_000,
            dueDate: new Date(Date.now() + 7 * 86_400_000),
            escrowState: "DISPUTED",
          },
        ],
      },
    },
    include: { milestones: true },
  });
  cleanupIds.contractIds.push(contract.id);
  const milestone = contract.milestones[0]!;

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
  return { dispute, client, freelancer };
}

async function createStaffUser(staffRole: "DISPUTE_MEDIATOR" | "SUPPORT" | "OPERATIONS_ADMIN") {
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

describe("OPS-07: Dispute staff workflow permissions & non-empty 403 messages", () => {
  afterAll(async () => {
    await cleanup();
  });

  it("allows DISPUTE_MEDIATOR to inspect, attach Stage 3 evidence, escalate Stage 1, and move Stage 3 to arbitration with staff audit logs", async () => {
    const mediator = await createStaffUser("DISPUTE_MEDIATOR");
    const stage1 = await seedDispute("STAGE_1_NEGOTIATION");
    const stage3 = await seedDispute("STAGE_3_MEDIATION");

    // Stage 1 -> Stage 2 escalation succeeds for mediator
    const escRes = await request(app)
      .post(`/api/v1/disputes/${stage1.dispute.id}/escalate`)
      .set("Authorization", `Bearer ${mediator.accessToken}`);
    expect(escRes.status).toBe(200);
    expect(escRes.body.stage).toBe("STAGE_2_EVIDENCE");

    // Stage 3 dispute allows GET, mediator evidence note, then arbitration escalation
    const getRes = await request(app)
      .get(`/api/v1/disputes/${stage3.dispute.id}`)
      .set("Authorization", `Bearer ${mediator.accessToken}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(stage3.dispute.id);

    const evRes = await request(app)
      .post(`/api/v1/disputes/${stage3.dispute.id}/evidence`)
      .set("Authorization", `Bearer ${mediator.accessToken}`)
      .send({ statement: "Mediator reviewed staging logs and deliverable commits." });
    expect(evRes.status).toBe(200);
    expect(evRes.body.stage).toBe("STAGE_3_MEDIATION");

    const evRows = await prisma.disputeEvidence.findMany({
      where: { disputeId: stage3.dispute.id },
    });
    expect(evRows).toHaveLength(1);
    expect(evRows[0]?.submittedByUserId).toBe(mediator.user.id);

    // Stage mismatch returns 409 INVALID_STATE with clear reason (not 403 FORBIDDEN)
    const badEscRes = await request(app)
      .post(`/api/v1/disputes/${stage3.dispute.id}/escalate`)
      .set("Authorization", `Bearer ${mediator.accessToken}`);
    expect(badEscRes.status).toBe(409);
    expect(badEscRes.body.error).toBe("INVALID_STATE");
    expect(badEscRes.body.message).toMatch(/STAGE_3_MEDIATION/);

    // Stage 3 -> Stage 4 arbitration succeeds for mediator
    const arbRes = await request(app)
      .post(`/api/v1/disputes/${stage3.dispute.id}/arbitration`)
      .set("Authorization", `Bearer ${mediator.accessToken}`);
    expect(arbRes.status).toBe(200);
    expect(arbRes.body.stage).toBe("STAGE_4_ARBITRATION");

    const audits = await prisma.auditLog.findMany({
      where: { entityId: stage3.dispute.id },
      orderBy: { createdAt: "asc" },
    });
    expect(audits.map((a) => a.eventType)).toEqual([
      "DISPUTE_EVIDENCE_SUBMITTED",
      "DISPUTE_ESCALATED_TO_ARBITRATION",
    ]);
    for (const row of audits) {
      expect(row.userId).toBe(mediator.user.id);
    }
  });

  it("denies non-party and staff without disputes.mediate with a descriptive non-empty 403 FORBIDDEN message", async () => {
    const opsAdmin = await createStaffUser("OPERATIONS_ADMIN");
    const { dispute } = await seedDispute("STAGE_3_MEDIATION");

    // OPERATIONS_ADMIN has disputes.view so GET works
    const viewRes = await request(app)
      .get(`/api/v1/disputes/${dispute.id}`)
      .set("Authorization", `Bearer ${opsAdmin.accessToken}`);
    expect(viewRes.status).toBe(200);

    // OPERATIONS_ADMIN lacks disputes.mediate so mutation routes return descriptive 403
    const evDeny = await request(app)
      .post(`/api/v1/disputes/${dispute.id}/evidence`)
      .set("Authorization", `Bearer ${opsAdmin.accessToken}`)
      .send({ statement: "Attempted unauthorized note" });
    expect(evDeny.status).toBe(403);
    expect(evDeny.body.error).toBe("FORBIDDEN");
    expect(typeof evDeny.body.message).toBe("string");
    expect(evDeny.body.message.length).toBeGreaterThan(15);

    const arbDeny = await request(app)
      .post(`/api/v1/disputes/${dispute.id}/arbitration`)
      .set("Authorization", `Bearer ${opsAdmin.accessToken}`);
    expect(arbDeny.status).toBe(403);
    expect(arbDeny.body.error).toBe("FORBIDDEN");
    expect(arbDeny.body.message).toMatch(/disputes\.mediate/i);
  });
});
