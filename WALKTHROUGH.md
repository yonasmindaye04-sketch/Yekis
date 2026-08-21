# Yekis Jobs Functional Walkthrough

Last validated: 2026-08-15

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
- Pass-through checks are flag-only. Staff can dismiss a flag or record an externally filed STR.
- Live provider payout is not implemented yet. A successful local withdrawal currently records and debits the wallet but does not transmit money.

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
| Staff dashboard | KYC/top-up queues, dispute resolution, TMS filing and dismissal |

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
| Telebirr/Chapa/CBE collection | Shared adapters and signed webhook flow | Real sandbox credentials, verified request/response mappings, reconciliation |
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
4. Auto-polling fires every 8 seconds â new user messages surface without a manual refresh.
5. Unread conversations show a lime dot in the conversation list and a red badge count on the metric card.
6. Staff select a conversation â messages load, thread is marked read, auto-scroll puts staff at the latest message.
7. Staff type a reply and press Enter or Send â message delivered, list refreshes silently.
8. Staff press **Close** â `PATCH /api/v1/chat/admin/conversations/:id/status` sets status to `CLOSED`; reply box locks.
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

- 2026-08-10: Fixed root cause of 'errors_generic' bug  session initial function was incorrectly calling createRedisSessionStorage().read() asynchronously; replaced with synchronous createInitialSessionData(). Fixed ESLint errors: no-explicit-any in client.ts (added PaginatedResponse<T> generic type) and react-hooks/purity in StaffDashboard.tsx (pre-computed Date.now()). Added HTTPS guard on setChatMenuButton to skip Web App button in local dev.

- 2026-08-10: Fixed cascading TypeScript errors caused by the PaginatedResponse generic type change. Reverted component-specific endpoint return types back to 'any' to satisfy rigid prop expectations in KycQueue, TopUpQueue, and StaffCompliancePanel.

- 2026-08-10: Completely rewrote the Telegram Bot's i18n translation middleware. The @grammyjs/i18n plugin strictly required Fluent (.ftl) files and was crashing/ignoring the existing JSON locales. I built a custom middleware that synchronously loads the JSON locales, injects ctx.t correctly, and safely falls back without throwing TypeError: t is not a function.

- 2026-08-10: Stripped all emojis from bot language JSON files (en.json, am.json). Replaced the text 'Y' logo in the Mini App's welcome and crash screens with the official Yekis SVG logo.

- 2026-08-12: Merged Profile Feature Phase 1 fixes. Added cached KYC tier/status, lifetime net earnings, and gross spend to the `User` schema. Upgraded the contract lifecycle to rely on a synchronous `ContractStatus` determined by all milestones reaching a terminal state.
