-- Email verification by OTP, and the onboarding channel it unlocks.
--
-- WHY
-- The signup flow proves control of the phone number over SMS. On a hosted
-- testing environment the SMS provider has no key, so `sendSms()` returns
-- `sent: false` and the first onboarding step fails for every new user — the
-- account cannot be created at all.
--
-- `User.email` is already the login identifier and the destination of every
-- transactional mail (escrow receipts, payout notices, password resets), so
-- proving the address is a takeover-prevention control in its own right. Email
-- is therefore the onboarding channel while SMS is unavailable.
--
-- The SMS phone codes are deliberately left untouched. `User.phone` is the
-- Telebirr / M-Pesa payout destination and the TMS identity check, and the
-- withdrawal-approval code is money. Weakening that flow to make signup work
-- would trade a delivery problem for a payout-toward-the-wrong-person bug.
--
-- STORAGE
-- Only the salted SHA-256 of the code is stored, never the code — the same
-- property as PhoneVerificationCode. A database read must not hand an
-- attacker the ability to finish an onboarding.
--
-- The row is KEPT after a successful check and stamped with `verifiedAt`
-- rather than deleted: it is the audit trail of which address was ever
-- proven for this account, and the stored hash is inert once the code
-- expires.

CREATE TABLE "EmailVerificationCode" (
    "id"          TEXT PRIMARY KEY,
    -- Not a foreign key on purpose. Verification has to happen BEFORE a user
    -- exists (registration sends the code, then creates the account), so an FK
    -- would block the primary flow entirely.
    "userId"      TEXT,
    -- Lower-cased and trimmed by the service, so the stored value is the
    -- canonical form the `User.email` column uses.
    "email"       TEXT        NOT NULL,
    -- What the code proves. One outstanding code per (email, purpose), so an
    -- onboarding code can never be redeemed as a different kind of proof.
    "purpose"     TEXT        NOT NULL DEFAULT 'EMAIL_VERIFICATION',
    -- sha256(salt + code), hex. Unique so verification is one index hit.
    "codeHash"    TEXT        NOT NULL,
    "salt"        TEXT        NOT NULL,
    "attempts"    INTEGER     NOT NULL DEFAULT 0,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "verifiedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerificationCode_codeHash_key" UNIQUE ("codeHash")
);

-- Lookup is always (email, newest first). The index matches that and also
-- lets the resend-cooldown and replay checks avoid a scan.
CREATE INDEX "EmailVerificationCode_email_createdAt_idx"
    ON "EmailVerificationCode" ("email", "createdAt" DESC);

-- Housekeeping: expired rows are swept by a worker, and this index keeps the
-- sweep from scanning the whole table.
CREATE INDEX "EmailVerificationCode_expiresAt_idx"
    ON "EmailVerificationCode" ("expiresAt");

-- The pending code is bound to the account it was issued for. Set when the
-- code is sent to a signed-in user; NULL during registration, before the
-- account exists.
CREATE INDEX "EmailVerificationCode_userId_idx"
    ON "EmailVerificationCode" ("userId");

-- NOT a partial unique index. Prisma 5.22 cannot express `@@unique(...,
-- where:)`, and a raw-SQL-only index would leave the migrated schema
-- differing from schema.prisma, which db:check-fresh compares and would fail
-- on. The "one outstanding challenge per address" rule is therefore enforced
-- in email-verification.service.ts, inside the same transaction that replaces
-- the old row.

COMMENT ON TABLE "EmailVerificationCode" IS
  'Email OTP challenges. Stores only a salted SHA-256 of the code; rows are '
  'kept after verification as the audit trail of which address was proven.';

-- When the account holder proved control of the address.
--
-- `User.emailVerified` already existed, but it is a boolean with no time on
-- it, and it is set by the OAuth path where the provider — not the platform —
-- proved the address. `emailVerifiedAt` records only what THIS platform proved
-- by email OTP, which is what registration adopts onto a new account.
ALTER TABLE "User" ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

COMMENT ON COLUMN "User"."emailVerifiedAt" IS
  'Set when the account holder proved control of the address by email OTP. '
  'NULL means never proven by email; OAuth sign-ins set emailVerified without '
  'a timestamp because the provider proved the address, not the platform.';
