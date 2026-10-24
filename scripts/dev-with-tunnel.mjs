#!/usr/bin/env node
/**
 * scripts/dev-with-tunnel.mjs
 *
 * One-command dev launcher:
 *   1. Starts a Cloudflare quick tunnel pointing at localhost:3000
 *   2. Captures the public *.trycloudflare.com URL
 *   3. Injects it as FRONTEND_URL into the backend environment
 *   4. Boots the backend (apps/backend) and frontend (apps/frontend) concurrently
 *
 * Usage:
 *   pnpm dev:tunnel
 */

import { spawn } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { existsSync } from "node:fs";
import { lookup } from "node:dns/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ── helpers ──────────────────────────────────────────────────────────────────

function color(code, text) {
  return `\x1b[${code}m${text}\x1b[0m`;
}
const cyan = (t) => color("36", t);
const green = (t) => color("32", t);
const yellow = (t) => color("33", t);
const red = (t) => color("31", t);
const bold = (t) => color("1", t);

function log(prefix, msg) {
  process.stdout.write(`${prefix} ${msg}\n`);
}

/** Spawn a child and pipe its stdio, optionally with extra env vars */
function spawnChild(label, cmd, args, opts = {}) {
  const child = spawn(cmd, args, {
    cwd: opts.cwd ?? ROOT,
    env: { ...process.env, ...opts.env },
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  const prefix = bold(`[${label}]`);

  child.stdout.on("data", (d) =>
    process.stdout.write(
      d
        .toString()
        .split("\n")
        .filter(Boolean)
        .map((l) => `${prefix} ${l}\n`)
        .join("")
    )
  );
  child.stderr.on("data", (d) =>
    process.stderr.write(
      d
        .toString()
        .split("\n")
        .filter(Boolean)
        .map((l) => `${prefix} ${l}\n`)
        .join("")
    )
  );

  return child;
}

// ── cloudflared binary lookup ─────────────────────────────────────────────────

function findCloudflared() {
  const candidates = [
    "cloudflared", // on PATH
    "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe",
    "C:\\Program Files\\cloudflared\\cloudflared.exe",
    "/usr/local/bin/cloudflared",
    "/usr/bin/cloudflared",
    "/opt/homebrew/bin/cloudflared",
  ];

  for (const bin of candidates) {
    // For absolute paths, check existence; for PATH entries trust the shell
    if (!bin.includes("/") && !bin.includes("\\")) return bin; // bare name → shell resolves
    if (existsSync(bin)) return bin;
  }

  return null;
}

// ── tunnel URL capture ────────────────────────────────────────────────────────

/**
 * Starts cloudflared and resolves with the first *.trycloudflare.com URL it
 * prints, waiting up to `timeoutMs` milliseconds.
 *
 * The URL is NOT returned the moment cloudflared prints it: at that point the
 * tunnel has been allocated but no edge connection is registered yet, so the
 * URL answers 502 for as long as the handshake takes. The caller wants a URL
 * it can open, so we wait for "Registered tunnel connection" before handing
 * it over.
 *
 * Transport defaults to HTTP/2 rather than QUIC. On links where UDP 7844 is
 * filtered or lossy, cloudflared's QUIC transport registers a connection and
 * then drops it minutes later with "failed to accept QUIC stream: timeout: no
 * recent network activity", after which the URL starts answering 530 — which
 * looks exactly like the app being broken. HTTP/2 rides on TCP 7844 and stays
 * up. cloudflared's own precheck says the same thing: "Allow outbound QUIC
 * traffic on port 7844 or use HTTP2."
 *
 * Set `CLOUDFLARED_PROTOCOL=quic` (or `auto`) to override.
 */
function startTunnel(bin, localPort, timeoutMs = 90_000) {
  return new Promise((resolve, reject) => {
    const protocol = process.env.CLOUDFLARED_PROTOCOL || "http2";
    const args = ["tunnel", "--url", `http://localhost:${localPort}`, "--protocol", protocol];

    const child = spawn(bin, args, {
      cwd: ROOT,
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let url = null;
    let settled = false;
    // The quick-tunnel hostname is always words joined by hyphens
    // ("three-word-name.trycloudflare.com").
    //
    // The shape matters: when the tunnel API call fails, cloudflared logs the
    // endpoint it tried to reach — "https://api.trycloudflare.com/tunnel" —
    // and a looser pattern captured THAT as the tunnel URL. The backend then
    // got FRONTEND_URL=https://api.trycloudflare.com, the bot pointed the
    // Mini App menu button at the API host, and the Mini App link was dead on
    // arrival while the launcher still printed a confident "Tunnel URL".
    // Requiring a hyphen in the host label, and excluding cloudflared's own
    // hosts, keeps only the generated tunnel.
    const urlRe = /https:\/\/(?!api\.|www\.)[a-z0-9]+(?:-[a-z0-9]+)+\.trycloudflare\.com(?![/\w-])/i;
    const connectedRe = /Registered tunnel connection/i;

    function finish(err, value) {
      if (settled) return;
      settled = true;
      if (err) reject(err);
      else resolve(value);
    }

    function onData(chunk) {
      const text = chunk.toString();
      process.stdout.write(
        text
          .split("\n")
          .filter(Boolean)
          .map((l) => `${bold("[tunnel]")} ${l}\n`)
          .join("")
      );

      const m = text.match(urlRe);
      if (m && !url) {
        url = m[0];
        log(yellow("…"), `Tunnel URL allocated: ${bold(cyan(url))} — waiting for it to connect …`);
      }

      if (url && connectedRe.test(text)) {
        // The edge connection is registered, but the hostname's DNS record is
        // created asynchronously: it can take several seconds to resolve, and
        // until it does the URL fails with ERR_NAME_NOT_RESOLVED on every
        // device. A URL that does not resolve is not worth announcing.
        void (async () => {
          const host = new URL(url).hostname;
          const deadline = Date.now() + 30_000;
          while (Date.now() < deadline) {
            try {
              await lookup(host);
              finish(null, { url, process: child });
              return;
            } catch {
              await new Promise((r) => setTimeout(r, 1000));
            }
          }
          log(yellow("!"), `The tunnel hostname still does not resolve — the URL may fail to open.`);
          finish(null, { url, process: child });
        })();
      }
    }

    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    child.on("exit", (code) => {
      if (!url) {
        finish(new Error(`cloudflared exited with code ${code} before a URL was captured`));
      }
    });

    setTimeout(() => {
      if (url) {
        // The URL exists but the edge never accepted a connection. Hand it
        // over anyway — it usually starts working a moment later — but say so
        // plainly, because a URL that 502s looks like the app is broken.
        log(
          yellow("!"),
          `Tunnel did not confirm a connection within ${Math.round(timeoutMs / 1000)}s. ` +
            `The URL may 502 until it does.`,
        );
        finish(null, { url, process: child });
      } else {
        child.kill();
        finish(new Error("Timed out waiting for cloudflared tunnel URL"));
      }
    }, timeoutMs);
  });
}

// ── frontend readiness ───────────────────────────────────────────────────────

/**
 * Wait until the dev server can actually serve the app.
 *
 * Vite pre-bundles its dependencies in the background AFTER the server starts
 * listening. While that runs, a request for an optimized chunk waits on the
 * optimizer's lock — and through a Cloudflare tunnel that wait becomes a 504
 * (the tunnel gives up on the origin and answers with a gateway timeout). The
 * browser then aborts the request, React never loads, and the Mini App opens
 * to a blank page that looks like "the mini app is not starting".
 *
 * So this probes the real entry module, follows it to the optimized chunk it
 * imports, and insists that BOTH are served quickly. Only then is the tunnel
 * allowed to point at this server.
 */
async function waitForFrontendReady(localPort, timeoutMs = 120_000) {
  const origin = `http://127.0.0.1:${localPort}`;
  const deadline = Date.now() + timeoutMs;
  let lastError = "no attempt made";
  let previousDep = null;

  while (Date.now() < deadline) {
    try {
      const html = await fetch(`${origin}/`, { signal: AbortSignal.timeout(10_000) });
      if (!html.ok) throw new Error(`/ returned HTTP ${html.status}`);
      await html.arrayBuffer();

      const entry = await fetch(`${origin}/src/main.tsx`, { signal: AbortSignal.timeout(15_000) });
      if (!entry.ok) throw new Error(`/src/main.tsx returned HTTP ${entry.status}`);
      const body = await entry.text();

      // The optimized chunk the entry imports — the one that timed out.
      const dep = body.match(/["']([^"']*\/node_modules\/\.vite\/deps\/[^"']+)["']/);
      if (!dep) return { ok: true, note: "entry served (no optimized chunk referenced)" };

      const started = Date.now();
      const depRes = await fetch(`${origin}${dep[1]}`, { signal: AbortSignal.timeout(30_000) });
      if (!depRes.ok) throw new Error(`optimized chunk returned HTTP ${depRes.status}`);
      await depRes.arrayBuffer();
      const elapsed = Date.now() - started;

      // A chunk that takes more than a couple of seconds is the optimizer
      // still working; the tunnel would time it out.
      if (elapsed > 5_000) throw new Error(`optimized chunk took ${elapsed}ms`);

      // The optimizer can start a SECOND pass a moment after the first one
      // finishes (it discovers a dependency the source scan missed), which
      // rewrites every chunk hash and forces the browser to reload. Requiring
      // the same hash across a pause means the optimizer has settled, so the
      // first browser load will not be interrupted.
      if (previousDep && previousDep === dep[1]) {
        return { ok: true, note: `optimized chunk stable and served in ${elapsed}ms` };
      }
      previousDep = dep[1];
      await new Promise((r) => setTimeout(r, 4000));
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      previousDep = null;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  return { ok: false, note: lastError };
}

/**
 * Pull the critical modules through the tunnel before it is announced.
 *
 * The first request a phone makes is what decides whether the Mini App opens
 * or shows an error page, and the tunnel's first request to the origin is the
 * one most likely to stall. Doing it here means the URL is only handed over
 * once the app has already been proven to load through it.
 */
async function warmThroughTunnel(tunnelUrl, paths, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  for (const path of paths) {
    let ok = false;
    while (Date.now() < deadline && !ok) {
      try {
        const res = await fetch(`${tunnelUrl}${path}`, { signal: AbortSignal.timeout(20_000) });
        ok = res.ok;
        if (!ok) await res.arrayBuffer().catch(() => {});
      } catch {
        ok = false;
      }
      if (!ok) await new Promise((r) => setTimeout(r, 1000));
    }
    if (!ok) return false;
  }
  return true;
}

// ── main ──────────────────────────────────────────────────────────────────────

const FRONTEND_PORT = 3000;
const BACKEND_PORT = 4000;

(async () => {
  log(cyan("◆"), bold("Yekis dev:tunnel launcher"));
  log(cyan("◆"), `Frontend: localhost:${FRONTEND_PORT}  Backend: localhost:${BACKEND_PORT}`);

  // 1. Find cloudflared
  const bin = findCloudflared();
  if (!bin) {
    console.error(
      red(
        "\n✖  cloudflared not found.\n" +
          "   Install it with:  winget install --id Cloudflare.cloudflared\n" +
          "   See docs/CLOUDFLARE_TUNNEL_PLAYBOOK.md for details.\n"
      )
    );
    process.exit(1);
  }
  log(green("✔"), `cloudflared found: ${bin}`);

  // 2. Boot the frontend FIRST.
  //
  // The tunnel proxies to it, so anything that serves traffic has to be up
  // before the tunnel is announced — otherwise the URL 502s until vite
  // finishes its first optimize. The backend waits for the tunnel because it
  // needs FRONTEND_URL, but the frontend does not, so it goes first.
  const frontendDir = resolve(ROOT, "apps/frontend");
  const frontend = spawnChild(
    "frontend",
    "npx",
    ["vite", `--port=${FRONTEND_PORT}`, "--host=0.0.0.0"],
    { cwd: frontendDir }
  );

  // 3. Wait until the dev server can really serve the app.
  log(cyan("…"), "Waiting for the dev server to finish pre-bundling …");
  const ready = await waitForFrontendReady(FRONTEND_PORT);
  if (!ready.ok) {
    console.error(
      red(
        `\n✖  The dev server never became ready (${ready.note}).\n` +
          "   The tunnel would hand out a URL that 504s, so it was not started.\n",
      ),
    );
    process.exit(1);
  }
  log(green("✔"), `Dev server ready — ${ready.note}`);

  // 4. Start tunnel
  log(cyan("…"), "Starting Cloudflare quick tunnel — this may take ~10 s …");
  let tunnelUrl, tunnelProc;
  try {
    ({ url: tunnelUrl, process: tunnelProc } = await startTunnel(bin, FRONTEND_PORT));
  } catch (err) {
    console.error(red(`\n✖  ${err.message}\n`));
    process.exit(1);
  }

  // 5. Prove the app loads THROUGH the tunnel before announcing it.
  log(cyan("…"), "Warming the app through the tunnel …");
  const warm = await warmThroughTunnel(tunnelUrl, ["/", "/src/main.tsx"]);
  if (!warm) {
    log(
      yellow("!"),
      "The app did not load through the tunnel on the first attempt — the URL " +
        "may still be slow to open.",
    );
  } else {
    log(green("✔"), "App verified through the tunnel");
  }

  log(green("✔"), `Tunnel URL: ${bold(cyan(tunnelUrl))}`);
  log(yellow("ℹ"), "Send /link to the bot to see this URL at any time.\n");

  // 6. Boot backend with FRONTEND_URL injected
  const backendDir = resolve(ROOT, "apps/backend");
  const backend = spawnChild("backend", "npx", ["tsx", "watch", "src/server.ts"], {
    cwd: backendDir,
    env: { FRONTEND_URL: tunnelUrl },
  });

  // 5. Graceful shutdown
  function shutdown(signal) {
    log(yellow("…"), `${signal} — shutting down …`);
    tunnelProc.kill();
    backend.kill();
    frontend.kill();
    process.exit(0);
  }

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));

  [tunnelProc, backend, frontend].forEach((p) =>
    p.on("exit", (code, sig) => {
      if (code !== 0 && sig !== "SIGTERM" && sig !== "SIGKILL") {
        log(red("✖"), `A child process exited unexpectedly (code ${code}, signal ${sig})`);
      }
    })
  );
})();
