-- Distinguishes password-owned accounts from federated-only (social/Telegram)
-- accounts. Federated sign-in may only auto-merge into an account that has no
-- platform password of its own; otherwise an unverified email match becomes an
-- account-takeover primitive.
ALTER TABLE "User" ADD COLUMN "passwordSetAt" TIMESTAMP(3);

-- Backfill: accounts that have no linked federated identity and no synthetic
-- Telegram email could only have been created by email/password registration.
UPDATE "User"
SET "passwordSetAt" = "createdAt"
WHERE "googleId" IS NULL
  AND "appleId" IS NULL
  AND "facebookId" IS NULL
  AND "telegramUserId" IS NULL
  AND "email" NOT LIKE 'telegram+%@yekis.local';