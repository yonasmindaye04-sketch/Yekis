DROP INDEX IF EXISTS "Dispute_contractId_key";

CREATE UNIQUE INDEX "Dispute_milestoneId_key" ON "Dispute"("milestoneId");

ALTER TABLE "Dispute"
ADD CONSTRAINT "Dispute_milestoneId_fkey"
FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "Dispute_contractId_idx" ON "Dispute"("contractId");
