# Development & Engineering Department

This document contains all sections from the original legal design and compliance roadmap that dictate technical architecture and features for the Development & Engineering Department.

## 1. Must-Have Resources, Tools & Roles

To successfully build and maintain the platform's escrow, compliance, and core features, the Development & Engineering department MUST HAVE the following:

### A. Key Personnel (Roles)
*   **System Architect / Lead Backend Engineer:** To design the state machine for the escrow logic and ensure the WORM storage compliance.
*   **Frontend/Mobile Developers:** Focused on building lightweight, responsive UIs (e.g., using React/Next.js) tailored for low-bandwidth, Telegram-first users.
*   **DevSecOps Engineer:** Dedicated to managing the local Ethiopian cloud infrastructure, handling encryption, and configuring ECA-compliant backups.
*   **QA/Testing Engineer:** To build automated tests for payment edge-cases and manual testing of the dispute flows.

### B. Core Technology Stack (Recommended)
*   **Frontend:** React, Next.js, or Vue (optimized for minimal bundle size).
*   **Backend:** Node.js, Go, or Python (Django/FastAPI) capable of high concurrency for payment webhooks.
*   **Database:** PostgreSQL (with auditing extensions like `pgaudit` to support the 10-year immutable WORM requirements).
*   **Infrastructure:** Local Ethiopian cloud providers (Ethio Telecom Cloud, Safaricom Ethiopia) to strictly comply with PDPP Art. 22 data localization.

### C. Critical API Credentials & Third-Party Tools
*   **Fayda ID API Access:** Essential for the automated KYC verification layer.
*   **Payment Gateway Sandbox Keys:** Developer accounts for Telebirr, Chapa, and CBE API to build the escrow logic before touching real money.
*   **Monitoring & Security:** Sentry (or similar) for error tracking, and automated rate-limiting middleware to prevent API abuse.

## 2. Payment Integration (Money Layer)
*   **Telebirr (Ethio Telecom):** Leading mobile money service. Integrate via API (merchant ID, callback URL, status webhooks). Supports USSD (*220#) for non-smartphone users.
*   **CBE Birr:** Integrate via Commercial Bank of Ethiopia API.
*   **Other Wallets & Banks:** EthSwitch interoperability (M-PESA, HelloCash, Amole). Monitor NBE updates for direct bank transfer API access.
*   **Architecture:** Use HTTPS, validate callback signatures, transparently display local transaction fees (e.g., Telebirr 0.5% charge).

## 3. Technical & UX Implementation Checklist
*   **Escrow Logic (Core Feature):** Track projects through states: `Payment Pending` → `Escrow Held` → `Released / Refunded`. Requires an automated cron job to release funds if the client takes no action within the acceptance window (e.g., 5 days).
*   **APIs:** Test Telebirr and bank integrations against sandbox environments.
*   **User Interface:** Clear status indicators ("Escrow Paid", "Awaiting Review"), explicit "Accept & Release" / "Raise Dispute" actions, countdown timers for acceptance deadlines.
*   **Security:** Conduct security audits, secure secret storage, secure cookies, input validation, and API rate-limiting. Strong encryption at rest and in transit.
*   **Logging & Auditing:** Immutable logs of every payment transaction, status change, and dispute communication for arbitration officers.

## 4. Integrated Compliance Architecture
The platform requires a sophisticated technical pipeline to handle both KYC/AML and Data Privacy (PDPP).

### 4.1 KYC Workflow Integration
*   Implement a **Hard Block** system: Unverified users cannot withdraw funds, change profiles, bid on projects, or receive payments.
*   Integrate ID Upload + Liveness Check (OCR/Biometric), preferably integrating with **Fayda ID** verification APIs.
*   Assign platform-wide Unique Customer IDs to link all user accounts and transactions.

### 4.2 Transaction Monitoring System (TMS)
*   Build automated monitoring for AML red flags:
    *   Structuring (multiple small payments just under threshold)
    *   Velocity (abnormal frequency of jobs)
    *   Pass-through (funds deposited and immediately withdrawn without work)
    *   Wallet mismatches
*   Flag suspicious activity for internal compliance review (to file STR to FIC within 24 hours).

### 4.3 Data Localization & Storage Infrastructure
*   **Primary Database (Ethiopia):** Web servers, primary database, and file store (KYC docs, messages, contracts) must be hosted on Ethiopian servers (e.g., Ethio Telecom Cloud, Safaricom Ethiopia) to comply with PDPP Art. 22.
*   **Backups:** Cross-border backups (AWS/GCP/Azure) are highly restricted and require encrypted backups with ECA-approved Standard Contractual Clauses (SCCs).
*   **WORM Storage:** Database architecture must support Write Once Read Many (WORM) storage for compliance records. All KYC and transaction data must be retained immutably for **10 years**.
*   **Data Erasure Tools:** Build tooling to handle user deletion requests by wiping marketing/chat data but securely preserving AML transaction data.

## 5. Payment Reconciliation System (IMPLEMENTED)

Webhooks are the primary settlement signal, but money movement never depends on one arriving. The backend now runs a webhook-first + direct-query-fallback model:

### 5.1 How Telebirr Settlement Works (Automatic — No Manual Checking)
*   `POST /api/v1/webhooks/telebirr` receives the server-to-server callback (`trade_status`, RSA-PSS signature embedded in body).
*   Handler verifies the signature against `TELEBIRR_PUBLIC_KEY`, maps `trade_status` → internal status, and routes through `handlePaymentWebhook` (idempotent — already-settled transactions are ignored).
*   Success flips the milestone escrow state machine to `ESCROW_HELD`, credits client spend metrics, fires notifications, and triggers TMS post-funding checks.
*   Manual checking is NOT required. Manual work is limited to refunds, disputes, and aged-out PENDING transactions (see 5.3).

### 5.2 Reconciliation Sweep (`queue/paymentReconcile.worker.ts`)
*   New BullMQ queue `payment-reconcile`, scheduled by cron `PAYMENT_RECONCILE_CRON` (default every 10 min).
*   Finds `PaymentTransaction` rows where provider=TELEBIRR, status=PENDING, older than `PAYMENT_RECONCILE_STALE_MINUTES` (5), newer than `PAYMENT_RECONCILE_GIVE_UP_HOURS` (3).
*   Calls the provider directly via the new optional interface method `queryPaymentStatus()` (implemented on the Telebirr client as signed `payment.query.order`; Chapa/CBE pending until their clients implement it).
*   Authoritative results feed through the same `handlePaymentWebhook` path as live webhooks — whichever arrives second is a no-op.
*   Every resolution writes an audit event `PAYMENT_RECONCILED_VIA_QUERY` (AML-grade traceability of why/when a payment settled).
*   Transactions with no provider record age out silently after the give-up window and surface for manual review.
*   ⚠️ Confirm exact `queryOrder` response shape against Telebirr sandbox before production.

### 5.3 Config Knobs (apps/backend/.env)
| Var | Default | Purpose |
| --- | --- | --- |
| `PAYMENT_RECONCILE_CRON` | `*/10 * * * *` | Sweep frequency |
| `PAYMENT_RECONCILE_STALE_MINUTES` | `5` | Min age before a PENDING txn is queried |
| `PAYMENT_RECONCILE_GIVE_UP_HOURS` | `3` | Stop querying; leave for manual review |
| `PAYMENT_RECONCILE_BATCH_SIZE` | `50` | Max transactions per sweep |
| `TRUST_PROXY` | unset | Number of proxy hops (set `1` behind ngrok/nginx). Required so rate limiting keys on real client IPs |
| `TELEGRAM_BOT_TOKEN` | unset | Bot skips init with WARN when absent |

## 6. Recent Implementation Notes (Current Code State)

### Backend
*   `startBot()` now returns `boolean` — logs "Telegram bot started" only when actually started; `/api/v1/bot/telegram/start-polling` returns HTTP 400 when the token is unconfigured instead of falsely reporting success.
*   `env.ts` loads `.env` from multiple paths (cwd, repo root) using `process.cwd()`-based resolution — `import.meta.url` was removed because NodeNext/CommonJS forbids it.
*   Reverse-proxy support: `app.set("trust proxy", n)` applied when `TRUST_PROXY` is set (fixes `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` from express-rate-limit).

### Frontend
*   `CookieBanner.css`, `ProfilePage.css`, `SupportChat.css` created — these components previously rendered unstyled.
*   Marketing footer fixed: legacy `.landing-footer` flex layout neutralized inside `.marketing-footer` (bottom bar now spans full width); social icon hover hardened with higher-specificity selectors.


## 7. Security & Integrity Hardening (Post-Audit Implementation)

The full platform audit's findings have been implemented. Summary of what changed and why:

### 7.1 Authentication
- **REMOVED the /auth/google authentication bypass** (it issued JWTs from a bare email with zero Google credential verification, auto-provisioning KYC-verified accounts). Reintroduce only behind real ID-token verification against Google's JWKS.
- **Deleted pps/backend/test-webhook.js** which contained a live Telegram bot token in plaintext. Token must still be rotated via @BotFather (it is compromised regardless).
- **equireAuth now re-checks isSuspended from the DB** on every request - suspension takes effect immediately instead of at token expiry (15 min).

### 7.2 Money Integrity (atomic state claims)
All three TOCTOU races are closed with conditional-update claims inside transactions:
- eleaseMilestoneFunds: atomic claim on escrowState IN (SUBMITTED_FOR_REVIEW, DISPUTED) -> RELEASED. Concurrent manual accept + auto-release job can no longer double-credit the freelancer; the loser throws MilestoneReleaseClaimLostError (benign no-op).
- handlePaymentWebhook: atomic PENDING -> settled claim on PaymentTransaction. Webhook vs reconciliation sweep duplicates are impossible.
- withdrawFromWallet: conditional decrement (balance >= amount) - wallet cannot go negative.

### 7.3 Platform Ledger + VAT Alert (was: never written)
ecordPlatformEarnings() now runs inside every release transaction:
- Upserts the singleton PlatformOperatingAccount (accumulatedFeeMinor = freelancer fee + client add-on revenue; accumulatedWithholdingMinor for ERA reconciliation)
- Creates an append-only PlatformFeeCredit row per release
- checkVatThresholdAfterRelease() fires a one-time VAT_THRESHOLD_REACHED flag + staff alert when cumulative fees cross VAT_THRESHOLD_MINOR

### 7.4 Access Control
- Bot control plane (set-webhook, delete-webhook, start-polling, stop, info) now requires requireAuth + requireStaffRole(ADMIN). The webhook receiver itself stays public behind its secret-token check.
- New admin module mounted at /api/v1/admin: paginated audit-log viewer, user search, suspend/unsuspend, force-KYC-rereview. All ADMIN-gated (audit logs readable by COMPLIANCE_OFFICER).

### 7.5 Async Safety
- express-async-errors imported first in server.ts - rejected promises from async handlers now reach the central error handler instead of crashing Node.
- Process-level unhandledRejection logger added as last resort.

### 7.6 Database
- New migration 20260823120000_add_hot_path_indexes: Job.clientId, Contract.clientId/freelancerId/status, Dispute.milestoneId/stage, PaymentTransaction(provider,status,createdAt) composite.
- ContractStatus gains CANCELLED (cooling-off); User.dateOfBirth now nullable.
- Run 
px prisma migrate dev when the DB is next available.

### 7.7 Statutory Cooling-Off (ECA 1205/2020)
Implemented POST /api/v1/contracts/:contractId/cancel-cooling-off: client-only, before cancellableUntil, only while all milestones are PAYMENT_PENDING. Atomic ACTIVE -> CANCELLED claim, audited with legal basis reference.

### 7.8 Workers
reviewReveal (04:00 daily) and featuredRefresh (every 6h) workers are now imported and scheduled - previously defined but never started.

### 7.9 Dispute Routes Completed
Mounted the implemented-but-unreachable services: POST /:id/claim (mediator assignment race-safe), /:id/arbitration-award (staff), /:id/withdraw (party mutual-withdrawal).

### 7.10 Staff Alerting
New 
otifyStaffOfEvent() fan-out (lib/staffAlerts.ts): KYC upgrades, disputes raised, topups pending, TMS flags, VAT threshold - staff queues no longer rely on blind polling.

### 7.11 Data Hygiene
- Telegram/guest-chat signups no longer fabricate dateOfBirth=1990-01-01 (AML integrity); real DOB captured at Tier-2 Fayda verification.
- KYC review queue honors page/limit/search (was unbounded).

### 7.12 Frontend Fixes
- Fake Google sign-in button removed.
- ProfilePage now renders real API data (getPublicProfile/getReviews) with working Report Profile submission; ProfileEditPage persists via updateProfile (was a silent no-op).
- FeaturedCarousel consumes the real featured endpoint; cards navigate to the talent's profile via viewUserId.
- Telegram top-up form aligned to backend contract (provider/amountMinor/referenceNumber/receipt - old fields were silently dropped server-side).

**Known remaining gaps (not blockers, tracked):** payout rail still stubbed (withdrawal debits wallet, no provider transfer yet), Fayda + PEP providers are mocks pending vendor access, email delivery is log-only until SMTP library added.

## 8. Feature Additions & Integration Log (Latest Pass)

### 8.1 Social Sign-In (Google / Apple / Facebook; Telegram pre-existing)
- New modules/auth/oauth.service.ts + routes POST /api/v1/auth/oauth/{google|apple|facebook} and GET /api/v1/auth/oauth/providers.
- SECURITY MODEL: every provider credential is cryptographically verified server-side BEFORE account access:
  - Google id_token vs Google JWKS (issuer accounts.google.com, audience GOOGLE_CLIENT_ID, email_verified enforced)
  - Apple identity_token vs Apple JWKS (issuer appleid.apple.com, audience APPLE_CLIENT_ID)
  - Facebook access token via Graph debug_token (APP_ID|APP_SECRET app-scoped check) + /me profile fetch
- Unconfigured providers return 503 NOT_CONFIGURED - there is deliberately NO unverified fallback (this replaces the removed bare-email bypass).
- Provider identity links on User: googleId/appleId/facebookId (unique) + emailVerified flag. Link conflicts (same provider id bound to a different account) are refused, never silently merged.
- OAuth provisioning mirrors Telegram signup: sentinel argon2 password hash, TIER_1 VERIFIED, wallet created, consent records - and NO fabricated DOB.
- Frontend: components/SocialSignInButtons.tsx renders ONLY providers the backend reports configured (availability probe). Google uses GIS (id_token flow); Apple/Facebook use their SDKs.
- Env gates: backend GOOGLE_CLIENT_ID / APPLE_CLIENT_ID / FACEBOOK_APP_ID(+SECRET); frontend VITE_GOOGLE_CLIENT_ID / VITE_APPLE_CLIENT_ID / VITE_FACEBOOK_APP_ID.

### 8.2 Transactional Email (real SMTP)
- email.service.ts now sends via nodemailer (SMTP_HOST/PORT/USER/PASS/SECURE, EMAIL_FROM). Without credentials, dev mode logs clearly-marked NOT-SENT output instead of pretending success.
- Password-reset deep link fixed: /reset-password?token=... now lands directly on the reset form with the token prefilled (SPA path handling added).

### 8.3 Google Analytics 4
- analytics.ts is env-driven (VITE_GA_MEASUREMENT_ID; empty = fully disabled). Fixed dead trackEvent (window.gtag now assigned), SPA page-view events on marketing navigation, still gated behind the cookie-banner analytics consent.

### 8.4 Client/Server URL Alignment (404 sweep)
Frontend api/client.ts was calling routes that do not exist. All aligned to real mounts:
- profiles/* -> users/:id/profile, users/me/profile, users/:id/report, users/me/profile/views
- profiles/featured -> featured (GET) and featured/staff/pin (POST)
- reviews/user/:id -> reviews/users/:id/reviews; POST reviews -> reviews/contracts/:id/review

### 8.5 MinIO Bucket Requirement
Top-up receipts (and KYC documents) upload to OBJECT_STORE_BUCKET. The bucket must exist - a missing bucket surfaces as INTERNAL_ERROR on submission. Created marketplace-dev in the dev MinIO via mc mb. For new environments: create the bucket before first use.

### 8.6 Registration Consent Gate
Signup requires explicit acceptance of Terms & Conditions + Privacy Policy (submit disabled until checked); links deep-navigate to the marketing pages. Consent is recorded with the registration payload.

### 8.7 Marketing Site Cleanup
- Removed ALL fabricated metrics: fake freelancer/job/escrow counters (and their useCountUp hook) plus the invented testimonials section.
- Footer height reduced ~45%.
- Motion layer added (components/motion.tsx + scroll.css): branded first-visit splash, scroll progress bar, header elevation, reveal-on-scroll sections, hero parallax - all no-op under prefers-reduced-motion.
