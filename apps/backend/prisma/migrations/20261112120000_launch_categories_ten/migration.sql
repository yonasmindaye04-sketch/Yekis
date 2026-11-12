-- Phase 0 launch category lock (2026-11-12).
--
-- The launch subcategory list was widened from six to ten. The four added
-- values are the Roadmap's own second-sector candidates (Video Production,
-- Accounting & Bookkeeping, Legal Research) plus Data Analytics, which
-- extends the existing data taxonomy.
--
-- ALTER TYPE ... ADD VALUE cannot run inside a transaction block on
-- PostgreSQL < 12, so each value is added on its own. The IF NOT EXISTS and
-- the duplicate_object guard keep this re-runnable on a database that was
-- patched by hand rather than by this migration.

DO $$ BEGIN
    ALTER TYPE "LaunchCategory" ADD VALUE IF NOT EXISTS 'VIDEO_PRODUCTION';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE "LaunchCategory" ADD VALUE IF NOT EXISTS 'ACCOUNTING_BOOKKEEPING';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE "LaunchCategory" ADD VALUE IF NOT EXISTS 'LEGAL_RESEARCH';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TYPE "LaunchCategory" ADD VALUE IF NOT EXISTS 'DATA_ANALYTICS';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
