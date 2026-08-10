# Local Setup

Last updated: 2026-08-07

## Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- Docker Desktop/Engine with Compose
- PowerShell examples below; equivalent shell commands are fine

## Install And Configure

From the repository root:

```powershell
pnpm install
docker compose up -d
Copy-Item apps/backend/.env.example apps/backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate
```

The example environment is ready for local infrastructure. Replace JWT secrets before shared or long-lived use.

## Local Services

| Service | Address | Local credentials |
|---|---|---|
| PostgreSQL | `localhost:5433` | `marketplace` / `marketplace_dev_only` |
| Redis | `localhost:6379` | None |
| MinIO API | `http://localhost:9000` | `marketplace` / `marketplace_dev_only` |
| MinIO console | `http://localhost:9001` | Same as MinIO API |

PostgreSQL intentionally uses host port `5433` to avoid collisions with a native PostgreSQL installation on `5432`. The custom image preloads pgaudit.

## Run The Application

Use separate terminals:

```powershell
pnpm dev:backend
```

```powershell
pnpm --filter frontend dev
```

Open:

- Frontend: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:4000/health`

The root currently has no `dev` script, and `dev:web` targets a package name that does not match `frontend`; use the commands above.

## Environment Groups

`apps/backend/.env.example` documents the complete local set:

- Runtime: `NODE_ENV`, `PORT`
- Data: `DATABASE_URL`, `REDIS_URL`
- JWT: access/refresh secrets and TTLs
- Object storage: endpoint, bucket, access key, secret key
- Providers: Telebirr/Chapa credentials and webhook secret
- Policy: minimum age, withholding threshold/rates, auto-release days
- Observability: `SENTRY_DSN`

Blank provider credentials mean the development adapter/stub behavior is used. Do not interpret a locally completed provider workflow as proof of live fund movement.

## Verification

```powershell
docker compose ps
pnpm --filter backend test
pnpm --filter backend build
pnpm --filter frontend build
```

Expected results as of 2026-08-07:

- PostgreSQL, Redis, and MinIO report running/healthy.
- Backend tests pass, including three frontend/API linkage tests.
- Backend TypeScript build passes.
- Frontend TypeScript and Vite production build pass.

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/health
```

Expected response:

```json
{ "status": "ok" }
```

## Reset And Migrations

For ordinary schema updates, create a new Prisma migration; do not edit applied SQL.

```powershell
pnpm --filter backend prisma:migrate -- --name describe_change
pnpm --filter backend prisma:generate
```

Removing Docker volumes destroys local data. Only do that deliberately after confirming no test or development records are needed.

## Common Issues

- Prisma authentication reaches the wrong database: verify `DATABASE_URL` uses port `5433`.
- pgaudit startup failure: rebuild the custom PostgreSQL image and confirm Compose passes `shared_preload_libraries=pgaudit`.
- MinIO upload failure: confirm ports `9000/9001`, credentials, and container health; the development bucket is created automatically.
- Queue actions do not run: confirm Redis is available and start the backend through `src/server.ts`, which starts workers.
- Provider webhook is rejected: send the raw JSON body with the HMAC expected by the selected provider adapter.

See `TROUBLESHOOTING.md` for deeper database notes and `WALKTHROUGH.md` for functional verification scenarios.
