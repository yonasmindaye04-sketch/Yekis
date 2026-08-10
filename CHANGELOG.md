# Changelog

All notable implementation and documentation changes are recorded here.

## Unreleased

### Added

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
- Telebirr, Chapa, and CBE collection adapters need real sandbox verification and reconciliation.
- Wallet withdrawal currently debits/records locally but does not call a live payout API.
- Production Ethiopian hosting, object immutability, observability, operations, and legal/compliance sign-off remain required.

## 2026-08-03

### Added

- Established the monorepo documentation set and initial architecture, API, database, setup, project context, decisions, rules, and checklist files.
