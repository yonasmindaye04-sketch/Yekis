// Compare light vs dark geometry dumps per page/viewport; emit JSON + markdown report.
// Usage: node geometry-diff.js --mode before|after
const fs = require("fs");
const path = require("path");

const EVIDENCE_ROOT = "C:\\Users\\Za\\Desktop\\project\\Yekis\\docs\\theme-parity";
const args = process.argv.slice(2);
const MODE = (args.find((a) => a.startsWith("--mode")) || "--mode=before").split("=")[1];
const DIR = path.join(EVIDENCE_ROOT, MODE);
const TOL = 0.75; // px

function normFont(v) { return String(v || "").trim(); }

function comparePage(lightFile, darkFile) {
  const L = JSON.parse(fs.readFileSync(lightFile, "utf8"));
  const D = JSON.parse(fs.readFileSync(darkFile, "utf8"));
  const dMap = new Map();
  for (const r of D.rows) dMap.set(r.p, r);
  const diffs = [];
  let matched = 0;
  for (const l of L.rows) {
    const d = dMap.get(l.p);
    if (!d) { diffs.push({ p: l.p, kind: "missing-in-dark", l: rect(l) }); continue; }
    dMap.delete(l.p);
    matched++;
    const dx = Math.abs(l.x - d.x), dy = Math.abs(l.y - d.y), dw = Math.abs(l.w - d.w), dh = Math.abs(l.h - d.h);
    const fontDiffs = [];
    for (const k of ["fs", "lh", "fw", "ls", "ff"]) {
      if (normFont(l[k]) !== normFont(d[k])) fontDiffs.push(`${k}:${l[k]}→${d[k]}`);
    }
    const geo = [];
    if (dx > TOL) geo.push(`x:${l.x}→${d.x}`);
    if (dy > TOL) geo.push(`y:${l.y}→${d.y}`);
    if (dw > TOL) geo.push(`w:${l.w}→${d.w}`);
    if (dh > TOL) geo.push(`h:${l.h}→${d.h}`);
    if (geo.length || fontDiffs.length) {
      diffs.push({ p: l.p, geo, font: fontDiffs, l: rect(l), d: rect(d), txt: l.txt });
    }
  }
  for (const rest of dMap.values()) diffs.push({ p: rest.p, kind: "missing-in-light", d: rect(rest) });
  return {
    docH: { light: L.docH, dark: D.docH },
    countLight: L.rows.length, countDark: D.rows.length, matched,
    diffs,
  };
}
function rect(r) { return `${r.x},${r.y} ${r.w}x${r.h}`; }

const perViewport = fs.readdirSync(DIR, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
const report = [];
const summary = [];
for (const vp of perViewport) {
  const vpDir = path.join(DIR, vp);
  const lights = fs.readdirSync(vpDir).filter((f) => f.endsWith(".light.geom.json"));
  for (const lf of lights.sort()) {
    const name = lf.replace(".light.geom.json", "");
    const df = path.join(vpDir, `${name}.dark.geom.json`);
    if (!fs.existsSync(df)) { summary.push({ page: `${vp}/${name}`, error: "no dark dump" }); continue; }
    const res = comparePage(path.join(vpDir, lf), df);
    const clean = res.diffs.length === 0 && Math.abs(res.docH.light - res.docH.dark) <= TOL;
    summary.push({
      page: `${vp}/${name}`,
      docH: `${res.docH.light} vs ${res.docH.dark}`,
      matched: res.matched,
      diffCount: res.diffs.length,
      status: clean ? "PARITY" : "DIVERGED",
    });
    if (!clean) {
      report.push(`### ${vp} / ${name}`);
      report.push(`- docHeight: light=${res.docH.light} dark=${res.docH.dark}`);
      report.push(`- elements: light=${res.countLight} dark=${res.countDark} matched=${res.matched}`);
      for (const d of res.diffs.slice(0, 120)) {
        if (d.kind) report.push(`- \`${d.p}\` ${d.kind}`);
        else report.push(`- \`${d.p}\`${d.txt ? ` "${d.txt}"` : ""} ${d.geo.join(" ")} ${d.font.join(" ")} (L: ${d.l} / D: ${d.d})`);
      }
      if (res.diffs.length > 120) report.push(`- ...and ${res.diffs.length - 120} more`);
      report.push("");
    }
  }
}

const outJson = path.join(DIR, `_diff-report.json`);
fs.writeFileSync(outJson, JSON.stringify(summary, null, 1));
const diverged = summary.filter((s) => s.status === "DIVERGED");
const md = [];
md.push(`# Theme parity geometry diff — ${MODE}`);
md.push(`Generated: ${new Date().toISOString()}`);
md.push(`Viewport sections: ${perViewport.join(", ")}`);
md.push(`Pages compared: ${summary.length}; clean: ${summary.length - diverged.length}; diverged: ${diverged.length}`);
md.push("");
md.push("| Page | docH (L/D) | elements matched | diffs | status |");
md.push("|---|---|---|---|---|");
for (const s of summary) {
  md.push(`| ${s.page} | ${s.docH || s.error} | ${s.matched ?? "-"} | ${s.diffCount ?? "-"} | ${s.status || "ERROR"} |`);
}
md.push("");
md.push("## Divergence details");
md.push(report.join("\n") || "(none)");
fs.writeFileSync(path.join(DIR, `_diff-report.md`), md.join("\n"));
console.log(`pages compared: ${summary.length}, diverged: ${diverged.length}`);
console.log(diverged.map((d) => `${d.page} (${d.diffCount})`).join("\n") || "all clean");
