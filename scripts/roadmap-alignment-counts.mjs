#!/usr/bin/env node
/**
 * Counts the status labels in docs/ROADMAP_ALIGNMENT.md per phase, so the
 * "Summary Counts" table can be checked against the tables it summarises.
 *
 * Run: node scripts/roadmap-alignment-counts.mjs [path]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.argv[2] ?? "docs/ROADMAP_ALIGNMENT.md");
const lines = readFileSync(path, "utf8").split(/\r?\n/);

const counts = new Map();
let phase = "";
let sub = "";

const bucket = () => {
  if (!phase) return null;
  if (phase === "Phase 1" && sub) return `Phase 1 (${sub})`;
  return phase;
};

const bump = (key, label) => {
  if (!key) return;
  if (!counts.has(key)) {
    counts.set(key, { impl: 0, part: 0, stub: 0, blk: 0, not: 0, div: 0 });
  }
  counts.get(key)[label] += 1;
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

  const key = bucket();
  if (!key) continue;

  // The status is the SECOND cell of the row, not the first.
  const cells = line.split("|");
  const status = (cells[2] ?? "").trim();

  if (status.startsWith("✅")) bump(key, "impl");
  else if (status.startsWith("🟡")) bump(key, "part");
  // ⟡ is used for "needs real traffic / real volume" — a partial, and it is
  // the only marker outside the six in the legend table.
  else if (status.startsWith("⟡")) bump(key, "part");
  else if (status.startsWith("🔵")) bump(key, "stub");
  else if (status.startsWith("⛔")) bump(key, "blk");
  else if (status.startsWith("⚪")) bump(key, "not");
  else if (status.startsWith("⚠️")) bump(key, "div");
}

const order = [
  "Phase 0",
  "Phase 1 (backend)",
  "Phase 1 (frontend)",
  "Phase 1 (legal / ops / finance)",
  "Phase 2",
  "Phase 3",
  "Phase 4",
];

console.log(
  "phase".padEnd(30) +
    "impl | part | stub | blocked | notStarted | divergence",
);
for (const key of order) {
  const c = counts.get(key);
  if (!c) {
    console.log(`${key} -> MISSING`);
    continue;
  }
  console.log(
    key.padEnd(30) +
      `${c.impl} | ${c.part} | ${c.stub} | ${c.blk} | ${c.not} | ${c.div}`,
  );
}
