---
name: release-check
description: Run the full Yekis CI gate and reconcile the Markdown documentation before a change is called done. Use when finishing a feature, preparing a pull request, or when asked to verify, check, or "make sure it builds".
compatibility: node20+, pnpm 9, docker
---

# Release check

The gate below mirrors `.github/workflows/ci.yml`. Run it in order and fix what
fails. A change is not done until every step passes.

## 1. Fast gates (no infrastructure needed)

```powershell
node scripts/check-doc-parity.mjs
node scripts/scan-secrets.js
pnpm --filter backend type-check
pnpm --filter backend route-audit:check
pnpm --filter frontend build
```

`scripts/scan-secrets.js` prints file names and line numbers only. It has
previously reported "clean" while being unable to match a shape another scanner
matched, so if it errors, read the output rather than assuming it passed.

## 2. Backend tests (needs infrastructure)

```powershell
docker compose up -d
pnpm --filter backend prisma:generate
pnpm --filter backend test
```

The suite calls `deleteMany()`. `apps/backend/tests/setup-env.ts` refuses any
database whose name does not contain `_test`, and it refuses to run at all
without `DATABASE_URL_TEST` pointing at a scratch database. Never point it at a
database you care about.

## 3. Fresh-database migration check (needs infrastructure)

```powershell
pnpm --filter backend db:check-fresh
```

This builds a scratch database from the migration files alone and fails on any
difference against `schema.prisma`. A migration that succeeds can still omit an
object the schema declares — `LedgerAccount`, `LedgerJournal`, `LedgerEntry` and
`PayoutTransaction` were exactly that, invisible until something queried the
missing table.

## 4. Documentation reconciliation

After the code is green, update the documents the change actually affects:

- `docs/WALKTHROUGH.md` — user-facing flows
- `docs/API.md` — endpoints, request/response shapes, status codes
- `docs/DATABASE.md` — schema, relations, indexes, migrations
- `docs/PROJECT_CONTEXT.md` — architecture and current state
- `docs/COMPLETENESS_CHECKLIST.md` and `docs/EXTENDED_COMPLETENESS_CHECKLIST.md` — progress
- `docs/ARCHITECTURE.md`, `docs/FLOW.md`, `docs/SYSTEM_DESIGN.md` — when the design changes
- `docs/CHANGELOG.md` — every change, feature or update
- `docs/SECURITY.md` / `docs/security/` — when trust boundaries or credential handling change

Then re-run `node scripts/check-doc-parity.mjs`; it is the CI gate for drift.

## Reporting

State which steps passed, which failed, and what you changed. If a step cannot
run (no Docker, no Chrome, missing credentials), say so explicitly instead of
implying it passed.
