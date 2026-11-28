# Yekis Operations Console — QA Test Report

- **Target:** `http://127.0.0.1:3000` (Local development instance)
- **Tester Role:** QA Engineer (Read-only Pass 1 + Scoped Pass 2 mutations strictly on `8898` self-owned fixtures and own `qa.support@example.com` profile)
- **Evidence Root:** [test-evidence/ops](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops) (`384` Pass 1 screenshots + `16` Pass 2 screenshots = `400` PNGs)
- **Code Changes Made:** None (QA created only artifacts under [test-evidence/ops](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops); pre-existing local working-tree edits in `apps/` and `docs/` were left untouched).

---

## 1. Summary

### Overall Result Counts

| Scope / Category | PASS | FAIL | BLOCKED | NOT TESTED | Notes |
|---|---:|---:|---:|---:|---|
| **Roles Provisioned & Tested (`6` matrix roles)** | 6 | 0 | 0 | 0 | `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`, `SUPPORT` |
| **Pass 1 Page Loads across Matrix (`384` runs)** | 378 | 6 | 0 | 0 | `6` `SUPER_ADMIN` `Telegram Bot` views failed with HTTP `503`/`500` (`/telegram/health`, `/telegram/info`); **all `384`** runs also carry a translucent sticky header and `390px` / `axe-core` UI defects (tracked in Section 4) |
| **Shell, Navigation, RBAC Boundaries & Views** | 12 | 9 | 0 | 0 | Sidebar counts match (`23, 10, 11, 5, 11, 4`); `Esc/GoBack/Palette/Customizer/Bell/Overview` have defects recorded in `OPS-09`, `OPS-17`–`OPS-24` |
| **Pass 2 Scoped Workflows (`16` tested flows)** | 7 | 7 | 1 | 1 | Settling a live `PENDING`/`PROCESSING` payout via UI was **BLOCKED** (`OPS-15`); `Staff & Roles` mutations were **NOT TESTED** per safety scope |
| **Known Issues Confirmation (`7` items)** | — | — | — | — | **5 REPRODUCED**, **1 PARTIALLY REPRODUCED** (#1), **1 REFUTED (PARITY BROKEN)** (#5: Reconciliation badge does not match exceptions; System Health badge stays empty) |

### Known Issues Verdict Matrix

| # | Brief Item | Verdict | Observed Evidence |
|---|---|---|---|
| **#1** | Fee text: Receipts subtitle (old 10%/3%), Dispute split preview, Escrow fee label | **PARTIALLY REPRODUCED** | `Receipts` subtitle reads `"Manual bank and mobile-money transfers awaiting verification"`, `Escrow` reads `EST. NET RELEASE (AFTER 7.5% FEE)`, `Dispute` split preview shows `− Platform & rail fee (7.5%)` / `− Withholding tax (deferred / 0%)`. **However**, `Contracts` banner still states `"10% Platform Commission · 3% ERCA WHT"` above `"7.5% Combined Fee · WHT Deferred"`, and `Tax Reports` still states `"Monthly 3% / 30% Ethiopian Revenues & Customs Authority remittances and return filings"`. (`OPS-10`) |
| **#2** | Profile Reports `Ban & Suspend` as `COMPLIANCE_ADMIN`: does user become suspended after UI reports success? | **REPRODUCED** | No confirmation dialog. `PATCH /api/v1/staff/reports/:id` returns `200`, then `POST /api/v1/admin/users/:id/suspend` returns **`403 {"error":"PERMISSION_DENIED","required":"users.suspend"}`** (on fresh `<300s` auth) or **`401 REAUTH_REQUIRED`** (when >5m idle). On fresh auth the UI swallows the `403` and shows `"cmwyymqj7001jyohr0s3jkip1 permanently banned and account suspended."` while `isSuspended` stays **`false`**. (`OPS-06`) |
| **#3** | Disputes: `Add evidence note`, `Escalate stage`, `Send to arbitration` return `403 NOT_PARTY` for staff? | **REPRODUCED** | All three actions as `DISPUTE_MEDIATOR` on `cmwyz838900bjyohr17b7yccs` returned **`403 {"error":"FORBIDDEN","message":""}`** with toast `"FORBIDDEN"` (evidence modal remained open after error). (`OPS-07`) |
| **#4** | Receipt Approvals: does page/action work for `OPERATIONS_ADMIN` & `FINANCE_ADMIN`, or return `403`? | **REPRODUCED (`403`)** | `Receipts` is hidden from both roles' sidebars, `/#/receipts` redirects to `Command Center`, and `GET /api/v1/wallet/topups/queue` returns **`403 {"error":"PERMISSION_DENIED","required":"topups.review"}`** for both roles. (`OPS-13b`) |
| **#5** | Sidebar badges: Reconciliation matches exceptions? System Health badge ever non-zero when checks fail? | **REPRODUCED (MISMATCH)** | `Reconciliation` badge shows **`1`** (`pendingPayments`), disagreeing with **`3`** mismatches on `Reconciliation` and **`5`** `Recon Exceptions` in `Live Queue Workload`. `System Health` has **no sidebar badge** even when `CBECONFIGURED` & `MPESACONFIGURED` are `DEGRADED` and `Ledger` is `MISMATCH`. (`OPS-19`) |
| **#6** | Sensitive actions after 5m idle: re-authentication dialog or raw `REAUTH_REQUIRED`? | **REPRODUCED (SESSION WIPE)** | Tested on `COMPLIANCE_ADMIN` (`Ban & Suspend`) and `SUPER_ADMIN` (`Escrow -> Place Admin Hold`) >5m idle. Backend returns **`401 {"error":"REAUTH_REQUIRED","code":"REAUTH_REQUIRED"}`**, **no re-auth modal opens**, and `client.ts` signs the staff user out to Sign-in with `"Your session expired. Please sign in again to continue."`. (`OPS-08`) |
| **#7** | Search & shortcut label shows Command symbol on Windows | **REPRODUCED** | Topbar `Search / Jump` and Command Center `Jump` buttons display macOS **`⌘K`** on Windows 11. (`OPS-22`) |

---

## 2. Coverage Matrix (Role × Page × Theme × Width)

All 6 matrix roles were tested at **Light** and **Dark** themes across **1440 px**, **1024 px**, and **390 px** (`6` runs per permitted page = **`384` total renders**).

| Role | Expected / Observed Sidebar Pages | Matrix Runs (`Page × 2 Themes × 3 Widths`) | Forbidden Direct Routes (`/#/staff`, `/#staff`, `/staff`, `/?page=staff`, `/#/gigs`) | Console Errors / Unexpected 4xx–5xx | Keyboard & `axe-core` Summary | CSV / Error State / Shell Checks |
|---|---|---|---|---|---|---|
| **SUPER_ADMIN** (`qa.super_admin@example.com`) | **23 / 23** | `138` (`132` OK load; `6` `Telegram Bot` HTTP `503`/`500`) | N/A (note: cold `/staff` flashes public Landing Page ~1s then lands on `Command Center`) | `144` console msgs (Google GSI localhost `400` + `Telegram` `503`/`500`) | `788` `color-contrast`, `7` `scrollable-region-focusable`, `6` `select-name`; `Tab` visible outlines on Overview/Disputes; Customizer ignores `Esc` | `5+1` CSV exports downloaded (`Payments`, `Escrow`, `Reconciliation`, `Ledger`, `Audit Logs`, `Reports` -> `yekis-financial-report.csv`; `Tax Reports` lacks export); `ErrorBox` + `Retry` verified on 6 pages; `Ctrl+K` shows `78` items |
| **OPERATIONS_ADMIN** (`qa.operations_admin@example.com`) | **10 / 10** | `60` (`60` OK load) | Clean redirect to `Command Center` (cold `/staff` flashes Landing Page transiently) | `49` console msgs (`2` expected `403`s on Overview + GSI) | `372` `color-contrast`, `1` `scrollable-region-focusable`, `3` `select-name` | `1024px` drawer & `390px` bottom bar (`4` + `Menu`) open & close on `Esc` |
| **FINANCE_ADMIN** (`qa.finance_admin@example.com`) | **11 / 11** | `66` (`66` OK load) | Clean redirect to `Command Center` | `76` console msgs (`2` expected `403`s on Overview + GSI) | `451` `color-contrast`, `3` `select-name`, `3` `scrollable-region-focusable` | Shows false `DR ETB 0 / CR ETB 0 MATCHED` Ledger integrity on Overview |
| **DISPUTE_MEDIATOR** (`qa.dispute_mediator@example.com`) | **5 / 5** | `30` (`30` OK load) | Clean redirect to `Command Center` | `98` console msgs (expected `403`s on Overview + GSI) | `199` `color-contrast`, `1` `scrollable-region-focusable` | Shows clickable `Inspect` on empty `Escrow Custody Allocation` despite no Escrow access |
| **COMPLIANCE_ADMIN** (`qa.compliance_admin@example.com`) | **11 / 11** | `66` (`66` OK load) | Clean redirect to `Command Center` | `42` console msgs (expected `403`s on Overview + GSI) | `343` `color-contrast`, `3` `scrollable-region-focusable`, `3` `select-name` | `KYC` `A`/`R` hotkeys verified; `Risk & Fraud` `File STR`/`Dismiss` tested |
| **SUPPORT** (`qa.support@example.com`) | **4 / 4** | `24` (`24` OK load) | Clean redirect to `Command Center` | `98` console msgs (expected `403`s on Overview + GSI) | `160` `color-contrast` | Bell showed `5` unread notifications (`4` topups, `1` KYC) — all `5/5` inert/disabled; `Mark all read` cleared unread count |

### Permitted Pages per Role (All Rendered Light/Dark × 1440/1024/390)

- **SUPER_ADMIN (23):** `overview` (Command Center), `support`, `dispute-queue`, `risk`, `kyc`, `reports-queue`, `gigs`, `receipts`, `contracts`, `payments`, `payouts`, `escrow`, `reconciliation`, `withholding`, `ledger`, `reports`, `users`, `staff`, `featured`, `bot`, `audit`, `monitoring`, `profile`.
- **OPERATIONS_ADMIN (10):** `overview`, `support`, `dispute-queue`, `contracts`, `payments`, `payouts`, `escrow`, `users`, `monitoring`, `profile`.
- **FINANCE_ADMIN (11):** `overview`, `payments`, `payouts`, `escrow`, `reconciliation`, `withholding`, `ledger`, `reports`, `users`, `audit`, `profile`.
- **DISPUTE_MEDIATOR (5):** `overview`, `dispute-queue`, `contracts`, `users`, `profile`.
- **COMPLIANCE_ADMIN (11):** `overview`, `support`, `dispute-queue`, `risk`, `kyc`, `reports-queue`, `receipts`, `users`, `audit`, `monitoring`, `profile`.
- **SUPPORT (4):** `overview`, `support`, `users`, `profile`.

---

## 3. Money & Count Reconciliation Table

### Pass 1 Baseline Financial Figures (`SUPER_ADMIN`)

| Metric | Overview / Chart | Dedicated Workbench / Reports | Raw API / Ledger | Reconciliation / Mismatch |
|---|---|---|---|---|
| **Funds in Escrow** | `ETB 100,000` (`6 active · 0 admin hold`; `230K Milestones` donut: `Active Custody 46K 20%`, `In Review 60K 26%`, `Disputed 31K 14%`, `Released 93K 40%`) | `Escrow` page: `HELD ON THIS PAGE ETB 100,000`, `SUBMITTED FOR REVIEW 1`, `DISPUTED 2` | `2000-LIABILITY-ESCROW` ledger balance: **`-7,925,000` (`ETB -79,250`)**; active+review+disputed milestones sum to `137,000`? Check: `46K` Active Custody includes `PARTIAL_REFUND` `seed-ms-copy-2` (`ETB 6,000`) + `ESCROW_HELD` `25K` + `WORK_IN_PROGRESS` `15K` = `46K`; `Released` = `ETB 92,500` (donut rounds to `93K`) | **Mismatch:** `2000-LIABILITY-ESCROW` is negative (`ETB -79,250`); Donut `Active Custody` counts `PARTIAL_REFUND` (`ETB 6,000`) and rounds `ETB 92,500` to `93K` (`Reports` shows `ETB 92,500`). Non-`SUPER_ADMIN` roles see `ETB 100,000` even with `0 active · 0 admin hold`. |
| **Locked in Open Disputes** | `Action Center`: `ETB 64,000 of escrow stays locked`; `SLA Schedule`: `ETB 64,000`; `Workboard`: `ETB 64,000` | `Dispute Mediation`: `ESCROW IN VIEW ETB 64000.00`; `Reports` queue card: `ETB 64,000` (`Disputes`) vs `ETB 31,000` (`Admin-Held/Disputed Escrows`) | Contract `seed-contract-brand` milestones: `18,000` (`RELEASED`) + `22,000` (`DISPUTED`) + `15,000` (`WORK_IN_PROGRESS`) + `9,000` (`DISPUTED`) = `64,000` | **Critical Overstatement (`ETB 33,000` excess):** Dispute UI/Overview sums all 4 milestones (`ETB 64,000`) instead of only `DISPUTED` milestones (`ETB 31,000`). Pass 2 `8898` showed the same bug: `ETB 2,000` (`2` milestones) previewed instead of `ETB 1,000` disputed milestone. |
| **Pending Payouts** | `2` (`ETB 12,935`) on `Overview`; `Workboard`: `7,960 + 4,975 = 12,935` | `Payouts` list gross amounts: `ETB 8,000` (`seed-payout-pending`) + `ETB 5,000` (`seed-payout-processing`) = **`ETB 13,000`** (`net`: `7,960 + 4,975 = 12,935`); `Reports` queue card: `ETB 12,935` (`2 item(s)`) | `Reports` confirmed payouts: **`ETB 56,715`** (Telebirr `41,790` + CBE `14,925` = `56,715`) | KPI/Action Center/Reports use **net** (`ETB 12,935`) while `Payouts` list cards display **gross** (`ETB 13,000`). Non-finance/ops roles show **`ETB 0`**. |
| **Inbound Funding & Fees** | `7D`: `ETB 0`; `30D`: `ETB 0`; `90D`: `ETB 185,000` (`6 tx`, Ledger fees `ETB 21,790`); `12M`: `ETB 213,000` (`8 tx`, Ledger fees `ETB 21,790`) | `Payments` (`CONFIRMED VOLUME (PAGE)`): **`ETB 213,000`**; `Reports` & CSV (`yekis-financial-report.csv`): `Settled Volume ETB 213,000`, `Platform Commission Fees ETB 21,790`, `Failed Inbound 1`, `Failed Outbound 0` | `reports/summary` rail bars: Telebirr `114,000` + CBE `66,000` + M-Pesa `15,000` = **`ETB 195,000`**; Ledger `4000-REVENUE-PLATFORM-FEES` balance = **`ETB 23,172.50`** (`2,317,250` minor) | **2 Mismatches:** (1) `Reports` rail bars sum `ETB 195,000` vs `ETB 213,000` settled volume (**`ETB 18,000` gap**); (2) Ledger revenue account `4000-REVENUE-PLATFORM-FEES` is `ETB 23,172.50` vs `Overview`/`Reports` `ETB 21,790` (**`ETB 1,382.50` difference**). |
| **Ledger Trial Balance** | `SUPER_ADMIN` Infrastructure card: **`DR ETB 15,375 / CR ETB 16,412.5`** **`DISCREPANCY`** (`FINANCE_ADMIN` / `DISPUTE_MEDIATOR` / `SUPPORT` show **`DR ETB 0 / CR ETB 0 MATCHED`**) | `Ledger` page: **`Integrity: MISMATCH — debits ETB 15,375 · credits ETB 16,412.5`** (`39` entries across `40` journals). Post-Pass 2 `System Health`: **`DR ETB 26,375 / CR ETB 27,412.5 MISMATCH`** | `/api/v1/admin/ledger`: `isBalanced: false`, `discrepancyMinor: 103750` (**`ETB 1,037.50`**), `274` accounts (`sum balanceMinor = 0`) | **Critical (`P0`):** Real `ETB 1,037.50` debit/credit imbalance (`39` entries / `40` journals) is **hidden** from Action Center & sidebar badges, and `FINANCE_ADMIN` receives a false **`MATCHED` (`0 / 0`)** status. |
| **Withholding Tax (WHT)** | Not shown on Overview | `Reports` & CSV: **`ETB 3,000`**; `Tax Reports` UI: **`TOTAL WHT LIABILITY ETB 0`**, `0 / 0`, `"No withholding tax periods found."` | Ledger `2050-LIABILITY-WITHHOLDING-ERA`: **`ETB 3,000`**; `/api/v1/finance/withholding`: `2026-10` = `300,000` minor (`ETB 3,000`, `284` tx) | **Mismatch:** `Tax Reports` page renders **`ETB 0` / empty** despite `ETB 3,000` in `/finance/withholding`, Ledger `2050-LIABILITY-WITHHOLDING-ERA`, and `Reports`. |
| **Pass 2 `PARTIAL_SPLIT` Settlement (`8898`)** | N/A | `DisputeQueue` preview at `50%` split: Client `ETB 1,000.00`, Freelancer gross `ETB 1,000.00`, fee `7.5%` (`ETB 75.00`), net **`ETB 925.00`** | Actual DB wallets after settlement: `freelancer` (`cmwyymq0t000nyohrjyfy4uwd`) **`46` minor (`ETB 0.46`)**; `client` refunded **`99,950` minor (`ETB 999.50`)** (`525,000 -> 624,950`) | **Critical (`P0`):** `opsApi.ts:1279` sent slider percentage `50` as `freelancerShareMinor: 50` (ETB 0.50 gross), crediting **ETB 0.46** instead of **ETB 462.50** (and UI preview had shown **ETB 925.00**). |

### Pass 1 Queue Counts Across Surfaces (`SUPER_ADMIN`)

| Queue | Sidebar Badge | Overview KPI Card | Live Queue Workload | Action Center | Dedicated Page / Notes |
|---|---|---|---|---|---|
| **Support** | `3` | Inside `Compliance Queues: 8` (`3 Help`) | `3` | `0` items | `Support Desk`: `3` open |
| **Disputes** | `2` | `Open Disputes: 2` (`1 SLA breached`) | `2` | `1` item (`1050.65h` SLA breach) | `Dispute Mediation`: `1` in `STAGE 3 MEDIATION`, `2` open total |
| **Risk & AML** | `2` | Inside `Compliance Queues: 8` (`2 AML`) | `2` | `2` items (`VELOCITY`, `STRUCTURING`) | `Risk & Fraud`: `2` open (`3` after Pass 2 flag; after dismiss UI showed `2` while badge stayed `3`) |
| **KYC Reviews** | `1` | Inside `Compliance Queues: 8` (`1 KYC`) | `1` | `1` item (`Clear 1 identity review(s)`) | `KYC Reviews`: `1` awaiting review (in Pass 2 after approve, queue `1` vs badge `2`) |
| **Profile Reports** | `2` | Omitted from `Compliance Queues` headline (`1+2+3=6`, yet headline=`8`; expanded shows only `KYC 1 + Reports 2 = 3`) | Not shown | `1` grouped item (`Moderate 2 profile report(s)`) | `Profile Reports`: `2` open (in Pass 2 after resolving report, `0` open vs badge `2`) |
| **Receipts** | `2` | Inside `Pending Payouts` expanded (`Pending wallet topups 2`) | Not shown | `0` items | `Receipts`: `2` pending |
| **Payouts** | `2` | `Pending Payouts: 2` (`ETB 12,935`) | `2` | `1` grouped item (`Settle 2 pending payout(s)`) | `Payouts`: `1 PENDING`, `1 PROCESSING` |
| **Reconciliation** | `1` | `Funds in Escrow` expanded: `Recon exceptions 5` | `5` | `3` items (`DEMO-PAY-0006/0005/0008`, all `ETB 0`!) | `Reconciliation`: `3` mismatches, `5` matched, `1` awaiting settlement (`DEMO-PAY-0009` `+ETB 26,000`), `Reports`: `5` items / `ETB 26,000` |
| **Users** | — | — | `18 users` | — | `Users`: `18` rows; `Reports`: `14 Clients + 5 Freelancers = 19` |
| **System Health** | None (`null`) | Infrastructure card (`2` failed checks + `Ledger DISCREPANCY`) | — | `2` items (`cbeConfigured`, `mpesaConfigured`; no Ledger alert) | `System Health`: `2` `DEGRADED`, `Ledger: MISMATCH` |

---

## 4. Defect List (Sorted by Severity)

### P0 — Integrity or Money Defects

#### `OPS-01` — `PARTIAL_SPLIT` dispute resolution treats slider percentage as minor currency (`ETB 0.46` paid instead of `ETB 462.50` / UI preview `ETB 925.00`)
- **Severity:** `P0` | **Role:** `DISPUTE_MEDIATOR`, `SUPER_ADMIN` | **Relates to:** Dispute Resolution, Money Reconciliation, Known Issue #1 context
- **Steps to Reproduce:** Log in as `DISPUTE_MEDIATOR` -> open `Dispute Mediation` -> select dispute `cmwyz838900bjyohr17b7yccs` (`QA P2 Dispute Milestone 8898`, ETB 1,000 milestone on ETB 2,000 contract) -> `Claim case` -> select `Partial Split` (`50%`) -> enter rationale -> click `Confirm Final Resolution`.
- **Expected vs Actual:** Expected ETB 500.00 refunded to client and ETB 500.00 gross (`ETB 462.50` net after 7.5% fee) credited to freelancer. Actual UI preview showed `ETB 1,000.00` refund / `ETB 925.00` net freelancer, and `opsApi.ts:1279` sent `freelancerShareMinor: body.split` (`50` minor = ETB 0.50), crediting **ETB 0.46 (`46` minor)** to `qa.p2.freelancer.8898` and refunding **ETB 999.50 (`99,950` minor)** to `qa.p2.client.8898`.
- **Evidence:** [mediator-dispute-resolved.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/mediator-dispute-resolved.png); `pass2-batchB.json` (`splitMathSnippet`), `pass2-finance.json` (`wallets8898: { freelancer: 46, client: 624950 }`), [opsApi.ts#L1272-L1280](file:///c:/Users/Za/Desktop/project/Yekis/apps/frontend/src/pages/ops/opsApi.ts#L1272-L1280).

#### `OPS-02` — Disputed escrow figures sum entire contract milestones instead of disputed milestone(s) (`2x`–`2.06x` overstatement)
- **Severity:** `P0` | **Role:** All roles seeing Disputes / Overview / Reports | **Relates to:** Overview Integrity (Locked dispute amounts & Reports)
- **Steps to Reproduce:** Inspect `Brand identity for a coffee exporter` (`seed-contract-brand`) across `Command Center` Action Center, `Operations Console -> SLA Schedule / Workboard`, `Dispute Mediation` (`ESCROW IN VIEW`), and `Reports`. Compare with `Escrow` milestone states.
- **Expected vs Actual:** Expected `ETB 31,000` (`Brand guidelines` `ETB 22,000` + `Packaging templates` `ETB 9,000`, the two `DISPUTED` milestones). Actual displays **`ETB 64,000`** everywhere because `Logo concepts` (`ETB 18,000`, `RELEASED`) and `Social media kit` (`ETB 15,000`, `WORK_IN_PROGRESS`) are summed into `seed-contract-brand`. Same defect recurred in Pass 2 (`8898` showed `ETB 2,000` instead of `ETB 1,000`).
- **Evidence:** [dispute-queue-light-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/DISPUTE_MEDIATOR/dispute-queue-light-1440.png), [superadmin-ops-sla.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/superadmin-ops-sla.png), [overview-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/overview-dark-1440.png).

#### `OPS-03` — Double-entry Ledger Trial Balance imbalance (`ETB 1,037.50` / negative Escrow Liability) hidden from alerts and falsely shown as `MATCHED` (`0 / 0`) to `FINANCE_ADMIN`
- **Severity:** `P0` | **Role:** `SUPER_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `SUPPORT` | **Relates to:** Ledger Integrity & Role Degradation
- **Steps to Reproduce:** Open `Command Center`, `Ledger`, and `System Health` as `SUPER_ADMIN`, then open `Command Center` as `FINANCE_ADMIN`.
- **Expected vs Actual:** Expected a balanced ledger (`DR == CR`) and clear denial/lock for roles without `monitoring.view`. Actual `/api/v1/admin/ledger` reports `isBalanced: false`, `totalEntries: 39` across `40` journals, `DR ETB 15,375 / CR ETB 16,412.5` (discrepancy **`ETB 1,037.50`** before Pass 2; `DR ETB 26,375 / CR ETB 27,412.5` after), and `2000-LIABILITY-ESCROW` = **`ETB -79,250`**. No Action Center banner or `System Health` badge surfaces this fault, and `FINANCE_ADMIN` (who owns `Ledger`) sees **`DR ETB 0 / CR ETB 0 MATCHED`** on `Command Center`.
- **Evidence:** [ledger-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/ledger-dark-1440.png); `matrix-FINANCE_ADMIN.json` (`Double-Entry Trial Balance DR ETB 0 / CR ETB 0 MATCHED`), `verify-remaining.json` (`sysHealthSnippet`).

#### `OPS-04` — Action Center flags `ETB 0` reconciliation variances while omitting `DEMO-PAY-0009` (`+ETB 26,000` mismatch)
- **Severity:** `P0` | **Role:** `SUPER_ADMIN`, `FINANCE_ADMIN` | **Relates to:** Overview Integrity (Action Center & Reconciliation counts)
- **Steps to Reproduce:** Compare `Command Center -> Action Center` reconciliation items with `Reconciliation Workbench`.
- **Expected vs Actual:** Expected Action Center to rank real discrepancy `DEMO-PAY-0009` (`+ETB 26,000`) and never show `ETB 0` variance items. Actual Action Center lists `DEMO-PAY-0006`, `DEMO-PAY-0005`, `DEMO-PAY-0008` all reading **`"Rail and ledger differ by ETB 0 — clear before the next settlement run"`** and omits `DEMO-PAY-0009`. Meanwhile Sidebar badge reads `1`, `Reconciliation` shows `3` mismatches, and `Live Queue Workload` reads `5`.
- **Evidence:** [overview-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/overview-dark-1440.png), [reconciliation-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/reconciliation-dark-1440.png).

#### `OPS-05` — Cross-page revenue, rail throughput, WHT, and user count disagreements
- **Severity:** `P0` | **Role:** `SUPER_ADMIN`, `FINANCE_ADMIN` | **Relates to:** Overview Integrity (Money & count reconciliation)
- **Steps to Reproduce:** Compare `Overview`, `Ledger`, `Reports`, `Tax Reports`, and `Users` / `Live Queue Workload`.
- **Expected vs Actual:** (1) `Overview` (`Ledger platform fees collected`) & `Reports` report `ETB 21,790` vs `Ledger` `4000-REVENUE-PLATFORM-FEES` `ETB 23,172.50` (`ETB 1,382.50` gap). (2) `Reports` settled volume is `ETB 213,000` while rail bars (`114K + 66K + 15K`) total `ETB 195,000` (`ETB 18,000` missing). (3) `Reports` & `2050-LIABILITY-WITHHOLDING-ERA` report `ETB 3,000` WHT while `Tax Reports` renders `TOTAL WHT LIABILITY ETB 0` (`No withholding tax periods found.`). (4) `Users` / `Live Queue Workload` report `18` users vs `Reports` `19` (`14` Clients + `5` Freelancers).
- **Evidence:** [reports-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/reports-dark-1440.png), [withholding-light-390.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/FINANCE_ADMIN/withholding-light-390.png), `verify-remaining.json` (`taxFeeSnippet`), `superadmin-recon.json` (`/api/v1/admin/ledger`, `/api/v1/admin/reports/summary`).

---

### P1 — Broken Functionality or Misleading Behaviour

#### `OPS-06` — `Profile Reports -> Ban & Suspend` as `COMPLIANCE_ADMIN` reports success while leaving user unsuspended (`403` / `401` swallowed)
- **Severity:** `P1` | **Role:** `COMPLIANCE_ADMIN` | **Relates to:** Known Issue #2 (**REPRODUCED**)
- **Steps to Reproduce:** Log in fresh as `COMPLIANCE_ADMIN` -> open `Profile Reports` -> select open report against `qa.p2.badactor.8898` -> click `Ban & Suspend`.
- **Expected vs Actual:** Expected `COMPLIANCE_ADMIN` either not to see `Ban & Suspend`, or to receive an explicit error and no suspension success toast. Actual: UI has no confirmation dialog; `PATCH /api/v1/staff/reports/cmwyztvza00e3yohrlfoukb32` returns `200`, `POST /api/v1/admin/users/cmwyymqj7001iyohr3hdgpd3o/suspend` returns **`403 {"error":"PERMISSION_DENIED","required":"users.suspend"}`** (`401 REAUTH_REQUIRED` when >5m idle), toast displays **`"cmwyymqj7001jyohr0s3jkip1 permanently banned and account suspended."`**, and `isSuspended` remains **`false`**.
- **Evidence:** [compliance-fresh-ban-suspend.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/compliance-fresh-ban-suspend.png), [compliance-profile-report-ban.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/compliance-profile-report-ban.png); `pass2-batchB.json`.

#### `OPS-07` — `Disputes`: `Add evidence note`, `Escalate stage`, and `Send to arbitration` return `403 FORBIDDEN` for staff
- **Severity:** `P1` | **Role:** `DISPUTE_MEDIATOR`, `OPERATIONS_ADMIN`, `COMPLIANCE_ADMIN`, `SUPER_ADMIN` | **Relates to:** Known Issue #3 (**REPRODUCED**)
- **Steps to Reproduce:** Log in as `DISPUTE_MEDIATOR` -> open `Dispute Mediation` -> select `8898` dispute (`STAGE_3_MEDIATION`) -> click `Add evidence note` (submit >=10 chars), `Escalate stage`, and `Send to arbitration`.
- **Expected vs Actual:** Expected mediator workflow buttons either to execute for staff or be hidden/disabled for non-eligible stages. Actual: `/evidence`, `/escalate`, and `/arbitration` all return **`403 {"error":"FORBIDDEN","message":""}`**, showing toast `"FORBIDDEN"` and leaving the evidence modal open.
- **Evidence:** `pass2-batchB.json` (`netMutations` lines 492–509, `evNoteFlow.toasts: ["FORBIDDEN"]`).

#### `OPS-08` — Sensitive actions after 5 minutes idle eject staff session instead of showing re-authentication dialog
- **Severity:** `P1` | **Role:** All staff roles | **Relates to:** Known Issue #6 (**REPRODUCED**)
- **Steps to Reproduce:** Wait >5m after login (token refreshed via `/auth/refresh` so `iat - auth_time > 300s`) -> perform `Escrow -> Place Admin Hold` (`SUPER_ADMIN`) or `Profile Reports -> Ban & Suspend` (`COMPLIANCE_ADMIN`).
- **Expected vs Actual:** Expected an in-console re-authentication dialog (or clean error handling). Actual: API returns **`401 {"error":"REAUTH_REQUIRED","code":"REAUTH_REQUIRED"}`**, no dialog opens (`hasReauthDialog: false`), and `client.ts` clears local auth and signs the staff user out to Sign-in (`"Your session expired. Please sign in again to continue."`).
- **Evidence:** [superadmin-idle-reauth.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/superadmin-idle-reauth.png); `pass2-support-idle.json` (`idleReauth`).

#### `OPS-09` — Role Degradation: forbidden KPI/Overview panels display `0` or `"Within SLA window"` instead of locked/hidden
- **Severity:** `P1` | **Role:** `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`, `SUPPORT` | **Relates to:** Role-Degradation Checks
- **Steps to Reproduce:** Inspect `Command Center` across all 5 non-`SUPER_ADMIN` roles.
- **Expected vs Actual:** Expected inaccessible data to show `-`, lock, or be hidden — never `0` or misleading status text. Actual: (1) `FINANCE_ADMIN`, `COMPLIANCE_ADMIN`, `SUPPORT` show `Open Disputes: 2` **`Within SLA window`** despite 1 breached dispute. (2) `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`, `SUPPORT` show `Pending Payouts: 2` **`ETB 0`**, `Funds in Escrow: ETB 100,000` (`0 active · 0 admin hold`), and a clickable **`Inspect`** link on an empty `Escrow Custody Allocation` card (`Escrow` page is forbidden). (3) `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `SUPPORT` show `Compliance Queues: 6` (`0 AML`) and `Open AML Flags: 0` / `Recon Exceptions: 0`.
- **Evidence:** [overview-dark-1024.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/OPERATIONS_ADMIN/overview-dark-1024.png); `matrix-*.json` (`overviewDegradation`).

#### `OPS-10` — Legacy `10%` / `3%` / `30%` fee & WHT copy persists on `Contracts` and `Tax Reports`
- **Severity:** `P1` | **Role:** `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR` | **Relates to:** Known Issue #1 (**PARTIALLY REPRODUCED**)
- **Steps to Reproduce:** Open `Contracts` and `Tax Reports` (`Withholding`).
- **Expected vs Actual:** Expected fee labels everywhere to align with active config (`7.5% Combined Fee · WHT Deferred / 0%`). Actual: `Receipts`, `Escrow`, and `Disputes` match (`7.5%` / `0%`), whereas `Contracts` displays **`"10% Platform Commission · 3% ERCA WHT"`** alongside `"7.5% Combined Fee · WHT Deferred"`, and `Tax Reports` reads **`"Monthly 3% / 30% Ethiopian Revenues & Customs Authority remittances and return filings"`**.
- **Evidence:** `verify-remaining.json` (`taxFeeSnippet`), `superadmin-followup.json` (`Contracts`), `edges-verify.json`.

#### `OPS-11` — `Users` detail moderation reverts button state immediately (`withUserDetail` overwrites state with stale row closure) & shows `PENDING` for `TIER_2 VERIFIED`
- **Severity:** `P1` | **Role:** `OPERATIONS_ADMIN`, `COMPLIANCE_ADMIN`, `SUPER_ADMIN`, `DISPUTE_MEDIATOR`, `FINANCE_ADMIN`, `SUPPORT` | **Relates to:** Pass 2 Users Suspend/Reinstate & Pass 1 KYC consistency
- **Steps to Reproduce:** As `OPERATIONS_ADMIN`, open `Users -> qa.p2.badactor.8898` -> `Suspend account` -> enter rationale -> `Confirm Suspend` (or later click `Reinstate account`). Also view `qa.p2.kycuser.8898` (`TIER_2 VERIFIED`).
- **Expected vs Actual:** After suspending, expected detail button to stay `Reinstate account` (`SUSPENDED`). Actual: toast confirms `"qa.p2.badactor.8898@example.com suspended."` (`USER_SUSPENDED` written), then `openDetail()` re-runs `withUserDetail(row, raw)` using stale `row.suspended` from before `reload()`, reverting the UI back to **`Suspend account`** (`Reinstate account` cannot be clicked until full reload). Reverse occurred on Reinstate (`Reinstate account` & `SUSPENDED` stayed visible after `"reinstated."` toast). Additionally, `withUserDetail` uses `cachedKycStatus`, displaying `KYC STATUS: PENDING` on verified `qa.p2.kycuser.8898`.
- **Evidence:** [opsadmin-user-suspended.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/opsadmin-user-suspended.png), [opsadmin-user-reinstated.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/opsadmin-user-reinstated.png), [compliance-kyc-force-rereview.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/compliance-kyc-force-rereview.png); [opsApi.ts#L434-L437](file:///c:/Users/Za/Desktop/project/Yekis/apps/frontend/src/pages/ops/opsApi.ts#L434-L437).

#### `OPS-12` — `KYC Reviews` approves immediately on `A` hotkey without confirmation, misattributes AuditLog actor to applicant, and leaves queue badges stale
- **Severity:** `P1` | **Role:** `COMPLIANCE_ADMIN`, `SUPER_ADMIN` | **Relates to:** Pass 2 KYC, Risk, Profile Reports & Audit Log
- **Steps to Reproduce:** Open `KYC Reviews` (`qa.p2.kycuser.8898`, `TIER_2 UNDER_REVIEW`) -> press `A` -> check Audit Log and sidebar badge. Also dismiss a Risk flag and ban-resolve a Profile Report and inspect sidebar badges.
- **Expected vs Actual:** Expected confirmation prompt before KYC approval, staff user recorded as AuditLog actor, and badges to decrement. Actual: `A` approves immediately (`TIER_2 VERIFIED`); `KYC_MANUALLY_VERIFIED` records `actor: cmwyymq9m0014yohrtbmmwpa4` / `cmwz00b3600g2yohrixw8smey` (applicant ID) instead of `cmwywe1e0000g14jzmzwp47si` (`COMPLIANCE_ADMIN`); badges stay stale (`KYC Reviews 2` vs `1` awaiting, `Risk & Fraud 3` vs `2` awaiting, `Profile Reports 2` vs `0` open).
- **Evidence:** [compliance-kyc-approved.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/compliance-kyc-approved.png), [compliance-risk-dismissed.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/compliance-risk-dismissed.png); `pass2-batchB.json` (`auditRecent` lines 116–121), `pass2-part1.json`.

#### `OPS-13` — `Receipts`: missing confirmation on `Approve & credit`, `Reject` button stays enabled under minimum length, and Eye preview button does not open viewer
- **Severity:** `P1` | **Role:** `COMPLIANCE_ADMIN`, `SUPER_ADMIN` | **Relates to:** Pass 2 Receipts
- **Steps to Reproduce:** Open `Receipts` -> click Eye icon on `QA-P2-APPR-8898`, click `Reject Top-Up` and enter 2 chars (`2/5 MIN`), then click `Approve & credit`.
- **Expected vs Actual:** Expected receipt viewer modal to open, `Reject` disabled until 5 chars, and confirmation before crediting wallet. Actual: Eye button opened no dialog or `.viewer`; `Reject Top-Up` modal button remained enabled at `2/5 MIN`; `Approve & credit` executed immediately without confirmation (`ETB 5,000 -> ETB 7,500`).
- **Evidence:** [compliance-receipt-approved.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/compliance-receipt-approved.png); `pass2-part1.json`.

#### `OPS-13b` — `Receipts` access denied (`403`) for `OPERATIONS_ADMIN` and `FINANCE_ADMIN`
- **Severity:** `P1` | **Role:** `OPERATIONS_ADMIN`, `FINANCE_ADMIN` | **Relates to:** Known Issue #4 (**REPRODUCED**)
- **Steps to Reproduce:** Sign in as `OPERATIONS_ADMIN` or `FINANCE_ADMIN` -> check sidebar, navigate to `/#/receipts`, and inspect `/api/v1/wallet/topups/queue`.
- **Expected vs Actual:** `Receipts` is omitted from sidebar, `/#/receipts` redirects to `Command Center`, and `GET /api/v1/wallet/topups/queue` returns **`403 {"error":"PERMISSION_DENIED","required":"topups.review"}`**.
- **Evidence:** `pass2-part1.json` (`knownIssue4_ReceiptsAccess`), `edges-verify.json`.

#### `OPS-14` — `Telegram Bot` page returns `503` and `500` on load
- **Severity:** `P1` | **Role:** `SUPER_ADMIN` | **Relates to:** Permitted Page Smoke Test
- **Steps to Reproduce:** Open `Telegram Bot` (`bot`) in `light`/`dark` across `1440`/`1024`/`390`.
- **Expected vs Actual:** Expected clean status read or handled degraded card without unhandled 5xx responses. Actual: `GET /api/v1/telegram/health` returns **`503`** and `GET /api/v1/telegram/info` returns **`500`** on every load.
- **Evidence:** [bot-light-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/bot-light-1440.png); `matrix-SUPER_ADMIN.json` (`unexpectedHttp`), `superadmin-summary.txt`.

#### `OPS-15` — Marketplace/Withdrawal setup blockers: Client dashboard crashes on TDZ (`metaFor`), post-signup `/auth/phone/verify` lacks `optionalAuth`, and dev withdrawal fails with `500`
- **Severity:** `P1` | **Role:** End-user Pass 2 fixtures impacting `Payouts` verification | **Relates to:** Pass 2 Payout Creation Blockers
- **Steps to Reproduce:** (a) Log in via browser as `qa.p2.client.8898`. (b) Call `POST /api/v1/auth/phone/code` + `verify` with Bearer token on an existing user (`phoneVerified: false`). (c) Call `POST /api/v1/escrow/wallet/withdraw` (`TELEBIRR`) after pre-signup phone verification.
- **Expected vs Actual:** (a) Client UI crashes immediately with `"Cannot access 'metaFor' before initialization"`. (b) `phone-verification.routes.ts` mounts `/phone/code` and `/phone/verify` without `optionalAuth`, leaving `req.user` undefined so existing users cannot set `phoneVerifiedAt`. (c) `withdraw` hits stub `Telebirr` (`HTTP 404`), creates `PayoutTransaction` with `status: "FAILED"` (`cmwz3x23800kpyohrchoiquca`), rolls back wallet, and returns **`500 INTERNAL_ERROR`**, blocking creation of any new `PENDING` test payout.
- **Evidence:** [client-marketplace-crash.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/client-marketplace-crash.png); [phone-verification.routes.ts#L91-L143](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/src/modules/auth/phone-verification.routes.ts#L91-L143), [escrow.service.ts#L1180-L1230](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/src/modules/escrow/escrow.service.ts#L1180-L1230).

#### `OPS-16` — `Payouts` leaves `Confirm Disbursement` enabled on `FAILED` payouts (`409` on click); `Payments`/`Reconciliation` show removed `CHAPA` rail
- **Severity:** `P1` | **Role:** `FINANCE_ADMIN`, `OPERATIONS_ADMIN`, `SUPER_ADMIN` | **Relates to:** Pass 2 Payouts & Pass 1 Payments/Reconciliation
- **Steps to Reproduce:** Open `Payouts` -> select `FAILED` payout `cmwz3x23800kpyohrchoiquca` -> enter `QA-P2-PO-8898` -> click `Confirm Disbursement`. Also inspect `DEMO-PAY-0009` in `Payments` and `Reconciliation`.
- **Expected vs Actual:** Expected settlement controls disabled on terminal `FAILED` payouts (`Fail & Re-Credit Wallet` is disabled, `Confirm Disbursement` is enabled -> clicking yields `409 "Cannot settle a payout in state FAILED."`). Additionally, `DEMO-PAY-0009` displays **`● CHAPA`** (removed integration) paired with `1020 · CBE Birr Clearing`.
- **Evidence:** [finance-payout-8898.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/finance-payout-8898.png), [payments-dark-1024.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/FINANCE_ADMIN/payments-dark-1024.png), [reconciliation-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/reconciliation-dark-1440.png); `pass2-finance.json`.

---

### P2 — Usability, Accessibility & Responsive Layout Defects

#### `OPS-17` — Automated accessibility (`axe-core`) failures across all 6 roles (`select-name`, `color-contrast`, `scrollable-region-focusable`)
- **Severity:** `P2` | **Role:** All 6 roles | **Relates to:** Accessibility & Dark Mode Readability
- **Steps to Reproduce:** Run `axe-core` scan across permitted pages in both themes and 3 widths.
- **Expected vs Actual:** Expected zero critical/serious WCAG 2 AA violations. Actual across `matrix-*.json`:
  - **`select-name` (critical):** `<select className="sel">` in `Profile Reports` (`#report-enforcement-note`) and `Escrow` lack accessible labels (`SUPER_ADMIN`: `6`, `OPERATIONS_ADMIN`: `3`, `FINANCE_ADMIN`: `3`, `COMPLIANCE_ADMIN`: `3`).
  - **`color-contrast` (serious):** Dark mode `#ffffff` on `#22c55e` (ratio `2.27`, `.btn-primary`), `#ffffff` on `#059669` (`3.76`, `.btn-success` in `Payouts`), `#ef4444` on `#132422` (`4.28`, `Reconciliation` diff); Light mode `#16a34a` on `#f1f5f9` (`3.0`, `.brand-tag`), `#d97706` on `#ffffff` (`3.18`, `.pill.p-amber`).
  - **`scrollable-region-focusable` (serious):** `.qd-body` (`Profile Reports`), `.tbl-wrap` (`Ledger`), and mobile tables (`Contracts` `390px`) scroll without keyboard focusability.
- **Evidence:** [reports-queue-light-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/COMPLIANCE_ADMIN/reports-queue-light-1440.png), [reconciliation-light-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/FINANCE_ADMIN/reconciliation-light-1440.png); `matrix-*.json` (`axeSummary`).

#### `OPS-18` — `390px` mobile layout collisions, clipping, blank search spacers, and horizontal overflow
- **Severity:** `P2` | **Role:** All 6 roles (`390px` width) | **Relates to:** Matrix `390px` Visual Review
- **Steps to Reproduce:** Set viewport to `390×844` on `Command Center`, `Support Desk`, `Dispute Mediation`, `Contracts`, `Tax Reports`, `Reports`, `Users`.
- **Expected vs Actual:**
  1. Topbar breadcrumb collides under right-side header icons (`Support D...`, `Di...te M...o`, `C...ct`, `Re...`, `Us...`).
  2. Queue/table pages render an oversized empty padding box above `.f-search` input (`Support Desk`, `Dispute Mediation`, `Contracts`, `Users`).
  3. `Reports` & `Tax Reports` KPI labels clip (`WITHHOLDING TRANSAC`, `SETTLED PAYMENT VOLU`, `PLATFORM COMMISSION`, `WITHHOLDING (DEFERRE`, `FAILED INBOUND PAYMEI`, `FAILED OUTBOUND PAYO`) and `Reports` renders two charts side-by-side in narrow columns.
  4. `Command Center` `Recent Audit Activity` timestamps overflow horizontally (`12` overflowing elements on `390px` for `SUPPORT` / `DISPUTE_MEDIATOR`, `9` for `SUPER_ADMIN`).
  5. Mobile bottom bar truncates labels with ellipses (`Command...`, `Support D...`, `Dispute M...`, `Risk & Fra...`).
- **Evidence:** [support-dark-390.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPPORT/support-dark-390.png), [dispute-queue-dark-390.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/DISPUTE_MEDIATOR/dispute-queue-dark-390.png), [withholding-light-390.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/FINANCE_ADMIN/withholding-light-390.png), [reports-light-390.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/reports-light-390.png), [contracts-dark-390.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/contracts-dark-390.png), [users-dark-390.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/OPERATIONS_ADMIN/users-dark-390.png).

#### `OPS-19` — Sidebar badges disagree with actual queue/health states
- **Severity:** `P2` | **Role:** `SUPER_ADMIN`, `FINANCE_ADMIN`, `COMPLIANCE_ADMIN`, `OPERATIONS_ADMIN` | **Relates to:** Known Issue #5 (**REPRODUCED**)
- **Steps to Reproduce:** Compare `Reconciliation` and `System Health` sidebar badges against `Reconciliation` (`3` mismatches, `5` exceptions) and `System Health` (`2` `DEGRADED` checks, `Ledger: MISMATCH`).
- **Expected vs Actual:** `Reconciliation` badge shows `1` (tracks only `pendingPayments`), and `System Health` displays **no badge** (`"System Health"`).
- **Evidence:** [monitoring-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/monitoring-dark-1440.png), [reconciliation-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/reconciliation-dark-1440.png); `verify-remaining.json` (`sysBadge`).

#### `OPS-20` — Shell navigation & dialog focus defects (`Customizer` ignores `Esc`, `history.back()` exits app, cold `/staff` flashes Landing Page, `Action Center` `Done` not persisted, `<div class="doc-tile">` non-focusable)
- **Severity:** `P2` | **Role:** All roles | **Relates to:** Shell, Keyboard-only Pass & Action Center
- **Steps to Reproduce:** (a) Open `Customize` (`sh-sheet-backdrop`) and press `Esc` or `Tab`. (b) Navigate inside Ops Console and trigger browser Back (`page.goBack()`). (c) Open `/staff` directly. (d) Click `Done` on an Action Center item, refresh, and open a second session. (e) Tab through `Payouts`/`Escrow` document inspection tiles.
- **Expected vs Actual:** (a) `Customizer` ignores `Esc` (`custStillOpenAfterEsc: true`) and does not trap `Tab` focus inside the sheet. (b) Browser Back leaves Ops Console (`about:blank`) because view navigation does not push URL history entries. (c) Cold `/staff` flashes public Landing Page (`Find the right expertise.`) before redirecting to `Command Center`. (d) `Done` resets after refresh and is unseen in a second session (`local`-state only). (e) Voucher/deliverable tiles in `Escrow` and `Payouts` are `<div class="doc-tile">` elements (`tabindex` absent), unreachable by keyboard.
- **Evidence:** `superadmin-deep.json`, `superadmin-followup.json`, `edges-verify.json`, `verify-remaining.json` (`custStillOpenAfterEsc: true`), [payouts-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/payouts-dark-1440.png).

#### `OPS-21` — Search misses, mismatched Violation filter enums, raw `1056.28h`/camelCase/error codes, inert `SUPPORT` notifications, and silent `Workboard` truncation
- **Severity:** `P2` | **Role:** All roles | **Relates to:** Queue Search/Filters, Operations Console caps, Action Center & Bell
- **Steps to Reproduce:** Search `"QA-P2-"` in `Receipts` or `"qa.p2.client.8898"` in `Risk & Fraud`; inspect `Profile Reports` Violation filter; view `Operations Console -> Workboard`, `Action Center`, `Dispute` validation, and `SUPPORT` Notification Bell.
- **Expected vs Actual:** (1) `Receipts` and `Risk & Fraud` searches return 0 rows for matching ref/email until cleared. (2) `Profile Reports` Violation filter exposes `IMPERSONATION`, `FRAUD`, `ABUSIVE_LANGUAGE` while backend records use `FAKE_IDENTITY`, `OFFENSIVE_CONTENT`, `MISLEADING_SKILLS`. (3) `Workboard` `Cleared / Settled` shows `23` in header, renders `12` cards with zero `+11 hidden` notice, and `Escalated` shows `1056.2833333333333h overdue` (Action Center: `1050.65h`). (4) Action Center exposes raw keys (`Fix cbeConfigured`, `Fix mpesaConfigured`). (5) `Dispute` `<10` char submit shows raw toast `"VALIDATION_ERROR"`. (6) `SUPPORT` Notification Bell displays `5` unread items with raw CUID (`cmwyymq9m0014yohrtbmmwpa4`), all `5/5` inert/disabled.
- **Evidence:** [support-notification-bell.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/support-notification-bell.png), [superadmin-ops-workboard.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/superadmin-ops-workboard.png); `pass2-part1.json`, `pass2-batchB.json`, `verify-remaining.json`.

---

### P3 — Polish Defects

#### `OPS-22` — Command symbol (`⌘K`) shown on Windows
- **Severity:** `P3` | **Role:** All roles | **Relates to:** Known Issue #7 (**REPRODUCED**)
- **Steps to Reproduce:** View topbar Search button and `Command Center` `Jump` button on Windows 11.
- **Expected vs Actual:** Expected `Ctrl+K`; actual renders **`⌘K`**.
- **Evidence:** [overview-light-1024.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/overview-light-1024.png), `verify-remaining.json` (`searchBtnText: "Search / Jump\n⌘K"`).

#### `OPS-23` — Translucent sticky header across all light and dark captures
- **Severity:** `P3` | **Role:** All 6 roles | **Relates to:** Matrix Prompt #6
- **Steps to Reproduce:** Inspect computed styles of `.topbar` on load and after scroll (`scrollY > 0`).
- **Expected vs Actual:** Header uses `color(srgb 1 1 1 / 0.92)` (`light`) and `color(srgb 0.0705882 0.0941176 0.113725 / 0.92)` (`dark`) with `backdrop-filter: blur(10px)` across all `384` runs.
- **Evidence:** `matrix-*.json` (`stickyAlpha`).

#### `OPS-24` — Copy, card clipping, audit noise, missing dev-data banner, and non-persistent sound toggle
- **Severity:** `P3` | **Role:** Multiple roles | **Relates to:** Visual Review, Audit Feed, Environment, Settings
- **Steps to Reproduce:** Inspect `Profile Reports`, `My Profile`, `Escrow`, `Payouts`, `Ledger`, `Tax Reports`, and `Command Center` Audit Feed / sound toggle.
- **Expected vs Actual:**
  1. `Profile Reports` top-right button is mislabeled **`"Refresh Featured Carousel"`**.
  2. Staff `My Profile` renders freelancer availability controls (`Open to work — clients filter on this`, `Public`).
  3. Card badges/titles clip right edges: `⚠ ADMIN HO` (`Escrow`), `⚠ FAILED` (`Payouts`), `qa.p2.badactor.8898@example.com` overflowing `Workboard` column, `MILESTONE RELEAS` & truncated CUIDs (`Ledger`), `.avatar` `scrollWidth 41 > clientWidth 30`.
  4. `Recent Audit Activity` shows mostly session noise (`USER_LOGGED_IN`, `USER_SESSION_REFRESHED`) with raw CUIDs (`cmwy...`), though financial/moderation events (`ADMIN_ESCROW_HELD`, `RESOLVE_REPORT`, `DISPUTE_RESOLVED`) also appear when triggered.
  5. No UI banner/badge identifies the environment as local dev with demo/synthetic data (only `DEMO-PAY-*` references exist).
  6. `Tax Reports` has no CSV export button, and muting sound does not persist to `localStorage` (`ls: null`).
- **Evidence:** [reports-queue-light-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/COMPLIANCE_ADMIN/reports-queue-light-1440.png), [profile-dark-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/COMPLIANCE_ADMIN/profile-dark-1440.png), [superadmin-escrow-held.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/pass2/superadmin-escrow-held.png), [ledger-light-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/FINANCE_ADMIN/ledger-light-1440.png), [audit-light-1440.png](file:///c:/Users/Za/Desktop/project/Yekis/test-evidence/ops/SUPER_ADMIN/audit-light-1440.png); `edges-verify.json`.

---

## 5. Things Not Tested or Blocked & Why

1. **Settling a `PENDING` / `PROCESSING` payout via `FINANCE_ADMIN -> Payouts` (`BLOCKED`):**
   - Pre-existing unsettled payouts (`seed-payout-pending`, `seed-payout-processing`) do not start with `DEMO` and belong to seed users (`freelancer@yekis.et`, `seller@yekis.et`), so they could not be settled per safety rules.
   - Creating a self-owned `PENDING` payout (`qa.p2.payout2.8898`, ETB 200) failed in local dev (`POST /api/v1/escrow/wallet/withdraw` returned `500 INTERNAL_ERROR` due to `Telebirr rejected disbursement: HTTP 404`, marking payout `cmwz3x23800kpyohrchoiquca` as `FAILED` and rolling back the wallet). Validation, disabled state of `Fail & Re-Credit Wallet`, and `409 CONFLICT` on `Confirm Disbursement` were verified on `cmwz3x23800kpyohrchoiquca`.
2. **`Staff & Roles` account/permission mutations (`Edit role`, `Suspend`) (`NOT TESTED — Scope Boundary`):**
   - Excluded by prompt rule ("Do not change staff accounts or permissions"); read-only listing and permission matrix verified.
3. **`Escrow` `Full Release to Freelancer`, `Tax Reports` `Mark Filed`, `Reconciliation` adjustments/force-match, and `Featured Talent` pin (`NOT TESTED — Pre-existing non-DEMO data / Read-only`):**
   - Pass 2 mutations were tested on self-owned `8898` Escrow (`Place Admin Hold` / `Remove Admin Hold`), Dispute (`Claim` + `PARTIAL_SPLIT` `Resolve`), helper milestone release (`QA P2 Payout Milestone 8898`), Gig (`Approve & publish`), Support (`Reply`/`Internal Note`/`Close`/`Reopen`), KYC (`Approve`), Risk (`Dismiss`), Receipts (`Flag` + `Approve`), and Users (`Suspend` -> `Reinstate`, `Force KYC re-review`), while leaving `seed-*` financial/tax/recon records and public carousel pins untouched.
4. **`Telegram Bot` operational actions (`NOT TESTED — Upstream `503`/`500`):**
   - No bot webhook/session is configured in local dev (`OPS-14`).
5. **Post-test Cleanup & Restoration:**
   - Default theme (`light`), layout (`opsPrefsLs: null`), and sound state (`Mute platform sound effects`) confirmed restored (`pass2-finance.json`). `qa.p2.badactor.8898` reinstated (`isSuspended: false`); `qa.support@example.com` profile name/bio restored; `QA P2 Hold Milestone 8898` admin hold removed.
