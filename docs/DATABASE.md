# Database Guide

Last updated: 2026-08-15

PostgreSQL is the transactional source of truth. Prisma defines the application model in `apps/backend/prisma/schema.prisma`; SQL migrations in `apps/backend/prisma/migrations` define the deployed history.

## Core Model Map

```mermaid
erDiagram
  User ||--|| KycRecord : has
  KycRecord ||--o{ KycDocument : contains
  User ||--o{ ConsentRecord : grants
  User ||--o{ Job : posts
  Job ||--o{ Proposal : receives
  User ||--o{ Proposal : submits
  Job ||--o| Contract : becomes
  Contract ||--o{ Milestone : contains
  Milestone ||--o{ PaymentTransaction : funded_by
  Milestone ||--o| Dispute : may_have
  Dispute ||--o{ DisputeEvidence : contains
  User ||--o| Wallet : owns
  User ||--o{ TopUpRequest : requests
  User ||--o{ Notification : receives
  User ||--o{ TransactionFlag : reviewed_for
  User ||--o{ AuditLog : acts_in
  Conversation ||--o{ ConversationParticipant : includes
  Conversation ||--o{ ChatMessage : contains
  User ||--o{ UserSkill : has
  Skill ||--o{ UserSkill : assigned_to
  User ||--o{ Review : writes (as author)
  User ||--o{ Review : receives (as target)
  Contract ||--o{ Review : contains
  User ||--o{ PortfolioItem : showcases
  User ||--o{ FeaturedLog : featured_in
  User ||--o{ ProfileReport : reported_in
  User ||--o{ ProfileView : viewed_in
```

## Entity Responsibilities

| Model | Responsibility and important invariants |
|---|---|
| `User` | Unique email, phone, UCID, optional Fayda/Telegram IDs; marketplace and staff roles; cached KYC fields and lifetime earn/spend totals |
| `ConsentRecord` | Purpose-specific consent history captured at registration |
| `KycRecord` | One per user; tier/status, Fayda/PEP fields, review metadata, `periodicReviewPending` |
| `KycDocument` | Metadata/path for object-stored identity evidence |
| `Job` | Client-owned scope, category, budget, deadline, proposed milestone JSON |
| `Proposal` | Freelancer offer; unique on `(jobId, freelancerId)` |
| `Contract` | One per job; client/freelancer parties, immutable PDF path, independent signatures, contract status |
| `Milestone` | Contract amount/due date and escrow state; can have one dispute |
| `PaymentTransaction` | Provider attempt/status/payload; unique provider transaction ID. Telebirr transactions store the merchant order ID formatted as `YKS-<timestamp>-<6char>` |
| `Wallet` | One balance per user in integer minor units |
| `TopUpRequest` | Receipt-backed manual credit request and staff decision |
| `Dispute` | Unique milestone case, staged deadlines, resolution outcome and optional split |
| `DisputeEvidence` | Party statement tied to a dispute |
| `TransactionFlag` | AML/TMS rule result and staff review/STR metadata (includes `strDeadlineAt` â€” 24h STR SLA clock set at detection) |
| `Notification` | User notification ledger and delivery metadata |
| `Conversation` | Support thread with participant relations, creatorId, and `assignedStaffId` for scoped staff access (creator and auto-assigned staff are registered as participants upon ticket creation). |
| `AuditLog` | Append-only event record for important state transitions |
| `Skill` | Standardized skills available for profiles |
| `UserSkill` | Junction table for user skills and proficiency |
| `Review` | Double-blind contract feedback (author, target, contract, rating, comment) |
| `PortfolioItem` | Freelancer work samples (title, description, URL, attachments) |
| `FeaturedLog` | History of users featured in the talent carousel |
| `ProfileReport` | Moderation flags against inappropriate profile content |
| `ProfileView` | Analytical tracking of profile views |
| `Gig` | Freelancer service package (Fiverr-style); owns `GigPackage` tiers, `GigOrder`s, and `GigReview`s |
| `GigPackage` | Pricing tier under a gig (BASIC/STANDARD/PREMIUM); unique `(gigId, tier)` |
| `GigOrder` | Client purchase of a package; reuses `EscrowState` + `totalChargeMinor`; revision loop counters |
| `GigReview` | Client review of a completed order, with `categoryRatings` JSON (communication/quality/deadline/value) |
| `LedgerAccount` | General ledger account in chart of accounts (Asset, Liability, Revenue); tracks running `balanceMinor` |
| `LedgerJournal` | Atomic accounting transaction container with unique `idempotencyKey` and references |
| `LedgerEntry` | Individual debit or credit line item; enforces zero-sum invariant per journal |
| `PayoutTransaction` | Freelancer withdrawal record tracking Telebirr B2C disbursement lifecycle and statuses |

## Monetary Representation

All monetary values are integers in minor units. For ETB, `100` represents ETB 1.00. This applies to budgets, proposal amounts, milestones, payments, wallets, withholding, top-ups, and dispute splits. Floating-point values are accepted only at selected UI/form boundaries and converted before persistence. (Telebirr API communication converts minor units to decimal strings e.g. `500.00` externally without affecting DB storage).

## Enforced Invariants

- `Job.jobId -> Contract` is one-to-one through unique `Contract.jobId`.
- A freelancer has at most one proposal per job.
- Each provider transaction identifier is unique (e.g. Telebirr order ID format: `YKS-<timestamp>-<6char>`).
- Telebirr C2B Web Checkout integration requires no schema changes (`TELEBIRR` already exists in the `PaymentProvider` enum).
- A partial unique SQL index permits at most one `PENDING` payment transaction per milestone.
- A milestone has at most one dispute through unique `Dispute.milestoneId`.
- A dispute also retains `contractId` for efficient party and queue queries.
- A wallet and KYC record are each one-to-one with a user.
- Release/refund/split services combine guarded updates with Prisma transactions; constraints support, but do not replace, service state checks.
- `AuditLog` is insert-only by application convention and database privileges.
- A contract has at most two reviews, one from each party, enforcing the double-blind system.
- Reviews are only visible once both parties have submitted them, or the 14-day window expires.
- Profile completeness percentage is dynamically calculated based on skills, bio, portfolio, and verified status.

## Important Enums

| Enum | Values |
|---|---|
| `ContractStatus` | `ACTIVE`, `COMPLETED`, `TERMINATED` |
| `UserRole` | `CLIENT`, `FREELANCER`, `BOTH` |
| `StaffRole` | `COMPLIANCE_OFFICER`, `ADMIN` |
| `KycTier` | `TIER_1`, `TIER_2`, `TIER_3` |
| `KycStatus` | `PENDING`, `UNDER_REVIEW`, `VERIFIED`, `REJECTED` |
| `JobStatus` | `OPEN`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| `ProposalStatus` | `SUBMITTED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`, `WITHDRAWN` |
| `EscrowState` | `PAYMENT_PENDING`, `ESCROW_HELD`, `WORK_IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `ACCEPTED`, `RELEASED`, `DISPUTED`, `REFUNDED`, `PARTIAL_REFUND` |
| `DisputeStage` | `NONE`, negotiation, evidence, mediation, arbitration, `RESOLVED` |
| `PaymentProvider` | `TELEBIRR`, `CBE_BIRR`, `M_PESA` â€” Safaricom M-Pesa added alongside Telebirr and CBE; `CHAPA` removed 2026-08-26 (app layer); inert enum value remains in PG16 until a PG17+ migration can drop it |
| `TransactionFlagType` | `STRUCTURING`, `VELOCITY`, `ROUND_AMOUNTS`, `PASS_THROUGH`, `WALLET_MISMATCH`, `STAFF_FLAGGED`, `VAT_THRESHOLD_REACHED` |
| `LedgerAccountType` | `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE` |
| `PayoutStatus` | `PENDING`, `PROCESSING`, `CONFIRMED`, `FAILED`, `REVERSED` |

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
| `20260826090000_tms_rules_and_chapa_removal` | TMS alignment (Master Design Â§11.4): added ROUND_AMOUNTS, strDeadlineAt (24h SLA), and removed Chapa |
| `20260829120000_gig_marketplace` | Gig/Package/Order/Review models + enums; `PlatformFeeCredit.milestoneId` nullable + `gigOrderId` column (append-only ledger supports both contract and gig releases) |
| `20260829130000_add_support_staff_role` | `SUPPORT` staff role for chat-only customer support accounts |
| `20260829220000_admin_phase1_rbac_audit` | Phase 1 RBAC: new `StaffRole` values (SUPER_ADMIN, OPERATIONS_ADMIN, FINANCE_ADMIN, DISPUTE_MEDIATOR, COMPLIANCE_ADMIN) + `AuditLog` hardening columns (`actorRole`, `action`, `previousState`, `newState`, `amountMinor`, `requestId`, `ipAddress`) with indexes |
| `20260829233000_gig_disputes_polymorphic` | Polymorphic dispute subject: `Dispute.contractId`/`milestoneId` nullable (unique dropped), `Dispute.gigOrderId` (`@unique` + FK), DB CHECK enforcing exactly one subject per dispute, `GigOrderStatus.DISPUTED`. Rewritten to be idempotent on 2026-10-03 and extended with the missing `Dispute_gigOrderId_key` unique index â€” see "Re-runnable migrations" below. |

| `20261003120000_chatwoot_support_bridge` | Added `Conversation.channel`/`chatwoot*` columns plus `ChatMessage.origin`/`externalId` for a third-party agent inbox that was evaluated and then dropped. |
| `20261003140000_drop_chatwoot_bridge_columns` | Removes the four unused `Conversation` columns again. `ChatMessage.origin` and `ChatMessage.externalId` are KEPT: they are generic provenance and idempotency markers, not Chatwoot-specific. |
### Re-runnable migrations

`20260829233000_gig_disputes_polymorphic` is written to be safely re-runnable (`ADD COLUMN IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, and `DO $$ ... IF NOT EXISTS (pg_constraint) ... $$` guards around the FK and CHECK, since Postgres has no `ADD CONSTRAINT IF NOT EXISTS`). This matters because the migration previously assumed a virgin `Dispute` table and aborted on any database synchronised with `prisma db push` rather than `migrate`:

```
ERROR: column "gigOrderId" of relation "Dispute" already exists  (42701)
```

Re-running the fixed migration converges a drifted database to the intended schema instead of failing.

It also closes a genuine integrity gap that predates the drift: **`schema.prisma` declares `Dispute.gigOrderId` as `@unique`, but no migration ever created that index.** Only `db push` had been providing it, so a database built purely from migrations would have permitted several disputes against the same gig order â€” on the escrow/dispute money path. The migration now creates `Dispute_gigOrderId_key` explicitly.

`Dispute_subject_check` is deliberately *not* wrapped in a skip-if-violated guard: if existing rows violate "exactly one subject", the deploy must fail loudly rather than silently leave the money path unconstrained. Resolve offending rows first, then re-run.

**Do not use `prisma db push` on a shared environment.** It desynchronises `_prisma_migrations` from the real schema, which is what produced this drift in the first place (see the 2026-09-21 CHANGELOG entry). Use `prisma migrate`.

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