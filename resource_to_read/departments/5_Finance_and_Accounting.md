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
