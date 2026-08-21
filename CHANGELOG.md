# Changelog

All notable implementation and documentation changes are recorded here.

## Unreleased

### Added

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
