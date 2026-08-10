# Telegram Bot Deep Dive: Feature-Rich Architecture for Yekis

**Current State:** Basic `/start` command + Web App auth + one-way push notifications  
**Goal:** Full-featured bot accelerating freelancer ↔ client ↔ staff interactions

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TELEGRAM BOT LAYER                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │  Commands   │  │  Callbacks  │  │   Scenes/   │              │
│  │  & Handlers │  │  & Queries  │  │ Conversations│             │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                     │
│         └────────────────┼────────────────┘                     │
│                          ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              MIDDLEWARE LAYER                            │   │
│  │  Auth │ RateLimit │ I18n │ Session │ Logging │ Errors   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                          │                                      │
│         ┌────────────────┼────────────────┐                     │
│         ▼                ▼                ▼                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   API       │  │  Services   │  │  Workers    │              │
│  │   Client    │  │  (Domain)   │  │  (BullMQ)   │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

**Stack:** Grammy (TypeScript-first, modern, performant)  
**Session Storage:** Redis (via existing BullMQ Redis)  
**I18n:** Built-in Grammy i18n or custom (Amharic/English)  
**Web App Integration:** Telegram Mini App (already implemented) + Bot API

---

## 2. User Roles & Permission Matrix

| Feature | Freelancer | Client | Staff (Compliance/Admin) |
|---------|------------|--------|-------------------------|
| **Auth** | `/start` → Mini App login | `/start` → Mini App login | `/start` → Staff dashboard link |
| **Jobs** | Browse, search, filter, apply | Post, manage, review proposals | View flagged/mod-reported jobs |
| **Proposals** | Submit, withdraw, view status | Review, shortlist, accept/reject | — |
| **Contracts** | Sign, view, submit milestones | Sign, fund, accept/review delivery | Mediate disputes |
| **Escrow** | View status, request release | Fund, accept, dispute | Override release/refund |
| **Wallet** | Balance, withdraw (Tier 2), top-up | Top-up, view transactions | Review top-up receipts |
| **Disputes** | Raise, evidence, negotiate | Raise, evidence, negotiate | Mediate, resolve, arbitrate |
| **KYC** | Submit docs, check status | Submit docs, check status | Review queue, approve/reject |
| **Notifications** | All events | All events | Queue alerts, SLA warnings |
| **Support** | Chat with staff | Chat with staff | Full inbox, close/reopen |
| **Admin** | — | — | User mgmt, analytics, announcements |

---

## 3. Core Features by Category

### 3.1 Job Discovery & Management (Freelancer/Client)

| Command/Feature | Description | Implementation |
|----------------|-------------|----------------|
| `/jobs` | Paginated job list with filters | Inline keyboard: Category ▸ Budget ▸ Sort |
| `/jobs_web` | Opens Mini App job board | `web_app` button |
| `/my_jobs` | Client: posted jobs; Freelancer: applied jobs | Role-aware |
| `/job_<id>` | Deep link to job detail | Callback query → Mini App or inline details |
| **Saved searches** | `/save_search "web dev <50k"` | Store in Redis/DB, notify on new matches |
| **Job alerts** | `/alert on/off` + category | Subscription model, BullMQ worker |

### 3.2 Proposal Workflow

| Feature | Freelancer | Client |
|---------|------------|--------|
| **Submit proposal** | `/propose <job_id>` → wizard (cover letter, price, milestones) | — |
| **View proposals** | `/my_proposals` | `/proposals <job_id>` |
| **Shortlist/Reject** | — | Inline buttons on proposal card |
| **Accept** | — | `/accept <proposal_id>` → contract generation |
| **Withdraw** | `/withdraw <proposal_id>` | — |

### 3.3 Contract & Milestone Management

| Feature | Bot Interaction |
|---------|-----------------|
| **View contract** | `/contract <id>` → inline PDF link (signed URL) |
| **Sign contract** | Button: "✍️ Sign" → Mini App signature flow |
| **Fund milestone** | `/fund <milestone_id>` → payment provider selection → webhook |
| **Submit delivery** | `/deliver <milestone_id>` → file/link upload → Mini App |
| **Accept delivery** | `/accept_delivery <milestone_id>` → one-tap |
| **Auto-release timer** | Shows countdown: "⏳ Auto-release in 3d 14h" |
| **Raise dispute** | `/dispute <milestone_id>` → structured form |

### 3.4 Wallet & Payments

| Feature | Bot Interaction |
|---------|-----------------|
| **Balance** | `/wallet` → shows balance + pending + available |
| **Withdraw** | `/withdraw` → Tier 2 check → destination selection → OTP |
| **Top-up (manual)** | `/topup` → instructions + receipt upload → staff queue |
| **Transaction history** | `/transactions` → paginated list with filters |
| **Fee breakdown** | Shows on every payment: platform fee, withholding, net |

### 3.5 Dispute Resolution

| Stage | Bot Features |
|-------|--------------|
| **Stage 1: Negotiation** | `/dispute <id> chat` → threaded messages, 7-day timer |
| **Stage 2: Evidence** | `/evidence <id>` → upload files, links, screenshots |
| **Stage 3: Mediation** | Staff: `/mediate <id>` → view evidence, propose split |
| **Resolution** | Buttons: "✅ Accept mediator proposal" / "⚖️ Escalate to arbitration" |

### 3.6 KYC & Verification

| Feature | Bot Interaction |
|---------|-----------------|
| **Start KYC** | `/kyc` → document type selection → upload flow |
| **Status check** | `/kyc_status` → shows tier, status, missing docs |
| **Tier 2 upgrade** | `/tier2` → TIN/business reg upload |
| **Staff review** | `/kyc_queue` → inline approve/reject with EvidenceViewer |

### 3.7 Staff Operations (Compliance/Admin)

| Command | Description |
|---------|-------------|
| `/staff` | Staff dashboard: KYC queue, TopUp queue, Disputes, TMS flags |
| `/kyc_queue` | Paginated, filterable, inline approve/reject/flag |
| `/topup_queue` | Receipt viewer inline, approve/reject/flag |
| `/dispute_queue` | Mediation view with contract + deliverables |
| `/tms_queue` | STRUCTURING/VELOCITY/PASS_THROUGH/WALLET_MISMATCH flags |
| `/broadcast` | Admin: send announcement to all/subscribed users |
| `/user <ucid>` | Lookup user, view roles, KYC, wallet, flags |
| `/analytics` | Key metrics: DAU, jobs, disputes, payout volume |

### 3.8 Notifications (Push + In-Bot)

| Event | Template | Channel |
|-------|----------|---------|
| Job posted (matching saved search) | 🎯 New job: {title} - {budget} ETB | Push |
| Proposal received | 📩 New proposal on "{job}" from {freelancer} | Push |
| Proposal accepted | ✅ Your proposal accepted! Contract ready. | Push |
| Milestone funded | 💰 Milestone funded: {amount} ETB held in escrow | Push |
| Delivery submitted | 📦 {freelancer} submitted work for review | Push |
| Auto-release warning | ⏳ 24h until auto-release for {milestone} | Push |
| Auto-release executed | ✅ Funds released to {freelancer} | Push |
| Dispute raised | ⚠️ Dispute opened on {milestone} | Push |
| Mediation proposal | 🤝 Mediator proposed: {split} | Push |
| KYC approved/rejected | ✅/❌ KYC {status} | Push |
| Top-up approved | ✅ {amount} ETB added to wallet | Push |
| Withdrawal processed | 🏦 Withdrawal of {amount} ETB completed | Push |
| TMS flag | 🚨 Compliance review needed | Staff only |
| SLA breach (staff) | ⏰ Queue item overdue: {type} #{id} | Staff only |

---

## 4. Technical Implementation Plan

### 4.1 Project Structure

```
apps/backend/src/modules/bot/
├── bot.service.ts           # Core initialization, middleware setup
├── bot.router.ts            # Route registration (commands, callbacks, scenes)
├── middleware/
│   ├── auth.middleware.ts        # User lookup, role, KYC tier
│   ├── rateLimit.middleware.ts   # Per-user, per-command limits
│   ├── i18n.middleware.ts        # Amharic/English detection
│   ├── session.middleware.ts     # Redis-backed sessions
│   └── logging.middleware.ts     # Structured update logging
├── scenes/
│   ├── jobSearch.scene.ts        # Multi-step job filtering
│   ├── propose.scene.ts          # Proposal wizard
│   ├── deliver.scene.ts          # Milestone delivery upload
│   ├── dispute.scene.ts          # Dispute raise + evidence
│   ├── kyc.scene.ts              # Document upload flow
│   ├── topup.scene.ts            # Receipt upload flow
│   ├── withdraw.scene.ts         # Withdrawal wizard
│   └── staff/
│       ├── kycReview.scene.ts
│       ├── topupReview.scene.ts
│       └── mediate.scene.ts
├── handlers/
│   ├── commands.ts               # /start, /jobs, /wallet, /help, etc.
│   ├── callbacks.ts              # Inline keyboard handlers
│   ├── notifications.ts          # Push notification formatter
│   └── staff.ts                  # Staff-only commands
├── keyboards/
│   ├── mainMenu.ts               # Role-aware main menu
│   ├── jobFilters.ts             # Category, budget, sort
│   ├── proposalActions.ts        # Shortlist, accept, reject
│   ├── contractActions.ts        # Sign, fund, deliver, dispute
│   ├── walletActions.ts          # Withdraw, topup, history
│   └── staffActions.ts           # Queue navigation, bulk actions
├── formatters/
│   ├── jobCard.ts                # Consistent job display
│   ├── proposalCard.ts
│   ├── contractCard.ts
│   ├── walletCard.ts
│   ├── disputeCard.ts
│   └── notification.ts           # Push message templates
├── utils/
│   ├── deepLink.ts               # tg://resolve?domain=... parsing
│   ├── webApp.ts                 # Mini App URL builders
│   ├── markdown.ts               # Safe MarkdownV2 escaping
│   └── pagination.ts             # Inline keyboard pagination
└── types.ts                      # Session, Context extensions
```

### 4.2 Session & State Management

```typescript
// apps/backend/src/modules/bot/types.ts
import { SessionFlavor } from "grammy";

export interface BotSession {
  // Auth
  userId?: string;
  role?: "CLIENT" | "FREELANCER" | "BOTH" | "STAFF";
  kycTier?: "TIER_1" | "TIER_2" | "TIER_3";
  kycStatus?: "VERIFIED" | "PENDING" | "REJECTED";
  telegramChatId: number;
  telegramUserId: number;
  language: "en" | "am";

  // Scene state (for conversations)
  scene?: string;
  sceneStep?: number;
  sceneData?: Record<string, any>;

  // UI state
  currentMenu?: string;
  pagination?: { type: string; page: number; filters: any };

  // Notifications
  notificationSettings?: {
    jobs: boolean;
    proposals: boolean;
    escrow: boolean;
    disputes: boolean;
    wallet: boolean;
    kyc: boolean;
  };
}

export type BotContext = Context & SessionFlavor<BotSession>;

// Session stored in Redis with TTL (24h default, extended on activity)
```

### 4.3 Middleware Chain

```typescript
// apps/backend/src/modules/bot/bot.service.ts
import { Bot, session } from "grammy";
import { redis } from "../../lib/redis.js";
import { prisma } from "../../lib/prisma.js";
import { authMiddleware } from "./middleware/auth.middleware.js";
import { rateLimitMiddleware } from "./middleware/rateLimit.middleware.js";
import { i18nMiddleware } from "./middleware/i18n.middleware.js";
import { loggingMiddleware } from "./middleware/logging.middleware.js";

export function createBot() {
  const bot = new Bot<BotContext>(env.TELEGRAM_BOT_TOKEN);

  // Session storage (Redis)
  bot.use(session({
    initial: () => ({ telegramChatId: 0, telegramUserId: 0, language: "en" }),
    storage: {
      get: async (key) => {
        const data = await redis.get(`bot:session:${key}`);
        return data ? JSON.parse(data) : undefined;
      },
      set: async (key, value) => {
        await redis.set(`bot:session:${key}`, JSON.stringify(value), "EX", 86400);
      },
      delete: async (key) => {
        await redis.del(`bot:session:${key}`);
      },
    },
  }));

  // Middleware chain order matters
  bot.use(loggingMiddleware);
  bot.use(i18nMiddleware);
  bot.use(rateLimitMiddleware);  // 30 req/min per user, stricter for mutations
  bot.use(authMiddleware);       // Attaches user, role, KYC to ctx.session

  // Register routes
  registerCommands(bot);
  registerCallbacks(bot);
  registerScenes(bot);
  registerStaffRoutes(bot);

  return bot;
}
```

### 4.4 Auth Middleware (Critical)

```typescript
// apps/backend/src/modules/bot/middleware/auth.middleware.ts
import { BotContext } from "../types.js";
import { prisma } from "../../lib/prisma.js";

export async function authMiddleware(ctx: BotContext, next: () => Promise<void>) {
  const chatId = ctx.chat?.id;
  const userId = ctx.from?.id;

  if (!chatId || !userId) return next();

  ctx.session.telegramChatId = chatId;
  ctx.session.telegramUserId = userId;

  // Find user by telegramChatId or telegramUserId
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { telegramChatId: chatId.toString() },
        { telegramUserId: userId },
      ],
    },
    select: {
      id: true,
      role: true,
      kyc: { select: { tier: true, status: true } },
      staffRole: true,
      languagePreference: true,
    },
  });

  if (user) {
    ctx.session.userId = user.id;
    ctx.session.role = user.staffRole ? "STAFF" : user.role;
    ctx.session.kycTier = user.kyc?.tier;
    ctx.session.kycStatus = user.kyc?.status;
    ctx.session.language = user.languagePreference === "am" ? "am" : "en";

    // Update chat ID if missing
    if (!user.telegramChatId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { telegramChatId: chatId.toString() },
      });
    }
  } else {
    // New user - detect language from Telegram
    ctx.session.language = ctx.from?.language_code === "am" ? "am" : "en";
  }

  await next();
}
```

### 4.5 Scene-Based Conversations (Grammy Conversations Plugin)

```typescript
// apps/backend/src/modules/bot/scenes/propose.scene.ts
import { createConversation, Conversation, ConversationFlavor } from "@grammyjs/conversations";
import { BotContext } from "../types.js";

type ProposeConversation = Conversation<BotContext>;

async function proposeConversation(conversation: ProposeConversation, ctx: BotContext) {
  const t = ctx.i18n; // i18n helper

  // Step 1: Job selection (if not pre-selected)
  const jobId = ctx.session.sceneData?.jobId || await selectJob(conversation, ctx);

  // Step 2: Cover letter
  const coverLetter = await conversation.form.text(t("propose.cover_letter_prompt"), {
    maxLength: 2000,
  });

  // Step 3: Quoted amount
  const quotedAmount = await conversation.form.number(t("propose.amount_prompt"), {
    min: 100,
    max: 10_000_000,
  });

  // Step 4: Estimated days
  const estimatedDays = await conversation.form.number(t("propose.days_prompt"), {
    min: 1,
    max: 365,
  });

  // Step 5: Milestone breakdown (optional wizard)
  const milestones = await milestoneWizard(conversation, ctx, quotedAmount);

  // Step 6: Confirmation
  const confirmed = await conversation.form.confirm(t("propose.confirm", { amount: quotedAmount }));

  if (confirmed) {
    // Call API
    const result = await api.submitProposal(jobId, { coverLetter, quotedAmount, estimatedDays, milestones });
    await ctx.reply(t("propose.success", { proposalId: result.id }));
  } else {
    await ctx.reply(t("propose.cancelled"));
  }
}

// Register
bot.use(createConversation(proposeConversation, "propose"));
```

### 4.6 Inline Keyboards & Pagination

```typescript
// apps/backend/src/modules/bot/keyboards/jobFilters.ts
import { InlineKeyboard } from "grammy";
import { BotContext } from "../types.js";

export function jobFiltersKeyboard(ctx: BotContext, page = 0, filters = {}) {
  const kb = new InlineKeyboard();
  const categories = ["web_dev", "design", "marketing", "writing", "translation", "data_entry"];

  // Category row
  kb.row(
    ...categories.map(c => InlineKeyboard.text(
      ctx.t(`category.${c}`),
      `job_filter:category:${c}`
    ))
  );

  // Budget row
  kb.row(
    InlineKeyboard.text(ctx.t("filter.budget_any"), "job_filter:budget:any"),
    InlineKeyboard.text(ctx.t("filter.budget_under_10k"), "job_filter:budget:10000"),
    InlineKeyboard.text(ctx.t("filter.budget_10k_50k"), "job_filter:budget:10000_50000"),
    InlineKeyboard.text(ctx.t("filter.budget_over_50k"), "job_filter:budget:50000"),
  );

  // Sort row
  kb.row(
    InlineKeyboard.text(ctx.t("filter.sort_new"), "job_filter:sort:new"),
    InlineKeyboard.text(ctx.t("filter.sort_budget"), "job_filter:sort:budget"),
    InlineKeyboard.text(ctx.t("filter.sort_deadline"), "job_filter:sort:deadline"),
  );

  // Pagination
  kb.row(
    InlineKeyboard.text("⬅️", `job_page:${page-1}`),
    InlineKeyboard.text(`${page+1}`, "noop"),
    InlineKeyboard.text("➡️", `job_page:${page+1}`),
  );

  // Open in Mini App
  kb.row(InlineKeyboard.webApp(ctx.t("open_in_app"), { url: `${env.FRONTEND_URL}/jobs` }));

  return kb;
}
```

### 4.7 Notification System Integration

```typescript
// apps/backend/src/modules/bot/handlers/notifications.ts
import { BotContext } from "../types.js";
import { formatters } from "../formatters/notification.js";

export async function sendNotification(userId: string, event: NotificationEvent) {
  const bot = getBot();
  if (!bot) return;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { telegramChatId: true, notificationSettings: true },
  });

  if (!user?.telegramChatId) return;

  // Check user preferences
  const settings = user.notificationSettings as NotificationSettings;
  if (!settings[event.category]) return;

  const message = formatters[event.type](event.data, user.language);
  
  try {
    await bot.api.sendMessage(user.telegramChatId, message, {
      parse_mode: "MarkdownV2",
      ...(event.deepLink && { reply_markup: { inline_keyboard: [[
        { text: "View", url: event.deepLink }
      ]] } })
    });
  } catch (e) {
    logger.error({ e, userId }, "Failed to send Telegram notification");
  }
}

// Event types mapped to formatters
const formatters = {
  "job.new_match": (data, lang) => t(lang, "notify.job_new", data),
  "proposal.received": (data, lang) => t(lang, "notify.proposal_received", data),
  "proposal.accepted": (data, lang) => t(lang, "notify.proposal_accepted", data),
  "escrow.funded": (data, lang) => t(lang, "notify.escrow_funded", data),
  "milestone.submitted": (data, lang) => t(lang, "notify.milestone_submitted", data),
  "milestone.auto_release_warning": (data, lang) => t(lang, "notify.auto_release_warning", data),
  "milestone.released": (data, lang) => t(lang, "notify.milestone_released", data),
  "dispute.raised": (data, lang) => t(lang, "notify.dispute_raised", data),
  "dispute.mediation_proposal": (data, lang) => t(lang, "notify.mediation_proposal", data),
  "kyc.status_changed": (data, lang) => t(lang, "notify.kyc_status", data),
  "wallet.topup_approved": (data, lang) => t(lang, "notify.topup_approved", data),
  "wallet.withdrawal_completed": (data, lang) => t(lang, "notify.withdrawal_done", data),
};
```

### 4.8 Staff Queue Integration (Real-time)

```typescript
// apps/backend/src/modules/bot/handlers/staff.ts
import { BotContext } from "../types.js";
import { prisma } from "../../lib/prisma.js";

export async function staffDashboard(ctx: BotContext) {
  if (ctx.session.role !== "STAFF") return;

  const [kycCount, topupCount, disputeCount, tmsCount] = await Promise.all([
    prisma.kycRecord.count({ where: { status: "UNDER_REVIEW" } }),
    prisma.walletTopUp.count({ where: { status: "PENDING" } }),
    prisma.dispute.count({ where: { stage: { in: ["STAGE_1_NEGOTIATION", "STAGE_2_EVIDENCE", "STAGE_3_MEDIATION"] } } }),
    prisma.transactionFlag.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  const kb = new InlineKeyboard()
    .text(`📋 KYC Queue (${kycCount})`, "staff:kyc_queue:0")
    .text(`💳 TopUps (${topupCount})`, "staff:topup_queue:0").row()
    .text(`⚖️ Disputes (${disputeCount})`, "staff:dispute_queue:0")
    .text(`🚨 TMS Flags (${tmsCount})`, "staff:tms_queue:0").row()
    .text("📊 Analytics", "staff:analytics")
    .text("📢 Broadcast", "staff:broadcast");

  await ctx.reply("🛠 Staff Dashboard", { reply_markup: kb });
}

// KYC Queue with inline EvidenceViewer
export async function kycQueue(ctx: BotContext, page = 0) {
  const items = await prisma.kycRecord.findMany({
    where: { status: "UNDER_REVIEW" },
    skip: page * 10,
    take: 11,
    include: { user: true, documents: true },
  });

  const hasMore = items.length > 10;
  const displayItems = items.slice(0, 10);

  for (const kyc of displayItems) {
    const kb = new InlineKeyboard()
      .url("👁 View Evidence", `${env.FRONTEND_URL}/staff/kyc/${kyc.id}`)
      .text("✅ Approve", `staff:kyc:approve:${kyc.id}`)
      .text("❌ Reject", `staff:kyc:reject:${kyc.id}`)
      .text("🚩 Flag", `staff:kyc:flag:${kyc.id}`).row()
      .text("⬅️ Back", "staff:dashboard");

    await ctx.reply(
      `👤 *${kyc.user.fullName}* (${kyc.user.ucid})\n` +
      `Tier: ${kyc.tier} | Docs: ${kyc.documents.length}\n` +
      `Submitted: ${formatDate(kyc.createdAt)}`,
      { parse_mode: "Markdown", reply_markup: kb }
    );
  }

  // Pagination
  if (hasMore || page > 0) {
    const kb = new InlineKeyboard();
    if (page > 0) kb.text("⬅️ Prev", `staff:kyc_queue:${page-1}`);
    if (hasMore) kb.text("Next ➡️", `staff:kyc_queue:${page+1}`);
    await ctx.reply("Pagination", { reply_markup: kb });
  }
}
```

---

## 5. I18n Strategy (Amharic/English)

```typescript
// apps/backend/src/modules/bot/middleware/i18n.middleware.ts
import { BotContext } from "../types.js";
import { I18n, I18nFlavor } from "@grammyjs/i18n";

const i18n = new I18n<BotContext>({
  defaultLocale: "en",
  directory: "locales", // locales/en.json, locales/am.json
  useSession: true,
  fluentBundleOptions: { useIsolating: false },
});

// locales/en.json
{
  "welcome": "Welcome to Yekis Marketplace! 🚀",
  "jobs.title": "Job Opportunities",
  "propose.cover_letter_prompt": "Write a brief cover letter:",
  "propose.amount_prompt": "Your quoted amount (ETB):",
  "wallet.balance": "💰 Balance: {balance} ETB\n⏳ Pending: {pending} ETB\n✅ Available: {available} ETB",
  "notify.escrow_funded": "💰 *Milestone Funded*\n{amount} ETB held in escrow for \"{title}\"",
  "notify.auto_release_warning": "⏳ *Auto-release in 24 hours*\nMilestone: {title}\nAmount: {amount} ETB\n\nClick to review delivery.",
  "staff.dashboard": "🛠 Staff Dashboard",
  "errors.unauthorized": "You don't have permission for this action.",
  "errors.kyc_required": "Please complete KYC verification first."
}

// locales/am.json
{
  "welcome": "ወደ የኪስ ማርኬትፕላስ እንኳን በሰላም መጣችሁ! 🚀",
  "jobs.title": "የስራ ንቸሮች",
  "propose.cover_letter_prompt": "አጭር የክብር መልእክት ይጻፉ:",
  "propose.amount_prompt": "የሚሰጡት መጠን (ETB):",
  "wallet.balance": "💰 ቀሪ: {balance} ETB\n⏳ በመጠበቅ: {pending} ETB\n✅ የሚገኝ: {available} ETB",
  "notify.escrow_funded": "💰 *ሜይስቶን ተገኝቷል*\n{amount} ETB ለ\"{title}\" በኤስክሮ ተጠብቧል",
  "notify.auto_release_warning": "⏳ *24 ሰአት ውስጥ ራስን አስተላልፎ ይፈታል*\nሜይስቶን: {title}\nመጠን: {amount} ETB\n\nለመመርየት ይጫኑ።",
  "staff.dashboard": "🛠 የሠራተኞች ዳሽቦርድ",
  "errors.unauthorized": "ለዚህ ሥራ አስፈላጊ ፈቃድ የለዎትም።",
  "errors.kyc_required": "እባክዎ ቀደም KYC ማረጋገጫዎን ያከናውኑ።"
}
```

---

## 6. Web App (Mini App) Integration

```typescript
// apps/backend/src/modules/bot/utils/webApp.ts
export function buildWebAppUrl(path: string, params: Record<string, string> = {}) {
  const base = env.FRONTEND_URL;
  const search = new URLSearchParams(params).toString();
  return `${base}${path}${search ? `?${search}` : ""}`;
}

// Deep links from bot to Mini App
export const webAppRoutes = {
  jobs: (filters?) => buildWebAppUrl("/jobs", filters),
  jobDetail: (id: string) => buildWebAppUrl(`/jobs/${id}`),
  proposals: (jobId?: string) => buildWebAppUrl("/proposals", jobId ? { jobId } : {}),
  contract: (id: string) => buildWebAppUrl(`/contracts/${id}`),
  wallet: () => buildWebAppUrl("/wallet"),
  kyc: () => buildWebAppUrl("/kyc"),
  disputes: () => buildWebAppUrl("/disputes"),
  staffDashboard: () => buildWebAppUrl("/staff"),
  staffKycReview: (id: string) => buildWebAppUrl(`/staff/kyc/${id}`),
  staffTopupReview: (id: string) => buildWebAppUrl(`/staff/topups/${id}`),
  staffDisputeMediation: (id: string) => buildWebAppUrl(`/staff/disputes/${id}`),
};

// Usage in keyboards
InlineKeyboard.webApp(ctx.t("view_job"), { url: webAppRoutes.jobDetail(jobId) });
InlineKeyboard.webApp(ctx.t("sign_contract"), { url: webAppRoutes.contract(contractId) });
```

---

## 7. Security & Compliance

| Concern | Mitigation |
|---------|------------|
| **Data privacy (PDPP)** | No PII stored in bot session beyond IDs; messages not logged; Mini App handles sensitive data |
| **Rate limiting** | Per-user: 30 req/min; mutations: 10/min; staff: higher limits |
| **Input validation** | Zod schemas on all scene inputs; callback data parsed & validated |
| **Authorization** | Every handler checks `ctx.session.role`, `ctx.session.kycTier`, `ctx.session.kycStatus` |
| **Webhook security** | Grammy handles signature verification; use `secret_token` in `setWebhook` |
| **Admin commands** | Guarded by `staffRole` in DB + Telegram chat ID allowlist |
| **Audit logging** | All bot actions → `AuditLog` via existing `recordAuditEvent` |
| **Encryption** | Redis TLS; DB encryption at rest; Telegram MTProto for bot API |

---

## 8. Deployment & Operations

### 8.1 Webhook vs Long Polling

| Mode | Use Case | Setup |
|------|----------|-------|
| **Webhook (Production)** | High volume, real-time | `bot.api.setWebhook(url, { secret_token: env.TELEGRAM_WEBHOOK_SECRET })` |
| **Long Polling (Dev)** | Local development | `bot.start({ polling: true })` |

### 8.2 Health Checks

```typescript
// Health endpoint for bot
app.get("/health/bot", async (req, res) => {
  const bot = getBot();
  if (!bot) return res.status(503).json({ status: "not_initialized" });

  try {
    const me = await bot.api.getMe();
    const webhookInfo = await bot.api.getWebhookInfo();
    res.json({
      status: "ok",
      bot: me.username,
      webhook: webhookInfo.url,
      pendingUpdates: webhookInfo.pending_update_count,
      lastError: webhookInfo.last_error_message,
    });
  } catch (e) {
    res.status(503).json({ status: "error", error: e.message });
  }
});
```

### 8.3 Monitoring Metrics

- **Business:** DAU/MAU, command usage, scene completion rates, notification delivery rate
- **Technical:** Webhook latency, error rate, Redis session hit rate, API response times
- **Compliance:** KYC queue SLA, dispute resolution time, TMS flag processing time

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Grammy bot with middleware chain (auth, i18n, rate-limit, session)
- [ ] Redis session storage
- [ ] `/start` → role detection → main menu
- [ ] `/help` with contextual commands per role
- [ ] Language switcher (🇺🇸/🇪🇹)
- [ ] Webhook setup + health check

### Phase 2: Core User Flows (Week 3-5)
- [ ] Job discovery (`/jobs` with filters, pagination, Mini App deep links)
- [ ] Proposal wizard (scene: cover letter → amount → milestones → confirm)
- [ ] Contract viewing + signing (Mini App)
- [ ] Milestone funding (payment provider selection)
- [ ] Delivery submission + accept/release/dispute
- [ ] Wallet: balance, history, withdraw (Tier 2), top-up (receipt upload)

### Phase 3: Disputes & KYC (Week 6-7)
- [ ] Dispute raise + evidence upload (scene)
- [ ] Negotiation chat (threaded, 7-day timer)
- [ ] KYC submission flow (document type → upload → selfie)
- [ ] KYC status + Tier 2 upgrade
- [ ] Push notifications for all events

### Phase 4: Staff Operations (Week 8-9)
- [ ] Staff dashboard with live counts
- [ ] KYC queue: list + inline approve/reject/flag + EvidenceViewer link
- [ ] TopUp queue: receipt viewer + approve/reject/flag
- [ ] Dispute mediation view: contract + deliverables + propose split
- [ ] TMS queue: flag details + dismiss/STR record
- [ ] Broadcast command (admin)

### Phase 5: Polish & Scale (Week 10-12)
- [ ] Saved job searches + alerts
- [ ] Rich formatting (MarkdownV2, inline media)
- [ ] Analytics dashboard (bot usage, conversion funnels)
- [ ] A/B testing for notification copy
- [ ] Load testing (10k concurrent users)
- [ ] Documentation + runbooks

---

## 10. Required Environment Variables

```bash
# Telegram
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_WEBHOOK_SECRET=super-secret-webhook-token
TELEGRAM_INIT_DATA_MAX_AGE_SECONDS=86400

# Web App
FRONTEND_URL=https://app.yekis.et

# Redis (existing)
REDIS_URL=redis://localhost:6379

# Database (existing)
DATABASE_URL=postgresql://...

# Optional: Sentry for bot errors
SENTRY_DSN_BOT=https://...
```

---

## 11. File Tree Summary (New Files)

```
apps/backend/src/modules/bot/
├── bot.service.ts
├── bot.router.ts
├── types.ts
├── middleware/
│   ├── auth.middleware.ts
│   ├── rateLimit.middleware.ts
│   ├── i18n.middleware.ts
│   ├── session.middleware.ts
│   └── logging.middleware.ts
├── scenes/
│   ├── jobSearch.scene.ts
│   ├── propose.scene.ts
│   ├── deliver.scene.ts
│   ├── dispute.scene.ts
│   ├── kyc.scene.ts
│   ├── topup.scene.ts
│   ├── withdraw.scene.ts
│   └── staff/
│       ├── kycReview.scene.ts
│       ├── topupReview.scene.ts
│       └── mediate.scene.ts
├── handlers/
│   ├── commands.ts
│   ├── callbacks.ts
│   ├── notifications.ts
│   └── staff.ts
├── keyboards/
│   ├── mainMenu.ts
│   ├── jobFilters.ts
│   ├── proposalActions.ts
│   ├── contractActions.ts
│   ├── walletActions.ts
│   └── staffActions.ts
├── formatters/
│   ├── jobCard.ts
│   ├── proposalCard.ts
│   ├── contractCard.ts
│   ├── walletCard.ts
│   ├── disputeCard.ts
│   └── notification.ts
├── utils/
│   ├── deepLink.ts
│   ├── webApp.ts
│   ├── markdown.ts
│   └── pagination.ts
└── locales/
    ├── en.json
    └── am.json
```

---

## 12. Integration Points with Existing Codebase

| Existing Module | Bot Integration |
|-----------------|-----------------|
| `auth/telegram.service.ts` | Reuse `loginWithTelegram` for Mini App auth; bot sets `telegramChatId` |
| `notifications/telegram.client.ts` | Replace with rich `sendNotification` using formatters |
| `queue/notification.worker.ts` | Add Telegram push as delivery channel |
| `modules/kyc/kyc.service.ts` | Call from KYC scene for document upload |
| `modules/escrow/escrow.service.ts` | Call from funding/delivery/dispute scenes |
| `modules/disputes/dispute.service.ts` | Call from dispute scenes |
| `modules/topups/topup.service.ts` | Call from topup scene |
| `lib/prisma.ts` | Direct access for staff queries |
| `lib/audit.ts` | `recordAuditEvent` for all bot actions |
| `config/env.ts` | Environment validation |

---

*This architecture leverages existing backend services, adds minimal new dependencies (grammy, @grammyjs/conversations, @grammyjs/i18n), and provides a clear path from current minimal bot to full-featured interaction layer.*