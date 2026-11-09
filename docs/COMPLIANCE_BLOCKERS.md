# Compliance Blockers (TIER 3)

The features in this document represent the final gaps between the codebase and the *Master Design, Legal and Compliance Document*. These items cannot be implemented purely in code right now because they require business, legal, or regulatory action outside the engineering team's control.

Once the business dependencies are resolved, engineering can replace the stubs with real implementations.

> **2026-11-09 correction pass.** Every statement below was re-verified against `apps/backend/src`, `apps/backend/prisma/schema.prisma`, and `apps/backend/src/config/env.ts`. Four factual errors were corrected: the withholding rate is **3% / 30%, not 2%**; the withholding is **gated off at launch** (`TIN_FEATURE_ENABLED=false`), so it is currently **0%**; **Chapa is gone** and **Telebirr is the only live collection rail** (CBE and M-Pesa are throwing stubs); and **`withdrawFromWallet` is live** (Telebirr B2C), not stubbed. Three blockers that the documents require but the code has never had were added: 10-year audit retention, PDPP data-subject rights/erasure, and the real breach-notification dispatch. See `docs/DOCUMENT_UNIFICATION_2026-11-09.md`.

## 1. Separate Bank/Telebirr Escrow Account
**Domain**: Finance / Escrow
**Master Design Document Section**: 4.1 Payment, Escrow, and Ledger Setup
**Status**: Blocked on NBE / Bank licensing

**The Block**: Real money cannot flow through a single operating account. The platform must maintain a physically separate, ring-fenced bank account or Telebirr sub-account explicitly designated as a "Custodial Escrow Account". We cannot open this account until the National Bank of Ethiopia (NBE) clarifies the required licensing tier (Payment Gateway vs. simple marketplace agent) or a partner bank agrees to the specific legal structure.

**Current Code Implementation**:
- The ledger logic correctly separates the funds logically (see `PlatformOperatingAccount`, `PlatformFeeCredit` models).
- Escrow flow treats external payments as held in escrow, but they actually land in whatever default merchant account `telebirrClient` is configured with (`TELEBIRR_MERCHANT_APP_ID` / `TELEBIRR_MERCHANT_CODE`). There is **no** `chapaClient` — that adapter was deleted on 2026-08-26.
- **Correction:** `withdrawFromWallet` (`apps/backend/src/modules/escrow/escrow.service.ts:863`) is **not** stubbed. Telebirr B2C disbursement is implemented in `payout.service.ts`, with automatic wallet rollback and compensating double-entry ledger postings on provider refusal, and ledger posting on `CONFIRMED`. The real gap is **not** the payout API — it is the ring-fenced account itself.

## 2. ERA Withholding Tax Remittance API
**Domain**: Finance / Taxes
**Master Design Document Section**: 4.1.4 Withholding Tax Handling
**Status**: Blocked on ERA infrastructure limitations **and** on accountant confirmation (TAX-002)

**The Block**: The platform must remit withholding tax to the Ethiopian Revenues and Customs Authority (ERA). ERA currently provides no machine-to-machine API for automated remittance, and the accountant has not yet confirmed the filing channel, form numbers, frequency, deadline, payment procedure, supporting-document requirements, or responsible party.

**Current Code Implementation**:
- **Corrected rate:** the platform deducts **3% when the freelancer has a TIN on file and 30% when they do not**, on any payout at or above `WITHHOLDING_THRESHOLD_MINOR = 1_000_000` (10,000 ETB). It is **not** a flat 2%.
- **Correction — currently dormant:** the deduction is gated on `env.TIN_FEATURE_ENABLED` (`apps/backend/src/modules/escrow/fees.ts:35`), and that flag defaults to `"false"`. **Withholding is therefore 0% at launch**, and the freelancer keeps 93% of gross (a flat 7% platform fee, `PLATFORM_FEE_RATE_FREELANCER = 0.07`, with `PLATFORM_FEE_RATE_CLIENT = 0`). The 3%/30% rates are configured and tested but inactive until the flag is flipped (see `docs/DECISIONS.md` → *Holding TIN Requirement for MVP*).
- The system correctly calculates, deducts, and aggregates the withholding tax (`withholdingRemittance.worker.ts`) when the feature is enabled, and generates a monthly `WithholdingRemittanceReport`.
- A human must manually log into the ERA portal or submit paperwork with this report, and then call the `/api/v1/finance/withholding/:reportId/file` endpoint to record the `eraReferenceNumber`.
- Per the Roadmap's `TAX-002: OPEN ACTION`, the platform records withholding deductions in a tax-payable ledger entry but does **not** build a hard-coded monthly batch until the accountant confirms the procedure.

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
- A deterministic mock implementation allows the rest of the flow (dedup, review queue) to be tested. The dedup policy is explicit: auto-verify only when Fayda answers affirmatively *and* the resulting biometric ID is not already attached to another account; unavailable, rejected, or dedup-hit results go to `UNDER_REVIEW` (`src/modules/kyc/kyc.service.ts:46-54`).

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
- **Correction:** `src/lib/breachAlert.ts` does **not** send a Telegram/email/SMS alert. It calls `logger.fatal({ breachAlert: true, severity, affectedSystems, estimatedUsersImpacted }, ...)`. The dispatch to the internal Security Incident Response Team is **commented out** (`breachAlert.ts:34-36`):
  ```ts
  // TODO: Send critical SMS/Telegram/Email to the Security Incident Response Team (SIRT)
  // await notificationQueue.add("security-alert", { ...params });
  ```
  So today the alert is **log-only**. The `notificationQueue` exists and is live, so wiring the dispatch is a small code change, but the **72-hour ECA filing remains a human obligation** and is not automatable without an ECA API.

## 7. 10-Year Record Retention and WORM Storage
**Domain**: Compliance / Infrastructure
**Master Design Document Section**: 11 (AML record-keeping) and the Playbook's retention matrix (10 years for transaction, KYC, audit, and dispute records)
**Status**: **Not started in code** — the roadmap lists this as "Audit-Log Enforcement: PENDING EXECUTION CONFIRMATION"

**The Block**: The AML regime requires 10-year retention of transaction, KYC, audit, dispute, and STR records, stored WORM-compliant and encrypted. Turning that on requires infrastructure work (object lock, encrypted backups, partition strategy) plus the auditor's sign-off on the retention schedule.

**Current Code Implementation**:
- `AuditLog` (`apps/backend/prisma/schema.prisma:686-710`) is append-only **by application convention only**. It has no `expiresAt`/`retainUntil` column, no `retentionClass`, and there is **no purge or archival job** anywhere in `apps/backend/src`.
- There is **no WORM module** and no append-only partition enforcement in application code.
- `infra/postgres` provisions a pgaudit-enabled image, but the corresponding least-privilege grants and `AuditLog` revokes are not verified after deployment (still an open `[ ]` in `docs/COMPLETENESS_CHECKLIST.md`).
- The object store (`src/lib/objectStore.ts`) supports versioning and object lock only as a production configuration task — it is not configured, and no restore test has been run.

## 8. PDPP Data-Subject Rights (Access, Portability, Erasure)
**Domain**: Data Privacy
**Master Design Document Section**: 3.2 / Roadmap Phase 1 "Data Erasure Tooling"
**Status**: **Not started in code**

**The Block**: Under PDPP No. 1321/2024 the platform must honour data-subject access, portability, and erasure requests. Erasure must wipe marketing data, profile photos, and chat messages while **preserving AML transaction data under the 10-year hold** — that preservation rule needs legal sign-off before an erasure tool is built.

**Current Code Implementation**:
- **No tooling exists.** Grepping `apps/backend/src` for `exportData`, `downloadMyData`, `deleteAccount`, `erasure`, and `portability` returns **zero matches**. There is no "download my data" route, no data-export job, and no admin erasure tool.
- `User` rows, `ChatMessage` bodies, `ProfileReport`, and uploaded objects are therefore **not** erasable through any supported path today.

## 9. Multi-Rail Payment Collection (CBE Birr and M-Pesa)
**Domain**: Finance / Payments
**Master Design Document Section**: 4.1 Payment Integration, Master Design Decision Log `PAY-003` / `PAY-004`
**Status**: Blocked externally for CBE (PAY-004); **undecided** for M-Pesa (document/code divergence)

**The Block**: The Roadmap locks Telebirr and CBE as the approved collection rails and explicitly excludes Chapa. The Master Design Decision Log separately marks **M-Pesa = REMOVED**, but the codebase still ships an M-Pesa client stub, enum value, schema union member, and top-up route support. One of the two must give.

**Current Code Implementation**:
- **Telebirr is the only live collection rail.** `src/modules/escrow/providers/telebirr.client.ts` implements the full C2B Web Checkout flow with RSA-PSS signing and a Redis-cached fabric token, plus B2C payout.
- `src/modules/escrow/providers/cbe.client.ts` and `src/modules/escrow/providers/mpesa.client.ts` **always throw `PaymentProviderUnavailableError`** — they are stubs with a typed interface, not working adapters.
- There is **no** `chapa.client.ts`. The app-layer provider union (`src/schemas.ts:59`) and the escrow route enum (`src/modules/escrow/escrow.routes.ts:152`) list only `TELEBIRR`, `CBE_BIRR`, `M_PESA`, so a `CHAPA` request is a validation error. The Prisma `PaymentProvider` enum still carries an inert `CHAPA` value because PostgreSQL cannot drop an enum value before PG17+.
- M-Pesa checkout is additionally gated by `env.MPESA_CHECKOUT_ENABLED` (`env.ts:98`).

## 10. Legal/Commercial Items Outside The Engineering Boundary
**Domain**: Company / Legal / Finance / Operations
**Status**: Blocked on humans, not code

These appear in the Roadmap's Phase 0 but have no engineering deliverable and therefore no code gap to close:

| Item | Owner | Notes |
|---|---|---|
| Ethiopian law firm engaged; legal brief answered in writing | Founder/PM | Longest lead-time item in Phase 0; gates contract template, KYC framework, DPO decision |
| AML Proclamation gazette number confirmed | Counsel | Cited provisionally as No. 1387/2025 |
| Platform classification under NBE directives (payment instrument issuer vs. money transfer operator) | Counsel | Determines licensing burden |
| ECA Data Controller registration (PDPP Art. 6) | DPO / Legal | PDPP No. 1321/2024 |
| Register of Processing Activities (ROPA) — PDPP Art. 33 | DPO | Drafted; execution timestamp not recorded in the master compliance log |
| DPIA scope determination | DPO / Counsel | Required for ID + financial data processing |
| Subprocessor DPAs (Fayda, cloud provider, Telebirr, CBE) | Legal | Not yet executed |
| Minimum contractual age confirmation | Counsel | Implemented as `MINIMUM_CONTRACTING_AGE = 18` pending counsel |
| Certified-translation requirement for the Service Agreement | Counsel | Roadmap requires certified Amharic/Oromo/Tigrinya translations with English governing |
| Company registration (PLC), platform TIN, escrow-custodian bank account | Finance | Chart of accounts must separate Platform Revenue / Escrow Held / Tax Withholding Payable / VAT Payable |
| Cyber liability + fidelity/crime insurance | Finance | Required before real transaction volume |
| VAT registration threshold confirmation | Accountant | Code uses `VAT_THRESHOLD_MINOR = 45_000_000` (450,000 ETB); the Playbook's "ETB 1,000,000" is stale |
| Human mediators (x2) trained on the contract template | Operations | The `DISPUTE_MEDIATOR` staff role and mediation queue exist; the people do not yet |
| Helpdesk vendor selection | Operations | The native in-app support desk ships today; the Roadmap still lists this as pending |
| Production hosting in Ethiopia | Engineering | PDPP Art. 22 residency |

---

## How To Close Each Blocker

| # | Blocker | Unblocked by | Engineering work after unblocking |
|---|---|---|---|
| 1 | Ring-fenced escrow account | NBE / partner bank | Small — ledger already segregates; mostly config |
| 2 | ERA withholding remittance | Accountant + ERA channel | Small — report generation already ships; add filing only if an API appears |
| 3 | PEP/sanctions provider | Vendor + budget | Small — interface + mock already exist |
| 4 | Fayda credentials | Fayda office | Medium — replace the mock client |
| 5 | Ethiopian object storage | Cloud provider | Small — endpoint + credentials, plus object lock/retention config |
| 6 | ECA breach reporting | ECA API (may never exist) | Small — uncomment the notification dispatch; the 72-hour filing stays human |
| 7 | 10-year retention + WORM | Infrastructure + auditor | Medium — add retention columns, archival job, object lock, restore test |
| 8 | Data-subject rights / erasure | Counsel sign-off on the 10-year hold | Medium — export route, erasure tool, hold-preserving deletes |
| 9 | CBE / M-Pesa rails | CBE (PAY-004); product decision for M-Pesa | Large for CBE (real adapter + webhooks + reconciliation); Small for M-Pesa (delete the stub) |
| 10 | Legal/commercial items | Humans | None in code |
