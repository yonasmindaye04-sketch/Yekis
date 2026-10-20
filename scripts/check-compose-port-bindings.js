#!/usr/bin/env node
/**
 * Fails when a published port in a compose file is not bound to 127.0.0.1.
 *
 * WHY
 * `ports: - "5433:5432"` publishes on every interface, so Postgres, Redis and
 * MinIO are reachable from anything that can route to the host — a laptop on
 * the same network, a VM, a container. Every one of those services here has a
 * known-weak or default credential, so an exposed port is an exposed database.
 * The explicit form `127.0.0.1:5433:5432` restricts the listener to loopback.
 *
 * Exits non-zero and prints file:line for each offending port. Port VALUES are
 * never printed in full; only the line number and whether a host IP is present.
 *
 * Usage: node scripts/check-compose-port-bindings.js [file ...]
 */
const fs = require("node:fs");
const path = require("node:path");

const DEFAULT_FILES = ["docker-compose.yml", "docker-compose.yaml", "docker-compose.override.yml"];

/** True when a compose `ports` entry omits an explicit host IP. */
function portIsUnbound(spec) {
  const value = String(spec).trim().replace(/^["']|["']$/g, "");
  if (value.length === 0) return false;

  // Ignore non-port entries.
  if (value.startsWith("/")) return false;

  const parts = value.split(":");

  // "3000"            -> container only, not published
  // "3000-3005"       -> container only
  // "5433:5432"       -> published, NO host IP      <-- the problem
  // "127.0.0.1:5433:5432" -> published, host IP present
  if (parts.length < 2) return false;

  const host = parts[0].trim();
  if (host.length === 0) return true;

  // A host IP must be a loopback address for a dev-only service.
  return !/^(127\.0\.0\.1|localhost|\[::1\])$/.test(host);
}

function checkFile(file) {
  const abs = path.resolve(file);
  if (!fs.existsSync(abs)) {
    return { file, missing: true, offenders: [] };
  }
  const lines = fs.readFileSync(abs, "utf8").split(/\r?\n/);

  const offenders = [];
  let inPorts = false;
  let portsIndent = 0;

  lines.forEach((line, index) => {
    // Enter a `ports:` block. Unconditional: `portsIndent` still holds the
    // PREVIOUS block's indent here, so testing it against 0 would silently
    // skip every block after the first.
    const portsMatch = line.match(/^(\s*)ports:\s*(\[\s*\])?\s*$/);
    if (portsMatch) {
      portsIndent = portsMatch[1].length;
      // An inline empty list publishes nothing.
      inPorts = !portsMatch[2];
      return;
    }

    if (!inPorts) return;

    const trimmed = line.trim();

    // Leaving the block: a non-list line at or below the ports indent.
    const currentIndent = line.match(/^\s*/)[0].length;
    if (trimmed.length > 0 && currentIndent <= portsIndent) {
      inPorts = false;
      return;
    }

    // A list item: `- "host:container"`.
    const item = trimmed.match(/^-\s*(.+)$/);
    if (item && portIsUnbound(item[1])) {
      offenders.push(index + 1);
    }
  });

  return { file, missing: false, offenders };
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length > 0 ? args : DEFAULT_FILES;

  let failures = 0;
  let checked = 0;

  for (const file of files) {
    const result = checkFile(file);
    if (result.missing) {
      console.log(`skip   ${file} (not present)`);
      continue;
    }
    checked += 1;

    if (result.offenders.length === 0) {
      console.log(`ok     ${file}`);
      continue;
    }

    failures += result.offenders.length;
    for (const lineNo of result.offenders) {
      // Line number only: the value may carry a host/port pair we do not need
      // to echo, and this keeps output free of anything environment-specific.
      console.error(
        `FAIL   ${file}:${lineNo} published port has no 127.0.0.1 host binding`,
      );
    }
  }

  if (checked === 0) {
    console.error("FAIL   no compose file found to check");
    process.exit(1);
  }

  if (failures > 0) {
    console.error(
      `\n${failures} published port(s) are not bound to 127.0.0.1. ` +
        `Use "127.0.0.1:HOST:CONTAINER" so the service is loopback-only.`,
    );
    process.exit(1);
  }

  console.log("\nAll published ports are bound to 127.0.0.1.");
}

main();