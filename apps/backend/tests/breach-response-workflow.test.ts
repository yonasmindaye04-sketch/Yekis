import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import type { Express } from "express";
import request from "supertest";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";

/**
 * The PDPP breach-response workflow.
 *
 * PDPP No. 1321/2024 requires significant data breaches to be reported to the
 * ECA within 72 hours. The previous implementation of `lib/breachAlert.ts`
 * wrote a single `logger.fatal` line and stopped: the SMS/Telegram dispatch
 * was commented out, there was no containment step, no user notification and
 * no report template. In practice a breach was a log line nobody was
 * guaranteed to read, and the 72-hour clock did not start.
 *
 * These tests pin the parts that can be automated:
 *
 *   1. CONTAIN — every active session belonging to an affected user is
 *      revoked, without touching the account or its financial records.
 *   2. NOTIFY STAFF — the incident reaches the people who can start the ECA
 *      filing, by SMS as well as in-app.
 *   3. NOTIFY USERS — affected users are told, one message each.
 *   4. FILE — a report template is produced with the PDPP-required fields
 *      filled in, so the human filing it starts from a complete list of
 *      questions rather than a blank page with a clock running.
 */

vi.mock("../src/queue/queues.js", () => ({
  autoReleaseQueue: { add: vi.fn().mockResolvedValue({ id: "job-1" }) },
  notificationQueue: { add: vi.fn().mockResolvedValue({ id: "notif-1" }) },
  kycRefreshQueue: { add: vi.fn().mockResolvedValue({ id: "kyc-1" }) },
  reviewRevealQueue: { add: vi.fn().mockResolvedValue({ id: "review-1" }) },
  featuredRefreshQueue: { add: vi.fn().mockResolvedValue({ id: "featured-1" }) },
  paymentReconcileQueue: { add: vi.fn().mockResolvedValue({ id: "pay-1" }) },
  tmsScanQueue: { add: vi.fn().mockResolvedValue({ id: "tms-1" }) },
  gigAutoReleaseQueue: { add: vi.fn().mockResolvedValue({ id: "gig-1" }) },
  auditPurgeQueue: { add: vi.fn().mockResolvedValue({ id: "purge-1" }) },
}));

const { notificationQueue } = await import("../src/queue/queues.js");
const { triggerBreachAlert } = await import("../src/lib/breachAlert.js");
const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");

const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);
  if (!ids.length) return;
  await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
  await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

async function makeUser(opts?: { staff?: boolean }) {
  const seq = userIds.length;
  const u = await prisma.user.create({
    data: {
      email: `breach-${seq}-${STAMP}@test.et`,
      phone: `+2516${String(50000000 + (STAMP % 9000000) + seq * 7)}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: opts?.staff ? "ADMIN" : null,
      sessionVersion: 3,
    } as never,
  });
  userIds.push(u.id);
  return u;
}

beforeEach(async () => {
  await cleanup();
  vi.mocked(notificationQueue.add).mockClear();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("opening a breach incident", () => {
  it("revokes the sessions of every affected user", async () => {
    const affected = await makeUser();
    const untouched = await makeUser();

    const outcome = await triggerBreachAlert({
      severity: "CRITICAL",
      description: "A credential file was exposed through an object-store misconfiguration.",
      affectedSystems: ["object-store"],
      dataCategories: ["identity", "financial"],
      affectedUserIds: [affected.id],
    });

    expect(outcome.containedUserCount).toBe(1);

    const after = await prisma.user.findUniqueOrThrow({
      where: { id: affected.id },
    });
    expect(after.sessionVersion).toBe(4);

    // A user who was not affected keeps their sessions.
    const other = await prisma.user.findUniqueOrThrow({
      where: { id: untouched.id },
    });
    expect(other.sessionVersion).toBe(3);
  });

  it("does not destroy the affected user's financial records while containing", async () => {
    const affected = await makeUser();
    await prisma.wallet.create({
      data: { userId: affected.id, balanceMinor: 250_000 },
    });

    await triggerBreachAlert({
      severity: "HIGH",
      description: "An export file containing personal data was left publicly readable.",
      affectedSystems: ["object-store"],
      affectedUserIds: [affected.id],
    });

    const wallet = await prisma.wallet.findUniqueOrThrow({
      where: { userId: affected.id },
    });
    expect(wallet.balanceMinor).toBe(250_000);
  });

  it("alerts the staff who can start the ECA filing, and starts the clock", async () => {
    const staff = await makeUser({ staff: true });

    const outcome = await triggerBreachAlert({
      severity: "CRITICAL",
      description: "A data exfiltration pattern was detected by the transaction monitor.",
      affectedSystems: ["api", "database"],
      estimatedUsersImpacted: 120,
    });

    // Staff are notified by the notification queue, with a type that is
    // classified critical so it also goes out over SMS.
    const staffCalls = vi
      .mocked(notificationQueue.add)
      .mock.calls.filter((call) => call[0] === "security-breach");
    expect(staffCalls.length).toBeGreaterThanOrEqual(1);
    const staffCall = staffCalls.find(
      (call) => (call[1] as { userId?: string })?.userId === staff.id,
    );
    expect(staffCall, "the staff account must be alerted").toBeTruthy();
    expect(
      (staffCall![1] as { message?: string })?.message,
    ).toContain("ECA notification deadline");

    // 72 hours from detection, and the clock is stated.
    const deadline = new Date(outcome.ecaNotificationDeadline).getTime();
    const detected = new Date(outcome.detectedAt).getTime();
    expect(deadline - detected).toBe(72 * 60 * 60 * 1000);
  });

  it("notifies each affected user individually", async () => {
    const first = await makeUser();
    const second = await makeUser();

    const outcome = await triggerBreachAlert({
      severity: "HIGH",
      description: "Chat attachments were exposed through a misconfigured bucket policy.",
      affectedSystems: ["object-store"],
      affectedUserIds: [first.id, second.id],
    });

    expect(outcome.notifiedUserCount).toBe(2);

    const userCalls = vi
      .mocked(notificationQueue.add)
      .mock.calls.filter(
        (call) =>
          call[0] === "security-breach" &&
          [first.id, second.id].includes(
            (call[1] as { userId?: string })?.userId ?? "",
          ),
      );
    expect(userCalls.length).toBe(2);
  });

  it("produces an ECA report with the fields the law asks for", async () => {
    const outcome = await triggerBreachAlert({
      severity: "CRITICAL",
      description: "A backup snapshot was exposed.",
      affectedSystems: ["object-store", "database"],
      estimatedUsersImpacted: 42,
      dataCategories: ["identity", "financial"],
    });

    const report = outcome.ecaReportTemplate;
    expect(report).toContain("ETHIOPIAN COMMUNICATIONS AUTHORITY");
    expect(report).toContain("No. 1321/2024");
    expect(report).toContain("A backup snapshot was exposed.");
    expect(report).toContain("object-store");
    expect(report).toContain("identity");
    expect(report).toContain("42");
    // The fields only a human can supply are clearly marked rather than
    // silently missing.
    expect(report).toContain("[TO COMPLETE:");
    expect(report).toContain("DPO");
  });

  it("records the incident in the audit trail", async () => {
    const affected = await makeUser();
    await triggerBreachAlert({
      severity: "HIGH",
      description: "A staff console session was used from an unexpected network.",
      affectedSystems: ["api"],
      affectedUserIds: [affected.id],
    });

    const incident = await prisma.auditLog.findFirst({
      where: { eventType: "SECURITY_BREACH_OPENED" },
      orderBy: { createdAt: "desc" },
    });
    expect(incident).toBeTruthy();
    expect(
      (incident!.metadata as Record<string, unknown>).ecaNotificationDeadline,
    ).toBeTruthy();
  });
});

describe("the incident can only be opened by the people who own it", () => {
  it("refuses a user with no staff role", async () => {
    const user = await makeUser();
    const session = await createAuthTokens(
      { id: user.id, role: "CLIENT", ucid: null },
      ["pwd"],
    );

    const res = await request(app)
      .post("/api/v1/admin/incidents/breach")
      .set("Authorization", `Bearer ${session.accessToken}`)
      .send({
        severity: "HIGH",
        description: "An attempt to open an incident without any authority.",
        affectedSystems: ["api"],
      });

    expect(res.status).toBe(403);
  });
});
