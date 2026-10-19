#!/usr/bin/env tsx
/**
 * T0.1 — route inventory, replay and CI gate.
 *
 *   npx tsx scripts/route-audit.ts                 # print the route table
 *   npx tsx scripts/route-audit.ts --json          # machine-readable
 *   npx tsx scripts/route-audit.ts --guards        # show the middleware chain
 *   npx tsx scripts/route-audit.ts --write-baseline
 *   npx tsx scripts/route-audit.ts --check         # CI gate
 *
 * `--check` exits 1 when any of these hold:
 *   1. a route has no access-control guard in its chain, is not in
 *      UNAUTHENTICATED_BY_DESIGN, and is not in the committed baseline —
 *      i.e. somebody added an unauthenticated route;
 *   2. an allowlist entry refers to a route that no longer exists;
 *   3. a route present in the committed baseline has disappeared.
 *
 * It also prints a diff of the live inventory against the baseline so adding a
 * route is always a visible review, never a silent change.
 *
 * NOTE ON SCOPE: this static check cannot prove a route behaves correctly —
 * "no requireAuth" does not distinguish a deliberate public endpoint from a
 * forgotten middleware. The authoritative check is tests/route-audit.test.ts,
 * which replays all 165 routes with three real identities against a real
 * database and asserts the responses. Run both.
 */
import fs from "node:fs";
import path from "node:path";
import { buildApp } from "../src/app.js";
import { listRoutes, routeKey, type RouteEntry } from "../src/testing/routeInventory.js";
import { auditRoutes, isGuarded } from "../src/testing/routeAudit.js";
import { BASELINE_PUBLIC_ROUTES } from "../tests/fixtures/publicRoutes.js";
import { UNAUTHENTICATED_BY_DESIGN } from "../tests/fixtures/unauthenticatedByDesign.js";

const args = new Set(process.argv.slice(2));

const BASELINE_PATH = path.resolve(
  process.cwd(),
  "..",
  "..",
  "docs",
  "hardening",
  "route-baseline.json",
);

/** True when the route has an access-control gate in its handler chain. */
/** True when the route has an access-control gate in its handler chain. */
function readBaseline(): Set<string> | null {
  if (!fs.existsSync(BASELINE_PATH)) return null;
  const parsed = JSON.parse(fs.readFileSync(BASELINE_PATH, "utf8")) as {
    routes: string[];
  };
  return new Set(parsed.routes);
}

function printTable(routes: RouteEntry[]): void {
  const width = Math.max(...routes.map((r) => routeKey(r).length));
  process.stdout.write(`\n${routes.length} routes\n\n`);
  for (const r of routes) {
    const tags: string[] = [];
    if (BASELINE_PUBLIC_ROUTES.has(routeKey(r))) tags.push("public");
    if (!isGuarded(r)) tags.push(UNAUTHENTICATED_BY_DESIGN.has(routeKey(r)) ? "no-guard(by design)" : "NO GUARD");
    if (r.guards.includes("requireFreshAuth")) tags.push("step-up");
    process.stdout.write(
      `  ${routeKey(r).padEnd(width)}  ${tags.join(", ")}\n`,
    );
  }
  process.stdout.write("\n");
}

function main(): number {
  const app = buildApp();
  const routes = listRoutes(app);
  const live = new Set(routes.map(routeKey));

  if (args.has("--json")) {
    process.stdout.write(`${JSON.stringify(routes, null, 2)}\n`);
    return 0;
  }

  if (args.has("--guards")) {
    for (const r of routes) {
      process.stdout.write(`${routeKey(r).padEnd(48)}  ${r.guards.join(" > ")}\n`);
    }
    return 0;
  }

  if (args.has("--write-baseline")) {
    fs.mkdirSync(path.dirname(BASELINE_PATH), { recursive: true });
    fs.writeFileSync(
      BASELINE_PATH,
      `${JSON.stringify(
        {
          $comment:
            "Committed route inventory. Regenerate with: npx tsx scripts/route-audit.ts --write-baseline",
          generatedAt: new Date().toISOString(),
          count: routes.length,
          routes: [...live].sort(),
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
    process.stdout.write(`Wrote ${routes.length} routes to ${BASELINE_PATH}\n`);
    return 0;
  }

  printTable(routes);

  if (!args.has("--check")) return 0;

  const result = auditRoutes({
    routes,
    publicRoutes: BASELINE_PUBLIC_ROUTES,
    unauthenticatedByDesign: UNAUTHENTICATED_BY_DESIGN,
    baseline: readBaseline(),
  });

  if (result.added.length || result.removed.length) {
    process.stdout.write(
      `Route inventory changed (${result.added.length} added, ${result.removed.length} removed):\n`,
    );
    for (const k of result.added) process.stdout.write(`  + ${k}\n`);
    for (const k of result.removed) process.stdout.write(`  - ${k}\n`);
    process.stdout.write("\n");
  }

  if (!result.ok) {
    process.stderr.write(
      `\nRoute audit FAILED (${result.problems.length} problem(s)):\n`,
    );
    for (const p of result.problems) process.stderr.write(`  - ${p}\n`);
    process.stderr.write("\n");
    return 1;
  }

  process.stdout.write("Route audit passed.\n");
  return 0;
}

process.exit(main());
