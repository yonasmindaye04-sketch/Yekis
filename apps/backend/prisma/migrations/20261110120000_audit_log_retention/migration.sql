-- Audit-log retention: 10-year retention stamp + a purge path.
--
-- WHY A COLUMN AND NOT JUST A DATE FILTER
-- The 10-year AML retention obligation (PDPP No. 1321/2024, Ethiopian AML
-- record-keeping rules) is only enforceable if the retention period is a
-- property of the row. Previously `AuditLog` had no retention column at all:
-- the table was append-only by convention and had no purge job, so it grew
-- forever and nothing tied a row to the moment it became deletable.
--
-- `retentionUntil` is stamped at write time (see lib/audit.ts) as
-- createdAt + AUDIT_RETENTION_YEARS. It is NOT NULL, so no row can exist
-- without a defined expiry — an audit trail where some rows silently have
-- no retention rule is exactly the ambiguity the requirement exists to remove.
--
-- WHY A FUNCTION AND NOT A DELETE FROM THE APP
-- prisma/README.md revokes UPDATE and DELETE on "AuditLog" from the
-- application runtime role, so the API process cannot delete audit rows even
-- by accident. A purge job running as that role would simply fail.
--
-- The function below is SECURITY DEFINER and is owned by the role that ran
-- this migration (the migration role, which holds DELETE on the table). The
-- application role is granted EXECUTE only. The invariant "the app cannot
-- delete audit rows" therefore survives the purge: the app can ask for an
-- expired row to be removed, but it cannot remove a live one, and it cannot
-- write or alter the rule.
--
-- WHY A 10-YEAR FLOOR INSIDE THE FUNCTION
-- The purge respects two independent conditions: the row's own stamp says it
-- is expired, AND the row is at least ten years old. The second condition is
-- a constant inside the function on purpose. If AUDIT_RETENTION_YEARS were
-- ever misconfigured downwards, the stamp would say "expire sooner" but the
-- floor would still hold the row for the full statutory period. A
-- configuration mistake must not be able to shorten a legal retention
-- obligation.

ALTER TABLE "AuditLog" ADD COLUMN "retentionUntil" TIMESTAMP(3);

-- Backfill existing rows from their own creation time, so historical rows
-- get the same treatment as new ones rather than becoming undeletable.
UPDATE "AuditLog"
   SET "retentionUntil" = "createdAt" + INTERVAL '10 years'
 WHERE "retentionUntil" IS NULL;

ALTER TABLE "AuditLog" ALTER COLUMN "retentionUntil" SET NOT NULL;

-- The purge query filters on this column; without the index it would be a
-- sequential scan of the whole audit table on every daily run.
CREATE INDEX "AuditLog_retentionUntil_idx" ON "AuditLog"("retentionUntil");

-- Deletes expired audit rows in bounded batches and returns how many went.
--
-- Batching matters: a table that has been accumulating for a decade can hold
-- millions of rows, and a single unbounded DELETE would take a long
-- transaction, hold row locks, and bloat. The worker calls this repeatedly
-- until it reports zero.
CREATE OR REPLACE FUNCTION purge_expired_audit_logs(p_batch_size integer DEFAULT 5000)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  IF p_batch_size IS NULL OR p_batch_size <= 0 THEN
    p_batch_size := 5000;
  END IF;

  WITH expired AS (
    SELECT "id"
      FROM "AuditLog"
     WHERE "retentionUntil" <= now()
       AND "createdAt" <= now() - INTERVAL '10 years'
     ORDER BY "createdAt" ASC
     LIMIT p_batch_size
  )
  DELETE FROM "AuditLog" a USING expired
   WHERE a."id" = expired."id";

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

REVOKE ALL ON FUNCTION purge_expired_audit_logs(integer) FROM PUBLIC;

-- The application role may invoke the purge but has no DELETE privilege on
-- the table itself. Re-run this GRANT after any migration that touches
-- AuditLog, in case default privileges were re-applied.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'marketplace_app') THEN
    GRANT EXECUTE ON FUNCTION purge_expired_audit_logs(integer) TO marketplace_app;
  END IF;
END;
$$;

COMMENT ON COLUMN "AuditLog"."retentionUntil" IS
  'Instant after which this row may be purged (createdAt + AUDIT_RETENTION_YEARS, default 10 years).';
COMMENT ON FUNCTION purge_expired_audit_logs(integer) IS
  'Deletes audit rows past their retention stamp and at least 10 years old. SECURITY DEFINER so the app role can trigger the purge without holding DELETE on AuditLog.';
