-- Adds an index on ChatMessage.attachmentUrl.
--
-- The attachment serving route authorizes every read by resolving the requested
-- storage key back to the ChatMessage that owns it, then checking access to that
-- message's conversation. That lookup is a point lookup on attachmentUrl, which
-- was previously unindexed.
--
-- Safe on a live table: a plain CREATE INDEX takes a SHARE lock, which permits
-- reads and writes but blocks schema changes for the duration.
CREATE INDEX IF NOT EXISTS "ChatMessage_attachmentUrl_idx" ON "ChatMessage"("attachmentUrl");