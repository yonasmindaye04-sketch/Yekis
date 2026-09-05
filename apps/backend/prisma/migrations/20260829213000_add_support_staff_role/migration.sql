-- Add the SUPPORT staff role for chat-only customer support users.
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block in PostgreSQL.
ALTER TYPE "StaffRole" ADD VALUE 'SUPPORT';