-- Polymorphic dispute subject: gig orders can now share the Dispute machine
-- with contract milestones (see GIG_MODEL_PLAN.md open decision #1).

-- Make contract-scoped fields nullable (gig disputes carry gigOrderId instead)
ALTER TABLE "Dispute" ALTER COLUMN "contractId" DROP NOT NULL;
ALTER TABLE "Dispute" ALTER COLUMN "milestoneId" DROP NOT NULL;

-- Drop the one-dispute-per-contract unique constraint — uniqueness is now
-- scoped per subject (one dispute per milestone / per gig order, enforced in
-- service code and by the partial check below).
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_contractId_key";

-- Gig order link
ALTER TABLE "Dispute" ADD COLUMN "gigOrderId" TEXT;
ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_gigOrderId_fkey"
  FOREIGN KEY ("gigOrderId") REFERENCES "GigOrder"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Integrity: every dispute must reference exactly one subject
ALTER TABLE "Dispute"
  ADD CONSTRAINT "Dispute_subject_check"
  CHECK (
    ("contractId" IS NOT NULL AND "gigOrderId" IS NULL)
    OR ("contractId" IS NULL AND "gigOrderId" IS NOT NULL)
  );

-- Gig disputes now surface a DISPUTED order status (parity with milestone escrowState)
ALTER TYPE "GigOrderStatus" ADD VALUE IF NOT EXISTS 'DISPUTED';

-- Indexes
CREATE INDEX IF NOT EXISTS "Dispute_contractId_idx" ON "Dispute"("contractId");
CREATE INDEX IF NOT EXISTS "Dispute_gigOrderId_idx" ON "Dispute"("gigOrderId");