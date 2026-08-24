-- Social sign-in: provider identity links + email verification flag.
ALTER TABLE "User" ADD COLUMN "emailVerified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "googleId" TEXT;
ALTER TABLE "User" ADD COLUMN "appleId" TEXT;
ALTER TABLE "User" ADD COLUMN "facebookId" TEXT;

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
CREATE UNIQUE INDEX "User_facebookId_key" ON "User"("facebookId");
