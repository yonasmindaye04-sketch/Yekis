import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { CHART_OF_ACCOUNTS } from "../src/modules/finance/ledger.service.js";
import {
  handleTopUpWebhook,
  approveTopUp,
  TopUpAlreadyResolvedError,
} from "../src/modules/topups/topup.service.js";

/**
 * A wallet top-up moves real cash in. It has to say so in the ledger.
 *
 * `recordWalletTopUpLedger` existed and was correct, but nothing called it.
 * Both credit paths — the provider webhook and staff approval — incremented
 * `Wallet.balanceMinor` and stopped. Two consequences, both silent:
 *
 *   1. `2100-USER-<id>` (the user's liability) stayed at zero while the wallet
 *      read a real balance. The books said the platform owed nobody anything.
 *   2. The settlement asset accounts are only ever CREDITED by this journal;
 *      the only debit is the payout journal. With no inflow, the first
 *      disbursement drove `1000-ASSET-TELEBIRR` negative and the
 *      `LedgerAccount_balance_check` CHECK constraint aborted the journal —
 *      after the wallet was already debited and the payout marked CONFIRMED.
 *
 * `auditLedgerIntegrity()` reported "balanced" throughout, because it only
 * compares total debits to total credits. A flow that posts nothing at all is
 * perfectly balanced; that is the whole reason this needed a real test.
 *
 * The assertions below are deltas and cross-checks, not "a journal exists".
 * Each one fails if the credit path stops posting.
 */

const STAMP = Date.now();
const runId = `topup-ledger-${STAMP}`;
const AMOUNT = 250_000; // ETB 2,500.00

let userId: string;
let walletId: string;
let staffId: string;

/** Ledger codes this run touched, so cleanup can subtract exactly what it added. */
const addedByCode = new Map<string, number>();
const journalIds: string[] = [];

function userAccountCode(id: string) {
  return `2100-USER-${id}`;
}

async function accountBalance(code: string): Promise<number | null> {
  const row = await prisma.ledgerAccount.findUnique({ where: { code } });
  return row?.balanceMinor ?? null;
}

/** Records the pre-call balance so an assertion can be a delta. */
async function snapshot(code: string): Promise<number> {
  const before = (await accountBalance(code)) ?? 0;
  addedByCode.set(code, before);
  return before;
}

async function makeUser(label: string, opts?: { staff?: boolean }) {
  return prisma.user.create({
    data: {
      email: `${runId}-${label}@test.et`,
      phone: `+2519${String(90000000 + STAMP % 9000000 + Math.abs(label.charCodeAt(0)))}`,
      passwordHash: "not-a-real-hash",
      role: "CLIENT",
      staffRole: opts?.staff ? "ADMIN" : null,
      wallet: { create: { balanceMinor: 0 } },
    } as never,
    include: { wallet: true },
  });
}

async function makePendingTopUp(provider: "TELEBIRR" | "CBE_BIRR") {
  return prisma.walletTopUp.create({
    data: {
      userId,
      walletId,
      provider,
      amountMinor: AMOUNT,
      status: "CHECKOUT_PENDING",
      // Not "mock-" prefixed: assertTopUpIsCreditable refuses those as proof
      // that no money moved, and this test needs a creditable row.
      providerTransactionId: `txn-${runId}-${provider}-${Math.random().toString(36).slice(2, 10)}`,
    },
  });
}

beforeEach(async () => {
  await cleanup();
  const user = await makeUser("payer");
  userId = user.id;
  walletId = user.wallet!.id;
  const staff = await makeUser("staff", { staff: true });
  staffId = staff.id;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

async function cleanup() {
  const ids = [userId, staffId].filter(Boolean);
  const codes = [userAccountCode(userId)].filter(Boolean);

  if (journalIds.length) {
    const entries = await prisma.ledgerEntry.findMany({
      where: { journalId: { in: journalIds } },
      select: {
        accountId: true,
        debitMinor: true,
        creditMinor: true,
        account: { select: { type: true } },
      },
    });
    // Undo exactly the movement this run's journals caused. Subtracting rather
    // than resetting to a snapshot: other test files post to the same shared
    // settlement accounts in parallel, and clobbering their balance would make
    // the suite order-dependent.
    for (const e of entries) {
      const delta =
        e.account.type === "ASSET" || e.account.type === "EXPENSE"
          ? e.debitMinor - e.creditMinor
          : e.creditMinor - e.debitMinor;
      if (delta === 0) continue;
      await prisma.ledgerAccount.update({
        where: { id: e.accountId },
        data: { balanceMinor: { decrement: delta } },
      });
    }
    await prisma.ledgerEntry.deleteMany({ where: { journalId: { in: journalIds } } });
    await prisma.ledgerJournal.deleteMany({ where: { id: { in: journalIds } } });
    journalIds.length = 0;
  }

  if (ids.length) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.walletTopUp.deleteMany({ where: { userId: { in: ids } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
  // The per-user liability account is ours alone, so it can be removed outright.
  await prisma.ledgerAccount.deleteMany({ where: { code: { in: codes.length ? codes : ["__none__"] } } });

  userId = "";
  staffId = "";
  walletId = "";
  addedByCode.clear();
}

/**
 * Records this run's journals so cleanup can subtract their movement again.
 *
 * `recordWalletTopUpLedger` keys the journal on the top-up id, and
 * `referenceId` is the top-up's cuid — neither carries runId, so the journals
 * are found by walking this run's top-ups instead.
 */
async function trackJournals() {
  if (!userId) return;
  const topUps = await prisma.walletTopUp.findMany({
    where: { userId },
    select: { id: true },
  });
  if (!topUps.length) return;
  const rows = await prisma.ledgerJournal.findMany({
    where: { idempotencyKey: { in: topUps.map((t) => `topup-${t.id}`) } },
    select: { id: true },
  });
  journalIds.push(...rows.map((r) => r.id));
}

describe("a wallet top-up is journalled, not just credited", () => {
  it("posts a WALLET_TOPUP journal that moves the settlement asset and the user liability", async () => {
    const topUp = await makePendingTopUp("TELEBIRR");

    const assetBefore = await snapshot(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code);
    const liabilityBefore = await snapshot(userAccountCode(userId));

    await handleTopUpWebhook({
      providerTransactionId: topUp.providerTransactionId!,
      status: "SUCCESS",
      rawPayload: {},
    });
    await trackJournals();

    // The wallet is credited (this already worked).
    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(wallet.balanceMinor).toBe(AMOUNT);

    // The cash is now recorded as having ARRIVED in the settlement account.
    // Before the fix this delta was zero, which is what let the first payout
    // drive the asset account negative and trip the DB CHECK.
    expect((await accountBalance(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code))!).toBe(
      assetBefore + AMOUNT,
    );

    // And the platform now admits it owes the user that money. Before the fix
    // this account did not exist and read 0 against a real wallet balance.
    expect((await accountBalance(userAccountCode(userId)))!).toBe(liabilityBefore + AMOUNT);

    // The journal itself, with the exact debits and credits.
    const journal = await prisma.ledgerJournal.findUnique({
      where: { idempotencyKey: `topup-${topUp.id}` },
      include: { entries: { include: { account: true } } },
    });
    expect(journal, "the credit must leave a journal behind").toBeTruthy();
    expect(journal!.referenceType).toBe("WALLET_TOPUP");

    const agg = await prisma.ledgerEntry.aggregate({
      where: { journalId: journal!.id },
      _sum: { debitMinor: true, creditMinor: true },
    });
    expect(agg._sum.debitMinor).toBe(AMOUNT);
    expect(agg._sum.creditMinor).toBe(AMOUNT);

    const byCode = new Map(
      journal!.entries.map((e) => [e.account.code, { d: e.debitMinor, c: e.creditMinor }]),
    );
    expect(byCode.get(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code)).toEqual({
      d: AMOUNT,
      c: 0,
    });
    expect(byCode.get(userAccountCode(userId))).toEqual({ d: 0, c: AMOUNT });
  });

  it("leaves the user's ledger liability equal to their wallet balance", async () => {
    const topUp = await makePendingTopUp("TELEBIRR");

    await handleTopUpWebhook({
      providerTransactionId: topUp.providerTransactionId!,
      status: "SUCCESS",
      rawPayload: {},
    });
    await trackJournals();

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    const ledger = (await accountBalance(userAccountCode(userId))) ?? 0;

    // The cross-check, not the journal's existence. Before the fix the wallet
    // read AMOUNT and the liability read 0.
    expect(ledger, "wallet balance and ledger liability must agree").toBe(wallet.balanceMinor);
  });

  it("does not post twice when the same success callback is delivered twice", async () => {
    const topUp = await makePendingTopUp("TELEBIRR");
    const assetBefore = await snapshot(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code);

    await handleTopUpWebhook({
      providerTransactionId: topUp.providerTransactionId!,
      status: "SUCCESS",
      rawPayload: {},
    });
    await handleTopUpWebhook({
      providerTransactionId: topUp.providerTransactionId!,
      status: "SUCCESS",
      rawPayload: {},
    });
    await trackJournals();

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(wallet.balanceMinor).toBe(AMOUNT);
    expect((await accountBalance(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code))!).toBe(
      assetBefore + AMOUNT,
    );
    expect(
      await prisma.ledgerJournal.count({ where: { idempotencyKey: `topup-${topUp.id}` } }),
      "a duplicate callback must not post a second journal",
    ).toBe(1);
  });
});

describe("staff approval is a credit path too", () => {
  it("journals the credit it mints", async () => {
    const topUp = await prisma.walletTopUp.create({
      data: {
        userId,
        walletId,
        provider: "TELEBIRR",
        amountMinor: AMOUNT,
        status: "PENDING",
        providerTransactionId: `txn-${runId}-staff-${Math.random().toString(36).slice(2, 10)}`,
      },
    });

    const assetBefore = await snapshot(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code);
    const liabilityBefore = await snapshot(userAccountCode(userId));

    await approveTopUp({ staffUserId: staffId, topUpId: topUp.id });
    await trackJournals();

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(wallet.balanceMinor).toBe(AMOUNT);
    expect((await accountBalance(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code))!).toBe(
      assetBefore + AMOUNT,
    );
    expect((await accountBalance(userAccountCode(userId)))!).toBe(liabilityBefore + AMOUNT);
    expect(
      await prisma.ledgerJournal.count({ where: { idempotencyKey: `topup-${topUp.id}` } }),
    ).toBe(1);
  });

  it("refuses to credit twice when two staff approve the same top-up", async () => {
    const topUp = await prisma.walletTopUp.create({
      data: {
        userId,
        walletId,
        provider: "TELEBIRR",
        amountMinor: AMOUNT,
        status: "PENDING",
        providerTransactionId: `txn-${runId}-staff2-${Math.random().toString(36).slice(2, 10)}`,
      },
    });
    const assetBefore = await snapshot(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code);

    await approveTopUp({ staffUserId: staffId, topUpId: topUp.id });

    await expect(
      approveTopUp({ staffUserId: staffId, topUpId: topUp.id }),
    ).rejects.toBeInstanceOf(TopUpAlreadyResolvedError);
    await trackJournals();

    const wallet = await prisma.wallet.findUniqueOrThrow({ where: { id: walletId } });
    expect(wallet.balanceMinor, "a second approval must not mint more money").toBe(AMOUNT);
    expect((await accountBalance(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code))!).toBe(
      assetBefore + AMOUNT,
    );
    // Sequential replay is stopped by the status re-read. Two staff clicking
    // approve in the same instant is stopped by the conditional claim inside
    // the transaction, which this sequence cannot reach — that path needs a
    // real interleaving, not a second await, so it is asserted here only by the
    // outcome it shares with the one that is reachable.
    expect(
      await prisma.ledgerJournal.count({ where: { idempotencyKey: `topup-${topUp.id}` } }),
    ).toBe(1);
  });
});

describe("settlement accounts are not collapsed into one another", () => {
  it("credits the CBE asset account for a CBE top-up", async () => {
    const topUp = await makePendingTopUp("CBE_BIRR");

    const telebirrBefore = await snapshot(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code);
    const cbeBefore = await snapshot(CHART_OF_ACCOUNTS.ASSET_CBE_SETTLEMENT.code);

    await handleTopUpWebhook({
      providerTransactionId: topUp.providerTransactionId!,
      status: "SUCCESS",
      rawPayload: {},
    });
    await trackJournals();

    // The `PaymentProvider` enum member is CBE_BIRR. The old comparison was
    // against the literal "CBE", which can never be equal, so every CBE
    // settlement was booked against Telebirr's bank account.
    expect((await accountBalance(CHART_OF_ACCOUNTS.ASSET_CBE_SETTLEMENT.code))!).toBe(cbeBefore + AMOUNT);
    expect(
      (await accountBalance(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code))!,
      "a CBE payment must not move the Telebirr settlement account",
    ).toBe(telebirrBefore);
  });
});
