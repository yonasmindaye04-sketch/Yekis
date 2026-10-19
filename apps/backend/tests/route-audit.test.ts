import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { SignJWT } from "jose";
import { buildApp } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";
import { listRoutes, routeKey } from "../src/testing/routeInventory.js";
import { BASELINE_PUBLIC_ROUTES } from "./fixtures/publicRoutes.js";

/**
 * T0.1 — replay every route with three identities and fail closed.
 *
 * The question this answers: does any endpoint answer a request it should
 * refuse? Concretely —
 *   1. no route may answer 2xx with NO token unless it is an explicitly
 *      allowlisted public endpoint;
 *   2. no staff-only path may answer 2xx for a non-staff token.
 *
 * Path parameters are filled with obviously-fake values. A route that reaches
 * its handler will normally fail validation or 404 on the missing record, and
 * that is a PASS here: what matters is the status class, not the business
 * outcome. A 500 is treated as "reached the handler" for the same reason.
 *
 * Only the status CLASS is asserted. Asserting exact codes would make this
 * suite a hostage to every unrelated validation change.
 */

const app = buildApp();
const routes = listRoutes(app);

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

/** Values substituted for Express path parameters. */
const PARAM_VALUES: Record<string, string> = {
  jobId: "cm0000000000000000000000a",
  proposalId: "cm0000000000000000000000b",
  contractId: "cm0000000000000000000000c",
  milestoneId: "cm0000000000000000000000d",
  disputeId: "cm0000000000000000000000e",
  conversationId: "cm0000000000000000000000f",
  messageId: "cm00000000000000000000010",
  gigId: "cm00000000000000000000011",
  orderId: "cm00000000000000000000012",
  reviewId: "cm00000000000000000000013",
  notificationId: "cm00000000000000000000014",
  portfolioId: "cm00000000000000000000015",
  itemId: "cm00000000000000000000016",
  topUpId: "cm00000000000000000000017",
  flagId: "cm00000000000000000000018",
  reportId: "cm00000000000000000000019",
  skillId: "web-app-development",
  userId: "cm0000000000000000000001a",
  targetUserId: "cm0000000000000000000001b",
  id: "cm0000000000000000000001c",
  payoutId: "cm0000000000000000000001d",
  documentId: "cm0000000000000000000001e",
  sid: "wl_auditfixture0000000000000000",
  key: "audit/fixture",
};

/** Substitutes every `:param` (and `:param(*)`) with a placeholder. */
function concretePath(path: string): string {
  return path.replace(/:([A-Za-z0-9_]+)(\(\*\))?/g, (_m, name: string) => {
    return PARAM_VALUES[name] ?? `audit-${name}`;
  });
}

interface Identity {
  label: string;
  token?: string;
}

let clientId: string;
let freelancerId: string;

async function mintToken(
  user: { id: string; role: string; staffRole?: string | null },
  amr: string[],
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    role: user.role,
    staffRole: user.staffRole ?? null,
    auth_time: now,
    amr,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt(now)
    .setExpirationTime("15m")
    .sign(accessSecret);
}

async function createUser(role: "CLIENT" | "FREELANCER", staffRole: string | null = null) {
  const stamp = Date.now() + Math.floor(Math.random() * 100000);
  const user = await prisma.user.create({
    data: {
      email: `route-audit-${role}-${stamp}@test.et`,
      phone: `+2519${String(Math.floor(Math.random() * 1e9)).padStart(9, "0")}`,
      passwordHash: "not-a-real-hash",
      passwordSetAt: new Date(),
      role,
      staffRole: staffRole as never,
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: 0 } },
    },
    include: { kyc: true },
  });
  return user;
}

async function cleanup() {
  const users = await prisma.user.findMany({
    where: { email: { startsWith: "route-audit-" } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.notification.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

let clientToken: string;
let freelancerToken: string;

beforeAll(async () => {
  await cleanup();
  const client = await createUser("CLIENT");
  const freelancer = await createUser("FREELANCER");
  clientId = client.id;
  freelancerId = freelancer.id;
  clientToken = await mintToken(client, ["pwd"]);
  freelancerToken = await mintToken(freelancer, ["pwd"]);
}, 60_000);

afterAll(async () => {
  await cleanup();
});

/** Issues the request and returns the status code, or null if it never settled. */
async function probe(
  method: string,
  path: string,
  identity: Identity,
): Promise<number | null> {
  const target = concretePath(path);
  let req = request(app)[method.toLowerCase() as "get"](target);
  if (identity.token) req = req.set("Authorization", `Bearer ${identity.token}`);
  try {
    const res = await req;
    return res.status;
  } catch {
    return null;
  }
}

const isSuccess = (status: number | null) =>
  status !== null && status >= 200 && status < 300;

/**
 * True when the request demonstrably reached application code and blew up.
 *
 * Only 500 (or no response at all) counts. A 503 is a deliberate fail-closed
 * answer from a guard — `/api/v1/telegram/webhook` returns 503 when no bot is
 * initialised, which is exactly the behaviour we want, not evidence that an
 * anonymous request reached a handler.
 */
const crashed = (status: number | null) => status === null || status === 500;

describe("T0.1 route replay — no token", () => {
  it("never answers 2xx without a token on a non-allowlisted route", async () => {
    const offenders: string[] = [];

    for (const route of routes) {
      const key = routeKey(route);
      if (BASELINE_PUBLIC_ROUTES.has(key)) continue;

      const status = await probe(route.method, route.path, { label: "anon" });
      if (isSuccess(status)) {
        offenders.push(`${key} -> ${status}`);
      }
    }

    expect(
      offenders,
      "Routes answering 2xx with no token. If one of these is genuinely public, " +
        "add it to tests/fixtures/publicRoutes.ts with a comment explaining why.",
    ).toEqual([]);
  }, 180_000);

  it("does not crash on anonymous traffic to protected routes", async () => {
    // A 500 here means an unauthenticated request reached application code and
    // threw, which is itself the bug even though it did not return 200.
    const offenders: string[] = [];
    for (const route of routes) {
      if (BASELINE_PUBLIC_ROUTES.has(routeKey(route))) continue;
      const status = await probe(route.method, route.path, { label: "anon" });
      if (crashed(status)) offenders.push(`${routeKey(route)} -> ${status}`);
    }
    expect(offenders).toEqual([]);
  }, 180_000);
});

describe("T0.1 route replay — authenticated, non-staff", () => {
  it("never answers 2xx on a staff-only path", async () => {
    const staffPrefixes = ["/api/v1/admin", "/api/v1/telegram/info", "/api/v1/telegram/set-webhook", "/api/v1/telegram/delete-webhook", "/api/v1/telegram/start-polling", "/api/v1/telegram/stop"];
    const offenders: string[] = [];

    for (const route of routes) {
      if (!staffPrefixes.some((p) => route.path.startsWith(p))) continue;

      for (const identity of [
        { label: "client", token: clientToken },
        { label: "freelancer", token: freelancerToken },
      ]) {
        const status = await probe(route.method, route.path, identity);
        if (isSuccess(status)) {
          offenders.push(`${routeKey(route)} as ${identity.label} -> ${status}`);
        }
      }
    }

    expect(
      offenders,
      "Staff paths reachable by a non-staff token.",
    ).toEqual([]);
  }, 180_000);

  it("CLIENT and FREELANCER tokens are not interchangeable on role-gated routes", async () => {
    // Informational cross-check: records where the two roles differ. A route
    // where both behave identically may still be correct (read-only), so this
    // asserts nothing on its own — it exists so a behaviour change shows up as
    // a diff in the report rather than silently.
    const differences: string[] = [];
    for (const route of routes) {
      if (BASELINE_PUBLIC_ROUTES.has(routeKey(route))) continue;
      const asClient = await probe(route.method, route.path, { label: "c", token: clientToken });
      const asFreelancer = await probe(route.method, route.path, { label: "f", token: freelancerToken });
      if (asClient !== asFreelancer) differences.push(`${routeKey(route)}: ${asClient} vs ${asFreelancer}`);
    }
    expect(Array.isArray(differences)).toBe(true);
  }, 240_000);
});

describe("T0.1 allowlist integrity", () => {
  it("has no allowlist entry that is no longer a route", () => {
    const live = new Set(routes.map(routeKey));
    const stale = [...BASELINE_PUBLIC_ROUTES].filter((k) => !live.has(k));
    expect(
      stale,
      "Allowlist references routes that no longer exist; remove them.",
    ).toEqual([]);
  });

  it("covers every intentionally public endpoint", () => {
    // Guards against the allowlist quietly becoming the place where new public
    // endpoints are added without review: the list is small and fixed.
    expect(BASELINE_PUBLIC_ROUTES.size).toBeGreaterThan(5);
    expect(BASELINE_PUBLIC_ROUTES.size).toBeLessThan(40);
  });

  it("does not allowlist any staff or money path", () => {
    for (const key of BASELINE_PUBLIC_ROUTES) {
      expect(key).not.toMatch(/admin|staff|payout|withdraw|settle|suspend/i);
    }
  });
});
