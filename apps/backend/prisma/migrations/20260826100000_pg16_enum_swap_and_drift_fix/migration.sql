-- Corrective migration (2026-08-26 unification):
-- 1. Completes PAY-002 Chapa enum removal using the PG16-safe
--    rename-swap technique (ALTER TYPE ... DROP VALUE requires PG17).
-- 2. Repairs pre-existing schema drift: User.notificationSettings and the
--    PasswordResetToken table existed in schema.prisma without a migration.

-- AlterEnum
BEGIN;
CREATE TYPE "PaymentProvider_new" AS ENUM ('TELEBIRR', 'CBE_BIRR');
ALTER TABLE "PaymentTransaction" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TABLE "WalletTopUp" ALTER COLUMN "provider" TYPE "PaymentProvider_new" USING ("provider"::text::"PaymentProvider_new");
ALTER TYPE "PaymentProvider" RENAME TO "PaymentProvider_old";
ALTER TYPE "PaymentProvider_new" RENAME TO "PaymentProvider";
DROP TYPE "PaymentProvider_old";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "notificationSettings" JSONB;

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


