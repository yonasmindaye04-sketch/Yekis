# Gigs — Functionalisation Plan

**Status:** proposed · **Scope:** make the gig product line safe and usable end to end
**Companion doc:** `GIG_MODEL_PLAN.md` (the original schema/module design; this document covers what is still missing)

---

## 1. Where gigs actually stand

The schema and backend are substantially built. Five models exist (`Gig`, `GigPackage`,
`GigOrder`, `GigReview`, plus gig orders borrowing the polymorphic `Dispute` machine), with a
working fee engine shared with milestone escrow, a revision loop, and a BullMQ auto-release
worker with a correct conditional-claim guard.

The product does not function, for one reason: **the order lifecycle has no user interface.**
A client can browse and pay. After that, nothing can happen.

| Capability | Backend | Client SDK | UI |
|---|---|---|---|
| Browse / search gigs | yes | yes | yes |
| Publish a gig | yes | yes | **no** |
| Edit / pause / archive own gig | yes | **no** | **no** |
| List own gigs | yes | **no** | **no** |
| Order a package | yes | yes | yes |
| Fund from wallet | yes | yes | yes |
| Freelancer submits delivery | yes | yes | **no** |
| Client requests revision | yes | yes | **no** |
| Client accepts / releases | yes | yes | **no** |
| Client reviews | yes | yes | **no** |
| Raise a dispute | yes | **no** | **no** |
| Submit dispute evidence | yes | **no** | **no** |
| Staff resolves gig dispute | yes | **no** | **no** |
| Moderation before publishing | ✅ Phase 0 | — | **no** |
| Double-entry ledger for gig escrow | **no** | — | — |
| Automated tests | ✅ Phase 0 (26) | — | — |

Three of fifteen operations are reachable from a browser.

---

## 1a. Progress log

**Phase 0 — complete.** Both disclosure holes are closed and covered by tests.

- `status` removed from `GigSearchQuery`; `searchGigs` hard-codes `ACTIVE` in both the
  OpenSearch and Postgres branches, so the filter cannot be reopened by a caller.
- `getGigById` takes an optional viewer and 404s non-`ACTIVE` gigs for everyone except the
  owner and staff. The route now uses `optionalAuth` so a seller can still preview a draft.
- Owners can no longer self-publish or self-reject: `setGigStatus` accepts only `PAUSED` and
  `ARCHIVED`, enforced in the service so a direct service call cannot widen it.
- New `moderateGigStatus` service + `POST /:gigId/moderation` staff route is the only path to
  `ACTIVE`, and records the deciding staff member in the audit trail. Rejections require a
  reason of ≥10 characters. This shipped *with* the restriction rather than in Phase 3 —
  blocking self-publish without it would have stranded every gig in `DRAFT`.
- 26 tests across `gig-public-visibility.test.ts` and `gig-moderation.test.ts`. The search
  tests deliberately smuggle a `status` field past the schema and assert drafts stay hidden, so
  reintroducing the bug fails CI.

**Also fixed:** `bot-updates.test.ts` had been failing since `d66bc97` ("replace Markdown with
HTML parse_mode"). That commit correctly converted the bot's replies to HTML and changed every
`` `code` `` to `<code>code</code>`, but left the test asserting the old Markdown form. The
production code was right; the assertion was stale. Suite is now green at **141/141**.

---

## 2. Defects to fix before writing UI

These are ordered by severity. The first two are disclosure bugs on unauthenticated endpoints
and should land as an isolated hotfix, ahead of everything else.

### 2.1 Unmoderated gigs are publicly enumerable — HIGH

`GET /api/v1/gigs/search` is unauthenticated and passes the caller's `status` straight into the
Prisma `where` clause (`gig.service.ts:156`). Because `GigSearchQuery.status` is typed
`GigStatus.optional().default("ACTIVE")`, any value is accepted — so
`GET /api/v1/gigs/search?status=DRAFT` returns every draft listing on the platform, including
`freelancerId`, title, price and description.

`GET /api/v1/gigs/:gigId` (`gig.service.ts:187`) has no status filter and no auth, so a
`DRAFT`, `REJECTED` or `ARCHIVED` gig is fetchable by id.

**Fix:** drop `status` from the public query schema entirely rather than defaulting it — public
discovery has exactly one legal answer, `ACTIVE`. Staff tooling that needs other statuses should
use an admin-scoped endpoint. Add a status guard to `getGigById` that only returns `ACTIVE`
gigs to non-owners.

### 2.2 A freelancer can self-publish to `ACTIVE` — HIGH

`POST /api/v1/gigs` creates the gig as `DRAFT` (schema default) and there is no moderation step
in between: `POST /api/v1/gigs/:gigId/status` lets the **owner** set `ACTIVE`, `PAUSED`,
`ARCHIVED` or `REJECTED` on their own gig. The comment in `schema.prisma` calls this a
"moderation checkpoint", but nothing enforces it, and `REJECTED` being owner-settable is wrong on
its face.

This makes 2.1 much worse: fixing the search filter alone would mean only self-published
listings are ever visible.

**Fix:** resolve open decision #3 from `GIG_MODEL_PLAN.md` §8 — require staff review before
first publication, mirroring the job-report asymmetry the doc already recommends. Narrow the
owner's status route to `DRAFT → PAUSED → ARCHIVED` only, so `ACTIVE` and `REJECTED` become
staff-only transitions.

### 2.3 `acceptGigOrder` can double-count platform revenue — MEDIUM

`gig.service.ts:513` claims the order with a conditional `updateMany` and returns early from the
transaction callback when `claim.count === 0` — correct, and it prevents a double wallet credit.
But the function then unconditionally calls `recordGigPlatformEarnings` and fires the
`gig-order-completed` notification, so a concurrent double-accept credits
`PlatformOperatingAccount` and writes a second `PlatformFeeCredit` row while the freelancer is
paid once.

`gigAutoRelease.worker.ts` has the same shape but does its earnings recording *inside* the
transaction, so it is safe. `acceptGigOrder` should adopt the worker's structure, or return a
flag and skip the side effects.

### 2.4 Gig escrow is invisible to the ledger — MEDIUM

Milestone escrow posts double-entry journals (`recordEscrowFundingLedger`,
`recordMilestoneReleaseLedger`). The gig path does not: `fundGigOrderFromWallet` only debits the
wallet and flips a state string. Platform revenue and withholding are recorded, but the client's
funds entering escrow and leaving it are not, so gig balances cannot be reconciled against the
ledger the way contract escrow can — in a flow whose entire value proposition is escrow
protection.

**This needs no migration.** `JournalEntry.referenceType` is a free-form `String`, so
`GIG_ESCROW_FUND` and `GIG_RELEASE` can be introduced alongside the existing values, keyed by
`gigOrderId`, with `idempotencyKey` values of `gig-escrow-fund-<orderId>` /
`gig-release-<orderId>`.

### 2.5 `gigAutoRelease.worker.ts` diverged from the plan

The plan describes a second loop on the existing auto-release worker; the implementation is a
standalone `gig-auto-release` queue. Functionally correct — note it as a decision in
`DECISIONS.md` rather than re-plumbing working code.

---

## 3. Phase plan

Each phase is independently shippable. Phases 1 and 2 are the ones that make gigs *functional*;
3 and 4 make them *trustworthy*; 5 is polish.

### Dependencies

```
Phase 0  ✅ done, no prerequisites
Phase 1  lifecycle UI      ── needs nothing
Phase 2  ledger            ── independent of 1; do NOT let real money flow without it
Phase 4  tests             ── start alongside 1; gates the merge, not the demo
Phase 3  moderation UI     ── needs Phase 0's endpoint (done); needs a new perms key
Phase 5  polish            ── needs 1 and 3
```

Phases 1, 2 and 4 can run in parallel with different people. Phase 3 can start immediately
because the endpoint it calls already exists.

### Definition of done (whole effort)

Gigs are functional when all of the following hold:

1. A freelancer can publish a gig, and it appears in search **only** after a staff decision.
2. A client can order and fund a package, and the money lands in the double-entry ledger.
3. The freelancer can submit a delivery; the client can accept, request a revision, or raise a
   dispute; the freelancer can resubmit up to `maxRevisions`.
4. Funds release exactly once — via acceptance or auto-release, never both.
5. A completed order can be reviewed, and gig balances reconcile against the ledger with no
   manual adjustment.
6. Every gig code path is covered by tests proportional to the money it moves.

Items 1–5 are Phase 1 + 2. Item 6 is Phase 4.

### Phase 0 — Hotfix: close the disclosure holes (½ day) — ✅ COMPLETE

See §1a for what shipped. *Ship condition met:* `?status=DRAFT` cannot widen the result set; a
DRAFT gig id 404s for anonymous callers and strangers while remaining visible to its owner.

### Phase 1 — Order lifecycle UI (the core gap) (3–4 days)

Follows `GIG_MODEL_PLAN.md` §5. Decide the routing shape first — the plan assumed
`/marketplace/gigs/*`; the app is a client-side `View` union in `FullPlatformApp.tsx`, so gig
order detail most likely wants to be a route segment rather than a new top-level view.

1. **Client SDK gaps.** Add `listMyGigs`, `updateGig`, `setGigStatus`, `getGigOrder`, plus the
   three dispute calls (`raiseGigDispute`, `submitGigDisputeEvidence`). Staff resolution reuses
   the ops console's own patterns rather than the user SDK.
2. **Publish flow (freelancer).** Draft → edit → submit for review. Package tier editor with
   prices, delivery days and revisions, validated by the shared `CreateGigInput` schema.
3. **"My gigs" surface.** Drafts, live, paused, and orders in flight.
4. **Order workspace** — the missing two-panel page. Freelancer sees deliverable submission and
   revision status; client sees accept, request-revision, and dispute. Both need the revision
   counter surfaced against `gig.maxRevisions`, since hitting the limit ends the loop.
5. **Post-completion review form**, honouring the existing blind-review fields (`isBlind`,
   `revealedAt`) and the client-only authorship rule in `createGigReview`.
6. **Deep links.** Wire the `gig-*` notification types to the new order route. `notificationTargets.ts`
   already maps all four to the `gigs` view; they should carry the `gigOrderId` through as a
   `focusId` so a notification lands on the specific order.

*Ship condition:* a client can buy, a freelancer can deliver, a client can accept or request a
revision, and both can review — with no console or curl involvement.

### Phase 2 — Double-entry ledger for gig escrow (1 day)

1. `recordGigEscrowFundingLedger(tx, …)` — debit client wallet liability, credit escrow pool
   for gross, credit platform fee revenue for the client-side fee. Mirror
   `recordEscrowFundingLedger`.
2. `recordGigReleaseLedger(tx, …)` — debit escrow pool, credit freelancer net, credit platform
   commission and withholding. Mirror `recordMilestoneReleaseLedger`.
3. Call both **inside** the existing transactions in `fundGigOrderFromWallet`,
   `acceptGigOrder` and the auto-release worker, so a failed journal rolls the state change back.
4. Confirm `auditLedgerIntegrity()` passes with gig orders present.

*Ship condition:* a funded-then-released gig order reconciles in the ledger with no manual
adjustment, and an interrupted release leaves no orphaned journal.

### Phase 3 — Moderation console page (1½ days)

The enforcement shipped in Phase 0; what remains is the UI. Staff currently moderate by
`curl`-ing `POST /api/v1/gigs/:gigId/moderation`, which is not a workflow.

1. A `gigs` page in the Operations Console listing `DRAFT` gigs with a preview and
   approve/reject-with-reason, calling the existing moderation route. Follow the
   `ReportsQueue` / `KycQueue` pattern.
2. Gate it on a permission key following the existing `OPS_PERMS` pattern. The console derives
   nav visibility from `GET /admin/permissions/matrix`, so a `gigs.review` key must be added
   there as well, or the page will never appear.
3. Add `gigs` to `opsApi.badges()` so the console's existing user-detail gig counter has a
   queue to point at.

Already done in Phase 0, so not repeated here: `indexGig` is now called on moderation, so an
approved gig is searchable immediately.

*Ship condition:* staff approve or reject a gig from the console, with a reason, and the
seller sees the outcome.

### Phase 4 — Test coverage (1½ days remaining)

Phase 0 delivered 26 tests covering publication and moderation. What is still missing is the
**money path** — gigs move real funds and currently have no coverage of it.

1. `tests/gig-lifecycle.test.ts` — order → fund → deliver → accept; assert wallet balances,
   fee credit, and `totalEarnedNetMinor`.
2. Auto-release — fake timers or a short window; assert exactly one release when client accept
   and the worker race (§2.3 is the regression guard).
3. Revision exhaustion against `maxRevisions`, and that the queued release is cancelled.
4. Dispute raise → evidence → resolve, for each of `RELEASE_TO_FREELANCER`,
   `REFUND_TO_CLIENT` and `PARTIAL_SPLIT`.
5. Ledger assertions for both new journal entries, including the idempotency key on replay.
6. KYC gating — `requireKycVerified("TIER_1")` on publish, order and fund.
7. Authorization — clients cannot deliver, freelancers cannot accept, non-parties cannot read
   an order, `GET /gigs/orders/:id` 403s for outsiders.

*Ship condition:* the money path has coverage and the 2.3 race has a regression test.

### Phase 5 — Polish (deferred, per plan §7)

Faceted search and Bayesian ranking (`computeBayesian` does not exist yet and needs extracting
per §4), seller banding, multi-package/add-on orders (open decision #2), per-freelancer listing
limits (open decision #4), and gigs in the landing `FeaturedCarousel`.

Open decision #1 — the monetary pointer shape on `PaymentTransaction`/`Milestone` — still needs
answering before gig payouts can be unified with milestone payouts in reporting. It does not
block any phase above.

---

## 4. Documentation to update on completion

Per the validation checklist in `GIG_MODEL_PLAN.md` §9, all of these must land with the work:

- `API.md` — the gig endpoints, and the corrected public search contract
- `DATABASE.md` — gig models and the gig journal reference types
- `WALKTHROUGH.md` — the publish → order → deliver → review walkthrough
- `PROJECT_CONTEXT.md`, `CHANGELOG.md`
- `GIG_MODEL_PLAN.md` — tick §9's validation checklist, and close open decisions #2 and #3
- `DECISIONS.md` — record §2.5 (standalone auto-release queue) and the moderation policy from §2.2

---

## 5. Suggested sequencing

```
Phase 0  hotfix          ── ✅ shipped
Phase 1  lifecycle UI    ── the actual "make it functional" work
Phase 2  ledger          ── do this before real money flows in Phase 1 reaches production
Phase 4  tests           ── start writing alongside Phase 1; it gates the merge, not the demo
Phase 3  moderation UI   ── enforcement already live; this is just the console page
Phase 5  polish          ── deferred
```

Phase 2 is deliberately not last. It is small, and shipping gig payments without it means real
balances sit outside the ledger — much harder to reconcile retrospectively than to add up front.

---

## 5a. Risks, and what to do if one bites

| Risk | Impact | Fallback |
|---|---|---|
| Ledger posting breaks existing escrow | High | `recordEscrowFundingLedger` is unchanged; the gig functions are new additions. If gig postings misbehave, gate them behind a feature flag and fall back to today's behaviour (wallet + fee credit, no journal) rather than blocking releases |
| Moderation becomes a bottleneck | Medium | Phase 0's rule is per-gig. If review volume hurts, relax to "first gig per freelancer only" — the audit trail already records who decided, so it is measurable |
| Revision loop deadlocks | Medium | The client can always raise a dispute instead, which routes to staff. No state can trap an order: every non-terminal state has a client or freelancer action, and auto-release covers inaction |
| Order workspace UI balloons | Medium | Ship the freelancer deliver + client accept/review views first. Dispute and revision can follow without blocking the core loop |
| `AUTO_RELEASE_WINDOW_DAYS` too long for gigs | Low | Add `GIG_AUTO_RELEASE_WINDOW_DAYS` and fall back to the shared value. One-line change in `autoReleaseDate()` |
| Search index drift after moderation | Low | Already handled: `indexGig` runs on both create and moderate. If OpenSearch is absent, `searchGigs` falls back to Postgres and `isSearchConfigured()` short-circuits the remote path |

---

## 5b. Assumptions

- **Single reviewer, part-time.** Durations assume one focused engineer. Phase 1's 3–4 days is
  the least reliable estimate here — it depends on whether gig order detail is a route segment
  or a new top-level view, which is still open.
- **No dedicated designer time.** Phase 1 and 3 reuse existing console and marketplace
  components rather than new visual design.
- **The other parallel workstream stays out of `modules/gigs`.** It currently touches
  `opsApi.ts` and `KycQueue.tsx`, which Phase 1 may also need — expect merge friction there and
  coordinate rather than overwrite.
- **Migration-free Phase 2.** Holds only while `JournalEntry.referenceType` stays a free-form
  string. If someone types it into an enum, gig journal entries need a migration first.

---

## 6. Open questions for the owner

1. **Moderation policy.** Confirm open decision #3: staff review before every first
   publication, or only for new freelancers? The plan assumes full review.
2. **Multi-package orders.** Should a buyer be able to stack add-ons onto one order
   (open decision #2)? It changes whether `GigOrderAddOn` is needed now rather than later.
3. **Auto-release window.** `AUTO_RELEASE_WINDOW_DAYS` is currently shared with milestone
   escrow. Gigs are fixed-scope, so a shorter window may be more appropriate — a separate
   `GIG_AUTO_RELEASE_WINDOW_DAYS` would be a small change.
