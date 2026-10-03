# Theme Parity Audit (2026-09-24)

## Rule

Toggling between light and dark mode must only ever change **colors** — specifically
`color`, `background`, `border-color`, `box-shadow`, and `opacity`. Anything else
(width, height, padding, margin, gap, display, grid/flex values, font-size,
font-weight, line-height, letter-spacing, border-radius, position offsets …) must be
identical in both themes. Where the dark design wanted a border removed, we keep the
same border width and recolor instead, so box geometry never shifts.

## What was wrong

`apps/frontend/src/website-icons.css` contained a full dark-only layout layer:
`:root[data-theme="dark"] …` rules re-declaring geometry for the landing page, the
platform workspace shell, and the staff dashboard. Examples reproduced by this audit:

- `.platform-shell` sidebar: 244px (light) vs 224px (dark)
- `.platform-topbar` / `.platform-content`: max-width 1240px (light, 1480px ≥1200px) vs 1360px (dark)
- Workspace/landing headings: `letter-spacing` differed per theme (text reflow risk)
- Panels/cards: padding 28px + radius 14px (light) vs 22px + 8px (dark)
- Landing type scale, hero metrics, card min-heights, grid columns/gaps all differed
- Several `@media (max-width: …)` blocks applied different breakpoints/paddings per theme

62 of 74 audited page/viewport states diverged.

## Fix

The dark geometry was promoted to a shared **theme-invariant layout pass** (bottom of
`website-icons.css`) that applies to both themes; the theme-conditional rules now carry
only color/background/border-color/box-shadow/opacity. Light mode adopts the newer
"professional proportions" geometry (owner-approved), so light-mode layout is
intentionally updated to match dark.

## Evidence

- `before-fix/` — captured from the pre-fix (git HEAD) stylesheet.
- `after-fix/` — captured from the fixed stylesheet.
- Each folder contains per-viewport subfolders (`1440/`, `700/`, `400/`) with, per page:
  `<page>.<theme>.png` (full-page), `<page>.<theme>.viewport.png`, `<page>.<theme>.geom.json`
  (per-element bounding boxes + font metrics).
- `_diff-report.md` / `_diff-report.json` in each folder compares light vs dark geometry
  per page. **after-fix: 74/74 pages at full parity** (element bounds and font metrics
  identical; differences are color-only).
- `post-overview-enhancements/` (2026-09-25) — rerun of the full client+freelancer
  workspace set after the interactive-overview dashboard work (expandable stat cards,
  activity feed filters/sort, inline drill-down, live refresh indicator). Includes
  interaction screenshots of the expanded/drill-down states in both themes
  (`ws-client-overview-metrics-expanded.*`, `ws-client-overview-activity-drilldown.*`).
  Result: **24/24 workspace pages at full parity, 0 divergences.**

### Pages/states audited (each in both themes)

- Marketing/landing: home, FAQ, fees, about, case-studies, privacy, terms
- Shared components: navbar/header, footer, cookie banner (expanded), support chat popover
- Auth: login, register, forgot-password, reset-password
- Client workspace: overview, post-a-job, gigs, contracts, wallet, chat, profile, profile-edit, disputes, verification, settings + notification popover
- Freelancer workspace: overview, find-work, gigs, contracts, wallet, chat, profile, profile-edit, disputes, verification, settings + notification popover
- Staff dashboard (admin): overview, support, disputes, risk & fraud, identity (KYC), receipts, ledger, reconciliation, reports, contracts, payments, escrow, payouts, system health, users, profiles, administration, audit logs, admins & permissions

Tooling: headless Chrome (fixed viewport, same session data per theme, third-party
requests blocked for determinism, webfonts warmed before capture, animations settled).
NotFound/thank-you flow pages share the marketing.css system that is verified
color-only by the static CSS audit; they are not reachable from the UI directly.

## Re-run

Tooling lives in `scripts/theme-parity/`:

```powershell
# 1. backend must be running on :4000 (apps/backend: npm run dev)
# 2. build frontend for direct API access and serve the build statically
cd apps/frontend
$env:VITE_API_BASE_URL="http://localhost:4000"; npx vite build
node ../../scripts/theme-parity/static-server.js   # serves dist/ on :5174 with SPA fallback
# 3. capture (from repo root): --mode <folderName> [--sets public,workspace,staff,responsive]
node scripts/theme-parity/audit-harness.js --mode=after-fix
node scripts/theme-parity/geometry-diff.js --mode=after-fix
```

The harness needs `puppeteer-core` (`npm i puppeteer-core` in an empty temp dir, or add as a
devDependency) and a Chrome installation at the default Windows path (edit `CHROME` in
`audit-harness.js` if different). Evidence is written to `docs/theme-parity/<mode>/`,
already wired into both scripts via `EVIDENCE_ROOT`.

## Notes / flags

- `apps/frontend/src/telegram/miniApp.css` keeps mirrored `data-theme` dark/light rule
  pairs with **identical geometry** (1px borders, same font weights) — verified parity-neutral.
- The dark landing CTA keeps its photograph + scrim overlay (`background`, absolute
  `::before`) — appearance-only; it has zero effect on layout flow (footprint-neutral).
- The Vite **dev** server crashes when a headless browser tab closes an HMR/proxy socket
  (`ECONNRESET`); use `vite preview` or a static build for automated audits.
- Audit accounts created in local dev DB: `audit-client@yekis.et`, `audit-freelancer@yekis.et`.
