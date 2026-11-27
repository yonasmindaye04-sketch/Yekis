# Yekis Operations Console & Platform — Phase A Fix Report

**Branch:** `fix/ops-phase-a` (10 commits ahead of `96b383d`)  
**Status:** **Phase A (Stop-ship `A1`–`A8`) complete — stopped awaiting owner review before Phase B.**  
**Scope boundaries honored:** Did not implement Owner Policy Decisions (Receipt approval policy, four-eyes thresholds, SLA targets, incidents page) and did not modify Staff & Roles.

---

## Summary of Phase A Fixes & Before/After Evidence

| Item | Commit(s) | Root Cause | Before (QA Baseline) | After (Verified Behavior & Exact Figures) | Tests Added / Updated |
|---|---|---|---|---|---|
| **A1 (`OPS-15`)** | `2850e25` | 1. TDZ initialization order bug in `MarketplaceShadcnDashboard.tsx` (introduced in `39133b3f79ec48fa27ae5e63a50205263027c53d`).<br>2. `/auth/phone/code` and `/phone/verify` lacked `optionalAuth`.<br>3. Withdrawal rail errors returned HTTP `500` and dev disbursement hit failing external endpoint. | Client dashboard threw `ReferenceError: Cannot access 'metaFor' before initialization`; signed-in phone verification failed to stamp `phoneVerifiedAt`; payout rail errors surfaced `500`. | Moved `metaFor` above `attentionItems`; added `optionalAuth` on `/phone/code` & `/phone/verify`; mapped payout failures to `503 PAYOUT_RAIL_UNAVAILABLE` and `502 PAYOUT_RAIL_REJECTED` with atomic wallet rollback; enabled dev disbursement stub. | `apps/frontend/tests/client-dashboard-render.test.tsx` (3 passed), `apps/backend/tests/phone-verification-enforced.test.ts`, `apps/backend/tests/withdrawal-2fa.test.ts`, `apps/backend/tests/telebirr-disbursement-dev.unit.test.ts` (1 passed) |
| **A2 (`OPS-01`)** | `496aa47` | `opsApi.ts` sent the `0..100` slider integer as `freelancerShareMinor`, while `DisputeQueue.tsx` computed fees locally off overstated contract amounts and `PARTIAL_SPLIT` lacked containment gating. | On a **ETB 1,000.00** (`100,000` minor) milestone @ **50%**, freelancer received **ETB 0.46** (`46` minor); UI previewed **ETB 1,000 / 925** against a **ETB 2,000** base. | Unambiguous XOR `freelancerSharePct` / `freelancerShareMinor` contract, shared server `computeDisputeSplit()` + `POST /api/v1/admin/disputes/:disputeId/split-preview`, and `PARTIAL_SPLIT_ENABLED` containment flag (default `false`, `403 FEATURE_DISABLED`). When enabled @ **50%** of `100,000` minor: client refund **`50,000` (`ETB 500.00`)**, freelancer gross **`50,000` (`ETB 500.00`)**, fee **`3,750` (`ETB 37.50`: `3,500` platform + `250` provider)**, WHT **`0`**, freelancer net **`46,250` (`ETB 462.50`)**. | `apps/backend/tests/dispute-split-preview.test.ts` (5 passed), updated `dispute-partial-split-ledger.test.ts`, `dispute-single-resolution.test.ts`, `simulated-negotiations-and-disputes.test.ts` |
| **A3 (`OPS-02`)** | `837e2a3` | `toDispute()` summed all `contract.milestones` instead of the disputed milestone(s). | Multi-milestone contract (`seed-contract-brand`) displayed **`ETB 64,000`** instead of **`ETB 31,000`** (`22,000 + 9,000`). | Server `extractDisputedMilestoneContext()` returns `disputedAmountMinor` + `disputedMilestone`; frontend `toDispute()` uses `disputedAmountMinor` across Dispute Mediation, Action Center, SLA Schedule, Workboard, and Reports (`22,000 + 9,000 = ETB 31,000`). | `apps/frontend/tests/ops-dispute-amount.test.ts` (1 passed) + `dispute-split-preview.test.ts` |
| **A4 (`OPS-12`)** | `051ca7a` | `reviewKycRecord` (and two TMS paths) logged `targetUserId` instead of `staffUserId` as audit actor; KYC `A`/`R` hotkeys committed immediately; `Risk.tsx` skipped badge refresh. | KYC approvals attributed `userId` to the applicant; pressing `A` auto-approved with no confirmation. | `AuditLog` records `userId = staffUserId` + `actorRole` (`targetUserId` in `metadata`); fixed `USER_SUSPENDED_STR` & `USER_COMPLIANCE_LIFTED` in `tms.service.ts`; `KycQueue.tsx` requires `<dialog>` `OpsActionModal` confirmation for hotkeys & buttons; `Risk.tsx` refreshes sidebar badges. | `apps/backend/tests/kyc-review-audit.test.ts` (1 passed) |
| **A5 (`OPS-13`)** | `c4edbb9`, `5094e36` | `Approve & credit` executed without confirmation; `Reject`/`Flag` allowed short rationales until click; receipt Eye icon used `window.open()`. | Single click credited money; Eye icon bypassed lightbox viewer; `k: "receipt"` wasn't in `ViewerDoc`. | `Approve & credit` confirms email, amount, provider, and reference inside `<dialog>` `OpsActionModal` + refreshes badges; `disableSubmitUntilValid` disables invalid `Reject`/`Flag` submits; Eye icon opens `EvidenceViewer` lightbox (`k: "receipt"`). | `apps/frontend/tests/ops-receipts-guards.test.tsx` (1 passed) |
| **A6 (`OPS-06`)** | `f7dac26` | `ReportsQueue.tsx` followed `PATCH /staff/reports/:id` with a secondary `POST /admin/users/:id/suspend` requiring `users.suspend` (absent on `COMPLIANCE_ADMIN`) and swallowed the `403`. | `COMPLIANCE_ADMIN` ban toast falsely claimed `"account suspended"` while `isSuspended` remained **`false`**. | `PATCH /api/v1/staff/reports/:reportId` executes atomic suspension (`isSuspended: true`, increments `sessionVersion`, logs `USER_SUSPENDED` + `RESOLVE_REPORT`, refuses staff targets with `403 CANNOT_SUSPEND_STAFF`) under `profiles.moderate` and returns explicit `accountSuspended`. Removed swallowed hook, added ban confirmations, surfaced notification errors. | `apps/backend/tests/profile-report-ban.test.ts` (2 passed) |
| **A7 (`OPS-08`)** | `a19e392`, `942497e` | `ApiClient` treated `401 REAUTH_REQUIRED` identically to session expiry, clearing tokens and signing staff out on >5m idle sensitive actions. | Sensitive actions after 5m idle wiped session & unsaved inputs with no dialog. | Added `POST /api/v1/auth/reauth` (`requireAuth`, `401 INVALID_CREDENTIALS`, `403 STEP_UP_REQUIRED`); `ApiClient` intercepts `401 REAUTH_REQUIRED` in `request()` & `uploadFile()`, opens native `<dialog>` prompt in `OpsConsole.tsx`, preserves session/form state on Cancel/Esc, and retries request on confirmation. | `apps/backend/tests/auth-reauth.test.ts` (2 passed), `apps/frontend/tests/ops-reauth-client.test.ts` (2 passed) |
| **A8 (`OPS-07`)** | `9ef5dfe` | `/disputes/:id/escalate`, `/evidence`, `/arbitration`, and `GET /:id` checked only party membership and threw bare `new NotDisputePartyError()`. | Staff clicks in Disputes returned `403 {"error":"FORBIDDEN","message":""}`, blank `"FORBIDDEN"` toast, and left evidence modal open. | `getDisputeForActor()` permits parties OR staff with `disputes.mediate` (`disputes.view` for `GET /:id`); mediators can attach Stage 3 evidence notes with `staffUserId` audit logging; `NotDisputePartyError` & `ApiClient` always emit descriptive `403` messages; `DisputeQueue.tsx` stage/role-gates workflow buttons and closes evidence modal cleanly. | `apps/backend/tests/dispute-staff-workflow.test.ts` (2 passed), `apps/frontend/tests/ops-dispute-workflow.test.ts` (2 passed) |

---

## Verification Results (End of Phase A)

- `node scripts/check-doc-parity.mjs`: **passed** (51 models, 23 modules, 23 API groups, `SYSTEM_DESIGN.md`, `ROADMAP_ALIGNMENT.md`, 4 locales, 7 frame-ancestors origins aligned).
- `node scripts/check-lockfile-parity.mjs`: **passed** (4 importers checked).
- `node scripts/scan-secrets.js`: **passed** (`1118` tracked text files, `0` findings).
- `pnpm --filter backend type-check`: **passed**.
- `pnpm --filter backend route-audit:check`: **passed** (`231` routes matched `docs/hardening/route-baseline.json`).
- `pnpm --filter backend test:unit`: **passed** (`17` files, `116` tests passed).
- `pnpm --filter frontend build` (`tsc -b && vite build`): **passed**.
- `pnpm --filter frontend lint` (`eslint .`): **exited 1** on **2 pre-existing `react-hooks/refs` errors** in untouched `apps/frontend/src/components/SocialSignInButtons.tsx` (`315:3`, `316:3`); **0 lint errors** in files edited for Phase A.
- `pnpm --filter backend test` (full `_test` DB & Redis run): **`82` files passed / `818` tests passed**, **`3` pre-existing unrelated failures**:
  1. `tests/auto-credit-audit.test.ts:151` (expects `requireStaffRole(` text in `topup.routes.ts`, which uses `requirePermission("topups.review")` from earlier commit `47eee3d`).
  2. `tests/oauth-account-link.test.ts:354` (expects `503 NOT_CONFIGURED`, receives `401` because local test env configures `GOOGLE_CLIENT_ID`).
  3. `tests/withdrawal-2fa.test.ts:155` (expects `503 SMS_UNAVAILABLE`, receives `200` when local dev SMS code disclosure is active).
- **Double-entry Ledger Invariant Check** (`prisma.ledgerEntry.groupBy({ by: ['journalId'] })` on `_test` DB after running the full backend suite): **`446` journals checked, `0` unbalanced (`SUM(debitMinor) === SUM(creditMinor)` across 100% of journals).**

---

## Next Step

Phase A is complete and awaiting your review before starting **Phase B**.
