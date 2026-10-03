-- Polymorphic dispute subject: gig orders can now share the Dispute machine
-- with contract milestones (see GIG_MODEL_PLAN.md open decision #1).
--
-- IDEMPOTENCY NOTE (2026-10-03)
-- This migration is written to be re-runnable. It previously assumed a virgin
-- `Dispute` table and failed with:
--     ERROR: column "gigOrderId" of relation "Dispute" already exists  (42701)
-- on any database that had been synchronised with `prisma db push` rather than
-- `migrate` — which is how at least one environment reached this state. Because
-- the column existed but the constraints below did not, those environments were
-- also silently missing:
--   * Dispute_gigOrderId_fkey  (referential integrity to GigOrder)
--   * Dispute_subject_check    (exactly one of contractId / gigOrderId)
--   * Dispute_gigOrderId_key   (one dispute per gig order)
-- The last one is declared `@unique` in schema.prisma but was never created by
-- ANY migration, so a database built purely from migrations would have allowed
-- several disputes against the same gig order — a real integrity gap on the
-- escrow/dispute money path, not just a bookkeeping mismatch.
--
-- Every statement below is therefore guarded. Running this against an already
-- migrated database is a no-op; running it against a `db push`-drifted one
-- converges it to the intended schema. Prefer `prisma migrate` over `db push`
-- going forward — see DATABASE.md "Known schema drift".

-- Make contract-scoped fields nullable (gig disputes carry gigOrderId instead).
-- DROP NOT NULL is naturally idempotent.
ALTER TABLE "Dispute" ALTER COLUMN "contractId" DROP NOT NULL;
ALTER TABLE "Dispute" ALTER COLUMN "milestoneId" DROP NOT NULL;

-- Drop the one-dispute-per-contract unique constraint — uniqueness is now
-- scoped per subject (one dispute per milestone / per gig order, enforced in
-- service code and by the partial check below).
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_contractId_key";

-- Gig order link. IF NOT EXISTS so a db push'd database does not abort.
ALTER TABLE "Dispute" ADD COLUMN IF NOT EXISTS "gigOrderId" TEXT;

-- One dispute per gig order. Prisma models `@unique` as a unique index, and the
-- index name must match what introspection expects.
CREATE UNIQUE INDEX IF NOT EXISTS "Dispute_gigOrderId_key" ON "Dispute"("gigOrderId");

-- FK to GigOrder. PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS, so guard it.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Dispute_gigOrderId_fkey'
      AND conrelid = '"Dispute"'::regclass
  ) THEN
    ALTER TABLE "Dispute"
      ADD CONSTRAINT "Dispute_gigOrderId_fkey"
      FOREIGN KEY ("gigOrderId") REFERENCES "GigOrder"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Integrity: every dispute must reference exactly one subject.
--
-- Deliberately NOT wrapped in a skip-if-violated guard. If existing rows violate
-- this (both subjects set, or neither), the deploy must fail loudly rather than
-- silently leave the money path unconstrained — resolve the offending rows
-- first, then re-run.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Dispute_subject_check'
      AND conrelid = '"Dispute"'::regclass
  ) THEN
    ALTER TABLE "Dispute"
      ADD CONSTRAINT "Dispute_subject_check"
      CHECK (
        ("contractId" IS NOT NULL AND "gigOrderId" IS NULL)
        OR ("contractId" IS NULL AND "gigOrderId" IS NOT NULL)
      );
  END IF;
END $$;

-- Gig disputes now surface a DISPUTED order status (parity with milestone escrowState)
ALTER TYPE "GigOrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

-- Indexes
CREATE INDEX IF NOT EXISTS "Dispute_contractId_idx" ON "Dispute"("contractId");
CREATE INDEX IF NOT EXISTS "Dispute_gigOrderId_idx" ON "Dispute"("gigOrderId");