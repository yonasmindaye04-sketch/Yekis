# Yekis Workspace Dashboard Contents Reference (Client & Freelancer)

> **Canonical Scope**: This document specifies every widget, KPI card, chart, table, board, calendar schedule, talent carousel, command palette, and layout control inside the Client and Freelancer Workspace Dashboard (`apps/frontend/src/components/dashboard/MarketplaceShadcnDashboard.tsx` and child components). Every data source, calculation, interaction, and local-vs-server state boundary below is verified directly against the codebase.
>
> - For the consolidated 6-item Client sidebar, mobile Option B bar, avatar menu, and all 14 alias-routed workspace views, see [docs/SIDEBAR_FEATURES_REFERENCE.md](./SIDEBAR_FEATURES_REFERENCE.md).
> - For the Staff & Admin Operations Console dashboard (`apps/frontend/src/pages/ops/pages/Overview.tsx`) and its 23 sidebar pages, see [docs/ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md](./ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md) and [docs/ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md](./ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md).

---

## 1. Dashboard Architecture & Data Integrity Contract

### 1.1 Data Sources Loaded on Dashboard Entry (`FullPlatformApp.tsx`)
When the workspace mounts or the user clicks **Refresh**, `loadWorkspace()` / `refreshDashboard()` fetches:
- `GET /api/v1/auth/me` -> user identity & role (`CLIENT`, `FREELANCER`, `BOTH`)
- `GET /api/v1/escrow/wallet` -> `wallet.balanceMinor`
- `GET /api/v1/jobs` -> `jobs` (open marketplace jobs for Freelancers and `BOTH`)
- `GET /api/v1/jobs/mine` -> `myJobs` (the Client's own posted jobs)
- `GET /api/v1/contracts` -> `contracts` (client and freelancer contracts, signature state, and milestone progress)
- `GET /api/v1/chat/conversations` -> `conversations` (used for unread message attention counts)
- `GET /api/v1/escrow/milestones` -> `milestones` (includes server-resolved `counterparty`, `contract.title`, `contract.category`, `clientName`, `freelancerName`, `paymentRail`, `fundedAt`, `submittedAt`, `autoReleaseAt`, `releasedAt`, `deliverableUrl`)
- `GET /api/v1/wallet/topups` -> `topUps`
- `GET /api/v1/escrow/fee-config` -> `feeConfig`

### 1.2 Persisted Shell Preferences (`ShadcnLayoutContext.tsx`)
The active dashboard mode (`dashboardVariant`: `"dashboard-1"` or `"dashboard-2"`), Pipeline sub-tab (`opsSubTab`: `"table"`, `"kanban"`, or `"calendar"`), sidebar variant (`"sidebar"`, `"inset"`, `"floating"`), sidebar collapse state, table density (`"compact"` or `"comfortable"`), and corner radius (`0.375rem`, `0.5rem`, `0.75rem`) persist per browser in `localStorage["yekis-shadcn-layout-v1"]`.

### 1.3 Real-Data Rules (`dashboardAnalytics.ts`, `dashboardData.ts`, `FeaturedCarousel.tsx`)
- No synthetic fallback curves, hardcoded `* 0.1` client fee approximations, or demo milestone ledgers exist anywhere in `apps/frontend/src/`.
- Empty windows report `null` trend rates (displaying `"No prior 30d baseline"` / `"Nothing settled yet"`) and render chart empty states rather than fabricated numbers.
- `FeaturedCarousel.tsx` fetches `GET /api/v1/featured`, renders real verified freelancers (with zero `DEMO_TALENTS` fallback), shows `retry` on error or an honest empty state / `hideWhenEmpty` when none exist, and persists bookmarks server-side via `/api/v1/featured/saved` (`SavedTalent`, importing legacy `yekis_saved_talents` once on first login).

---

## 2. Dashboard Top Sub-Header (`MarketplaceShadcnDashboard.tsx`)

### 2.1 What It Shows
- **Left Group**:
  - **Mode Switcher (`role="tablist"`)**: Toggles between **Overview** (`dashboard-1`) and **Pipeline** (`dashboard-2`).
  - **Pipeline Sub-Tab Switcher** (shown only when `dashboardVariant === "dashboard-2"`): Switches between **List** (`opsSubTab === "table"`), **Board** (`opsSubTab === "kanban"`), and **Calendar** (`opsSubTab === "calendar"`), omitting `(0)` count clutter when empty. (Help remains in the topbar `GlobalHelpMenu`, without a duplicate `?` trigger in the Pipeline sub-header.)
- **Right Group**:
  - **Quick Jump (`⌘K` on macOS / `Ctrl+K` otherwise)** button opening `WorkspaceCommandPalette`.
  - **Refresh** icon button (`onRefresh`, spins while `isRefreshing`) paired with Addis Ababa `Updated HH:MM` timestamp (`tabular-nums`).
  - **Role-Specific Actions**:
    - Verified `CLIENT` (`canHire && kycVerified`): single primary CTA **Post a job** -> switches to `jobs`, plus secondary text action **Browse services** (shown once across the page when `FirstRunChecklist` is not mounted).
    - Unverified `CLIENT` (`canHire && !kycVerified`): single primary CTA **Verify identity** -> routes to `verification`.
    - `FREELANCER` (`!canHire && canWork`): single primary CTA **Browse Open Jobs** -> switches to `jobs`.

---

## 3. KPI Stat Cards (`MarketplaceShadcnDashboard.tsx`)

- **Client Zero-State Home (`hasActivity === false`)**: While a client has zero jobs, contracts, milestones, or `APPROVED` top-ups, the KPI strip, charts, and empty operational snapshot cards are hidden so `FirstRunChecklist` renders as the first content beneath the sub-header.
- **Active Client Home (`hasActivity === true`)**: Displays two compact KPI cards (**Wallet balance** and **Held in escrow**) below Active contracts & Your open jobs.
- **Freelancer & Admin Overview**: Displays the full 4-column expandable KPI strip (**Wallet balance**, **Held in escrow**, **Work in progress**, **Open jobs**). Clicking any card toggles its inline drill-down drawer (`expandedKpi`).

| KPI Card | Primary Value & Source | Trend Line (`dashboardAnalytics.ts`) | Drill-Down Drawer Contents & Action |
|---|---|---|---|
| **1. Wallet balance** | `ETB (wallet.balanceMinor / 100)` | `topUpTotals(topUps, 30d)` compares approved top-ups in current vs prior 30d (`periodChange()`), or `"No prior 30d baseline"` / `"No top-ups yet"`. | **Approved Telebirr / CBE Top-Ups**, **Open Wallet & Top-Up Desk** button -> navigates to `wallet`. |
| **2. Held in escrow** | Sum of `amountMinor` for milestones in funded non-terminal states (`ESCROW_HELD`, `WORK_IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `ACCEPTED`, `DISPUTED`) | `escrowFundedTotals(milestones, 30d)` compares milestones with `fundedAt`, or active count / `"Nothing funded yet"`. | **Released & Settled YTD**, **View payments** / **Inspect Escrow Contracts** button -> navigates to `escrow` or `contracts`. |
| **3. Work in progress** *(Freelancer / Admin)* | Count of non-terminal milestones (`!== RELEASED`, `REFUNDED`, `PARTIAL_REFUND`) | `onTimeStats(milestones)` computes `%` on-time `RELEASED` milestones, or `"Nothing settled yet"`. | **In Active Delivery**, **Escrow Funded & Ready**, **Open Board** button -> `dashboard-2` (`kanban`). |
| **4. Open jobs** *(Freelancer / Admin)* | Count of `OPEN` jobs in `effectiveJobs` | `briefsCreatedSince(effectiveJobs, 7d)` shows `N new this week` or `"No new jobs this week"`. | **Combined Max Budget Pool** and **Explore All Jobs** -> `jobs`. |

---

## 4. Mode 1: Overview (`dashboard-1`)

### 4.1 Zero-State Client Home (`hasActivity === false`)
- **`FirstRunChecklist`** is the first section under the sub-header:
  1. **Verify identity** (`kycStatus === "UNDER_REVIEW"` renders bold amber **Under review** + `"We will notify you once reviewed."`)
  2. **Post a job** (locked when unverified with explanation and inline **"Verify identity to unlock"** link routing to `verification`)
  3. **Add funds (before you hire)** (only marks **Done** once wallet funds or an `APPROVED` top-up exist; pending-only top-ups render bold amber **Waiting for approval** + pending amount once + `"We will notify you once approved."`)
  4. **Review proposals**
  5. **Fund your first milestone** (**View payments** button + `"How escrow protects you"` native `<dialog>`).
- **Featured Freelancers** renders below in compact mode (`hideWhenEmpty`).

### 4.2 Active Client Home (`hasActivity === true`)
Sections render in fixed operational priority order:
1. **Needs your attention** (sorted by urgency, 1 action button per item): proposals awaiting review (`Review proposals`), unsigned contracts (`Sign contract`), executed milestones awaiting payment (`Fund milestone`), submitted deliveries awaiting review with `autoReleaseAt` countdown (`Review delivery`), overdue milestones (`View payments`), and unread conversations (`Open Messages`).
2. **Active contracts**: Title, freelancer name, `X of Y milestones completed`, next due date, next-step instruction, and **View your contracts** action.
3. **Your open jobs**: Title, proposal counts (`N proposals`), deadline, budget, and **Manage** / **Review proposals** actions.
4. **Compact KPIs**: **Wallet balance** and **Held in escrow**.
5. **Verified freelancers**: `FeaturedCarousel`.
6. **Collapsible Insights (`<details>`)**: Rendered and code-split lazy-loaded (`ShadcnCharts.tsx`) **only** when at least one `RELEASED` milestone or `APPROVED` top-up exists. Contains:
   - **Escrow Inflow & Released Payouts (`InteractiveCashflowAreaChart`)**: `7d`–`12m` toggleable area series from `buildLiveTimeSeries()`.
   - **Payments by method (`InteractiveRailVelocityBarChart`)**: Telebirr, CBE Birr, and M-Pesa stacked volume (`tabular-nums`).

### 4.3 Featured Talent Carousel (`FeaturedCarousel.tsx`)
- **Visibility**: Shown on Client and Dual-Role (`CLIENT` active mode) views; hidden in Freelancer mode.
- **What It Shows**: Filter tabs (**All**, **Saved**), compact grid (`data-compact-count="true"` when fewer than 3 profiles), deduplicated role vs skill chips, API-only rating (or **New** when unrated), completed jobs, hourly ETB rate, location (omitted when not returned by API), bold colored availability/delivery status (`CheckCircle` + text, no status dot or tinted badge box), plus **Message** and **View profile** footer buttons and server-backed shortlist bookmarking (`POST /api/v1/featured/saved`).
- **Quick-View Modal**: Displays bio, languages, member-since, stats strip, reviews, and **Message** / **Open Full Profile** / **Bookmark** actions.

---

## 5. Mode 2: Pipeline (`dashboard-2`)

Sub-tabs are code-split via `React.lazy()` so Recharts/chart bundles and `kenat` (Ethiopian calendar engine) only download on demand. Triggering **Fund Milestone** opens the shared `ConfirmActionModal` showing gross escrow, `Client fee` (`ETB 0`), and total wallet debit before `onFundMilestone(milestoneId)`.

### 5.1 List (`AdvancedDataTable.tsx`)
- **Zero-milestone empty state**: Renders a single clean empty state card with one primary CTA (**Post a job** for clients, **View your contracts** otherwise), hiding search/filter/export/table clutter.
- **Active list**: Search input, status filters, payment method selector, CSV export, column visibility menu, mobile Cards/Table toggle, sortable columns, role-aware fee columns (`calculateFees()`), pagination, and **Row Inspector Drawer** linking to **View payments** and **View your contracts**.

### 5.2 Board (`KanbanBoardView.tsx`)
- **Zero-milestone empty state**: Renders a single clean empty state card with one primary CTA (**Post a job** / **View your contracts**), hiding empty columns, filters, `Collapse empty`, and scroll hints.
- **Columns when milestones exist**:
  1. `BACKLOG`: **Payment pending** (`Awaiting payment`)
  2. `ESCROW_HELD`: **Escrow held** (`Funded and protected`)
  3. `WORK_IN_PROGRESS`: **In progress** (`Work underway`)
  4. `SUBMITTED_FOR_REVIEW`: **Ready for review** (`Delivery submitted`)
  5. `RELEASED`: **Paid** (`Released to freelancer`)
  6. `DISPUTED_REFUNDED`: **In dispute / Refunded** (`Paused or returned`) — shown separately whenever disputed or refunded milestones exist so disputed items never sit under awaiting payment.
- Includes search, counterparty/contract dropdowns, urgency filter, `Overdue only` toggle, column collapse rails, mobile stage tabs (`<= 1024px`), horizontal scroll controls, and native `<dialog>` milestone inspector.

### 5.3 Calendar (`CalendarScheduleView.tsx`)
- **Zero-event empty state**: Keeps month navigation, **Today** (`Africa/Addis_Ababa`), Gregorian/Ethiopian mode switch, month grid, and **Add Reminder**, while hiding event-type filter buttons, color legend, and Ethiopian fiscal quarter summary cards until at least one milestone/job/reminder event exists.
- **Active calendar**: Combines milestones, open job deadlines, and `/api/v1/reminders` personal reminders across dual Gregorian + Ethiopian (`kenat`) calendar dates and Ethiopian Fiscal Year quarters (`EFY 2019`: `2026-07-08`–`2027-07-07`; `2026-11-27` = `Hidar 18, 2019 E.C.`). Category legend and event lines use icon + accessible `>= 4.5:1` theme tokens in both light and dark themes.

---

## 6. Quick Jump Command Palette & Layout Customizer

- **Workspace Command Palette (`WorkspaceCommandPalette.tsx`)**: Opened from **Quick Jump (`⌘K` / `Ctrl+K`)**. Searches Overview, Pipeline views (List, Board, Calendar), Workspace routes, Dual-Role switching (`BOTH`), Layout Customizer, Sidebar collapse, and Theme toggle.
- **Layout Customizer Drawer (`ShadcnLayoutContext.tsx`)**: Opened from **Settings** or Command Palette. Configures sidebar layout (`sidebar`, `inset`, `floating`), density (`compact`, `comfortable`), corner radius (`rounded-lg` default `8px`), theme, and **Reset Layout**.
