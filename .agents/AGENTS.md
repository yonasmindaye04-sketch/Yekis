# Agent Rules for Yekis Project

- Always update the Markdown (`.md`) documentation files to reflect the newest content and logic of the codebase whenever modifications are made.
- Record every change, feature addition, or update we make to the codebase in the relevant documentation files (e.g. `docs/WALKTHROUGH.md`, `docs/COMPLETENESS_CHECKLIST.md`, `docs/API.md`, `docs/DATABASE.md`, `docs/PROJECT_CONTEXT.md`).
- Never use low opacity background pill designs for status indicators (e.g., `.status-pill`). Always use bold text with a bold color design instead.
- Theme-conditional CSS (e.g. `:root[data-theme="dark"] ...`) must only ever change color, background, border-color, box-shadow, and opacity. Layout/shape properties (width, height, padding, margin, gap, display, grid/flex, font-size, font-weight, line-height, letter-spacing, border-radius, position offsets) must be theme-invariant — define them once in un-themed base rules. Never remove a border in one theme (`border: 0`); recolor it at the same width instead. See `docs/theme-parity/README.md` for the audit methodology that enforces this.
