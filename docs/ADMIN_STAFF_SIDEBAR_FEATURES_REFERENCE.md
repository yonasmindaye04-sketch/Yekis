# Yekis Operations Console Sidebar Features Reference (Admin & Employees)

> **Canonical Scope**: This document specifies every item in the Operations Console sidebar (`apps/frontend/src/pages/ops/opsNav.ts` and `apps/frontend/src/pages/ops/OpsConsole.tsx`), detailing what each view **shows** and **executes** for **Platform Administrators** (`SUPER_ADMIN`, legacy `ADMIN`) and **Departmental Employees / Staff** (`OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`, legacy `COMPLIANCE_OFFICER`, `SUPPORT`). All permission gates, UI controls, endpoints, validations, hotkeys, and caveats below are verified directly against the current frontend and backend source code.
>
> - **Workspace Isolation**: In `apps/frontend/src/FullPlatformApp.tsx` (`L1523-L1530`), any authenticated account with `user?.staffRole` set is routed exclusively to `<OpsConsole user={user} onExit={logout} />`. Staff accounts do not see the client/freelancer marketplace sidebar.
> - **Client & Freelancer Workspace**: For standard `CLIENT`, `FREELANCER`, and `BOTH` accounts, see [docs/SIDEBAR_FEATURES_REFERENCE.md](./SIDEBAR_FEATURES_REFERENCE.md).
> - **Dashboard / Overview Widget Reference**: For a widget-by-widget breakdown of the `Overview` command center (`dashboard-1` and `dashboard-2`), Command Palette, Notification Bell, and Layout Customizer, see [docs/ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md](./ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md).
> - **Telegram Mini App Note**: `apps/frontend/src/App.tsx` does not mount `OpsConsole`. It retains standalone `role === "ADMIN"` UI branches even though Prisma `UserRole` only defines `CLIENT | FREELANCER | BOTH` and staff roles live on `User.staffRole`.

---

## 1. Console Shell, Role Split, Step-Up Auth & Shared Navigation Mechanics

### 1.1 Platform Administrators vs. Departmental Employees

Access inside the Operations Console is governed by two layers:
1. **UI Navigation Gate (`apps/frontend/src/pages/ops/opsPerms.ts`)**: `useOpsPerms()` fetches the live server matrix from `GET /api/v1/admin/permissions/matrix` (falling back to `FALLBACK_MATRIX` on error) and filters `OPS_NAV` using `can(OPS_PERMS[item.id])`.
2. **Backend Enforcement (`apps/backend/src/modules/admin/permissions.ts`)**: Every operational endpoint re-reads the caller's live `staffRole` and `status` from the database via `requirePermission(...)` (or `requireStaffRole(...)` on auxiliary staff routers) rather than trusting JWT claims alone.

| Tier | `staffRole` Values | `ROLE_LABEL` Display | Scope Summary | Sidebar Pages Visible |
|---|---|---|---|---|
| **Platform Administrators** | `SUPER_ADMIN`, `ADMIN` (legacy) | `Super Admin`, `Admin (legacy)` | Holds all 30 `PERMISSIONS` keys (`ALL` / `["*"]`). Unlocks every workbench and exclusive platform administration & escrow control actions. | **23 / 23** |
| **Operations Employee** | `OPERATIONS_ADMIN` | `Operations Admin` | Runs support tickets, contract/payment/payout settlement, user suspensions, and system health monitoring. Read-only on disputes and escrow; no moderation/admin config access. | **10 / 23** |
| **Finance Employee** | `FINANCE_ADMIN` | `Finance Admin` | Runs payments, payout settlement, escrow inspection, reconciliation, ERCA withholding reports, ledger accounting, financial/cohort analytics, user lookup, and audit logs. | **11 / 23** |
| **Dispute Mediator Employee** | `DISPUTE_MEDIATOR` | `Dispute Mediator` | Claims and resolves contract/gig milestone disputes (`RELEASE_TO_FREELANCER`, `PARTIAL_SPLIT`, `REFUND_TO_CLIENT`) with contract & user inspection. | **5 / 23** |
| **Compliance Employee** | `COMPLIANCE_ADMIN`, `COMPLIANCE_OFFICER` (legacy) | `Compliance Admin`, `Compliance Officer (legacy)` | Owns Fayda KYC review, Risk/AML (`TMS`) alert review & STR filing, profile report moderation, top-up receipt approvals, audit logs, monitoring, read/claim dispute access, and assigned support threads. | **11 / 23** |
| **Support Employee** | `SUPPORT` | `Support Agent` | Full support conversation queue visibility (`isFullStaff`), live chat reply/internal notes/claim/close/reopen, plus read-only user lookup and own profile. | **4 / 23** |

> **Verified RBAC Mismatches & Backend-Only Capabilities**:
> - **Receipt Approvals mismatch**: `OPERATIONS_ADMIN` and `FINANCE_ADMIN` hold `receipts.view` in `permissions.ts`, whereas `opsPerms.ts` gates the **Receipt Approvals** (`receipts`) page on `topups.review` (held only by `SUPER_ADMIN`, `ADMIN`, `COMPLIANCE_ADMIN`, and `COMPLIANCE_OFFICER`). Backend receipt endpoints likewise gate on `topups.review`.
> - **Read vs. Action sub-splits**:
>   - `Escrow Control`: `OPERATIONS_ADMIN` and `FINANCE_ADMIN` hold `escrow.view` (can open the page and inspect milestones) but lack `escrow.release` and `escrow.freeze` (`403` on release or hold).
>   - `Disputes & Mediation`: `OPERATIONS_ADMIN` holds `disputes.view` only; `COMPLIANCE_ADMIN` / `COMPLIANCE_OFFICER` hold `disputes.view` + `disputes.mediate` (can claim cases) without `disputes.resolve` (`403` on binding settlement).
>   - `Profile Reports -> User Suspension`: `COMPLIANCE_ADMIN` / `COMPLIANCE_OFFICER` hold `profiles.moderate` without `users.suspend`; clicking **Ban & Suspend** submits the moderation `BAN_USER` decision cleanly while its secondary `opsApi.suspendUser` call suppresses errors in `.catch(() => {})`.
>   - `User Directory -> Force KYC Re-review`: `OPERATIONS_ADMIN` holds `users.view` + `users.suspend` (cannot force KYC re-review unless also holding `kyc.review`). `COMPLIANCE_ADMIN` / `COMPLIANCE_OFFICER` hold `kyc.review` without `users.suspend`.
>   - `Support Desk Scoping`: `GET /api/v1/chat/admin/conversations` grants full-queue visibility only to `isFullStaff` (`ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `SUPPORT`); `COMPLIANCE_ADMIN` / `COMPLIANCE_OFFICER` only receive conversations already assigned to their `staffId` unless holding one of those roles.
> - **Unmounted / Backend-Only Admin Routes** (exist in backend permissions/routers with no mounted Operations Console page):
>   - `incidents.manage` (`POST /api/v1/admin/incidents/breach`, `GET /api/v1/admin/incidents/breaches`)
>   - `settings.manage` (permission declared in `permissions.ts`)
>   - `POST /api/v1/disputes/:id/arbitration-award` (`opsApi.awardDispute` declared in `opsApi.ts` but uncalled by any UI component)
>   - `PATCH /api/v1/chat/admin/conversations/:id/assign` (`ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`)
>   - `POST /api/v1/telegram/set-webhook` (`bot.manage`)
>   - `GET /api/v1/finance/reconciliation` and `GET /api/v1/finance/ledger/fees`

### 1.2 Step-Up Fresh Authentication (`requireFreshAuth(300)`)

- Eleven sensitive administrative and financial write routes enforce `requireFreshAuth(300)` in the backend, requiring a password-verified `auth_time` within the last 300 seconds (5 minutes).
- Calls exceeding the 5-minute window fail with HTTP `401` (`REAUTH_REQUIRED`); OAuth or Telegram-authenticated sessions without a fresh password timestamp fail with HTTP `403` (`STEP_UP_REQUIRED`).

### 1.3 Sidebar Layout, Badges, Topbar & Responsive Navigation (`OpsConsole.tsx`)

- **Desktop Grid (`>= 1025px`)**: Root CSS uses 90% desktop font-size scaling inside a `256px minmax(0, 1fr)` grid (`ops-console.css`). Brand header displays `Yekis Operations` plus a sidebar collapse toggle (`PanelLeftClose` / `PanelLeftOpen`) synced with `ShadcnLayoutContext` (`sidebar` / `inset` / `floating` variants, `compact` / `comfortable` density, configurable `--sh-radius`).
- **Sidebar Footer User Chip**: Renders `YekisAvatar`, user display name, formatted role label (`ROLE_LABEL[user.staffRole]`), direct button opening **My Profile** (`profile`), and **Log out** (`LogOut`).
- **Live Sidebar Badges (`opsApi.badges()`)**: Polls `GET /api/v1/admin/metrics` with `ignoreAllErrors: true` (suppressing `403` on roles lacking metrics access) and renders bold count badges whenever a queue count exceeds `0`:
  - `support` <- `openTickets`
  - `disputes` <- `openDisputes`
  - `risk` <- `openRiskFlags`
  - `kyc` <- `pendingKyc`
  - `reports` <- `openProfileReports`
  - `gigs` <- `pendingGigs`
  - `receipts` <- `pendingReceipts`
  - `payouts` <- `pendingPayouts`
  - `recon` <- `pendingPayments` *(maps pending inbound payments count to the Reconciliation badge)*
  - `monitoring` <- `0` *(hardcoded `0` in `loadBadges()`, so no sidebar badge renders even when `Overview` displays degraded health checks)*
- **Topbar Controls**:
  - **Back button (`history`)**: Tracks up to the last 15 visited pages (`slice(-14)`).
  - **Breadcrumb**: Shows Group > Active Page (plus `#<focusId>` chip when navigated to a deep-linked record; group label hides at `<= 1024px`).
  - **Quick Jump (`Ctrl/Cmd + K` / `Esc`)**: Opens `CommandPalette` (renders full `.ops-cmd-trigger` input bar on desktop, compact `.ops-mobile-search-btn` at `<= 1024px`).
  - **Layout Customizer Drawer**: Opens `LayoutCustomizerDrawer` (`ShadcnLayoutContext`).
  - **Sound Toggle**: Toggles notification chime preference.
  - **Theme Toggle**: Switches light/dark themes on `:root[data-theme]`.
  - **Notification Bell (`NotificationBell`)**: Live socket (`notify:*`) + persisted notifications panel with role-aware navigation.
- **Mobile & Tablet (`<= 1024px` / `<= 768px`)**:
  - At `<= 1024px`, sidebar converts into off-canvas drawer `#ops-mobile-drawer`.
  - At `<= 768px`, `.ops-bottom-nav` pins the **first 4 permitted sidebar items** for the user's role plus a **Menu** button to toggle `#ops-mobile-drawer`.

---

## 2. Sidebar Role Visibility & Route Map

All 23 pages use in-console state navigation (`OpsPageId`) inside `OpsConsole.tsx` (`PAGE_MAP`), optionally paired with a `focusId` when jumping from another page, search result, or notification. Primary list calls run through `opsListApi.*` with `strictErrors: true` (`ApiClient.isStaffApiPath`), never falling back to `mockStore`.

| Group | Page Title | `OpsPageId` | Gate Permission (`opsPerms.ts`) | Admin (`SUPER_ADMIN`, `ADMIN`) | `OPERATIONS_ADMIN` | `FINANCE_ADMIN` | `DISPUTE_MEDIATOR` | `COMPLIANCE_ADMIN` / `_OFFICER` | `SUPPORT` | Primary Component |
|---|---|---|---|---|---|---|---|---|---|---|
| **Overview** | Overview | `overview` | `overview.view` | Full (all feeds) | Filtered feeds | Filtered feeds | Filtered feeds | Filtered feeds | Minimal feeds | `Overview.tsx` |
| **Cases** | Support Desk | `support` | `support.view` | Full queue | Full queue | Hidden | Hidden | Assigned only | Full queue | `SupportDesk.tsx` |
| **Cases** | Disputes & Mediation | `dispute-queue` | `disputes.view` | View + Claim + Resolve | View only | Hidden | View + Claim + Resolve | View + Claim only | Hidden | `DisputeQueue.tsx` |
| **Cases** | Risk & AML Alerts | `risk` | `tms.view` | Full + `tms.review` | Hidden | Hidden | Hidden | Full + `tms.review` | Hidden | `Risk.tsx` |
| **Review Queues** | KYC Identity | `kyc` | `kyc.view` | Full + `kyc.review` | Hidden | Hidden | Hidden | Full + `kyc.review` | Hidden | `KycQueue.tsx` |
| **Review Queues** | Profile Reports | `reports-queue` | `profiles.moderate` | Full + User Suspend | Hidden | Hidden | Hidden | Moderate only | Hidden | `ReportsQueue.tsx` |
| **Review Queues** | Gig Moderation | `gigs-moderation` | `gigs.moderate` | Admin-only | Hidden | Hidden | Hidden | Hidden | Hidden | `GigModeration.tsx` |
| **Review Queues** | Receipt Approvals | `receipts` | `topups.review` | Full | Hidden | Hidden | Hidden | Full | Hidden | `Receipts.tsx` |
| **Financial** | Contracts | `contracts` | `contracts.view` | Full | Full | Hidden | Full | Hidden | Hidden | `Contracts.tsx` |
| **Financial** | Payments | `payments` | `payments.view` | Full | Full | Full | Hidden | Hidden | Hidden | `Payments.tsx` |
| **Financial** | Payouts | `payouts` | `payouts.view` | Full + `payouts.settle` | Full + `payouts.settle` | Full + `payouts.settle` | Hidden | Hidden | Hidden | `Payouts.tsx` |
| **Financial** | Escrow Control | `escrow` | `escrow.view` | View + Release + Hold | View only | View only | Hidden | Hidden | Hidden | `Escrow.tsx` |
| **Financial** | Reconciliation | `reconciliation` | `reconciliation.view` | Full | Hidden | Full | Hidden | Hidden | Hidden | `Reconciliation.tsx` |
| **Financial** | ERCA Withholding | `withholding` | `ledger.view` | Full | Hidden | Full | Hidden | Hidden | Hidden | `WithholdingReports.tsx` |
| **Financial** | Platform Ledger | `ledger` | `ledger.view` | Full | Hidden | Full | Hidden | Hidden | Hidden | `Ledger.tsx` |
| **Financial** | Reports & Analytics | `reports` | `reports.view` | Full | Hidden | Full | Hidden | Hidden | Hidden | `Reports.tsx` |
| **Administration** | User Directory | `users` | `users.view` | View + Suspend + KYC Reset | View + Suspend | View only | View only | View + KYC Reset | View only | `Users.tsx` |
| **Administration** | Staff & Roles | `staff` | `admins.manage` | Admin-only | Hidden | Hidden | Hidden | Hidden | Hidden | `Staff.tsx` |
| **Administration** | Featured Talent | `featured` | `featured.manage` | Admin-only | Hidden | Hidden | Hidden | Hidden | Hidden | `FeaturedTalent.tsx` |
| **Administration** | Telegram Bot | `bot` | `bot.manage` | Admin-only | Hidden | Hidden | Hidden | Hidden | Hidden | `BotOperations.tsx` |
| **Administration** | Audit Logs | `audit` | `audit.view` | Full | Hidden | Full | Hidden | Full | Hidden | `AuditLogs.tsx` |
| **Administration** | System Health | `monitoring` | `monitoring.view` | Full | Full | Hidden | Hidden | Full | Hidden | `Monitoring.tsx` |
| **Account** | My Profile | `profile` | `null` (all staff) | Self-service | Self-service | Self-service | Self-service | Self-service | Self-service | `Profile.tsx` |

---

## 3. Detailed Feature Reference (All 23 Sidebar Pages)

### 3.1 Overview (`overview`) — Operations Command Center

- **Component**: `apps/frontend/src/pages/ops/pages/Overview.tsx`
- **Permission Gate**: `overview.view` (visible to **all 8 Admin and Employee roles**).
- **Admin vs. Employee Differences**: Runs `loadOverview()` (`11` parallel calls wrapped in `soft()`, suppressing HTTP `403`). **Admins** populate every KPI, chart, Action Center item, Workboard lane, and System Health card. **Employees** only populate feeds allowed by their `staffRole`; unauthorized widgets remain empty/zero rather than failing the dashboard.
- **What It Shows & Executes**: Dual-mode command surface (`Executive Command` / `dashboard-1` and `Operations Console` / `dashboard-2` with Cross-Queue Ledger, 4-column Workboard, and chronological SLA Schedule), 4 expandable KPI cards, prioritized Action Center (`buildActionItems`), inbound/payout charts, escrow custody donut, queue workload bars, infrastructure checks, and recent audit trail.
- **Full Documentation**: Covered widget-by-widget in [docs/ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md](./ADMIN_STAFF_DASHBOARD_CONTENTS_REFERENCE.md).

---

### 3.2 Support Desk (`support`)

- **Component**: `apps/frontend/src/pages/ops/pages/SupportDesk.tsx`
- **Permission Gate**: `support.view`
  - **Admin / Operations Admin / Support**: Full ticket queue visibility via `isFullStaff` (`ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `SUPPORT`).
  - **Compliance Admin / Compliance Officer**: Can open `Support Desk`, but `GET /api/v1/chat/admin/conversations` filters to `staffId === req.user.id` because compliance roles are not in `isFullStaff`.
  - **Finance Admin / Dispute Mediator**: Hidden.
- **What It Shows**:
  - **KPI Strip**: Open conversations, unassigned count, breached/SLA-warning tickets (`server SLA badges`), and total loaded threads.
  - **Filter Bar**: Filter by ticket `status`, `assignment` (unassigned / mine / all), and `sort`.
  - **Split-Pane Thread & Live Transcript**: Ticket list with SLA badges, counterparty user profile summary, real-time message thread (`chat:new_message`, `chat:new_conversation`, `conversation:<id>` + `chat:message` socket events with a `15s` polling fallback), attachments, and clearly tagged internal staff notes (`origin: "STAFF_INTERNAL"`).
- **What It Executes**:
  - **Claim Thread**: Assigns the ticket to the current operator.
  - **Send Public Reply / Internal Staff Note**: Posts message to the thread; toggling the **Internal staff-only note** checkbox sets `origin: "STAFF_INTERNAL"` so users never see internal coordination notes. Supports file attachment upload.
  - **Close / Reopen Ticket**: Updates ticket lifecycle state cleanly via backend support endpoints.
  - *Backend-only sibling*: `PATCH /api/v1/chat/admin/conversations/:id/assign` (`ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`) exists on the backend for manager reassignment, though the UI primarily relies on self-claim.

---

### 3.3 Disputes & Mediation (`dispute-queue`)

- **Component**: `apps/frontend/src/pages/ops/pages/DisputeQueue.tsx`
- **Permission Gate**: `disputes.view`
  - **Admin & Dispute Mediator**: Full visibility + claim (`disputes.mediate`) + binding settlement (`disputes.resolve`).
  - **Compliance Admin / Compliance Officer**: Full visibility + **Claim case** (`disputes.mediate`), but lacks `disputes.resolve` (binding resolution fails with `403`).
  - **Operations Admin**: View-only (`disputes.view` only); both claim and resolve actions fail with `403`.
  - **Finance Admin / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & SLA Breach Banner**: Active disputes, unclaimed/assigned split, arbitration stage count, and red SLA breach banner when any case exceeds its negotiation/mediation deadline.
  - **Filters & Split-Pane Inspector**: Search and filter by stage/status; right inspector shows disputed contract/gig details, milestone escrow amount, SLA timers, party profiles, Stage 2 evidence chat stream, and deliverable viewer powered by `EvidenceViewer`.
  - **Financial Split Preview**: Displays net payout math preview when `PARTIAL_SPLIT` is selected (`Math.round(fGross * 0.075)` platform fee deduction; preview hardcodes `wh = 0` to mirror deferred WHT policy).
- **What It Executes**:
  - **Keyboard Navigation**: `ArrowUp` / `ArrowDown` cycles through queue items.
  - **Claim Case**: Assigns the dispute to the logged-in mediator (`disputes.mediate`).
  - **Mediation Resolution (`disputes.resolve`)**: Executes binding settlement outcome (`RELEASE_TO_FREELANCER`, `PARTIAL_SPLIT`, or `REFUND_TO_CLIENT`), triggering atomic escrow release/refund and ledger entries.
  - **Stage Workflow Actions (`Add evidence note` via `OpsActionModal`, `Escalate stage`, `Send to arbitration`)**: Invokes `/disputes/:id/evidence`, `/disputes/:id/escalate`, and `/disputes/:id/arbitration`. *Important verified caveat*: in `apps/backend/src/modules/disputes/dispute.service.ts` (`L168`, `L209`, `L680`, `L960-L976`), these three handlers call `getDisputeForParty(disputeId, userId)` which throws `NotDisputePartyError` (`403 NOT_PARTY`) for any caller who is not `contract.clientId`/`freelancerId` or `gigOrder.clientId`/`gig.freelancerId`. Non-party staff must use **Claim case** and **Resolve** rather than party stage transitions. Meanwhile, `opsApi.awardDispute` (`POST /api/v1/disputes/:id/arbitration-award`) is declared in `opsApi.ts` (`L1314`) but not wired to any button in `DisputeQueue.tsx`.

---

### 3.4 Risk & AML Alerts (`risk`)

- **Component**: `apps/frontend/src/pages/ops/pages/Risk.tsx`
- **Permission Gate**: `tms.view` (actions require `tms.review`)
  - **Admin, Compliance Admin & Compliance Officer**: Full view and full remediation actions (`tms.review`).
  - **Operations Admin / Finance Admin / Dispute Mediator / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Critical Alert Banner**: Open risk alerts, critical-severity alert count banner, STR filings count, and dismissed flags.
  - **Filter Bar & Rule Inspector**: Filter by `flagType` and `status`. Detail pane displays user KYC summary, cumulative `flagCount`, existing STR reference, and an expandable **Rule detail** box showing the raw JSON TMS trigger payload.
- **What It Executes** (all three via `OpsActionModal` requiring `tms.review`):
  - **File STR**: Records an Ethiopian FIC Suspicious Transaction Report reference/notes, with an optional checkbox to simultaneously suspend the flagged user account.
  - **Dismiss Flag**: Marks the alert dismissed with mandatory audit rationale.
  - **Lift Hold**: Clears temporary compliance holds on the flagged record/user with written justification.

---

### 3.5 KYC Identity (`kyc`)

- **Component**: `apps/frontend/src/pages/ops/pages/KycQueue.tsx`
- **Permission Gate**: `kyc.view` (decisions require `kyc.review`)
  - **Admin, Compliance Admin & Compliance Officer**: Full queue inspection and Approve/Reject actions (`kyc.review`).
  - **Operations Admin / Finance Admin / Dispute Mediator / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Under-Review Notice**: Pending/Under-Review/Approved/Rejected metrics plus server-derived notice card distinguishing `underReview` from fresh `pending` submissions.
  - **ChecksRow Verification Matrix**: Renders `faydaA` (Fayda automated check), `faydaS` (Fayda selfie/similarity), `pep` (Politically Exposed Person / sanctions screen), and `dup` (duplicate identity detection), plus automated `flag` routing notices.
  - **Document Inspection & History**: Signed private document tiles inspected through `EvidenceViewer` (`National ID` / Fayda front/back & selfie) alongside prior `kycHistory`.
- **What It Executes**:
  - **Keyboard Hotkeys**: `ArrowUp` / `ArrowDown` navigate queue; `A` opens/triggers Approve; `R` focuses/triggers Reject.
  - **Approve**: Verifies applicant identity and advances user KYC state.
  - **Reject**: Requires selecting a rejection preset or typing a custom reason before denying verification.
  - **Ask for Clearer Photo**: One-click standardized rejection using `KYC_CLEARER_REASON` so the user can re-upload legible documents cleanly.

---

### 3.6 Profile Reports (`reports-queue`)

- **Component**: `apps/frontend/src/pages/ops/pages/ReportsQueue.tsx`
- **Permission Gate**: `profiles.moderate`
  - **Admin**: Full moderation plus effective **Ban & Suspend** enforcement.
  - **Compliance Admin & Compliance Officer**: Full profile moderation (`DISMISS`, `HIDE_PROFILE`, `BAN_USER` on report record). Note that the secondary `opsApi.suspendUser` call inside **Ban & Suspend** is `.catch(() => {})` wrapped because compliance roles do not hold `users.suspend`.
  - **Operations Admin / Finance Admin / Dispute Mediator / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Header Action**: Open/High-Severity/Resolved metrics plus header CTA **Refresh Featured Carousel** (`POST /api/v1/featured/staff/refresh` — restricted on backend to roles holding `featured.manage` / Admin).
  - **Filter Bar**: Filters by `status`, `reasonFilter`, and `severityFilter` (client-side filter applied to the mapped response page). Auto-selects the first row on load.
  - **Safety Inspector & Evidence**: Automated Trust & Safety rule checks, `flaggedExcerpt`, reporter rationale, `EvidenceViewer` attachments, enforcement templates, and **Inspect User Directory** deep link (`users#<reportedUserId>`).
- **What It Executes**:
  - **Keyboard Hotkeys**: `ArrowUp` / `ArrowDown` navigate; `H` = Hide Profile; `B` = Ban & Suspend; `D` = Dismiss; `R` = Reset/Focus.
  - **Dismiss (No Action)**: Closes report without penalizing the reported profile.
  - **Hide Profile**: Applies profile visibility moderation on the reported freelancer/user.
  - **Ban & Suspend**: Marks report `BAN_USER` and attempts `opsApi.suspendUser` (succeeds for Admins; secondary account suspension call catches `403` silently for Compliance roles lacking `users.suspend`).

---

### 3.7 Gig Moderation (`gigs-moderation`)

- **Component**: `apps/frontend/src/pages/ops/pages/GigModeration.tsx`
- **Permission Gate**: `gigs.moderate` (**Admin-only** — `SUPER_ADMIN` and legacy `ADMIN`).
- **What It Shows**:
  - **Status Filter Bar**: Defaults to `DRAFT` pending review; supports switching moderation status states.
  - **Gig Detail Pane**: Freelancer identity, gig title, category, description, pricing tiers/packages, and moderation decision textarea.
- **What It Executes**:
  - **Approve & Publish**: Publishes the gig to the public marketplace (`ACTIVE`).
  - **Reject**: Sets status to `REJECTED`; enforces minimum `10` characters in the moderation feedback textarea before submission.

---

### 3.8 Receipt Approvals (`receipts`)

- **Component**: `apps/frontend/src/pages/ops/pages/Receipts.tsx`
- **Permission Gate**: `topups.review`
  - **Admin, Compliance Admin & Compliance Officer**: Full view and decision authority (`Approve & credit`, `Reject`, `Flag as suspicious`).
  - **Operations Admin / Finance Admin / Dispute Mediator / Support**: Hidden in UI (despite `OPERATIONS_ADMIN` and `FINANCE_ADMIN` holding `receipts.view` in backend `permissions.ts`, both backend top-up routes and `opsPerms.ts` enforce `topups.review`).
- **What It Shows**:
  - **KPI Strip & Table**: Defaults to `PENDING` submissions inside `OpsTable`. Displays reference ID, user, ETB amount, bank/payment channel, timestamp, and a clickable receipt icon that opens `topUpReceiptUrl` in a new browser tab (`window.open`).
  - **Expandable Decision Row**: Inline/expanded controls for review notes and compliance decisioning.
- **What It Executes**:
  - **Approve & Credit**: Credits the verified ETB top-up into the client's wallet and logs the ledger entry.
  - **Reject**: Denies receipt via `OpsActionModal` with mandatory rejection reason.
  - **Flag as Suspicious**: Escalates the top-up receipt via `OpsActionModal` for compliance/AML scrutiny.

---

### 3.9 Contracts (`contracts`)

- **Component**: `apps/frontend/src/pages/ops/pages/Contracts.tsx`
- **Permission Gate**: `contracts.view`
  - **Admin, Operations Admin, Dispute Mediator**: Full contract & milestone inspection.
  - **Finance Admin / Compliance Admin / Compliance Officer / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Filters**: Active, completed, disputed, and total ETB value metrics; search bar + status dropdown; CSV export button (`opsExport.ts`).
  - **Lazy Contract Detail Inspector (`GET /api/v1/admin/contracts/:id`)**: Client & freelancer identity and KYC verification badges, milestone breakdown table, inbound payments history, live `sel.feeConfiguration` panel (7.5% platform fee, WHT deferred).
  - **Verified UI Copy Caveat**: Line `L379` still renders static subtitle text `"10% Platform Commission · 3% ERCA WHT"`, whereas the detail grid directly below reads the live `sel.feeConfiguration` payload (`7.5%` commission, WHT deferred).
  - **Evidence & Document Previews**: `EvidenceViewer` tabs for signed contract agreements and generated WHT tax schedule sheets.
- **What It Executes**:
  - Read-only inspection + CSV export.
  - Four cross-workbench jump buttons pre-filtering related consoles: **Escrow Control** (`escrow`), **Disputes** (`dispute-queue`), **Payments** (`payments`), and **User Directory** (`users`).

---

### 3.10 Payments (`payments`)

- **Component**: `apps/frontend/src/pages/ops/pages/Payments.tsx`
- **Permission Gate**: `payments.view`
  - **Admin, Operations Admin, Finance Admin**: Full view.
  - **Dispute Mediator / Compliance Admin / Compliance Officer / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Filters**: Settled, pending, failed, and total ETB gateway volume; filters by `status` and payment `provider` (`TELEBIRR`, `CBE_BIRR`, `MPESA`, manual/internal); CSV export button.
  - **Split-Pane Inspector**: Read-only gateway verification checks, provider transaction references, webhook timestamps, and `EvidenceViewer` payment slip & webhook payload logs.
- **What It Executes**:
  - Read-only inspection + CSV export.
  - Cross-navigation buttons to **Reconciliation** (`reconciliation`), **Contracts** (`contracts`), **Escrow Control** (`escrow`), **Platform Ledger** (`ledger`), and **Disputes** (`dispute-queue`).

---

### 3.11 Payouts (`payouts`)

- **Component**: `apps/frontend/src/pages/ops/pages/Payouts.tsx`
- **Permission Gate**: `payouts.view` (settlement requires `payouts.settle`)
  - **Admin, Operations Admin, Finance Admin**: Hold both `payouts.view` and `payouts.settle`, granting full read + disbursement settlement controls.
  - **Dispute Mediator / Compliance Admin / Compliance Officer / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Pending Banner**: Pending disbursements count/value, settled volume, failed volume, and CSV export.
  - **Split-Pane Inspector**: Beneficiary KYC status check, WHT / net disbursement breakdown, bank/mobile-money destination, and `EvidenceViewer` disbursement slip & WHT sheet previews.
- **What It Executes**:
  - **Confirm Disbursement (`CONFIRMED`)**: Requires an external settlement `ref` (`min 4` characters), finalizes payout state, and posts ledger entries.
  - **Fail & Re-Credit Wallet (`FAILED`)**: Requires a failure `reason` (`min 5` characters), marks disbursement failed, and re-credits the freelancer's available wallet balance.

---

### 3.12 Escrow Control (`escrow`)

- **Component**: `apps/frontend/src/pages/ops/pages/Escrow.tsx`
- **Permission Gate**: `escrow.view` (mutations require `escrow.release` and `escrow.freeze`)
  - **Admin (`SUPER_ADMIN`, `ADMIN`)**: Full visibility plus exclusive authority to execute **Full Release to Freelancer**, **Place Admin Hold**, and **Remove Admin Hold**.
  - **Operations Admin & Finance Admin**: View-only (`escrow.view`); lacks `escrow.release` and `escrow.freeze` (execution attempts return `403`).
  - **Dispute Mediator / Compliance Admin / Compliance Officer / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Custody Banner**: Highlights clearing custody accounts (`Accounts 1010 / 1020`) and escrow state distribution (`ESCROW_STATES`); CSV export.
  - **Inspector**: Milestone state, release readiness checklist, `Est. Net Release After 7.5% Fee`, preset/custom audit reason selector (`min 10` characters required), and `EvidenceViewer` deliverable & custody receipt sheets.
- **What It Executes**:
  - **Full Release to Freelancer** (**Admin-only**, `escrow.release`, step-up protected): Releases escrowed milestone funds to freelancer wallet with fee ledger posting.
  - **Place Admin Hold / Remove Admin Hold** (**Admin-only**, `escrow.freeze`, step-up protected): Freezes or unfreezes milestone release with mandatory `>= 10`-character audit justification.
  - **Open in Dispute Mediation**: Deep links to `dispute-queue` when conflict requires formal mediation.

---

### 3.13 Reconciliation (`reconciliation`)

- **Component**: `apps/frontend/src/pages/ops/pages/Reconciliation.tsx`
- **Permission Gate**: `reconciliation.view`
  - **Admin & Finance Admin**: Full access.
  - **Operations Admin / Dispute Mediator / Compliance Admin / Compliance Officer / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & Mismatch Banner**: Unmatched/variance alerts banner, clearing totals, filters, and page CSV export.
  - **Note on Search**: Client-side search input filters the currently loaded page (`opsListApi.reconciliation`).
  - **Split-Pane Comparison**: Side-by-side Provider Settlement Amount vs. Expected Milestone Amount, Variance calculation, Clearing Account Code (`1010` / `1020` / `1030`), and `EvidenceViewer` manifest & audit trail sheets.
- **What It Executes**:
  - **Export Exception CSV** (per selected exception row) and full-list CSV export.
  - Cross-navigation buttons to **Platform Ledger** (`ledger`), **Escrow Control** (`escrow`), and **Payments** (`payments`).

---

### 3.14 ERCA Withholding (`withholding`)

- **Component**: `apps/frontend/src/pages/ops/pages/WithholdingReports.tsx`
- **Permission Gate**: `ledger.view`
  - **Admin & Finance Admin**: Full view and ERA filing completion authority.
  - **All Other Employee Roles**: Hidden.
- **What It Shows**:
  - **KPI Strip & Period List**: Calls `opsApi.withholdingReports({ limit: 50 })`. Displays Ethiopian Revenue & Customs Authority (ERCA) WHT-03 monthly filing periods, withheld totals, unfiled vs. filed counts, and filing timestamps.
- **What It Executes**:
  - **Mark Filed with ERA Reference**: Accepts filing reference (`min 4` characters) and submits `POST /api/v1/finance/withholding/:reportId/file` (note: backend router protects `/api/v1/finance/*` via `ledger.view` / staff guard) to close the period with audit confirmation.
  - **Period CSV & All-Period CSV Export**: Exports statutory withholding schedules ready for offline ERCA upload/archival.

---

### 3.15 Platform Ledger (`ledger`)

- **Component**: `apps/frontend/src/pages/ops/pages/Ledger.tsx`
- **Permission Gate**: `ledger.view`
  - **Admin & Finance Admin**: Full double-entry accounting ledger inspection.
  - **All Other Employee Roles**: Hidden.
- **What It Shows**:
  - **Trial-Balance Integrity Banner**: Real-time verification badge confirming global `SUM(debits) === SUM(credits)`.
  - **Chart of Accounts Cards**: Up to `12` GL account summary cards showing live balances per account code (`1010`, `1020`, `1030`, wallet liabilities, fee revenue, WHT payable, etc.).
  - **KPI Strip & Filters**: `JOURNAL_TYPES` selector + search filter.
  - **Split-Pane Journal Inspector**: Chronological journal list with itemized `entries[]` debit/credit legs table, `idempotencyKey`, zero-sum validation checks, and `EvidenceViewer` journal voucher preview.
- **What It Executes**:
  - Read-only financial audit + **Per-Journal CSV** and **Loaded Page CSV** exports.

---

### 3.16 Reports & Analytics (`reports`)

- **Component**: `apps/frontend/src/pages/ops/pages/Reports.tsx`
- **Permission Gate**: `reports.view`
  - **Admin & Finance Admin**: Full platform BI analytics.
  - **All Other Employee Roles**: Hidden.
- **What It Shows**:
  - **Server-Aggregated Financial & Marketplace KPIs**: Reads `GET /api/v1/admin/reports/summary` (true full-database SQL/Prisma aggregation across all-time records, unlike `Overview.tsx` which buckets the latest `100` rows).
  - **Trailing-6-Month DB Charts**: `AreaChart` of monthly transaction volume and `BarChart` of payment rail throughput across **Telebirr**, **CBE Birr**, and **M-Pesa**.
  - **5 Interactive Live Queue Cohorts**: Clickable cards (`payouts`, `recon`, `disputes`, `escrows`, `risk`) linking straight into their authoritative workbenches (note: Finance employees clicking `disputes` or `risk` land inside `OpsConsole` where unauthorized pages remain gated).
  - **Marketplace Breakdown**: **Users by Role** and **Contracts by Status** count-based `Donut` charts plus **Completed by Category** horizontal `HBars`.
- **What It Executes**:
  - **Export Analytics CSV** (`opsExport.ts`) and deep links from queue cohorts to operational workbenches.

---

### 3.17 User Directory (`users`)

- **Component**: `apps/frontend/src/pages/ops/pages/Users.tsx`
- **Permission Gate**: `users.view` (plus `users.suspend` for suspend/reinstate, `kyc.review` for force KYC re-review)
  - **Admin**: Full inspection + Suspend/Reinstate + Force KYC Re-review.
  - **Operations Admin**: Full inspection + **Suspend / Reinstate account** (`users.suspend`); cannot trigger KYC re-review without `kyc.review`.
  - **Compliance Admin & Compliance Officer**: Full inspection + **Force KYC re-review** (`kyc.review`); cannot suspend/reinstate accounts (`users.suspend` absent).
  - **Finance Admin, Dispute Mediator, Support**: Read-only inspection (`users.view` only).
- **What It Shows**:
  - **KPI Strip & Searchable Table**: Role filter + search (`OpsTable` paginated list).
  - **Click-Through User Detail (`GET /api/v1/admin/users/:id`)**: Wallet balance & reserve breakdown, Fayda KYC status, profile completeness meter, 6 activity counts (jobs, contracts, gigs, disputes, receipts, reports), recent support threads, and recent audit events.
- **What It Executes**:
  - **Suspend Account**: Requires reason (`min 5` characters), revokes active access (`users.suspend`).
  - **Reinstate Account**: Restores suspended user status (`users.suspend`).
  - **Force KYC Re-review**: Resets KYC flag to require fresh identity review (`kyc.review`).

---

### 3.18 Staff & Roles (`staff`)

- **Component**: `apps/frontend/src/pages/ops/pages/Staff.tsx`
- **Permission Gate**: `admins.manage` (**Admin-only** — `SUPER_ADMIN` and legacy `ADMIN`).
- **What It Shows**:
  - **Staff Roster Table (`OpsTable`)**: Fetches `GET /api/v1/admin/staff` showing name, email, status, last auth / staff role badge, and inline controls.
  - **Live Permission Matrix**: Fetches `GET /api/v1/admin/permissions/matrix` and renders every `PERMISSIONS` key across active role columns (note: UI matrix table omits the legacy `ADMIN` column while displaying all other roles).
- **What It Executes** (backend enforces `admins.manage` + `requireFreshAuth(300)`):
  - **Edit Role Dropdown (`POST /api/v1/admin/staff/:id/role`)**: Reassigns a staff member to any `StaffRole` or revokes console access (`null` / `No console access`).
  - **Suspend / Reactivate Staff (`POST /api/v1/admin/staff/:id/status`)**: Suspending opens `OpsActionModal` enforcing a mandatory `min 20` characters justification; reactivation restores staff access immediately.

---

### 3.19 Featured Talent (`featured`)

- **Component**: `apps/frontend/src/pages/ops/pages/FeaturedTalent.tsx`
- **Permission Gate**: `featured.manage` (**Admin-only** — `SUPER_ADMIN` and legacy `ADMIN`).
- **What It Shows**: Concise operational controls for homepage and dashboard featured-freelancer curation (pinning form + carousel cache refresh button).
- **What It Executes**:
  - **Pin a Freelancer (`POST /api/v1/featured/staff/pin`)**: Manually pins a chosen freelancer into the featured showcase rotation.
  - **Refresh Carousel (`POST /api/v1/featured/staff/refresh`)**: Recomputes and refreshes the active featured talent pool immediately.

---

### 3.20 Telegram Bot (`bot`)

- **Component**: `apps/frontend/src/pages/ops/pages/BotOperations.tsx`
- **Permission Gate**: `bot.manage` (**Admin-only** — `SUPER_ADMIN` and legacy `ADMIN`).
- **What It Shows**:
  - **Bot Telemetry Cards**: Fetches `GET /api/v1/telegram/health` and `GET /api/v1/telegram/info` to display connection status, bot username/metadata, webhook URL state, and `Pending Updates` count.
- **What It Executes** (backend enforces `bot.manage` + `requireFreshAuth(300)`):
  - **Start Polling**: Starts long-polling worker mode.
  - **Stop Bot**: Halts running Telegram bot ingestion.
  - **Delete Webhook**: Confirms via `OpsActionModal` before clearing the active Telegram webhook URL.
  - *Backend-only route*: `POST /api/v1/telegram/set-webhook` is also available in `bot.routes.ts` (`bot.manage`, `requireFreshAuth(300)`) via API/CLI when re-registering a webhook endpoint.

---

### 3.21 Audit Logs (`audit`)

- **Component**: `apps/frontend/src/pages/ops/pages/AuditLogs.tsx`
- **Permission Gate**: `audit.view`
  - **Admin, Finance Admin, Compliance Admin, Compliance Officer**: Full immutable audit trail read access.
  - **Operations Admin / Dispute Mediator / Support**: Hidden.
- **What It Shows**:
  - **KPI Strip & 7-Column `OpsTable`**: Fetches `GET /api/v1/admin/audit-logs`, displaying timestamp, actor, event type, target entity type/ID, IP/channel context, and metadata payload.
  - **Search Behavior**: Search input filters the currently loaded page client-side.
- **What It Executes**: Read-only forensic inspection.

---

### 3.22 System Health (`monitoring`)

- **Component**: `apps/frontend/src/pages/ops/pages/Monitoring.tsx`
- **Permission Gate**: `monitoring.view`
  - **Admin, Operations Admin, Compliance Admin, Compliance Officer**: Full infrastructure status access.
  - **Finance Admin / Dispute Mediator / Support**: Hidden.
- **What It Shows**:
  - **Infrastructure Check Grid**: Live status cards for `database` (PostgreSQL), `redis`, `objectStore` (MinIO/S3), `telebirrConfigured`, `cbeConfigured`, and `mpesaConfigured`.
  - **Trial-Balance Integrity Banner & Last-Checked Timestamp**: Mirrors ledger double-entry health check (`SUM(debits) === SUM(credits)`).
  - **Badge Caveat**: Even if checks report degraded/down, `loadBadges()` sets `monitoring: 0`, so no sidebar badge appears on `System Health`.
- **What It Executes**: Read-only live diagnostics check on load/refresh.

---

### 3.23 My Profile (`profile`)

- **Component**: `apps/frontend/src/pages/ops/pages/Profile.tsx`
- **Permission Gate**: `null` (available to **all 8 Admin and Employee roles**).
- **What It Shows**:
  - **Self-Service Profile Card**: Fetches `GET /api/v1/users/me/profile` and renders profile completeness meter, first/last name inputs, bio (`2000` char max), `Open to work` toggle, and `profileVisibility` selector.
- **What It Executes**:
  - **Save Profile (`PATCH /api/v1/users/me/profile`)**: Validates names against `NAME_RE` and persists personal profile settings for the signed-in staff user.

---

## 4. Shared Operational Utilities Across Sidebar Pages

- **`EvidenceViewer` (`apps/frontend/src/pages/ops/components/EvidenceViewer.tsx`)**: Modal sheet inspector shared across Disputes, KYC Identity, Profile Reports, Contracts, Payments, Payouts, Escrow, Reconciliation, and Ledger. Renders private signed files, deliverable previews, synthetic agreement/WHT/voucher sheets, and webhook payloads with zoom/fullscreen inspection.
- **`OpsActionModal` (`apps/frontend/src/pages/ops/components/ui.tsx`)**: Standardized confirmation dialog enforcing minimum rationale lengths (`>= 5`, `>= 10`, or `>= 20` characters depending on risk level) across Dispute notes, Risk STR/dismiss/hold-lift, Receipt reject/flag, Staff suspension, and Bot webhook deletion.
- **`OpsTable` (`apps/frontend/src/pages/ops/components/ui.tsx`)**: Responsive server-paginated table that automatically offers a Card vs. Table toggle at mobile widths (`<= 768px`).
- **`opsExport.ts` (`apps/frontend/src/pages/ops/opsExport.ts`)**: Shared RFC-4180 CSV exporter powering report downloads across Contracts, Payments, Payouts, Escrow, Reconciliation, ERCA Withholding, Platform Ledger, and Reports & Analytics.
