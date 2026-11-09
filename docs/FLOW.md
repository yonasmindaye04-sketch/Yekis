# Yekis Payment & Transaction Lifecycle Flow

> This document describes the canonical, wallet-first transaction lifecycle across custom milestone contracts and Fiverr-style gig orders. All stages listed here reflect verified implementation behavior.

---

## Overview

Yekis uses an **in-platform wallet and transaction ledger** as the single source of truth for all money movements. External payment providers (**Telebirr**, **Commercial Bank of Ethiopia (CBE)**, and **Safaricom M-Pesa**) are used to **deposit into** and **disburse from** the platform. All milestone escrow holds, gig orders, platform fee recognitions, and withholding tax pools operate within the internal financial ledger.

---

## 1. Custom Contract Milestone Flow

```text
CLIENT                          PLATFORM                        FREELANCER
  │                                │                                │
  │  1. Top-up wallet              │                                │
  ├─ Telebirr / CBE / M-Pesa ─────►│                                │
  │    (Automated checkout or      │ Staff reviews manual receipts  │
  │     manual receipt fallback)   │ → Approve: wallet credited     │
  │                                │ → Reject: no change            │
  │                                │                                │
  │  2. Post job                   │                                │
  ├────────────────────────────────►                                │
  │                                │                                │
  │                                │◄─── 3. Submit proposal ────────┤
  │                                │      (quote, estimated days,   │
  │                                │       milestone breakdown)     │
  │                                │                                │
  │  4. Accept proposal            │                                │
  ├────────────────────────────────►                                │
  │                                │ Contract + milestones created  │
  │                                │ PDF agreement generated        │
  │                                │ 7-day cooling-off timer starts │
  │                                │                                │
  │  5. Both parties sign          │                                │
  ├─ Client signs ────────────────►│◄─── Freelancer signs ──────────┤
  │                                │                                │
  │                                │ FULLY EXECUTED trigger:        │
  │                                │ Check client wallet balance    │
  │                                │                                │
  │                   ┌── Sufficient balance ──────────────────────►
  │                   │            │ Deduct from client wallet      │
  │                   │            │ All milestones → ESCROW_HELD   │
  │                   │            │ Notify freelancer: work begins │
  │                   │            │                                │
  │◄── Notify: top up─┘── Insufficient balance                     │
  │                                │ Contract still signed (valid)  │
  │                                │ Client tops up + manual fund   │
  │                                │                                │
  │                                │            6. Do the work ─────┤
  │                                │                                │
  │                                │◄─── 7. Submit delivery ────────┤
  │                                │ Milestone → SUBMITTED_FOR_REVIEW
  │                                │ 7-day auto-release timer starts│
  │                                │                                │
  │  8. Review & approve           │                                │
  ├────────────────────────────────►                                │
  │                                │ Milestone → RELEASED           │
  │                                │ Freelancer wallet credited     │
  │                                │ Atomic platform fee & tax credit
  │                                │                                │
  │                                │         9. Withdraw ───────────►
  │                                │         Telebirr / CBE / M-Pesa│
  │                                │         (Tier 1 KYC verified in MVP; TIN/Tier 2 deferred)  │
  │                                │         Automated B2C transfer │
```

---

## 2. Gig Marketplace Order Flow

Alongside custom contracts, Yekis supports instant gig orders:

```text
CLIENT                          PLATFORM                        FREELANCER
  │                                │                                │
  │  1. Browse & select gig package│                                │
  │     (Basic / Standard / Premium)                                │
  ├────────────────────────────────►                                │
  │                                │                                │
  │  2. Order & fund escrow        │                                │
  │     (requireFreshAuth step-up) │ GigOrder created               │
  ├────────────────────────────────► Wallet debited (Price, no surcharge)│
  │                                │ GigOrder → ESCROW_HELD         │
  │                                │ Freelancer notified to start   │
  │                                │                                │
  │                                │◄─── 3. Submit deliverables ────┤
  │                                │ Order → SUBMITTED_FOR_REVIEW   │
  │                                │ 7-day auto-release scheduled   │
  │                                │                                │
  │  4. Client review:             │                                │
  │     - Request revision ───────►│ Revisions counter decremented │
  │     - Raise dispute ──────────►│ Escrow frozen; mediator queue  │
  │     - Accept delivery ────────►│ Order → COMPLETED              │
  │                                │ Freelancer wallet credited net │
  │                                │ Platform fee credited to ledger│
  │                                │ Prompt 4-category gig review   │
```

---

## 3. Detailed Stage Mechanics

### Stage 1 — Client Top-Up & Multi-Rail Ingestion
- **Automated Gateway Checkout:** Client initiates checkout (`POST /api/v1/wallet/topups/checkout`) using Telebirr, CBE Birr, or Safaricom M-Pesa. Successful provider webhook updates the top-up and credits wallet balance.
- **Manual Verification Fallback:** If gateway APIs experience latency or client transfers directly, client attaches the transfer reference and receipt image (`POST /api/v1/wallet/topups/:topUpId/attach-receipt`).
- **Staff Review:** Staff review pending requests in the Operations Console (`TopUpQueue`). Approval atomically increments `wallet.balanceMinor`, updates top-up status, and logs a `TOPUP_APPROVED` audit event.

### Stage 2 & 3 — Job Posting & Proposal Submission
- Client publishes job with category, description, budget range, and proposed milestones (`POST /api/v1/jobs`).
- Freelancers submit proposals with cover letters, quotes, timelines, and proposed milestone breakdowns (`POST /api/v1/jobs/:jobId/proposals`).
- Anti-self-bidding and serializable isolation prevent race conditions or duplicate awards.

### Stage 4 & 5 — Contract Execution, Cooling-Off, and Auto-Funding
- Client acceptance rejects competing proposals, updates job to `IN_PROGRESS`, and auto-generates the Master Service Agreement PDF.
- **Statutory 7-Day Cooling-Off Right:** Client retains statutory right to cancel (`POST /api/v1/contracts/:contractId/cancel-cooling-off`) per ECA Proclamation No. 1205/2020 while milestones remain in `PAYMENT_PENDING`.
- **Digital Signatures:** Both parties click "Accept agreement" independently (`POST /api/v1/contracts/:contractId/accept`).
- **Auto-Escrow Funding:** The moment the second signature commits:
  - If client wallet balance ≥ total milestone charge: atomically debits client wallet, sets all milestones to `ESCROW_HELD`, and notifies freelancer.
  - If wallet balance is insufficient: contract remains legally valid; client is notified to top up and fund milestones manually.

### Stage 6 & 7 — Work Delivery & Review Timers
- Freelancer completes work and uploads deliverables (`POST /api/v1/escrow/milestones/:milestoneId/submit`).
- Milestone transitions to `SUBMITTED_FOR_REVIEW`.
- BullMQ worker queues a 24-hour warning alert and schedules automatic release at 7 calendar days (`AUTO_RELEASE_WINDOW_DAYS = 7`).

### Stage 8 — Acceptance, Atomic Fee Recognition & Tax Withholding
- Upon client acceptance (or auto-release timer expiry):
  - Milestone transitions to `RELEASED`.
  - Net earnings credited to freelancer's wallet.
  - **Atomic Platform Fee Recognition (LED-002):** Platform commission (7% general platform fee, 0% client surcharge) is credited to `PlatformOperatingAccount` with a `PlatformFeeCredit` record.
  - **Withholding Tax Status:** Held at 0% for MVP launch pending tax authority remittance formalization (`TAX-002`). Freelancers receive 93% net payout.
  - When all milestones on a contract reach terminal states (`RELEASED`, `REFUNDED`, `PARTIAL_REFUND`), the contract is marked `COMPLETED`.

### Stage 9 — Payout & Automated B2C Disbursement
- Freelancer requests withdrawal to Telebirr, CBE, or M-Pesa (`POST /api/v1/escrow/wallet/withdraw`).
- **Tier 2 KYC Requirement:** Payouts require verified Tier 2 KYC (ID + TIN/business registration).
- **TMS Identity Matching:** Destination account must match verified user identity; mismatches return `202 HELD_FOR_REVIEW` and hold funds without debiting.
- **Provider Disbursement:**
  - Creates `PayoutTransaction` in `PROCESSING` state.
  - Initiates automated B2C payout API call (with deterministic sandbox simulation in development).
  - On provider success: transitions to `CONFIRMED` and posts double-entry general ledger records.
  - On provider rejection: transitions to `FAILED`, automatically rolls back the wallet balance, and writes a security audit event.

---

## 4. Withdrawal Rules & Governance

| Role | Permitted? | Conditions & Gates |
|---|---|---|
| **Freelancer** | ✅ Yes | Verified identity (Tier 1 verified in MVP; TIN/Tier 2 deferred); destination phone/account matches KYC identity; account not compliance-held or suspended. |
| **Client** | ✅ Yes | Permitted only if user has **zero active contract milestones** in non-terminal states and **no open disputes**. |

---

## 5. Standard Error Codes

| Error Code | HTTP Status | Description |
|---|---|---|
| `INSUFFICIENT_BALANCE` | 422 | Client wallet has insufficient funds to complete escrow funding. |
| `ACTIVE_CONTRACT_BLOCKS_WITHDRAWAL` | 403 | Client attempted withdrawal while holding active contracts or disputes. |
| `HELD_FOR_REVIEW` | 202 | Payout destination mismatched KYC identity; held for compliance review without wallet debit. |
| `CONTRACT_NOT_FULLY_EXECUTED` | 409 | Milestone funding attempted prior to dual digital contract signatures. |
| `COOLING_OFF_EXPIRED` | 409 | Statutory 7-day cancellation window has expired or work commenced. |

---

*Last updated: 2026-11-07 — fully aligned with multi-rail payments, gig marketplace, general ledger, and automated disbursements.*
