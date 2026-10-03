# Local Setup

Last updated: 2026-08-10

## 1. Overview

This guide describes the local environment setup for the Yekis repository.

Use PowerShell examples on Windows. Equivalent shell commands are fine on macOS/Linux.

## 2. Prerequisites

- Node.js 20 or newer
- pnpm 9 or newer
- Docker Desktop/Engine with Compose
- Git

## 3. Install pnpm

If `pnpm` is not installed, run one of these commands:

```powershell
npm install -g pnpm
```

or with Corepack:

```powershell
corepack enable
corepack prepare pnpm@9 --activate
```

Verify installation:

```powershell
pnpm --version
```

## 4. Install Dependencies

From the repository root:

```powershell
pnpm install
```

If install skips package build scripts or Prisma binaries are missing, run:

```powershell
pnpm install --ignore-scripts=false
```

Then verify backend Prisma support:

```powershell
pnpm --filter backend prisma:generate
```

> **Note:** For a full list of database commands (migrations, resetting, and viewing data), see the [`docs/PRISMA_RUNBOOK.md`](docs/PRISMA_RUNBOOK.md).

## 5. Configure Environment Files

Copy the example backend env file:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
```

Confirm the following groups are configured in `apps/backend/.env`:

- Runtime: `NODE_ENV`, `PORT`
- Database: `DATABASE_URL`, `REDIS_URL`
- JWT: access and refresh secrets
- Object storage: endpoint, bucket, access key, secret key
- Provider credentials: Telebirr/CBE (CBE_WEBHOOK_SECRET) and webhook secret
- Policy values: minimum age, withholding threshold/rates, auto-release days
- Observability: `SENTRY_DSN`

For the frontend, copy its example env file:

```powershell
Copy-Item apps/frontend/.env.example apps/frontend/.env
```

Configurable groups in `apps/frontend/.env`:

- Google OAuth: `VITE_GOOGLE_CLIENT_ID` (must match the backend `GOOGLE_CLIENT_ID`)
- Analytics: `VITE_GA_MEASUREMENT_ID` (GA4 `G-…` ID; leave empty to disable — analytics only loads in production builds and only after cookie consent, so keeping it empty locally is the norm). See the "Analytics (GA4)" section of the frontend README.

> Blank provider credentials use development stub behavior only.

## 6. Start Local Infrastructure

From the repo root:

```powershell
docker compose up -d
```

### Local services

| Service | Address | Local credentials |
|---|---|---|
| PostgreSQL | `localhost:5433` | `marketplace` / `marketplace_dev_only` |
| Redis | `localhost:6379` | None |
| MinIO API | `http://localhost:9000` | `marketplace` / `marketplace_dev_only` |
| MinIO console | `http://localhost:9001` | Same credentials as API |

PostgreSQL uses `5433` to avoid collisions with native installations on `5432`.

## 7. Run the Application

Use separate terminals:

```powershell
pnpm dev:backend
```

```powershell
pnpm --filter frontend dev
```

### Open in browser

- Frontend: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:4000/health`

> Note: the root package currently has no generic `dev` script, and `dev:web` does not target the `frontend` package.

## 8. Verify Setup

Run these commands:

```powershell
docker compose ps
pnpm --filter backend test
pnpm --filter backend build
pnpm --filter frontend build
```

Check health:

```powershell
Invoke-RestMethod http://127.0.0.1:4000/health
```

Expected response:

```json
{ "status": "ok" }
```

## 9. Migrations and Schema Changes

Create a new Prisma migration and regenerate the client:

```powershell
pnpm --filter backend prisma:migrate -- --name describe_change
pnpm --filter backend prisma:generate
```

Do not manually edit applied SQL.

## 10. Common Issues

- `pnpm` not found: install with `npm install -g pnpm` or enable Corepack.
- `prisma` binary missing: rerun `pnpm install --ignore-scripts=false` and then `pnpm --filter backend prisma:generate`.
- Wrong database port: confirm `DATABASE_URL` uses `localhost:5433`.
- MinIO upload failure: verify `9000/9001`, credentials, and container health.
- Queue worker issues: ensure Redis is running and backend starts successfully.
- Provider webhook failure: send raw JSON with the expected HMAC.

See `TROUBLESHOOTING.md` for further diagnostics and `WALKTHROUGH.md` for verification scenarios.
