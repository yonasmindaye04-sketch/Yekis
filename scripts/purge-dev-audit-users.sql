-- Removes the named audit/test users and everything they own from the
-- DEVELOPMENT database.
--
-- SAFETY
--  - Every delete is scoped to a set of user ids selected by an explicit email
--    list. There is no table-wide delete and no "id > 0" predicate.
--  - The whole run is one transaction. Any foreign-key violation rolls the
--    entire thing back and changes nothing.
--  - Children are removed before their parent, then the loop repeats until no
--    further rows are deleted, so FK order does not have to be maintained by
--    hand as the schema grows.
--
-- USES
--  - Dry run (safe): replace the final COMMIT with ROLLBACK.
--  - Real run:            keep COMMIT.
--
-- Run with:
--   docker exec -i yekis-postgres-1 psql -U marketplace -d marketplace \
--     < scripts/purge-dev-audit-users.sql
--
-- Verify the backup exists before running for real:
--   ls backups/

BEGIN;

-- Matched on the full address. The prefixes were checked first: five of the
-- seven live at @yekis.et and two at @example.com / @gmail.com, so a
-- prefix-only list would silently select nothing.
CREATE TEMP TABLE purge_users ON COMMIT DROP AS
SELECT "id", "email" FROM "User"
WHERE "email" IN (
  'audit-client@yekis.et',
  'audit-freelancer@yekis.et',
  'audit.probe@yekis.et',
  'audit.client@yekis.et',
  'audit.freelancer@yekis.et',
  'cwtest7199@example.com',
  'test@gmail.com'
);

CREATE TEMP TABLE purge_contracts ON COMMIT DROP AS
SELECT "id" FROM "Contract"
WHERE "clientId" IN (SELECT "id" FROM purge_users)
   OR "freelancerId" IN (SELECT "id" FROM purge_users);

CREATE TEMP TABLE purge_gigs ON COMMIT DROP AS
SELECT "id" FROM "Gig"
WHERE "freelancerId" IN (SELECT "id" FROM purge_users);

CREATE TEMP TABLE purge_jobs ON COMMIT DROP AS
SELECT "id" FROM "Job"
WHERE "clientId" IN (SELECT "id" FROM purge_users);

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

    -- Payments and ledger first: these have the deepest FK chains.
    DELETE FROM "LedgerEntry"
      WHERE "accountId" IN (SELECT "id" FROM "LedgerAccount"
                            WHERE "code" LIKE '2%-%');
    DELETE FROM "PayoutTransaction" WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "WalletTopUp"       WHERE "userId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "Wallet"            WHERE "userId" IN (SELECT "id" FROM purge_users);
    -- KycRecord has its own children (KycReviewEvent), which the first
    -- version of this script missed; Postgres refused the delete and the whole
    -- transaction rolled back, which is the behaviour we want on a dry run.
    DELETE FROM "KycReviewEvent" WHERE "kycRecordId" IN (
      SELECT "id" FROM "KycRecord" WHERE "userId" IN (SELECT "id" FROM purge_users));
    DELETE FROM "KycDocument" WHERE "kycRecordId" IN (
      SELECT "id" FROM "KycRecord" WHERE "userId" IN (SELECT "id" FROM purge_users));
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
    DELETE FROM "DirectThread"      WHERE "clientId" IN (SELECT "id" FROM purge_users)
                                      OR "freelancerId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "DirectMessage"     WHERE "senderId" IN (SELECT "id" FROM purge_users);

    -- Disputes raised by a purged user, or on a purged contract.
    DELETE FROM "DisputeEvidence"
      WHERE "disputeId" IN (SELECT "id" FROM "Dispute"
                            WHERE "contractId" IN (SELECT "id" FROM purge_contracts)
                               OR "raisedByUserId" IN (SELECT "id" FROM purge_users));
    DELETE FROM "Dispute"
      WHERE "contractId" IN (SELECT "id" FROM purge_contracts)
         OR "raisedByUserId" IN (SELECT "id" FROM purge_users);

    -- Gig orders and reviews, including the gig owned by audit.freelancer.
    DELETE FROM "GigReview"
      WHERE "orderId" IN (SELECT "id" FROM "GigOrder"
                          WHERE "gigId" IN (SELECT "id" FROM purge_gigs)
                             OR "clientId" IN (SELECT "id" FROM purge_users))
         OR "authorId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "GigOrder" WHERE "gigId" IN (SELECT "id" FROM purge_gigs)
                               OR "clientId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "Gig"      WHERE "id" IN (SELECT "id" FROM purge_gigs);

    -- Contracts, milestones and anything hanging off a milestone.
    DELETE FROM "DisputeEvidence" WHERE "disputeId" IN (
      SELECT "id" FROM "Dispute" WHERE "milestoneId" IN (
        SELECT "id" FROM "Milestone" WHERE "contractId" IN (SELECT "id" FROM purge_contracts)));
    DELETE FROM "Dispute" WHERE "milestoneId" IN (
      SELECT "id" FROM "Milestone" WHERE "contractId" IN (SELECT "id" FROM purge_contracts));
    DELETE FROM "Milestone" WHERE "contractId" IN (SELECT "id" FROM purge_contracts);
    DELETE FROM "Contract"  WHERE "id" IN (SELECT "id" FROM purge_contracts);

    -- Proposals and reviews.
    DELETE FROM "Review"
      WHERE "contractId" IN (SELECT "id" FROM purge_contracts)
         OR "authorId" IN (SELECT "id" FROM purge_users);
    DELETE FROM "Proposal"
      WHERE "jobId" IN (SELECT "id" FROM purge_jobs)
         OR "freelancerId" IN (SELECT "id" FROM purge_users);

    -- Chat, including participants and messages of purged conversations.
    DELETE FROM "ChatMessage" WHERE "senderId" IN (SELECT "id" FROM purge_users)
        OR "conversationId" IN (SELECT "id" FROM "Conversation"
                                WHERE "creatorId" IN (SELECT "id" FROM purge_users)
                                   OR "assignedStaffId" IN (SELECT "id" FROM purge_users));
    DELETE FROM "ConversationParticipant"
      WHERE "userId" IN (SELECT "id" FROM purge_users)
         OR "conversationId" IN (SELECT "id" FROM "Conversation"
                                 WHERE "creatorId" IN (SELECT "id" FROM purge_users)
                                    OR "assignedStaffId" IN (SELECT "id" FROM purge_users));
    DELETE FROM "Conversation"
      WHERE "creatorId" IN (SELECT "id" FROM purge_users)
         OR "assignedStaffId" IN (SELECT "id" FROM purge_users);

    -- Jobs, then the users.
    DELETE FROM "Job"  WHERE "id" IN (SELECT "id" FROM purge_jobs);
    DELETE FROM "User" WHERE "id" IN (SELECT "id" FROM purge_users);

    GET DIAGNOSTICS removed = ROW_COUNT;
    EXIT WHEN removed = 0;
  END LOOP;
END $$;

-- ---- Counts only, no personal data ----
SELECT 'purged_users'      AS metric, count(*) FROM purge_users
UNION ALL SELECT 'purged_contracts',  count(*) FROM purge_contracts
UNION ALL SELECT 'purged_gigs',       count(*) FROM purge_gigs
UNION ALL SELECT 'purged_jobs',       count(*) FROM purge_jobs;

ROLLBACK;
