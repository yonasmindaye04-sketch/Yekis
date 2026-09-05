import { describe, it, expect, vi } from "vitest";
import {
  UnbalancedJournalError,
  postJournalEntry,
  CHART_OF_ACCOUNTS,
  getUserAccountCode,
} from "../src/modules/finance/ledger.service.js";

describe("Double-Entry Ledger Service Invariants", () => {
  it("rejects an unbalanced journal entry where debits do not equal credits", async () => {
    const mockTx = {
      ledgerJournal: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    await expect(
      postJournalEntry(mockTx, {
        idempotencyKey: "test-unbalanced",
        referenceType: "TEST",
        description: "Unbalanced test",
        entries: [
          {
            accountCode: CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code,
            debitMinor: 1000,
          },
          {
            accountCode: getUserAccountCode("user-1"),
            creditMinor: 800, // 200 mismatch!
          },
        ],
      }),
    ).rejects.toThrow(UnbalancedJournalError);
  });

  it("rejects negative debit or credit amounts", async () => {
    const mockTx = {
      ledgerJournal: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    await expect(
      postJournalEntry(mockTx, {
        idempotencyKey: "test-negative",
        referenceType: "TEST",
        description: "Negative amount test",
        entries: [
          {
            accountCode: CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code,
            debitMinor: -500,
          },
          {
            accountCode: getUserAccountCode("user-1"),
            creditMinor: -500,
          },
        ],
      }),
    ).rejects.toThrow("Negative debit/credit line amounts are prohibited");
  });

  it("rejects a line with both debit and credit populated", async () => {
    const mockTx = {
      ledgerJournal: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    } as any;

    await expect(
      postJournalEntry(mockTx, {
        idempotencyKey: "test-both",
        referenceType: "TEST",
        description: "Both debit and credit test",
        entries: [
          {
            accountCode: CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code,
            debitMinor: 500,
            creditMinor: 500,
          },
        ],
      }),
    ).rejects.toThrow("A single entry line cannot have both debit and credit");
  });

  it("successfully posts balanced journal entries and updates account balances", async () => {
    const mockAccountTelebirr = {
      id: "acc-1",
      code: CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code,
      type: "ASSET",
      balanceMinor: 0,
    };
    const mockAccountUser = {
      id: "acc-2",
      code: "2100-USER-user-1",
      type: "LIABILITY",
      balanceMinor: 0,
    };

    const mockTx = {
      ledgerJournal: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "journal-1",
          idempotencyKey: "test-balanced",
          referenceType: "TEST",
        }),
      },
      ledgerAccount: {
        upsert: vi.fn().mockImplementation(({ where }) => {
          if (where.code === CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code) {
            return Promise.resolve(mockAccountTelebirr);
          }
          return Promise.resolve(mockAccountUser);
        }),
        update: vi.fn().mockResolvedValue({}),
      },
      ledgerEntry: {
        create: vi.fn().mockResolvedValue({ id: "entry-1" }),
      },
    } as any;

    const result = await postJournalEntry(mockTx, {
      idempotencyKey: "test-balanced",
      referenceType: "TEST",
      description: "Balanced test",
      entries: [
        {
          accountCode: CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT.code,
          debitMinor: 1000,
        },
        {
          accountCode: "2100-USER-user-1",
          creditMinor: 1000,
        },
      ],
    });

    expect(result.id).toBe("journal-1");
    expect(mockTx.ledgerJournal.create).toHaveBeenCalledOnce();
    expect(mockTx.ledgerAccount.update).toHaveBeenCalledTimes(2);
    expect(mockTx.ledgerEntry.create).toHaveBeenCalledTimes(2);
  });
});
