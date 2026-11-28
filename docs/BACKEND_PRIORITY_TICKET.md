# Backend Priority Ticket: `pnpm --filter backend test` Pre-Existing Failures (2026-11-28)

**Priority:** High (Release Gate Blocker for `main`)
**Scope:** Backend integration test suite (`apps/backend/tests/`) — baseline on clean `main` (`47eee3d`) is `71 passed | 6 failed` of 77 files (`758 passed | 16 failed` of 774 tests). Re-run on `feat/client-ux-simplification` after commit `23c5396` passed `74 passed | 3 failed` of 77 files (`761 passed | 13 failed` of 774 tests; zero regressions, see diff below).
**Origin:** Pre-existing on `main` (zero backend production code edits on `feat/client-ux-simplification`).

### Baseline Diff (`feat/client-ux-simplification` vs `main` `47eee3d`)

- **Still failing (identical to `main` — 3 files, 13 tests):**
  - `tests/bot-error-resilience.test.ts` (2 tests): `TELEGRAM_BOT_TOKEN is not configured`.
  - `tests/bot-updates.test.ts` (10 tests): `TELEGRAM_BOT_TOKEN is not configured`.
  - `tests/withdrawal-2fa.test.ts` (1 test): `answers 503, not 500, when the SMS provider cannot deliver the code` (receives `200` via dev-code fallback when `isDevCodeDisclosureAllowed()` is `true`).
- **Resolved or intermittently passing vs `main` (3 files, 3 tests):**
  - `tests/auto-credit-audit.test.ts` (1 test): Fixed on branch (`c211e98`) by replacing the `requireStaffRole(` source grep with an explicit `topups.review` permission + route enforcement test (`12/12` passed).
  - `tests/payout-atomicity.test.ts` (1 test, intermittent `P2028`): Passed in the `74/77` branch run; fails (`fulfilled = []` with Prisma `P2028`) under higher connection-pool pressure (observed on `main`, an earlier branch run, and standalone `Promise.allSettled([CONFIRMED, FAILED])` reproduction).
  - `tests/federated-kyc-not-verified.test.ts` (1 test): Passed in the branch run when `S3_BUCKET` matched the running `yekis-s3mock` instance (failed with `NoSuchBucket` in the earlier `main` snapshot).

---

## Track A — Priority Code & Guard Verification (3 files)

### 1. `tests/payout-atomicity.test.ts` (Race condition / settlement atomicity)
- **Failure:** `settlePayout cannot settle the same payout twice > concurrent CONFIRMED and FAILED settle exactly one` (`apps/backend/tests/payout-atomicity.test.ts:498`) — `Promise.allSettled([CONFIRMED, FAILED])` returned `fulfilled = []` (expected `1`).
- **Implementation file:** `apps/backend/src/modules/admin/payoutAdmin.service.ts:26-160`.
- **Action needed:** Reproduce why both concurrent transactions rejected (likely Prisma transaction serialization/deadlock or stale status error handling) so exactly one branch succeeds and the loser throws `InvalidPayoutStateError`.

### 2. `tests/auto-credit-audit.test.ts` (Top-up approval RBAC check)
- **Failure:** `LOCK (source text) — no auto-credit path is unguarded > the staff approval route is staff-only` (`apps/backend/tests/auto-credit-audit.test.ts:151`) asserts `topup.routes.ts` `/:topUpId/approve` contains `requireStaffRole(`, whereas `apps/backend/src/modules/topups/topup.routes.ts:326-342` uses `requireAuth, requirePermission("topups.review")`.
- **RBAC Strictness Verification (`apps/backend/src/modules/admin/permissions.ts`):**
  - `requirePermission("topups.review")` queries `prisma.user.findUnique({ where: { id: req.user.id }, select: { staffRole: true } })` on every request and rejects non-permitted roles with `403 PERMISSION_DENIED`.
  - Under `ROLE_PERMISSIONS`, **only** `SUPER_ADMIN`, `ADMIN`, `COMPLIANCE_ADMIN`, and `COMPLIANCE_OFFICER` hold `"topups.review"`. `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, and `SUPPORT` are all denied (matching the legacy `requireStaffRole("ADMIN", "COMPLIANCE_OFFICER")` boundary plus the canonical `COMPLIANCE_ADMIN` / `SUPER_ADMIN` additions).
- **Action needed:** Confirm in runtime RBAC integration tests that non-compliance/non-admin staff and regular users receive `403` on `/:topUpId/approve`, then update `auto-credit-audit.test.ts:151` to accept `requirePermission("topups.review")` (and verify `"topups.review"` role membership).

### 3. `tests/withdrawal-2fa.test.ts` (`SMS_UNAVAILABLE` status under dev disclosure)
- **Failure:** `a withdrawal needs an SMS approval code > answers 503, not 500, when the SMS provider cannot deliver the code` (`apps/backend/tests/withdrawal-2fa.test.ts:155`) received HTTP `200` instead of `503`.
- **Root cause:** In `apps/backend/src/modules/auth/phone-verification.service.ts:207-236`, when `sendSms` returns `{ sent: false, reason: "not_configured" }` and `isDevCodeDisclosureAllowed()` is `true` (local/test env without `PUBLIC_ORIGIN` blocking dev code disclosure), the handler falls back to console dev-code delivery (`deliveredChannel = "dev"`) and returns `200`. A `503 PhoneCodeDeliveryFailedError` is only thrown in the `else` branch for a hard SMS failure when SMS is configured or when `isDevCodeDisclosureAllowed()` is `false`.
- **Action needed:** Clarify whether `withdrawal-2fa.test.ts:147` should mock a hard SMS failure / disable dev disclosure in that test case, or whether `reason: "not_configured"` should still fail closed on `WITHDRAWAL` OTP when `sendSms` was explicitly invoked.

---

## Track B — Separate Test Environment Setup (2 integrations, 3 files)

Fix test harness / `.env.test` fixtures separately from Track A:

1. **Telegram Bot Tests (`tests/bot-error-resilience.test.ts` — 2 tests; `tests/bot-updates.test.ts` — 10 tests):**
   - Fail with `Error: TELEGRAM_BOT_TOKEN is not configured` when local `.env` leaves `TELEGRAM_BOT_TOKEN` empty. Provide a deterministic test fallback token in test setup or stub `env.TELEGRAM_BOT_TOKEN` in the bot test helper.
2. **Object Store Bucket (`tests/federated-kyc-not-verified.test.ts` — 1 test):**
   - Fails with `NoSuchBucket: The specified bucket does not exist.` when local `S3_BUCKET` in `.env` does not match the pre-created buckets in `yekis-s3mock` (`ci-test`, `marketplace`, `yekis-ci-test`, `yekis-dev`), or ensure the test helper creates the configured bucket if missing.

---

## Track C — Configuration, Concurrency & Runtime Image Hardening (3 Tickets)

### 4. `NODE_ENV` default fails open (`apps/backend/src/config/env.ts`)
- **Finding:** `EnvSchema.NODE_ENV` (`apps/backend/src/config/env.ts:30-39`) uses `.default("development")`, and `isDevCodeDisclosureAllowed()` (`env.ts:951-953`) returns `env.NODE_ENV === "development" || env.NODE_ENV === "test"`.
- **Risk:** If `NODE_ENV` is accidentally omitted on a non-local host, the server silently boots with development semantics and allows dev-code disclosure/fallback (`200` with console-logged OTP when mail/SMS is `not_configured`, matching why `tests/withdrawal-2fa.test.ts:155` returns `200` instead of `503`) rather than failing closed.
- **Action needed:** Change `EnvSchema.NODE_ENV` so omitted values fail closed (require explicit `NODE_ENV` or default to `"production"`), or isolate OTP dev-code disclosure behind an explicit opt-in flag guarded by startup safety checks that refuse non-local origins.

### 5. Prisma `P2028` handling and connection pool sizing (`apps/backend/src/lib/prisma.ts`, `apps/backend/src/modules/admin/payoutAdmin.service.ts`)
- **Finding:** `apps/backend/src/lib/prisma.ts:11` instantiates `new PrismaClient()` with Prisma's default connection pool and interactive `$transaction` `maxWait` (`2000ms`). Running `Promise.allSettled([CONFIRMED, FAILED])` in `tests/payout-atomicity.test.ts:498` causes the concurrent caller (and under heavy suite/pool contention, both callers) to reject with `PrismaClientKnownRequestError` code **`P2028`** (`"Transaction API error: Unable to start a transaction in the given time."`) rather than `InvalidPayoutStateError`.
- **Action needed:** Configure explicit Postgres connection pool limits / timeouts (`connection_limit`, `pool_timeout`) and appropriate interactive `$transaction({ maxWait, timeout })` settings, use explicit row locking / bounded retry on transient lock contention in `settlePayout()`, and handle `P2028` deterministically so racing settlement callers return a clean domain conflict (`InvalidPayoutStateError`) instead of an unhandled `P2028`.

### 6. Runtime Docker image ships full `devDependencies` (`Dockerfile`)
- **Finding:** `docker history yekis:check` shows a `769MB` runtime layer from `COPY --chown=node:node /app/node_modules ./node_modules` (`Dockerfile:144-150`), yielding `289MB` compressed (`1.36GB` unpacked). The full workspace `node_modules` (including `typescript`, `vitest`, ESLint, Playwright/build tooling) is carried into the runtime image so `prisma migrate deploy` can run at container startup (`.dockerignore` was verified clean).
- **Action needed:** Prune runtime dependencies (`pnpm deploy --prod` or isolated runtime package installation) and copy only the minimal Prisma CLI / engine runtime needed for migrations into the final stage to reduce image footprint and runtime dependency surface area.
