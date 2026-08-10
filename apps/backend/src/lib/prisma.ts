// === IMPORTS ===
import { PrismaClient } from "@prisma/client";

// Prevents exhausting DB connections from hot-reload creating new clients
// in dev (tsx watch mode).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma = globalThis.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}
