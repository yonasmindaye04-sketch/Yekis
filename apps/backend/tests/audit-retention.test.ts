import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { recordAuditEvent } from "../src/lib/audit.js";
import { env } from "../src/config/env.js";

/**
 * Audit-log retention.
 *
 * The Roadmap requires "immutable audit log, 10-year retention". The table
 * was append-only by convention and had NO retention column and NO purge job:
 * nothing tied a row to the moment it became deletable, and nothing ever
 * deleted anything. Ten years of statutory record-keeping with no expiry is
 * not a retention policy — it is an unbounded table.
 *
 * Two properties matter and both are tested here:
 *
 *   1. Every row carries its own expiry, so "when may this be deleted?" is a
 *      property of the row and not a question about the table.
 *   2. The purge refuses to delete a row that is not actually ten years old.
 *      That floor lives in SQL rather than in the application on purpose: a
 *      misconfigured retention period must not be able to shorten a statutory
 *      obligation.
 */

const STAMP = Date.now();

async function cleanup() {
  await prisma.auditLog.deleteMany({
    where: { eventType: "AUDIT_RETENTION_TEST" },
  });
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("every audit row carries its own retention expiry", () => {
  it("stamps the row with the configured retention period", async () => {
    const before = Date.now();
    const row = await recordAuditEvent({
      eventType: "AUDIT_RETENTION_TEST",
      entityType: "AuditLog",
      entityId: "retention-probe",
    });

    expect(row.retentionUntil).toBeInstanceOf(Date);

    const years =
      (row.retentionUntil.getTime() - row.createdAt.getTime()) /
      (365.25 * 24 * 60 * 60 * 1000);
    expect(years).toBeGreaterThan(env.AUDIT_RETENTION_YEARS - 0.01);
    expect(years).toBeLessThan(env.AUDIT_RETENTION_YEARS + 0.01);

    // And the default really is ten years.
    expect(env.AUDIT_RETENTION_YEARS).toBe(10);
    expect(row.retentionUntil.getTime()).toBeGreaterThan(before);
  });
});

describe("the purge deletes only what is genuinely expired", () => {
  it("refuses to delete a row that is not ten years old, however it is stamped", async () => {
    // A row whose expiry stamp says "now" — as a misconfigured retention
    // period would produce — but which is only seconds old. The SQL floor
    // must hold it.
    await prisma.auditLog.create({
      data: {
        eventType: "AUDIT_RETENTION_TEST",
        entityType: "AuditLog",
        entityId: "too-young",
        createdAt: new Date(),
        retentionUntil: new Date(Date.now() - 60_000),
      },
    });

    const [{ purged }] = await prisma.$queryRaw<
      Array<{ purged: bigint }>
    >`SELECT purge_expired_audit_logs(1000) AS purged`;
    expect(Number(purged)).toBe(0);

    const survivor = await prisma.auditLog.findFirst({
      where: { entityId: "too-young" },
    });
    expect(survivor, "a young row must survive regardless of its stamp").toBeTruthy();
  });

  it("deletes a row that is past both its stamp and the ten-year floor", async () => {
    const elevenYearsAgo = new Date(
      Date.now() - 11 * 365.25 * 24 * 60 * 60 * 1000,
    );
    await prisma.auditLog.create({
      data: {
        eventType: "AUDIT_RETENTION_TEST",
        entityType: "AuditLog",
        entityId: "old-enough",
        createdAt: elevenYearsAgo,
        retentionUntil: new Date(elevenYearsAgo.getTime() + 10 * 365.25 * 24 * 60 * 60 * 1000),
      },
    });

    const [{ purged }] = await prisma.$queryRaw<
      Array<{ purged: bigint }>
    >`SELECT purge_expired_audit_logs(1000) AS purged`;
    expect(Number(purged)).toBeGreaterThanOrEqual(1);

    const survivor = await prisma.auditLog.findFirst({
      where: { entityId: "old-enough" },
    });
    expect(survivor).toBeNull();
  });

  it("keeps a row that is old but not yet past its own stamp", async () => {
    // Eleven years old, but the stamp says it is still within retention. The
    // stamp is the authority; the floor only ever extends the life of a row.
    const elevenYearsAgo = new Date(
      Date.now() - 11 * 365.25 * 24 * 60 * 60 * 1000,
    );
    await prisma.auditLog.create({
      data: {
        eventType: "AUDIT_RETENTION_TEST",
        entityType: "AuditLog",
        entityId: "not-yet",
        createdAt: elevenYearsAgo,
        retentionUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    await prisma.$queryRaw`SELECT purge_expired_audit_logs(1000) AS purged`;

    const survivor = await prisma.auditLog.findFirst({
      where: { entityId: "not-yet" },
    });
    expect(survivor).toBeTruthy();
  });
});
