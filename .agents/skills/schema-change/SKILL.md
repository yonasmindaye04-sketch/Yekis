---
name: schema-change
description: Change the Yekis Prisma/Postgres schema safely, covering migration files, the fresh-database drift check, seed safety and the documentation that must follow. Use when adding or changing a model, field, index or relation, or when asked about migrations, the database schema, or Prisma.
---

# Schema change

The backend is `apps/backend`. Prisma lives in `apps/backend/prisma/` with
migrations in `apps/backend/prisma/migrations/`. The local database is
Postgres on **port 5433** (`marketplace` / `marketplace_dev_only`) — see
`docker-compose.yml`.

## Before you touch anything

- Read `docs/DATABASE.md` and `docs/PRISMA_RUNBOOK.md` for the current state.
- Check whether the change touches a financial object. `LedgerAccount`,
  `LedgerJournal`, `LedgerEntry` and `PayoutTransaction` are money; a mistake
  there is not recoverable by re-seeding.
- Never run `prisma migrate reset`, `prisma db push`, `pnpm db:seed` or any
  `scripts/*.sql` against anything but a local scratch database. Do not run
  them at all unless you were asked.

## Make the change

1. Edit `apps/backend/prisma/schema.prisma`.
2. Create the migration against the local dev database:

   ```powershell
   pnpm --filter backend prisma:migrate
   ```

   Give the migration a name that describes the change, not the tool
   (`add_dispute_evidence_table`, not `init`).
3. Inspect the generated SQL in `apps/backend/prisma/migrations/<name>/migration.sql`.
   Prisma cannot express everything — partial indexes, `CHECK` constraints,
   `ON DELETE` behaviour that differs from the default, and raw triggers all
   need hand-written SQL. Verify the generated file actually matches your
   intent.
4. Regenerate the client:

   ```powershell
   pnpm --filter backend prisma:generate
   ```

## Verify

```powershell
pnpm --filter backend db:check-fresh
```

This builds a scratch database from the migration files **alone** and fails on
any difference against `schema.prisma`. This is the step that catches the
dangerous class of bug: a migration that applies cleanly but omits an object
the schema declares, invisible until something queries the missing table.

Then run the backend suite and the route audit:

```powershell
pnpm --filter backend test
pnpm --filter backend route-audit:check
```

The suite calls `deleteMany()` and refuses to run against a database whose name
does not contain `_test`.

## Document it

Update `docs/DATABASE.md` with the new object, its fields, relations, indexes
and the migration name. Update `docs/API.md` if the change alters a request or
response shape, `docs/PROJECT_CONTEXT.md` if it alters the architecture, and
`docs/CHANGELOG.md` for the change itself. Then run
`node scripts/check-doc-parity.mjs`.

## Rollback

Migrations here are forward-only. If a migration is wrong, write a new
migration that reverses it — do not edit an already-applied migration file.
