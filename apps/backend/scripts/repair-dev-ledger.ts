/**
 * Development/test ledger orphan & cached-balance repair utility
 * (`pnpm --filter backend ledger:repair-dev [--confirm]`).
 *
 * IMPORTANT: Production drift is fixed with adjusting journals, never deletes
 * or edits. This script refuses to run outside local `marketplace` or
 * `marketplace_test` databases or when `NODE_ENV=production`.
 *
 * Default mode is DRY RUN. Pass `--confirm` to apply changes in one transaction.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabaseTarget } from "./_dbGuard.js";

const ALLOWED_LOCAL_DBS = ["marketplace", "marketplace_test"] as const;

interface OrphanFeeCreditRow {
  id: string;
  milestoneId: string | null;
  gigOrderId: string | null;
  feeFromFreelancerMinor: number;
  feeFromClientMinor: number;
  withholdingMinor: number;
}

interface ClientFeeBackfillRow {
  feeCreditId: string;
  milestoneId: string;
  currentFeeFromClientMinor: number;
  journalClientFeeMinor: number;
}

interface OrphanUserAccountRow {
  id: string;
  code: string;
  balanceMinor: number;
}

interface DriftedAccountRow {
  id: string;
  code: string;
  type: string;
  cachedBalanceMinor: number;
  computedBalanceMinor: number;
}

async function main() {
  const confirm = process.argv.includes("--confirm");
  const target = assertLocalDatabaseTarget({
    allowedDbNames: ALLOWED_LOCAL_DBS,
    allowRemote: false,
    forbidProduction: true,
    scriptName: "ledger:repair-dev",
  });

  const prisma = new PrismaClient();
  try {
    const [dbCheck] = await prisma.$queryRaw<Array<{ db: string }>>`
      SELECT current_database() AS db
    `;
    if (
      !dbCheck ||
      !(ALLOWED_LOCAL_DBS as readonly string[]).includes(dbCheck.db)
    ) {
      throw new Error(
        `Refusing to run ledger:repair-dev: server reported database "${dbCheck?.db ?? "unknown"}"`,
      );
    }

    const orphanFeeCredits = await prisma.$queryRaw<OrphanFeeCreditRow[]>`
      SELECT
        fc.id,
        fc."milestoneId",
        fc."gigOrderId",
        fc."feeFromFreelancerMinor",
        fc."feeFromClientMinor",
        fc."withholdingMinor"
      FROM "PlatformFeeCredit" fc
      WHERE NOT EXISTS (
        SELECT 1
        FROM "LedgerJournal" j
        WHERE j."referenceId" = COALESCE(fc."milestoneId", fc."gigOrderId")
      )
      ORDER BY fc."createdAt" ASC
    `;

    // Generic client-fee backfill: for any surviving milestone PlatformFeeCredit
    // whose ESCROW_FUND journal credited 4000-REVENUE-PLATFORM-FEES with a different
    // client-side fee than PlatformFeeCredit.feeFromClientMinor, align it with
    // the posted journal amount so PlatformFeeCredit == POA == GL 4000.
    const clientFeeBackfills = await prisma.$queryRaw<ClientFeeBackfillRow[]>`
      SELECT
        fc.id AS "feeCreditId",
        fc."milestoneId" AS "milestoneId",
        fc."feeFromClientMinor" AS "currentFeeFromClientMinor",
        COALESCE(SUM(e."creditMinor" - e."debitMinor"), 0)::int AS "journalClientFeeMinor"
      FROM "PlatformFeeCredit" fc
      JOIN "LedgerJournal" j
        ON j."referenceType" = 'ESCROW_FUND'
       AND j."referenceId" = fc."milestoneId"
      JOIN "LedgerEntry" e ON e."journalId" = j.id
      JOIN "LedgerAccount" a ON a.id = e."accountId"
      WHERE fc."milestoneId" IS NOT NULL
        AND a.code = '4000-REVENUE-PLATFORM-FEES'
        AND EXISTS (
          SELECT 1
          FROM "LedgerJournal" j2
          WHERE j2."referenceId" = fc."milestoneId"
        )
      GROUP BY fc.id, fc."milestoneId", fc."feeFromClientMinor"
      HAVING fc."feeFromClientMinor" <> COALESCE(SUM(e."creditMinor" - e."debitMinor"), 0)::int
      ORDER BY fc."milestoneId" ASC
    `;

    const orphanUserAccounts = await prisma.$queryRaw<OrphanUserAccountRow[]>`
      SELECT a.id, a.code, a."balanceMinor"
      FROM "LedgerAccount" a
      WHERE a.code LIKE '2100-USER-%'
        AND NOT EXISTS (SELECT 1 FROM "LedgerEntry" e WHERE e."accountId" = a.id)
        AND NOT EXISTS (
          SELECT 1 FROM "User" u WHERE a.code = '2100-USER-' || u.id
        )
      ORDER BY a.code ASC
    `;

    const driftedAccounts = await prisma.$queryRaw<DriftedAccountRow[]>`
      SELECT
        t.id,
        t.code,
        t.type,
        t."balanceMinor" AS "cachedBalanceMinor",
        t."computedBalanceMinor"
      FROM (
        SELECT
          a.id,
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
    `;

    const [poaBefore, fcAllBefore, gl4000, gl2050] = await Promise.all([
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
    ]);

    const orphanFeeSum = orphanFeeCredits.reduce(
      (s, r) => s + r.feeFromFreelancerMinor + r.feeFromClientMinor,
      0,
    );
    const orphanWhtSum = orphanFeeCredits.reduce(
      (s, r) => s + r.withholdingMinor,
      0,
    );
    const backfillDeltaSum = clientFeeBackfills.reduce(
      (s, r) => s + (r.journalClientFeeMinor - r.currentFeeFromClientMinor),
      0,
    );

    const fcBeforeFee =
      (fcAllBefore._sum.feeFromFreelancerMinor ?? 0) +
      (fcAllBefore._sum.feeFromClientMinor ?? 0);
    const fcBeforeWht = fcAllBefore._sum.withholdingMinor ?? 0;

    const fcAfterFee = fcBeforeFee - orphanFeeSum + backfillDeltaSum;
    const fcAfterWht = fcBeforeWht - orphanWhtSum;
    const gl4000Net = gl4000[0]?.netCredit ?? 0;
    const gl2050Net = gl2050[0]?.netCredit ?? 0;

    const orphanUserAccountIds = new Set(orphanUserAccounts.map((a) => a.id));
    const remainingDriftedAccounts = driftedAccounts.filter(
      (a) => !orphanUserAccountIds.has(a.id),
    );

    const report = {
      mode: confirm ? "APPLY" : "DRY_RUN",
      database: dbCheck.db,
      host: target.host,
      orphanFeeCredits: {
        count: orphanFeeCredits.length,
        feeSumMinor: orphanFeeSum,
        whtSumMinor: orphanWhtSum,
        sampleIds: orphanFeeCredits.slice(0, 10).map((r) => ({
          id: r.id,
          ref: r.milestoneId ?? r.gigOrderId,
          feeMinor: r.feeFromFreelancerMinor + r.feeFromClientMinor,
          whtMinor: r.withholdingMinor,
        })),
      },
      clientFeeBackfills: {
        count: clientFeeBackfills.length,
        deltaSumMinor: backfillDeltaSum,
        rows: clientFeeBackfills,
      },
      orphanUserAccounts: {
        count: orphanUserAccounts.length,
        sampleCodes: orphanUserAccounts.slice(0, 10).map((a) => ({
          code: a.code,
          cachedBalanceMinor: a.balanceMinor,
        })),
      },
      driftedAccounts: {
        totalBefore: driftedAccounts.length,
        toDeleteAsOrphanUsers: orphanUserAccounts.length,
        toRecomputeInPlace: remainingDriftedAccounts.length,
        samplesToRecompute: remainingDriftedAccounts.slice(0, 20),
      },
      reconciliation: {
        before: {
          poaFeeMinor: poaBefore?.accumulatedFeeMinor ?? 0,
          poaWithholdingMinor: poaBefore?.accumulatedWithholdingMinor ?? 0,
          platformFeeCreditCount: fcAllBefore._count.id,
          platformFeeCreditFeeMinor: fcBeforeFee,
          platformFeeCreditWhtMinor: fcBeforeWht,
          gl4000NetCreditMinor: gl4000Net,
          gl2050NetCreditMinor: gl2050Net,
        },
        after: {
          poaFeeMinor: fcAfterFee,
          poaWithholdingMinor: fcAfterWht,
          platformFeeCreditCount: fcAllBefore._count.id - orphanFeeCredits.length,
          platformFeeCreditFeeMinor: fcAfterFee,
          platformFeeCreditWhtMinor: fcAfterWht,
          gl4000NetCreditMinor: gl4000Net,
          gl2050NetCreditMinor: gl2050Net,
          gl4000MinusRemainingFeeCreditsMinor: gl4000Net - fcAfterFee,
        },
      },
    };

    console.log(JSON.stringify(report, null, 2));

    if (!confirm) {
      console.log("\nDRY RUN only — nothing modified. Re-run with --confirm to apply.");
      return;
    }

    await prisma.$transaction(async (tx) => {
      if (orphanFeeCredits.length > 0) {
        await tx.platformFeeCredit.deleteMany({
          where: { id: { in: orphanFeeCredits.map((r) => r.id) } },
        });
      }

      for (const row of clientFeeBackfills) {
        await tx.platformFeeCredit.update({
          where: { id: row.feeCreditId },
          data: { feeFromClientMinor: row.journalClientFeeMinor },
        });
      }

      if (orphanUserAccounts.length > 0) {
        await tx.ledgerAccount.deleteMany({
          where: { id: { in: orphanUserAccounts.map((a) => a.id) } },
        });
      }

      for (const acc of remainingDriftedAccounts) {
        await tx.ledgerAccount.update({
          where: { id: acc.id },
          data: { balanceMinor: acc.computedBalanceMinor },
        });
      }

      const remainingAgg = await tx.platformFeeCredit.aggregate({
        _sum: {
          feeFromFreelancerMinor: true,
          feeFromClientMinor: true,
          withholdingMinor: true,
        },
      });
      const totalFee =
        (remainingAgg._sum.feeFromFreelancerMinor ?? 0) +
        (remainingAgg._sum.feeFromClientMinor ?? 0);
      const totalWht = remainingAgg._sum.withholdingMinor ?? 0;

      await tx.platformOperatingAccount.upsert({
        where: { id: "singleton" },
        create: {
          id: "singleton",
          accumulatedFeeMinor: totalFee,
          accumulatedWithholdingMinor: totalWht,
        },
        update: {
          accumulatedFeeMinor: totalFee,
          accumulatedWithholdingMinor: totalWht,
        },
      });
    });

    console.log("\nAPPLIED ledger repair transaction successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("ledger:repair-dev failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
