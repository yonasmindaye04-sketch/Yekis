import { afterAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * OPS-12 — KYC manual verification & rejection must log the reviewing staff
 * member (`staffUserId` + `actorRole`) as the AuditLog actor, never the KYC
 * applicant.
 */
const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];
const auditIds: string[] = [];

afterAll(async () => {
  if (auditIds.length > 0) {
    await prisma.auditLog.deleteMany({ where: { id: { in: auditIds } } });
  }
  if (userIds.length > 0) {
    await prisma.kycReviewEvent.deleteMany({ where: { staffUserId: { in: userIds } } });
    await prisma.kycRecord.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

describe("OPS-12: KYC audit log records staff actor, not applicant", () => {
  it("credits reviewing staff member as userId + actorRole on VERIFIED and REJECTED", async () => {
    const staff = await prisma.user.create({
      data: {
        email: `ops12-staff-${STAMP}@test.et`,
        phone: `+25198${String(1000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "CLIENT",
        staffRole: "COMPLIANCE_ADMIN",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    const applicant = await prisma.user.create({
      data: {
        email: `ops12-applicant-${STAMP}@test.et`,
        phone: `+25198${String(2000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "FREELANCER",
        wallet: { create: { balanceMinor: 0 } },
        kyc: { create: { tier: "TIER_1", status: "UNDER_REVIEW", documentNumber: "FAYDA-123" } },
      } as never,
      include: { kyc: true },
    });
    userIds.push(staff.id, applicant.id);

    const session = await createAuthTokens(
      { id: staff.id, role: "CLIENT", ucid: null },
      ["pwd"],
    );

    const approveRes = await request(app)
      .post(`/api/v1/kyc/${applicant.id}/review`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ decision: "VERIFIED" });
    expect(approveRes.status).toBe(200);

    const verifyAudit = await prisma.auditLog.findFirstOrThrow({
      where: {
        eventType: "KYC_MANUALLY_VERIFIED",
        entityId: applicant.kyc!.id,
      },
      orderBy: { createdAt: "desc" },
    });
    auditIds.push(verifyAudit.id);
    expect(verifyAudit.userId).toBe(staff.id);
    expect(verifyAudit.userId).not.toBe(applicant.id);
    expect(verifyAudit.actorRole).toBe("COMPLIANCE_ADMIN");
    expect((verifyAudit.metadata as Record<string, unknown>)?.targetUserId).toBe(applicant.id);

    const rejectRes = await request(app)
      .post(`/api/v1/kyc/${applicant.id}/review`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({ decision: "REJECTED", rejectionReason: "Blurry identity document" });
    expect(rejectRes.status).toBe(200);

    const rejectAudit = await prisma.auditLog.findFirstOrThrow({
      where: {
        eventType: "KYC_REJECTED",
        entityId: applicant.kyc!.id,
      },
      orderBy: { createdAt: "desc" },
    });
    auditIds.push(rejectAudit.id);
    expect(rejectAudit.userId).toBe(staff.id);
    expect(rejectAudit.actorRole).toBe("COMPLIANCE_ADMIN");
  });
});
