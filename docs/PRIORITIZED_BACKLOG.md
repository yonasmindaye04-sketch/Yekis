# Yekis Prioritized Backlog

Date: 2026-08-29

This document maps the external "36-section marketplace checklist" to the actual Yekis codebase, grading every requested capability as:

| Label | Meaning |
|---|---|
| **DONE** | Implemented and locally verified |
| **PARTIAL** | Exists but incomplete vs. the checklist requirement |
| **MISSING** | Not present in code |
| **BLOCKED** | Requires legal/business/vendor action (see `COMPLIANCE_BLOCKERS.md`) |

Scope note: this backlog reflects the **bidding-only** model Yekis ships today (jobs → proposals → contract → milestone escrow). The **Gig/package (Fiverr-style) model is planned separately** in `GIG_MODEL_PLAN.md`.

---

## Executive Summary

Yekis is unusually strong on **identity, escrow integrity, dispute resolution, and compliance** (these kill most local marketplaces) but is thin on **search/discovery, real-time messaging, payouts, analytics, and monetization**. The single most urgent code gap is **real withdrawals**; the single most strategic gap is the **Gig model + modern search**.

---

## 1. Core Concept & Business Model

| Item | Status | Notes |
|---|---|---|
| Bidding model (jobs → proposals → select) | **DONE** | `jobs`, `proposals`, atomic accept, contract PDF |
| Gig/package model | **MISSING** | Not in Prisma schema. See `GIG_MODEL_PLAN.md` |
| Hybrid model | **MISSING (planned)** | Requires Gig system |
| Featured listings | **PARTIAL** | `FeaturedLog` + staff-pinned carousel exists, not paid/self-serve |
| Verified badge | **PARTIAL** | `kyc.status` + `cachedKycTier` exist; no badge UI on profiles |
| Job promotion fees | **MISSING** | — |
| Agency accounts | **MISSING** | Only `CLIENT` / `FREELANCER` / `BOTH` and two staff roles |
| Payment margin / commission | **DONE** | `fees.ts`, `PlatformOperatingAccount`, `PlatformFeeCredit` |
| Advertising | **MISSING** | — |
| Enterprise hiring services | **MISSING** | — |

## 2. User Roles

| Role | Status | Gap |
|---|---|---|
| Client | **DONE** | Jobs, contracts, fund, accept, dispute, reviews (all live) |
| Freelancer | **DONE** | Profile, portfolio, proposals, deliver, withdraw, analytics-lite (`profileViewCount`) |
| Admin | **PARTIAL** | Only audit-log viewer, user search, suspend/unsuspend, force KYC re-review in `admin.routes.ts`. Missing user impersonation, fullscreen config, analytics |
| Support Agent | **DONE** | Implied via `assistance to chat` queue + `assignedStaffId` scoped access |
| Finance/Operations | **PARTIAL** | Finance reconciliation models exist (`PlatformFeeCredit`, withholding); no payouts/chargeback console |

## 3. Core Functional Features

### A. Authentication & onboarding

| Item | Status |
|---|---|
| Email/password, age gate, consent capture | **DONE** |
| Email verification | **PARTIAL** (`emailVerified` field + social OAuth; no forced email-verify flow) |
| Phone verification | **PARTIAL** (KYC tier gates; no standalone SMS OTP phone verify) |
| Password reset | **DONE** (`PasswordResetToken`) |
| Login throttling | **DONE** (`express-rate-limit`) |
| 2FA / OTP login / biometrics / device trust | **MISSING** |
| Language selection | **DONE** (`languagePreference`, i18n stub) |
| Country/city/currency selection | **MISSING** (ETB-only, no city selector) |
| Local ID verification | **DONE** (Fayda/eSignet Tier 1, doc-upload Tier 2) |

### B. User profiles

| Item | Status |
|---|---|
| Client profile basics | **DONE** (name, bio, avatar, hired/spend stats via wallet totals) |
| Profile completion score | **DONE** |
| Freelancer photo/title/bio/skills | **DONE** (`UserSkills`, `Skill` taxonomy) |
| Portfolio items | **DONE** |
| Work history | **PARTIAL** (contracts list; no public "job history" hardening) |
| Education/certificates | **MISSING** |
| Languages spoken | **MISSING** (only `languagePreference`) |
| Availability status | **DONE** (`isAvailableForWork`) |
| Hourly rate / fixed-price availability | **MISSING** (freeform in bio) |
| Response time / completion rate | **MISSING** (no computed metric) |
| Identity/payment verification badges | **PARTIAL** (KYC cached, no visible badge system) |
| Skill tests / testimonials | **MISSING** |

### C. Job posting

| Item | Status |
|---|---|
| Title, description, category, budget range, deadline, proposed milestones | **DONE** |
| Screening questions | **DONE** (`screeningQuestions` Json) |
| Attachments | **MISSING** on jobs (only on proposals) |
| Budget type (fixed/hourly) | **MISSING** (fixed/milestone only) |
| Experience level / location / language | **MISSING** |
| Visibility (public/private/invite), proposal cap | **MISSING** |
| Templates, drafts, repost/clone, auto-close date | **MISSING** |
| Invite freelancers | **MISSING** |
| Shortlist candidates | **DONE** (`SHORTLISTED` status) |

### D. Proposal / bidding

| Item | Status |
|---|---|
| Cover letter, amount, timeline, milestone suggestion | **DONE** |
| Attachments | **DONE** (`attachmentPaths` + upload route) |
| Counter offers | **DONE** (`CounterOffer` model) |
| Client view/shortlist/accept/reject | **DONE** |
| Anti-spam limits, CAPTCHA, AI-proposal detection | **MISSING** |
| Interview scheduling | **MISSING** |

### E. Gig / Service Packages

| Item | Status |
|---|---|
| Gig title/category/desc/images/FAQs/tiers/add-ons | **MISSING** — see `GIG_MODEL_PLAN.md` |
| Buyer flow: browse → order → escrow → revisions → review | **MISSING** |

## 4. Search & Discovery

| Item | Status |
|---|---|
| Search jobs | **PARTIAL** (`category` + q, pagination; plain DB query) |
| Search freelancers | **PARTIAL** (profile search exists in staff UI; public search limited) |
| Search gigs/skills | **MISSING** (no Gig model) |
| Faceted filters (rate, rating, language, availability, badge) | **MISSING** |
| Typo tolerance, autocomplete | **MISSING** |
| Community relevance/trust ranking | **PARTIAL** (`bayesianScore`, `FeaturedLog` staff ranking, no query-time blend) |
| Recommendations | **MISSING** |
| Elasticsearch/OpenSearch, Redis caching | **MISSING** |

## 5. Messaging & Collaboration

| Item | Status |
|---|---|
| One-to-one messaging (job-scoped) | **DONE** (`DirectThread` / `DirectMessage`) |
| Support chat (guest + authenticated, staff queue) | **DONE** (`Conversation`, `ChatMessage`) |
| Attachments | **DONE** (optional `attachmentUrl` in chat, `attachmentPaths` on proposals) |
| Anti-circumvention (phone/email detection) | **DONE** (`antiCircumventionMiddleware` sanitizes `DirectMessage`) |
| Read receipts | **PARTIAL** (`isRead` / `lastReadAt`, but no exposed "read time" UI) |
| Real-time delivery | **MISSING** (HTTP polling — staff 8s, user 5s; no WebSocket/SSE) |
| Typing indicators, offline notifications | **MISSING** |
| Reply-to-thread, search-in-chat | **MISSING** |
| Create offer inside chat | **MISSING** (counter-offer exists on proposals, not chat) |
| Block/report user | **PARTIAL** (profile reporting only, no per-chat block) |

## 6. Contracts, Offers & Workflow

| Item | Status |
|---|---|
| Fixed-price, milestone-based contracts | **DONE** |
| Auto-generate PDF agreement | **DONE** (`serviceAgreement.template.ts`) |
| Independent dual signatures | **DONE** |
| Cooling-off cancellation | **DONE** (7-day, `cancellableUntil`) |
| Hourly contracts / timesheets / recurring | **MISSING** |
| Milestone workflow (fund → submit → review → release) | **DONE** with BullMQ auto-release |
| Revision request flow | **PARTIAL** (client can dispute; no explicit "request revision" transition) |

## 7. Payment System

| Item | Status |
|---|---|
| Accept client payments | **DONE** (Telebirr web-checkout, CBE stub, wallet-first + manual receipt top-up) |
| Hold in escrow, release, refund, partial split | **DONE** with concurrency guards |
| Platform fees + withholding + VAT pool | **DONE** (`PlatformOperatingAccount`, `PlatformFeeCredit`) |
| Withdrawals to freelancer wallet/bank | **PARTIAL / STUB** — `withdrawFromWallet` debits locally but does not call any payout provider |
| Card payments / Stripe / PayPal | **MISSING** |
| Chargeback handling | **MISSING** |
| Multi-currency | **MISSING** (ETB only) |
| Invoices/receipts | **DONE** (branded transactional email templates) |
| Earnings statement / client receipts | **PARTIAL** (ledger exists, user-facing statements missing) |

## 8. Reviews & Ratings

| Item | Status |
|---|---|
| Contract-completion double-blind reviews | **DONE** (unique per contract, revealed after both/14-day window) |
| Star rating + comment + target response | **DONE** |
| Category ratings (communication/quality/deadline) | **MISSING** (only single 1–5 rating) |
| Job Success Score / on-time rate / repeat-hire rate | **MISSING** |
| Review-after-funded-contract gating | **DONE** (`isEligible`) |
| Admin moderation of reviews | **DONE** (`ReviewDisputeResolution`) |

## 9. Trust & Safety

| Item | Status |
|---|---|
| Tiered KYC (ID, selfie-liveness doc type, TIN/business) | **DONE** |
| PEP/sanctions screening | **PARTIAL** (`pep.client.ts` mock — server refuses prod boot with mock) |
| TMS (structuring, velocity, round-amounts, pass-through, wallet-mismatch) | **DONE** |
| Compliance holds, STR workflow | **DONE** |
| Rate limiting, profile reporting | **DONE** |
| Fraud checks: device fingerprint, IP risk, duplicate-account detection | **MISSING** |
| Login anomaly detection | **MISSING** |
| Job/gig pre-publication moderation | **MISSING** (profile reports only, post-publish) |
| Attachment virus scanning | **MISSING** |
| Dispute system (staged, evidence, mediation, arbitration, bundle compile) | **DONE** |

## 10. Notifications

| Channel | Status |
|---|---|
| In-app | **DONE** |
| Email | **DONE** (transactional templates) |
| SMS | **PARTIAL** (`sms.client.ts`, credentials not live) |
| Telegram push | **PARTIAL** (bot exists, linking + delivery require credentials) |
| Mobile push | **MISSING** |
| User preference controls | **PARTIAL** (`notificationSettings` Json; no UI/scheduling) |
| Quiet hours | **MISSING** |

## 11. Admin Dashboard

| Capability | Status |
|---|---|
| Audit-log viewer | **DONE** |
| User search / suspend / unsuspend / force KYC re-review | **DONE** |
| User impersonation with audit trail | **MISSING** |
| Content moderation (jobs, gigs, portfolio pre-pub) | **MISSING** |
| Fee/commission self-serve configuration | **MISSING** (env-driven today) |
| Dispute management console | **DONE** (staff queue, claim, resolve) |
| Finance console (transactions, escrow balance, payouts, refunds/chargebacks) | **PARTIAL** (finance read models, no payout console) |
| Analytics dashboards (GMV, take rate, retention, churn) | **MISSING** |

## 12. Reporting & Analytics

| Item | Status |
|---|---|
| Freelancer wallet + earnings/spend totals | **DONE** (`totalEarnedNetMinor`, `totalSpentGrossMinor`) |
| Client spending summary | **PARTIAL** (derivable, no dashboard) |
| Profile view tracking | **DONE** (`ProfileView`) |
| Marketplace liquidity metrics (GMV, fill rate, time-to-hire) | **MISSING** |
| Proposal success rate, response rate | **MISSING** |
| Finance reconciliation read models | **DONE** |
| Withholding remittance reports | **DONE** (`withholdingRemittance.worker.ts` monthly) |

## 13. Local Market

| Item | Status |
|---|---|
| Local currency (ETB minor units) | **DONE** |
| Local rails (Telebirr, CBE Birr) | **DONE** (wallet adapters; payout stub) |
| Tiered KYC + Fayda | **DONE** (mock; integration defined) |
| Amharic UI copy | **STUBBED** (i18n framework, `[TODO]` Amharic strings) |
| SMS fallback | **PARTIAL** (client exists, not credentialed) |
| Low-bandwidth/offline mode | **MISSING** |
| Ethiopian data residency / retention | **BLOCKED** (see `COMPLIANCE_BLOCKERS.md` §5) |
| ERA withholding remittance API | **BLOCKED** (manual filing, no ERA API) |
| Real PEP/sanctions provider | **BLOCKED** |
| Fayda production credentials | **BLOCKED** |

## 14–15. Non-Functional & Security

| Requirement | Status |
|---|---|
| Modular monolith | **DONE** (Express + Prisma module split) |
| Stateful-move DDR/queues | **DONE** (BullMQ auto-release, TMS scan) |
| Horizontal scaling / load balancer / read replicas | **MISSING** (no infra definitions beyond docker-compose local) |
| Observability (Sentry, metrics, dashboards) | **MISSING** (pino logs only) |
| Health checks | **DONE** (`/health`) |
| CI required checks, E2E/load/chaos, backup/restore drill | **MISSING** |
| Password hashing (argon2), input validation (Zod), rate limiting, helmet | **DONE** |
| SQL injection prevention | **DONE** (Prisma/Zod) |
| CSRF protection | **PARTIAL** (JWT Bearer API; no cookie-session CSRF middleware) |
| Secure file upload | **PARTIAL** (8 MB limits, MIME validation; no virus scan) |
| Encryption at rest / in transit | **PARTIAL** (TLS-per-env; object-store doc pointer strategy, no field-level encryption) |
| Secrets management & rotation | **PARTIAL** (`.env` local; no managed secrets) |
| Webhook signature verification | **DONE** (Telebirr RSA-PSS, CBE HMAC) |
| Idempotency payments | **DONE** (`providerTransactionId` unique) |
| Audit trail for money | **DONE** (append-only `AuditLog`, `PlatformFeeCredit`) |

## 16. Legal & Compliance

| Item | Status |
|---|---|
| Terms, Privacy, Cookie banner, Refund/Dispute policies | **DONE** (marketing site pages; "pending legal review") |
| Escrow/e-signature contract generation | **DONE** |
| Cooling-off (Ethiopian E-Transactions) | **DONE** |
| KYC/AML retention | **DONE** (10-year append-only intent, pgaudit guidance) |
| PDPP consent management | **DONE** (granular consent at registration) |
| Right to access / erasure | **MISSING** (no self-service data export/deletion endpoints) |
| Breach reporting to ECA | **PARTIAL** (`breachAlert.ts` scaffold → internal alert; manual to ECA) |
| Right-to-erasure / data-export UI | **MISSING** |

## 17–20. Architecture, Stack, DB, API

| Item | Status |
|---|---|
| Modular monolith, versioning (`/api/v1`) | **DONE** |
| Pagination, filtering, sorting, rate limiting, validation | **DONE** (partial catalog coverage) |
| PostgreSQL + Redis + MinIO | **DONE** |
| Elasticsearch / OpenSearch | **MISSING** |
| WebSocket / SSE | **MISSING** |
| Granular webhook/financial endpoints | **DONE** |

## 21–23. Real-time, Media, Moderation

| Item | Status |
|---|---|
| Real-time chat/notifications | **MISSING** |
| File upload & size limits | **DONE** |
| Virus scanning, signed/time-expiring URLs | **PARTIAL** (signed URLs for contracts; no scanner) |
| Image resizing/video processing | **MISSING** |
| Job/gig pre-publication moderation | **MISSING** |

## 24–26. Mobile, SEO, Growth

| Item | Status |
|---|---|
| Responsive mobile web | **DONE** |
| Telegram Mini App + native app | **PARTIAL** (Mini App exists; no native push/biometrics) |
| SEO on marketing site | **DONE** (`robots.txt`, sitemap, structured data) |
| Freelancer profile SEO | **PARTIAL** (client-side SPA profiles, no SSR) |
| Referral / promo codes / loyalty / lifecycle automation | **MISSING** |

## 27. AI Features

| Item | Status |
|---|---|
| All AI features (matching, generation, scoring) | **MISSING** — none implemented |

## 28–29. Testing & DevOps

| Item | Status |
|---|---|
| Backend builds, Vitest, linkage tests, manual E2E | **DONE** |
| Frontend build | **DONE** |
| Unit/edge-case tests (fees, KYC, dispute, escrow) | **PARTIAL** (checklist rows still open) |
| Concurrency stress, controlled-time auto-release test, provider sandbox test | **MISSING** |
| CI gated build/test/lint/scan | **MISSING** |
| Backup/restore, DR, incident runbooks | **MISSING** |

## 30–32. Overall gaps

Highest-priority missing lifecycle capabilities:

1. Live payout/disbursement API (withdrawal stub) — **trust-critical**
2. Real-time messaging (WebSockets) — major UX weakness
3. Faceted search / freelancer discovery — major liquidity weakness
4. Gig marketplace — strategic revenue gap
5. Admin analytics + self-serve ops (fees, moderation) — ops efficiency
6. Content moderation pre-publish + candidate anti-spam — quality risk
7. Right-to-erasure / data export — PDPP compliance gap
8. Production observability/CI/backup — launch blocker for real pilot
9. Monetization surfaces (promotions, featured paid plans, enterprise) — revenue expansion

---

## Execution Priorities (recommended order)

### Phase 1 — Make money real (Production unblock)
1. Withdrawal payout provider integration + reconciliation + reversal states
2. Production secret vault, backup/restore drill, Sentry, CI gates, fixed CORS/TLS
3. Legal/compliance dependency resolution (NBE escrow acct, ERA, PEP, Fayda, PDPP residency)

### Phase 2 — Fix marketplace UX fundamentals
4. WebSocket messaging + real-time notifications
5. Freelancer search/faceted filters (OpenSearch or Meilisearch)
6. Trust metadata on profiles (badges, response/on-time metrics)

### Phase 3 — Expand marketplace model
7. Gig/package model (schema + ordering + escrow) — see `GIG_MODEL_PLAN.md`
8. Anti-spam (rate limits, duplicate detection, login-anomaly rules)
9. Pre-publication moderation queue for jobs/gigs/portfolio

### Phase 4 — Monetize & operate
10. Admin analytics dashboard + fee self-service console
11. Referral/promotion/product features (paid featured listing, promotions)

### Phase 5 — Scale
12. Hourly contracts, timesheets, recurring engagements
13. AI-assisted matching, pricing, moderation
14. Mobile native app, offline/low-data mode
15. Localization polish (complete Amharic review)

---

## Files / Modules referenced

- Identity & KYC: `apps/backend/src/modules/kyc/*`
- Jobs/Proposals: `apps/backend/src/modules/jobs/*`
- Contracts: `apps/backend/src/modules/contracts/*`
- Escrow/Payments: `apps/backend/src/modules/escrow/*`, providers in `escrow/providers/*`
- Disputes: `apps/backend/src/modules/disputes/*`
- TMS: `apps/backend/src/modules/tms/*`
- Finance: `apps/backend/src/modules/finance/*`, workers in `apps/backend/src/queue/*`
- Chat/Support: `apps/backend/src/modules/chat/*`
- Profiles/Reviews/Portfolio/Featured: `apps/backend/src/modules/{profiles,reviews,portfolio,featured}/*`
- Admin: `apps/backend/src/modules/admin/*`
- Data model: `apps/backend/prisma/schema.prisma`
- Checklist source of truth: `docs/COMPLETENESS_CHECKLIST.md`, blockers in `docs/COMPLIANCE_BLOCKERS.md`
