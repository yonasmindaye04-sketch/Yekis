-- AlterTable
ALTER TABLE "DisputeEvidence" ADD COLUMN     "isInternal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "submittedByRole" TEXT NOT NULL DEFAULT 'PARTY';
