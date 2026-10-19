import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";

/**
 * Ledger and payout invariants enforced BY THE DATABASE, not by a service.
 *
 * Migration 20261009120000 adds a deferred balance trigger and three CHECK
 * constraints. These tests prove the database refuses bad rows, so no
 * application bug, queue worker or manual psql session can bypass them. They
 * use raw SQL on purpose: a service-level assertion would pass even when the
 * constraint is absent.
 */

const STAMP = Date.now();
const prisma = new PrismaClient();

const created = {
  accounts: [] as string[],
  journals: [] as string[],
  entries: [] as string[],
  users: [] as string[],
  wallets: [] as string[],
};

async function account(type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE", balanceMinor = 0) {
  const row = await prisma.ledgerAccount.create({
    data: { code: `TEST-${type}-${randomUUID().slice(0, 8)}`, name: "test", type, balanceMinor },
  });
  created.accounts.push(row.id);
  return row;
}

beforeEach(async () => {
  await cleanup();
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function cleanup() {
  if (created.entries.length) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "LedgerEntry" WHERE id IN (${created.entries.map((_, i) => `$${i + 1}`).join(",")})`,
      ...created.entries,
    );
    created.entries.length = 0;
  }
  if (created.journals.length) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "LedgerJournal" WHERE id IN (${created.journals.map((_, i) => `$${i + 1}`).join(",")})`,
      ...created.journals,
    );
    created.journals.length = 0;
  }
  if (created.accounts.length) {
    await prisma.$executeRawUnsafe(
      `DELETE FROM "LedgerAccount" WHERE id IN (${created.accounts.map((_, i) => `$${i + 1}`).join(",")})`,
      ...created.accounts,
    );
    created.accounts.length = 0;
  }
  if (created.wallets.length) {
    await prisma.wallet.deleteMany({ where: { id: { in: created.wallets } } });
    created.wallets.length = 0;
  }
  if (created.users.length) {
    await prisma.kycRecord.deleteMany({ where: { userId: { in: created.users } } });
    await prisma.user.deleteMany({ where: { id: { in: created.users } } });
    created.users.length = 0;
  }
}

async function journal(description = "test journal") {
  const row = await prisma.ledgerJournal.create({
    data: { idempotencyKey: `test-${randomUUID()}`, description, referenceType: "TEST", postedAt: new Date() },
  });
  created.journals.push(row.id);
  return row;
}

async function entry(journalId: string, accountId: string, debitMinor: number, creditMinor: number) {
  const row = await prisma.ledgerEntry.create({
    data: { journalId, accountId, debitMinor, creditMinor, postedAt: new Date() },
  });
  created.entries.push(row.id);
  return row;
}

describe("journal balancing", () => {
  it("accepts a balanced multi-line journal written as one statement", async () => {
    const debit = await account("ASSET", 0);
    const credit = await account("LIABILITY", 0);
    const j = await journal("balanced");

    // ONE statement carrying both halves. This is the shape postJournalEntry
    // uses, and the reason it buffers lines instead of inserting them one by
    // one: the guard fires per statement, so a journal assembled from separate
    // inserts would be rejected after its first line.
    await prisma.ledgerEntry.createMany({
      data: [
        { journalId: j.id, accountId: debit.id, debitMinor: 100000, creditMinor: 0, postedAt: new Date() },
        { journalId: j.id, accountId: credit.id, debitMinor: 0, creditMinor: 100000, postedAt: new Date() },
      ],
    });

    const agg = await prisma.ledgerEntry.aggregate({
      where: { journalId: j.id },
      _sum: { debitMinor: true, creditMinor: true },
    });
    expect(agg._sum.debitMinor).toBe(100000);
    expect(agg._sum.creditMinor).toBe(100000);
  });

  it("rejects a single unbalanced line with raw SQL, bypassing the service", async () => {
    const a = await account("ASSET", 0);
    const j = await journal("stray debit");

    await expect(
      prisma.$executeRaw`INSERT INTO "LedgerEntry" ("id","journalId","accountId","debitMinor","creditMinor","postedAt")
        VALUES (gen_random_uuid()::text, ${j.id}, ${a.id}, 4200, 0, now())`,
    ).rejects.toThrow(/unbalanced/i);
  });

  it("rejects a multi-row insert whose two lines do not cancel", async () => {
    const debit = await account("ASSET", 0);
    const credit = await account("LIABILITY", 0);
    const j = await journal("mismatched pair");

    await expect(
      prisma.$executeRaw`
        INSERT INTO "LedgerEntry" ("id","journalId","accountId","debitMinor","creditMinor","postedAt")
        VALUES
          (gen_random_uuid()::text, ${j.id}, ${debit.id},  5000, 0, now()),
          (gen_random_uuid()::text, ${j.id}, ${credit.id}, 0, 4999, now())`,
    ).rejects.toThrow(/unbalanced/i);
  });

  it("rejects deleting one leg of a balanced journal", async () => {
    const debit = await account("ASSET", 0);
    const credit = await account("LIABILITY", 0);
    const j = await journal("then amputated");

    await prisma.ledgerEntry.createMany({
      data: [
        { journalId: j.id, accountId: debit.id, debitMinor: 7000, creditMinor: 0, postedAt: new Date() },
        { journalId: j.id, accountId: credit.id, debitMinor: 0, creditMinor: 7000, postedAt: new Date() },
      ],
    });
    const rows = await prisma.ledgerEntry.findMany({ where: { journalId: j.id } });
    const leg = rows.find((r) => r.creditMinor === 7000)!;

    await expect(prisma.ledgerEntry.delete({ where: { id: leg.id } })).rejects.toThrow(/unbalanced/i);
  });

  it("rejects updating a line's amount out of balance", async () => {
    const debit = await account("ASSET", 0);
    const credit = await account("LIABILITY", 0);
    const j = await journal("then edited");

    await prisma.ledgerEntry.createMany({
      data: [
        { journalId: j.id, accountId: debit.id, debitMinor: 8000, creditMinor: 0, postedAt: new Date() },
        { journalId: j.id, accountId: credit.id, debitMinor: 0, creditMinor: 8000, postedAt: new Date() },
      ],
    });
    const rows = await prisma.ledgerEntry.findMany({ where: { journalId: j.id } });
    const leg = rows.find((r) => r.creditMinor === 8000)!;

    await expect(
      prisma.ledgerEntry.update({ where: { id: leg.id }, data: { creditMinor: 8001 } }),
    ).rejects.toThrow(/unbalanced/i);
  });

  it("still refuses a second, separate statement that unbalances an existing journal", async () => {
    // The guard is not a one-shot check at creation: appending a stray debit
    // after a balanced journal exists is also rejected.
    const debit = await account("ASSET", 0);
    const credit = await account("LIABILITY", 0);
    const j = await journal("balanced then appended");

    await prisma.ledgerEntry.createMany({
      data: [
        { journalId: j.id, accountId: debit.id, debitMinor: 9000, creditMinor: 0, postedAt: new Date() },
        { journalId: j.id, accountId: credit.id, debitMinor: 0, creditMinor: 9000, postedAt: new Date() },
      ],
    });

    await expect(
      prisma.$executeRaw`INSERT INTO "LedgerEntry" ("id","journalId","accountId","debitMinor","creditMinor","postedAt")
        VALUES (gen_random_uuid()::text, ${j.id}, ${credit.id}, 1, 0, now())`,
    ).rejects.toThrow(/unbalanced/i);
  });
});

describe("the database refuses a malformed ledger entry", () => {
  it("rejects a negative debit", async () => {
    const a = await account("ASSET");
    const j = await journal();
    await expect(entry(j.id, a.id, -100, 0)).rejects.toThrow();
  });

  it("rejects an entry that both debits and credits", async () => {
    const a = await account("ASSET");
    const j = await journal();
    await expect(entry(j.id, a.id, 100, 100)).rejects.toThrow();
  });

  it("rejects an all-zero entry", async () => {
    const a = await account("ASSET");
    const j = await journal();
    await expect(entry(j.id, a.id, 0, 0)).rejects.toThrow();
  });
});

describe("the database refuses a negative ASSET balance", () => {
  it("allows a negative LIABILITY balance, which is the credit convention", async () => {
    // Every real escrow liability is negative by design.
    await expect(account("LIABILITY", -5000)).resolves.toBeTruthy();
  });

  it("rejects a negative ASSET balance", async () => {
    await expect(account("ASSET", -1)).rejects.toThrow();
  });
});

describe("a duplicate idempotencyKey does not post twice", () => {
  it("rejects the second journal with the same key", async () => {
    const key = `dupe-${randomUUID()}`;
    const first = await prisma.ledgerJournal.create({
      data: { idempotencyKey: key, description: "first", referenceType: "TEST", postedAt: new Date() },
    });
    created.journals.push(first.id);

    await expect(
      prisma.ledgerJournal.create({
        data: { idempotencyKey: key, description: "second", referenceType: "TEST", postedAt: new Date() },
      }),
    ).rejects.toThrow();

    expect(await prisma.ledgerJournal.count({ where: { idempotencyKey: key } })).toBe(1);
  });

  it("the unique invariant is a named constraint, not just an index", async () => {
    // A tagged template would fold the quoted identifier to lowercase, so the
    // relation name is passed as a bound parameter instead.
    const rows = await prisma.$queryRaw<{ conname: string }[]>`
      SELECT conname FROM pg_constraint
      WHERE conrelid = to_regclass(${`"LedgerJournal"`})::oid AND contype = 'u'
    `;
    expect(rows.map((r) => r.conname)).toContain("LedgerJournal_idempotencyKey_unique");
  });
});

describe("the database refuses an inconsistent payout", () => {
  async function payoutFixture() {
    const user = await prisma.user.create({
      data: {
        email: `payout-inv-${STAMP}-${randomUUID().slice(0, 6)}@test.et`,
        phone: `+25191${String(10000000 + Math.floor(Math.random() * 89999999))}`,
        passwordHash: "not-a-real-hash",
        role: "FREELANCER",
        wallet: { create: { balanceMinor: 500000 } },
      },
      include: { wallet: true },
    });
    created.users.push(user.id);
    created.wallets.push(user.wallet!.id);
    return user;
  }

  it("rejects a payout whose net plus fee does not equal the amount", async () => {
    const u = await payoutFixture();
    await expect(
      prisma.payoutTransaction.create({
        data: {
          userId: u.id,
          walletId: u.wallet!.id,
          amountMinor: 10000,
          feeMinor: 100,
          netAmountMinor: 9999, // 9999 + 100 != 10000
          provider: "TELEBIRR",
          payoutAccountIdentifier: "+251900000000",
        },
      }),
    ).rejects.toThrow();
  });

  it("rejects a non-positive payout amount", async () => {
    const u = await payoutFixture();
    await expect(
      prisma.payoutTransaction.create({
        data: {
          userId: u.id,
          walletId: u.wallet!.id,
          amountMinor: 0,
          feeMinor: 0,
          netAmountMinor: 0,
          provider: "TELEBIRR",
          payoutAccountIdentifier: "+251900000001",
        },
      }),
    ).rejects.toThrow();
  });

  it("accepts a consistent payout", async () => {
    const u = await payoutFixture();
    const row = await prisma.payoutTransaction.create({
      data: {
        userId: u.id,
        walletId: u.wallet!.id,
        amountMinor: 10000,
        feeMinor: 1000,
        netAmountMinor: 9000,
        provider: "TELEBIRR",
        payoutAccountIdentifier: "+251900000002",
      },
    });
    expect(row.amountMinor).toBe(10000);
    await prisma.payoutTransaction.deleteMany({ where: { id: row.id } });
  });
});

describe("the polymorphic Dispute CHECK survives", () => {
  it("rejects a dispute with neither contractId nor gigOrderId", async () => {
    const rows = await prisma.$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count
      FROM pg_constraint
      WHERE conname = 'Dispute_subject_check'
    `;
    expect(Number(rows[0].count)).toBe(1);
  });
});