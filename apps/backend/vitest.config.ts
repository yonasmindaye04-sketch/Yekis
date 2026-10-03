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
    setupFiles: ["./tests/setup-env.ts"],
  },
});
