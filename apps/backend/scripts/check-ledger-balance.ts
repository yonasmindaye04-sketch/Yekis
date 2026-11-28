/**
 * Double-entry ledger balance & invariant verification script
 * (`pnpm --filter backend ledger:check [--strict-empty] [--allow-remote]`).
 *
 * Checks:
 *  1. Zero-sum invariant per LedgerJournal (`unbalancedCount > 0` fails).
 *     Empty journals (`emptyJournalCount`) warn unless `--strict-empty` is passed.
 *  2. Per-account cached `LedgerAccount.balanceMinor == SUM(LedgerEntry)`
 *     (debit-credit for ASSET/EXPENSE; credit-debit for LIABILITY/EQUITY/REVENUE).
 *     Fails on dev DBs, WARNING only on `*_test` DBs.
 *  3. `PlatformOperatingAccount` vs `SUM(PlatformFeeCredit)` vs GL `4000` (fees)
 *     and GL `2050` (withholding). Fails on dev DBs, WARNING only on `*_test` DBs.
 *  4. Report-only comparison of `2000-LIABILITY-ESCROW` vs non-`seed-` active holds.
 *
 * Refuses to connect to a non-local DB without explicit `--allow-remote`.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabaseTarget } from "./_dbGuard.js";

interface BrokenJournalRow {
  id: string;
  referenceType: string;
  referenceId: string | null;
  idempotencyKey: string;
  entryCount: number;
  debits: string;
  credits: string;
}

interface DriftedAccountRow {
  code: string;
  type: string;
  cachedBalanceMinor: number;
  computedBalanceMinor: number;
}

async function main() {
  const strictEmpty = process.argv.includes("--strict-empty");
  const allowRemote = process.argv.includes("--allow-remote");

  assertLocalDatabaseTarget({
    allowRemote,
    forbidProduction: false,
    scriptName: "ledger:check",
  });

  const prisma = new PrismaClient();
  try {
    const [dbRow] = await prisma.$queryRaw<Array<{ db: string }>>`
      SELECT current_database() AS db
    `;
    const dbName = dbRow?.db ?? "unknown";
    const isTestDb = dbName.endsWith("_test");

    const [
      totals,
      violations,
      accountDrift,
      poa,
      feeCreditsAgg,
      gl4000Row,
      gl2050Row,
      gl2000Row,
      heldMilestonesActive,
      heldMilestonesSeedExcluded,
      heldGigOrdersActive,
      heldGigOrdersSeedExcluded,
    ] = await Promise.all([
      prisma.$queryRaw<
        Array<{
          journalCount: number;
          entryCount: number;
          totalDebits: string;
          totalCredits: string;
        }>
      >`
        SELECT
          (SELECT COUNT(*)::int FROM "LedgerJournal") AS "journalCount",
          COUNT(e.id)::int AS "entryCount",
          COALESCE(SUM(e."debitMinor"), 0)::text AS "totalDebits",
          COALESCE(SUM(e."creditMinor"), 0)::text AS "totalCredits"
        FROM "LedgerEntry" e
      `,
      prisma.$queryRaw<BrokenJournalRow[]>`
        SELECT
          j.id,
          j."referenceType",
          j."referenceId",
          j."idempotencyKey",
          COUNT(e.id)::int AS "entryCount",
          COALESCE(SUM(e."debitMinor"), 0)::text AS "debits",
          COALESCE(SUM(e."creditMinor"), 0)::text AS "credits"
        FROM "LedgerJournal" j
        LEFT JOIN "LedgerEntry" e ON e."journalId" = j.id
        GROUP BY j.id, j."referenceType", j."referenceId", j."idempotencyKey"
        HAVING COALESCE(SUM(e."debitMinor"), 0) <> COALESCE(SUM(e."creditMinor"), 0)
           OR COUNT(e.id) = 0
        ORDER BY j."postedAt" ASC
      `,
      prisma.$queryRaw<DriftedAccountRow[]>`
        SELECT
          t.code,
          t.type,
          t."balanceMinor" AS "cachedBalanceMinor",
          t."computedBalanceMinor"
        FROM (
          SELECT
            a.code,
            a.type::text AS type,
            a."balanceMinor",
            CASE
              WHEN a.type IN ('ASSET', 'EXPENSE')
                THEN COALESCE(SUM(e."debitMinor" - e."creditMinor"), 0)::int
              ELSE COALESCE(SUM(e."creditMinor" - e."debitMinor"), 0)::int
            END AS "computedBalanceMinor"
          FROM "LedgerAccount" a
          LEFT JOIN "LedgerEntry" e ON e."accountId" = a.id
          GROUP BY a.id, a.code, a.type, a."balanceMinor"
        ) t
        WHERE t."balanceMinor" <> t."computedBalanceMinor"
        ORDER BY t.code ASC
      `,
      prisma.platformOperatingAccount.findUnique({ where: { id: "singleton" } }),
      prisma.platformFeeCredit.aggregate({
        _sum: {
          feeFromFreelancerMinor: true,
          feeFromClientMinor: true,
          withholdingMinor: true,
        },
        _count: { id: true },
      }),
      prisma.$queryRaw<Array<{ netCredit: number }>>`
        SELECT COALESCE(SUM(e."creditMinor" - e."debitMinor"), 0)::int AS "netCredit"
        FROM "LedgerEntry" e
        JOIN "LedgerAccount" a ON a.id = e."accountId"
        WHERE a.code = '4000-REVENUE-PLATFORM-FEES'
      `,
      prisma.$queryRaw<Array<{ netCredit: number }>>`
        SELECT COALESCE(SUM(e."creditMinor" - e."debitMinor"), 0)::int AS "netCredit"
        FROM "LedgerEntry" e
        JOIN "LedgerAccount" a ON a.id = e."accountId"
        WHERE a.code = '2050-LIABILITY-WITHHOLDING-ERA'
      `,
      prisma.$queryRaw<Array<{ netCredit: number }>>`
        SELECT COALESCE(SUM(e."creditMinor" - e."debitMinor"), 0)::int AS "netCredit"
        FROM "LedgerEntry" e
        JOIN "LedgerAccount" a ON a.id = e."accountId"
        WHERE a.code = '2000-LIABILITY-ESCROW'
      `,
      prisma.milestone.aggregate({
        where: {
          NOT: { id: { startsWith: "seed-" } },
          escrowState: {
            in: ["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "ACCEPTED", "DISPUTED"],
          },
        },
        _sum: { amountMinor: true },
        _count: { id: true },
      }),
      prisma.milestone.aggregate({
        where: {
          id: { startsWith: "seed-" },
          escrowState: {
            in: ["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "ACCEPTED", "DISPUTED"],
          },
        },
        _sum: { amountMinor: true },
        _count: { id: true },
      }),
      prisma.gigOrder.aggregate({
        where: {
          NOT: { id: { startsWith: "seed-" } },
          escrowState: {
            in: ["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "ACCEPTED", "DISPUTED"],
          },
        },
        _sum: { totalChargeMinor: true },
        _count: { id: true },
      }),
      prisma.gigOrder.aggregate({
        where: {
          id: { startsWith: "seed-" },
          escrowState: {
            in: ["ESCROW_HELD", "WORK_IN_PROGRESS", "SUBMITTED_FOR_REVIEW", "ACCEPTED", "DISPUTED"],
          },
        },
        _sum: { totalChargeMinor: true },
        _count: { id: true },
      }),
    ]);

    const summaryTotals = totals[0];
    const unbalanced = violations.filter((r) => r.debits !== r.credits);
    const empty = violations.filter((r) => r.entryCount === 0);

    const poaFeeMinor = poa?.accumulatedFeeMinor ?? 0;
    const poaWhtMinor = poa?.accumulatedWithholdingMinor ?? 0;
    const fcFeeMinor =
      (feeCreditsAgg._sum.feeFromFreelancerMinor ?? 0) +
      (feeCreditsAgg._sum.feeFromClientMinor ?? 0);
    const fcWhtMinor = feeCreditsAgg._sum.withholdingMinor ?? 0;
    const gl4000FeeMinor = gl4000Row[0]?.netCredit ?? 0;
    const gl2050WhtMinor = gl2050Row[0]?.netCredit ?? 0;
    const gl2000EscrowMinor = gl2000Row[0]?.netCredit ?? 0;

    const feesAligned =
      poaFeeMinor === fcFeeMinor && fcFeeMinor === gl4000FeeMinor;
    const whtAligned =
      poaWhtMinor === fcWhtMinor && fcWhtMinor === gl2050WhtMinor;
    const poaReconciled = feesAligned && whtAligned;

    const activeMilestoneHoldCount = heldMilestonesActive._count.id;
    const activeMilestoneHoldMinor = heldMilestonesActive._sum.amountMinor ?? 0;
    const activeGigHoldCount = heldGigOrdersActive._count.id;
    const activeGigHoldMinor = heldGigOrdersActive._sum.totalChargeMinor ?? 0;
    const totalActiveHoldMinor = activeMilestoneHoldMinor + activeGigHoldMinor;
    const excludedSeedCount =
      heldMilestonesSeedExcluded._count.id + heldGigOrdersSeedExcluded._count.id;
    const excludedSeedMinor =
      (heldMilestonesSeedExcluded._sum.amountMinor ?? 0) +
      (heldGigOrdersSeedExcluded._sum.totalChargeMinor ?? 0);

    const warnings: string[] = [];
    if (empty.length > 0) {
      warnings.push(
        `${empty.length} empty LedgerJournal header(s) found with zero entries (pass --strict-empty to fail).`,
      );
    }
    if (isTestDb && accountDrift.length > 0) {
      warnings.push(
        `${accountDrift.length} cached LedgerAccount.balanceMinor drift(s) in _test DB (warning only on *_test).`,
      );
    }
    if (isTestDb && !poaReconciled) {
      warnings.push(
        `POA/PlatformFeeCredit/GL4000-2050 mismatch in _test DB (warning only on *_test).`,
      );
    }
    for (const w of warnings) {
      console.warn(`WARNING: ${w}`);
    }

    console.log(
      JSON.stringify(
        {
          database: dbName,
          isTestDb,
          journalsChecked: summaryTotals?.journalCount ?? 0,
          entriesChecked: summaryTotals?.entryCount ?? 0,
          totalDebitsMinor: summaryTotals?.totalDebits ?? "0",
          totalCreditsMinor: summaryTotals?.totalCredits ?? "0",
          unbalancedCount: unbalanced.length,
          emptyJournalCount: empty.length,
          strictEmpty,
          cachedBalanceDriftCount: accountDrift.length,
          cachedBalanceDriftSamples: accountDrift.slice(0, 20),
          revenueAndWithholding: {
            aligned: poaReconciled,
            feesAligned,
            whtAligned,
            poaFeeMinor,
            platformFeeCreditFeeMinor: fcFeeMinor,
            gl4000NetCreditMinor: gl4000FeeMinor,
            poaWithholdingMinor: poaWhtMinor,
            platformFeeCreditWhtMinor: fcWhtMinor,
            gl2050NetCreditMinor: gl2050WhtMinor,
          },
          escrowPoolReportOnly: {
            gl2000ComputedBalanceMinor: gl2000EscrowMinor,
            gl2000NonNegative: gl2000EscrowMinor >= 0,
            activeHoldsCount: activeMilestoneHoldCount + activeGigHoldCount,
            activeHoldsMinor: totalActiveHoldMinor,
            activeMilestoneHoldCount,
            activeMilestoneHoldMinor,
            activeGigHoldCount,
            activeGigHoldMinor,
            gl2000MinusActiveHoldsMinor: gl2000EscrowMinor - totalActiveHoldMinor,
            excludedSeedPrefixCount: excludedSeedCount,
            excludedSeedPrefixMinor: excludedSeedMinor,
          },
          warnings,
          unbalancedViolations: unbalanced.slice(0, 20),
          emptyJournalSamples: empty.slice(0, 10),
        },
        null,
        2,
      ),
    );

    const strictDevFail =
      !isTestDb && (accountDrift.length > 0 || !poaReconciled);
    if (
      unbalanced.length > 0 ||
      (strictEmpty && empty.length > 0) ||
      strictDevFail
    ) {
      process.exitCode = 1;
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("ledger:check failed:", err);
  process.exit(1);
});
