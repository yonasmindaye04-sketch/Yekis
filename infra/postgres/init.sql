-- Enable pgaudit for the database. Actual audit-class configuration
-- (which statements get logged) should be tuned per environment via
-- postgresql.conf / ALTER SYSTEM in staging and production — the defaults
-- here just make the extension available for local development.
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- The audit_log table (Prisma model AuditLog) must be append-only from the
-- application's perspective. After the first `prisma migrate deploy` has
-- created the table, run this once per environment (it can't run here
-- because the table doesn't exist yet on a fresh database):
--
--   REVOKE UPDATE, DELETE ON "AuditLog" FROM marketplace_app_role;
--
-- Create a dedicated low-privilege role for the running application
-- (distinct from the migration role) and grant it INSERT/SELECT only on
-- AuditLog. See infra/postgres/README.md for the full runbook.
