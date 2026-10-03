// Theme parity audit harness: drives the Yekis frontend in headless Chrome,
// captures full-page + viewport screenshots and a DOM geometry dump per page in
// both light and dark themes at fixed viewports.
//
// Usage: node audit-harness.js --mode before|after [--sets public,workspace,staff,responsive]
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const BASE_URL = "http://localhost:5174";
const EVIDENCE_ROOT = "C:\\Users\\Za\\Desktop\\project\\Yekis\\docs\\theme-parity";
const USERS_FILE = "C:\\Users\\Za\\AppData\\Local\\Temp\\opencode\\audit-users.json";

const args = process.argv.slice(2);
const MODE = (args.find((a) => a.startsWith("--mode")) || "--mode=before").split("=")[1];
const setsArg = (args.find((a) => a.startsWith("--sets")) || "--sets=public,workspace,staff,responsive").split("=")[1];
const SETS = new Set(setsArg.split(","));
const OUT = path.join(EVIDENCE_ROOT, MODE);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- DOM geometry dump (runs in page) ----------
function dumpGeometry() {
  const counts = new Map();
  const rows = [];
  const els = document.body.querySelectorAll("*");
  for (const el of els) {
    const tag = el.tagName.toLowerCase();
    if (["script", "style", "link", "meta", "title", "path", "circle", "defs", "mask", "filter", "ellipse", "g", "lineargradient", "radialgradient", "stop", "svg", "line", "rect", "polygon", "polyline"].includes(tag)) continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const parts = [];
    let node = el;
    while (node && node !== document.body) {
      const t = node.tagName.toLowerCase();
      const cls = (node.getAttribute("class") || "").trim().split(/\s+/).slice(0, 3).join(".");
      let nth = 0;
      let sib = node;
      while ((sib = sib.previousElementSibling)) if (sib.tagName === node.tagName) nth++;
      parts.unshift(t + (cls ? "." + cls : "") + "~" + nth);
      node = node.parentElement;
      if (parts.length > 9) break;
    }
    let p = parts.join(">");
    const n = (counts.get(p) || 0) + 1; // disambiguate identical sibling paths deterministically
    counts.set(p, n);
    if (n > 1) p = p + "#dup" + n;
    const cs = getComputedStyle(el);
    rows.push({
      p,
      x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2),
      fs: cs.fontSize, lh: cs.lineHeight, fw: cs.fontWeight, ls: cs.letterSpacing,
      ff: (cs.fontFamily || "").split(",")[0].replace(/['"]/g, ""),
      txt: (el.childElementCount === 0 ? (el.textContent || "").trim().slice(0, 24) : ""),
    });
  }
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    docH: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight),
    rows,
  };
}

async function settle(page, scroll = true) {
  await page.evaluate(async () => {
    try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 3000))]); } catch (e) {}
    // wait until all font loads actually finished (swap applied)
    const t0 = Date.now();
    while (document.fonts.status === "loading" && Date.now() - t0 < 5000) {
      await new Promise((r) => setTimeout(r, 150));
    }
  }).catch(() => {});
  await sleep(700);
  if (scroll) {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let y = 0;
        let steps = 0;
        const step = () => {
          y += 700; steps++;
          window.scrollTo(0, y);
          if (y < document.body.scrollHeight + 700 && steps < 40) setTimeout(step, 60);
          else { window.scrollTo(0, 0); setTimeout(resolve, 200); }
        };
        step();
      });
    }).catch(() => {});
    await sleep(600);
  }
}

async function clickByText(page, scopeSel, reText, { optional = false } = {}) {
  const clicked = await page.evaluate((scopeSel, reSrc) => {
    const re = new RegExp(reSrc, "i");
    const scope = scopeSel ? document.querySelectorAll(scopeSel) : [document.body];
    for (const sc of scope) {
      const cands = sc.querySelectorAll("button, a, [role='button']");
      for (const c of cands) {
        if (c.tagName === "A" && c.target === "_blank") continue; // never leave the page
        const t = (c.textContent || "").replace(/\s+/g, " ").trim();
        if (t && re.test(t)) { c.click(); return t; }
      }
    }
    return null;
  }, scopeSel, reText.source);
  if (!clicked && !optional) throw new Error(`clickByText failed: ${reText}`);
  return clicked;
}

async function createUser(role) {
  const email = `audit-${role.toLowerCase()}@yekis.et`;
  const password = "Test1234!a";
  const api = "http://localhost:4000/api/v1";
  const reg = await fetch(`${api}/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email, phone: `+25191${Math.floor(1000000 + Math.random() * 8999999)}`,
      password, role, dateOfBirth: "1990-01-01", languagePreference: "en",
      consents: { kycDataProcessing: true, financialDataProcessing: true, platformNotifications: true, marketingCommunications: false, analytics: false },
    }),
  }).catch(() => null);
  if (reg && reg.ok) console.log(`registered ${email}`);
  const login = await fetch(`${api}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`login failed for ${email}: ${login.status} ${await login.text()}`);
  return login.json();
}

async function loginUser(email, password) {
  const api = "http://localhost:4000/api/v1";
  const login = await fetch(`${api}/auth/login`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!login.ok) throw new Error(`login failed for ${email}: ${login.status} ${await login.text()}`);
  return login.json();
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  // users
  let users = {};
  if (fs.existsSync(USERS_FILE)) users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
  if (!users.client) users.client = await createUser("CLIENT").catch((e) => { console.error(e.message); return null; });
  if (!users.freelancer) users.freelancer = await createUser("FREELANCER").catch((e) => { console.error(e.message); return null; });
  if (!users.admin) users.admin = await loginUser("admin@yekis.et", "test1234").catch((e) => { console.error(e.message); return null; });
  users.creds = {
    client: { email: "audit-client@yekis.et", password: "Test1234!a" },
    freelancer: { email: "audit-freelancer@yekis.et", password: "Test1234!a" },
    admin: { email: "admin@yekis.et", password: "test1234" },
  };
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  console.log("users ready:", Object.entries(users).map(([k, v]) => `${k}:${v ? "ok" : "MISSING"}`).join(" "));

  const browser = await puppeteer.launch({
    executablePath: CHROME, headless: true, protocolTimeout: 120000,
    args: ["--no-sandbox", "--disable-gpu", "--force-device-scale-factor=1", "--window-size=1440,960"],
  });
  // close stray external tabs (target=_blank links) so sessions stay put
  browser.on("targetcreated", async (t) => {
    try {
      if (t.type() === "page") {
        const url = t.url();
        if (url && !url.startsWith(BASE_URL) && url !== "about:blank" && url !== "chrome://newtab/") {
          const p = await t.page().catch(() => null);
          if (p) await p.close().catch(() => {});
          console.log("  closed external tab:", url.slice(0, 60));
        }
      }
    } catch (e) {}
  });

  const results = [];

  // Warm up webfonts before auditing so font swaps can't pollute geometry.
  {
    const wctx = await browser.createBrowserContext();
    const wp = await wctx.newPage();
    await wp.goto(BASE_URL + "/", { waitUntil: "domcontentloaded" }).catch(() => {});
    await wp.waitForSelector(".landing-page, .marketing-page, .platform-auth", { timeout: 25000 }).catch(() => {});
    await wp.evaluate(async () => {
      try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 8000))]); } catch (e) {}
      const t0 = Date.now();
      while (document.fonts.status === "loading" && Date.now() - t0 < 8000) await new Promise((r) => setTimeout(r, 200));
    }).catch(() => {});
    await sleep(1200);
    await wp.close().catch(() => {});
    await wctx.close().catch(() => {});
    console.log("font warmup done");
  }

  async function capture(page, name, vp, extraSettle = true) {
    const dir = path.join(OUT, String(vp.w));
    fs.mkdirSync(dir, { recursive: true });
    if (extraSettle) await settle(page, true);
    const geom = await page.evaluate(dumpGeometry);
    const suffix = `${name}.${geom.theme || ""}`;
    fs.writeFileSync(path.join(dir, `${name}.geom.json`), JSON.stringify({ ...geom, url: page.url() }, null, 1));
    await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
    await page.screenshot({ path: path.join(dir, `${name}.viewport.png`) });
    results.push({ name, theme: geom.theme, docH: geom.docH, rows: geom.rows.length });
    console.log(`captured ${vp.theme}/${vp.w}/${name} docH=${geom.docH} rows=${geom.rows.length}`);
  }

  async function newPage(vp, ctx) {
    const context = ctx || browser;
    const page = await context.newPage();
    // Block third-party requests (googleapis fonts, telegram, social SDKs) so captures are deterministic.
    await page.setRequestInterception(true);
    page.on("request", (req) => {
      const u = req.url();
      if (u.startsWith("http://localhost:5174") || u.startsWith("http://localhost:4000") || u.startsWith("data:") || u.startsWith("blob:") || u.startsWith("about:")) req.continue().catch(() => {});
      else req.abort().catch(() => {});
    });
    await page.setViewport({ width: vp.w, height: vp.h, deviceScaleFactor: 1 });
    await page.evaluateOnNewDocument((theme) => {
      try {
        window.localStorage.setItem("yekis-theme", theme);
        window.localStorage.setItem("yekis_splash_seen", "1");
        window.__themeProbe = () => document.documentElement.dataset.theme;
      } catch (e) {}
    }, vp.theme);
    page.on("pageerror", (e) => console.log("  [pageerror]", String(e).slice(0, 120)));
    return page;
  }

  async function goto(page, url) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch((e) => console.log("  goto warn:", String(e).slice(0, 100)));
    await sleep(600);
    const theme = await page.evaluate(() => document.documentElement.dataset.theme);
    return theme;
  }

  // wrap capture to tag theme into saved json
  async function captureWithTheme(page, name, vp) {
    try {
      const dir = path.join(OUT, String(vp.w));
      fs.mkdirSync(dir, { recursive: true });
      await settle(page, true);
      const geom = await page.evaluate(dumpGeometry);
      geom.theme = await page.evaluate(() => document.documentElement.dataset.theme);
      const theme = geom.theme || "unknown";
      fs.writeFileSync(path.join(dir, `${name}.${theme}.geom.json`), JSON.stringify({ ...geom, url: page.url() }, null, 1));
      await page.screenshot({ path: path.join(dir, `${name}.${theme}.png`), fullPage: true });
      await page.screenshot({ path: path.join(dir, `${name}.${theme}.viewport.png`) });
      results.push({ name, theme, docH: geom.docH, rows: geom.rows.length });
      console.log(`captured ${theme}/${vp.w}/${name} docH=${geom.docH} rows=${geom.rows.length}`);
    } catch (e) {
      console.log(`FAILED capture ${vp.theme}/${vp.w}/${name}: ${String(e).slice(0, 140)}`);
    }
  }

  // ---------------- PUBLIC PAGES ----------------
  async function publicPages(vp) {
    for (const theme of ["light", "dark"]) {
      const v = { ...vp, theme };
      const ctx = await browser.createBrowserContext(); // isolated storage per theme pass
      const page = await newPage(v, ctx);
      await goto(page, BASE_URL + "/");
      await page.waitForSelector(".landing-page, .marketing-page, .platform-auth", { timeout: 25000 }).catch(() => console.log("  app shell wait timeout"));
      await sleep(2200); // cookie banner timer (1.5s) + splash guard settle
      await captureWithTheme(page, "landing-home", v);
      // support chat popover open
      const fab = await page.$(".landing-chat-fab");
      if (fab) {
        await fab.click();
        await sleep(900);
        await captureWithTheme(page, "landing-support-chat", v);
        const closeBtn = await page.$(".landing-support-popover .chat-head button");
        if (closeBtn) { await closeBtn.click(); await sleep(300); }
      }
      // cookie banner expanded (banner is visible since consent unset on fresh profile)
      const cookieBtn = await page.$(".cookie-btn-details");
      if (cookieBtn) {
        await cookieBtn.click();
        await sleep(500);
        await captureWithTheme(page, "cookie-prefs", v);
        const accept = await page.$(".cookie-btn-accept");
        if (accept) { await accept.click(); await sleep(300); }
      }
      // marketing pages via header nav
      const navMap = [["faq", "FAQ"], ["fees", "Fees"], ["about", "About"], ["case-studies", "Case Studies"]];
      for (const [slug, label] of navMap) {
        await clickByText(page, ".marketing-nav-center", new RegExp(`^${label}$`, "i"));
        await sleep(500);
        await captureWithTheme(page, `marketing-${slug}`, v);
      }
      // footer legal pages
      await clickByText(page, null, /Privacy Policy/i);
      await sleep(500);
      await captureWithTheme(page, "marketing-privacy", v);
      await clickByText(page, null, /Terms of Service/i);
      await sleep(500);
      await captureWithTheme(page, "marketing-terms", v);

      // auth screens
      await clickByText(page, null, /^Back to Yekis$/i, { optional: true }).catch(() => {});
      await clickByText(page, null, /^home$/i, { optional: true }).catch(() => {});
      // back home via brand
      await page.goto(BASE_URL + "/", { waitUntil: "load" });
      await sleep(400);
      await clickByText(page, ".marketing-nav-right", /^Sign in$/i);
      await sleep(700);
      await captureWithTheme(page, "auth-login", v);
      await clickByText(page, null, /Forgot your password/i);
      await sleep(500);
      await captureWithTheme(page, "auth-forgot", v);
      await page.goto(BASE_URL + "/", { waitUntil: "load" });
      await sleep(400);
      await clickByText(page, ".marketing-nav-right", /^Get started$/i);
      await sleep(700);
      await captureWithTheme(page, "auth-register", v);
      await page.goto(BASE_URL + "/reset-password?token=flat-audit-token", { waitUntil: "domcontentloaded" }).catch(() => {});
      await sleep(800);
      await captureWithTheme(page, "auth-reset", v);
      await page.close();
      await ctx.close();
    }
  }

  // ---------------- WORKSPACE (platform shell) ----------------
  async function workspacePages(vp, userKey, label) {
    const cred = users.creds && users.creds[userKey];
    const u = cred ? await loginUser(cred.email, cred.password).catch((e) => { console.log("login fail", e.message); return null; }) : null;
    if (!u || !u.accessToken) { console.log(`skip workspace ${label}: no user`); return; }
    for (const theme of ["light", "dark"]) {
      const v = { ...vp, theme };
      const ctx = await browser.createBrowserContext();
      const page = await newPage(v, ctx);
      await page.evaluateOnNewDocument((t) => {
        try {
          window.localStorage.setItem("yekis-api-token", t.accessToken);
          if (t.refreshToken) window.localStorage.setItem("yekis-refresh-token", t.refreshToken);
          window.localStorage.setItem("yekis_consent", JSON.stringify({ essential: true, analytics: false, marketing: false }));
        } catch (e) {}
      }, u);
      await goto(page, BASE_URL + "/");
      try {
        await page.waitForSelector(".platform-shell, .platform-auth, .staff-shell", { timeout: 20000 });
      } catch (e) { console.log("  workspace shell wait timeout"); }
      const shellType = await page.evaluate(() => document.querySelector(".platform-shell") ? "platform" : (document.querySelector(".staff-shell") ? "staff" : "auth"));
      if (shellType !== "platform") { console.log(`  ${label} got ${shellType}, expected platform-shell`); await page.close(); return; }
      await sleep(1200);
      await captureWithTheme(page, `${label}-view-overview`, v);

      // open notification popover
      const notif = await page.$(".notification-trigger");
      if (notif) {
        await notif.click();
        await sleep(600);
        await captureWithTheme(page, `${label}-popover-notifications`, v);
        await notif.click().catch(() => {});
        await sleep(300);
      }
      // user-menu is a direct logout button in this shell (no dropdown) — skip it.

      // iterate sidebar nav buttons
      const seen = new Set(["overview"]);
      for (let iter = 0; iter < 14; iter++) {
        const btn = await page.evaluateHandle(() => {
          const btns = Array.from(document.querySelectorAll(".platform-shell .sidebar-nav button"));
          return btns.map((b) => (b.textContent || "").replace(/\s+/g, " ").trim());
        });
        const labels = await btn.jsonValue();
        const next = labels.find((l) => l && !seen.has(l.toLowerCase().replace(/[^a-z0-9]+/g, "-")));
        if (!next) break;
        const slug = next.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        seen.add(next.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
        await page.evaluate((t) => {
          const btns = Array.from(document.querySelectorAll(".platform-shell .sidebar-nav button"));
          const b = btns.find((x) => (x.textContent || "").replace(/\s+/g, " ").trim() === t);
          if (b) b.click();
        }, next);
        await sleep(1000);
        await captureWithTheme(page, `${label}-view-${slug}`, v);
      }
      // profile edit
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll(".platform-shell .sidebar-nav button"));
        const b = btns.find((x) => /profile/i.test(x.textContent || ""));
        if (b) b.click();
      });
      await sleep(900);
      const editClicked = await clickByText(page, null, /Edit profile/i, { optional: true });
      if (editClicked) {
        await sleep(900);
        await captureWithTheme(page, `${label}-view-profile-edit`, v);
      }
      // settings via gear button
      const gear = await page.$(".sidebar-settings");
      if (gear) {
        await gear.click();
        await sleep(900);
        await captureWithTheme(page, `${label}-view-settings`, v);
      }
      await page.close();
    }
  }

  // ---------------- STAFF SHELL ----------------
  async function staffPages(vp) {
    const cred = users.creds && users.creds.admin;
    const u = cred ? await loginUser(cred.email, cred.password).catch((e) => { console.log("login fail", e.message); return null; }) : null;
    if (!u || !u.accessToken) { console.log("skip staff: no admin"); return; }
    for (const theme of ["light", "dark"]) {
      const v = { ...vp, theme };
      const ctx = await browser.createBrowserContext();
      const page = await newPage(v, ctx);
      await page.evaluateOnNewDocument((t) => {
        try {
          window.localStorage.setItem("yekis-api-token", t.accessToken);
          if (t.refreshToken) window.localStorage.setItem("yekis-refresh-token", t.refreshToken);
          window.localStorage.setItem("yekis_consent", JSON.stringify({ essential: true, analytics: false, marketing: false }));
        } catch (e) {}
      }, u);
      await goto(page, BASE_URL + "/");
      try {
        await page.waitForSelector(".staff-shell", { timeout: 20000 });
      } catch (e) { console.log("  staff shell wait timeout"); await page.close(); return; }
      await sleep(1200);
      await captureWithTheme(page, "staff-view-overview", v);

      const seen = new Set(["overview"]);
      for (let iter = 0; iter < 40; iter++) {
        const labelsHandle = await page.evaluateHandle(() => {
          const btns = Array.from(document.querySelectorAll(".staff-shell .sidebar-nav button"));
          return btns.map((b) => (b.textContent || "").replace(/\s+/g, " ").trim());
        });
        const labels = await labelsHandle.jsonValue();
        let next = null;
        for (const l of labels) {
          if (!l) continue;
          const slug = l.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
          if (!seen.has(slug)) { next = { label: l, slug }; break; }
        }
        if (!next) break;
        seen.add(next.slug);
        await page.evaluate((t) => {
          const btns = Array.from(document.querySelectorAll(".staff-shell .sidebar-nav button"));
          const b = btns.find((x) => (x.textContent || "").replace(/\s+/g, " ").trim() === t);
          if (b) b.click();
        }, next.label);
        await sleep(1000);
        await captureWithTheme(page, `staff-view-${next.slug}`, v);
        // If clicking this expanded a nav group, don't mark inner labels visited; loop re-queries.
      }
      await page.close();
    }
  }

  const vpDesktop = { w: 1440, h: 960, name: "desktop" };
  const vpTablet = { w: 700, h: 900, name: "tablet700" };
  const vpPhone = { w: 400, h: 850, name: "phone400" };

  if (SETS.has("public")) await publicPages(vpDesktop);
  if (SETS.has("workspace")) {
    await workspacePages(vpDesktop, "client", "ws-client");
    await workspacePages(vpDesktop, "freelancer", "ws-freelancer");
  }
  if (SETS.has("staff")) await staffPages(vpDesktop);
  if (SETS.has("responsive")) {
    await publicPages(vpPhone);
    // tablet: key divergent views
    for (const theme of ["light", "dark"]) {
      const v = { ...vpTablet, theme };
      const ctx = await browser.createBrowserContext();
      const page = await newPage(v, ctx);
      await goto(page, BASE_URL + "/");
      await captureWithTheme(page, "landing-home", v);
      await clickByText(page, ".marketing-nav-right", /^Sign in$/i);
      await sleep(700);
      await captureWithTheme(page, "auth-login", v);
      await page.close();
      if (users.creds && users.creds.client) {
        const cu = await loginUser(users.creds.client.email, users.creds.client.password).catch(() => null);
        if (!cu) continue;
        const p2 = await newPage(v, ctx);
        await p2.evaluateOnNewDocument((t) => {
          try {
            window.localStorage.setItem("yekis-api-token", t.accessToken);
            window.localStorage.setItem("yekis_consent", JSON.stringify({ essential: true, analytics: false, marketing: false }));
          } catch (e) {}
        }, cu);
        await goto(p2, BASE_URL + "/");
        try { await p2.waitForSelector(".platform-shell", { timeout: 20000 }); } catch (e) {}
        await sleep(1000);
        await captureWithTheme(p2, "ws-client-view-overview", v);
        await p2.close();
      }
      await ctx.close();
    }
  }

  fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(results, null, 1));
  await browser.close();
  console.log(`DONE ${MODE}: ${results.length} captures -> ${OUT}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
