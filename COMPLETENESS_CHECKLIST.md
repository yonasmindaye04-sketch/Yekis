# Yekis_jobs Completeness Checklist

Last reviewed: 2026-08-09

`[x]` means implemented and verified locally. `[ ]` means production work, broader test coverage, or external validation is still required. This is the authoritative project checklist; `EXTENDED_COMPLETENESS_CHECKLIST.md` points here to prevent status drift.

## Product Journey

- [x] Registration, login, age gate, consent capture, and JWT sessions
- [x] Telegram Mini App authentication backend and frontend entry path
- [x] Tier 1 document submission, status, staff review, and access gate
- [x] Client job posting and own-job view
- [x] Freelancer job discovery, proposal submission, own-proposal view, and withdrawal
- [x] Client proposal review, shortlist/reject, and atomic acceptance
- [x] Generated contract PDF, party-only access, and both-party signatures
- [x] Milestone funding request with contract/milestone validation
- [x] Signed webhook processing and escrow-held transition
- [x] Delivery submission and BullMQ auto-release scheduling
- [x] Client acceptance and atomic wallet release
- [x] Per-milestone dispute negotiation, evidence, mediation, arbitration, and resolution
- [x] Tier 2 request/review and withdrawal gate
- [x] Wallet-mismatch compliance hold with no debit
- [x] Manual top-up submission, staff review, and wallet credit
- [x] In-app notifications and support chat surfaces
- [x] Staff KYC, top-up, dispute, and TMS queues

## Backend And Data Integrity

- [x] Mounted routers: auth, KYC, jobs, contracts, escrow, top-ups, disputes, chat, notifications, TMS, webhooks
- [x] Secured dispute router replaces the legacy unauthenticated router at mount time
- [x] Zod validation for shared and route-local payloads
- [x] Role, staff, party, ownership, KYC-tier, and state-transition checks
- [x] `PATCH /chat/admin/conversations/:id/status` — staff can close and reopen support conversations
- [x] `/chat` — Guest support with automated load-balanced staff assignment and staff-scoped access control
- [x] Self-bid prevention and one proposal per freelancer/job
- [x] Serializable proposal acceptance prevents multiple winners
- [x] One contract per job
- [x] One pending funding transaction per milestone enforced by database index
- [x] Provider transaction idempotency and signed raw-body webhooks
- [x] Guarded/transactional release, refund, and partial split prevent double credit
- [x] Partial split is capped at milestone amount
- [x] One dispute per milestone with multi-milestone contracts supported
- [x] Periodic KYC review marker preserves verified access
- [x] Object-store bucket initializes in local development
- [x] Integer minor units used for persisted monetary values
- [x] Append-only audit intent and database permission guidance

## Frontend

- [x] Responsive React/Vite shell and role-aware navigation
- [x] Browser registration/login and verification screens
- [x] Jobs/proposals workspace with current shared-schema payload conversion
- [x] Contracts/milestones workspace with signing, PDF access, funding, delivery, and acceptance
- [x] Disputes workspace with party actions
- [x] Wallet, manual top-up, top-up history, and withdrawal UI
- [x] Notification center and support chat
- [x] Staff compliance panel for dispute outcomes and TMS decisions
- [x] Staff live chat inbox: auto-poll (8 s), unread badges, OPEN/ALL filter, close/reopen conversation, auto-scroll, relative timestamps
- [x] Guest chat widget: displays assigned staff member and supports file attachments
- [x] Loading, empty, action-busy, and user-visible error/confirmation states in primary workflows
- [x] Frontend production build passes
- [ ] Automated browser tests across client, freelancer, and staff roles
- [ ] Formal accessibility audit and assistive-technology testing
- [ ] Complete Amharic translation review across newly added workflow surfaces

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
- [ ] Telebirr collection sandbox verification and reconciliation
- [ ] Chapa collection sandbox verification and reconciliation
- [ ] CBE Birr collection sandbox verification and reconciliation
- [ ] Real payout/disbursement API with pending, success, failure, reversal, and reconciliation states
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
