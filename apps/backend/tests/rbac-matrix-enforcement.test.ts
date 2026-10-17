import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";
import { hasPermission, ROLE_PERMISSIONS } from "../src/modules/admin/permissions.js";
import { createAuthTokens } from "../src/modules/auth/auth.service.js";

/**
 * The permission matrix is only real if the routes consult it.
 *
 * admin-rbac.test.ts asserts what each ROLE_PERMISSIONS entry contains, and it
 * passes. Meanwhile four dispute and gig routes spelled their own role lists
 * instead. Two of them move escrow, and both lists included COMPLIANCE_OFFICER
 * and COMPLIANCE_ADMIN — roles the matrix gives `disputes.mediate` but
 * deliberately withholds `disputes.resolve`. Compliance staff can review and
 * mediate; they should not decide who gets the money.
 *
 * A role list and a permission key look equivalent in review and are not. The
 * role list is a second, drifting copy of the policy: adding a role to the
 * matrix does nothing here, and removing one from it does nothing either. The
 * gig moderation route is the clearest case — a canonical copy at
 * POST /admin/gigs/:gigId/moderation already used requirePermission and
 * REFUSED exactly the roles the public duplicate accepted.
 *
 * These tests go over HTTP against the assembled app for each role, so they fail
 * if a route's guard stops matching the matrix.
 */

const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];

/** Roles that must NOT be able to settle money out of escrow. */
const MUST_NOT_RESOLVE = ["COMPLIANCE_OFFICER", "COMPLIANCE_ADMIN"];
/** Roles that must retain the power. */
const MUST_RESOLVE = ["DISPUTE_MEDIATOR", "ADMIN", "SUPER_ADMIN"];

/** Roles that must NOT be able to publish a gig (the only route to ACTIVE). */
const MUST_NOT_MODERATE = ["COMPLIANCE_OFFICER", "COMPLIANCE_ADMIN", "OPERATIONS_ADMIN"];
const MUST_MODERATE = ["ADMIN", "SUPER_ADMIN"];

const tokenFor = new Map<string, string>();
let gigId = "";
let phoneSeq = 0;

async function makeStaff(role: string): Promise<string> {
  // Counter, not a hash of the role name: COMPLIANCE_OFFICER and
  // COMPLIANCE_ADMIN share a first letter and collided on the unique phone.
  phoneSeq += 1;
  const created = await prisma.user.create({
    data: {
      email: `rbac8-${role.toLowerCase()}-${STAMP}@test.et`,
      phone: `+2519${String(10000000 + ((STAMP % 9000000) + phoneSeq * 17) % 9000000)}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: role,
      wallet: { create: { balanceMinor: 0 } },
    } as never,
  });
  userIds.push(created.id);

  const session = await createAuthTokens(
    { id: created.id, role: "CLIENT", ucid: null, staffRole: role },
    ["pwd"],
  );
  tokenFor.set(role, session.accessToken);
  return created.id;
}

beforeAll(async () => {
  const roles = new Set<string>([
    ...MUST_NOT_RESOLVE,
    ...MUST_RESOLVE,
    ...MUST_NOT_MODERATE,
    ...MUST_MODERATE,
  ]);
  for (const role of roles) await makeStaff(role);

  // Any gig id: the guards must run before the handler, so the body is never
  // reached and the fixture need not be a real gig.
  gigId = "rbac8-nonexistent-gig";
});

afterAll(async () => {
  const ids = userIds.splice(0, userIds.length);
  if (ids.length) {
    await prisma.$transaction([
      prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
      prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
      prisma.user.deleteMany({ where: { id: { in: ids } } }),
    ]);
  }
  await prisma.$disconnect();
});

/** 403 means a guard refused; 404 means it got through and the fixture was missing. */
async function postAs(role: string, path: string, body: unknown) {
  return request(app)
    .post(path)
    .set("Authorization", `Bearer ${tokenFor.get(role)}`)
    .send(body);
}

describe("the matrix is what the routes actually consult", () => {
  it("first asserts the premise: these roles genuinely lack the permission", () => {
    // If the matrix ever grants it, the route tests below become meaningless —
    // they would be asserting that a 403 is correct for a role that is
    // actually allowed.
    for (const role of MUST_NOT_RESOLVE) {
      expect(hasPermission(role, "disputes.resolve")).toBe(false);
      expect(ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS]).not.toContain(
        "disputes.resolve",
      );
    }
    for (const role of MUST_NOT_MODERATE) {
      expect(hasPermission(role, "gigs.moderate")).toBe(false);
    }
    for (const role of MUST_RESOLVE) {
      expect(hasPermission(role, "disputes.resolve")).toBe(true);
    }
  });

  it("refuses dispute settlement to roles that may only mediate", async () => {
    for (const role of MUST_NOT_RESOLVE) {
      const res = await postAs(role, "/api/v1/disputes/rbac8-nonexistent/resolve", {
        outcome: "RELEASE_TO_FREELANCER",
        recommendation: "Attempting to settle without the resolve permission.",
      });
      expect(
        res.status,
        `${role} must not be able to release escrow, got ${res.status}`,
      ).toBe(403);
      expect(res.body.error).toBe("PERMISSION_DENIED");
      expect(res.body.required).toBe("disputes.resolve");
    }
  });

  it("refuses an arbitration award to the same roles", async () => {
    // The second money-moving dispute route. It was the identical role list,
    // and it rewinds Stage 4 back to Stage 3 before settling, so it is the
    // higher-risk of the two.
    for (const role of MUST_NOT_RESOLVE) {
      const res = await postAs(role, "/api/v1/disputes/rbac8-nonexistent/arbitration-award", {
        aaccsaReference: "AACCSA/2026/RBAC8",
        outcome: "REFUND_TO_CLIENT",
        recommendation: "Attempting to award without the resolve permission.",
      });
      expect(res.status, `${role} must not apply an arbitration award`).toBe(403);
      expect(res.body.error).toBe("PERMISSION_DENIED");
    }
  });

  it("still lets the roles that hold disputes.resolve through the guard", async () => {
    // The control. Without it, 'everything is 403' would satisfy the tests
    // above for entirely the wrong reason.
    for (const role of MUST_RESOLVE) {
      const res = await postAs(role, "/api/v1/disputes/rbac8-nonexistent/resolve", {
        outcome: "RELEASE_TO_FREELANCER",
        recommendation: "Reaching the handler is the point here.",
      });
      expect(
        res.status,
        `${role} holds disputes.resolve and must pass the guard`,
      ).not.toBe(403);
    }
  });

  it("refuses gig moderation to roles without gigs.moderate", async () => {
    for (const role of MUST_NOT_MODERATE) {
      const res = await postAs(role, `/api/v1/gigs/${gigId}/moderation`, { status: "ACTIVE" });
      expect(
        res.status,
        `${role} must not be able to publish a gig, got ${res.status}`,
      ).toBe(403);
    }
  });

  it("still lets full-access roles moderate a gig", async () => {
    for (const role of MUST_MODERATE) {
      const res = await postAs(role, `/api/v1/gigs/${gigId}/moderation`, { status: "ACTIVE" });
      expect(res.status, `${role} holds gigs.moderate and must pass the guard`).not.toBe(403);
    }
  });

  it("refuses gig dispute settlement to roles that may only mediate", async () => {
    for (const role of MUST_NOT_RESOLVE) {
      const res = await postAs(role, "/api/v1/gigs/disputes/rbac8-nonexistent/resolve", {
        outcome: "RELEASE_TO_FREELANCER",
        recommendation: "Attempting to settle a gig dispute without permission.",
      });
      expect(res.status, `${role} must not settle a gig dispute`).toBe(403);
    }
  });

  it("refuses a weak-auth session even with the right permission", async () => {
    // Step-up. A session minted from a stolen Telegram initData carries a weak
    // `amr` and must not be able to move escrow, however senior the role.
    const { createAuthTokens: mint } = await import("../src/modules/auth/auth.service.js");
    const mediatorId = (await prisma.user.findFirst({
      where: { staffRole: "DISPUTE_MEDIATOR", email: { contains: String(STAMP) } },
      select: { id: true },
    }))!.id;

    const weak = await mint(
      { id: mediatorId, role: "CLIENT", ucid: null, staffRole: "DISPUTE_MEDIATOR" },
      ["tg_miniapp"],
    );

    const res = await request(app)
      .post("/api/v1/disputes/rbac8-nonexistent/resolve")
      .set("Authorization", `Bearer ${weak.accessToken}`)
      .send({ outcome: "RELEASE_TO_FREELANCER", recommendation: "Weak auth attempt." });

    // 403, not 401: the two failures are deliberately distinct so a client can
    // tell them apart. REAUTH_REQUIRED (401) means "sign in again";
    // STEP_UP_REQUIRED (403) means "recent but weak — add a strong factor".
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("STEP_UP_REQUIRED");
  });
});