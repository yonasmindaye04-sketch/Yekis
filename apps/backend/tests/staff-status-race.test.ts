import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { prisma } from "../src/lib/prisma.js";
import { adminRouter } from "../src/modules/admin/admin.routes.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * Suspending a staff account.
 *
 * What this file can and cannot prove is stated up front, because getting that
 * wrong is how a green suite ends up guarding nothing.
 *
 * The old handler did three separate statements: count the remaining active
 * admins, update the target, bump sessionVersion. Two concurrent suspensions
 * of the last two admins could both read "there is one other admin", both pass
 * the count, and both commit -- leaving the platform with no working
 * administrator and no error anywhere.
 *
 * The count and the update now share one transaction that takes FOR UPDATE row
 * locks on the candidate admins.
 *
 * The race itself is NOT exercised by a behavioural test, and that is a
 * deliberate limitation rather than an oversight. The suite shares one database
 * with every other file, several of which create ADMIN accounts. The guard is
 * global ("are there any active full-access admins left"), so with other admins
 * present both concurrent suspensions are legitimately allowed to succeed, and
 * any assertion about "the last admin" would pass or fail depending on what
 * neighbouring suites happened to leave behind. An earlier draft of this file
 * did exactly that and produced a test that failed for reasons unrelated to the
 * handler. The structural guarantee is pinned by a source lock instead.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const ROUTES_SRC = readFileSync(
  join(HERE, "..", "src", "modules", "admin", "admin.routes.ts"),
  "utf8",
);

/**
 * The staff-status handler and nothing else.
 *
 * Matching against the whole file produced two false results before this was
 * scoped: a neighbouring route has its own `reason: z.string().min(5).optional()`
 * (the payout settle failure reason, which is legitimately optional), and a
 * slice anchored on the error class name picked up the class declaration rather
 * than the handler.
 */
const HANDLER_START = ROUTES_SRC.indexOf('"/staff/:userId/status"');
const HANDLER_END = ROUTES_SRC.indexOf("adminRouter.", HANDLER_START + 40);
const HANDLER_SRC = ROUTES_SRC.slice(HANDLER_START, HANDLER_END === -1 ? undefined : HANDLER_END);

const STAMP = Date.now();
const REASON = "Rotating the on-call administrator after the security audit.";
const ids: string[] = [];
let phoneSeq = 0;

async function makeAdmin(label: string, staffRole = "ADMIN") {
  phoneSeq += 1;
  const u = await prisma.user.create({
    data: {
      email: `staff-status-${label}-${STAMP}-${phoneSeq}@test.et`,
      phone: `+2519${String(82000000 + (STAMP % 1000) * 100 + phoneSeq)}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole,
      isSuspended: false,
      kyc: { create: { tier: "TIER_1", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  ids.push(u.id);
  return u.id;
}

async function asAdmin(actorId: string) {
  const { accessToken } = await createAuthTokens(
    { id: actorId, role: "CLIENT", staffRole: "ADMIN", ucid: null, sessionVersion: 0 },
    ["pwd"],
  );
  const app = express();
  app.use(express.json());
  app.use("/api/v1/admin", adminRouter);
  return { app, token: accessToken };
}

afterAll(async () => {
  const all = ids.length ? ids : ["__none__"];
  await prisma.auditLog.deleteMany({ where: { userId: { in: all } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: all } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: all } } });
  await prisma.user.deleteMany({ where: { id: { in: all } } });
});

describe("suspending a staff account (behaviour)", () => {
  it("refuses to let a staff member suspend themselves", async () => {
    const a = await makeAdmin("self");
    const { app, token } = await asAdmin(a);
    const res = await request(app)
      .post(`/api/v1/admin/staff/${a}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suspended: true, reason: REASON });
    expect(res.status).toBe(409);

    const unchanged = await prisma.user.findUniqueOrThrow({ where: { id: a } });
    expect(unchanged.isSuspended).toBe(false);
  });

  it("requires a substantive reason, so a suspension is never unexplained", async () => {
    const a = await makeAdmin("reason-actor");
    const b = await makeAdmin("reason-target");
    const { app, token } = await asAdmin(a);

    const tooShort = await request(app)
      .post(`/api/v1/admin/staff/${b}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suspended: true, reason: "busy" });
    expect(tooShort.status).toBe(400);

    const missing = await request(app)
      .post(`/api/v1/admin/staff/${b}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suspended: true });
    expect(missing.status).toBe(400);

    const whitespaceOnly = await request(app)
      .post(`/api/v1/admin/staff/${b}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suspended: true, reason: "                    " });
    expect(whitespaceOnly.status).toBe(400);

    // And the target is untouched by any of the rejected calls.
    const target = await prisma.user.findUniqueOrThrow({ where: { id: b } });
    expect(target.isSuspended).toBe(false);
  });

  it("accepts a real reason and changes the status", async () => {
    const a = await makeAdmin("ok-actor");
    const b = await makeAdmin("ok-target");
    const { app, token } = await asAdmin(a);

    const res = await request(app)
      .post(`/api/v1/admin/staff/${b}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suspended: true, reason: REASON });
    expect(res.status).toBe(200);
    expect(res.body.isSuspended).toBe(true);
  });

  it("bumps sessionVersion so the suspension is immediate, not cosmetic", async () => {
    const a = await makeAdmin("sess-actor");
    const b = await makeAdmin("sess-target");
    const { app, token } = await asAdmin(a);

    const before = await prisma.user.findUniqueOrThrow({ where: { id: b } });
    const res = await request(app)
      .post(`/api/v1/admin/staff/${b}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suspended: true, reason: REASON });
    expect(res.status).toBe(200);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: b } });
    expect(after.isSuspended).toBe(true);
    // Without this, the target keeps working until their old token expires.
    expect(after.sessionVersion).toBe(before.sessionVersion + 1);
  });

  it("records the reason on the audit trail", async () => {
    const a = await makeAdmin("audit-actor");
    const b = await makeAdmin("audit-target");
    const { app, token } = await asAdmin(a);

    await request(app)
      .post(`/api/v1/admin/staff/${b}/status`)
      .set("Authorization", `Bearer ${token}`)
      .send({ suspended: true, reason: REASON });

    const entry = await prisma.auditLog.findFirst({
      where: { entityId: b, eventType: "STAFF_SUSPENDED" },
      orderBy: { createdAt: "desc" },
    });
    expect(entry).not.toBeNull();
    expect((entry!.metadata as { reason?: string })?.reason).toBe(REASON);
  });
});

describe("LOCK (source text) — the last-admin guard cannot be made to zero", () => {
  /**
   * Structural, not behavioural, for the reason set out at the top of the file:
   * the invariant is global and this suite shares a database with suites that
   * create admins, so the race is only observable when this file is the only
   * thing creating them. A lock keeps the shape honest; it does not pretend to
   * have run the race.
   */
  it("locks the candidate admins with FOR UPDATE before counting them", () => {
    expect(HANDLER_SRC).toMatch(/FOR UPDATE/);
  });

  it("does not merely count with a plain count() inside the guard", () => {
    // The old code counted without locking, which is the bug.
    expect(HANDLER_SRC).not.toMatch(/\.count\(\{/);
  });

  it("runs the status change and the session bump in one transaction", () => {
    expect(HANDLER_SRC).toMatch(/isolationLevel:\s*"Serializable"/);
    // Both the update and the session invalidation live inside the transaction
    // callback, i.e. before the transaction closes.
    const txStart = HANDLER_SRC.indexOf("prisma.$transaction");
    const txClose = HANDLER_SRC.indexOf("{ isolationLevel");
    expect(txStart).toBeGreaterThan(-1);
    expect(txClose).toBeGreaterThan(txStart);
    const body = HANDLER_SRC.slice(txStart, txClose);
    expect(body).toMatch(/tx\.user\.update\(/);
    expect(body).toMatch(/sessionVersion/);
  });

  it("no longer accepts a missing or short reason", () => {
    expect(HANDLER_SRC).toMatch(/reason:\s*z\s*$|reason:\s*z\.string\(\)/m);
    expect(HANDLER_SRC).toMatch(/min\(20/);
    expect(HANDLER_SRC).not.toMatch(/reason:\s*z\.string\(\)\.min\(5\)/);
  });
});