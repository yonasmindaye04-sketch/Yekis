CREATE TABLE "EscrowHold" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "placedByStaffId" TEXT NOT NULL,
    "reason" VARCHAR(1000) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "releasedByStaffId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "releaseReason" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowHold_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EscrowHold_milestoneId_active_idx" ON "EscrowHold"("milestoneId", "active");
CREATE INDEX "EscrowHold_active_createdAt_idx" ON "EscrowHold"("active", "createdAt");

ALTER TABLE "EscrowHold"
    ADD CONSTRAINT "EscrowHold_milestoneId_fkey"
    FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
