# Yekis Bot — Full Implementation Tracker

> **95 tasks across 5 phases** | Grammy + Redis + TypeScript | Amharic/English i18n

---

## Phase 1: Foundation — Bot Shell, Middleware, and Auth
**Week 1–2** | 🔴 Blocks all other phases

### Critical Tasks

- [x] Initialize Grammy bot with BotContext type extensions (SessionFlavor)
- [x] Define BotSession interface with version field (`_v`) for migration safety
- [x] Redis session storage with 24h TTL and versioned keys (`bot:session:v2:key`)
- [x] Graceful session reset when old version detected (prevent property crashes)
- [x] Auth middleware: primary lookup by `telegramUserId`, chatId sync as background update
- [x] Attach user, role, kycTier, kycStatus, language to `ctx.session`
- [x] Rate limit middleware: 30 req/min per user, 10/min for mutations, staff exempt
- [x] I18n middleware: detect from Telegram `language_code`, fallback to DB preference
- [x] Logging middleware: structured update logging with correlation IDs
- [x] `/start` command: detect new vs returning user, show role-aware main menu
- [x] Main menu keyboard: role-aware inline buttons (freelancer vs client vs staff)
- [x] `/help` command with contextual command list per role
- [x] Language switcher: 🇺🇸 English / 🇪🇹 Amharic inline button
- [x] Webhook setup with `secret_token` verification
- [x] `/health/bot` endpoint: bot info, webhook status, pending updates, last error
- [x] Environment validation: `TELEGRAM_BOT_TOKEN`, `WEBHOOK_SECRET`, `REDIS_URL`, `FRONTEND_URL`

### New Files

| File | Priority | Status |
|------|----------|--------|
| `bot.service.ts` | 🔴 Critical | ✅ Done |
| `bot.routes.ts` | 🔴 Critical | ✅ Done |
| `types.ts` | 🔴 Critical | ✅ Done |
| `middleware/auth.middleware.ts` | 🔴 Critical | ✅ Done |
| `middleware/rateLimit.middleware.ts` | 🟡 Core | ✅ Done |
| `middleware/i18n.middleware.ts` | 🟢 Standard | ✅ Done |
| `middleware/sceneTimeout.middleware.ts` | 🟢 Standard | ✅ Done |
| `middleware/logging.middleware.ts` | 🟢 Standard | ✅ Done |
| `handlers/commands.ts` | 🟢 Standard | ✅ Done |
| `keyboards/mainMenu.ts` | 🟢 Standard | ✅ Done |
| `keyboards/language.ts` | 🟢 Standard | ✅ Done |
| `utils/sessionStorage.ts` | 🟢 Standard | ✅ Done |
| `utils/webApp.ts` | 🟢 Standard | ✅ Done |
| `locales/en.json` | 🟢 Standard | ✅ Done |
| `locales/am.json` | 🟢 Standard | ✅ Done |

### ⚠️ Critical Note

> **Session versioning prevents crashes** when you add new fields to BotSession. Always bump `SESSION_VERSION` and handle old keys gracefully. Without this, a deploy mid-conversation will corrupt all active sessions.

### Downstream Impact

- Phase 2 scenes (propose, deliver) depend on the session structure defined here
- Phase 3 notifications depend on auth middleware attaching `userId`
- Phase 4 staff routes depend on role detection in auth middleware

---

## Phase 2: Core User Flows — Jobs, Proposals, Contracts, Wallet
**Week 3–5** | 🟡 Needs Phase 1

### Job Discovery

- [x] `/jobs` command with paginated inline keyboard (basic)
- [ ] Filter keyboard: category row, budget row, sort row
- [ ] Job card formatter with consistent MarkdownV2 layout
- [ ] `/jobs_web` command: opens Mini App job board via `web_app` button
- [ ] `/my_jobs`: role-aware (client sees posted, freelancer sees applied)
- [ ] Deep link `/job_<id>` → inline details or Mini App redirect
- [ ] Pagination utility: prev/current/next with filter persistence

### Proposal Workflow

- [x] Propose scene with 30-minute timeout guard (`sceneStartedAt` check)
- [x] Step 1: job selection (if not pre-selected via deep link)
- [x] Step 2: cover letter input with 2000 char max validation
- [x] Step 3: quoted amount (ETB) with min/max bounds
- [x] Step 4: estimated days (1–365)
- [x] Step 5: optional milestone breakdown wizard (simplified)
- [x] Step 6: confirmation with summary before API call
- [x] `/my_proposals` (freelancer) and `/proposals <job_id>` (client) — basic
- [ ] Client inline actions: shortlist, accept, reject on proposal card
- [ ] Accept proposal → auto-generate contract → notify both parties
- [ ] Freelancer `/withdraw_proposal` command

### Contract & Milestones

- [ ] `/contract <id>` → inline card with signed PDF URL
- [ ] Sign contract button → Mini App signature flow
- [ ] `/fund <milestone_id>` → payment provider selection
- [ ] Payment webhook handler → update escrow status
- [ ] `/deliver <milestone_id>` → file/link upload scene
- [ ] `/accept_delivery <milestone_id>` → one-tap release
- [ ] Auto-release countdown display: "⏳ Auto-release in 3d 14h"
- [x] `/dispute <milestone_id>` → structured dispute raise form

### Wallet

- [x] `/wallet` → balance + pending + available breakdown (basic)
- [x] `/withdraw` → Tier 2 KYC check → destination → OTP confirmation
- [x] `/topup` → instructions + receipt upload → staff queue
- [ ] `/transactions` → paginated list with type filters
- [ ] Fee breakdown on every payment message

### New Files

| File | Priority | Status |
|------|----------|--------|
| `scenes/propose.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `scenes/deliver.scene.ts` | 🟡 Core | ⬜ Not done |
| `scenes/withdraw.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `scenes/topup.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `handlers/callbacks.ts` | 🟢 Standard | ✅ Done |
| `keyboards/jobFilters.ts` | 🟢 Standard | ⬜ Not done |
| `keyboards/proposalActions.ts` | 🟢 Standard | ⬜ Not done |
| `keyboards/contractActions.ts` | 🟢 Standard | ⬜ Not done |
| `keyboards/walletActions.ts` | 🟢 Standard | ⬜ Not done |
| `formatters/jobCard.ts` | 🟢 Standard | ⬜ Not done |
| `formatters/proposalCard.ts` | 🟢 Standard | ⬜ Not done |
| `formatters/contractCard.ts` | 🟢 Standard | ⬜ Not done |
| `formatters/walletCard.ts` | 🟢 Standard | ⬜ Not done |
| `utils/pagination.ts` | 🟢 Standard | ⬜ Not done |
| `utils/deepLink.ts` | 🟢 Standard | ⬜ Not done |

### ⚠️ Scene Timeout Guard

> Store `sceneStartedAt` in session data. On every conversation step, check if elapsed time exceeds 30 minutes. If expired, halt the scene and prompt the user to restart. This prevents stale job data from being submitted.

---

## Phase 3: Disputes, KYC, and Push Notifications
**Week 6–7** | 🟡 Needs Phase 2 escrow

### Dispute Resolution

- [x] Dispute raise scene: milestone selection → reason → evidence upload
- [ ] Stage 1: negotiation chat with threaded messages
- [ ] 7-day negotiation timer display in chat header
- [ ] Stage 2: evidence upload → `/evidence <id>` → files, links, screenshots
- [ ] Stage 3: mediation proposal with accept/escalate buttons
- [ ] Dispute card formatter with status, stage, and participant info

### KYC & Verification

- [x] `/kyc` → document type selection scene
- [x] Document upload flow with file type validation
- [ ] Selfie upload step for liveness verification
- [x] `/kyc_status` → tier, status, missing docs list
- [x] `/tier2` → TIN/business registration upload scene
- [x] KYC tier gate on withdrawal and high-value contracts

### Push Notification System

- [ ] Notification formatter: event type → template → MarkdownV2
- [ ] BullMQ worker: consume notification events, call `sendNotification()`
- [ ] User preference check before sending (per category toggle)
- [ ] Handle bot-blocked users: mark chatId invalid, stop retrying
- [ ] Templates: job match, proposal received/accepted, escrow funded, milestone submitted
- [ ] Templates: auto-release warning (24h), auto-release executed, dispute raised
- [ ] Templates: KYC status change, top-up approved, withdrawal completed
- [ ] Staff-only alerts: TMS flags, SLA breaches
- [ ] Deep link buttons on push notifications (view job, review delivery, etc.)

### New Files

| File | Priority | Status |
|------|----------|--------|
| `scenes/dispute.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `scenes/kyc.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `handlers/notifications.ts` | 🟡 Core | ⬜ Not done |
| `formatters/notification.ts` | 🟢 Standard | ⬜ Not done |
| `formatters/disputeCard.ts` | 🟢 Standard | ⬜ Not done |
| `keyboards/notificationSettings.ts` | 🟢 Standard | ⬜ Not done |

### ⚠️ Notification Resilience

> Wrap every `bot.api.sendMessage` in try/catch. On 403 Forbidden (user blocked bot), immediately update DB to clear `telegramChatId` or set a `botBlockedAt` timestamp. This prevents infinite retry loops in BullMQ.

---

## Phase 4: Staff Operations — Queues, Mediation, Broadcast
**Week 8–9** | 🔴 Needs Phase 1 auth + Phase 3 disputes

### Staff Authentication

- [x] Dual guard: DB `staffRole` field + Telegram chat ID allowlist
- [x] Unauthorized access returns localized error, logs audit event

### Staff Dashboard

- [x] `/staff` command → live queue count dashboard
- [x] KYC queue count: `prisma.kycRecord.count({ status: UNDER_REVIEW })`
- [x] TopUp queue count: pending receipts
- [x] Dispute queue count: active stages (negotiation, evidence, mediation)
- [x] TMS flag count: pending review flags

### KYC Review Queue

- [x] `/kyc_queue` → paginated list with inline approve/reject/flag
- [ ] EvidenceViewer deep link to Mini App staff review page
- [x] Approve → update KYC status → notify user → record audit log
- [x] Reject → require reason → notify user with rejection cause

### TopUp Review Queue

- [x] `/topup_queue` → receipt viewer inline (photo/document)
- [x] Approve → credit wallet → notify user
- [x] Reject → require reason → refund instructions if applicable

### Dispute Mediation

- [x] `/dispute_queue` → contract summary + deliverables + evidence
- [x] Mediation scene: view evidence → propose split percentage
- [ ] Push proposal to both parties with accept/escalate buttons

### TMS & Admin

- [ ] `/tms_queue` → STRUCTURING/VELOCITY/PASS_THROUGH/WALLET_MISMATCH flags
- [ ] Flag detail view: transaction history, user profile, risk score
- [ ] Dismiss or record STR (Suspicious Transaction Report)
- [ ] `/user <ucid>` → lookup: roles, KYC, wallet, flags
- [ ] `/broadcast` → preview + recipient count + typed confirmation keyword
- [ ] Broadcast targeting: all users, by role, by subscription
- [ ] `/analytics` → DAU, jobs posted, disputes, payout volume (admin only)

### New Files

| File | Priority | Status |
|------|----------|--------|
| `handlers/staff.ts` | 🔴 Critical | ⬜ In `handlers/callbacks.ts` |
| `scenes/staff/kycReview.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `scenes/staff/topupReview.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `scenes/staff/mediate.scene.ts` | 🟡 Core | ✅ In `scenes/index.ts` |
| `keyboards/staffActions.ts` | 🟢 Standard | ⬜ Not done |
| `formatters/staffDashboard.ts` | 🟢 Standard | ⬜ Not done |

### ⚠️ Broadcast Safety

> Require two-step confirmation. Step 1 shows preview + exact recipient count. Step 2 requires typing a confirmation keyword (e.g., the admin's own username) to prevent accidental mass messages. Log every broadcast to AuditLog.

---

## Phase 5: Polish — Alerts, Analytics, and Scale
**Week 10–12** | 🟢 Optimization layer

### Saved Searches & Alerts

- [ ] `/save_search "query"` → store filters in Redis/DB
- [ ] BullMQ worker: match new jobs against saved searches
- [ ] `/alert on/off` + category subscription management
- [ ] Deduplication: don't alert user about jobs they've already seen

### Rich Formatting & UX

- [ ] Inline media in job cards (thumbnail, company logo)
- [ ] Improved MarkdownV2 escaping for user-generated content
- [ ] Consistent card formatting across all modules
- [ ] Empty states and loading indicators

### Analytics & Monitoring

- [ ] Business metrics: DAU/MAU, command usage distribution
- [ ] Scene completion funnels (where users drop off)
- [ ] Notification delivery rate and bounce tracking
- [ ] Technical metrics: webhook latency, Redis hit rate, API response times
- [ ] Compliance metrics: KYC queue SLA, dispute resolution time, TMS flag processing
- [ ] A/B test framework for notification copy optimization

### Performance & Reliability

- [ ] Redis cache layer for user lookups by `telegramUserId`
- [ ] Load test: simulate 10k concurrent webhook requests
- [ ] Webhook failure retry strategy with exponential backoff
- [ ] Sentry integration for bot error tracking
- [ ] Runbook: bot downtime incident response
- [ ] Runbook: webhook delivery failures and queue backup
- [ ] Runbook: Redis session store failure fallback

### 💡 Load Testing Insight

> Telegram sends webhooks sequentially per chat, so your real bottleneck is database query optimization in auth middleware, not concurrent request volume. Cache user lookups in Redis with a 5-minute TTL to reduce DB pressure by 90%+.

---

## Dependencies

```json
{
  "grammy": "^1.29.0",
  "@grammyjs/conversations": "^1.2.0",
  "@grammyjs/i18n": "^1.0.2",
  "@grammyjs/runner": "^2.0.3",
  "ioredis": "^5.4.0"
}
```

## Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `TELEGRAM_BOT_TOKEN` | ✅ | Bot API token |
| `TELEGRAM_WEBHOOK_SECRET` | ✅ | Webhook signature verification |
| `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS` | ✅ | Mini App auth TTL |
| `FRONTEND_URL` | ✅ | Mini App deep links |
| `REDIS_URL` | ✅ | Session storage + BullMQ |
| `DATABASE_URL` | ✅ | Prisma/PostgreSQL |
| `SENTRY_DSN_BOT` | ❌ | Error tracking |

---

## Quick Reference: File Tree

```
apps/backend/src/modules/bot/
├── bot.service.ts
├── bot.routes.ts
├── types.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── rateLimit.middleware.ts
│   ├── i18n.middleware.ts
│   ├── sceneTimeout.middleware.ts
│   └── logging.middleware.ts
├── scenes/
│   └── index.ts (contains all scenes)
├── handlers/
│   ├── commands.ts
│   └── callbacks.ts
├── keyboards/
│   ├── mainMenu.ts
│   └── language.ts
├── formatters/
│   └── (not yet created)
├── utils/
│   ├── sessionStorage.ts
│   └── webApp.ts
└── locales/
    ├── en.json
    └── am.json
```

---

*Generated for Yekis Bot — Grammy + TypeScript + Redis architecture*