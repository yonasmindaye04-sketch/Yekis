-- Uploaded profile photos. Kept out of "User" so that `avatarUrl` remains a
-- short URL instead of a multi-kilobyte data URL: that column is selected by
-- chat, contract, gig and featured queries, and a base64 image there would be
-- copied into every one of those responses.

-- CreateTable
CREATE TABLE "UserAvatar" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" VARCHAR(64) NOT NULL,
    "data" BYTEA NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAvatar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAvatar_userId_idx" ON "UserAvatar"("userId");

-- AddForeignKey
ALTER TABLE "UserAvatar" ADD CONSTRAINT "UserAvatar_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
