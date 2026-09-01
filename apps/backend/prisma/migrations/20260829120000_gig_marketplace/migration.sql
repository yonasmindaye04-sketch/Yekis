-- CreateEnum
CREATE TYPE "GigStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'REJECTED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "GigPackageTier" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM');

-- CreateEnum
CREATE TYPE "GigOrderStatus" AS ENUM ('PENDING_PAYMENT', 'ESCROW_HELD', 'WORK_IN_PROGRESS', 'SUBMITTED_FOR_REVIEW', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "GigRevisionStatus" AS ENUM ('NONE', 'REQUESTED', 'SUBMITTED');

-- AlterTable
ALTER TABLE "PlatformFeeCredit" ADD COLUMN     "gigOrderId" TEXT,
ALTER COLUMN "milestoneId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Gig" (
    "id" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "LaunchCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "faqJson" JSONB,
    "requirements" JSONB NOT NULL,
    "thumbnailUrl" TEXT,
    "mediaUrls" JSONB NOT NULL,
    "status" "GigStatus" NOT NULL DEFAULT 'DRAFT',
    "autoAcceptOrders" BOOLEAN NOT NULL DEFAULT true,
    "maxRevisions" INTEGER NOT NULL DEFAULT 2,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GigPackage" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "tier" "GigPackageTier" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deliveryDays" INTEGER NOT NULL,
    "revisionsIncluded" INTEGER NOT NULL DEFAULT 1,
    "priceMinor" INTEGER NOT NULL,
    "addOns" JSONB,

    CONSTRAINT "GigPackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GigOrder" (
    "id" TEXT NOT NULL,
    "gigId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requirementsAnswer" JSONB,
    "status" "GigOrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "escrowState" "EscrowState" NOT NULL DEFAULT 'PAYMENT_PENDING',
    "submittedAt" TIMESTAMP(3),
    "deliverableUrl" TEXT,
    "deliverableHash" TEXT,
    "autoReleaseAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "revisionStatus" "GigRevisionStatus" NOT NULL DEFAULT 'NONE',
    "revisionRequestNote" TEXT,
    "revisionsUsed" INTEGER NOT NULL DEFAULT 0,
    "totalChargeMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GigOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GigReview" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "categoryRatings" JSONB NOT NULL,
    "comment" TEXT,
    "isBlind" BOOLEAN NOT NULL DEFAULT true,
    "revealedAt" TIMESTAMP(3),
    "response" TEXT,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GigReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Gig_freelancerId_status_idx" ON "Gig"("freelancerId", "status");

-- CreateIndex
CREATE INDEX "Gig_category_status_idx" ON "Gig"("category", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GigPackage_gigId_tier_key" ON "GigPackage"("gigId", "tier");

-- CreateIndex
CREATE INDEX "GigOrder_gigId_status_idx" ON "GigOrder"("gigId", "status");

-- CreateIndex
CREATE INDEX "GigOrder_clientId_status_idx" ON "GigOrder"("clientId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "GigReview_orderId_key" ON "GigReview"("orderId");

-- CreateIndex
CREATE INDEX "GigReview_targetUserId_idx" ON "GigReview"("targetUserId");

-- CreateIndex
CREATE INDEX "PlatformFeeCredit_gigOrderId_idx" ON "PlatformFeeCredit"("gigOrderId");

-- AddForeignKey
ALTER TABLE "Gig" ADD CONSTRAINT "Gig_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigPackage" ADD CONSTRAINT "GigPackage_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigOrder" ADD CONSTRAINT "GigOrder_gigId_fkey" FOREIGN KEY ("gigId") REFERENCES "Gig"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigOrder" ADD CONSTRAINT "GigOrder_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "GigPackage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigOrder" ADD CONSTRAINT "GigOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigReview" ADD CONSTRAINT "GigReview_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "GigOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigReview" ADD CONSTRAINT "GigReview_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GigReview" ADD CONSTRAINT "GigReview_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;