import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { buildApp } from "../src/app.js";
import { listRoutes, routeKey, type RouteEntry } from "../src/testing/routeInventory.js";
import { auditRoutes } from "../src/testing/routeAudit.js";
import { BASELINE_PUBLIC_ROUTES } from "./fixtures/publicRoutes.js";
import { UNAUTHENTICATED_BY_DESIGN } from "./fixtures/unauthenticatedByDesign.js";

/**
 * T0.1 — the route inventory must actually see the routes.
 *
 * `listRoutes` reads Express 4 internals. If a dependency upgrade changes
 * `app._router`, the failure mode is an EMPTY inventory, which would make every
 * replay assertion pass vacuously. This suite exists to prevent that silent
 * no-op: it asserts a non-trivial count and that known mounts were recovered
 * with their full paths.
 */
/** Built once at module scope so both describe blocks can assert on it. */
const app = buildApp();
const routes = listRoutes(app);

describe("T0.1 route inventory", () => {
  it("finds a plausible number of routes", () => {
    expect(routes.length).toBeGreaterThan(80);
  });

  it("recovers full mounted paths, not bare sub-router paths", () => {
    const paths = routes.map((r) => r.path);

    // Mounted under app.use("/api/v1/auth", authRouter).
    expect(paths).toContain("/api/v1/auth/telegram/miniapp");
    expect(paths).toContain("/api/v1/auth/telegram/web-login/start");
    expect(paths).toContain("/api/v1/auth/refresh");
    expect(paths).toContain("/api/v1/auth/me");

    // Mounted under app.use("/api/v1/escrow", escrowRouter).
    expect(paths).toContain("/api/v1/escrow/wallet/withdraw");

    // Raw-body routers mounted before express.json().
    expect(paths).toContain("/api/v1/telegram/webhook");

    // A bare app.get.
    expect(paths).toContain("/health");
  });

  it("includes both the method and every HTTP verb a router registers", () => {
    const keyed = new Set(routes.map((r) => `${r.method} ${r.path}`));
    expect(keyed.has("GET /api/v1/jobs")).toBe(true);
    expect(keyed.has("POST /api/v1/jobs")).toBe(true);
    expect(keyed.has("DELETE /api/v1/auth/telegram/link")).toBe(true);
    expect(keyed.has("POST /api/v1/auth/telegram/link")).toBe(true);
  });

  it("keeps Express path parameters intact", () => {
    const paths = routes.map((r) => r.path);
    expect(paths, "jobId param").toContain("/api/v1/jobs/:jobId");
    expect(paths, "sid param").toContain("/api/v1/auth/telegram/web-login/:sid/status");
    // Express wildcard params must survive too, or the audit would replay a
    // path the router would never match.
    expect(paths, "wildcard param").toContain("/api/v1/chat/attachments/:key(*)");
  });

  it("records the handler chain so protected routes are identifiable", () => {
    const me = routes.find((r) => r.path === "/api/v1/auth/me" && r.method === "GET");
    expect(me).toBeDefined();
    // requireAuth is in the chain for a protected route...
    expect(me!.guards.join(",")).toContain("requireAuth");

    const health = routes.find((r) => r.path === "/health");
    // ...and absent for a public one.
    expect(health?.guards.join(",") ?? "").not.toContain("requireAuth");
  });

  it("returns no duplicate method+path pairs", () => {
    const keys = routes.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("is deterministic across calls", () => {
    expect(listRoutes(buildApp())).toEqual(routes);
  });
});

describe("T0.1 CI gate", () => {
  const baseline = new Set(routes.map(routeKey));

  function audit(overrides: Partial<Parameters<typeof auditRoutes>[0]> = {}) {
    return auditRoutes({
      routes,
      publicRoutes: BASELINE_PUBLIC_ROUTES,
      unauthenticatedByDesign: UNAUTHENTICATED_BY_DESIGN,
      baseline,
      ...overrides,
    });
  }

  it("passes on the current inventory", () => {
    const result = audit();
    expect(result.problems).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("CATCHES a new route mounted without any access-control guard", () => {
    // The negative control. Without this, a gate that always returns ok would
    // look identical to a working one.
    const withBackdoor: RouteEntry[] = [
      ...routes,
      {
        method: "GET",
        path: "/api/v1/admin/secret-export",
        routerPath: "/secret-export",
        handlerCount: 1,
        guards: ["handleRequest"],
      },
    ];

    const result = audit({ routes: withBackdoor });
    expect(result.ok).toBe(false);
    expect(result.added).toContain("GET /api/v1/admin/secret-export");
    expect(result.problems.join("\n")).toMatch(
      /NEW unauthenticated route: GET \/api\/v1\/admin\/secret-export/,
    );
  });

  it("allows a new route once it carries requireAuth", () => {
    const withGuarded: RouteEntry[] = [
      ...routes,
      {
        method: "GET",
        path: "/api/v1/admin/new-report",
        routerPath: "/new-report",
        handlerCount: 2,
        guards: ["requireStaffRole", "handleRequest"],
      },
    ];
    const result = audit({ routes: withGuarded });
    expect(result.problems).toEqual([]);
    // Still surfaced as a diff, so adding a route is always visible in review.
    expect(result.added).toContain("GET /api/v1/admin/new-report");
  });

  it("fails when an allowlist entry no longer matches a route", () => {
    const result = audit({
      publicRoutes: new Set([...BASELINE_PUBLIC_ROUTES, "GET /api/v1/gone"]),
    });
    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toMatch(
      /public-route allowlist entry no longer exists: GET \/api\/v1\/gone/,
    );
  });

  it("fails when a route disappears from the live inventory", () => {
    // Simulates a route being deleted: it is still in the committed baseline
    // but no longer mounted, which is an unreviewed change to the attack
    // surface even though it is not a hole.
    const fewer = routes.filter((r) => routeKey(r) !== "GET /api/v1/jobs");
    const result = audit({ routes: fewer });
    expect(result.ok).toBe(false);
    expect(result.removed).toContain("GET /api/v1/jobs");
    expect(result.problems.join("\n")).toMatch(
      /route removed since baseline: GET \/api\/v1\/jobs/,
    );
  });

  it("fails when no baseline exists at all", () => {
    const result = audit({ baseline: null });
    expect(result.ok).toBe(false);
    expect(result.problems.join("\n")).toMatch(/No route baseline/);
  });

  it("ships a committed baseline that matches the live inventory", () => {
    // Guards against docs/hardening/route-baseline.json drifting from reality.
    const onDisk = JSON.parse(
      readFileSync(
        resolve(process.cwd(), "..", "..", "docs", "hardening", "route-baseline.json"),
        "utf8",
      ),
    ) as { routes: string[] };

    expect(new Set(onDisk.routes)).toEqual(baseline);
  });
});
