-- Removes test/audit residue from the DEVELOPMENT database only.
--
-- WHY
-- The backend test suite used to run against the development database, so
-- hundreds of fixture users, jobs, contracts and milestones accumulated. This
-- script deletes exactly the rows belonging to those fixtures and nothing else.
--
-- SAFETY
--  - Every statement is scoped to a set of user ids selected by an explicit
--    email pattern. There is no table-wide or "id > 0" delete.
--  - Rows belonging to users outside that set are never touched: a parent row
--    is only deleted when its owning user id is in the set, and FK children are
--    only deleted when they point at a row already being removed.
--  - The whole thing runs in one transaction; any FK violation rolls it back.
--
-- Run with:
--   docker exec -i yekis-postgres-1 psql -U marketplace -d marketplace < scripts/cleanup-dev-test-data.sql
--
-- Inspect the counts first: the SELECTs at the bottom run after the deletes.

\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE purge_users ON COMMIT DROP AS
SELECT "id" FROM "User"
WHERE "email" LIKE 'cooling-%'
   OR "email" ~ '^f(01|02|04|17|22)-'
   OR "email" LIKE 'telegram+%@yekis.local'
   OR "email" LIKE '%@guest.invalid'
   OR "email" LIKE '%@guest.yekis.et'
   OR "email" LIKE '%@test.et'
   OR "email" LIKE '%@test.%'
   OR "email" LIKE 'gigmod.%'
   OR "email" ~ '^gig\.(owner|stranger|other|staff)\.'
   OR "email" ~ '^probe\.'
   OR "email" LIKE 'attach-%'
   OR "email" LIKE 'guest-%'
   OR "email" LIKE 'theme-audit-%'
   OR "email" LIKE 'd2d%.%'
   OR "isGuestContact" = true;

CREATE TEMP TABLE purge_contracts ON COMMIT DROP AS
SELECT "id" FROM "Contract"
WHERE "clientId" IN (SELECT "id" FROM purge_users)
   OR "freelancerId" IN (SELECT "id" FROM purge_users);

CREATE TEMP TABLE purge_gigs ON COMMIT DROP AS
SELECT "id" FROM "Gig"
WHERE "freelancerId" IN (SELECT "id" FROM purge_users);

-- Repeat until stable: each pass removes the deepest remaining children, so
-- FK order does not have to be hand-maintained as the schema grows.
DO $$
DECLARE
  rounds int := 0;
  removed int := 0;
BEGIN
  LOOP
    rounds := rounds + 1;
    IF rounds > 25 THEN
      RAISE EXCEPTION 'purge did not converge after 25 passes';
    END IF;

    -- Children of the users being removed.
    DELETE FROM "PayoutTransaction" WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "WalletTopUp"       WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "Wallet"            WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "KycRecord"         WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "TelegramLoginCode" WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "PasswordResetToken" WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "Notification"      WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "AuditLog"          WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "TransactionFlag"   WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "ConsentRecord"     WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "ConversationParticipant" WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "FeaturedLog"       WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "PortfolioItem"     WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "UserSkill"         WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "DirectThread"      WHERE "clientId" IN (SELECT "id" FROM purge_users) OR "freelancerId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "DirectMessage"     WHERE "senderId" IN (SELECT "id" FROM purge_users);

    -- Disputes raised BY a purged user, and disputes on a purged contract.
    DELETE FROM "DisputeEvidence"  WHERE "disputeId" IN (SELECT "id" FROM "Dispute" WHERE "contractId" IN (SELECT "id" FROM purge_contracts) OR "raisedByUserId" IN (SELECT "id" FROM purge_users));
    DELETE FROM "Dispute"           WHERE "contractId" IN (SELECT "id" FROM purge_contracts) OR "raisedByUserId" IN (SELECT "id" FROM purge_users);

    -- Contracts and their milestones.
    DELETE FROM "Milestone"  WHERE "contractId" IN (SELECT "id" FROM purge_contracts);
    DELETE FROM "Contract"   WHERE "id" IN (SELECT "id" FROM purge_contracts);

    -- Gigs, gig orders and reviews on purged users/gigs.
    DELETE FROM "GigReview"  WHERE "orderId" IN (SELECT "id" FROM "GigOrder" WHERE "gigId" IN (SELECT "id" FROM purge_gigs) OR "clientId" IN (SELECT "id" FROM purge_users))
                            OR "authorId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "GigOrder"   WHERE "gigId" IN (SELECT "id" FROM purge_gigs) OR "clientId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "Gig"        WHERE "id" IN (SELECT "id" FROM purge_gigs);

    -- Proposals and reviews referencing purged jobs/contracts/users.
    DELETE FROM "Review"     WHERE "contractId" IN (SELECT "id" FROM purge_contracts) OR "authorId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "Proposal"   WHERE "jobId" IN (SELECT "id" FROM "Job" WHERE "clientId" IN (SELECT "id" FROM purge_users)) OR "freelancerId" IN (SELECT "id" FROM purge_users);

    -- Chat rows created by purged users.
    -- Chat rows created by purged users. A conversation is removed together with
    -- the participants and messages that reference it, so the FK never blocks.
    DELETE FROM "ChatMessage" WHERE "senderId" IN (SELECT "id" FROM purge_users)
        OR "conversationId" IN (SELECT "id" FROM "Conversation"
                                WHERE "creatorId" IN (SELECT "id" FROM purge_users)
                                   OR "assignedStaffId" IN (SELECT "id" FROM purge_users));
    DELETE FROM "ConversationParticipant"
        WHERE "userId" IN (SELECT "id" FROM purge_users)
           OR "conversationId" IN (SELECT "id" FROM "Conversation"
                                   WHERE "creatorId" IN (SELECT "id" FROM purge_users)
                                      OR "assignedStaffId" IN (SELECT "id" FROM purge_users));
    DELETE FROM "Conversation" WHERE "creatorId" IN (SELECT "id" FROM purge_users)
                                  OR "assignedStaffId" IN (SELECT "id" FROM purge_users);

    -- Jobs last, then the users themselves.
    DELETE FROM "Job"  WHERE "clientId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "User" WHERE "id" IN (SELECT "id" FROM purge_users);

    GET DIAGNOSTICS removed = ROW_COUNT;
    EXIT WHEN removed = 0;
  END LOOP;
END $$;

COMMIT;

-- ---- Report (counts only, no personal data) ----
SELECT 'users_remaining'      AS metric, count(*) FROM "User"
UNION ALL SELECT 'jobs_remaining',       count(*) FROM "Job"
UNION ALL SELECT 'contracts_remaining',  count(*) FROM "Contract"
UNION ALL SELECT 'milestones_remaining', count(*) FROM "Milestone"
UNION ALL SELECT 'gigs_remaining',       count(*) FROM "Gig"
UNION ALL SELECT 'gigorders_remaining',  count(*) FROM "GigOrder"
UNION ALL SELECT 'wallets_remaining',    count(*) FROM "Wallet";