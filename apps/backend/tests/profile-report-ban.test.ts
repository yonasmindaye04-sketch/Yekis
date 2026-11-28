import { afterAll, describe, expect, it } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * OPS-06 — Resolving a profile report as RESOLVED_PROFILE_BANNED must
 * atomically suspend the reported user and invalidate active sessions under
 * `profiles.moderate` without requiring `users.suspend`.
 */
const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];
const reportIds: string[] = [];

afterAll(async () => {
  if (reportIds.length > 0) {
    await prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entityId: { in: reportIds } },
          { entityId: { in: userIds } },
        ],
      },
    });
    await prisma.profileReport.deleteMany({ where: { id: { in: reportIds } } });
  }
  if (userIds.length > 0) {
    await prisma.wallet.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }
  await prisma.$disconnect();
});

describe("OPS-06: transactional profile ban + account suspension under profiles.moderate", () => {
  it("COMPLIANCE_ADMIN banning a reported user suspends their account, bumps sessionVersion, and logs both audits", async () => {
    const staff = await prisma.user.create({
      data: {
        email: `ops06-staff-${STAMP}@test.et`,
        phone: `+25198${String(3000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "CLIENT",
        staffRole: "COMPLIANCE_ADMIN",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    const reporter = await prisma.user.create({
      data: {
        email: `ops06-reporter-${STAMP}@test.et`,
        phone: `+25198${String(4000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "CLIENT",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    const target = await prisma.user.create({
      data: {
        email: `ops06-target-${STAMP}@test.et`,
        phone: `+25198${String(5000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "FREELANCER",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(staff.id, reporter.id, target.id);

    const report = await prisma.profileReport.create({
      data: {
        reporterId: reporter.id,
        reportedUserId: target.id,
        reason: "OFF_PLATFORM_CONTACT",
        details: "Off-platform escrow bypass attempt",
        status: "PENDING",
      },
    });
    reportIds.push(report.id);

    const session = await createAuthTokens(
      { id: staff.id, role: "CLIENT", ucid: null },
      ["pwd"],
    );
    const targetSession = await createAuthTokens(
      { id: target.id, role: "FREELANCER", ucid: null },
      ["pwd"],
    );

    const res = await request(app)
      .patch(`/api/v1/staff/reports/${report.id}`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        status: "RESOLVED_PROFILE_BANNED",
        staffNotes: "Confirmed fraudulent payment solicitation.",
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("RESOLVED_PROFILE_BANNED");
    expect(res.body.accountSuspended).toBe(true);

    const updatedTarget = await prisma.user.findUniqueOrThrow({
      where: { id: target.id },
      select: { isSuspended: true, sessionVersion: true },
    });
    expect(updatedTarget.isSuspended).toBe(true);
    expect(updatedTarget.sessionVersion).toBeGreaterThanOrEqual(1);

    // Existing refresh token for banned user must immediately fail
    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: targetSession.refreshToken });
    expect(refreshRes.status).toBe(401);
    expect(refreshRes.body.error).toBe("INVALID_REFRESH_TOKEN");

    const [suspendAudit, reportAudit] = await Promise.all([
      prisma.auditLog.findFirst({
        where: { eventType: "USER_SUSPENDED", entityId: target.id, userId: staff.id },
      }),
      prisma.auditLog.findFirst({
        where: { eventType: "RESOLVE_REPORT", entityId: report.id, userId: staff.id },
      }),
    ]);
    expect(suspendAudit).toBeTruthy();
    expect(reportAudit).toBeTruthy();
  });

  it("refuses suspending a staff target and rolls back the report update", async () => {
    const actor = await prisma.user.create({
      data: {
        email: `ops06-actor2-${STAMP}@test.et`,
        phone: `+25198${String(6000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "CLIENT",
        staffRole: "COMPLIANCE_ADMIN",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    const reporter = await prisma.user.create({
      data: {
        email: `ops06-rep2-${STAMP}@test.et`,
        phone: `+25198${String(7000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "CLIENT",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    const staffTarget = await prisma.user.create({
      data: {
        email: `ops06-starget-${STAMP}@test.et`,
        phone: `+25198${String(8000000 + (STAMP % 900000))}`,
        passwordHash: "not-a-real-hash",
        role: "CLIENT",
        staffRole: "SUPPORT",
        wallet: { create: { balanceMinor: 0 } },
      } as never,
    });
    userIds.push(actor.id, reporter.id, staffTarget.id);

    const report = await prisma.profileReport.create({
      data: {
        reporterId: reporter.id,
        reportedUserId: staffTarget.id,
        reason: "OFFENSIVE_CONTENT",
        details: "Test report targeting staff user",
        status: "PENDING",
      },
    });
    reportIds.push(report.id);

    const session = await createAuthTokens(
      { id: actor.id, role: "CLIENT", ucid: null },
      ["pwd"],
    );

    const res = await request(app)
      .patch(`/api/v1/staff/reports/${report.id}`)
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        status: "RESOLVED_PROFILE_BANNED",
        staffNotes: "Attempt to ban a staff account via report",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("CANNOT_SUSPEND_STAFF");

    const unchangedReport = await prisma.profileReport.findUniqueOrThrow({
      where: { id: report.id },
    });
    expect(unchangedReport.status).toBe("PENDING");

    const unchangedStaff = await prisma.user.findUniqueOrThrow({
      where: { id: staffTarget.id },
    });
    expect(unchangedStaff.isSuspended).toBe(false);
  });
});
