# Operations Console — React 19 + TypeScript (Vite)

The staff operations console. It replaces the previous flat
`Admin*Page.tsx` + `StaffDashboard.tsx` arrangement: those19 files were
retired, and their surfaces were folded into this single shell.

Stack matches the app: React 19 + TS, one scoped CSS file, `lucide-react`
icons, dependency-free SVG charts, the shared `api` client, and the global
`ThemeContext`.

The console now builds its shared primitives on top of **shadcn/ui** (see
"shadcn/ui layer" below) instead of hand-rolled markup.

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
  opsList.ts            useListPage() — server paging, debounced search, derived loading
  opsConst.ts           option lists mirroring the Prisma enums the API accepts
  opsExport.ts          RFC 4180 CSV export for on-screen tables
  opsUiContext.ts       navigate / openViewer / toast / refreshBadges
  components/
    charts.tsx          <AreaChart/> <BarChart/> <Donut/> <Sparkline/> <HBars/> + tooltip ctx
    ui.tsx              Pill, Banner, StatCard, OpsTable, Pager, FilterSelect, Kv, hotkeys…
    actionCenter.tsx    buildActionItems() + <ActionCenter/>
    CommandPalette.tsx  Ctrl/⌘K jump-to-anything (permission-filtered)
    EvidenceViewer.tsx  zoom/rotate/drag lightbox over REAL signed document URLs
    NotificationBell.tsx GET /notifications + mark-read, console-styled popover
  pages/
    Overview.tsx        Command Center: stat cards, Action Center, charts, activity
    SupportDesk.tsx     support inbox (two-pane queue pattern, like KYC/Disputes)
    DisputeQueue.tsx    mediation, settlement preview, claim/evidence/escalate/arbitrate
    Risk.tsx            TMS flags: file STR, dismiss, lift hold, rule detail
    KycQueue.tsx        identity review + real document viewer + decision history
    ReportsQueue.tsx    profile reports + featured-carousel refresh
    Receipts.tsx        wallet top-up review (two-pane expand-row decisions)
    Contracts.tsx  Payments.tsx  Payouts.tsx  Escrow.tsx
    Reconciliation.tsx  Ledger.tsx  Reports.tsx
    Users.tsx     Staff.tsx    AuditLogs.tsx   Monitoring.tsx
src/styles/ops-console.css
```

## shadcn/ui layer

The console does not ship its own component kit. The primitives live in
`src/components/ui/` (ported from
[shadcn-dashboard-landing-template](https://github.com/shadcnstore/shadcn-dashboard-landing-template),
MIT) and are driven by `@base-ui/react` rather than Radix.

Two rules make them fit the existing design system:

1. **One palette.** `src/index.css` derives every shadcn semantic token
   (`--background`, `--card`, `--muted`, `--sidebar`, `--chart-*`, …) from the
   app's own `--color-*` tokens, so primitives render in the Yekis palette and
   flip with `data-theme` for free. The same file registers those tokens in
   `@theme inline` so `bg-card`, `text-muted-foreground`, `border-border` and
   friends resolve correctly.
2. **The console still owns its skin.** `components/ui.tsx` re-exports
   `Button`, `Card`, `Pill`, `OpsTable`, `FilterSelect`, `Banner`, `ErrorBox`
   and `LoadingBox`, each wrapping the shadcn primitive while keeping the
   `.ops-root` class names. `ops-console.css` therefore still decides the
   console's look — `.ops-root .card` neutralises the primitive's built-in
   padding with `--card-spacing: 0px`, for example.

So a page can adopt a primitive directly when it wants the plain shadcn look:

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
```

Imports use the `@/*` alias (`@/*` → `src/*`), configured in
`tsconfig.app.json` and `vite.config.ts`. `components.json` at the app root
makes `npx shadcn@latest add <primitive>` work against this setup.

## Navigation


The 3-bar button in the **sidebar's brand row** collapses the sidebar so wide
tables and charts get the full viewport; the preference persists in
`localStorage` (`yekis-ops-nav`). Because a collapsed sidebar is off-canvas,
the same control reappears in the header while collapsed — driven purely by
CSS off `.nav-collapsed`, so there is no duplicated state. At ≤860px the header
button also drives the overlay drawer, and the collapse class is not applied.

## Theme and contrast

`--ops-text-3` is tertiary text (timestamps, table sub-labels, hints) and is
used by 27 rules. Both themes are tuned to clear WCAG AA (≥4.5:1) against the
panel *and* the tinted `--ops-primary-soft` row background, because the earlier
light-mode value measured only 2.65:1 — legible on the dark theme, invisible on
the light one. Icons and glyphs that sit on the console surface must use
`var(--ops-text-3)` or another token; do not hardcode a hex, or the dark theme
loses them.

## Listing, search and paging

`useListPage(fetcher, limit, deps)` pushes `page`, `limit` and `q` to the
server (350ms debounce) and returns real totals for `<Pager>`. Filters are
passed through `deps`; changing any of them re-queries from page 1. `loading`
is derived by tagging each response with the request that produced it, so
stale rows never flash while the next page loads.

Earlier revisions fetched a fixed 100 rows and filtered in the browser, which
silently missed anything outside that window — that is gone.

Endpoints that cannot filter or page honestly are labelled in the UI:
`reconciliation` applies `recStatus` client-side because the backend filters it
after pagination, and `audit-logs` narrows the current page because the route
has no text search and no date filter.

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
- **Evidence is real.** `EvidenceViewer` takes either a direct `url` (a
  milestone deliverable) or a `KycDocument` id, which it exchanges for a
  300-second signed URL via `GET /kyc/documents/:documentId/url`. It renders
  whatever the object store returns; nothing is mocked.
- **CSV export covers what is on screen.** `opsExport.ts` exports the current
  page of the current filter and says so — there is no server-side export
  route, so it does not pretend to export everything.

## Staff actions wired to real routes

| Surface | Actions |
|---|---|
| Users | open profile, suspend, reinstate, force KYC re-review |
| KYC | view signed documents, decision history, verify / reject / request clearer |
| Disputes | claim, add evidence, escalate stage, send to arbitration, resolve |
| Risk | inspect rule payload, file STR (optional account suspension), dismiss, lift hold |
| Payouts | confirm / fail settlement with provider ref or failure reason |
| Receipts | approve, reject, flag as suspicious |
| Staff | change role, remove console access |
| Profile reports | no-action / hide / ban, refresh featured carousel |
| Support | reply, attach files, close, reopen |

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
- Components: shadcn/ui primitives from `src/components/ui/`, wrapped by
  `components/ui.tsx` so the console keeps its own skin.
- Charts and tables guard against empty data rather than rendering `NaN`.