import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { postJournalEntry } from "../src/modules/finance/ledger.service.js";
import { scopedDelete } from "./helpers/scopedDelete.js";

/**
 * The double-entry ledger against a real database.
 *
 * The previous ledger.service.test.ts passed a hand-built `mockTx` object with
 * vi.fn()s, so every assertion was about the mock's bookkeeping rather than
 * about Postgres. In particular "rejects an unbalanced journal" could not have
 * detected a missing database constraint at all, and "successfully posts" proved
 * only that the service called the functions the mock defined.
 *
 * These tests run the real service against the real schema, so the database is
 * the thing under test. Balances are asserted exactly.
 */

const STAMP = Date.now();
const runId = `ledger-db-${STAMP}`;

const created = {
  journals: [] as string[],
  accounts: [] as string[],
  entries: [] as string[],
};

/** Account codes unique per run, so parallel runs cannot collide. */
function code(suffix: string) {
  return `${runId}-${suffix}`;
}

async function accountBalance(accountCode: string): Promise<number | null> {
  const row = await prisma.ledgerAccount.findUnique({
    where: { code: accountCode },
  });
  return row?.balanceMinor ?? null;
}

beforeEach(async () => {
  // Clean this run's rows so each test starts from zero.
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function cleanup() {
  if (created.entries.length) {
    await scopedDelete(
      prisma.ledgerEntry as never,
      { id: { in: created.entries } },
      "ledger-db cleanup",
    );
    created.entries.length = 0;
  }
  if (created.journals.length) {
    await scopedDelete(
      prisma.ledgerJournal as never,
      { id: { in: created.journals } },
      "ledger-db cleanup",
    );
    created.journals.length = 0;
  }
  if (created.accounts.length) {
    await scopedDelete(
      prisma.ledgerAccount as never,
      { id: { in: created.accounts } },
      "ledger-db cleanup",
    );
    created.accounts.length = 0;
  }
}

/**
 * Runs the real service. The service creates or finds accounts itself from
 * `accountCode` (JournalEntryLine takes a code, not an accountId), so this does
 * not pre-create rows.
 */
async function post(
  tx: Prisma.TransactionClient,
  idempotencyKey: string,
  entries: Array<{
    accountCode: string;
    accountType: "ASSET" | "LIABILITY";
    debitMinor?: number;
    creditMinor?: number;
  }>,
) {
  for (const e of entries) {
    const acc = await prisma.ledgerAccount.findUnique({
      where: { code: e.accountCode },
    });
    if (acc) created.accounts.push(acc.id);
  }

  const journal = await postJournalEntry(tx as never, {
    idempotencyKey,
    description: "ledger db test",
    referenceType: "TEST",
    referenceId: runId,
    entries: entries.map((e) => ({
      accountCode: e.accountCode,
      accountType: e.accountType,
      debitMinor: e.debitMinor ?? 0,
      creditMinor: e.creditMinor ?? 0,
    })),
  });
  created.journals.push(journal.id);
  return journal;
}

describe("the ledger posts balanced journals to a real database", () => {
  it("writes the exact debits and credits and moves balances exactly", async () => {
    const asset = code("asset");
    const liability = code("liability");

    await prisma.$transaction(async (tx) => {
      await post(tx, `${runId}-balanced-1`, [
        { accountCode: asset, accountType: "ASSET", debitMinor: 100000 },
        { accountCode: liability, accountType: "LIABILITY", creditMinor: 100000 },
      ]);
    });

    // Exact sums, read back from the database rather than from a mock.
    const agg = await prisma.ledgerEntry.aggregate({
      where: { journal: { idempotencyKey: `${runId}-balanced-1` } },
      _sum: { debitMinor: true, creditMinor: true },
    });
    expect(agg._sum.debitMinor).toBe(100000);
    expect(agg._sum.creditMinor).toBe(100000);

    // Balance convention, measured not assumed: ledger.service increments a
    // LIABILITY by credit - debit, so a credit-only liability ends POSITIVE.
    // Asserted exactly so a change to the sign convention cannot pass quietly.
    expect(await accountBalance(asset)).toBe(100000);
    expect(await accountBalance(liability)).toBe(100000);
  });

  it("does not post the same idempotencyKey twice", async () => {
    const key = `${runId}-dup-1`;
    const asset = code("dup-asset");
    const liability = code("dup-liability");

    await prisma.$transaction(async (tx) => {
      await post(tx, key, [
        { accountCode: asset, accountType: "ASSET", debitMinor: 50000 },
        { accountCode: liability, accountType: "LIABILITY", creditMinor: 50000 },
      ]);
    });
    expect(await accountBalance(asset)).toBe(50000);

    // Replaying the same key must not double the money.
    await prisma.$transaction(async (tx) => {
      await post(tx, key, [
        { accountCode: asset, accountType: "ASSET", debitMinor: 50000 },
        { accountCode: liability, accountType: "LIABILITY", creditMinor: 50000 },
      ]);
    });

    expect(await accountBalance(asset)).toBe(50000);
    expect(await accountBalance(liability)).toBe(50000);
    expect(
      await prisma.ledgerJournal.count({ where: { idempotencyKey: key } }),
      "a replay must not create a second journal",
    ).toBe(1);
    expect(
      await prisma.ledgerEntry.count({
        where: { journal: { idempotencyKey: key } },
      }),
    ).toBe(2);
  });
});

describe("the DATABASE rejects what the service would also reject", () => {
  it("rejects a journal the SERVICE considers unbalanced, against the real DB", async () => {
    // NOT the same as a database constraint: postJournalEntry refuses an
    // unbalanced set in the service before writing anything. That is a real
    // guarantee worth testing here, and it leaves no row behind.
    const asset = code("svc-unbal-asset");
    const liability = code("svc-unbal-liability");

    await expect(
      prisma.$transaction(async (tx) => {
        await post(tx, `${runId}-svc-unbal`, [
          { accountCode: asset, accountType: "ASSET", debitMinor: 5000 },
          { accountCode: liability, accountType: "LIABILITY", creditMinor: 4000 },
        ]);
      }),
    ).rejects.toThrow();

    expect(
      await prisma.ledgerJournal.count({
        where: { idempotencyKey: `${runId}-svc-unbal` },
      }),
      "an unbalanced journal must not be persisted",
    ).toBe(0);
    expect(
      await prisma.ledgerEntry.count({
        where: { journal: { idempotencyKey: `${runId}-svc-unbal` } },
      }),
    ).toBe(0);
  });

  it("the row-local CHECK constraints reject bad entries written directly", async () => {
    // These are enforced by Postgres, proven with raw writes that bypass the
    // service entirely. (Journal-level BALANCING is not a database constraint
    // yet -- see 20261009120000 for why, and ledger-db-invariants.test.ts.)
    const asset = code("raw-asset");
    const acc = await prisma.ledgerAccount.create({
      data: { code: asset, name: runId, type: "ASSET", balanceMinor: 0 },
    });
    created.accounts.push(acc.id);
    const journal = await prisma.ledgerJournal.create({
      data: {
        idempotencyKey: `${runId}-raw-1`,
        description: "raw",
        referenceType: "TEST",
        postedAt: new Date(),
      },
    });
    created.journals.push(journal.id);

    // Negative amount.
    await expect(
      prisma.ledgerEntry.create({
        data: { journalId: journal.id, accountId: acc.id, debitMinor: -1, creditMinor: 0, postedAt: new Date() },
      }),
    ).rejects.toThrow();

    // Debits and credits on the same line.
    await expect(
      prisma.ledgerEntry.create({
        data: { journalId: journal.id, accountId: acc.id, debitMinor: 10, creditMinor: 10, postedAt: new Date() },
      }),
    ).rejects.toThrow();

    // All-zero line.
    await expect(
      prisma.ledgerEntry.create({
        data: { journalId: journal.id, accountId: acc.id, debitMinor: 0, creditMinor: 0, postedAt: new Date() },
      }),
    ).rejects.toThrow();

    expect(
      await prisma.ledgerEntry.count({ where: { journalId: journal.id } }),
      "no rejected line may be persisted",
    ).toBe(0);
  });

  it("rejects a duplicate idempotencyKey by unique constraint", async () => {
    const key = `${runId}-dup-constraint`;
    const first = await prisma.ledgerJournal.create({
      data: {
        idempotencyKey: key,
        description: "first",
        referenceType: "TEST",
        postedAt: new Date(),
      },
    });
    created.journals.push(first.id);

    await expect(
      prisma.ledgerJournal.create({
        data: {
          idempotencyKey: key,
          description: "second",
          referenceType: "TEST",
          postedAt: new Date(),
        },
      }),
    ).rejects.toThrow();

    expect(
      await prisma.ledgerJournal.count({ where: { idempotencyKey: key } }),
    ).toBe(1);
  });
});
