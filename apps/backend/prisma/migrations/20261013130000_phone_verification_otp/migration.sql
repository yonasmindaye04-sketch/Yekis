-- Phone verification by SMS OTP.
--
-- WHY
-- User.phone has been NOT NULL and unique since the beginning, is accepted as
-- a login identifier, is the SMS notification destination and is the payout
-- destination for Telebirr and M-Pesa -- and it has never been verified by
-- anything. Anyone could register an account with someone else's number, which
-- means notifications and, more seriously, payout instructions could be aimed at
-- a number the platform never proved it belongs to the account holder.
--
-- This adds the proof. It is deliberately the prerequisite for 2FA rather than
-- 2FA itself: a one-time code over SMS over a phone number we have verified is
-- strictly better than a password, and is weaker than TOTP.
--
-- STORAGE
-- Only the SHA-256 of the code is stored, never the code. A database read must
-- not hand an attacker the ability to log in. The hash is salted with the
-- challenge id so a rainbow table built from one row does not cover the rest.
--
-- The row is KEPT after a successful check and stamped with verifiedAt rather
-- than deleted. Deleting would be tidier but throws away the only record that a
-- given number was ever proven for this account, which is exactly the kind of
-- thing that is wanted during a payout investigation. The code hash is useless
-- once the code has expired, so retaining the row stores no live secret.

CREATE TABLE "PhoneVerificationCode" (
    "id"          TEXT PRIMARY KEY,
    -- Not a foreign key on purpose. Verification has to happen BEFORE a user
    -- exists (registration sends the code, then creates the account) and for
    -- recovering a number on an existing account. An FK would block the first
    -- case entirely.
    "userId"      TEXT,
    "phone"       TEXT        NOT NULL,
    -- sha256(salt + code), hex. Unique so verification is one index hit.
    "codeHash"    TEXT        NOT NULL,
    "salt"        TEXT        NOT NULL,
    "attempts"    INTEGER     NOT NULL DEFAULT 0,
    "expiresAt"   TIMESTAMP(3) NOT NULL,
    "verifiedAt"  TIMESTAMP(3),
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneVerificationCode_codeHash_key" UNIQUE ("codeHash")
);

-- Lookup is always (phone, newest first). Index matches that, and also lets the
-- resend-cooldown and replay checks avoid a scan.
CREATE INDEX "PhoneVerificationCode_phone_createdAt_idx"
    ON "PhoneVerificationCode" ("phone", "createdAt" DESC);

-- Housekeeping: expired rows are swept by a worker, but this index keeps the
-- sweep from scanning the whole table.
CREATE INDEX "PhoneVerificationCode_expiresAt_idx"
    ON "PhoneVerificationCode" ("expiresAt");

-- The pending code is bound to the account it was issued for. Set when the code
-- is sent to a signed-in user; NULL during registration, before the account
-- exists.
CREATE INDEX "PhoneVerificationCode_userId_idx"
    ON "PhoneVerificationCode" ("userId");

-- NOT a partial unique index. Prisma 5.22 cannot express `@@unique(..., where:)`,
-- and a raw-SQL-only index would leave the migrated schema differing from
-- schema.prisma, which db:check-fresh compares and would fail on. The "one
-- outstanding challenge per number" rule is therefore enforced in
-- phone-verification.service.ts, inside the same transaction that replaces the
-- old row.

COMMENT ON TABLE "PhoneVerificationCode" IS
  'SMS OTP challenges. Stores only a salted SHA-256 of the code; rows are '
  'deleted on successful verification.';