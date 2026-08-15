# Prisma & Audit Log Runbook

## Local setup

```bash
pnpm install
docker compose up -d          # postgres (with pgaudit), redis, minio
cp apps/backend/.env.example apps/backend/.env   # then fill in secrets
pnpm --filter backend prisma:migrate             # creates tables, runs init migration
pnpm dev:backend
```

Health check: `curl http://localhost:4000/health`

## Locking down the AuditLog table (run once per environment, after first migration)

The `AuditLog` model must be genuinely append-only — not just "the app code
doesn't call update/delete", but enforced at the database role level, since
that's what actually satisfies the 10-year AML retention requirement against
a compromised application server or a careless future migration.

1. Create two roles: a migration role (used only by `prisma migrate deploy`,
   has full DDL rights) and an application runtime role (used by the running
   API server, has DML rights scoped down as below).

```sql
CREATE ROLE marketplace_migrator WITH LOGIN PASSWORD '...';
CREATE ROLE marketplace_app WITH LOGIN PASSWORD '...';

GRANT ALL ON ALL TABLES IN SCHEMA public TO marketplace_migrator;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO marketplace_app;
REVOKE UPDATE, DELETE ON "AuditLog" FROM marketplace_app;
```

2. Point `DATABASE_URL` for the running API server at `marketplace_app`, and
   use a separate `MIGRATE_DATABASE_URL` (or a one-off connection string) for
   `marketplace_migrator` when running migrations in CI/CD.

3. Re-run the `REVOKE` statement after every migration that touches
   `AuditLog`, since some migration tools re-grant default privileges.

## Why a custom Postgres image

`pgaudit` isn't included in the default `postgres` Docker image. This repo
builds it in via `infra/postgres/Dockerfile`, which installs the
`postgresql-16-pgaudit` package from the same PGDG apt repo already
configured in the base image. Use the equivalent managed extension (most
managed Postgres providers, including ones based on RDS-compatible engines,
support `pgaudit` as an add-on extension — confirm with whichever Ethiopian
hosting provider is finally selected, per the infra data-residency decision).
