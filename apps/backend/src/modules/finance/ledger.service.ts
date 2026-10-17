// === IMPORTS ===
import { Prisma, LedgerAccountType, LedgerJournal } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { logger } from "../../lib/logger.js";

// === CHART OF ACCOUNTS (STANDARD CODES) ===
export const CHART_OF_ACCOUNTS = {
  // Assets (1000s)
  ASSET_TELEBIRR_SETTLEMENT: {
    code: "1000-ASSET-TELEBIRR",
    name: "Telebirr Gateway Settlement Account",
    type: LedgerAccountType.ASSET,
  },
  ASSET_CBE_SETTLEMENT: {
    code: "1010-ASSET-CBE",
    name: "Commercial Bank of Ethiopia Settlement Account",
    type: LedgerAccountType.ASSET,
  },
  // Liabilities (2000s)
  LIABILITY_ESCROW_POOL: {
    code: "2000-LIABILITY-ESCROW",
    name: "Customer Milestone Escrow Pool",
    type: LedgerAccountType.LIABILITY,
  },
  LIABILITY_WITHHOLDING_ERA: {
    code: "2050-LIABILITY-WITHHOLDING-ERA",
    name: "Withholding Tax Payable to ERA",
    type: LedgerAccountType.LIABILITY,
  },
  LIABILITY_VAT_PAYABLE: {
    code: "2060-LIABILITY-VAT-PAYABLE",
    name: "Value Added Tax Payable",
    type: LedgerAccountType.LIABILITY,
  },
  // Revenues (4000s)
  REVENUE_PLATFORM_FEES: {
    code: "4000-REVENUE-PLATFORM-FEES",
    name: "Platform Marketplace Commission Revenue",
    type: LedgerAccountType.REVENUE,
  },
  REVENUE_DISBURSEMENT_FEES: {
    code: "4010-REVENUE-DISBURSEMENT-FEES",
    name: "Withdrawal & Disbursement Fee Revenue",
    type: LedgerAccountType.REVENUE,
  },
} as const;

export function getUserAccountCode(userId: string): string {
  return `2100-USER-${userId}`;
}

/**
 * Resolves which settlement asset account a provider's cash moves through.
 *
 * The `PaymentProvider` enum values are TELEBIRR, CHAPA, CBE_BIRR and M_PESA.
 * Comparing against the literal "CBE" could never be true, so every CBE
 * top-up and every CBE payout was posting against the Telebirr asset account —
 * two different bank accounts collapsed into one ledger line. Match on the
 * enum member, and default anything unrecognised to Telebirr rather than
 * inventing a new account.
 */
export function resolveSettlementAssetAccount(provider: string | null | undefined) {
  return provider === "CBE_BIRR"
    ? CHART_OF_ACCOUNTS.ASSET_CBE_SETTLEMENT
    : CHART_OF_ACCOUNTS.ASSET_TELEBIRR_SETTLEMENT;
}

// === ERROR CLASSES ===
export class UnbalancedJournalError extends Error {
  constructor(debits: number, credits: number) {
    super(
      `Double-entry invariant violated: total debits (${debits}) must equal total credits (${credits}). Difference: ${Math.abs(debits - credits)} minor units.`,
    );
    this.name = "UnbalancedJournalError";
  }
}

export class DuplicateJournalError extends Error {
  constructor(idempotencyKey: string) {
    super(`Journal with idempotency key ${idempotencyKey} has already been posted.`);
    this.name = "DuplicateJournalError";
  }
}

// === TYPES ===
export interface JournalEntryLine {
  accountCode: string;
  accountName?: string;
  accountType?: LedgerAccountType;
  debitMinor?: number;
  creditMinor?: number;
}

export interface PostJournalParams {
  idempotencyKey: string;
  referenceType: string;
  referenceId?: string;
  description: string;
  entries: JournalEntryLine[];
}

/**
 * Ensures an account exists in the ledger, creating it with balance 0 if missing.
 */
export async function ensureLedgerAccount(
  tx: Prisma.TransactionClient,
  params: {
    code: string;
    name: string;
    type: LedgerAccountType;
    currency?: string;
  },
) {
  return tx.ledgerAccount.upsert({
    where: { code: params.code },
    create: {
      code: params.code,
      name: params.name,
      type: params.type,
      currency: params.currency ?? "ETB",
      balanceMinor: 0,
    },
    update: {},
  });
}

/**
 * Posts an atomic double-entry journal transaction.
 * Invariant: Sum of all debits must equal sum of all credits, and sum > 0.
 */
export async function postJournalEntry(
  tx: Prisma.TransactionClient,
  params: PostJournalParams,
): Promise<LedgerJournal> {
  const existing = await tx.ledgerJournal.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
  });
  if (existing) {
    logger.warn(
      { idempotencyKey: params.idempotencyKey },
      "Idempotent journal entry replay detected — returning existing journal",
    );
    return existing;
  }

  let totalDebits = 0;
  let totalCredits = 0;

  for (const line of params.entries) {
    const debit = line.debitMinor ?? 0;
    const credit = line.creditMinor ?? 0;

    if (debit < 0 || credit < 0) {
      throw new Error(`Negative debit/credit line amounts are prohibited (got debit: ${debit}, credit: ${credit})`);
    }
    if (debit > 0 && credit > 0) {
      throw new Error(`A single entry line cannot have both debit and credit (got debit: ${debit}, credit: ${credit})`);
    }

    totalDebits += debit;
    totalCredits += credit;
  }

  if (totalDebits !== totalCredits) {
    throw new UnbalancedJournalError(totalDebits, totalCredits);
  }
  if (totalDebits === 0) {
    throw new Error("Cannot post a zero-amount journal entry.");
  }

  const journal = await tx.ledgerJournal.create({
    data: {
      idempotencyKey: params.idempotencyKey,
      description: params.description,
      referenceType: params.referenceType,
      referenceId: params.referenceId,
    },
  });

  const rows: Prisma.LedgerEntryCreateManyInput[] = [];

  for (const line of params.entries) {
    const debit = line.debitMinor ?? 0;
    const credit = line.creditMinor ?? 0;

    // Resolve or default account attributes
    let accountType = line.accountType;
    let accountName = line.accountName;

    if (!accountType) {
      if (line.accountCode.startsWith("1000") || line.accountCode.startsWith("1010")) {
        accountType = LedgerAccountType.ASSET;
        accountName = accountName ?? "Settlement Asset";
      } else if (line.accountCode.startsWith("2")) {
        accountType = LedgerAccountType.LIABILITY;
        accountName = accountName ?? `Customer Account ${line.accountCode}`;
      } else if (line.accountCode.startsWith("4")) {
        accountType = LedgerAccountType.REVENUE;
        accountName = accountName ?? "Revenue Account";
      } else {
        accountType = LedgerAccountType.LIABILITY;
        accountName = accountName ?? line.accountCode;
      }
    }

    const account = await ensureLedgerAccount(tx, {
      code: line.accountCode,
      name: accountName ?? line.accountCode,
      type: accountType,
    });

    // Compute balance delta:
    // For ASSET & EXPENSE: Debit increases (+), Credit decreases (-)
    // For LIABILITY, EQUITY & REVENUE: Credit increases (+), Debit decreases (-)
    let balanceDelta = 0;
    if (account.type === LedgerAccountType.ASSET || account.type === LedgerAccountType.EXPENSE) {
      balanceDelta = debit - credit;
    } else {
      balanceDelta = credit - debit;
    }

    await tx.ledgerAccount.update({
      where: { id: account.id },
      data: {
        balanceMinor: { increment: balanceDelta },
      },
    });

    // Buffered rather than inserted per line. The ledger_balance_guard trigger
    // validates an entire journal per STATEMENT, which is what lets a valid
    // multi-line posting satisfy debits == credits without a row-level trigger
    // rejecting the first line. Posting line-by-line in separate statements
    // would make every journal look unbalanced after its first insert.
    rows.push({
      journalId: journal.id,
      accountId: account.id,
      debitMinor: debit,
      creditMinor: credit,
    });
  }

  await tx.ledgerEntry.createMany({ data: rows });

  logger.info(
    {
      journalId: journal.id,
      idempotencyKey: journal.idempotencyKey,
      referenceType: params.referenceType,
      amountMinor: totalDebits,
    },
    "Double-entry journal posted successfully",
  );

  return journal;
}

// === HIGH-LEVEL ESCROW & WALLET LEDGER ACTIONS ===

/**
 * Client deposits funds into platform wallet via Telebirr or CBE.
 * Debit:  ASSET (Settlement account)
 * Credit: LIABILITY (Client wallet account)
 */
export async function recordWalletTopUpLedger(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    topUpId: string;
    amountMinor: number;
    provider: string;
  },
) {
  const assetAccount = resolveSettlementAssetAccount(params.provider);

  return postJournalEntry(tx, {
    idempotencyKey: `topup-${params.topUpId}`,
    referenceType: "WALLET_TOPUP",
    referenceId: params.topUpId,
    description: `Wallet top-up via ${params.provider}`,
    entries: [
      {
        accountCode: assetAccount.code,
        accountName: assetAccount.name,
        accountType: assetAccount.type,
        debitMinor: params.amountMinor,
      },
      {
        accountCode: getUserAccountCode(params.userId),
        accountName: `User Wallet (${params.userId})`,
        accountType: LedgerAccountType.LIABILITY,
        creditMinor: params.amountMinor,
      },
    ],
  });
}

/**
 * Client funds milestone from wallet into escrow.
 * Debit:  LIABILITY (Client wallet account)
 * Credit: LIABILITY (Escrow Pool)
 * Credit: REVENUE (Client fee add-on, if any)
 */
export async function recordEscrowFundingLedger(
  tx: Prisma.TransactionClient,
  params: {
    clientId: string;
    milestoneId: string;
    totalChargedMinor: number;
    milestoneGrossMinor: number;
    platformFeeFromClientMinor: number;
  },
) {
  const entries: JournalEntryLine[] = [
    {
      accountCode: getUserAccountCode(params.clientId),
      accountName: `User Wallet (${params.clientId})`,
      accountType: LedgerAccountType.LIABILITY,
      debitMinor: params.totalChargedMinor,
    },
    {
      accountCode: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.code,
      accountName: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.name,
      accountType: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.type,
      creditMinor: params.milestoneGrossMinor,
    },
  ];

  if (params.platformFeeFromClientMinor > 0) {
    entries.push({
      accountCode: CHART_OF_ACCOUNTS.REVENUE_PLATFORM_FEES.code,
      accountName: CHART_OF_ACCOUNTS.REVENUE_PLATFORM_FEES.name,
      accountType: CHART_OF_ACCOUNTS.REVENUE_PLATFORM_FEES.type,
      creditMinor: params.platformFeeFromClientMinor,
    });
  }

  return postJournalEntry(tx, {
    idempotencyKey: `escrow-fund-${params.milestoneId}`,
    referenceType: "ESCROW_FUND",
    referenceId: params.milestoneId,
    description: `Milestone escrow funding from wallet`,
    entries,
  });
}

/**
 * Milestone released to freelancer.
 * Debit:  LIABILITY (Escrow Pool)
 * Credit: LIABILITY (Freelancer wallet account — net)
 * Credit: REVENUE (Platform commission)
 * Credit: LIABILITY (Withholding tax due ERA)
 */
export async function recordMilestoneReleaseLedger(
  tx: Prisma.TransactionClient,
  params: {
    freelancerId: string;
    milestoneId: string;
    milestoneGrossMinor: number;
    freelancerNetMinor: number;
    platformFeeFromFreelancerMinor: number;
    withholdingTaxMinor: number;
  },
) {
  const entries: JournalEntryLine[] = [
    {
      accountCode: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.code,
      accountName: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.name,
      accountType: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.type,
      debitMinor: params.milestoneGrossMinor,
    },
    {
      accountCode: getUserAccountCode(params.freelancerId),
      accountName: `User Wallet (${params.freelancerId})`,
      accountType: LedgerAccountType.LIABILITY,
      creditMinor: params.freelancerNetMinor,
    },
  ];

  if (params.platformFeeFromFreelancerMinor > 0) {
    entries.push({
      accountCode: CHART_OF_ACCOUNTS.REVENUE_PLATFORM_FEES.code,
      accountName: CHART_OF_ACCOUNTS.REVENUE_PLATFORM_FEES.name,
      accountType: CHART_OF_ACCOUNTS.REVENUE_PLATFORM_FEES.type,
      creditMinor: params.platformFeeFromFreelancerMinor,
    });
  }

  if (params.withholdingTaxMinor > 0) {
    entries.push({
      accountCode: CHART_OF_ACCOUNTS.LIABILITY_WITHHOLDING_ERA.code,
      accountName: CHART_OF_ACCOUNTS.LIABILITY_WITHHOLDING_ERA.name,
      accountType: CHART_OF_ACCOUNTS.LIABILITY_WITHHOLDING_ERA.type,
      creditMinor: params.withholdingTaxMinor,
    });
  }

  return postJournalEntry(tx, {
    idempotencyKey: `escrow-release-${params.milestoneId}`,
    referenceType: "MILESTONE_RELEASE",
    referenceId: params.milestoneId,
    description: `Milestone release to freelancer wallet`,
    entries,
  });
}

/**
 * Disputed milestone refunded to client wallet.
 * Debit:  LIABILITY (Escrow Pool)
 * Credit: LIABILITY (Client wallet account)
 *
 * The idempotency key is the milestone, and nothing else.
 *
 * This used to end in `-${Date.now()}`, which made the key unique per call by
 * construction. The dedupe could therefore never fire, so the guard was
 * decorative: any retry posted a second journal. The escrow-pool debit is what
 * that duplicate corrupted -- relief for one refund obligation was recorded
 * twice, understating the liability the platform still owed every other
 * client.
 *
 * Keying on the milestone alone is correct because a milestone is refunded at
 * most once. refundMilestoneToClient takes its state as a conditional claim on
 * escrowState, so a second caller matches no rows and throws before reaching
 * this function. PARTIAL_SPLIT calls it for the client's share only, against a
 * milestone whose release journal is separately keyed `escrow-release-<id>`,
 * so the two never collide.
 */
export async function recordDisputeRefundLedger(
  tx: Prisma.TransactionClient,
  params: {
    clientId: string;
    milestoneId: string;
    amountMinor: number;
  },
) {
  return postJournalEntry(tx, {
    idempotencyKey: `dispute-refund-${params.milestoneId}`,
    referenceType: "DISPUTE_REFUND",
    referenceId: params.milestoneId,
    description: `Dispute resolution refund to client wallet`,
    entries: [
      {
        accountCode: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.code,
        accountName: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.name,
        accountType: CHART_OF_ACCOUNTS.LIABILITY_ESCROW_POOL.type,
        debitMinor: params.amountMinor,
      },
      {
        accountCode: getUserAccountCode(params.clientId),
        accountName: `User Wallet (${params.clientId})`,
        accountType: LedgerAccountType.LIABILITY,
        creditMinor: params.amountMinor,
      },
    ],
  });
}

/**
 * Freelancer withdraws money via Telebirr B2C disbursement.
 * Debit:  LIABILITY (Freelancer wallet account)
 * Credit: ASSET (Settlement account)
 * Credit: REVENUE (Disbursement cash-out fee, if any)
 */
export async function recordWithdrawalDisbursementLedger(
  tx: Prisma.TransactionClient,
  params: {
    userId: string;
    payoutId: string;
    grossAmountMinor: number;
    feeMinor: number;
    netAmountMinor: number;
    provider: string;
  },
) {
  const assetAccount = resolveSettlementAssetAccount(params.provider);

  const entries: JournalEntryLine[] = [
    {
      accountCode: getUserAccountCode(params.userId),
      accountName: `User Wallet (${params.userId})`,
      accountType: LedgerAccountType.LIABILITY,
      debitMinor: params.grossAmountMinor,
    },
    {
      accountCode: assetAccount.code,
      accountName: assetAccount.name,
      accountType: assetAccount.type,
      creditMinor: params.netAmountMinor,
    },
  ];

  if (params.feeMinor > 0) {
    entries.push({
      accountCode: CHART_OF_ACCOUNTS.REVENUE_DISBURSEMENT_FEES.code,
      accountName: CHART_OF_ACCOUNTS.REVENUE_DISBURSEMENT_FEES.name,
      accountType: CHART_OF_ACCOUNTS.REVENUE_DISBURSEMENT_FEES.type,
      creditMinor: params.feeMinor,
    });
  }

  return postJournalEntry(tx, {
    idempotencyKey: `payout-${params.payoutId}`,
    referenceType: "WITHDRAWAL_PAYOUT",
    referenceId: params.payoutId,
    description: `Freelancer payout via ${params.provider}`,
    entries,
  });
}

/**
 * System-wide accounting integrity audit: checks that sum of all debits
 * across all entries in the ledger equals sum of all credits.
 */
export async function auditLedgerIntegrity() {
  const aggregates = await prisma.ledgerEntry.aggregate({
    _sum: {
      debitMinor: true,
      creditMinor: true,
    },
    _count: {
      id: true,
    },
  });

  const totalDebits = aggregates._sum.debitMinor ?? 0;
  const totalCredits = aggregates._sum.creditMinor ?? 0;
  const discrepancy = Math.abs(totalDebits - totalCredits);

  return {
    isBalanced: discrepancy === 0,
    totalEntries: aggregates._count.id,
    totalDebitsMinor: totalDebits,
    totalCreditsMinor: totalCredits,
    discrepancyMinor: discrepancy,
  };
}
