-- Add missing hot-path indexes identified in the production-readiness audit.
-- Prisma does not create FK indexes automatically on Postgres; these columns
-- back the most frequent lookups in the system.

CREATE INDEX "Job_clientId_idx" ON "Job"("clientId");

CREATE INDEX "Contract_clientId_idx" ON "Contract"("clientId");
CREATE INDEX "Contract_freelancerId_idx" ON "Contract"("freelancerId");
CREATE INDEX "Contract_status_idx" ON "Contract"("status");

CREATE INDEX "Dispute_milestoneId_idx" ON "Dispute"("milestoneId");
CREATE INDEX "Dispute_stage_idx" ON "Dispute"("stage");

CREATE INDEX "PaymentTransaction_provider_status_createdAt_idx"
  ON "PaymentTransaction"("provider", "status", "createdAt");

-- Cooling-off cancellation status (ECA Proclamation No. 1205/2020)
ALTER TYPE "ContractStatus" ADD VALUE 'CANCELLED';

-- Stop fabricating dates of birth for Telegram/guest-chat accounts (AML data
-- integrity); real DOB is captured at Tier-2 Fayda verification.
ALTER TABLE "User" ALTER COLUMN "dateOfBirth" DROP NOT NULL;
