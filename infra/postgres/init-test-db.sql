-- Creates the separate database used by the automated test suite.
--
-- WHY THIS EXISTS
-- The backend tests used to run against the development database
-- (`marketplace`). That is unsafe: several suites call deleteMany(), and one
-- bug deleted every Milestone row in the database. A test suite must never be
-- able to destroy development data, so tests now target `marketplace_test`.
--
-- Only the TEST database is created here. No tables, no schema: the schema is
-- built by `prisma migrate deploy`, which the vitest globalSetup runs against
-- DATABASE_URL_TEST on every run (see apps/backend/tests/global-setup.ts).
--
-- IF THIS DOES NOT RUN
-- This file is only executed when the Postgres data directory is first
-- initialised. On an existing volume the entrypoint skips
-- /docker-entrypoint-initdb.d entirely. Run the equivalent by hand:
--
--   docker exec yekis-postgres-1 psql -U marketplace -d marketplace \
--     -c "CREATE DATABASE marketplace_test;"
--
-- CREATE DATABASE cannot run inside a transaction block, which is why this is
-- a standalone statement and not part of a BEGIN/COMMIT wrapper.

SELECT 'CREATE DATABASE marketplace_test'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'marketplace_test')
\gexec