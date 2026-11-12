# Architecture And Product Decisions

## 2026-11-12

### Phase 0 Decision Lock — Twelve Open Questions Answered
The founder closed twelve Phase 0 / Phase 1 decisions. Each is recorded here with its **code status**, which is not always the same thing as the decision itself.

| # | Decision | Code status |
|---|---|---|
| 1 | Content is authored by the founder (bilingual Amharic + English) with Gemini as the second-language assistant; no external hire | No code. **Review rule:** the assistant drafts, the founder reviews and signs off before anything reaches users |
| 2 | Approved collection rails are **Telebirr, CBE Birr and M-Pesa**; Chapa removed; bank-custodian deferred as FIN-001 | App layer exposes exactly those three. **Only Telebirr has a working adapter** — CBE and M-Pesa are throwing stubs |
| 3 | A DPO (PDPP Art. 37) is **deferred to a later phase**; the MVP launches without one | No code. The founder holds the responsibility informally until the appointment is made |
| 4 | Subprocessor DPA scope: Fayda ID, cloud provider, Telebirr, CBE Birr, M-Pesa (Chapa removed) | No code. DPAs not executed |
| 5 | **Ten** launch subcategories at launch — **not a ceiling**; the list may grow | ✅ `LaunchCategory` = 10 values (migration `20261112120000_launch_categories_ten`), validation + 4-language i18n. Growth is an additive `ALTER TYPE ... ADD VALUE`, so no existing row is ever rewritten |
| 6 | **7% platform commission, 0% client surcharge** | ✅ `PLATFORM_FEE_RATE_FREELANCER = 0.07`, `PLATFORM_FEE_RATE_CLIENT = 0` |
| 7 | Tech stack = what the codebase already uses: React + Vite, Node + Express + TypeScript, PostgreSQL + pgaudit, Redis + BullMQ, MinIO/S3 | Already true. Ethiopian hosting still outstanding |
| 8 | **M-Pesa is an approved rail** — supersedes Master Design `PAY-003` | Approved, but `mpesa.client.ts` still throws until Safaricom supplies the merchant API |
| 9 | Fee engine has three components; the platform's overall take is **7.5%** and the freelancer nets **92.5%** | ✅ Implemented — see *Unified 7.5% Fee Engine* below |
| 10 | Statutory withholding is **deferred** | ✅ The deduction is commented out in `calculateFees()` — see *Deferred Statutory Withholding* below |
| 11 | Auto-release after **7 days**, with the 24-hour warning | ✅ Code default was already 7; the local `.env` had 5 and is now 7 |
| 12 | The **native in-app support desk** is the helpdesk; no third-party vendor | ✅ True. SLAs are not enforced in code |

### Unified 7.5% Fee Engine
The platform's take on a transaction is **7.5%**, collected as two components at release: a **7% platform commission** (`PLATFORM_FEE_RATE_FREELANCER`) and a **0.5% payment/disbursement provider fee** (`PAYMENT_PROVIDER_FEE_RATE`). The client pays no deposit surcharge, and the freelancer nets **92.5%**.
- **Rationale:** the provider fee was previously a hardcoded `0.005` literal inside `withdrawFromWallet`, applied identically to every provider at payout time — neither configurable nor routed by the fee engine (`docs/hardening/AUDIT_FINANCE_WORKERS.md` finding L-3). A user saw 93% in their wallet and then a further deduction when they withdrew. Computing it once, on the transaction gross, and routing it to `REVENUE-DISBURSEMENT-FEES` makes the take a single visible number the user can see before accepting.
- **Consequences:** the payout no longer deducts a cash-out fee, so the platform carries Telebirr's own B2C charge out of its 7.5% rather than passing it on. The release journal gains a third credit line so the double-entry stays balanced. The frontend fee breakdown now shows the commission and the provider fee as two rows.

### Deferred Statutory Withholding
The Income Tax Proclamation's 3% (with TIN) / 30% (without) withholding on payouts at or above ETB 10,000 is **not applied**. The calculation is commented out in `calculateFees()`.
- **Rationale:** the ERA remittance channel, form numbers, filing frequency, supporting-document requirements and responsible party are all unconfirmed (`TAX-002`, OPEN ACTION), and the accountant has not signed off on the figures. Deducting an unverified statutory amount from freelancer payouts before that confirmation would take money from workers on the strength of a guess.
- **Mechanics:** the rates (`WITHHOLDING_RATE_WITH_TIN`, `WITHHOLDING_RATE_WITHOUT_TIN`) and the threshold (`WITHHOLDING_THRESHOLD_MINOR`) stay in `env.ts`, and `TIN_FEATURE_ENABLED` stays as the switch, so reactivation is a one-line change rather than a reconstruction. The commented block is kept in place, not deleted.

### Unified 7.5% Take Is All-In
The platform's take on a transaction is **7.5%**, and it covers **every cost**: the 7% platform commission, the payment/disbursement provider fee, and the cash-out charge the platform absorbs at payout rather than passing on to the freelancer.

- **Rationale:** a freelancer who sees "92.5%" on one screen and then loses a further 0.5% at withdrawal is being charged twice for the same thing. Making the 7.5% the single, visible, all-in number is the whole point of moving the provider fee into the fee engine.
- **Consequences:** the payout disburses the full wallet amount with no further deduction, and the 0.5% is credited to `REVENUE-DISBURSEMENT-FEES` at release. The platform's actual cash-out cost is not separately booked at payout, because the provider does not surface the charge on the disbursement response — the 0.5% is the platform's provision for it.

### Manual Rails For CBE Birr And M-Pesa
CBE Birr and M-Pesa are approved collection rails with no merchant API. Until Safaricom and CBE supply one, **both are handled manually**: choosing either in the wallet switches straight to the manual transfer flow with that rail's account details and a receipt upload for staff verification.

- **Rationale:** the previous behaviour offered a button that could only fail — the checkout was attempted, the backend refused it with `PROVIDER_NOT_AVAILABLE`, and the user had to interpret the failure before being offered the manual path. The manual flow is how these rails actually move money today, so that is where the user should start.
- The rails remain approved and the client stubs remain in place: they are the integration points the decision keeps alive.

### Ten Launch Categories
The launch subcategory list is **ten**, not the Roadmap's original four-to-six: the original six (Web & Mobile App Development, Graphic Design & Branding, Digital Marketing, Content & Copywriting, Translation & Localization, Data Processing) plus **Video Production**, **Accounting & Bookkeeping**, **Legal Research** and **Data Analytics**.
- **Rationale:** the first three additions are the Roadmap's own Phase-4 second-sector candidates, promoted to launch; Data Analytics extends the existing data taxonomy.
- **Mechanics:** `LaunchCategory` in `schema.prisma` (migration `20261112120000_launch_categories_ten`, additive `ALTER TYPE ... ADD VALUE` only), the Zod enums in `src/schemas.ts` and `packages/schemas/src/index.ts`, the frontend category maps, and the `categories` dictionary in all four languages. Existing rows keep their values — the migration adds values, it does not rewrite data.

### M-Pesa Is An Approved Rail
Master Design `PAY-003` ("M-Pesa is not part of the approved payment architecture") is **superseded**. M-Pesa is an approved collection rail alongside Telebirr and CBE Birr.
- **Consequence:** the M-Pesa client stub is **kept**, not deleted — it is the integration point the decision keeps alive until Safaricom supplies the merchant API, the callback contract and credentials. Until then `mpesa.client.ts` still throws `PaymentProviderUnavailableError` and `verifyWebhookSignature` returns `false`, so no payment can be taken on that rail.

## 2026-11-09

### Funding Source Never Changes The Lifecycle (ESC-003)
The escrow lifecycle is a property of the **transaction**, not of how the money was paid in. Funding a milestone from the client's in-platform wallet and funding it through a payment provider are the same event with a different debit: both end in `ESCROW_HELD`, both owe the freelancer delivery, review, and a dispute window, and both pay out only on client acceptance, on the 7-day deemed-acceptance window, or on a staff dispute resolution.
- **Rationale:** commit `a03259a` made the wallet path credit the freelancer and claim the milestone as `RELEASED` inside the funding transaction. Because the wallet is the default funding path, that silently turned the platform's core escrow mechanism into a straight payment: no delivery step, no client acceptance, no 24-hour warning, no 7-day auto-release timer, and no dispute (a `RELEASED` milestone is not in `raiseDispute`'s accepted states). Escrow is the platform's legal and regulatory mechanism under Master Design §3A.13.6 and Service Agreement Clause 2.2, so the code was corrected to the documents, not the other way round.
- **Architecture:**
  1. `placeEscrowHold()` is the single place a funded milestone becomes `ESCROW_HELD`. Both the wallet path and the provider-webhook path call it, so the two funding sources cannot drift apart again. It performs the conditional `PAYMENT_PENDING -> ESCROW_HELD` claim (guarded on `contract.status = ACTIVE`) and the client's lifetime gross-spend increment.
  2. The freelancer is credited **only** by `releaseMilestoneFunds()`, which claims from `SUBMITTED_FOR_REVIEW` (client acceptance or auto-release) or `DISPUTED` (staff resolution / arbitration award). `ESCROW_HELD` and `WORK_IN_PROGRESS` are not legal entry states: releasing from them would pay out without a delivery and without a client acceptance.
  3. Platform fee recognition, the release ledger journal, the VAT threshold check and the contract-completion check all happen at **release**, not at funding. Funding posts only the funding journal (`client wallet -> escrow pool`).
  4. The gig path obeys the same rule: `fundGigOrderFromWallet` funds an order into `ESCROW_HELD`, and the freelancer is paid by `acceptGigOrder`, the gig auto-release worker, or gig dispute resolution.
- **Legal text unchanged.** No schema migration.

## 2026-11-09

### Milestone Acceptance Auth Requirements & Error UX Parity
- **Decision:** Removed `requireFreshAuth(300)` from `POST /api/v1/escrow/milestones/:milestoneId/accept` so client milestone approval uses standard `requireAuth`. Concurrently, decoupled `errorMessage` from `message` across `WorkflowWorkspace.tsx` so API or validation errors render in red `<AlertTriangle>` banners instead of green `<Check>` success banners.
- **Rationale:** Milestone delivery acceptance approves releasing funds that are already locked securely in escrow. Client funds were already authenticated and committed during milestone escrow funding (`fund-from-wallet`), which does not require fresh auth. Imposing a 5-minute window (`requireFreshAuth(300)`) and requiring strong AMR methods (which excluded Google OAuth and Telegram logins) caused unexpected `401 REAUTH_REQUIRED` rejections for active users, which then masqueraded in the UI as green success notices due to unified `setMessage` state. Standard `requireAuth` combined with strict party authorization (`contract.clientId === req.user.id`) and state validation (`escrowState === 'SUBMITTED_FOR_REVIEW'`) protects platform funds while enabling seamless milestone release.

### Platform-Wide 7% Only General Fee Rule
The platform fee architecture is unified to a single flat **7% general platform fee** (`PLATFORM_FEE_RATE_FREELANCER = 0.07`, `PLATFORM_FEE_RATE_CLIENT = 0`).
- **Rationale:** Disparate fee references across marketing (`FeesPage.tsx` claiming 2.5%, onboarding claiming 10% + 3% withholding, backend splitting 5% client + 5% freelancer) created confusion. Freelancers submitting milestone proposals were confronted with double-deductions (10% fee + 3% withholding).
- **Policy & Architecture:**
  1. **Single 7% General Fee:** Only a 7% platform fee is deducted upon milestone release. No client deposit surcharge (`PLATFORM_FEE_RATE_CLIENT = 0`).
  2. **No Withholding Deductions:** Withholding tax is zeroed out for MVP. The proposal breakdown displays only Gross Amount, Yekis Fee (7%), and Estimated Net Payout (93% take-home).
  3. **Universal Alignment:** Backend `fees.ts`, frontend `EscrowFeeBreakdown`, `FeesPage.tsx`, `i18n.ts` (all 4 languages), and dispute resolution calculators are synchronized to 7%.

### The Codebase Is The Truth; The `.docx` Files Are The Baseline
The three governing source documents — *Master Engineering & Product Roadmap (Revised)*, *(NEW) Development & Engineering Playbook*, and *Master Design, Legal & Compliance Document (Draft 1)* — are treated as the **intent baseline**. The **codebase is the authoritative record of what is actually implemented**. Where a document asserts a capability that the code does not have, the documentation must say so explicitly rather than implying the capability exists.
- **Rationale:** the 2026-11-09 alignment scan found documentation drift in both directions — stale counts (314 i18n keys, a 19-page ops console, 6 queues) and over-claims (a 2% withholding rate, a stubbed `withdrawFromWallet`, an ECA breach alert that only writes a log line). Silently "fixing" either direction would hide real gaps.
- **Policy:**
  1. Status labels are standardised: **Implemented** (verified in code), **Partially Implemented**, **Stub / Mock** (typed interface, throws or returns a mock), **Blocked — External** (needs a human, a vendor, or a regulator), **Not Started**.
  2. A divergence between a document decision and the code is **recorded**, not silently reconciled. `docs/ROADMAP_ALIGNMENT.md` is the phase-by-phase map; `docs/DOCUMENT_UNIFICATION_2026-11-09.md` is the decision-by-decision map.
  3. Documentation is updated in the same change as the code it describes (`.agents/AGENTS.md`).

### Payment Rail Truth: Telebirr Only Is Live
Only **Telebirr** is a working payment rail. CBE Birr and M-Pesa clients exist but always throw `PaymentProviderUnavailableError`; no Chapa adapter exists at all. The Prisma `PaymentProvider` enum still carries inert `CHAPA` and `M_PESA` values (PostgreSQL cannot drop an enum value before PG17+), but the application surface — `src/schemas.ts:59`, `src/modules/escrow/escrow.routes.ts:153`, `src/modules/topups/topup.routes.ts:106` — exposes only `TELEBIRR`, `CBE_BIRR`, `M_PESA`.
- **Open item:** Master Design Decision Log `PAY-003` marks *M-Pesa = REMOVED*, while the code still ships the stub, the enum value, the schema union member, and top-up route support. This needs a product decision — either finish the integration or delete the stub — and is tracked in `docs/ROADMAP_ALIGNMENT.md` (`PAY-003`).

### Cooling-Off Right Is Not Armed (Documented Divergence, Not Fixed)
`Contract.cancellableUntil` is documented in `schema.prisma` as "set to createdAt + 7 days by `createContractFromProposal()`", but that function never writes the field and no other code path assigns it. `cancelDuringCoolingOff()` therefore always rejects with `CoolingOffExpiredError`, and `autoRelease.worker.ts:50-64` never skips a release for cooling-off because the timestamp is always `null`.
- **Decision:** record the divergence as a **verified gap** (`ESC-002`) rather than silently changing behaviour in a documentation-only pass. The 7-day statutory cancellation right under ECA Proclamation No. 1205/2020 is **not available to clients today**.
- **Also noted:** `COOLING_OFF_HOURS` (`env.ts:233`, default `24`) is defined but referenced nowhere else in the backend.
- **Next:** confirm the intended window with counsel (7 days vs. the unused 24-hour constant), then implement the assignment in `createContractFromProposal()` with a regression test.

### Withholding Is 0% At Launch, Not 2%
The configured withholding rates are **3% with a TIN** and **30% without one**, applied to gross payouts at or above `WITHHOLDING_THRESHOLD_MINOR = 1_000_000` (10,000 ETB) — not the flat 2% that the old `docs/COMPLIANCE_BLOCKERS.md` claimed. More importantly, `calculateFees` gates the whole calculation on `env.TIN_FEATURE_ENABLED`, which defaults to `false`, so **withholding is currently 0%** and the freelancer keeps **93%** of gross (flat 7% platform fee, 0% client surcharge). The rates are configured and correct; they are simply inactive until the flag is flipped.
- **Rationale:** see *Holding TIN Requirement for MVP* below.

### Auto-Release Is 7 Days, Not 5
`AUTO_RELEASE_WINDOW_DAYS` defaults to `7`, matching Master Design Service Agreement Clause 2.2(b). The Roadmap's "5 days" and the Playbook's "5-day countdown" are stale and are superseded by the code.

### VAT Threshold Is ETB 450,000, Not ETB 1,000,000
`VAT_THRESHOLD_MINOR = 45_000_000` minor units (450,000 ETB) with `VAT_RATE = 0.15`. The Playbook's "ETB 1,000,000" figure is stale. The exact threshold still needs accountant confirmation (`docs/COMPLIANCE_BLOCKERS.md` #10).

### Session Token Lifetimes Are 1h / 30d
`JWT_ACCESS_TTL` defaults to `1h` and `JWT_REFRESH_TTL` to `30d` (`env.ts:51-52`). The Playbook's "24h access / 7d refresh" is stale. Staff sessions are additionally capped at 12 hours in `auth.service.ts:342`.

### CI Exists; Deployment Does Not
`.github/workflows/ci.yml` runs the doc-parity check, secret scan, backend type-check, route-audit gate, backend test suite, fresh-database check, and the frontend production build on every pull request. `.github/workflows/deploy.yml` exists but is a **placeholder** — its deploy steps are a comment. The frontend CI job runs **build only**; there is no frontend test runner and no frontend test files.

### Holding TIN (Tax Identification Number) Requirement for MVP (Simplified Launch)
Tax Identification Number (TIN) collection, mandatory Tier 2 gating on withdrawals, and statutory withholding tax deductions (3% / 30%) are held and deferred for the MVP launch (`TIN_FEATURE_ENABLED=false`). 
- **Rationale:** Informal Ethiopian freelance talent operates primarily outside the formal commercial tax registry. Gating withdrawals behind a TIN or imposing a 30% unverified-TIN penalty deduction at launch would create insurmountable supply-side friction and exclude the platform's core target demographics.
- **Policy & Architecture:**
  1. Tier 1 KYC (National ID / Fayda biometric verification) is sufficient for all core actions, including wallet withdrawals (`requireKycVerified(env.TIN_FEATURE_ENABLED ? "TIER_2" : "TIER_1")`).
  2. Withholding tax calculation in `calculateFees` is held at 0 ETB while `TIN_FEATURE_ENABLED=false`. Under the unified 7% general-fee rule (`PLATFORM_FEE_RATE_FREELANCER = 0.07`, `PLATFORM_FEE_RATE_CLIENT = 0`), freelancers receive **93%** of gross milestone funds and clients pay no deposit surcharge.
  3. The formal 3-tier KYC model with mandatory TIN/trade licenses and automated ERA withholding remittance remains an active roadmap workstream deferred to Phase 4 (Growth & Scale), pending final accountant confirmation of ERA remittance procedures (`TAX-002: OPEN ACTION`).

## 2026-10-17

### Telegram Bot 4-Language Localization & Push Alert Sync
The Grammy Telegram bot (`@ye_kis_bot`) achieves 100% dictionary key parity (243 keys) across English (`en`), Amharic (`am`), Afaan Oromoo (`om`), and Tigrigna (`ti`). Outbound push notifications query `getBotTranslation()` to deliver authentic localized copy instead of raw string keys. User language preference in Telegram is bidirectionally synchronized with `User.languagePreference`.

## 2026-10-14

### Four-Language Native i18n System
The Web SPA supports four Ethiopian national languages natively (English, Amharic, Afaan Oromoo, Tigrigna) with 314 translation keys. Language state is persisted in `localStorage` under `yekis-language`, reflected in `<html lang>`, and synchronized with `User.languagePreference` upon registration. Language selector components are strictly theme-invariant to comply with `.agents/AGENTS.md`.

> **Updated 2026-11-09:** the dictionary has since grown to **625 leaf keys** (43 nested objects) per language, still at exact 4-language parity. The 314 figure above is the count at the time of the decision.
>
> **Updated 2026-11-12:** removing the onboarding guide took the `onboarding` namespace out of all four locales, leaving **569 leaf keys** (40 nested objects) per language, still at exact 4-language parity. Exact parity is now enforced by `node scripts/check-doc-parity.mjs`: the locale lookup falls back to English and then to the raw key, so a missing translation would otherwise reach the user silently.

## 2026-10-03

### Operations Console v2 Consolidation
Consolidated 19 fragmented admin/staff pages into a single high-performance console shell at `apps/frontend/src/pages/ops/`. Implemented the adapter pattern (`opsApi.ts`) to cleanly interface with the real backend API without requiring synthetic flat routes, and derived navigational visibility dynamically from the RBAC permission matrix (`opsPerms.ts`).

> **Updated 2026-11-09:** the console now renders **23 page components** under 23 page IDs (`opsNav.ts` / `PAGE_MAP` in `OpsConsole.tsx`) plus 6 shared primitives in `pages/ops/components/`. The "19" above is the count of legacy files that were retired at the time of the consolidation.

### Native Support Desk Architecture (Chatwoot Retirement)
Evaluated and retired the external Chatwoot bridge due to SSRF filtering, container overhead, and cross-system friction. Implemented native guest-support chat powered by a scoped 12-hour JWT carrying `typ: "guest_support"`, pinned strictly to the visitor's conversation ID, with live WebSocket delivery and load-balanced staff assignment.

## 2026-09-05

### Multi-Rail Payment Architecture & Fallback Workflows
Expanded approved payment rails beyond Telebirr to include Commercial Bank of Ethiopia (CBE / CBE Birr) and Safaricom M-Pesa. To prevent user dead-ends when automated gateway APIs experience latency, built an actionable manual verification fallback allowing receipt attachments to unconfirmed checkout requests (`POST /api/v1/wallet/topups/:topUpId/attach-receipt`).

> **Updated 2026-11-09:** only **Telebirr is a live rail**. The CBE and M-Pesa clients are stubs that throw `PaymentProviderUnavailableError`, and Master Design `PAY-003` marks M-Pesa as removed. See *Payment Rail Truth: Telebirr Only Is Live* above and `docs/COMPLIANCE_BLOCKERS.md` #9.

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

> **Updated 2026-11-09:** the Prisma `StaffRole` enum and the `AdminRole` union in `src/modules/admin/permissions.ts` now carry **8** values — the 7 above plus `COMPLIANCE_OFFICER` (mapped to the same compliance permission surface as `COMPLIANCE_ADMIN`, retained for backward compatibility).

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
