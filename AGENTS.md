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

## Setup

```powershell
pnpm install
pnpm --filter backend prisma:generate
docker compose up -d          # Postgres on :5433, Redis on :6379, MinIO on :9000/:9001
```

Run the apps in separate terminals: `pnpm dev:backend` and `pnpm --filter frontend dev`.

## Checks

Run these before claiming a change is done. They mirror `.github/workflows/ci.yml`.

```powershell
node scripts/check-doc-parity.mjs                    # docs match the code
node scripts/scan-secrets.js                         # no committed credentials
pnpm --filter backend type-check                     # tsc --noEmit
pnpm --filter backend route-audit:check              # route baseline gate
pnpm --filter backend test                           # vitest (needs Postgres + Redis)
pnpm --filter frontend build                         # tsc -b && vite build
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
  logic of the codebase whenever modifications are made.
- Record every change, feature addition or update in the relevant documents:
  `docs/WALKTHROUGH.md`, `docs/COMPLETENESS_CHECKLIST.md`, `docs/API.md`,
  `docs/DATABASE.md`, `docs/PROJECT_CONTEXT.md`, `docs/ARCHITECTURE.md`,
  `docs/CHANGELOG.md`.
- `node scripts/check-doc-parity.mjs` fails CI when the docs drift from the
  code. Run it after touching anything user-visible.

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
