-- Ledger and payout integrity constraints.
--
-- WHY THIS MIGRATION EXISTS
-- pg_dump --schema-only comparison of the dev and test databases (Batch 0.6,
-- item A.1) showed the ledger tables are identical on both - which is the
-- problem. 20261008120000 reconciled them from schema.prisma, but schema.prisma
-- cannot express a CHECK constraint, so it copied only the indexes.
--
-- The result on BOTH databases:
--   * nothing forced a journal to balance, so a double-entry ledger could post
--     a journal whose debits do not equal its credits and nothing would object;
--   * nothing forbade a negative account or entry amount;
--   * the unique idempotencyKey index existed but only as an index, so a
--     duplicate was rejected by the index rather than being an explicit,
--     named invariant.
--
-- These constraints move those invariants into the database, where no
-- application bug, queue worker or manual psql session can bypass them.
--
-- SAFETY ON AN EXISTING DATABASE (dev)
-- Adding a constraint to a populated table takes an ACCESS EXCLUSIVE lock and
-- validates every existing row. Data conditions that would make this fail:
--
--   1. An existing LedgerJournal whose entry debits != entry credits. Any such
--      journal fails the balanced constraint and aborts the whole migration.
--   2. An existing LedgerEntry with a negative debitMinor or creditMinor.
--   3. An existing LedgerAccount with a negative balanceMinor.
--   4. An existing LedgerEntry with both debitMinor and creditMinor = 0 (a
--      no-op line), or with both non-zero (a single line that both debits and
--      credits the same account).
--   5. A duplicate LedgerJournal.idempotencyKey - only if the unique index does
--      not already exist; it does, so this cannot fail here.
--
-- No statement DELETEs or UPDATEs a row. If any of the above exists the
-- migration fails loudly and nothing changes. That is deliberate: silently
-- rewriting ledger history to satisfy a new invariant is exactly the wrong
-- outcome for an accounting table.
--
-- To find offending rows before applying, run scripts/check-ledger-invariants.sql.

-- ---------- Balanced journals: NOT enforced here. ----------
-- A journal's debits must equal its credits, and a CHECK cannot reference other
-- rows, so it needs a trigger. Both trigger designs were implemented and
-- measured on this database, and neither is safe to ship as-is:
--
-- (a) AFTER INSERT ... FOR EACH ROW, NOT deferred. Validates the running total
--     after every line, so a correctly balanced journal is REJECTED midway
--     through being written. postJournalEntry inserts its lines one
--     create() at a time inside a transaction, so every legitimate multi-line
--     posting would fail.
--
-- (b) AFTER INSERT ... FOR EACH ROW, DEFERRABLE INITIALLY DEFERRED. Works under
--     `prisma.$transaction([...])` and under psql BEGIN/COMMIT, but does NOT
--     fire under `prisma.$transaction(async (tx) => ...)` -- which is the form
--     the ledger service uses. Measured: an unbalanced journal committed
--     silently through that path.
--
-- A guard that fires on some paths and not the one that matters is worse than
-- no guard, so nothing is added. Enforcing this safely needs the posting path
-- to insert a journal's lines in ONE multi-row statement, which then allows a
-- statement-level AFTER INSERT trigger to see the whole balanced set. That is a
-- change to ledger.service.ts, not a migration, and it is left for a batch that
-- can also add the regression tests for it.
--
-- What IS enforced below is row-local and therefore safe today.

-- ---------- Per-entry sanity ----------
-- One line must move value in exactly one direction, and never negatively.
-- A CHECK is enough here: it is row-local.
ALTER TABLE "LedgerEntry" DROP CONSTRAINT IF EXISTS "LedgerEntry_amounts_check";
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_amounts_check"
  CHECK (
    "debitMinor"  >= 0
    AND "creditMinor" >= 0
    AND NOT ("debitMinor" > 0 AND "creditMinor" > 0)
    AND ("debitMinor" > 0 OR "creditMinor" > 0)
  );

-- ---------- Account sign convention ----------
-- NOT "balanceMinor >= 0". That was tried and correctly rejected by Postgres
-- on both databases, because it is the wrong invariant for this chart of
-- accounts.
--
-- LIABILITY and EQUITY accounts carry a CREDIT balance. Every real escrow
-- liability ("2000-LIABILITY-ESCROW" and one per user) is negative by design,
-- so a blanket non-negative check contradicts the ledger's own data:
--   dev: 81 of 272 accounts are negative, all type=LIABILITY,
--        range -7,925,000 to -99,500.
--
-- The real risk is an ASSET going negative, because that is money the
-- platform claims to hold and cannot cover. So the constraint is scoped to the
-- debit-normal account types, which is where an overdraft would be a bug.
ALTER TABLE "LedgerAccount" DROP CONSTRAINT IF EXISTS "LedgerAccount_balance_check";
ALTER TABLE "LedgerAccount" ADD CONSTRAINT "LedgerAccount_balance_check"
  CHECK ("type" NOT IN ('ASSET', 'EXPENSE') OR "balanceMinor" >= 0);

-- ---------- Payout sanity ----------
-- A payout cannot be for a non-positive amount, and its net payout plus fee
-- must equal the gross amount attempted.
ALTER TABLE "PayoutTransaction" DROP CONSTRAINT IF EXISTS "PayoutTransaction_amounts_check";
ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_amounts_check"
  CHECK (
    "amountMinor"    > 0
    AND "netAmountMinor" > 0
    AND "feeMinor"     >= 0
    AND "amountMinor" = "netAmountMinor" + "feeMinor"
  );

-- ---------- Idempotency: promote the index to a named constraint ----------
-- The unique index already enforces this. Declaring it as a constraint makes
-- the invariant explicit and lets a future migration drop it by name.
ALTER TABLE "LedgerJournal" DROP CONSTRAINT IF EXISTS "LedgerJournal_idempotencyKey_unique";
ALTER TABLE "LedgerJournal" ADD CONSTRAINT "LedgerJournal_idempotencyKey_unique"
  UNIQUE ("idempotencyKey");