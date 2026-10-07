# Phase 0 Report — Safety Net and Baseline

Plan: `docs/hardening/MAPPING.md` maps every path named in the implementation
plan to the real tree. Date: 2026-10-05. Base commit: `3175676`.

**Starting state was not green.** The working tree arrived mid-refactor with
29 TypeScript errors and 35 failing tests, all uncommitted. Phase 0 therefore
began by repairing the baseline, because every acceptance criterion in this
phase ("`npm test` runs green in CI") is unreachable otherwise.

| | Before | After |
| --- | --- | --- |
| `tsc --noEmit` | 29 errors | 0 |
| `vitest run` | 35 failed / 109 passed | **219 passed / 219** |
| Test files | 19 (3 failing) | 25 (all passing) |
| Routes under an inventory | none | 165, baseline committed |
| CI | could not run at any step | 3 working steps |

---

## 1. Tasks completed

| ID | Status | Notes |
| --- | --- | --- |
| T0.0 | done | `docs/hardening/MAPPING.md`. Every plan path resolved; absent files listed. |
| T0.1 | done | `scripts/route-audit.ts`, 165-route inventory, committed baseline, 3-identity replay, two allowlists, CI gate. |
| T0.2 | done | `assertProductionSafety` + boot-time refusal. 12 tests. |
| T0.3 | done | supertest added; fake Bot API recorder; initData/widget/PKCE fixture signers; CI Postgres + Redis service containers. |
| T0.4 | done | Recursive log scrubber, bot-token text scrubber, hashed Telegram ids, no message/callback text in bot logs. 17 tests. |
| T0.5 | done | `TRUST_PROXY_HOPS`, Redis IP limiter keyed on `req.ip`. 5 tests including a discriminating control. |
| T0.6 | done | `telegramUserId` was **already** BigInt. Closed the real residue: string session ids, BigInt-safe JSON, boundary conversion. 13 tests. |

### Prerequisite: baseline repair (not in the plan, unavoidable)

A prior in-flight edit had deleted the OTP helpers (`resolveOrProvisionTelegramUser`,
`normalizeCode`, `issueTelegramLoginCode`, `redeemTelegramLoginCode`,
`TelegramCodeError`, `TELEGRAM_CODE_TTL_SECONDS`) while four callers still
referenced them. Repaired by **fixing forward**, per your instruction — the OTP
flow is restored because the plan defers its removal to a follow-up release.

Four defects were found and fixed along the way, all of which had made the
affected feature completely non-functional:

1. **`req.user.iat` never existed.** `POST /auth/telegram/link`,
   `DELETE /auth/telegram/link` and `POST /escrow/wallet/withdraw` each
   hand-rolled a freshness check against `req.user.iat`, which `requireAuth`
   never populated. All three returned 401 unconditionally. Replaced with
   `requireFreshAuth` reading a real `auth_time` claim.
2. **The staff guard could never pass.** `verifyStaffAccess` compared
   `user.role !== "STAFF"`, but `UserRole` has no `STAFF` member. The condition
   was permanently true, so every staff command answered "Unauthorized."
   Now keyed on `staffRole`.
3. **The unlink guard could never fire.** It tested `!userDetails.passwordHash`,
   but every user has a non-null hash (federated accounts receive a sentinel),
   so a Telegram-only account could unlink its only credential. Now keyed on
   `passwordSetAt` / `emailVerified`.
4. **`dedupe.middleware.ts` imported `../../../../lib/redis.js`** — four levels
   up from `src/modules/bot/middleware/` is outside `src`. One level too many.

---

## 2. Files changed

**New — backend source**
- `src/modules/auth/auth-methods.ts` — `amr` vocabulary, `STRONG_AUTH_METHODS`,
  step-up error codes.
- `src/lib/json.ts` — BigInt-safe JSON, `toTelegramBigInt`.
- `src/lib/rateLimit.ts` — Redis fixed-window IP limiter, `clientIp`.
- `src/testing/routeInventory.ts`, `src/testing/routeAudit.ts` — Express stack
  walk and the CI gate.

**New — tests and fixtures**
- `tests/fixtures/telegram.ts` — both signature schemes, tampered/expired/wrong-scheme
  variants, PKCE pair.
- `tests/fixtures/telegramApi.ts` — fake Bot API recorder via grammY's transformer.
- `tests/fixtures/publicRoutes.ts`, `tests/fixtures/unauthenticatedByDesign.ts` — allowlists.
- `tests/config-fail-closed.test.ts` (12), `tests/log-redaction.test.ts` (17),
  `tests/trust-proxy.test.ts` (5), `tests/route-inventory.test.ts` (14),
  `tests/route-audit.test.ts` (7), `tests/bigint-safety.test.ts` (13).
- `tests/telegram-auth.test.ts` — **rewritten** (see §5).
- `tests/route-audit.generate.test.ts` — maintenance tool, excluded from the default run.

**New — scripts and docs**
- `apps/backend/scripts/route-audit.ts`
- `docs/hardening/MAPPING.md`, `docs/hardening/route-baseline.json`, this report.

**Modified** — `app.ts`, `config/env.ts`, `lib/logger.ts`, `middleware/auth.ts`,
`auth/{auth.routes,auth.service,oauth.service,telegram.service,telegram-code.service}.ts`,
`bot/{bot.service,types}.ts`, `bot/middleware/{auth,logging}.middleware.ts`,
`bot/utils/sessionStorage.ts`, `bot/handlers/commands.ts`, `escrow/escrow.routes.ts`,
`packages/schemas/src/index.ts`, `vitest.config.ts`, `package.json`,
`.env.example`, `.github/workflows/ci.yml`.

### Migrations added
**None.** No schema change was required: `User.telegramUserId` was already
`BigInt @unique`. See §5 for the `telegramChatId` deviation.

### Dependency added
`supertest` + `@types/supertest` (dev).

---

## 3. Tests added

```
$ pnpm run type-check
> tsc -p tsconfig.json --noEmit
(no output — exit 0)

$ pnpm test
 Test Files  25 passed (25)
      Tests  219 passed (219)
   Duration  36.67s
```

Verified commands from plan §8:

```
$ pnpm run route-audit:check
Route audit passed.                                    (exit 0)

$ grep -n "telegramUserId" prisma/schema.prisma
  telegramUserId BigInt? @unique                        (already BigInt)
```

---

## 4. Replays and manual checks

**Route replay, 165 routes × 3 identities.** No route answers 2xx without a
token outside the 9 allowlisted ones. No staff path (`/api/v1/admin/*`,
`/api/v1/telegram/{info,set-webhook,delete-webhook,start-polling,stop}`) answers
2xx for a CLIENT or FREELANCER token. No route 500s on anonymous traffic.

Two observations worth keeping:
- `GET /api/v1/telegram/health` and `POST /api/v1/telegram/webhook` return **503**
  when no bot is initialised. That is a correct fail-closed answer from a guard,
  not a handler crash, so the audit's "crashed" predicate counts only 500 and
  no-response. Documented in the test.
- The CLIENT-vs-FREELANCER differential is recorded but asserts nothing, so a
  role-gating change shows up as a visible diff rather than a silent one.

**CI gate negative control.** `tests/route-inventory.test.ts` injects a synthetic
`GET /api/v1/admin/secret-export` with no guard and asserts the audit FAILS; it
then injects the same route carrying `requireStaffRole` and asserts it PASSES
while still appearing in the diff. A gate that always returns `ok` would fail
this test.

**Fail-closed boot, negative check.** Ran the app with a deliberately unsafe
production configuration:

```
Refusing to start: unsafe production configuration.
   - TELEGRAM_WEBHOOK_URL must be https in production.
   - FRONTEND_URL must be a public https origin in production (got http://yekis.example.com)...
   - TELEGRAM_POLLING_ENABLED is set but TELEGRAM_ENV="prod"...   (exit 1)
```
and with a compliant one (`type-check` and `route-audit:check` both exit 0).

**Log redaction.** A fake bot token (`7123456789:AAFake…`) is asserted absent
from output when embedded in an error message, a URL, a bare `logger.info`
string, and a logged `Error`.

---

## 5. Deviations from the plan

1. **`telegramChatId` stays `String`, not BigInt.** Converting it would be a data
   rewrite of a column that is only ever compared as a string, and Telegram
   group ids are negative. Recorded in MAPPING.md §1.

2. **`tests/telegram-auth.test.ts` was rewritten.** It exercised a monolithic
   `loginWithTelegram(initDataString, role?)` that verified *and* auto-provisioned
   — the behaviour C5 forbids. The split API (`verifyMiniAppInitData` /
   `verifyLoginWidget` → `loginWithTelegram` / `registerTelegramUser`) is now
   tested instead. Every security assertion was preserved (tampered payload,
   stale, future, wrong-token signature, legacy backfill, password-owned
   refusal, link conflict, idempotent relink, unlink) and three were added:
   each scheme rejected by the other's verifier, missing/non-numeric `auth_date`,
   and registration refusing a role outside `CLIENT|FREELANCER|BOTH`.

3. **The OTP flow was restored, not deleted.** The plan defers its removal to a
   follow-up release, so deleting it in Phase 0 would have exceeded scope.

4. **`NotificationOutbox` is skipped.** `Notification` + BullMQ already provide
   durable delivery. A second outbox would be a duplicate source of truth.
   Revisit only if an enqueue can fail after the business transaction commits.

5. **`telegramUserId` needed no migration.** T0.6 was largely already done; the
   residual H7 work was the bot session storing a JS `number`.

6. **`auth_time`/`amr` landed in Phase 0**, ahead of T1.3. This was unavoidable:
   three routes already had a step-up check reading a claim that did not exist,
   so they were unconditionally 401. Refresh copies both claims unchanged;
   `refreshSession` deliberately does **not** fall back to `iat` for a token
   predating them, which makes step-up demand a real sign-in (fail closed).

7. **`TRUST_PROXY` renamed to `TRUST_PROXY_HOPS`.** Straight from §6; `app.ts`
   updated in the same change.

8. **Frontend has no test runner**, so T6.5's "no token in localStorage" check
   has no home yet. CI now runs a frontend `pnpm run build` job (type-check +
   bundle) and does not pretend to have coverage. Tokens still sit in
   `localStorage` (`apps/frontend/src/api/client.ts:469-470`) — that is Phase 1
   T1.3 work.

9. **CI type-check and route-audit run with `NODE_ENV=production`** and a
   placeholder token. That is deliberate: it means those steps exercise the
   T0.2 fail-closed rules, so an unwired required variable fails the build. The
   test step runs with `NODE_ENV=test` and no Telegram config.

---

## 6. Security defects this phase closed

| Finding | Status |
| --- | --- |
| H6 trust proxy | closed — `req.ip` everywhere, spoofed XFF proven inert |
| H7 BigInt | closed — string session ids, BigInt-safe JSON, boundary conversion |
| Medium: log redaction | closed — key-based, text-based, and Telegram-id hashing |
| Three always-401 step-up checks | closed — working `requireFreshAuth` |
| Staff guard unreachable | closed |
| Unlink guard unreachable | closed |
| CI unable to run | closed |

## 7. Still open (carried into Phase 1+)

- **C1/C2** mixed signature algorithms are fixed in code but the PKCE flow is a
  dead end: no bot `/start wl_{sid}` handler claims a challenge, so none ever
  reaches `approved`; redeem is read-then-delete (racy); and the sid burns on
  the **first** wrong verifier rather than the third. (`telegram-code.service.ts`)
- **C5/C6** `/auth/telegram/miniapp` and `/auth/telegram/widget` still fall back
  to provisioning via `/auth/telegram`, and `link`/`unlink` do not yet email the
  user, revoke refresh families, or set a cooling-off lock.
- **C3** step-up is enforced on withdraw but not yet on payout methods, password
  or email changes, or 2FA. `WITHDRAW_STEPUP_ENFORCED` exists and defaults to
  log-only.
- **C4** staff handlers were gutted by the prior session but the middleware
  order in `bot.service.ts` is still session → conversations → i18n → logging →
  rate limit, which does not match plan §T4.1.
- **H2/H5** `dedupe` and `privateChat` exist as files but `bot.service.ts` never
  registers them, so neither runs.
- Tokens remain in `localStorage`; there is no `RefreshToken` table, so refresh
  rotation and reuse detection are unimplemented.

---

## 8. Open questions for you

1. **Phase 1 scope.** `POST /auth/telegram` still auto-provisions. Phase 1 T1.2
   requires it to return 409 and never create an account, which breaks the
   frontend's `api.loginWithTelegram()` path in `App.tsx` and
   `SocialSignInButtons.tsx`. Do you want the frontend moved to
   `/telegram/miniapp` + `/telegram/miniapp/register` in the same PR (the plan
   says update callers in the same PR), or should the legacy route keep
   provisioning until Phase 3 onboarding exists?
2. **`userId` versus `telegramUserId` in logs.** `bot.service.ts`'s error handler
   still logs the internal `userId` (a cuid) un-hashed alongside the hashed
   Telegram id. Acceptable, or hash that too?
3. **`/api/v1/telegram/health` is public** and reveals transport mode
   (`webhook`/`polling`), whether a webhook URL is set, and `last_error_message`.
   That is useful for on-call and mildly useful to an attacker. Keep public, or
   move behind a token?
4. **No reverse proxy exists in the repo.** `infra/` has only a Postgres
   Dockerfile, so plan T6.2's CSP/HSTS/frame-ancestors headers have nowhere to
   live. Where does `FRONTEND_URL` actually terminate — a platform that injects
   headers, or should this repo add an nginx config?
5. **`scratch/`** contains six untracked JS patch scripts from the prior session
   plus `apps/backend/audit-backend.log` (28 MB, gitignored). Delete, or keep
   until Phase 1 is merged?
