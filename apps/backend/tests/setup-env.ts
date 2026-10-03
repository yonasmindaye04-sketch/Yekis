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

// vitest runs with cwd set to apps/backend; mirror config/env.ts's search order.
const candidates = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "apps/backend/.env"),
  path.resolve(process.cwd(), "../../.env"),
];

for (const envPath of candidates) {
  dotenv.config({ path: envPath, override: false });
}