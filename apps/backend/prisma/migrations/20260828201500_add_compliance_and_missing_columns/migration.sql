-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'CHAPA';

-- DropIndex
DROP INDEX IF EXISTS "User_faydaBiometricId_idx";

-- DropIndex
DROP INDEX IF EXISTS "User_faydaBiometricId_key";

-- AlterTable
ALTER TABLE "Dispute" ADD COLUMN     "evidenceBundleHash" TEXT;

-- AlterTable
ALTER TABLE "KycRecord" ADD COLUMN     "esignetSub" TEXT,
ADD COLUMN     "esignetVerifiedAt" TIMESTAMP(3),
ADD COLUMN     "esignetVerifiedDob" TEXT,
ADD COLUMN     "esignetVerifiedName" TEXT;

-- AlterTable
ALTER TABLE "Milestone" ADD COLUMN     "deliverableHash" TEXT;

-- AlterTable
ALTER TABLE "PlatformOperatingAccount" ADD COLUMN     "accumulatedVatMinor" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: rename faydaBiometricId -> fayda_biometric_id, add compliance columns
ALTER TABLE "User" ADD COLUMN     "circumventionAlertCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "complianceHeldAt" TIMESTAMP(3),
ADD COLUMN     "complianceHeldReason" TEXT,
ADD COLUMN     "isComplianceHeld" BOOLEAN NOT NULL DEFAULT false;

-- Rename column if it exists (safe migration)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='faydaBiometricId') THEN
    ALTER TABLE "User" RENAME COLUMN "faydaBiometricId" TO "fayda_biometric_id";
  ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='User' AND column_name='fayda_biometric_id') THEN
    ALTER TABLE "User" ADD COLUMN "fayda_biometric_id" TEXT;
  END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_fayda_biometric_id_key" ON "User"("fayda_biometric_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "User_fayda_biometric_id_idx" ON "User"("fayda_biometric_id");
