ALTER TABLE "KycRecord"
ADD COLUMN "periodicReviewPending" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "KycRecord_periodicReviewPending_idx"
ON "KycRecord"("periodicReviewPending");
