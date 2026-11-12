# Compliance Blockers (TIER 3)

The features in this document represent the final gaps between the codebase and the *Master Design, Legal and Compliance Document*. These items cannot be implemented purely in code right now because they require business, legal, or regulatory action outside the engineering team's control.

Once the business dependencies are resolved, engineering can replace the stubs with real implementations.

> **2026-11-09 correction pass.** Every statement below was re-verified against `apps/backend/src`, `apps/backend/prisma/schema.prisma`, and `apps/backend/src/config/env.ts`. Four factual errors were corrected: the withholding rate is **3% / 30%, not 2%**; the withholding is **gated off at launch** (`TIN_FEATURE_ENABLED=false`), so it is currently **0%**; **Chapa is gone** and **Telebirr is the only live collection rail** (CBE and M-Pesa are throwing stubs); and **`withdrawFromWallet` is live** (Telebirr B2C), not stubbed. Three blockers that the documents require but the code has never had were added: 10-year audit retention, PDPP data-subject rights/erasure, and the real breach-notification dispatch. See `docs/DOCUMENT_UNIFICATION_2026-11-09.md`.

> **2026-11-10 code pass.** Blockers **6**, **7** and **8** had code-only parts that did not need a decision, and those are now implemented:
>
> - **#6 (breach reporting)** — the response workflow now runs end to end: containment, staff notification by SMS/Telegram, user notification, an audit record, the 72-hour clock, and a prepared ECA filing template. The *filing* is still human — there is no ECA API.
> - **#7 (10-year retention)** — `AuditLog.retentionUntil` (NOT NULL, 10 years) and a daily purge that runs through a `SECURITY DEFINER` function with a hard ten-year floor in SQL. WORM storage and the least-privilege grant verification are still open.
> - **#8 (data-subject rights)** — a complete export and an erasure that destroys the personal content, closes the account and retains the AML and financial records. The retained-field list still needs counsel sign-off.
>
> What remains on each of the three is the part that is not code: the ECA filing, object lock and restore testing, and the legal review of the retained set.

## 1. Separate Bank/Telebirr Escrow Account
**Domain**: Finance / Escrow
**Master Design Document Section**: 4.1 Payment, Escrow, and Ledger Setup
**Status**: Blocked on NBE / Bank licensing

**The Block**: Real money cannot flow through a single operating account. The platform must maintain a physically separate, ring-fenced bank account or Telebirr sub-account explicitly designated as a "Custodial Escrow Account". We cannot open this account until the National Bank of Ethiopia (NBE) clarifies the required licensing tier (Payment Gateway vs. simple marketplace agent) or a partner bank agrees to the specific legal structure.

**Current Code Implementation**:
- The ledger logic correctly separates the funds logically (see `PlatformOperatingAccount`, `PlatformFeeCredit` models).
- Escrow flow treats external payments as held in escrow, but they actually land in whatever default merchant account `telebirrClient` is configured with (`TELEBIRR_MERCHANT_APP_ID` / `TELEBIRR_MERCHANT_CODE`). There is **no** `chapaClient` — that adapter was deleted on 2026-08-26.
- **Correction:** `withdrawFromWallet` (`apps/backend/src/modules/escrow/escrow.service.ts:915`) is **not** stubbed. Telebirr B2C disbursement is implemented in `payout.service.ts`, with automatic wallet rollback and compensating double-entry ledger postings on provider refusal, and ledger posting on `CONFIRMED`. The real gap is **not** the payout API — it is the ring-fenced account itself.
- **⚠️ Related finding (`ESC-003`, not a blocker but a divergence):** the wallet-funding path no longer holds funds in escrow at all. `fundMilestoneFromWallet` (`escrow.service.ts:157-300`) credits the freelancer immediately and claims the milestone as `RELEASED`, so the escrow hold, the client-acceptance step, and the dispute window do not exist on that path. The ring-fenced-account work above assumes a real escrow balance exists; on the current wallet path there is none to segregate. Recorded in `docs/DOCUMENT_UNIFICATION_2026-11-09.md` §Part 1 row 1.9.

## 2. ERA Withholding Tax Remittance API
**Domain**: Finance / Taxes
**Master Design Document Section**: 4.1.4 Withholding Tax Handling
**Status**: Blocked on ERA infrastructure limitations **and** on accountant confirmation (TAX-002)

**The Block**: The platform must remit withholding tax to the Ethiopian Revenues and Customs Authority (ERA). ERA currently provides no machine-to-machine API for automated remittance, and the accountant has not yet confirmed the filing channel, form numbers, frequency, deadline, payment procedure, supporting-document requirements, or responsible party.

**Current Code Implementation**:
- **Corrected rate:** the platform deducts **3% when the freelancer has a TIN on file and 30% when they do not**, on any payout at or above `WITHHOLDING_THRESHOLD_MINOR = 1_000_000` (10,000 ETB). It is **not** a flat 2%.
- **Correction — deferred and commented out (2026-11-12):** the withholding block in `calculateFees()` (`apps/backend/src/modules/escrow/fees.ts`) is **commented out**, so **withholding is 0** rather than merely gated off. The rates and the ETB 10,000 threshold stay in `env.ts` and `TIN_FEATURE_ENABLED` stays as the switch, so reactivation is a one-line change. The freelancer keeps **92.5%** of gross (7% platform commission + 0.5% payment/disbursement provider fee; `PLATFORM_FEE_RATE_CLIENT = 0`). Reason: the ERA remittance channel, form numbers, filing frequency and responsible party are unconfirmed (TAX-002), and deducting an unverified statutory amount before the accountant confirms would take money from workers on a guess (see `docs/DECISIONS.md` → *Deferred Statutory Withholding*).
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
**Status**: **Response workflow implemented** — the ECA filing itself remains a human obligation

**The Block**: The law requires reporting significant data breaches to the Ethiopian Communications Authority (ECA) within 72 hours. The ECA does not have an automated webhook or API for this.

**Current Code Implementation**:
- ✅ **The alert is no longer log-only.** `src/lib/breachAlert.ts` runs the whole response chain when an incident is opened:
  - **Contain** — every active session belonging to an affected user is revoked by bumping `sessionVersion`, which invalidates their tokens immediately without touching the account or any financial record.
  - **Notify staff** — every staff user is alerted in-app, by SMS and by Telegram, with the ECA deadline in the message. `security-breach` is a critical notification type, so it goes out over SMS.
  - **Notify users** — each affected user is told, one message each, without being told anything about the other users.
  - **Record** — the incident is written to the audit log as `SECURITY_BREACH_OPENED`, and the 72-hour deadline is computed from the detection instant.
  - **Prepare the filing** — `buildEcaNotificationTemplate()` produces the ECA notification with the PDPP-required fields filled in and the ones that need a human signature marked `[TO COMPLETE: …]`, so the filing starts from a complete list of questions instead of a blank page.
- ✅ **Staff can open an incident**: `POST /api/v1/admin/incidents/breach` (permission `incidents.manage`, fresh auth required) and `GET /api/v1/admin/incidents/breaches` lists the open incidents with the deadline and whether the filing is still inside the 72-hour window.
- ⛔ **Still a human obligation**: the ECA has no API, so a person must submit the filing. The template is prepared, not sent.
- ⛔ **Still open**: automated anomaly *detection* is not built — detection is staff-confirmed. A staff member opens the incident once they have confirmed a breach actually happened.
- ⛔ **Still open**: no DPO is appointed (PDPP Art. 37), so the contact point in the filing template is still a blank.

## 7. 10-Year Record Retention and WORM Storage
**Domain**: Compliance / Infrastructure
**Master Design Document Section**: 11 (AML record-keeping) and the Playbook's retention matrix (10 years for transaction, KYC, audit, and dispute records)
**Status**: **Retention column + purge job implemented** — WORM storage and the least-privilege grant verification remain open

**The Block**: The AML regime requires 10-year retention of transaction, KYC, audit, dispute, and STR records, stored WORM-compliant and encrypted. Turning that on requires infrastructure work (object lock, encrypted backups, partition strategy) plus the auditor's sign-off on the retention schedule.

**Current Code Implementation**:
- ✅ **`AuditLog.retentionUntil`** (`apps/backend/prisma/schema.prisma`) is **NOT NULL** and is stamped at write time as `createdAt + AUDIT_RETENTION_YEARS` (default 10 years) by `recordAuditEvent()`. Migration `20261110120000_audit_log_retention` backfills existing rows and adds the index.
- ✅ **The purge exists.** `purge_expired_audit_logs(batch_size)` is a `SECURITY DEFINER` function, so the application role can trigger the purge without holding `DELETE` on `AuditLog` — the "the app cannot delete audit rows" invariant survives. The `audit-purge` BullMQ worker runs it daily at 05:00 and writes an `AUDIT_LOG_PURGE` audit row of its own.
- ✅ **The floor is in SQL, not in configuration.** The function deletes a row only when its stamp has expired **and** the row is at least ten years old, so a misconfigured `AUDIT_RETENTION_YEARS` cannot shorten a statutory obligation.
- ⛔ **Still open**: there is **no WORM module** and no append-only partition enforcement in application code.
- ⛔ **Still open**: `infra/postgres` provisions a pgaudit-enabled image, but the corresponding least-privilege grants and `AuditLog` revokes are not verified after deployment (still an open `[ ]` in `docs/COMPLETENESS_CHECKLIST.md`). The new function's `GRANT EXECUTE` has the same requirement.
- ⛔ **Still open**: the object store (`src/lib/objectStore.ts`) supports versioning and object lock only as a production configuration task — it is not configured, and no restore test has been run.

## 8. PDPP Data-Subject Rights (Access, Portability, Erasure)
**Domain**: Data Privacy
**Master Design Document Section**: 3.2 / Roadmap Phase 1 "Data Erasure Tooling"
**Status**: **Implemented** — the exact retained-field list is still pending counsel sign-off

**The Block**: Under PDPP No. 1321/2024 the platform must honour data-subject access, portability, and erasure requests. Erasure must wipe marketing data, profile photos, and chat messages while **preserving AML transaction data under the 10-year hold** — that preservation rule needs legal sign-off before an erasure tool is built.

**Current Code Implementation**:
- ✅ **Access and portability**: `GET /api/v1/users/me/export` returns every category of personal data the platform holds — account, profile, verification, financials, marketplace activity, communications (consents, notifications, chat, DMs) and the compliance records. It is built by `apps/backend/src/modules/privacy/privacy.service.ts`, so the export and the erasure agree on what "personal data" means.
- ✅ **Erasure**: `POST /api/v1/users/me/erasure` (fresh auth required). It destroys the name, display name, bio, avatar, email, password, OAuth and Telegram identifiers, the chat and DM bodies, the portfolio, the skills, the marketplace copy on jobs, proposals, gigs, reviews and counter-offers, the notification preferences and notifications, and the analytics (profile views and featured-placement logs). It also deletes the chat attachments **from the object store**, including the local-disk fallback, because nulling the database row does not destroy the bytes.
- ✅ **The account is closed**: suspended, sessions revoked, the password randomised and the email replaced with a non-routable placeholder.
- ✅ **The AML and financial records are retained**, and the response says so explicitly rather than answering "your data has been erased" while the identity evidence is still on file. Retained: UCID, date of birth, Fayda biometric id, phone, the KYC record and documents, the wallet and its transactions, the ledger, the audit log, the transaction flags, the consent history, the contracts, milestones, disputes and evidence, and the reviews written *about* the user by other people.
- ✅ **Consent is revoked, not deleted.** Marketing and analytics get a new `granted: false` `ConsentRecord` row — the history of what was agreed to is itself the evidence.
- ✅ **Erasure is refused while money is in flight.** A non-zero wallet balance, a pending payout or top-up, an active contract or an open dispute each produce a specific `409 ERASURE_BLOCKED` blocker, because erasing the identity under money that is still owed would leave it unclaimable.
- ⛔ **Still open**: the exact retained-field list has not been reviewed by counsel. The split implemented here follows the Roadmap's wording ("wipe marketing data, photos, chat; preserve AML data") and deliberately retains rather more than less: an over-retention is a complaint, an under-retention is a regulatory breach.
- ⛔ **Still open**: if the object store is later configured with object lock in compliance mode, deletes will be rejected by the bucket rather than destroying the bytes, and erasure will need a separate retention-exception process. `deleteObject()` returns whether the delete actually took effect so that this is visible rather than silent.

## 9. Multi-Rail Payment Collection (CBE Birr and M-Pesa)
**Domain**: Finance / Payments
**Master Design Document Section**: 4.1 Payment Integration, Master Design Decision Log `PAY-003` / `PAY-004`
**Status**: Blocked externally for CBE (PAY-004); **undecided** for M-Pesa (document/code divergence)

**The Block**: The Roadmap locks Telebirr and CBE as the approved collection rails and explicitly excludes Chapa. The Master Design Decision Log separately marks **M-Pesa = REMOVED**, but the codebase still ships an M-Pesa client stub, enum value, schema union member, and top-up route support. One of the two must give.

**Current Code Implementation**:
- **Telebirr is the only live collection rail.** `src/modules/escrow/providers/telebirr.client.ts` implements the full C2B Web Checkout flow with RSA-PSS signing and a Redis-cached fabric token, plus B2C payout.
- `src/modules/escrow/providers/cbe.client.ts` and `src/modules/escrow/providers/mpesa.client.ts` **always throw `PaymentProviderUnavailableError`** — they are stubs with a typed interface, not working adapters.
- There is **no** `chapa.client.ts`. The app-layer provider union (`src/schemas.ts:59`) and the escrow route enum (`src/modules/escrow/escrow.routes.ts:153`) list only `TELEBIRR`, `CBE_BIRR`, `M_PESA`, so a `CHAPA` request is a validation error. The Prisma `PaymentProvider` enum still carries an inert `CHAPA` value because PostgreSQL cannot drop an enum value before PG17+.
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
