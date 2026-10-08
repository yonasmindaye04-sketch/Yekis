import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    pool: "threads",
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
