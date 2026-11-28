/**
 * Double-entry ledger balance verification script (`pnpm --filter backend ledger:check`).
 *
 * Inspects every LedgerJournal in the target database (`DATABASE_URL` from
 * process.env or `apps/backend/.env`) and exits non-zero if any journal is
 * unbalanced (`SUM(debitMinor) !== SUM(creditMinor)`) or has zero entries.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

interface BrokenJournalRow {
  id: string;
  referenceType: string;
  referenceId: string | null;
  idempotencyKey: string;
  entryCount: number;
  debits: string;
  credits: string;
}

async function main() {
  const prisma = new PrismaClient();
  try {
    const [totals] = await prisma.$queryRaw<
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
    `;

    const bad = await prisma.$queryRaw<BrokenJournalRow[]>`
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
    `;

    const unbalancedCount = bad.filter((r) => r.debits !== r.credits).length;
    const emptyJournalCount = bad.filter((r) => r.entryCount === 0).length;

    console.log(
      JSON.stringify(
        {
          journalsChecked: totals?.journalCount ?? 0,
          entriesChecked: totals?.entryCount ?? 0,
          totalDebitsMinor: totals?.totalDebits ?? "0",
          totalCreditsMinor: totals?.totalCredits ?? "0",
          unbalancedCount,
          emptyJournalCount,
          violations: bad.slice(0, 20),
        },
        null,
        2,
      ),
    );

    if (bad.length > 0) {
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
