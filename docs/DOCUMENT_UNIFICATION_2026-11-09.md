# Document ↔ Codebase Unification Record — 2026-11-09

**Date:** 2026-11-09
**Codebase HEAD:** `e6854fd` (`feat(kyc): hold TIN requirement and tax withholding for MVP launch`)
**Scope:** Reconciliation of three governing source documents against the implemented codebase:
1. `Master Engineering Roadmap (Revised) (2).docx` — Master Engineering & Product Roadmap, Revision 2 (July 2026)
2. `(NEW)Development_and_Engineering_Playbook_Aligned.docx` — Development & Engineering Technical Playbook & Implementation Roadmap, v1.0 (July 2026)
3. `Yekis- Master Design, Legal and Compliance Document_draft 1 (3).docx` — Master Design, Legal & Compliance Document, Consolidated Draft 1

**Supersedes:** `docs/DOCUMENT_UNIFICATION_2026-08-26.md` (that record is retained as history; its stale claims are corrected in Part 5 below).

**Rule:** The documents are the **intent baseline**. The **codebase is the truth** for implementation status. Where a document asserts a capability the code does not have, that gap is **recorded explicitly** rather than silently papered over. This record does **not** change behaviour — it is a documentation-only pass.

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

## Part 1 — Financial Model (all three documents)

| # | Document position | Code reality | Status |
|---|---|---|---|
| 1.1 | **Platform fee 5% from freelancer + 5% from client** (Master Design §3A.13.6 Phase 5; Master Design §10 "Chosen model: 10-15%, split 5% freelancer / 5% client"; Roadmap Phase 0 "Lock Take-Rate & Fee Split") | `PLATFORM_FEE_RATE_FREELANCER = 0.07`, `PLATFORM_FEE_RATE_CLIENT = 0` (`env.ts:276-277`). A **single flat 7% fee from the freelancer**, no client surcharge. Freelancer keeps **93%** | **Divergence** — code wins. Unification record 2026-08-26 §Part 1 is silent; `docs/DECISIONS.md` → *Platform-Wide 7% Only General Fee Rule* (2026-11-09) records the change and its rationale (marketing, onboarding, and backend previously disagreed). The documents should be reworded to "7% general platform fee, no client surcharge" |
| 1.2 | **Withholding 3% with TIN / 30% without, on milestones ≥ ETB 10,000** (Master Design §3A.13.6 Phase 5; Roadmap Phase 1 "Withholding Tax Logic") | `WITHHOLDING_RATE_WITH_TIN = 0.03`, `WITHHOLDING_RATE_WITHOUT_TIN = 0.3`, `WITHHOLDING_THRESHOLD_MINOR = 1_000_000` (10,000 ETB) (`env.ts:259-261`) — **but gated on `TIN_FEATURE_ENABLED`, which defaults to `false`** (`env.ts:253-256`, applied at `fees.ts:35`) | **Partial** — rates correct, **currently 0% at launch**. Documents should mark the MVP launch position explicitly |
| 1.3 | **Auto-release after 7 calendar days** (Master Design Service Agreement Clause 2.2(b); Master Design §3A.13.6) | `AUTO_RELEASE_WINDOW_DAYS = 7` (`env.ts:263`) | **Implemented — aligned** |
| 1.4 | **Auto-release after 5 days** (Roadmap Phase 1 "Auto-Release Cron Job"; Playbook review countdown) | 7 days | **Divergence — code wins.** Roadmap/Playbook wording is stale |
| 1.5 | **VAT registration threshold** (Roadmap Phase 1 Finance "VAT Monitoring Threshold"; Playbook cites ETB 1,000,000) | `VAT_THRESHOLD_MINOR = 45_000_000` (450,000 ETB), `VAT_RATE = 0.15`, `VAT_REGISTERED = false` (`env.ts:333-335`) | **Divergence** — code uses 450,000 ETB; the exact threshold still needs accountant confirmation |
| 1.6 | **Withholding threshold ETB 10,000** (Master Design; Roadmap) | `WITHHOLDING_THRESHOLD_MINOR = 1_000_000` minor units = 10,000 ETB | **Implemented — aligned** |
| 1.7 | **Fee + withholding must be atomically recognised at release** (Roadmap LED-002 "Atomic Milestone Release & Revenue Recognition") | `escrow.service.ts:776-830` runs one `prisma.$transaction` that credits the wallet, `PlatformOperatingAccount`, writes `PlatformFeeCredit`, and posts the double-entry journal | **Implemented — aligned** |
| 1.8 | **Three-pool financial ledger** (Roadmap LED-001) | `PlatformOperatingAccount`, `PlatformFeeCredit`, `LedgerAccount` / `LedgerJournal` / `LedgerEntry` with a zero-sum invariant per journal | **Implemented — aligned** |

---

## Part 2 — Payment Rails

| # | Document position | Code reality | Status |
|---|---|---|---|
| 2.1 | **PAY-001 — "Telebirr and CBE are the approved payment rails"** (Master Design Decision Log, DECIDED 2026-08-21) | Telebirr is live end to end (C2B checkout + B2C payout). `cbe.client.ts` **always throws `PaymentProviderUnavailableError`** | **Partial** — CBE is an approved rail with no working adapter. Blocked externally on PAY-004 |
| 2.2 | **PAY-002 — "Chapa is not part of the approved payment architecture"** (Master Design Decision Log, REMOVED) | **Fully removed from the app layer**: no `chapa.client.ts`, no `POST /webhooks/chapa`, no `CHAPA_*` env vars, and the app-layer union (`src/schemas.ts:59`) and route enum (`src/modules/escrow/escrow.routes.ts:152`) omit it. The **Prisma enum retains an inert `CHAPA` value** because PostgreSQL cannot drop an enum value before PG17+ | **Implemented — aligned** (with documented inert DB residue) |
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
| 3.2 | **"Implement the tiered KYC model decided in Phase 0 — if single-tier for MVP, document that as an explicit simplification"** (Roadmap Phase 0 NEW, Phase 1 KYC) | MVP launches **simplified single-tier**: `requireKycVerified(env.TIN_FEATURE_ENABLED ? "TIER_2" : "TIER_1")` (`escrow.routes.ts:322`), so Tier 1 unlocks everything and Tier 2/TIN is deferred to Phase 4. The decision is recorded in `docs/DECISIONS.md` | **Implemented — aligned** (the explicit simplification the Roadmap asked for now exists) |
| 3.3 | **"Unverified users are blocked from withdrawing funds, changing profile, bidding on projects, or receiving payments"** (Roadmap Phase 1 Hard Block System) | **7 routes** are gated by `requireKycVerified` from `src/middleware/hardBlock.ts`: job create (`jobs.routes.ts:77`), proposal create (`jobs.routes.ts:219`), gig create/update/order/order-fund (`gig.routes.ts:128,154,255,285`), withdrawal (`escrow.routes.ts:322`). **Profile editing is deliberately not gated** (`src/modules/profiles/profile.routes.ts:59` explains that gating it blocked onboarding) | **Divergence** — the Roadmap also says "unverified users blocked from changing profile"; the code intentionally does not. This was a conscious product decision and should be reflected in the Roadmap, or the gate restored. Note `src/middleware/requireKycVerified.ts` is **dead code** (0 importers) — the live guard is `hardBlock.ts` |
| 3.4 | **Age / contractual-capacity gate** (Roadmap Phase 0 NEW + Phase 1) | `MINIMUM_CONTRACTING_AGE = 18` (`env.ts:248`), enforced at registration (`auth.service.ts:76`) | **Implemented** — pending counsel confirmation of the legal age |
| 3.5 | **Fayda ID integration + manual review fallback + biometric dedup** (Roadmap Phase 1) | `fayda.client.ts` with a deterministic mock; dedup policy is explicit (auto-verify only on affirmative response **and** an unused biometric ID; unavailable/rejected/dedup-hit → `UNDER_REVIEW`, `kyc.service.ts:46-54`); staff review queue ships in the ops console | **Stub / Mock** — implementation complete, credentials blocked externally |
| 3.6 | **PEP screening on KYC submission** (Roadmap Phase 1; Master Design §4.4.2) | `pep.client.ts` interface + mock watchlist; the server **refuses to boot in production** with a mock PEP provider | **Stub / Mock** — vendor blocked externally |
| 3.7 | **Periodic KYC refresh job** (Roadmap Phase 1) | `kyc-refresh` queue (daily) sets `periodicReviewPending` without revoking `VERIFIED` | **Implemented** |
| 3.8 | **Unique Customer ID (UCID) assigned at KYC completion, all transactions linked to the UCID** (Roadmap Phase 1) | `User.ucid` exists and the direct-chat lookup resolves by it. Transaction tables link to `User.id`, not to the UCID | **Partial** — the identifier exists but is not the transactional join key the Roadmap requires |
| 3.9 | **Five granular consents at registration** (Master Design §12.2; Roadmap Phase 1 "Consent Management") | `src/schemas.ts:134-141`: `kycDataProcessing` and `financialDataProcessing` are `z.literal(true)`; `platformNotifications`, `marketingCommunications`, `analytics` optional | **Implemented — aligned** |

---

## Part 4 — Escrow, Contracts, Disputes, and PDPP

| # | Document position | Code reality | Status |
|---|---|---|---|
| 4.1 | **7-day cooling-off right** (Master Design Decision Log "Cooling-Off Period Architecture"; Roadmap Phase 1; Master Design Service Agreement) | `Contract.cancellableUntil` is **never written**. `createContractFromProposal()` (`contracts.service.ts:31-106`) omits it and no other code path assigns it, so `cancelDuringCoolingOff()` always rejects with `CoolingOffExpiredError`, and `autoRelease.worker.ts:54-64` never skips a release for cooling-off. `COOLING_OFF_HOURS` (`env.ts:225`, default 24) is **unused**. `apps/backend/tests/cooling-off.test.ts:256-334` documents this as a "D-2 measurement" | **Not Started / Divergence** — the mechanism exists but the statutory right is **not available**. Tracked as `ESC-002` |
| 4.2 | **"24-hour warning before auto-release"** (Master Design §3A.13.6 Phase 4; Roadmap) | `auto-release` queue schedules a `warn` job 24 hours before the deadline and a `release` job at `AUTO_RELEASE_WINDOW_DAYS` | **Implemented — aligned** |
| 4.3 | **5-stage dispute lifecycle** (Master Design Part IV; Roadmap) | `DisputeStage` = `STAGE_1_NEGOTIATION` → `STAGE_2_EVIDENCE` → `STAGE_3_MEDIATION` → (`STAGE_4_ARBITRATION`) → `RESOLVED`, with evidence bundles and a polymorphic subject (`milestoneId` XOR `gigOrderId`) | **Implemented — aligned** |
| 4.4 | **"Immutable Audit Log — every dispute event stored immutably for 10 years"** (Roadmap Phase 1) | `AuditLog` is append-only by **application convention only**. It has **no retention column and no purge job**, and there is **no WORM module**. No `apps/backend/src` match for `retention`, `purge`, or `WORM` | **Not Started** — new blocker `docs/COMPLIANCE_BLOCKERS.md` #7 |
| 4.5 | **"WORM Storage — append-only partitioned tables for all KYC and transaction records"** (Roadmap Phase 1 PDPP) | `infra/postgres` provisions a pgaudit-enabled image; grants and `AuditLog` revokes are unverified after deployment | **Partial** |
| 4.6 | **"Data Erasure Tooling — admin tool that wipes marketing data, profile photos, and chat messages but preserves AML data under the 10-year hold"** (Roadmap Phase 1; Master Design §11.5 note) | **No tooling exists.** Grep for `exportData`, `downloadMyData`, `deleteAccount`, `erasure`, `portability` returns zero matches in `apps/backend/src` | **Not Started** — new blocker `docs/COMPLIANCE_BLOCKERS.md` #8 |
| 4.7 | **72-hour ECA breach notification workflow** (Master Design §3.3; Roadmap Phase 1) | `src/lib/breachAlert.ts` writes `logger.fatal({ breachAlert: true, ... })` only. The SMS/Telegram dispatch is **commented out** (`breachAlert.ts:34-36`). The 72-hour ECA filing has no API and stays human | **Partial** — corrected in `docs/COMPLIANCE_BLOCKERS.md` #6 |
| 4.8 | **WORM-compliant, encrypted object store on Ethiopian servers** (Roadmap Phase 1 KYC) | `src/lib/objectStore.ts` with an explicit warning that `OBJECT_STORE_ENDPOINT` must point to Ethiopian infrastructure in production; versioning / object lock / retention are production configuration tasks with no restore test run | **Partial** |
| 4.9 | **Payment-recipient identity matching ("wallet mismatch")** (Master Design §11.4; Roadmap TMS) | Implemented: mismatch returns `202 HELD_FOR_REVIEW`, creates a TMS flag, and leaves the balance unchanged | **Implemented — aligned** |
| 4.10 | **TMS rules: structuring >500k ETB / 7 days; velocity >300% of 90-day baseline; round amounts; pass-through** (Master Design §11.4) | `TMS_STRUCTURING_TOTAL_THRESHOLD_MINOR = 50_000_000` (500,000 ETB), `TMS_STRUCTURING_WINDOW_HOURS = 168`, `TMS_STRUCTURING_MIN_COUNT = 2`, `TMS_VELOCITY_MULTIPLIER = 3`, `TMS_VELOCITY_BASELINE_DAYS = 90`, `TMS_VELOCITY_FLOOR_RELEASES = 6`, `TMS_ROUND_AMOUNT_MIN_COUNT = 3`, `TMS_ROUND_AMOUNT_UNIT_MINOR = 1_000_000`, `TMS_PASS_THROUGH_WINDOW_HOURS = 24` (`env.ts:287-298`) | **Implemented — aligned** |
| 4.11 | **"Automated background scan every 15 minutes"** and **"STR filed within 24 hours"** (Master Design §11.4) | `TMS_SCAN_CRON = */15 * * * *`; `tms-scan` queue; `TransactionFlag.strDeadlineAt` drives a one-time `STR_SLA_BREACH` audit event per flag | **Implemented — aligned** |
| 4.12 | **File size limits: 50 MB attachments** (Playbook) | Chat upload limit is **15 MB** (`chat.routes.ts:69`) | **Divergence — code wins.** Playbook figure is stale |
| 4.13 | **JWT: 24-hour access token, 7-day refresh token** (Playbook) | `JWT_ACCESS_TTL = "1h"`, `JWT_REFRESH_TTL = "30d"` (`env.ts:43-44`) | **Divergence — code wins.** Staff sessions are additionally capped at 12 hours (`auth.service.ts:342`) |
| 4.14 | **bcrypt cost factor 12+** (Playbook security section) | Passwords are hashed with **Argon2id**, not bcrypt: `@node-rs/argon2` with `memoryCost: 16384` KiB per lane (64 MiB), `timeCost: 3`, `parallelism: 4` (`src/lib/password.ts:12-21`). The stored hash is PHC-encoded, and verification reads the embedded parameters so pre-migration hashes keep working | **Divergence — code wins, and is stronger.** The Playbook should say "Argon2id with an OWASP-aligned memory/time cost" rather than "bcrypt 12+" |
| 4.15 | **Unverified users blocked from changing profile** (Roadmap Phase 1) — repeated from 3.3 | Not gated, by design | **Divergence** |

---

## Part 5 — Corrections to the 2026-08-26 Unification Record

| # | 2026-08-26 claim | 2026-11-09 reality |
|---|---|---|
| 5.1 | Part 2 item 7: *"CI/CD pipeline does not exist yet (`.github/workflows` empty) — Roadmap Phase 0 DoD 'auto-run tests on every PR' is NOT met"* | **False today.** `.github/workflows/ci.yml` runs the doc-parity check, secret scan, backend type-check, route-audit baseline gate, backend test suite, fresh-database check, and the frontend production build on every PR. `.github/workflows/deploy.yml` exists but is a **placeholder** with no deploy steps. So: *auto-run tests on every PR* is now met for the backend; the **deploy** pipeline is still missing, and the frontend has **no tests at all** |
| 5.2 | Part 1 item 6: *"Unverified users cannot change profile — `requireKycVerified("TIER_1")` added to `PATCH /api/v1/profile/me/profile`"* | **No longer true.** The profile gate was deliberately removed (`profile.routes.ts:59`) because it blocked onboarding. Profile editing is ungated today |
| 5.3 | Part 1 item 4: *"Automatic release after seven calendar days — `AUTO_RELEASE_WINDOW_DAYS` default 5 → 7"* | Still 7. Correct |
| 5.4 | Part 1 item 5: *"Chapa REMOVED — schema enum value removed app-wide"* | Still true at the application layer; the inert PostgreSQL enum value remains. Correct |
| 5.5 | Part 4 verification: *"`pnpm --filter backend test` ✅ (15/15)"* | The suite is now **64 test files / ~781 `it()` cases**. The count is stale, not the result |

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
pnpm --filter backend build                # TypeScript compile
pnpm --filter backend test                 # Vitest suite
pnpm --filter frontend build               # Vite production build
```

See `docs/ROADMAP_ALIGNMENT.md` for the phase-by-phase view of the same findings and `docs/COMPLETENESS_CHECKLIST.md` for the authoritative project status.
