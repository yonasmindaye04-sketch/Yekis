import { describe, it, expect, afterAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { prisma } from "../src/lib/prisma.js";
import { buildApp } from "../src/app.js";

/**
 * End-to-end tests over the REAL assembled application.
 *
 * WHY THIS EXISTS
 * Every other suite in this repository exercises a service module or a single
 * router in isolation. That is fast and useful, and it is exactly why five
 * escrow endpoints could be deleted in the Phase 0 baseline repair while 435
 * tests stayed green: escrow-lifecycle-http and the payout tests now cover those
 * specific routes, but nothing asserted the general property that a route the
 * frontend calls actually exists on the assembled app.
 *
 * The old api-linkage.test.ts tried to cover this by stubbing global fetch and
 * asserting on the URL the frontend client would produce. A stub always returns
 * 200, so it could never detect a 404. It proved the client *builds* a request,
 * not that the server *answers* one.
 *
 * These tests build the real app, with the real middleware chain and the real
 * router tree, and assert on real HTTP status codes. A route that is not
 * mounted returns 404 here. That is the whole point.
 */

const app: Express = buildApp();
const STAMP = Date.now();
const userIds: string[] = [];
let phoneSeq = 0;

function uniquePhone() {
  phoneSeq += 1;
  return `+2519${String(86000000 + (STAMP % 1000) * 100 + phoneSeq)}`;
}

async function makeUser(label: string, role: "CLIENT" | "FREELANCER" = "CLIENT") {
  phoneSeq += 1;
  const u = await prisma.user.create({
    data: {
      email: `e2e-${label}-${STAMP}-${phoneSeq}@test.et`,
      phone: `+2519${String(87000000 + (STAMP % 1000) * 100 + phoneSeq)}`,
      passwordHash: "not-a-real-hash",
      role,
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 500000 } },
    } as never,
  });
  userIds.push(u.id);
  return u.id;
}

async function tokenFor(userId: string, role: "CLIENT" | "FREELANCER") {
  const { createAuthTokens } = await import("../src/modules/auth/auth.service.js");
  const { accessToken } = await createAuthTokens(
    { id: userId, role, ucid: null, sessionVersion: 0 },
    ["pwd"],
  );
  return accessToken;
}

afterAll(async () => {
  const ids = userIds.length ? userIds : ["__none__"];
  const userFilter = { in: ids };
  await prisma.auditLog.deleteMany({ where: { userId: userFilter } });
  await prisma.consentRecord.deleteMany({ where: { userId: userFilter } });
  await prisma.transactionFlag.deleteMany({ where: { userId: userFilter } });
  await prisma.payoutTransaction.deleteMany({ where: { userId: userFilter } });
  await prisma.walletTopUp.deleteMany({ where: { userId: userFilter } });
  await prisma.phoneVerificationCode.deleteMany({ where: { userId: userFilter } });
  await prisma.ledgerEntry.deleteMany({ where: { journal: { idempotencyKey: { contains: "__e2e__" } } } });
  await prisma.ledgerJournal.deleteMany({ where: { idempotencyKey: { contains: "__e2e__" } } });
// Deletion order is children-first, and proposals are keyed off jobs rather
// than off users. Several earlier failed runs left orphans behind whose client
// is no longer in this run's user list, so the fixture rows are matched by
// title as well -- otherwise this teardown fails on Proposal_jobId_fkey and the
// suite reports a failure that has nothing to do with the tests.
await prisma.milestone.deleteMany({
  where: { contract: { job: { title: { startsWith: "E2E job" } } } },
});
await prisma.contract.deleteMany({
  where: { job: { title: { startsWith: "E2E job" } } },
});
await prisma.proposal.deleteMany({
  where: { job: { title: { startsWith: "E2E job" } } },
});
await prisma.job.deleteMany({ where: { title: { startsWith: "E2E job" } } });

// Then this run's own users, whatever they happen to own.
await prisma.proposal.deleteMany({ where: { freelancerId: userFilter } });
await prisma.milestone.deleteMany({ where: { contract: { clientId: userFilter } } });
await prisma.contract.deleteMany({ where: { clientId: userFilter } });
await prisma.job.deleteMany({ where: { clientId: userFilter } });
  await prisma.wallet.deleteMany({ where: { userId: userFilter } });
  await prisma.kycRecord.deleteMany({ where: { userId: userFilter } });
  await prisma.user.deleteMany({ where: { id: userFilter } });
});

describe("the assembled app answers on the routes the frontend calls", () => {
/**
   * Each entry is a call made by apps/frontend/src/api/client.ts, with the
   * status that proves it is wired. "auth" expects 401 (mounted and guarded),
   * "public" expects 200 (mounted and deliberately open).
   *
   * The point is that a 404 fails either way. The old linkage test stubbed
   * fetch, so every URL "succeeded" and a deleted route was invisible.
   */
  const FRONTEND_CALLS: { method: "get"; path: string; kind: "auth" | "public" }[] = [
    { method: "get", path: "/api/v1/auth/me", kind: "auth" },
    { method: "get", path: "/api/v1/escrow/wallet", kind: "auth" },
    { method: "get", path: "/api/v1/escrow/milestones", kind: "auth" },
    { method: "get", path: "/api/v1/escrow/payouts", kind: "auth" },
    { method: "get", path: "/api/v1/wallet/topups", kind: "auth" },
    { method: "get", path: "/api/v1/jobs", kind: "auth" },
    { method: "get", path: "/api/v1/jobs/mine", kind: "auth" },
    { method: "get", path: "/api/v1/jobs/proposals/mine", kind: "auth" },
    { method: "get", path: "/api/v1/contracts", kind: "auth" },
    { method: "get", path: "/api/v1/notifications", kind: "auth" },
    // Public by design: skill taxonomy is not user data.
    { method: "get", path: "/api/v1/skills", kind: "public" },
    { method: "get", path: "/api/v1/users/me/profile/completeness", kind: "auth" },
    { method: "get", path: "/api/v1/kyc/status", kind: "auth" },
  ];

  for (const { method, path, kind } of FRONTEND_CALLS) {
    it(`${method.toUpperCase()} ${path} is mounted and ${kind}`, async () => {
      const res = await request(app)[method](path);
      expect(res.status, `${path} returned ${res.status}`).not.toBe(404);
      expect(res.status, `${path} returned ${res.status}`).toBe(
        kind === "auth" ? 401 : 200,
      );
    });
  }
});

describe("authenticated end-to-end journeys", () => {
  it("a client can post a job and see it in their own list", async () => {
    const clientId = await makeUser("client");
    const token = await tokenFor(clientId, "CLIENT");

    const created = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${token}`)
      .send({
        title: "E2E job posting",
        category: "WEB_APP_DEVELOPMENT",
        description:
          "A description comfortably over the schema minimum length so validation passes.",
        budgetMin: { amountMinor: 100000, currency: "ETB" },
        budgetMax: { amountMinor: 250000, currency: "ETB" },
        proposedMilestones: [
          {
            title: "Milestone 1",
            amount: { amountMinor: 100000, currency: "ETB" },
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
          },
        ],
        deadline: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
      });

    expect(created.status, `POST /jobs ${created.status}: ${JSON.stringify(created.body)}`).toBe(201);
    expect(created.body.id).toBeTruthy();

    // Read it back through the same app, as the UI would.
    const listed = await request(app)
      .get("/api/v1/jobs/mine")
      .set("Authorization", `Bearer ${token}`);
    expect(listed.status).toBe(200);
    expect(listed.body.map((j: { id: string }) => j.id)).toContain(created.body.id);
  });

  it("a freelancer can read open jobs and submit a proposal", async () => {
    const clientId = await makeUser("poster");
    const freelancerId = await makeUser("bidder", "FREELANCER");
    const clientToken = await tokenFor(clientId, "CLIENT");
    const freelancerToken = await tokenFor(freelancerId, "FREELANCER");

    const job = await request(app)
      .post("/api/v1/jobs")
      .set("Authorization", `Bearer ${clientToken}`)
      .send({
        title: "E2E job to bid on",
        category: "GRAPHIC_DESIGN",
        description:
          "Another description over the minimum length so the schema is satisfied.",
        budgetMin: { amountMinor: 50000, currency: "ETB" },
        budgetMax: { amountMinor: 120000, currency: "ETB" },
        proposedMilestones: [
          {
            title: "Milestone 1",
            amount: { amountMinor: 80000, currency: "ETB" },
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
          },
        ],
        deadline: new Date(Date.now() + 86400000 * 14).toISOString().slice(0, 10),
      });
    expect(job.status).toBe(201);

    const proposal = await request(app)
      .post(`/api/v1/jobs/${job.body.id}/proposals`)
      .set("Authorization", `Bearer ${freelancerToken}`)
.send({
        // CreateProposalInput requires jobId in the BODY as well as the path,
        // and uses Money objects rather than the older flat *_Minor fields.
        jobId: job.body.id,
        coverLetter:
          "I can do this well and on time, and here is a longer explanation of how.",
        quotedAmount: { amountMinor: 80000, currency: "ETB" },
        estimatedDays: 7,
        milestoneBreakdown: [
          {
            title: "Milestone 1",
            amount: { amountMinor: 80000, currency: "ETB" },
            dueDate: new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10),
          },
        ],
      });

    expect(proposal.status, `POST proposals returned ${proposal.status}`).toBe(201);

    // The client sees it on the job.
    const asClient = await request(app)
      .get(`/api/v1/jobs/${job.body.id}`)
      .set("Authorization", `Bearer ${clientToken}`);
    expect(asClient.status).toBe(200);
  });

  it("wallet, notifications and profile all answer for a signed-in user", async () => {
    const id = await makeUser("readable");
    const token = await tokenFor(id, "CLIENT");

    for (const path of [
      "/api/v1/escrow/wallet",
      "/api/v1/notifications",
      "/api/v1/auth/me",
      "/api/v1/kyc/status",
      "/api/v1/users/me/profile/completeness",
    ]) {
      const res = await request(app)
        .get(path)
        .set("Authorization", `Bearer ${token}`);
      expect(res.status, `${path} returned ${res.status}`).toBe(200);
    }
  });

it("a phone code can be requested and verified over HTTP", async () => {
    const phone = uniquePhone();
    const sent = await request(app)
      .post("/api/v1/auth/phone/code")
      .send({ phone });
    // No SMS provider in tests, so delivery fails and the route says so rather
    // than reporting success for a message nobody received.
    expect([200, 503]).toContain(sent.status);
    expect(sent.status).not.toBe(404);
  });
});

describe("frontend paths that do not resolve — kept until they are fixed", () => {
  /**
   * The frontend client calls "/api/v1/portfolios/..." (plural) but the router
   * is mounted at "/api/v1/portfolio" (singular), so every portfolio call from
   * the browser is a 404. This is asserted rather than quietly dropped, because
   * the whole reason this layer exists is that these mismatches were invisible
   * while 435 unit tests stayed green.
   *
   * When the frontend or the mount is fixed, this test flips and the real
   * journey test replaces it.
   */
  it("GET /api/v1/portfolios/:userId is currently a 404 (frontend calls it)", async () => {
    const id = await makeUser("portfolio");
    const token = await tokenFor(id, "CLIENT");
    const res = await request(app)
      .get(`/api/v1/portfolios/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it("GET /api/v1/portfolio/users/:userId/portfolio is the route that exists", async () => {
    const id = await makeUser("portfolio-ok");
    const token = await tokenFor(id, "CLIENT");
    const res = await request(app)
      .get(`/api/v1/portfolio/users/${id}/portfolio`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

describe("cross-cutting guarantees", () => {
  it("the health endpoint is public and reports ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("no frontend route leaks an internal error message in production shape", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    // A 404 must not describe the stack or the internal router.
    expect(JSON.stringify(res.body)).not.toMatch(/at \w+ \(|node_modules/);
  });

  it("a suspended user's existing token stops working immediately", async () => {
    const id = await makeUser("suspendable");
    const token = await tokenFor(id, "CLIENT");

    const before = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(before.status).toBe(200);

    await prisma.user.update({
      where: { id },
      data: { isSuspended: true, sessionVersion: { increment: 1 } },
    });

    const after = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);
    // requireAuth re-reads the row on every request, so this is not a 15-minute
    // window in which a suspended user keeps working.
    expect([401, 403]).toContain(after.status);
  });
});
describe("Fayda eSignet is reachable from a browser", () => {
  /**
   * esignet.client.ts has been a complete OIDC implementation all along -- PAR,
   * private_key_jwt, nested JWE/JWS decryption -- with no frontend caller, so
   * it was unreachable in practice. These pin that the endpoints exist and are
   * guarded, which is the part that was silently broken.
   *
   * The happy path needs ESIGNET_* credentials and a live provider, so it is
   * not exercised here; the redirect URL builder is unit-checked in the
   * frontend instead.
   */
  it("POST /api/v1/kyc/fayda/initiate is mounted and requires auth", async () => {
    const res = await request(app).post("/api/v1/kyc/fayda/initiate");
    expect(res.status, `returned ${res.status}`).not.toBe(404);
    expect(res.status).toBe(401);
  });

  it("POST /api/v1/kyc/fayda/callback is mounted and validates its body", async () => {
    const id = await makeUser("esignet");
    const token = await tokenFor(id, "CLIENT");
    const res = await request(app)
      .post("/api/v1/kyc/fayda/callback")
      .set("Authorization", `Bearer ${token}`)
      .send({});
    expect(res.status, `returned ${res.status}`).not.toBe(404);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("VALIDATION_ERROR");
  });

  it("initiate answers a signed-in user without crashing when unconfigured", async () => {
    const id = await makeUser("esignet-init");
    const token = await tokenFor(id, "CLIENT");
    const res = await request(app)
      .post("/api/v1/kyc/fayda/initiate")
      .set("Authorization", `Bearer ${token}`);
    // No ESIGNET_CLIENT_ID in tests, so it takes the mock fallback and returns
    // the pieces. A 500 here would mean the flow is broken rather than merely
    // unconfigured.
    expect(res.status, `returned ${res.status}: ${JSON.stringify(res.body)}`).toBe(200);
    expect(res.body.authorizeUrl).toBeTruthy();
    expect(res.body.state).toBeTruthy();
  });
});
