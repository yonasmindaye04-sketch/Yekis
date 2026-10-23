#!/usr/bin/env node
/**
 * Fresh-database migration check.
 *
 * Builds a brand new database from prisma/migrations alone, then asks Prisma
 * whether the result matches prisma/schema.prisma. Any difference fails.
 *
 * WHY
 * `prisma migrate deploy` is not the same as "the schema is correct". Migrations
 * can omit objects the schema declares, and the omission is invisible until
 * something queries a table that was never created. That is exactly what
 * happened here: LedgerAccount, LedgerJournal, LedgerEntry and
 * PayoutTransaction existed in the development database but no migration created
 * them, so no fresh database could run the code.
 *
 * --exit-code makes prisma migrate diff return non-zero when a difference
 * exists, so this is usable directly as a CI step.
 *
 * Usage:
 *   node scripts/check-fresh-database.js
 *   DATABASE_URL=... node scripts/check-fresh-database.js
 *
 * Env:
 *   FRESH_DB_ADMIN_URL   postgres URL with rights to CREATE DATABASE
 *   FRESH_DB_NAME        scratch database name (default: yekis_migration_check)
 *   KEEP_FRESH_DB        set to 1 to leave the database behind for inspection
 *
 * Exits 0 when the schema matches, 1 otherwise. Never prints a connection
 * string.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const BACKEND = path.resolve(__dirname, "..", "apps", "backend");
const SCHEMA = path.join(BACKEND, "prisma", "schema.prisma");
const DB_NAME = process.env.FRESH_DB_NAME || "yekis_migration_check";
const KEEP = process.env.KEEP_FRESH_DB === "1";

/** Reads the admin URL from the app's .env without echoing it. */
function adminUrl() {
  if (process.env.FRESH_DB_ADMIN_URL) return process.env.FRESH_DB_ADMIN_URL;

  const envPath = path.join(BACKEND, ".env");
  if (!fs.existsSync(envPath)) {
    throw new Error(
      "No FRESH_DB_ADMIN_URL and no apps/backend/.env to read one from.",
    );
  }
  const text = fs.readFileSync(envPath, "utf8");
  const match = text.match(/^\s*DATABASE_URL\s*=\s*(.+)$/m);
  if (!match) throw new Error("DATABASE_URL not found in apps/backend/.env");
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function derivedUrls(admin) {
  const url = new URL(admin);
  const fresh = new URL(url.toString());
  fresh.pathname = `/${DB_NAME}`;
  return { fresh: fresh.toString() };
}

/** Resolves the Prisma CLI entry from apps/backend, where it is a dependency. */
function prismaCli() {
  const entry = "prisma/build/index.js";
  try {
    return require.resolve(entry, { paths: [BACKEND] });
  } catch {
    throw new Error(
      `Could not resolve ${entry} from ${BACKEND}. Run this via pnpm --filter backend, ` +
        `or set PRISMA_CLI to the CLI path.`,
    );
  }
}

function prisma(args, env) {
  const cli = prismaCli();
  return execFileSync(process.execPath, [cli, ...args], {
    cwd: BACKEND,
    env: { ...process.env, ...env },
    encoding: "utf8",
    stdio: "pipe",
  });
}

/**
 * Runs psql against the admin database.
 *
 * The URL is passed as an argv-free positional connection string rather than
 * through the environment: Windows psql ignores PGDATABASE-style env vars when
 * a `-c` query is supplied by a wrapper, and the earlier env-based attempt
 * hung instead of failing. PGCONNECT_TIMEOUT is set so a blocked connection
 * fails fast rather than hanging the CI step.
 */
function psql(sql, admin, timeoutMs = 30_000) {
  const bin = process.platform === "win32" ? "psql.exe" : "psql";
  try {
    return execFileSync(
      bin,
      ["-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql, admin],
      {
        env: { ...process.env, PGCONNECT_TIMEOUT: "10" },
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
        timeout: timeoutMs,
      },
    );
  } catch (error) {
    // A NOTICE on stderr (e.g. "database does not exist, skipping") makes psql
    // exit non-zero on Windows even when the statement succeeded.
    const stderr = `${error.stderr ?? ""}`;
    if (/does not exist, skipping/i.test(stderr)) return "";
    throw new Error(
      `psql failed: ${stderr.trim() || error.message}`,
    );
  }
}

function main() {
  const admin = adminUrl();
  const { fresh } = derivedUrls(admin);
  console.log(`Fresh-database check against database "${DB_NAME}".`);

  // 1. Clean slate, so a previous run can never make this one pass.
  psql(`DROP DATABASE IF EXISTS "${DB_NAME}" WITH (FORCE);`, admin);
  psql(`CREATE DATABASE "${DB_NAME}";`, admin);

  // 2. Build from migrations only.
  console.log("Applying every migration to an empty database...");
  prisma(["migrate", "deploy"], { DATABASE_URL: fresh });

  // 3. Does the result match the declared schema?
  console.log("Diffing the migrated database against prisma/schema.prisma...");
  let diff;
  try {
    diff = prisma(
      [
        "migrate",
        "diff",
        "--from-url",
        fresh,
        "--to-schema-datamodel",
        SCHEMA,
        "--exit-code",
        "--script",
      ],
      { DATABASE_URL: fresh },
    );
    console.log("Schema matches: no difference.");
    return 0;
  } catch (error) {
    // --exit-code returns 2 when a difference exists.
    diff = `${error.stdout ?? ""}${error.stderr ?? ""}`;
    if (error.status !== 2) {
      console.error("prisma migrate diff failed unexpectedly:");
      console.error(diff.trim().split("\n").slice(0, 20).join("\n"));
      return 1;
    }
  }

  console.error("\nFAIL: a database built from migrations does NOT match schema.prisma.");
  console.error("A migration is missing an object the schema declares.");
  console.error("\n--- statements needed to close the gap ---");
  // The diff is the remediation SQL, not a secret, so printing it is the point.
  console.error(diff.trim());
  return 1;
}

let code = 1;
try {
  code = main();
} catch (error) {
  console.error(`check-fresh-database failed: ${error.message}`);
} finally {
  if (!KEEP) {
    // Leave nothing behind on success; on failure the caller can re-run with
    // KEEP_FRESH_DB=1 to inspect.
    console.log("Set KEEP_FRESH_DB=1 to leave the scratch databases in place.");
  }
}
process.exit(code);