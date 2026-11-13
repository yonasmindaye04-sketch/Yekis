// === STATIC SITE SERVING ===
//
// Serves the built Single Page Application from the API process, so that the
// SPA and the API share one origin, one port and one TLS certificate.
//
// WHY THIS EXISTS
// ---------------
// The Telegram Mini App opens the platform inside a webview and refuses to
// load a page from an origin other than the one it was opened with. The
// frontend already calls its own origin (`VITE_API_BASE_URL` is unset, so
// every request is relative to `/api/v1`), which means one origin is not a
// convenience here — it is the difference between the Mini App working and
// not working at all.
//
// WHY THE API'S SECURITY HEADERS ARE NOT APPLIED HERE
// ---------------------------------------------------
// `app.ts` gives the API a strict JSON-only policy: `default-src 'none'`,
// `frame-ancestors 'none'` and `X-Frame-Options: DENY`. That policy is right
// for a JSON service and catastrophic for an HTML document — `default-src
// 'none'` blocks the page's own script and style tags, and `X-Frame-Options:
// DENY` stops the Telegram webview from framing the app at all. The API
// headers are therefore scoped to the API routes, and the SPA gets its own
// headers below.
//
// `frame-ancestors` is the one directive that must arrive as a response
// HEADER: browsers ignore it in a `<meta>` policy, which is why the built
// index.html carries the full policy as a meta tag and this module sends the
// framing allowlist separately.
//
// The two copies of the allowlist — this one and the one in
// `apps/frontend/vite.config.ts` — are compared by
// `scripts/check-doc-parity.mjs`, which fails CI when they drift apart.

import express, { type Express, type NextFunction, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

/**
 * Origins allowed to embed the SPA in a frame.
 *
 * MIRRORED FROM `apps/frontend/vite.config.ts`. The build injects the full
 * production CSP into index.html as a `<meta>` tag, but browsers ignore
 * `frame-ancestors` in a meta policy, so the same list has to travel as a
 * response header from whatever serves the HTML — which, in a container
 * deployment, is this process.
 */
export const FRAME_ANCESTORS = [
  "'self'",
  "https://web.telegram.org",
  "https://*.telegram.org",
  "https://aistudio.google.com",
  "https://*.google.com",
  "https://*.googleusercontent.com",
  "https://*.run.app",
].join(" ");

/**
 * Response headers for the SPA.
 *
 * Mirrors the headers the Vite dev server sets, with one deliberate
 * difference: `Cross-Origin-Resource-Policy` is `same-origin` here rather
 * than `cross-origin`. The dev server had to allow cross-origin reads
 * because it was published through a tunnel on a different hostname; a
 * deployed SPA is served from its own origin and does not need the hole.
 */
const SITE_SECURITY_HEADERS: Record<string, string> = {
  "Content-Security-Policy": `frame-ancestors ${FRAME_ANCESTORS}`,
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy":
    "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
};

/**
 * The directory the compiled backend lives in, when that can be determined.
 *
 * The backend compiles to CommonJS (NodeNext with no `"type": "module"`), so
 * `__dirname` exists in the built output. It does not exist when the module
 * is loaded as ESM, which is what the test runner does — hence the guard.
 * `typeof` on an undeclared name does not throw, so this is safe either way.
 */
function compiledBackendDir(): string | null {
  return typeof __dirname === "string" ? __dirname : null;
}

/**
 * Locates the built SPA.
 *
 * The candidates are tried in order:
 *   1. `FRONTEND_DIST_DIR`, the explicit override,
 *   2. `<backend>/../../frontend/dist`, which is where the build leaves it
 *      both locally (apps/backend/dist -> apps/frontend/dist) and in the
 *      container image (/app/apps/backend/dist -> /app/apps/frontend/dist),
 *   3. two paths relative to the working directory, for the case where the
 *      process is started from the repository root.
 *
 * Returns null when there is no build to serve, which is the normal state of
 * a development checkout: the SPA is served by Vite there, not by Express.
 */
export function resolveFrontendDistDir(): string | null {
  const backendDir = compiledBackendDir();
  const candidates: Array<string | undefined> = [
    env.FRONTEND_DIST_DIR,
    backendDir
      ? path.resolve(backendDir, "..", "..", "frontend", "dist")
      : undefined,
    path.resolve(process.cwd(), "apps", "frontend", "dist"),
    path.resolve(process.cwd(), "..", "frontend", "dist"),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      if (fs.statSync(path.join(candidate, "index.html")).isFile()) {
        return candidate;
      }
    } catch {
      // Not there. Try the next candidate.
    }
  }
  return null;
}

/**
 * Mounts the built SPA on the API process.
 *
 * Returns true when the SPA was mounted. A false return is not an error: the
 * API is perfectly usable on its own, and the frontend is served by Vite in
 * development.
 */
export function mountStaticSite(app: Express): boolean {
  if (!env.SERVE_FRONTEND) {
    return false;
  }

  const distDir = resolveFrontendDistDir();
  if (!distDir) {
    logger.warn(
      "SERVE_FRONTEND is on but no built frontend was found. Build it with `pnpm --filter frontend build`, or point FRONTEND_DIST_DIR at the build output. The API will serve JSON only.",
    );
    return false;
  }

  const indexFile = path.join(distDir, "index.html");

  // Hashed asset filenames change whenever the content does, so they can be
  // cached for a year. index.html must not be, or a deploy would not be
  // visible to anyone holding a cached copy.
  app.use(
    express.static(distDir, {
      index: false,
      redirect: false,
      setHeaders(res: Response, filePath: string) {
        for (const [name, value] of Object.entries(SITE_SECURITY_HEADERS)) {
          res.setHeader(name, value);
        }
        res.setHeader(
          "Cache-Control",
          filePath.endsWith("index.html")
            ? "no-cache"
            : "public, max-age=31536000, immutable",
        );
      },
    }),
  );

  // The client-side router owns every path that is not an API path: a deep
  // link such as /workspace/jobs has to reach the SPA, not the API's JSON
  // 404. The API paths are excluded explicitly, so an unknown API route
  // still answers with JSON rather than with a page of HTML.
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (
      req.path === "/api" ||
      req.path.startsWith("/api/") ||
      req.path === "/health"
    ) {
      next();
      return;
    }

    for (const [name, value] of Object.entries(SITE_SECURITY_HEADERS)) {
      res.setHeader(name, value);
    }
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(indexFile, (error?: Error) => {
      if (error) next(error);
    });
  });

  logger.info({ distDir }, "Serving the built frontend from the API process.");
  return true;
}
