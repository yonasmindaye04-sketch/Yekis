// === IMPORTS ===
import type { Express, Router } from "express";

/**
 * Enumerates every Express route in an application, with the full mounted path.
 *
 * The route table is the authoritative list of what this API exposes, and it is
 * built at runtime from ~20 routers. There is no static list to review, which
 * is exactly how an endpoint ends up mounted without an auth middleware and
 * nobody notices. This walks the live stack instead.
 *
 * Uses Express 4 internals (`app._router.stack`). Those are not public API and
 * could change on a major upgrade — hence the assertion in the test suite that
 * catches it loudly rather than silently returning an empty inventory (an empty
 * inventory would make the whole audit vacuous).
 */

// === INTERFACES & TYPES ===
export interface RouteEntry {
  method: string;
  /** Fully mounted path, e.g. `/api/v1/auth/telegram/miniapp`. */
  path: string;
  /** Path as written on the sub-router, e.g. `/telegram/miniapp`. */
  routerPath: string;
  /** Number of handler layers, including auth middleware. */
  handlerCount: number;
  /**
   * Best-effort guess at whether the route is protected, based on handler
   * names. A heuristic, and only ever used to prioritise review — the replay in
   * tests/route-audit.test.ts is what actually proves behaviour.
   */
  guards: string[];
}

// Minimal structural types for Express 4's internals.
interface Layer {
  name: string;
  route?: {
    path: string | string[];
    methods: Record<string, boolean>;
    stack: { name: string; handle: { name?: string } }[];
  };
  handle?: {
    stack?: Layer[];
  };
  regexp?: RegExp;
  matchers?: unknown[];
}

/**
 * Recovers the mount prefix from the RegExp Express compiled for a layer.
 *
 * `app.use("/api/v1/jobs", jobsRouter)` compiles to /^\/api\/v1\/jobs\/?(?=\/|$)/i
 * and `app.use(express.json())` produces a matcher with `fast_slash`.
 */
function mountPathOf(layer: Layer): string {
  if (!layer.regexp) return "";
  // A bare middleware (`express.json()`, cors, …) matches everything.
  if ((layer as { fast_slash?: boolean }).fast_slash) return "";
  if (layer.matchers && layer.matchers.length > 0 && !layer.regexp.source.includes("\\/")) {
    return "";
  }

  let src = layer.regexp.source;
  if (src === "^\\/?(?=\\/|$)" || src === "^\\/*$") return "/";
  // Unescape FIRST, then drop the `^` anchor. Doing it the other way round
  // leaves `^\/api` as `//api` once the backslashes are replaced.
  src = src.replace(/\\\//g, "/");
  src = src.replace(/^\^/, "");
  // Trailing optional-slash + end-of-path assertion added by path-to-regexp.
  src = src.replace(/\/\?\(\?=\/\|\$\)$/, "");
  src = src.replace(/\$$/, "");
  return src === "/" ? "" : src;
}

function methodsOf(route: NonNullable<Layer["route"]>): string[] {
  return Object.entries(route.methods)
    .filter(([, enabled]) => enabled)
    .map(([method]) => method.toUpperCase())
    // Express registers HEAD alongside GET; replaying both is redundant.
    .filter((m) => m !== "HEAD");
}

function normalisePath(path: string | string[]): string {
  const value = Array.isArray(path) ? path[0]! : path;
  return value === "/" ? "/" : value.replace(/\/$/, "");
}

/**
 * Whether a middleware layer looks like an access-control gate.
 *
 * Used only to inherit guards from a router-level `router.use(requireAuth, …)`,
 * which otherwise would not appear in any individual route's handler stack and
 * would make every route in that router look unprotected.
 */
function looksLikeGuard(name: string): boolean {
  return /^(require|optional|auth|staff)/i.test(name);
}

/**
 * Joins a mount prefix and a sub-router path into one canonical path.
 *
 * A router mounted at "/api/v1/jobs" that declares `router.get("/")` is the
 * route `GET /api/v1/jobs`, not `/api/v1/jobs/` — the trailing slash Express
 * accepts implicitly would otherwise make the inventory disagree with the
 * documented URL and defeat the allowlist comparison.
 */
function joinPath(prefix: string, routerPath: string): string {
  if (!prefix) return routerPath === "/" ? "/" : routerPath;
  const tail = routerPath === "/" ? "" : routerPath;
  const joined = `${prefix}${tail}`;
  return joined === "" ? "/" : joined;
}

function walk(
  stack: Layer[],
  prefix: string,
  out: RouteEntry[],
  inherited: string[] = [],
): void {
  for (const layer of stack) {
    if (layer.route) {
      for (const method of methodsOf(layer.route)) {
        const routerPath = normalisePath(layer.route.path);
        out.push({
          method,
          path: joinPath(prefix, routerPath),
          routerPath,
          handlerCount: layer.route.stack.length,
          // Router-level gates first, then this route's own chain.
          guards: [
            ...inherited,
            ...layer.route.stack.map((s) => s.handle?.name ?? s.name).filter(Boolean),
          ],
        });
      }
      continue;
    }
    // A mounted sub-router or another middleware with its own stack.
    if (layer.handle?.stack) {
      const mount = mountPathOf(layer);
      // Joins with exactly one slash regardless of which side supplies it:
      // `"" + "/api/v1"` and `"/api/v1" + ""` must both give "/api/v1".
      const next =
        mount === "" || mount === "/"
          ? prefix
          : `${prefix.replace(/\/$/, "")}/${mount.replace(/^\//, "")}`;
      walk(layer.handle.stack, next, out, inherited);
      continue;
    }
    // Plain middleware applied to every route below it in this router.
    const name = layer.name;
    if (name && looksLikeGuard(name)) inherited.push(name);
  }
}

// === MAIN FUNCTIONS ===
/**
 * Returns every route in the app, sorted for stable diffs.
 *
 * @param app the Express application (from `buildApp()`)
 */
export function listRoutes(app: Express): RouteEntry[] {
  const router = (app as unknown as { _router?: { stack: Layer[] } })._router;
  if (!router?.stack) {
    throw new Error(
      "listRoutes could not read app._router.stack — Express internals changed. " +
        "The route audit would silently cover nothing, so this fails loudly instead.",
    );
  }
  const out: RouteEntry[] = [];
  walk(router.stack, "", out);
  return out.sort((a, b) =>
    a.path === b.path ? a.method.localeCompare(b.method) : a.path.localeCompare(b.path),
  );
}

export function routeKey(entry: Pick<RouteEntry, "method" | "path">): string {
  return `${entry.method} ${entry.path}`;
}
