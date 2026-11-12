# Database Guide

Last updated: 2026-11-07

PostgreSQL is the transactional source of truth. Prisma defines the application model in `apps/backend/prisma/schema.prisma`; SQL migrations in `apps/backend/prisma/migrations` define the deployed history.

## Core Model Map

```mermaid
erDiagram
  User ||--|| KycRecord : has
  KycRecord ||--o{ KycDocument : contains
  KycRecord ||--o{ KycReviewEvent : has
  User ||--o{ ConsentRecord : grants
  User ||--o{ Job : posts
  Job ||--o{ Proposal : receives
  User ||--o{ Proposal : submits
  Job ||--o| Contract : becomes
  Contract ||--o{ Milestone : contains
  Milestone ||--o{ PaymentTransaction : funded_by
  Milestone ||--o| EscrowHold : held_by
  Milestone ||--o| Dispute : may_have
  Dispute ||--o{ DisputeEvidence : contains
  User ||--o| Wallet : owns
  User ||--o{ WalletTopUp : requests
  User ||--o{ PayoutTransaction : initiates
  User ||--o{ Notification : receives
  User ||--o{ TransactionFlag : reviewed_for
  User ||--o{ AuditLog : acts_in
  Conversation ||--o{ ConversationParticipant : includes
  Conversation ||--o{ ChatMessage : contains
  User ||--o{ DirectThread : client_in
  User ||--o{ DirectThread : freelancer_in
  DirectThread ||--o{ DirectMessage : contains
  User ||--o{ UserSkill : has
  Skill ||--o{ UserSkill : assigned_to
  User ||--o{ Review : writes
  User ||--o{ Review : receives
  Contract ||--o{ Review : contains
  User ||--o{ PortfolioItem : showcases
  User ||--o{ FeaturedLog : featured_in
  User ||--o{ ProfileReport : reported_in
  User ||--o{ ProfileView : viewed_in
  Gig ||--o{ GigPackage : has
  Gig ||--o{ GigOrder : receives
  GigOrder ||--o| GigReview : rated_by
  GigOrder ||--o| Dispute : may_have
  LedgerJournal ||--o{ LedgerEntry : contains
  LedgerAccount ||--o{ LedgerEntry : records
```

## Entity Responsibilities

| Model | Responsibility and important invariants |
|---|---|
| `User` | Unique email, phone, UCID, optional Fayda/Telegram/Google/Apple/Facebook IDs; marketplace and staff roles; cached KYC fields and lifetime earn/spend totals; `isGuestContact` flag for support widget identities |
| `ConsentRecord` | Purpose-specific consent history captured at registration |
| `KycRecord` | One per user; tier/status, Fayda eSignet fields, PEP screening metadata, review metadata, `periodicReviewPending` |
| `KycReviewEvent` | Immutable log of each staff KYC decision (VERIFIED/REJECTED) with tier at decision time |
| `KycDocument` | Metadata/path for object-stored identity evidence; never stores raw file bytes |
| `Job` | Client-owned scope, category, budget, deadline, proposed milestone JSON, `screeningQuestions` |
| `Proposal` | Freelancer offer; unique on `(jobId, freelancerId)`; supports `COUNTER_OFFERED` status |
| `Contract` | One per job; client/freelancer parties, immutable PDF path, independent signatures, `ContractStatus` (ACTIVE/COMPLETED/TERMINATED/CANCELLED), `cancellableUntil` for 7-day cooling-off right |
| `Milestone` | Contract amount/due date and escrow state; can have one dispute |
| `EscrowHold` | Supplementary escrow hold record linked to a milestone |
| `PaymentTransaction` | Provider attempt/status/payload; unique provider transaction ID. Telebirr transactions store the merchant order ID formatted as `YKS-<timestamp>-<6char>` |
| `Wallet` | One balance per user in integer minor units |
| `WalletTopUp` | Receipt-backed manual credit request and staff decision (also covers automated checkout flows) |
| `PayoutTransaction` | Freelancer withdrawal record tracking Telebirr B2C disbursement lifecycle (PENDING → PROCESSING → CONFIRMED/FAILED/REVERSED); wallet balance is rolled back automatically on FAILED |
| `Dispute` | Polymorphic dispute: linked to either one `milestoneId` (contract milestone) or one `gigOrderId` (gig order) — a DB CHECK enforces exactly one subject per row. Unique per subject. Staged deadlines, resolution outcome, and optional split. Carries the SLA fact `firstRespondedAt` (the mediator claimed the case or recorded a recommendation) |
| `DisputeEvidence` | Party statement tied to a dispute |
| `TransactionFlag` | AML/TMS rule result and staff review/STR metadata (includes `strDeadlineAt` — 24h STR SLA clock set at detection) |
| `Notification` | User notification ledger and delivery metadata |
| `Conversation` | Support thread with participant relations, `creatorId`, and `assignedStaffId` for scoped staff access; creator and auto-assigned staff are registered as participants upon ticket creation. Carries the SLA facts `firstRespondedAt` (staff's first reply) and `resolvedAt` (the ticket was closed) |
| `ConversationParticipant` | Junction table for `Conversation` ↔ `User` |
| `ChatMessage` | Messages in a support `Conversation`; `origin` and `externalId` are generic provenance/idempotency markers |
| `DirectThread` | 1-on-1 negotiation thread between a client and freelancer (optionally scoped to a job) |
| `DirectMessage` | Messages within a `DirectThread` |
| `AuditLog` | Append-only event record for important state transitions; hardened with `actorRole`, `action`, `previousState`, `newState`, `amountMinor`, `requestId`, `ipAddress`. Every row carries `retentionUntil` — the instant after which it may be purged (createdAt + `AUDIT_RETENTION_YEARS`, default 10 years) |
| `Skill` | Standardized skills available for profiles |
| `UserSkill` | Junction table for user skills and proficiency |
| `Review` | Double-blind contract feedback (author, target, contract, rating, comment); visible once both parties submit or 14-day window expires |
| `PortfolioItem` | Freelancer work samples (title, description, URL, attachments) |
| `FeaturedLog` | History of users featured in the talent carousel |
| `ProfileReport` | Moderation flags against inappropriate profile content |
| `ProfileView` | Analytical tracking of profile views |
| `CounterOffer` | Counter-offer record from proposal negotiation |
| `Gig` | Freelancer service package (Fiverr-style); owns `GigPackage` tiers, `GigOrder`s, and `GigReview`s; must pass staff moderation before status can reach `ACTIVE` |
| `GigPackage` | Pricing tier under a gig (BASIC/STANDARD/PREMIUM); unique `(gigId, tier)` |
| `GigOrder` | Client purchase of a package; reuses `EscrowState` + `totalChargeMinor`; revision loop counters; supports `DISPUTED` status |
| `GigReview` | Client review of a completed order, with `categoryRatings` JSON (communication/quality/deadline/value) |
| `PlatformOperatingAccount` | Singleton platform financial account; tracks `accumulatedWithholdingMinor`, `accumulatedVatMinor` |
| `PlatformFeeCredit` | Ledger of platform fee credits from each escrow release (supports both `milestoneId` and `gigOrderId`) |
| `WithholdingRemittanceReport` | Monthly withholding tax remittance reports generated by the monthly BullMQ worker; tracks ERA filing status |
| `LedgerAccount` | General ledger account in chart of accounts (ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE); tracks running `balanceMinor` |
| `LedgerJournal` | Atomic accounting transaction container with unique `idempotencyKey` and references |
| `LedgerEntry` | Individual debit or credit line item; enforces zero-sum invariant per journal |
| `PasswordResetToken` | Time-limited token for the password reset flow |
| `TelegramLoginCode` | Short-lived code issued during Telegram QR/web-login start, redeemed to mint a session |
| `PhoneVerificationCode` | SMS OTP for phone number verification. `purpose` scopes the code to the proof it gives — `PHONE_VERIFICATION` (control of the number) or `WITHDRAWAL` (approval of one payout) — so there is one outstanding code per (phone, purpose) and a login code can never approve a payment |

## Monetary Representation

All monetary values are integers in minor units. For ETB, `100` represents ETB 1.00. This applies to budgets, proposal amounts, milestones, payments, wallets, withholding, top-ups, and dispute splits. Floating-point values are accepted only at selected UI/form boundaries and converted before persistence. (Telebirr API communication converts minor units to decimal strings e.g. `500.00` externally without affecting DB storage).

## Enforced Invariants

- `Job.jobId -> Contract` is one-to-one through unique `Contract.jobId`.
- A freelancer has at most one proposal per job.
- Each provider transaction identifier is unique (e.g. Telebirr order ID format: `YKS-<timestamp>-<6char>`).
- Telebirr C2B Web Checkout integration requires no schema changes (`TELEBIRR` already exists in the `PaymentProvider` enum).
- A partial unique SQL index permits at most one `PENDING` payment transaction per milestone.
- A milestone has at most one dispute through unique `Dispute.milestoneId`.
- A gig order has at most one dispute through unique `Dispute.gigOrderId`.
- A `Dispute` row must have exactly one subject — either `milestoneId` OR `gigOrderId` — enforced by a DB CHECK constraint (`Dispute_subject_check`).
- A dispute also retains `contractId` for efficient party and queue queries.
- A wallet and KYC record are each one-to-one with a user.
- Release/refund/split services combine guarded updates with Prisma transactions; constraints support, but do not replace, service state checks.
- `AuditLog` is insert-only by application convention and database privileges.
- `AuditLog.retentionUntil` is NOT NULL: an audit row without a defined expiry is the ambiguity the ten-year retention requirement exists to remove. The purge runs through the `SECURITY DEFINER` function `purge_expired_audit_logs()`, which the application role may call but through which it holds no `DELETE` privilege on the table. The function deletes a row only when **both** its stamp has expired **and** it is at least ten years old, so a misconfigured retention period cannot shorten a statutory obligation.
- A contract has at most two reviews, one from each party, enforcing the double-blind system.
- Reviews are only visible once both parties have submitted them, or the 14-day window expires.
- Profile completeness percentage is dynamically calculated based on skills, bio, portfolio, and verified status.
- `LedgerJournal` entries must sum to zero (zero-sum invariant enforced by application).

## Important Enums

| Enum | Values |
|---|---|
| `ContractStatus` | `ACTIVE`, `COMPLETED`, `TERMINATED`, `CANCELLED` *(client 7-day cooling-off per ECA Proclamation 1205/2020)* |
| `UserRole` | `CLIENT`, `FREELANCER`, `BOTH` |
| `StaffRole` | `COMPLIANCE_OFFICER`, `ADMIN`, `SUPPORT`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN` |
| `KycTier` | `TIER_1`, `TIER_2`, `TIER_3` |
| `KycStatus` | `PENDING`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED` |
| `JobStatus` | `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `ProposalStatus` | `SUBMITTED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN`, `COUNTER_OFFERED` |
| `EscrowState` | `PAYMENT_PENDING`, `ESCROW_HELD`, `WORK_IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `ACCEPTED`, `RELEASED`, `DISPUTED`, `REFUNDED`, `PARTIAL_REFUND` |
| `LaunchCategory` | `WEB_APP_DEVELOPMENT`, `GRAPHIC_DESIGN`, `DIGITAL_MARKETING`, `CONTENT_WRITING`, `TRANSLATION`, `DATA_ENTRY`, `VIDEO_PRODUCTION`, `ACCOUNTING_BOOKKEEPING`, `LEGAL_RESEARCH`, `DATA_ANALYTICS` — **ten** launch subcategories, widened from six on 2026-11-12 by the Phase 0 launch-category lock. The migration is additive (`ALTER TYPE ... ADD VALUE`), so existing `Job.category` and `Gig.category` rows keep their values |
| `DisputeStage` | `NONE`, `STAGE_1_NEGOTIATION`, `STAGE_2_EVIDENCE`, `STAGE_3_MEDIATION`, `STAGE_4_ARBITRATION`, `RESOLVED` |
| `PaymentProvider` | `TELEBIRR`, `CBE_BIRR`, `M_PESA` — Safaricom M-Pesa added alongside Telebirr and CBE; `CHAPA` removed 2026-08-26 (app layer); inert enum value remains in PG16 until a PG17+ migration can drop it |
| `TransactionFlagType` | `STRUCTURING`, `VELOCITY`, `ROUND_AMOUNTS`, `PASS_THROUGH`, `WALLET_MISMATCH`, `STAFF_FLAGGED`, `VAT_THRESHOLD_REACHED` |
| `LedgerAccountType` | `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE` |
| `PayoutStatus` | `PENDING`, `PROCESSING`, `CONFIRMED`, `FAILED`, `REVERSED` |
| `GigStatus` | `DRAFT`, `ACTIVE`, `PAUSED`, `REJECTED`, `ARCHIVED` |
| `GigPackageTier` | `BASIC`, `STANDARD`, `PREMIUM` |
| `GigOrderStatus` | `PENDING_PAYMENT`, `ACCEPTED`, `ESCROW_HELD`, `WORK_IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `COMPLETED`, `CANCELLED`, `DISPUTED` |
| `Visibility` | `PUBLIC`, `PROPOSERS`, `PRIVATE` |

## Migration History

| Migration | Purpose |
|---|---|
| `20260805091433_init` | Core identity, KYC, marketplace, contract, escrow, dispute, top-up, wallet, and audit schema |
| `20260806081351_notification` | Notification persistence |
| `20260806095807_add_tms_module` | Chat/support and transaction-monitoring structures |
| `20260807120000_disputes_per_milestone` | Replace contract-wide dispute uniqueness with unique milestone disputes and contract index |
| `20260807123000_periodic_review_access` | Add/index `periodicReviewPending` so periodic review does not revoke verified access |
| `20260807130000_one_pending_funding` | Add partial unique index for one pending funding attempt per milestone |
| `20260809150000_add_chat_with_staff_assignment` | Staff support assignment and scoped chat management |
| `20260821215600_add_profile_reviews_chat_platform_models` | Profile items, reviews, user skills, counter offers, direct messaging, platform metrics, and password reset tokens |
| `20260826090000_tms_rules_and_chapa_removal` | TMS alignment (Master Design §11.4): added ROUND_AMOUNTS, strDeadlineAt (24h SLA), and removed Chapa |
| `20260829120000_gig_marketplace` | Gig/Package/Order/Review models + enums; `PlatformFeeCredit.milestoneId` nullable + `gigOrderId` column (append-only ledger supports both contract and gig releases) |
| `20260829130000_add_support_staff_role` | `SUPPORT` staff role for chat-only customer support accounts |
| `20260829220000_admin_phase1_rbac_audit` | Phase 1 RBAC: new `StaffRole` values (SUPER_ADMIN, OPERATIONS_ADMIN, FINANCE_ADMIN, DISPUTE_MEDIATOR, COMPLIANCE_ADMIN) + `AuditLog` hardening columns (`actorRole`, `action`, `previousState`, `newState`, `amountMinor`, `requestId`, `ipAddress`) with indexes |
| `20260829233000_gig_disputes_polymorphic` | Polymorphic dispute subject: `Dispute.contractId`/`milestoneId` nullable (unique dropped), `Dispute.gigOrderId` (`@unique` + FK), DB CHECK enforcing exactly one subject per dispute, `GigOrderStatus.DISPUTED`. Re-runnable (see note below). |
| `20261003120000_chatwoot_support_bridge` | Added `Conversation.channel`/`chatwoot*` columns plus `ChatMessage.origin`/`externalId` for a third-party agent inbox that was evaluated and then dropped |
| `20261003140000_drop_chatwoot_bridge_columns` | Removes the four unused `Conversation` Chatwoot columns. `ChatMessage.origin` and `ChatMessage.externalId` are KEPT as generic provenance and idempotency markers |
| `20261112140000_sla_tracking` | SLA facts: `Conversation.firstRespondedAt`, `Conversation.resolvedAt` and `Dispute.firstRespondedAt`. The **deadlines are derived** from `createdAt` plus the configured targets, so changing a target applies immediately to every open item and there is no stored deadline to go stale. Indexed on `(status, firstRespondedAt)` and `(stage, firstRespondedAt)` for the breach queries |
| `20261003150000_auth_federated_identity_guard` | Federated (OAuth) sign-in can no longer claim an existing password account |
| `20261003160000_chat_message_attachment_url_index` | Index on the chat attachment URL column for the evidence/attachment lookups |
| `20261003180000_telegram_login_codes` | Telegram web-login code table for the browser login handoff |
| `20261006120000_escrow_admin_holds` | `EscrowHold` — staff-placed administrative holds on a milestone's escrow |
| `20261006123000_session_version_revocation` | `User.sessionVersion` + `TokenSession`, so every session can be revoked at once |
| `20261007120000_guest_support_identity_isolation` | Guest support tokens pinned to one conversation; identity isolation for guest chat |
| `20261008120000_reconcile_ledger_and_payout_drift` | Reconciles the ledger and payout tables that had drifted; adds `M_PESA` and `CHECKOUT_PENDING` to their enums (re-runnable `DO $$` guards) |
| `20261009120000_ledger_and_payout_invariants` | Ledger and payout invariants (zero-sum journals, unique payout references) |
| `20261013120000_ledger_journal_balance_guard` | Statement-level trigger that rejects an unbalanced `LedgerJournal` |
| `20261013130000_phone_verification_otp` | Phone verification OTP table |
| `20261016120000_phone_verified_at` | `User.phoneVerifiedAt` — a payout destination is only accepted once the number is proven |
| `20261022120000_seed_demo_data` | Local demo seed data (development only) |
| `20261022150000_seed_demo_activity` | Local demo activity seed (development only) |
| `20261109120000_rotate_seeded_demo_passwords` | Pentest remediation (C-01): replaces the four committed Argon2id demo hashes with a hash of a value stored nowhere, and bumps `sessionVersion` so tokens issued before the rotation no longer validate |
| `20261112120000_launch_categories_ten` | Phase 0 launch-category lock: `LaunchCategory` widened from six to **ten** subcategories at launch. **Ten is not a ceiling** — the enum grows by `ALTER TYPE ... ADD VALUE IF NOT EXISTS` (with `duplicate_object` guards), so existing `Job.category` and `Gig.category` rows keep their values and more categories can be added at any time |
| `20261110120000_audit_log_retention` | Adds `AuditLog.retentionUntil` (NOT NULL, backfilled from `createdAt` + 10 years) with an index, and the `SECURITY DEFINER` function `purge_expired_audit_logs(batch_size)` that the retention worker calls. The application role gets EXECUTE only — it still holds no `DELETE` privilege on `AuditLog` |
| `20261110130000_phone_code_purpose` | Adds `PhoneVerificationCode.purpose` (default `PHONE_VERIFICATION`) so a withdrawal-approval code and a phone-verification code cannot cancel or substitute for each other |

### Re-runnable migrations

`20260829233000_gig_disputes_polymorphic` is written to be safely re-runnable (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DO $$ ... IF NOT EXISTS (pg_constraint) ... $$` guards around the FK and CHECK, since Postgres has no `ADD CONSTRAINT IF NOT EXISTS`). This matters because the migration previously assumed a virgin `Dispute` table and aborted on any database synchronised with `prisma db push` rather than `migrate`:

```
ERROR: column "gigOrderId" of relation "Dispute" already exists  (42701)
```

Re-running the fixed migration converges a drifted database to the intended schema instead of failing.

It also closes a genuine integrity gap: **`schema.prisma` declares `Dispute.gigOrderId` as `@unique`, but no migration ever created that index.** Only `db push` had been providing it. The migration now creates `Dispute_gigOrderId_key` explicitly.

`Dispute_subject_check` is deliberately *not* wrapped in a skip-if-violated guard: if existing rows violate "exactly one subject", the deploy must fail loudly rather than silently leave the money path unconstrained. Resolve offending rows first, then re-run.

**Do not use `prisma db push` on a shared environment.** It desynchronises `_prisma_migrations` from the real schema. Use `prisma migrate`.

Do not edit an applied migration. Change `schema.prisma`, create a new migration, review its SQL, then regenerate the Prisma client.

```bash
pnpm --filter backend prisma:migrate -- --name describe_change
pnpm --filter backend prisma:generate
pnpm --filter backend build
pnpm --filter backend test
```

## Local Connection

Docker maps host port `5433` to PostgreSQL container port `5432`:

```env
DATABASE_URL=postgresql://marketplace:marketplace_dev_only@localhost:5433/marketplace
```

## Production Controls

- Use a dedicated least-privilege application role.
- Revoke `UPDATE` and `DELETE` on `AuditLog` from the application role after migrations.
- Enable pgaudit and test its configuration in the target environment.
- Encrypt connections and backups, test restore procedures, and establish Ethiopian data residency.
- Monitor migration duration and lock behavior before production rollout.
- Reconcile wallet and payment transaction totals to provider settlement records.
