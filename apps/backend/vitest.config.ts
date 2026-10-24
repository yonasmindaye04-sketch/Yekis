import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // "forks", not "threads". The threads pool crashes the whole run with
    // 0xC0000005 (exit -1073741819) partway through, with no test summary
    // printed -- an access violation in native code inside a worker thread.
    // The native modules in play are @node-rs/argon2 and the Prisma query
    // engine; bcrypt, sharp and canvas are not present. The exact culprit was
    // not identified.
    //
    // It is not caused by any single suite: the crash point moved between runs
    // (after dispute-single-resolution once, one file later the next time),
    // and it appeared both before and after the ledger work in this branch.
    // It IS pool-specific: with forks the same 38 files and 378 tests pass
    // repeatedly. Forks give each file its own process, so a native fault is
    // contained instead of taking the run down with it.
    pool: "forks",
    testTimeout: 30000,
    hookTimeout: 30000,
    // Suites that import src/lib/prisma.js directly never load config/env.js,
    // so they depend on this to have DATABASE_URL and friends in process.env.
    // setup-env.ts also refuses to run against anything but DATABASE_URL_TEST.
    setupFiles: ["./tests/setup-env.ts"],
    // Runs once in the main process: applies the same test-database guard and
    // then `prisma migrate deploy`s the schema before any worker starts.
    globalSetup: ["./tests/global-setup.ts"],
    exclude: [
      "node_modules/**",
      "dist/**",
      // Maintenance tool, not a test: replays every route with no token and
      // prints the result so the public-route allowlist can be regenerated.
      // Run on demand:  npx vitest run tests/route-audit.generate.test.ts
      "tests/route-audit.generate.test.ts",
    ],
  },
});
