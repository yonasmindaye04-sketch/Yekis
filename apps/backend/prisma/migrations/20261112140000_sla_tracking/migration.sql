-- SLA tracking (2026-11-12).
--
-- Records WHEN each SLA obligation was met, so a breach is a queryable fact
-- rather than a number redrawn in the browser. The deadlines themselves are
-- derived from createdAt plus the configured targets
-- (SUPPORT_FIRST_RESPONSE_SLA_HOURS, SUPPORT_RESOLUTION_SLA_HOURS,
-- DISPUTE_FIRST_RESPONSE_SLA_BUSINESS_DAYS, DISPUTE_RESOLUTION_SLA_BUSINESS_DAYS),
-- so no deadline column is needed and changing a target takes effect
-- immediately for every open item.
--
-- Conversation.firstRespondedAt -- staff's first reply on the ticket.
-- Conversation.resolvedAt       -- the ticket was closed.
-- Dispute.firstRespondedAt      -- the mediator recorded a recommendation.

ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "firstRespondedAt" TIMESTAMP(3);
ALTER TABLE "Conversation" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP(3);

ALTER TABLE "Dispute" ADD COLUMN IF NOT EXISTS "firstRespondedAt" TIMESTAMP(3);

-- Support queue reporting: "open conversations that were never answered".
CREATE INDEX IF NOT EXISTS "Conversation_status_firstRespondedAt_idx"
    ON "Conversation"("status", "firstRespondedAt");

-- Dispute queue reporting: "open disputes with no mediator response".
CREATE INDEX IF NOT EXISTS "Dispute_stage_firstRespondedAt_idx"
    ON "Dispute"("stage", "firstRespondedAt");
