# Yekis_jobs Completeness Checklist

Last reviewed: 2026-08-15

`[x]` means implemented and verified locally. `[ ]` means production work, broader test coverage, or external validation is still required. This is the authoritative project checklist; `EXTENDED_COMPLETENESS_CHECKLIST.md` points here to prevent status drift.

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
- [x] Multi-rail payment choices (Telebirr, Commercial Bank of Ethiopia CBE, and Safaricom M-Pesa) across Instant Checkout, Manual Transfer, and Freelancer Withdrawals
- [x] Manual verification fallback: actionable transfer fallback on API failure and receipt attachment to unconfirmed checkout requests (`POST /api/v1/wallet/topups/:topUpId/attach-receipt`)
- [x] In-app notifications and support chat surfaces
- [x] Support runs entirely on the platform's own engine (no third-party agent inbox): ticket creation, agent auto-assignment/claim/reassign, OPEN/CLOSED workflow, live messaging, attachments, unread counts and audit trail
- [x] Native customer support chat end to end: public widget creates a ticket, the visitor receives a conversation-scoped token so replies and follow-ups work without an account, staff work the queue in the admin dashboard, and updates arrive live over the WebSocket
- [x] WebSocket channel authorization: client-requested subscriptions and typing/read broadcasts verified against conversation membership
- [x] Staff KYC, top-up, dispute, TMS, and Finance queues
- [x] Finance reconciliation read models and fee credit ledger
- [x] Monthly withholding tax remittance reporting job
- [x] 7-day contract cooling-off right cancellation

## Backend And Data Integrity

- [x] Mounted routers: auth, KYC, jobs, contracts, escrow, top-ups, disputes, chat, notifications, TMS, webhooks
- [x] Secured dispute router replaces the legacy unauthenticated router at mount time
- [x] Zod validation for shared and route-local payloads
- [x] Role, staff, party, ownership, KYC-tier, and state-transition checks
- [x] `PATCH /chat/admin/conversations/:id/status` â€” staff can close and reopen support conversations
- [x] `/chat` â€” Guest support with automated load-balanced staff assignment and staff-scoped access control
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
- [x] **Operations Console v2** (`apps/frontend/src/pages/ops/`) - single staff console replacing `StaffDashboard.tsx` + eight `Admin*Page.tsx` files (19 components retired)
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
- [x] Admin operations platform (Phases 1â€“8): RBAC permission matrix, hardened audit log, Users/Contracts/Payments/Escrow/Payouts/Ledger/Reconciliation/Reports/Risk/Monitoring, real-metrics Overview, manual payout settlement workflow
- [x] Gig order disputes via the polymorphic Dispute machine (raise / evidence / staff resolution with fee-aware ledger)
- [ ] Automated browser tests across client, freelancer, and staff roles
- [ ] Formal accessibility audit and assistive-technology testing
- [x] Multilingual translation integration for Amharic (አማርኛ), Oromiffa (Afaan Oromoo), and Tigrigna (ትግርኛ) alongside English with typed i18n system, persistent language selection (localStorage + `<html lang>`), theme-invariant header/footer language switchers, and full coverage across Landing V2, workspace navigation, auth header, subpages, and `Yekis_translations.csv`.

## Marketing Site (Public)

- [x] Escrow explainer and 4-step trust process — rebuilt 2026-10-05 as a single-slogan stepper with one product screen per step (autoplaying tabs, keyboard-navigable, `inert` on inactive screens); the old pinned scroll board is gone
- [x] Dual CTA hero section
- [x] Transparent pricing and fees page
- [x] FAQ accordion with deep-linking
- [x] Privacy Policy and Terms of Service (pending legal review)
- [x] Custom 404 and parameterized Thank You pages
- [x] Responsive layout with Mobile CTA and Cookie Banner
- [x] Technical SEO (robots.txt, sitemap.xml, dynamic titles, meta descriptions, FAQPage schema)
- [x] Consent-aware GA4 analytics infrastructure
- [ ] Real case studies, reviews, and live proof counters (currently stubbed)
- [x] Multilingual translation integration — 4 languages supported: English (`en`), Amharic (`am` / አማርኛ), Oromiffa (`om` / Afaan Oromoo), and Tigrigna (`ti` / ትግርኛ) with real-time reactive switching, theme-invariant switcher components, and complete parity across all marketing surfaces and `Yekis_translations.csv`.

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
- [ ] Unit tests for fee, KYC, dispute, and escrow edge cases
- [ ] Concurrency stress test for acceptance, webhooks, release, and dispute resolution
- [ ] Auto-release worker test using controlled time
- [ ] Provider contract tests using real sandbox payloads/signatures
- [ ] CI required checks for build, test, lint, migration validation, and dependency scanning

## External Integrations

- [ ] Production Fayda API integration and approved credentials
- [ ] Production PEP/sanctions screening source
- [x] Telebirr C2B Web Checkout integration (fabric token caching, RSA-PSS signing, preOrder creation, web checkout redirect, body-embedded webhook verification, mock fallback)
- [ ] Live Telebirr production credentials verification and settlement reconciliation
- [ ] Chapa collection sandbox verification and reconciliation
- [ ] CBE Birr collection sandbox verification and reconciliation
- [x] Real payout/disbursement API with pending, success, failure, reversal, and reconciliation states (Telebirr B2C disbursement with `PayoutTransaction` lifecycle)
- [ ] Production SMS credentials/templates/delivery monitoring
- [ ] Telegram account linking and production push verification
- [ ] Confirm FIC STR filing operating procedure; the platform records but does not submit filings

## Security, Compliance, And Operations

- [x] Local Docker services for PostgreSQL/pgaudit, Redis, and MinIO
- [x] PostgreSQL host port documented consistently as `5433`
- [x] Environment example and secret separation
- [x] Helmet, CORS, rate limiting, body limits, and upload limits
- [x] KYC and contract documents stored outside PostgreSQL
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
