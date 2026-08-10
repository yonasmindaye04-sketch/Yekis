-- CreateEnum
CREATE TYPE "TransactionFlagType" AS ENUM ('STRUCTURING', 'VELOCITY', 'PASS_THROUGH', 'WALLET_MISMATCH');

-- CreateEnum
CREATE TYPE "TransactionFlagStatus" AS ENUM ('PENDING_REVIEW', 'STR_FILED', 'DISMISSED');

-- CreateTable
CREATE TABLE "TransactionFlag" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "TransactionFlagType" NOT NULL,
    "status" "TransactionFlagStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "details" JSONB NOT NULL,
    "relatedEntityId" TEXT,
    "reviewedByStaffId" TEXT,
    "reviewNotes" TEXT,
    "strFiledAt" TIMESTAMP(3),
    "strReferenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransactionFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransactionFlag_status_idx" ON "TransactionFlag"("status");

-- CreateIndex
CREATE INDEX "TransactionFlag_userId_idx" ON "TransactionFlag"("userId");

-- AddForeignKey
ALTER TABLE "TransactionFlag" ADD CONSTRAINT "TransactionFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
