# Yekis Workspace Sidebar Features Reference (Client & Freelancer)

> **Canonical Scope**: This document specifies every item in the browser platform workspace sidebar (`apps/frontend/src/FullPlatformApp.tsx`), detailing what each view **shows** and **executes** for **Client** (`CLIENT`), **Freelancer** (`FREELANCER`), and **Dual-Role** (`BOTH`) accounts. All endpoints, UI controls, gates, and state transitions below are verified directly against the current frontend and backend source code.
>
> - **Staff & Admin accounts** (`user.staffRole`: `SUPER_ADMIN`, `ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`, `COMPLIANCE_OFFICER`, `SUPPORT`) are routed exclusively to the Operations Console (`apps/frontend/src/pages/ops/OpsConsole.tsx`) before the workspace sidebar renders; see [docs/ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md](./ADMIN_STAFF_SIDEBAR_FEATURES_REFERENCE.md).
> - **Telegram Mini App** (`apps/frontend/src/App.tsx`) uses a sticky horizontal tab bar rather than this sidebar.

---

## 1. Sidebar Shell, Role Switching & Activity Indicators

### 1.1 Sidebar Structure (`FullPlatformApp.tsx`)
The left sidebar (`<aside className="platform-sidebar">`) is sticky (`100vh`) on desktop (`> 900px`) and renders as a slide-in drawer (`#workspace-mobile-drawer`) on viewports `<= 900px`:
1. **Brand Header**: Clicking the Yekis logo navigates to `overview` (Dashboard) and closes the mobile drawer. A toggle button beside it collapses/expands the sidebar on desktop (`PanelLeftClose` / `PanelLeftOpen`) or closes the drawer on mobile (`X`).
2. **Dual-Role Mode Switcher** (`basePlatformRole === "BOTH"`):
   - A 2-way `Client` / `Freelancer` segmented switch in the topbar (and inside the mobile drawer on `<= 1024px`) remembers the user's last selection in `localStorage["yekis_dual_role_mode"]`, defaults to `CLIENT`, and automatically migrates any legacy stored `"BOTH"` value to `"CLIENT"`.
   - Switching mode immediately recalculates `canHire` and `canWork`, showing either the Client workspace or the full Freelancer workspace cleanly.
3. **Grouped Primary Navigation (`navItems`)**:
   - **Desktop (`>= 1024px`)**: Consolidated Client sidebar holds **6 core items** (`Home`, `Jobs` [with `My jobs` & `Proposals` tabs], `Services`, `Contracts` [with `Overview`, `Payments` (`EscrowWorkspace`), and `Disputes` (`DisputesWorkspace`) tabs], `Wallet` [shown as `Wallet & Payouts` when `canWork` is true], and `Messages`). Freelancer / `BOTH` adds `My Gigs`. Account routes (`My Profile`, `Identity verification`, `Settings`) live in the topbar **Avatar menu** (plus `user-chip`).
   - **Mobile Header Menu Drawer (`#workspace-mobile-drawer` at `<= 1023px`, opened from the visible topbar Menu button at `360px`)**: Keeps core navigation plus `Services`, `Profile`, `Identity verification`, and `Settings` directly reachable.
   - **Unread Activity Badges (`navActivityCount`)**: Aggregated across merged sections (`Jobs` combines `jobs` + `proposals` + new briefs; `Contracts` combines `contracts` + `escrow` + `cases`). Opening a host tab clears the matching unread notifications via `markViewNotificationsRead()`.
4. **Account Avatar Menu & Topbar KYC Status**: Topbar Avatar opens `#workspace-avatar-menu` (`Profile`, `Identity verification`, `Settings`, `Sign out`); `KYC: Verified` / `KYC: Required` renders as bold plain text+icon (`docs/rule.md` §2 — no pills, no clickable duplicate). Top-level views hide the universal back arrow and workspace breadcrumb prefix, keeping them on detail sub-views (`profile-edit`, another member's `profile`).
5. **Mobile Bottom Navigation (`<= 1023px`, Option B)**: Pins **5** thumb-zone tabs across roles: **Home** (`overview`), **Jobs** (`jobs`), **Contracts** (`contracts`), **Wallet** (`wallet`, or `Wallet & Payouts` when `canWork`), and **Messages** (`chat`, with unread `.nav-dot`). The header menu button remains visible at `360px` to reach **Services**, **Profile**, **Identity verification**, and **Settings**.

---

## 2. Role Visibility & Route Map

*(All 14 `View` keys remain valid deep-link aliases across notifications, `CommandPalette`, `FirstRunChecklist`, and the 12 Yekis Guide module tours via `resolveViewAlias()`.)*

| # | View Key | Client (`CLIENT`) Surface | Freelancer (`FREELANCER`) Surface | Dual-Role (`BOTH`) Surface | Source Component(s) |
|---|---|---|---|---|---|
| 1 | `overview` | **Home** (Sidebar + Mobile Bar) | **Home** | **Home** | `MarketplaceShadcnDashboard.tsx` |
| 2 | `jobs` | **Jobs** -> `My jobs` tab (Sidebar + Mobile Bar) | **Find Work** | **Find Work / Post a Job** | `FullPlatformApp.tsx`, `JobsWorkspace.tsx` |
| 3 | `proposals` | *Alias -> `Jobs` -> `Proposals` tab* | *Alias -> `Jobs` -> `Proposals` tab* | *Alias -> `Jobs` -> `Proposals` tab* | `JobsWorkspace.tsx` |
| 4 | `gigs` | **Services** (Sidebar + Mobile Drawer) | **Gigs** | **Gigs / Services** | `GigMarketplace.tsx` |
| 5 | `my-gigs` | *Hidden* | **My Gigs** (Sidebar) | **My Gigs** | `GigSellerDashboard.tsx` |
| 6 | `contracts` | **Contracts** -> `Overview` tab (Sidebar + Mobile Bar) | **Contracts** | **Contracts** | `WorkflowWorkspace.tsx` (`ContractsWorkspace`) |
| 7 | `escrow` | *Alias -> `Contracts` -> `Payments` tab* | *Alias -> `Contracts` -> `Payments` tab* | *Alias -> `Contracts` -> `Payments` tab* | `WorkflowWorkspace.tsx` (`EscrowWorkspace`) |
| 8 | `wallet` | **Wallet** (Sidebar + Mobile Bar) | **Wallet & Payouts** | **Wallet** / **Wallet & Payouts** | `BrowserWallet.tsx` |
| 9 | `chat` | **Messages** (Sidebar + Mobile Bar) | **Messages** | **Messages** | `ChatWorkspace.tsx` |
| 10 | `profile` | **Avatar Menu** + Mobile Drawer (`My Profile`) | **Avatar Menu** + Mobile Drawer | **Avatar Menu** + Mobile Drawer | `ProfilePage.tsx` (+ `ProfileEditPage.tsx`) |
| 11 | `cases` | *Alias -> `Contracts` -> `Disputes` tab* | *Alias -> `Contracts` -> `Disputes` tab* | *Alias -> `Contracts` -> `Disputes` tab* | `WorkflowWorkspace.tsx` (`DisputesWorkspace`) |
| 12 | `verification` | **Avatar Menu** + Mobile Drawer (`Identity verification`) | **Avatar Menu** + Mobile Drawer | **Avatar Menu** + Mobile Drawer | `BrowserVerification.tsx` |
| 13 | `settings` | **Avatar Menu** + Mobile Drawer (`Settings`) | **Avatar Menu** + Mobile Drawer | **Avatar Menu** + Mobile Drawer | `SettingsWorkspace.tsx` |

> **Workspace-wide Topbar & Help Controls**: Outside the sidebar items themselves, the persistent topbar provides **Mobile Header Menu Button** (`<= 1023px`, including `360px`), **Universal Back** (on detail sub-views), **Command Palette** (`Cmd/Ctrl+K`, including `Proposals`, `Escrow / Payments`, `Disputes`, `Identity Verification`, `Profile`, and `Settings`), **Language Selector** (`en`/`am`/`om`/`ti`, synced via `PATCH /api/v1/users/me/profile`), **Theme Toggle** (single topbar theme switch for light/dark; Sound toggle lives in **Settings**), **Notification Center** (deep-linking into host tabs and clearing alias unread counts), **Global Help Menu** (`?` / `Shift+?` — interactive 12-module product tours synced via `getActiveGuideModule()`), and **Avatar Menu** (`Profile`, `Identity verification`, `Settings`, `Sign out`).

---

## 3. Detailed Feature Reference (By Sidebar Item)

### 3.1 Dashboard (`overview`)
- **Component**: `apps/frontend/src/components/dashboard/MarketplaceShadcnDashboard.tsx` (with code-split lazy `ShadcnCharts.tsx`, `AdvancedDataTable.tsx`, `KanbanBoardView.tsx`, `CalendarScheduleView.tsx`, and `FeaturedCarousel.tsx`).
- **Role Differences**:
  - **Client (`canHire && !canWork`)**: While `hasActivity === false` (zero jobs, contracts, milestones, or `APPROVED` top-ups), hides KPI strip, charts, and empty list cards so `FirstRunChecklist` renders immediately under the sub-header (`Verify identity` primary CTA when unverified, or `Post a job` when verified, plus `Browse services` once). Once active (`hasActivity === true`), orders Client Home as `Needs your attention` -> `Active contracts` -> `Your open jobs` -> compact KPIs (`Wallet balance`, `Held in escrow`) -> `Verified freelancers` (`FeaturedCarousel`) -> collapsible `Insights` (shown and lazy-loaded only when at least one `RELEASED` milestone or `APPROVED` top-up exists).
  - **Freelancer (`!canHire && canWork`)**: Displays the 4 KPI cards (`Wallet balance`, `Held in escrow`, `Work in progress`, `Open jobs`), `Needs your attention`, collapsible `Insights` when settled/approved records exist, `Recent Escrow & Milestone Activity`, and `Recommended Jobs` with **Submit Proposal** buttons (`FeaturedCarousel` is hidden). Primary topbar CTA is **Browse Open Jobs** (routes to `jobs`).
  - **Both (`canHire && canWork`)**: Uses the persisted 2-way `Client` / `Freelancer` mode switch to render the corresponding Client or Freelancer layout cleanly.
- **What It Shows**:
  - **Top Sub-Header**: View switcher between **Overview** (`dashboard-1`) and **Pipeline** (`dashboard-2`, with **List**, **Board**, and **Calendar** sub-tabs), plus **Quick Jump (`⌘K`)**, **Refresh**, secondary **Browse services** (when checklist is not mounted), and role-specific primary CTA.
  - **KPI Cards** (derived from real account data — `"No prior baseline"` when prior-period history is empty): **Wallet balance**, **Held in escrow**, and for Freelancer/Admin also **Work in progress** and **Open jobs**.
  - **Pipeline Mode (`dashboard-2`)** *(code-split read-only projections of live server escrow state + server fee breakdowns)*:
    - **List (`AdvancedDataTable`)**: Shows a single empty state + primary action when `records.length === 0`; when active, provides searchable/sortable/paginated milestone list with **View payments** and **View your contracts** actions.
    - **Board (`KanbanBoardView`)**: Shows a single empty state + primary action when `tasks.length === 0`; when active, displays stage columns (**Payment pending**, **Escrow held**, **In progress**, **Ready for review**, **Paid**, and a dedicated **In dispute / Refunded** column whenever disputed/refunded milestones exist).
    - **Calendar (`CalendarScheduleView`)**: Month grid, **Today**, and **Add Reminder** stay visible when empty (hiding filters, legend, and fiscal quarter cards until events exist); supports **Gregorian** and **Ethiopian Fiscal Calendar** (`kenat`, `tabular-nums`, `2026-11-27` = `Hidar 18, 2019 E.C.`) with **View payments** links.
- **What It Executes**:
  - Refresh calls `loadWorkspace()` (`GET /api/v1/auth/me`, `/escrow/wallet`, `/jobs`, `/jobs/mine`, `/contracts`, `/chat/conversations`, `/escrow/milestones`, `/wallet/topups`, `/escrow/fee-config`, `/users/me/profile-completeness`).
  - Card/button navigation jumps to `wallet`, `contracts`, `escrow`, `jobs`, `proposals`, `profile` (selected freelancer), or `chat` (`openChatWithUser()`).

---

### 3.2 Jobs / Find Work (`jobs`)
- **Components**: `FullPlatformApp.tsx` (top publish form) + `apps/frontend/src/WorkflowWorkspace.tsx` (`JobsWorkspace` with `section="jobs"`).
- **For Client (`canHire && !canWork`)**:
  - **What It Shows**:
    1. **Publish a Job Brief Form** (in `FullPlatformApp.tsx`): Shows an upfront KYC verification banner when `user.kyc?.status !== "VERIFIED"` (disabling publishing until KYC is approved), plus Brief Title, Category selector (10 categories), Scope & Deliverables textarea, Min/Max Budget (ETB), and Target Deadline (`type="date"`).
    2. **Your Published Briefs (`myBriefsPanel`)**: List of the client's own jobs (`GET /api/v1/jobs/mine`). The open marketplace briefs board is hidden for Client-only accounts (it renders only for `canWork`).
    3. **Start Chat from Proposals & Gigs**: Incoming proposals (`Proposals` tab) and Gig Detail seller panels (`Gigs` tab) provide direct **Chat** / **Message seller** buttons wired to `openChatWithUser()`.
  - **What It Executes**:
    - Submitting the brief form validates title (`>= 5` chars), description (`>= 20` chars), positive budget range (`max >= min`), and deadline, then calls `POST /api/v1/jobs` (`api.createJob()`), creating an `OPEN` brief with an initial delivery milestone (`budgetMaxMinor`), refreshes workspace data, and surfaces KYC guidance if `nextAction.type === "KYC"` is returned.
- **For Freelancer (`canWork`)**:
  - **What It Shows**:
    - **Open Marketplace Briefs Board**: Multi-criteria toolbar with keyword search (title, description, category), Category dropdown, Budget preset selector (`All`, `Under 10k`, `10k–30k`, `30k–75k`, `Over 75k`, `Custom` Min/Max ETB inputs), Deadline proximity filter (`All`, `3d`, `7d`, `14d`, `30d`), and **Reset Filters**.
    - Each brief card shows status, ETB budget range, title, truncated description, category, deadline, days-left/overdue indicator, and either the freelancer's existing proposal status (`SUBMITTED`/`SHORTLISTED`/`ACCEPTED`/`REJECTED`) or **View Details** + **Apply** buttons.
    - Expanding **View Details** shows the full scope and deliverables.
    - Clicking **Apply** opens the inline **Submit Proposal** form: Cover Letter (min 20 chars), Quote (ETB), Estimated Days, Milestone Due Date, live **Escrow & Net Payout Breakdown** (`EscrowFeeBreakdown`: 0% client surcharge, 7% platform fee + 0.5% disbursement/payment fee = 92.5% net payout preview), and encrypted file uploader (`FileUploader`, up to 6 files, `.pdf/.doc/.docx/.jpg/.jpeg/.png`, max 25 MB each).
  - **What It Executes**:
    - Uploads attachments sequentially via `POST /api/v1/jobs/:jobId/proposals/attachments` (`api.uploadProposalAttachment()`).
    - Submits the proposal via `POST /api/v1/jobs/:jobId/proposals` (`api.submitProposal()`), tracks analytics (`events.proposalSubmitted()`), and refreshes `myProposals` and workspace state.

---

### 3.3 Proposals (`proposals`)
- **Component**: `apps/frontend/src/WorkflowWorkspace.tsx` (`JobsWorkspace` with `section="proposals"`).
- **For Client (`canHire`)**:
  - **What It Shows**:
    - **Hiring Pipeline (`hiringPanel`)**: Every brief the client owns (`GET /api/v1/jobs/mine`) paired with all received proposals (`GET /api/v1/jobs/:jobId/proposals`). Each proposal row displays freelancer email, quoted ETB amount, estimated days, status (`SUBMITTED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`), and full cover letter.
  - **What It Executes**:
    - For proposals in `SUBMITTED` or `SHORTLISTED`:
      - **Shortlist** (`SUBMITTED` only): Calls `POST /api/v1/jobs/proposals/:proposalId/decision` with `"SHORTLISTED"`.
      - **Accept**: Calls `POST /api/v1/jobs/proposals/:proposalId/decision` with `"ACCEPTED"`, which rejects competing proposals, transitions the job to `IN_PROGRESS`, generates the bilateral contract + milestones + PDF agreement, and makes the contract visible in **Contracts**.
      - **Reject (`X`)**: Calls `POST /api/v1/jobs/proposals/:proposalId/decision` with `"REJECTED"`.
- **For Freelancer (`canWork`)**:
  - **What It Shows**:
    - **My Proposals (`proposals-my-list`)**: Count badge (`bidsCount`) and list of every proposal submitted by the freelancer (`GET /api/v1/jobs/proposals/mine`), showing brief title, quoted ETB, delivery days, current status (`SUBMITTED`, `SHORTLISTED`, `ACCEPTED`, `REJECTED`), and a **Withdraw** button for `SUBMITTED` or `SHORTLISTED` bids. Empty state includes a **Browse Briefs** button routing back to `jobs`.
  - **What It Executes**:
    - Clicking **Withdraw** opens `ConfirmActionModal` displaying brief summary and quoted amount; confirming calls `DELETE /api/v1/jobs/proposals/:proposalId` (`api.withdrawProposal()`) and removes/updates the bid.

---

### 3.4 Gigs (`gigs`)
- **Component**: `apps/frontend/src/GigMarketplace.tsx` (available to both Client and Freelancer accounts).
- **What It Shows**:
  - **Marketplace Browser**: Command hero banner with escrow trust strip, category breadcrumb + dropdown + horizontal category tabs (matching backend gig categories), keyword search input, result counter, and sort selector (`Recommended`, `Highest Rated`, `Price: Low to High`, `Price: High to Low`, `Fastest Delivery`).
  - **Gig Grid**: Cards showing cover art/category pattern, category tag, fastest delivery days, seller avatar + name + verified icon + bio, gig title, up to 3 tags, Bayesian rating + review count, escrow protection label, starting package price in ETB, and **View Packages**.
  - **Gig Detail View** (when a gig is clicked): Breadcrumb trail (`Services > Category > Title`), rating/turnaround/escrow metadata, **Freelancer Profile Spotlight**, showcase visual, **Service Overview** prose, **Buyer Requirements** checklist (if configured), **FAQ** list (if configured), **Escrow Guarantee Callout**, and **Package Selector & Checkout Card** on the right with package tier tabs (`BASIC`, `STANDARD`, `PREMIUM`), price, delivery days, included revisions, and **Order & Fund Escrow** CTA.
- **What It Executes**:
  - Search/filter calls `GET /api/v1/gigs` (`api.searchGigs({ category, q, page: 1, pageSize: 36 })`).
  - Clicking **Order & Fund Escrow** executes a two-step backend flow: `POST /api/v1/gigs/packages/:packageId/orders` (`api.createGigOrder()`) followed immediately by `POST /api/v1/gig-orders/:orderId/fund` (`api.fundGigOrder()`), debiting the buyer's wallet into `ESCROW_HELD` (requiring fresh authentication if enforced), firing `events.escrowFunded("gig_order")`, and displaying an inline confirmation or error banner (such as insufficient wallet balance).

---

### 3.5 My Gigs (`my-gigs`)
- **Component**: `apps/frontend/src/GigSellerDashboard.tsx`.
- **Visibility**: Shown **only** when `canWork` is true (`FREELANCER` or `BOTH`). Hidden for `CLIENT`-only accounts.
- **What It Shows**:
  - **Header & KPI Strip**: Shows `Live Gigs` and `Total Gigs` live counts from `GET /api/v1/gigs/mine`, plus `Create Gig` button. (*Honesty note*: the `Active Orders` and `Total Earnings` KPI tiles currently render `—` and `ETB —` placeholders.)
  - **Gig Cards List**: Each seller gig displays title, category, cheapest package starting price (`From ETB ...`), status pill (`DRAFT`, `ACTIVE`, `PAUSED`, `ARCHIVED`) with status guidance text, ratings count, view count, package count, and action buttons (**Edit**, **Pause** when `ACTIVE`, **Archive** when not `ARCHIVED`).
  - **Create / Edit Gig Editor View**: Replaces the list when creating or editing:
    - Fields: Title (max 120 chars), Category select, Description (max 5000 chars), Comma-separated Tags, Max Revisions (`0–20`).
    - **Packages Builder**: Up to 3 tiers (`BASIC`, `STANDARD`, `PREMIUM`), each with Package Title, What's Included description, Delivery Days (`1–365`), Revisions Included (`0–20`), Price (ETB), and an inline **Escrow & Net Payout Breakdown** (`EscrowFeeBreakdown`). When editing an existing gig, packages are displayed read-only because `UpdateGigInput` does not modify tiers after creation.
- **What It Executes**:
  - **Create**: `POST /api/v1/gigs` (`api.createGig()`) submits the new gig and packages for review/publishing.
  - **Edit**: `PATCH /api/v1/gigs/:gigId` (`api.updateGig()`) updates title, category, description, tags, and max revisions.
  - **Pause**: `PATCH /api/v1/gigs/:gigId/status` (`api.setGigStatus(id, "PAUSED")`).
  - **Archive**: Opens `ConfirmActionModal` (`danger` tone) and on confirm calls `PATCH /api/v1/gigs/:gigId/status` (`api.setGigStatus(id, "ARCHIVED")`).

---

### 3.6 Contracts (`contracts`)
- **Component**: `apps/frontend/src/WorkflowWorkspace.tsx` (`ContractsWorkspace`).
- **What It Shows**:
  - **4 KPI Cards**: Total Contracts, Awaiting Signatures, Active & Executed, Cancelled / Closed.
  - **Filter & Search Bar**: Status tabs (`All`, `Awaiting Signatures`, `Executed`, `Cancelled`) + live search input filtering by milestone title, contract title, or contract ID (`#...`).
  - **Contract Cards**: Each card displays execution status (`AWAITING SIGNATURES`, `FULLY EXECUTED`, `CANCELLED`), contract ID, total value in ETB, your party role (`Your Role: Client`, `Your Role: Freelancer`, or `Dual-Role Party`), job title, template version (`AACCSA`), signature verification grid (`Client E-Signature: Verified/Pending`, `Freelancer E-Signature: Verified/Pending`), and the contract's milestone rows.
  - **Milestone Rows**: Each row displays title, ETB amount, due date, escrow state (`PAYMENT_PENDING`, `ESCROW_HELD`, `WORK_IN_PROGRESS`, `SUBMITTED_FOR_REVIEW`, `RELEASED`, `DISPUTED`, `REFUNDED`, `PARTIAL_REFUND`), and role-appropriate action buttons.
- **What It Executes**:
  - **Both Roles**:
    - **Agreement PDF**: Calls `GET /api/v1/contracts/:contractId/document` (`api.getContractDocumentUrl()`) to open the generated bilingual AACCSA service agreement PDF.
    - **Manage in Escrow Center**: Focuses `focusContractId` and switches directly to `escrow`.
    - **Chat with Freelancer / Chat with Client**: Calls `POST /api/v1/chat/conversations` (`api.createDirectConversation()`) with the contract title as subject and navigates to `chat` with that thread active.
    - **Accept Agreement** (when contract is not cancelled and the current party has not signed yet): Calls `POST /api/v1/contracts/:contractId/accept` (`api.acceptContract()`). When the second signature commits, the backend auto-funds milestones from the client's wallet if balance is sufficient (`ESCROW_HELD`) or leaves them `PAYMENT_PENDING` for manual funding.
    - **Dispute** (on active milestones in `ESCROW_HELD`, `WORK_IN_PROGRESS`, or `SUBMITTED_FOR_REVIEW`): Opens an inline dispute form (Category: `NON_DELIVERY`, `LATE_DELIVERY`, `QUALITY_ISSUE`, `SCOPE_CREEP`, `NON_PAYMENT`, `COMMUNICATION_BREAKDOWN`; Description min 20 chars) and submits `POST /api/v1/disputes` (`api.raiseDispute()`).
  - **Client-Only Milestone Actions**:
    - **Fund Escrow** (when `contract.fullyExecuted` and milestone is `PAYMENT_PENDING`): Calls `POST /api/v1/escrow/milestones/:milestoneId/fund-wallet` (`api.fundMilestoneFromWallet()`), moving funds from client wallet to `ESCROW_HELD`.
    - **Accept & Release Funds** (when milestone is `SUBMITTED_FOR_REVIEW`, `ESCROW_HELD`, or `WORK_IN_PROGRESS`): Calls `POST /api/v1/escrow/milestones/:milestoneId/accept` (`api.acceptMilestone()`), transitioning the milestone to `RELEASED` and crediting the freelancer's wallet net of platform fees.
  - **Freelancer-Only Milestone Actions**:
    - **Submit Delivery** (when milestone is `ESCROW_HELD` or `WORK_IN_PROGRESS`): Calls `POST /api/v1/escrow/milestones/:milestoneId/submit` (`api.submitMilestone()`), transitioning the milestone to `SUBMITTED_FOR_REVIEW` and starting the 7-day auto-release window.

---

### 3.7 Escrow Center (`escrow`)
- **Component**: `apps/frontend/src/WorkflowWorkspace.tsx` (`EscrowWorkspace`).
- **What It Shows**:
  - **4 Financial Summary Cards**: Total Held (`ESCROW_HELD` + `WORK_IN_PROGRESS` + `SUBMITTED_FOR_REVIEW` + `ACCEPTED`), Payment Pending (`PAYMENT_PENDING`), Total Released (`RELEASED`), and Frozen in Dispute (`DISPUTED`).
  - **State Filter Bar & Search**: Filter tabs (`All Milestones`, `Payment Pending`, `Escrow Held`, `Submitted for Review`, `Released`, `Disputed`), text search by milestone title, milestone ID, contract ID, or contract title, and a **Clear contract** pill when navigated here from a specific contract.
  - **Milestone Vault Rows**: Flat list across all contracts showing milestone title, contract ID, contract title, ETB amount, due date, and status label.
- **What It Executes**:
  - **Both Roles**:
    - **Tax & Fee Split / Hide Tax & Fee**: Toggles inline `EscrowFeeBreakdown` for that milestone amount.
    - **View Contract**: Sets `focusContractId` and switches to `contracts`.
    - **Dispute** (when in `ESCROW_HELD`, `WORK_IN_PROGRESS`, or `SUBMITTED_FOR_REVIEW`): Opens inline dispute form and calls `POST /api/v1/disputes` (`api.raiseDispute()`).
  - **Client-Only**:
    - **Fund Milestone** (`PAYMENT_PENDING` on executed contracts): Calls `POST /api/v1/escrow/milestones/:milestoneId/fund-wallet`.
    - **Release Funds** (`SUBMITTED_FOR_REVIEW`, `ESCROW_HELD`, `WORK_IN_PROGRESS`): Calls `POST /api/v1/escrow/milestones/:milestoneId/accept`.
  - **Freelancer-Only**:
    - **Submit Work** (`ESCROW_HELD`, `WORK_IN_PROGRESS`): Calls `POST /api/v1/escrow/milestones/:milestoneId/submit`.

---

### 3.8 Wallet & Payouts (`wallet`)
- **Component**: `apps/frontend/src/BrowserWallet.tsx`.
- **What It Shows**:
  - **Wallet Hero Card**: Available balance (`ETB`), role-specific balance explanation, and a fiscal document button (**Invoice & Escrow Receipt** for `CLIENT`/`BOTH`, **Payout & Tax Voucher** for `FREELANCER`) opening `FiscalDocumentModal`.
  - **Withdraw Earnings Panel** (shown when `role !== "CLIENT"`, i.e., `FREELANCER` and `BOTH`; hidden for `CLIENT`-only accounts):
    - 3 provider cards: **Telebirr** (phone), **CBE Bank** (account number), **Safaricom M-Pesa** (phone).
    - Inputs: Amount (ETB), Payout phone/account identifier, and 6-digit SMS **Approval Code** with **Send code / Resend code** button.
  - **Top Up Your Wallet Panel** (shown to all roles; open by default for hiring roles, collapsible via upload icon):
    - Two tabs: **Instant Checkout** and **Manual Transfer** (default tab: `MANUAL`).
    - *Instant Checkout*: Selects **Telebirr** (Auto C2B checkout; selecting **CBE Birr** or **Safaricom M-Pesa** switches straight to **Manual Transfer** because those rails have no live automated merchant checkout API), Amount (ETB), and **Pay with Telebirr** button, opening a checkout dialog with polling (`GET /api/v1/wallet/topups/:topUpId/status`), sandbox simulate button (when enabled), or manual fallback switch.
    - *Manual Transfer*: Displays Yekis platform collection accounts (**Telebirr** `0910 011 818`, **CBE Bank** `1000300802428`, **Safaricom M-Pesa** `0716 356 515` / Till `882199`) with **Copy account**, Amount (ETB), Transaction/reference number, and encrypted receipt uploader (`FileUploader`, JPG/PNG/WebP/PDF up to 10 MB).
  - **Recent Top-Ups Audit Log**: Lists submitted/pending top-ups with status (`CHECKOUT_PENDING`, `PENDING`, `APPROVED`, `REJECTED`), **Complete checkout** / inline **Attach receipt** fallback for `CHECKOUT_PENDING` rows, and **Receipt** (`FiscalDocumentModal`).
  - **Transaction Movement Details (Ledger Statement)**: 4 KPI tiles (Total Inflow, Total Outflow, Pending Settlements, Total Movement Count), search bar, status filter (`ALL`, `COMPLETED`, `PENDING`, `PROCESSING`, `REJECTED`), category tabs (`All`, `Money In`, `Money Out`, `Payouts`, `Top-Ups`, `Escrow`), **Refresh Statement**, and per-row fiscal voucher/receipt inspection (`openFiscalDocForMovement()`).
- **What It Executes**:
  - **Withdrawal (`FREELANCER` & `BOTH`)**:
    1. **Send code**: Calls `POST /api/v1/escrow/wallet/withdraw/otp` (`api.requestWithdrawalOtp()`).
    2. **Request withdrawal**: Validates `amountMinor <= balanceMinor`, identifier, and 6-digit OTP, then calls `POST /api/v1/escrow/wallet/withdraw` (`api.withdrawWallet()`). Handles `HELD_FOR_REVIEW` (TMS mismatch hold without debiting) and `ACTIVE_CONTRACT_BLOCKS_WITHDRAWAL`.
  - **Top-Up (All Roles)**:
    - *Instant Checkout*: Calls `POST /api/v1/wallet/topups/checkout` (`api.initiateCheckoutTopUp()`), polls `GET /api/v1/wallet/topups/:topUpId/status`, or offers `POST /api/v1/wallet/topups/:topUpId/simulate-success` in dev/sandbox.
    - *Manual Transfer*: Submits `multipart/form-data` to `POST /api/v1/wallet/topups` (`api.createTopUpRequest()`) for staff approval.
    - *Attach Receipt to Stalled Checkout*: Submits `multipart/form-data` to `POST /api/v1/wallet/topups/:topUpId/attach-receipt` (`api.attachTopUpReceipt()`).
  - **Statement**: Calls `GET /api/v1/escrow/wallet/movements` (`api.getTransactionMovements()`).

---

### 3.9 Messages (`chat`)
- **Component**: `apps/frontend/src/ChatWorkspace.tsx`.
- **Role Differences**:
  - Subtitle, empty-thread prompts, composer wording, **New Chat** modal placeholders (Client enters Freelancer Email/User ID; Freelancer enters Client Email/User ID), and AI smart-reply framing adapt to `role`.
  - Thread role badges color-code counterparties (`CLIENT`, `FREELANCER`, `SUPPORT`).
- **What It Shows**:
  - **Left Thread Sidebar**: **New Chat** button, live search (by subject, participant name/email, or latest message), filter tabs (`All`, `Direct`, `Support`), and conversation list with avatars, role badges, timestamps, message previews, and unread indicators.
  - **Right Conversation Pane**:
    - Header: Mobile back button, participant/Support avatar, typing indicator (`typing` socket event), and **Mini-Me Co-Pilot** buttons: **Thread Summary** (all threads) and **Extract Deal** (`!isSupport` direct threads only).
    - Messages Feed: Scroll-scoped message bubbles (`mine`/`theirs`), timestamps, read checks, and authenticated `<SecureAttachment>` previews.
    - **Mini-Me Suggestion Bar**: Up to 3 context-aware reply chips (hoverable preview tooltip, click to insert into composer or click send icon to send immediately), **Tone & Custom Prompt** popover (`Professional`, `Friendly`, `Negotiation`, `Concise` + custom instruction input), and **Regenerate** button.
    - Anti-circumvention caution banner if triggered by off-platform contact detection.
    - Composer: Auto-resizing textarea (`Enter` to send, `Shift+Enter` for newline), file attachment picker (`Paperclip`), attachment preview tag, and **Send** button.
- **What It Executes**:
  - Loads threads via `GET /api/v1/chat/conversations` and messages via `GET /api/v1/chat/conversations/:id/messages`; marks read via `POST /api/v1/chat/conversations/:id/read`.
  - Real-time updates listen on `realtimeSocket` for new messages and typing indicators.
  - **New Conversation Modal**: Creates direct threads (`POST /api/v1/chat/conversations`) or official support tickets (`POST /api/v1/chat/support`).
  - **Send Message**: Uploads pending attachment (`POST /api/v1/chat/attachments`) if present, then sends message (`POST /api/v1/chat/conversations/:id/messages`) and plays chat audio feedback if enabled.
  - **Mini-Me Actions**: Fetches replies (`POST /api/v1/chat/conversations/:id/smart-replies`), summarizes threads (`POST /api/v1/chat/conversations/:id/summarize`), and extracts structured milestone/budget terms (`POST /api/v1/chat/conversations/:id/extract-deal`) with quick handoff to **Contracts**.

---

### 3.10 My Profile (`profile`) & Edit Profile (`profile-edit`)
- **Components**: `apps/frontend/src/ProfilePage.tsx` and `apps/frontend/src/ProfileEditPage.tsx` (orchestrated by `FullPlatformApp.tsx` via `openMyProfile()` and `openProfileOf(userId)`).
- **Important Behavioral Rule**:
  - Clicking **My Profile** in the sidebar, the **Account Chip** in the sidebar footer, or the **Topbar Avatar** always calls `openMyProfile()` (`viewUserId = null`) so it shows the signed-in user's own profile even if they previously inspected someone else's profile.
  - Clicking a freelancer from **Overview -> Featured Talent**, **Gigs**, or **Chat** calls `openProfileOf(userId)`, displaying that member's public profile while un-highlighting **My Profile** in the sidebar.
- **What `My Profile` (`profile`) Shows & Executes**:
  - **Masthead**: `YekisAvatar`, display name, KYC verification tier label, primary skill, bold text-only `Available for Work` indicator (if enabled), 4-cell KPI strip (Bayesian rating, completed jobs, `earnedRange`, member-since year), and action buttons:
    - *Viewing Own Profile*: Shows **Edit Profile** (`setView("profile-edit")`).
    - *Viewing Another Member*: Shows **Message** (`openChatWithUser()` -> `chat`) and **Report Profile** (opens a native `<dialog>` submitting `reportProfileSchema` enum codes `FAKE_IDENTITY`, `MISLEADING_SKILLS`, `OFF_PLATFORM_CONTACT`, `OFFENSIVE_CONTENT`, `SPAM`, `OTHER` to `POST /api/v1/users/:userId/report`).
  - **Two-Column Board**: Left `.pv-rail` shows skills and overview credentials; right `.pv-canvas` shows Bio, 2-column Portfolio Gallery (with `<PortfolioThumbnail>` and optional `projectUrl`), and Client/Freelancer Reviews (with owner reply support when applicable) — or a restricted notice if `!profile.canViewFullProfile` (e.g., `PRIVATE` or `PROPOSERS`-only profiles).
  - Loads via `GET /api/v1/users/:userId/profile` and `GET /api/v1/reviews/:userId`.
- **What `Edit Profile` (`profile-edit`) Shows & Executes**:
  - **Avatar Upload**: Compresses chosen image to 320px JPEG (`apps/frontend/src/lib/avatarImage.ts`) and uploads immediately to `POST /api/v1/users/me/avatar`.
  - **Identity & Bio**: First Name, Last Name, Bio.
  - **Skills & Expertise** (primary skill + searchable multi-select additional skills from `GET /api/v1/skills`; auto-syncs `primarySkillId` into `skillIds`).
  - **Portfolio Projects**: Add/edit/delete projects (title, description, thumbnail URL, project link), persisted via `POST / PATCH / DELETE /api/v1/portfolio/me`.
  - **Preferences**: `Available for Work` toggle and `profileVisibility` selector (`PUBLIC`, `PROPOSERS`, `PRIVATE`).
  - **Save Changes**: Calls `PATCH /api/v1/users/me/profile` and refreshes workspace completeness (`ProfileCompletionDialog` / setup nudge banner).

---

### 3.11 Disputes & Mediation (`cases`)
- **Component**: `apps/frontend/src/WorkflowWorkspace.tsx` (`DisputesWorkspace`).
- **What It Shows**:
  - Lists all active and historical disputes (`GET /api/v1/disputes`) involving the signed-in Client or Freelancer.
  - Each card shows current 3-stage status (`STAGE_1_NEGOTIATION`, `STAGE_2_EVIDENCE`, `STAGE_3_MEDIATION`, `RESOLVED`, etc.), dispute ID, contract job title, description, category, milestone title + locked ETB amount, negotiation window deadline (during Stage 1), and submitted evidence blockquotes.
- **What It Executes** (available identically to both parties on the contract):
  - **Stage 1 (`STAGE_1_NEGOTIATION`)**: Once `negotiationDeadlineAt` has passed, **Escalate to Evidence** activates and calls `POST /api/v1/disputes/:disputeId/escalate` (`api.escalateDispute()`), advancing the case to Stage 2.
  - **Stage 2 (`STAGE_2_EVIDENCE`)**: Textarea + **Submit Evidence Statement** (min 10 chars) calls `POST /api/v1/disputes/:disputeId/evidence` (`api.submitDisputeEvidence()`), appending the party's written statement to the mediation record.
  - **Stage 3 / Resolved (`STAGE_3_MEDIATION`, `RESOLVED`)**: **Escalate to AACCSA Arbitration** button calls `POST /api/v1/disputes/:disputeId/arbitrate` (`api.escalateDisputeToArbitration()`) to record an AACCSA arbitration filing escalation.

---

### 3.12 KYC Verification (`verification`)
- **Component**: `apps/frontend/src/BrowserVerification.tsx`.
- **Visibility**: Shown to all non-staff accounts (`CLIENT`, `FREELANCER`, `BOTH`).
- **What It Shows**:
  - **3-Step Tier Progression Banner**: Displays `Tier 0` (Email/Phone verified), `Tier 1` (Fayda National ID verification), and — when `VITE_TIN_FEATURE_ENABLED === "true"` — `Tier 2` (TIN / Business Registration). Note: in MVP (`VITE_TIN_FEATURE_ENABLED` unset/false), Tier 1 is the active verification gate and Tier 2 UI is hidden/deferred.
  - **Fayda Identity Review Form Card**: Status chip (`Awaiting Submission`, `Under Review`, `Verified`, `Rejected`), Full Name, Date of Birth, Fayda ID Number (FIN), and drag-and-drop ID Photo/PDF dropzone (`.jpg/.jpeg/.png/.webp/.pdf`, max 10 MB) with thumbnail preview and **Replace / Remove** controls.
  - **Guidance Sidebar**: **Tier 1 Privileges** list (Bid on Marketplace Jobs, Sign Bilateral Contracts, Fast Wallet Withdrawals, Verified Trust Badge), **Photo Guidelines** checklist, and **Compliance & Privacy** summary with `fayda.et` enrollment link.
  - **Tier 2 Panel** (feature-flagged behind `VITE_TIN_FEATURE_ENABLED === "true"`): TIN and Business Registration inputs.
- **What It Executes**:
  - Loads current verification state from `GET /api/v1/kyc/status` (`api.getKycStatus()`).
  - Submitting Tier 1 validates all fields and uploads `multipart/form-data` (`documentType: "NATIONAL_ID"`, `fullName`, `dateOfBirth`, `documentNumber`, `file`) to `POST /api/v1/kyc/documents` (`api.submitKycDocument()`).
  - Submitting Tier 2 (when enabled) calls `POST /api/v1/kyc/tier2` (`api.upgradeKycTier2()`).

---

### 3.13 Settings (`settings`)
- **Component**: `apps/frontend/src/SettingsWorkspace.tsx`.
- **What It Shows & Executes (5 Keyboard-Accessible Tabs)**:
  1. **Security & Credentials (`security`, default tab)**:
     - **Change Password**: Current/New/Confirm password fields with live criteria indicators (`>= 8` chars, numbers/symbols, match) and optional `"Sign out of all other devices"` checkbox -> `POST /api/v1/auth/change-password`.
     - **Linked Accounts**: Inspects `GET /api/v1/auth/identities`; lets users **Link Google** (`POST /api/v1/auth/link/google`) or **Unlink Google** (`DELETE /api/v1/auth/link/google`, guarded when no other sign-in credential exists), and displays read-only **Telegram** link status.
     - **Active Sessions & Device Management**: Shows current browser session and **Revoke All Other Sessions** button -> `POST /api/v1/auth/sessions/revoke-all`.
     - **Identity & Multi-Factor Status**: Displays UCID, verified email, verified payout phone, Fayda KYC tier/status, and **Edit Public Profile Details** shortcut (`profile-edit`).
  2. **Preferences & Localization (`general`)**:
     - **Platform Language**: Instant switch across `English (en)`, `Amharic (am)`, `Afaan Oromoo (om)`, `Tigrinya (ti)` persisted via `PATCH /api/v1/users/me/profile`.
     - **Timezone & Regional Clock**: Select (`Africa/Addis_Ababa`, `Etc/UTC`, `Europe/London`, `America/New_York`, `Asia/Dubai`) persisted via `PATCH /api/v1/users/me/profile`.
     - **Display Appearance**: Dark / Light theme toggle.
     - **Yekis Guide & Onboarding Tours**: Lists all 12 module tour statuses (`Completed`, `Skipped`, `Not started`), **Start / Restart** per module, **Help Documentation** modal trigger, and **Reset Onboarding Progress** (`DELETE /api/v1/users/me/guide-progress`).
     - **Layout Customizer** (also in Settings page header via `LayoutCustomizerTrigger`): Customizes sidebar layout variant (`default`, `inset`, `floating`) and workspace density/mode.
  3. **Notifications (`notifications`)**:
     - Category checkboxes (Milestone & Escrow Activity, Proposals & Job Brief Updates, Direct Chat & Collaboration, Security & Credential Changes) persisted locally in `localStorage`.
     - **Sound Effects & Audio Feedback**: Master enable switch, Output Volume slider (`0–100%`), per-category toggles (`notifications`, `messages`, `interactions`), and **Preview Sounds** buttons (`Notification Chime`, `Payment / Escrow`, `Message Received`, `Success Chord`).
  4. **Privacy & Visibility (`privacy`)**:
     - **Marketplace Availability**: Toggle `"Available for new project contracts & gigs"` (`isAvailableForWork`).
     - **Profile Directory Visibility**: Radio cards for `PUBLIC`, `PROPOSERS`, or `PRIVATE` (`profileVisibility`).
     - Changes save via `PATCH /api/v1/users/me/profile`.
  5. **Data Management & Danger Zone (`data`)**:
     - **Export Account Data (PDPP Art. 13)**: **Download JSON Archive** calls `GET /api/v1/users/me/export` (`api.exportUserData()`) and triggers a browser JSON download.
     - **Account Deactivation & Statutory Erasure (PDPP Art. 15)**: Clicking **Deactivate Account...** opens a native `<dialog>`, immediately audits obligations via `GET /api/v1/users/me/erasure-blockers` (`api.getErasureBlockers()`), and either lists blocking items (active escrow funds, open contracts, unresolved disputes) with **Re-Check Obligations** or — when clear — requires current password (if set), typing `DEACTIVATE`, and acknowledging the 10-year NBE/ERCA financial retention notice before executing `POST /api/v1/users/me/deactivate` (`api.deactivateAccount()`).
