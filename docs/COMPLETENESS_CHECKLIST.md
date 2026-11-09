# Yekis_jobs Completeness Checklist

Last reviewed: 2026-11-09

`[x]` means implemented and verified locally. `[ ]` means production work, broader test coverage, or external validation is still required. This is the authoritative project checklist; `EXTENDED_COMPLETENESS_CHECKLIST.md` points here to prevent status drift.

## Documentation Alignment (2026-11-09)

Re-verified every documented count, constant, queue, port, and enum against the codebase and against the three governing source documents (*Master Engineering & Product Roadmap (Revised)*, *(NEW) Development & Engineering Playbook*, *Master Design, Legal & Compliance Document (Draft 1)*). The documents are the **intent baseline**; the **codebase is the truth** for implementation status. Divergences are recorded, not silently reconciled.

- [x] `docs/ARCHITECTURE.md` updated: ops console 19 → 23 page components, frontend i18n 314 → 625 keys (43 nested objects), background processing 6 → 9 queues, `PaymentProvider` enum-vs-live-rails table, financial-constants table, CI section, verified-compliance-gap table, OpenSearch + `server.fs.deny` in local topology, and the unarmed-cooling-off gap recorded
- [x] `docs/COMPLIANCE_BLOCKERS.md` rewritten: withholding corrected 2% → **3% / 30%** (and recorded as **0% at launch** behind `TIN_FEATURE_ENABLED=false`), Chapa references replaced with "Telebirr is the only live rail", the stale "withdrawFromWallet is stubbed" claim removed (Telebirr B2C is live), and three missing blockers added (10-year retention/WORM, PDPP data-subject rights, real breach dispatch)
- [x] `docs/DECISIONS.md` updated: eight new 2026-11-09 entries covering the baseline-vs-truth rule, payment-rail truth, the unarmed cooling-off right, the withholding gate, auto-release/VAT/JWT constants, and CI-vs-deploy; four historical entries annotated as superseded
- [x] `docs/DOCUMENT_PROJECT_ALIGNMENT_REPORT.md` regenerated against the 2026-11-09 scan
- [x] `docs/DOCUMENT_UNIFICATION_2026-08-26.md` given an explicit 2026-11-09 corrections section (its "CI/CD does not exist" claim was false)
- [x] `docs/DOCUMENT_UNIFICATION_2026-11-09.md` created — decision-by-decision map of all three documents against the code
- [x] `docs/ROADMAP_ALIGNMENT.md` created — phase-by-phase map of the Roadmap (Phase 0 → Phase 4) against the code, with a status label per task
- [x] `docs/CHANGELOG.md`, `docs/PROJECT_CONTEXT.md`, `docs/WALKTHROUGH.md` updated per `.agents/AGENTS.md`

### Verified Gaps Recorded (not silently fixed)

- [ ] **Cooling-off right is not armed** — `Contract.cancellableUntil` is never written by `createContractFromProposal()`, so `cancelDuringCoolingOff()` always rejects with `CoolingOffExpiredError` and the 7-day statutory right is unavailable (`ESC-002`)
- [ ] **No 10-year record retention / WORM** — `AuditLog` has no retention column and no purge job; there is no WORM module
- [ ] **No PDPP data-subject rights tooling** — no export, portability, or erasure route or admin tool exists
- [ ] **Breach alert is log-only** — the SMS/Telegram dispatch in `src/lib/breachAlert.ts` is commented out
- [ ] **M-Pesa divergence** — Master Design `PAY-003` marks it removed; the code still ships the stub, enum value, schema union member, and top-up route support
- [ ] **No frontend automated tests** — zero frontend test files and no test runner; the CI frontend job runs build only
- [ ] **Deploy pipeline is a placeholder** — `.github/workflows/deploy.yml` exists but contains no deploy steps

## MVP Scope Adjustments (2026-11-09)

- [x] **Receipt & Transaction Details Sections Excel Spreadsheet Overhaul & Unified Layout**: Redesigned both the official receipt/voucher sheet (`FiscalDocumentModal.tsx`) and transaction movement detail view (`BrowserWallet.tsx`) to match the Excel invoice design template. Implemented clean spreadsheet styling (`.excel-sheet-*`), prominent `INVOICE` header with `Yekis Technologies PLC` lockup, unified single wide metadata box (`.excel-meta-wide-box` combining To, Role, TIN, Date, Invoice#, Customer ID, and Fiscal Status), removal of detached floating toolbar and integration of utility actions (`Copy Ref / ID`, `Print / Save PDF`, `Close [X]`) directly into the sheet card top bar, suppression of simulation tabs for settled wallet receipts (`interactiveControls={false}`), classic 7-column metadata band (`Party | Job/Contract | Payment Rail | Terms | Delivery Date | Payment Terms | Status`), line-items table with `Qty | Item # | Description | Custom column | Unit price | Discount | Line total`, stacked totals box (`Total Discount | Subtotal | Sales tax | Total`), "Thank you for your business!" footer, bold status indicators with bold colors (no low-opacity pills), removal of physical shipping address/checks payable block, and strict theme parity.
- [x] **Contracts & Escrow Responsive & Accessibility Overhaul**: Added tablet (960px) and mobile (640px/480px) responsive rules in `shadcn-dashboard.css` and `WorkflowWorkspace.tsx`. Enhanced touch targets (42px-44px), smooth momentum tab scrolling, 2x2 tablet KPI grids, fluid action button wrapping, and verified across iPhone (375px), iPad (768px/820px), and desktop (1280px).
- [x] **Contracts & Escrow Filter Toolbar Layout Restoration**: Fixed the large blank gap bug in `WorkflowWorkspace.tsx` across both Contracts and Escrow Center tabs by introducing `.sh-card.sh-filter-card` and `.sh-filter-card-actions` CSS rules, resetting flex-direction to row, removing buggy `flex: "1 1 280px"` vertical height expansion in flex columns, and ensuring clean responsive mobile stacking.
- [x] **"Make ideas visible." Editorial Section Design Overhaul & Minimized Replay Delay**: Implemented updated hero banner layout with kicker pill situated cleanly above the stage, `Plus Jakarta Sans` headline typography (`clamp(2.6rem, 7vw, 4.9rem)`), compact 380px stage height, scoped `.yk-v2` stage collision prevention, and minimized animation replay delay down to ~0.53s hold / 2.4s cycle with instant click-to-replay.
- [x] **Milestone Acceptance & Error UX Parity**: Removed 5-minute fresh auth blocker from client milestone acceptance (`POST /api/v1/escrow/milestones/:milestoneId/accept`); introduced dedicated `errorMessage` state and red `.workflow-message-error` banner across all workflow workspaces to prevent errors displaying as green success messages.
- [x] **Contract Direct Chat & Credential Lookup**: Added "Chat with Client" / "Chat with Freelancer" button directly on executed contract cards; enabled multi-credential recipient lookup (email, ID, phone, UCID) for direct messaging.
- [x] **Hero Section Clean Layout Restoration**: Reverted the temporary edge-to-edge expansion back to the clean centered format (`max-width: 1120px`, `clamp(2.6rem, 7.6vw, 7.1rem)` headline, `680px` subheadline) while maintaining the interactive purple proximity pop animation.
- [x] **Hero Slogan Interactive Proximity Pop Animation**: Real-time cursor-proximity pop effect with smoothstep falloff, lerping, untransformed coordinate caching, purple `#a78bfa` hover glow, theme rest colors, and reduced motion safety in `LandingPageV2.tsx` and `LandingPage.tsx`.
- [x] **TIN Requirement Held for MVP**: TIN collection and 30% withholding penalty held for launch (`TIN_FEATURE_ENABLED=false`); Tier 1 verified freelancers can withdraw directly.
- [x] **Simplified Single-Tier Launch**: Tier 1 (National ID / Fayda) unlocks all core actions; Tier 2/TIN deferred to Phase 4.
- [x] **Clean MVP Verification Presentation**: Eliminated "MVP Launch Notice" banners and hidden deferred Tier 2/TIN cards from standard user view. Progression cleanly displays Account Created -> Verified Identity (bidding, contracts, wallet withdrawals).
- [x] **Platform-Wide 7% Only General Fee**: Unified the platform fee model to a flat 7% general platform fee (0% client surcharge, 7% deducted upon milestone release), eliminating withholding tax rows and secondary deductions from proposal breakdowns, fee calculators, and ledger allocations. Freelancers keep 93% net payout.

- [x] `docs/ARCHITECTURE.md` updated: 12 missing modules added, 3 missing workers added, system diagram updated, External Boundaries corrected (B2C live), multilingual section added
- [x] `docs/DATABASE.md` updated: 14 missing models added, full StaffRole enum (7 values), GigStatus/GigOrderStatus enums, ContractStatus.CANCELLED and ProposalStatus.COUNTER_OFFERED added, erDiagram extended
- [x] `docs/API.md` updated: full auth route list (21 routes), finance module section, bot management section, gig moderation path corrected, TMS full routes, PATCH chat/status added, OpenSearch integration documented
- [x] `docs/DOCUMENT_PROJECT_ALIGNMENT_REPORT.md` regenerated against November 2026 codebase scan
## Product Journey

- [x] Registration, login, age gate, consent capture, and JWT sessions
- [x] Google & Telegram social authentication and registration with role selection (Client vs Freelancer), session persistence, and cryptographic verification
- [x] Transactional email system (branded HTML templates for password resets, escrow order invoices/receipts with ETB amounts, platform movement alerts)
- [x] Telegram Mini App dual authentication (1-tap Telegram WebApp HMAC verification + secure Mobile Phone & PIN login)
- [x] Public user profiles with skills taxonomy, bio, and dynamic completeness score
- [x] Privacy-gated profile visibility (PUBLIC, PROPOSERS, PRIVATE)
- [x] Featured talent carousel with staff-pinned, top-rated, and recently verified algorithm
- [x] Contract double-blind review system with Bayesian rating averages and public responses
- [x] Freelancer portfolio items
- [x] Profile reporting and staff resolution queue
- [x] Tier 1 document submission, status, staff review, and access gate
- [x] Client job posting and own-job view
- [x] Freelancer job discovery, proposal submission, own-proposal view, and withdrawal
- [x] Client proposal review, shortlist/reject, and atomic acceptance
- [x] Generated contract PDF, party-only access, and both-party signatures
- [x] Milestone funding request with contract/milestone validation (wallet-first flow)
- [x] Contract execution auto-funds escrow from wallet if balance is sufficient
- [x] Telebirr C2B Web Checkout flow (preOrder initiation, web checkout redirect, return page handling) - deprecated path
- [x] Signed webhook processing and escrow-held transition - deprecated path
- [x] Client block: cannot withdraw with active contracts or open disputes
- [x] Delivery submission and BullMQ auto-release scheduling
- [x] Client acceptance and atomic wallet release
- [x] Per-milestone dispute negotiation, evidence, mediation, arbitration, and resolution
- [x] Mutual dispute withdrawal via matched outcomes
- [x] Evidence bundle auto-compilation in object store
- [x] Mediator atomic queue claiming and arbitration award application
- [x] Tier 2 request/review and withdrawal gate
- [x] Wallet-mismatch compliance hold with no debit
- [x] Manual top-up submission, staff review, and wallet credit
- [x] Multi-rail payment choices across Instant Checkout, Manual Transfer, and Freelancer Withdrawals — **Telebirr is the only live rail** (C2B checkout + B2C payout); CBE Birr and M-Pesa clients exist but always throw `PaymentProviderUnavailableError`; the manual-transfer + receipt-attachment fallback is live on every rail
- [x] Manual verification fallback: actionable transfer fallback on API failure and receipt attachment to unconfirmed checkout requests (`POST /api/v1/wallet/topups/:topUpId/attach-receipt`)
- [x] In-app notifications and support chat surfaces
- [x] Telegram bot full 4-language support (English, Amharic, Afaan Oromoo, Tigrigna) with native authentic phrasing, 100% dictionary key parity (243 keys), dynamic user language preference sync, and localized push notifications
- [x] Support runs entirely on the platform's own engine (no third-party agent inbox): ticket creation, agent auto-assignment/claim/reassign, OPEN/CLOSED workflow, live messaging, attachments, unread counts and audit trail
- [x] Native customer support chat end to end: public widget creates a ticket, the visitor receives a conversation-scoped token so replies and follow-ups work without an account, staff work the queue in the admin dashboard, and updates arrive live over the WebSocket
- [x] WebSocket channel authorization: client-requested subscriptions and typing/read broadcasts verified against conversation membership
- [x] Staff KYC, top-up, dispute, TMS, and Finance queues
- [x] Finance reconciliation read models and fee credit ledger
- [x] Monthly withholding tax remittance reporting job
- [x] 7-day contract cooling-off **mechanism** (`cancelDuringCoolingOff`) — ⚠️ **not armed in production**: `createContractFromProposal()` never sets `Contract.cancellableUntil`, so the endpoint always rejects with `CoolingOffExpiredError`. See *Verified Gaps Recorded* above

## Backend And Data Integrity

- [x] Mounted routers: auth, KYC, jobs, contracts, escrow, top-ups, disputes, chat, notifications, TMS, webhooks
- [x] Secured dispute router replaces the legacy unauthenticated router at mount time
- [x] Zod validation for shared and route-local payloads
- [x] Role, staff, party, ownership, KYC-tier, and state-transition checks
- [x] `PATCH /chat/admin/conversations/:id/status` Ã¢â‚¬â€ staff can close and reopen support conversations
- [x] `/chat` Ã¢â‚¬â€ Guest support with automated load-balanced staff assignment and staff-scoped access control
- [x] Self-bid prevention and one proposal per freelancer/job
- [x] Serializable proposal acceptance prevents multiple winners
- [x] One contract per job
- [x] One pending funding transaction per milestone enforced by database index
- [x] Telebirr C2B Web Checkout adapter with native Node.js RSA-PSS signing (`telebirr.signing.ts`), Redis fabric token caching (`telebirr.token.ts`), and body-embedded webhook signature verification
- [x] Provider transaction idempotency and signed raw-body webhooks
- [x] Guarded/transactional release, refund, and partial split prevent double credit
- [x] Partial split is capped at milestone amount
- [x] One dispute per milestone with multi-milestone contracts supported
- [x] Periodic KYC review marker preserves verified access
- [x] Object-store bucket initializes in local development
- [x] Integer minor units used for persisted monetary values
- [x] Append-only audit intent and database permission guidance
- [x] Cached KYC status correctly falls back to prior verified tier on upgrade rejection
- [x] Escrow release and refund track lifetime net earnings and gross spend
- [x] Contract completion checked synchronously when milestones reach terminal escrow states (handles partial splits)
- [x] Escrow release automatically credits PlatformOperatingAccount and logs PlatformFeeCredit
- [x] Escrow release monitors VAT threshold and alerts Finance
- [x] Auto-release worker respects the 7-day cooling-off window
- [x] KYC refresh worker sends re-review notifications to users
- [x] Server refuses to boot in production with a mocked PEP provider
- [x] Double-entry general ledger with zero-sum invariant enforcement (`LedgerAccount`, `LedgerJournal`, `LedgerEntry`)
- [x] Multi-script anti-circumvention engine (Amharic Fidel numerals, spelled words, obfuscation stripping, and leetspeak)
- [x] WebSocket real-time foundation mounted at `/api/v1/ws` with JWT authentication and channel subscriptions
- [x] Telebirr B2C disbursement rail with automatic wallet rollback on provider refusal and double-entry ledger posting

## Frontend

- [x] Responsive React/Vite shell and role-aware navigation
- [x] Browser registration/login and verification screens
- [x] Jobs/proposals workspace with current shared-schema payload conversion
- [x] Contracts/milestones workspace with signing, PDF access, funding (Telebirr redirect), delivery, and acceptance
- [x] Payment return page (`PaymentReturn.tsx`) for processing post-checkout browser redirects
- [x] Disputes workspace with party actions
- [x] Wallet, manual top-up, top-up history, and withdrawal UI
- [x] Notification center and support chat
- [x] Staff compliance panel for dispute outcomes and TMS decisions
- [x] Staff live chat inbox: auto-poll (8 s), unread badges, OPEN/ALL filter, close/reopen conversation, auto-scroll, relative timestamps
- [x] Guest chat widget: displays assigned staff member, supports file attachments, and allows continuous follow-up conversations
- [x] Staff sidebar accessibility: independent scrolling containment for expandable operational menus with pinned sign-out action
- [x] Admin dashboard authentication: router-level `requireAuth` enforcement with granular `requirePermission` RBAC matrix
- [x] Polling-resilient API rate limiting (2,000 req/15m prod, 10,000 dev) with JSON error responses and client graceful 429 handling
- [x] Full support desk dispatch: real-time staff alerting on guest tickets, auto-assignment to all active staff roles, and shared queue visibility
- [x] Loading, empty, action-busy, and user-visible error/confirmation states in primary workflows
- [x] Complete Light/Dark mode design token system with WCAG AAA contrast, consistent brand colors, clean SVG icons without background box artifacts, and human-first copy
- [x] **Operations Console v2** (`apps/frontend/src/pages/ops/`) - single staff console replacing `StaffDashboard.tsx` + eight `Admin*Page.tsx` files (19 components retired); the console now renders **23 page components** under 23 page IDs plus 6 shared primitives
- [x] Command Center: Action Center ranking SLA breaches, risk, health, recon and queue work, with per-directive deep links
- [x] Dependency-free SVG charts (area, grouped bar, donut, sparkline, h-bars) with empty-data guards
- [x] Ctrl/Cmd+K command palette over pages and records, filtered by the signed-in role's permissions
- [x] Collapsible operations sidebar (3-bar toggle, persisted in localStorage) with the mobile drawer preserved below 860px
- [x] Working staff notifications popover (`GET /notifications`, mark-read) styled with the console's own tokens
- [x] Real evidence viewer over signed document URLs (`GET /kyc/documents/:id/url`) and stored milestone deliverables - no mock scans
- [x] Server-side search, filtering and pagination on every table page (debounced `q`, real totals)
- [x] CSV export of on-screen rows for Contracts and Reports (RFC 4180, UTF-8 BOM)
- [x] User moderation actions: suspend, reinstate, force KYC re-review
- [x] TMS compliance actions: inspect rule payload, file STR with optional account suspension, dismiss flag, lift hold
- [x] Dispute workflow: claim, add evidence, escalate stage, send to arbitration, resolve
- [x] KYC decision history from `GET /kyc/:userId/history`
- [x] Nav visibility driven by `GET /admin/permissions/matrix`, with a render-time fallback for forbidden deep links
- [x] Carried-over staff surfaces rebuilt on the console's own patterns (two-pane queues, inline expand-row decisions, shared `Kv` stat strip)
- [x] WCAG AA contrast for tertiary text (`--ops-text-3`) in both light and dark themes
- [x] On-demand contract and user detail (removes a per-row N+1 request fan-out)
- [x] **Platform Fee Tracking** (`PlatformFeeCredit`)
- [x] **Withholding Tax Pool** (`PlatformOperatingAccount.accumulatedWithholdingMinor`)
- [x] **VAT Tracking** (`PlatformOperatingAccount.accumulatedVatMinor` / `VAT_THRESHOLD_MINOR` alerts)

### E. Risk & Compliance (TMS)
- [x] **KYC Tiers** (Tier 1 Fayda eSignet OIDC/PAR, Tier 2 Document, Tier 3 Enhanced)
- [x] **KYC Expiry & Renewal**
- [x] **Automated TMS Rules** (Structuring limits, Velocity caps, Round amounts)
- [x] **Compliance Holds** (Account freeze on high-risk flags)
- [x] **AML Flags & STR Filing Workflow**
- [x] **Compliance Holds** (Account freeze on high-risk flags)
- [x] **Circumvention Counters & Auto-Suspension** (e.g. sharing contact info in chat)
- [x] **Circumvention Counters & Auto-Suspension** (e.g. sharing contact info in chat)

### F. Dispute Resolution
- [x] **Arbitration Protocol** (5-stage formal process)
- [x] **Staff Mediation Console**
- [x] **Evidence Bundle Assembly & Storage** (SHA-256 hashed JSON)
- [x] **Mandatory Cooling-Off / Deadlines** (7-day resolution SLAs)
- [x] Real-time `ws` layer: JWT-authenticated channels, chat typing/read receipts, staff alerts, and live `notify:*` event fan-out from the BullMQ notification worker
- [x] Admin operations platform (Phases 1Ã¢â‚¬â€œ8): RBAC permission matrix, hardened audit log, Users/Contracts/Payments/Escrow/Payouts/Ledger/Reconciliation/Reports/Risk/Monitoring, real-metrics Overview, manual payout settlement workflow
- [x] Gig order disputes via the polymorphic Dispute machine (raise / evidence / staff resolution with fee-aware ledger)
- [ ] Automated browser tests across client, freelancer, and staff roles
- [ ] Formal accessibility audit and assistive-technology testing
- [x] Multilingual translation integration for Amharic (አማርኛ), Oromiffa (Afaan Oromoo), and Tigrigna (ትግርኛ) alongside English with typed i18n system (**625 leaf keys, 43 nested objects, exact parity across all four languages**), persistent language selection (localStorage + `<html lang>`), theme-invariant header/footer language switchers, dynamic registration language preference sync, and full coverage across Landing V2, workspace navigation, auth header, subpages, `Yekis_translations.csv`, and Telegram bot ecosystem (243 bot keys).

## Marketing Site (Public)

- [x] Escrow explainer and 4-step trust process â€” rebuilt 2026-10-05 as a single-slogan stepper with one product screen per step (autoplaying tabs, keyboard-navigable, `inert` on inactive screens); the old pinned scroll board is gone
- [x] Dual CTA hero section
- [x] Transparent pricing and fees page
- [x] FAQ accordion with deep-linking
- [x] Privacy Policy and Terms of Service (pending legal review)
- [x] Custom 404 and parameterized Thank You pages
- [x] Responsive layout with Mobile CTA and Cookie Banner
- [x] Technical SEO (robots.txt, sitemap.xml, dynamic titles, meta descriptions, FAQPage schema)
- [x] Consent-aware GA4 analytics infrastructure
- [ ] Real case studies, reviews, and live proof counters (currently stubbed)
- [x] Multilingual translation integration — 4 languages supported: English (`en`), Amharic (`am` / አማርኛ), Oromiffa (`om` / Afaan Oromoo), and Tigrigna (`ti` / ትግርኛ) with real-time reactive switching, theme-invariant switcher components, and complete parity across all marketing surfaces and `Yekis_translations.csv` (**625 leaf keys per language, 43 nested objects, verified 2026-11-09**).

## Automated And Manual Verification

- [x] Backend TypeScript build passes
- [x] Frontend TypeScript/Vite production build passes
- [x] Backend Vitest suite passes
- [x] Linkage tests cover proposal payload shape and job-scoped route
- [x] Linkage tests cover contract/milestone funding identifiers
- [x] Linkage tests cover contract signature, dispute, Tier 2, and withdrawal paths
- [x] Live local happy path: register -> KYC -> job -> proposal -> contract -> fund -> webhook -> submit -> release
- [x] Live local Tier 2 review and withdrawal scenario
- [x] Live local dispute through partial split
- [x] Live local wallet mismatch hold and TMS dismissal
- [x] Backend unit/integration suite — **64 test files, ~781 `it()` cases** under `apps/backend/tests/` (62 module + 2 script suites), covering fees, KYC, dispute, escrow, cooling-off, TMS, auth, gigs, and the release/refund paths
- [ ] Concurrency stress test for acceptance, webhooks, release, and dispute resolution
- [ ] Auto-release worker test using controlled time
- [ ] Provider contract tests using real sandbox payloads/signatures
- [ ] CI required checks for build, test, lint, migration validation, and dependency scanning — **partially done**: `.github/workflows/ci.yml` runs the doc-parity check, secret scan, backend type-check, route-audit baseline gate, backend `pnpm test`, fresh-database check, and the frontend production build. **Still missing:** frontend lint as a required check, a migration-validation gate, and a dependency scan (e.g. `pnpm audit` / Dependabot) as a blocking check. `.github/workflows/deploy.yml` is a placeholder with no deploy steps

## External Integrations

- [ ] Production Fayda API integration and approved credentials
- [ ] Production PEP/sanctions screening source
- [x] Telebirr C2B Web Checkout integration (fabric token caching, RSA-PSS signing, preOrder creation, web checkout redirect, body-embedded webhook verification, mock fallback)
- [ ] Live Telebirr production credentials verification and settlement reconciliation
- [ ] CBE Birr collection sandbox verification and reconciliation — ⚠️ the CBE client is a **stub** that throws `PaymentProviderUnavailableError`; the integration path (Star Pay vs. classic CBE Birr merchant flow) is still pending CBE confirmation (PAY-004)
- [ ] M-Pesa collection sandbox verification and reconciliation — ⚠️ the M-Pesa client is a **stub** that throws `PaymentProviderUnavailableError`; Master Design `PAY-003` marks M-Pesa **REMOVED**, so this needs a product decision before any work
- [x] Real payout/disbursement API with pending, success, failure, reversal, and reconciliation states (Telebirr B2C disbursement with `PayoutTransaction` lifecycle)
- [ ] Production SMS credentials/templates/delivery monitoring
- [ ] Telegram account linking and production push verification
- [ ] Confirm FIC STR filing operating procedure; the platform records but does not submit filings

## Security, Compliance, And Operations

- [x] Local Docker services for PostgreSQL/pgaudit, Redis, MinIO, and OpenSearch
- [x] PostgreSQL host port documented consistently as `5433`
- [x] Environment example and secret separation
- [x] Helmet, CORS, rate limiting, body limits, and upload limits
- [x] KYC and contract documents stored outside PostgreSQL
- [ ] 10-year record retention enforced in code (`AuditLog` has no retention column and no purge job) and WORM object storage configured
- [ ] PDPP data-subject access / portability / erasure tooling (no route or admin tool exists today)
- [ ] Ethiopian production hosting/data residency verified
- [ ] Production object versioning, object lock, retention, and restore test
- [ ] Production secret manager and rotation procedure
- [ ] TLS, restricted CORS origins, secure headers, and rate limits tuned for production
- [ ] Database least-privilege roles, AuditLog revokes, and pgaudit verified after deployment
- [ ] Central logging, metrics, alerting, Sentry, and financial reconciliation dashboards
- [ ] Backup, restore, disaster recovery, incident response, and rollback drills
- [ ] Legal approval for contracts, privacy, consent, age, KYC, AML, tax, and retention policies
- [ ] Penetration test and dependency/security scan before launch

## Launch Readiness

- [x] Full intended journey is visible and operable with local development adapters
- [x] Architecture, API, database, setup, walkthrough, and change documentation are current
- [ ] All external identity/payment providers are verified in sandbox
- [ ] Real payout moves money and reconciles correctly
- [ ] Production infrastructure and compliance controls are validated
- [ ] Pilot acceptance test completed with client, freelancer, compliance, finance, and support stakeholders
- [ ] Go-live approval and rollback owner recorded

## Verification Commands

```bash
docker compose ps
pnpm --filter backend test
pnpm --filter backend build
pnpm --filter frontend build
```
