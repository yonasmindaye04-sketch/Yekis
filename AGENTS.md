# Working in this repository

Yekis is an Ethiopian freelance marketplace. This file is read by every coding
agent (DeepCode, OpenCode, Claude Code) that opens the repository, so it holds
the rules and commands a new contributor needs.

## Repository layout

| Path | What lives there |
|---|---|
| `apps/backend` | Express + TypeScript API. Prisma/Postgres, Redis (BullMQ), Telegram bot (grammy), Zod validation, Vitest. |
| `apps/frontend` | Vite + React 19 + Tailwind 4 SPA. Public pages, client workspace, staff/admin console, Telegram Mini App. |
| `packages/schemas` | Shared Zod schemas used by both apps. |
| `docs` | Project documentation. Treat it as part of the deliverable, not an afterthought. |
| `scripts` | Repository tooling: secret scanner, doc-parity check, migration helpers, tunnel scripts. |
| `Dockerfile`, `infra/docker` | The deployment image. One container serves the API, serves the built SPA and runs a Redis; `docs/ALETCLOUD_DEPLOYMENT.md` is the runbook. |

## Setup

```powershell
pnpm install
pnpm --filter backend prisma:generate
docker compose up -d          # Postgres on :5433, Redis on :6379, MinIO on :9000/:9001
```

Run the apps in separate terminals: `pnpm dev:backend` and `pnpm --filter frontend dev`.

To run the whole platform the way a deployment does — one process serving both the API and the built SPA, with its own Redis:

```powershell
docker build -t yekis:local .
docker run --rm -p 8080:8080 -e DATABASE_URL=... -e REDIS_URL=... yekis:local
```

`docs/SETUP.md` §11 has the full command; `docs/ALETCLOUD_DEPLOYMENT.md` has the deployment runbook, and `node scripts/check-deployment.mjs <base-url>` checks a deployed instance against the contract it has to meet.

## Checks

Run these before claiming a change is done. They mirror `.github/workflows/ci.yml`.

```powershell
node scripts/check-doc-parity.mjs                    # docs match the code
node scripts/scan-secrets.js                         # no committed credentials
pnpm --filter backend type-check                     # tsc --noEmit
pnpm --filter backend route-audit:check              # route baseline gate
pnpm --filter backend test                           # vitest (needs Postgres + Redis)
pnpm --filter frontend build                         # tsc -b && vite build
docker build -t yekis:check .                        # the deployment image
```

## Database safety — read before running any data command

- The backend suite calls `deleteMany()`. `apps/backend/tests/setup-env.ts` refuses
  any database whose name does not contain `_test`. Never point it at a
  non-test database.
- Local Postgres is published on **5433**, not 5432, to avoid a system install.
- `prisma migrate reset`, `prisma db push`, `pnpm db:seed`, `dropdb` and the
  scripts in `scripts/*.sql` are destructive. Never run them against anything
  that is not a local scratch database, and never without being asked.
- An unscoped filter once deleted every `Milestone` row. Scope every write.

## Documentation is part of the change

- Always update the relevant Markdown files to reflect the newest content and
  logic of the codebase whenever modifications are made — **in the same commit
  as the code**. A change that lands with the docs describing the previous
  behaviour is an incomplete change.
- `docs/SYSTEM_DESIGN.md` is the **canonical** description of how the platform
  works. It must have one deep-dive section per backend module, a matching
  table of contents, and a view map covering every frontend view. The
  doc-parity gate checks all of this.
- Never describe a stub as live, a plan as implemented, or a removed
  integration as available. Distinguish verified behaviour from mocks, stubs
  and planned work.
- Record every change in the relevant documents: `docs/WALKTHROUGH.md`,
  `docs/COMPLETENESS_CHECKLIST.md`, `docs/API.md`, `docs/DATABASE.md`,
  `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`, `docs/SYSTEM_DESIGN.md`,
  `docs/ROADMAP_ALIGNMENT.md`, `docs/COMPLIANCE_BLOCKERS.md`, and
  `docs/CHANGELOG.md`. **The changelog is the audit log of what changed** —
  what it was, why it was needed, and what it means for anyone integrating
  against the platform.
- `node scripts/check-doc-parity.mjs` fails CI when the docs drift from the
  code. Run it after touching anything user-visible. If a check fails, fix the
  **document** — never weaken the check.

## Frontend rules

- **Never use low-opacity background pill designs for status indicators** (e.g.
  `.status-pill`). Use bold text with a bold color design instead.
- **Theme-conditional CSS** (e.g. `:root[data-theme="dark"] ...`) may only ever
  change color, background, border-color, box-shadow and opacity. Layout and
  shape properties (width, height, padding, margin, gap, display, grid/flex,
  font-size, font-weight, line-height, letter-spacing, border-radius, position
  offsets) must be theme-invariant — define them once in un-themed base rules.
- Never remove a border in one theme (`border: 0`); recolor it at the same
  width instead.
- The audit methodology that enforces this lives in `docs/theme-parity/README.md`.
  Screenshots and geometry diffs under `docs/theme-parity/` are generated
  artifacts.

## Secrets and configuration

- Never commit credentials. `node scripts/scan-secrets.js` gates CI and prints
  only file names and line numbers.
- Provider keys belong in `apps/backend/.env` / `apps/frontend/.env` (gitignored)
  or in the OS credential store. `.env.example` holds placeholders only.
- `DEEPCODE_BASH_SCRUB_ENV=1` keeps credential-like variables out of the
  environment of agent-run shell commands.

## Working style

- Keep changes inside the boundaries of the task. Do not reformat unrelated
  files.
- Show the work: every edit surfaces as a diff, and a claim of completion needs
  the checks above to have passed.
- When you are unsure about a convention, read the neighbouring code first and
  match it.
