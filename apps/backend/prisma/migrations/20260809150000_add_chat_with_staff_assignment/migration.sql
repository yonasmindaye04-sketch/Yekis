-- AlterTable: Conversation
ALTER TABLE "Conversation" ADD COLUMN "assignedStaffId" TEXT;
ALTER TABLE "Conversation" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Conversation" ALTER COLUMN "status" TYPE TEXT USING "status"::TEXT;
ALTER TABLE "Conversation" ALTER COLUMN "status" SET DEFAULT 'OPEN';
DROP TYPE IF EXISTS "ConversationStatus";

-- Drop old Conversation indexes and create new ones
DROP INDEX IF EXISTS "Conversation_creatorId_updatedAt_idx";
DROP INDEX IF EXISTS "Conversation_status_updatedAt_idx";
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");
CREATE INDEX "Conversation_creatorId_idx" ON "Conversation"("creatorId");
CREATE INDEX "Conversation_assignedStaffId_idx" ON "Conversation"("assignedStaffId");

-- Add ForeignKey for assignedStaffId
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: ConversationParticipant
ALTER TABLE "ConversationParticipant" DROP COLUMN IF EXISTS "joinedAt";
DROP INDEX IF EXISTS "ConversationParticipant_userId_lastReadAt_idx";
CREATE INDEX "ConversationParticipant_conversationId_idx" ON "ConversationParticipant"("conversationId");
CREATE INDEX "ConversationParticipant_userId_idx" ON "ConversationParticipant"("userId");

ALTER TABLE "ConversationParticipant" DROP CONSTRAINT IF EXISTS "ConversationParticipant_conversationId_fkey";
ALTER TABLE "ConversationParticipant" ADD CONSTRAINT "ConversationParticipant_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable: ChatMessage
ALTER TABLE "ChatMessage" ADD COLUMN "attachmentUrl" TEXT;
DROP INDEX IF EXISTS "ChatMessage_conversationId_createdAt_idx";
CREATE INDEX "ChatMessage_conversationId_idx" ON "ChatMessage"("conversationId");
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

ALTER TABLE "ChatMessage" DROP CONSTRAINT IF EXISTS "ChatMessage_conversationId_fkey";
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
