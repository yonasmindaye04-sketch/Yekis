-- Purpose-scoped phone codes.
--
-- WHY THIS COLUMN
-- `PhoneVerificationCode` previously had no notion of what a code was FOR, so
-- the "one outstanding challenge per phone" rule applied to every code at
-- once. Requesting a withdrawal code deleted a pending phone-verification
-- code and vice versa. Both are security controls, so letting one destroy
-- the other is a denial-of-service on the control itself — and it silently
-- unverified the account whose phone proof had just been sent.
--
-- `purpose` scopes the rule to (phone, purpose): each kind of proof has its
-- own outstanding code, and a code issued for one purpose can never be
-- redeemed for another.
--
-- The DEFAULT keeps every existing row valid and keeps the historic
-- registration codes meaning what they meant.

ALTER TABLE "PhoneVerificationCode" ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'PHONE_VERIFICATION';

COMMENT ON COLUMN "PhoneVerificationCode"."purpose" IS
  'What the code proves: PHONE_VERIFICATION (control of the number) or WITHDRAWAL (approval of one payout). One outstanding code per (phone, purpose).';
