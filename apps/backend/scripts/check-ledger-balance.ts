/**
 * Double-entry ledger balance verification script (`pnpm --filter backend ledger:check`).
 *
 * Inspects every LedgerJournal in the target database (`DATABASE_URL` from
 * process.env or `apps/backend/.env`). Exits non-zero when `unbalancedCount > 0`
 * (`SUM(debitMinor) !== SUM(creditMinor)`). Reports zero-entry journals
 * (`emptyJournalCount`) as a warning by default, or fails with `--strict-empty`.
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
  const strictEmpty = process.argv.includes("--strict-empty");
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

    const violations = await prisma.$queryRaw<BrokenJournalRow[]>`
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

    const unbalanced = violations.filter((r) => r.debits !== r.credits);
    const empty = violations.filter((r) => r.entryCount === 0);
    const warning =
      empty.length > 0
        ? `${empty.length} empty LedgerJournal header(s) found with zero entries (pass --strict-empty to fail).`
        : null;

    if (warning) {
      console.warn(`WARNING: ${warning}`);
    }

    console.log(
      JSON.stringify(
        {
          journalsChecked: totals?.journalCount ?? 0,
          entriesChecked: totals?.entryCount ?? 0,
          totalDebitsMinor: totals?.totalDebits ?? "0",
          totalCreditsMinor: totals?.totalCredits ?? "0",
          unbalancedCount: unbalanced.length,
          emptyJournalCount: empty.length,
          strictEmpty,
          warning,
          unbalancedViolations: unbalanced.slice(0, 20),
          emptyJournalSamples: empty.slice(0, 10),
        },
        null,
        2,
      ),
    );

    if (unbalanced.length > 0 || (strictEmpty && empty.length > 0)) {
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
