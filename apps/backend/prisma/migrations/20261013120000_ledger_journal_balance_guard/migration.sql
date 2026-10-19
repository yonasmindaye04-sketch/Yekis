-- Journal-level double-entry balance, enforced by Postgres.
--
-- WHY A STATEMENT TRIGGER
-- 20261009120000 added row-local CHECKs only. Journal balance could not be
-- done with a row trigger: a valid posting such as
--     debit  1000-A  50
--     credit 2000-B  50
-- makes the journal look unbalanced after the first line is inserted, so a
-- row trigger rejects correct input.
--
-- A DEFERRABLE INITIALLY DEFERRED CONSTRAINT trigger was tried next and does
-- not work for this codebase: it fires correctly under psql and under
-- prisma.$transaction([...]) array form, but never fires inside
-- prisma.$transaction(async tx => ...) because that form opens a real
-- interactive transaction and the deferred check is never reached before
-- COMMIT. A trigger that can be bypassed by choosing a different Prisma call
-- style is not a guarantee.
--
-- So: FOR EACH STATEMENT triggers with transition relations. They fire once
-- per statement and see every row that statement touched, so a multi-row
-- createMany carrying both halves of a journal passes while a single stray
-- line fails. postJournalEntry buffers its lines and issues exactly one
-- createMany for this reason.
--
-- Postgres rejects transition tables on a trigger with more than one event
-- ("transition tables cannot be specified for triggers with more than one
-- event"), hence three single-event triggers sharing one validator instead of
-- one combined trigger.
--
-- CONSEQUENCE FOR CALLERS: lines for one journal must be written in ONE
-- statement. Appending a correcting line in a second statement is now
-- rejected. Corrections should be new compensating journals.

-- Shared validator: returns true when the journal balances.
CREATE OR REPLACE FUNCTION ledger_journal_balanced(p_journal_id text)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT COALESCE(sum("debitMinor"), 0) = COALESCE(sum("creditMinor"), 0)
    FROM "LedgerEntry"
   WHERE "journalId" = p_journal_id;
$$;

-- Raises on the first unbalanced journal among the ones a statement touched.
-- INSERT: only new rows are affected.
CREATE OR REPLACE FUNCTION ledger_balance_guard_insert() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  jid text;
BEGIN
  FOR jid IN SELECT DISTINCT "journalId" FROM new_rows WHERE "journalId" IS NOT NULL LOOP
    IF NOT ledger_journal_balanced(jid) THEN
      RAISE EXCEPTION
        'Ledger journal % is unbalanced after insert: debits % vs credits %', jid,
        (SELECT COALESCE(sum("debitMinor"), 0) FROM "LedgerEntry" WHERE "journalId" = jid),
        (SELECT COALESCE(sum("creditMinor"), 0) FROM "LedgerEntry" WHERE "journalId" = jid)
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- DELETE: removing a line can unbalance a journal, so old rows matter.
CREATE OR REPLACE FUNCTION ledger_balance_guard_delete() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  jid text;
BEGIN
  FOR jid IN SELECT DISTINCT "journalId" FROM old_rows WHERE "journalId" IS NOT NULL LOOP
    IF NOT ledger_journal_balanced(jid) THEN
      RAISE EXCEPTION
        'Ledger journal % is unbalanced after delete: debits % vs credits %', jid,
        (SELECT COALESCE(sum("debitMinor"), 0) FROM "LedgerEntry" WHERE "journalId" = jid),
        (SELECT COALESCE(sum("creditMinor"), 0) FROM "LedgerEntry" WHERE "journalId" = jid)
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- UPDATE: both sides, because a changed journalId leaves the old journal
-- short a line.
CREATE OR REPLACE FUNCTION ledger_balance_guard_update() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  jid text;
BEGIN
  FOR jid IN
    SELECT DISTINCT "journalId" FROM (
      SELECT "journalId" FROM new_rows WHERE "journalId" IS NOT NULL
      UNION
      SELECT "journalId" FROM old_rows WHERE "journalId" IS NOT NULL
    ) s
  LOOP
    IF NOT ledger_journal_balanced(jid) THEN
      RAISE EXCEPTION
        'Ledger journal % is unbalanced after update: debits % vs credits %', jid,
        (SELECT COALESCE(sum("debitMinor"), 0) FROM "LedgerEntry" WHERE "journalId" = jid),
        (SELECT COALESCE(sum("creditMinor"), 0) FROM "LedgerEntry" WHERE "journalId" = jid)
        USING ERRCODE = 'check_violation';
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS "LedgerEntry_balance_guard_ins" ON "LedgerEntry";
DROP TRIGGER IF EXISTS "LedgerEntry_balance_guard_upd" ON "LedgerEntry";
DROP TRIGGER IF EXISTS "LedgerEntry_balance_guard_del" ON "LedgerEntry";

CREATE TRIGGER "LedgerEntry_balance_guard_ins"
AFTER INSERT ON "LedgerEntry"
REFERENCING NEW TABLE AS new_rows
FOR EACH STATEMENT
EXECUTE FUNCTION ledger_balance_guard_insert();

CREATE TRIGGER "LedgerEntry_balance_guard_upd"
AFTER UPDATE ON "LedgerEntry"
REFERENCING NEW TABLE AS new_rows OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION ledger_balance_guard_update();

CREATE TRIGGER "LedgerEntry_balance_guard_del"
AFTER DELETE ON "LedgerEntry"
REFERENCING OLD TABLE AS old_rows
FOR EACH STATEMENT
EXECUTE FUNCTION ledger_balance_guard_delete();

COMMENT ON FUNCTION ledger_journal_balanced(text) IS
  'True when a journal satisfies sum(debitMinor) = sum(creditMinor).';
COMMENT ON FUNCTION ledger_balance_guard_insert() IS
  'Statement-level guard, INSERT leg. See 20261013120000_ledger_journal_balance_guard.';
COMMENT ON FUNCTION ledger_balance_guard_update() IS
  'Statement-level guard, UPDATE leg. Validates old and new journals.';
COMMENT ON FUNCTION ledger_balance_guard_delete() IS
  'Statement-level guard, DELETE leg. Removing a line can unbalance a journal.';