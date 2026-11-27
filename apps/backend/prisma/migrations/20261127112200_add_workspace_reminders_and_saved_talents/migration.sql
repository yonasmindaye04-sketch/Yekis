-- CreateTable
CREATE TABLE "WorkspaceReminder" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "note" VARCHAR(500),
    "contractId" TEXT,
    "milestoneId" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceReminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedTalent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "talentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedTalent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkspaceReminder_userId_dueAt_idx" ON "WorkspaceReminder"("userId", "dueAt");

-- CreateIndex
CREATE INDEX "SavedTalent_userId_idx" ON "SavedTalent"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedTalent_userId_talentId_key" ON "SavedTalent"("userId", "talentId");

-- AddForeignKey
ALTER TABLE "WorkspaceReminder" ADD CONSTRAINT "WorkspaceReminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTalent" ADD CONSTRAINT "SavedTalent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedTalent" ADD CONSTRAINT "SavedTalent_talentId_fkey" FOREIGN KEY ("talentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
