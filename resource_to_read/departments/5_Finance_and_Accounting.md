# Finance & Accounting Department

This document contains all sections from the original legal design and compliance roadmap that are the direct responsibility of the Finance & Accounting Department.

## 1. Business Model and Fees
*   **Take-rate on transactions:** A percentage of each completed transaction. This is the simplest model, scaling automatically with platform activity.
*   **Suggested Take-rate:** 10–15% for a price-sensitive market (below the global 10–20% range). Recommended launch split: roughly 5% from the freelancer / 5% from the client.
*   **Payment Costs:** A small additional escrow/payment-processing fee (~1–2%) can be applied to cover underlying payment costs.

## 2. Tax Withholding & VAT Compliance
*   **TIN Collection:** Collect Ethiopian Tax Identification Numbers (TIN) from all freelancers.
*   **Withholding Tax:** Service payments of 10,000 ETB or more require withholding tax deductions. The platform must withhold 3% if the freelancer has provided a TIN, or 30% otherwise, and remit this to the tax authorities. (Freelancers remain responsible for filing their own income tax).
*   **Value Added Tax (VAT):** If total fee revenue (the platform's 10% cut) crosses relevant thresholds, 15% VAT must be collected and remitted to the government.

## 3. Escrow Architecture & Reconciliation
*   **Escrow Funds Flow:** Client deposits funds into escrow (Telebirr Pay, QR code, bank transfer) before work begins. Upon acceptance, the freelancer's portion goes to their wallet, and the platform's commission transfers to the platform's operating account.
*   **Licensing & Escrow Risk:** The choice of escrow architecture (in-platform wallet vs. bank custodian vs. third-party) determines the platform's licensing burden. Platform revenue must be strictly separated from user funds held in escrow.
*   **Dispute Reconciliation:** If a dispute is resolved via partial refund or full refund, Finance must ensure the funds are cleared from escrow accurately according to the platform mediation or arbitration outcomes.

## 4. Payment Settlement & Reconciliation (IMPLEMENTED)

### 4.1 Automatic Verification — No Manual Checking
*   Telebirr escrow funding settles **automatically**: Telebirr's server calls our signed webhook (`/api/v1/webhooks/telebirr`), which is cryptographically verified (RSA-PSS) before any funds state changes. Staff never verify screenshots or transfer references for API-funded milestones.
*   A reconciliation sweep (`paymentReconcile.worker.ts`, every 10 minutes by default) directly queries Telebirr's `queryOrder` API for any transaction still PENDING past 5 minutes, guaranteeing settlement even if a webhook is lost.
*   Every reconciled payment writes an auditable event (`PAYMENT_RECONCILED_VIA_QUERY`) — Finance can always answer *when* and *why* a transaction settled.

### 4.2 What Remains Manual (Finance/Ops Responsibility)
| Task | Owner | Notes |
| --- | --- | --- |
| Refunds via Telebirr merchant portal | Finance | No auto-refund in the checkout API |
| Dispute-mediated refunds/partial releases | Finance + Disputes | Cleared per mediation/arbitration outcome |
| PENDING transactions older than 3 hours | Ops review | Sweep stops querying; surfaced for manual follow-up |
| Manual receipt-based wallet top-ups (`WalletTopUp`) | Ops staff | Separate flow — receipt photo + reference verification |
| Monthly withholding remittance report | Finance | Automated report generated 1st of month, 02:00 EAT; filing/remitting is manual |

### 4.3 Tax Calculation (Automated in Code)
Withholding (3% with TIN / 30% without, threshold ETB 10,000) and the platform's VAT obligations are computed automatically at milestone release — see `WITHHOLDING_*` and `VAT_THRESHOLD_MINOR` config knobs. Freelancers remain responsible for their own income tax filing.
