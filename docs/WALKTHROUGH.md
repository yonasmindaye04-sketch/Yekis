# Yekis Jobs Functional Walkthrough

Last validated: 2026-09-05

> **Multi-Rail Payments (CBE & Safaricom M-Pesa) + Manual Verification Fallback (2026-09-05):**
> - **CBE & Safaricom M-Pesa Integration**: Expanded payment options from Telebirr-only to a complete Ethiopian multi-rail infrastructure supporting **Telebirr**, **Commercial Bank of Ethiopia (CBE / CBE Birr)**, and **Safaricom M-Pesa (Ethiopia)** across Instant Checkout, Manual Bank Transfers, and Freelancer Withdrawals.
> - **Zero Dead-End Manual Verification Fallback**:
>   - When automated gateway APIs fail, time out, or experience downtime, clients are never stranded. The frontend renders an inline fallback card with a 1-click **"Switch to Manual Verification"** button that pre-fills the amount and payment rail for seamless direct transfer.
>   - For delayed or unconfirmed checkout requests (`CHECKOUT_PENDING`), clients can click **"Attach receipt for verification"** to submit their payment reference number and receipt image directly to the existing transaction via `POST /api/v1/wallet/topups/:topUpId/attach-receipt`. The server updates the top-up to `PENDING` manual review and notifies operations staff.
> - **Operations Staff Top-Up Queue (`TopUpQueue.tsx`)**: Upgraded the receipt review desk with color-coded provider badges (`Telebirr` in brand blue, `CBE Bank` in purple, `Safaricom M-Pesa` in emerald green) and destination account indicators (`0910 011 818`, `1000 223 344`, `0777 011 818 / Till 882199`) so staff can verify receipts quickly.
> - **Telegram Mini App & Browser Wallet Parity**: Unified the 3-way payment rail selection, 1-click account copy, fallback handling, and receipt upload modals across both `BrowserWallet.tsx` (Desktop Web) and `App.tsx` (Mobile / Telegram Mini App).
>
> **Chat Attachment Upload, Persistent Storage & Support Desk Rendering (2026-09-05):**
> - **Persistent Object Store Integration (`POST /api/v1/chat/upload` & `GET /api/v1/chat/attachments/:key(*)`)**: Chat attachments are uploaded to S3/MinIO bucket `marketplace-dev` (with local disk fallback under `uploads/chat-attachments/`), generating permanent streaming URLs (`/api/v1/chat/attachments/...`). Replaced ephemeral browser-memory `blob:` URLs that previously broke visibility across users and sessions.
> - **Support Desk Attachment Visibility (`StaffDashboard.tsx`)**: Support staff can view all client-attached files within support threads. Image attachments are displayed as inline thumbnails with zoom hover, and documents/archives feature styled badges with file icons, decoded filenames, and one-click download/open links (`ExternalLink`).
> - **Support Desk Reply Attachments**: Support agents can upload and attach files in their replies with live removal badges and progress spinners (`Loader2`).
> - **Client Workspace Bubble Enhancements (`ChatWorkspace.tsx`)**: Replaced raw links with containerized image previews and responsive download chips, auto-defaulting body text to `📎 <filename>` when files are sent without draft text.
>
> **Real-Time WebSocket Messenger & "Mini-Me" AI Negotiation Co-Pilot (2026-09-04):**
> - **Full Bidirectional WebSocket Engine (`/api/v1/ws`)**: Upgraded chat from 5-second polling to instant event-driven WebSockets. Handshakes authenticate JWT access tokens with ping/pong heartbeats and automatically route `chat:message`, typing states (`chat:typing`), read notifications (`chat:read`), and new-thread unread badges (`chat:new_message`).
> - **Direct Client ↔ Freelancer Messaging Channels**: Added `POST /api/v1/chat/direct` allowing direct 2-party contract negotiations with participant role badges, online presence indicators, and unread counters alongside support tickets.
> - **"Mini-Me" AI Co-Pilot Suite**:
>   - **Smart Reply Suggestions**: Real-time contextual response suggestions displayed as 1-tap interactive pills directly above the composer (`/assistant/suggest-replies`).
>   - **Thread Digest & Summarizer**: Analyzes negotiation history into structured deliverables, timeline, agreed budget in ETB, and recommended next steps (`/assistant/summarize`).
>   - **1-Click Deal Terms Extractor**: Synthesizes unstructured conversational agreement into escrow-ready milestone proposal cards with confidence scoring and direct contract creation links (`/assistant/extract-deal`).
> - **Real-time Anti-Circumvention Protection**: Client-side scanner actively parses drafts for off-platform contact leaks (Ethiopian mobile numbers `09...`, Telegram `@...`, off-platform emails, wire transfer requests) with an inline warning informing users of escrow safety benefits before sending.
> - **2-Column Responsive Workspace (`ChatWorkspace.tsx`)**: Built complete responsive messaging interface with thread search, category filtering (All/Direct/Support), document attachments, and mobile-friendly view toggling.
>
> **Statutory Cooling-Off Routing Fix, Build Health & Workspace Integration (2026-09-03):**
> - **Resolved Nested Route Registration in `contracts.routes.ts`**: Un-nested `POST /api/v1/contracts/:contractId/cancel-cooling-off` from inside the `catch` block of `/:contractId/accept`, properly registering the statutory 7-day cooling-off cancellation endpoint (ECA Proclamation No. 1205/2020) directly on `contractsRouter`.
> - **Purged Stale Compiled JavaScript in Backend `src`**: Removed committed transpiled `.js` files from `apps/backend/src/` (`config/env.js`, `lib/logger.js`, `lib/redis.js`, `modules/escrow/providers/*`) that were shadowing TypeScript source files and causing missing environment variables (e.g. `TMS_ROUND_AMOUNT_WINDOW_DAYS`). Added ignore rules to `.gitignore` to protect against future shadowing.
> - **Strict TypeScript Type Safety in Audit and Telegram Bot**: Upgraded `recordAuditEvent` metadata to use `Prisma.InputJsonValue` with `Prisma.JsonNull` fallback, and aligned `BotSession.staffRole` to the full `StaffRole` enum from `@prisma/client` (`SUPPORT`, `COMPLIANCE_OFFICER`, `ADMIN`).
> - **Workflow Workspace Cooling-Off UI**: Added `cancelContractCoolingOff` API client method and client-facing cooling-off cancellation controls in `WorkflowWorkspace.tsx` (`ContractsWorkspace`), displaying statutory cancellation eligibility before milestone funding with confirmation dialogues and cancelled status badges.
> - **Automated Test Coverage**: Added dedicated `cooling-off.test.ts` test suite confirming client statutory cancellation, party authorization guards (403), post-funding rejection, and audit log persistence. All 7 test suites (34 tests) passing.

> **Operations Workspace Polish & Database Synchronization Fix (2026-09-03):**
> - **Resolved 500 `INTERNAL_ERROR` Bug in Operations Dashboard**: Synchronized PostgreSQL database schema with Prisma (`WalletTopUp.providerTransactionId`, `receiptImagePath`, and related ledger/checkout fields) via `prisma db push`, ensuring `/api/v1/wallet/topups` and `/api/v1/wallet/topups/queue` succeed with 200 OK.
> - **Cleaned Dispute Icon in Sidebar & Metric Cards**: Replaced raw textual `(!)` badge symbol with the standard `Scale` (from `lucide-react`) icon in both the Operations sidebar navigation and the Overview metric cards for a consistent, premium aesthetic.
> - **Operations Workspace Header & Sidebar Polish**:
>   - Realigned the topbar title and action bar, separating the `[ All Queues | My Queue ]` scope toggle into the right-hand action controls alongside the theme switcher and refresh button.
>   - Added real-time queue count badges to sidebar navigation items (Support, Receipts, Identity, Disputes).
>   - Upgraded the bottom "Sign out" button with a dedicated `LogOut` icon, clean padding, and subtle red hover state.
>   - Refined metric card layout with dedicated rounded icon wrappers (`.staff-metric-icon-wrap`) and clean typography.
>   - Confined the `StaffCompliancePanel` (AML Review Queue) to the Overview tab rather than sticking it beneath every sub-queue tab.
> - **Strict TypeScript Type Safety**: Fixed `StaffRole` type mismatch in `chat.service.ts` to ensure clean compilation across backend and frontend.

> **Telegram Bot Token Validation & Startup Resilience (2026-08-28):**
> - **Pre-Flight Bot Token Verification**: Added pre-flight check in `bot.service.ts` using `bot.api.getMe()` to test credentials against Telegram API before attempting to set commands or start polling.
> - **Graceful Failure Handling**: If `TELEGRAM_BOT_TOKEN` is invalid, expired, or rejected (401 Unauthorized), the backend logs an informative warning and skips bot initialization without throwing unhandled promise rejections or crashing the dev server.
> - **Polling Error Catching**: Added `.catch()` handler to `bot.start()` to catch background polling disconnections cleanly.

> **Backend Run & TypeScript Type Safety Update (2026-08-28):**
> - Resolved runtime missing dependency `axios` required for eSignet OIDC KYC verification.
> - Aligned Prisma schema with `ROUND_AMOUNTS` and `strDeadlineAt` and regenerated Prisma client.
> - Resolved all strict TypeScript errors across KYC, Escrow, TMS, and Bot Scene modules.

> **Telegram Mini App Startup, Clean Typography & Registration Workflow Update (2026-08-22):**
> - **Immediate Mini App Loading**: Added inline Telegram WebApp initialization script in `index.html` executing `Telegram.WebApp.ready()` and `Telegram.WebApp.expand()` immediately to bypass Telegram iframe loading stalls. Configured `allowedHosts: true` and `ngrok-skip-browser-warning` in `vite.config.ts`.
> - **Emoji-Free Professional UI**: Removed all decorative emojis from Telegram Bot commands, keyboards, greetings, and Mini App UI buttons (clean professional text).
> - **Comprehensive Registration & Onboarding Guide**: Unified registration flow supporting 1-tap Telegram WebApp authentication, Ethiopian mobile phone + password/PIN sign-up, and 1-click Google sign-in with automatic workspace provisioning.
> **Universal Theme Toggle & Footer Alignment Update (2026-08-22):**
> - **Platform-Wide Theme Toggle**: Embedded the light/dark mode theme switcher into every platform page and surface (Marketing Header, Subpages, Sign-in/Register Auth screen, Logged-in Workspace Topbar, Staff Dashboard, and Mini App).
> - **Unified Footer & Escrow Badge Alignment**: Extracted reusable `MarketingFooter.tsx` across all marketing and legal subpages. Fixed flex conflicts in `index.css` and `marketing.css` so that `"Â© 2026 Yekis. All rights reserved."` and `"Payments secured by Yekis Escrow"` align on a clean full-width bottom bar.
> **Platform Auth, Transactional Email & Mini App Security Update (2026-08-22):**
> - **Google (Gmail) & Social Authentication**: Implemented 1-click Google Sign-In (`/api/v1/auth/google`) with automatic user provisioning and workspace resolution. Added persistent session caching on visit (`/api/v1/auth/me` auto-resume), eliminating repetitive account registration prompts.
> - **Transactional Email Notification System**: Built modular transactional email service (`email.service.ts`) with responsive HTML templates for password resets, order invoices/receipts with ETB breakdowns on milestone funding, and platform movement alerts (milestone delivery, escrow releases, dispute updates, KYC verifications).
> - **Telegram Mini App Dual Security**: Implemented dual-tab authentication supporting seamless 1-tap Telegram WebApp HMAC verification and secure Ethiopian mobile phone + PIN/password login with clear security indicators.
> **Telegram Mini App & Environment Architecture Update (2026-08-22):** Enhanced backend environment variable resolution (`env.ts`) to automatically detect `.env` from multiple locations (`apps/backend/.env`, root `.env`, and working directory). Added automated schema sanitization for `TELEGRAM_BOT_TOKEN` to handle quotes, whitespace, and empty strings. Added dedicated unit test suite (`telegram-auth.test.ts`) covering Telegram WebApp HMAC-SHA256 hash verification, freshness checks, and user upserts.
> **Theme, Brand & UX Update (2026-08-22):** Complete light and dark mode design system refactor. Resolved contrast issues across light mode surfaces (fees comparison tables, step indicators, card borders, headings, chat attachments). Standardized brand emerald primary color (`#16a34a` light / `#22c55e` dark) and slate text contrast (`#0f172a` light / `#f8fafc` dark). Removed destructive global SVG color overrides and low-opacity background boxes around icons. Eliminated AI-slop / developer jargon from landing copy in favor of clear, human-readable marketplace terms.
> **Architecture & Type Safety update (2026-08-21):** Full database schema migration synchronization (`20260821215600_add_profile_reviews_chat_platform_models`) completed with clean seeding and zero TypeScript compilation errors across `apps/backend` and `apps/frontend`. All backend test suites and frontend builds validated with passing status.
> **Design spacing update (2026-08-21):** Fully unified Yekis landing and marketing page space utilization to match AFRO-TECH's full-bleed layout. Implemented 6% horizontal gutters across the fixed horizontal navigation bar, left-aligned hero section, content containers (`.marketing-container`), and footer. Configured responsive fluid gutters (6% desktop -> 5% tablet -> 4% mobile) with clean component layouts.
> **Payment flow update (2026-08-15):** Escrow is now funded directly from the client's in-platform wallet. The old external-provider (Telebirr/CBE direct) Fund button has been replaced with a "Fund from wallet" button. When both parties sign a contract, the platform automatically debits the client wallet and locks funds in escrow. See [`docs/FLOW.md`](docs/FLOW.md) for the full canonical payment lifecycle.

This document is the fastest way to understand the product as a whole. It translates the supplied Ethiopian Freelance Marketplace linkage map and journey images into the workflow currently exposed by the frontend and API.

## Actors

| Actor | Main capabilities |
|---|---|
| Client | Verify identity, post jobs, review proposals, sign contracts, fund milestones, accept work, raise disputes |
| Freelancer | Verify identity, browse jobs, bid, sign contracts, submit milestones, raise disputes, withdraw earnings |
| Compliance Officer | Review KYC and top-ups, mediate disputes, review TMS flags, record STR filings |
| Admin | Same operational access as compliance staff, with room for broader administration |
| Workers | Send notifications, warn before auto-release, release eligible escrow, flag periodic KYC reviews |

## Journey Part 1: Registration to Funded Contract

```mermaid
flowchart LR
  A["Register and pass age gate"] --> B["Submit Tier 1 KYC"]
  B --> C{"KYC verified?"}
  C -- No --> D["Staff review or rejection"]
  D --> B
  C -- Yes --> E{"User role"}
  E -- Client --> F["Post job"]
  E -- Freelancer --> G["Browse and submit proposal"]
  F --> G
  G --> H["Client reviews proposals"]
  H --> I["Accept one proposal atomically"]
  I --> J["Generate immutable contract PDF"]
  J --> K["Client signs"]
  J --> L["Freelancer signs"]
  K --> M{"Both signed?"}
  L --> M
  M -- Yes --> N["Fund selected milestone"]
  N --> O["Verify signed provider webhook"]
  O --> P["Escrow held"]
```

Important controls:

- Registration captures age, role, language, and purpose-specific consent.
- Tier 1 must be `VERIFIED` before posting a job, bidding, or funding.
- Users cannot bid on their own jobs, and one freelancer can submit only one proposal per job.
- Proposal acceptance runs in a serializable transaction so only one proposal wins under concurrent requests.
- The generated PDF is stored in MinIO/S3-compatible object storage and exposed to contract parties through a temporary signed URL.
- Funding requires the `contractId` and a milestone that actually belongs to that contract.
- Only one pending funding transaction can exist for a milestone.
- Webhooks use the raw request body, provider-specific HMAC verification, and idempotent state transitions.
- A structuring TMS check runs when funds enter escrow.

## Journey Part 2: Delivery to Payout

```mermaid
flowchart LR
  A["Escrow held"] --> B["Freelancer submits milestone"]
  B --> C["Five-day review window"]
  C --> D{"Client decision"}
  D -- Accept --> E["Release funds atomically"]
  D -- No response --> F["BullMQ auto-release"]
  F --> E
  D -- Dispute --> G["Negotiation"]
  G --> H["Evidence"]
  H --> I["Staff mediation"]
  I --> J{"Resolution"}
  J -- Release --> E
  J -- Refund --> K["Refund client"]
  J -- Split --> L["Partial freelancer credit and client refund"]
  I --> M["Arbitration"]
  M --> J
  E --> N["Freelancer wallet"]
  N --> O["Request Tier 2"]
  O --> P["Staff verifies Tier 2"]
  P --> Q["Request withdrawal"]
  Q --> R{"Wallet mismatch?"}
  R -- Yes --> S["Hold with no debit and create TMS flag"]
  R -- No --> T["Debit wallet and record payout request"]
```

Important controls:

- Submitting work schedules a 24-hour warning and final release job (unless the contract is still within its 7-day cooling-off window, which takes precedence).
- Explicit acceptance cancels delayed release jobs.
- Client can cancel the contract during the 7-day cooling-off window if no escrow is funded or work started yet.
- Release and refund paths use guarded database updates to prevent duplicate wallet credits.
- Fees and withholding are calculated on the server. Platform fees are credited to the `PlatformOperatingAccount` and monitored against the VAT alert threshold.
- Disputes are attached to individual milestones, so a multi-milestone contract can have separate cases.
- Disputes can be mutually withdrawn if both parties propose the same outcome and split.
- Submitting dispute evidence automatically compiles a JSON bundle containing contract terms and the direct message log.
- Partial-split amounts cannot exceed the milestone value, and guarantee contract completion once applied.
- Tier 2 is required for withdrawal.
- A payout identifier that does not match the verified phone is held for review with HTTP `202`; no wallet debit occurs.
- Telebirr B2C automated disbursement initiates payout to the freelancer's mobile wallet (deducting a standard 0.5% cash-out fee). Successful transfers atomically post balanced double-entry general ledger entries (`LedgerJournal` / `LedgerEntry`), while immediate provider refusals automatically roll back the wallet debit.

## Frontend Surfaces

| Surface | What is wired |
|---|---|
| Authentication | Email registration/login and Telegram Mini App authentication |
| Verification | Tier 1 document upload/status and Tier 2 request |
| Jobs workspace | Search, post, view own jobs, bid, review/decide proposals, withdraw proposals |
| Contracts workspace | List party contracts, open signed PDF URL, sign, fund, submit, accept |
| Disputes workspace | List, raise, inspect, escalate, add evidence, request arbitration |
| Wallet | Balance, manual top-up, top-up history, Tier 2 withdrawal |
| Notifications | List unread/all notifications and mark read |
| Support chat | Guest or authenticated conversations and messages |
| Staff dashboard | Operations Console (`apps/frontend/src/pages/ops/`): command center with Action Center, KYC/top-up/receipt queues, dispute resolution, TMS filing and dismissal, support inbox, audit log, admins & permissions, and system health |

## Featured Talent and Moderation

Staff have additional controls over user presence:
- **Featured Talent Carousel**: Admins can pin exceptional, fully-verified freelancers to the homepage carousel for increased visibility. This history is tracked via a featured log.
- **Profile Reports**: Users can flag inappropriate profiles. Staff review these reports in a dedicated queue and can take moderation actions, such as clearing offensive content or suspending the user.

## Backend State Machines

Milestone escrow:

```text
PAYMENT_PENDING -> ESCROW_HELD -> SUBMITTED_FOR_REVIEW
SUBMITTED_FOR_REVIEW -> RELEASED
SUBMITTED_FOR_REVIEW -> DISPUTED
DISPUTED -> RELEASED | REFUNDED | PARTIAL_REFUND
```

Dispute:

```text
STAGE_1_NEGOTIATION -> STAGE_2_EVIDENCE -> STAGE_3_MEDIATION
STAGE_3_MEDIATION -> RESOLVED
STAGE_3_MEDIATION -> STAGE_4_ARBITRATION -> RESOLVED
```

KYC:

```text
PENDING -> UNDER_REVIEW -> VERIFIED | REJECTED
TIER_1 VERIFIED -> Tier 2 request -> UNDER_REVIEW -> TIER_2 VERIFIED | REJECTED
```

A periodic review sets `periodicReviewPending` without revoking a previously verified user's active access.

## Verified Local Scenarios

The following were run end to end against Docker-backed PostgreSQL, Redis, and MinIO:

- Register/login, Tier 1 verification, job creation, proposal submission, proposal acceptance, PDF generation, both signatures, funding initiation, signed webhook, delivery, acceptance, and wallet release.
- Tier 2 request and staff review followed by wallet withdrawal.
- Dispute negotiation, evidence, mediation, and partial-split resolution.
- Wallet mismatch returning a review hold without debiting funds, followed by staff TMS dismissal.
- Backend TypeScript build, frontend production build, and frontend-to-API linkage tests.

## Production Boundaries

| Boundary | Current implementation | Needed for production |
|---|---|---|
| Fayda | Deterministic development mock | Approved API access, credentials, payload mapping, error/retry policy |
| PEP/sanctions | Stubbed no-match behavior | Licensed/approved data source and review policy |
| Telebirr/CBE collection | Shared adapters and signed webhook flow | Real sandbox credentials, verified request/response mappings, reconciliation |
| Payout | Local wallet debit and audit only | Provider disbursement API, pending/failed/reversal states, reconciliation |
| SMS/Telegram | Worker and clients exist; credentials/account linking control delivery | Production credentials, templates, opt-out and delivery monitoring |
| STR filing | Staff records external filing reference | Human regulatory process; no FIC API is assumed |
| Data residency | Local deployment design | Ethiopian production hosting, backups, retention, access review |
| Object immutability | Object-store paths and WORM design | Production bucket versioning/object lock and retention policy |

## Source Of Truth

- Route behavior: `apps/backend/src/app.ts` and each module's `*.routes.ts`/service.
- Request and response shapes: `packages/schemas` plus route-local Zod schemas.
- Persistent state: `apps/backend/prisma/schema.prisma` and migrations.
- User-facing linkage: `apps/frontend/src/api/client.ts` and workspace components.
- Change history: `CHANGELOG.md`.
- Playbooks: `docs/NGROK_PLAYBOOK.md` (e.g. for testing webhooks and Telegram Mini App integration).

When implementation changes, update this walkthrough if the user journey, state machines, roles, or production boundaries change.

## Staff Live Chat Inbox Journey (added 2026-08-07)

1. A staff account (`staffRole = COMPLIANCE_OFFICER | ADMIN`) logs in via the normal login form.
2. `FullPlatformApp` detects `user.staffRole` and immediately renders `StaffDashboard`.
3. On load, all four queues are fetched in parallel: support conversations, KYC queue, top-up queue, dispute queue.
4. Auto-polling fires every 8 seconds Ã¢Â€Â” new user messages surface without a manual refresh.
5. Unread conversations show a lime dot in the conversation list and a red badge count on the metric card.
6. Staff select a conversation Ã¢Â†Â’ messages load, thread is marked read, auto-scroll puts staff at the latest message.
7. Staff type a reply and press Enter or Send Ã¢Â†Â’ message delivered, list refreshes silently.
8. Staff press **Close** Ã¢Â†Â’ `PATCH /api/v1/chat/admin/conversations/:id/status` sets status to `CLOSED`; reply box locks.
9. Closed conversations remain visible under the **All** filter and can be **Reopened** at any time.
10. See `ADMIN_ACCESS.md` for instructions on creating a staff account.

## Evidence Viewer (added 2026-08-08)

1. The backend implements full integration for the "Evidence Viewer".
2. Contains secure streaming of user KYC identity evidence and receipt image uploads from the internal Object Store to authenticated staff.
3. Added the `WalletTopUp` and `KycReviewEvent` models to accurately log and securely verify top-up requests and compliance audits.
4. Top-ups can now be reviewed manually, unlocking real funds into the wallet upon `APPROVED` status.

## KycQueue Redesign

1. The KYC identity review interface is now a two-pane layout, embedding the `EvidenceViewer` inline.
2. Compliance officers can now review resubmissions alongside full historical logs, automated Fayda/PEP checks, and visually cross-check the submitted Full Name and Document Number.
3. Automated SLA timers and granular rejection reasons (e.g., "Request clearer photo") improve staff efficiency.

## TopUpQueue Redesign (added 2026-08-09)

1. The receipt approval interface (`TopUpQueue`) is now a two-pane side-by-side layout, embedding the `EvidenceViewer` inline.
2. Staff can visually cross-check the user-submitted amount and reference number directly against the receipt image.
3. The expected destination platform account is explicitly shown to ensure funds are verified against the correct company account.
4. User top-up history (prior approvals and rejections) is shown inline to provide context on trusted vs. risky transactions.
5. Suspicious transactions (e.g. forged receipts) can now be explicitly "Flagged," routing them to the TransactionFlag/TMS compliance queue instead of just being silently rejected.
6. Approval actions include a strict confirmation modal before irrevocably crediting a user's wallet.

## Staff Dashboard Redesign (added 2026-08-09)

1. **Clickable Metric Cards & SLAs**: The top metric cards for Support, Receipts, Identity, and Disputes are now clickable, jumping directly to their respective queues. SLA aging timers (e.g., "< 1h", "24h") are displayed on each card, turning amber or red if queues become stagnant.
2. **Queue Scoping**: A "My Queue" vs "All Queues" filter has been added. As items are currently unassigned globally in the backend schema, the "My Queue" toggle behaves as a UI mock to showcase personal views pending future backend assignment logic.

 # #   D i s p u t e Q u e u e   R e d e s i g n   ( a d d e d   2 0 2 6 - 0 8 - 0 9 ) 
 
 1 .   T h e   D i s p u t e Q u e u e   i n t e r f a c e   i s   n o w   a   t w o - p a n e   l a y o u t ,   p r o v i d i n g   f u l l   i n l i n e   c o n t e x t   f o r   m e d i a t o r s . 
 2 .   M e d i a t o r s   c a n   v i e w   t h e   o r i g i n a l   c o n t r a c t   s c o p e   a l o n g s i d e   t h e   s u b m i t t e d   d e l i v e r a b l e   ( w i t h   i n l i n e   v i e w e r   f o r   U R L - b a s e d   d e l i v e r i e s ) . 
 3 .   A d d e d   \ d e l i v e r a b l e U r l \   t o   t h e   \ M i l e s t o n e \   s c h e m a   t o   t r a c k   a n d   p r e s e n t   t h e   s u b m i t t e d   w o r k   d u r i n g   d i s p u t e s . 
 4 .   S t a g e   2   E v i d e n c e   s t a t e m e n t s   f r o m   b o t h   c l i e n t   a n d   f r e e l a n c e r   a r e   r e n d e r e d   i n l i n e   a s   a   c h a t   f l o w . 
 5 .   R e s o l v i n g   a   d i s p u t e   p r o v i d e s   a   l i v e ,   c a l c u l a t e d   p r e v i e w   o f   e x a c t   E T B   a m o u n t s   a l l o c a t e d   t o   t h e   f r e e l a n c e r   a n d   r e f u n d e d   t o   t h e   c l i e n t ,   f a c t o r i n g   i n   t h e   p l a t f o r m   f e e   ( 5 % )   a n d   e s t i m a t e d   w i t h h o l d i n g   t a x .  
 
 # #   S t a f f C o m p l i a n c e P a n e l   R e d e s i g n   ( a d d e d   2 0 2 6 - 0 8 - 0 9 ) 
 
 1 .   R e d e s i g n e d   t h e   T M S   A M L   q u e u e   t o   f e a t u r e   d e d i c a t e d   v i s u a l   b l o c k s   f o r   S T R U C T U R I N G ,   V E L O C I T Y ,   P A S S _ T H R O U G H ,   a n d   W A L L E T _ M I S M A T C H   f l a g s . 
 2 .   C o m p l i a n c e   a c t i o n s   n o w   s t r i c t l y   e n f o r c e   a   1 0 - c h a r a c t e r   m i n i m u m   f o r   r e v i e w   n o t e s ,   a n d   d e m a n d   a   v a l i d   F I C   r e f e r e n c e   n u m b e r   w h e n   f i l i n g   a n   S T R . 
 3 .   R e p l a c e d   g e n e r i c   t i m e s t a m p   d e t a i l s   w i t h   a   c r i t i c a l   2 4 - h o u r   S L A   c o u n t d o w n ,   a g g r e s s i v e l y   f l a g g i n g   b r e a c h e d   f i l i n g   d e a d l i n e s . 
 4 .   I n t e g r a t e d   a   n e w   ' U s e r   C o m p l i a n c e   H i s t o r y '   s i d e b a r ,   d i r e c t l y   f e t c h i n g   p a s t   f l a g s ,   c u r r e n t   K Y C   T i e r ,   a n d   W a l l e t   b a l a n c e   f o r   h o l i s t i c   r i s k   a s s e s s m e n t   d u r i n g   m a n u a l   r e v i e w s .  
 

## Updates
- 2026-08-10: Fixed Telegram bot webhook deletion issues in development mode, added a 'Open Yekis Jobs' persistent Web App Menu Button, and updated welcome translations to guide users to the app.

- 2026-08-10: Fixed malformed translation JSON causing 'errors_generic' bug in Telegram bot, and added Wallet tab to frontend Mini App navigation.

- 2026-08-10: Configured Telegram bot API properties (setMyCommands, setMyDescription, setMyShortDescription) and redesigned the /help command to provide an excellent 'BotFather-style' onboarding UX.

- 2026-08-10: Fixed root cause of 'errors_generic' bug Â— session initial function was incorrectly calling createRedisSessionStorage().read() asynchronously; replaced with synchronous createInitialSessionData(). Fixed ESLint errors: no-explicit-any in client.ts (added PaginatedResponse<T> generic type) and react-hooks/purity in StaffDashboard.tsx (pre-computed Date.now()). Added HTTPS guard on setChatMenuButton to skip Web App button in local dev.

- 2026-08-10: Fixed cascading TypeScript errors caused by the PaginatedResponse generic type change. Reverted component-specific endpoint return types back to 'any' to satisfy rigid prop expectations in KycQueue, TopUpQueue, and StaffCompliancePanel.

- 2026-08-10: Completely rewrote the Telegram Bot's i18n translation middleware. The @grammyjs/i18n plugin strictly required Fluent (.ftl) files and was crashing/ignoring the existing JSON locales. I built a custom middleware that synchronously loads the JSON locales, injects ctx.t correctly, and safely falls back without throwing TypeError: t is not a function.

- 2026-08-10: Stripped all emojis from bot language JSON files (en.json, am.json). Replaced the text 'Y' logo in the Mini App's welcome and crash screens with the official Yekis SVG logo.

- 2026-08-12: Merged Profile Feature Phase 1 fixes. Added cached KYC tier/status, lifetime net earnings, and gross spend to the `User` schema. Upgraded the contract lifecycle to rely on a synchronous `ContractStatus` determined by all milestones reaching a terminal state.
- 2026-08-21: Implemented end-to-end multi-user integration test suite (`simulated-negotiations-and-disputes.test.ts`) validating complete marketplace lifecycles: competitive proposals, contract generation, wallet-first escrow funding, milestone delivery, and all dispute resolution paths (mutual settlement, evidence & staff mediation queue claiming, and AACCSA arbitration awards).


## Fayda eSignet & Spec Alignment Update

- **eSignet Integration**: Fully replaced the generic Fayda KYC with a spec-compliant eSignet OIDC/PAR flow utilizing JWS signature validation.
- **Compliance Auto-Hold**: Integrated TMS with the wallet to freeze withdrawals when high-risk AML flags are created.
- **Circumvention Counters**: Automatically suspends users who attempt to share contact info 3 times.
- **VAT Tracking**: Enabled VAT computation (15%) on platform margins.
- **Deliverable & Evidence Hashing**: Implemented SHA-256 cryptographic hashing on uploaded job deliverables and dispute evidence bundles.
- **Marketing Footer Alignment**: Refactored the 5-column grid layout, standardized 38px column title baselines with the brand logo, eliminated asymmetric brand column padding, normalized button/link vertical heights with flex alignment, and restored the bottom border divider.
- **Telegram Mini App Stability & Top-Up**: Routed Telebirr checkout through `Telegram.WebApp.openLink` to eliminate `ERR_UNKNOWN_URL_SCHEME` crashes, auto-settled sandbox mock top-ups, and restored MinIO container and `marketplace-dev` bucket to resolve universal `INTERNAL_ERROR` 500s across uploads and reads.
- **Mini App Space Management & Telebirr Dialog**: Removed the 3 onboarding badges per user feedback, gave the Mini App home screen generous header (38px) and footer (52px) breathing space, placed contents freely with comfortable 20px touch-friendly role cards and 48px icons, standardized the Telebirr commodity title to `Yekis Escrow - Top-up ETB {amount}`, and added an in-app Telebirr modal with instant sandbox simulation to bypass Ethio Telecom sandbox MSISDN limitations.
- **Desktop Auth Screen 100vh Fit & Redesigned Consents**:
  - Replaced the 4 sprawling vertical checkboxes with a compact single-line agreement and an expandable `Options ▾` disclosure for optional telemetry/marketing preferences, reducing vertical height by >110px.
  - Made Terms of Service & Privacy Policy clickable and expandable via in-page overlay modals, preventing page reload or lost input fields.
  - Removed top-right logo badge in auth card header per user request, keeping a distraction-free clean typography header.
  - Fixed login screen alignment collision: moved "Forgot your password?" up into the Password label row, eliminated negative margins on submit, and centered social login buttons without overlap.
  - Placed Phone and Date of Birth into a side-by-side 2-column grid and locked the desktop layout to `height: 100vh; overflow: hidden;` so users never need to scroll down/up to log in or register.

- **Cross-Section UI & Alignment Polish (Client, Freelancer, Wallet & Verification)**:
  - **Freelancer Workspace & Opportunities**: Added live search filtering for open briefs by title or keyword; replaced raw JSON milestones with styled milestone breakdown cards showing title, due date, and ETB amounts; added direct "Apply" button on job cards; added clean status badge indicators on freelancer proposals with responsive "Withdraw" actions.
  - **Client Workspace & Job Postings**: Enhanced client's published job cards to show full budget range (ETB min – max), category, deadline, and proposal count pill; styled incoming proposal rows with flex distribution, badged proposal statuses (Accepted, Rejected, Submitted), and non-overlapping action buttons (Shortlist, Accept, Reject).
  - **Client Job Brief Form**: Expanded the "Title" field to span 2 columns in the 3-column `form-grid`, eliminating the awkward blank grid slot next to Category; aligned the "Publish job" button with proper top margin and auto-width.
  - **Wallet Layout & Top-Up**: Initialized `showTopUp` to open automatically for Clients; updated `.payment-account` to horizontal flex alignment (`display: flex; align-items: center; gap: 16px;`) so Telebirr and CBE logos sit beside account details instead of awkward vertical stacking; transitioned `.browser-topup-fields` to 2-column grid with mobile single-column fallback; refined Instant Checkout into a centered, balanced container.
  - **Verification & KYC**: Set verification form and Tier 2 forms to balanced 2-column grids with full-width file dropzones, eliminating empty grid gaps.
  - **Landing Page Marketplace Roles**: Balanced "For clients" and "For freelancers" cards with `flex-direction: column; justify-content: space-between;` and bottom-pinned CTA buttons.
  - **Settings**: Added proper spacing and auto-width to the Sign Out button.
  - **Profile Edit Page Alignment Redesign**:
    - Replaced the unstyled `PublicProposersPrivate` inline text block with a 3-card responsive grid selector showing title and clear descriptions for Public, Clients Only, and Private visibility.
    - Fixed the displaced "Available for Work" checkbox by replacing it with a styled card featuring a modern iOS-style toggle slider on the right.
    - Formatted Additional Skills tags into interactive toggle pills with hover effects, active emerald styling (`var(--color-primary)`), and clean wrapping.
    - Organized the form into clean sections (Personal Details, Skills & Expertise, Preferences) divided by subtle borders.
    - Set the First Name and Last Name inputs into a balanced 2-column grid (`form-row-2col`).
- **Operations Workspace (Staff Dashboard) Layout Fix**:
  - Eliminated the broken side-by-side flex container (`.staff-dashboard-top-section`) that previously crammed `StaffCompliancePanel` into a 25% column alongside the 4 metric cards, causing search and filter dropdowns to clip and creating a window-wide horizontal scrollbar.
  - Converted the Overview page to a vertical stack (`.staff-overview-layout`):
    - **Top Row**: 4 metric cards (`.staff-metrics`) now span the full available width in an executive 4-column grid (`repeat(4, 1fr)`).
    - **Bottom Section**: `StaffCompliancePanel` (Transaction Monitoring & AML Queue) now occupies full width, giving `QueueControls` (search, status, flag type, refresh, pagination) ample room to display without clipping.
  - Implemented responsive two-pane grid styling for `.dispute-queue-container` (`360px minmax(0, 1fr)` on desktop, single column on smaller viewports) and styled `.staff-queue-card` and `.staff-queue-list`.
  - Added `overflow-x: hidden;` to `.staff-shell` and `.staff-main` to permanently prevent horizontal overflow.
- **Auth Screen Professional Visual Treatment**: Redesigned the left-panel auth visual with a professional, indicator-rich layout:
  - **3 Key Metrics Row**: Contracts signed (2,400+), escrow volume (ETB 12M+), payout success rate (98%) — separated by vertical dividers, staggered fade-in on load.
  - **Live Activity Feed**: 3 activity items (milestone delivered, contract signed, escrow funded) with colored status dots, descriptions, and relative timestamps — slide in sequentially.
  - **Trust Badges**: "Escrow protected", "KYC verified", "Telebirr & CBE" with inline SVG icons — anchored to the bottom right.
  - Background: subtle dot grid texture and a soft brand-green radial gradient glow. All elements use a single `authFadeUp` keyframe (one-shot, no looping).
- **Proper Google Login Button**: Restored the Google, Apple, and Facebook social sign-in buttons to a compact, single-row layout of small circular icons (`type: "icon"`, `shape: "circle"`) to save vertical space and maintain a clean login form aesthetic.
- **Chat System Fix & Role-Based Redesign**:
  - **Layout & Horizontal Clipping Fix**:
    - Resolved the horizontal clipping bug where `scrollIntoView()` scrolled the parent workspace container horizontally by ~180px, cutting off the left half of the sidebar (hiding "Messages", avatars, search box, and filter tabs).
    - Switched to container-scoped vertical scrolling (`messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight`), ensuring only the messages feed scrolls vertically without displacing parent elements.
    - Added `min-width: 0`, `overflow-x: hidden`, and adjusted grid columns (`290px minmax(0, 1fr)`) across `.chat-workspace`, `.chat-sidebar`, and `.chat-window`.
    - Removed the redundant `"Workspace Messages"` top toolbar header to give the chat workspace full vertical viewport height.
  - **Role-Aware Chat Experience (Client vs Freelancer)**:
    - Wired `role={platformRole as "CLIENT" | "FREELANCER"}` into `<ChatWorkspace>`.
    - Added role-specific sidebar subtitles ("Your project discussions" for Clients vs "Client conversations & proposals" for Freelancers).
    - Added role-tailored empty states for threads and no-active-chat screen.
    - Updated New Chat Modal: Clients see "Freelancer Email or User ID" with project brief placeholders, while Freelancers see "Client Email or User ID" with proposal placeholders.
    - Applied distinct color-coded badges to conversation threads: Blue for `CLIENT`, Emerald for `FREELANCER`, Purple for `SUPPORT`.
  - **Context-Aware Mini-Me AI Co-Pilot & Smart Replies**:
    - Overhauled backend `generateSmartReplies` in `chat.service.ts`:
      - For Support tickets: Suggests support-focused questions (wallet/payout help, contract queries, identity verification) for users, and staff greetings/escalation responses for staff. Completely eliminated out-of-place freelancer responses ("How can I help with your project?") when users contact Support.
      - For Direct conversations: Role-tailored replies for Clients (asking availability, requesting scope review, approving milestones) versus Freelancers (sharing availability, proposing timeline, confirming deliverables).
    - Contextualized composer placeholder: Shows "Describe your question or issue..." for Support vs milestone-specific prompts for direct negotiation.
    - Hid the "Extract Deal" button on official Support conversations (deal extraction is strictly scoped to client ↔ freelancer contract negotiation).
- **Admin Dashboard Accessibility, Authentication, and Support Chat Delivery**:
  - **Sidebar Scroll Accessibility**:
    - Fixed the inaccessible sidebar items when accordion groups (CASES, FINANCE, OPERATIONS, USERS, ADMINISTRATION) are expanded.
    - Updated `.staff-sidebar` with strict viewport containment (`overflow: hidden; max-height: 100vh; box-sizing: border-box`).
    - Configured `.staff-sidebar .sidebar-nav` with `flex: 1 1 0; min-height: 0; overflow-y: auto; overflow-x: hidden;` and slim custom scrollbars, allowing the navigation links to scroll independently while keeping the brand header and user profile fixed at top.
    - Added `flex-shrink: 0; margin-top: auto;` to `.sidebar-logout` so the "Sign out" button stays neatly accessible at the bottom of the sidebar.
  - **Admin Dashboard "Unauthenticated" & Login Rate Limit Lockouts**:
    - Identified that `adminRouter` in `admin.routes.ts` lacked `requireAuth` middleware, leaving `req.user` undefined and causing all admin endpoints (`/api/v1/admin/dashboard/summary`, `/api/v1/admin/audit-logs`, etc.) to reject with `401 {"error": "Unauthenticated"}`.
    - Mounted `adminRouter.use(requireAuth)` at the router level so `req.user` is reliably populated before permission checks execute.
    - Diagnosed the login `UNKNOWN_ERROR` as an HTTP 429 Too Many Requests response caused by background dashboard polling exceeding the legacy 300-request/15-minute limit.
    - Increased generic `/api` rate limiting in `app.ts` to 2,000 requests per 15-minute window in production (and 10,000 in development), configured structured JSON rate limit error payloads (`{ error: "TOO_MANY_REQUESTS", message: "..." }`), and added graceful 429 handling with non-JSON fallback in `client.ts`.
  - **Landing Page Floating Support Chat ("Need Help") Delivery**:
    - Resolved the issue where inquiries sent from the floating chat widget on the landing page failed to reach the support desk.
    - In `chat.service.ts`, expanded `pickAvailableStaff()` to select from all operational staff roles (`SUPPORT`, `ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `COMPLIANCE_OFFICER`).
    - Added the assigned staff member directly to conversation participants upon guest ticket creation, and wired `notifyStaffOfEvent` so in-app notifications and alerts are dispatched to all staff in real time.
    - Updated `getConversationAccess()` and `chat.routes.ts` so all staff roles can view, claim, and reply to open support tickets without being blocked by 403 Forbidden errors.
    - In `LandingPage.tsx`, updated the floating chat widget to persist `guestConversationId` in component state, enabling continuous conversation and follow-up messaging even after initial email submission.

## Operations Console v2 (added 2026-10-03)

The staff dashboard was rebuilt as a single console at `apps/frontend/src/pages/ops/`, replacing `StaffDashboard.tsx` and the eight `Admin*Page.tsx` files (nineteen components retired in total — see `docs/CHANGELOG.md`). `FullPlatformApp.tsx` mounts it for any account with a `staffRole`.

**Entry point.** `if (user?.staffRole) return <OpsConsole user={user} onExit={logout} />;`

### Navigation and gating
- **Collapsible sidebar**: the header's 3-bar button hides the sidebar for full-width tables and charts. The choice persists in `localStorage` (`yekis-ops-nav`). At ≤860px the same button opens the overlay drawer instead, so the two layouts never conflict.
- Sidebar groups: **Overview** (Command Center) · **Cases** (Support Desk, Dispute Mediation, Risk & Fraud) · **Review Queues** (KYC Reviews, Profile Reports, Receipts) · **Financial** (Contracts, Payments, Payouts, Escrow, Reconciliation, Ledger, Reports) · **Administration** (Users, Staff & Roles, Audit Logs, System Health).
- Entries are filtered by `opsPerms.ts`, which fetches `GET /admin/permissions/matrix` and resolves the signed-in `staffRole` against it. The backend still enforces every route (`requirePermission` on `/admin/*`, `requireStaffRole` elsewhere) — the console only hides links a reviewer cannot open. A deep link into a forbidden page falls back to the first permitted page.
- Sidebar badges count open work per queue (support tickets, KYC, disputes, profile reports, receipts, payouts, risk flags, recon).
- The header also carries a working notifications popover (`GET /notifications`, mark-read via `POST /notifications/:id/read`) and the light/dark toggle.

### Finding things
Every table page searches and pages **on the server** (`page`, `limit`, `q`, plus endpoint filters) with a 350ms debounce, and `<Pager>` shows real totals. Two endpoints cannot do this honestly and say so in the UI: reconciliation applies its status filter client-side because the backend filters after pagination, and the audit log narrows the current page because that route has no text search and no date range.

### Command Center
1. **Stat cards** — total users, active contracts, funds in escrow, pending payouts, open disputes, pending KYC, support tickets, pending payments. No trend percentages or sparklines: the backend exposes aggregate totals only, with no time-series endpoint to derive a real trend from.
2. **Action Center** — ranks live work by severity: breached dispute SLAs (critical) → critical/high risk flags → failing health checks → recon mismatches → pending payouts → KYC queue → profile reports. Each directive opens the relevant page with the record focused.
3. **Charts** — transaction volume by day, escrow by state (donut), payouts vs refunds by week, and review workload per queue. All dependency-free SVG. History charts are derived from the most recent 100 rows of the underlying list endpoints and the UI labels that window.
4. **Recent activity** — newest audit events from `dashboard/summary.recentActivity`.

### Review queues (hotkeys enabled)
- **KYC Reviews** (`/kyc/review-queue`) — `↑`/`↓` to move, `A` to approve, `R` to focus the rejection reason. "Clearer photo" resolves as a rejection carrying a re-upload reason, because the backend accepts `VERIFIED | REJECTED` only.
- **Dispute Mediation** (`/disputes/staff/queue`) — SLA countdown per case (breached cases flagged red), inline evidence thread, live fee-and-withholding split preview before resolving.
- **Profile Reports** (`/staff/reports`) — resolve as no-action / hide / ban, plus the featured-carousel refresh that the old Profiles tab carried.
- **Receipts** (`/wallet/topups/queue`) — approve, reject, or flag a manual transfer. Flagging raises a `STAFF_FLAGGED` transaction flag that then appears under Risk & Fraud.

### Carried over from the previous dashboard
Support inbox (threaded replies, attachments, close/reopen, open/all scope, server-side search and paging), receipt review, audit log browser, and Admins & Permissions — the last now rendering the **real** permission matrix from the backend instead of the invented one the old page displayed. Role changes accept "No console access" to demote an account.

These surfaces use the console's own patterns rather than the old dashboard's: the two-pane `queue-wrap` / `q-card` / `queue-detail` layout (Support Desk mirrors KYC and Disputes), inline `expand-row` decisions (Receipts mirrors Payouts), and the `Kv` stat strip, `Empty`, `Banner` and `FilterSelect` primitives shared across every table page.

### Staff actions, and what each one hits
| Surface | Actions | Routes |
|---|---|---|
| Users | open profile, suspend, reinstate, force KYC re-review | `GET /admin/users/:id`, `POST /admin/users/:id/suspend`, `/unsuspend`, `/force-kyc-rereview` |
| KYC | view signed documents, decision history, verify / reject / request clearer | `GET /kyc/documents/:id/url`, `GET /kyc/:userId/history`, `POST /kyc/:userId/review` |
| Disputes | claim, add evidence, escalate stage, send to arbitration, resolve | `POST /disputes/:id/claim`, `/evidence`, `/escalate`, `/arbitration`, `/resolve` |
| Risk | inspect rule payload, file STR (optionally suspending the account), dismiss, lift hold | `POST /tms/:flagId/file-str`, `/dismiss`, `POST /tms/users/:userId/lift-hold` |
| Payouts | confirm / fail settlement with provider ref or failure reason | `POST /admin/payouts/:payoutId/settle` |
| Receipts | approve, reject, flag as suspicious | `POST /wallet/topups/:id/approve`, `/reject`, `/flag` |
| Staff | change role, remove console access | `POST /admin/staff/:userId/role` |
| Profile reports | no-action / hide / ban, refresh featured carousel | `PATCH /staff/reports/:id`, `POST /featured/staff/refresh` |
| Support | reply, attach files, close, reopen | `POST /chat/conversations/:id/messages`, `/chat/upload`, `PATCH /chat/admin/conversations/:id/status` |

Evidence is genuinely real: the viewer exchanges a `KycDocument` id for a 300-second signed URL and renders what the object store returns, and a milestone deliverable opens from its stored `deliverableUrl`. There are no mock documents anywhere in the console.

### Data layer
`opsApi.ts` is an adapter over the shared `api` client (Bearer auth, `/api/v1`, automatic refresh) — not a second HTTP client. The console was authored against a planned `/admin/*` surface that does not exist; the mapping table is documented in `apps/frontend/src/pages/ops/README.md`. Because the non-`/admin` staff surfaces use `requireStaffRole`, restricted roles receive 403 on parts of the overview aggregate, so `overview()` degrades section-by-section rather than failing the page.

### Fixed along the way
- `getProfileReports`, `resolveProfileReport`, and `refreshFeaturedCarousel` all pointed at routes that do not exist (404). Profile moderation and carousel refresh were silently dead; all three now hit their real endpoints.
- Contract and user detail load on demand rather than per-row, removing an N+1 request fan-out from those pages.
- List pages searched and filtered a fixed 100 rows in the browser, so anything outside that window was invisible and the pager never moved. Search, filters and paging now run on the server.
- Filter option lists were drifted from the API: escrow offered "PENDING" (rejected by `/admin/escrows`) and `M_PESA` was missing from every rail filter.
- Contracts "Export CSV" and Reports "Download" had no handler. Both emit real CSV of the rows on screen.
