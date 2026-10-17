import { describe, it, expect, beforeEach, afterAll, vi } from "vitest";
import { prisma } from "../src/lib/prisma.js";
import { env } from "../src/config/env.js";

/**
 * Payout atomicity and the settle race.
 *
 * Three separate defects, all in the withdrawal path, all in the same place:
 * money leaves the wallet and the books are supposed to follow, with nothing
 * to catch them when they disagree.
 *
 * 1. The wallet debit, the audit event and the payout row were three
 *    auto-commit statements. A crash between the debit and the create left the
 *    money gone with no PayoutTransaction at all -- no provider reference, no
 *    status, nothing for finance to reconcile against, and no symptom the user
 *    could report beyond a smaller balance.
 *
 * 2. On confirmation the payout was marked CONFIRMED first and the
 *    disbursement journal posted afterwards, in a separate transaction with no
 *    error handling. A journal failure propagated with the payout already
 *    CONFIRMED and the money already gone: the route 500'd, the user retried,
 *    and a second disbursement went out while the first had landed.
 *    settlePayout had the same journal failure caught into a log line instead,
 *    so a payout could sit CONFIRMED with no ledger entry permanently and
 *    auditLedgerIntegrity would not notice -- a missing journal is balanced.
 *
 * 3. settlePayout validated status by reading and then wrote unconditionally.
 *    Two staff acting at once both passed the check, so a CONFIRMED and a
 *    FAILED could both "succeed" -- and the FAILED branch re-credits a wallet
 *    for money that had already been disbursed.
 *
 * The provider is mocked so the disbursement path is deterministic and no money
 * leaves the process.
 */

const disbursementResult: { status: "CONFIRMED" | "FAILED" | "PROCESSING"; providerPayoutId?: string; errorMessage?: string } = {
  status: "CONFIRMED",
  providerPayoutId: "prov-disbursement-1",
};

vi.mock("../src/modules/escrow/providers/paymentProvider.interface.js", async () => {
  const actual = await vi.importActual<
    typeof import("../src/modules/escrow/providers/paymentProvider.interface.js")
  >("../src/modules/escrow/providers/paymentProvider.interface.js");
  return actual;
});

vi.mock("../src/modules/escrow/providers/telebirr.client.js", () => ({
  telebirrClient: {
    initiateDisbursement: vi.fn(async () => disbursementResult),
    hasCredentials: () => true,
  },
}));

const { withdrawFromWallet } = await import("../src/modules/escrow/escrow.service.js");
const { settlePayout, InvalidPayoutStateError } = await import(
  "../src/modules/admin/payoutAdmin.service.js"
);
const { CHART_OF_ACCOUNTS, getUserAccountCode, recordWalletTopUpLedger } = await import(
  "../src/modules/finance/ledger.service.js"
);

const STAMP = Date.now();
const AMOUNT = 400_000;
const FEE_MINOR = Math.round(AMOUNT * 0.005);

const userIds: string[] = [];
let staffId = "";

async function cleanup() {
  const ids = userIds.splice(0, userIds.length);

  // Ledger first, and SCOPED TO THIS FILE'S JOURNALS ONLY.
  //
  // An earlier version deleted every WALLET_TOPUP and WITHDRAWAL_PAYOUT journal
  // in the database. Ledger rows are shared across test files running in
  // parallel, so that removed other files' journals and broke
  // topup-ledger-journal.test.ts — which then failed only when both files ran
  // together, the hardest kind of failure to read. Scope by idempotency key:
  // `topup-seed-<userId>` is this file's marker, and disbursement journals are
  // keyed on a payout belonging to one of our users.
  const payoutIds = ids.length
    ? (
        await prisma.payoutTransaction.findMany({
          where: { userId: { in: ids } },
          select: { id: true },
        })
      ).map((p) => p.id)
    : [];

  const keys = [
    ...ids.map((id) => `topup-seed-${id}`),
    ...payoutIds.map((id) => `payout-${id}`),
  ];

  if (keys.length) {
    await prisma.ledgerEntry.deleteMany({
      where: { journal: { idempotencyKey: { in: keys } } },
    });
    await prisma.ledgerJournal.deleteMany({ where: { idempotencyKey: { in: keys } } });
  }

  if (ids.length) {
    await prisma.auditLog.deleteMany({ where: { userId: { in: ids } } });
    await prisma.notification.deleteMany({ where: { userId: { in: ids } } });
    await prisma.transactionFlag.deleteMany({ where: { userId: { in: ids } } });
    await prisma.payoutTransaction.deleteMany({ where: { userId: { in: ids } } });
    await prisma.wallet.deleteMany({ where: { userId: { in: ids } } });
    await prisma.kycRecord.deleteMany({ where: { userId: { in: ids } } });
    await prisma.ledgerAccount.deleteMany({ where: { code: { in: ids.map(getUserAccountCode) } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

async function makeUser(label: string, balance: number, opts?: { staff?: boolean }) {
  // Whole-label hash, not the first character: "settler" and "staff" share
  // one, which collided on the unique phone column.
  const labelHash = [...label].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) % 1_000_000, 7);
  const created = await prisma.user.create({
    data: {
      email: `payout-atomic-${label}-${STAMP}@test.et`,
      phone: `+2519${String(40000000 + (STAMP % 9000000) + labelHash)}`,
      passwordHash: "not-a-real-hash",
      role: "FREELANCER",
      staffRole: opts?.staff ? "ADMIN" : null,
      // A verified phone: withdrawFromWallet refuses to move money to a
      // destination that has not been proven.
      phoneVerifiedAt: new Date(),
      kyc: { create: { tier: "TIER_2", status: "VERIFIED" } },
      wallet: { create: { balanceMinor: balance } },
    } as never,
    include: { wallet: true },
  });
  userIds.push(created.id);
  if (opts?.staff) staffId = created.id;

  // Put the money into the platform before letting the test move it.
  //
  // A wallet balance is a promise the platform owes; the cash behind it arrives
  // as a top-up. Without this journal the settlement asset account has no
  // inflow, so a withdrawal debits it negative and the
  // LedgerAccount_balance_check constraint rejects the journal — which is
  // precisely the production failure CRIT-1 describes, reproduced here
  // because the test database's shared asset account has drifted negative.
  //
  // Seeding the inflow is both realistic and self-sufficient: the test no
  // longer depends on the shared account's current balance, so it cannot be
  // broken by another file or by accumulated history.
  if (balance > 0) {
    await prisma.$transaction(async (tx) => {
      await recordWalletTopUpLedger(tx, {
        userId: created.id,
        topUpId: `seed-${created.id}`,
        amountMinor: balance,
        provider: "TELEBIRR",
      });
    });
  }

  return created;
}

async function balanceOf(userId: string): Promise<number> {
  const w = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  return w.balanceMinor;
}

async function journalForPayout(payoutId: string) {
  return prisma.ledgerJournal.findUnique({
    where: { idempotencyKey: `payout-${payoutId}` },
    include: { entries: { include: { account: { select: { code: true } } } } },
  });
}

/**
 * Makes one operation inside any interactive transaction throw.
 *
 * WHY THIS EXISTS
 * Atomicity cannot be observed on the happy path: the old three-statement code
 * and the new single transaction both produce the same rows when nothing fails.
 * The only thing that separates them is what survives a failure, so the
 * failure has to be injected.
 *
 * `prisma.$transaction` is wrapped rather than the model delegate. The
 * interactive `tx` client is a different object from `prisma.<model>`, so a
 * spy on the delegate would miss writes made inside the transaction -- and would
 * silently pass for the wrong reason.
 */
let faultSpy: ReturnType<typeof vi.spyOn> | null = null;

function injectTransactionFault(model: string, operation: string) {
  clearTransactionFault();
  const real = prisma.$transaction.bind(prisma);
  faultSpy = vi
    .spyOn(prisma, "$transaction")
    .mockImplementation(((arg: unknown, opts?: unknown) => {
      if (typeof arg !== "function") return (real as (a: unknown, o?: unknown) => unknown)(arg, opts);

      const guarded = (tx: Record<string, unknown>) =>
        (arg as (t: unknown) => unknown)(
          new Proxy(tx, {
            get(target, prop: string) {
              if (prop !== model) {
                const value = target[prop];
                return typeof value === "function" ? value.bind(target) : value;
              }
              const delegate = target[prop] as Record<string, unknown>;
              return new Proxy(delegate, {
                get(modelTarget, op: string) {
                  if (op === operation) {
                    return async () => {
                      throw new Error(`injected failure: ${model}.${operation}`);
                    };
                  }
                  const value = modelTarget[op];
                  return typeof value === "function" ? value.bind(modelTarget) : value;
                },
              });
            },
          }),
        );

      return (real as (a: unknown, o?: unknown) => unknown)(guarded, opts);
    }) as never);
}

function clearTransactionFault() {
  if (faultSpy) {
    faultSpy.mockRestore();
    faultSpy = null;
  }
}

beforeEach(async () => {
  await cleanup();
  disbursementResult.status = "CONFIRMED";
  disbursementResult.providerPayoutId = "prov-disbursement-1";
  delete disbursementResult.errorMessage;
});

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("the withdrawal is atomic", () => {
  it("debits, audits and creates the payout row together", async () => {
    const user = await makeUser("freelancer", 1_000_000);
    const before = await balanceOf(user.id);

    const result = await withdrawFromWallet({
      userId: user.id,
      amountMinor: AMOUNT,
      provider: "TELEBIRR" as never,
      payoutAccountIdentifier: user.phone,
    });

    expect(await balanceOf(user.id)).toBe(before - AMOUNT);
    expect(
      await prisma.auditLog.count({
        where: { userId: user.id, eventType: "WALLET_WITHDRAWAL_INITIATED" },
      }),
    ).toBe(1);
    const payout = await prisma.payoutTransaction.findUniqueOrThrow({
      where: { id: result.payoutId },
    });
    expect(payout.status).toBe("CONFIRMED");
  });

  it("keeps the money when the payout row cannot be created", async () => {
    // The test that actually distinguishes one transaction from three
    // auto-commit statements.
    //
    // Asserting "the debit happened and a payout row exists" passes either way,
    // because the happy path is identical before and after the fix. Only a
    // failure distinguishes them: if the payout row cannot be written, the
    // debit must roll back with it. Under the old code the debit was its own
    // committed statement, so a failure here left the wallet short with no
    // payout row anywhere -- no provider reference, no status, nothing for
    // finance to reconcile against.
    const user = await makeUser("faulty", 1_000_000);
    const before = await balanceOf(user.id);

    injectTransactionFault("payoutTransaction", "create");
    await expect(
      withdrawFromWallet({
        userId: user.id,
        amountMinor: AMOUNT,
        provider: "TELEBIRR" as never,
        payoutAccountIdentifier: user.phone,
      }),
    ).rejects.toThrow(/injected/i);
    clearTransactionFault();

    expect(
      await balanceOf(user.id),
      "a failed payout must not leave the money debited with no payout row",
    ).toBe(before);
    expect(
      await prisma.payoutTransaction.count({ where: { userId: user.id } }),
      "no half-made withdrawal may survive",
    ).toBe(0);
    expect(
      await prisma.auditLog.count({
        where: { userId: user.id, eventType: "WALLET_WITHDRAWAL_INITIATED" },
      }),
      "the audit event must roll back with the rest",
    ).toBe(0);
  });

  it("confirms the payout and posts the journal in the same transaction", async () => {
    const user = await makeUser("confirmed", 1_000_000);

    const result = await withdrawFromWallet({
      userId: user.id,
      amountMinor: AMOUNT,
      provider: "TELEBIRR" as never,
      payoutAccountIdentifier: user.phone,
    });

    // Both, together. Before the fix the payout was CONFIRMED first and the
    // journal posted after; a failure between them produced a CONFIRMED payout
    // with no ledger entry and a 500 on the route.
    const payout = await prisma.payoutTransaction.findUniqueOrThrow({
      where: { id: result.payoutId },
    });
    expect(payout.status).toBe("CONFIRMED");

    const journal = await journalForPayout(result.payoutId);
    expect(journal, "a CONFIRMED payout must have a journal").toBeTruthy();
    expect(journal!.referenceType).toBe("WITHDRAWAL_PAYOUT");

    // Exact amounts: user liability debited gross, asset credited net, fee to
    // revenue.
    const byCode = new Map(journal!.entries.map((e) => [e.account.code, e]));
    expect(byCode.get(getUserAccountCode(user.id))?.debitMinor).toBe(AMOUNT);
    expect(byCode.get(CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code)?.creditMinor).toBe(
      AMOUNT - FEE_MINOR,
    );
    expect(byCode.get(CHART_OF_ACCOUNTS.REVENUE_DISBURSEMENT_FEES.code)?.creditMinor).toBe(
      FEE_MINOR,
    );
  });

  it("does not confirm the payout when the journal cannot be posted", async () => {
    // The second half of the same defect, and the one that cost money.
    //
    // The payout was marked CONFIRMED first and the journal posted after, in a
    // separate transaction with no error handling. The money had already left
    // the platform, so a journal failure propagated with the payout CONFIRMED:
    // the route 500'd, the user retried, and a second disbursement went out
    // while the first had landed. No CONFIRMED may exist without its journal.
    const user = await makeUser("journal-fault", 1_000_000);

    injectTransactionFault("ledgerJournal", "create");
    await expect(
      withdrawFromWallet({
        userId: user.id,
        amountMinor: AMOUNT,
        provider: "TELEBIRR" as never,
        payoutAccountIdentifier: user.phone,
      }),
    ).rejects.toThrow(/injected/i);
    clearTransactionFault();

    const payouts = await prisma.payoutTransaction.findMany({ where: { userId: user.id } });
    expect(payouts).toHaveLength(1);
    expect(
      payouts[0].status,
      "a payout whose journal failed must not read CONFIRMED",
    ).not.toBe("CONFIRMED");
  });

  it("re-credits the wallet and leaves no journal when the provider rejects", async () => {
    const user = await makeUser("rejected", 1_000_000);
    disbursementResult.status = "FAILED";
    disbursementResult.errorMessage = "provider declined";

    await expect(
      withdrawFromWallet({
        userId: user.id,
        amountMinor: AMOUNT,
        provider: "TELEBIRR" as never,
        payoutAccountIdentifier: user.phone,
      }),
    ).rejects.toThrow();

    expect(await balanceOf(user.id), "the debit must be reversed").toBe(1_000_000);
    const payouts = await prisma.payoutTransaction.findMany({ where: { userId: user.id } });
    expect(payouts).toHaveLength(1);
    expect(payouts[0].status).toBe("FAILED");
    // Nothing left the platform, so nothing should be in the ledger.
    expect(await journalForPayout(payouts[0].id)).toBeNull();
  });
});

describe("settlePayout cannot settle the same payout twice", () => {
  async function seedProcessingPayout(balance = 1_000_000) {
    const user = await makeUser("settler", balance);
    await makeUser("staff", 0, { staff: true });
    const payout = await prisma.payoutTransaction.create({
      data: {
        userId: user.id,
        walletId: user.wallet!.id,
        amountMinor: AMOUNT,
        feeMinor: FEE_MINOR,
        netAmountMinor: AMOUNT - FEE_MINOR,
        provider: "TELEBIRR",
        payoutAccountIdentifier: user.phone,
        status: "PROCESSING",
      },
    });
    return { user, payout };
  }

  it("a second CONFIRMED is refused", async () => {
    const { payout } = await seedProcessingPayout();

    await settlePayout({ staffUserId: staffId, payoutId: payout.id, decision: "CONFIRMED" });
    await expect(
      settlePayout({ staffUserId: staffId, payoutId: payout.id, decision: "CONFIRMED" }),
    ).rejects.toBeInstanceOf(InvalidPayoutStateError);

    // And only one journal, not one per attempt.
    expect(await prisma.ledgerJournal.count({ where: { idempotencyKey: `payout-${payout.id}` } })).toBe(1);
  });

  it("a FAILED after a CONFIRMED cannot re-credit the wallet", async () => {
    // The money moved, so re-crediting would mint it. Before the fix both
    // statuses were written unconditionally and the FAILED branch paid out.
    const { user, payout } = await seedProcessingPayout();
    const before = await balanceOf(user.id);

    await settlePayout({
      staffUserId: staffId,
      payoutId: payout.id,
      decision: "CONFIRMED",
      providerPayoutId: "prov-1",
    });

    await expect(
      settlePayout({
        staffUserId: staffId,
        payoutId: payout.id,
        decision: "FAILED",
        failureReason: "operator error",
      }),
    ).rejects.toBeInstanceOf(InvalidPayoutStateError);

    expect(
      await balanceOf(user.id),
      "the wallet must not be credited for a disbursement that happened",
    ).toBe(before);

    const row = await prisma.payoutTransaction.findUniqueOrThrow({ where: { id: payout.id } });
    expect(row.status).toBe("CONFIRMED");
  });

  it("concurrent CONFIRMED and FAILED settle exactly one", async () => {
    // The interleaving this guards is the one the read-then-write allowed:
    // both read PROCESSING, both passed, both wrote.
    const { user, payout } = await seedProcessingPayout();
    const before = await balanceOf(user.id);

    const results = await Promise.allSettled([
      settlePayout({ staffUserId: staffId, payoutId: payout.id, decision: "CONFIRMED", providerPayoutId: "p" }),
      settlePayout({ staffUserId: staffId, payoutId: payout.id, decision: "FAILED", failureReason: "x" }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    expect(fulfilled, "exactly one settlement may take effect").toHaveLength(1);

    const row = await prisma.payoutTransaction.findUniqueOrThrow({ where: { id: payout.id } });
    if (row.status === "CONFIRMED") {
      // Money went out; the wallet must be untouched.
      expect(await balanceOf(user.id)).toBe(before);
      expect(await prisma.ledgerJournal.count({ where: { idempotencyKey: `payout-${payout.id}` } })).toBe(1);
    } else {
      // Money did not go out; the wallet must be credited exactly once and no
      // journal posted.
      expect(await balanceOf(user.id)).toBe(before + AMOUNT);
      expect(await prisma.ledgerJournal.count({ where: { idempotencyKey: `payout-${payout.id}` } })).toBe(0);
    }
  });

  it("a FAILED reversal posts no disbursement journal", async () => {
    const { payout } = await seedProcessingPayout();

    await settlePayout({ staffUserId: staffId, payoutId: payout.id, decision: "FAILED" });

    // Nothing left the platform, so nothing should be in the ledger.
    expect(await journalForPayout(payout.id)).toBeNull();
  });
});