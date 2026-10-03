# API Reference

Last updated: 2026-08-15

Base URL: `http://127.0.0.1:4000`

Versioned routes use `/api/v1`. Except for registration, login, Telegram authentication, guest support, health, and signed provider webhooks, routes require:

```http
Authorization: Bearer <access-token>
Content-Type: application/json
```

Shared payloads are defined in `packages/schemas`; some multipart and route-local payloads are validated in the route module.

## Health

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Returns `{ "status": "ok" }` |

## Authentication

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Public | Register with age gate, role, password, and consents |
| `POST` | `/api/v1/auth/login` | Public | Return access/refresh JWTs and user |
| `POST` | `/api/v1/auth/refresh` | Public (valid refresh token) | Exchange a valid refresh token for a new access+refresh pair. Suspended accounts are refused here too â€” a suspension takes effect at the next silent refresh. |
| `POST` | `/api/v1/auth/telegram` | Public | Verify Telegram Mini App `initData` and authenticate/upsert |

Registration body:

```json
{
  "email": "client@example.com",
  "phone": "+251911223344",
  "password": "SecureP@ss1",
  "role": "CLIENT",
  "languagePreference": "en",
  "dateOfBirth": "1990-01-01",
  "consents": {
    "kycDataProcessing": true,
    "marketingCommunications": false,
    "analytics": false
  }
}
```

Marketplace roles are `CLIENT`, `FREELANCER`, and `BOTH`.

## KYC

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/kyc/documents` | Authenticated | Upload one KYC document and trigger verification/review |
| `GET` | `/api/v1/kyc/status` | Authenticated | Return tier, status, review metadata, and submitted documents |
| `POST` | `/api/v1/kyc/upgrade-tier2` | Authenticated Tier 1 user | Submit TIN/business registration for Tier 2 review |
| `GET` | `/api/v1/kyc/review-queue` | Staff | List pending and periodic KYC reviews |
| `POST` | `/api/v1/kyc/:targetUserId/review` | Staff | Verify or reject KYC |

`POST /documents` is `multipart/form-data` with `file`, `documentType`, `fullName`, `dateOfBirth`, and `documentNumber`. Maximum file size is 8 MB.

Tier 2 body:

```json
{ "tin": "1234567890", "businessRegNumber": "optional" }
```

Review body:

```json
{ "decision": "VERIFIED", "rejectionReason": null }
```

Staff means `COMPLIANCE_OFFICER` or `ADMIN`.

## Jobs And Proposals

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/jobs` | Authenticated | Search/list jobs using `category`, `q`, `page`, `pageSize` |
| `GET` | `/api/v1/jobs/mine` | Authenticated | List jobs posted by the current user |
| `GET` | `/api/v1/jobs/:jobId` | Authenticated | Get job details |
| `POST` | `/api/v1/jobs` | Client/Both, Tier 1 verified | Create a job |
| `POST` | `/api/v1/jobs/:jobId/cancel` | Posting client | Cancel an open job |
| `GET` | `/api/v1/jobs/proposals/mine` | Authenticated | List current freelancer's proposals |
| `POST` | `/api/v1/jobs/:jobId/proposals` | Freelancer/Both, Tier 1 verified | Submit one proposal for a job |
| `GET` | `/api/v1/jobs/:jobId/proposals` | Posting client | List proposals for that job |
| `POST` | `/api/v1/jobs/proposals/:proposalId/decision` | Posting client | `SHORTLISTED`, `ACCEPTED`, or `REJECTED` |
| `POST` | `/api/v1/jobs/proposals/:proposalId/withdraw` | Proposal owner | Withdraw submitted/shortlisted proposal |

Create job body:

```json
{
  "title": "Build an inventory dashboard",
  "category": "WEB_APP_DEVELOPMENT",
  "description": "Detailed project scope...",
  "budgetMin": { "amountMinor": 500000, "currency": "ETB" },
  "budgetMax": { "amountMinor": 900000, "currency": "ETB" },
  "deadline": "2026-09-30",
  "proposedMilestones": [
    {
      "title": "Working delivery",
      "amount": { "amountMinor": 900000, "currency": "ETB" },
      "dueDate": "2026-09-20"
    }
  ]
}
```

Submit proposal body:

```json
{
  "coverLetter": "Detailed delivery approach...",
  "quotedAmount": { "amountMinor": 850000, "currency": "ETB" },
  "estimatedDays": 21,
  "milestoneBreakdown": [
    {
      "title": "Working delivery",
      "amount": { "amountMinor": 850000, "currency": "ETB" },
      "dueDate": "2026-09-20"
    }
  ]
}
```

Accepting a proposal rejects competing proposals, moves the job to `IN_PROGRESS`, generates the contract/PDF, and is protected against concurrent winners.

## Contracts

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/contracts` | Authenticated party | List current user's contracts and milestones |
| `GET` | `/api/v1/contracts/:contractId` | Contract party | Get contract details |
| `GET` | `/api/v1/contracts/:contractId/document` | Contract party | Get a temporary signed URL for the PDF |
| `POST` | `/api/v1/contracts/:contractId/accept` | Contract party | Record that party's independent signature timestamp |
| `POST` | `/api/v1/contracts/:contractId/cancel-cooling-off` | Client party | Exercise statutory 7-day cooling-off cancellation before work begins (ECA Proclamation No. 1205/2020) |

Funding is unavailable until both `clientAcceptedAt` and `freelancerAcceptedAt` are set.
The 7-day cooling-off cancellation right may only be exercised by the client while all contract milestones remain in `PAYMENT_PENDING` (no escrow funds held).


## Escrow And Wallet

| Method | Path | Access | Purpose |
| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/escrow/fund` | Contract client, Tier 1 verified | (Deprecated) Old external-provider funding path |
| `POST` | `/api/v1/escrow/fund-from-wallet` | Contract client, Tier 1 verified | Initiate milestone funding from client wallet |
| `GET` | `/api/v1/escrow/milestones` | Authenticated party | List milestones across current user's contracts |
| `POST` | `/api/v1/escrow/milestones/:milestoneId/submit` | Contract freelancer | Mark funded work delivered and schedule auto-release |
| `POST` | `/api/v1/escrow/milestones/:milestoneId/accept` | Contract client | Accept delivery and release funds |
| `GET` | `/api/v1/escrow/wallet` | Authenticated | Return `balanceMinor` |
| `POST` | `/api/v1/escrow/wallet/withdraw` | Tier 2 verified | Request payout to provider account |

Funding body (wallet-first):

```json
{
  "milestoneId": "milestone-id"
}
```

Funding response (`200 OK`): returns the updated milestone object with `escrowState: "ESCROW_HELD"`.

*(Note: The old `/fund` route expecting `provider` is deprecated. Escrow funding is now automatically triggered when both parties accept the contract, provided the client has topped up their wallet. The `/fund-from-wallet` route is available for manual retry.)*

When `provider` is `TELEBIRR`, `initiatePayment` creates a preOrder via the Telebirr Merchant API, utilizes a Redis-cached Fabric token, and returns a real `redirectUrl` for web checkout. In mock mode (when Telebirr credentials are not configured), it falls back to returning a mock transaction ID and `redirectUrl: null`.

Withdrawal body:

```json
{
  "amountMinor": 500000,
  "provider": "TELEBIRR",
  "payoutAccountIdentifier": "+251911223344"
}
```

Providers are `TELEBIRR`, `CBE_BIRR`, and `M_PESA`. Wallet mismatch returns `202` with `HELD_FOR_REVIEW` and does not debit the wallet. A passing request creates a `PayoutTransaction`, initiates automated B2C disbursement via the provider (with deterministic sandbox simulation when credentials are not configured), posts double-entry ledger entries upon confirmation, and rolls back the wallet balance if the provider rejects the payout.

Withdrawal response (`200 OK`):

```json
{
  "payoutId": "payout-cuid",
  "status": "CONFIRMED",
  "amountMinor": 500000,
  "netAmountMinor": 497500,
  "feeMinor": 2500,
  "balanceMinor": 1500000
}
```

## Top-Ups And Manual Fallback

The mounted base path is `/api/v1/escrow/topups` (with wallet shortcuts at `/api/v1/wallet/topups`).

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/escrow/topups/manual` | Authenticated | Upload receipt and create manual review request |
| `GET` | `/api/v1/escrow/topups` | Authenticated | List own top-ups |
| `GET` | `/api/v1/escrow/topups/:topUpId` | Owner | Get one top-up |
| `GET` | `/api/v1/escrow/topups/admin/queue` | Staff | List pending top-ups |
| `POST` | `/api/v1/escrow/topups/admin/:topUpId/review` | Staff | Approve/reject; approval credits wallet |
| `POST` | `/api/v1/wallet/topups/checkout` | Authenticated | Initiate automated checkout (`TELEBIRR`, `CBE_BIRR`, `M_PESA`) |
| `POST` | `/api/v1/wallet/topups/:topUpId/attach-receipt` | Owner | Attach manual transfer receipt to unconfirmed/stalled checkout request |

Manual top-up is `multipart/form-data` with `receipt`, `amountMinor`, `provider`, and `referenceNumber`. Supported rails are `TELEBIRR`, `CBE_BIRR`, and `M_PESA`; maximum receipt size is 8 MB.

Automatic top-up accepts `{ amountMinor, provider: "TELEBIRR" | "CBE_BIRR" | "M_PESA" }` and returns `{ redirectUrl, topUpId }`. If an automated gateway is unreachable or experiences latency, users can utilize the **Manual Verification Fallback** to transfer funds directly and submit the transfer reference and receipt for immediate staff queue review without losing transaction context.

## Signed Payment Webhooks

| Method | Path | Signature Location | Algorithm / Header |
|---|---|---|---|
| `POST` | `/api/v1/webhooks/telebirr` | Body (`sign` field) | RSA-PSS (`SHA256withRSAandMGF1`) |
| `POST` | `/api/v1/webhooks/cbe` | Header | `x-cbe-signature` (HMAC-SHA256, secret `CBE_WEBHOOK_SECRET`) |

PAY-002: the Chapa webhook route and client adapter were removed on 2026-08-26; Chapa is no longer an approved payment rail.

These public provider callbacks accept a raw body, enforce a dedicated rate limit (`120 req/min`), verify signatures, normalize provider status, and process provider transaction IDs idempotently.

### Telebirr Webhook (`POST /api/v1/webhooks/telebirr`)

Telebirr embeds the signature directly in the JSON payload body (`sign` field) rather than in an HTTP header, and uses RSA-PSS verification against `TELEBIRR_PUBLIC_KEY`.

**Webhook Payload Shape:**

```json
{
  "merch_order_id": "YKS-1723720000000-ABC123",
  "trade_status": "Completed",
  "total_amount": "5000.00",
  "sign": "i8+X...<base64-rsa-pss-signature>",
  "sign_type": "SHA256WithRSA"
}
```

**Webhook Response:**

```json
{
  "code": 0,
  "msg": "success"
}
```

If the signature is invalid or JSON parsing fails, the endpoint returns `{ "code": -1, "msg": "INVALID_SIGNATURE" }` (`401`) or `{ "code": -1, "msg": "INVALID_JSON" }` (`400`).

Status mappings:
- `Completed`, `Success` -> `SUCCESS` (milestone moves to `ESCROW_HELD`)
- `Fail`, `Failed`, `Closed`, `Cancelled` -> `FAILED`
- Other -> `PENDING`

## Disputes

The secured mounted API uses these paths; legacy `/raise`, `/contract/:id`, and `/advance-stage` routes are not mounted.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/disputes` | Authenticated | List disputes for current user's contracts |
| `POST` | `/api/v1/disputes` | Contract party | Raise a dispute for a submitted milestone |
| `GET` | `/api/v1/disputes/:disputeId` | Dispute party | Get dispute and evidence |
| `POST` | `/api/v1/disputes/:disputeId/escalate` | Dispute party | Move negotiation to evidence |
| `POST` | `/api/v1/disputes/:disputeId/evidence` | Dispute party | Add evidence statement and progress when ready |
| `POST` | `/api/v1/disputes/:disputeId/arbitration` | Dispute party | Escalate mediation to arbitration |
| `GET` | `/api/v1/disputes/staff/queue` | Staff | List mediation/arbitration queue |
| `POST` | `/api/v1/disputes/:disputeId/resolve` | Staff | Release, refund, or partially split |

Raise body:

```json
{
  "contractId": "contract-id",
  "milestoneId": "milestone-id",
  "category": "QUALITY_ISSUE",
  "description": "The delivery does not match the agreed scope."
}
```

Resolve body:

```json
{
  "outcome": "PARTIAL_SPLIT",
  "recommendation": "Recorded mediation rationale...",
  "freelancerShareMinor": 300000
}
```

Outcomes are `RELEASE_TO_FREELANCER`, `REFUND_TO_CLIENT`, and `PARTIAL_SPLIT`.

## Profiles And Reputation

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/users/:userId/profile` | Public/Authenticated | Get user profile and portfolio |
| `PATCH` | `/api/v1/users/me/profile` | Authenticated | Update bio, title, location, etc. |
| `GET` | `/api/v1/users/me/profile/completeness` | Authenticated | Get profile completeness score |
| `POST` | `/api/v1/users/me/profile/views` | Authenticated | Record profile view |
| `GET` | `/api/v1/skills` | Public | List available skills |
| `POST` | `/api/v1/contracts/:id/review` | Contract party | Submit double-blind review for contract |
| `GET` | `/api/v1/users/:userId/reviews` | Public/Authenticated | List user's published reviews |
| `GET` | `/api/v1/featured` | Public | List featured talent carousel |
| `POST` | `/api/v1/portfolio` | Authenticated Freelancer | Add portfolio item |
| `GET` | `/api/v1/staff/reports` | Staff | List and manage profile reports |

## Gigs (Fiverr-style Service Packages)

See `GIG_MODEL_PLAN.md` for the full design. Amounts are integer minor units (ETB cents).

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/gigs/search` | Public | Faceted gig search (`category`, `q`, `page`, `pageSize`) |
| `GET` | `/api/v1/gigs/:gigId` | Public | Gig detail incl. packages and freelancer |
| `POST` | `/api/v1/gigs` | Freelancer/Both, Tier 1 verified | Create a gig with packages |
| `GET` | `/api/v1/gigs/mine` | Authenticated Freelancer | List own gigs |
| `PATCH` | `/api/v1/gigs/:gigId` | Owner, Tier 1 verified | Update a gig |
| `POST` | `/api/v1/gigs/:gigId/status` | Owner | Set `ACTIVE` / `PAUSED` / `ARCHIVED` / `REJECTED` |
| `POST` | `/api/v1/gigs/orders` | Client, Tier 1 verified | Order a package |
| `POST` | `/api/v1/gigs/orders/:orderId/fund` | Client, Tier 1 verified | Fund order from wallet (escrow held) |
| `POST` | `/api/v1/gigs/orders/:orderId/submit` | Freelancer | Submit delivery (schedules auto-release) |
| `POST` | `/api/v1/gigs/orders/:orderId/revision` | Client | Request a revision |
| `POST` | `/api/v1/gigs/orders/:orderId/accept` | Client | Accept and release funds |
| `POST` | `/api/v1/gigs/orders/:orderId/review` | Client | Submit category-rated gig review |
| `GET` | `/api/v1/gigs/orders/:orderId` | Party | Get order status/history |

Gig orders reuse the existing `EscrowState` machine, `calculateFees`, `PlatformFeeCredit`, and a dedicated BullMQ auto-release worker (`gig-auto-release`).

### Gig order disputes

Gig disputes share the milestone `Dispute` machine (polymorphic subject â€” migration `20260829233000_gig_disputes_polymorphic`).

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/gigs/orders/:orderId/dispute` | Order party | Raise a dispute (funded/working/submitted orders only; cancels auto-release) |
| `POST` | `/api/v1/gigs/disputes/:disputeId/evidence` | Dispute party | Submit an evidence statement |
| `POST` | `/api/v1/gigs/disputes/:disputeId/resolve` | Staff (mediator/compliance/admin) | Release / refund / partial-split resolution with fee-aware ledger + audit |

## TMS

All TMS routes require staff access.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/tms/queue` | List `PENDING_REVIEW` flags |
| `POST` | `/api/v1/tms/:flagId/file-str` | Record external STR reference and notes; optional `suspendAccount` (Master Design Â§11.4) suspends the user |
| `POST` | `/api/v1/tms/:flagId/dismiss` | Dismiss false positive with notes |

The API records a filing performed by a human; it does not submit to the FIC. A periodic BullMQ scan (`tms-scan`, every 15 minutes) re-runs the structuring / round-amounts / velocity rules and raises one-time `STR_SLA_BREACH` alerts for flags past their 24-hour deadline.

## Notifications

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/notifications?unreadOnly=true` | Authenticated | List notifications |
| `POST` | `/api/v1/notifications/:notificationId/read` | Owner | Mark one read |
| `POST` | `/api/v1/notifications/read-all` | Authenticated | Mark all own notifications read |

## Support Chat

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/chat/guest` | Public | Create guest support conversation |
| `GET` | `/api/v1/chat/conversations` | Authenticated | List own conversations (with `otherParticipant` details) |
| `POST` | `/api/v1/chat/conversations` | Authenticated | Create support conversation |
| `POST` | `/api/v1/chat/direct` | Authenticated | Create/fetch direct 2-party conversation with client/freelancer |
| `GET` | `/api/v1/chat/conversations/:conversationId/messages` | Participant | List messages in thread |
| `POST` | `/api/v1/chat/conversations/:conversationId/messages` | Participant | Send message (broadcasts real-time to channel & recipient) |
| `POST` | `/api/v1/chat/conversations/:conversationId/read` | Participant | Update read marker |
| `POST` | `/api/v1/chat/conversations/:conversationId/assistant/suggest-replies` | Participant | Mini-Me AI suggested smart replies |
| `POST` | `/api/v1/chat/conversations/:conversationId/assistant/summarize` | Participant | Mini-Me AI thread digest (deliverables, budget, timeline) |
| `POST` | `/api/v1/chat/conversations/:conversationId/assistant/extract-deal` | Participant | Mini-Me AI deal terms extractor into escrow milestone |
| `GET` | `/api/v1/chat/admin/conversations` | Staff | List support queue (scoped by assignedStaffId for non-admins) |
| `POST` | `/api/v1/chat/admin/conversations/:id/claim` | Staff | Claim an unassigned conversation |
| `POST` | `/api/v1/chat/support` | Authenticated | Open a support ticket and notify the support desk immediately |

### Guest support access

A visitor who messages support from the marketing site has no account and no
session, so `requireAuth` would reject them. Without a way in, the widget could
create a ticket but never read a reply or send a follow-up.

`POST /api/v1/chat/guest` therefore returns an extra `accessToken`: a signed JWT
carrying `typ: "guest_support"` and a single `conversationId`. It is deliberately
not a login token — no refresh token, no `role`/`staffRole` claims, 12h TTL.

The token is accepted by `GET/POST /api/v1/chat/conversations/:conversationId/messages`
and `POST /api/v1/chat/conversations/:conversationId/read` via
`requireGuestChatAccess`, which pins it to exactly that conversation. Presenting it
for any other `conversationId` returns `403 TOKEN_SCOPE_MISMATCH` rather than
falling through to a weaker check. The WebSocket handshake accepts it too (forced
to non-staff), so replies arrive live.

|---|---|
| `200` | Successful read or transition |
| `201` | Resource created |
| `202` | Accepted but held for compliance review |
| `400` | Validation or malformed input |
| `401` | Missing/invalid authentication or webhook signature |
| `403` | Role, ownership, party, staff, or permission denied |
| `404` | Resource not found |
| `409` | Current state does not permit the transition |
| `422` | Insufficient wallet balance |
| `429` | Rate limit exceeded |
| `500` | Unexpected server failure |

## Admin / Staff (Phase 1 RBAC)

All staged behind `requirePermission(...)` or narrower staff roles.

| Method | Path | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/admin/audit-logs` | `audit.view` | Immutable audit log viewer |
| `GET` | `/api/v1/admin/users/search` | `users.view` | Search users by email/phone/UCID/display name |
| `POST` | `/api/v1/admin/users/:id/suspend` | `users.suspend` | Suspend an account (writes USER_SUSPENDED audit) |
| `POST` | `/api/v1/admin/users/:id/unsuspend` | `users.suspend` | Reactivate a suspended account |
| `POST` | `/api/v1/admin/users/:id/force-kyc-rereview` | `kyc.review` | Force a periodic KYC re-review |
| `GET` | `/api/v1/admin/staff` | `admins.manage` | List all staff accounts |
| `POST` | `/api/v1/admin/staff/:userId/role` | `admins.manage` | Assign/remove a staff role (audited) |
| `GET` | `/api/v1/admin/permissions/matrix` | any staff | Current role â†’ permission map |
| `GET` | `/api/v1/admin/users` | `users.view` | Search/list users (q, role, page) |
| `GET` | `/api/v1/admin/users/:userId` | `users.view` | User detail + KYC + wallet + activity rollup |
| `GET` | `/api/v1/admin/contracts` | `contracts.view` | Search/list contracts (q, status, page) |
| `GET` | `/api/v1/admin/contracts/:contractId` | `contracts.view` | Contract detail: milestones, payments, disputes, audits, escrow totals |
| `GET` | `/api/v1/admin/payments` | `payments.view` | Payment transactions (provider, status, client email search) |
| `GET` | `/api/v1/admin/escrows` | `escrow.view` | Milestone escrow rows + held-funds rollup |
| `GET` | `/api/v1/admin/payouts` | `payouts.view` | Payout transactions + pending count |
| `POST` | `/api/v1/admin/payouts/:payoutId/settle` | `payouts.settle` | Record out-of-band transfer outcome: CONFIRMED (provider ref; posts ledger journal) or FAILED (re-credits wallet; audited) |
| `GET` | `/api/v1/admin/ledger` | `ledger.view` | Chart-of-accounts balances + double-entry integrity audit |
| `GET` | `/api/v1/admin/ledger/journals` | `ledger.view` | Paginated journal entries (referenceType, q search) |
| `GET` | `/api/v1/admin/reconciliation` | `reconciliation.view` | Provider vs internal escrow state (MATCHED / MISMATCH / PENDING / FAILED + amounts) |
| `GET` | `/api/v1/admin/reports/summary` | `reports.view` | Financial + marketplace aggregates (real sums/counts) |
| `GET` | `/api/v1/admin/dashboard/summary` | `dashboard.view` | Overview metrics + recent activity feed |
| `GET` | `/api/v1/admin/monitoring/health` | `monitoring.view` | DB / Redis / object-store / Telebirr-config checks + ledger balance |

Existing protected queue routes (KYC, top-ups, disputes, TMS, etc.) remain on `requireStaffRole(...)` and are unchanged by Phase 1.

Validation responses use `{ "error": "VALIDATION_ERROR", "details": ... }`. Domain errors use a stable `error` code and may include a human-readable `message`.

### POST /api/v1/jobs/:jobId/proposals/upload
- **Auth:** Freelancer (Tier 1 KYC required)
- **Description:** Uploads a document attachment (PDF, image, doc) for a proposal.
- **Body:** `multipart/form-data` with a `file` field.
- **Returns:** `{ "path": string }`

## Chat & Messaging

| Method | Path | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/v1/chat/conversations` | Authenticated | List all active direct and support conversations for the user |
| `GET` | `/api/v1/chat/conversations/:id/messages` | Authenticated participant / staff | Retrieve chronological message history |
| `POST` | `/api/v1/chat/conversations/:id/messages` | Authenticated participant / staff | Send text message with optional `attachmentUrl` |
| `POST` | `/api/v1/chat/upload` | Authenticated | Upload file attachment (`multipart/form-data`, 15MB limit) |
| `GET` | `/api/v1/chat/attachments/:key(*)` | Authenticated / public media stream | Stream uploaded chat attachment with MIME headers |
| `POST` | `/api/v1/chat/direct` | Authenticated | Start or retrieve 1-on-1 direct negotiation conversation |
| `POST` | `/api/v1/chat/support` | Authenticated | Open a support ticket and notify the support desk |
| `POST` | `/api/v1/chat/conversations/:id/read` | Authenticated participant | Mark conversation messages as read |
| `POST` | `/api/v1/chat/conversations/:id/assistant/suggest-replies` | Authenticated participant | Generate AI Mini-Me quick reply suggestions |
| `POST` | `/api/v1/chat/conversations/:id/assistant/summarize` | Authenticated participant | Summarize contract negotiation topics and milestones |
| `POST` | `/api/v1/chat/conversations/:id/assistant/extract-deal` | Authenticated participant | Extract milestone deliverables, price, and deadline |

### POST /api/v1/chat/upload
- **Auth:** Authenticated (`Bearer <token>`)
- **Body:** `multipart/form-data` with `file` field (max 15MB)
- **Response:**
  ```json
  {
    "url": "/api/v1/chat/attachments/chat-attachments/user-uuid/filename.png",
    "key": "chat-attachments/user-uuid/filename.png",
    "fileName": "filename.png",
    "fileSize": 1048576,
    "mimeType": "image/png"
  }
  ```

### GET /api/v1/chat/attachments/:key(*)
- **Description:** Streams attachment files stored in MinIO object storage (or local disk fallback). Sets `Content-Type`, `Content-Length`, and caching headers.

## Real-Time WebSocket API (`/api/v1/ws`)

Connect to: `ws://127.0.0.1:4000/api/v1/ws?token=<access-token>`

### Authentication & Connection
- **URL Parameter:** `token` â€” JWT access token.
- Unauthenticated connections are closed with code `4001` or `4003`.
- Authenticated sockets are automatically subscribed to `user:<userId>` and (if staff) `staff:alerts`.

### Client Actions (JSON Messages)
```json
{ "action": "subscribe", "channel": "conversation:<conversationId>" }
{ "action": "unsubscribe", "channel": "conversation:<conversationId>" }
{ "action": "typing", "conversationId": "<conversationId>", "isTyping": true }
{ "action": "read", "conversationId": "<conversationId>" }
```

**Channel authorization.** Every client-supplied channel is authorized against
the database before it takes effect. `subscribe` accepts only the
`conversation:<id>` family, and only when the socket's user participates in that
conversation (staff may watch any conversation with an assigned agent).
`typing` and `read` are re-checked the same way, so an arbitrary conversation id
cannot be used to observe another user's messages or typing activity. Successful
checks are memoized per socket for its lifetime. Private channels
(`user:<id>`, `staff:alerts`) are attached server-side at handshake and can never
be requested by a client. Unauthorized attempts are logged and ignored; a
database error during the check fails closed.

### Server Events
- `connected`: Handshake confirmation with userId.
- `chat:message`: Broadcasts new message payload to `conversation:<conversationId>`.
- `chat:typing`: Broadcasts counterpart typing state `{ userId, conversationId, isTyping }`.
- `chat:read`: Broadcasts read receipt `{ userId, conversationId, readAt }`.
- `chat:new_message`: Pushed to recipient's private user channel `user:<userId>` for live unread counter badges.

## Administration & Support Routing (`/api/v1/admin` & `/api/v1/chat/admin`)

All administrative surfaces are protected by router-level `requireAuth` and granular `requirePermission(...)` or `requireStaffRole(...)`.

### Admin Endpoints (`/api/v1/admin/*`)
- **Authentication:** `Bearer <JWT>` required for all routes via `adminRouter.use(requireAuth)`.
- **Permissions:** Validated on every call via database-backed `requirePermission(key)` checks against the role matrix (`SUPER_ADMIN`, `ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `COMPLIANCE_ADMIN`, `DISPUTE_MEDIATOR`, `SUPPORT`).
- **Endpoints:**
  - `GET /api/v1/admin/dashboard/summary`: Operations command center metrics and recent activity.
  - `GET /api/v1/admin/audit-logs`: Paginated immutable audit trail.
  - `GET /api/v1/admin/system/health`: Live health status of Redis, DB, MinIO, and double-entry ledger balance.
  - `GET /api/v1/admin/finance/reports`: Financial volumes, fees, payouts, and marketplace contract status breakdown.
  - `GET /api/v1/admin/users`: User search and management with suspend/KYC re-review triggers.
  - `GET /api/v1/admin/contracts`: Contract search and detail inspector.

### Support Queue (`/api/v1/chat/admin/conversations`)
- **Access:** `requireStaffRole("COMPLIANCE_OFFICER", "ADMIN", "SUPPORT", "SUPER_ADMIN", "OPERATIONS_ADMIN", "COMPLIANCE_ADMIN")`.
- **Visibility:** Full staff (`ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `SUPPORT`) can view all open tickets across all staff or filter by `staffId`.
- **Guest Inquiries (`POST /api/v1/chat/guest`):** Public entry point. Creates a guest account, assigns the ticket across active staff roles, adds assigned staff to participants, and triggers real-time fan-out notifications to staff via `notifyStaffOfEvent("SUPPORT_REQUEST_CREATED", ...)`.

