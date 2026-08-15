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

Funding is unavailable until both `clientAcceptedAt` and `freelancerAcceptedAt` are set.

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

Providers are `TELEBIRR`, `CHAPA`, and `CBE_BIRR`. Wallet mismatch returns `202` with `HELD_FOR_REVIEW` and does not debit the wallet. A passing request currently debits and records locally but does not call a live payout provider.

## Manual Top-Ups

The mounted base path is `/api/v1/escrow/topups`.

| Method | Path | Access | Purpose |
|---|---|---|---|
| `POST` | `/api/v1/escrow/topups/manual` | Authenticated | Upload receipt and create review request |
| `GET` | `/api/v1/escrow/topups` | Authenticated | List own top-ups |
| `GET` | `/api/v1/escrow/topups/:topUpId` | Owner | Get one top-up |
| `GET` | `/api/v1/escrow/topups/admin/queue` | Staff | List pending top-ups |
| `POST` | `/api/v1/escrow/topups/admin/:topUpId/review` | Staff | Approve/reject; approval credits wallet |

Manual top-up is `multipart/form-data` with `receipt`, `amountEtb`, `rail`, `senderName`, and `senderReference`. Rails are `TELEBIRR` and `CBE_BIRR`; maximum receipt size is 8 MB.

## Signed Payment Webhooks

| Method | Path | Signature Location | Algorithm / Header |
|---|---|---|---|
| `POST` | `/api/v1/webhooks/telebirr` | Body (`sign` field) | RSA-PSS (`SHA256withRSAandMGF1`) |
| `POST` | `/api/v1/webhooks/chapa` | Header | `x-chapa-signature` (HMAC-SHA256) |
| `POST` | `/api/v1/webhooks/cbe` | Header | `x-cbe-signature` (HMAC-SHA256) |

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

## TMS

All TMS routes require staff access.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/v1/tms/queue` | List `PENDING_REVIEW` flags |
| `POST` | `/api/v1/tms/:flagId/file-str` | Record external STR reference and notes |
| `POST` | `/api/v1/tms/:flagId/dismiss` | Dismiss false positive with notes |

The API records a filing performed by a human; it does not submit to the FIC.

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
| `GET` | `/api/v1/chat/conversations` | Authenticated | List own conversations |
| `POST` | `/api/v1/chat/conversations` | Authenticated | Create conversation |
| `GET` | `/api/v1/chat/conversations/:conversationId/messages` | Participant | List messages |
| `POST` | `/api/v1/chat/conversations/:conversationId/messages` | Participant | Send message |
| `POST` | `/api/v1/chat/conversations/:conversationId/read` | Participant | Update read marker |
| `GET` | `/api/v1/chat/admin/conversations` | Staff | List support queue (scoped by assignedStaffId for non-admins) |
| `POST` | `/api/v1/chat/admin/conversations/:id/claim` | Staff | Claim an unassigned conversation |
| `PATCH` | `/api/v1/chat/admin/conversations/:id/assign` | Admin | Reassign a conversation to a specific staff member |

## Common Responses

| Status | Meaning |
|---|---|
| `200` | Successful read or transition |
| `201` | Resource created |
| `202` | Accepted but held for compliance review |
| `400` | Validation or malformed input |
| `401` | Missing/invalid authentication or webhook signature |
| `403` | Role, ownership, party, staff, or KYC gate denied |
| `404` | Resource not found |
| `409` | Current state does not permit the transition |
| `422` | Insufficient wallet balance |
| `429` | Rate limit exceeded |
| `500` | Unexpected server failure |

Validation responses use `{ "error": "VALIDATION_ERROR", "details": ... }`. Domain errors use a stable `error` code and may include a human-readable `message`.
