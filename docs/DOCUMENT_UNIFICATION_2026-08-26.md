# Document ↔ Codebase Unification Record

**Date:** 2026-08-26
**Scope:** Reconciliation of `Yekis_Master_Design_Legal_Compliance_Modified (2).docx` and `Master_Engineering_Roadmap_Aligned.docx` against the implemented codebase, and the first implementation pass of the agreed decisions.
**Rule:** Where the documents are marked DECIDED and the code diverges, the code was brought to the document. Where the code is ahead of the documents (reverse gaps), this record supplies corrected wording to merge into the next docx revision.

---

## Part 1 — Decisions implemented in code today

| # | Decision (source) | Implementation |
|---|---|---|
| 1 | TMS structuring = deposits **totaling >500k ETB / 7 days**; velocity = **>300% of 90-day average**; round-amounts red flag (Master Design §11.4) | `tms.service.ts` rules rewritten; new `ROUND_AMOUNTS` flag type; thresholds in `env.ts`; obsolete band/threshold config removed |
| 2 | Automated background scan every 15 minutes (Master Design §11.4) | New `tmsScan.worker.ts` + `tms-scan` queue (`TMS_SCAN_CRON`, default `*/15 * * * *`) |
| 3 | STR filed within 24h of suspicion; on confirmation freeze/suspend (Master Design §11.4) | `TransactionFlag.strDeadlineAt` set at detection; scanner raises one-time `STR_SLA_BREACH` alerts; `fileStr(suspendAccount)` suspends login/actions with dedicated audit event |
| 4 | Automatic release after **seven calendar days** (Service Agreement Clause 2.2(b)) | `AUTO_RELEASE_WINDOW_DAYS` default 5 → 7 |
| 5 | Chapa REMOVED from approved rails (PAY-002) | Client adapter, webhook route, env vars, schema enum value removed app-wide; CBE stub decoupled to `CBE_WEBHOOK_SECRET`; frontend unions/copy updated; DB row purge migration applied (enum value inertly retained until PG17+) |
| 6 | Unverified users cannot change profile (Roadmap hard-block) | `requireKycVerified("TIER_1")` added to `PATCH /api/v1/profile/me/profile` |
| 7 | Five granular consents at registration (Master Design §12.2) | `RegisterInput.consents` extended (`financialDataProcessing` required; `platformNotifications` opt-in); five `ConsentRecord`s written for email and Telegram sign-ups; unticked-by-default checkboxes rendered |

## Part 2 — Corrections where the CODEBASE IS AHEAD of the documents
*(merge into next docx revision)*

1. **Telegram bot + Mini App: already built** (Roadmap lists it as Phase 3). initData HMAC handshake, JWT issuance, wallet/jobs/KYC bot flows, and staff bot commands exist. → Change Roadmap Phase 3 item to "Telegram: shipped; remaining work = production bot hosting + webhook monitoring."
2. **Featured listings: already built** (Roadmap places monetization in Phase 4). `featuredRefresh` worker + carousel UI exist without payment attached. → Reword Phase 4 "Featured Job Listings" to "monetize existing featured placement (paid boost flow)."
3. **Browser SPA is a first-class client**, not only the Telegram Mini App. Registration, jobs, contracts, escrow dashboard, verification, staff dashboards all ship in the browser experience. → Update Master Design §21/§23 and topology diagrams to show dual front-ends (Browser SPA + Telegram).
4. **Helpdesk partially exists** (OPS-001 "tool selection pending"): an in-app support-ticket chat with staff queue/assignment/claim ships today. → Reword OPS-001 to "decide whether the in-app support chat suffices for MVP or an external tool (Freshdesk/Zendesk) is still required."
5. **Payment reconciliation sweep already runs every 10 minutes** against Telebirr's queryOrder API (payment-side reconciliation). The Roadmap's "automated daily reconciliation" item should be reworded to cover the missing piece only: **escrow-pool ↔ bank-statement reconciliation** (FIN workstream).
6. **Cooling-off interaction**: the code implements cooling-off as blocking auto-release even after submission (`Contract.cancellableUntil`). This is stricter than ESC-002's proposed "applies before work starts." Kept intentionally conservative pending legal validation — document both readings in ESC-002 notes.
7. **Compliance table statuses**: Audit-log lockdown runbook still unexecuted (TECH-002 accurate); CI/CD pipeline does not exist yet (`.github/workflows` empty) — Roadmap Phase 0 DoD "auto-run tests on every PR" is NOT met; backup/DR remains unbuilt despite being pulled forward to Phase 1.

## Part 3 — Open clashes requiring human sign-off (not resolvable by engineering)

| Item | Options | Owner |
|---|---|---|
| KYC Tier-1 paradigm | Direct VeriFayda REST + OTP/biometric (Master Design §11.2) vs eSignet OIDC/PAR (integration plan) | Product + Fayda office |
| Cooling-off vs deemed-acceptance precedence | Current strict behavior vs ESC-002 proposal | Legal counsel |
| Withholding/VAT final figures (TAX-001/002) | Pending accountant | Accountant |
| CBE integration path (PAY-004 Star Pay vs classic) | Pending CBE | Product |
| Production credentials & payout/refund tests (PAY-006) | 8-item test matrix before beta go-live | Finance + providers |

## Part 4 — Verification

- `pnpm --filter backend build` ✅
- `pnpm --filter backend test` ✅ (15/15)
- `pnpm --filter frontend build` ✅
- Migrations applied locally: `20260826090000_tms_rules_and_chapa_removal`, `20260826100000_pg16_enum_swap_and_drift_fix`
