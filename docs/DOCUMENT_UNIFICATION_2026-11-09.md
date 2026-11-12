# Document ↔ Codebase Unification Record — 2026-11-09

**Date:** 2026-11-09 · **Consolidated:** 2026-11-12
**Codebase HEAD:** `7babd4b` (`feat(escrow): unify payment provider fee into fee engine and defer statutory withholding`)
**Scope:** Reconciliation of three governing source documents against the implemented codebase:
1. `Master Engineering Roadmap (Revised) (2).docx` — Master Engineering & Product Roadmap, Revision 2 (July 2026)
2. `(NEW)Development_and_Engineering_Playbook_Aligned.docx` — Development & Engineering Technical Playbook & Implementation Roadmap, v1.0 (July 2026)
3. `Yekis- Master Design, Legal and Compliance Document_draft 1 (3).docx` — Master Design, Legal & Compliance Document, Consolidated Draft 1

**This is the single unification record.** It absorbs and replaces the earlier `docs/DOCUMENT_UNIFICATION_2026-08-26.md`, which was removed on 2026-11-12. Nothing was lost in the merge: the 2026-08-26 record's decision-by-decision findings are restated in **Parts 1–4**, its *codebase-ahead-of-the-documents* findings are carried forward in **Part 8**, and its corrections-to-the-earlier-record table is retained in **Part 5**. **Part 9** maps every statement of the removed file to its new home, so the disposition of each old claim stays auditable.

> **Earlier revision of the source documents.** The 2026-08-26 record reconciled earlier file revisions — `Yekis_Master_Design_Legal_Compliance_Modified (2).docx` and `Master_Engineering_Roadmap_Aligned.docx`. Those are the same two documents in earlier drafts; the 2026-11-09 baseline is the three-file set above, which additionally includes the Development & Engineering Playbook.

**Rule:** The documents are the **intent baseline**. The **codebase is the truth** for implementation status. Where a document asserts a capability the code does not have, that gap is **recorded explicitly** rather than silently papered over. This record does **not** change behaviour — it is a documentation-only pass.

**Reconciliation runs in two directions,** and both are recorded here:

| Direction | Rule | Where it is recorded |
|---|---|---|
| **Document → code** | Where a document decision is marked DECIDED and the code diverges, the code was brought to the document | Parts 1–4, `docs/DECISIONS.md` |
| **Code → document** | Where the code is *ahead* of the documents, the record supplies the corrected wording for the next `.docx` revision | Part 8 |

**Status vocabulary**

| Label | Meaning |
|---|---|
| **Implemented** | Verified present and functional in the codebase |
| **Partial** | Present but incomplete, narrowed, or gated off by default |
| **Stub / Mock** | Typed interface exists; the implementation throws or returns mock data |
| **Blocked — External** | Requires a human, a vendor, a regulator, or a credential |
| **Not Started** | No code exists |
| **Divergence** | Document and code disagree; both are stated |

---

> ### ✅ ESC-003 — RESOLVED 2026-11-09: the wallet-funding path no longer uses escrow
>
> Commit `a03259a` (2026-11-09) changed `fundMilestoneFromWallet` so that funding a milestone from the platform wallet **releases the money immediately** instead of placing it in escrow. The freelancer is paid at funding time; the milestone never reaches `ESCROW_HELD`, delivery and client acceptance become unreachable, the 24-hour warning and 7-day auto-release timers are never scheduled, and **the milestone can never be disputed** (`raiseDispute` accepts only `ESCROW_HELD | WORK_IN_PROGRESS | SUBMITTED_FOR_REVIEW`).
>
> **RESOLVED 2026-11-09 — "Resolved by restoring escrow semantics on the wallet path; legal text unchanged."** The code now conforms to Master Design §3A.13.6 and Service Agreement Clause 2.2: the freelancer is paid on client approval or after the 7-day deemed-acceptance window, never at funding time. Both funding paths now share one `placeEscrowHold()` helper, so they cannot diverge again, and the release claim is restricted to `SUBMITTED_FOR_REVIEW | DISPUTED`. The same bypass on the gig path (`fundGigOrderFromWallet`) was fixed the same way. Covered by `apps/backend/tests/escrow-wallet-funding-semantics.test.ts` (20 tests). See Part 1 row 1.9.

---

## Part 1 — Financial Model (all three documents)

| # | Document position | Code reality | Status |
|---|---|---|---|
| 1.1 | **Platform fee 5% from freelancer + 5% from client** (Master Design §3A.13.6 Phase 5; Master Design §10 "Chosen model: 10-15%, split 5% freelancer / 5% client"; Roadmap Phase 0 "Lock Take-Rate & Fee Split") | `PLATFORM_FEE_RATE_FREELANCER = 0.07`, `PLATFORM_FEE_RATE_CLIENT = 0` (`env.ts:284-285`) — a **7% platform commission from the freelancer**, no client surcharge — **plus a 0.5% payment/disbursement provider fee** (`PAYMENT_PROVIDER_FEE_RATE = 0.005`, `env.ts:297`) collected at release through the same fee engine (`fees.ts:47-49`). **Total take 7.5%; the freelancer nets 92.5%** | **Divergence** — code wins. Unification record 2026-08-26 §Part 1 is silent; `docs/DECISIONS.md` → *Platform-Wide 7% Only General Fee Rule* (2026-11-09) and → *Unified 7.5% Fee Engine* record the change and its rationale. The documents should be reworded to "7.5% total platform fee (7% commission + 0.5% provider fee), no client surcharge" |
| 1.2 | **Withholding 3% with TIN / 30% without, on milestones ≥ ETB 10,000** (Master Design §3A.13.6 Phase 5; Roadmap Phase 1 "Withholding Tax Logic") | `WITHHOLDING_RATE_WITH_TIN = 0.03`, `WITHHOLDING_RATE_WITHOUT_TIN = 0.3`, `WITHHOLDING_THRESHOLD_MINOR = 1_000_000` (10,000 ETB) (`env.ts:267-269`) — but the calculation block in `calculateFees` is **commented out** (`fees.ts:69-74`), so withholding is **unconditionally 0**. `TIN_FEATURE_ENABLED` (`env.ts:261`) is retained purely as the reactivation switch, and the rates stay configured so reactivation is a one-line change | **Partial** — rates and threshold correct, **currently 0%**. The block is disabled, not merely flag-gated. Documents should mark the MVP launch position explicitly |
| 1.3 | **Auto-release after 7 calendar days** (Master Design Service Agreement Clause 2.2(b); Master Design §3A.13.6) | `AUTO_RELEASE_WINDOW_DAYS = 7` (`env.ts:271`, default `AUTO_RELEASE_WINDOW_DAYS_DEFAULT` = 7) | **Implemented — aligned** |
| 1.4 | **Auto-release after 5 days** (Roadmap Phase 1 "Auto-Release Cron Job"; Playbook review countdown) | 7 days | **Divergence — code wins.** Roadmap/Playbook wording is stale |
| 1.5 | **VAT registration threshold** (Roadmap Phase 1 Finance "VAT Monitoring Threshold"; Playbook cites ETB 1,000,000) | `VAT_THRESHOLD_MINOR = 45_000_000` (450,000 ETB), `VAT_RATE = 0.15`, `VAT_REGISTERED = false` (`env.ts:353-355`) | **Divergence** — code uses 450,000 ETB; the exact threshold still needs accountant confirmation |
| 1.6 | **Withholding threshold ETB 10,000** (Master Design; Roadmap) | `WITHHOLDING_THRESHOLD_MINOR = 1_000_000` minor units = 10,000 ETB | **Implemented — aligned** |
| 1.7 | **Fee + withholding must be atomically recognised at release** (Roadmap LED-002 "Atomic Milestone Release & Revenue Recognition") | `escrow.service.ts:797-890` runs one `prisma.$transaction` that credits the wallet, `PlatformOperatingAccount`, writes `PlatformFeeCredit`, and posts the double-entry journal | **Implemented — aligned** |
| 1.8 | **Three-pool financial ledger** (Roadmap LED-001) | `PlatformOperatingAccount`, `PlatformFeeCredit`, `LedgerAccount` / `LedgerJournal` / `LedgerEntry` with a zero-sum invariant per journal | **Implemented — aligned** |
| 1.9 | **Escrow state machine — `PAYMENT_PENDING → ESCROW_HELD → WORK_IN_PROGRESS → SUBMITTED_FOR_REVIEW → RELEASED \| DISPUTED`** (Master Design §3A.13.6 Phases 2–5; Roadmap Phase 1) | ✅ **Aligned again (ESC-003 resolved 2026-11-09).** Both funding paths now land in `ESCROW_HELD`: external payment (`POST /escrow/fund`, Telebirr) via the signed webhook, and wallet funding (`POST /escrow/fund-from-wallet`) via the shared `placeEscrowHold()` helper. The freelancer is credited only by `releaseMilestoneFunds()`, which claims from `SUBMITTED_FOR_REVIEW` (client acceptance or 7-day auto-release) or `DISPUTED` (staff resolution / arbitration award). `ESCROW_HELD` and `WORK_IN_PROGRESS` are not legal entry states | ✅ **Aligned** |

---

## Part 2 — Payment Rails

| # | Document position | Code reality | Status |
|---|---|---|---|
| 2.1 | **PAY-001 — "Telebirr and CBE are the approved payment rails"** (Master Design Decision Log, DECIDED 2026-08-21) | Telebirr is live end to end (C2B checkout + B2C payout). `cbe.client.ts` **always throws `PaymentProviderUnavailableError`** | **Partial** — CBE is an approved rail with no working adapter. Blocked externally on PAY-004 |
| 2.2 | **PAY-002 — "Chapa is not part of the approved payment architecture"** (Master Design Decision Log, REMOVED) | **Fully removed from the app layer**: no `chapa.client.ts`, no `POST /webhooks/chapa`, no `CHAPA_*` env vars, and the app-layer union (`src/schemas.ts:59`) and route enum (`src/modules/escrow/escrow.routes.ts:153`) omit it. The **Prisma enum retains an inert `CHAPA` value** because PostgreSQL cannot drop an enum value before PG17+ | **Implemented — aligned** (with documented inert DB residue) |
| 2.3 | **PAY-003 — "M-Pesa is not part of the approved payment architecture"** (Master Design Decision Log, REMOVED) | The code **still ships** an M-Pesa client stub (`mpesa.client.ts`, always throws), the `M_PESA` Prisma enum value, the `M_PESA` member of the `schemas.ts` union, and top-up route support (`topup.routes.ts:106,142`; `topup.service.ts:348,398`) | **Divergence — needs a product decision.** Either delete the stub to match PAY-003, or finish the integration and amend PAY-003. Tracked as `PAY-003` in `docs/ROADMAP_ALIGNMENT.md` |
| 2.4 | **PAY-004 — CBE integration path (Star Pay vs. classic CBE Birr merchant flow)** | PENDING; unchanged since 2026-08-26 | **Blocked — External** |
| 2.5 | **PAY-005 — "Provider disbursement through the selected payment rail after milestone release"** | Telebirr B2C disbursement is implemented (`payout.service.ts`) with automatic wallet rollback on provider refusal and double-entry ledger posting on `CONFIRMED` | **Implemented — aligned** |
| 2.6 | **PAY-006 — production payment credentials** (Master Design Decision Log, BLOCKER) | Mock fallback only; no production credentials | **Blocked — External** |
| 2.7 | **Master Design §3A mentions "Chapa to account" as a settlement example** and the Playbook lists Chapa among gateway DPAs | Stale — Chapa is removed | **Divergence — documents need editing** |
| 2.8 | **Roadmap Phase 1 "Payment Integration (M-Pesa) — implement as secondary/fallback gateway"** and "Payment Integration (CBE Birr) — tertiary option"** | Both are throwing stubs | **Partial / Divergence** |

---

## Part 3 — KYC, Identity, and the Hard Block

| # | Document position | Code reality | Status |
|---|---|---|---|
| 3.1 | **Tiered KYC (Tier 1 / Tier 2 / Tier 3)** (Master Design §4.4.2; Roadmap Phase 1) | `KycTier` enum has `TIER_1` / `TIER_2` / `TIER_3`; the KYC module implements transitions | **Implemented** |
| 3.2 | **"Implement the tiered KYC model decided in Phase 0 — if single-tier for MVP, document that as an explicit simplification"** (Roadmap Phase 0 NEW, Phase 1 KYC) | MVP launches **simplified single-tier**: `requireKycVerified(env.TIN_FEATURE_ENABLED ? "TIER_2" : "TIER_1")` (`escrow.routes.ts:351`), so Tier 1 unlocks everything and Tier 2/TIN is deferred to Phase 4. The decision is recorded in `docs/DECISIONS.md` | **Implemented — aligned** (the explicit simplification the Roadmap asked for now exists) |
| 3.3 | **"Unverified users are blocked from withdrawing funds, changing profile, bidding on projects, or receiving payments"** (Roadmap Phase 1 Hard Block System) | **7 routes** are gated by `requireKycVerified` from `src/middleware/hardBlock.ts`: job create (`jobs.routes.ts:77`), proposal create (`jobs.routes.ts:219`), gig create/update/order/order-fund (`gig.routes.ts:128,154,255,285`), withdrawal (`escrow.routes.ts:351`). **Profile editing is deliberately not gated** (`src/modules/profiles/profile.routes.ts:59` explains that gating it blocked onboarding) | **Divergence** — the Roadmap also says "unverified users blocked from changing profile"; the code intentionally does not. This was a conscious product decision and should be reflected in the Roadmap, or the gate restored. Note `src/middleware/requireKycVerified.ts` is **dead code** (0 importers) — the live guard is `hardBlock.ts` |
| 3.4 | **Age / contractual-capacity gate** (Roadmap Phase 0 NEW + Phase 1) | `MINIMUM_CONTRACTING_AGE = 18` (`env.ts:256`), enforced at registration (`auth.service.ts:76`) | **Implemented** — pending counsel confirmation of the legal age |
| 3.5 | **Fayda ID integration + manual review fallback + biometric dedup** (Roadmap Phase 1) | `fayda.client.ts` with a deterministic mock; dedup policy is explicit (auto-verify only on affirmative response **and** an unused biometric ID; unavailable/rejected/dedup-hit → `UNDER_REVIEW`, `kyc.service.ts:46-54`); staff review queue ships in the ops console | **Stub / Mock** — implementation complete, credentials blocked externally |
| 3.6 | **PEP screening on KYC submission** (Roadmap Phase 1; Master Design §4.4.2) | `pep.client.ts` interface + mock watchlist; the server **refuses to boot in production** with a mock PEP provider | **Stub / Mock** — vendor blocked externally |
| 3.7 | **Periodic KYC refresh job** (Roadmap Phase 1) | `kyc-refresh` queue (daily) sets `periodicReviewPending` without revoking `VERIFIED` | **Implemented** |
| 3.8 | **Unique Customer ID (UCID) assigned at KYC completion, all transactions linked to the UCID** (Roadmap Phase 1) | `User.ucid` exists and the direct-chat lookup resolves by it. Transaction tables link to `User.id`, not to the UCID | **Partial** — the identifier exists but is not the transactional join key the Roadmap requires |
| 3.9 | **Five granular consents at registration** (Master Design §12.2; Roadmap Phase 1 "Consent Management") | `src/schemas.ts:134-141`: `kycDataProcessing` and `financialDataProcessing` are `z.literal(true)`; `platformNotifications`, `marketingCommunications`, `analytics` optional | **Implemented — aligned** |

---

## Part 4 — Escrow, Contracts, Disputes, and PDPP

| # | Document position | Code reality | Status |
|---|---|---|---|
| 4.1 | **7-day cooling-off right** (Master Design Decision Log "Cooling-Off Period Architecture"; Roadmap Phase 1; Master Design Service Agreement) | `Contract.cancellableUntil` is **never written**. `createContractFromProposal()` (`contracts.service.ts:31-106`) omits it and no other code path assigns it, so `cancelDuringCoolingOff()` always rejects with `CoolingOffExpiredError`, and `autoRelease.worker.ts:50-64` never skips a release for cooling-off. `COOLING_OFF_HOURS` (`env.ts:233`, default 24) is **unused**. `apps/backend/tests/cooling-off.test.ts:256-334` documents this as a "D-2 measurement" | **Not Started / Divergence** — the mechanism exists but the statutory right is **not available**. Tracked as `ESC-002` |
| 4.2 | **"24-hour warning before auto-release"** (Master Design §3A.13.6 Phase 4; Roadmap) | `auto-release` queue schedules a `warn` job 24 hours before the deadline and a `release` job at `AUTO_RELEASE_WINDOW_DAYS` | **Implemented — aligned** |
| 4.3 | **5-stage dispute lifecycle** (Master Design Part IV; Roadmap) | `DisputeStage` = `STAGE_1_NEGOTIATION` → `STAGE_2_EVIDENCE` → `STAGE_3_MEDIATION` → (`STAGE_4_ARBITRATION`) → `RESOLVED`, with evidence bundles and a polymorphic subject (`milestoneId` XOR `gigOrderId`) | **Implemented — aligned** |
| 4.4 | **"Immutable Audit Log — every dispute event stored immutably for 10 years"** (Roadmap Phase 1) | `AuditLog` is append-only by **application convention only**. It has **no retention column and no purge job**, and there is **no WORM module**. No `apps/backend/src` match for `retention`, `purge`, or `WORM` | **Not Started** — new blocker `docs/COMPLIANCE_BLOCKERS.md` #7 |
| 4.5 | **"WORM Storage — append-only partitioned tables for all KYC and transaction records"** (Roadmap Phase 1 PDPP) | `infra/postgres` provisions a pgaudit-enabled image; grants and `AuditLog` revokes are unverified after deployment | **Partial** |
| 4.6 | **"Data Erasure Tooling — admin tool that wipes marketing data, profile photos, and chat messages but preserves AML data under the 10-year hold"** (Roadmap Phase 1; Master Design §11.5 note) | **No tooling exists.** Grep for `exportData`, `downloadMyData`, `deleteAccount`, `erasure`, `portability` returns zero matches in `apps/backend/src` | **Not Started** — new blocker `docs/COMPLIANCE_BLOCKERS.md` #8 |
| 4.7 | **72-hour ECA breach notification workflow** (Master Design §3.3; Roadmap Phase 1) | `src/lib/breachAlert.ts` writes `logger.fatal({ breachAlert: true, ... })` only. The SMS/Telegram dispatch is **commented out** (`breachAlert.ts:36`). The 72-hour ECA filing has no API and stays human | **Partial** — corrected in `docs/COMPLIANCE_BLOCKERS.md` #6 |
| 4.8 | **WORM-compliant, encrypted object store on Ethiopian servers** (Roadmap Phase 1 KYC) | `src/lib/objectStore.ts` with an explicit warning that `OBJECT_STORE_ENDPOINT` must point to Ethiopian infrastructure in production; versioning / object lock / retention are production configuration tasks with no restore test run | **Partial** |
| 4.9 | **Payment-recipient identity matching ("wallet mismatch")** (Master Design §11.4; Roadmap TMS) | Implemented: mismatch returns `202 HELD_FOR_REVIEW`, creates a TMS flag, and leaves the balance unchanged | **Implemented — aligned** |
| 4.10 | **TMS rules: structuring >500k ETB / 7 days; velocity >300% of 90-day baseline; round amounts; pass-through** (Master Design §11.4) | `TMS_STRUCTURING_TOTAL_THRESHOLD_MINOR = 50_000_000` (500,000 ETB), `TMS_STRUCTURING_WINDOW_HOURS = 168`, `TMS_STRUCTURING_MIN_COUNT = 2`, `TMS_VELOCITY_MULTIPLIER = 3`, `TMS_VELOCITY_BASELINE_DAYS = 90`, `TMS_VELOCITY_FLOOR_RELEASES = 6`, `TMS_ROUND_AMOUNT_MIN_COUNT = 3`, `TMS_ROUND_AMOUNT_UNIT_MINOR = 1_000_000`, `TMS_PASS_THROUGH_WINDOW_HOURS = 24` (`env.ts:287-298`) | **Implemented — aligned** |
| 4.11 | **"Automated background scan every 15 minutes"** and **"STR filed within 24 hours"** (Master Design §11.4) | `TMS_SCAN_CRON = */15 * * * *`; `tms-scan` queue; `TransactionFlag.strDeadlineAt` drives a one-time `STR_SLA_BREACH` audit event per flag | **Implemented — aligned** |
| 4.12 | **File size limits: 50 MB attachments** (Playbook) | Chat upload limit is **15 MB** (`chat.routes.ts:69`) | **Divergence — code wins.** Playbook figure is stale |
| 4.13 | **JWT: 24-hour access token, 7-day refresh token** (Playbook) | `JWT_ACCESS_TTL = "1h"`, `JWT_REFRESH_TTL = "30d"` (`env.ts:51-52`) | **Divergence — code wins.** Staff sessions are additionally capped at 12 hours (`auth.service.ts:342`) |
| 4.14 | **bcrypt cost factor 12+** (Playbook security section) | Passwords are hashed with **Argon2id**, not bcrypt: `@node-rs/argon2` with `memoryCost: 16384` KiB per lane (64 MiB), `timeCost: 3`, `parallelism: 4` (`src/lib/password.ts:12-21`). The stored hash is PHC-encoded, and verification reads the embedded parameters so pre-migration hashes keep working | **Divergence — code wins, and is stronger.** The Playbook should say "Argon2id with an OWASP-aligned memory/time cost" rather than "bcrypt 12+" |
| 4.15 | **Unverified users blocked from changing profile** (Roadmap Phase 1) — repeated from 3.3 | Not gated, by design | **Divergence** |

---

## Part 5 — Corrections to the 2026-08-26 Unification Record

*(The 2026-08-26 record was removed on 2026-11-12 and is consolidated into this file. Its stale statements are corrected here.)*

| # | 2026-08-26 claim | 2026-11-09 reality |
|---|---|---|
| 5.1 | Part 2 item 7: *"CI/CD pipeline does not exist yet (`.github/workflows` empty) — Roadmap Phase 0 DoD 'auto-run tests on every PR' is NOT met"* | **False today.** `.github/workflows/ci.yml` runs the doc-parity check, secret scan, backend type-check, route-audit baseline gate, backend test suite, fresh-database check, and the frontend production build on every PR. `.github/workflows/deploy.yml` exists but is a **placeholder** with no deploy steps. So: *auto-run tests on every PR* is now met for the backend; the **deploy** pipeline is still missing, and the frontend has **no tests at all** |
| 5.2 | Part 1 item 6: *"Unverified users cannot change profile — `requireKycVerified("TIER_1")` added to `PATCH /api/v1/profile/me/profile`"* | **No longer true.** The profile gate was deliberately removed (`profile.routes.ts:59`) because it blocked onboarding. Profile editing is ungated today |
| 5.3 | Part 1 item 4: *"Automatic release after seven calendar days — `AUTO_RELEASE_WINDOW_DAYS` default 5 → 7"* | Still 7. Correct |
| 5.4 | Part 1 item 5: *"Chapa REMOVED — schema enum value removed app-wide"* | Still true at the application layer; the inert PostgreSQL enum value remains. Correct |
| 5.5 | Part 4 verification: *"`pnpm --filter backend test` ✅ (15/15)"* | The suite is now **61 test files / 595 test cases**. The count is stale, not the result. See Part 7 for the current run status |
| 5.6 | Part 2 item 5: *"Payment reconciliation sweep already runs every 10 minutes — reword the Roadmap item to cover only escrow-pool ↔ bank-statement reconciliation"* | **Still true.** `PAYMENT_RECONCILE_CRON = */10 * * * *` (`env.ts`). Restated as Part 8 row 8.5 |
| 5.7 | Part 2 item 7: *"Backup/DR remains unbuilt despite being pulled forward to Phase 1"* | **Still true.** No backup schedule, restore procedure, RTO or RPO. Restated as Part 8 row 8.6 |
| 5.8 | Part 1 item 2: *"background processing fleet is now 9 BullMQ queues rather than 4"* | **Still true.** Nine queues: `auto-release`, `kyc-refresh`, `notifications`, `review-reveal`, `featured-refresh`, `payment-reconcile`, `tms-scan`, `gig-auto-release`, `withholding-remittance` (`src/queue/queues.ts`) |
| 5.9 | Part 2 item 6: *"Cooling-off is implemented as blocking auto-release even after submission — stricter than ESC-002; kept conservative pending legal validation"* | **Superseded.** `Contract.cancellableUntil` is **never written**, so the mechanism does not run at all. The statutory right is **not available**. See Part 4 row 4.1 and Part 6 |

---

## Part 6 — Open Items Requiring Human Sign-Off

| Item | Options | Owner | Reference |
|---|---|---|---|
| **PAY-003 M-Pesa** | Delete the stub to match the Master Design REMOVED decision, **or** finish the integration and amend the decision | Product | Part 2.3 |
| **Cooling-off window** | 7 days (Master Design, schema comment) vs. the unused 24-hour `COOLING_OFF_HOURS` | Legal counsel | Part 4.1 |
| **Cooling-off vs. deemed-acceptance precedence** | Current strict behaviour vs. the Roadmap's "applies before work starts" | Legal counsel | Part 4.1 |
| **Profile-edit KYC gate** | Restore the gate, or amend the Roadmap | Product + Legal | Part 3.3 |
| **Withholding / VAT final figures** | 3% / 30% and 450,000 ETB vs. accountant confirmation | Accountant | Part 1.2, 1.5 |
| **CBE integration path** | Star Pay vs. classic CBE Birr merchant flow | Product + CBE | Part 2.4 |
| **Fee split (5/5 vs. 7/0)** | Amend the documents to 7% / 0% | Product | Part 1.1 |
| **Production credentials & payout/refund matrix** | 8-operation verification before beta | Finance + providers | Part 2.6 |

---

## Part 7 — Verification

```
node scripts/check-doc-parity.mjs          # Prisma models, backend modules, mounted routes, SYSTEM_DESIGN topics
pnpm --filter backend type-check           # tsc --noEmit
pnpm --filter backend route-audit:check    # route baseline gate
pnpm --filter backend test                 # Vitest suite
pnpm --filter frontend build               # tsc -b && vite build
```

**Status at `7babd4b` (2026-11-12):**

| Check | Result |
|---|---|
| `node scripts/check-doc-parity.mjs` | ✅ all 45 Prisma models, 20 backend modules, 21 mounted API paths and the `SYSTEM_DESIGN.md` topic set are documented |
| `node scripts/scan-secrets.js` | ✅ clean — 743 tracked text files, 0 findings |
| `pnpm --filter backend type-check` | ✅ `tsc --noEmit` clean |
| `pnpm --filter backend route-audit:check` | ✅ route baseline gate passed |
| `pnpm --filter frontend build` | ✅ `tsc -b && vite build` succeeded (2,834 modules; the >500 kB chunk warning is pre-existing) |
| `pnpm --filter backend test` | ✅ **595 passed / 0 failed** of 595 cases across 61 files. An earlier run at this HEAD showed 594/595: `tests/escrow-wallet-funding-semantics.test.ts` → *"schedules the 24h warning and the 7-day auto-release on submission"* asserted `releaseDelay - warnDelay === DAY` for exact equality and observed `86399999` against `86400000`. **Root cause: the source, not the test** — `submitMilestone` computed the two BullMQ delays from **two separate `Date.now()` calls**, so the milliseconds spent on the first `queue.add()` Redis round-trip leaked into the gap between them, and the gap was only *approximately* 24 h under load. **Fixed** by reading the clock once and deriving both delays from that instant (and by subtracting the 24 h warning in absolute time rather than local wall-clock fields). The gap is now exactly `DAY` by construction, so the assertion stays exact and deterministic. Recorded in `docs/COMPLETENESS_CHECKLIST.md` → *Verified Gaps Recorded* |

See `docs/ROADMAP_ALIGNMENT.md` for the phase-by-phase view of the same findings and `docs/COMPLETENESS_CHECKLIST.md` for the authoritative project status.

---

## Part 8 — Codebase ahead of the documents

*(Carried forward from the 2026-08-26 record, Part 2. These are capabilities the code already ships that the governing documents still describe as future work. They are **not** divergences to reconcile in code — they are divergences to correct **in the documents**.)*

| # | Document position | Code reality | Status |
|---|---|---|---|
| 8.1 | **Telegram bot + Mini App** listed as Roadmap **Phase 3** work | Shipped end to end: grammy bot with 4-language parity (243 locale keys), initData HMAC handshake, JWT issuance, wallet / jobs / KYC flows, staff bot commands, WebSocket push. Verified live — the bot starts in polling mode at boot | **Implemented — code is ahead.** Reword Roadmap Phase 3 to *"Telegram: shipped; remaining work = production bot hosting + webhook monitoring."* |
| 8.2 | **Featured Job Listings** placed in Roadmap **Phase 4** (monetisation) | `featuredRefresh.worker.ts` + the `featured-refresh` queue + the `FeaturedLog` model + the carousel UI all exist — **with no payment attached**, so placement is free rather than a paid boost | **Implemented — code is ahead.** Reword Phase 4 *"Featured Job Listings"* to *"monetise the existing featured placement (paid boost flow)."* |
| 8.3 | Master Design §21/§23 and the topology diagrams present the **Telegram Mini App as the primary client** | The **browser SPA is a first-class client**: registration, jobs, contracts, escrow dashboard, verification, and the staff/admin console all ship in the browser | **Implemented — code is ahead.** Update Master Design §21/§23 and the topology diagrams to show **dual front-ends** (Browser SPA + Telegram). |
| 8.4 | OPS-001 *"tool selection pending"* — the Roadmap lists a helpdesk as Phase 1 work | A **native in-app support desk** ships: guest-scoped JWT chat, load-balanced staff assignment with atomic queue claiming, OPEN/CLOSED workflow, attachments, unread counts, WebSocket delivery | **Implemented — code is ahead.** Reword OPS-001 to *"decide whether the in-app support chat suffices for MVP, or an external tool (Freshdesk / Zendesk) is still required."* |
| 8.5 | Roadmap Phase 1 *"automated daily reconciliation"* | A **payment-side reconciliation sweep already runs every 10 minutes** against Telebirr's `queryOrder` API (`PAYMENT_RECONCILE_CRON = */10 * * * *`, `paymentReconcile.worker.ts`), with stale-transaction detection and give-up handling | **Implemented — code is ahead.** Reword the Roadmap item to cover **only the missing piece**: escrow-pool ↔ bank-statement reconciliation (FIN workstream). |
| 8.6 | Roadmap Phase 0 *"design backup & DR from day one"* and Phase 1 *"backup & DR test against a restored environment"* | **Unbuilt.** No backup schedule, no restore procedure, no RTO/RPO. `docker-compose.yml` has local volumes only | **Not Started.** No document change — this is real outstanding work. |
| 8.7 | The Roadmap implies a **small staff surface** for the operations console | **23 page components** ship with live data, CSV export, an evidence viewer, and a command palette | **Implemented — code is ahead.** Update the Roadmap's ops-console row to the actual page count |
| 8.8 | The documents do not describe a **fiscal receipt / invoice surface** at all | A fiscal document modal with a spreadsheet-style invoice export ships, in all four languages | **Implemented — an addition beyond the documents.** The Master Design's payment chapters should mention it |

---

## Part 9 — Disposition of the removed 2026-08-26 record

`docs/DOCUMENT_UNIFICATION_2026-08-26.md` was removed on 2026-11-12. Every statement in it is accounted for below, so the merge is auditable and nothing was silently dropped.

| 2026-08-26 section / row | Statement | New home |
|---|---|---|
| Header — source documents | Reconciled `Yekis_Master_Design_Legal_Compliance_Modified (2).docx` + `Master_Engineering_Roadmap_Aligned.docx` | Header note (earlier revisions of the two documents; the 2026-11-09 baseline adds the Playbook) |
| Header — rule | Documents = intent baseline; code = truth; record both directions | Header, *Reconciliation runs in two directions* |
| Part 1 row 1 | TMS structuring thresholds (>500k ETB / 7 days) | Part 4 row 4.10 |
| Part 1 row 2 | Automated background TMS scan every 15 minutes | Part 4 row 4.11 |
| Part 1 row 3 | STR within 24h of suspicion; freeze/suspend on confirmation | Part 4 row 4.11 |
| Part 1 row 4 | Automatic release after seven calendar days | Part 1 row 1.3 (and Part 1 row 1.4 for the Roadmap's stale "5 days") |
| Part 1 row 5 | Chapa removed from the approved rails | Part 2 row 2.2 |
| Part 1 row 6 | Unverified users cannot change profile | Part 3 row 3.3 — **and corrected** in Part 5 row 5.2 |
| Part 1 row 7 | Five granular consents at registration | Part 3 row 3.9 |
| Part 2 row 1 | Telegram bot + Mini App already built | Part 8 row 8.1 |
| Part 2 row 2 | Featured listings already built | Part 8 row 8.2 |
| Part 2 row 3 | Browser SPA is a first-class client | Part 8 row 8.3 |
| Part 2 row 4 | Helpdesk partially exists | Part 8 row 8.4 |
| Part 2 row 5 | Payment reconciliation sweep runs every 10 minutes | Part 8 row 8.5 (and Part 5 row 5.6) |
| Part 2 row 6 | Cooling-off blocks auto-release even after submission | **Superseded** — Part 4 row 4.1, Part 6, and Part 5 row 5.9 |
| Part 2 row 7 | Audit-log lockdown unexecuted; CI/CD absent; backup/DR unbuilt | Audit log → Part 4 row 4.4; CI/CD → Part 5 row 5.1; backup/DR → Part 8 row 8.6 |
| Part 3 — 5 open clashes | KYC tier paradigm, cooling-off precedence, withholding/VAT figures, CBE path, production credentials | Part 6 (superseded by an 8-item list that also adds PAY-003 M-Pesa, the profile-edit KYC gate, and the fee split) |
| Part 4 — verification | Build / test / frontend build commands; applied migrations | Part 7 |

**Net effect:** the 2026-08-26 record contributed 7 decision rows, 6 code-ahead findings (plus one compliance-status item), 5 open clashes, and a verification block. Every one of them is present above — the consolidation moved the content into the current record's structure rather than dropping it.
