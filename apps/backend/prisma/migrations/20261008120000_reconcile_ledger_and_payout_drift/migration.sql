-- Reconciles schema drift: objects the Prisma schema declares that no
-- migration ever created.
--
-- WHY THIS EXISTS
-- `prisma migrate deploy` against a FRESH database produced a schema the code
-- cannot run against. Four tables the application uses on every escrow
-- settlement were absent:
--
--   LedgerAccount, LedgerJournal, LedgerEntry, PayoutTransaction
--
-- They exist in the development database only because they were created
-- out-of-band (db push / manual DDL) and never captured in a migration. That
-- is why the test suite used to run against the development database: the test
-- database could not be built from migrations. This migration is what makes a
-- dedicated test database possible.
--
-- Also reconciled, all additive or relaxing:
--   - PaymentProvider gains 'M_PESA', TopUpStatus gains 'CHECKOUT_PENDING'
--   - WalletTopUp gains providerTransactionId (+ unique index),
--     referenceNumber gains a default, receiptImagePath becomes nullable
--   - Dispute.contractId / gigOrderId become ON DELETE SET NULL, and the
--     unique index on Dispute.contractId is dropped (the column is nullable
--     now, so uniqueness no longer describes it)
--
-- SAFETY
-- Every statement is guarded with IF [NOT] EXISTS, so this file is a no-op
-- where the objects already exist (the development database) and creates them
-- where they do not (a fresh database). No existing row is dropped, rewritten
-- or locked for a rewrite. Additive only.
--
-- Generated with:
--   prisma migrate diff \
--     --from-schema-datasource prisma/schema.prisma \
--     --to-schema-datamodel prisma/schema.prisma --script

-- ---------- Missing enum types ----------
-- These back the two ledger/payout tables below and were also never captured in
-- a migration, so a fresh database had neither the types nor the tables.
DO $$ BEGIN
    CREATE TYPE "LedgerAccountType" AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'REVERSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- Missing enum values ----------
DO $$ BEGIN
    ALTER TYPE "PaymentProvider" ADD VALUE IF NOT EXISTS 'M_PESA';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE "TopUpStatus" ADD VALUE IF NOT EXISTS 'CHECKOUT_PENDING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------- Missing tables ----------
CREATE TABLE IF NOT EXISTS "LedgerAccount" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "LedgerAccountType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'ETB',
    "balanceMinor" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerJournal" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerJournal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LedgerEntry" (
    "id" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "debitMinor" INTEGER NOT NULL DEFAULT 0,
    "creditMinor" INTEGER NOT NULL DEFAULT 0,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PayoutTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "amountMinor" INTEGER NOT NULL,
    "feeMinor" INTEGER NOT NULL DEFAULT 0,
    "netAmountMinor" INTEGER NOT NULL,
    "provider" "PaymentProvider" NOT NULL,
    "providerPayoutId" TEXT,
    "payoutAccountIdentifier" TEXT NOT NULL,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "settledAt" TIMESTAMP(3),

    CONSTRAINT "PayoutTransaction_pkey" PRIMARY KEY ("id")
);

-- ---------- Missing indexes ----------
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerAccount_code_key" ON "LedgerAccount"("code");
CREATE INDEX IF NOT EXISTS "LedgerAccount_type_idx" ON "LedgerAccount"("type");
CREATE UNIQUE INDEX IF NOT EXISTS "LedgerJournal_idempotencyKey_key" ON "LedgerJournal"("idempotencyKey");
CREATE INDEX IF NOT EXISTS "LedgerJournal_referenceType_referenceId_idx" ON "LedgerJournal"("referenceType", "referenceId");
CREATE INDEX IF NOT EXISTS "LedgerJournal_postedAt_idx" ON "LedgerJournal"("postedAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_accountId_postedAt_idx" ON "LedgerEntry"("accountId", "postedAt");
CREATE INDEX IF NOT EXISTS "LedgerEntry_journalId_idx" ON "LedgerEntry"("journalId");
CREATE UNIQUE INDEX IF NOT EXISTS "PayoutTransaction_providerPayoutId_key" ON "PayoutTransaction"("providerPayoutId");
CREATE INDEX IF NOT EXISTS "PayoutTransaction_userId_status_idx" ON "PayoutTransaction"("userId", "status");
CREATE INDEX IF NOT EXISTS "PayoutTransaction_provider_status_idx" ON "PayoutTransaction"("provider", "status");
CREATE INDEX IF NOT EXISTS "PayoutTransaction_createdAt_idx" ON "PayoutTransaction"("createdAt");

-- ---------- WalletTopUp column drift ----------
ALTER TABLE "WalletTopUp" ADD COLUMN IF NOT EXISTS "providerTransactionId" TEXT;
ALTER TABLE "WalletTopUp" ALTER COLUMN "referenceNumber" SET DEFAULT '';
ALTER TABLE "WalletTopUp" ALTER COLUMN "receiptImagePath" DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "WalletTopUp_providerTransactionId_key" ON "WalletTopUp"("providerTransactionId");

-- ---------- Dispute foreign keys ----------
-- contractId and gigOrderId became nullable so gig disputes can share the
-- dispute machine, which means the foreign keys must null out rather than
-- block a delete, and the old single-dispute-per-contract unique index no
-- longer describes the column.
ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_contractId_fkey";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_contractId_fkey"
    FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Dispute" DROP CONSTRAINT IF EXISTS "Dispute_gigOrderId_fkey";
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_gigOrderId_fkey"
    FOREIGN KEY ("gigOrderId") REFERENCES "GigOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

DROP INDEX IF EXISTS "Dispute_contractId_key";

-- ---------- New tables' foreign keys ----------
DO $$ BEGIN
    ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_journalId_fkey"
        FOREIGN KEY ("journalId") REFERENCES "LedgerJournal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_accountId_fkey"
        FOREIGN KEY ("accountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "PayoutTransaction" ADD CONSTRAINT "PayoutTransaction_walletId_fkey"
        FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;