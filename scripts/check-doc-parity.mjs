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

if (hasErrors) {
  console.error("\n❌ Documentation drift detected! Please update the corresponding documentation files.");
  process.exit(1);
} else {
  console.log("\n🎉 Complete alignment! Documentation matches the codebase.");
  process.exit(0);
}
