-- TMS alignment with Master Design §11.4 (2026-08-26 unification) + Chapa removal (PAY-002)

-- New AML red-flag type: repeated exact round-figure payments
ALTER TYPE "TransactionFlagType" ADD VALUE IF NOT EXISTS 'ROUND_AMOUNTS';

-- STR SLA deadline, fixed at flag creation so breaches are measured against
-- the original detection clock. Backfill existing flags from createdAt.
ALTER TABLE "TransactionFlag" ADD COLUMN IF NOT EXISTS "strDeadlineAt" TIMESTAMP(3);
UPDATE "TransactionFlag" SET "strDeadlineAt" = "createdAt" + INTERVAL '24 hours' WHERE "strDeadlineAt" IS NULL;

-- PAY-002: Chapa removed from the approved payment architecture (Telebirr + CBE only).
-- Purge any rows referencing CHAPA so no new code path can ever resolve to one.
DELETE FROM "PaymentTransaction" WHERE "provider" = 'CHAPA';
DELETE FROM "WalletTopUp" WHERE "provider" = 'CHAPA';
--
-- NOTE: the 'CHAPA' enum value itself intentionally REMAINS in
-- "PaymentProvider". Dropping an enum value requires PostgreSQL 17+
-- (ALTER TYPE ... DROP VALUE); this database is PostgreSQL 16. The
-- application layer no longer accepts or emits 'CHAPA' anywhere
-- (@marketplace/schemas PaymentProvider enum, provider clients, webhook
-- route). When the database is next upgraded to PG 17+, finish the removal:
--   ALTER TYPE "PaymentProvider" DROP VALUE 'CHAPA';
