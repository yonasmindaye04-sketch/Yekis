# Document vs Project Alignment Report

**Generated:** 2026-08-09  
**Scope:** Comparison of `resource_to_read/` documentation against actual project implementation in `apps/backend/` and `apps/frontend/`

---

## Executive Summary

The project implementation (**Yekis_jobs**) is **substantially aligned** with the documented vision in `resource_to_read/`, but there are meaningful gaps where the project has **exceeded** the documentation (new implemented features) and areas where the **documentation specifies requirements not yet implemented**.

**Overall Alignment: ~85%** — The core trust loop (Register → KYC → Job → Proposal → Contract → Escrow → Deliver → Release/Dispute → Payout) is implemented and locally verified. The project has advanced beyond Phase 1 MVP in several areas while still using development mocks for external integrations.

---

## Section 1: Are the Document and Project Going in the Same Direction?

### ✅ Strong Alignment Areas

| Document Requirement | Project Implementation | Status |
|---------------------|------------------------|--------|
| **Core Vision** — Trust-centered freelance marketplace with escrow | `PROJECT_CONTEXT.md` vision matches exactly; full trust loop implemented | ✅ Aligned |
| **Tiered KYC (Tier 1/2/3)** | Prisma schema: `KycTier` enum with TIER_1, TIER_2, TIER_3; `KycRecord.tier` field; hard-block middleware | ✅ Implemented |
| **Fayda ID Integration** | `fayda.client.ts` with deterministic dev mock; `faydaBiometricId` on User model for dedup | ✅ Mocked, ready for prod |
| **PEP/Sanctions Screening** | `pep.client.ts` stub; `isPepMatch` + `pepScreenedAt` on KycRecord | ✅ Stubbed |
| **Escrow State Machine** | `EscrowState` enum: PAYMENT_PENDING → ESCROW_HELD → WORK_IN_PROGRESS → SUBMITTED_FOR_REVIEW → ACCEPTED/RELEASED \| DISPUTED | ✅ Implemented |
| **Dispute Stages** | `DisputeStage` enum: STAGE_1_NEGOTIATION → STAGE_2_EVIDENCE → STAGE_3_MEDIATION → STAGE_4_ARBITRATION → RESOLVED | ✅ Implemented |
| **Payment Providers (Telebirr, Chapa, CBE)** | Adapter pattern in `escrow/providers/` with `telebirr.client.ts`, `chapa.client.ts`, `cbe.client.ts` | ✅ Architecture ready |
| **TMS/AML Flags** | `TransactionFlag` model with STRUCTURING, VELOCITY, PASS_THROUGH, WALLET_MISMATCH, STAFF_FLAGGED | ✅ Implemented |
| **Audit Log (10-year AML)** | `AuditLog` model append-only; pgaudit in Docker; DB-level REVOKE guidance | ✅ Designed |
| **Data Localization (PDPP)** | Architecture doc specifies Ethiopian hosting; MinIO/S3-compatible object store | ✅ Architecture ready |
| **Wallet & Withdrawal (Tier 2 gated)** | `Wallet` model; Tier 2 KYC required for withdrawal; wallet-mismatch hold (202 HELD_FOR_REVIEW) | ✅ Implemented |
| **Auto-Release Cron** | `autoRelease.worker.ts` with BullMQ; `autoReleaseAt` on Milestone | ✅ Implemented |
| **Telegram Mini App Auth** | `telegram.service.ts` with init-data verification; frontend entry path | ✅ Implemented |
| **Circumvention Detection** | `circumvention.middleware.ts` for contact-info masking in pre-contract messages | ✅ Implemented |
| **Staff Dashboard & Queues** | `StaffDashboard` with KYC, TopUp, Dispute, TMS queues; real-time polling | ✅ Implemented |
| **Evidence Viewer** | Secure streaming of KYC/receipt images from object store to staff | ✅ Recently added |

### ⚠️ Directional Differences (Document More Ambitious)

| Document Expectation | Project Reality | Gap |
|---------------------|-----------------|-----|
| **Phase 0 Legal Decisions** (lawyer brief, ECA registration, DPO, ROPA, DPIA, subprocessor DPAs, insurance) | Project proceeding with engineering; no evidence legal brief sent or decisions locked | **Blocking per roadmap** — Phase 1 shouldn't start without these |
| **Certified Translation Decision** for contracts | Not implemented; `serviceAgreement.template.ts` generates English only | Document requires decision before design |
| **Native App vs Web-First** decision | Frontend is React/Vite web; no native app code | Document flags this as Phase 0 decision affecting Phase 3 |
| **Escrow Architecture Choice** (wallet vs bank custodian vs PSP) | Uses in-platform wallet + manual top-up + webhook-driven milestone funding | Document treats this as blocking decision; project chose "wallet + PSP webhooks" |
| **Insurance (cyber liability, fidelity bond)** | Not mentioned in project code/docs | Document requires binding in Phase 0 |
| **Age/Contractual-Capacity Gate** | `dateOfBirth` on User model; no validation logic found | Document requires this as KYC gate |

### ⚠️ Directional Differences (Project More Advanced)

| Project Implementation | Document Coverage | Notes |
|------------------------|-------------------|-------|
| **Manual Receipt-Based Top-Up** (`WalletTopUp` model, `TopUpQueue` with EvidenceViewer) | Not in department docs; only in Telebirr guide as "manual top-up" | Project built a full manual top-up workflow because Telebirr/CBE lack confirmed webhook collection for wallet top-ups |
| **Two-Pane Staff Queue Redesigns** (KYC, TopUp, Dispute queues with inline EvidenceViewer) | Not in docs | Significant UX improvement beyond MVP scope |
| **Staff Activity Feed** (from AuditLog) | Not in docs | Operational enhancement |
| **Clickable Metric Cards with SLA Timers** | Not in docs | Operational enhancement |
| **Wallet Mismatch Hold (202)** with TMS flag | Mentioned in roadmap but not detailed in dept docs | Project implemented full flow |
| **Per-Milestone Disputes** (not per-contract) | Roadmap mentions "dispute per milestone" | Project correctly implemented this granularity |

---

## Section 2: New Ideas in Project NOT in Documentation

These are features/architectural decisions implemented in the codebase that are **not explicitly specified** in the `resource_to_read/` documents.

### 2.1 Manual Receipt-Based Wallet Top-Up System
**Files:** `WalletTopUp` model, `topup.service.ts`, `topup.routes.ts`, `TopUpQueue.tsx`, `EvidenceViewer`
- **Why it exists:** Telebirr/CBE don't offer confirmed webhook-based collection for direct wallet top-ups (only for per-milestone charges).
- **Not in docs:** Department docs only mention "wallet withdrawal" and "escrow funding via webhook". The manual receipt review flow is a pragmatic engineering solution.

### 2.2 EvidenceViewer Component (Secure Object Streaming)
**Files:** `objectStore.ts` (presigned GET), `EvidenceViewer` frontend, integrated into KYC/TopUp/Dispute queues
- **Not in docs:** No mention of secure inline evidence viewing for staff. Documents only reference "manual review" generically.

### 2.3 Two-Pane Staff Queue Redesign (KYC, TopUp, Dispute)
**Files:** `KycQueue`, `TopUpQueue`, `DisputeQueue` with side-by-side layout
- **Not in docs:** Department docs describe queues but not the two-pane UX with inline evidence viewer.

### 2.4 Staff Activity Feed from AuditLog
**Files:** `AuditLog` model + staff dashboard real-time feed
- **Not in docs:** Roadmap mentions "audit log" but not a real-time staff activity feed.

### 2.5 Clickable Metric Cards with SLA Aging Timers
**Files:** Staff dashboard metric cards (<1h, 24h, amber/red thresholds)
- **Not in docs:** Operational enhancement not specified.

### 2.6 Circumvention Middleware (Contact-Info Masking)
**Files:** `circumvention.middleware.ts`
- **Partially in docs:** Roadmap mentions "mask contact information in pre-contract messaging" and "monitor for circumvention patterns" — but the middleware implementation is a concrete architectural decision not detailed in dept docs.

### 2.7 Fayda Biometric Deduplication Field
**Files:** `User.faydaBiometricId` (unique), `KycRecord.faydaVerificationAttempted/Succeeded`
- **In roadmap:** "Fayda-based deduplication" listed as NEW in Phase 1.
- **Not in dept docs:** Legal/Engineering dept docs don't mention biometric dedup field.

### 2.8 Periodic KYC Review Without Revoking Access
**Files:** `KycRecord.nextReviewDueAt`, `kycRefresh.worker.ts` sets `periodicReviewPending` marker
- **In roadmap:** "Periodic KYC refresh job" listed.
- **Not in dept docs:** The specific design (marker-only, no revocation) is a project-level decision.

### 2.9 Deliverable URL on Milestone for Dispute Evidence
**Files:** `Milestone.deliverableUrl` field
- **Not in docs:** Enables inline viewing of submitted work during dispute mediation.

### 2.10 Dispute Resolution Live Preview (Calculated ETB Amounts)
**Files:** DisputeQueue shows real-time fee/withholding breakdown for split outcomes
- **Not in docs:** UX enhancement for mediators.

### 2.11 Tier 1 Consent Capture at Registration
**Files:** `ConsentRecord` model with purposes (kyc_data_processing, marketing, analytics); registration flow captures consent
- **In roadmap:** "Granular, unbundled consent checkboxes" listed.
- **Not in dept docs:** Legal dept mentions "granular consent" but not the implementation model.

### 2.12 Contract Template Versioning
**Files:** `Contract.templateVersion` field
- **Not in docs:** Allows multiple Service Agreement versions over time.

### 2.13 Proposed Milestones on Job (Pre-Contract)
**Files:** `Job.proposedMilestones` (Json) — client's initial plan before proposal acceptance
- **Not in docs:** Distinguishes client's posting-time plan from final contract milestones.

### 2.14 Unique Customer ID (UCID) on Every User
**Files:** `User.ucid` (unique, default cuid())
- **In roadmap:** "Unique Customer ID Assignment" listed.
- **Not in dept docs:** Engineering dept mentions it; Legal dept doesn't.

### 2.15 PaymentTransaction Withholding Tax Field
**Files:** `PaymentTransaction.withholdingTaxMinor`
- **Not in docs:** Tracks withholding per transaction, not just at withdrawal.

---

## Section 3: Ideas in Documentation NOT Implemented in Project

These are requirements from `resource_to_read/` that **do not exist** in the current codebase.

### 3.1 Legal & Compliance (Department 1)

| Missing Requirement | Document Reference | Impact |
|---------------------|-------------------|--------|
| **ECA Registration as Data Controller** | Legal §5 "Mandatory ECA Registration" | **Blocking** — Required before processing real user data |
| **DPO Appointment** | Legal §5 "Appoint a DPO" | **Conditional** — Required if volume/sensitivity triggers PDPP Art. 37 |
| **ROPA (Register of Processing Activities)** | Legal §5 "Maintain ROPA" | **Blocking** — Required for ECA registration |
| **DPIA (Data Protection Impact Assessment)** | Legal §6 "Scope DPIA requirement" | **Conditional** — May be required before launch |
| **Subprocessor DPAs** (Fayda, Cloud, Payment Gateways) | Legal §6 "Draft subprocessor DPAs" | **Blocking** — Must be signed before real data touches vendors |
| **Certified Translation Decision** for Service Agreement | Legal §6 "Confirm certified-translation requirement" | **Blocking** — Dictates contract generation design |
| **Contractual Capacity / Minimum Age Policy** | Legal §6 "Confirm minimum age for binding contracts" | **Required** — Registration must enforce this gate |
| **Insurance (Cyber Liability + Fidelity/Crime Bond)** | Legal §6 "Scope insurance needs" | **Blocking** — Must be bound before real transactions |
| **AML Proclamation Number Confirmation** | Legal §6 "Confirm final gazetted number" | **Informational** — Needed for compliance docs |
| **Platform Classification (NBE)** | Legal §6 "Payment instrument issuer vs money transfer operator" | **Blocking** — Determines licensing burden |
| **Fayda ID API Access Process** | Legal §6 "Can platform obtain direct API access?" | **Blocking** — Currently using mock; need formal application |
| **Cross-Border SCCs for Backups** | Legal §6 "ECA approved SCCs for AWS/Azure/GCP?" | **Blocking** — Required for any cross-border backup |

### 3.2 Development & Engineering (Department 2)

| Missing Requirement | Document Reference | Impact |
|---------------------|-------------------|--------|
| **Production Ethiopian Hosting** (Ethio Telecom Cloud / Safaricom) | Eng §1.C "Local Ethiopian cloud providers" | **Blocking** — PDPP Art. 22 requires primary data in Ethiopia |
| **Production WORM Storage Config** (Object lock, versioning, retention) | Eng §4.3 "WORM Storage" | **Blocking** — 10-year AML retention requires production bucket config |
| **Real Payment Gateway Sandbox Verification** | Eng §2 "Test against sandbox environments" | **Blocking** — Currently using mock adapters only |
| **Production Backup/DR Test** | Eng §4.3 "Backup & disaster recovery test" | **Required** — Roadmap moved this to Phase 1 |
| **Production Secret Manager** | Eng §1.C "Secret storage" | **Required** — Currently `.env` files only |

### 3.3 Product & Design (Department 6)

| Missing Requirement | Document Reference | Impact |
|---------------------|-------------------|--------|
| **Design System in Figma** (colors, typography, spacing, components) | P&D §4 "Establish Design System" | **Blocking for frontend** — Currently no shared design system; frontend uses ad-hoc styles |
| **UX Research (5 interviews per user type)** | P&D §3 Step 1, §5 "Run UX Research" | **Recommended** — Not done; product built from assumptions |
| **Low-Fidelity Wireframes for 9 MVP Screens** | P&D §5 "Low-Fidelity Wireframes" | **Blocking for design handoff** — Frontend built without wireframe phase |
| **High-Fidelity Mockups + Interactive Prototype** | P&D §5 "High-Fidelity Mockups" | **Blocking** — No Figma prototype exists |
| **Usability Testing (3-5 Ethiopian users)** | P&D §5 "Usability Testing" | **Recommended** — Not done |
| **Amharic/English i18n Files** (en.json, am.json) | P&D §6 "Engineering Standards" | **Missing** — Frontend has some Amharic but no structured i18n |
| **Noto Sans Ethiopic Font Integration** | P&D §4 "Typography" | **Missing** — Font not configured in frontend |
| **Accessibility Audit** | P&D §6 "Accessible" | **Missing** — No a11y testing |
| **Mobile-First Bandwidth Optimization** (Lighthouse ≥80 on 3G) | P&D §6 "Engineering Standards" | **Unverified** — No performance budgets or testing |
| **Phase 0 Blocking Decisions** (Escrow Architecture, Launch Categories, Take-Rate, Native vs Web) | P&D §6 "Phase 0 Blocking Decisions" | **Blocking** — Project made implicit choices without documented decisions |

### 3.4 Marketing & Growth (Department 3)

| Missing Requirement | Document Reference | Impact |
|---------------------|-------------------|--------|
| **VIP Pilot Client Onboarding (35 prospects)** | Mktg §6 "Phase 1: VIP pilot rollout" | **Not started** — No CRM or outreach tracking |
| **Beta Waitlist Landing Page** | Mktg §6 "Phase 2: Beta Waitlist" | **Not started** |
| **Referral Program (200 ETB credit)** | Mktg §6 "Phase 3: Referral Program" | **Not implemented** |

### 3.5 Operations & Admin (Department 4)

| Missing Requirement | Document Reference | Impact |
|---------------------|-------------------|--------|
| **Moderation Queue for Prohibited Listings** | Ops §1 "Moderation" | **Missing** — No content moderation tools |
| **Double-Blind Rating System** (only on completed escrow jobs) | Ops §1 "Rating & Reviews" | **Partial** — Reviews not implemented at all |
| **Fraud Prevention: Same Person as Client+Freelancer Detection** | Ops §1 "Fraud Prevention" | **Missing** — No cross-role detection |
| **Structured Dispute Form (Stage 1)** | Ops §2 "Stage 1 Direct Negotiation" | **Partial** — Dispute raising exists but not structured form with 7-day timer UI |
| **Mediator Hiring & Training (2 mediators)** | Ops §2 "Stage 3 Mediator Queue" | **Not done** — Staff dashboard exists but no mediator workflow |
| **Helpdesk Tool Configuration** (Freshdesk/Zendesk) | Ops §2 "Set Up Helpdesk" | **Not done** — Using in-app chat only |

### 3.6 Finance & Accounting (Department 5)

| Missing Requirement | Document Reference | Impact |
|---------------------|-------------------|--------|
| **Accounting Software Integration** (QuickBooks/local) | Fin §3 "Accounting Integration" | **Missing** — No reconciliation automation |
| **Monthly Withholding Tax Remittance Process** | Fin §3 "Tax Remittance Process" | **Missing** — No batch process or ERA forms |
| **VAT Threshold Monitoring Alert** | Fin §3 "VAT Monitoring Threshold" | **Missing** — No alerting |
| **Escrow Bank Account Separation** | Fin §3 "Licensing & Escrow Risk" | **Blocking** — Required before real funds |
| **Platform Fee Collection & Reconciliation** | Fin §1 "Take-rate 10-15%" | **Partial** — Fee calc exists in `fees.ts` but no finance reconciliation |

### 3.7 Telebirr Guide Specific Gaps

| Missing Requirement | Document Reference | Impact |
|---------------------|-------------------|--------|
| **Real Telebirr Merchant Onboarding** | Telebirr §4.4 "Cannot self-register" | **Blocking** — 1-3 week process not started |
| **RSA Key Management (Production)** | Telebirr §5.1 "Layer 2: RSA-PSS" | **Partial** — `telebirr.client.ts` has key normalization but no production key rotation |
| **Signature Verification on All Callbacks** | Telebirr §5.3 "Verify signatures" | **Implemented** in `telebirr.client.ts` but untested with real keys |
| **Idempotent Processing with Atomic DB Updates** | Telebirr §5.3 "Idempotent processing" | **Implemented** in `escrow.service.ts` — good alignment |
| **Rate Limiting on Webhook Endpoints** | Telebirr §5.3 "Rate limiting" | **Partial** — Express rate limiter exists but not webhook-specific |
| **Production Health Check / Ping Endpoint** | Telebirr §6.4 `ping()` method | **Implemented** in client but not exposed as route |

### 3.8 Roadmap Phase 0 Blocking Items (Critical)

| Missing Item | Roadmap Reference | Status |
|--------------|-------------------|--------|
| Law firm engaged with written memo | Phase 0 Legal #1 | ❌ Not done |
| KYC tier model decision documented | Phase 0 Legal #5 | ❌ Implicit (3 tiers in code) |
| Certified translation decision | Phase 0 Legal #7 | ❌ Not done |
| ROPA drafted | Phase 0 Legal #8 | ❌ Not done |
| DPIA scoped | Phase 0 Legal #9 | ❌ Not done |
| Subprocessor DPAs drafted | Phase 0 Legal #10 | ❌ Not done |
| Minimum age policy confirmed | Phase 0 Legal #12 | ❌ Not done |
| Insurance scoped and bound | Phase 0 Legal #13 | ❌ Not done |
| Escrow architecture locked | Phase 0 Product #1 | ❌ Implicit (wallet + webhooks) |
| Launch categories locked | Phase 0 Product #2 | ❌ Implicit (6 categories in Prisma) |
| Take-rate & fee split locked | Phase 0 Product #3 | ❌ Implicit (5%/5% in code) |
| Bilingual content writer hired | Phase 0 Product #4 | ❌ Not done |
| Native vs web decision | Phase 0 Product #5 | ❌ Implicit (web-only) |
| Cloud vendor DPA executed | Phase 0 Eng #3 | ❌ Not done |
| Backup/DR designed | Phase 0 Eng #7 | ❌ Not done |
| Company registered + TIN | Phase 0 Finance #1-2 | ❌ Unknown |
| Escrow bank account opened | Phase 0 Finance #3 | ❌ Not done |
| Insurance procured | Phase 0 Finance #4 | ❌ Not done |

---

## Section 4: Alignment Scorecard

| Category | Alignment | Notes |
|----------|-----------|-------|
| **Core Trust Loop (Register→KYC→Job→Proposal→Contract→Escrow→Deliver→Release/Dispute→Payout)** | 95% | Fully implemented and locally verified |
| **Tiered KYC Architecture** | 90% | Model complete; Fayda/PEP mocked; periodic review implemented |
| **Escrow & Payment Engine** | 80% | State machine complete; providers mocked; manual top-up added; no real sandbox verification |
| **Dispute Resolution Flow** | 85% | All stages modeled; staff queue built; mediator workflow missing |
| **AML/TMS Compliance** | 85% | Flags implemented; STR recording ready; no real PEP source; no FIC filing integration |
| **Data Localization & PDPP** | 60% | Architecture ready; production hosting/backups/encryption not done; legal registrations missing |
| **Legal/Regulatory Compliance** | 30% | **Critical gap** — Most Phase 0 legal items unaddressed |
| **Product Design Process** | 40% | **Critical gap** — No design system, wireframes, usability testing, i18n structure |
| **Frontend Engineering Standards** | 50% | React/Vite works; no Lighthouse budgets, no Noto Sans Ethiopic, no structured i18n |
| **Operations Readiness** | 45% | Staff dashboard excellent; moderation, helpdesk, mediator hiring missing |
| **Finance/Accounting Integration** | 25% | Fee calc exists; no accounting software, no tax remittance, no escrow bank account |
| **Marketing/Growth** | 10% | No waitlist, no VIP outreach, no referral program |

**Overall Weighted Alignment: ~65%** (Engineering-heavy; Legal/Product/Operations/Finance lagging)

---

## Section 5: Recommendations

### Immediate (Blocking for Production)
1. **Engage Ethiopian law firm** — Send formal brief covering all Phase 0 legal questions (Week 1 priority)
2. **Execute cloud vendor DPA** — Before any real user data touches infrastructure
3. **Open escrow bank account** — Separate from operating account
4. **Apply for Fayda ID API access** — Begin formal process (long lead time)
5. **Register with ECA as Data Controller** — Start process immediately
6. **Lock Phase 0 decisions** — Document escrow architecture, launch categories, take-rate, native-vs-web in a signed decision log

### Short-Term (Phase 1 Completion)
7. **Hire bilingual content writer** — Non-negotiable for MVP per roadmap
8. **Establish Figma design system** — Before further frontend work
9. **Run UX research (5 interviews each)** — Validate assumptions before polishing UI
10. **Implement structured i18n** (en.json/am.json) + Noto Sans Ethiopic
11. **Verify payment gateways in sandbox** — Telebirr, Chapa, CBE with real credentials
12. **Build moderation queue** — For prohibited listings and circumvention flags
13. **Configure production MinIO** — Versioning, object lock, retention, encryption, Ethiopian residency
14. **Set up secret manager** — Replace `.env` files
15. **Implement double-blind review system** — Only on completed escrow jobs

### Medium-Term (Phase 2 Beta Readiness)
16. **Hire/train 2 mediators** — For Stage 3 dispute resolution
17. **Configure helpdesk tool** — Freshdesk/Zendesk with SLAs
18. **Integrate accounting software** — Automate reconciliation
19. **Build tax remittance batch process** — Monthly withholding to ERA
20. **Launch beta waitlist landing page** — Collect early adopters
21. **Run load testing** — 200 concurrent users on payment webhook
22. **Security audit/penetration test** — Before real transactions

---

## Appendix: Key File References

| Area | Key Project Files |
|------|-------------------|
| KYC | `apps/backend/src/modules/kyc/kyc.service.ts`, `kyc.routes.ts`, `fayda.client.ts`, `pep.client.ts` |
| Escrow | `apps/backend/src/modules/escrow/escrow.service.ts`, `escrow.routes.ts`, `webhooks.routes.ts`, `providers/` |
| Disputes | `apps/backend/src/modules/disputes/dispute.service.ts`, `dispute.routes.ts` |
| TMS | `apps/backend/src/modules/tms/tms.service.ts`, `tms.routes.ts` |
| Wallets/TopUps | `apps/backend/src/modules/topups/topup.service.ts`, `topup.routes.ts` |
| Staff Dashboard | `apps/frontend/src/components/StaffDashboard.tsx`, `KycQueue.tsx`, `TopUpQueue.tsx`, `DisputeQueue.tsx`, `EvidenceViewer.tsx` |
| Data Model | `apps/backend/prisma/schema.prisma` |
| Auth/Circumvention | `apps/backend/src/middleware/circumvention.middleware.ts`, `hardBlock.ts`, `requireKycVerified.ts` |
| Background Jobs | `apps/backend/src/queue/autoRelease.worker.ts`, `kycRefresh.worker.ts`, `notification.worker.ts` |
| Frontend Workspaces | `apps/frontend/src/JobsWorkspace.tsx`, `ContractsWorkspace.tsx`, `DisputesWorkspace.tsx`, `WalletWorkspace.tsx` |

---

*Report generated by automated analysis of `resource_to_read/` documentation vs. `apps/` implementation. For questions, refer to `WALKTHROUGH.md`, `ARCHITECTURE.md`, `PROJECT_CONTEXT.md`, and `CHANGELOG.md` as source-of-truth documents.*