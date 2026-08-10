# Yekis

Yekis is an Ethiopian freelance marketplace for verified clients and freelancers. It connects job discovery, proposals, service agreements, milestone escrow, delivery review, disputes, wallet balances, withdrawals, compliance review, and audit history in one workflow.

## Current Status

The complete marketplace journey is wired through the React frontend and Express API and has been exercised locally against PostgreSQL, Redis, and MinIO. The production payment and identity-provider boundaries remain intentionally explicit: Fayda and PEP checks use development mocks, payment collection uses provider adapters and signed webhooks, and wallet withdrawals are handled locally until a live payout provider is connected.

## Product Journey

1. A user registers, passes the age gate, and completes Tier 1 KYC.
2. A verified client posts a job; a verified freelancer submits a proposal.
3. The client accepts one proposal, which atomically closes competing proposals and generates a PDF contract.
4. Both parties sign independently, then the client funds a contract milestone.
5. A signed payment webhook moves the milestone into escrow.
6. The freelancer submits work; the client accepts it or the five-day auto-release timer completes.
7. Release credits the freelancer wallet after platform fees and withholding.
8. Either party can open a milestone dispute that progresses through negotiation, evidence, mediation, and arbitration.
9. Tier 2 verification gates withdrawals and routes mismatches to staff review.

See [WALKTHROUGH.md](WALKTHROUGH.md) for diagrams, roles, state transitions, and verified scenarios.

## Repository Layout

| Path | Purpose |
|---|---|
| `apps/backend` | Express API, Prisma data layer, services, queues, workers, and tests |
| `apps/frontend` | React/Vite browser and Telegram Mini App experience |
| `packages/schemas` | Shared Zod request schemas and TypeScript types |
| `infra` | PostgreSQL and local infrastructure support |
| `docs` | Supporting product and legal documentation |
| `resource_to_read` | Reference material; not authoritative implementation documentation |

## Quick Start

Requirements: Node.js 20+, pnpm 9+, and Docker.

```bash
pnpm install
docker compose up -d
Copy-Item apps/backend/.env.example apps/backend/.env
pnpm --filter backend prisma:generate
pnpm --filter backend prisma:migrate
```

Run these in separate terminals:

```bash
pnpm dev:backend
pnpm --filter frontend dev
```

- Frontend: `http://127.0.0.1:5173`
- API health: `http://127.0.0.1:4000/health`
- MinIO console: `http://127.0.0.1:9001`

The local PostgreSQL host port is `5433`. Follow [SETUP.md](SETUP.md) for environment details and verification commands.

## Documentation Map

| Document | Use it for |
|---|---|
| [WALKTHROUGH.md](WALKTHROUGH.md) | Complete user and staff journey, diagrams, and verified scenarios |
| [PROJECT_CONTEXT.md](PROJECT_CONTEXT.md) | Product intent, scope, assumptions, status, and production gaps |
| [ARCHITECTURE.md](ARCHITECTURE.md) | Components, request flow, state machines, and reliability controls |
| [API.md](API.md) | Current route catalog and key payloads |
| [DATABASE.md](DATABASE.md) | Prisma entities, relationships, invariants, and migrations |
| [SETUP.md](SETUP.md) | Local setup, ports, commands, and troubleshooting entry points |
| [COMPLETENESS_CHECKLIST.md](COMPLETENESS_CHECKLIST.md) | Delivery and production-readiness matrix |
| [CHANGELOG.md](CHANGELOG.md) | Chronological record of changes |
| [DECISIONS.md](DECISIONS.md) | Durable architectural and product decisions |

## Verification

```bash
pnpm --filter backend test
pnpm --filter backend build
pnpm --filter frontend build
```

The frontend/API linkage suite covers proposal payload conversion, escrow funding identifiers, contract signing, disputes, Tier 2 requests, and withdrawals. The full journey has also been verified manually against live local infrastructure.

## Documentation Rule

Every code change must update the relevant Markdown source of truth and add an entry to `CHANGELOG.md`. This requirement is stored in `.agents/AGENTS.md` for future work on this repository.
