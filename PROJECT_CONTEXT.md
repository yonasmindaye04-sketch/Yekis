# Project Context

Last updated: 2026-08-09

## Product Vision

Yekis_jobs is a trust-centered Ethiopian freelance marketplace. Clients and freelancers move from verified identity to job, proposal, signed contract, funded milestone, delivery, release, dispute resolution, and payout without leaving the platform.

The core promise is mutual protection: clients fund work against explicit milestones, freelancers can see that money is held before delivery, inactive clients cannot hold submitted work indefinitely, and either party can escalate a disputed milestone through a recorded process.

## Audience And Roles

- Clients post work, review proposals, sign agreements, fund milestones, accept delivery, and raise disputes.
- Freelancers discover work, bid, sign agreements, submit milestones, receive releases, and request withdrawals.
- Compliance Officers review identity evidence and top-ups, mediate disputes, and process TMS flags.
- Admins share current compliance operations and can be extended with broader platform administration.

Users may have `CLIENT`, `FREELANCER`, or `BOTH` marketplace roles. Staff authority is separate through `COMPLIANCE_OFFICER` or `ADMIN`.

## Product Scope

### Identity And Access

- Email/password and Telegram Mini App authentication.
- Minimum contracting-age enforcement and purpose-specific consent capture.
- Tier 1 KYC gates job posting, bidding, and funding.
- Tier 2 KYC gates withdrawal.
- Periodic review creates a pending-review marker without silently revoking an already verified user's access.

### Marketplace

- Searchable category-based jobs.
- Client job management and proposal review.
- Freelancer proposal submission and withdrawal.
- One proposal per freelancer per job and self-bid prevention.
- Atomic proposal acceptance, competing-proposal rejection, contract creation, and PDF generation.

### Contract And Escrow

- Immutable generated service-agreement PDF stored in object storage.
- Independent client and freelancer signature timestamps.
- Milestone funding only after both signatures.
- Signed, raw-body provider webhooks with idempotent processing.
- Delivery submission, five-day review window, warning, explicit acceptance, and auto-release.
- Server-side platform fee and withholding calculation.

### Disputes And Compliance

- One dispute per milestone, allowing separate cases within a multi-milestone contract.
- Negotiation, evidence, mediation, arbitration, and resolution stages.
- Release, refund, or bounded partial split.
- Structuring, velocity, pass-through, and wallet-mismatch TMS rules.
- Staff queue for dismissal or recording an externally filed STR.
- Append-only audit events for important transitions.

### Profiles And Reputation

- Rich user profiles featuring bio, titles, verified skills, and portfolio items.
- Profile completeness tracking to encourage robust freelancer presence.
- A Featured Talent Carousel managed by staff to highlight top performers.
- Double-blind contract review system: ratings and feedback remain hidden until both parties submit or the review window closes.
- Bayesian average rating calculation to ensure fair representation of user reputation.
- Staff moderation capabilities via profile reporting.

### Supporting Experiences

- Wallet balance and Tier 2 withdrawal request.
- Receipt-based manual top-up with staff approval.
- In-app notifications with SMS/Telegram worker integration.
- Guest and authenticated support conversations with automated load-balanced staff assignment and file attachments.
- Staff dashboard for KYC, top-up, dispute, and TMS queues.
- Public-facing marketing site with escrow explanation, FAQ, transparent pricing, and technical SEO infrastructure (robots.txt, sitemap.xml, structured data).

## Current Implementation Status

### Implemented And Locally Verified

- React browser UI linked to current API request shapes and paths.
- Express/TypeScript modules for all primary user and staff workflows.
- PostgreSQL persistence through Prisma migrations.
- Redis/BullMQ delayed and periodic workers.
- MinIO/S3-compatible KYC and contract document storage with bucket initialization.
- Role, party, KYC-tier, state-transition, and staff authorization checks.
- Concurrency guards around proposal acceptance, pending funding, release, refund, and partial split.
- Integration tests for frontend-to-API linkage and successful backend/frontend builds.
- Manual end-to-end runs for release, withdrawal, dispute split, and TMS hold/dismissal.

### Implemented Behind Development Mocks Or Stubs

- Fayda verification uses deterministic development behavior pending formal API access.
- PEP/sanctions screening uses a stub pending an approved source.
- Telebirr, Chapa, and CBE collection share an adapter and webhook architecture, but request/response mappings need real sandbox verification.
- SMS and Telegram delivery require credentials and Telegram account linking to become operational.

### Not Production-Ready

- Wallet withdrawal does not call a provider disbursement API. A passing local request debits the wallet and records the event only.
- Provider reconciliation, payout reversal/failure states, and operational settlement tooling are not complete.
- Production Ethiopian hosting, object lock, backup/restore, secret management, TLS, monitoring, and incident runbooks must be established.
- Regulatory thresholds, retention, withholding treatment, e-signature evidence, and STR procedures require Ethiopian legal/compliance validation before launch.

## Technical Shape

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19, Vite, TypeScript | User, wallet, support, and staff workflows |
| API | Express, TypeScript, Zod | Authentication, authorization, orchestration, validation |
| Data | PostgreSQL, Prisma | Transactional source of truth and migrations |
| Jobs | Redis, BullMQ | Auto-release, KYC refresh, notification work |
| Documents | MinIO/S3-compatible storage | KYC evidence, receipts, and contract PDFs |
| Shared contracts | Workspace Zod schemas | Common API payload types |

See `ARCHITECTURE.md` for component and state-machine detail and `WALKTHROUGH.md` for the complete human journey.

## Product Assumptions

1. Escrow is mandatory for marketplace contract payments.
2. Identity verification is a gate, not an optional profile enhancement.
3. Both parties must sign before milestone funding.
4. Fees, tax, wallet credits, and resolution amounts are server-controlled.
5. Auto-release protects freelancers when a client does not respond.
6. A dispute belongs to the specific milestone whose delivery or payment is contested.
7. Staff tools support human compliance decisions; they do not pretend external regulatory actions are automated.

## Compliance Design Constraints

| Constraint | Design response |
|---|---|
| Ethiopian data localization | Production personal data and documents must use approved domestic hosting |
| AML/CFT auditability | Important transitions write immutable-intent `AuditLog` rows with database-level protections |
| Tiered KYC | Tier 1 gates marketplace money entry; Tier 2 gates money exit |
| Withholding | Server-calculated rates and threshold are environment controlled |
| Electronic acceptance | Independent party timestamps and immutable generated contract document |
| Document retention | Object-store references in PostgreSQL; production bucket must enable versioning/object lock |
| Suspicious activity | TMS queues a human decision and records, but does not submit, an STR |

These are engineering constraints, not legal certification. Production policy must be confirmed by Ethiopian counsel, tax, banking, and compliance stakeholders.

## Success Definition

The pilot is functionally complete when a real user can complete the journey in `WALKTHROUGH.md` with sandbox or live approved providers, every financial state reconciles to provider records, compliance staff can operate all queues, and production controls have been tested through failure and recovery scenarios.

## Documentation Practice

Documentation is part of the definition of done. Every implementation change updates the relevant Markdown file and `CHANGELOG.md`; the persistent repository rule is in `.agents/AGENTS.md`.
