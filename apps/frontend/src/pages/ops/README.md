# Operations Console — React 19 + TypeScript (Vite)

The staff operations console. It replaces the previous flat
`Admin*Page.tsx` + `StaffDashboard.tsx` arrangement: those19 files were
retired, and their surfaces were folded into this single shell.

Stack matches the app: React 19 + TS, one scoped CSS file, `lucide-react`
icons, dependency-free SVG charts, the shared `api` client, and the global
`ThemeContext`.

## Mounting

Already wired — `FullPlatformApp.tsx` renders it for any account with a
`staffRole`:

```tsx
if (user?.staffRole) return <OpsConsole user={user} onExit={logout} />;
```

No providers needed. The console ships its own contexts (`OpsUiContext`,
`ChartTipContext`, `ToastContext`) and reads the global theme from
`<html data-theme="dark|light">`.

## Files

```
src/pages/ops/
  OpsConsole.tsx        shell: sidebar, header, sub-router, palette/viewer/toast hosts
  opsNav.ts             sidebar groups + badge selectors
  opsPerms.ts           role → permission gating, driven by /admin/permissions/matrix
  opsTypes.ts           console domain model (compact keys; money = minor units)
  opsBackend.ts         verbatim wire types for the real backend payloads
  opsApi.ts             the adapter (see below) + useApi hook + formatters
  opsUiContext.ts       navigate / openViewer / toast / refreshBadges
  components/
    charts.tsx          <AreaChart/> <BarChart/> <Donut/> <Sparkline/> <HBars/> + tooltip ctx
    ui.tsx              Pill, Banner, StatCard, OpsTable, Pager, Kv, hotkeys, toasts…
    actionCenter.tsx    buildActionItems() + <ActionCenter/>
    CommandPalette.tsx  Ctrl/⌘K jump-to-anything (permission-filtered)
    EvidenceViewer.tsx  zoom/rotate/drag lightbox with scan mockups
  pages/
    Overview.tsx        Command Center: stat cards, Action Center, charts, activity
    SupportDesk.tsx     support inbox (carried over)
    DisputeQueue.tsx    mediation queue + resolution
    Risk.tsx            TMS flags
    KycQueue.tsx        identity review queue
    ReportsQueue.tsx    profile reports + featured-carousel refresh
    Receipts.tsx        wallet top-up review (carried over)
    Contracts.tsx  Payments.tsx  Payouts.tsx  Escrow.tsx
    Reconciliation.tsx  Ledger.tsx  Reports.tsx
    Users.tsx     Staff.tsx    AuditLogs.tsx   Monitoring.tsx
src/styles/ops-console.css
```

## opsApi is an adapter, not a second API client

The console was authored against a *planned* `/admin/*` surface
(`/admin/overview`, `/admin/badges`, `/admin/risk-flags`, `/admin/kyc/queue`,
`/admin/disputes/mediation`, `/admin/profile-reports`, cookie auth). **None of
those routes exist.** `opsApi.ts` maps each console operation onto the
endpoints the backend actually serves, through the shared `api` client
(Bearer auth, `/api/v1`, automatic refresh):

| Console operation | Real endpoint |
|---|---|
| `overview()` | `dashboard/summary` + `monitoring/health` + `payments` + `payouts` + `escrows` + `reconciliation` + `kyc/review-queue` + `disputes/staff/queue` + `staff/reports` + `tms/queue` |
| `badges()` | `dashboard/summary` metrics + queue totals |
| `health()` | `admin/monitoring/health` |
| `contracts()` | `admin/contracts` (detail via `admin/contracts/:id`, fetched on open) |
| `payments()` / `payouts()` / `escrows()` / `reconciliation()` | same-named `admin/*` list routes |
| `ledger()` | `admin/ledger` + `admin/ledger/journals` |
| `users()` | `admin/users` (summary via `admin/users/:id`, fetched on open) |
| `staff()` / `setStaffRole()` | `admin/staff`, `POST admin/staff/:userId/role` |
| `reports()` | `admin/reports/summary` (+ series derived from list routes) |
| `riskFlags()` | `tms/queue` |
| `kycQueue()` / `kycDecide()` | `kyc/review-queue`, `POST kyc/:userId/review` |
| `disputes()` / `resolveDispute()` | `disputes/staff/queue`, `POST disputes/:id/resolve` |
| `profileReports()` | `staff/reports`, `PATCH staff/reports/:id` |

### Things worth knowing

- **`overview()` degrades per section.** `/admin/*` uses `requirePermission`,
  but kyc/tms/disputes/topups/chat/staff-reports use the coarser
  `requireStaffRole`. A `SUPPORT` or `FINANCE_ADMIN` account gets 403 on parts
  of the aggregate, so each section falls back to empty rather than failing
  the whole page. Only `dashboard/summary` is fatal.
- **No time-series endpoint exists.** The backend exposes aggregate totals
  only. Charts that need history are derived in `opsApi` from the most recent
  100 rows of the underlying list routes — real data, but windowed, and the
  UI says so. Stat cards carry **no** trend percentages or sparklines for the
  same reason.
- **`kycDecide` has no "CLEARER" route.** The backend accepts
  `VERIFIED | REJECTED` only, so `CLEARER` resolves as a `REJECTED` carrying a
  re-upload reason (`KYC_CLEARER_REASON`).
- **Settlement bodies are renamed, not invented.** `settlePayout` maps
  `{outcome, ref, reason}` → `{decision, providerPayoutId, failureReason}`.
  All money values are **minor units**; chart series are **ETB millions**.

## Permission gating

`opsPerms.ts` fetches `GET /admin/permissions/matrix` and derives which nav
entries to render. The backend remains the enforcement point — this only
hides links a reviewer cannot open. A deep link into a forbidden page falls
back to the first permitted one during render.

## Conventions honoured

- Routing: local `useState<OpsPageId>` inside the shell, no React Router.
- State: `useState`/`useContext` only; `useApi` is a small fetch hook with
  abort + reload. No React Query/Redux.
- Icons: lucide-react everywhere.
- Styling: one scoped stylesheet under `.ops-root`, dark mode via
  `:root[data-theme="dark"] .ops-root`. Theme-conditional rules only touch
  colour tokens — layout stays theme-invariant per `.agents/AGENTS.md`.
- Charts and tables guard against empty data rather than rendering `NaN`.