# Document vs Project Alignment Report

**Generated:** 2026-11-07 (supersedes 2026-08-09 report)
**Scope:** Full scan of `docs/` documentation against `apps/backend/src/`, `apps/frontend/src/`, and `apps/backend/prisma/schema.prisma` as of November 2026.

---

## Executive Summary

The core trust loop (Register → KYC → Job → Proposal → Contract → Escrow → Deliver → Release/Dispute → Payout) is fully implemented and locally verified. The codebase has **significantly advanced past the August 2026 documentation baseline** across four major areas:

1. **Gig marketplace** (Fiverr-style orders, packages, reviews, disputes) — implemented, partially documented
2. **Phase 1 RBAC** (7 staff roles, permission matrix) — implemented, mostly documented
3. **Operations Console v2** (19-page staff shell, command palette) — implemented, documented in ops/README.md only
4. **Multilingual system** (4 languages, 314 frontend + 243 bot keys) — implemented, documented in PROJECT_CONTEXT.md only

**Overall Alignment: ~92%** (up from ~85% in August) — the remaining gaps are documentation staleness in `ARCHITECTURE.md`, `DATABASE.md`, and `API.md`, all of which were updated in this session (2026-11-07).

---

## What Was Updated in This Session (2026-11-07)

### `docs/ARCHITECTURE.md`
- Added 12 missing domain modules to the module table (gigs, finance, bot, profiles, skills, reviews, featured, portfolio, admin, staffProfile, search, topups)
- Added 3 missing background workers (gig-auto-release, tms-scan, withholding-report)
- Updated system overview flowchart to include Grammy Telegram Bot as a third client
- Added OpenSearch as an optional fourth data store
- Added `Payout` state machine (PENDING → PROCESSING → CONFIRMED/FAILED/REVERSED)
- Added `Contract.CANCELLED` cooling-off state
- Added `Proposal.COUNTER_OFFERED` state
- Updated External Boundaries table (B2C disbursement is live, not "wallet debit only")
- Added Multilingual System section
- Added Phase 1 RBAC and WebSocket security notes
- Added Finance module financial integrity controls (double-entry ledger, VAT alerts)

### `docs/DATABASE.md`
- Added 14 missing models to entity responsibilities table
- Added `StaffRole` full 7-value enum (was showing only 2)
- Added `ContractStatus.CANCELLED` and `ProposalStatus.COUNTER_OFFERED`
- Added all Gig marketplace enums (GigStatus, GigPackageTier, GigOrderStatus)
- Corrected `TopUpRequest` → `WalletTopUp` model name
- Updated erDiagram with new models

### `docs/API.md`
- Added full auth route list (21 routes, up from 4)
- Added missing KYC routes (document URL, decision history)
- Added Finance module section (4 routes, ERA filing)
- Added Bot Management section (7 routes with security notes)
- Corrected gig status route (owner: PAUSED/ARCHIVED only; ACTIVE requires staff moderation)
- Added TMS full route list (lift-hold, activity)
- Added `PATCH /chat/admin/conversations/:id/status` (staff close/reopen)
- Added OpenSearch integration documentation

---

## Remaining Known Gaps (Post-Update)

| Gap | Location | Priority |
|---|---|---|
| `docs/SYSTEM_DESIGN.md` needs updating for gig marketplace, ops console, multilingual system, payout B2C | `SYSTEM_DESIGN.md` | 🟡 Medium |
| OpenSearch index schema (field mappings, fuzziness config) has no dedicated infra doc | — | 🟢 Low |
| `docs/WALKTHROUGH.md` needs re-verification against current flows | `WALKTHROUGH.md` | 🟡 Medium |
| Automated browser test coverage still `[ ]` in checklist | `COMPLETENESS_CHECKLIST.md` | 🔴 High (launch blocker) |
| Production infrastructure docs (hosting, data residency, secrets rotation) | — | 🔴 High (launch blocker) |

---

## Section 1: Strong Alignment Areas

| Feature | Documentation | Codebase | Status |
|---|---|---|---|
| Core trust loop (register → KYC → job → escrow → dispute → payout) | COMPLETENESS_CHECKLIST.md | Fully implemented | ✅ Aligned |
| Tiered KYC (Tier 1/2/3) with Fayda eSignet OIDC/PAR | DATABASE.md, API.md | `KycTier` enum, Fayda client | ✅ Aligned |
| Escrow state machine | ARCHITECTURE.md | `EscrowState` enum + service | ✅ Aligned |
| 5-stage dispute resolution | ARCHITECTURE.md | `DisputeStage` enum + service | ✅ Aligned |
| TMS/AML rules (structuring, velocity, round-amounts) | ARCHITECTURE.md | `tms-scan` worker | ✅ Aligned |
| Double-entry general ledger | DATABASE.md | `LedgerAccount/Journal/Entry` | ✅ Aligned |
| Telebirr C2B Web Checkout + RSA-PSS | ARCHITECTURE.md | `telebirr.client.ts` | ✅ Aligned |
| Telebirr B2C disbursement | ARCHITECTURE.md (updated) | `PayoutTransaction` lifecycle | ✅ Aligned |
| Phase 1 RBAC (7 staff roles) | DATABASE.md (updated) | `StaffRole` enum + permission matrix | ✅ Aligned |
| Gig marketplace | DATABASE.md (updated), API.md | `Gig/GigPackage/GigOrder/GigReview` | ✅ Aligned |
| 4-language multilingual (frontend + bot) | ARCHITECTURE.md (updated) | 314 frontend + 243 bot keys | ✅ Aligned |
| Operations Console v2 | ARCHITECTURE.md, ops/README.md | 19-page staff shell | ✅ Aligned |
| Native support chat (guest token) | API.md | Guest JWT + `requireGuestChatAccess` | ✅ Aligned |
| CBE Birr + Safaricom M-Pesa payment rails | DATABASE.md (updated) | `PaymentProvider` enum | ✅ Aligned |

## Section 2: Implementation Ahead of Docs (Resolved in This Session)

All items listed here were gaps identified in the November 2026 scan and resolved by doc updates above:

- Finance module (`/api/v1/finance/*`) — now documented
- Bot management routes (`/api/v1/telegram/*`) — now documented
- Full auth route list (21 routes) — now documented
- Full TMS route list (lift-hold, activity) — now documented
- Gig moderation path clarification (staff-only ACTIVE) — now documented
- OpenSearch integration — now documented

## Section 3: Documentation Ahead of Implementation (Pending)

| Documented Requirement | Status |
|---|---|
| Production Fayda API credentials | ❌ Pending external |
| Production PEP/sanctions source | ❌ Pending external |
| Telebirr production credential verification | ❌ Pending external |
| CBE Birr sandbox verification | ❌ Pending external |
| M-Pesa sandbox verification | ❌ Pending external |
| Production SMS credentials/templates | ❌ Pending external |
| Production Telegram push verification | ❌ Pending external |
| FIC STR filing operating procedure | ❌ Pending legal |
| Ethiopian production hosting/data residency | ❌ Pending infra |
| Automated browser tests | ❌ Not started |
| Formal accessibility audit | ❌ Not started |
| Penetration test before launch | ❌ Pending security |
