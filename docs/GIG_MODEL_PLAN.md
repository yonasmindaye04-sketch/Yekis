# Gig / Service Packages (Fiverr-style) — Schema + Module Plan

Date: 2026-08-29

## 1. Goal

Enable a **hybrid marketplace**: clients can post jobs (current bidding) **or** directly buy predefined freelancer services. Gigs reuse the existing escrow/contract engine so one dispute, wallet, and compliance model governs both flows.

## 2. Design Principles

- **Reuse the escrow core.** Gig orders should travel through the same `escrowState` machine, milestone funding, auto-release, dispute, and TMS flow as job contracts.
- **Minimal schema disruption.** Prefer rows over custom tables where possible (e.g., treat a gig order *as* a milestone).
- **Share validation.** Zod schemas in `packages/schemas` for `gig` inputs mirror existing `createJob` / `proposal` patterns.
- **Freelancer-scoped**. A gig belongs to `freelancer_id`; freelance/both roles only.

## 3. Data Model (new Prisma models + minor additions)

```prisma
// ---------- Gigs ----------

enum GigStatus {
  DRAFT
  ACTIVE
  PAUSED
  REJECTED      // moderation
  ARCHIVED
}

enum GigPackageTier {
  BASIC
  STANDARD
  PREMIUM
}

enum GigOrderStatus {
  PENDING_PAYMENT   // checkout initiated, escrow not yet held
  ACCEPTED          // freelancer accepted (or auto-accept)
  ESCROW_HELD
  WORK_IN_PROGRESS
  SUBMITTED_FOR_REVIEW
  COMPLETED
  CANCELLED
  DISPUTED
}

enum GigRevisionStatus {
  NONE
  REQUESTED       // client wants changes, not yet submitted
  SUBMITTED       // freelancer resubmitted
}
```

```prisma
model Gig {
  id                 String     @id @default(cuid())
  freelancerId       String
  freelancer         User       @relation(fields: [freelancerId], references: [id])

  title              String
  category           LaunchCategory
  description        String
  tags               Json       // string[] (or separate join table if you need tag search later)
  faqJson            Json?      // array of {question, answer}
  requirements       Json       // ordered buyer inputs required to start work

  thumbnailUrl       String?
  mediaUrls          Json       // gallery (images/video URLs)

  gigStatus          GigStatus  @default(DRAFT)
  viewCount          Int        @default(0)
  ratingAverage      Float      @default(0) // Bayesian recap of gig-only reviews
  ratingCount        Int        @default(0)

  autoAcceptOrders   Boolean    @default(true)
  maxRevisions       Int        @default(1)
  isActive           Boolean    @default(true)

  createdAt          DateTime   @default(now())
  updatedAt          DateTime   @updatedAt

  packages           GigPackage[]
  orders             GigOrder[]
  reviews            GigReview[]

  @@index([freelancerId, isActive, gigStatus])
  @@index([category, gigStatus])
}

model GigPackage {
  id                 String         @id @default(cuid())
  gigId              String
  gig                Gig            @relation(fields: [gigId], references: [id], onDelete: Cascade)

  tier               GigPackageTier
  title              String
  description        String
  deliveryDays       Int
  revisionsIncluded  Int            @default(1)
  priceMinor         Int
  addOns             Json           // [{label, priceMinor}]

  orders             GigOrder[]

  @@unique([gigId, tier])
}

model GigOrder {
  id                 String         @id @default(cuid())
  gigId              String
  gig                Gig            @relation(fields: [gigId], references: [id])
  packageId          String
  package            GigPackage     @relation(fields: [packageId], references: [id])
  clientId           String
  client             User           @relation(fields: [clientId], references: [id])

  requirementsAnswer Json           // buyer answers matching gig.requirements

  status             GigOrderStatus @default(PENDING_PAYMENT)

  escrowState        EscrowState    @default(PAYMENT_PENDING) // reuse existing enum
  submittedAt        DateTime?
  deliverableUrl     String?
  deliverableHash    String?
  autoReleaseAt      DateTime?      // reuse bullMQ auto-release worker logic
  releasedAt         DateTime?

  revisionStatus     GigRevisionStatus @default(NONE)
  revisionRequestNote String?

  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt

  paymentTransactions PaymentTransaction[]
  dispute            Dispute?       // link back so existing dispute engine works
  review             GigReview?

  @@index([gigId, status])
  @@index([clientId, status])
}

model GigReview {
  id          String   @id @default(cuid())
  orderId     String   @unique
  order       GigOrder @relation(fields: [orderId], references: [id])
  authorId    String
  targetUserId String

  rating     Int // 1–5
  categoryRatings Json // { communication, quality, deadline, valueForMoney } -> richer than contract review
  comment    String?

  isBlind    Boolean @default(true)
  revealedAt DateTime?

  response   String?
  respondedAt DateTime?

  createdAt  DateTime @default(now())
}
```

### Relationship notes

- `User` gains relations: `gigsOwned Gig[]`, `gigOrders GigOrder[]`, `gigReviews GigReview[]`.
- `PaymentTransaction` currently enforces `milestoneId` — change it to be **optionally milestone-linked, optionally gigOrder-linked** via a discriminator (e.g., `parentType: HACK | MILESTONE | GIG_ORDER`). Simplest: make `milestoneId` nullable and add `gigOrderId String?` + index. (This is the main trade-off; alternative: introduce a polymorphic reference table.)
- `Dispute` already has `milestoneId`; add `gigOrderId String?` so arbitration can attach to the order instead of a milestone.
- Keep `Wallet`, `WalletTopUp`, `PlatformFeeCredit`, and `PlatformOperatingAccount` untouched — gig funding uses the same wallet-first flow.

## 4. Backend Module Plan

Create `apps/backend/src/modules/gigs/` mirroring the names/structure of `jobs/` and `escrow/`.

| File | Contents |
|---|---|
| `gig.routes.ts` | Endpoints (list / detail / create / update / pause / order) |
| `gig.service.ts` | Domain logic (status transitions, Bayes recomputation, validation) |
| `gigOrder.service.ts` | Order → escrow → delivery → release states, revision loop |
| `gig.validation.ts` | Zod schemas exported to `packages/schemas` for frontend reuse |

### API surface (`/api/v1/gigs`)

| Method | Path | Actor | Purpose |
|---|---|---|---|
| GET | `/gigs/search` | Public/Auth | Faceted search (category, rating, price, badge, delivery) |
| GET | `/gigs/:id` | Public/Auth | Gig detail incl. packages + FAQ |
| POST | `/gigs` | Freelancer (Tier 1) | Create gig (DRAFT) |
| PATCH | `/gigs/:id` | Owner | Update draft/paused gig |
| POST | `/gigs/:id/submit-for-review` | Owner | Move DRAFT → ACTIVE (pre-pub moderation checkpoint) |
| POST | `/gigs/:id/pause` / `/resume` | Owner | Toggle availability |
| POST | `/gigs/:gigId/orders` | Client (Tier 1) | Purchase a package → returns order id |
| POST | `/gigs/orders/:orderId/fund` | Client (Tier 1) | Fund the order from wallet (reuses `fund-from-wallet` pattern) |
| POST | `/gigs/orders/:orderId/submit` | Freelancer | Deliver work → schedule auto-release |
| POST | `/gigs/orders/:orderId/revision-request` | Client | Explicit revision loop (replaces dispute as first step) |
| POST | `/gigs/orders/:orderId/accept` | Client | Approve & release |
| POST | `/gigs/orders/:orderId/dispute` | Client/Freelancer | Escalate to full Dispute engine |
| GET | `/gigs/orders/:orderId` | Party | Status + history |
| GET | `/gigs/mine` | Freelancer | Owner gigs + stats |
| GET | `/gigs/orders/mine` | User | Buyer or seller orders |

### Re-used services

- **Fees**: call `fees.ts` with `orderScope=gig`.
- **Escrow engine**: refactor `escrow.service.ts` "fund / release / dispute" internals to accept `{milestoneId? gigOrderId?}` rather than assume milestone.
- **Dispute engine**: `Dispute` gains nullable `gigOrderId`; the escalation stages + mediator claiming work unchanged.
- **Auto-release worker**: existing BullMQ worker gains a second loop over `gigTimezone where gigOrder.autoReleaseAt <= now`.
- **Bayesian reviews**: extract shared `computeBayesian(ratings)` utility.

## 5. Frontend Plan

### New pages/components

| File | Purpose |
|---|---|
| `GigMarketplacePage.tsx` | Landing for gig discovery + search facets |
| `GigDetailPage.tsx` | Packages tier selector + FAQ + buyer requirements |
| `GigCheckoutPage.tsx` | Requirements form + payment consent (uses wallet or Telebirr checkout) |
| `GigDashboardPage.tsx` (freelancer) | Manage drafts, live gigs, orders, revisions |
| `GigOrderPage.tsx` | Two-panel order workspace (deliver/review/revision/dispute) |
| Gig section in `FeaturedCarousel` | Mixed listing of jobs + gigs on landing |

### State & flow rules

- Redirect buyer: `PENDING_PAYMENT` → wallet/topup before ESCROW_HELD.
- Show revision button as soon as delivery exists; revision counts against `gig.maxRevisions`.
- Revise request is the "request changes" UX that biding-side currently achieves by dispute escalation.
- Eligibility for GigReview mirrors contract review (completion after ESCROW_HELD + released).

## 6. Search & Discovery Plan (gig-specific, follow-on to generic backlog item)

- Introduce Meilisearch or OpenSearch index `gigs` with fields: `title`, `category`, `tags`, `description`, `freelancerId`, `bayesianScore`, `deliveryDaysMin`.
- Sync via BullMQ worker on gig create/update/review release.
- Autocomplete + typo tolerance (Meilisearch gives this out-of-box).

## 7. Rollout

| Phase | Deliverable |
|---|---|
| MVP Gig | Schema + CRUD + checkout + fundamental escrow lifecycle + revision loop |
| Marketplace polish | Faceted search, sorted by Bayesian rating, seller-level banding |
| Ops | Pre-publication moderation queue, promo/featured paid gigs |
| Advanced | Hourly gig equivalents, gig add-ons, bundle offerings |

## 8. Open decisions before implementation

1. **Monetary pointer shape** — add `gigOrderId` to `PaymentTransaction`/`Milestone`, or introduce a unified `FinancialObject`? (Affects every write path shared between job and gig.)
2. **Multi-package orders** — allow buyer to stack add-ons; add `GigOrderAddOn` join if so.
3. **Moderation policy** — require staff review before first-publication of a gig? (recommended yes, mirrors job-report asymmetry).
4. **Distribution** — order limit / queue depth per freelancer (job `maxConcurrentOrders`) to prevent spam collapse.

## 9. Validation checklist (done when)

- [ ] Prisma migration created, `prisma generate` succeeds, `pnpm --filter backend test` passes
- [ ] All escrow/dispute/audit/fee code paths handle gig orders without data duplication
- [ ] Frontend pages route via `/marketplace/gigs/*` and share theme tokens
- [ ] Three-party manual E2E: create gig → purchase → deliver → revision → dispute → resolution
- [ ] Docs updated: `API.md`, `DATABASE.md`, `WALKTHROUGH.md`, `PROJECT_CONTEXT.md`, `README.md` (doc map), `CHANGELOG.md`
