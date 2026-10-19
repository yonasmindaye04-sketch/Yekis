import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";

/**
 * A password-reset token is a bearer credential for the account.
 *
 * `sendEmail` prints the message body to the console whenever SMTP is not
 * configured, and the reset email's body contains the reset URL. That was an
 * unconditional `console.log`, which bypasses the pino redaction in
 * lib/logger.ts completely — the logger scrubs `token` keys and every string
 * argument, and none of that runs on a raw console call. So a staging or
 * production box with SMTP misconfigured wrote live, hour-long,
 * sets-the-password credentials to whatever collected stdout.
 *
 * The same function also returned `{ success: true }` for a message that was
 * never sent, so `requestPasswordReset` believed the user had mail. They had
 * not, and a token nobody received sat valid in the database for an hour.
 *
 * The fix has two halves: the body is printed on a developer machine only, and
 * an undelivered token is invalidated rather than left live.
 *
 * NOTE ON THE ENVIRONMENT: .env sets NODE_ENV=development and the test setup
 * loads it, so the DEVELOPMENT branch is what an ordinary run of this suite
 * exercises. That is precisely the branch that is safe to exercise freely. The
 * security-relevant branch — not development — is therefore forced explicitly
 * here, with vi.resetModules so config/env re-reads process.env.
 */

const STAMP = Date.now();
const EMAIL = `reset-logging-${STAMP}@test.et`;

let userId = "";

async function cleanup() {
  const users = await prisma.user.findMany({ where: { email: EMAIL }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (!ids.length) return;
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: { in: ids } } }),
    prisma.consentRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } }),
    prisma.wallet.deleteMany({ where: { userId: { in: ids } } }),
    prisma.auditLog.deleteMany({ where: { userId: { in: ids } } }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

/** Imports a fresh module graph with NODE_ENV as given. */
async function loadAuth(nodeEnv: string) {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = nodeEnv;
  vi.resetModules();
  try {
    const mod = await import("../src/modules/auth/auth.service.js");
    return { requestPasswordReset: mod.requestPasswordReset };
  } finally {
    if (original === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = original;
  }
}

/** Captures everything written to the console during `run`. */
async function captureConsole(run: () => Promise<void>): Promise<string> {
  const lines: string[] = [];
  const original = { log: console.log, error: console.error, warn: console.warn };
  const collect = (...args: unknown[]) => {
    lines.push(args.map((a) => String(a)).join(" "));
  };
  console.log = collect;
  console.error = collect;
  console.warn = collect;
  try {
    await run();
  } finally {
    console.log = original.log;
    console.error = original.error;
    console.warn = original.warn;
  }
  return lines.join("\n");
}

async function makeUser() {
  const created = await prisma.user.create({
    data: {
      email: EMAIL,
      phone: `+2519${String(30000000 + (STAMP % 9000000))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    include: { wallet: true },
  });
  userId = created.id;
  return created;
}

async function outstandingTokens(): Promise<number> {
  return prisma.passwordResetToken.count({ where: { userId } });
}

beforeEach(async () => {
  await cleanup();
  await makeUser();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("outside development, a reset token never reaches the console", () => {
  it("prints no email body containing the reset link", async () => {
    const { requestPasswordReset } = await loadAuth("test");

    const output = await captureConsole(async () => {
      await requestPasswordReset(EMAIL);
    });

    // The decisive assertion: a 64-char hex token, or the reset URL carrying
    // one. Under the old code the body — reset URL included — was printed here.
    expect(output).not.toMatch(/[a-f0-9]{64}/);
    expect(output).not.toMatch(/reset-password\?token=/);
    expect(output).not.toContain("[DEV - NOT SENT] EMAIL");
  });

  it("does not report a message as delivered when nothing was sent", async () => {
    const { requestPasswordReset } = await loadAuth("test");

    // Must not throw: the route answers every request with the same success
    // shape, so an error here would be an account-enumeration oracle telling an
    // attacker "this address exists".
    await expect(requestPasswordReset(EMAIL)).resolves.toBeUndefined();
  });

  it("leaves no undelivered token valid in the database", async () => {
    const { requestPasswordReset } = await loadAuth("test");
    expect(await outstandingTokens()).toBe(0);

    await captureConsole(async () => {
      await requestPasswordReset(EMAIL);
    });

    expect(
      await outstandingTokens(),
      "a token nobody received must not sit live for an hour",
    ).toBe(0);
  });
});

describe("on a developer machine, the token is still readable", () => {
  // The control. Without it, 'the token is never printed' would also be
  // satisfied by code that simply never prints anything, breaking the local
  // development flow this fallback exists to serve.
  it("still prints the email body locally", async () => {
    const { requestPasswordReset } = await loadAuth("development");

    const output = await captureConsole(async () => {
      await requestPasswordReset(EMAIL);
    });

    expect(output).toContain("[DEV - NOT SENT] EMAIL");
    expect(output).toMatch(/[a-f0-9]{64}/);
    // Reported as delivered, because on a developer machine that is true.
    expect(await outstandingTokens()).toBe(1);
  });
});