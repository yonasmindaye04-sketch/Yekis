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
    "General Ledger",
    "Operations Console",
    "Multilingual",
    "Telebirr B2C",
    "OpenSearch"
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

if (hasErrors) {
  console.error("\n❌ Documentation drift detected! Please update the corresponding documentation files.");
  process.exit(1);
} else {
  console.log("\n🎉 Complete alignment! Documentation matches the codebase.");
  process.exit(0);
}
