-- Chatwoot support bridge.
--
-- Adds the columns needed to mirror a Yekis support conversation into a
-- Chatwoot inbox (so support agents get Chatwoot's assignment, SLA and
-- omnichannel tooling) while keeping our own Conversation/ChatMessage rows
-- the source of truth for the Yekis UI.
--
-- All new columns are nullable (or have a default), so this is additive and
-- safe to apply to a live database: existing conversations keep
-- channel = 'INTERNAL' and are never mirrored.

-- AlterTable: Conversation
ALTER TABLE "Conversation" ADD COLUMN "channel" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "Conversation" ADD COLUMN "chatwootConversationId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "chatwootContactId" TEXT;
ALTER TABLE "Conversation" ADD COLUMN "chatwootInboxId" TEXT;

CREATE INDEX "Conversation_channel_idx" ON "Conversation"("channel");

-- A Chatwoot conversation may back at most one internal conversation.
-- NULLs are distinct in Postgres, so internal conversations are unaffected.
CREATE UNIQUE INDEX "Conversation_chatwootConversationId_key" ON "Conversation"("chatwootConversationId");

-- AlterTable: ChatMessage
ALTER TABLE "ChatMessage" ADD COLUMN "origin" TEXT NOT NULL DEFAULT 'INTERNAL';
ALTER TABLE "ChatMessage" ADD COLUMN "externalId" TEXT;

CREATE INDEX "ChatMessage_origin_idx" ON "ChatMessage"("origin");

-- Webhook idempotency: Chatwoot retries a delivery on non-2xx, so the same
-- message can arrive more than once. NULLs are distinct, so internal messages
-- are unconstrained.
CREATE UNIQUE INDEX "ChatMessage_externalId_key" ON "ChatMessage"("externalId");