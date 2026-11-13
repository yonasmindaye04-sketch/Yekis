# Roadmap ↔ Codebase Alignment

**Generated:** 2026-11-09
**Codebase HEAD:** `a15177e` (rows re-verified against `7babd4b` + the 2026-11-10 code pass)
**Baseline document:** *Master Engineering & Product Roadmap (Revised)* — Revision 2, July 2026
**Companion:** `docs/DOCUMENT_UNIFICATION_2026-11-09.md` (decision-by-decision map across all three documents)

**Rule:** the Roadmap is the **intent baseline**; the **codebase is the truth** for implementation status. Every row below was verified against `apps/backend/src`, `apps/backend/prisma/schema.prisma`, `apps/frontend/src`, and `.github/workflows`. Where the code diverges from a Roadmap decision, the divergence is **stated** rather than silently reconciled.

> **2026-11-10 code pass.** The rows marked ✅ below moved there in this pass and are the
> code-only items from the not-started / partial list: 2FA on withdrawals, the 10-year audit
> retention, the PDPP data-subject tooling, the armed cooling-off right, and the
> breach-notification response chain. The stale fee copy across the marketing and fiscal
> surfaces was corrected at the same time.

**Status labels**

| Label | Meaning |
|---|---|
| ✅ **Implemented** | Verified present and functional in the codebase |
| 🟡 **Partial** | Present but incomplete, narrowed, or gated off by default |
| 🔵 **Stub / Mock** | Typed interface exists; the implementation throws or returns mock data |
| ⛔ **Blocked — External** | Requires a human, a vendor, a regulator, or a credential |
| ⚪ **Not Started** | No code exists |
| ⚠️ **Divergence** | Roadmap and code disagree; both positions are stated |

---

## Phase 0 — Pre-Conditions & Foundations (Weeks 1–6)

### Legal & Compliance [BLOCKING]

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Engage an Ethiopian law firm — formal brief (ToS, Service Agreement, KYC/AML framework, PDPP, payment-facilitator classification) | ⛔ Blocked — External | No engineering deliverable. `docs/COMPLIANCE_BLOCKERS.md` #10 tracks it |
| Confirm AML Proclamation number (provisional No. 1387/2025) | ⛔ Blocked — External | Same |
| Determine platform classification under NBE Directives | ⛔ Blocked — External | Same |
| Fayda ID API access — begin formal application | ⛔ Blocked — External | Code side complete: `src/modules/kyc/fayda.client.ts` implements the interface with a deterministic mock; the staff review queue ships in the ops console (`pages/KycQueue.tsx`) |
| ECA registration as Data Controller (PDPP No. 1321/2024) | ⛔ Blocked — External | — |
| Appoint a DPO (PDPP Art. 37) | ⛔ Blocked — External | — |
| **Decide the KYC tier model** (3-tier vs. deliberately simplified single-tier) | ✅ **Implemented** | The explicit decision now exists: `TIN_FEATURE_ENABLED=false` + `requireKycVerified(env.TIN_FEATURE_ENABLED ? "TIER_2" : "TIER_1")` (`escrow.routes.ts:351`). Tier 2/TIN deferred to Phase 4. Recorded in `docs/DECISIONS.md` → *Holding TIN Requirement for MVP* |
| Confirm certified-translation requirement for the Service Agreement | ⛔ Blocked — External | — |
| Register the ROPA (PDPP Art. 33) | ⛔ Blocked — External | Roadmap marks it COMPLETE (drafted); execution timestamp still outstanding |
| Scope the DPIA requirement | ⛔ Blocked — External | — |
| Draft subprocessor DPAs (Fayda, cloud, Telebirr, CBE) | ⛔ Blocked — External | Note the list still names Chapa, which was removed (PAY-002) |
| Confirm minimum contractual age | ✅ **Implemented (pending counsel)** | `MINIMUM_CONTRACTING_AGE = 18` (`env.ts:248`), enforced at registration (`auth.service.ts:76`) |
| Scope insurance (cyber liability + fidelity bond) | ⛔ Blocked — External | — |
| Escrow bank custodian structure [DEFERRED] | ⛔ Blocked — External | `docs/COMPLIANCE_BLOCKERS.md` #1. The internal ledger already governs escrow state, so this does not block MVP |

### Product & Design Decisions [BLOCKING]

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Lock escrow architecture — Telebirr + CBE approved, **no Chapa**, bank-custodian deferred | ⚠️ **Divergence** | Chapa is fully removed ✅, but CBE has **no working adapter** (stub). See Phase 1 below |
| Lock launch categories (4–6 subcategories) | ⚠️ Partial | The code ships a skill taxonomy and category model, but the launch list is not code |
| Lock take-rate & fee split — "10% platform fee (recommended: 5% from freelancer / 5% from client)" | ⚠️ **Divergence** | Code uses a flat **7% from the freelancer, 0% from the client** (`PLATFORM_FEE_RATE_FREELANCER = 0.07`, `PLATFORM_FEE_RATE_CLIENT = 0`). Documented in `docs/DECISIONS.md` → *Platform-Wide 7% Only General Fee Rule*; the Roadmap wording is stale |
| Hire a bilingual (Amharic + English) content writer | ⛔ Blocked — External | — |
| Decide native app vs. web-first launch | ✅ **Implemented** | Web-first. Browser SPA + Telegram Mini App + Telegram Bot. No native app |

### Engineering Setup [PARALLEL]

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Version control & branching strategy | ✅ **Implemented** | Git monorepo; `main` + `design/landing-v2`, `design/ops-console`, `hardening/phase0` branches |
| Create developer accounts — sandbox credentials (Telebirr, Safaricom, CBE, EthSwitch) | ⛔ Blocked — External | No live sandbox credential is configured in the repo |
| Select & provision infrastructure (Ethio Telecom Cloud / Safaricom Ethiopia; dev/staging/prod) | 🟡 Partial | Local Docker Compose stack exists (postgres, redis, minio, opensearch). No staging or production environment; Ethiopian residency is a launch blocker |
| Confirm CBE integration path (Star Pay vs. classic CBE Birr merchant flow) | ⛔ Blocked — External | PAY-004, unchanged since 2026-08-26 |
| Execute the cloud vendor DPA | ⛔ Blocked — External | — |
| Define tech stack — React + Next.js, Node/Go, PostgreSQL + pgaudit, Redis, Ethiopian S3-compatible storage | ⚠️ Partial | React + **Vite** (not Next.js); Node/Express + TypeScript; PostgreSQL + pgaudit image (`infra/postgres`); Redis (BullMQ); MinIO/S3-compatible. Storage is **not** Ethiopian-hosted |
| **Set up CI/CD — auto-run tests on every PR, block merge on failure** | 🟡 **Partial** | `.github/workflows/ci.yml` runs the doc-parity check, secret scan, backend type-check, route-audit baseline gate, backend `pnpm test`, fresh-database check, and the frontend production build on every PR. **Gaps:** the frontend job runs *build only* (no frontend tests exist — zero test files, no runner), there is no frontend lint check, no migration-validation gate, no dependency scan, and `.github/workflows/deploy.yml` is a **placeholder** with no deploy steps |
| Configure monitoring & alerting (Sentry, uptime) | 🟡 Partial | `SENTRY_DSN` exists in `env.ts`; no uptime monitor, no alerting on the financial reconciliation paths |
| Design backup & DR from day one; test in Phase 1 | ⚪ **Not Started** | No backup schedule, no restore procedure, no RTO/RPO. `docker-compose.yml` has local volumes only |

**Phase 0 DoD** ("law firm engaged and all open legal questions answered in a written memo") — ⛔ Not met. The **engineering** sub-DoD ("all engineers can clone the repo, run the app locally, push a feature branch") is ✅ met.

---

## Phase 1 — Build The MVP (Weeks 7–22)

The Phase 1 rule is "build only what is necessary for the trust loop": Register → KYC → Post Job → Bid → Contract → Escrow → Deliver → Accept/Dispute → Payout.

### Engineering — Core Backend

| Roadmap item | Status | Evidence / note |
|---|---|---|
| User registration & login — email + phone OTP, language preference on the record | ✅ **Implemented** | `User.languagePreference`; email/password + phone OTP + Google/Apple/Facebook/Telegram OAuth + Telegram Mini App |
| Role system — CLIENT / FREELANCER / BOTH | ✅ **Implemented** | `User.role` |
| Session management — JWT + refresh tokens, secure cookie storage | ✅ **Implemented** | `JWT_ACCESS_TTL = "1h"`, `JWT_REFRESH_TTL = "30d"` (`env.ts:43-44`). The Playbook's "24h access / 7d refresh" is stale. Staff sessions are additionally capped at 12 h (`auth.service.ts:342`) |
| 2FA (SMS OTP) optional at MVP, **mandatory for withdrawals** | ✅ **Implemented** | A withdrawal requires an SMS approval code for **that** payout (`POST /api/v1/escrow/wallet/withdraw/otp` → `otpCode` on `POST /wallet/withdraw`). The code is consumed when the payout completes, so one code cannot authorise two payouts. `PhoneVerificationCode.purpose` scopes it, so a phone-verification code cannot approve a payment. `requireFreshAuth(300)` remains as well |
| **Hard Block System — unverified users blocked from withdrawing, changing profile, bidding, receiving payments** | ⚠️ **Partial / Divergence** | 7 routes gated by `requireKycVerified` (`src/middleware/hardBlock.ts`): job create (`jobs.routes.ts:77`), proposal create (`jobs.routes.ts:219`), gig create/update/order/order-fund (`gig.routes.ts:128,154,255,285`), withdrawal (`escrow.routes.ts:351`). **Profile editing is deliberately NOT gated** (`profile.routes.ts:59`) — it was removed because gating it blocked onboarding. The duplicate `src/middleware/requireKycVerified.ts` (0 importers) has been **deleted**; the live guard is `hardBlock.ts` |
| Age / contractual-capacity gate | ✅ **Implemented** | `MINIMUM_CONTRACTING_AGE = 18` |
| KYC document upload (National ID / Passport / Driver's Licence) to encrypted object storage | ✅ **Implemented** | 15 MB chat cap; KYC documents stored outside PostgreSQL. Object versioning / object lock / retention are production config tasks (`docs/COMPLIANCE_BLOCKERS.md` #7) |
| Fayda ID integration + manual review fallback | 🔵 **Stub / Mock** | `fayda.client.ts` mock; dedup policy explicit (`kyc.service.ts:46-54`); staff review queue ships |
| Tiered KYC model — Tier 1 / Tier 2 / Tier 3 | ✅ **Implemented** | `KycTier` enum + transitions. MVP runs **simplified single-tier** (see Phase 0) |
| **Unique Customer ID (UCID)** assigned at KYC completion; all transactions linked to the UCID | 🟡 Partial | `User.ucid` exists (`schema.prisma:182`) and is resolvable (direct-chat lookup). **Transactions link to `User.id`, not the UCID** |
| Fayda-based biometric deduplication | 🔵 **Stub / Mock** | Dedup logic is implemented against the mock's deterministic biometric ID |
| KYC state machine + notifications on each change | 🟡 Partial | `PENDING → UNDER_REVIEW → VERIFIED / REJECTED` implemented. `docs/hardening/UX-AUDIT.md` F-11 notes no user notification fires on VERIFIED/REJECTED |
| PEP screening on KYC submission | 🔵 **Stub / Mock** | `pep.client.ts` + mock watchlist; server refuses production boot with a mock provider |
| Periodic KYC refresh job | ✅ **Implemented** | `kyc-refresh` queue, daily; sets `periodicReviewPending` without revoking `VERIFIED` |
| Job posting (title, category, description, budget range, milestones, deadline) | ✅ **Implemented** | — |
| Proposal submission (cover letter, timeline, price, milestone breakdown) | ✅ **Implemented** | Serializable acceptance prevents multiple winners |
| Proposal review — shortlist, message, accept | ✅ **Implemented** | — |
| Category & search — filter by category, budget, delivery time; pagination | ✅ **Implemented** | OpenSearch with a PostgreSQL fallback (`searchIndex.service.ts`) |
| Mask contact information in pre-contract messaging | ✅ **Implemented** | Multi-script anti-circumvention engine (Fidel numerals, spelled words, obfuscation, leetspeak) |
| Off-platform solicitation policy in the ToS with real enforcement | 🟡 Partial | ToS text ships; the enforcement consequence (warning → suspension) is not a code path |
| Monitor circumvention patterns → moderation queue | ✅ **Implemented** | Flags surface in the ops console risk queue |
| Auto-generated Service Agreement PDF on proposal acceptance | ✅ **Implemented** | `generateServiceAgreementPdf`, template version pinned |
| Language / authoritative-version handling for the contract | 🟡 Partial | Bilingual copy exists; the certified-translation requirement is still a counsel question (Phase 0) |
| Digital acceptance — both parties accept, timestamped, immutable | ✅ **Implemented** | `clientAcceptedAt` / `freelancerAcceptedAt` |
| Contract storage — immutable, associated with both parties and the job | 🟡 Partial | `documentStoragePath` + `templateVersion`; immutable WORM storage is a production config task |
| Escrow state machine | ✅ **Implemented — ESC-003 resolved 2026-11-09** | Both funding paths land in `ESCROW_HELD`: external payment (`POST /escrow/fund`, Telebirr) via the signed webhook, and wallet funding (`POST /escrow/fund-from-wallet`) via the shared `placeEscrowHold()` helper. The freelancer is credited only by `releaseMilestoneFunds()` — on client acceptance, the 7-day auto-release, or a staff dispute resolution. Delivery, the 24 h warning, the auto-release timer, and dispute all work identically on both paths. The same bypass on the gig path was fixed the same way |
| Payment Integration (Telebirr) — initiate, callback, verify HMAC signature, sandbox test | ✅ **Implemented** | C2B Web Checkout with native Node RSA-PSS signing, Redis fabric-token cache, body-embedded signature verification, mock fallback |
| Payment Integration (M-Pesa) — secondary/fallback gateway | ⚠️ **Divergence** | `mpesa.client.ts` is a **stub** that throws `PaymentProviderUnavailableError`. Master Design `PAY-003` marks M-Pesa **REMOVED** — the Roadmap and the Master Design disagree with each other, and the code half-implements it. Needs a product decision |
| Payment Integration (CBE Birr) — tertiary option | 🔵 **Stub / Mock** | `cbe.client.ts` always throws. PAY-004 path unconfirmed |
| Fee engine — freelancer net, platform fee, provider fee | ⚠️ **Divergence (7% / 0% vs the Roadmap's 5% / 5%)** | Flat 7% from the freelancer, 0% client surcharge (`PLATFORM_FEE_RATE_FREELANCER = 0.07`, `PLATFORM_FEE_RATE_CLIENT = 0`), documented in `docs/DECISIONS.md` → *Platform-Wide 7% Only General Fee Rule*; the Roadmap wording is stale. The **provider fee (0.5%) is now part of the engine** (`PAYMENT_PROVIDER_FEE_RATE`), collected once on the transaction gross at release and routed to `REVENUE-DISBURSEMENT-FEES` — the platform's overall take is a single 7.5% rather than 7% at release plus a surprise 0.5% at cash-out |
| Three-pool financial ledger (LED-001) | ✅ **Implemented** | `PlatformOperatingAccount`, `PlatformFeeCredit`, `LedgerAccount` / `LedgerJournal` / `LedgerEntry` with a zero-sum invariant |
| Atomic milestone release + revenue recognition (LED-002) | ✅ **Implemented** | `releaseMilestoneFunds` (`escrow.service.ts:797-890`) runs one `prisma.$transaction` crediting the wallet, the operating account, `PlatformFeeCredit`, and the double-entry journal |
| **Withholding tax logic — 3% with TIN / 30% without, on payouts ≥ ETB 10,000** | 🟡 **Partial — dormant** | Rates and threshold are correct (`env.ts:259-261`), but `calculateFees` gates the whole calculation on `TIN_FEATURE_ENABLED`, which defaults to `false` (`fees.ts:35`). **Withholding is 0% at launch** |
| **Auto-release cron — 5 days after submission, notify 24 h before** | ⚠️ **Divergence (7 days)** | `AUTO_RELEASE_WINDOW_DAYS = 7` (`env.ts:263`), matching Master Design Clause 2.2(b) and the 24 h warning. The Roadmap's "5 days" is stale |
| Wallet system — internal balance, withdraw to Telebirr/CBE, minimum floor TBD | ✅ **Implemented** | Telebirr B2C disbursement is live with automatic wallet rollback. No minimum/maximum/cap/cooldown exists (`docs/hardening/UX-AUDIT.md` row 11) |
| TMS AML rule engine — structuring, velocity, pass-through, wallet mismatch | ✅ **Implemented** | `TMS_STRUCTURING_TOTAL_THRESHOLD_MINOR = 50_000_000` (500k ETB) / 168 h / min 2; velocity >3× the 90-day baseline with an absolute floor of 6 releases; round amounts ≥3 × 10k ETB; pass-through window 24 h |
| Compliance review queue + file an STR with the FIC within 24 h | 🟡 Partial | The queue and the 24 h SLA clock (`strDeadlineAt`, `STR_SLA_BREACH`) are implemented. **The platform records a human filing; it does not submit to the FIC** |
| Dispute Stage 0 prevention (job wizard + on-platform reminder) | ⚪ **Not Started** | No template-based job-creation wizard |
| Dispute Stage 1 — direct negotiation, 7-day countdown | ✅ **Implemented** | `STAGE_1_NEGOTIATION` |
| Dispute Stage 2 — auto-compiled evidence package, categorised dispute types | ✅ **Implemented** | Evidence bundle with SHA-256 hashed JSON |
| Dispute Stage 3 — mediator queue with a 3–5 day recommendation | ✅ **Implemented** | `DISPUTE_MEDIATOR` role, atomic queue claiming, arbitration award application. The **people** (2 trained mediators) are a Phase 0/1 hiring item |
| Dispute Stage 4 — AACCSA escalation mechanics | ⚪ **Not Started** | The arbitration *stage* exists in the state machine; the operational AACCSA procedure is not written down |
| Immutable audit log, 10-year retention | ✅ **Implemented** | `AuditLog.retentionUntil` is NOT NULL and stamped at write time as `createdAt + AUDIT_RETENTION_YEARS` (default 10 years). A daily `audit-purge` worker calls the `SECURITY DEFINER` function `purge_expired_audit_logs()`, which deletes a row only when **both** its stamp has expired **and** it is at least ten years old — so a misconfigured retention period cannot shorten a statutory obligation. The application role keeps no `DELETE` privilege on the table; it is granted `EXECUTE` on the function only. `docs/COMPLIANCE_BLOCKERS.md` #7 (WORM storage and the least-privilege grant verification remain open) |
| WORM storage — pgaudit + append-only partitioned tables | 🟡 Partial | pgaudit image exists in `infra/postgres`; grants/`AuditLog` revokes unverified after deployment; no partition enforcement |
| Consent management — granular unbundled checkboxes, stored timestamps | ✅ **Implemented** | 5 fields (`src/schemas.ts:134-141`): `kycDataProcessing` + `financialDataProcessing` required, `platformNotifications` / `marketingCommunications` / `analytics` optional. `ConsentRecord` rows are written |
| **Data Erasure Tooling** — wipe marketing data, photos, chat; preserve AML data | ✅ **Implemented** | `POST /api/v1/users/me/erasure` (fresh auth). Destroys the profile, bio, avatar, email, password, OAuth/Telegram identifiers, chat and DM bodies, the portfolio, the skills, the copy on jobs/proposals/gigs/reviews, the notifications, and the analytics; deletes the chat attachments from the object store **and** its local-disk fallback. Closes the account (suspended, sessions revoked). Retains the UCID, DOB, Fayda biometric id, phone, KYC record and documents, the wallet and its transactions, the ledger, the audit log, the flags, the consent history and the contracts/disputes — and says so in the response. Consent is revoked by a new `granted: false` row, never deleted. Refused with `409 ERASURE_BLOCKED` while money is in flight. `GET /api/v1/users/me/export` returns the complete archive. The retained-field list still needs counsel sign-off (`docs/COMPLIANCE_BLOCKERS.md` #8) |
| Breach notification workflow — 72 h, detect → contain → notify ECA → notify users → file | 🟡 **Partial — response chain implemented** | `src/lib/breachAlert.ts` now runs the whole chain: it **contains** (revokes every affected user's sessions by bumping `sessionVersion`), **notifies staff** in-app/SMS/Telegram, **notifies affected users** one message each, **records** the incident in the audit log, starts the **72-hour clock**, and **prepares the ECA filing** as a template with the PDPP-required fields filled in. `POST /api/v1/admin/incidents/breach` opens one and `GET /api/v1/admin/incidents/breaches` lists them with the deadline. Still human: the ECA has no API, so the filing is submitted by a person; and detection is staff-confirmed rather than automated |
| Backup & DR test against a restored environment; confirm RTO/RPO | ⚪ **Not Started** | — |

### Engineering — Frontend

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Bilingual (Amharic/English) toggle on first screen | ✅ **Implemented** | 4 languages (`en`/`am`/`om`/`ti`), **569 leaf keys** each, 40 nested objects, exact parity |
| KYC upload & status screen with tier guidance | ✅ **Implemented** | `BrowserVerification.tsx` |
| Client job posting wizard — category selector, milestone builder | 🟡 Partial | Job posting + milestone builder exist; the **step-by-step wizard** does not |
| Freelancer browse & bid — job board with filters, proposal form | ✅ **Implemented** | — |
| Contract view with digital signature confirmation | ✅ **Implemented** | — |
| Escrow dashboard — per-milestone status indicator, countdown, Accept/Release + Raise Dispute | ✅ **Implemented** | — |
| Milestone submission — files, links, text | ✅ **Implemented** | 15 MB attachment cap (`chat.routes.ts:69`); the Playbook's 50 MB is stale |
| Dispute flow — structured form, evidence thread, mediator recommendation | ✅ **Implemented** | — |
| User profile — verified badge, rating, portfolio, on-time rate, double-blind reviews | ✅ **Implemented** | Bayesian rating averages; blind reviews reveal after 14 days via the `review-reveal` queue |
| Wallet & withdrawal — balance, destination, transparent withholding before confirm | ✅ **Implemented** | The ops console fee breakdown shows 7% and the 93% net; `FeesPage.tsx` still carries **stale "2% WITHHOLDING" copy** (see *Known Code/Doc Divergences* below) |
| Notifications centre — in-app list, SMS for critical events | 🟡 Partial | In-app notifications ship; the SMS worker client exists but no production credentials |
| Mobile-first, bandwidth-first — Lighthouse ≥80 on simulated 3G; no image >200 KB | ⚪ **Not Started** | No Lighthouse gate in CI and no measured score |
| **Amharic/English i18n — all strings in i18n files, no hardcoded copy** | 🟡 Partial | 569 keys in `i18n.ts` and 243 in the bot's locale JSONs, but hardcoded copy still exists in components |
| Ethiopic font support — Noto Sans Ethiopic | ✅ **Implemented** | `index.css:1` imports Noto Sans Ethiopic; `--font-sans` / `--font-heading` fall back to it |
| Accessible — unique IDs, labels on all inputs, keyboard navigable | 🟡 Partial | Many `id`/`aria` attributes ship; **no formal accessibility audit** has been performed |
| Design system, UX research, wireframes, mockups, usability testing, design QA | ⛔ Blocked — External | Design artifacts, not code. No automated accessibility audit exists |

### Legal & Compliance (Phase 1) / Operations / Finance

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Finalize ToS & Privacy Policy (law firm) with 7-day cooling-off + arbitration clause | ⛔ Blocked — External | The public pages now ship complete version 1.1 documents (16 Privacy Policy sections, 22 Terms sections) through a shared accessible legal-document layout, with matching `docs/privacy-policy.md` and `docs/terms-of-service.md`. The seven-day cooling-off mechanism is armed in code (`Contract.cancellableUntil = createdAt + COOLING_OFF_DAYS`) and the seven-day auto-release is implemented. **External Ethiopian counsel approval of the legal text remains outstanding** |
| Finalize Service Agreement template (law firm) | ⛔ Blocked — External | The template exists in code (`serviceAgreement.template.ts`) but is not counsel-approved |
| Integrate legal text as screen-rendered text in the user's language | 🟡 Partial | Legal pages render in the app; the translated legal copy is not complete |
| KYC/AML procedures manual | ⛔ Blocked — External | — |
| Finalize subprocessor DPAs | ⛔ Blocked — External | — |
| Hire/train 2 mediators | ⛔ Blocked — External | The `DISPUTE_MEDIATOR` role and mediation queue exist; the people do not |
| Set up a helpdesk (Freshdesk / Zendesk) with SLAs | ⚠️ **Divergence — code is ahead** | A native in-app support desk ships: guest-scoped JWT chat, load-balanced staff assignment, OPEN/CLOSED workflow, attachments, unread counts, WebSocket delivery |
| Write internal playbooks (suspension, KYC review, STR filing, breach notification, AACCSA) | ⛔ Blocked — External | — |
| Set up a moderation queue for prohibited listings, user reports, circumvention flags | ✅ **Implemented** | Profile reports, gig moderation, TMS flags, and circumvention counters all feed staff queues in the ops console |
| Accounting integration — escrow + operating account to accounting software, real-time reconciliation | ⚪ **Not Started** | The internal ledger and reconciliation read models exist, but there is no connection to an external accounting package |
| Tax remittance process (TAX-002) | ⛔ Blocked — External | The platform records withholding in a tax-payable ledger entry and generates a monthly `WithholdingRemittanceReport`; a human files it and records the ERA reference. No hard-coded batch is built, exactly as the Roadmap's `TAX-002: OPEN ACTION` requires |
| VAT monitoring threshold alert | ✅ **Implemented** | `VAT_THRESHOLD_MINOR = 45_000_000` (450,000 ETB), `VAT_RATE = 0.15`, `VAT_REGISTERED = false`; alerts fire to Finance on release. The Playbook's "ETB 1,000,000" is stale |

---

## Phase 2 — Beta & Trust Verification (Weeks 23–30)

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Resolve P1/P2 bugs from internal testing | ⚪ Not Started | No tracking system in the repo |
| **Production payment credentials (PAY-006)** + the 8-operation verification matrix | ⛔ **Blocked — External** | Client payment, escrow funding, milestone release, freelancer payout, refunds, failed transaction handling, transaction-status confirmation, financial reconciliation — all require live credentials |
| Load testing — 200 concurrent users on the payment webhook endpoint | ⚪ **Not Started** | No load-test harness in the repo |
| Security audit — penetration test, secrets manager, HTTPS, rate limits, SQLi/XSS | ⛔ Blocked — External | Application-layer controls ship (Helmet, CORS, rate limiting, Zod validation, parameterised Prisma queries). The pentest itself is an external engagement. `docs/security/zap/` holds an OWASP ZAP scan from 2026-10-20 |
| Payment gateway go-live — switch sandbox keys to production | ⛔ Blocked — External | — |
| AML rule tuning from the first real flag set | ⚪ Not Started | Needs real volume |
| Performance optimisation — Lighthouse ≥80 on core screens | ⚪ Not Started | — |
| Uptime monitoring + on-call rotation | ⚪ Not Started | `SENTRY_DSN` exists; no PagerDuty or equivalent |
| Validate anti-circumvention detection against real usage | ⟡ Partial | The engine and the moderation queue exist; validation needs real traffic |
| Beta onboarding, feedback collection, first real dispute rehearsal, iteration sprint | ⛔ Blocked — External | Operations work |
| Beta User Agreements | ⛔ Blocked — External | — |
| Compliance mock audit | ⛔ Blocked — External | — |
| Beta waitlist landing page, beta stories | 🟡 Partial | The marketing site ships (landing, about, FAQ, fees, case studies, privacy, terms). A waitlist-capture flow and consented customer stories are not evidenced |

---

## Phase 3 — Pilot Launch (Weeks 31–40)

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Production hardening + data-residency confirmation | ⛔ Blocked — External | — |
| **Telegram Mini-App or Bot** | ✅ **Implemented (code is ahead)** | Grammy bot with 4-language parity (243 keys) + Mini App with initData HMAC verification, wallet/jobs/KYC flows, staff commands, and localized push notifications. Production hosting + webhook monitoring remain |
| USSD support (stretch) | ⚪ Not Started | — |
| Monitoring dashboard — DAU, jobs posted, escrow funded, dispute rate, time to payout, p99 payment latency | 🟡 Partial | The ops console Overview page renders real metrics from the API, but the exact KPI set (DAU, p99 latency) is not the listed set |
| App store submission | ⚪ N/A | Web-first launch decision (Phase 0) |
| University partnership rollout, SME outreach, escrow webinar | ⛔ Blocked — External | Marketing work. The referral / university recruitment mechanics are not code |
| Publish dispute statistics (monthly public transparency report) | ⚪ Not Started | — |
| Publish platform uptime (status page) | ⚪ Not Started | — |
| Fraud monitoring escalation path | 🟡 Partial | `fileStr(suspendAccount)` suspends login and all authenticated actions; the Compliance Officer → Legal → FIC escalation *procedure* is not written down |
| First tax remittance | ⛔ Blocked — External | Same dependency as Phase 1 Finance |
| VAT review / registration | ⛔ Blocked — External | `VAT_REGISTERED = false` |

---

## Phase 4 — Growth & Scale (Weeks 41–65)

| Roadmap item | Status | Evidence / note |
|---|---|---|
| Premium / verified profiles subscription | ⚪ Not Started | No subscription or billing integration |
| **Featured Job Listings** (clients pay to boost) | ✅ **Implemented (code is ahead)** | `featured-refresh` queue + carousel UI + `FeaturedLog` model — **but with no payment attached**, so it is free placement rather than a monetised boost |
| Skill verification & badges | ⚪ Not Started | A skills taxonomy exists; no verification or badges |
| Expand payment methods — EthSwitch interoperability (HelloCash, Amole, M-Pesa) | ⚪ Not Started | — |
| Agency / team accounts ("studio" sub-profiles) | ⚪ Not Started | — |
| AI-assisted matching | ⚪ Not Started | — |
| Diaspora / cross-border support | ⪔ Deferred | Requires ECA-approved Standard Contractual Clauses; geographic-risk TMS screening is deferred until a cross-border rail exists |
| **Revisit the KYC tier simplification** (build out Tier 2/3) | 🟡 **Planned / gated** | Tier 2/3 exist in the schema and the KYC module, and flipping `TIN_FEATURE_ENABLED=true` activates 3%/30% withholding and the Tier-2 withdrawal gate. Deferred to Phase 4 by decision |
| Second city / second sector expansion | ⛔ Blocked — External | — |
| Content marketing engine, B2B sales motion | ⛔ Blocked — External | — |
| AI-assisted dispute pre-screening | ⚪ Not Started | — |
| Mediator expansion, community forum | ⛔ Blocked — External | — |

---

## Compliance Implementation Status (Roadmap living table) — reconciled

| Roadmap row | Roadmap status | Code reality |
|---|---|---|
| Fayda API application | PLANNED | 🔵 Stub (mock client + review queue complete); ⛔ credentials |
| PEP / sanctions screening | DECIDED | 🔵 Mock only; ⛔ vendor |
| ECA Data Controller registration | IN PROGRESS | ⛔ External |
| Register of Processing Activities (ROPA) | COMPLETE | ⛔ External (drafted) |
| DPIA | IN PROGRESS | ⛔ External |
| Subprocessor DPAs | IN PROGRESS | ⛔ External |
| Contract translation standard | DECIDED APPROACH | ⛔ External (certified translations required; English governs) |
| Production hosting selection | PENDING | ⛔ External — Ethiopian hosting is a launch blocker |
| Audit-log enforcement | PENDING EXECUTION CONFIRMATION | ✅ **Retention column + purge job implemented** — `AuditLog.retentionUntil` (NOT NULL, 10 years) and a daily purge through a `SECURITY DEFINER` function with a hard ten-year floor. ⛔ WORM storage and the least-privilege grant verification are still open |
| Helpdesk infrastructure | PENDING | ⚠️ **Code is ahead** — a native in-app support desk ships |
| Escrow bank custodian framework | PENDING / DEFERRED | ⛔ External (FIN-001) |
| VAT registration threshold | TBD | 🟡 Code uses 450,000 ETB at 15%; accountant confirmation outstanding |
| ERA remittance process | OPEN ACTION | ⛔ External — the platform records deductions and produces a monthly report; a human files |
| Cooling-off period architecture | PENDING LEGAL VALIDATION | ✅ **The mechanism is armed.** `Contract.cancellableUntil` is written by `createContractFromProposal()` as `createdAt + COOLING_OFF_DAYS`, so the client can now actually exercise the right the ToS promises. ⛔ The certified-translation requirement and counsel's sign-off on the Service Agreement wording are still open |
| CBE integration architecture (PAY-004) | PENDING | ⛔ External |

---

## Key Performance Indicators — no instrumentation

Every Roadmap KPI (registered/KYC-verified users, completed escrow transactions, dispute rate, median time to payout, average Lighthouse score, platform uptime, median KYC verification time, STR filing timeliness, off-platform circumvention flags) is a **business/ops metric with no measurement code behind it**. The ops console Overview page surfaces live platform counters, but there is no KPI time-series store, no Lighthouse gate, and no uptime monitor. These remain **Not Started** as measurement work.

---

## Known Code/Doc Divergences Found During This Pass

| # | Divergence | Where | Action |
|---|---|---|---|
| 1 | ~~`FeesPage.tsx` still shows **"2% WITHHOLDING"** / "2% Withholding Tax (> 10K ETB)" while the backend uses **3% / 30%** above 10,000 ETB — and 0% at launch~~ | `apps/frontend/src/FeesPage.tsx`, `FAQPage.tsx`, `AboutPage.tsx` | ✅ **RESOLVED 2026-11-10.** The copy now reads "3% / 30% > 10K" everywhere, and the FAQ states the rates and the threshold. The same pass found two more fee-copy defects and fixed them: the FAQ still advertised a **2.5% client / 2.5% freelancer** split (the platform charges 0% / 7%), and `FiscalDocumentModal` defaulted to **2.5% / 2.5%**, so every fiscal receipt the platform generated showed fees it does not collect — it now defaults to 0% / 7%, matching `fees.ts` |
| 2 | ~~`schema.prisma:442` says `cancellableUntil` is "set to createdAt + 7 days by `createContractFromProposal()`", but it is never set~~ | `apps/backend/src/modules/contracts/contracts.service.ts` | ✅ **RESOLVED 2026-11-10 (ESC-002).** `createContractFromProposal()` now writes `cancellableUntil = createdAt + COOLING_OFF_DAYS` (env, default 7). The 7-day cooling-off right the ToS promises the client is now actually available, and the auto-release guard in `autoRelease.handler.ts` can finally fire |
| 3 | ~~`autoRelease.worker.ts:51` comment says "AUTO_RELEASE_WINDOW_DAYS default (5)" while the default is **7**~~ | `apps/backend/src/queue/autoRelease.worker.ts` | ✅ **RESOLVED** — the worker was rewritten to delegate to `autoRelease.handler.ts` and the stale comment is gone |
| 4 | ~~`apps/backend/src/middleware/requireKycVerified.ts` is dead code (0 importers) next to the live `hardBlock.ts` guard~~ | backend | ✅ **RESOLVED 2026-11-10** — deleted. The live guard is `hardBlock.ts`, which additionally returns a machine-readable `nextAction` so the frontend can offer the step instead of rendering a dead end |
| 5 | `docs/FLOW.md`, `docs/SYSTEM_DESIGN.md`, `docs/WALKTHROUGH.md` described a 5% client fee / 5% freelancer fee | docs | **Fixed in this pass** to 7% / 0% |
| 6 | **~~Wallet funding releases immediately instead of holding in escrow~~** (`ESC-003`) | `apps/backend/src/modules/escrow/escrow.service.ts` (commit `a03259a`) | ✅ **RESOLVED 2026-11-09.** Escrow semantics restored on the wallet path; the gig path too; `releaseMilestoneFunds()` narrowed back to `SUBMITTED_FOR_REVIEW \| DISPUTED`. **Legal text unchanged.** See `docs/DOCUMENT_UNIFICATION_2026-11-09.md` |
| 7 | ~~**8 backend tests fail at HEAD**~~ | backend | ✅ **RESOLVED.** `escrow-lifecycle-http`, `simulated-negotiations-and-disputes`, `dispute-single-resolution`, `topup-provider-rails` and `critical-fixes` all pass. Full suite: **595 passed / 61 files, 0 failed** at `a15177e` (baseline: 567 passed, 8 failed) — now **617 passed / 65 files, 0 failed** after the 2026-11-10 code pass |
| 8 | ~~**`fundGigOrderFromWallet` claims the gig order with an unconditional update** — `tx.gigOrder.update({ where: { id } })` rather than a conditional `updateMany` on `escrowState: "PAYMENT_PENDING"`~~ | `apps/backend/src/modules/gigs/gig.service.ts` | ✅ **RESOLVED 2026-11-10.** The claim is now a conditional `updateMany` and the wallet debit carries its own `gte` guard, so the database arbitrates and exactly one concurrent funding can win — the same treatment the milestone path already had |
| 9 | **The fee-engine change shipped without its tests.** `7babd4b` moved the provider fee into the fee engine and started collecting it at release, but the dispute and payout tests still asserted the old amounts | `apps/backend/tests/dispute-single-resolution.test.ts`, `dispute-partial-split-ledger.test.ts`, `payout-atomicity.test.ts` | ✅ **RESOLVED 2026-11-10.** The behaviour is intentional — the platform's take is a single 7.5% instead of 7% at release plus a surprise 0.5% at cash-out — so the **tests** were updated to the new arithmetic rather than the code reverted. The suite is now **617 passed / 65 files, 0 failed** |

---

## Summary Counts

| Phase | Implemented | Partial | Stub / Mock | Blocked — External | Not Started | Divergence |
|---|---|---|---|---|---|---|
| Phase 0 | 4 | 3 | 0 | 16 | 1 | 4 |
| Phase 1 (backend) | 28 | 9 | 4 | 0 | 3 | 4 |
| Phase 1 (frontend) | 10 | 4 | 0 | 1 | 1 | 0 |
| Phase 1 (legal / ops / finance) | 2 | 1 | 0 | 7 | 1 | 1 |
| Phase 2 | 0 | 2 | 0 | 6 | 5 | 0 |
| Phase 3 | 1 | 2 | 0 | 4 | 4 | 0 |
| Phase 4 | 1 | 1 | 0 | 3 | 6 | 0 |

> **These numbers are counted from the tables above, not estimated.** Run
> `node scripts/roadmap-alignment-counts.mjs` to regenerate them.
>
> **The previous summary table did not reconcile with its own tables** — it
> claimed, for example, 8 not-started items in Phase 2 where the table has 5,
> 3 blocked items in Phase 1 (backend) where the table has **none**, and 2
> stub items in Phase 0 where the table has none. It is corrected here rather
> than patched, because a summary that does not match its source cannot be
> updated reliably.

**Reading the numbers:** the *code* for the trust loop is largely built (Phase 1 backend is the strongest column). The *external* column dominates Phases 0, 2, 3, and 4 — which is the expected shape: what is missing is credentials, counsel, vendors, accountants, and humans, not engineering.

**2026-11-10 code pass.** Three Phase 1 backend rows moved out of "Not Started" and into "Implemented":
the **10-year audit retention** (retention column + purge job with a hard ten-year floor),
the **PDPP data-subject tooling** (complete export, and an erasure that destroys the personal
content while retaining the AML and financial records), and the **armed cooling-off right**
(`ESC-002` — `cancellableUntil` was never written, so the right the ToS promises was unreachable).
The **2FA on withdrawals** row also moved to "Implemented" (it was one of the Phase 1 backend
not-started rows), and the **breach-notification response chain** moved from "log-only" to a
working contain → notify staff → notify users → audit record → 72-hour clock → prepared ECA
filing template. What is still missing from the engineering column is the *frontend automated
tests*, the *deploy pipeline*, the *Lighthouse gate*, the *load-test harness* and the *KPI
instrumentation* — all of which are Phase 2 tooling rather than product gaps.

---

**Related documents:** `docs/ARCHITECTURE.md` · `docs/COMPLIANCE_BLOCKERS.md` · `docs/COMPLETENESS_CHECKLIST.md` · `docs/DECISIONS.md` · `docs/DOCUMENT_UNIFICATION_2026-11-09.md` · `docs/DOCUMENT_PROJECT_ALIGNMENT_REPORT.md`
