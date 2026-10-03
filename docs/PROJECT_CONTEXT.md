# Project Context

Last updated: 2026-10-03

> **Update 2026-10-03 (Operations Console v2, follow-up):**
> 1. Collapsible Navigation: The console header's 3-bar button hides the sidebar so wide tables and charts get the full viewport, persisted under `yekis-ops-nav`. At ≤860px the same button still drives the overlay drawer, so the collapse class is only applied on desktop.
> 2. Real Server-Side Listing: Added `useListPage` (pushes `page`/`limit`/`q` with a 350ms debounce, resets to page 1 on filter change, returns real totals). Every table page previously fetched a fixed 100 rows and filtered in the browser, so search missed anything outside that window and `<Pager>` never moved. `loading` is now derived by tagging each response with its request, so stale rows cannot flash between pages.
> 3. Removed Mock UI: `EvidenceViewer` no longer renders hardcoded JSX mockups of Ethiopian ID cards, TIN certificates and selfies — it resolves a `KycDocument` id into a 300-second signed URL and renders the real object, or opens a milestone's stored `deliverableUrl`. The inert notifications bell now reads `/notifications` and marks items read.
> 4. Restored The Moderation Actions The Port Dropped: Retiring `StaffCompliancePanel` and the old queues had silently removed TMS decisions (file STR / dismiss / lift hold), user suspension, and dispute claim/escalate. All are wired again against routes that already existed, and the TMS queue payload now carries KYC tier, wallet balance and per-user flag history.
> 5. Dead Buttons Removed: Contracts "Export CSV" and Reports "Download" had no handler and now emit real RFC 4180 CSV of the rows on screen; Overview "View all" pointed at the Ledger instead of the audit trail.
> 6. Option Lists Pinned To The API: `opsConst.ts` centralises filter values against the Prisma enums the backend accepts — `/admin/escrows` rejects "PENDING" as an `escrowState`, and `M_PESA` is a supported rail that was absent from every rail filter.
> 7. Design Consistency: Support Desk and Receipts were rebuilt on the console's own patterns (two-pane `queue-wrap` queues, inline `expand-row` decisions, `Kv` stat strips) so the carried-over surfaces match the rest.

> **Update 2026-10-03 (Operations Console v2):**
> 1. Staff Dashboard Consolidation: Replaced `StaffDashboard.tsx` and the eight `Admin*Page.tsx` components with one console at `apps/frontend/src/pages/ops/` (shell + 18 pages + shared components + a single scoped stylesheet). Nineteen files retired. Mounted from `FullPlatformApp.tsx` for any account carrying a `staffRole`.
> 2. `opsApi.ts` Is An Adapter, Not A Second API Client: The console was authored against a planned `/admin/*` surface (`/admin/overview`, `/admin/badges`, `/admin/risk-flags`, `/admin/kyc/queue`, `/admin/disputes/mediation`, `/admin/profile-reports`) using cookie auth. None of those routes exist. The adapter maps every console operation onto real endpoints through the shared `api` client (Bearer auth, `/api/v1`, auto-refresh) — see `apps/frontend/src/pages/ops/README.md` for the full mapping table.
> 3. Permission Gating Moved To The Matrix: `opsPerms.ts` fetches `GET /admin/permissions/matrix` and filters sidebar entries and command-palette results by the signed-in `staffRole`, replacing the hand-maintained `STAFF_MATRIX` mirror. Because non-`/admin` staff surfaces use the coarser `requireStaffRole`, `overview()` degrades section-by-section rather than failing wholesale for restricted roles.
> 4. Removed Fabricated Data: Dropped hardcoded stat-card trend percentages (there is no time-series endpoint) and the invented permission matrix in the old staff page (`MANAGE_STAFF`, `VIEW_LEDGER`, … matched no backend key). History charts are derived from the most recent 100 rows of the underlying list endpoints and labelled as windowed.
> 5. Fixed Three 404 Endpoints: `getProfileReports`, `resolveProfileReport`, and `refreshFeaturedCarousel` all requested routes that do not exist, leaving profile moderation and the carousel refresh silently dead. Corrected to `GET/PATCH /api/v1/staff/reports` and `POST /api/v1/featured/staff/refresh`.
> 6. N+1 Removal: Contract and user detail now load when a row is opened instead of per-row on list load.

> **Update 2026-09-08 (Admin Dashboard Accessibility, Authentication, and Support Chat Delivery):**
> 1. Staff Sidebar Scroll Accessibility: Resolved the issue where lower menu options (Audit Logs, Admins & Permissions, Sign out) became inaccessible when accordion groups expand. Updated `.staff-sidebar` with strict viewport containment and `.staff-sidebar .sidebar-nav` with `flex: 1 1 0; min-height: 0; overflow-y: auto;` with slim custom scrollbars and a pinned bottom sign-out button.
> 2. Admin Router Authentication Fix: Resolved the `401 {"error": "Unauthenticated"}` error across the Admin Overview and operations features by mounting `adminRouter.use(requireAuth)` at the router level in `admin.routes.ts`, reliably populating `req.user` for all permission checks.
> 3. Polling-Resilient Rate Limiting: Fixed login `UNKNOWN_ERROR` lockouts caused by background dashboard polling exceeding the legacy 300-request/15-minute rate limit. Increased general API limits in `app.ts` to 2,000 req/15m in production and 10,000 in development, added structured JSON error payloads, and enhanced `client.ts` to handle 429 gracefully with clear feedback.
> 4. Support Desk Delivery & Multi-Staff Routing: Fixed landing page floating chat inquiries failing to reach support agents. In `chat.service.ts` and `chat.routes.ts`, expanded auto-assignment to all active staff roles (`SUPPORT`, `ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`), registered assigned staff as conversation participants, wired real-time fan-out notifications via `notifyStaffOfEvent("SUPPORT_REQUEST_CREATED")`, and updated `LandingPage.tsx` to maintain conversation sessions for continuous follow-up messages.
>
> **Update 2026-09-05 (Late Afternoon - CBE & Safaricom M-Pesa Integration + Manual Verification Fallback):**
> 1. Multi-Rail Payments Expansion: Added **Commercial Bank of Ethiopia (CBE / CBE Birr)** and **Safaricom M-Pesa (Ethiopia)** alongside Telebirr across Instant Checkout, Manual Transfers, and Freelancer Wallet Withdrawals.
> 2. Safaricom M-Pesa Payment Client: Built `mpesa.client.ts` implementing the `PaymentProviderClient` interface with B2C disbursement simulation, transaction reference generation, and registered under `PROVIDER_CLIENTS` in `escrow.service.ts`.
> 3. Zero-Dead-End Manual Verification Fallback: Eliminated user dead-ends when automated gateway APIs are unreachable or experience latency:
>    - *Checkout Initiation Fallback:* If automated checkout fails, clients receive an actionable fallback card offering a 1-click transition to Manual Transfer with amount and provider pre-filled.
>    - *Receipt Attachment on Stalled Requests:* Implemented `POST /api/v1/wallet/topups/:topUpId/attach-receipt` allowing users to upload bank/mobile money receipts to existing `CHECKOUT_PENDING` requests, automatically promoting them to `PENDING` manual review.
> 4. Operations Queue Enhancements: Updated `TopUpQueue.tsx` with color-coded provider badges (Telebirr blue, CBE purple, M-Pesa emerald) and destination account indicators (`0910 011 818`, `1000 223 344`, `0777 011 818 / Till 882199`) for fast staff verification.
> 5. Unified Frontend & Mobile Experience: Updated both `BrowserWallet.tsx` (Desktop Web) and `App.tsx` (Mobile & Telegram Mini App) with 3-way provider selectors, 1-click account copying, and inline receipt attachment modals.
>
> **Update 2026-09-05 (Afternoon - Chat Attachment Persistence & Support Desk Visibility Fix):**
> 1. Persistent Storage & Streaming Endpoints: Built `uploadChatAttachment` and `getChatAttachmentStream` in `objectStore.ts`, integrated `POST /api/v1/chat/upload` (Multer memoryStorage 15MB limit) and `GET /api/v1/chat/attachments/:key(*)` into `chat.routes.ts`, routing files to MinIO object store with local filesystem fallback under `uploads/chat-attachments/`.
> 2. Resolved Client Attachment Bug: Fixed `ChatWorkspace.tsx` which previously generated temporary browser-scoped `blob:` URLs that could not be accessed by other users. File attachments are now uploaded to the backend first, returning a permanent streaming endpoint URL stored in the message's `attachmentUrl`.
> 3. Support Desk Attachment Rendering: Updated `StaffDashboard.tsx` to inspect `message.attachmentUrl` and display rich previews: inline responsive image previews for images, and styled download chips with `FileText` and `ExternalLink` for other documents/archives.
> 4. Support Desk Reply Attachments: Empowered support staff to attach documents/images in reply messages, with file selection tags, deletion controls, and async upload handling.
>
> **Update 2026-09-05 (Morning - Operations Workspace Layout Fix & Auth Polish):**
> 1. Operations Workspace Overview Layout Fix: Resolved the horizontal clipping and window scrollbar issue caused by `.staff-dashboard-top-section` forcing `StaffCompliancePanel` side-by-side into a 25% column next to the 4 metric cards. Re-architected with `.staff-overview-layout` so the 4 metric cards (`.staff-metrics`) span the full width at the top, and `StaffCompliancePanel` sits full-width underneath with responsive two-column grid (`.dispute-queue-container`). Added `overflow-x: hidden;` to `.staff-shell` and `.staff-main`.
> 2. Compact Social Sign-in: Maintained a single-row layout of circular icons for Google, Apple, and Facebook to preserve vertical viewport space on the login and registration forms.
> 2. Layout & Horizontal Clipping Fix: Eliminated the horizontal displacement bug where `scrollIntoView()` scrolled the parent workspace container horizontally, pushing the left half of the chat sidebar off-screen. Replaced with container-scoped vertical scrolling (`scrollTop = scrollHeight`), and added `min-width: 0` and `overflow-x: hidden` with adjusted grid layout (`290px minmax(0, 1fr)`). Removed redundant outer toolbar header for full-height chat workspace.
> 3. Role-Based Chat Workflow: Passed `role={platformRole}` to `ChatWorkspace`, displaying role-specific subtitles ("Your project discussions" vs "Client conversations & proposals"), role-aware empty thread states, role-aware New Chat Modal (Client sees "Freelancer Email/ID"; Freelancer sees "Client Email/ID"), and distinct role badge colors (Blue for Client, Emerald for Freelancer, Purple for Support).
> 4. Support vs Direct Scoping & Smart Replies: Overhauled backend `generateSmartReplies` in `chat.service.ts` to be conversation-type and role aware. When chatting with Support, suggested replies are support-focused (wallet deposits, milestone questions, KYC verification) instead of out-of-context freelancer proposals. In direct conversations, clients receive project discussion prompts while freelancers receive proposal and timeline prompts. Hid "Extract Deal" on Support tickets so it only shows during client ↔ freelancer contract negotiations.
>
> **Update 2026-09-04 (Late Evening):** Auth Header Cleanup, Login Form Collision Fix, and Comprehensive Section Alignment Polish:
> 1. Auth Card Header Logo Removal: Removed the top-right logo pill container in the auth card per user request, preserving clean typographic hierarchy.
> 2. Login Page Collision Fix: Fixed collision where negative margins pulled the "Forgot your password?" button into the green submit button; repositioned "Forgot your password?" inline with the Password label row and centered social login buttons with clean spacing.
> 3. Client & Freelancer Workspace Alignment Polish:
>    - Client Jobs & Proposals: Displayed budget range (ETB min – max), category, deadline, and proposal count pill on client job cards; formatted proposal rows with status pills and non-overlapping action buttons (Shortlist, Accept, Reject).
>    - Client Job Brief Form: Spanned Title input across 2 columns in the 3-column form grid to eliminate the blank slot beside Category, and aligned the Publish button with proper top margin.
>    - Freelancer Opportunities & Proposals: Added real-time search filtering on open briefs; replaced raw milestone JSON with styled breakdown cards; added direct Apply button; formatted freelancer proposals with clear status badges and aligned Withdraw buttons.
> 4. Wallet & Verification Layout Refinement:
>    - Automatically defaulted `showTopUp` to true for Clients so deposit options are immediately visible.
>    - Refactored `.payment-account` to horizontal flex alignment (`display: flex; align-items: center; gap: 16px;`) so Telebirr and CBE logos sit beside account details instead of awkwardly stacking vertically.
>    - Set `.browser-topup-fields` and verification forms to clean 2-column grids with mobile single-column responsiveness.
> 5. Landing Page Role Cards Alignment: Balanced "For clients" and "For freelancers" cards with `flex-direction: column; justify-content: space-between;` and bottom-pinned CTA buttons.
> 6. Profile Edit Page Alignment & Layout Redesign: Replaced smashed `PublicProposersPrivate` inline text with a 3-card visibility selector with titles and descriptions; replaced displaced raw checkbox with an iOS-style toggle slider card for "Available for Work"; styled Additional Skills tags with interactive toggle pills and active emerald highlights; organized inputs into personal details, skills, and preferences sections with 2-column grid alignment and a completeness progress bar.
>
> **Update 2026-09-04 (Evening):** Real-time WebSocket Messaging & "Mini-Me" AI Negotiation Co-Pilot:
> 1. Real-Time WebSocket Infrastructure (`/api/v1/ws`): Replaced latency-heavy 5-second polling with event-driven bidirectional WebSockets supporting thread subscriptions (`conversation:<id>`), private user alerts (`user:<id>`), typing pulse (`chat:typing`), read receipts (`chat:read`), and instant message delivery (`chat:message`).
> 2. Direct 2-Party Negotiation Channels (`POST /api/v1/chat/direct`): Enabled direct client ↔ freelancer project negotiation threads alongside official support tickets, with participant metadata, role badges, online indicators, and unread counters.
> 3. "Mini-Me" AI Co-Pilot Capabilities:
>    - Contextual Smart Replies: In-composer quick reply pills dynamically suggested from conversation context (`POST /api/v1/chat/conversations/:id/assistant/suggest-replies`).
>    - Thread Summary & Digest: Generates structured summaries with topic breakdown, agreed deliverable bullet points, detected timeline, and agreed budget in ETB (`POST /api/v1/chat/conversations/:id/assistant/summarize`).
>    - 1-Click Deal Terms Extractor: Synthesizes negotiation dialog into escrow-ready milestone proposal cards with confidence rating and direct contract creation link (`POST /api/v1/chat/conversations/:id/assistant/extract-deal`).
> 4. In-Composer Anti-Circumvention Protection: Real-time regex scan detects off-platform contact leaks (phone numbers, Telegram handles, external emails, wire requests) with an inline escrow safety advisory protecting users before sending.
> 5. Responsive 2-Column Chat Workspace: Created `ChatWorkspace.tsx` and `ChatWorkspace.css` mounted seamlessly in `FullPlatformApp.tsx`, featuring sidebar thread search, filter tabs (All / Direct / Support), attachment support, and smooth mobile breakpoint navigation.
>
> **Update 2026-09-04 (Afternoon):** Auth Screen Redesign & Single-Page Viewport Optimization:
> 1. Redesigned Cookies & Privacy Consents: eliminated the 4 sprawling vertical checkboxes by introducing a compact single-line required agreement with an expandable `Options ▾` disclosure for optional telemetry/marketing preferences, reducing vertical footprint by over 110px.
> 2. Interactive In-Page Legal Overlays: replaced disruptive external navigation with dedicated in-page modal dialogs for Terms of Service and Privacy Policy, enabling users to read, inspect, and accept terms without losing filled registration inputs.
> 3. Enriched Brand Logo & Balanced Right Column: enlarged the auth panel header logo badge to 48px with a branded pill badge and expanded the auth card width to 490px, beautifully filling the empty horizontal space.
> 4. Guaranteed 100vh Single-Screen Experience: set `.platform-auth` to `height: 100vh; overflow: hidden;` and placed Phone + Date of Birth in a responsive 2-column grid, completely eliminating scrollbars so users never need to scroll down/up to log in or register.
>
> **Update 2026-09-04:** Hardened Local Infrastructure Resilience & Startup Health Checks:
> 1. Configured `restart: unless-stopped` across PostgreSQL (`yekis-postgres-1`), Redis (`yekis-redis-1`), and MinIO (`yekis-minio-1`) in [docker-compose.yml](file:///c:/Users/Za/Desktop/project/Yekis/docker-compose.yml), ensuring Docker preserves running database and storage containers across system reboots and Docker Desktop restarts.
> 2. Added eager `prisma.$connect()` database connectivity verification during server boot in [server.ts](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/src/server.ts), logging an explicit error and guidance if PostgreSQL is unreachable before user requests are processed.
> 3. Added convenience scripts `pnpm infra:up` and `pnpm infra:down` as well as automatic `predev` hooks in root [package.json](file:///c:/Users/Za/Desktop/project/Yekis/package.json) and [apps/backend/package.json](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/package.json), ensuring Docker containers are automatically booted whenever `pnpm dev` is run.
> 4. Fixed Telebirr checkout HTTP 400 parameter mismatch error (`49401024995:Parameter:.biz_content.title type mismatch`) in [telebirr.client.ts](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/src/modules/escrow/providers/telebirr.client.ts) by sanitizing `title` to strip characters forbidden by Telebirr's regex pattern (including hyphens `-` in `Top-up`), and wired dynamic `redirect_url` in the preOrder payload to return to the active application upon payment completion/exit.
>
> **Update 2026-09-04 (Night):** Refined Telegram Mini App UX and Telebirr Checkout:
> 1. Removed the 3 temporary trust badges from the onboarding screen per user feedback.
> 2. Restructured the Telegram Mini App welcome screen with generous header (38px) and footer (52px) breathing space, expanded touch targets (20px 18px role cards, 48px icon containers, 12px 14px tab buttons), and relaxed typographic line-height (1.5-1.55) for a natural, native-feeling mobile experience.
> 3. Standardized Telebirr commodity naming: replaced raw internal database IDs with clean human-readable title `Yekis Escrow - Top-up ETB {amount}` across pre-order payloads.
> 4. Resolved Telebirr Developer Sandbox `Failed to query the consumer in Digital Payment system based on the input value` barrier: added sandbox guidance notes and an in-app checkout pop-up with a one-touch `Simulate Instant Payment (Sandbox)` bypass endpoint (`POST /api/v1/wallet/topups/checkout/:topUpId/simulate-success`) for seamless local development and testing without needing Ethio Telecom test MSISDNs.
> **Update 2026-09-03 (Night):** Resolved Telegram Mini App operational issues:
> 1. Fixed Telebirr checkout redirect inside Telegram Mini App by routing through `Telegram.WebApp.openLink(redirectUrl)` instead of `window.location.href`, preventing Android/iOS WebView navigation failure (`net::ERR_UNKNOWN_URL_SCHEME`). Added auto-settlement for mock sandbox top-ups in `topup.service.ts` when live credentials are not present.
> 2. Fixed universal upload/read `INTERNAL_ERROR` 500 responses across proposals, KYC, receipts, and deliverables by restarting the MinIO object store container (`yekis-minio-1`), creating the `marketplace-dev` bucket, and wiring `ensureObjectStoreReady()` on server startup in `server.ts` to auto-initialize missing buckets.
> **Update 2026-09-03 (Evening):** Resolved statutory 7-day cooling-off cancellation route registration bug in `contracts.routes.ts` (un-nesting `POST /api/v1/contracts/:contractId/cancel-cooling-off` from inside the accept error handler), purged stale transpiled `.js` files from `apps/backend/src` that were shadowing TypeScript files and causing runtime TMS environment variable failures, hardened `recordAuditEvent` with strictly typed `Prisma.InputJsonValue` metadata, unified `BotSession.staffRole` to include the `SUPPORT` staff role, wired up `cancelContractCoolingOff` in frontend `api/client.ts` and `WorkflowWorkspace.tsx`, and added full test coverage in `cooling-off.test.ts` (all 34 backend tests passing).
> **Update 2026-09-03:** Synchronized PostgreSQL database schema with Prisma (`WalletTopUp.providerTransactionId` and ledger models) resolving Operations dashboard 500 error. Polished Operations Workspace UI: replaced textual `(!)` dispute icon with `lucide-react` `Scale` icon across sidebar and metrics cards, added queue count badges, realigned topbar actions, enhanced sign-out button, and scoped AML review panel to Overview tab. Refactored marketing footer grid layout and typography to fix visual alignment: standardized 38px column title baselines matching the brand logo, eliminated asymmetric brand column padding, normalized button and link vertical heights with flex alignment, restored the bottom border divider, and enhanced responsive wrapping across desktop, tablet, and mobile. Implemented core Double-Entry General Ledger (`LedgerAccount`, `LedgerJournal`, `LedgerEntry`), Telebirr B2C automated disbursement payout rail with `PayoutTransaction` lifecycle and rollback guards, multi-script anti-circumvention engine (Amharic Fidel numerals, words, leetspeak), and WebSocket real-time foundation (`/api/v1/ws`).
> **Update 2026-08-22:** Refactored light and dark mode design systems to eliminate contrast anomalies, ensure WCAG compliance, harmonize brand emerald colors (`#16a34a` in light, `#22c55e` in dark), eliminate low-opacity icon backgrounds, and polish landing copy to remove AI-slop / developer jargon.
> **Update 2026-08-21:** Aligned the marketing and landing page spacing to match the AFRO-TECH system, using a full-bleed layout with consistent 6% horizontal gutters instead of a constrained 1200px container.

## Product Vision

Yekis_jobs is a trust-centered Ethiopian freelance marketplace. Clients and freelancers move from verified identity to job, proposal, signed contract, funded milestone, delivery, release, dispute resolution, and payout without leaving the platform.

The core promise is mutual protection: clients fund work against explicit milestones, freelancers can see that money is held before delivery, inactive clients cannot hold submitted work indefinitely, and either party can escalate a disputed milestone through a recorded process.

## Audience And Roles

- Clients post work, review proposals, sign agreements, fund milestones, accept delivery, and raise disputes.
- Freelancers discover work, bid, sign agreements, submit milestones, receive releases, and request withdrawals.
- Compliance Officers review identity evidence and top-ups, mediate disputes, and process TMS flags.
- Admins share current compliance operations and can be extended with broader platform administration.

Users may have `CLIENT`, `FREELANCER`, or `BOTH` marketplace roles. Staff authority is separate through `COMPLIANCE_OFFICER` or `ADMIN`.

## Product Scope

### Identity And Access

- Email/password and Telegram Mini App authentication.
- Minimum contracting-age enforcement and purpose-specific consent capture.
- Tier 1 KYC gates job posting, bidding, and funding.
- Tier 2 KYC gates withdrawal.
- Periodic review creates a pending-review marker without silently revoking an already verified user's access.

### Marketplace

- Searchable category-based jobs.
- Client job management and proposal review.
- Freelancer proposal submission and withdrawal.
- One proposal per freelancer per job and self-bid prevention.
- Atomic proposal acceptance, competing-proposal rejection, contract creation, and PDF generation.

### Contract And Escrow

- Immutable generated service-agreement PDF stored in object storage.
- Independent client and freelancer signature timestamps.
- Milestone funding only after both signatures.
- Signed, raw-body provider webhooks with idempotent processing.
- Delivery submission, five-day review window, warning, explicit acceptance, and auto-release.
- Server-side platform fee and withholding calculation.

### Disputes And Compliance

- One dispute per milestone, allowing separate cases within a multi-milestone contract.
- Negotiation, evidence, mediation, arbitration, and resolution stages.
- Release, refund, or bounded partial split.
- Structuring, velocity, pass-through, and wallet-mismatch TMS rules.
- Staff queue for dismissal or recording an externally filed STR.
- Append-only audit events for important transitions.

### Profiles And Reputation

- Rich user profiles featuring bio, titles, verified skills, and portfolio items.
- Profile completeness tracking to encourage robust freelancer presence.
- A Featured Talent Carousel managed by staff to highlight top performers.
- Double-blind contract review system: ratings and feedback remain hidden until both parties submit or the review window closes.
- Bayesian average rating calculation to ensure fair representation of user reputation.
- Staff moderation capabilities via profile reporting.

### Supporting Experiences

- Wallet balance and Tier 2 withdrawal request.
- Receipt-based manual top-up with staff approval.
- In-app notifications with SMS/Telegram worker integration.
- Guest and authenticated support conversations with automated load-balanced staff assignment and file attachments.
- Operations Console (`apps/frontend/src/pages/ops/`) for staff: command center with a severity-ranked Action Center, KYC / receipt / dispute / TMS review queues, support inbox, contracts, payments, payouts, escrow, reconciliation, ledger, reports, users, staff roles, audit log, and system health. Nav visibility is derived from the backend permission matrix.
- Public-facing marketing site with escrow explanation, FAQ, transparent pricing, and technical SEO infrastructure (robots.txt, sitemap.xml, structured data).

## Current Implementation Status

### Implemented And Locally Verified

- React browser UI linked to current API request shapes and paths.
- Express/TypeScript modules for all primary user and staff workflows.
- PostgreSQL persistence through Prisma migrations.
- Redis/BullMQ delayed and periodic workers.
- MinIO/S3-compatible KYC and contract document storage with bucket initialization.
- Role, party, KYC-tier, state-transition, and staff authorization checks.
- Concurrency guards around proposal acceptance, pending funding, release, refund, and partial split.
- Integration tests for frontend-to-API linkage and successful backend/frontend builds.
- Manual end-to-end runs for release, withdrawal, dispute split, and TMS hold/dismissal.

### Implemented Behind Development Mocks Or Stubs

- Fayda verification uses deterministic development behavior pending formal API access.
- PEP/sanctions screening uses a stub pending an approved source.
- Telebirr and CBE collection (PAY-002: Chapa removed 2026-08-26) share an adapter and webhook architecture, but request/response mappings need real sandbox verification.
- SMS and Telegram delivery require credentials and Telegram account linking to become operational.

### Not Production-Ready

- Live Telebirr B2C production credentials and physical custodial escrow bank account (blocked on NBE licensing / bank agreement; currently using simulated sandbox provider).
- Production Ethiopian hosting, object lock, backup/restore, secret management, TLS, monitoring, and incident runbooks must be established.
- Regulatory thresholds, retention, withholding treatment, e-signature evidence, and STR procedures require Ethiopian legal/compliance validation before launch.

## Technical Shape

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19, Vite, TypeScript | User, wallet, support, and staff workflows |
| API | Express, TypeScript, Zod | Authentication, authorization, orchestration, validation |
| Data | PostgreSQL, Prisma | Transactional source of truth and migrations |
| Jobs | Redis, BullMQ | Auto-release, KYC refresh, notification work |
| Documents | MinIO/S3-compatible storage | KYC evidence, receipts, and contract PDFs |
| Shared contracts | Workspace Zod schemas | Common API payload types |

See `ARCHITECTURE.md` for component and state-machine detail and `WALKTHROUGH.md` for the complete human journey.

## Product Assumptions

1. Escrow is mandatory for marketplace contract payments.
2. Identity verification is a gate, not an optional profile enhancement.
3. Both parties must sign before milestone funding.
4. Fees, tax, wallet credits, and resolution amounts are server-controlled.
5. Auto-release protects freelancers when a client does not respond.
6. A dispute belongs to the specific milestone whose delivery or payment is contested.
7. Staff tools support human compliance decisions; they do not pretend external regulatory actions are automated.

## Compliance Design Constraints

| Constraint | Design response |
|---|---|
| Ethiopian data localization | Production personal data and documents must use approved domestic hosting |
| AML/CFT auditability | Important transitions write immutable-intent `AuditLog` rows with database-level protections |
| Tiered KYC | Tier 1 gates marketplace money entry; Tier 2 gates money exit |
| Withholding | Server-calculated rates and threshold are environment controlled |
| Electronic acceptance | Independent party timestamps and immutable generated contract document |
| Document retention | Object-store references in PostgreSQL; production bucket must enable versioning/object lock |
| Suspicious activity | TMS queues a human decision and records, but does not submit, an STR |

These are engineering constraints, not legal certification. Production policy must be confirmed by Ethiopian counsel, tax, banking, and compliance stakeholders.

## Success Definition

The pilot is functionally complete when a real user can complete the journey in `WALKTHROUGH.md` with sandbox or live approved providers, every financial state reconciles to provider records, compliance staff can operate all queues, and production controls have been tested through failure and recovery scenarios.

## Documentation Practice

Documentation is part of the definition of done. Every implementation change updates the relevant Markdown file and `CHANGELOG.md`; the persistent repository rule is in `.agents/AGENTS.md`.
