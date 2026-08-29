# Troubleshooting Guide

This document records solutions to common issues encountered during development, specifically regarding local environment setup and database initialization.

## Database & Docker Issues

### 1. Prisma Migrate Fails with "Authentication failed against database server at 'localhost'"

**Symptoms:**
- Running `pnpm --filter backend prisma:migrate` fails with error code `P1000`.
- The error message states: `Authentication failed against database server at 'localhost', the provided database credentials for 'marketplace' are not valid.`
- This happens even if `docker-compose up -d` reports that the PostgreSQL container is running and healthy.

**Root Cause:**
A native Windows PostgreSQL installation is running on the host machine and is already occupying the default PostgreSQL port `5432`. Prisma connects to `localhost:5432` and reaches the host's native PostgreSQL instance instead of the Docker container, leading to a credentials mismatch.

**Fix:**
The Docker container port has been remapped from `5432` to `5433` to prevent this conflict.
1. `docker-compose.yml` maps `5433:5432` for the `postgres` service.
2. The `.env` and `.env.example` files specify the connection string with port `5433`:
   `DATABASE_URL=postgresql://marketplace:marketplace_dev_only@localhost:5433/marketplace`

If you encounter similar port conflicts for Redis or MinIO, you can change their mapped ports in `docker-compose.yml` and update the corresponding `.env` variables.

### 2. PostgreSQL Container Crashes on Startup (pgaudit error)

**Symptoms:**
- `docker ps` shows the `Yekis_jobs-postgres-1` container in an `Exited` state immediately after startup.
- `docker logs Yekis_jobs-postgres-1` shows the error:
  `ERROR: pgaudit must be loaded via shared_preload_libraries`

**Root Cause:**
The custom PostgreSQL image installs the `pgaudit` extension, which is required for the `AuditLog` table structure. However, `pgaudit` cannot be loaded using just `CREATE EXTENSION pgaudit` in `init.sql`; it must be pre-loaded by the PostgreSQL server at startup via the `shared_preload_libraries` configuration.

**Fix:**
The `docker-compose.yml` file is configured to pass this parameter directly as a command argument to the Postgres service:
```yaml
  postgres:
    build:
      context: ./infra/postgres
    command: ["postgres", "-c", "shared_preload_libraries=pgaudit"]
```

### 3. Prisma Client Errors with SCRAM-SHA-256 Authentication

**Symptoms:**
- Connecting to the PostgreSQL container from the host machine fails with password authentication errors, even when the password is correct.
- `pg_hba.conf` uses `scram-sha-256` for host connections.

**Root Cause:**
Older versions of Prisma or native client libraries on the host might have issues negotiating `scram-sha-256` authentication over TCP with a Docker container.

**Fix:**
The database initialization script (`infra/postgres/init.sql`) configures the system to use `md5` password encryption for local development and updates the `marketplace` user's password format to `md5`.
```sql
ALTER SYSTEM SET password_encryption = 'md5';
SELECT pg_reload_conf();
ALTER USER marketplace WITH PASSWORD 'marketplace_dev_only';
```
*(Note: Production environments should strictly use `scram-sha-256` and restrict connections via IP allowlists.)*

### 4. Enforcing AuditLog Append-Only Rules

**Context:**
The platform is required to maintain a 10-year AML audit log that cannot be modified.

**Implementation:**
After running the initial `prisma:migrate` which creates the tables, the `UPDATE` and `DELETE` permissions on the `AuditLog` table are revoked from the `marketplace` user. This ensures that even if application logic attempts to mutate an audit log, the database will reject the transaction.

Command used to enforce this (already applied to the local development DB):
```sql
REVOKE UPDATE, DELETE ON "AuditLog" FROM marketplace;
```
