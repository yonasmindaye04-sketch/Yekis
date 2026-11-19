#!/usr/bin/env node
/**
 * Checks a deployed Yekis instance against the contract the deployment has to
 * meet. Run it against the base URL of the deployment:
 *
 *   node scripts/check-deployment.mjs https://yekis.app.aletcloud.com
 *
 * It exists because every failure it looks for is silent. A container that
 * binds loopback passes a build and never comes up. An HTML page served with
 * the API's `default-src 'none'` policy renders as a white screen. An
 * unknown API route answered with the SPA's index.html instead of JSON looks
 * like a working API until a client tries to parse it. A frame-ancestors
 * allowlist that never reaches the browser as a response header loads
 * perfectly in a tab and fails inside the Telegram Mini App — and only there.
 *
 * Each check therefore asserts something that would otherwise only fail in
 * production, and the script prints what it saw.
 */

import process from "node:process";

const baseUrl = (process.argv[2] ?? "").replace(/\/+$/, "");

if (!baseUrl) {
  console.error(
    "usage: node scripts/check-deployment.mjs <base-url>\n" +
      "  e.g. node scripts/check-deployment.mjs https://yekis.app.aletcloud.com",
  );
  process.exit(2);
}

const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(
  baseUrl,
);

if (!/^https:\/\//i.test(baseUrl) && !isLocal) {
  console.error(
    `refusing to check "${baseUrl}": the deployment is served over https.\n` +
      "  (http is accepted only for a local container: http://127.0.0.1:8080)",
  );
  process.exit(2);
}

let failures = 0;
let checks = 0;

function report(ok, label, detail) {
  checks += 1;
  if (!ok) failures += 1;
  const mark = ok ? "PASS" : "FAIL";
  console.log(`${mark}  ${label}`);
  if (detail) {
    for (const line of String(detail).split("\n")) {
      if (line.trim()) console.log(`      ${line.trim()}`);
    }
  }
}

async function get(path, init) {
  const response = await fetch(`${baseUrl}${path}`, {
    redirect: "manual",
    ...init,
  });
  const body = await response.text();
  return { response, body };
}

console.log(`\nChecking ${baseUrl}\n`);

// ── 1. The API is up ────────────────────────────────────────────────────────
try {
  const { response, body } = await get("/health");
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    /* reported below */
  }
  report(
    response.status === 200 && parsed?.status === "ok",
    "GET /health answers 200 with {\"status\":\"ok\"}",
    `status ${response.status}\nbody ${body.slice(0, 200)}`,
  );
} catch (error) {
  report(false, "GET /health answers 200 with {\"status\":\"ok\"}", String(error));
}

// ── 2. The API keeps its strict JSON-only policy ───────────────────────────
try {
  const { response } = await get("/api/v1/skills");
  const csp = response.headers.get("content-security-policy") ?? "";
  report(
    csp.includes("default-src 'none'") && csp.includes("frame-ancestors 'none'"),
    "the API answers with the strict JSON-only CSP",
    `content-security-policy: ${csp || "(absent)"}`,
  );
} catch (error) {
  report(false, "the API answers with the strict JSON-only CSP", String(error));
}

// ── 3. The SPA is served, with the framing allowlist as a header ───────────
try {
  const { response, body } = await get("/");
  const csp = response.headers.get("content-security-policy") ?? "";
  const contentType = response.headers.get("content-type") ?? "";
  const xfo = response.headers.get("x-frame-options");

  report(
    response.status === 200 && contentType.includes("text/html"),
    "GET / serves the SPA as HTML",
    `status ${response.status}\ncontent-type ${contentType}`,
  );
  report(
    csp.includes("frame-ancestors") &&
      csp.includes("https://web.telegram.org") &&
      csp.includes("'self'"),
    "the SPA's response carries the frame-ancestors allowlist",
    `content-security-policy: ${csp || "(absent)"}`,
  );
  // X-Frame-Options has no allowlist form: DENY or SAMEORIGIN both stop the
  // Telegram webview from framing the app, and the Telegram webview is where
  // the Mini App lives.
  report(
    xfo === null,
    "the SPA's response does not carry X-Frame-Options",
    `x-frame-options: ${xfo ?? "(absent)"}`,
  );
  report(
    body.includes("<div id=\"root\">"),
    "the served HTML is the SPA's index.html",
    body.slice(0, 160).replace(/\s+/g, " "),
  );
} catch (error) {
  report(false, "GET / serves the SPA as HTML", String(error));
}

// ── 4. A client-side route reaches the SPA, not the API's 404 ──────────────
try {
  const { response, body } = await get("/workspace/jobs");
  report(
    response.status === 200 && body.includes("<div id=\"root\">"),
    "a client-side route returns the SPA",
    `status ${response.status}`,
  );
} catch (error) {
  report(false, "a client-side route returns the SPA", String(error));
}

// ── 5. An unknown API route still answers with JSON ─────────────────────────
try {
  const { response, body } = await get("/api/v1/definitely-not-a-route");
  let parsed = null;
  try {
    parsed = JSON.parse(body);
  } catch {
    /* reported below */
  }
  report(
    response.status === 404 && parsed?.error === "NOT_FOUND",
    "an unknown API route answers 404 with JSON, not with the SPA",
    `status ${response.status}\nbody ${body.slice(0, 200)}`,
  );
} catch (error) {
  report(false, "an unknown API route answers 404 with JSON", String(error));
}

// ── 6. The API and the SPA share an origin ─────────────────────────────────
// A cross-origin API would need CORS, and the frontend does not ask for it.
try {
  const { response } = await get("/api/v1/skills", {
    headers: { Origin: baseUrl },
  });
  const allowOrigin = response.headers.get("access-control-allow-origin");
  report(
    allowOrigin === null || allowOrigin === baseUrl,
    "the API answers a same-origin request without a CORS exception",
    `access-control-allow-origin: ${allowOrigin ?? "(absent)"}`,
  );
} catch (error) {
  report(false, "the API answers a same-origin request", String(error));
}

// ── 7. Caching: the API is never cached, the SPA is revalidated ────────────
// An API response written to a shared cache can hand one user's balance to
// the next person who asks for the same URL. The SPA's index.html, on the
// other hand, must not be cached for long, or a deploy stays invisible to
// anyone holding a cached copy.
try {
  const api = await get("/api/v1/skills");
  const apiCache = api.response.headers.get("cache-control") ?? "";
  report(
    apiCache.includes("no-store"),
    "the API's responses are marked no-store",
    `cache-control: ${apiCache || "(absent)"}`,
  );

  const spa = await get("/");
  const spaCache = spa.response.headers.get("cache-control") ?? "";
  report(
    spaCache.includes("no-cache") || spaCache.includes("no-store"),
    "the SPA's index.html is not cached for long",
    `cache-control: ${spaCache || "(absent)"}`,
  );
} catch (error) {
  report(false, "the caching headers are correct", String(error));
}

console.log(
  `\n${checks - failures}/${checks} checks passed.` +
    (failures > 0 ? ` ${failures} FAILED.` : " Everything looks right."),
);
console.log(
  "\nStill to check by hand: the object store (upload a KYC document), the\n" +
    "Telegram Mini App (open it from the bot), and the runtime log (the\n" +
    "Redis and the migration lines). See docs/ALETCLOUD_DEPLOYMENT.md §6.\n",
);

process.exit(failures > 0 ? 1 : 0);
