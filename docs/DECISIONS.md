# Architecture And Product Decisions

## 2026-11-09

### Holding TIN (Tax Identification Number) Requirement for MVP (Simplified Launch)
Tax Identification Number (TIN) collection, mandatory Tier 2 gating on withdrawals, and statutory withholding tax deductions (3% / 30%) are held and deferred for the MVP launch (`TIN_FEATURE_ENABLED=false`). 
- **Rationale:** Informal Ethiopian freelance talent operates primarily outside the formal commercial tax registry. Gating withdrawals behind a TIN or imposing a 30% unverified-TIN penalty deduction at launch would create insurmountable supply-side friction and exclude the platform's core target demographics.
- **Policy & Architecture:**
  1. Tier 1 KYC (National ID / Fayda biometric verification) is sufficient for all core actions, including wallet withdrawals (`requireKycVerified(env.TIN_FEATURE_ENABLED ? "TIER_2" : "TIER_1")`).
  2. Withholding tax calculation in `calculateFees` is held at 0 ETB while `TIN_FEATURE_ENABLED=false`, ensuring freelancers receive 95% of gross milestone funds (only the 5% platform commission is deducted).
  3. The formal 3-tier KYC model with mandatory TIN/trade licenses and automated ERA withholding remittance remains an active roadmap workstream deferred to Phase 4 (Growth & Scale), pending final accountant confirmation of ERA remittance procedures (`TAX-002: OPEN ACTION`).

## 2026-10-17

### Telegram Bot 4-Language Localization & Push Alert Sync
The Grammy Telegram bot (`@ye_kis_bot`) achieves 100% dictionary key parity (243 keys) across English (`en`), Amharic (`am`), Afaan Oromoo (`om`), and Tigrigna (`ti`). Outbound push notifications query `getBotTranslation()` to deliver authentic localized copy instead of raw string keys. User language preference in Telegram is bidirectionally synchronized with `User.languagePreference`.

## 2026-10-14

### Four-Language Native i18n System
The Web SPA supports four Ethiopian national languages natively (English, Amharic, Afaan Oromoo, Tigrigna) with 314 translation keys. Language state is persisted in `localStorage` under `yekis-language`, reflected in `<html lang>`, and synchronized with `User.languagePreference` upon registration. Language selector components are strictly theme-invariant to comply with `.agents/AGENTS.md`.

## 2026-10-03

### Operations Console v2 Consolidation
Consolidated 19 fragmented admin/staff pages into a single high-performance console shell at `apps/frontend/src/pages/ops/`. Implemented the adapter pattern (`opsApi.ts`) to cleanly interface with the real backend API without requiring synthetic flat routes, and derived navigational visibility dynamically from the RBAC permission matrix (`opsPerms.ts`).

### Native Support Desk Architecture (Chatwoot Retirement)
Evaluated and retired the external Chatwoot bridge due to SSRF filtering, container overhead, and cross-system friction. Implemented native guest-support chat powered by a scoped 12-hour JWT carrying `typ: "guest_support"`, pinned strictly to the visitor's conversation ID, with live WebSocket delivery and load-balanced staff assignment.

## 2026-09-05

### Multi-Rail Payment Architecture & Fallback Workflows
Expanded approved payment rails beyond Telebirr to include Commercial Bank of Ethiopia (CBE / CBE Birr) and Safaricom M-Pesa. To prevent user dead-ends when automated gateway APIs experience latency, built an actionable manual verification fallback allowing receipt attachments to unconfirmed checkout requests (`POST /api/v1/wallet/topups/:topUpId/attach-receipt`).

### Automated Telebirr B2C Disbursements & Wallet Rollback
Implemented live B2C payout integration (`payout.service.ts`). In the event of provider rejection or network failure, the platform automatically rolls back the user's debited wallet balance, posts compensating entries to the general ledger, and logs an immutable audit event.

## 2026-09-04

### Real-Time WebSocket Infrastructure & Channel Authorization
Mounted `/api/v1/ws` with mandatory JWT validation. Implemented strict server-side channel authorization: client subscription requests to `conversation:<id>` must be verified against active database conversation membership, preventing IDOR snooping on contract messages or typing pulses.

## 2026-08-29

### Fiverr-Style Gig Marketplace & Polymorphic Dispute Resolution
Introduced pre-packaged service offerings (`Gig`, `GigPackage`, `GigOrder`, `GigReview`) alongside custom job bids. Rather than duplicating dispute tables, refactored `Dispute` into a polymorphic model supporting either a `milestoneId` or a `gigOrderId`, guarded by a database CHECK constraint ensuring exactly one dispute subject per row.

### Phase 1 Granular RBAC (7 Staff Roles)
Expanded legacy binary staff roles into 7 specialized roles (`SUPER_ADMIN`, `ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`, `SUPPORT`). Permissions are validated dynamically via database-backed capability checks and exposed to frontends via `GET /api/v1/admin/permissions/matrix`.

## 2026-08-26

### Removal of Payment Aggregators (Chapa Deprecation - PAY-002)
Formally removed Chapa from the approved payment architecture. The platform operates direct integrations with Telebirr and CBE, maintaining a non-custodial transaction ledger to minimize regulatory burden under NBE directives.

### TMS Rule Formalization & 24h STR SLA
Implemented automated detection rules for structuring (>ETB 500k in 7 days), velocity (>300% of 90-day baseline), round amounts (repeated 10k ETB multiples), and wallet mismatch. Enforced an automated 24-hour STR deadline tracking mechanism (`TransactionFlag.strDeadlineAt`).

## 2026-08-07

### Per-Milestone Disputes
A dispute is unique by `milestoneId`, not by contract. Multi-milestone contracts can therefore resolve one contested delivery without collapsing the whole agreement into a single case.

### Financial Transitions Must Be Retry-Safe
Proposal acceptance uses serializable isolation. Funding permits one pending attempt per milestone. Release, refund, and split use guarded state updates and transactions. These controls are required because HTTP retries, worker retries, and concurrent requests are normal operating conditions.

### Periodic KYC Review Does Not Revoke Access Automatically
The refresh worker sets `periodicReviewPending` for staff follow-up while preserving `VERIFIED`. Access changes require an explicit review decision, avoiding an unreviewed scheduled job disabling active users.

### External Boundaries Stay Explicit
Development mocks and provider adapters may exercise the full local journey, but documentation and UI must not describe them as live fund movement or production identity verification. STR filing remains a human action that the platform records.

### Documentation Is Part Of Done
Every implementation change updates its relevant Markdown source of truth and `CHANGELOG.md`. One authoritative completeness checklist is maintained to prevent contradictory status documents.

## 2026-08-03

### Chosen Stack
- Express and TypeScript for a compact, typed API and service layer.
- React and Vite for browser and Telegram Mini App delivery.
- Prisma and PostgreSQL for schema-driven transactional persistence.
- BullMQ and Redis for delayed and retryable workflows.
- MinIO/S3-compatible storage for regulated and generated documents.

### Core Product Decisions
- Escrow is milestone based.
- Contracts are generated from accepted proposals.
- KYC is a tiered action gate.
- Both parties sign before funding.
- Disputes use a structured, auditable escalation path.
- Financial totals and transitions are server controlled.
