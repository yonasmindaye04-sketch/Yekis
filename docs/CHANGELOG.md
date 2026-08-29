# Changelog

All notable implementation and documentation changes are recorded here.

## Unreleased

### Added
- **`docs/PRIORITIZED_BACKLOG.md` (2026-08-29)** — section-by-section gap analysis (DONE/PARTIAL/MISSING/BLOCKED) mapping the external 36-section marketplace checklist to the current codebase, plus a 5-phase execution plan (money-unblock → UX fundamentals → hybrid model → monetize → scale).
- **`docs/GIG_MODEL_PLAN.md` (2026-08-29)** — full Prisma schema + backend module + frontend page plan for the Fiverr-style Gig/Package marketplace, designed to reuse the existing escrow/auto-release/dispute/Bayes-review engines. Open decisions: polymorphic payment vs. naming gigOrderId, moderation-before-publish.
- README.md documentation map appended with both new documents.

### Fixed
- **Backend Dependency & Build Fixes (2026-08-28)**:
  - Installed missing `axios` dependency in `apps/backend/package.json` required for eSignet OIDC KYC client (`esignet.client.ts`).
  - Added `ROUND_AMOUNTS` to `TransactionFlagType` enum and `strDeadlineAt` to `TransactionFlag` model in `apps/backend/prisma/schema.prisma`, synchronizing with migration `20260826090000_tms_rules_and_chapa_removal` and regenerated Prisma Client.
  - Resolved `jose` KeyLike typing in `esignet.client.ts` (`Promise<jose.KeyLike | Uint8Array>`).
  - Added missing `initiateFaydaVerification` and `completeFaydaCallback` imports to `kyc.routes.ts`.
  - Fixed `faydaBiometricId` -> `faydaPsut` field name alignment in `kyc.service.ts` and `bot/scenes/index.ts`.
  - Removed leftover `chapaClient` reference and fixed duplicate `user` variable declaration in `escrow.service.ts`.
  - Added missing `liftComplianceHold` import to `tms.routes.ts`.
  - Verified clean `pnpm --filter backend build` (`tsc -p tsconfig.json`) and successful development server boot.

### Changed
- **Document↔Codebase Unification (2026-08-26)** — first pass implementing the reconciliation decisions from `docs/DOCUMENT_UNIFICATION_2026-08-26.md`:
  - **TMS/AML rules aligned to Master Design §11.4** (`tms.service.ts`, `env.ts`):
    - Structuring redefined: deposits **totaling >500,000 ETB within 7 days** (was: 3+ payments each in a near-threshold band within 24h).
    - Velocity redefined: releases >**300% of the user's 90-day baseline**, with an absolute floor (`TMS_VELOCITY_FLOOR_RELEASES=6`) so new accounts cannot evade review (was: fixed ≥20 releases/48h).
    - Added **Round Amounts** rule: ≥3 successful payments that are exact multiples of 10,000 ETB within 7 days.
    - Removed obsolete `TMS_STRUCTURING_BAND_MINOR` / `TMS_VELOCITY_MILESTONE_THRESHOLD` config.
    - Geographic-risk screening documented as deferred until any cross-border rail exists.
  - **Periodic TMS scan added** (`queue/tmsScan.worker.ts`, `tms-scan` queue, `TMS_SCAN_CRON` default every 15 minutes): re-runs windowed rules across all users with recent activity; sweeps flags whose **24-hour STR filing SLA** expired (`TransactionFlag.strDeadlineAt`, set at detection) and raises one-time `STR_SLA_BREACH` audit events + staff alerts.
  - **STR filing can suspend the account** (`POST /api/v1/tms/:flagId/file-str` accepts `suspendAccount`) per Master Design §11.4 ("if confirmed, freeze funds, suspend the account"); suspension is enforced by the existing per-request auth check and audited as `USER_SUSPENDED_STR`.
  - **Auto-release window aligned to the contract**: `AUTO_RELEASE_WINDOW_DAYS` 5 → **7** to match Service Agreement Clause 2.2(b) (seven calendar days). Cooling-off precedence over deemed acceptance documented in ARCHITECTURE.md pending legal validation (ESC-002).
  - **Chapa removed (PAY-002)**: deleted `providers/chapa.client.ts` and `POST /webhooks/chapa`; removed `CHAPA_SECRET_KEY` / `CHAPA_WEBHOOK_SECRET_HEADER` config and the `CHAPA` value from the shared `PaymentProvider` schema; CBE stub now uses its own `CBE_WEBHOOK_SECRET`. Frontend provider unions and payment copy updated. DB cleanup via migrations — the inert PG enum value remains until a PG17+ host can run `DROP VALUE`.
  - **Hard-block extended to profile changes**: `PATCH /me/profile` now requires Tier 1 KYC verification (roadmap hard-block rule).
  - **Granular consent expanded to five purposes** (Master Design §12.2): registration records `kyc_data_processing` + `financial_data_processing` (required) and `platform_notifications` / `marketing_communications` / `analytics` (optional opt-ins); Telegram sign-up records the same purposes plus `telegram_account_linking`. Registration form renders unticked-by-default optional consent checkboxes.
  - **Pre-existing drift repaired**: added corrective migration for `User.notificationSettings` and the `PasswordResetToken` table (existed in schema without a migration; broke tests), and completed the PaymentProvider enum swap on PostgreSQL 16.

### Changed
- **Sign In UI**:
  - Redesigned social sign-in buttons to use a cleaner, horizontally aligned circular icon layout (Google, Apple, Facebook).
  - Fixed a CSS grid inheritance issue that was squishing the Terms of Service checkbox layout on the registration form.
  - Restructured the auth panel for a cleaner, simpler layout by moving the Social Sign-in buttons below the main form.
  - Simplified the Terms and Privacy Policy acceptance text on the registration form.
  - Added a "View Password" toggle to the password input box for better user experience.
  - Improved visibility of the "Back to Yekis" button in light mode by using theme-aware CSS variables instead of hardcoded colors.

### Added

- **Multi-User Simulated Negotiations & Dispute End-to-End Test Suite** (`simulated-negotiations-and-disputes.test.ts`):
  - Added comprehensive multi-user integration tests simulating full real-world marketplace lifecycles:
    - **Multi-User Proposal Negotiation & Contract Flow**: Client posts job -> Multiple freelancers submit custom milestone proposals -> Competing proposal withdrawal -> Atomic proposal acceptance -> Synchronous PDF contract generation -> Dual digital e-signatures -> Wallet-first escrow funding -> Milestone delivery -> Work review & instant wallet release.
    - **Dispute Flow A (Mutual Settlement)**: Milestone dispute -> Freelancer proposes partial split settlement -> Mismatched proposal rejection -> Client confirms matching split -> Atomic direct settlement and contract completion without mediator.
    - **Dispute Flow B (Evidence & Staff Mediation)**: Dispute escalation -> Written evidence submission & bundle compilation -> Mediation queue appearance -> Atomic mediator claim (prevention of double-claiming) -> Mediator resolution with `RELEASE_TO_FREELANCER`.
    - **Dispute Flow C (Arbitration Escalation & Award)**: Rejection of mediation -> Escalation to `STAGE_4_ARBITRATION` -> Official AACCSA arbitration award application (`applyArbitrationAward`) with reference tracking -> Client refund and wallet balance credit.
  - Fixed `applyArbitrationAward` in `dispute.service.ts` to return the updated dispute model with `awardReferenceNumber`.
  - Added frontend `api` client test coverage for proposal decisions, withdrawals, milestone delivery, and multi-stage disputes.

- **Unified Schema Migration & Synchronization** (`20260821215600_add_profile_reviews_chat_platform_models`):
  - Synchronized database with complete `schema.prisma` definitions covering `Review`, `PortfolioItem`, `FeaturedLog`, `ProfileReport`, `ProfileView`, `UserSkill`, `Skill`, `CounterOffer`, `DirectThread`, `DirectMessage`, `PlatformOperatingMetrics`, `StaffActionAudit`, `PasswordResetToken`, and `WithholdingRemittanceReport`.
  - Re-generated Prisma Client and verified end-to-end database seeding (`db:seed`).
  - Added `PasswordResetToken` and `notificationSettings` relations to `User`.

- **Comprehensive TypeScript Strict Build Resolution** (`apps/backend` & `apps/frontend`):
  - Fixed dispute service duplication and streamlined dispute stages/settlement workflows.
  - Aligned all dispute, escrow, profile, reviews, and featured modules with updated schema relations and strict Pino logger signatures (`logger.error({ err }, message)`).
  - Fixed Telebirr payment and signing clients for non-null parameter indexing.
  - Aligned Telegram Bot handlers, scene builders, formatters, and middleware with grammy and conversations types.
  - Safely guarded `window.localStorage` in frontend API client for SSR and Node test environments.

- **Wallet-first escrow funding** (`escrow.service.ts`, `contracts.service.ts`):
  - Added `fundMilestoneFromWallet()` — deducts milestone charge atomically from client wallet balance and sets milestone to `ESCROW_HELD` in a single Prisma transaction.
  - Added `POST /api/v1/escrow/fund-from-wallet` route (requires Tier 1 KYC).
  - Contract fully-executed trigger now auto-funds all milestones from client wallet if balance is sufficient; notifies client to top up if insufficient.
  - Added `ActiveContractWithdrawalBlockedError` — clients cannot withdraw if they have active contract milestones or open disputes.
  - `withdrawFromWallet()` now checks user role and blocks CLIENT role from withdrawing during active contracts/disputes.
- **Provider selector for freelancer withdrawal** (`BrowserWallet.tsx`): Freelancers can now choose Telebirr or CBE Bank as their payout destination before requesting a withdrawal.
- **Role-aware wallet UI** (`BrowserWallet.tsx`): Component accepts a `role` prop; withdrawal section shown only to freelancers; top-up available to all roles; provider selector cards added to the withdrawal form.
- **"Fund from wallet" button** (`WorkflowWorkspace.tsx`): Replaces the old external-provider Fund button; calls `fundMilestoneFromWallet`. Unsigned contracts show an informational note instead.
- **`docs/FLOW.md`**: New canonical payment lifecycle documentation covering all stages from wallet top-up through freelancer withdrawal, withdrawal rules per role, and error code reference.
- **`docs/TELEBIRR_INTEGRATION.md`**: New comprehensive documentation on the Telebirr payment integration, covering architecture, files, cryptography (RSA-PSS), and webhook handling.
- **`SYSTEM_DESIGN.md`**: Authoritative system design document covering system architecture, comprehensive Prisma ER diagram, per-module specifications, state machines, API surfaces, cross-cutting AML/audit concerns, end-to-end trust loop, and an integration stub matrix.

### Changed

- **Payment Card Styling & Assets** (`BrowserWallet.tsx`, `App.tsx`, `index.css`):
  - Added visual branding images for Telebirr and CBE Bank in payout and deposit methods with horizontal card layout.
  - Enhanced layout centering and increased card width for improved spacing.
- **Compliance AML Queue & UI Fixes** (`StaffCompliancePanel.tsx`, `DisputeQueue.tsx`, `KycQueue.tsx`, `TopUpQueue.tsx`, `tms.service.ts`, `index.css`):
  - Created dedicated `.staff-queue-card` CSS layout with flex column positioning to eliminate text overlapping in AML/dispute/KYC queues.
  - Reduced queue page size from 20 to 10 rows for cleaner pagination across staff queues.
  - Fixed duplicate `WALLET_MISMATCH` flag creation on repeated payout attempts with phone mismatches.
  - Added proper visual styling for disabled primary action buttons.
- **Frontend Syntax & Build Fixes** (`FullPlatformApp.tsx`, `FAQPage.tsx`, `AboutPage.tsx`, `MobileCTA.tsx`, `ProfileEditPage.tsx`, `ProfilePage.tsx`, `ShareButtons.tsx`, `PaymentReturn.tsx`):
  - Resolved JSX syntax and unclosed tag errors in `FullPlatformApp.tsx`.
  - Cleaned up unused parameters, variables, and strict TypeScript null/union types across marketing and profile pages.
- `BrowserWallet.tsx`: Replaced `canWithdraw` boolean prop with `role` string prop for clearer role-based gating.
- `FullPlatformApp.tsx`: Passes `role` to `<BrowserWallet>` instead of `canWithdraw`.
- `contracts.routes.ts`: Now handles `InsufficientBalanceError` (HTTP 402) so clients get a clear message if wallet balance is insufficient at contract signing.
- `ShareButtons.tsx`: Fixed `Twitter` icon removed from `lucide-react`; replaced with inline SVG to fix blank-page crash.

### Marked as Stub

- Withdrawal payout API (Telebirr/CBE send-to-user) remains unimplemented — balance is debited but funds are not actually sent. Must not be deployed to production without implementing provider payout APIs.

- **Telebirr C2B Web Checkout Integration**:
  - Added native Node.js RSA-PSS cryptographic signing module (`apps/backend/src/modules/escrow/providers/telebirr.signing.ts`) implementing `SHA256withRSAandMGF1`, canonical key sorting, and 32-byte salt length without external dependencies.
  - Added Fabric token manager (`apps/backend/src/modules/escrow/providers/telebirr.token.ts`) with Redis token caching (`telebirr:fabric_token`, 50-minute TTL) and automatic cache invalidation on 401 errors.
  - Added dedicated `handleTelebirrWebhook` route in `apps/backend/src/modules/escrow/webhooks.routes.ts` supporting body-embedded signatures (`sign`), Telebirr field mappings (`merch_order_id`, `trade_status`), and `{ code: 0, msg: "success" }` response format.
  - Added frontend `PaymentReturn.tsx` post-payment return landing page and redirect handling in `handleFundMilestone`.
- Added `WALKTHROUGH.md` with complete client, freelancer, staff, escrow, dispute, TMS, and payout journey diagrams.
- Added frontend/API linkage tests for proposal payloads, escrow funding identifiers, contract signing, disputes, Tier 2, and withdrawals.
- Added frontend workspaces for jobs, proposals, contracts, milestones, disputes, Tier 2 verification, withdrawals, and staff compliance operations.
- Added authenticated list endpoints for own jobs, own proposals, contracts, milestones, and disputes.
- Added party-authorized temporary contract PDF URL endpoint.
- Added Prisma migrations for per-milestone disputes, non-revoking periodic KYC review, and one pending payment per milestone.
- Added file attachment support to the support chat component.
- Added load-balanced automated staff assignment logic to guest chat initialization.
- Added staff claim and admin reassign endpoints for chat conversations (`/claim` and `/assign`).

### Changed

- **Telebirr Gateway and Environment Configuration**:
  - Rewrote `telebirrClient` in `apps/backend/src/modules/escrow/providers/telebirr.client.ts` to implement full C2B Web Checkout flow (Fabric token acquisition, signed preOrder creation, web checkout URL construction with signed query parameters, and mock mode fallback).
  - Updated environment schema in `apps/backend/src/config/env.ts` replacing 3 placeholder variables with 11 production Telebirr variables (`TELEBIRR_BASE_URL`, `TELEBIRR_WEB_BASE_URL`, `TELEBIRR_FABRIC_APP_ID`, `TELEBIRR_APP_SECRET`, `TELEBIRR_MERCHANT_APP_ID`, `TELEBIRR_MERCHANT_CODE`, `TELEBIRR_PRIVATE_KEY`, `TELEBIRR_PUBLIC_KEY`, `TELEBIRR_NOTIFY_URL`, `TELEBIRR_REDIRECT_URL`, `TELEBIRR_TIMEOUT_EXPRESS`), removing `TELEBIRR_WEBHOOK_SECRET_HEADER`.
  - Updated `apps/backend/.env` with new Telebirr credential keys.
  - Updated project documentation (`API.md`, `DATABASE.md`, `ARCHITECTURE.md`, `COMPLETENESS_CHECKLIST.md`, `CHANGELOG.md`).
- Rewired the frontend journey to the mounted API routes and shared-schema money payloads.
- Mounted the secured role-aware dispute router and documented the legacy router as unmounted.
- Added Tier 1 verification to job creation and retained Tier 1 funding/Tier 2 withdrawal gates.
- Made proposal acceptance serializable and guarded competing acceptance.
- Validated contract and milestone ownership together during funding.
- Made escrow release/refund/split wallet mutations atomic and retry-safe.
- Capped partial dispute splits at the milestone amount.
- Changed periodic KYC refresh to set `periodicReviewPending` without revoking verified access.
- Made object storage create the configured development bucket when absent.
- Configured Docker PostgreSQL for pgaudit and host port `5433`.
- Corrected `apps/backend/.env.example` to use PostgreSQL port `5433`.
- Updated browser title/branding to `Yekis Jobs` and repository documentation to `Yekis_jobs`.
- Rebuilt README, project context, architecture, API, database, setup, and completeness documentation from current code.
- Redesigned Staff Dashboard with clickable queue metrics, SLA aging timers, and a real-time Activity Feed.
- Redesigned TopUpQueue and KycQueue to use a side-by-side EvidenceViewer for visual cross-checking of receipts and IDs.
- Redesigned DisputeQueue with inline context (contract scope, deliverables) and live ETB calculations for resolutions.
- Upgraded Support Chat component to display the assigned staff member's name and limit access strictly to the assigned staff (and admins).

### Verified

- Backend TypeScript build passes.
- Frontend TypeScript and Vite production build pass.
- Backend test suite passes.
- Live local registration through released escrow and wallet credit passes.
- Live local Tier 2 review and withdrawal flow passes.
- Live local dispute through partial split passes.
- Live local wallet mismatch hold and TMS dismissal passes.

### Known Production Boundaries

- Fayda and PEP integrations remain development mocks/stubs pending approved access.
- Live Telebirr production credentials verification and settlement reconciliation remain required for launch.
- Chapa and CBE collection adapters need real sandbox verification and reconciliation.
- Wallet withdrawal currently debits/records locally but does not call a live payout API.
- Production Ethiopian hosting, object immutability, observability, operations, and legal/compliance sign-off remain required.

## 2026-08-03

### Added

- Established the monorepo documentation set and initial architecture, API, database, setup, project context, decisions, rules, and checklist files.

## [2026-08-28]
### Added
- Job detail view panel in the Telegram MiniApp (\App.tsx\) and Desktop Web UI (\WorkflowWorkspace.tsx\) so users can read the full description and milestones before applying.
- Attachment upload support for freelancer proposals. Added file inputs to the frontend and implemented the \POST /api/v1/jobs/:jobId/proposals/upload\ route to stream files to object storage.
- \ttachmentPaths\ field in \CreateProposalInput\ schema and proposal creation logic.
### Fixed
- Cover letter textarea in Telegram WebApp not allowing text input by applying \user-select: text\ and an \onFocus\ handler to expand the web app.


### Fixed
- Added minimum length validation (20 characters) for cover letters in the Telegram MiniApp (\App.tsx\) to prevent unhelpful \VALIDATION_ERROR\ from the backend.

