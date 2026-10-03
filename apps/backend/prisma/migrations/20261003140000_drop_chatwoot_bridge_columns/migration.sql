-- Removes the Chatwoot support-bridge columns.
--
-- Chatwoot was evaluated as a third-party agent inbox and then dropped in
-- favour of the native support chat. These columns existed only to mirror
-- conversations into a Chatwoot inbox, so with that integration gone they are
-- dead weight that also leaks a meaningless `channel` value into the API.
--
-- `ChatMessage.origin` and `ChatMessage.externalId` are deliberately KEPT: they
-- are generic provenance and idempotency markers that are useful for any future
-- external channel, and they cost nothing while unused.

-- Drop indexes before the columns; Postgres would cascade, but being explicit
-- keeps the intent readable and the ordering obvious.
DROP INDEX IF EXISTS "Conversation_channel_idx";
DROP INDEX IF EXISTS "Conversation_chatwootConversationId_key";

ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "chatwootInboxId";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "chatwootContactId";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "chatwootConversationId";
ALTER TABLE "Conversation" DROP COLUMN IF EXISTS "channel";