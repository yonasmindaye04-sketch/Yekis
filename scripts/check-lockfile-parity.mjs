#!/usr/bin/env node
/**
 * Lockfile ↔ manifest parity gate.
 *
 * The image installs with `pnpm install --frozen-lockfile` (see the Dockerfile).
 * pnpm refuses to install when a workspace manifest declares a dependency the
 * lockfile's importer for that workspace does not record — with
 * `ERR_PNPM_OUTDATED_LOCKFILE`. The build then fails *before it starts*, and
 * the failure looks like a platform problem rather than a manifest problem.
 *
 * That has happened twice on this repository:
 *   - `aa2434b` added `@google/genai` to the root manifest without
 *     regenerating the lockfile;
 *   - `5dc53d4` added `react-icons` to the ROOT manifest even though the
 *     frontend workspace (where every `react-icons` import lives) already
 *     declared it, so the root importer was left out of sync.
 *
 * This gate compares every workspace manifest with the lockfile's importer
 * for the same workspace: the dependency sets must match exactly, and the
 * specifier of each dependency must match the one the lockfile recorded.
 * It reads the lockfile as text and needs no network and no package manager.
 *
 *   node scripts/check-lockfile-parity.mjs
 *
 * Exit code 0 = every workspace agrees with the lockfile.
 * Exit code 1 = at least one workspace drifted; the differences are printed.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** The workspaces pnpm-lock.yaml's `importers:` section records. */
const WORKSPACES = [".", "apps/backend", "apps/frontend", "packages/schemas"];

/**
 * Reads one workspace manifest's dependencies and devDependencies.
 *
 * @param {string} dir workspace directory, relative to the repository root
 * @returns {{ dependencies: Record<string, string>, devDependencies: Record<string, string> }}
 */
function readManifest(dir) {
  const file = path.join(ROOT, dir, "package.json");
  if (!fs.existsSync(file)) {
    throw new Error(`missing manifest: ${file}`);
  }
  const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
  return {
    dependencies: pkg.dependencies ?? {},
    devDependencies: pkg.devDependencies ?? {},
  };
}

/**
 * Parses one importer block out of the lockfile.
 *
 * The block is YAML, but only the `specifier:` lines under a dependency name
 * are needed, so the text is read line by line rather than with a YAML
 * parser (the repository has no YAML dependency at the root, and adding one
 * for a check would be worse than the check).
 *
 * The sections are kept apart, because pnpm compares them separately: a
 * dependency listed under `dependencies` in the manifest and under
 * `devDependencies` in the lockfile is a drift, not a match.
 *
 * @param {string[]} lines the lockfile's lines
 * @param {number} start the index of the importer key
 * @returns {{ dependencies: Record<string, string>, devDependencies: Record<string, string> }}
 */
function parseImporter(lines, start) {
  /** @type {{ dependencies: Record<string, string>, devDependencies: Record<string, string> }} */
  const sections = { dependencies: {}, devDependencies: {} };
  /** @type {string | null} */
  let current = null;
  /** @type {"dependencies" | "devDependencies" | null} */
  let section = null;

  for (let i = start + 1; i < lines.length; i += 1) {
    const line = lines[i];
    // A new importer, the `packages:` section or `snapshots:` ends the block.
    if (/^  \S/.test(line) || /^(packages|snapshots):/.test(line)) break;

    const header = line.match(/^    (dependencies|devDependencies):\s*$/);
    if (header) {
      section = header[1];
      current = null;
      continue;
    }
    if (/^    \S/.test(line)) {
      section = null;
      current = null;
      continue;
    }
    if (!section) continue;

    const name = line.match(/^      '?([^':]+)'?:\s*$/);
    if (name) {
      current = name[1];
      continue;
    }
    const specifier = line.match(/^        specifier:\s*(.+?)\s*$/);
    if (specifier && current) {
      sections[section][current] = specifier[1].replace(/^['"]|['"]$/g, "");
      current = null;
    }
  }
  return sections;
}

/**
 * Finds the line where an importer block starts.
 *
 * @param {string[]} lines the lockfile's lines
 * @param {string} workspace the workspace directory
 * @returns {number} the 0-based index of the importer key, or -1 when absent
 */
function findImporter(lines, workspace) {
  const key = workspace === "." ? "  .:" : `  ${workspace}:`;
  return lines.findIndex((line) => line === key);
}

const lockPath = path.join(ROOT, "pnpm-lock.yaml");
if (!fs.existsSync(lockPath)) {
  console.error(`❌ missing lockfile: ${lockPath}`);
  process.exit(1);
}
const lines = fs.readFileSync(lockPath, "utf8").split(/\r?\n/);

let drift = 0;

for (const workspace of WORKSPACES) {
  const manifest = readManifest(workspace);
  const importerLine = findImporter(lines, workspace);
  if (importerLine === -1) {
    console.error(`❌ ${workspace}: no importer block in pnpm-lock.yaml`);
    drift += 1;
    continue;
  }
  const locked = parseImporter(lines, importerLine);

  // Forward: every dependency the manifest declares must be in the lockfile
  // importer for the same workspace, under the same section, with the same
  // specifier.
  for (const field of ["dependencies", "devDependencies"]) {
    const declared = manifest[field];
    for (const [name, specifier] of Object.entries(declared)) {
      const lockedSpecifier = locked[field][name];
      if (lockedSpecifier === undefined) {
        console.error(
          `❌ ${workspace}: ${field}.${name} (${specifier}) is not in the lockfile importer`,
        );
        drift += 1;
      } else if (lockedSpecifier !== specifier) {
        console.error(
          `❌ ${workspace}: ${field}.${name} manifest says ${specifier}, lockfile says ${lockedSpecifier}`,
        );
        drift += 1;
      }
    }
  }

  // Reverse: the lockfile importer must not list a dependency the manifest
  // does not. pnpm compares the two specifier SETS, so an orphan entry in the
  // lockfile fails `--frozen-lockfile` just as surely as a missing one —
  // `ERR_PNPM_OUTDATED_LOCKFILE`, before the image build starts. This is the
  // direction a one-sided check misses, and it is how a merge can leave a
  // lockfile that records a dependency a manifest no longer declares.
  for (const field of ["dependencies", "devDependencies"]) {
    for (const [name, specifier] of Object.entries(locked[field])) {
      if (!(name in manifest[field])) {
        console.error(
          `❌ ${workspace}: the lockfile importer lists ${field}.${name} ` +
            `(${specifier}) but the manifest does not declare it`,
        );
        drift += 1;
      }
    }
  }
}

if (drift > 0) {
  console.error(
    `\n❌ ${drift} lockfile/manifest difference(s). The image installs with ` +
      `\`pnpm install --frozen-lockfile\` and will refuse to build.`,
  );
  process.exit(1);
}

console.log(
  `✅ Every workspace manifest agrees with pnpm-lock.yaml ` +
    `(${WORKSPACES.length} importers checked). The image's ` +
    `\`pnpm install --frozen-lockfile\` will resolve.`,
);
