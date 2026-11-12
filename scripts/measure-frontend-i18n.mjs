#!/usr/bin/env node
/**
 * Measures the frontend's i18n catalogue and its untranslated copy.
 *
 * Run from `apps/backend` (where `typescript` resolves):
 *
 *   node ../scripts/measure-frontend-i18n.mjs
 *
 * It reports:
 *   - the leaf-key and nested-object count per language,
 *   - whether the four locales are in EXACT key parity (they must be — a
 *     missing Amharic string renders the raw key to the user),
 *   - how much user-facing copy is still hardcoded in the JSX.
 *
 * The JSX figure is an exact AST count (TypeScript's own parser), not a
 * regex approximation, so the number in docs/SYSTEM_DESIGN.md can be
 * reproduced and re-checked whenever the frontend changes.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..");
const frontendSrc = join(repoRoot, "apps/frontend/src");

// `typescript` lives in the frontend's own node_modules under pnpm, so it is
// resolved from there rather than from this script's location.
const frontendRequire = createRequire(
  join(repoRoot, "apps/frontend/package.json"),
);
const {
  createSourceFile,
  ScriptKind,
  SyntaxKind,
  forEachChild,
} = frontendRequire("typescript");

// ── Locale catalogue ──────────────────────────────────────────────────────
const i18nSrc = readFileSync(join(frontendSrc, "i18n.ts"), "utf8");
const start = i18nSrc.indexOf("export const translations = {");
const body = i18nSrc.slice(start);
const end = body.indexOf("\n};");
const objSrc = body
  .slice(0, end + 3)
  .replace("export const translations =", "const translations =");
const translations = new Function(`${objSrc}\nreturn translations;`)();

const leaves = (node) =>
  node === null || typeof node !== "object" || Array.isArray(node)
    ? 1
    : Object.values(node).reduce((s, v) => s + leaves(v), 0);
const nestedObjects = (node) =>
  node === null || typeof node !== "object" || Array.isArray(node)
    ? 0
    : 1 + Object.values(node).reduce((s, v) => s + nestedObjects(v), 0);

function keyPaths(node, prefix = "") {
  if (node === null || typeof node !== "object" || Array.isArray(node)) {
    return [prefix];
  }
  return Object.entries(node).flatMap(([k, v]) =>
    keyPaths(v, prefix ? `${prefix}.${k}` : k),
  );
}

const langs = Object.keys(translations);
const keySets = new Map(langs.map((l) => [l, new Set(keyPaths(translations[l]))]));

console.log("── locale catalogue ──");
for (const lang of langs) {
  console.log(
    `  ${lang}: ${leaves(translations[lang])} leaf keys, ${nestedObjects(translations[lang])} nested objects`,
  );
}

// ── Parity ────────────────────────────────────────────────────────────────
const reference = langs[0];
const missing = [];
for (const lang of langs.slice(1)) {
  for (const key of keySets.get(reference)) {
    if (!keySets.get(lang).has(key)) missing.push(`${lang} is missing "${key}"`);
  }
  for (const key of keySets.get(lang)) {
    if (!keySets.get(reference).has(key))
      missing.push(`${lang} has an extra "${key}"`);
  }
}
console.log("");
console.log(
  missing.length === 0
    ? `  parity: EXACT across ${langs.length} languages`
    : `  parity: ${missing.length} mismatch(es)`,
);
for (const m of missing.slice(0, 20)) console.log(`    ${m}`);

// ── Hardcoded copy ────────────────────────────────────────────────────────
function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

const jsxTexts = (src, fileName) => {
  const sf = createSourceFile(fileName, src, 99, true, ScriptKind.TSX);
  const texts = [];
  const visit = (node) => {
    if (node.kind === SyntaxKind.JsxText) {
      const t = node.text.trim();
      if (t.length > 1 && /[A-Za-zአት]/.test(t)) texts.push(t);
    }
    forEachChild(node, visit);
  };
  forEachChild(sf, visit);
  return texts;
};

const importsI18n = (src) =>
  /from\s+["'][^"']*i18n["']/.test(src) || /\buseI18n\b/.test(src);

const files = walk(frontendSrc);
let total = 0;
let inNonI18n = 0;
let withI18n = 0;
for (const f of files) {
  const src = readFileSync(f, "utf8");
  const has = importsI18n(src);
  if (has) withI18n++;
  const texts = jsxTexts(src, f);
  total += texts.length;
  if (!has) inNonI18n += texts.length;
}

console.log("");
console.log("── hardcoded JSX copy ──");
console.log(`  .tsx files:                ${files.length}`);
console.log(`  import the i18n module:    ${withI18n}`);
console.log(`  do NOT import it:          ${files.length - withI18n}`);
console.log(`  JSX text nodes (all):      ${total}`);
console.log(`  JSX text nodes (no i18n):  ${inNonI18n}`);

process.exit(missing.length === 0 ? 0 : 1);
