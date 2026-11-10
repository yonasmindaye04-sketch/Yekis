# Document vs Project Alignment Report

**Generated:** 2026-11-09 (supersedes the 2026-11-07 and 2026-08-09 reports)
**Scope:** Full scan of `docs/` documentation against `apps/backend/src/`, `apps/backend/prisma/schema.prisma`, `apps/frontend/src/`, and `.github/workflows/` as of 2026-11-09.
**Baseline documents:** *Master Engineering & Product Roadmap (Revised)*, *(NEW) Development & Engineering Playbook*, *Master Design, Legal & Compliance Document (Draft 1)*.
**Companion records:** `docs/DOCUMENT_UNIFICATION_2026-11-09.md` (decision-by-decision) · `docs/ROADMAP_ALIGNMENT.md` (phase-by-phase).

---

## Executive Summary

The core trust loop (Register → KYC → Job → Proposal → Contract → Escrow → Deliver → Release/Dispute → Payout) is implemented and locally verified. The **code** for that loop is in good shape; the **documentation** had drifted in both directions — stale counts on one side, and over-claims on the other.

This pass corrected both:

**Stale counts corrected**
- Frontend i18n: **314 → 625** leaf keys (43 nested objects, exact `en`/`am`/`om`/`ti` parity)
- Operations Console v2: **19 → 23** page components (23 page IDs, 6 shared primitives)
- Background processing: **6 → 9** BullMQ queues (`review-reveal`, `featured-refresh`, `payment-reconcile` were missing from the architecture table)
- Vite dev port: **5173 → 3000** (`vite.config.ts`)
- Backend test suite: **15 → 60 test files / 535 `it()`/`test()` cases**
- Backend surface: **45 Prisma models**, **29 enums**, **20 modules**, **9 workers**

**Over-claims corrected**
- Withholding is **3% (with TIN) / 30% (without)**, not 2% — and it is **currently 0%** at launch because `TIN_FEATURE_ENABLED` defaults to `false`
- `withdrawFromWallet` is **live** (Telebirr B2C), not stubbed
- The ECA breach alert is **log-only**; its SMS/Telegram dispatch is commented out
- `AuditLog` has **no 10-year retention column and no purge job**, and there is **no WORM module**
- **No PDPP data-subject access / portability / erasure tooling exists**

**Under-claims corrected**
- **CI exists** — `.github/workflows/ci.yml` runs on every PR. (`deploy.yml` is a placeholder.) The 2026-08-26 record's claim that "CI/CD does not exist" was false.
- The 7-day **cooling-off mechanism** exists, but the field is never written, so the right is not available.
- The Telegram bot/Mini App, featured carousel, and native support desk all **already ship** — the Roadmap places them in later phases.

**⚠️ One material behavioural divergence surfaced during the pass — now resolved**
`fundMilestoneFromWallet` (commit `a03259a`, 2026-11-09) had made funding a milestone from the wallet **release the money at funding time** instead of holding it in escrow. The milestone was claimed straight into `RELEASED` and the freelancer paid inside the funding transaction, so delivery, client acceptance, the 24-hour warning, the 7-day auto-release timer, and **dispute** were unreachable on the default (wallet) funding path. The same bypass existed on the gig path, and `releaseMilestoneFunds()` had been widened to allow a release with no delivery at all. It broke 8 backend tests.

**Resolved by restoring escrow semantics on the wallet path; legal text unchanged.** Both funding paths now share one `placeEscrowHold()` helper, the release claim is restricted to `SUBMITTED_FOR_REVIEW | DISPUTED`, and the gig path was fixed the same way. The backend suite is green: **595 passed / 61 files, 0 failed** (baseline at `a15177e`: 567 passed, 8 failed). Covered by `apps/backend/tests/escrow-wallet-funding-semantics.test.ts` (20 tests). See `docs/DOCUMENT_UNIFICATION_2026-11-09.md` → Part 1 row 1.9.

**Overall alignment: ~96%** for the *core trust loop*, with the residual concentrated in **external dependencies** (credentials, counsel, vendors, accountants, people) rather than in missing engineering. The genuinely under-built items are listed in Section 6.

---

## Section 1 — What Was Updated In This Pass

### `docs/ARCHITECTURE.md`
- Ops console page count 19 → **23**
- Frontend i18n 314 → **625** keys (43 nested objects), plus the orphaned `marketing.stats` keys noted
- Background processing table 6 → **9** queues, with triggers and a note on where each queue is declared
- Added a **`PaymentProvider` enum vs. live rails** table (Telebirr live; CBE/M-Pesa stubs; CHAPA rejected at the app layer, inert in the database)
- Added a **financial constants** table (fee rates, withholding rates/threshold, auto-release window, VAT threshold/rate, minimum age, JWT TTLs, reconciliation cron) with the stale document values flagged
- Added a **`Continuous Integration`** section describing what `ci.yml` actually runs and that `deploy.yml` is a placeholder
- Added a **verified compliance gaps** table (retention/WORM, data rights, breach dispatch, KYC gate coverage, dormant withholding)
- Added OpenSearch and the `server.fs.deny` list to the local topology; documented the **port 3000** dev server
- Documented the **unarmed `Contract.cancellableUntil`** cooling-off gap in the Escrow section
- Documented the **simplified single-tier KYC launch** in the KYC state machine section

### `docs/COMPLIANCE_BLOCKERS.md`
Rewritten. Corrections and additions:
- Withholding: "2%" → **3% / 30% above 10,000 ETB**, and recorded as **0% at launch**
- Chapa references removed (the adapter no longer exists); replaced with "Telebirr is the only live rail"
- Removed the stale "withdrawFromWallet is stubbed" claim — Telebirr B2C is live
- Breach alert: corrected to log-only
- **Three new blockers added**: 10-year retention / WORM (#7), PDPP data-subject rights (#8), multi-rail payment collection (#9)
- **New section #10** collecting the legal / commercial items that have no code deliverable
- Added a "How To Close Each Blocker" table

### `docs/DECISIONS.md`
Eight new 2026-11-09 entries: *The Codebase Is The Truth*, *Payment Rail Truth: Telebirr Only Is Live*, *Cooling-Off Right Is Not Armed*, *Withholding Is 0% At Launch, Not 2%*, *Auto-Release Is 7 Days, Not 5*, *VAT Threshold Is ETB 450,000*, *Session Token Lifetimes Are 1h / 30d*, *CI Exists; Deployment Does Not*. Four historical entries annotated as superseded (i18n count, ops page count, multi-rail claim, staff-role count — now 8, not 7).

### `docs/COMPLETENESS_CHECKLIST.md`
Added a *Documentation Alignment (2026-11-09)* section and a *Verified Gaps Recorded* section (7 explicitly unfixed gaps). Corrected the cooling-off item, the multi-rail payment item, the ops-console count, the Chapa sandbox item, the CI item, the backend test-suite line, and the multilingual key count. Added retention and data-rights items under security.

### `docs/DOCUMENT_UNIFICATION_2026-08-26.md`
Added an explicit 2026-11-09 corrections table. Its Part 2 item 7 claimed "CI/CD pipeline does not exist yet (`.github/workflows` empty)" — that was false and is now marked as corrected.

### `docs/DOCUMENT_UNIFICATION_2026-11-09.md` *(new)*
Decision-by-decision map across all three source documents: financial model (8 items), payment rails (8), KYC/identity/hard-block (9), escrow/contracts/disputes/PDPP (15), corrections to the 2026-08-26 record (5), open items needing human sign-off (8), and the verification commands.

### `docs/ROADMAP_ALIGNMENT.md` *(new)*
Phase-by-phase map of the Roadmap (Phase 0 → Phase 4) with a status label on every task, plus the Roadmap's own *Compliance Implementation Status* living table reconciled against the code, a KPI instrumentation assessment, and 5 known code/doc divergences.

### Other docs
- `docs/CHANGELOG.md` — new *Documentation* block under **Unreleased**
- `docs/PROJECT_CONTEXT.md` — new alignment banner with the verified facts
- `docs/WALKTHROUGH.md` — new alignment banner with the corrected figures
- `docs/SYSTEM_DESIGN.md` — the three stale "5% client fee" references corrected to 0%
- `docs/FLOW.md` — the stale "Price + 5% fee" diagram label corrected
- `docs/WALKTHROUGH.md` — the dispute-preview fee reference corrected from 5% to 7%
- `docs/PROJECT_CONTEXT.md` — the "95% net / 5% commission" line corrected to 93% / 7%

---

## Section 2 — Strong Alignment Areas

| Feature | Documentation | Codebase | Status |
|---|---|---|---|
| Core trust loop (register → KYC → job → escrow → dispute → payout) | COMPLETENESS_CHECKLIST.md | Fully implemented | ✅ Aligned |
| Escrow state machine | ARCHITECTURE.md | `EscrowState` enum + service | ✅ Aligned |
| 5-stage dispute resolution (polymorphic: milestone XOR gig order) | ARCHITECTURE.md | `DisputeStage` + `Dispute` model | ✅ Aligned |
| TMS/AML rules (structuring, velocity, round-amounts, pass-through) | ARCHITECTURE.md | `tms.service.ts` + `tms-scan` worker | ✅ Aligned |
| 15-minute automated TMS scan + 24h STR SLA | ARCHITECTURE.md | `TMS_SCAN_CRON`, `strDeadlineAt`, `STR_SLA_BREACH` | ✅ Aligned |
| Double-entry general ledger with a zero-sum invariant | DATABASE.md | `LedgerAccount/Journal/Entry` | ✅ Aligned |
| Telebirr C2B Web Checkout + RSA-PSS signing + Redis token cache | ARCHITECTURE.md | `telebirr.client.ts`, `telebirr.signing.ts`, `telebirr.token.ts` | ✅ Aligned |
| Telebirr B2C disbursement + wallet rollback | ARCHITECTURE.md | `payout.service.ts` | ✅ Aligned |
| Payment-side reconciliation sweep | ARCHITECTURE.md | `payment-reconcile` worker (every 10 min) | ✅ Aligned |
| Atomic milestone release + platform fee recognition (LED-002) | ARCHITECTURE.md | `releaseMilestoneFunds` single `$transaction` | ✅ Aligned |
| Phase 1 granular RBAC | DATABASE.md | `StaffRole` (8 values) + `permissions.ts` + `/admin/permissions/matrix` | ✅ Aligned |
| Gig marketplace | DATABASE.md, API.md | `Gig/GigPackage/GigOrder/GigReview` | ✅ Aligned |
| 4-language frontend i18n (625 keys) + bot i18n (243 keys) | ARCHITECTURE.md | `i18n.ts`, `modules/bot/locales/*.json` | ✅ Aligned |
| Operations Console v2 (23 pages, command palette, evidence viewer) | ARCHITECTURE.md, ops/README.md | `pages/ops/` | ✅ Aligned |
| Five granular consents | ARCHITECTURE.md | `src/schemas.ts:134-141` | ✅ Aligned |
| Anti-circumvention engine (multi-script) | ARCHITECTURE.md | `circumvention.middleware.ts` | ✅ Aligned |
| Native support desk with guest-scoped chat | API.md | `chat` module + ops console | ✅ Aligned |
| CI on every pull request | ARCHITECTURE.md | `.github/workflows/ci.yml` | ✅ Aligned |

---

## Section 3 — Documented But Not Implemented (External Dependencies)

| Documented requirement | Status |
|---|---|
| Production Fayda API credentials | ⛔ Pending external |
| Production PEP/sanctions source | ⛔ Pending external |
| Telebirr production credential verification | ⛔ Pending external |
| CBE Birr sandbox verification + integration path (PAY-004) | ⛔ Pending external |
| M-Pesa | ⚠️ **Divergence** — Master Design says REMOVED, the code ships a stub |
| Production SMS credentials/templates | ⛔ Pending external |
| Production Telegram push verification | ⛔ Pending external |
| FIC STR filing operating procedure | ⛔ Pending legal |
| Ethiopian production hosting/data residency | ⛔ Pending infra |
| Ring-fenced escrow/bank-custodian account (FIN-001) | ⛔ Pending legal/banking |
| ERA withholding remittance channel (TAX-002) | ⛔ Pending accountant |
| VAT registration threshold confirmation | ⛔ Pending accountant |
| Counsel sign-off on contracts, privacy, age, cooling-off window | ⛔ Pending legal |
| Penetration test before launch | ⛔ Pending security |
| Formal accessibility audit | ⚪ Not started |
| Automated browser tests | ⚪ Not started — **zero frontend test files, no runner** |
| Backup / DR drill with RTO/RPO | ⚪ Not started |
| Human mediators, DPO, law firm, compliance officer | ⛔ Pending hiring |

---

## Section 4 — Code Ahead Of The Documents

| Capability | Documents say | Code reality |
|---|---|---|
| Telegram bot + Mini App | Roadmap Phase 3 | ✅ Already shipped (4-language parity, wallet/jobs/KYC flows, staff commands) |
| Featured talent carousel | Roadmap Phase 4 (monetised) | ✅ Shipped — but **without payment attached**, so it is free placement, not a paid boost |
| Native support desk | Roadmap Phase 1 ("set up a helpdesk") | ✅ Shipped in-app — the external vendor may not be needed for MVP |
| Browser SPA | Master Design shows only Telegram in places | ✅ First-class client with role-aware workspaces |
| Payment reconciliation sweep | Roadmap "automated daily reconciliation" | ✅ Every **10 minutes**, payment side. The missing half is escrow-pool ↔ bank-statement reconciliation |
| Ops console scale | Roadmap implies a small staff surface | 23 page components with live data, CSV export, evidence viewer, command palette |
| Wallet + receipt/invoice surface | — | Fiscal document modal with spreadsheet-style invoice export ships |

---

## Section 5 — Partial Implementations (Documented As If Complete)

| Area | What is actually partial |
|---|---|
| Withholding tax | Rates correct, but **dormant** behind `TIN_FEATURE_ENABLED=false` |
| KYC hard block | 7 routes gated; **profile editing deliberately ungated** |
| Cooling-off | Mechanism present, **field never written** → the right is unavailable |
| Audit-log retention | Append-only by convention; **no retention column, no purge job, no WORM** |
| Data-subject rights | **Nothing** implemented |
| Breach notification | **Log line only**; the dispatch is commented out |
| Multi-rail payments | Telebirr live; CBE and M-Pesa are throwing stubs |
| Provider fee (0.5–2%) | Not modelled; a hardcoded 0.5% disbursement fee is charged on every provider |
| UCID | Exists on `User`, but **transactions link to `User.id`** |
| KYC state-change notifications | In-app ledger exists; **no user notification fires on VERIFIED/REJECTED** |
| Performance / Lighthouse | No gate, no measured score |
| KPI instrumentation | No time-series store, no uptime monitor |

---

## Section 6 — Remaining Engineering Work (Not External)

| # | Gap | Effort |
|---|---|---|
| 1 | **Arm the 7-day cooling-off right** — set `Contract.cancellableUntil` in `createContractFromProposal()` + regression test | S |
| 2 | **10-year retention + purge job + WORM** — add retention columns to `AuditLog` / `TransactionFlag` / `Dispute`, an archival worker, object lock, and a restore test | M |
| 3 | **PDPP data-subject rights** — export route, erasure admin tool, hold-preserving deletes, 30-day confirmation | M |
| 4 | **Wire the breach-notification dispatch** — uncomment the `notificationQueue` call and add a user-notification path | S |
| 5 | **Frontend automated tests** — introduce a runner (Vitest) and cover the critical flows | L |
| 6 | **Deploy pipeline** — replace the `deploy.yml` placeholder with a real image build/push/deploy | M |
| 7 | **CI hardening** — add frontend lint, migration validation, and a dependency scan as required checks | S |
| 8 | **Clean up the fee copy** — `FeesPage.tsx` still says "2% WITHHOLDING" | S |
| 9 | **Delete or consolidate `src/middleware/requireKycVerified.ts`** (dead code) | XS |
| 10 | **Fix the stale "default (5)" comment** in `autoRelease.worker.ts:51` | XS |
| 11 | **Decide PAY-003** — delete the M-Pesa stub or finish the integration and amend the Master Design | S |
| 12 | **Model the payment-provider fee** as a per-provider schedule instead of a hardcoded 0.5% | S |
| 13 | **Extend `check-doc-parity.mjs`** to cover frontend counts (i18n keys, ops pages), queue names, and financial constants — the CI gate that would have caught most of this drift | M |
| 14 | **Fayda / PEP / SMS production integrations** (replace the mocks) | M each |

---

## Section 7 — Alignment Scorecard

| Area | Before | After | Note |
|---|---|---|---|
| Core trust loop | ~92% | ~96% | Count and constant claims now accurate |
| Financial model documentation | ~70% | ~95% | 5/5 → 7/0 corrected; dormant withholding disclosed |
| Compliance blockers | ~55% | ~90% | 4 factual errors fixed, 3 blockers added |
| Payment-rail truth | ~60% | ~95% | Enum-vs-live-rails split documented |
| KYC / hard-block truth | ~70% | ~90% | Dead code and the ungated profile route disclosed |
| Frontend / i18n documentation | ~55% | ~95% | 314 → 625; ops console 19 → 23; port 3000 |
| Background processing | ~65% | ~100% | All 9 queues documented with triggers |
| CI / delivery documentation | ~30% | ~90% | CI described accurately; deploy gap stated |
| Roadmap traceability | ~20% | ~95% | `docs/ROADMAP_ALIGNMENT.md` created |

---

## Section 8 — Verification

```
node scripts/check-doc-parity.mjs
pnpm --filter backend build
pnpm --filter backend test
pnpm --filter frontend build
```

`scripts/check-doc-parity.mjs` currently verifies Prisma models vs. `docs/DATABASE.md`, backend modules vs. `docs/ARCHITECTURE.md`, mounted routes vs. `docs/API.md`, and 6 topic keywords in `docs/SYSTEM_DESIGN.md`. It does **not** cover frontend counts, queue names, or financial constants — which is why the drift in this report went unnoticed. Extending it is item 13 in Section 6.

---

**Related:** `docs/ROADMAP_ALIGNMENT.md` · `docs/DOCUMENT_UNIFICATION_2026-11-09.md` · `docs/COMPLIANCE_BLOCKERS.md` · `docs/COMPLETENESS_CHECKLIST.md` · `docs/DECISIONS.md`
