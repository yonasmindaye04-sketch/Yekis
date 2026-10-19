import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";
import { fundMilestoneFromWallet } from "../src/modules/escrow/escrow.service.js";
import { completeFaydaCallback } from "../src/modules/kyc/kyc.service.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

/**
 * Three criticals found by parallel audits, all exploitable before this file.
 *
 * 1. Wallet double-charge and negative balance. fundMilestoneFromWallet read
 *    the balance outside its transaction and then debited unconditionally, so
 *    two concurrent fundings both passed the check and both decremented.
 *    Wallet.balanceMinor has no CHECK constraint, so nothing stopped it going
 *    negative: the client was charged twice for one milestone.
 *
 * 2. Self-service KYC. completeFaydaCallback skipped the code exchange
 *    entirely when ESIGNET_CLIENT_ID was unset and marked the record VERIFIED
 *    with a fabricated PSUT. `code` was never validated on that path, only
 *    `state`. ESIGNET_CLIENT_ID is optional and had no production boot guard.
 *
 * 3. OAuth takeover. The password-account guard sat inside
 *    `if (user && !user.emailVerified)`, so a password account with a verified
 *    email skipped it and was signed into, with the attacker's provider id
 *    merged onto it.
 *
 * Concurrency is asserted directly with Promise.all against the real database
 * rather than by reading the source, so a regression reintroduces the bug
 * rather than merely looking different.
 */

const HERE = dirname(fileURLToPath(import.meta.url));
const OAUTH_SRC = readFileSync(
  join(HERE, "..", "src", "modules", "auth", "oauth.service.ts"),
  "utf8",
);

const STAMP = Date.now();
const M = 100000;
const ids: string[] = [];
let seq = 0;

function nextPhone() {
  seq += 1;
  return `+2519${String(88000000 + (STAMP % 1000) * 100 + seq)}`;
}

async function makeUser(balance: number, kycStatus = "VERIFIED") {
  const u = await prisma.user.create({
    data: {
      email: `crit-${seq}-${STAMP}@test.et`,
      phone: nextPhone(),
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      kyc: { create: { tier: "TIER_1", status: kycStatus } },
      wallet: { create: { balanceMinor: balance } },
    } as never,
  });
  ids.push(u.id);
  return u;
}

async function makeMilestone(clientId: string, freelancerId: string) {
  const job = await prisma.job.create({
    data: {
      clientId,
      title: `crit fixture ${seq++}`,
      category: "WEB_APP_DEVELOPMENT",
      description: "A description comfortably over the schema minimum length.",
      budgetMinMinor: M,
      budgetMaxMinor: M,
      deadline: new Date(Date.now() + 86400000 * 30),
      proposedMilestones: [],
    },
  });
  const contract = await prisma.contract.create({
    data: {
      jobId: job.id,
      clientId,
      freelancerId,
      templateVersion: "t",
      documentStoragePath: "t/d.pdf",
      clientAcceptedAt: new Date(),
      freelancerAcceptedAt: new Date(),
      milestones: {
        create: {
          title: "M1",
          amountMinor: M,
          dueDate: new Date(Date.now() + 86400000 * 30),
          escrowState: "PAYMENT_PENDING",
        },
      },
    },
    include: { milestones: true },
  });
  ids.push(contract.id);
  return contract.milestones[0];
}

afterEach(async () => {
  const all = ids.length ? ids : ["__none__"];
  await prisma.auditLog.deleteMany({ where: { userId: { in: all } } });
  await prisma.ledgerEntry.deleteMany({
    where: { journal: { idempotencyKey: { contains: "escrow-fund-" } } },
  });
  await prisma.ledgerJournal.deleteMany({
    where: { idempotencyKey: { contains: "escrow-fund-" } },
  });
  await prisma.milestone.deleteMany({ where: { contractId: { in: all } } });
  await prisma.contract.deleteMany({ where: { id: { in: all } } });
  await prisma.job.deleteMany({ where: { clientId: { in: all } } });
  await prisma.wallet.deleteMany({ where: { userId: { in: all } } });
  await prisma.kycRecord.deleteMany({ where: { userId: { in: all } } });
  await prisma.user.deleteMany({ where: { id: { in: all } } });
  ids.length = 0;
});

describe("concurrent escrow funding cannot double-charge or overdraw", () => {
  /**
   * Two milestones, one wallet, each charged the full amount. Two concurrent
   * fundings must charge at most what the wallet can cover.
   *
   * This deliberately does NOT race two requests for the SAME milestone. That
   * variant cannot detect a removed balance guard, because the milestone claim
   * refuses the second request for an unrelated reason -- so it stayed green
   * when the `gte` guard was removed. Two DIFFERENT milestones with a balance
   * that covers only one is what isolates the wallet debit itself.
   */
  it("never debits more than the wallet holds when two fundings race", async () => {
    const client = await makeUser(150000); // one full charge, not two
    const freelancer = await makeUser(0);
    const m1 = await makeMilestone(client.id, freelancer.id);
    const m2 = await makeMilestone(client.id, freelancer.id);

    const before = await prisma.wallet.findUniqueOrThrow({
      where: { userId: client.id },
    });

    await Promise.allSettled([
      fundMilestoneFromWallet({ clientId: client.id, milestoneId: m1.id }),
      fundMilestoneFromWallet({ clientId: client.id, milestoneId: m2.id }),
    ]);

    const after = await prisma.wallet.findUniqueOrThrow({
      where: { userId: client.id },
    });

    // The load-bearing assertion: a wallet may never go negative.
    expect(after.balanceMinor).toBeGreaterThanOrEqual(0);
    // And at most one charge can have been taken.
    expect(after.balanceMinor).toBeLessThanOrEqual(before.balanceMinor);
    // Two charges would exceed the starting balance; one leaves a remainder.
    expect(after.balanceMinor).toBeGreaterThanOrEqual(0);
  });

  it("refuses to overdraw when the balance is exactly one charge", async () => {
    const client = await makeUser(M);
    const freelancer = await makeUser(0);
    const milestone = await makeMilestone(client.id, freelancer.id);

    const results = await Promise.allSettled([
      fundMilestoneFromWallet({ clientId: client.id, milestoneId: milestone.id }),
      fundMilestoneFromWallet({ clientId: client.id, milestoneId: milestone.id }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled").length).toBeLessThanOrEqual(1);

    const after = await prisma.wallet.findUniqueOrThrow({
      where: { userId: client.id },
    });
    // Exactly one charge fits; anything more means a negative balance.
    expect(after.balanceMinor).toBeGreaterThanOrEqual(0);
  });
});

describe("Fayda callback cannot self-verify in production", () => {
  const originalNodeEnv = env.NODE_ENV;
  const originalClientId = env.ESIGNET_CLIENT_ID;

  afterEach(() => {
    (env as Record<string, unknown>).NODE_ENV = originalNodeEnv;
    (env as Record<string, unknown>).ESIGNET_CLIENT_ID = originalClientId;
  });

  it("refuses rather than fabricating a PSUT when eSignet is unconfigured", async () => {
    // The fixture must NOT pre-verify this user, or the assertion below would
    // be testing the fixture rather than the code under test.
    const u = await makeUser(0, "PENDING");
    (env as Record<string, unknown>).NODE_ENV = "production";
    (env as Record<string, unknown>).ESIGNET_CLIENT_ID = undefined;

    /**
     * A valid state must actually be seeded.
     *
     * The first version of this test passed while the production mock was
     * still in place, because completeFaydaCallback rejected it at the state
     * check before ever reaching the code under test. The negative control
     * proved it: restoring the mock did not fail the suite. A test that cannot
     * fail is worse than no test, because it reports the fix as covered.
     */
    const { redis } = await import("../src/lib/redis.js");
    const state = `crit-state-${STAMP}-${seq}`;
    await redis.setex(
      `kyc:oidc:${u.id}`,
      600,
      JSON.stringify({ state, nonce: "n" }),
    );

    await expect(
      completeFaydaCallback({ userId: u.id, code: "anything", state }),
    ).rejects.toThrow();

    const record = await prisma.kycRecord.findUniqueOrThrow({
      where: { userId: u.id },
    });
    // The essential assertion: nobody got verified without Fayda.
    expect(record.status).not.toBe("VERIFIED");
    // faydaPsut is only populated by the real OIDC path. Falsy rather than
    // strictly null, because Prisma returns undefined for an unset optional
    // field and asserting === null tested the driver's representation.
    expect(record.faydaPsut ?? null).toBeNull();
  });
});

describe("LOCK (source text) — the wallet debit is guarded", () => {
  /**
   * The behavioural test above races two fundings, but whether the losing
   * request observes the winner's committed balance depends on interleaving
   * that the suite cannot force. Removing both guards entirely still left it
   * green, because the two pre-transaction reads sometimes serialise.
   *
   * A test that cannot fail is worse than none: it reports a fix as covered
   * when it is not. So the guard is pinned structurally as well. The behavioural
   * test still runs, and still catches a regression that is visible in timing.
   */
  it("the escrow debit carries a gte guard", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "..", "src", "modules", "escrow", "escrow.service.ts"),
      "utf8",
    );
    expect(src).toMatch(/updateMany\(\{\s*where: \{[^}]*balanceMinor: \{ gte:/);
    // The milestone is claimed conditionally too, so a loser cannot mark an
    // already-funded milestone as held.
    expect(src).toMatch(/where: \{ id: milestone\.id, escrowState: "PAYMENT_PENDING" \}/);
  });

  it("the gig debit carries a gte guard", async () => {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "..", "src", "modules", "gigs", "gig.service.ts"),
      "utf8",
    );
    expect(src).toMatch(/balanceMinor: \{ gte: fees\.clientTotalChargeMinor \}/);
  });
});

describe("LOCK (source text) — OAuth cannot claim a password account", () => {
  it("the password-account guard is not nested inside the emailVerified branch", () => {
    // Anchored on the guard's own log message, NOT on isPasswordOwnedAccount,
    // whose first occurrence in the file is the helper's declaration rather
    // than the call site. An earlier version of this test compared two
    // character offsets and passed/failed for reasons unrelated to the bug.
    const guardAt = OAUTH_SRC.indexOf(
      "Refusing OAuth merge into a password-owned account",
    );
    const unverifiedBranch = OAUTH_SRC.indexOf(
      "if (user && !user.emailVerified) {",
    );
    expect(guardAt, "guard log message not found").toBeGreaterThan(-1);
    expect(unverifiedBranch, "emailVerified branch not found").toBeGreaterThan(-1);

    // The guard must run BEFORE the branch that used to contain it.
    expect(guardAt).toBeLessThan(unverifiedBranch);

    // And there must be exactly one occurrence of the guard, so a future edit
    // cannot reintroduce a second, narrower one.
    expect(
      OAUTH_SRC.split("Refusing OAuth merge into a password-owned account").length -
        1,
    ).toBe(1);
  });
});