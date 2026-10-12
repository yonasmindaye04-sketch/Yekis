// Loads .env for the whole test run.
//
// Several suites import `src/lib/prisma.js` directly, which constructs a
// PrismaClient without going through `src/config/env.js` — so nothing had run
// dotenv and `DATABASE_URL` was missing. Those suites only passed by accident:
// vitest's thread pool reuses workers, so whichever suite happened to import
// config/env first left process.env populated for the next file in that worker.
// Adding or removing a test file reshuffled that and broke them.
//
// Loading the env once, up front, makes every suite independent of file order.
import dotenv from "dotenv";
import path from "node:path";
import { applyTestDatabaseEnv } from "./helpers/test-database.js";

// vitest runs with cwd set to apps/backend; mirror config/env.ts's search order.
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/backend/.env"),
  path.resolve(process.cwd(), "../../.env"),
];

for (const envPath of candidates) {
  dotenv.config({ path: envPath, override: false });
}

// Point the run at the dedicated test database BEFORE any suite imports
// src/lib/prisma.js, which builds its PrismaClient from process.env at import
// time. Throws "refusing to run tests against a non-test database" unless
// DATABASE_URL_TEST names a database containing "_test".
//
// This runs per test file inside each worker, which is why the same guard is
// also applied in tests/global-setup.ts (main process, runs migrations). Both
// are needed: setupFiles do not run in the main process, and globalSetup does
// not run inside workers.
applyTestDatabaseEnv(process.env);

// The API rate limiter is disabled for the suite. Every suite builds its own
// app inside this one process, so the limiter's counters accumulate across
// suites and whichever ran last received TOO_MANY_REQUESTS -- an
// order-dependent failure rather than an assertion about the limiter.
//
// Set here explicitly rather than inferred from NODE_ENV, so the production
// prohibition is enforced by assertProductionSafety instead of by a NODE_ENV
// check that any environment could satisfy. tests/rate-limiter.test.ts sets it
// back to false with its own keyPrefix and asserts the 429 behaviour.
process.env.RATE_LIMIT_DISABLED = "true";
// Distinct limiter keys for this process, so enabling the limiter in one suite
// cannot disturb another.
process.env.RATE_LIMIT_KEY_PREFIX = `vitest-${process.pid}-`;