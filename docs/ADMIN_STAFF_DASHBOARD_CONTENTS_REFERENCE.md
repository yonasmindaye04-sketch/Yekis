# Yekis Operations Console Dashboard Contents Reference (Admin & Employees)

> **Canonical Scope**: This document specifies every KPI card, Action Center alert rule, chart, table, Kanban workboard, SLA schedule, Command Palette entry, Notification Bell target, and layout control inside the Operations Console Overview Command Center (`apps/frontend/src/pages/ops/pages/Overview.tsx` and global shell overlays in `apps/frontend/src/pages/ops/OpsConsole.tsx`). Every data source, calculation window, permission degradation rule, and local-vs-server state boundary below is verified directly against the codebase.
>
> - For all 23 sidebar pages and role-specific operational actions, see [docs/ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md](./ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md).
> - For the Client and Freelancer Workspace Dashboard (`MarketplaceShadcnDashboard.tsx`), see [docs/DASHBOARD_CONTENTS_REFERENCE.md](./DASHBOARD_CONTENTS_REFERENCE.md).

---

## 1. Architecture, Data Integrity & Role Degradation Contract

### 1.1 Entry Routing & Dual-Role Contrast

- `apps/frontend/src/FullPlatformApp.tsx` (`L1523-L1530`) routes any user with `user?.staffRole` set directly into `<OpsConsole user={user} onExit={logout} />` and lands on **`Overview`** (`overview.view`, held by all 8 staff roles).
- Unlike the Client & Freelancer Dashboard (`MarketplaceShadcnDashboard.tsx`), which scopes every metric and widget strictly to the signed-in user's own jobs, contracts, and wallet, the Operations Console Overview aggregates **platform-wide** financial flows, dispute SLAs, compliance queues, and infrastructure health.

### 1.2 Overview Fetch Lifecycle (`opsApi.ts` -> `loadOverview()`)

- **11 Parallel Live Requests**: On mount and manual refresh, `Overview.tsx` calls `opsApi.overview()` which executes `11` parallel API requests through `soft()`.
- **403-Only Graceful Degradation (`soft()`)**: Because Platform Administrators (`SUPER_ADMIN`, `ADMIN`) hold all 30 permissions while Departmental Employees (`OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`, `COMPLIANCE_OFFICER`, `SUPPORT`) hold narrower slices, `soft()` intentionally catches **HTTP `403` only** and substitutes empty arrays / zero metrics so restricted employees still load the Command Center without crashing.
- **No Mock Fallback on Primary Lists**: Unlike legacy guest previews, staff API requests match `ApiClient.isStaffApiPath` (`strictErrors: true`) and never silently fall back to `mockStore`.
- **Sampling Window vs. Full-Database BI (`Overview.tsx` vs. `Reports.tsx`)**:
  - Time-series charts in `Overview.tsx` (`AreaChart` and `BarChart`) run `buildBuckets()` client-side over the latest `100` payments/payouts returned in the `loadOverview()` bundle.
  - Full-database historical sums and 6-month platform series live on the **Reports & Analytics** page (`Reports.tsx` -> `GET /api/v1/admin/reports/summary`).
- **Layout Persistence (`ShadcnLayoutContext.tsx`)**: Active command mode (`dashboard-1` vs. `dashboard-2`), Operations Console sub-tab (`table` / `kanban` / `calendar`), sidebar variant (`sidebar` / `inset` / `floating`), density (`compact` / `comfortable`), and corner radius (`--sh-radius`) persist locally under `yekis-shadcn-layout-v1`.

---

## 2. Dashboard Header & Sub-Navigation Controls (`Overview.tsx`)

The top header bar renders role-aware status messaging and controls shared by Admins and Employees:

| Control / Element | Location & Values | Behavior |
|---|---|---|
| **Title & Role Context** | Page header | Identifies the Operations Command Center for the authenticated `staffRole`. |
| **Mode Switcher** | `Executive Command` (`dashboard-1`) / `Operations Console` (`dashboard-2`) | Toggles between executive analytics + triage (`dashboard-1`) and high-density operational views (`dashboard-2`), persisted in `ShadcnLayoutContext`. |
| **Time Window Filter** | `7D`, `30D`, `90D`, `12M` | Recomputes `buildBuckets()` time-series grouping across the fetched payments/payouts window for `AreaChart` and `BarChart`. |
| **Sub-View Switcher** *(visible in `dashboard-2`)* | `Ledger` (`table`), `Workboard` (`kanban`), `SLA Schedule` (`calendar`) | Switches the multi-queue operational surface; persisted in `ShadcnLayoutContext`. |
| **Jump (`⌘K`)** | Button / keyboard shortcut `Ctrl+K` or `Cmd+K` | Opens `CommandPalette` `<dialog>` for cross-console record and page navigation. |
| **Refresh** | Header action button | Re-executes `loadOverview()` (`11` live requests) and updates sidebar badge counts (`loadBadges()`). |

---

## 3. Expandable 4-Column KPI Stat Strip

Rendered across the top of `Overview.tsx`, displaying four expandable KPI cards backed by `/admin/metrics` and queue payloads:

| Card Key | Display Title | Primary Value & Sub-Detail | Expanded Card Contents & Navigation | Admin vs. Employee Behavior |
|---|---|---|---|---|
| `escrow` | **Funds in Escrow** | Active escrowed ETB total and milestone count | Breakdown of held vs. dispute-frozen balances plus link to **Escrow Control** (`escrow`) | Populated for Admins & finance/ops roles with metrics/escrow visibility; unauthorized feeds show `0`. |
| `disputes` | **Open Disputes** | Active open disputes + overdue SLA indicator | Split across negotiation/evidence/mediation/arbitration stages + link to **Disputes & Mediation** (`dispute-queue`) | Populated for Admins, `DISPUTE_MEDIATOR`, `OPERATIONS_ADMIN`, and `COMPLIANCE_*`; `0` for `SUPPORT` / `FINANCE_ADMIN`. |
| `payouts` | **Pending Payouts** | Pending disbursement count and ETB value awaiting settlement | Settled vs. pending breakdown + link to **Payouts** (`payouts`) | Populated for Admins, `OPERATIONS_ADMIN`, and `FINANCE_ADMIN`; `0` for support/compliance/mediators. |
| `compliance` | **Compliance Queues** | Combined open AML/risk flags, pending KYC submissions, and open profile reports | Sub-counts for **KYC Identity** (`kyc`), **Risk & AML** (`risk`), and **Profile Reports** (`reports-queue`) | Full breakdown for Admins and Compliance roles; partial/zero for operations, finance, mediators, and support. |

---

## 4. Mode 1: Executive Command (`dashboard-1`)

### 4.1 Prioritized Action Center (`actionCenter.tsx`)

`buildActionItems()` evaluates loaded overview queues and constructs a sorted daily triage checklist ranked from highest to lowest severity (`sev 3` -> `sev 2` -> `sev 1`):

1. **Breached Dispute SLAs** (`sev 3` critical) -> links to `dispute-queue#<id>`
2. **Open Critical Risk / AML Flags** (`sev 3` critical) -> links to `risk#<id>`
3. **Failed Infrastructure Health Checks** (`sev 3` critical) -> links to `monitoring`
4. **Reconciliation Mismatches / Variances** (`sev 2`) -> links to `reconciliation#<id>`
5. **Pending Payouts Awaiting Settlement** (`sev 2`) -> links to `payouts#<id>`
6. **KYC Submissions Awaiting Review** (`sev 1`) -> links to `kyc#<id>`
7. **Open Profile Reports** (`sev 1`) -> links to `reports-queue#<id>`

- **Interactive Triage State (Local Only)**: Each item includes a completion checkbox toggled locally in component state (`done`) and reflected in the Action Center header progress bar. Checking off an item helps an operator track session triage without mutating backend records; clicking the item navigates directly via `onGo(page, focusId)`.
- **Role Filtering**: Because `soft()` returns empty datasets for queues an employee lacks access to, `buildActionItems()` naturally surfaces only actionable items within that employee's permitted feeds.

### 4.2 Analytical Charts (`charts.tsx` & `ChartTipContext`)

All four visualizations render interactive SVG/chart primitives with hover tooltips managed by `ChartTipContext`:

| Chart Widget | Component | Data Source & Calculation | What It Shows |
|---|---|---|---|
| **Inbound Escrow Funding** | `AreaChart` | `buildBuckets()` over fetched payments (`limit=100`) for active range (`7D`/`30D`/`90D`/`12M`) | Cash inflow trajectory across Telebirr, CBE Birr, M-Pesa, and manual receipt credits. |
| **Payout Disbursements** | `BarChart` | `buildBuckets()` over fetched payouts (`limit=100`) for active range (`7D`/`30D`/`90D`/`12M`) | Outbound freelancer settlement bars over time. |
| **Escrow Custody Allocation** | `Donut` | Escrow breakdown by custody state | Proportional ETB split across held custody, dispute-locked funds, and pending clearance. |
| **Live Queue Workload** | `HBars` | Live open item counts across queues (`support`, `disputes`, `risk`, `kyc`, `reports`, `gigs`, `receipts`, `payouts`, `recon`) | Horizontal bar comparison highlighting operational backlogs. |

### 4.3 Infrastructure & Ledger Integrity + Recent Audit Activity

- **Infrastructure & Ledger Integrity Card**: Summarizes live probe states (`database`, `redis`, `objectStore`, `telebirrConfigured`, `cbeConfigured`, `mpesaConfigured`) and double-entry ledger trial-balance status (`SUM(debits) === SUM(credits)`), linking to **System Health** (`monitoring`) and **Platform Ledger** (`ledger`).
- **Recent Audit Activity Card**: Renders latest administrative and compliance audit events (`actor`, `eventType`, `entityType`, timestamp), linking to **Audit Logs** (`audit`). Visible cleanly to Admins and roles permitted to view `auditLogs` (`FINANCE_ADMIN`, `COMPLIANCE_ADMIN`, `COMPLIANCE_OFFICER`); hidden/empty otherwise.

---

## 5. Mode 2: Operations Console (`dashboard-2`)

Switching to **Operations Console** (`dashboard-2`) replaces the executive charts with three dense multi-queue operational surfaces sharing the same live dataset:

| Sub-Tab (`ShadcnLayoutContext`) | UI Name | Data Cap & Layout | Behavior & Workspace Contrast |
|---|---|---|---|
| `table` | **Cross-Queue Operations Ledger** | `unifiedRows.slice(0, 40)` (maximum `40` rows) | Unified table merging pending/urgent items across disputes, risk alerts, KYC reviews, profile reports, payouts, and reconciliation exceptions, showing queue type, subject, priority/SLA status, ETB amount, and direct jump button to the owning workbench (`onGo(page, id)`). |
| `kanban` | **Operations Workboard** | 4 status columns (`kanbanCols`), each capped at `12` cards (`slice(0, 12)`) | Visual multi-queue card board organizing triaged items across workflow stages (urgent/breached, awaiting action, in review, recently settled/resolved). Clicking any card jumps to the corresponding queue (`page#focusId`). |
| `calendar` | **Compliance & Dispute SLA Schedule** | Chronological SLA list | Renders upcoming and breached deadline milestones (dispute negotiation/mediation deadlines, review SLAs, pending payout/reconciliation checkpoints) ordered chronologically. **Note**: Unlike the Client & Freelancer Dashboard (`MarketplaceShadcnDashboard.tsx`) which renders a monthly `kenat` Ethiopian/Gregorian grid, the Operations Console `calendar` tab is a chronological SLA deadline list. |

---

## 6. Global Shell Overlays: Command Palette, Notification Bell & Layout Drawer

### 6.1 Quick Jump Command Palette (`CommandPalette.tsx`)

- **Activation**: `Ctrl/Cmd + K` shortcut, topbar `.ops-cmd-trigger` (desktop), `.ops-mobile-search-btn` (`<= 1024px`), or `Overview` **Jump** button. Opens a native `<dialog>` element (`closedby="any"` with pointer backdrop fallback and `Esc` dismissal).
- **Indexed Command Categories**:
  1. **Dashboard Views**: Switches directly between `Executive Command` (`dashboard-1`), `Operations Console` (`dashboard-2`), and `Ledger` / `Workboard` / `SLA Schedule`.
  2. **Pages**: Filtered strictly via `can(OPS_PERMS[p.id])` so employees never see hidden Admin pages (`Staff & Roles`, `Gig Moderation`, `Featured Talent`, `Telegram Bot`, etc.).
  3. **Appearance & Layout**: Toggles Light/Dark theme, switches sidebar variant (`sidebar` / `inset` / `floating`), switches density (`compact` / `comfortable`), and adjusts radius presets.
  4. **Lazy Live Records (`buildRecordEntries`)**: Queries live search items across up to 5 modules, **each gated by `can()`**:
     - `Contracts` (`contracts.view`) -> jumps to `contracts#<id>`
     - `User Directory` (`users.view`) -> jumps to `users#<id>`
     - `Disputes` (`disputes.view`) -> jumps to `dispute-queue#<id>`
     - `KYC Identity` (`kyc.view`) -> jumps to `kyc#<id>`
     - `Payouts` (`payouts.view`) -> jumps to `payouts#<id>`

### 6.2 Staff Notification Bell (`NotificationBell.tsx` & `notificationTargets.ts`)

- **Feeds & Real-Time Audio**: Fetches persisted alerts via `GET /api/v1/notifications`, listens on `realtimeSocket` for `notify:*` push events, and plays notification audio via `playSoundForNotificationEvent()` unless muted in the topbar.
- **Permission-Safe Deep Linking (`opsTargetFor`)**: Maps each notification type via `OPS_TARGETS` and `OPS_FOCUS_KEYS` to `{ page, focusId }` and checks `can(OPS_PERMS[target.page])`. If an employee receives a notification whose target page falls outside their `staffRole` permissions, the item renders as an **inert/disabled button** rather than navigating to a `403` screen.
- **Mark All Read**: Executes sequential `markAll()` updates across unread notifications.

### 6.3 Layout Customizer Drawer (`ShadcnLayoutContext.tsx`)

- Accessible from the topbar customizer button on every console page.
- Modifies and persists `yekis-shadcn-layout-v1`: sidebar chrome style (`sidebar` / `inset` / `floating`), row density (`compact` / `comfortable`), border radius token (`--sh-radius`), default dashboard tab (`dashboard-1` / `dashboard-2`), and workview tab (`table` / `kanban` / `calendar`).
- CSS theme rules strictly preserve identical geometry between light and dark modes (color/background/border-color/box-shadow/opacity only).

---

## 7. Admin vs. Employee Dashboard Visibility Summary

| Dashboard Element | Platform Admin (`SUPER_ADMIN`, `ADMIN`) | `OPERATIONS_ADMIN` | `FINANCE_ADMIN` | `DISPUTE_MEDIATOR` | `COMPLIANCE_ADMIN` / `_OFFICER` | `SUPPORT` |
|---|---|---|---|---|---|---|
| **KPI: Funds in Escrow** | Live total | Live / read | Live / read | `0` (suppressed) | `0` (suppressed) | `0` (suppressed) |
| **KPI: Open Disputes** | Live count | Live count | `0` (suppressed) | Live count | Live count | `0` (suppressed) |
| **KPI: Pending Payouts** | Live count | Live count | Live count | `0` (suppressed) | `0` (suppressed) | `0` (suppressed) |
| **KPI: Compliance Queues** | Full KYC/Risk/Reports | Filtered / zeroed | Filtered / zeroed | `0` (suppressed) | Full KYC/Risk/Reports | `0` (suppressed) |
| **Action Center Priorities** | All 7 severity rules | Payouts, failed health, disputes | Payouts, reconciliation | Breached dispute SLAs | Critical risk, failed health, KYC, reports | Empty / ticket focus |
| **Charts (`AreaChart` / `BarChart` / `Donut`)** | Full inbound + payout + escrow charts | Permitted payments/payouts | Full payments/payouts/escrow | Suppressed/empty | Suppressed/empty | Suppressed/empty |
| **System Health & Recent Audit** | Both populated | Health only (`monitoring.view`) | Audit only (`audit.view`) | Both suppressed | Both populated | Both suppressed |
| **Operations Console (`dashboard-2`)** | All queues (max 40 rows / 12 per col) | Permitted queues only | Financial queues only | Dispute rows only | Compliance + dispute rows | Empty/minimal |
| **Command Palette Live Records** | All 5 sources (Contracts, Users, Disputes, KYC, Payouts) | Contracts, Users, Disputes, Payouts | Users, Payouts | Contracts, Users, Disputes | Users, Disputes, KYC | Users only |
| **Notification Bell Navigation** | All queues clickable | Permitted queues clickable; others disabled | Permitted queues clickable; others disabled | Disputes/Contracts/Users clickable; others disabled | Compliance/Support/Dispute/Users clickable | Support/Users clickable; others disabled |
