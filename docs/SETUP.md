# Local Setup

Last updated: 2026-11-10

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

### Demo accounts (`SEED_DEMO_PASSWORD`)

Seeding creates the local demo staff and seller accounts (`admin@yekis.et`,
`compliance@yekis.et`, `support@yekis.et`, `seller@yekis.et`). Their password is **not**
committed to the repository — it is read from `SEED_DEMO_PASSWORD` at seed time:

```powershell
# In apps/backend/.env (gitignored). Minimum 12 characters.
SEED_DEMO_PASSWORD=<a random local-only value>
```

Generate one with:

```powershell
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

Rules enforced by `prisma/seed.ts`:

- The variable is required (12+ characters) — the seed fails fast without it.
- The seed refuses to run when `NODE_ENV=production`.
- The value is never printed to the console or written to a log.
- The seed bumps `sessionVersion` on the demo accounts it updates, which revokes
  access and refresh tokens issued before the rotation.

Set it in `apps/backend/.env` (gitignored) rather than the repo-root `.env`; the
backend reads `apps/backend/.env` first.

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

- Frontend: `http://127.0.0.1:3000`
- API health: `http://127.0.0.1:4000/health`

Both dev servers bind to **loopback only** (`127.0.0.1`). The Vite dev server also
enforces a `Host` header allowlist, so opening it through a LAN IP or a tunnel
hostname requires adding that host to `ALLOWED_HOSTS` in
`apps/frontend/vite.config.ts`.

> Note: the root package currently has no generic `dev` script, and `dev:web` does not target the `frontend` package.

### Exposing the app publicly (tunnels)

The dev server must never be published to the internet: it serves the application
source over `/@fs/` and proxies `/api` to the backend. The tunnel helpers therefore
refuse to start unless you opt in explicitly:

```powershell
$env:ALLOW_DEV_TUNNEL = "1"
pnpm dev:tunnel
```

`ALLOW_DEV_TUNNEL=1` is required by both `pnpm dev:tunnel`
(`scripts/dev-with-tunnel.mjs`) and `pnpm tunnel:cloudflare`
(`scripts/start-cloudflare-tunnel.ps1`). The tunnel target is always
`http://127.0.0.1:<port>`. Stop the tunnel as soon as the demo ends — a quick
tunnel URL is public and unauthenticated for its whole lifetime.

For anything longer-lived, serve a production build (`pnpm --filter frontend build`)
from a static host instead of the dev server.

## 8. Verify Setup

Run these commands:

```powershell
docker compose ps
pnpm --filter backend test
pnpm --filter backend build
pnpm --filter frontend build
```

To populate a fresh database with the local demo accounts (requires
`SEED_DEMO_PASSWORD`, see [Demo accounts](#demo-accounts-seed_demo_password)):

```powershell
pnpm --filter backend db:seed
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
