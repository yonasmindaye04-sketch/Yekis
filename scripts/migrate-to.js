#!/usr/bin/env node
/**
 * Guarded `prisma migrate deploy` for a NAMED database.
 *
 * WHY THIS EXISTS
 * `prisma migrate deploy` reads DATABASE_URL. It does not read DATABASE_URL_TEST,
 * so setting that variable changes nothing and the migration silently lands on
 * the DEVELOPMENT database. That has happened twice on this branch:
 *
 *   1. 20261013120000_ledger_journal_balance_guard -- reverted by hand.
 *   2. 20261013130000_phone_verification_otp -- reverted by hand, but because
 *      the row for (1) had been deleted, the same stray deploy ALSO re-applied
 *      it, and the log line was filtered out of the console output before it
 *      was read. So the revert was undone and nobody noticed until the next
 *      audit.
 *
 * Both had to be cleaned up by hand against a live database. This script makes
 * that failure mode impossible rather than merely discouraged.
 *
 * USAGE
 *   node scripts/migrate-to.js test
 *   node scripts/migrate-to.js dev        # requires --i-mean-it
 *
 * Rules, in order:
 *   1. The target name must be given explicitly. There is no default.
 *   2. The URL for that target is resolved and must contain the word "test"
 *      when the target is `test`, and must NOT contain it when it is `dev`.
 *   3. The database name is re-read from the server before deploying, so a .env
 *      pointing somewhere unexpected is caught rather than trusted.
 *   4. `dev` additionally requires --i-mean-it, because a migration that is
 *      meant for staging should never quietly land on a developer machine.
 */

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const target = process.argv[2];
const confirmed = process.argv.includes("--i-mean-it");

if (target !== "test" && target !== "dev") {
  console.error(
    "Usage: node scripts/migrate-to.js <test|dev> [--i-mean-it]\n" +
      "There is no default target on purpose.",
  );
  process.exit(2);
}

if (target === "dev" && !confirmed) {
  console.error(
    "Refusing to migrate the development database without --i-mean-it.",
  );
  process.exit(2);
}

/** Reads KEY=value from the backend .env without printing anything else. */
function readEnvValue(key) {
  const envPath = path.join(__dirname, "..", "apps", "backend", ".env");
  if (!fs.existsSync(envPath)) return undefined;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.*)$`));
    if (match) return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return undefined;
}

const url =
  target === "test" ? readEnvValue("DATABASE_URL_TEST") : readEnvValue("DATABASE_URL");

if (!url) {
  console.error(`Could not read the URL for target "${target}".`);
  process.exit(2);
}

const urlMentionsTest = /test/i.test(url);
if (target === "test" && !urlMentionsTest) {
  console.error('Target is "test" but the resolved URL does not contain "test".');
  process.exit(2);
}
if (target === "dev" && urlMentionsTest) {
  console.error('Target is "dev" but the resolved URL contains "test".');
  process.exit(2);
}

const databaseName = new URL(url).pathname.replace(/^\//, "");

console.log(`Target      : ${target}`);
console.log(`Database    : ${databaseName}`);

// Ask the server what it is actually connected to. This is the check that would
// have caught both incidents: the .env can be right while something else is
// not, and a deploy that cannot be attributed is not one to run.
let serverName;
try {
  const out = execFileSync("psql", [url, "-tAc", "SELECT current_database();"], {
    encoding: "utf8",
  });
  serverName = out.trim();
} catch {
  console.error("Could not confirm the server's database. Not deploying.");
  process.exit(2);
}

if (serverName !== databaseName) {
  console.error(
    `URL says "${databaseName}" but the server reports "${serverName}". Not deploying.`,
  );
  process.exit(2);
}

console.log(`Confirmed   : ${serverName}`);
console.log("");

// npx on Windows is a .cmd shim. Node refuses to spawn one without a shell
// (EINVAL), and since Node 18 that restriction is enforced, so shell:true is
// required rather than optional. The arguments are fixed literals, not user
// input, so this does not widen an injection surface.
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
// prisma is a dependency of apps/backend, not of the repo root, so the command
// has to run from there or "prisma" is simply not on the path.
const backendDir = path.join(__dirname, "..", "apps", "backend");

execFileSync(npx, ["prisma", "migrate", "deploy"], {
  stdio: "inherit",
  shell: process.platform === "win32",
  cwd: backendDir,
  env: { ...process.env, DATABASE_URL: url },
});

console.log(`\nApplied to ${serverName}.`);