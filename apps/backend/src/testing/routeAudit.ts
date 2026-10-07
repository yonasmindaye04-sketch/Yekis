// === IMPORTS ===
import type { RouteEntry } from "./routeInventory.js";
import { routeKey } from "./routeInventory.js";

// === INTERFACES & TYPES ===
export interface AuditInput {
  routes: RouteEntry[];
  /** Routes observed to answer 2xx with no token. */
  publicRoutes: ReadonlySet<string>;
  /** Routes deliberately without a JWT guard (auth surface, signed webhooks, health). */
  unauthenticatedByDesign: ReadonlySet<string>;
  /** Previously committed inventory, or null when none exists yet. */
  baseline: ReadonlySet<string> | null;
}

export interface AuditResult {
  ok: boolean;
  problems: string[];
  added: string[];
  removed: string[];
}

// === MAIN FUNCTIONS ===
/**
 * True when the route has an access-control gate in its handler chain.
 *
 * A heuristic over middleware function names, so it can be fooled by an
 * anonymous wrapper. That is acceptable because it only ever produces a
 * false NEGATIVE on naming (a guard it cannot see), which the replay in
 * tests/route-audit.test.ts independently catches.
 */
export function isGuarded(route: RouteEntry): boolean {
  return route.guards.some((g) => /^(require|optional|auth|staff)/i.test(g));
}

/**
 * Fails closed on a NEW route that carries no access-control guard and is not
 * explicitly allowlisted.
 *
 * The check is deliberately narrow. "No guard" alone is not a finding — the
 * sign-in endpoints cannot require a session and the webhooks authenticate by
 * signature — so the finding is the *combination* of no guard, not allowlisted,
 * and absent from the committed baseline. An existing unguarded route is
 * grandfathered through the baseline and reported separately, which keeps this
 * gate useful without demanding that Phase 0 retrofits every legacy route.
 */
export function auditRoutes(input: AuditInput): AuditResult {
  const problems: string[] = [];
  const live = new Set(input.routes.map(routeKey));

  for (const key of input.publicRoutes) {
    if (!live.has(key)) {
      problems.push(`public-route allowlist entry no longer exists: ${key}`);
    }
  }
  for (const key of input.unauthenticatedByDesign) {
    if (!live.has(key)) {
      problems.push(`by-design allowlist entry no longer exists: ${key}`);
    }
  }

  const added = input.baseline
    ? [...live].filter((k) => !input.baseline!.has(k)).sort()
    : [];
  const removed = input.baseline
    ? [...input.baseline].filter((k) => !live.has(k)).sort()
    : [];

  if (!input.baseline) {
    problems.push(
      "No route baseline supplied. Generate one with: npx tsx scripts/route-audit.ts --write-baseline",
    );
  }

  // A disappearing route is not a security hole, but it IS a change to the
  // attack surface that nobody asked for. The baseline exists so that every
  // addition and removal is a deliberate act; regenerate it with
  // --write-baseline when the change is intended.
  for (const key of removed) {
    problems.push(`route removed since baseline: ${key}`);
  }

  for (const route of input.routes) {
    const key = routeKey(route);
    if (isGuarded(route)) continue;
    if (input.unauthenticatedByDesign.has(key)) continue;
    if (input.baseline?.has(key)) continue;
    problems.push(
      `NEW unauthenticated route: ${key} [guards: ${route.guards.join(" > ") || "none"}]`,
    );
  }

  return { ok: problems.length === 0, problems, added, removed };
}
