import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  root: __dirname,
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "../frontend/src"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "tests/**/*.unit.test.ts",
      "../frontend/tests/**/*.test.ts",
      "../frontend/tests/**/*.test.tsx",
    ],
  },
});
