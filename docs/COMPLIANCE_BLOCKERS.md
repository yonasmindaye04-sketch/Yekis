# Compliance Blockers (TIER 3)

The features in this document represent the final gaps between the codebase and the *Master Design, Legal and Compliance Document*. These items cannot be implemented purely in code right now because they require business, legal, or regulatory action outside the engineering team's control.

Once the business dependencies are resolved, engineering can replace the stubs with real implementations.

## 1. Separate Bank/Telebirr Escrow Account
**Domain**: Finance / Escrow
**Master Design Document Section**: 4.1 Payment, Escrow, and Ledger Setup
**Status**: Blocked on NBE / Bank licensing

**The Block**: Real money cannot flow through a single operating account. The platform must maintain a physically separate, ring-fenced bank account or Telebirr sub-account explicitly designated as a "Custodial Escrow Account". We cannot open this account until the National Bank of Ethiopia (NBE) clarifies the required licensing tier (Payment Gateway vs. simple marketplace agent) or a partner bank agrees to the specific legal structure.

**Current Code Implementation**:
- The ledger logic correctly separates the funds logically (see `PlatformOperatingAccount`, `PlatformFeeCredit` models).
- Escrow flow treats external payments as held in escrow, but they actually land in whatever default merchant account `telebirrClient` and `chapaClient` are configured with.
- The `withdrawFromWallet` (payouts to freelancers) method in `escrow.service.ts` is stubbed out and only logs a warning because we lack the automated payout API from Telebirr/banks.

## 2. ERA Withholding Tax Remittance API
**Domain**: Finance / Taxes
**Master Design Document Section**: 4.1.4 Withholding Tax Handling
**Status**: Blocked on ERA infrastructure limitations

**The Block**: The platform deducts a 2% withholding tax for TIN-holding freelancers. We must remit this to the Ethiopian Revenues and Customs Authority (ERA). However, ERA currently provides no machine-to-machine API for automated remittance.

**Current Code Implementation**:
- The system correctly calculates, deducts, and aggregates the withholding tax (`withholdingRemittance.worker.ts`).
- It generates a monthly `WithholdingRemittanceReport`.
- A human must manually log into the ERA portal or submit paperwork with this report, and then call the `/api/v1/finance/withholding/:reportId/file` endpoint to record the `eraReferenceNumber`.

## 3. Real PEP & Sanctions Screening Provider
**Domain**: KYC / AML Compliance
**Master Design Document Section**: 4.4.2 Verification Levels (Tier 2/3)
**Status**: Blocked on vendor selection and budget approval

**The Block**: The platform must screen freelancers reaching Tier 2 (transacting > 50,000 ETB) against Politically Exposed Persons (PEP) lists and international/local sanctions lists. We cannot build this until the Compliance Officer selects and contracts with a provider (e.g., ComplyAdvantage, LexisNexis, or a local Financial Intelligence Center feed).

**Current Code Implementation**:
- The screening interface is defined (`src/modules/kyc/pep.client.ts`).
- A mock watchlist is implemented for testing the workflow and compliance queues.
- `server.ts` contains a hard guard that prevents the application from booting in `NODE_ENV=production` if `PEP_PROVIDER` is set to `mock`.

## 4. Fayda API Credentials and Production Contract
**Domain**: KYC
**Master Design Document Section**: 4.4.1 Identity Verification (Fayda Integration)
**Status**: Blocked on government approval process

**The Block**: We need the Fayda National ID for biometric deduplication and identity verification. The application for API access is submitted but pending final approval and the signing of the data processing agreement.

**Current Code Implementation**:
- The integration interface is defined (`src/modules/kyc/fayda.client.ts`).
- A deterministic mock implementation allows the rest of the flow (dedup, review queue) to be tested.

## 5. PDPP Data Localization for Object Storage
**Domain**: Data Privacy
**Master Design Document Section**: 3.2 Data Protection & Legal Requirements (PDPP No. 1321/2024 Art. 22)
**Status**: Blocked on Cloud Provider infrastructure availability

**The Block**: The Personal Data Protection Proclamation (PDPP) mandates that biometric data, KYC documents, and dispute evidence must be hosted within Ethiopia unless explicit cross-border transfer agreements are approved by the ECA. AWS S3 / GCP are not compliant out-of-the-box.

**Current Code Implementation**:
- The code uses standard S3-compatible APIs (`src/lib/objectStore.ts`).
- A clear warning is documented in `objectStore.ts` that the `OBJECT_STORE_ENDPOINT` must be pointed to Ethio Telecom Cloud, Safaricom Ethiopia Cloud, or a local MinIO deployment in production.

## 6. Real-Time Data Breach Reporting to ECA
**Domain**: Security / Legal
**Master Design Document Section**: 3.3 Security & Breach Notification
**Status**: Blocked on ECA portal/API

**The Block**: The law requires reporting significant data breaches to the Ethiopian Communications Authority (ECA) within 72 hours. The ECA does not have an automated webhook or API for this.

**Current Code Implementation**:
- A scaffolded file exists (`src/lib/breachAlert.ts`) which currently sends a critical alert to the internal Security team via Telegram/email. The security team must manually file the report with the ECA if required.
