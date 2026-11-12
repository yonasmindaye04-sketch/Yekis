#!/usr/bin/env node
/**
 * Proves that the browser-platform sidebar stays fixed while the body
 * content scrolls.
 *
 * WHY A SCRIPT AND NOT A SCREENSHOT
 * A screenshot shows one moment. This measures the thing that was actually
 * broken: the sidebar's position relative to the viewport before and after
 * the page is scrolled. If the sidebar scrolls away, its viewport-relative
 * top goes negative and the assertion fails.
 *
 * It drives headless Chrome over the DevTools Protocol using Node's built-in
 * WebSocket, so it needs no browser-automation dependency.
 *
 * Usage:
 *   node scripts/verify-sidebar-fixed.mjs [--url http://127.0.0.1:3000] [--email ...] [--password ...]
 *
 * Exits 0 when the sidebar stays put, 1 when it does not.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";

const args = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const URL_ = argOf("url", "http://127.0.0.1:3000");
const CHROME =
  argOf("chrome", "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe");
const PORT = Number(argOf("port", "9333"));

function demoPassword() {
  const env = readFileSync("apps/backend/.env", "utf8");
  const m = env.match(/^\s*SEED_DEMO_PASSWORD\s*=\s*(.+)$/m);
  if (!m) throw new Error("SEED_DEMO_PASSWORD not found in apps/backend/.env");
  return m[1].trim().replace(/^["']|["']$/g, "");
}

const EMAIL = argOf("email", "client@yekis.et");
const PASSWORD = argOf("password", demoPassword());

// ---------- CDP plumbing ----------
let nextId = 1;
const pending = new Map();

async function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  ws.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  return {
    send(method, params = {}, sessionId) {
      const id = nextId++;
      const payload = { id, method, params };
      if (sessionId) payload.sessionId = sessionId;
      ws.send(JSON.stringify(payload));
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
    },
    close: () => ws.close(),
  };
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  const text = await res.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = text;
  }
  if (!res.ok) {
    throw new Error(`${options?.method ?? "GET"} ${url} -> ${res.status} ${text.slice(0, 200)}`);
  }
  return body;
}

// ---------- Main ----------
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    "--remote-allow-origins=*",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-gpu",
    "--window-size=1440,900",
    "--user-data-dir=" + process.env.TEMP + "\\yekis-cdp-profile",
    "about:blank",
  ],
  { stdio: "ignore" },
);

let exitCode = 1;
try {
  // Wait for the debugging endpoint.
  let target = null;
  for (let i = 0; i < 40; i++) {
    try {
      const list = await fetchJson(`http://127.0.0.1:${PORT}/json/list`);
      target = list.find((t) => t.type === "page");
      if (target) break;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  if (!target) throw new Error("Chrome DevTools endpoint never came up");

  const cdp = await connect(target.webSocketDebuggerUrl);
  await cdp.send("Page.enable");
  await cdp.send("Runtime.enable");

  const evaluate = async (expression) => {
    const res = await cdp.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (res.exceptionDetails) {
      throw new Error(
        "page error: " +
          (res.exceptionDetails.exception?.description ??
            JSON.stringify(res.exceptionDetails)),
      );
    }
    return res.result.value;
  };

  // Log in through the API and seed the token the client reads.
  const login = await fetchJson("http://127.0.0.1:4000/api/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const token = login.accessToken;
  if (!token) throw new Error("login returned no accessToken");

  await cdp.send("Page.navigate", { url: URL_ });
  await sleep(4000);

  await evaluate(
    `localStorage.setItem("yekis-api-token", ${JSON.stringify(token)});` +
      `localStorage.setItem("yekis-refresh-token", ${JSON.stringify(login.refreshToken ?? "")});` +
      `"ok"`,
  );
  // A reload, not a navigate: the API client reads the token from
  // localStorage once, at module load, so the page has to be re-evaluated.
  await cdp.send("Page.reload", { ignoreCache: true });

  // Wait for the authenticated platform shell rather than guessing a delay.
  let appeared = false;
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    appeared = await evaluate(
      `!!document.querySelector(".platform-shell.sh-shell .platform-sidebar")`,
    );
    if (appeared) break;
  }
  if (!appeared) {
    const diag = await evaluate(`
      (() => ({
        url: location.href,
        hasShell: !!document.querySelector(".platform-shell"),
        hasSidebarClass: !!document.querySelector(".platform-sidebar"),
        tokenPresent: !!localStorage.getItem("yekis-api-token"),
        bodyStart: document.body.innerText.slice(0, 200),
      }))()`);
    console.error("diagnostics:", JSON.stringify(diag, null, 2));
    throw new Error("The authenticated platform shell never rendered.");
  }
  await sleep(1200);

  const measure = `
    (() => {
      const el = document.querySelector(".platform-shell.sh-shell .platform-sidebar");
      if (!el) return { found: false, reason: "sidebar element not found" };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        found: true,
        position: cs.position,
        height: cs.height,
        viewportHeight: window.innerHeight,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        scrollY: Math.round(window.scrollY),
        docHeight: document.documentElement.scrollHeight,
        visible: r.bottom > 0 && r.top < window.innerHeight,
        fullyInView: r.top >= -1 && r.bottom <= window.innerHeight + 1,
      };
    })()`;

  const before = await evaluate(measure);
  if (!before.found) {
    // Dump what the page actually rendered, so the failure is diagnosable.
    const diag = await evaluate(`
      (() => ({
        url: location.href,
        title: document.title,
        hasShell: !!document.querySelector(".platform-shell"),
        hasSidebarClass: !!document.querySelector(".platform-sidebar"),
        hasTabBar: !!document.querySelector(".platform-tab-bar"),
        hasOpsRoot: !!document.querySelector(".ops-root"),
        bodyStart: document.body.innerText.slice(0, 300),
        classes: Array.from(document.querySelectorAll("div")).slice(0, 12).map(d => d.className),
      }))()`);
    console.error("diagnostics:", JSON.stringify(diag, null, 2));
    throw new Error(`Sidebar not found: ${before.reason}`);
  }
  console.log("before scroll:", JSON.stringify(before));

  // Scroll to the bottom of the page.
  await evaluate(
    "window.scrollTo(0, document.documentElement.scrollHeight); " +
      "new Promise(r => setTimeout(() => r(true), 600))",
  );
  const after = await evaluate(measure);
  console.log("after scroll: ", JSON.stringify(after));

  const checks = [];
  checks.push({
    name: "sidebar is position:sticky (or fixed)",
    ok: ["sticky", "fixed"].includes(after.position),
    got: after.position,
  });
  checks.push({
    name: "sidebar top does not move with the page",
    ok: Math.abs(after.top - before.top) <= 2,
    got: `${before.top} -> ${after.top}`,
  });
  checks.push({
    name: "sidebar is still fully within the viewport after scrolling",
    ok: after.fullyInView,
    got: `top=${after.top} bottom=${after.bottom} vh=${after.viewportHeight}`,
  });
  checks.push({
    name: "the page actually scrolled (the test is meaningful)",
    ok: after.scrollY > 200,
    got: `scrollY=${after.scrollY} of ${after.docHeight}`,
  });

  console.log("");
  let ok = true;
  for (const c of checks) {
    console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}  [${c.got}]`);
    if (!c.ok) ok = false;
  }

  exitCode = ok ? 0 : 1;
  console.log(
    `\n${ok ? "OK: the sidebar stays fixed while the body content scrolls." : "BROKEN: the sidebar scrolls away with the body content."}`,
  );
  cdp.close();
} catch (err) {
  console.error("verification failed:", err.message);
  exitCode = 1;
} finally {
  chrome.kill();
}

process.exit(exitCode);
