# Operations Console — React 18 + TypeScript (Vite)

Drop-in rewrite of the Ops Console prototype in the repo's actual stack:
React 18 + TS, plain scoped CSS, lucide-react icons, framer-motion-free SVG
charts, native `fetch`, custom string router, global `ThemeContext`.

## Mounting (App.tsx)

```tsx
import OpsConsole from "./pages/ops/OpsConsole";

// inside the existing string-router switch:
{page === "ops-console" && (
  <OpsConsole onExit={() => onNavigate("home")} />
)}

// e.g. a nav entry:
<button onClick={() => onNavigate("ops-console")}>Ops Console</button>
```

No providers needed — the console ships its own contexts
(`OpsUiContext`, `ChartTipContext`, `ToastContext`). It reads the global
theme from `<html data-theme="dark|light">` set by your `ThemeContext`.

## Files

```
src/pages/ops/
  OpsConsole.tsx            shell: sidebar, header, sub-router, palette/viewer/toast hosts
  opsNav.ts                 sidebar config + OpsPageId + badge selectors
  opsTypes.ts               all domain interfaces (money = minor units)
  opsApi.ts                 typed fetch service + useApi hook + formatters
  opsUiContext.ts           navigate / openViewer / toast / refreshBadges
  components/
    charts.tsx              <AreaChart/> <BarChart/> <Donut/> <Sparkline/> <HBars/> + tooltip ctx
    ui.tsx                  Pill, Banner, StatCard, OpsTable, Pager, Kv, hotkeys, toasts…
    actionCenter.tsx        buildActionItems() + <ActionCenter/>
    CommandPalette.tsx      Ctrl/⌘K jump-to-anything
    EvidenceViewer.tsx      zoom/rotate/drag lightbox with fake scan mockups
  pages/                    Overview, KycQueue, DisputeQueue, ReportsQueue, Contracts,
                            Payments, Payouts, Escrow, Reconciliation, Ledger, Users,
                            Staff, Reports, Risk, Monitoring
src/styles/ops-console.css  all styles, scoped under .ops-root, dark-mode aware
```

## Backend contract (NestJS, admin-guarded, cookie auth)

| Method | Route | Returns |
|---|---|---|
| GET | `/admin/overview` | `OverviewBundle` (metrics, activity, health, escrows, recon, riskFlags, queues, series incl. sparklines) |
| GET | `/admin/badges` | `OpsBadges` (sidebar counts) |
| GET | `/admin/contracts` | `Contract[]` |
| GET | `/admin/payments` | `Payment[]` |
| GET | `/admin/payouts` | `Payout[]` |
| POST | `/admin/payouts/:id/settle` | `{ outcome: "CONFIRMED" \| "FAILED", ref?, reason? }` |
| GET | `/admin/escrows` | `Escrow[]` |
| GET | `/admin/reconciliation` | `ReconRow[]` |
| GET | `/admin/ledger` | `LedgerBundle` |
| GET | `/admin/users` | `User[]` |
| GET | `/admin/staff` | `StaffMember[]` |
| PATCH | `/admin/staff/:id/role` | `{ role }` |
| GET | `/admin/reports` | `ReportsBundle` (financial, marketplace, series) |
| GET | `/admin/risk-flags` | `RiskFlag[]` |
| GET | `/admin/health` | `HealthState` |
| GET | `/admin/kyc/queue` | `KycItem[]` |
| POST | `/admin/kyc/:id/decision` | `{ decision: "VERIFIED" \| "REJECTED" \| "CLEARER", reason? }` |
| GET | `/admin/disputes/mediation` | `DisputeItem[]` |
| POST | `/admin/disputes/:id/resolve` | `{ outcome, split?, recommendation }` |
| GET | `/admin/profile-reports` | `ProfileReport[]` |
| POST | `/admin/profile-reports/:id/resolve` | `{ action, notes }` |

Base URL: `import.meta.env.VITE_API_URL` (defaults to `/api`).
All money fields are **minor units** (cents); chart series values are
**ETB millions**.

## Conventions honoured

- Routing: local `useState<OpsPageId>` inside the shell — same pattern as
  `App.tsx`'s `onNavigate`, no React Router.
- State: `useState`/`useContext` only; `useApi` is a ~30-line fetch hook with
  abort + reload, no React Query/Redux.
- Icons: lucide-react everywhere.
- Animation: CSS keyframes for charts (draw-in, grow, spin) + `AnimatePresence`-free
  transitions; the only rAF code left in the product is the marketing deck.
- Styling: one scoped CSS file, custom properties, dark mode via
  `:root[data-theme="dark"] .ops-root { … }` — no Tailwind classes needed here
  (the console is a dense data UI; tokens keep it themeable).
