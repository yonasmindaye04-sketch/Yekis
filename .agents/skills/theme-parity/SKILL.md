---
name: theme-parity
description: Audit or fix Yekis light/dark theme parity, where only color, background, border-color, box-shadow and opacity may differ between themes and all layout geometry must stay identical. Use when editing theme-conditional CSS, adding a dark-mode rule, or when asked about theme parity, dark mode, or light/dark divergence.
---

# Theme parity

Toggling light and dark mode must change **only** colors. Everything that
affects layout or shape must be identical in both themes.

## The rule

**Allowed to differ between themes**

- `color`
- `background` (and `background-color`)
- `border-color`
- `box-shadow`
- `opacity`

**Must be identical (theme-invariant)**

- `width`, `height`, `min-width`, `min-height`, `max-width`, `max-height`
- `padding`, `margin`, `gap`, `inset`
- `display`, `grid-*`, `flex-*`, `position`, `top`/`right`/`bottom`/`left`
- `font-size`, `font-weight`, `line-height`, `letter-spacing`
- `border-radius`, `border-width`, `border-style`
- `transform`, `overflow`, `z-index`

Never remove a border in one theme (`border: 0`). Keep the same width and
recolor it instead, so the box geometry never shifts.

Declare layout once in un-themed base rules; let the theme-conditional block
carry colors only.

## Where this bites

`apps/frontend/src/website-icons.css` is the main stylesheet. It previously
contained a full dark-only layout layer (`:root[data-theme="dark"] ...` blocks
re-declaring geometry) — 62 of 74 audited page/viewport states diverged
because of it. The fix promoted the dark geometry into a shared
theme-invariant layout pass at the bottom of the file.

`apps/frontend/src/telegram/miniApp.css` keeps mirrored `data-theme` dark/light
rule pairs with identical geometry (1px borders, same font weights) and is
verified parity-neutral — follow that pattern.

## Fixing a divergence

1. Find the offending rule: search the stylesheet for
   `:root[data-theme="dark"]` and check every declaration in the block.
2. Move each layout declaration to an un-themed rule.
3. Leave only the color declarations in the theme-conditional block.
4. Re-run the audit below and check the diff report.

## Re-running the audit

Tooling lives in `scripts/theme-parity/`.

```powershell
# 1. backend must be running on :4000
# 2. build the frontend and serve it statically
cd apps/frontend
$env:VITE_API_BASE_URL="http://localhost:4000"; npx vite build
node ../../scripts/theme-parity/static-server.js   # serves dist/ on :5174
# 3. capture and diff (from the repo root)
node scripts/theme-parity/audit-harness.js --mode=after-fix
node scripts/theme-parity/geometry-diff.js --mode=after-fix
```

The harness needs `puppeteer-core` and a Chrome installation at the default
Windows path (edit `CHROME` in `audit-harness.js` if it differs). Evidence is
written to `docs/theme-parity/<mode>/`: per-viewport PNGs plus
`<page>.<theme>.geom.json` geometry dumps, and `_diff-report.md` /
`_diff-report.json` comparing light against dark.

Use `vite preview` or the static build — the Vite **dev** server crashes with
`ECONNRESET` when a headless browser tab closes an HMR socket.

The current baseline is full parity: 74/74 pages at 1440/700/400 after the
fix, and 24/24 workspace pages in the post-overview re-run. A new divergence is
a regression.

## Also

Never use low-opacity background pill designs for status indicators (for
example `.status-pill`). Use bold text with a bold color design instead.
