# Yekis Payment Flow

> This document describes the canonical, production-intended wallet-first payment lifecycle. All stages listed here reflect locally-verified behavior unless explicitly marked as **[PLANNED]** or **[STUB]**.

---

## Overview

Yekis uses an **in-platform wallet** as the single source of truth for all money movements. External payment providers (Telebirr, CBE) are only used to **deposit into** and **withdraw from** the platform — never to move money directly between clients and freelancers. All escrow, milestone funding, and payouts happen within the platform wallet layer.

---

## Full Flow Diagram

```
CLIENT                          PLATFORM                        FREELANCER
  │                                │                                │
  │  1. Top-up wallet              │                                │
  ├─ Send to Telebirr/CBE ────────►│                                │
  │    Upload receipt              │ Staff reviews receipt          │
  │                                │ → Approve: wallet credited     │
  │                                │ → Reject: no change            │
  │                                │                                │
  │  2. Post job                   │                                │
  ├────────────────────────────────►                                │
  │                                │                                │
  │                                │◄─── 3. Submit proposal ────────┤
  │                                │      (cover letter, quote,     │
  │                                │       milestone breakdown)     │
  │                                │                                │
  │  4. Accept proposal            │                                │
  ├────────────────────────────────►                                │
  │                                │ Contract + milestones created  │
  │                                │ PDF agreement generated        │
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
  │                                │ Client must top up + manually  │
  │                                │ fund from Contracts page       │
  │                                │                                │
  │                                │            6. Do the work ─────┤
  │                                │                                │
  │                                │◄─── 7. Submit delivery ────────┤
  │                                │ Milestone → SUBMITTED_FOR_REVIEW
  │                                │ Auto-release timer starts      │
  │                                │   (5 days, configurable)       │
  │                                │                                │
  │  8. Review & approve           │                                │
  ├────────────────────────────────►                                │
  │                                │ Milestone → RELEASED           │
  │                                │ Freelancer wallet credited     │
  │                                │   (net of platform fee +       │
  │                                │    withholding tax if ≥10kETB) │
  │                                │                                │
  │  Can re-hire if wallet has     │         9. Withdraw ───────────►
  │  leftover balance              │         Choose: Telebirr or CBE│
  │                                │         (Tier 2 KYC required)  │
  │                                │                                │
  │                                │    OR top up own wallet to ────►
  │                                │    hire someone else           │
```

---

## Stage Details

### Stage 1 — Client Top-Up
- Client sends money to Yekis Telebirr (0911 223 344) or CBE (1000 223 344)
- Uploads receipt with reference number in the Wallet tab
- Staff (Compliance Officer or Admin) reviews in the staff dashboard
- On approval: `wallet.balanceMinor` is incremented by the submitted amount
- On rejection: no balance change; client is notified

### Stage 2 — Job Posting
- Client fills in title, category, description, budget range, deadline
- A `Job` record is created with status `OPEN`

### Stage 3 — Proposal
- Freelancer submits a cover letter, quote (ETB), estimated days, milestone breakdown
- `Proposal` record created with status `SUBMITTED`

### Stage 4 — Proposal Acceptance
- Client reviews proposals and clicks Accept
- `Proposal` → `ACCEPTED`; all other proposals → `REJECTED`
- `Contract` created with milestones from the accepted proposal's breakdown
- PDF agreement generated and stored in MinIO
- Both parties see a "Sign agreement" button in their Contracts tab

### Stage 5 — Contract Signing & Auto-Fund
- Each party clicks "Accept agreement" independently
- When **both** have signed (`fullyExecuted = true`):
  - **If client wallet ≥ total milestone charge:** atomic transaction debits wallet + sets all milestones to `ESCROW_HELD`. Freelancer notified.
  - **If client wallet insufficient:** contract remains signed (legally valid); client receives a notification to top up. They can then manually fund each milestone from the Contracts page using the "Fund from wallet" button.

> **Fee calculation at funding:**
> - Client pays: `milestoneAmount × (1 + PLATFORM_FEE_RATE_CLIENT)`  (currently 5%)
> - Freelancer receives: `milestoneAmount × (1 - PLATFORM_FEE_RATE_FREELANCER)` minus withholding tax if milestone ≥ ETB 10,000  (currently 5% fee, 3% withholding with TIN / 30% without TIN)

### Stage 6 — Work
- Freelancer works. Milestone stays in `ESCROW_HELD` (or `WORK_IN_PROGRESS` if updated).

### Stage 7 — Submission
- Freelancer clicks "Submit delivery"
- Milestone → `SUBMITTED_FOR_REVIEW`
- Auto-release timer is scheduled (5 days by default, set by `AUTO_RELEASE_WINDOW_DAYS`)
- Client is notified

### Stage 8 — Approval & Fund Release
- **Client approves:** milestone → `RELEASED`; freelancer wallet credited (net of fees)
- **Auto-release:** if client does nothing for 5 days, worker auto-releases funds
- **Client disputes:** milestone frozen; dispute flow begins (negotiation → evidence → mediation → arbitration)

### Stage 9 — Freelancer Withdrawal
- Freelancer visits Wallet tab, picks **Telebirr** or **CBE Bank** payout destination
- Enters amount and phone/account number (must match verified identity — Tier 2 KYC required)
- `wallet.balanceMinor` debited immediately
- **[STUB]** Actual payout API to provider not yet implemented — balance is debited but funds are not sent in the current dev build. Do not use in production.

---

## Withdrawal Rules

| Role | Can withdraw? | Condition |
|------|---------------|-----------|
| Freelancer | ✅ Yes | Must have Tier 2 KYC; payout account must match verified identity |
| Client | ✅ Yes | Only if **no** active contract milestones in `[PAYMENT_PENDING, ESCROW_HELD, WORK_IN_PROGRESS, SUBMITTED_FOR_REVIEW]` **and** no open disputes |

---

## Re-hire / Leftover Balance
- If the client's wallet has a remaining balance after a contract completes, they can:
  - Post a new job and accept a new proposal (funds deducted at contract signing again)
  - Withdraw the remaining balance (subject to the no-active-contracts rule above)
- Freelancers with earnings in their wallet can:
  - Withdraw via Telebirr or CBE
  - Top up their wallet additionally and act as a **client** to hire other freelancers

---

## Error States

| Error code | Meaning | User message |
|------------|---------|--------------|
| `INSUFFICIENT_BALANCE` | Client wallet < milestone charge | "Insufficient wallet balance. Top up your wallet first." |
| `ACTIVE_CONTRACT_BLOCKS_WITHDRAWAL` | Client has active milestones or open disputes | "You cannot withdraw while you have active contracts or open disputes." |
| `HELD_FOR_REVIEW` | Withdrawal flagged by TMS (wallet mismatch) | "Withdrawal held for compliance review." |
| `CONTRACT_NOT_FULLY_EXECUTED` | Fund attempted before both signatures | "Both parties must sign the contract first." |

---

*Last updated: 2026-08-15 — reflects wallet-first escrow implementation.*
