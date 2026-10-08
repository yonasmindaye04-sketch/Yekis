/**
 * vitest globalSetup — runs once in the main process before any suite.
 *
 * Two jobs:
 *  1. Refuse to run against anything but a dedicated test database.
 *  2. Bring that database's schema up to date with `prisma migrate deploy`.
 *
 * WHY (2) IS HERE AND NOT IN setup-env.ts
 * setupFiles run inside workers; the main process never loads them. Migrating
 * from the main process means it happens exactly once per run instead of once
 * per worker, and a schema mismatch fails as one clear error rather than as
 * hundreds of confusing query errors across files.
 */
import { execFileSync } from "node:child_process";
import dotenv from "dotenv";
import path from "node:path";
import { applyTestDatabaseEnv } from "./helpers/test-database.js";

function loadDotEnv(): void {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "apps/backend/.env"),
    path.resolve(process.cwd(), "../../.env"),
  ];
  for (const envPath of candidates) {
    dotenv.config({ path: envPath, override: false });
  }
}

export async function setup(): Promise<void> {
  loadDotEnv();

  // Throws "refusing to run tests against a non-test database" when
  // DATABASE_URL_TEST is missing or does not name a *_test database.
  const { databaseUrl, databaseName } = applyTestDatabaseEnv(process.env);

  // Run the Prisma CLI's JS entry with the current Node binary rather than
  // shelling out to `npx`. On Windows, spawning a `.cmd` without a shell fails
  // with spawnSync EINVAL, and using the current interpreter also guarantees
  // the same Prisma version the project resolved.
  const prismaCli = require.resolve("prisma/build/index.js");
  try {
    execFileSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: "pipe",
      encoding: "utf8",
      cwd: process.cwd(),
    });
  } catch (error) {
    const err = error as {
      message?: string;
      stdout?: string;
      stderr?: string;
      status?: number | null;
    };
    // The connection URL may contain a password, so only the spawn error and
    // prisma's own output are surfaced — never the env we passed in.
    const detail =
      `${err.stdout ?? ""}${err.stderr ?? ""}`.trim() ||
      err.message ||
      "no output captured";
    throw new Error(
      `prisma migrate deploy failed against database "${databaseName}"` +
        `${err.status ? ` (exit ${err.status})` : ""}.\n${detail}`,
    );
  }
}

export async function teardown(): Promise<void> {
  // Nothing to undo: the test database is disposable and intentionally kept so
  // repeated runs stay fast. `prisma migrate reset` is a manual operation.
}