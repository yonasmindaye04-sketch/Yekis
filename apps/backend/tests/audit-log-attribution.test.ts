import { afterAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";
import { reviewKycRecord } from "../src/modules/kyc/kyc.service.js";
import { recordAuditEvent } from "../src/lib/audit.js";
import { getUserSummary } from "../src/modules/admin/usersContracts.service.js";

/**
 * Audit attribution & query coverage: verifies that admin/staff actions log the
 * staff actor in `AuditLog.userId` (and system jobs log `actorRole: "SYSTEM"`),
 * while `getUserActivity()` and `GET /api/v1/admin/audit-logs?userId=` surface
 * actions targeting that user via `entityId` and `metadata.targetUserId`.
 */
const app: Express = buildApp();
const STAMP = Date.now();
const cleanup = { userIds: [] as string[], kycIds: [] as string[] };

afterAll(async () => {
  if (cleanup.userIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: cleanup.userIds } },
          { entityId: { in: [...cleanup.userIds, ...cleanup.kycIds] } },
        ],
      },
    });
    await prisma.kycReviewEvent.deleteMany({
      where: { kycRecordId: { in: cleanup.kycIds } },
    });
    await prisma.kycRecord.deleteMany({ where: { userId: { in: cleanup.userIds } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: cleanup.userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: cleanup.userIds } } });
  }
});

describe("AuditLog actor attribution & targetUserId reader queries", () => {
  it("exposes staff KYC reviews and system targetUserId alerts in both getUserActivity and GET /admin/audit-logs?userId=", async () => {
    const admin = await prisma.user.create({
      data: {
        email: `audit-admin-${STAMP}@test.et`,
        phone: `+25191${String(1000000 + (STAMP % 900000))}`,
        passwordHash: "hash",
        role: "CLIENT",
        staffRole: "SUPER_ADMIN",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    const subject = await prisma.user.create({
      data: {
        email: `audit-subj-${STAMP}@test.et`,
        phone: `+25192${String(1000000 + (STAMP % 900000))}`,
        passwordHash: "hash",
        role: "FREELANCER",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    cleanup.userIds.push(admin.id, subject.id);

    const kyc = await prisma.kycRecord.create({
      data: {
        userId: subject.id,
        tier: "TIER_2",
        status: "UNDER_REVIEW",
      },
    });
    cleanup.kycIds.push(kyc.id);

    await reviewKycRecord({
      targetUserId: subject.id,
      staffUserId: admin.id,
      decision: "VERIFIED",
    });

    await recordAuditEvent({
      actorRole: "SYSTEM",
      eventType: "KYC_PERIODIC_REVIEW_TRIGGERED",
      entityType: "KycRecord",
      entityId: kyc.id,
      metadata: { targetUserId: subject.id },
    });

    const activity = await getUserSummary(subject.id);
    expect(activity?.recentAudit.map((a) => a.eventType)).toEqual(
      expect.arrayContaining(["KYC_MANUALLY_VERIFIED", "KYC_PERIODIC_REVIEW_TRIGGERED"]),
    );

    const session = await createAuthTokens(
      { id: admin.id, role: "CLIENT", ucid: null, staffRole: "SUPER_ADMIN" },
      ["pwd"],
    );
    const res = await request(app)
      .get(`/api/v1/admin/audit-logs?userId=${subject.id}`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .expect(200);

    expect(res.body.items.map((a: { eventType: string }) => a.eventType)).toEqual(
      expect.arrayContaining(["KYC_MANUALLY_VERIFIED", "KYC_PERIODIC_REVIEW_TRIGGERED"]),
    );
  });
});
