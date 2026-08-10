CREATE UNIQUE INDEX "PaymentTransaction_one_pending_per_milestone"
ON "PaymentTransaction"("milestoneId")
WHERE "status" = 'PENDING';
