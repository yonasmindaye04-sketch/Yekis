#!/usr/bin/env node
import fs from "fs";
import path from "path";

const rootDir = process.cwd();

console.log("🔍 Checking Documentation & Codebase Parity...");

let hasErrors = false;

// 1. Verify Prisma Models in docs/DATABASE.md
const schemaPath = path.join(rootDir, "apps/backend/prisma/schema.prisma");
const dbDocPath = path.join(rootDir, "docs/DATABASE.md");

if (fs.existsSync(schemaPath) && fs.existsSync(dbDocPath)) {
  const schemaContent = fs.readFileSync(schemaPath, "utf-8");
  const dbDocContent = fs.readFileSync(dbDocPath, "utf-8");

  const modelMatches = [...schemaContent.matchAll(/^model\s+([A-Za-z0-9_]+)\s*\{/gm)];
  const models = modelMatches.map(m => m[1]);

  console.log(`\n📦 Checking ${models.length} Prisma Models against docs/DATABASE.md...`);
  const missingModels = [];

  for (const model of models) {
    // Model should appear as `ModelName` or in text in DATABASE.md
    if (!dbDocContent.includes(model)) {
      missingModels.push(model);
    }
  }

  if (missingModels.length > 0) {
    console.error(`❌ Missing models in docs/DATABASE.md: ${missingModels.join(", ")}`);
    hasErrors = true;
  } else {
    console.log(`✅ All ${models.length} Prisma models are documented in docs/DATABASE.md.`);
  }
}

// 2. Verify Backend Modules in docs/ARCHITECTURE.md
const modulesDir = path.join(rootDir, "apps/backend/src/modules");
const archDocPath = path.join(rootDir, "docs/ARCHITECTURE.md");

if (fs.existsSync(modulesDir) && fs.existsSync(archDocPath)) {
  const modules = fs.readdirSync(modulesDir).filter(f => {
    return fs.statSync(path.join(modulesDir, f)).isDirectory();
  });
  const archDocContent = fs.readFileSync(archDocPath, "utf-8");

  console.log(`\n🏛️ Checking ${modules.length} Backend Modules against docs/ARCHITECTURE.md...`);
  const missingModules = [];

  for (const mod of modules) {
    if (!archDocContent.includes(`\`${mod}\``) && !archDocContent.includes(`/${mod}`)) {
      missingModules.push(mod);
    }
  }

  if (missingModules.length > 0) {
    console.error(`❌ Missing modules in docs/ARCHITECTURE.md: ${missingModules.join(", ")}`);
    hasErrors = true;
  } else {
    console.log(`✅ All ${modules.length} backend modules are documented in docs/ARCHITECTURE.md.`);
  }
}

// 3. Verify Route Groups in docs/API.md
const apiDocPath = path.join(rootDir, "docs/API.md");
const appTsPath = path.join(rootDir, "apps/backend/src/app.ts");

if (fs.existsSync(appTsPath) && fs.existsSync(apiDocPath)) {
  const appContent = fs.readFileSync(appTsPath, "utf-8");
  const apiDocContent = fs.readFileSync(apiDocPath, "utf-8");

  const mountMatches = [...appContent.matchAll(/app\.use\(["'](\/api\/v1\/[a-zA-Z0-9_\/-]+)["']/g)];
  const mountedPaths = mountMatches.map(m => m[1]);

  console.log(`\n🌐 Checking ${mountedPaths.length} Mounted API Paths against docs/API.md...`);
  const missingPaths = [];

  for (const p of mountedPaths) {
    if (!apiDocContent.includes(p)) {
      missingPaths.push(p);
    }
  }

  if (missingPaths.length > 0) {
    console.error(`❌ Missing API mount paths in docs/API.md: ${missingPaths.join(", ")}`);
    hasErrors = true;
  } else {
    console.log(`✅ All ${mountedPaths.length} mounted API routes are represented in docs/API.md.`);
  }
}

// 4. Verify SYSTEM_DESIGN.md canonical coverage
const sysDesignPath = path.join(rootDir, "docs/SYSTEM_DESIGN.md");
if (fs.existsSync(sysDesignPath)) {
  const sysContent = fs.readFileSync(sysDesignPath, "utf-8");
  const requiredKeywords = [
    "Gig Marketplace",
    "Chart of Accounts",
    "Operations Console",
    "Multilingual",
    "Telebirr B2C",
    "OpenSearch",
  ];

  console.log(`\n📘 Checking Canonical SYSTEM_DESIGN.md topic coverage...`);
  const missingKeywords = [];
  for (const kw of requiredKeywords) {
    if (!sysContent.includes(kw)) {
      missingKeywords.push(kw);
    }
  }

  if (missingKeywords.length > 0) {
    console.error(`❌ Missing topics in docs/SYSTEM_DESIGN.md: ${missingKeywords.join(", ")}`);
    hasErrors = true;
  } else {
    console.log(`✅ All critical architectural topics are covered in docs/SYSTEM_DESIGN.md.`);
  }
}

// 5. Verify the ROADMAP_ALIGNMENT.md summary counts against its own tables.
//
// WHY THIS EXISTS
// The "Summary Counts" table in docs/ROADMAP_ALIGNMENT.md had never been
// reconciled with the tables it summarises. It claimed 8 not-started items in
// Phase 2 where the table has 5, 3 blocked items in Phase 1 (backend) where
// the table has none, and 2 stub items in Phase 0 where the table has none.
//
// A summary that does not match its source cannot be updated reliably: every
// status change has to be applied twice, by hand, and the hand-applied copy
// is the one that goes stale. This check counts the rows and compares them.
//
// Run `node scripts/roadmap-alignment-counts.mjs` to print the counts.
const roadmapPath = path.join(rootDir, "docs/ROADMAP_ALIGNMENT.md");
if (fs.existsSync(roadmapPath)) {
  console.log(`\n?? Checking ROADMAP_ALIGNMENT.md summary counts against its tables...`);
  const roadmapContent = fs.readFileSync(roadmapPath, "utf-8");

  const lines = roadmapContent.split(/\r?\n/);
  const counts = new Map();
  let phase = "";
  let sub = "";

  const key = () => {
    if (!phase) return null;
    if (phase === "Phase 1" && sub) return `Phase 1 (${sub})`;
    return phase;
  };

  for (const line of lines) {
    const phaseMatch = line.match(/^## Phase (\d)/);
    if (phaseMatch) {
      phase = `Phase ${phaseMatch[1]}`;
      sub = "";
      continue;
    }
    const subMatch = line.match(/^### (.+)$/);
    if (subMatch) {
      const s = subMatch[1];
      if (/Core Backend/.test(s)) sub = "backend";
      else if (/Frontend/.test(s)) sub = "frontend";
      else if (/Legal & Compliance \(Phase 1\)/.test(s)) sub = "legal / ops / finance";
      else sub = "";
      continue;
    }
    if (!line.startsWith("|")) continue;
    if (/^\|\s*-/.test(line)) continue;
    if (/^\|\s*(Roadmap item|#\s*\||Phase\s*\||Status label)/.test(line)) continue;

    const k = key();
    if (!k) continue;
    if (!counts.has(k)) {
      counts.set(k, { impl: 0, part: 0, stub: 0, blk: 0, not: 0, div: 0 });
    }
    const c = counts.get(k);
    const status = (line.split("|")[2] ?? "").trim();
    if (status.startsWith("✅")) c.impl++;
    else if (status.startsWith("🟡") || status.startsWith("⟡")) c.part++;
    else if (status.startsWith("🔵")) c.stub++;
    else if (status.startsWith("⛔")) c.blk++;
    else if (status.startsWith("⚪")) c.not++;
    else if (status.startsWith("⚠️")) c.div++;
  }

  // The summary table's own rows, in order.
  const summaryRows = [...roadmapContent.matchAll(
    /^\|\s*(Phase [0-9][^|]*?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gm,
  )];

  const drift = [];
  for (const row of summaryRows) {
    const name = row[1].trim();
    const claimed = {
      impl: Number(row[2]),
      part: Number(row[3]),
      stub: Number(row[4]),
      blk: Number(row[5]),
      not: Number(row[6]),
      div: Number(row[7]),
    };
    const actual = counts.get(name);
    if (!actual) {
      drift.push(`${name}: no rows found for this phase`);
      continue;
    }
    for (const field of ["impl", "part", "stub", "blk", "not", "div"]) {
      if (claimed[field] !== actual[field]) {
        drift.push(
          `${name}: ${field} says ${claimed[field]}, the tables have ${actual[field]}`,
        );
      }
    }
  }

  if (drift.length > 0) {
    console.error(`? Summary counts do not match the tables:`);
    for (const d of drift) console.error(`  - ${d}`);
    console.error(
      `  Run: node scripts/roadmap-alignment-counts.mjs  (and scripts/roadmap-alignment-rows.mjs to list the rows)`,
    );
    hasErrors = true;
  } else {
    console.log(`? All ${summaryRows.length} summary rows match their tables.`);
  }
}

// 6. Verify the canonical design document actually covers the codebase.
//
// WHY THIS EXISTS
// `docs/SYSTEM_DESIGN.md` is the canonical document, and it had drifted so far
// that its table of contents promised six sections whose bodies did not exist
// (Gigs, Finance, Search, Admin/RBAC, the Ops Console, Multilingual), while
// six backend modules had no section at all. A document that promises sections
// it does not contain cannot be maintained.
//
// This check fails when:
//   - a backend module has no "### 3.x Module: ..." section,
//   - a table-of-contents entry points at a section that does not exist,
//   - the frontend view map omits a view the app can actually show,
//   - a removed payment provider is still described as a live integration.
//
// It is deliberately a *coverage* check, not a correctness check. It cannot
// tell that a section is wrong — only that one is missing.

const designPath = path.join(rootDir, "docs/SYSTEM_DESIGN.md");
if (fs.existsSync(designPath)) {
  console.log(`\n?? Checking SYSTEM_DESIGN.md covers the codebase...`);
  const design = fs.readFileSync(designPath, "utf-8");

  // --- 6a. Every backend module has a deep-dive section. ---
  const modulesDir = path.join(rootDir, "apps/backend/src/modules");
  const backendModules = fs
    .readdirSync(modulesDir)
    .filter((f) => fs.statSync(path.join(modulesDir, f)).isDirectory());

  const uncoveredModules = [];
  for (const mod of backendModules) {
    // A section names its module directory, e.g. "### 3.13 Module: Gigs ... (`apps/backend/src/modules/gigs/`)".
    const mentioned = design.includes(`src/modules/${mod}/`);
    if (!mentioned) uncoveredModules.push(mod);
  }

  if (uncoveredModules.length > 0) {
    console.error(
      `? Backend modules with no section in docs/SYSTEM_DESIGN.md: ${uncoveredModules.join(", ")}`,
    );
    console.error(
      `  Add a "### 3.x Module: ..." section for each, or say why the module needs none.`,
    );
    hasErrors = true;
  } else {
    console.log(
      `? All ${backendModules.length} backend modules have a section in SYSTEM_DESIGN.md.`,
    );
  }

  // --- 6b. Every table-of-contents entry resolves to a real heading. ---
  //
  // The slug is GitHub's: lowercase, drop everything that is not a word
  // character, a space or a hyphen, then turn EACH space into a hyphen.
  // Collapsing runs of whitespace (`\s+`) would produce a different anchor
  // for a heading like "Identity & Authentication", where the removed `&`
  // leaves two spaces and GitHub emits a double hyphen.
  const headings = new Set(
    [...design.matchAll(/^#{2,4}\s+(.+)$/gm)].map((m) =>
      m[1]
        .trim()
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s/g, "-"),
    ),
  );
  const tocBlock = design.split("## Table of Contents")[1]?.split("\n---")[0] ?? "";
  const danglingToc = [];
  for (const m of tocBlock.matchAll(/\]\(#([\w-]+)\)/g)) {
    if (!headings.has(m[1])) danglingToc.push(m[1]);
  }
  if (danglingToc.length > 0) {
    console.error(
      `? Table-of-contents entries with no matching heading: ${danglingToc.join(", ")}`,
    );
    hasErrors = true;
  } else {
    console.log(`? Every table-of-contents entry resolves to a heading.`);
  }

  // ...and the other way round. A heading that exists but is not in the table
  // of contents is a section nobody will find, which is how the six promised
  // sections went missing in the first place.
  const tocAnchors = new Set(
    [...tocBlock.matchAll(/\]\(#([\w-]+)\)/g)].map((m) => m[1]),
  );
  const orphanedHeadings = [];
  for (const m of design.matchAll(/^###\s+(3\.\d+\s+Module:.*)$/gm)) {
    const slug = m[1]
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s/g, "-");
    if (!tocAnchors.has(slug)) orphanedHeadings.push(m[1].trim());
  }
  if (orphanedHeadings.length > 0) {
    console.error(
      `? Module sections missing from the table of contents: ${orphanedHeadings.join(", ")}`,
    );
    hasErrors = true;
  } else {
    console.log(`? Every module section is listed in the table of contents.`);
  }

  // --- 6c. The frontend view map lists every view the app can show. ---
  const platformApp = path.join(rootDir, "apps/frontend/src/FullPlatformApp.tsx");
  if (fs.existsSync(platformApp)) {
    const app = fs.readFileSync(platformApp, "utf-8");
    const viewUnion = app.match(/type View\s*=\s*([\s\S]*?);/);
    const views = viewUnion
      ? [...viewUnion[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1])
      : [];
    // The fence may be CRLF, so match any line ending after the backticks.
    const viewMap = design.match(
      /#### View & Route System[\s\S]*?```\r?\n([\s\S]*?)```/,
    );
    const mappedViews = viewMap
      ? [...viewMap[1].matchAll(/"([a-z-]+)"/g)].map((m) => m[1])
      : [];
    const missingViews = views.filter((v) => !mappedViews.includes(v));
    if (missingViews.length > 0) {
      console.error(
        `? Frontend views missing from the SYSTEM_DESIGN.md view map: ${missingViews.join(", ")}`,
      );
      hasErrors = true;
    } else {
      console.log(`? All ${views.length} frontend views appear in the view map.`);
    }
  }

  // --- 6d. A removed payment provider is not described as live. ---
  //
  // Chapa was removed from the approved payment architecture (PAY-002). A
  // document that still lists it as a collection rail misleads anyone
  // integrating against it.
  //
  // The check looks for the specific ways the document used to describe Chapa
  // as live — as a peer rail, as an adapter, as a webhook. A bare mention of
  // the name is NOT a failure: the enum member is inert and still says
  // "CHAPA", and the note explaining that has to be able to name it.
  const chapaAsLive = [...design.matchAll(/^.*chapa.*$/gim)]
    .map((m) => m[0])
    .filter((line) => {
      // A struck-through row, or one that says it was removed, is the
      // document recording the removal — that is exactly right, not drift.
      if (/~~/.test(line)) return false;
      if (/REMOVED|removed|deleted|no adapter/i.test(line)) return false;
      return /Telebirr,\s*Chapa|Chapa\s+or\s+CBE|ChapaGW|webhooks\/chapa|chapa\.client|Chapa Payment Aggregator/i.test(
        line,
      );
    });
  if (chapaAsLive.length > 0) {
    console.error(
      `? Chapa is removed but SYSTEM_DESIGN.md still describes it as live:`,
    );
    for (const line of chapaAsLive) console.error(`  ${line.trim().slice(0, 140)}`);
    hasErrors = true;
  } else {
    console.log(`? No removed payment provider is described as live.`);
  }
}

// 7. Verify the four frontend locales are in EXACT key parity.
//
// WHY THIS IS A GATE AND NOT A NOTE
// The locale objects are looked up with a fallback chain — `locales[lang]?.[key]
// || locales.en?.[key] || key`. A missing Amharic key therefore does not
// crash: it silently renders the English string, or worse, the raw key
// ("workspace.jobs.status.SHORTLISTED") straight into the interface. Nothing
// else would notice, and a user in Amharic would see it.
//
// The check evaluates the locale object directly, so it needs no TypeScript
// toolchain.
const i18nPath = path.join(rootDir, "apps/frontend/src/i18n.ts");
if (fs.existsSync(i18nPath)) {
  console.log(`\n?? Checking the frontend locales are in exact parity...`);
  const i18nSrc = fs.readFileSync(i18nPath, "utf-8");
  const start = i18nSrc.indexOf("export const translations = {");
  if (start >= 0) {
    const body = i18nSrc.slice(start);
    const end = body.indexOf("\n};");
    let translations = null;
    try {
      translations = new Function(
        `${body.slice(0, end + 3).replace("export const translations =", "const translations =")}\nreturn translations;`,
      )();
    } catch (err) {
      console.error(`? Could not evaluate the locale object: ${err.message}`);
      hasErrors = true;
    }

    if (translations) {
      const keyPaths = (node, prefix = "") =>
        node === null || typeof node !== "object" || Array.isArray(node)
          ? [prefix]
          : Object.entries(node).flatMap(([k, v]) =>
              keyPaths(v, prefix ? `${prefix}.${k}` : k),
            );
      const langs = Object.keys(translations);
      const reference = langs[0];
      const mismatches = [];
      for (const lang of langs.slice(1)) {
        const ref = new Set(keyPaths(translations[reference]));
        const own = new Set(keyPaths(translations[lang]));
        for (const key of ref) {
          if (!own.has(key)) mismatches.push(`${lang} is missing "${key}"`);
        }
        for (const key of own) {
          if (!ref.has(key)) mismatches.push(`${lang} has an extra "${key}"`);
        }
      }
      if (mismatches.length > 0) {
        console.error(
          `? The frontend locales are not in exact parity (${mismatches.length} mismatch(es)):`,
        );
        for (const m of mismatches.slice(0, 20)) console.error(`  - ${m}`);
        console.error(
          `  A missing key falls back to English, or renders the raw key to the user.`,
        );
        hasErrors = true;
      } else {
        console.log(
          `? All ${langs.length} locales have identical key sets (${langs.join(", ")}).`,
        );
      }
    }
  }
}

if (hasErrors) {
  console.error("\n❌ Documentation drift detected! Please update the corresponding documentation files.");
  process.exit(1);
} else {
  console.log("\n🎉 Complete alignment! Documentation matches the codebase.");
  process.exit(0);
}
