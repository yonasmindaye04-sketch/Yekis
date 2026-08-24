-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'TERMINATED');

-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'PROPOSERS', 'PRIVATE');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('DEVELOPMENT', 'DESIGN', 'MARKETING', 'WRITING', 'TRANSLATION', 'DATA_ENTRY', 'VIDEO_AUDIO', 'BUSINESS', 'ENGINEERING', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewDisputeResolution" AS ENUM ('REVIEW_REMOVED', 'REVIEW_EDITED', 'NO_ACTION');

-- CreateEnum
CREATE TYPE "FeaturedReason" AS ENUM ('TOP_RATED', 'RECENTLY_VERIFIED', 'STAFF_PINNED', 'CATEGORY_BALANCING', 'COLD_START');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('FAKE_IDENTITY', 'OFFENSIVE_CONTENT', 'OFF_PLATFORM_CONTACT', 'MISLEADING_SKILLS', 'SPAM', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'RESOLVED_NO_ACTION', 'RESOLVED_PROFILE_HIDDEN', 'RESOLVED_PROFILE_BANNED');

-- CreateEnum
CREATE TYPE "TopUpStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- AlterEnum
ALTER TYPE "ProposalStatus" ADD VALUE 'COUNTER_OFFERED';

-- AlterEnum
ALTER TYPE "TransactionFlagType" ADD VALUE 'STAFF_FLAGGED';
ALTER TYPE "TransactionFlagType" ADD VALUE 'VAT_THRESHOLD_REACHED';

-- DropForeignKey
ALTER TABLE "Dispute" DROP CONSTRAINT "Dispute_milestoneId_fkey";

-- DropForeignKey
ALTER TABLE "PasswordResetToken" DROP CONSTRAINT "PasswordResetToken_userId_fkey";

-- DropForeignKey
ALTER TABLE "TopUpRequest" DROP CONSTRAINT "TopUpRequest_userId_fkey";

-- DropIndex
DROP INDEX "Dispute_milestoneId_key";

-- DropIndex
DROP INDEX "KycRecord_periodicReviewPending_idx";

-- DropIndex
DROP INDEX "User_telegramChatId_key";

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "cancellableUntil" TIMESTAMP(3),
ADD COLUMN     "status" "ContractStatus" NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "assignedAt" TIMESTAMP(3),
ADD COLUMN     "assignedMediatorStaffId" TEXT,
ADD COLUMN     "awardReferenceNumber" TEXT,
ADD COLUMN     "withdrawalConfirmedAt" TIMESTAMP(3),
ADD COLUMN     "withdrawalProposedFreelancerShareMinor" INTEGER,
ADD COLUMN     "withdrawalProposedOutcome" "DisputeResolutionOutcome",
ADD COLUMN     "withdrawalRequestedByUserId" TEXT;

-- AlterTable
ALTER TABLE "Job" ADD COLUMN     "screeningQuestions" JSONB;

-- AlterTable
ALTER TABLE "KycRecord" ADD COLUMN     "documentNumber" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "highestVerifiedTier" "KycTier";

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "deliverableUrl" TEXT;

-- AlterTable
ALTER TABLE "Proposal" ADD COLUMN     "attachmentPaths" TEXT[],
ADD COLUMN     "screeningAnswers" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "avatarCdnUrls" JSONB,
ADD COLUMN     "avatarUrl" VARCHAR(500),
ADD COLUMN     "bio" VARCHAR(2000),
ADD COLUMN     "cachedKycStatus" "KycStatus" DEFAULT 'PENDING',
ADD COLUMN     "cachedKycTier" "KycTier",
ADD COLUMN     "displayName" VARCHAR(100),
ADD COLUMN     "firstName" VARCHAR(50) NOT NULL DEFAULT '',
ADD COLUMN     "isAvailableForWork" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "lastFeaturedAt" TIMESTAMP(3),
ADD COLUMN     "lastName" VARCHAR(50) NOT NULL DEFAULT '',
ADD COLUMN     "primarySkillId" VARCHAR(50),
ADD COLUMN     "profileCompleteness" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "profileViewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "profileVisibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
ADD COLUMN     "ratingAverage" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "ratingBayesianScore" DOUBLE PRECISION DEFAULT 0,
ADD COLUMN     "ratingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "telegramUserId" BIGINT,
ADD COLUMN     "timezone" VARCHAR(60) NOT NULL DEFAULT 'Africa/Addis_Ababa',
ADD COLUMN     "totalEarnedNetMinor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalJobsCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalJobsPosted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSpentGrossMinor" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "PasswordResetToken";

-- DropTable
DROP TABLE "TopUpRequest";

-- CreateTable
CREATE TABLE "KycReviewEvent" (
    "id" TEXT NOT NULL,
    "kycRecordId" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "decision" "KycStatus" NOT NULL,
    "tierAtDecision" "KycTier" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KycReviewEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTopUp" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "receiptImagePath" TEXT NOT NULL,
    "status" "TopUpStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByStaffId" TEXT,
    "rejectionReason" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" VARCHAR(50) NOT NULL,
    "nameEn" VARCHAR(100) NOT NULL,
    "nameAm" VARCHAR(100) NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSkill" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(2000),
    "isBlind" BOOLEAN NOT NULL DEFAULT true,
    "revealedAt" TIMESTAMP(3),
    "response" VARCHAR(1000),
    "respondedAt" TIMESTAMP(3),
    "isDisputed" BOOLEAN NOT NULL DEFAULT false,
    "disputeReason" VARCHAR(500),
    "disputeResolvedAt" TIMESTAMP(3),
    "disputeResolution" "ReviewDisputeResolution",
    "disputedByStaffId" TEXT,
    "isEligible" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "thumbnailUrl" VARCHAR(500),
    "projectUrl" VARCHAR(500),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortfolioItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeaturedLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "featuredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" "FeaturedReason" NOT NULL,
    "category" "SkillCategory" NOT NULL,
    "pinnedByStaffId" TEXT,
    "notes" VARCHAR(500),

    CONSTRAINT "FeaturedLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reportedUserId" TEXT NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByStaffId" TEXT,
    "staffNotes" VARCHAR(1000),
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProfileReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileView" (
    "id" TEXT NOT NULL,
    "viewerId" TEXT,
    "targetUserId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(50),

    CONSTRAINT "ProfileView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterOffer" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "proposedByClientId" TEXT NOT NULL,
    "revisedAmountMinor" INTEGER NOT NULL,
    "revisedEstimatedDays" INTEGER NOT NULL,
    "revisedMilestones" JSONB NOT NULL,
    "message" VARCHAR(1000) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectThread" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "freelancerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectMessage" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformOperatingAccount" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "accumulatedFeeMinor" INTEGER NOT NULL DEFAULT 0,
    "accumulatedWithholdingMinor" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformOperatingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformFeeCredit" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "feeFromFreelancerMinor" INTEGER NOT NULL,
    "feeFromClientMinor" INTEGER NOT NULL,
    "withholdingMinor" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformFeeCredit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WithholdingRemittanceReport" (
    "id" TEXT NOT NULL,
    "periodMonth" VARCHAR(7) NOT NULL,
    "totalWithholdingMinor" INTEGER NOT NULL,
    "transactionCount" INTEGER NOT NULL,
    "filedAt" TIMESTAMP(3),
    "filedByStaffId" TEXT,
    "eraReferenceNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WithholdingRemittanceReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KycReviewEvent_kycRecordId_idx" ON "KycReviewEvent"("kycRecordId");

-- CreateIndex
CREATE INDEX "WalletTopUp_status_idx" ON "WalletTopUp"("status");

-- CreateIndex
CREATE INDEX "WalletTopUp_userId_idx" ON "WalletTopUp"("userId");

-- CreateIndex
CREATE INDEX "UserSkill_userId_idx" ON "UserSkill"("userId");

-- CreateIndex
CREATE INDEX "UserSkill_skillId_idx" ON "UserSkill"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSkill_userId_skillId_key" ON "UserSkill"("userId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "Review_contractId_key" ON "Review"("contractId");

-- CreateIndex
CREATE INDEX "Review_targetUserId_isEligible_revealedAt_idx" ON "Review"("targetUserId", "isEligible", "revealedAt");

-- CreateIndex
CREATE INDEX "Review_authorId_idx" ON "Review"("authorId");

-- CreateIndex
CREATE INDEX "Review_contractId_idx" ON "Review"("contractId");

-- CreateIndex
CREATE INDEX "PortfolioItem_userId_isActive_idx" ON "PortfolioItem"("userId", "isActive");

-- CreateIndex
CREATE INDEX "FeaturedLog_userId_featuredAt_idx" ON "FeaturedLog"("userId", "featuredAt");

-- CreateIndex
CREATE INDEX "FeaturedLog_featuredAt_idx" ON "FeaturedLog"("featuredAt");

-- CreateIndex
CREATE INDEX "ProfileReport_reportedUserId_idx" ON "ProfileReport"("reportedUserId");

-- CreateIndex
CREATE INDEX "ProfileReport_status_idx" ON "ProfileReport"("status");

-- CreateIndex
CREATE INDEX "ProfileView_targetUserId_viewedAt_idx" ON "ProfileView"("targetUserId", "viewedAt");

-- CreateIndex
CREATE INDEX "ProfileView_viewedAt_idx" ON "ProfileView"("viewedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CounterOffer_proposalId_key" ON "CounterOffer"("proposalId");

-- CreateIndex
CREATE INDEX "CounterOffer_proposalId_idx" ON "CounterOffer"("proposalId");

-- CreateIndex
CREATE INDEX "DirectThread_clientId_idx" ON "DirectThread"("clientId");

-- CreateIndex
CREATE INDEX "DirectThread_freelancerId_idx" ON "DirectThread"("freelancerId");

-- CreateIndex
CREATE UNIQUE INDEX "DirectThread_jobId_clientId_freelancerId_key" ON "DirectThread"("jobId", "clientId", "freelancerId");

-- CreateIndex
CREATE INDEX "DirectMessage_threadId_createdAt_idx" ON "DirectMessage"("threadId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderId_idx" ON "DirectMessage"("senderId");

-- CreateIndex
CREATE INDEX "PlatformFeeCredit_milestoneId_idx" ON "PlatformFeeCredit"("milestoneId");

-- CreateIndex
CREATE INDEX "PlatformFeeCredit_createdAt_idx" ON "PlatformFeeCredit"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WithholdingRemittanceReport_periodMonth_key" ON "WithholdingRemittanceReport"("periodMonth");

-- CreateIndex
CREATE INDEX "WithholdingRemittanceReport_periodMonth_idx" ON "WithholdingRemittanceReport"("periodMonth");

-- CreateIndex
CREATE UNIQUE INDEX "Dispute_contractId_key" ON "Dispute"("contractId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramUserId_key" ON "User"("telegramUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_primarySkillId_fkey" FOREIGN KEY ("primarySkillId") REFERENCES "Skill"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KycReviewEvent" ADD CONSTRAINT "KycReviewEvent_kycRecordId_fkey" FOREIGN KEY ("kycRecordId") REFERENCES "KycRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTopUp" ADD CONSTRAINT "WalletTopUp_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSkill" ADD CONSTRAINT "UserSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioItem" ADD CONSTRAINT "PortfolioItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeaturedLog" ADD CONSTRAINT "FeaturedLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileReport" ADD CONSTRAINT "ProfileReport_reportedUserId_fkey" FOREIGN KEY ("reportedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterOffer" ADD CONSTRAINT "CounterOffer_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "Proposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectThread" ADD CONSTRAINT "DirectThread_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectThread" ADD CONSTRAINT "DirectThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectThread" ADD CONSTRAINT "DirectThread_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "DirectThread"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
