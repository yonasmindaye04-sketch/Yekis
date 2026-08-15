# Profiles & Featured Talent — Full Fix & Implementation Plan

This addresses all 9 issues from the spec review. Items 1-6 are **already implemented and verified** against the real backend (see the attached "Profile Feature Fixes" zip). Items 7-9 are decisions, not code — they need an answer from you before the spec author continues.

---

## Already fixed (code attached)

### Fix 1 — `StaffRole` enum
**Decision made:** kept the existing `COMPLIANCE_OFFICER | ADMIN` enum as-is. Every staff route already built (KYC, disputes, TMS, top-ups) checks against these two values — renaming would break all of them for no functional gain. If the spec's `SUPPORT` role is meant to be a real, narrower permission tier (e.g., can answer chat tickets but not approve payments), that's a legitimate future addition — but it should be added as a **third value alongside** the existing two, not a replacement, and `requireStaffRole` calls updated deliberately per-route rather than assumed. Flagging this as its own follow-up decision, not folded into this fix.

### Fix 2 — KYC fields on `User`
Added `cachedKycTier` and `cachedKycStatus` to `User`, using the **real** `KycTier`/`KycStatus` enums — no invented `TIER_0`/`UNVERIFIED` values. These are a denormalized read-through cache only; `KycRecord` remains the source of truth for every access-control decision (`requireKycVerified` is untouched). The cache is written at every real transition point:
- Tier 1 auto-verification -> cache set to `VERIFIED`/`TIER_1`.
- Fayda failure or duplicate-identity fallback -> cache set to `UNDER_REVIEW`.
- A Tier 2/3 upgrade request being reviewed -> cache **deliberately left untouched** (see Fix 5 — this was a subtle but important call).
- Every manual staff decision -> see Fix 5.

### Fix 3 — `Contract.status` didn't exist
Added a real `ContractStatus` enum (`ACTIVE | COMPLETED | TERMINATED`) and field on `Contract`. It's computed and persisted by a new function, `checkAndUpdateContractCompletion(milestoneId)`, called from both `releaseMilestoneFunds` and `refundMilestoneToClient` — a contract flips to `COMPLETED` the moment every one of its milestones has landed in a terminal escrow state (`RELEASED`, `REFUNDED`, or `PARTIAL_REFUND`). `TERMINATED` is reserved for a future early-termination flow that doesn't exist in code yet — don't build against it as if it's reachable today.

### Fix 4 — Review eligibility trigger
Now cleanly defined: **`Review.isEligible` should check `Contract.status === "COMPLETED"`** (Fix 3 makes this a real, queryable field instead of an ambiguous join). This resolves the multi-milestone ambiguity — a contract with 3 milestones only becomes reviewable once all 3 have concluded, whether by clean release, refund, or dispute-driven partial split. A contract that included a resolved dispute is still reviewable once complete; the spec can add an optional "this contract included a dispute" badge on the review if that context is wanted, but eligibility itself doesn't depend on it.

### Fix 5 — Tier downgrade on rejection
Added `KycRecord.highestVerifiedTier` — the last tier that actually passed, distinct from `tier` (which can sit at a requested-but-undecided higher tier while `UNDER_REVIEW`). `reviewKycRecord` now handles both real cases explicitly:
- **Rejected, had prior verified standing** (a Tier 2/3 upgrade that didn't pan out): `tier` reverts to `highestVerifiedTier`, and — critically — the public-facing cache **stays at `VERIFIED`/prior tier**. A declined upgrade must not make an already-legitimate freelancer's badge disappear.
- **Rejected, no prior standing** (first-time review): cache genuinely shows `REJECTED`, since there's nothing to fall back to.

### Fix 6 — `earnedRange` / `totalSpent` definition
Added `User.totalEarnedNetMinor` and `User.totalSpentGrossMinor` — lifetime totals, distinct from `Wallet.balanceMinor` (which withdrawal decreases). `totalEarnedNetMinor` is incremented **net of platform fee and withholding tax** at the exact moment `releaseMilestoneFunds` runs — i.e., it's what actually reached the freelancer's wallet, not the gross milestone amount. `totalSpentGrossMinor` is incremented at webhook confirmation, matching the full amount the client was actually charged (including the client-side fee add-on). The profile endpoint should read from these two fields, converted to display ranges per the spec's existing obfuscation-tier logic — that part of the spec was already correct, it just needed a real number to bucket.

---

## Needs your decision (not code — a process/scope call)

### Item 7 — Stack: NestJS vs. Express
The spec's header says NestJS; everything actually built is Express. Before the spec author writes another line: **confirm this is Express**, unless there's a real, deliberate decision to migrate frameworks that I'm not aware of. If it's Express (likely — probably generic boilerplate from whatever generated the spec), have them re-read the existing modules (`kyc/`, `escrow/`, `disputes/`, `tms/`, `topups/`) for the actual pattern to follow: one `*.service.ts` with exported functions + custom error classes, one `*.routes.ts` with an Express `Router`, wired into `app.ts`. Building the new `users/profile` and `users/featured` module in NestJS conventions (modules/decorators/controllers) would leave you with two inconsistent architectural styles in one codebase — worth catching now rather than after it's built.

### Item 8 — `StaffRole` scope (see Fix 1 above)
Decide whether `SUPPORT` is a real near-term need or the spec author over-scoped it. If real: define exactly what it can and can't do (view chat tickets? approve top-ups? never touch KYC/disputes?) before adding it, so it's a deliberate permission boundary, not a vague third bucket.

### Item 9 — Phase 6 (moderation/CDN/load-testing) is likely premature
AWS Rekognition, ClamAV, a CDN pipeline, and 1000 req/s load targets are real infrastructure decisions with real costs — worth weighing against where the platform actually is (pre-launch, no marketing budget, roadmap's own Phase 3 KPI target is 500 users / 200 transactions, not enterprise traffic). Suggested lighter-weight substitutes for launch, upgradeable later without a rebuild:
- **Image moderation:** route uploaded avatars through the existing staff review queue pattern (same shape as KYC document review) instead of a paid AI moderation API — a human glancing at a new avatar costs nothing extra given staff already review KYC documents and receipts.
- **Virus scanning / CDN:** basic `multer` + object-store upload (the exact pattern already used for KYC documents and top-up receipts) is sufficient at launch scale; a dedicated CDN is worth adding once real traffic justifies it, not before.
- **Load testing:** defer formal load testing until pilot-launch traffic approaches the roadmap's own stated targets — testing against 1000 req/s now optimizes for a scale you're not at yet, at the cost of engineering time you don't have to spare.

**My recommendation:** greenlight Phases 1-5 of the spec as scoped (with fixes 1-6 folded in), and explicitly defer Phase 6 to "after pilot launch proves the core loop," rather than building it in parallel now.

---

## What to hand the spec author

1. The attached zip (`Profile Feature Fixes - Files to Append.zip`) — the corrected `schema.prisma`, `contracts.service.ts`, `escrow.service.ts`, and `kyc.service.ts`, ready to merge into the existing codebase before Phase 1 of their plan starts.
2. This document, so they're building against the corrected model instead of re-discovering these same conflicts mid-implementation.
3. Your answers on Items 7-9 — those change what they actually build, not just how.
