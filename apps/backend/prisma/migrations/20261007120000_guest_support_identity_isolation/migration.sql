-- F-01: isolate guest-support identities from real accounts.
--
-- Two additive columns, no backfill, no data change:
--
--   User.isGuestContact  marks a synthetic support identity. It is never
--                        routable: no password, no session, no KYC. requireAuth
--                        refuses these outright as defence in depth, so a guest
--                        row can never be used as a login identity even if a
--                        token ever leaked.
--
--   Conversation.contactEmail  the address a signed-out visitor typed into the
--                        support widget. It is contact metadata for staff only;
--                        it is NOT an account key, which is the entire point —
--                        the old code used it to look up (and upsert) a real
--                        User, which handed anyone who knew an email address a
--                        full session as that user.

ALTER TABLE "User" ADD COLUMN "isGuestContact" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Conversation" ADD COLUMN "contactEmail" TEXT;

-- Partial index: staff tooling and the squatted-email report only ever ask
-- "which users are guests", so the flag should not slow down every User read.
CREATE INDEX "User_isGuestContact_idx" ON "User" ("isGuestContact");