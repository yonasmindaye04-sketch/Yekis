# Hardening Plan → Repository Mapping

Every path named in the implementation plan, resolved against the real tree.
Written before any hardening code, as the plan's Step 1 requires.

Status legend: **done** = already satisfied on `main`, **partial**, **todo**, **absent** = does not exist.

Repo root: `C:\Users\Za\Desktop\project\Yekis`. pnpm monorepo, three packages:
`apps/backend` (Express + Prisma + grammY), `apps/frontend` (Vite + React),
`packages/schemas` (shared Zod). Base commit `3175676`.

---

## 1. Files the plan names

| Plan name | Real path | Status |
| --- | --- | --- |
| `apps/backend/src/modules/bot/...` | `apps/backend/src/modules/bot/` | done |
| `modules/auth/telegram.service.ts` | `apps/backend/src/modules/auth/telegram.service.ts` | partial |
| `apps/frontend/src/telegram/...` | `apps/frontend/src/telegram/` | done |
| `modules/auth/telegram-verify.ts` | — | **absent** |
| `scripts/route-audit.ts` | `apps/backend/scripts/` exists but holds only `reset_proposal.ts` | **absent** |
| `pages/TelegramAuthPage.tsx` | `apps/frontend/src/pages/TelegramAuthPage.tsx` | done |

### Where the plan's names diverge from the tree

| Plan assumes | Reality | Consequence |
| --- | --- | --- |
| Verifiers in `modules/auth/telegram-verify.ts` | Both live in `telegram.service.ts` (`verifyMiniAppInitData`, `verifyLoginWidget`) | T1.1 is largely satisfied already. Splitting them into their own module is cosmetic; do it only when it buys something. |
| `POST /wallet/withdraw` | Route exists at `apps/backend/src/modules/escrow/escrow.routes.ts`, mounted under `/api/v1/escrow` | The real path is `POST /api/v1/escrow/wallet/withdraw`. |
| Withdrawal service | `withdrawFromWallet()` in `modules/escrow/escrow.service.ts` | — |
| Roles are `CLIENT, FREELANCER, STAFF` | `UserRole` is `CLIENT, FREELANCER, BOTH`. Staff is the separate nullable `User.staffRole` column of enum `StaffRole` | There is **no STAFF role to reject**. "Registration rejects STAFF" is structurally impossible and is satisfied by construction. `BOTH` is a first-class dual-role account and is accepted (see decisions below). |
| `ConsentRecord` is new | Exists with `purpose`, `granted`, `grantedAt` | Extend with `termsVersion`, `privacyVersion`, `source`. Do not create a second table. |
| `AuditLog` is new | Exists with `eventType`, `entityType`, `entityId`, `metadata`, `actorRole`, `ipAddress`, `requestId` | Map the plan's `action`/`targetType`/`targetId` onto the existing columns. |
| `NotificationOutbox` is new | `Notification` table + BullMQ queue already exist | Skipped. BullMQ is already the durable queue; a second outbox would be a duplicate source of truth. Revisit only if an enqueue can fail after the business transaction commits. |
| `RefreshToken` is new | **Does not exist.** Refresh is a stateless JWT re-signed on `/auth/refresh` | T1.3 is genuinely new work. |
| `PayoutMethod` is new / OPEN-6 | **Does not exist.** `PayoutTransaction` is the payout record; there is no saved-destination model at all | T2.4 needs a real `PayoutMethod` model. See OPEN-6 → resolved: create it. |
| `ReferralCode` is new | **Does not exist.** Deep links use `ref_{userId}` | T4.6 is genuinely new work. |
| `TelegramLoginCode` | Exists | Keep until Phase 1 ends, then remove. |
| `User.telegramUserId` is Int | **Already `BigInt? @unique`** | T0.6 is mostly done; see §4. |
| `User.telegramChatId` is Int | `String?`, not unique | Plan says BigInt. Converting is a data rewrite for no gain — a chat id is only ever compared as a string and Telegram group ids are negative. **Kept as String**, documented below. |
| `NotificationOutbox`/`notificationPrefs` | `User.notificationSettings Json?` | Reuse it for notification preferences. |
| `withdrawalLockedUntil` | **Does not exist** | Phase 2 adds it. |
| `TRUST_PROXY_HOPS` | Env has `TRUST_PROXY` (count) | Renamed per T0.5. |
| `pages/LoginPage.tsx` | **Absent** | Auth UI is inline in `FullPlatformApp.tsx` (2891-line `App.tsx` is the Mini App shell). |
| Auth React context | **Absent** — no `auth/` dir, no `AuthContext` | Token state lives in `apps/frontend/src/api/client.ts`. |

---

## 2. Real code, by concern

### Boot & middleware
| Concern | Path |
| --- | --- |
| Express app assembly, route mounting | `apps/backend/src/app.ts` |
| Process bootstrap, workers, shutdown | `apps/backend/src/server.ts` |
| Env schema (zod, exits on failure) | `apps/backend/src/config/env.ts` |
| pino logger | `apps/backend/src/lib/logger.ts` |
| Prisma client | `apps/backend/src/lib/prisma.ts` |
| Redis client | `apps/backend/src/lib/redis.ts` |
| Audit writer | `apps/backend/src/lib/audit.ts` |
| Auth middleware | `apps/backend/src/middleware/auth.ts` |
| Staff role guard | `apps/backend/src/middleware/staffRole.ts` |
| KYC / compliance gates | `apps/backend/src/middleware/hardBlock.ts` |

### Auth
| Concern | Path |
| --- | --- |
| Routes | `apps/backend/src/modules/auth/auth.routes.ts` |
| Password, tokens, refresh | `apps/backend/src/modules/auth/auth.service.ts` |
| `amr` vocabulary + strong-factor rule | `apps/backend/src/modules/auth/auth-methods.ts` |
| Telegram identity, both verifiers | `apps/backend/src/modules/auth/telegram.service.ts` |
| Legacy OTP **and** PKCE web-login | `apps/backend/src/modules/auth/telegram-code.service.ts` |
| OAuth (Google/Apple/Facebook) | `apps/backend/src/modules/auth/oauth.service.ts` |
| Federated-account guards | `apps/backend/src/modules/auth/identity.ts` |

### Bot
| Concern | Path |
| --- | --- |
| Bot construction, middleware order, `startBot` | `apps/backend/src/modules/bot/bot.service.ts` |
| Webhook + health routes | `apps/backend/src/modules/bot/bot.routes.ts` |
| Context and session types | `apps/backend/src/modules/bot/types.ts` |
| Middleware | `apps/backend/src/modules/bot/middleware/` — `auth`, `dedupe`, `privateChat`, `i18n`, `logging`, `rateLimit`, `sceneTimeout`, `sessionGuard` |
| Handlers | `apps/backend/src/modules/bot/handlers/` — `commands`, `callbacks`, `notifications`, `staff` |
| Conversations/scenes | `apps/backend/src/modules/bot/scenes/index.ts` |
| Keyboards | `apps/backend/src/modules/bot/keyboards/` |
| Formatters (HTML) | `apps/backend/src/modules/bot/formatters/index.ts` |
| Deep links | `apps/backend/src/modules/bot/utils/deepLink.ts` |
| Session storage | `apps/backend/src/modules/bot/utils/sessionStorage.ts` |

### Money
`apps/backend/src/modules/escrow/` (`escrow.routes.ts`, `escrow.service.ts`, `fees.ts`,
`webhooks.routes.ts`, `providers/`), `modules/tms/` (AML), `modules/finance/` (ledger),
`modules/topups/`, `modules/admin/payoutAdmin.service.ts`.

### Frontend
| Concern | Path |
| --- | --- |
| Telegram Mini App SDK plumbing | `apps/frontend/src/telegram/` — `webApp.ts`, `useTelegramMiniApp.ts`, `types.ts` |
| Telegram code sign-in page | `apps/frontend/src/pages/TelegramAuthPage.tsx` |
| API client, **token storage** | `apps/frontend/src/api/client.ts` (tokens in `localStorage`) |
| Social buttons incl. Login Widget | `apps/frontend/src/components/SocialSignInButtons.tsx` |
| Browser/Mini App shells | `apps/frontend/src/FullPlatformApp.tsx`, `apps/frontend/src/App.tsx` |
| Ops console | `apps/frontend/src/pages/ops/` |
| HTML entry | `apps/frontend/index.html` (loads `telegram.org/js/telegram-web-app.js`, no CSP) |
| Build config | `apps/frontend/vite.config.ts` (no `build` block, dev headers only) |

### Tests & CI
`apps/backend/tests/` — 19 suites, Vitest, `vitest.config.ts`, `tests/setup-env.ts`.
`.github/workflows/ci.yml` runs `npm ci && npm run lint && npm run type-check && npm test`
at the repo root, **none of which can currently succeed** (no root lockfile, no
`type-check` script, frontend has no `test` script). Fixed in Phase 0.

---

## 3. Data model reality

41 models. Relevant ones:

- `User` — `telegramUserId BigInt? @unique`, `telegramChatId String?`,
  `passwordSetAt DateTime?` (NULL ⇒ federated-owned; this is the anti-takeover
  guard and the correct signal for "has a password"), `role UserRole`,
  `staffRole StaffRole?`, `languagePreference`, `notificationSettings Json?`.
  **No** `withdrawalLockedUntil`, `telegramLinkedAt`, or `language`/`notificationPrefs`.
- `ConsentRecord` — `purpose`, `granted`, `grantedAt`. Needs version columns.
- `AuditLog` — append-only by convention; `eventType`/`entityType`/`entityId`.
- `Notification` — `userId`, `type`, `message`, `metadata`, `isRead`.
- `PayoutTransaction` — the withdrawal. `payoutAccountIdentifier String` is a
  **free-form string**, so today a withdrawal can target any account the caller
  types. That is T2.4's real hole.
- `Wallet` — `balanceMinor`, no version column, so concurrent withdrawals can
  race. Noted, out of Phase 0 scope.
- No `Session`, `RefreshToken`, `PayoutMethod`, `ReferralCode`, `NotificationOutbox`.

---

## 4. T0.6 (BigInt) findings

`telegramUserId` is **already** `BigInt? @unique`, so the plan's migration is
already applied. Remaining work:

- `telegramChatId` stays `String` (deviation, above).
- The bot session stores `telegramUserId: number` (`modules/bot/types.ts`) —
  grammY's `ctx.from.id` is a JS number and loses precision above 2^53. Must be
  widened to `string` at the boundary. This is the real H7 residual.
- No BigInt-safe JSON serializer exists. `TgUser.id` is `bigint`, and
  `buildAuthResponse` already stringifies it by hand; any new `res.json()` of a
  raw row containing a BigInt throws.

---

## 5. Findings that change the design

1. **The working tree arrived broken.** 29 TypeScript errors and 35 failing
   tests from an earlier in-flight edit: the OTP helpers
   (`resolveOrProvisionTelegramUser`, `normalizeCode`, `issueTelegramLoginCode`,
   `redeemTelegramLoginCode`) had been deleted while `auth.routes.ts`,
   `bot/handlers/commands.ts`, `bot/middleware/auth.middleware.ts` and two test
   suites still referenced them. Repaired in Phase 0 rather than reset, per your
   instruction to fix forward.
2. **`req.user.iat` never existed.** Three routes (Telegram link, Telegram
   unlink, wallet withdraw) each hand-rolled a freshness check against
   `req.user.iat`, which `requireAuth` never populated — so every one of them
   returned 401 unconditionally. Replaced with `requireFreshAuth` reading a real
   `auth_time` claim.
3. **The staff guard could never pass.** `verifyStaffAccess` compared
   `user.role !== "STAFF"`, but `UserRole` has no `STAFF` member, so the check
   was both a type error and permanently `true` — every staff command answered
   "Unauthorized." Now keyed on `staffRole`.
4. **The unlink guard could never fire.** It tested `!userDetails.passwordHash`,
   but every user has a non-null hash (federated accounts get a sentinel), so
   Telegram-only accounts could unlink their only credential. Now keyed on
   `passwordSetAt` / `emailVerified`.
5. **The PKCE flow is a dead end.** `telegram-code.service.ts` has `startWebLogin`,
   `approveWebLogin`, `redeemWebLogin` wired to routes, but no bot `/start wl_`
   handler claims a challenge, so no challenge ever reaches `approved`. Redeem is
   also read-then-delete (racy), and burns the sid on the **first** wrong
   verifier rather than the third.
6. **CI cannot run.** No root `package-lock.json` for `npm ci`, no
   `type-check` script, no `test` script in the frontend package.
7. **No reverse proxy exists.** `infra/` holds only a Postgres Dockerfile. There
   is no nginx/Caddy config anywhere, so T6.2's headers must be set somewhere new
   (Vite preview / the hosting platform) — that is a deployment decision.

## 6. Decisions taken (with your answers)

| Question | Decision |
| --- | --- |
| Broken tree | Fix forward; keep all in-flight work; no destructive reset. |
| `BOTH` role | Accepted at registration. `STAFF` remains impossible in `role`. |
| `ConsentRecord` / `AuditLog` / `NotificationOutbox` | Extend the first two; skip the outbox. |
| Scope of this pass | Phase 0 only. |
| Git | No commits; everything left in the working tree for review. |
