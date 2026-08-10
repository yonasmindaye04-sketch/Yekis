# Ethiopian Freelance Marketplace — Backend Starter

This is the Phase 0/1 backend scaffold: enough working structure to run
locally, register a user, and see the auto-release job queue actually fire —
everything else in the roadmap builds into this shape rather than replacing it.

## What's here

```
apps/backend/            Express + TypeScript API
  src/
    config/env.ts         Validated environment config (fails fast if misconfigured)
    lib/                  Prisma client, Redis client, logger, audit-log helper
    middleware/            requireAuth (JWT) and requireKycVerified (the AML hard-block)
    modules/auth/          Working example: register (with age gate) + login
    queue/                 BullMQ queues + the auto-release worker
    app.ts / server.ts     Express app assembly and entry point
  prisma/schema.prisma     Full data model: users, tiered KYC, jobs, contracts,
                           escrow state machine, disputes, append-only audit log
  prisma/README.md         How to lock the audit log down at the DB role level
packages/schemas/          Zod schemas shared by backend, web frontend, and
                           (later) the Telegram Mini App — one source of truth
infra/postgres/            Custom Postgres image with pgaudit compiled in
docker-compose.yml         Local dev: Postgres (w/ pgaudit), Redis, MinIO
```

## What's deliberately NOT here yet

This scaffold proves the foundation works — it does not implement every
module from the roadmap. Left as the next build steps, in roughly this order:

1. **KYC module** — Fayda API integration, document upload to the object
   store, the manual review queue, Fayda-based deduplication.
2. **Jobs/Proposals routes** — the Zod schemas already exist in
   `packages/schemas`; wire up the Express routes and Prisma queries.
3. **Contract engine** — PDF generation from the Service Agreement template,
   digital acceptance with immutable timestamping.
4. **Escrow/payment module** — Telebirr/Chapa/CBE webhook handlers (verify
   signatures before trusting any payload), the fee-calculation and
   withholding-tax logic, wiring milestone submission to actually schedule
   the auto-release queue jobs this scaffold's worker expects.
5. **TMS (transaction monitoring)** — the structuring/velocity/pass-through/
   wallet-mismatch rules, the compliance review queue.
6. **Dispute module** — Stages 1–4, evidence-package compilation.

## Getting started

```bash
pnpm install
docker compose up -d
cp apps/backend/.env.example apps/backend/.env
# generate real secrets:
#   openssl rand -base64 48
pnpm --filter backend prisma:migrate
pnpm dev:backend
```

Then:

```bash
curl http://localhost:4000/health

curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "phone": "+251911223344",
    "password": "a-real-password-here",
    "languagePreference": "en",
    "role": "FREELANCER",
    "dateOfBirth": "2000-01-01",
    "consents": { "kycDataProcessing": true }
  }'
```

A registration below the minimum contracting age (`MINIMUM_CONTRACTING_AGE`
in `.env`) returns `403 AGE_RESTRICTED` — that's the Phase 1 capacity gate
working as designed.

## Conventions worth keeping as the codebase grows

- **Money is always integer minor units** (ETB cents), never floats. See
  the `Money` schema in `packages/schemas`.
- **Every compliance-relevant event calls `recordAuditEvent`** — escrow
  state changes, KYC status changes, dispute events, admin actions.
- **Payment webhook handlers verify signatures before touching business
  logic** — never trust a webhook payload just because it hit your endpoint.
- **Workers run as a separate process from the API in production** — the
  scaffold imports the worker into `server.ts` for local-dev simplicity
  only; split them before deploying so a traffic spike on one doesn't
  starve the other.
