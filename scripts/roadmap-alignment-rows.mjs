#!/usr/bin/env node
/**
 * Prints every roadmap row with its status, bucketed by phase, so the
 * Summary Counts table can be audited against the rows it summarises.
 *
 * Run: node scripts/roadmap-alignment-rows.mjs [path]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const path = resolve(process.argv[2] ?? "docs/ROADMAP_ALIGNMENT.md");
const lines = readFileSync(path, "utf8").split(/\r?\n/);

let phase = "";
let sub = "";

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
    else if (/Legal & Compliance \(Phase 1\)/.test(s))
      sub = "legal / ops / finance";
    else sub = "";
    continue;
  }
  if (!line.startsWith("|")) continue;
  if (/^\|\s*-/.test(line)) continue;
  if (/^\|\s*(Roadmap item|#\s*\||Phase\s*\||Status label)/.test(line)) continue;

  const key =
    phase === "Phase 1" && sub ? `Phase 1 (${sub})` : phase;
  if (!key) continue;

  const cells = line.split("|");
  const item = (cells[1] ?? "").trim();
  const status = (cells[2] ?? "").trim();
  const marker = status.split(/\s/)[0];
  console.log(
    `${key.padEnd(30)} ${marker.padEnd(3)} ${item.slice(0, 76)}`,
  );
}
