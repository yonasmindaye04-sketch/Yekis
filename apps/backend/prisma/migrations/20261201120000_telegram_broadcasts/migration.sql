-- Telegram broadcast center: admin-composed announcements delivered through
-- the platform bot. Two tables: the broadcast itself (content + audience) and
-- one delivery row per recipient, so a partial send is attributable.

-- CreateEnum
CREATE TYPE "BroadcastAudience" AS ENUM ('ALL', 'CLIENTS', 'FREELANCERS', 'STAFF', 'KYC_VERIFIED');

-- CreateEnum
CREATE TYPE "BroadcastStatus" AS ENUM ('DRAFT', 'SENDING', 'SENT', 'PARTIAL', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BroadcastDeliveryStatus" AS ENUM ('SENT', 'FAILED');

-- CreateTable
CREATE TABLE "TelegramBroadcast" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "heading" VARCHAR(200),
    "body" TEXT NOT NULL,
    "imageUrl" VARCHAR(500),
    "linkUrl" VARCHAR(500),
    "linkLabel" VARCHAR(60),
    "audience" "BroadcastAudience" NOT NULL DEFAULT 'ALL',
    "status" "BroadcastStatus" NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "sentById" TEXT,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "deliveredCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TelegramBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBroadcastDelivery" (
    "id" TEXT NOT NULL,
    "broadcastId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "status" "BroadcastDeliveryStatus" NOT NULL,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramBroadcastDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelegramBroadcast_status_createdAt_idx" ON "TelegramBroadcast"("status", "createdAt");

-- CreateIndex
CREATE INDEX "TelegramBroadcast_createdById_idx" ON "TelegramBroadcast"("createdById");

-- CreateIndex
CREATE INDEX "TelegramBroadcastDelivery_broadcastId_status_idx" ON "TelegramBroadcastDelivery"("broadcastId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramBroadcastDelivery_broadcastId_userId_key" ON "TelegramBroadcastDelivery"("broadcastId", "userId");

-- AddForeignKey
ALTER TABLE "TelegramBroadcast" ADD CONSTRAINT "TelegramBroadcast_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBroadcast" ADD CONSTRAINT "TelegramBroadcast_sentById_fkey" FOREIGN KEY ("sentById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBroadcastDelivery" ADD CONSTRAINT "TelegramBroadcastDelivery_broadcastId_fkey" FOREIGN KEY ("broadcastId") REFERENCES "TelegramBroadcast"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TelegramBroadcastDelivery" ADD CONSTRAINT "TelegramBroadcastDelivery_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
