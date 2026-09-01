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
| `TransactionFlag` | AML/TMS rule result and staff review/STR metadata (includes `strDeadlineAt` — 24h STR SLA clock set at detection) |
| `Notification` | User notification ledger and delivery metadata |
| `Conversation` | Support thread with participant relations and `assignedStaffId` for scoped staff access |
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
| `DisputeResolutionOutcome` | `RELEASE_TO_FREELANCER`, `REFUND_TO_CLIENT`, `PARTIAL_SPLIT` |
| `PaymentProvider` | `TELEBIRR`, `CBE_BIRR` — PAY-002: `CHAPA` removed 2026-08-26 (app layer); inert enum value remains in PG16 until a PG17+ migration can drop it |
| `TransactionFlagType` | `STRUCTURING`, `VELOCITY`, `ROUND_AMOUNTS`, `PASS_THROUGH`, `WALLET_MISMATCH`, `STAFF_FLAGGED`, `VAT_THRESHOLD_REACHED` |

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
| `20260829120000_gig_marketplace` | Gig/Package/Order/Review models + enums; `PlatformFeeCredit.milestoneId` nullable + `gigOrderId` column (append-only ledger now supports both contract and gig releases) |

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
