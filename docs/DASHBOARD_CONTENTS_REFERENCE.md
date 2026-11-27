# Yekis Workspace Dashboard Contents Reference (Client & Freelancer)

> **Canonical Scope**: This document specifies every widget, KPI card, chart, table, Kanban board, calendar schedule, talent carousel, command palette, and layout control inside the Client and Freelancer Workspace Dashboard (`apps/frontend/src/components/dashboard/MarketplaceShadcnDashboard.tsx` and child components). Every data source, calculation, interaction, and local-vs-server state boundary below is verified directly against the codebase.
>
> - For all 13 workspace sidebar navigation items, see [docs/SIDEBAR_FEATURES_REFERENCE.md](./SIDEBAR_FEATURES_REFERENCE.md).
> - For the Staff / Admin Operations Console overview (`apps/frontend/src/pages/ops/pages/Overview.tsx`), see [docs/SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) §8.8 and §9.16.

---

## 1. Dashboard Architecture & Data Integrity Contract

### 1.1 Data Sources Loaded on Dashboard Entry (`FullPlatformApp.tsx`)
When the workspace mounts or the user clicks **Refresh**, `loadWorkspace()` / `refreshDashboard()` fetches:
- `GET /api/v1/auth/me` -> user identity & role (`CLIENT`, `FREELANCER`, `BOTH`)
- `GET /api/v1/escrow/wallet` -> `wallet.balanceMinor`
- `GET /api/v1/jobs` -> `jobs` (open marketplace briefs for Freelancers and `BOTH`)
- `GET /api/v1/jobs/mine` -> `myJobs` (the Client's own posted briefs)
- `GET /api/v1/escrow/milestones` -> `milestones` (includes server-resolved `counterparty`, `contract.title`, `contract.category`, `clientName`, `freelancerName`, `paymentRail`, `fundedAt`, `submittedAt`, `autoReleaseAt`, `releasedAt`, `deliverableUrl`)
- `GET /api/v1/wallet/topups` -> `topUps`

### 1.2 Persisted Shell Preferences (`ShadcnLayoutContext.tsx`)
The active dashboard mode (`dashboardVariant`: `"dashboard-1"` or `"dashboard-2"`), Pipeline sub-tab (`opsSubTab`: `"table"`, `"kanban"`, or `"calendar"`), sidebar variant (`"sidebar"`, `"inset"`, `"floating"`), sidebar collapse state, table density (`"compact"` or `"comfortable"`), and corner radius (`0.375rem`, `0.5rem`, `0.75rem`) persist per browser in `localStorage["yekis-shadcn-layout-v1"]`.

### 1.3 Real-Data Rules (`dashboardAnalytics.ts`, `dashboardData.ts`)
- No synthetic fallback curves or demo milestone ledgers exist in `dashboardData.ts` or `ShadcnCharts.tsx`.
- Empty windows report `null` trend rates (displaying `"No prior 30d baseline"` / `"Nothing settled yet"`) and render chart empty states rather than fabricated numbers.
- **Exception (explicitly noted)**: `FeaturedCarousel.tsx` (shown to Clients and `BOTH`) calls `GET /api/v1/featured-talent` and falls back to built-in `DEMO_TALENTS` cards if the API request fails or returns an empty list.

---

## 2. Dashboard Top Sub-Header (`MarketplaceShadcnDashboard.tsx`)

### 2.1 What It Shows
- **Left Group**:
  - **Mode Switcher (`role="tablist"`)**: Toggles between **Executive Analytics** (`dashboard-1`) and **Work Pipeline** (`dashboard-2`).
  - **Pipeline Sub-Tab Switcher** (shown only when `dashboardVariant === "dashboard-2"`): Switches between **Table** (`ledgerRecords.length`), **Kanban** (`kanbanTasks.length`), and **Calendar** (`scheduleEvents.length`), paired with the `dashboard-pipeline-stages` contextual help trigger (`?`).
- **Right Group**:
  - Contextual help trigger (`dashboard-kpis`).
  - **Quick Jump (`⌘K`)** button opening `WorkspaceCommandPalette`.
  - **Refresh** icon button (`onRefresh`, spins while `isRefreshing`).
  - **Role-Specific Primary CTA**:
    - `CLIENT` and `BOTH` (`canHire`): **Post a Job Brief** -> switches to `jobs`.
    - `FREELANCER` (`!canHire && canWork`): **Browse Open Briefs** -> switches to `jobs`.

---

## 3. Expandable 4-Column KPI Stat Strip

Visible at the top of **both** Executive Analytics and Work Pipeline modes. Clicking any KPI card toggles its inline drill-down drawer (`expandedKpi`).

| KPI Card | Primary Value & Source | Trend Line (`dashboardAnalytics.ts`) | Drill-Down Drawer Contents & Action |
|---|---|---|---|
| **1. Available Wallet Balance** | `ETB (wallet.balanceMinor / 100)` | `topUpTotals(topUps, 30d)` compares approved top-ups in the current 30d vs prior 30d (`periodChange()`). Shows `%` delta (green `>= 0`, red `< 0`) or `"No prior 30d baseline"` / `"No top-ups yet"`. | **Approved Top-Ups** (ETB sum of `APPROVED` top-ups), **Pending Receipt Verification** (ETB sum of non-`APPROVED` top-ups), and **Open Wallet Desk** button -> navigates to `wallet`. |
| **2. Protected in Escrow** | Sum of `amountMinor` for milestones in funded non-terminal states (`ESCROW_HELD`, `WORK_IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `ACCEPTED`, `DISPUTED`) | `escrowFundedTotals(milestones, 30d)` compares milestones with `fundedAt` in current 30d vs prior 30d. Shows `%` delta, 30d funded total, and active count — or `"No prior 30d baseline"` / `"No escrow yet"`. | **Released YTD** (sum of `RELEASED` milestones), **Submitted for QA** (sum of `SUBMITTED_FOR_REVIEW`), and **Inspect Contracts** button -> navigates to `contracts`. |
| **3. Active Milestone Velocity** | Count of non-terminal milestones (`!== RELEASED`, `REFUNDED`, `PARTIAL_REFUND`) | `onTimeStats(milestones)` computes `%` of `RELEASED` milestones where `releasedAt <= dueDate`, or `"Nothing settled yet"` when `released === 0`, plus `onTime/released` across contract count. | **In Active Delivery** (`WORK_IN_PROGRESS` count), **Escrow Funded & Ready** (`ESCROW_HELD` count), and **Open Kanban** button -> switches to `dashboard-2` + `kanban` sub-tab. |
| **4. Your Briefs** (`CLIENT`) / **Open Marketplace Briefs** (`FREELANCER` & `BOTH`) | Count of `OPEN` briefs in `effectiveJobs` (`myJobs` when `!canWork`, else marketplace `jobs`) | `briefsCreatedSince(effectiveJobs, 7d)` shows `N new this week` or `"No new briefs this week"`, plus subtitle distinguishing own hiring briefs vs open marketplace briefs. | **Combined Budget Pool** (sum of `budgetMaxMinor` across `effectiveJobs`) and **Explore Briefs** button -> navigates to `jobs`. |

---

## 4. Mode 1: Executive Analytics (`dashboard-1`)

### 4.1 Cashflow Area Chart (`InteractiveCashflowAreaChart` in `ShadcnCharts.tsx`)
- **What It Shows**:
  - Time window switcher: **7D** (`7` daily buckets), **30D** (`8` buckets), **90D** (`9` buckets), **12M** (`12` monthly buckets). Updating the range also updates the adjacent Rail Velocity chart.
  - **Two Series** (built by `buildLiveTimeSeries()`):
    - **Escrow Funded (`#16a34a` emerald area/line)**: Sums `amountMinor` for milestones in `FUNDED_ESCROW_STATES` bucketed by `milestone.fundedAt`.
    - **Released to Talent (`#0d9488` teal dashed line/area)**: Sums `amountMinor` for `RELEASED` milestones bucketed by `milestone.releasedAt`.
  - **Empty State**: When `hasCashflowActivity()` is false across the selected window, renders `.sh-chart-empty` instead of an SVG curve.
- **What It Executes**:
  - Clicking the **Escrow Funded** or **Released to Talent** summary pills toggles series visibility (preventing both from being turned off simultaneously).
  - Hovering data columns moves the vertical crosshair and updates the live readout (`In ETB ... · Out ETB ...`) for that bucket.

### 4.2 Rail Velocity Bar Chart (`InteractiveRailVelocityBarChart` in `ShadcnCharts.tsx`)
- **What It Shows**:
  - Stacked vertical bars across the shared `range` (`7D`–`12M`) attributing external-rail volume (`Telebirr` `#16a34a`, `CBE Birr` `#0d9488`, `M-Pesa` `#64748b`) from two sources:
    1. Funded milestones (`FUNDED_ESCROW_STATES`) with a non-null external `milestone.paymentRail` (`TELEBIRR`, `CBE_BIRR`/`CBE`/`BANK`/`CBE_BANK`, `M_PESA`/`MPESA`/`SAFARICOM`) placed at `fundedAt`. Internal wallet-funded milestones (`paymentRail === null`) intentionally stay out of external rail totals.
    2. `APPROVED` wallet top-ups (`topUp.provider ?? topUp.paymentMethod`) placed at `createdAt`.
  - Header readout shows `milestonesSettled` for the hovered (or latest) bucket; legend displays ETB sums per rail for that bucket.
  - **Empty State**: When `hasRailActivity()` is false, renders `.sh-chart-empty`.
- **What It Executes**: Hovering bars highlights the bucket and updates the legend/settled-milestone counts.

### 4.3 Operational Snapshots (2-Column Row)
1. **Recent Milestone Escrow Activity** (left card):
   - Shows up to 5 recent milestones (`title`, `#id` prefix, localized `escrowState`, `dueDate`, ETB amount) or an empty-state row when `effectiveMilestones.length === 0`.
   - **Open Full Table** switches to `dashboard-2` -> `table`; each row's **Contract** button navigates to `contracts`.
2. **Active Hiring Briefs (`CLIENT`) / Recommended Briefs (`FREELANCER` & `BOTH`)** (right card):
   - **Client (`!canWork`)**: Lists up to 4 of the client's own briefs (`myJobs`) with category, deadline, max budget, and **Manage** -> `jobs`.
   - **Freelancer & Both (`canWork`)**: Lists up to 4 open marketplace briefs (`jobs`) with category, deadline, max budget, and **Submit Proposal** -> `jobs`.
   - **View All (`N`)** navigates to `jobs`.

### 4.4 Featured Talent Carousel (`FeaturedCarousel.tsx`)
- **Visibility**: Shown below the operational snapshots when `canHire || !canWork` (i.e., **Client** and **Dual-Role `BOTH`** views; hidden when switched to **Freelancer** mode).
- **What It Shows**:
  - Header filter tabs: **All (`N`)** and **Saved (`N`)** (bookmarked IDs persisted in `localStorage`).
  - Horizontal talent cards fetched from `GET /api/v1/featured-talent` (with fallback to `DEMO_TALENTS` if the API fails or returns empty), showing avatar/initials, name, verified check, primary role, up to 3 skill chips, Bayesian rating / "New" badge, completed jobs, hourly ETB rate, location, and quick **Share** / **Bookmark** icon buttons.
- **What It Executes**:
  - Clicking **Share** copies the URL to clipboard with a toast confirmation.
  - Clicking **Bookmark** adds/removes the freelancer from the saved shortlist.
  - Clicking a card opens the **Quick-View Profile Modal** (`ft-modal-content`) displaying full bio, languages, member-since, response time, stats strip, portfolio/reviews, and 4 actions:
    - **Hire [Name]** -> closes modal and opens direct chat (`openChatWithUser()` -> `chat`) or full profile.
    - **Message** -> closes modal and opens direct chat (`chat`).
    - **Open Full Profile** -> calls `onSelectProfile(id)` (`openProfileOf(id)` -> `profile`).
    - **Bookmark** -> toggles shortlist membership.

---

## 5. Mode 2: Work Pipeline (`dashboard-2`)

Switching to **Work Pipeline** exposes three live read-only projections of the account's server escrow state (`milestones`), server fee breakdown (`GET /api/v1/escrow/fee-config` and `calculateFees()` per milestone), and brief deadlines (`effectiveJobs`). When a Client has `onFundMilestone` wired into `MarketplaceShadcnDashboard.tsx`, triggering **Fund Milestone** from Table or Kanban opens a shared `ConfirmActionModal` (**Confirm & Fund Escrow**) displaying gross escrow, client fee, and total wallet debit before calling `onFundMilestone(milestoneId)`.

### 5.1 Escrow Ledger Table (`AdvancedDataTable.tsx`)
- **What It Shows**:
  - Header showing filtered count and combined ETB value, plus **Export CSV**, **Export Selected (`N`)** (when rows are checked), **Columns** visibility menu (`Counterparty`, `Category`, `Rail`, `Due Date`, and `Client fee` / `Fee` depending on role), and mobile **Cards / Table** switcher.
  - Toolbar: search input (matches `title`, `contractTitle`, `counterparty`, `code`, `category`), status filter tabs (`All`, `Escrow Held`, `In Progress`, `Submitted`, `Released`, `Disputed`), and payment rail `<select>` (`TELEBIRR`, `CBE_BIRR`, `M_PESA`, `INTERNAL_WALLET`, `UNFUNDED`).
  - Role-aware fee & payout columns from server `calculateFees()`: Client view shows `Client fee` (`ETB 0` with an info popover driven by `feeConfig`) and `Total`; Freelancer view shows `Platform fee`, `Provider fee`, and `Net payout`.
  - Sortable columns (`Title`, `Counterparty`, `State`, `Due Date`, `Amount`), row checkboxes, pagination (`10` or `20` rows/page), and **Row Inspector Drawer**.
- **What It Executes**:
  - **Export CSV / Export Selected**: Downloads `yekis-contracts-ledger-YYYY-MM-DD.csv` client-side with role-matching fee columns.
  - **Row Inspector Drawer**: Clicking any row opens full server details (Contract, Counterparty + email, Category, Gross Escrow, role-appropriate Fee / Total / Net Payout lines, Due Date, State) plus role-gated authoritative navigation/actions:
    - **Client (`viewerRole === "CLIENT"`)**: Shows awaiting-signature note if `contractFullyExecuted === false` on `PAYMENT_PENDING`; otherwise **Fund Milestone** (`onRequestFundMilestone`), **Review & Release** on `SUBMITTED_FOR_REVIEW` (`onOpenEscrow`), and **Dispute** on funded active states (`onOpenEscrow`).
    - **Freelancer (`viewerRole !== "CLIENT"`)**: **Submit Delivery** on `ESCROW_HELD` / `WORK_IN_PROGRESS` (`onOpenEscrow`) and **Dispute** on funded active states (`onOpenEscrow`).
    - Footer buttons: **Open in Escrow Center** (`onOpenEscrow`) and **Open Full Contract Room** (`onOpenContracts`).

### 5.2 Milestone Kanban Board (`KanbanBoardView.tsx`)
- **What It Shows**:
  - 5 fixed columns mapped from milestone `escrowState`:
    1. **Scoping & Awaiting Funding** (`BACKLOG`: `PAYMENT_PENDING`, `DISPUTED`, `REFUNDED`, `PARTIAL_REFUND`)
    2. **Escrow Funded** (`ESCROW_HELD`)
    3. **In Active Delivery** (`WORK_IN_PROGRESS`)
    4. **Submitted for Review** (`SUBMITTED_FOR_REVIEW` and `ACCEPTED`)
    5. **Released & Settled** (`RELEASED`)
  - **Multi-Dimensional Filter Bar**: Search input (title, contract, counterparty, client, freelancer, code), **Client** dropdown, **Freelancer** dropdown, **Contract** dropdown, **Priority** segmented control (`All`, `High` >= 50k ETB, `Medium` >= 35k ETB, `Low` < 35k ETB), **Overdue only** toggle, and **Clear filters**.
  - **Board Summary & Navigation Bar**: Visible/total task count, overdue alert flag (evaluated in `Africa/Addis_Ababa`), **Collapse empty** / **Expand all**, horizontal board scroll buttons (`<` / `>`) with edge fade masks (`animation-timeline: scroll(self inline)` + `IntersectionObserver` fallback), and mobile stage tabs (`<= 1024px`).
  - **Cards**: Show code, payment rail, priority indicator, title, contract title, `Client -> Freelancer` line, ETB amount, due-status indicator (overdue, due today, due soon, settled, or scheduled), and **View Details** trigger.
  - **Actionable Empty Columns**: When filtered empty, shows hidden count and **Clear filters**; when truly empty, shows stage-specific explanation and navigation CTA (**Open Contracts** or **Open Escrow Center**).
- **What It Executes**:
  - **Read-Only Server Projection + Inline Details `<dialog>`**: Clicking any milestone card or its view button opens a native `<dialog>` (`showModal()`, `closedby="any"` with pointer fallback, `overscroll-behavior: contain`) displaying full contract/client/freelancer/rail metadata, role-aware server fee breakdown (`Client fee` / `Total charge` + fee note for Client, `Platform fee` / `Provider fee` / `Net payout` for Freelancer), schedule status, `fundedAt` / `submittedAt` / `autoReleaseAt` / `releasedAt` timestamps, `deliverableUrl` link, and role-gated action triggers (**Fund Milestone**, **Review & Release**, **Submit Delivery**, **Dispute**, **Open in Escrow Center**, **Open Contracts Workspace**).

### 5.3 Milestone & Payout Schedule Calendar (`CalendarScheduleView.tsx`)
- **What It Shows**:
  - **Schedule Source**: Read-only projection combining `milestones` (`MILESTONE_DUE`, `PAYOUT_RELEASE` for `RELEASED`, `COMPLIANCE_KYC` for `DISPUTED`) with up to 10 `effectiveJobs` (`PROPOSAL_DEADLINE`, `rail: null`).
  - **Dual Calendar System**: Toggle between **Gregorian** and **Ethiopian Fiscal (`kenat`)** modes, month `<` / `>` steppers, **Today** jump button (`Africa/Addis_Ababa`), **Today** / **Selected** badges, and event type filter (`All`, `Milestone Due`, `Payout Release`, `Proposal Deadline`, `Compliance`).
  - **Ethiopian Fiscal Bar** (shown in `fiscal` mode): Displays Ethiopian Fiscal Year (`EFY`) summary and interactive **Q1–Q4** quarter cards with item counts and ETB totals (clicking jumps to the quarter's first event or start date).
  - **Split View**: Month grid (showing dual dates and up to 2 event pills + daily ETB volume per cell; mobile quick-jump date pill strip on `<= 768px`) + **Right-hand Agenda Inspector** (Gregorian date, Ethiopian date, Amharic date, EFY quarter context, selected-day event cards, and next 4 upcoming events).
- **What It Executes**:
  - Clicking any calendar day, fiscal quarter card, or upcoming row selects that date in the agenda inspector.
  - Clicking **Open in Escrow Center** on a milestone agenda card navigates directly to Escrow for that `milestoneId`.

---

## 6. Quick Jump Command Palette & Layout Customizer

- **Workspace Command Palette (`WorkspaceCommandPalette.tsx`)**: Opened from the dashboard **Quick Jump (`⌘K`)** button, topbar button, or `Cmd/Ctrl+K`. Provides keyboard-navigable (`ArrowUp`/`ArrowDown`/`Enter`/`Esc`) search across:
  - **Dashboard Modes**: Executive Analytics, Pipeline Table, Pipeline Kanban, Pipeline Calendar.
  - **Workspace Navigation**: Briefs/Jobs, Gigs, Contracts, Escrow, Wallet, Chat, Verification, Disputes, Profile, Settings.
  - **Role Mode** (only for `BOTH` accounts): Switch between `Client (Hiring)`, `Freelancer (Work)`, and `Client & Freelancer`.
  - **Appearance**: Open Layout Customizer, Collapse/Expand Sidebar, Toggle Light/Dark Theme.
- **Layout Customizer Drawer (`ShadcnLayoutContext.tsx`)**: Opened from Command Palette or **Settings**. Configures sidebar layout (`sidebar`, `inset`, `floating`), density (`compact`, `comfortable`), corner radius, theme, and **Reset Layout**.
