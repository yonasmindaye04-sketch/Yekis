# Yekis Jobs Functional Walkthrough

Last validated: 2026-11-12

> **Phase 0 Decision Lock — what the user actually sees (2026-11-12):**
> - **Fee breakdown**: the platform's overall take is **7.5%** — a 7% commission plus a 0.5% payment/disbursement provider fee. The freelancer nets **92.5%**. The fee breakdown component (`EscrowFeeBreakdown`) now shows the two components as separate rows, so the take is visible before the client accepts, rather than a further deduction appearing at cash-out.
> - **No withholding yet**: the statutory withholding toggle on the fees page is labelled *deferred* and the backend deduction is commented out. Withholding is 0 until the accountant confirms the ERA remittance procedure.
> - **Ten launch categories**: job posting, gig browsing and the search filters now offer Video Production, Accounting & Bookkeeping, Legal Research and Data Analytics alongside the original six, in all four languages.
> - **M-Pesa is an approved rail** but cannot take money yet — selecting it surfaces the "unavailable" path until Safaricom supplies the merchant API.
> - **Support**: the in-app support desk is the helpdesk. No external vendor, and the 24-hour / 3-business-day SLAs are **not** enforced by the platform yet.

> **Multi-Language Fiscal Receipt & Payout Voucher Architecture (English Default, Amharic, Afaan Oromoo, Tigrigna) (2026-11-09):**
> - **Clean Language Separation & Elimination of Mixed Strings**:
>   - Replaced previously mixed Amharic + English receipt strings (e.g. `INVOICE / ደረሰኝ`, `Commercial Invoice & Escrow Deposit Receipt · የንግድ ደረሰኝ እና የኢስክሮ ክፍያ ማረጋገጫ`, `Role / Party: Client (ከፋይ ደንበኛ)`, `ESCROW FUNDED · በኢስክሮ የተያዘ`, dual-language line items, and joint English/Amharic compliance text blocks) with pure, dedicated translations across 4 Ethiopian working languages: **English (`en`)**, **Amharic (`am`)**, **Afaan Oromoo (`om`)**, and **Tigrigna (`ti`)**.
> - **English as Default**:
>   - All receipts, invoices, and vouchers default to clean English (`en`) upon opening, satisfying enterprise and institutional accounting standards while allowing 1-click localization.
> - **In-Sheet Multi-Language Selector (`.excel-receipt-lang-bar`)**:
>   - Directly situated in the in-card top toolbar (`.excel-sheet-top-bar`) with interactive pills: `English [Default]`, `አማርኛ`, `Afaan Oromoo`, and `ትግርኛ`.
>   - State changes instantly re-render every heading, column, label, currency explanation, payment rail description, and legal covenant.
>   - Hides on print via `.no-print` so exported PDFs and paper receipts remain clean and unencumbered.
> - **Native Calendar & Date Formatting (`formatReceiptDate`)**:
>   - English: `Nov 09, 2026`
>   - Afaan Oromoo: `Sadaasa 09, 2026`
>   - Amharic: `ጥቅምት 30, 2019 ዓ.ም`
>   - Tigrigna: `ጥቅምቲ 30, 2019 ዓ.ም`
> - **Wallet & Status Resolution Cleanup**:
>   - Enhanced `BrowserWallet.tsx` to launch receipts with clean semantic status tags (`SETTLED`, `ESCROW FUNDED`) and unmixed button labels (`Payout & Tax Voucher`, `Invoice & Escrow Receipt`, `Receipt`).

> **Browser Wallet Withdraw Earnings Panel Redesign & Space Optimization (2026-11-09):**
> - **Unified 3-Column Responsive Payout Selector (`.withdraw-payment-grid`, `.withdraw-account`)**:
>   - Replaced the previous 2-column layout (`.payment-grid`) which left Safaricom M-Pesa awkwardly alone on row 2 with 50% wasted void space.
>   - Restructured all 3 payment methods (Telebirr, CBE Bank, and Safaricom M-Pesa) into an evenly balanced, single-row 3-column grid (`repeat(3, minmax(0, 1fr))`) on desktop and tablet viewports.
>   - Reduced provider logo size from `70px × 70px` to a compact, clean `40px × 40px` with `6px` border-radius.
>   - Scaled down card padding to `10px 12px` and refined typography (`strong` at `0.88rem`, subtitle `span` at `0.74rem`), cutting overall card height from ~100px to ~60px and overall provider section height by over 70%.
> - **Tighter Vertical Rhythm & Eliminated Gap Inflation (`.withdraw-panel`, `.withdraw-fields`)**:
>   - Streamlined panel grid gap from `18px` to `14px`, removed default paragraph margins on `.wallet-help` (`margin: 0`), and reset `.withdraw-payment-grid` margins to zero.
>   - Grouped amount and destination identifier inputs into `.withdraw-fields` with zeroed top label margins and compact `38px` input height.
>   - Positioned the "Request withdrawal" action button with `justify-self: start`, `38px` height, and `0 20px` padding for clean alignment.
> - **Mobile Compaction & Theme Parity**:
>   - Added `.withdraw-payment-grid` and `.withdraw-fields` to the `@media (max-width: 640px)` mobile ruleset (`grid-template-columns: 1fr !important`), guaranteeing seamless 1-column mobile stacking without horizontal overflow.
>   - 100% theme parity preserved: all dimensions, paddings, and layout rules remain theme-invariant in base CSS, while colors and borders dynamically adapt through theme variables in both light and dark modes.

> **Platform-Wide Alert & Warning Design System Overhaul (2026-11-09):**
> - **Unified Alert Architecture (`@/components/base-ui/alert`, `@/components/base-ui/avatar`, `@/components/ui/alert`, `@/components/ui/avatar`)**:
>   - Standardized all alert, notification, warning, and error callout components across the Yekis platform to adopt the high-contrast squared avatar icon badge pattern (`<Alert className="flex items-center gap-3"><Avatar className="rounded-md shrink-0"><AvatarFallback className="... rounded-md text-white"><Icon className="size-4" /></AvatarFallback></Avatar><AlertTitle>...</AlertTitle></Alert>`).
>   - Updated `apps/frontend/src/components/ui/avatar.tsx` to support `after:rounded-[inherit]` and `rounded-[inherit]` fallback, ensuring squared `rounded-md` avatars maintain crisp, theme-accurate border rings and background fills without clipping.
>   - Enhanced `apps/frontend/src/components/ui/alert.tsx` with clean flex alignment, subtle cards, border styling, semantic variants (`default`, `destructive`, `warning`, `success`, `info`), `<AlertContent>`, and `<UnifiedAlert>` helper component.
>   - Established `@/components/base-ui/alert` and `@/components/base-ui/avatar` aliases with full re-export parity, along with a reference implementation in `apps/frontend/src/components/base-ui/alert-example.tsx`.
> - **Platform-Wide Implementation Across Workspaces & Dashboards**:
>   - **Operations Console (`apps/frontend/src/pages/ops/components/ui.tsx`, `Profile.tsx`, `DisputeQueue.tsx`)**: Upgraded `Banner` and `ErrorBox` primitives to use the bold avatar icon badge with tone-based color coding (`b-red`, `b-amber`, `b-green`, `b-blue`). Upgraded missing deliverable warnings in `DisputeQueue.tsx` with `TbFileAlert` and operator audit log banners in `Profile.tsx`.
>   - **Browser Wallet (`apps/frontend/src/BrowserWallet.tsx`)**: Replaced raw inline error boxes with `Alert` using `TbFileAlert` on the automated checkout fallback banner, and updated withdrawal and top-up status messages with avatar badges.
>   - **Workflow & Contracts Workspace (`apps/frontend/src/WorkflowWorkspace.tsx`)**: Transformed all success messages and error alerts across Jobs, Proposals, Contracts, Escrow Milestones, and Disputes into the unified `Alert` component with `TbAlertTriangle` and `Check` avatar badges.
>   - **Chat Workspace (`apps/frontend/src/ChatWorkspace.tsx`)**: Upgraded the anti-circumvention platform safety notices with `ShieldAlert` avatar badge and error callouts with `TbFileAlert`.
>   - **Phone Verification (`apps/frontend/src/PhoneVerification.tsx`)**: Replaced plain status paragraphs with the unified `Alert` component for SMS status updates (`Info`) and verification failures (`TbFileAlert`).
> - **Theme Parity & Design Rules Compliance**:
>   - 100% compliant with `.agents/AGENTS.md` and `docs/rule.md`: strictly avoids low-opacity background pills, guarantees theme-invariant layout geometry, and uses bold, solid, high-contrast avatar badge backgrounds (`bg-destructive`, `bg-amber-600`, `bg-emerald-600`, `bg-sky-600`) with white icons.
> - **Verification**:
>   - `pnpm --filter frontend build` (`tsc -b && vite build`) passed with zero errors.
>   - `node scripts/check-doc-parity.mjs` passed with 100% alignment.

> **Comprehensive Engineering, UI/UX, Theming, Responsiveness & Operational Ruleset (2026-11-09):**
> - Formalized strict system-wide development, design, and operational rules in `docs/rule.md`, `RULE.md`, and `.agents/AGENTS.md`.
> - Enforces mandatory prerequisite reading before modifying any code or view, zero-emoji policy, bold-text-only status styling without low-opacity pills or borders, theme-conditional CSS parity, header-only theme toggle, 44x44px touch targets, mobile compaction (2-per-row stats & tiles at <=640px), universal reachability, formal document layout specifications, async route error handling, MAX-based sequence numbering, and HMAC-SHA256 Telegram verification.

> **Receipt & Transaction Detail Sections Excel Spreadsheet Overhaul & Unified Layout (2026-11-09):**
> - **Unified Single Wide Metadata Box (`.excel-meta-wide-box`)**:
>   - Unified the previously split two-box metadata section into a single, seamless, wide bordered box spanning the full width of the Excel sheet.
>   - Left side (`.excel-meta-wide-left`): Recipient Party ("To:"), verified talent UCID/location, Role ("Client" / "Contractor"), and TIN.
>   - Right side (`.excel-meta-wide-right`): Date (Gregorian and Ethiopian calendar), Invoice/Serial #, Customer ID, and Fiscal Status (`.excel-status-bold`).
>   - Divided internally by a clean border line with responsive single-column stacking on mobile devices (`@media (max-width: 768px)`).
> - **Removed Detached Floating Toolbar & Integrated In-Card Actions**:
>   - Eliminated the awkward external floating toolbar card (`.excel-toolbar`) above the receipt that had caused visual detachment and large whitespace voids.
>   - Replaced it with an integrated in-sheet top bar (`.excel-sheet-top-bar`) inside `.excel-sheet-card` featuring document status/serial badges and neatly aligned action buttons (`Copy Ref / ID`, `Print / Save PDF`, and `Close [X]`) marked `.no-print`.
>   - Suppressed perspective switching tabs and tax simulation toggles (`interactiveControls={false}`) for settled wallet records in `BrowserWallet.tsx`, while preserving compact controls for fee simulation on `FeesPage.tsx`.
> - **Excel Spreadsheet Design System (`index.css`, `FiscalDocumentModal.tsx`, `BrowserWallet.tsx`)**:
>   - Re-architected both the printable Receipt view (`FiscalDocumentModal.tsx` / `FiscalDocumentSheet`) and the Transaction Movement Details modal (`BrowserWallet.tsx`) to match the user's Excel invoice template.
>   - **Spreadsheet Canvas & Layout (`.excel-sheet-*`)**: Crisp cell borders, high-contrast tabular typography (`font-variant-numeric: tabular-nums; font-family: var(--font-mono)`), dual-mode theme parity, and `@media print` white-paper styles.
>   - **Top Header**: High-visibility uppercase `INVOICE` / `PAYOUT RECEIPT` title with bilingual Amharic subtitle, paired with the `Yekis Technologies PLC` corporate lockup, tagline ("Custodial Escrow & Digital Work Marketplace · አዲስ አበባ፣ ኢትዮጵያ"), and ERCA Platform TIN/VAT metadata.
>   - **7-Column Metadata Band**: Exact spreadsheet header band displaying `Party / Agent | Job / Contract | Payment Rail | Terms | Delivery Date | Payment Terms | Status`.
>   - **Line Items Table**: Full spreadsheet grid with `Qty | Item # | Description | Custom column | Unit price | Discount | Line total` supporting principal milestone release/deposit, platform fees, statutory 15% VAT, and ERCA withholding.
>   - **Totals Box**: Right-aligned stacked calculations (`Total Discount`, `Subtotal`, `Sales tax`, `Total`) with classic Excel double-underline grand total border.
>   - **Sign-off Footer**: "Thank you for your business! · ስለመረጡን እናመሰግናለን!" with digital audit verification hash and verification link.
>   - **Strict Rule Compliance**: Enforced bold text with bold color for all status indicators (`.excel-status-bold`), eliminating all low-opacity pill designs. Guaranteed 100% theme-invariant layout geometry with colors and borders driven by root theme variables.
> - **Verification**:
>   - `npm --prefix apps/frontend run build` passed with zero errors (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passed with 100% alignment.

> **Contracts and Escrow Responsive & Accessibility Overhaul for Tablets & Mobile (2026-11-09):**
> - **Comprehensive Mobile & Tablet Ergonomics (`WorkflowWorkspace.tsx`, `shadcn-dashboard.css`)**:
>   - Optimized the Contracts and Escrow Center views for smooth touch accessibility across small mobile devices (320px–480px), large phones (640px), and tablets (iPad portrait 768px, iPad Air 820px, iPad Pro 834px).
>   - Replaced fixed flex-basis on `.sh-filter-card-actions` with dynamic fluid layout (`flex: 0 1 auto; min-width: 0; height: auto`), eliminating vertical height inflation when stacked.
>   - Enforced smooth momentum horizontal swipe on tab filters (`-webkit-overflow-scrolling: touch; scrollbar-width: none; overscroll-behavior-x: contain`) with non-squishing buttons (`flex-shrink: 0; white-space: nowrap`).
>   - Calibrated tablet breakpoint (`@media (max-width: 960px)`) to convert KPI stats to an even 2x2 grid, stack filter card controls neatly with 10px spacing, and provide comfortable touch-friendly search inputs (`height: 42px`) with enlarged tap targets on clear buttons.
>   - Configured responsive card headers and action buttons on mobile (`@media (max-width: 640px)` and `@media (max-width: 480px)`): action buttons stretch to 50% or 100% width with 44px min-height, signature tags wrap neatly, and milestone rows stack without horizontal viewport overflow.
> - **Verification**:
>   - Automated headless Chrome multi-device matrix validation across 375px (iPhone SE), 768px (iPad portrait), 820px (iPad Air), and 1280px (Desktop) confirmed zero unwanted blank gaps, natural wrapping, and 100% touch accessibility.
>   - Frontend build (`npm run build --prefix apps/frontend`) passed cleanly.

> **Contracts and Escrow Filter Toolbar Layout Restoration (2026-11-09):**
> - **Visual Defect Resolution (`WorkflowWorkspace.tsx`, `shadcn-dashboard.css`)**:
>   - Eliminated the excessive vertical blank gap (~280px tall) between the filter segmented control tabs and the search input in both the **Contracts** page and the **Escrow Center** page.
>   - Root cause: `.sh-card` defines `display: flex; flex-direction: column; gap: 14px;`. The filter container passed inline `display: "flex"` without specifying `flexDirection: "row"`, causing the search input wrapper with `flex: "1 1 280px"` to treat `280px` as vertical height along the flex-column main axis while `justify-content: space-between` pushed the controls to opposite vertical ends.
>   - Solution: Introduced the dedicated `.sh-card.sh-filter-card` and `.sh-filter-card-actions` CSS classes. Set `flex-direction: row; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 14px; flex-wrap: wrap; min-height: 0; height: auto;`.
>   - Implemented responsive mobile stacking under 768px (`flex-direction: column; align-items: stretch; gap: 10px; width: 100%`) ensuring natural wrapping and 100% theme-invariant layout geometry.
> - **Verification**:
>   - Headless Chrome layout validation confirmed natural compact height (~48px) with tabs left-aligned and search right-aligned.
>   - Frontend build (`npm run build --prefix apps/frontend`) passed with 0 errors.

> **Documentation ↔ Codebase Alignment Pass (2026-11-09):**
> - **What changed:** every documented count, constant, queue, port, route, and enum was re-verified against the running codebase and against the three governing source documents (*Master Engineering & Product Roadmap (Revised)*, *(NEW) Development & Engineering Playbook*, *Master Design, Legal & Compliance Document (Draft 1)*). The documents are the intent baseline; the code is the truth for implementation status. Divergences are recorded explicitly rather than silently reconciled.
> - **Corrected figures:**
>   - Frontend i18n **625 keys** per language (43 nested objects), exact 4-language parity — previously documented as 314.
>   - Operations Console v2 **23 page components** (23 page IDs) plus 6 shared primitives — previously documented as 19 pages.
>   - **9** BullMQ queues: `auto-release`, `gig-auto-release`, `review-reveal`, `featured-refresh`, `payment-reconcile`, `kyc-refresh`, `notifications`, `tms-scan`, `withholding-remittance` — three were missing from the architecture table.
>   - Vite dev server on **port 3000** (`vite.config.ts`), `vite preview` on 4173.
>   - Platform fee **7% from the freelancer, 0% from the client**; withholding **0% at launch** (`TIN_FEATURE_ENABLED=false`), with 3% / 30% configured above 10,000 ETB. Auto-release **7 days**. VAT threshold **450,000 ETB**. JWT access **1h** / refresh **30d**. Chat attachment cap **15 MB**.
>   - **Telebirr is the only live payment rail.** CBE and M-Pesa clients are throwing stubs; Chapa is fully removed from the application layer (only an inert PostgreSQL enum value remains).
>   - **CI exists** and runs on every pull request (doc-parity, secret scan, type-check, route-audit gate, backend tests, fresh-db check, frontend build). `deploy.yml` is a **placeholder**. There are **zero frontend test files and no frontend test runner**.
> - **Walkthrough-level corrections:** dispute-resolution preview now shows the 7% general fee (was documented as 5%); the 7-day cooling-off step is marked as **not available in practice** because `createContractFromProposal()` never sets `Contract.cancellableUntil`; the fee sections now describe the unified 7%/0% rule.
> - **✅ Walkthrough correction — the escrow step is the same on both funding paths.** Funding a milestone from the platform wallet (`POST /api/v1/escrow/fund-from-wallet`) and funding it through Telebirr (`POST /api/v1/escrow/fund`) both end in `ESCROW_HELD`. The wallet is only the **source** of the money. The submit → review → accept/dispute sequence below applies identically to both: the freelancer submits the delivery, the client gets a 24-hour warning, the 7-day auto-release timer runs, and either party can raise a dispute. The freelancer is credited only on client acceptance, on auto-release, or on a staff dispute resolution — never at funding time. Tracked as `ESC-003`; see `docs/ARCHITECTURE.md` → *Escrow*.
> - **New references:** `docs/ROADMAP_ALIGNMENT.md`, `docs/DOCUMENT_UNIFICATION_2026-11-09.md`, rewritten `docs/COMPLIANCE_BLOCKERS.md`. `docs/DOCUMENT_PROJECT_ALIGNMENT_REPORT.md` was regenerated against the 2026-11-09 scan and then removed on 2026-11-12, its content consolidated into the two documents above.

> **Direct Chat Credential Lookup & Contract Page Direct Chat Action (2026-11-09):**
> - **Multi-Credential Recipient Lookup in Direct Chat (`chat.service.ts`)**:
>   - Enhanced `createDirectConversation` in `apps/backend/src/modules/chat/chat.service.ts` to resolve recipients across user IDs (`id`), email addresses (`email` with case-insensitive matching), phone numbers (`phone` including domestic `09...` / `251...` / `+251...` normalization), and unique customer IDs (`ucid`).
>   - Added safety guards preventing self-chat attempts and synthetic guest contact targeting.
>   - Returns normalized `ChatConversation` objects with populated `otherParticipant` profiles and pushes real-time socket events via `sendToUser`.
> - **Direct Chat Action on Contract Cards (`WorkflowWorkspace.tsx`, `FullPlatformApp.tsx`)**:
>   - Added a dedicated direct chat button ("Chat with Freelancer" / "Chat with Client") with `MessageSquare` icon to executed and active contract cards.
>   - Clicking the button automatically establishes or retrieves the direct conversation between the contract's client and freelancer with subject context (`Contract: <Job Title>`), sets `initialConversationId`, and navigates directly to the `chat` view.
>   - `ChatWorkspace.tsx` automatically selects and opens the target contract thread on mount and on view transitions.
>   - Contracts API (`GET /api/v1/contracts` and `GET /api/v1/contracts/:id`) updated to include bilateral client and freelancer user profiles (`id`, `email`, `firstName`, `lastName`, `displayName`, `avatarUrl`).
> - **Verification**:
>   - Backend type-check (`npm --prefix apps/backend run type-check`) passed with 0 errors.
>   - Frontend build (`pnpm --filter frontend build`) passed with 0 errors.
>   - Verified recipient lookup with case-insensitive email query against live DB.
>   - `node scripts/check-doc-parity.mjs` passed with 100% parity.

> **Platform-Wide 7% Only General Fee Rule (2026-11-09):**
> - **Unified Fee Policy & Breakdown**:
>   - Established a flat 7% general platform fee across the platform (`PLATFORM_FEE_RATE_CLIENT = 0`, `PLATFORM_FEE_RATE_FREELANCER = 0.07`).
>   - In `EscrowFeeBreakdown` (`ui.tsx`), updated default fee rate to 7% and removed the withholding tax line. Proposals display Gross Amount, Yekis Fee (7%), and Estimated Net Payout (93% take-home).
>   - In `FeesPage.tsx`, updated the live ETB calculator, comparisons, and manifesto to reflect the 7% platform fee / 93% freelancer take-home.
>   - In `i18n.ts`, synchronized copy across all 4 languages (`en`, `am`, `om`, `ti`) to reference the transparent 7% general fee with zero withholding deductions for launch.
> - **Verification**:
>   - `npm --prefix apps/backend run type-check`: 0 errors.
>   - `pnpm --filter frontend exec tsc -b`: 0 errors.
>   - `pnpm run check:doc-parity`: 100% parity across all models, modules, routes, and topics.

> **Hero Section Layout Restoration with Interactive Purple Proximity Pop (2026-11-09):**
> - **Layout & Typography Restoration**:
>   - Restored the hero section container (.v2-hero-inner) to its clean, centered layout (max-width: 1120px; padding: 3rem 6% 4.5rem; margin: 0 auto).
>   - Restored headline scale (.v2-hero-title) to its balanced proportions (font-size: clamp(2.6rem, 7.6vw, 7.1rem); line-height: 1.1; letter-spacing: 0.005em).
>   - Restored subheadline (.v2-hero-sub) to max-width: 680px; font-size: clamp(1.05rem, 1.45vw, 1.25rem); line-height: 1.65.
>   - Restored hero actions (.v2-hero-actions) to gap: 14px; margin-top: 30px.
> - **Proximity Pop Interactive Text Animation**:
>   - Kept the requested interactive proximity pop animation active in ProximityPopTitle.tsx, LandingPageV2.tsx (SpringTitle), and LandingPage.tsx.
>   - Tuned interaction radius back to default (radius = 110px) to match the restored typography scale.
>   - Preserved purple hover glow (--v2-pop: #a78bfa; --v2-pop-glow: rgba(167, 139, 250, 0.55)) and theme rest colors.
> - **Verification**:
>   - pnpm --filter frontend build passes cleanly (tsc -b && vite build in 3.17s).
>   - node scripts/check-doc-parity.mjs passes with 100% alignment.

> **Hero Section Interactive Slogan Proximity Pop Text Animation (2026-11-09):**
> - **`ProximityPopTitle.tsx` & `LandingPageV2.tsx` (`SpringTitle`) / `LandingPage.tsx`**:
>   - Implemented an interactive cursor-proximity pop animation for the hero section slogan/title replacing previous static hover effects.
>   - As the pointer moves across the hero section stage, letters within an interactive radius (`RADIUS = 110px`) smoothly lift (`LIFT = 0.22em`), scale up (`GROW = 0.35`), turn vibrant purple (`#a78bfa` / `rgb(167, 139, 250)`), and emit a glowing text shadow (`rgba(167, 139, 250, 0.55)`).
>   - Employs smoothstep falloff (`target = t * t * (3 - 2 * t)`) and smooth LERP interpolation (`LERP = 0.16`) for fluid, organic trailing motion that follows the cursor.
>   - Untransformed letter center caching with `getOffsetRelativeTo(letter, head)` guarantees popping transforms never feed back into position measurements.
>   - Theme-aware resting color detection (`rgb(244, 244, 245)` in dark theme, `rgb(15, 23, 42)` in light theme) smoothly interpolating to purple on hover, resetting inline styles when at rest to preserve pure CSS theme fidelity.
>   - Performance-optimized RAF loop: sleeps when idle and awakens immediately upon pointer motion, preventing background CPU overhead.
>   - Full accessibility & reduced-motion support (`aria-label` with `aria-hidden="true"` letter spans, and `prefers-reduced-motion: reduce` transform override).
> - **CSS & Theme Parity (`landing-v2.css`, `marketing.css`)**:
>   - Updated `--v2-pop` to `#a78bfa` and `--v2-pop-glow` to `rgba(167, 139, 250, 0.55)` (dark) and `rgba(167, 139, 250, 0.45)` (light).
>   - Configured `.v2-hero-title` with `position: relative` and removed all-letter CSS `:hover` triggers.
>   - Strictly adheres to theme parity rules: all layout/shape properties remain 100% theme-invariant in base un-themed rules.
> - **Verification**:
>   - `pnpm --filter frontend build` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **Holding TIN Requirement & Tax Withholding for MVP Launch (2026-11-09):**
> - **Configuration & Scope**:
>   - Introduced `TIN_FEATURE_ENABLED` in `apps/backend/src/config/env.ts` (default `false`).
>   - Bypassed withholding tax (`withholdingTax = 0`) in `apps/backend/src/modules/escrow/fees.ts` when flag is disabled, preventing 30% penalties on unverified TINs for launch.
>   - Gated `/api/v1/escrow/wallet/withdraw` behind `requireKycVerified(env.TIN_FEATURE_ENABLED ? "TIER_2" : "TIER_1")`, enabling Tier 1 (National ID / Fayda) verified freelancers to withdraw funds directly.
>   - Relaxed `UpgradeToTier2Input` in `packages/schemas/src/index.ts` and `apps/backend/src/schemas.ts` to make `tin` and `businessRegNumber` optional.
> - **Contracts & Frontend Notices**:
>   - Service agreement Clause 6 (`serviceAgreement.template.ts`) dynamically clarifies independent contractor tax responsibility.
>   - `BrowserVerification.tsx` and `BrowserWallet.tsx`: Completely eliminated meta-announcements ("MVP Launch Notice") and hidden the deferred Tier 2/TIN card entirely. Verified status (Fayda / National ID) cleanly unlocks withdrawals, bidding, and contracts directly.
>   - `i18n.ts`: Updated 4-language locales (`en`, `am`, `om`, `ti`) to reflect that Fayda verification unlocks bidding, contracts, and wallet withdrawals, without confusing onboarding references to TIN withholding taxes.
> - **Verification**:
>   - `npm --prefix apps/backend run type-check` passes with 0 errors.
>   - `pnpm run check:doc-parity` passes with 100% parity across all models, modules, routes, and topics.

> **"Make ideas visible." — Design Overhaul & Minimized Replay Delay (2026-11-09):**
> - **`HandWrittenTitle.tsx` & `HandWrittenTitle.css`**:
>   - **Architectural Hierarchy Update (Pill Above Circle)**: Positioned the kicker pill (`.yk-hw-pill`) directly above the stage container (`.yk-hw-stage`), ensuring the hand-drawn circle SVG frames only the headline and subtitle. Enforced `.agents/AGENTS.md` rules with high-contrast, bold solid styling (`#22c55e` dark, `#16a34a` light, no low-opacity backgrounds).
>   - **Compact Editorial Stage Dimensions**: Scaled the stage to a compact height (`380px` on desktop, `340px` on tablet, `310px` on mobile; section padding `56px 24px 48px` desktop, `40px 16px 36px` mobile) with content width `min(640px, 82%)`. Added specificity scoping under `.yk-v2` so it never collides with the 440vh escrow scroll stage.
>   - **Typography & Font Integration**: Integrated Google Fonts `Plus Jakarta Sans` (weights 700/800) into `index.html` and `index.css`. Set headline `font-family: "Plus Jakarta Sans", "DM Sans", system-ui, sans-serif; font-weight: 800; font-size: clamp(2.6rem, 7vw, 4.9rem); line-height: 1; letter-spacing: -0.045em;`. Subtitle refined to `max-width: 520px; font-size: clamp(0.95rem, 1.7vw, 1.1rem); line-height: 1.65;`.
>   - **Minimized Replay Delay Loop**: Replaced the prolonged 6.5s loop (which previously spent 2.52s in idle hold and >3.4s before redrawing) with a crisp, fluid 2.4s cycle. The circle draws in ~1.5s via `cubic-bezier(0.43, 0.13, 0.23, 0.96)`, pauses for a brief ~0.53s hold so the completed ring registers, cleanly fades in ~0.24s, and immediately redraws. Reduced the replay delay by ~77%.
>   - **Interactive Click-to-Replay**: Added a click trigger to the section to instantly replay the animation sequence on demand.
>   - **Strict Theme Parity**: Base geometry is 100% theme-invariant across light and dark themes. Theme overrides strictly modify only colors, backgrounds, borders, and box shadows.
> - **Verification**:
>   - `npm run build --prefix apps/frontend` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **"Make ideas visible." — Full-Viewport Editorial Alignment, Bold Eyebrow & Continuous Auto-Play (2026-11-08):**
> - **`HandWrittenTitle.tsx` & `HandWrittenTitle.css`**:
>   - **Layout & Space Usage Alignment**: Upgraded `.yk-hw` to full-viewport dimensions (`min-height: 100vh; min-height: 100svh;`) with generous, balanced vertical spacing (`padding: clamp(64px, 10vh, 120px) 6%`) and max-width alignment (`1240px`), seamlessly matching the spatial rhythm and column boundaries of the full-screen escrow stage section above it.
>   - **Bold & Bigger "Yekis Jobs" Eyebrow**: Transformed the eyebrow kicker into a bold, high-contrast, prominent badge (`font-size: clamp(14px, 1.35vw, 17px); font-weight: 800; letter-spacing: 0.14em; padding: 11px 26px; border-radius: 999px;`) featuring a live emerald indicator dot (`.yk-hw-eyebrow-dot`). Strictly adheres to `.agents/AGENTS.md` by replacing low-opacity background pills with solid, vibrant color fills (`#16a34a` light with white text; `#22c55e` dark with dark-green text).
>   - **Typography Harmonization**: Switched the headline font from serif (`Georgia / Times New Roman`) to `var(--v2-font-head, "Hanken Grotesk", sans-serif)` with `font-weight: 800; letter-spacing: -0.04em; line-height: 1.04; font-size: clamp(3.4rem, 7.8vw, 6.8rem)`, harmonizing with the bold modern typography of the adjacent sections. Subtitle refined with `font-size: clamp(1.1rem, 1.45vw, 1.28rem)` and `max-width: 680px`.
>   - **Removed Replay Button & Instant Continuous Auto-Play**: Completely removed the manual "Replay animation" button and its unused state/styles. Configured the hand-drawn SVG loop (`<motion.path>`) to automatically and infinitely auto-play (`repeat: Infinity, repeatType: "loop", repeatDelay: 0.12s`), re-drawing seamlessly around "Make ideas visible." the moment each cycle finishes.
>   - **Accessibility & Strict Theme Parity**: Honored `prefers-reduced-motion` with static stroke presentation. Strict theme parity enforced: layout geometry and dimensions are 100% theme-invariant, with theme selectors modifying only colors, backgrounds, and box-shadows.
> - **Verification**:
>   - `pnpm --filter frontend build` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **Hero Section Streamlining — Pure Editorial Headline, Subtitle & Action Buttons (2026-11-08):**
> - **`LandingPageV2.tsx` (`HeroSection`) & `landing-v2.css`**:
>   - Refined the Hero section to maintain a clean, distraction-free aesthetic with generous breathing room.
>   - Removed the eyebrow pill badge (`"The Right Talent, Right Now" / "Fayda KYC"`), the milestone preview ticket card, and the bottom trust proof rail per user request.
>   - Retained the interactive spring letter headline (`SpringTitle`), the grounded value-proposition subtitle (`t.marketing.hero.subheadline`), and the high-visibility action buttons (`Post a Job` and `Milestone escrow`).
>   - Cleaned up obsolete CSS selectors and theme-conditional overrides in `landing-v2.css`.
> - **Verification**:
>   - `pnpm --filter frontend build` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **"Make ideas visible." — Open Canvas Editorial Redesign & Spacing Polish (2026-11-08):**
> - **`HandWrittenTitle.tsx` & `HandWrittenTitle.css`**:
>   - Completely removed the heavy card enclosure (`.yk-hw-card`), borders, background gradients, drop-shadows, and textured grain rectangle (`.yk-hw-grain`).
>   - Transformed the section into an open, seamless editorial canvas that sits organically between the 440vh Escrow stage and the Categories deck.
>   - **Spacious & Well-Placed Layout**: Generous vertical padding (`padding: clamp(96px, 14vh, 160px) 6%`), centered content container (`width: min(880px, 92%)`), and perfectly proportioned vertical rhythm across the kicker pill, title, subtitle, and replay trigger.
>   - **Hand-Drawn Circle Animation**: Positioned `.yk-hw-line` centrally over the title (`top: 50%; left: 50%; transform: translate(-50%, -50%)`) so the animated SVG loop draws organically around "Make ideas visible." without card clipping or border constraints.
>   - **Theme Parity Strictness**: Base layout dimensions and geometry are 100% theme-invariant. Dark and light themes seamlessly align backgrounds with surrounding sections (`#060907` dark / `#f8fafc` light) and only recolor text inks, ambient radial glows, and pill borders.
> - **Verification**:
>   - `pnpm --filter frontend build` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **Removal of Platform Metrics / Stat Cards Section (2026-11-08):**
> - **`LandingPageV2.tsx`**:
>   - Removed the skewed cascade metric stat cards section (`StatsSection` / `.v2-stats` / `Jobs Completed`, `Verified Freelancers`, `Secured in Escrow`, `Avg. Payout Time`) to create a direct, uncluttered narrative flow from the Hero section directly into the interactive "Pay for results, not promises" escrow stage.
>   - Cleaned up unused component code (`CountUp`, `useInView`, and icons `Users`, `Zap`).
> - **Verification**:
>   - `pnpm --filter frontend build` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **"Pay for Results, Not Promises" — Scroll-Driven Sticky Stage Upgrade (2026-11-08):**
> - **`LandingPageV2.tsx` (`EscrowSection` & `EscrowSvgDefs`)**:
>   - Rebuilt the escrow mechanism section (`#how-it-works`) with the scroll-driven sticky full-screen stage design (`height: 440vh` with `position: sticky; top: 0; height: 100vh`).
>   - **4 Transparent Milestones**: Fund (01), Work (02), Approve (03), Protected (04) mapped dynamically from `t.marketing.escrow` with multi-language i18n support.
>   - **Left Column**: Features massive outline background number ghosts ("01"-"04") and vertical line-mask text unrolls with custom step accent dot glow (`--wc`). Left topic words update immediately on step threshold.
>   - **Right Column (Card-Free Design)**: Scoped cleanly with `.stage-panel` without artificial card containers, borders, or box-shadows. Features clay-style 3D vector icons (`#yk-i-wallet`, `#yk-i-folder`, `#yk-i-bolt`, `#yk-i-shield`) with hovering float animations (`@keyframes yk-stage-float`), radial color wash backings (`--i2`), and staged rows with progressive delays (`--d: .5s / .6s / .7s`). Details panel follows the topic with intentional micro-delay (`0.28s`).
>   - **Ambient Crossfades**: Background glow layers (`.glow.g1` through `g4`) crossfade smoothly (`transition: opacity 1.1s ease`) per active step.
>   - **Performance**: Zero per-frame React re-render overhead; rAF loop directly updates `data-pos` ("active" | "past" | "future") and class toggles on DOM nodes. Includes iframe auto-play mode (`?card`) and accessible `prefers-reduced-motion` flow.
> - **`landing-v2.css` (`.stage*`, `.col-*`, `.word`, `.ghost`, `.stage-panel`, `.panel`, `.hero*`, `.rows`)**:
>   - Clean replacement of legacy `.esc-*` classes with modern stage layout rules.
>   - Scoped `.stage-panel` and reset `.panel` rules (`background: transparent; border: none; box-shadow: none; padding: 0`) to prevent collisions with global `.panel` styles in `index.css`.
>   - Strict theme-parity compliance: dimensions, fonts, grid offsets, and transitions defined once; `:root[data-theme="dark"]` and `:root[data-theme="light"]` only change background tints, text inks, and ghost strokes.
>   - Responsive design for `<= 960px` collapsing cleanly into mobile flow.
> - **Verification**:
>   - `pnpm --filter frontend build` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **"Find the Right Expertise" — Editorial Stack & Kinetic Outro Upgrade (2026-11-08):**
> - **`LandingPageV2.tsx` (`CategoriesSection`)**:
>   - Rebuilt with the pinned editorial card stack architecture (`Y_OFFSET = 5%`, `SCALE_STEP = 0.075`, segment progress calculation `segment = 1 / total`).
>   - Cards deal upward sequentially as the front card lifts (`yPercent -50 → -200`, `rotateX 0 → 35deg`), while cards waiting behind rise and scale into focus. Cards already dealt sit parked above (`yPercent -250`, `rotateX 35deg`).
>   - Preserves all Yekis category domains (Engineering, Design, Marketing, Content, Language, Data) via `t.marketing.categories` with kicker, title, background tones, and background image panels (`/stack/img-*.jpg`).
>   - Supports iframe / gallery auto-play mode via `?card` URL parameter with 7000ms loop and reveal/hold curve.
>   - Integrated pinned `.stk-chrome` header displaying `Yekis®` and `Stack · Scroll`.
>   - **Automatic Smooth Bring-in Motion**: As cards finish dealing (`p >= 0.96`), the rAF loop automatically brings the viewport to the "Let's Build" outro section with smooth motion (`outro.scrollIntoView({ behavior: "smooth", block: "start" })`), resetting seamlessly when scrolling back up (`p < 0.82`).
>   - **Kinetic Word Loading Animation**: Splits `outroTitle` into word spans with index variables (`--wi`, `--total`) and triggers staged 3D reveal (`translateY(118%) rotateX(-24deg)` to `translateY(0) rotateX(0)`), emerald text shimmer (`@keyframes stk-word-shimmer`), an ambient glow wash (`.stk-outro-ambient`), and an animated loading progress bar (`.stk-load-bar-fill` sweep) upon viewport activation.
> - **`landing-v2.css` (`.stk-*`)**:
>   - Cleaned up and updated to the new editorial card design (`width: 65%`, `height: 60%`, `padding: 2.4rem`, `border-radius: 1rem`, `box-shadow: 0 40px 80px -40px rgba(20, 16, 11, 0.55)`).
>   - Responsive styles for `<= 1000px` (`width: calc(100% - 3rem)`, `height: 74%`, column orientation) and `<= 768px`.
>   - Strict theme-parity compliance: base layout and dimensions defined once; theme overrides only set colors and backgrounds for both dark and light modes.
>   - Accessibility: `prefers-reduced-motion` cleanly renders a static responsive grid with animations disabled.
> - **Public Assets**:
>   - Added `/stack/` image assets (`img-1.jpg` through `img-6.jpg`) in `apps/frontend/public/stack/` to back each category card.
> - **Verification**:
>   - `pnpm --filter frontend build` passes with exit code 0 (`tsc -b && vite build`).
>   - `node scripts/check-doc-parity.mjs` passes with exit code 0.

> **`pnpm dev:tunnel` infrastructure created (2026-10-20):**
> - **Problem**: `pnpm dev:tunnel` failed with `Command "dev:tunnel" not found` because the root
>   `package.json` was missing the script and the supporting files were never created.
> - **Root causes**:
>   1. `package.json` only had `dev`, `build`, `lint`, `preview` — no `dev:tunnel`, `dev:backend`,
>      `dev:frontend`, or `tunnel:cloudflare` scripts.
>   2. `scripts/dev-with-tunnel.mjs` (the launcher) and `scripts/start-cloudflare-tunnel.ps1`
>      (the helper) did not exist, despite being documented in `CLOUDFLARE_TUNNEL_PLAYBOOK.md`.
>   3. `pnpm-workspace.yaml` was missing — pnpm was using the npm-style `workspaces` field in
>      `package.json`, which pnpm doesn't support, causing the recurring `[WARN]` and triggering
>      a full `node_modules` recreation on every invocation.
>   4. The `workspaces` array only listed `apps/frontend`; `apps/backend` was excluded from the
>      pnpm workspace graph.
>   5. The playbook referenced Vite port `5173` but the actual Vite config uses port `3000`.
> - **Fixes applied**:
>   - Created `pnpm-workspace.yaml` declaring both `apps/frontend` and `apps/backend`.
>   - Created `scripts/dev-with-tunnel.mjs`: starts cloudflared → captures `*.trycloudflare.com`
>     URL → injects it as `FRONTEND_URL` → boots backend (`tsx watch`) and frontend (`vite`)
>     concurrently. Handles graceful shutdown on `SIGINT`/`SIGTERM`.
>   - Created `scripts/start-cloudflare-tunnel.ps1`: standalone tunnel helper with multi-path
>     binary lookup and a clear install prompt if `cloudflared` is not found.
>   - Updated root `package.json`: removed `workspaces` field; switched existing scripts to
>     `pnpm --filter`; added `dev:frontend`, `dev:backend`, `dev:tunnel`, `tunnel:cloudflare`.
>   - Corrected all `5173` → `3000` port references in `CLOUDFLARE_TUNNEL_PLAYBOOK.md`.


> **Landing V2 FAQ section rebuilt from the "Earth & Cream" reference (2026-10-17):**
> - **`LandingPageV2.tsx`** — `FAQSection` is a direct port of the supplied HTML reference: the centred bordered card, the lens + `/` kbd filter, the serif `FAQ` wordmark with its pulsing dot, the self-drawing arc with an orbiting dot, the rounded-square chips, the `grid-template-rows` answer morph, the drifting leaves, the ambient blobs and the pointer parallax are all kept as authored. Only two things differ, both forced by the content: the real questions are grouped by the three existing `marketing.faq.*Title` categories, and their text comes from the translations.
>   - **Was**: a centred single column — eyebrow/headline/sub-copy band, a free-floating filter pill, then the questions in a `720px` column. Almost every visual property was an inline `style` object.
>   - **Structure**: `<section class="v2-faq">` is a `place-items: center` stage holding three layers in z-order — the blurred blobs (`z-index 0`), the falling leaves (`1`) and the card (`2`). The card is `min(1120px, 100%)`, `30px` radius, `1.5px` border, padding `clamp(36px,5vw,64px) clamp(28px,5vw,68px)`, columns `.92fr / 1.08fr`, gap `clamp(32px,5vw,72px)`, with the breathing radial `::before` wash.
>   - **Left column**: lens glyph, the filter (which widens to `360px` and picks up a glow on focus), the `clamp(64px, 8.5vw, 116px)` Georgia `FAQ` with a per-letter rise and the pulsing dot, the tagline, and the arc wrapper pinned to the column's right edge.
>   - **Right column**: a single `<ul>`. Rows stagger in from `translateX(26px)` on a `--i * 65ms + 450ms` delay; the first question auto-opens at `1150ms`; opening one closes the others; the open row gets the lime gradient wash and its chip fills and rotates `180deg`.
>   - **Behaviour** (`1150ms` open, `/` shortcut, filter) follows the reference script. Re-staggering on filter is done by re-keying the `<ul>`, which is the React equivalent of the reference's `li.style.animation = "none"; void offsetWidth; li.style.animation = ""`.
>   - **Two additions**: the fees answer links to the fees page (`FAQSection` now takes `onNavigate`), and opening a question fires `events.faqExpanded(question)` — the same call `FAQPage.tsx` makes. The landing section previously recorded nothing.
>   - **One bug fixed in the reference**: its arc uses `pathLength="1"` with `stroke-dasharray: 1` / `stroke-dashoffset: 1`, which collapses the dash to a fraction of a pixel and leaves the stroke invisible. The draw is driven by framer-motion's `pathLength` instead, which writes real dash values — the arc now actually draws.
> - **`landing-v2.css`** — new `.yk-v2 .v2-faq-*` block, all inline styles removed. Ten `v2-faq-*` keyframes: `card-in`, `breathe`, `rise`, `letter-up`, `pulse`, `orbit`, `item-in`, `float1/2`, `drift`, `sway`.
>   - **Theme parity**: every colour resolves from the existing `--v2-*` tokens and there are **no** theme-conditional rules in the block, so parity holds by construction. Verified byte-identical card geometry between themes in every state at 1440px and 390px.
>   - Responsive at `900px` (single column, arc hidden, filter no longer capped); a reduced-motion block kills all animations and hides the leaves.
> - **Verified**: `vite build` exits 0; `eslint src/LandingPageV2.tsx` reports only the pre-existing `set-state-in-effect` error in `CountUp` (untouched here). Screenshots in headless Chrome against the production build at 1440×1000 and 390×844 in both themes, for the closed / open / filtered / empty states. Note: a full `tsc -b` currently fails on `App.tsx` / `FullPlatformApp.tsx` with `'om' is not assignable to '"en" | "am"'` — that is the separate in-flight 4-language work, not this change.


> **Comprehensive Telegram Bot & Frontend Multilingual Parity (2026-10-17):**
> - **Capability**: Extended native 4-language support (`en`, `am`, `om`, `ti`) across both the Web Application and the Telegram Bot ecosystem with 100% key parity and culturally authentic translations.
> - **Bot Locale Expansion & Fixes (`apps/backend/src/modules/bot/locales/`)**:
>   - Discovered and corrected 81 missing bot locale keys previously causing raw string keys (e.g. `jobs_budget_under_10k`, `milestone_fund`, `dispute_category_*`, `notify_*`) to be displayed to users.
>   - Fixed severe machine-translation anomalies in Amharic (`am.json`):
>     - Corrected `"ተቀብሯል"` ("buried") to `"ተቀባይነት አግኝቷል"` ("accepted").
>     - Corrected `"የስራ ንቸሮች"` (corrupted typo) to `"ክፍት የሥራ ዕድሎች"` ("job opportunities").
>     - Corrected `"የእኔ ምክሮች"` ("my advices") to `"የእኔ ፕሮፖዛሎች"` ("my proposals").
>     - Corrected `"አስተሳሰቦች በመጠበቅ"` ("waiting for thoughts") to `"ፊርማ በመጠባበቅ ላይ"` ("awaiting signatures").
>     - Corrected `"ወርደት"` ("humiliation/disgrace") to `"ወረፋ"` ("queue") across staff KYC, top-up, and dispute queues.
>     - Corrected `"ማሳቀፍ"` ("hugging") to `"እርቅ እና ሽምግልና"` / `"የቀጥታ ድርድር"` ("mediation" / "negotiation").
>     - Corrected `"ይዝቱ"` ("threaten") to `"ዝጋ"` ("close").
>     - Fixed session expiration message from corrupted characters to `"ምንም እንቅስቃሴ ባለመኖሩ የቆይታ ጊዜዎ አልፏል። እባክዎ እንደገና ይጀምሩ።"`
>   - Added full Afaan Oromoo (`om.json`) and Tigrigna (`ti.json`) locale files to the bot, matching all 243 keys.
> - **Bot Engine & Notification Wiring**:
>   - Extended `types.ts` bot locale union to `"en" | "am" | "om" | "ti"`.
>   - Updated `i18n.middleware.ts` to synchronously load all 4 locales and exported `getBotTranslation()`.
>   - Connected `notifications.ts` push notifications (previously using an identity stub `(k) => k`) to real localized strings via `getBotTranslation()`.
>   - Upgraded inline keyboards (`language.ts`, `mainMenu.ts`) and callback handlers (`callbacks.ts`) to handle 4-language selection and persist preference to `User.languagePreference`.
> - **Frontend Branding & Preference Sync**:
>   - Fixed legacy brand name residue in `apps/frontend/src/i18n.ts`: updated `appName: "ሙያሎጂ (Yekis)"` in Amharic and Tigrigna to `"ዬኪስ (Yekis)"`.
>   - Synchronized user registration language with active UI language in `App.tsx` and `FullPlatformApp.tsx`, and synced user preference on login (`getMe()`).
> - **Verification**:
>   - All 314 frontend keys across 4 languages verified at 100% key parity.
>   - All 243 backend bot keys across 4 languages verified at 100% key parity.
>   - Both `frontend` and `backend` TypeScript builds compile cleanly (`tsc --noEmit` exits 0).
>   - Bot test suites (`tests/bot-updates.test.ts` and `tests/bot-deeplinks.test.ts`) pass cleanly.
>
> **Multilingual 4-Language System — Amharic, Oromiffa, Tigrigna, English (2026-10-14):**
> - **Capability**: Native, high-quality, culturally authentic multilingual support across English (`en`), Amharic (`am` / አማርኛ), Oromiffa (`om` / Afaan Oromoo), and Tigrigna (`ti` / ትግርኛ).
> - **Architecture**: Full typed dictionary (`apps/frontend/src/i18n.ts`) supporting `LanguageProvider`, `useI18n()` hook, `localStorage` persistence (`yekis-language`), and automatic `<html lang="...">` attribute binding.
> - **Theme-Invariant Language Selectors (`apps/frontend/src/components/LanguageSelector.tsx` / `LanguageSelector.css`)**:
>   - Dropdown variant (`variant="dropdown"`) for marketing header and workspace topbar with native language names, English subtitles, check indicators, and click-away dismissal.
>   - Segmented pill variant (`variant="segmented"`) for footers and compact contexts.
>   - Theme parity enforced: colors/shadows change between themes while width, height, padding, gap, display, and typography remain strictly theme-invariant.
> - **Coverage**:
>   - Landing Page V2 (Hero, Stats, 4-step Escrow, Transparent Fees, Category Deck, Testimonials Marquee, About, FAQ, Final CTA, and Footer V2).
>   - Marketing Subpages (FAQPage, FeesPage, AboutPage, CaseStudiesPage, CookieBanner, MobileCTA, NotFoundPage, ThankYouPage).
>   - Platform Workspace (FullPlatformApp auth header, workspace topbar, and translated navigation items).
> - **Offline Tracking Parity (`Yekis_translations.csv`)**: 7-column format (`key,page,section,english_text,amharic_translation,oromiffa_translation,tigrigna_translation`) with all 219 keys populated.
> - **Verification**: Frontend build (`tsc -b && vite build`) compiles cleanly in ~10s.

> **Bot Markdown Parse Error Fix (2026-10-04):**
> - **Root Cause**: All bot reply messages used parse_mode: "Markdown" (legacy) but were written with **double-asterisk bold** and backtick-code syntax, which belongs to MarkdownV2. Telegram's legacy Markdown parser cannot handle these tokens � it responded with 400: Can't find end of the entity starting at byte offset 265 on every /login and /start command.
> - **Symptom**: The code was minted to the DB successfully but the sendMessage call threw, the global ot.catch caught it and replied "Something went wrong. Please try again." � every single time.
> - **Fix**: Switched all hand-authored bot messages in commands.ts from parse_mode: "Markdown" to parse_mode: "HTML" using <b>, <code>, and <i> tags, which are unambiguous and safe. The /help command (which uses an i18n translation string) retains its own parse_mode.
> - **Frontend Fix**: Removed a nested <form> inside the Telegram sign-in modal (which itself is inside the main auth <form>). Replaced with <div> + onKeyDown handler to fix the React hydration error <form> cannot appear as a descendant of <form>.

> **Aggressive Notifications (2026-10-04):**
> - Wired proposal-received, proposal-accepted, proposal-rejected, contract-executed, and 
ew-message to the central 
otificationQueue.
> - Added proposal-received, proposal-accepted, and contract-executed to CRITICAL_NOTIFICATION_TYPES so they trigger SMS delivery in addition to Telegram, Email, and in-app alerts.
> **Customer Support Chat — Native, Verified End to End (2026-10-03):**
> - **Status**: support runs entirely on the platform's own engine. The Chatwoot third-party inbox built earlier today has been fully reverted (see CHANGELOG "Removed").
> - **The bug that made it feel broken**: the public widget created a ticket, then every read and follow-up returned `401`, because `POST /api/v1/chat/guest` is unauthenticated while `GET/POST /api/v1/chat/conversations/:id/messages` required a session. Staff replies were stored but never shown to the visitor.
> - **Guest scope (`modules/chat/guestSupportToken.ts`)**: `POST /api/v1/chat/guest` returns `accessToken`, a signed JWT with `typ: "guest_support"` and one `conversationId`. No refresh token, no role/staff claims, 12h TTL.
> - **Enforcement (`middleware/auth.ts` → `requireGuestChatAccess`)**: accepted on the messages and read routes, pinned to that single conversation; any other id returns `403 TOKEN_SCOPE_MISMATCH`. Sessions still work unchanged on the same routes.
> - **Realtime (`lib/socket.ts`)**: the handshake accepts guest tokens and forces `isStaff` off whatever the payload claims, so `chat:new_message` reaches the visitor.
> - **Widget (`components/LandingSupportChat.tsx`)**: stores the token, opens a dedicated `RealtimeSocketManager` (the singleton belongs to the logged-in session), re-reads the server thread so senders render on the correct side, and falls back to a 5s poll. `components/supportChatEvents.ts` lets the footer open it without a second instance.
> - **Entry points**: Settings "Chat with Support" opens the chat workspace; the footer "Contact Support" link opens the widget and falls back to `mailto:` when it is not mounted.
> - **Duplicate icon**: resolved — the landing page previously rendered both the native bubble and the Chatwoot bubble; only the native one remains.
> - **Verified live**: guest raised a ticket → read its own thread (`200`, previously `401`) → sent a follow-up (`201`) → an admin replied from the dashboard → the guest thread showed the reply → and the reply also arrived as a real-time `chat:new_message` push over the WebSocket. Scope test: the same token against a different conversation returns `403`.
> - **Tests**: `tests/guest-support-token.test.ts` (6 cases). Suite is green at 101/101.

> **Chatwoot Support Bridge — Backend Integration Completed (2026-10-03):**
> - **What the 2026-10-02 pass actually delivered**: the widget embed only. No Chatwoot API client, no webhook receiver, no shared state with the internal chat store, and no configured tokens — so no message ever reached an agent inbox. This entry records the bridge that completes it.
> - **Division of Labour**: Chatwoot backs **support tickets**. Peer-to-peer marketplace chat (client ↔ freelancer) stays on the internal WebSocket engine, which is the only thing that can carry participant chat, typing indicators, read receipts and attachments.
> - **Chatwoot Application API Client (`apps/backend/src/modules/chat/chatwoot.client.ts`)**:
>   - `findContact` / `upsertContact` — resolve a contact by our user id used as the Chatwoot `identifier`, falling back to email.
>   - `createConversation` — seeds the mirrored conversation with its opening message (`source_id`, `inbox_id`, `contact_id`).
>   - `createMessage` — pushes an outbound reply.
>   - `toggleConversationStatus` — opens/resolves the remote conversation.
>   - Auth via the `api_access_token` header against `/api/v1/accounts/:id/...`, with a 10s timeout per request and typed errors. Network/timeout failures are wrapped so the bridge can degrade uniformly.
>   - `isOutgoingChatwootMessage` normalises `message_type`, which the API returns as an integer in JSON but documents as a string enum.
> - **Bridge Orchestration (`apps/backend/src/modules/chat/chatwoot.service.ts`)**:
>   - `linkConversationToChatwoot` — idempotently creates and records the remote IDs (`Conversation.chatwootConversationId`, `chatwootContactId`, `chatwootInboxId`), flipping `channel` to `CHATWOOT`. Audited as `SUPPORT_CONVERSATION_LINKED_CHATWOOT`.
>   - `pushOutboundMessage` / `pushOutboundStatus` — called from `chat.service.ts`, fire-and-forget. A Chatwoot outage is logged and can never fail or delay an internal chat write.
>   - `handleInboundMessage` / `handleInboundStatusChanged` / `handleInboundConversationCreated` — ingest agent replies, resolve/reopen state, and adopt Chatwoot-originated conversations whose contact carries a Yekis id.
>   - Only **agent-authored, non-private** messages are ingested; incoming messages are skipped because we already hold them, and private notes never surface to users. Inbound replies are broadcast over the WebSocket, so they appear live in an open chat window.
> - **Signature-Verified Webhook Receiver (`apps/backend/src/modules/chat/chatwoot.webhooks.ts`)**:
>   - `POST /api/v1/webhooks/chatwoot`, mounted ahead of `express.json()` because Chatwoot signs the exact received bytes — re-serializing parsed JSON would break verification.
>   - Verifies `X-Chatwoot-Signature` (`sha256=` + HMAC-SHA256 of `{timestamp}.{raw_body}`) using `crypto.timingSafeEqual`, rejects non-numeric or >5-minute-old timestamps as replays, and fails closed when no secret is configured. Separate 600 req/min limiter.
>   - Always 2xx for understood-but-ignored events (otherwise Chatwoot redelivers forever); 5xx on a processing failure so the message is retried.
> - **Persistence & Idempotency**: migration `20261003120000_chatwoot_support_bridge` adds `Conversation.channel`, `chatwootConversationId` (unique), `chatwootContactId`, `chatwootInboxId`; `ChatMessage.origin`, `ChatMessage.externalId` (unique). Additive only — existing conversations stay `INTERNAL` and are never mirrored. NULLs are distinct in Postgres, so unlimited internal conversations coexist while each Chatwoot id maps to exactly one thread. Inbound dedupes on `externalId` because Chatwoot retries until it gets a 2xx.
> - **New Endpoints**: `POST /api/v1/chat/support` (open a ticket, mirrored immediately so an agent sees it before the first message) and `GET /api/v1/chat/support/chatwoot-health` (staff-only status). `GET /api/v1/chat/support/chatwoot-identity` now also returns `configured` so a null hash is never mistaken for "verified".
> - **Configuration Is All-or-Nothing**: `CHATWOOT_BASE_URL` enables the bridge; the backend refuses to boot unless `CHATWOOT_API_ACCESS_TOKEN`, `CHATWOOT_ACCOUNT_ID`, `CHATWOOT_INBOX_ID`, `CHATWOOT_WEBHOOK_SECRET` and `CHATWOOT_INBOX_HMAC_KEY` are all set, because a half-configured bridge silently drops support replies. Unset entirely → fully inert. Blank env values are treated as absent so a `.env` copied from `.env.example` still boots.
> - **Security Fix — WebSocket IDOR**: `lib/socket.ts` granted client-requested subscriptions with no authorization check, so any authenticated user could subscribe to `conversation:<any-id>` and receive another user's messages, typing state and read receipts live. `subscribe`/`typing`/`read` are now authorized against conversation membership, only the `conversation:*` family is subscribable, private channels are never client-requestable, positive results are memoized per socket, and a DB error fails closed.
> - **Widget Fixes (`components/ChatwootWidget.tsx`)**: identity effect omitted `fetchedHash` from its deps (hash usually never sent → anti-impersonation silently off); it waited on a `chatwoot:ready` event nothing dispatches (replaced with a bounded poll for `window.$chatwoot`); global settings were spread after the computed values so a stale object could override the theme; the widget mounted on three shells and injected the SDK three times (now a module-level singleton). The fetched hash is keyed by user id. Non-component logic moved to `components/chatwoot/bridge.ts` so the module exports only a component (React Fast Refresh), with `vite-env.d.ts` typing the `VITE_CHATWOOT_*` vars.
> - **Dead Code Removed**: `SupportChat.tsx` / `SupportChat.css` — an orphaned 5-second-polling widget imported nowhere.
> - **Infrastructure**: `docker-compose.chatwoot.yml` no longer ships known default secrets (`SECRET_KEY_BASE=replace_with_hex_64_secret_key_base`, `chatwoot_secure_pass_123`); both are now `:?` required. Switched to `pgvector/pgvector:pg16` (Chatwoot v3.16 needs pgvector; the plain `postgres:14-alpine` image fails its migrations), dropped the obsolete `version` key, and added the `.env.chatwoot.example` its own header instructed you to copy. Confirmed `db:chatwoot_prepare` is the real, required migration step — the image entrypoint waits for Postgres but does **not** migrate.
> - **Tests**: `tests/chatwoot-bridge.test.ts` — 14 cases over signature verification and the identity HMAC, with expected signatures computed independently of the implementation. Migration DDL was executed against a scratch database to confirm it applies and that NULL `chatwootConversationId` rows coexist while a duplicate Chatwoot id is rejected.
>
> **Chatwoot Real-Time Customer Support Integration (2026-10-02 — widget only, superseded by the entry above):**
> - **Architecture & Selection**: Integrated Chatwoot as Yekis's official real-time customer support platform, preserving internal `ChatWorkspace` for freelancer-client contracts while giving clients/freelancers instant access to dedicated support agents.

> **Telegram & Google Social Authentication Overhaul (2026-10-02):**
> - **Facebook Removed & Replaced with Telegram**: Deprecated and purged Facebook SDK/auth from the sign-in/registration menu. Replaced with native Telegram social authentication featuring the official paper plane icon and signature `#24A1DE` styling.
> - **Dual Telegram Verification Support**: Updated `apps/backend/src/modules/auth/telegram.service.ts` to cryptographically verify both Telegram MiniApp `initData` (`HMAC("WebAppData", botToken)`) and Telegram Web Login Widget payloads (`SHA256(botToken)`).
> - **Google Icon Visibility Fix**: Eliminated the issue where Google Sign-In button was invisible due to empty placeholder divs and origin mismatch latency. Replaced with a permanent 36px circular button displaying the crisp 4-color Google "G" SVG icon, overlaid with Google GIS iframe and fallback prompt handler.
> - **Full Registration Support for Google & Telegram**: Enabled users to register with either Google or Telegram with role preservation (`CLIENT` vs `FREELANCER`) selected on the registration form.
> - **Interactive Telegram Login Modal**: Added a dedicated Telegram connection dialog with the official Login Widget and deep link to `@ye_kis_bot`.
>

> **Chatwoot Real-Time Customer Support Integration (2026-10-02):**
> - **Architecture & Selection**: Integrated Chatwoot as Yekis's official real-time customer support platform, preserving internal `ChatWorkspace` for freelancer-client contracts while giving clients/freelancers instant access to dedicated support agents.
> - **Frontend Widget Component (`components/ChatwootWidget.tsx`)**:
>   - Built a lightweight, non-blocking React component managing the Chatwoot JavaScript SDK lifecycle.
>   - Safe dynamic script injection with deduplication and clean teardown.
>   - Synchronizes authenticated user identity (`id`, `email`, `phone`, `role`, `kycStatus`, `walletBalance`, `platform`) with Chatwoot contacts.
>   - Auto-resets session on user logout to prevent cross-session chat bleed.
>   - Syncs color scheme dynamically (`setColorScheme('dark' | 'light')`) matching the user's active theme.
>   - Provides programmatic trigger utility `openChatwootSupport()` with fallback to email support if widget is unconfigured.
> - **Backend HMAC Identity Verification (`apps/backend/src/lib/chatwoot.ts`)**:
>   - Added `CHATWOOT_INBOX_HMAC_KEY` configuration to `apps/backend/src/config/env.ts` and `.env.example`.
>   - Generates HMAC-SHA256 signatures (`getChatwootIdentifierHash`) verifying user authenticity to prevent chat identity spoofing.
>   - Exposed `/api/v1/chat/support/chatwoot-identity` endpoint for secure client token retrieval.
> - **Touchpoints & Triggers**:
>   - Mounted `<ChatwootWidget />` in `FullPlatformApp.tsx` across landing, authentication, and platform workspace views.
>   - Enhanced "Contact Support" in `MarketingFooter.tsx` to launch Chatwoot seamlessly.
>   - Added "Chat with Support" button in user `Settings` panel.
> - **Deployment & Self-Hosting Stack**:
>   - Created `docker-compose.chatwoot.yml` with Chatwoot Web, Sidekiq worker, PostgreSQL, and Redis for self-hosting.
> - **Build Verification**: ⚠️ This claim was inaccurate — the frontend did not compile at this point. `AdminOpsPages.tsx` contained `gap: 22px` (not valid JavaScript), was missing 12 `lucide-react` imports, and `StaffDashboard.tsx` called `<AdminOverviewPage />` without its three required props. All three were fixed and `pnpm --filter frontend run build` now genuinely passes; see the 2026-10-03 entry.
>

> **Blobatar Deterministic Profile Avatars Integration (2026-10-02):**
> - **Dependency Installation**: Added `blobatar` (`^2.7.0`) and `@blobatar/react` (`^2.7.0`) to `apps/frontend`.
> - **`<YekisAvatar>` Component (`components/YekisAvatar.tsx`)**: Built a centralized, reusable avatar component:
>   - Deterministic seed based on `userId` (with fallback to `email` / `displayName` / `YekisUser`).
>   - Renders animated geometric Blobatars with subtle hover physics (`animate="hover"`).
>   - Seamless fallback: if user has a custom `avatarUrl`, it renders the custom image; falls back to Blobatar on load error or absence.
>   - Respects user accessibility preferences (`prefers-reduced-motion: reduce`).
> - **System Touchpoints Updated**:
>   - **`App.tsx`**: Upgraded platform sidebar role badge and topbar user menu profile avatar to use `YekisAvatar`.
>   - **`ProfilePage.tsx`**: Upgraded 96px hero avatar from single-letter fallback box to high-res animated Blobatar.
>   - **`ProfileEditPage.tsx`**: Added an interactive "Profile Avatar (Blobatar)" section with a live preview and a "Shuffle Blobatar" button allowing users to re-roll their character's facial traits, colors, and eyes.
>   - **`FeaturedCarousel.tsx`**: Replaced generic fallback initial squares for featured marketplace talent with lively Blobatars.
>   - **`StaffDashboard.tsx`**: Upgraded Ops Console user chip avatar in the bottom navigation.
>   - **`ChatWorkspace.tsx`**: Replaced static letter placeholders with distinct Blobatars for conversations and chat headers.
> - **Styling & Motion**:
>   - Imported `blobatar/motion.css` into `apps/frontend/src/index.css`.
>   - Added theme-invariant container rules (`.yk-avatar-wrap`, `.yk-blobatar`) conforming to AGENTS.md theme parity rules.
> - **Build Verification**: `pnpm -r build` passed completely with exit code 0 across all workspace packages.
>

> **Frontend Dependency Modernization & Stable Upgrades (2026-10-02):**
> - **`apps/frontend/package.json`** — Upgraded dependencies to their latest stable releases:
>   - **`react` & `react-dom`**: bumped to `^19.3.0` (with matching `@types/react` and `@types/react-dom` at `^19.3.0`).
>   - **`framer-motion`**: upgraded to `^14.0.0`.
>   - **`lucide-react`**: updated to `^1.50.0`.
>   - **`vite`**: upgraded to `^8.3.2` with `@vitejs/plugin-react` `^6.1.1`.
>   - **Tooling**: `@babel/core` `^8.0.6`, `@rolldown/plugin-babel` `^0.2.4`, `eslint` `^10.11.0`, `globals` `^17.13.0`, `typescript-eslint` `^8.71.0`, `typescript` `~7.0.2`.
> - **Build Verification**: `pnpm --filter frontend build` (`tsc -b && vite build`) and `pnpm --filter backend build` (`tsc -p tsconfig.json`) both completed with exit code 0.


> **"Ready to start?" CTA + Footer Redesign — Landing Page V2 bottom outro (2026-10-03):**
> - **`LandingPageV2.tsx`** — `FinalCTASection` and `FooterV2` rebuilt from the supplied HTML reference as one continuous bottom outro:
>   - **CTA — pointer-tracked spotlight panel** (`.v2-outro-cta`): full-bleed `340px` panel, `0 0 35px 35px` bottom corners, five-stop radial gradient. A lime spotlight (`::before`, `blur(24px)`) follows the cursor through the `--mouse-x` / `--mouse-y` custom properties, written directly to the DOM in a `pointermove` listener (no React re-render) and recentred on `pointerleave`. Behind it: a breathing ambient orb, two drifting colour blobs, an SVG-noise film, and two floating outline glyphs (`Shield`, `WalletCards`).
>   - **CTA content**: mono kicker with a left accent bar (replaces `.v2-eyebrow`), `text-wrap: balance` headline + sub-copy, a flat lime primary button with a hover sheen sweep, and a glass ghost button. Buttons live on new `.v2-outro-btn*` classes so the shared `.v2-btn` system used by the hero is untouched. Hover/press motion (`translateY(-3px)`, `:active scale(.98)`, shine sweep) is pure CSS, exactly as in the reference.
>   - **Footer — frosted card + giant word** (`.v2-footer-area`): rounded "lip" divider (`.v2-footer-divider`), left/right blurred glows, then a `blur(25px)` glass card with a `2.25fr / 1.65fr` top grid (brand column + three nav columns), a hairline rule, and a bottom row with copyright, the escrow trust note and legal links. Behind the card a masked, fade-out **"Yekis"** wordmark pops in on scroll. Brand lockup is a white rounded symbol tile with a lime sweep on hover; the social links are an icon row (each keeps `title` + `aria-label`) for **TikTok, Telegram, Instagram and Facebook** as inline brand SVGs.
>   - **Giant wordmark — visibility + pop**:
>     - The reference colour `#151b17` on the `#070907` panel measured **1.14:1contrast**, i.e. invisible. Now `#4e6553` (dark, **3.15:1**) / `#7d9464` (light, **3.09:1**), and the mask ramp was reshaped to `1 → .62 → .16 → 0` so the top of the glyphs lands solid rather than pre-faded.
>     - `v2-out-word-pop` (`1250ms cubic-bezier(.16,1,.3,1) both`) animates `translateY(104px) scale(.84)` → overshoot `translateY(-14px) scale(1.045)` → settle, with `transform-origin: 50% 100%` so it grows out of the floor. Verified live over CDP: scale `.84 → .89 → .98 → 1.02 → 1.045 → 1`, offset `104 → 75 → 22 → 0 → -14 → 0`.
>     - It gets its **own** `IntersectionObserver` (`threshold: .3`). The card is much taller than the wordmark, so sharing the card's observer (`threshold: .12`) fired the pop while the wordmark was still below the fold and the user never saw it.
>     - `.v2-footer-area` gained `padding-bottom: clamp(72px, 14vh, 180px)`. The wordmark's box used to end exactly at the document bottom, so even at max scroll only its top ~80px was on screen.
>     - A scroll-*scrubbed* variant (`--word-p` written by a rAF scroll loop) was prototyped and **rejected**: the document ends directly below the wordmark, so a scrub can never reach `1` and the word would sit permanently part-faded. The observer-triggered pop has no such dependency.
>   - **Sized up**: the reference's `1000px` card at `12.5px` type read too small next to the rest of the page, so the card is now `min(1320px, 100% - 12%)` with `64px 68px 56px` padding / `34px` radius; nav links `15px`, headings `14px`, brand `20px`, description `15px`, social icons `22px`, bottom row `12.5px`, wordmark `clamp(150px, 22vw, 320px)`. The CTA panel grows to `380px` min-height with `52px` buttons and a `clamp(32px, 4vw, 52px)` headline.
>   - **Motion is the reference's, not a second system**: CTA content plays the CSS `v2-out-content` keyframe; the footer card and wordmark are revealed by `IntersectionObserver`s flipping `.is-visible` (with an immediate-reveal fallback for reduced-motion / no-`IntersectionObserver`), matching the supplied script. No framer-motion primitives are used in this section.
> - **`landing-v2.css`** — New scoped `.yk-v2 .v2-outro-*` / `.v2-footer-*` rules:
>   - **New token family `--v2-out-*`** declared once per theme block (dark default + `:root[data-theme="light"]`). Light mode gets a paper treatment (`#dcecc0 → #ffffff` panel stops, olive `#5e7f16` accents, white glass card, `#7d9464` wordmark) with identical geometry — AGENTS.md theme-parity rule satisfied by construction. A single `--v2-out-flip` (`0` / `1`) drives the alpha of the two drifting colour blobs.
>   - Added `--v2-font-mono` (`DM Mono` → `JetBrains Mono`) so the kicker stops hard-coding a family.
>   - Six new keyframes: `v2-out-content`, `v2-out-ambient`, `v2-out-drift-a`, `v2-out-drift-b`, `v2-out-float`, `v2-out-word-pop`.
>   - Responsive at `1024px` / `850px` (footer card narrows, top grid collapses, floating glyphs hidden) and `600px` (CTA panel grows, buttons go full-width, footer nav → 2 columns, base row stacks, wordmark → `32vw`).
>   - Reduced-motion block now lands the footer card and wordmark in their final state (`animation: none !important` on the pop, since the `is-visible` selector outranks the base rule).
>   - Dead `.v2-cta-card`, `.v2-cta-inner`, `.v2-footer-grid`, `.v2-footer-brand*`, `.v2-footer-col*`, `.v2-footer-copy`, `.v2-footer-bottom`, `.v2-footer-lang` rules and five orphaned breakpoint entries removed.
> - **`LandingPageV2.tsx`** — the now-unused `Magnetic` and `Stagger` motion helpers and the `Send` / `Bot` / `Mail` icon imports were deleted (`noUnusedLocals` would fail the build otherwise). `Reveal` is still used by every other section.
> - **`MobileCTA.tsx`** — the sticky mobile bar's hide-on-footer observer targeted `.landing-footer`, which the V2 home page does not use, so `querySelector` returned `null` and the bar never hid. Selector is now `.v2-footer-area, .landing-footer`.
> - **Scope**: `MarketingFooter.tsx` (the legacy footer on non-home marketing pages) is unchanged — this redesign covers the home page only.
> - **Open item**: TikTok / Instagram / Facebook social links are `href="#"` placeholders — real profile URLs still need filling in.
> - **Pre-existing, unrelated**: `tsc -b` reports `TS6133` for `ChatwootWidget` and `openChatwootSupport` in `FullPlatformApp.tsx` — dead imports left by the in-progress Chatwoot integration, not touched by this work. It will fail `pnpm --filter frontend build` until they are either rendered or removed.
> - **Build verified**: `vite build` exits 0; `tsc -b` clean for every file this change touches. Verified visually in headless Chrome via CDP at 1440×1000 in both themes (footer settled + mid-pop frame + CTA panel).

> **"Floating Paths" Hero — Landing Page V2 hero replacement (2026-10-02):**
> - **`LandingPageV2.tsx`** — `HeroSection` rebuilt on the Floating Paths hero prototype (pure CSS + a tiny rAF parallax loop; no WebGL):
>   - Old hero removed: `Lightfall` WebGL background, grid/veil/cursor layers, `WaveTitle` per-character animation, hero sub-copy, scroll cue, and the `HERO_TITLE`/`GRADIENT_WORDS`/`DARK_COLORS`/`LIGHT_COLORS` constants (`Lightfall` itself stays in `components/Lightfall.tsx` for the v1 `LandingPage`).
>   - New `FloatingPaths` component renders two mirrored SVG layers of 36 sweeping cubic curves each. Every path drifts on a single seamless linear `dash-offset` loop (dash period equals `pathLength=1`), desynced with negative delays — continuous, unidirectional, no flicker. Theme-aware via `--v2-path-a`/`--v2-path-b` tokens.
>   - New `SpringTitle` component splits the headline "Find the right expertise." into per-letter spans (35 ms stagger) playing a bouncy `rotateX` spring entrance; ~2.2 s later a `.settled` class drops the animation so the hover transition owns the transform (all letters "pop" and glow violet). Two ambient glow orbs drift behind the field. A vanilla rAF loop lerps pointer position into opposite-direction parallax for the path layer and hero content.
>   - CTAs: "Get started" → `onStart("register")`; "Browse categories" → smooth-scrolls to `#categories` (instant under `prefers-reduced-motion`). Buttons reuse the shared `.v2-btn`/`.v2-btn-secondary` system.
>   - `useTheme` is no longer consumed by the hero (theming is pure CSS via `:root[data-theme]` tokens); the local theme toggle from the prototype is unnecessary because `MarketingHeader` already provides one.
> - **`landing-v2.css`** — hero block (old `v2-hero-*` badge/grid/veil/cursor/sub/trust/scroll-cue/float-card rules and now-unused `v2-ping`/`v2-rail` keyframes removed) replaced with scoped `.yk-v2 .v2-fp-*` rules + `v2-fp-flow`/`v2-fp-drift`/`v2-fp-letter`/`v2-fp-up` keyframes:
>   - **Theme-invariant base rules**: all layout/shape properties defined once (AGENTS.md parity rule); light/dark blocks only set the colour tokens `--v2-path-a`/`--v2-path-b`/`--v2-pop`/`--v2-pop-glow`/`--v2-glow-1`/`--v2-glow-2`.
>   - **Reduced motion**: letters render static (no pop), path drift and glows disabled, CTA entrance skipped.
>   - Big Shoulders Display / DM Mono were already imported in `index.css` for the scroll-stack deck — no new font fetch.
> - **Build verified**: `pnpm --filter frontend build` (tsc + vite) exits 0.
>
> **"Find the Right Expertise" — Pinned Scroll-Stack Deck (2026-10-02):**
> - **`LandingPageV2.tsx`** — Replaced the flat 3-column `CategoriesSection` grid (`CatCard` × 6) with a full-height **pinned scroll-stack deck** inspired by the provided HTML prototype.
>   - `CATEGORIES` constant removed; replaced by `DECK_CARDS` array containing per-card CSS class, two-line title, roles count, media tag, and Lucide icon reference.
>   - `CategoriesSection` now renders an 800-svh `<div class="stk-wrap">` with a `position:sticky` pin host. Six `<div class="stk-card stk-card--N">` elements stack inside a `stk-stage` perspective host.
>   - A vanilla-JS `requestAnimationFrame` loop (inside `useEffect`) drives the entrance beat, scroll-progress deck-deal animation, pointer-tilt stage rotation, scroll-inertia kick, and inner-column parallax — identical physics to the prototype, no extra npm packages.
>   - `IntersectionObserver` reveals the always-dark "Let's build." outro panel once it enters the viewport.
>   - `prefersReducedMotion` check collapses the deck to a static 2-column grid and skips the rAF loop entirely.
>   - Arrow-chip (`stk-chip`) on each card fires `onStart("register")`. "Get started" outro button fires `onStart("register")`; "Sign in" fires `onStart("login")`.
>   - Three TypeScript null-assertion fixes applied (`cur!`, `cue!`) for refs captured inside closures after the null guard.
> - **`landing-v2.css`** — Added `~430 lines` of `.yk-v2 .stk-*` scoped rules at the end of the file:
>   - **Theme-invariant base rules**: all layout/shape properties (position, size, flex, gap, padding, border-radius, border-width/style, font-family, font-size, line-height, animation-delay etc.) defined once, never repeated in theme blocks — AGENTS.md theme-parity compliance.
>   - **Dark theme (default)**: `.yk-v2 .stk-card` + `:root[data-theme="dark"] .yk-v2 .stk-card` — dark card backgrounds (#123f36 … #423610), `--stk-ac` / `--stk-glow` custom properties for per-card accent colour & glow.
>   - **Light theme**: `:root[data-theme="light"] .yk-v2 .stk-card--N` — pastel card backgrounds (#d6f0ea … #fef3c4), dark text (#0d1418), muted accent colours. Only `color`, `background`, `border-color`, `box-shadow` change — no layout overrides.
>   - **Responsive** (`max-width: 1000px`): cards switch to `flex-direction: column`, font-sizes clamp down.
>   - **`prefers-reduced-motion`** fallback: `stk-wrap` height → `auto`, `stk-pin` → `position: static`, `stk-stage` → `display: grid; grid-template-columns: repeat(2, 1fr)`, all animations disabled.
>   - Outro panel (`.stk-flat.stk-outro`) always renders with `background: #060807` regardless of theme — intentional design choice.
>   - Four new keyframes: `stk-pulse`, `stk-float`, `stk-ring`, `stk-drip` (all `stk-`-prefixed to avoid collision).
> - **`index.css`** — Extended the Google Fonts `@import` to include **Big Shoulders Display** (wght 700;800;900) and **DM Mono** (wght 400;500) — required by the deck card typography.
> - **Build verified**: `npm run build` exits 0 — zero TypeScript errors, zero Vite errors. Bundle: 843.93 kB JS / 237.99 kB CSS (gzip: 234.74 kB / 41.43 kB).


> **Ops Console Sidebar Redesign (2026-09-30):**
> - **`StaffDashboard.tsx`** — Full sidebar restructure to match the Yekis Ops Console HTML reference design.
>   - **Brand bar**: replaced the old logo `<img>` + plain `<strong>` with a gradient indigo icon-logo (`brand-logo-icon`) + bold `Yekis` text + `OPS CONSOLE` small-caps tag.
>   - **Nav groups**: collapsed the previous 8 fragmented groups (CASES, VERIFICATION, FINANCE, OPERATIONS, MONITORING, USERS, ADMINISTRATION) into 4 canonical groups matching the ops console — **Overview**, **Financial**, **Review Queues**, **Operations**. Items reassigned: Contracts, Payments, Payouts, Escrow, Reconciliation, Ledger, Receipts → Financial; KYC Reviews, Dispute Mediation, Profile Reports, Support → Review Queues; Users, Staff & Roles, Reports, Risk Flags, Audit Logs, System Health → Operations.
>   - **Collapsibility removed**: nav groups are now static section labels (`sdb-nav-label`) — no chevron, no toggle state. Removed unused `expandedGroups` state and `toggleGroup` helper.
>   - **Nav item classes**: all nav buttons migrated from generic sidebar-nav button classes to scoped `sdb-nav-item` / `sdb-nav-icon` / `sdb-nav-text` classes. Active state changed from solid green fill to **indigo-tinted** background (`rgba(79,70,229,.08)` + `#4f46e5` text) matching the reference.
>   - **Badges**: replaced `nav-badge` pill (green bg) with `sdb-nav-badge` — bold amber text (`#b45309`) with no background, `margin-left: auto`, per AGENTS.md status design rules.
>   - **User footer chip**: moved user identity from a bordered card in the middle of the sidebar to a `sdb-footer` slot at the very bottom, containing a gradient indigo avatar (2-letter initials), name/email, and a `sdb-logout` button below it.
>   - **Icon size**: all nav icons downscaled from 18px to 16px with `opacity: 0.75` default (1.0 on hover/active).
>   - **Lucide imports updated**: added `BarChart2`, `Activity`, `BookOpen`, `AlertTriangle`, `CreditCard`, `Receipt`, `XCircle`; preserved `ChevronDown` (still used in topbar scope toggle).
> - **`AdminsPage.tsx`** — Replaced inline `background` style on the staff status cell with `className="status-pill success/error"` — bold text-first design, no background pill, compliant with AGENTS.md status indicator rule.
> - **`index.css`** — Replaced `.staff-shell` / `.staff-sidebar` / `.staff-identity` / `.sidebar-nav` block (lines 1064–1101) with new `sdb-*` rules:
>   - **Brand**: `.sdb-brand`, `.brand-logo-icon`, `.brand-name`, `.brand-ops-tag`
>   - **Nav**: `.sdb-nav`, `.sdb-nav-group`, `.sdb-nav-label`, `.sdb-nav-item`, `.sdb-nav-icon`, `.sdb-nav-text`, `.sdb-nav-badge`
>   - **Footer**: `.sdb-footer`, `.sdb-user-chip`, `.sdb-avatar`, `.sdb-user-info`, `.sdb-user-name`, `.sdb-user-email`, `.sdb-logout`
>   - **Theme rules**: dark mode overrides in `:root[data-theme="dark"]` blocks — only `color`, `background`, `border-color` changed; all layout/shape properties defined once in base rules (AGENTS.md theme-parity compliance).
>   - **Responsive**: 900px breakpoint collapses sidebar to 64px icon-only strip (labels/text hidden, items centered); 640px hides sidebar entirely — same breakpoints as before, class names updated.
>   - **Sidebar width**: changed from 260px to 252px to match reference.


> **Landing Page V2 — Pinned Escrow Board (2026-10-03):**
> - The "How your payment is protected" section is now a **pinned scroll board** instead of a four-column strip. The section is three bands: a static intro (eyebrow, headline, sub-copy, dispute link + the animated `EscrowVault`), a `480svh` pinned board, and a static footnote.
> - **Board contents:** four thumbtacked step cards pinned to a ruled sheet at four corners, three dashed connectors that draw between consecutive steps, and three pinned status notes in the free margins ("Balance locked", "Milestone 2 of 3 approved", "Auto‑release in 5 days" — the same three facts the vault illustration used to float around itself).
> - **Choreography:** `useScroll({ target, offset: ["start start", "end end"] })` → `useSpring` → `useMotionValueEvent`, all written to the DOM by one `paint(p, introT)` pass. Cards drop in with a back-out spring at `0 / .24 / .48 / .72`, connectors draw at `.16 / .40 / .64`, notes pop at `.30 / .56 / .80`, the ruled sheet parallaxes through `--esc-bgY`, and card 01 additionally drops on page load via a `0.95 s` `animate()` intro.
> - **Connector reveal:** each connector is revealed by sliding the dash window on its mask path. `pathLength` is intentionally avoided — Blink does not scale `stroke-dashoffset` by `pathLength`, and `vector-effect: non-scaling-stroke` resolves dash lengths in screen px, so the usual `pathLength="1"` recipe leaves the connectors permanently visible. Real lengths come from `getTotalLength()` and the mask band is sized in board units.
> - **Classes:** `esc-wrap` / `esc-pin` (sticky stage + ruled sheet + vignette) / `esc-card--1..4` / `esc-note--1..3` / `esc-wire*` / `esc-cue` / `esc-foot`; keyframes `esc-sway`, `esc-bob`, `esc-drip`.
> - **Theme parity:** all colours resolve from existing `--v2-*` tokens; the only theme-conditional rules are the per-step accents and thumbtack hues (`--esc-ac`, `--esc-pin-head`, `--esc-pin-dot`). Structure, positions, sizes and breakpoints are theme-invariant.
> - **Static fallbacks:** `≤900px` and `prefers-reduced-motion: reduce` both collapse the board to a stacked list (tilted via `--esc-rotm`, wires + cue removed) and JS paints the final state once — no scroll-jacking.
> - Removed the now-unused `.v2-steps-grid` / `.v2-step*` rules and their orphaned breakpoints from `landing-v2.css`.
>
> **Landing Page V2 — Animated Design Branch `design/landing-v2` (2026-09-29):**
> - **New branch `design/landing-v2`** created from `main` for a parallel landing page design. Zero changes to existing code on `main`.
> - **`LandingPageV2.tsx`** — Drop-in replacement (same props). All animations via Framer Motion. Scoped to `.yk-v2` CSS namespace. Sections: Hero, Marquee, Stats, Escrow + EscrowVault, Fees, Categories, Testimonials, Trust, FAQ, Final CTA.
> - **`landing-v2.css`** — Isolated design system. Theme-conditional blocks only change `color / background / border-color / box-shadow / opacity`. All layout/shape properties are un-themed (AGENTS.md theme-parity rule). All keyframes prefixed `v2-*`.
> - **Motion primitives:** `Reveal`, `Stagger`, `Magnetic`, `CountUp`, `WaveTitle`, `EscrowVault`, spring FAQ accordion, `AnimatePresence` testimonials, 3D tilt categories, animated fee bar, scroll progress bar, cursor gradient, scroll-parallax CTA, back-to-top.
> - **To preview:** `git checkout design/landing-v2` then `pnpm dev:frontend` → `http://localhost:5173`.
> - **To compare:** `git checkout main` then `pnpm dev:frontend`.
>

> **Multi-Rail Payments (CBE & Safaricom M-Pesa) + Manual Verification Fallback (2026-09-05):**
> - **CBE & Safaricom M-Pesa Integration**: Expanded payment options from Telebirr-only to a complete Ethiopian multi-rail infrastructure supporting **Telebirr**, **Commercial Bank of Ethiopia (CBE / CBE Birr)**, and **Safaricom M-Pesa (Ethiopia)** across Instant Checkout, Manual Bank Transfers, and Freelancer Withdrawals.
> - **Zero Dead-End Manual Verification Fallback**:
>   - When automated gateway APIs fail, time out, or experience downtime, clients are never stranded. The frontend renders an inline fallback card with a 1-click **"Switch to Manual Verification"** button that pre-fills the amount and payment rail for seamless direct transfer.
>   - For delayed or unconfirmed checkout requests (`CHECKOUT_PENDING`), clients can click **"Attach receipt for verification"** to submit their payment reference number and receipt image directly to the existing transaction via `POST /api/v1/wallet/topups/:topUpId/attach-receipt`. The server updates the top-up to `PENDING` manual review and notifies operations staff.
> - **Operations Staff Top-Up Queue (`TopUpQueue.tsx`)**: Upgraded the receipt review desk with color-coded provider badges (`Telebirr` in brand blue, `CBE Bank` in purple, `Safaricom M-Pesa` in emerald green) and destination account indicators (`0910 011 818`, `1000 223 344`, `0777 011 818 / Till 882199`) so staff can verify receipts quickly.
> - **Telegram Mini App & Browser Wallet Parity**: Unified the 3-way payment rail selection, 1-click account copy, fallback handling, and receipt upload modals across both `BrowserWallet.tsx` (Desktop Web) and `App.tsx` (Mobile / Telegram Mini App).
>
> **Chat Attachment Upload, Persistent Storage & Support Desk Rendering (2026-09-05):**
> - **Persistent Object Store Integration (`POST /api/v1/chat/upload` & `GET /api/v1/chat/attachments/:key(*)`)**: Chat attachments are uploaded to S3/MinIO bucket `marketplace-dev` (with local disk fallback under `uploads/chat-attachments/`), generating permanent streaming URLs (`/api/v1/chat/attachments/...`). Replaced ephemeral browser-memory `blob:` URLs that previously broke visibility across users and sessions.
> - **Support Desk Attachment Visibility (`StaffDashboard.tsx`)**: Support staff can view all client-attached files within support threads. Image attachments are displayed as inline thumbnails with zoom hover, and documents/archives feature styled badges with file icons, decoded filenames, and one-click download/open links (`ExternalLink`).
> - **Support Desk Reply Attachments**: Support agents can upload and attach files in their replies with live removal badges and progress spinners (`Loader2`).
> - **Client Workspace Bubble Enhancements (`ChatWorkspace.tsx`)**: Replaced raw links with containerized image previews and responsive download chips, auto-defaulting body text to `📎 <filename>` when files are sent without draft text.
>
> **Real-Time WebSocket Messenger & "Mini-Me" AI Negotiation Co-Pilot (2026-09-04):**
> - **Full Bidirectional WebSocket Engine (`/api/v1/ws`)**: Upgraded chat from 5-second polling to instant event-driven WebSockets. Handshakes authenticate JWT access tokens with ping/pong heartbeats and automatically route `chat:message`, typing states (`chat:typing`), read notifications (`chat:read`), and new-thread unread badges (`chat:new_message`).
> - **Direct Client ↔ Freelancer Messaging Channels**: Added `POST /api/v1/chat/direct` allowing direct 2-party contract negotiations with participant role badges, online presence indicators, and unread counters alongside support tickets.
> - **"Mini-Me" AI Co-Pilot Suite**:
>   - **Smart Reply Suggestions**: Real-time contextual response suggestions displayed as 1-tap interactive pills directly above the composer (`/assistant/suggest-replies`).
>   - **Thread Digest & Summarizer**: Analyzes negotiation history into structured deliverables, timeline, agreed budget in ETB, and recommended next steps (`/assistant/summarize`).
>   - **1-Click Deal Terms Extractor**: Synthesizes unstructured conversational agreement into escrow-ready milestone proposal cards with confidence scoring and direct contract creation links (`/assistant/extract-deal`).
> - **Real-time Anti-Circumvention Protection**: Client-side scanner actively parses drafts for off-platform contact leaks (Ethiopian mobile numbers `09...`, Telegram `@...`, off-platform emails, wire transfer requests) with an inline warning informing users of escrow safety benefits before sending.
> - **2-Column Responsive Workspace (`ChatWorkspace.tsx`)**: Built complete responsive messaging interface with thread search, category filtering (All/Direct/Support), document attachments, and mobile-friendly view toggling.
>
> **Statutory Cooling-Off Routing Fix, Build Health & Workspace Integration (2026-09-03):**
> - **Resolved Nested Route Registration in `contracts.routes.ts`**: Un-nested `POST /api/v1/contracts/:contractId/cancel-cooling-off` from inside the `catch` block of `/:contractId/accept`, properly registering the statutory 7-day cooling-off cancellation endpoint (ECA Proclamation No. 1205/2020) directly on `contractsRouter`.
> - **Purged Stale Compiled JavaScript in Backend `src`**: Removed committed transpiled `.js` files from `apps/backend/src/` (`config/env.js`, `lib/logger.js`, `lib/redis.js`, `modules/escrow/providers/*`) that were shadowing TypeScript source files and causing missing environment variables (e.g. `TMS_ROUND_AMOUNT_WINDOW_DAYS`). Added ignore rules to `.gitignore` to protect against future shadowing.
> - **Strict TypeScript Type Safety in Audit and Telegram Bot**: Upgraded `recordAuditEvent` metadata to use `Prisma.InputJsonValue` with `Prisma.JsonNull` fallback, and aligned `BotSession.staffRole` to the full `StaffRole` enum from `@prisma/client` (`SUPPORT`, `COMPLIANCE_OFFICER`, `ADMIN`).
> - **Workflow Workspace Cooling-Off UI**: Added `cancelContractCoolingOff` API client method and client-facing cooling-off cancellation controls in `WorkflowWorkspace.tsx` (`ContractsWorkspace`), displaying statutory cancellation eligibility before milestone funding with confirmation dialogues and cancelled status badges.
> - **Automated Test Coverage**: Added dedicated `cooling-off.test.ts` test suite confirming client statutory cancellation, party authorization guards (403), post-funding rejection, and audit log persistence. All 7 test suites (34 tests) passing.

> **Operations Workspace Polish & Database Synchronization Fix (2026-09-03):**
> - **Resolved 500 `INTERNAL_ERROR` Bug in Operations Dashboard**: Synchronized PostgreSQL database schema with Prisma (`WalletTopUp.providerTransactionId`, `receiptImagePath`, and related ledger/checkout fields) via `prisma db push`, ensuring `/api/v1/wallet/topups` and `/api/v1/wallet/topups/queue` succeed with 200 OK.
> - **Cleaned Dispute Icon in Sidebar & Metric Cards**: Replaced raw textual `(!)` badge symbol with the standard `Scale` (from `lucide-react`) icon in both the Operations sidebar navigation and the Overview metric cards for a consistent, premium aesthetic.
> - **Operations Workspace Header & Sidebar Polish**:
>   - Realigned the topbar title and action bar, separating the `[ All Queues | My Queue ]` scope toggle into the right-hand action controls alongside the theme switcher and refresh button.
>   - Added real-time queue count badges to sidebar navigation items (Support, Receipts, Identity, Disputes).
>   - Upgraded the bottom "Sign out" button with a dedicated `LogOut` icon, clean padding, and subtle red hover state.
>   - Refined metric card layout with dedicated rounded icon wrappers (`.staff-metric-icon-wrap`) and clean typography.
>   - Confined the `StaffCompliancePanel` (AML Review Queue) to the Overview tab rather than sticking it beneath every sub-queue tab.
> - **Strict TypeScript Type Safety**: Fixed `StaffRole` type mismatch in `chat.service.ts` to ensure clean compilation across backend and frontend.

> **Telegram Bot Token Validation & Startup Resilience (2026-08-28):**
> - **Pre-Flight Bot Token Verification**: Added pre-flight check in `bot.service.ts` using `bot.api.getMe()` to test credentials against Telegram API before attempting to set commands or start polling.
> - **Graceful Failure Handling**: If `TELEGRAM_BOT_TOKEN` is invalid, expired, or rejected (401 Unauthorized), the backend logs an informative warning and skips bot initialization without throwing unhandled promise rejections or crashing the dev server.
> - **Polling Error Catching**: Added `.catch()` handler to `bot.start()` to catch background polling disconnections cleanly.

> **Backend Run & TypeScript Type Safety Update (2026-08-28):**
> - Resolved runtime missing dependency `axios` required for eSignet OIDC KYC verification.
> - Aligned Prisma schema with `ROUND_AMOUNTS` and `strDeadlineAt` and regenerated Prisma client.
> - Resolved all strict TypeScript errors across KYC, Escrow, TMS, and Bot Scene modules.

> **Telegram Mini App Startup, Clean Typography & Registration Workflow Update (2026-08-22):**
> - **Immediate Mini App Loading**: Added inline Telegram WebApp initialization script in `index.html` executing `Telegram.WebApp.ready()` and `Telegram.WebApp.expand()` immediately to bypass Telegram iframe loading stalls. Configured `allowedHosts: true` in `vite.config.ts` (Cloudflare Tunnel compatible).
> - **Emoji-Free Professional UI**: Removed all decorative emojis from Telegram Bot commands, keyboards, greetings, and Mini App UI buttons (clean professional text).
> - **Comprehensive Registration & Onboarding Guide**: Unified registration flow supporting 1-tap Telegram WebApp authentication, Ethiopian mobile phone + password/PIN sign-up, and 1-click Google sign-in with automatic workspace provisioning.
> **Universal Theme Toggle & Footer Alignment Update (2026-08-22):**
> - **Platform-Wide Theme Toggle**: Embedded the light/dark mode theme switcher into every platform page and surface (Marketing Header, Subpages, Sign-in/Register Auth screen, Logged-in Workspace Topbar, Staff Dashboard, and Mini App).
> - **Unified Footer & Escrow Badge Alignment**: Extracted reusable `MarketingFooter.tsx` across all marketing and legal subpages. Fixed flex conflicts in `index.css` and `marketing.css` so that `"Â© 2026 Yekis. All rights reserved."` and `"Payments secured by Yekis Escrow"` align on a clean full-width bottom bar.
> **Platform Auth, Transactional Email & Mini App Security Update (2026-08-22):**
> - **Google (Gmail) & Social Authentication**: Implemented 1-click Google Sign-In (`/api/v1/auth/google`) with automatic user provisioning and workspace resolution. Added persistent session caching on visit (`/api/v1/auth/me` auto-resume), eliminating repetitive account registration prompts.
> - **Transactional Email Notification System**: Built modular transactional email service (`email.service.ts`) with responsive HTML templates for password resets, order invoices/receipts with ETB breakdowns on milestone funding, and platform movement alerts (milestone delivery, escrow releases, dispute updates, KYC verifications).
> - **Telegram Mini App Dual Security**: Implemented dual-tab authentication supporting seamless 1-tap Telegram WebApp HMAC verification and secure Ethiopian mobile phone + PIN/password login with clear security indicators.
> **Telegram Mini App & Environment Architecture Update (2026-08-22):** Enhanced backend environment variable resolution (`env.ts`) to automatically detect `.env` from multiple locations (`apps/backend/.env`, root `.env`, and working directory). Added automated schema sanitization for `TELEGRAM_BOT_TOKEN` to handle quotes, whitespace, and empty strings. Added dedicated unit test suite (`telegram-auth.test.ts`) covering Telegram WebApp HMAC-SHA256 hash verification, freshness checks, and user upserts.
> **Theme, Brand & UX Update (2026-08-22):** Complete light and dark mode design system refactor. Resolved contrast issues across light mode surfaces (fees comparison tables, step indicators, card borders, headings, chat attachments). Standardized brand emerald primary color (`#16a34a` light / `#22c55e` dark) and slate text contrast (`#0f172a` light / `#f8fafc` dark). Removed destructive global SVG color overrides and low-opacity background boxes around icons. Eliminated AI-slop / developer jargon from landing copy in favor of clear, human-readable marketplace terms.
> **Architecture & Type Safety update (2026-08-21):** Full database schema migration synchronization (`20260821215600_add_profile_reviews_chat_platform_models`) completed with clean seeding and zero TypeScript compilation errors across `apps/backend` and `apps/frontend`. All backend test suites and frontend builds validated with passing status.
> **Design spacing update (2026-08-21):** Fully unified Yekis landing and marketing page space utilization to match AFRO-TECH's full-bleed layout. Implemented 6% horizontal gutters across the fixed horizontal navigation bar, left-aligned hero section, content containers (`.marketing-container`), and footer. Configured responsive fluid gutters (6% desktop -> 5% tablet -> 4% mobile) with clean component layouts.
> **Payment flow update (2026-08-15):** Escrow is now funded directly from the client's in-platform wallet. The old external-provider (Telebirr/CBE direct) Fund button has been replaced with a "Fund from wallet" button. When both parties sign a contract, the platform automatically debits the client wallet and locks funds in escrow. See [`docs/FLOW.md`](docs/FLOW.md) for the full canonical payment lifecycle.

This document is the fastest way to understand the product as a whole. It translates the supplied Ethiopian Freelance Marketplace linkage map and journey images into the workflow currently exposed by the frontend and API.

## Actors

| Actor | Main capabilities |
|---|---|
| Client | Verify identity, post jobs, review proposals, sign contracts, fund milestones, accept work, raise disputes |
| Freelancer | Verify identity, browse jobs, bid, sign contracts, submit milestones, raise disputes, withdraw earnings |
| Compliance Officer | Review KYC and top-ups, mediate disputes, review TMS flags, record STR filings |
| Admin | Same operational access as compliance staff, with room for broader administration |
| Workers | Send notifications, warn before auto-release, release eligible escrow, flag periodic KYC reviews |

## Journey Part 1: Registration to Funded Contract

```mermaid
flowchart LR
  A["Register and pass age gate"] --> B["Submit Tier 1 KYC"]
  B --> C{"KYC verified?"}
  C -- No --> D["Staff review or rejection"]
  D --> B
  C -- Yes --> E{"User role"}
  E -- Client --> F["Post job"]
  E -- Freelancer --> G["Browse and submit proposal"]
  F --> G
  G --> H["Client reviews proposals"]
  H --> I["Accept one proposal atomically"]
  I --> J["Generate immutable contract PDF"]
  J --> K["Client signs"]
  J --> L["Freelancer signs"]
  K --> M{"Both signed?"}
  L --> M
  M -- Yes --> N["Fund selected milestone"]
  N --> O["Verify signed provider webhook"]
  O --> P["Escrow held"]
```

Important controls:

- Registration captures age, role, language, and purpose-specific consent.
- Tier 1 must be `VERIFIED` before posting a job, bidding, or funding.
- Users cannot bid on their own jobs, and one freelancer can submit only one proposal per job.
- Proposal acceptance runs in a serializable transaction so only one proposal wins under concurrent requests.
- The generated PDF is stored in MinIO/S3-compatible object storage and exposed to contract parties through a temporary signed URL.
- Funding requires the `contractId` and a milestone that actually belongs to that contract.
- Only one pending funding transaction can exist for a milestone.
- Webhooks use the raw request body, provider-specific HMAC verification, and idempotent state transitions.
- A structuring TMS check runs when funds enter escrow.

## Journey Part 2: Delivery to Payout

```mermaid
flowchart LR
  A["Escrow held"] --> B["Freelancer submits milestone"]
  B --> C["Five-day review window"]
  C --> D{"Client decision"}
  D -- Accept --> E["Release funds atomically"]
  D -- No response --> F["BullMQ auto-release"]
  F --> E
  D -- Dispute --> G["Negotiation"]
  G --> H["Evidence"]
  H --> I["Staff mediation"]
  I --> J{"Resolution"}
  J -- Release --> E
  J -- Refund --> K["Refund client"]
  J -- Split --> L["Partial freelancer credit and client refund"]
  I --> M["Arbitration"]
  M --> J
  E --> N["Freelancer wallet"]
  N --> O["Request Tier 2"]
  O --> P["Staff verifies Tier 2"]
  P --> Q["Request withdrawal"]
  Q --> R{"Wallet mismatch?"}
  R -- Yes --> S["Hold with no debit and create TMS flag"]
  R -- No --> T["Debit wallet and record payout request"]
```

Important controls:

- Submitting work schedules a 24-hour warning and final release job (unless the contract is still within its 7-day cooling-off window, which takes precedence).
- Explicit acceptance cancels delayed release jobs.
- Client can cancel the contract during the 7-day cooling-off window if no escrow is funded or work started yet.
- Release and refund paths use guarded database updates to prevent duplicate wallet credits.
- Fees and withholding are calculated on the server. Platform fees are credited to the `PlatformOperatingAccount` and monitored against the VAT alert threshold.
- Disputes are attached to individual milestones, so a multi-milestone contract can have separate cases.
- Disputes can be mutually withdrawn if both parties propose the same outcome and split.
- Submitting dispute evidence automatically compiles a JSON bundle containing contract terms and the direct message log.
- Partial-split amounts cannot exceed the milestone value, and guarantee contract completion once applied.
- Tier 2 is required for withdrawal.
- A payout identifier that does not match the verified phone is held for review with HTTP `202`; no wallet debit occurs.
- Telebirr B2C automated disbursement initiates payout to the freelancer's mobile wallet (deducting a standard 0.5% cash-out fee). Successful transfers atomically post balanced double-entry general ledger entries (`LedgerJournal` / `LedgerEntry`), while immediate provider refusals automatically roll back the wallet debit.

## Frontend Surfaces

| Surface | What is wired |
|---|---|
| Overview dashboard | Role greeting + hero CTA, featured talent / recommended jobs, expandable stat cards (wallet breakdown from top-ups, open-jobs by category, active-milestones by escrow state with ETB-secured total and a due-month bar chart), recent-activity feed with type/due-date filters and sort controls, inline milestone drill-down, live refresh status (realtime `notify:*` socket events + 60s visibility-gated poll) |
| Authentication | Email registration/login and Telegram Mini App authentication |
| Verification | Tier 1 document upload/status and Tier 2 request |
| Jobs workspace | Search, post, view own jobs, bid, review/decide proposals, withdraw proposals |
| Contracts workspace | List party contracts, open signed PDF URL, sign, fund, submit, accept |
| Disputes workspace | List, raise, inspect, escalate, add evidence, request arbitration |
| Wallet | Balance, manual top-up, top-up history, Tier 2 withdrawal |
| Notifications | List unread/all notifications and mark read |
| Support chat | Guest or authenticated conversations and messages |
| Staff dashboard | KYC/top-up queues, dispute resolution, TMS filing and dismissal |

## Featured Talent and Moderation

Staff have additional controls over user presence:
- **Featured Talent Carousel**: Admins can pin exceptional, fully-verified freelancers to the homepage carousel for increased visibility. This history is tracked via a featured log.
- **Profile Reports**: Users can flag inappropriate profiles. Staff review these reports in a dedicated queue and can take moderation actions, such as clearing offensive content or suspending the user.

## Backend State Machines

Milestone escrow:

```text
PAYMENT_PENDING -> ESCROW_HELD -> SUBMITTED_FOR_REVIEW
SUBMITTED_FOR_REVIEW -> RELEASED
SUBMITTED_FOR_REVIEW -> DISPUTED
DISPUTED -> RELEASED | REFUNDED | PARTIAL_REFUND
```

Dispute:

```text
STAGE_1_NEGOTIATION -> STAGE_2_EVIDENCE -> STAGE_3_MEDIATION
STAGE_3_MEDIATION -> RESOLVED
STAGE_3_MEDIATION -> STAGE_4_ARBITRATION -> RESOLVED
```

KYC:

```text
PENDING -> UNDER_REVIEW -> VERIFIED | REJECTED
TIER_1 VERIFIED -> Tier 2 request -> UNDER_REVIEW -> TIER_2 VERIFIED | REJECTED
```

A periodic review sets `periodicReviewPending` without revoking a previously verified user's active access.

## Verified Local Scenarios

The following were run end to end against Docker-backed PostgreSQL, Redis, and MinIO:

- Register/login, Tier 1 verification, job creation, proposal submission, proposal acceptance, PDF generation, both signatures, funding initiation, signed webhook, delivery, acceptance, and wallet release.
- Tier 2 request and staff review followed by wallet withdrawal.
- Dispute negotiation, evidence, mediation, and partial-split resolution.
- Wallet mismatch returning a review hold without debiting funds, followed by staff TMS dismissal.
- Backend TypeScript build, frontend production build, and frontend-to-API linkage tests.

## Production Boundaries

| Boundary | Current implementation | Needed for production |
|---|---|---|
| Fayda | Deterministic development mock | Approved API access, credentials, payload mapping, error/retry policy |
| PEP/sanctions | Stubbed no-match behavior | Licensed/approved data source and review policy |
| Telebirr/CBE collection | Shared adapters and signed webhook flow | Real sandbox credentials, verified request/response mappings, reconciliation |
| Payout | Local wallet debit and audit only | Provider disbursement API, pending/failed/reversal states, reconciliation |
| SMS/Telegram | Worker and clients exist; credentials/account linking control delivery | Production credentials, templates, opt-out and delivery monitoring |
| STR filing | Staff records external filing reference | Human regulatory process; no FIC API is assumed |
| Data residency | Local deployment design | Ethiopian production hosting, backups, retention, access review |
| Object immutability | Object-store paths and WORM design | Production bucket versioning/object lock and retention policy |

## Source Of Truth

- Route behavior: `apps/backend/src/app.ts` and each module's `*.routes.ts`/service.
- Request and response shapes: `packages/schemas` plus route-local Zod schemas.
- Persistent state: `apps/backend/prisma/schema.prisma` and migrations.
- User-facing linkage: `apps/frontend/src/api/client.ts` and workspace components.
- Change history: `CHANGELOG.md`.
- Playbooks: `docs/NGROK_PLAYBOOK.md` (e.g. for testing webhooks and Telegram Mini App integration).

When implementation changes, update this walkthrough if the user journey, state machines, roles, or production boundaries change.

## Staff Live Chat Inbox Journey (added 2026-08-07)

1. A staff account (`staffRole = COMPLIANCE_OFFICER | ADMIN`) logs in via the normal login form.
2. `FullPlatformApp` detects `user.staffRole` and immediately renders `StaffDashboard`.
3. On load, all four queues are fetched in parallel: support conversations, KYC queue, top-up queue, dispute queue.
4. Auto-polling fires every 8 seconds Ã¢Â€Â” new user messages surface without a manual refresh.
5. Unread conversations show a lime dot in the conversation list and a red badge count on the metric card.
6. Staff select a conversation Ã¢Â†Â’ messages load, thread is marked read, auto-scroll puts staff at the latest message.
7. Staff type a reply and press Enter or Send Ã¢Â†Â’ message delivered, list refreshes silently.
8. Staff press **Close** Ã¢Â†Â’ `PATCH /api/v1/chat/admin/conversations/:id/status` sets status to `CLOSED`; reply box locks.
9. Closed conversations remain visible under the **All** filter and can be **Reopened** at any time.
10. See `ADMIN_ACCESS.md` for instructions on creating a staff account.

## Evidence Viewer (added 2026-08-08)

1. The backend implements full integration for the "Evidence Viewer".
2. Contains secure streaming of user KYC identity evidence and receipt image uploads from the internal Object Store to authenticated staff.
3. Added the `WalletTopUp` and `KycReviewEvent` models to accurately log and securely verify top-up requests and compliance audits.
4. Top-ups can now be reviewed manually, unlocking real funds into the wallet upon `APPROVED` status.

## KycQueue Redesign

1. The KYC identity review interface is now a two-pane layout, embedding the `EvidenceViewer` inline.
2. Compliance officers can now review resubmissions alongside full historical logs, automated Fayda/PEP checks, and visually cross-check the submitted Full Name and Document Number.
3. Automated SLA timers and granular rejection reasons (e.g., "Request clearer photo") improve staff efficiency.

## TopUpQueue Redesign (added 2026-08-09)

1. The receipt approval interface (`TopUpQueue`) is now a two-pane side-by-side layout, embedding the `EvidenceViewer` inline.
2. Staff can visually cross-check the user-submitted amount and reference number directly against the receipt image.
3. The expected destination platform account is explicitly shown to ensure funds are verified against the correct company account.
4. User top-up history (prior approvals and rejections) is shown inline to provide context on trusted vs. risky transactions.
5. Suspicious transactions (e.g. forged receipts) can now be explicitly "Flagged," routing them to the TransactionFlag/TMS compliance queue instead of just being silently rejected.
6. Approval actions include a strict confirmation modal before irrevocably crediting a user's wallet.

## Staff Dashboard Redesign (added 2026-08-09)

1. **Clickable Metric Cards & SLAs**: The top metric cards for Support, Receipts, Identity, and Disputes are now clickable, jumping directly to their respective queues. SLA aging timers (e.g., "< 1h", "24h") are displayed on each card, turning amber or red if queues become stagnant.
2. **Queue Scoping**: A "My Queue" vs "All Queues" filter has been added. As items are currently unassigned globally in the backend schema, the "My Queue" toggle behaves as a UI mock to showcase personal views pending future backend assignment logic.

## DisputeQueue Redesign (added 2026-08-09)

1. The DisputeQueue interface is now a two-pane layout, providing full inline context for mediators.
2. Mediators can view the original contract scope alongside the submitted deliverable (with inline viewer for URL-based deliveries).
3. Added \deliverableUrl\ to the \Milestone\ schema to track and present the submitted work during disputes.
4. Stage 2 Evidence statements from both client and freelancer are rendered inline as a chat flow.
5. Resolving a dispute provides a live, calculated preview of exact ETB amounts allocated to the freelancer and refunded to the client, factoring in the platform fee (7% general fee, deducted from the freelancer's release) and estimated withholding tax (currently 0% while `TIN_FEATURE_ENABLED=false`).


## StaffCompliancePanel Redesign (added 2026-08-09)

1. Redesigned the TMS AML queue to feature dedicated visual blocks for STRUCTURING, VELOCITY, PASS_THROUGH, and WALLET_MISMATCH flags.
2. Compliance actions now strictly enforce a 10-character minimum for review notes, and demand a valid FIC reference number when filing an STR.
3. Replaced generic timestamp details with a critical 24-hour SLA countdown, aggressively flagging breached filing deadlines.
4. Integrated a new 'User Compliance History' sidebar, directly fetching past flags, current KYC Tier, and Wallet balance for holistic risk assessment during manual reviews.



## Updates
- 2026-08-10: Fixed Telegram bot webhook deletion issues in development mode, added a 'Open Yekis Jobs' persistent Web App Menu Button, and updated welcome translations to guide users to the app.

- 2026-08-10: Fixed malformed translation JSON causing 'errors_generic' bug in Telegram bot, and added Wallet tab to frontend Mini App navigation.

- 2026-08-10: Configured Telegram bot API properties (setMyCommands, setMyDescription, setMyShortDescription) and redesigned the /help command to provide an excellent 'BotFather-style' onboarding UX.

- 2026-08-10: Fixed root cause of 'errors_generic' bug Â— session initial function was incorrectly calling createRedisSessionStorage().read() asynchronously; replaced with synchronous createInitialSessionData(). Fixed ESLint errors: no-explicit-any in client.ts (added PaginatedResponse<T> generic type) and react-hooks/purity in StaffDashboard.tsx (pre-computed Date.now()). Added HTTPS guard on setChatMenuButton to skip Web App button in local dev.

- 2026-08-10: Fixed cascading TypeScript errors caused by the PaginatedResponse generic type change. Reverted component-specific endpoint return types back to 'any' to satisfy rigid prop expectations in KycQueue, TopUpQueue, and StaffCompliancePanel.

- 2026-08-10: Completely rewrote the Telegram Bot's i18n translation middleware. The @grammyjs/i18n plugin strictly required Fluent (.ftl) files and was crashing/ignoring the existing JSON locales. I built a custom middleware that synchronously loads the JSON locales, injects ctx.t correctly, and safely falls back without throwing TypeError: t is not a function.

- 2026-08-10: Stripped all emojis from bot language JSON files (en.json, am.json). Replaced the text 'Y' logo in the Mini App's welcome and crash screens with the official Yekis SVG logo.

- 2026-08-12: Merged Profile Feature Phase 1 fixes. Added cached KYC tier/status, lifetime net earnings, and gross spend to the `User` schema. Upgraded the contract lifecycle to rely on a synchronous `ContractStatus` determined by all milestones reaching a terminal state.
- 2026-08-21: Implemented end-to-end multi-user integration test suite (`simulated-negotiations-and-disputes.test.ts`) validating complete marketplace lifecycles: competitive proposals, contract generation, wallet-first escrow funding, milestone delivery, and all dispute resolution paths (mutual settlement, evidence & staff mediation queue claiming, and AACCSA arbitration awards).


## Fayda eSignet & Spec Alignment Update

- **eSignet Integration**: Fully replaced the generic Fayda KYC with a spec-compliant eSignet OIDC/PAR flow utilizing JWS signature validation.
- **Compliance Auto-Hold**: Integrated TMS with the wallet to freeze withdrawals when high-risk AML flags are created.
- **Circumvention Counters**: Automatically suspends users who attempt to share contact info 3 times.
- **VAT Tracking**: Enabled VAT computation (15%) on platform margins.
- **Deliverable & Evidence Hashing**: Implemented SHA-256 cryptographic hashing on uploaded job deliverables and dispute evidence bundles.
- **Marketing Footer Alignment**: Refactored the 5-column grid layout, standardized 38px column title baselines with the brand logo, eliminated asymmetric brand column padding, normalized button/link vertical heights with flex alignment, and restored the bottom border divider.
- **Telegram Mini App Stability & Top-Up**: Routed Telebirr checkout through `Telegram.WebApp.openLink` to eliminate `ERR_UNKNOWN_URL_SCHEME` crashes, auto-settled sandbox mock top-ups, and restored MinIO container and `marketplace-dev` bucket to resolve universal `INTERNAL_ERROR` 500s across uploads and reads.
- **Mini App Space Management & Telebirr Dialog**: Removed the 3 onboarding badges per user feedback, gave the Mini App home screen generous header (38px) and footer (52px) breathing space, placed contents freely with comfortable 20px touch-friendly role cards and 48px icons, standardized the Telebirr commodity title to `Yekis Escrow - Top-up ETB {amount}`, and added an in-app Telebirr modal with instant sandbox simulation to bypass Ethio Telecom sandbox MSISDN limitations.
- **Desktop Auth Screen 100vh Fit & Redesigned Consents**:
  - Replaced the 4 sprawling vertical checkboxes with a compact single-line agreement and an expandable `Options ▾` disclosure for optional telemetry/marketing preferences, reducing vertical height by >110px.
  - Made Terms of Service & Privacy Policy clickable and expandable via in-page overlay modals, preventing page reload or lost input fields.
  - Removed top-right logo badge in auth card header per user request, keeping a distraction-free clean typography header.
  - Fixed login screen alignment collision: moved "Forgot your password?" up into the Password label row, eliminated negative margins on submit, and centered social login buttons without overlap.
  - Placed Phone and Date of Birth into a side-by-side 2-column grid and locked the desktop layout to `height: 100vh; overflow: hidden;` so users never need to scroll down/up to log in or register.

- **Cross-Section UI & Alignment Polish (Client, Freelancer, Wallet & Verification)**:
  - **Freelancer Workspace & Opportunities**: Added live search filtering for open briefs by title or keyword; replaced raw JSON milestones with styled milestone breakdown cards showing title, due date, and ETB amounts; added direct "Apply" button on job cards; added clean status badge indicators on freelancer proposals with responsive "Withdraw" actions.
  - **Client Workspace & Job Postings**: Enhanced client's published job cards to show full budget range (ETB min – max), category, deadline, and proposal count pill; styled incoming proposal rows with flex distribution, badged proposal statuses (Accepted, Rejected, Submitted), and non-overlapping action buttons (Shortlist, Accept, Reject).
  - **Client Job Brief Form**: Expanded the "Title" field to span 2 columns in the 3-column `form-grid`, eliminating the awkward blank grid slot next to Category; aligned the "Publish job" button with proper top margin and auto-width.
  - **Wallet Layout & Top-Up**: Initialized `showTopUp` to open automatically for Clients; updated `.payment-account` to horizontal flex alignment (`display: flex; align-items: center; gap: 16px;`) so Telebirr and CBE logos sit beside account details instead of awkward vertical stacking; transitioned `.browser-topup-fields` to 2-column grid with mobile single-column fallback; refined Instant Checkout into a centered, balanced container.
  - **Verification & KYC**: Set verification form and Tier 2 forms to balanced 2-column grids with full-width file dropzones, eliminating empty grid gaps.
  - **Landing Page Marketplace Roles**: Balanced "For clients" and "For freelancers" cards with `flex-direction: column; justify-content: space-between;` and bottom-pinned CTA buttons.
  - **Settings**: Added proper spacing and auto-width to the Sign Out button.
  - **Profile Edit Page Alignment Redesign**:
    - Replaced the unstyled `PublicProposersPrivate` inline text block with a 3-card responsive grid selector showing title and clear descriptions for Public, Clients Only, and Private visibility.
    - Fixed the displaced "Available for Work" checkbox by replacing it with a styled card featuring a modern iOS-style toggle slider on the right.
    - Formatted Additional Skills tags into interactive toggle pills with hover effects, active emerald styling (`var(--color-primary)`), and clean wrapping.
    - Organized the form into clean sections (Personal Details, Skills & Expertise, Preferences) divided by subtle borders.
    - Set the First Name and Last Name inputs into a balanced 2-column grid (`form-row-2col`).
- **Operations Workspace (Staff Dashboard) Layout Fix**:
  - Eliminated the broken side-by-side flex container (`.staff-dashboard-top-section`) that previously crammed `StaffCompliancePanel` into a 25% column alongside the 4 metric cards, causing search and filter dropdowns to clip and creating a window-wide horizontal scrollbar.
  - Converted the Overview page to a vertical stack (`.staff-overview-layout`):
    - **Top Row**: 4 metric cards (`.staff-metrics`) now span the full available width in an executive 4-column grid (`repeat(4, 1fr)`).
    - **Bottom Section**: `StaffCompliancePanel` (Transaction Monitoring & AML Queue) now occupies full width, giving `QueueControls` (search, status, flag type, refresh, pagination) ample room to display without clipping.
  - Implemented responsive two-pane grid styling for `.dispute-queue-container` (`360px minmax(0, 1fr)` on desktop, single column on smaller viewports) and styled `.staff-queue-card` and `.staff-queue-list`.
  - Added `overflow-x: hidden;` to `.staff-shell` and `.staff-main` to permanently prevent horizontal overflow.
- **Auth Screen Professional Visual Treatment**: Redesigned the left-panel auth visual with a professional, indicator-rich layout:
  - **3 Key Metrics Row**: Contracts signed (2,400+), escrow volume (ETB 12M+), payout success rate (98%) — separated by vertical dividers, staggered fade-in on load.
  - **Live Activity Feed**: 3 activity items (milestone delivered, contract signed, escrow funded) with colored status dots, descriptions, and relative timestamps — slide in sequentially.
  - **Trust Badges**: "Escrow protected", "KYC verified", "Telebirr & CBE" with inline SVG icons — anchored to the bottom right.
  - Background: subtle dot grid texture and a soft brand-green radial gradient glow. All elements use a single `authFadeUp` keyframe (one-shot, no looping).
- **Proper Google Login Button**: Restored the Google, Apple, and Facebook social sign-in buttons to a compact, single-row layout of small circular icons (`type: "icon"`, `shape: "circle"`) to save vertical space and maintain a clean login form aesthetic.
- **Chat System Fix & Role-Based Redesign**:
  - **Layout & Horizontal Clipping Fix**:
    - Resolved the horizontal clipping bug where `scrollIntoView()` scrolled the parent workspace container horizontally by ~180px, cutting off the left half of the sidebar (hiding "Messages", avatars, search box, and filter tabs).
    - Switched to container-scoped vertical scrolling (`messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight`), ensuring only the messages feed scrolls vertically without displacing parent elements.
    - Added `min-width: 0`, `overflow-x: hidden`, and adjusted grid columns (`290px minmax(0, 1fr)`) across `.chat-workspace`, `.chat-sidebar`, and `.chat-window`.
    - Removed the redundant `"Workspace Messages"` top toolbar header to give the chat workspace full vertical viewport height.
  - **Role-Aware Chat Experience (Client vs Freelancer)**:
    - Wired `role={platformRole as "CLIENT" | "FREELANCER"}` into `<ChatWorkspace>`.
    - Added role-specific sidebar subtitles ("Your project discussions" for Clients vs "Client conversations & proposals" for Freelancers).
    - Added role-tailored empty states for threads and no-active-chat screen.
    - Updated New Chat Modal: Clients see "Freelancer Email or User ID" with project brief placeholders, while Freelancers see "Client Email or User ID" with proposal placeholders.
    - Applied distinct color-coded badges to conversation threads: Blue for `CLIENT`, Emerald for `FREELANCER`, Purple for `SUPPORT`.
  - **Context-Aware Mini-Me AI Co-Pilot & Smart Replies**:
    - Overhauled backend `generateSmartReplies` in `chat.service.ts`:
      - For Support tickets: Suggests support-focused questions (wallet/payout help, contract queries, identity verification) for users, and staff greetings/escalation responses for staff. Completely eliminated out-of-place freelancer responses ("How can I help with your project?") when users contact Support.
      - For Direct conversations: Role-tailored replies for Clients (asking availability, requesting scope review, approving milestones) versus Freelancers (sharing availability, proposing timeline, confirming deliverables).
    - Contextualized composer placeholder: Shows "Describe your question or issue..." for Support vs milestone-specific prompts for direct negotiation.
    - Hid the "Extract Deal" button on official Support conversations (deal extraction is strictly scoped to client ↔ freelancer contract negotiation).
- **Admin Dashboard Accessibility, Authentication, and Support Chat Delivery**:
  - **Sidebar Scroll Accessibility**:
    - Fixed the inaccessible sidebar items when accordion groups (CASES, FINANCE, OPERATIONS, USERS, ADMINISTRATION) are expanded.
    - Updated `.staff-sidebar` with strict viewport containment (`overflow: hidden; max-height: 100vh; box-sizing: border-box`).
    - Configured `.staff-sidebar .sidebar-nav` with `flex: 1 1 0; min-height: 0; overflow-y: auto; overflow-x: hidden;` and slim custom scrollbars, allowing the navigation links to scroll independently while keeping the brand header and user profile fixed at top.
    - Added `flex-shrink: 0; margin-top: auto;` to `.sidebar-logout` so the "Sign out" button stays neatly accessible at the bottom of the sidebar.
  - **Admin Dashboard "Unauthenticated" & Login Rate Limit Lockouts**:
    - Identified that `adminRouter` in `admin.routes.ts` lacked `requireAuth` middleware, leaving `req.user` undefined and causing all admin endpoints (`/api/v1/admin/dashboard/summary`, `/api/v1/admin/audit-logs`, etc.) to reject with `401 {"error": "Unauthenticated"}`.
    - Mounted `adminRouter.use(requireAuth)` at the router level so `req.user` is reliably populated before permission checks execute.
    - Diagnosed the login `UNKNOWN_ERROR` as an HTTP 429 Too Many Requests response caused by background dashboard polling exceeding the legacy 300-request/15-minute limit.
    - Increased generic `/api` rate limiting in `app.ts` to 2,000 requests per 15-minute window in production (and 10,000 in development), configured structured JSON rate limit error payloads (`{ error: "TOO_MANY_REQUESTS", message: "..." }`), and added graceful 429 handling with non-JSON fallback in `client.ts`.
  - **Landing Page Floating Support Chat ("Need Help") Delivery**:
    - Resolved the issue where inquiries sent from the floating chat widget on the landing page failed to reach the support desk.
    - In `chat.service.ts`, expanded `pickAvailableStaff()` to select from all operational staff roles (`SUPPORT`, `ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `COMPLIANCE_OFFICER`).
    - Added the assigned staff member directly to conversation participants upon guest ticket creation, and wired `notifyStaffOfEvent` so in-app notifications and alerts are dispatched to all staff in real time.
    - Updated `getConversationAccess()` and `chat.routes.ts` so all staff roles can view, claim, and reply to open support tickets without being blocked by 403 Forbidden errors.
    - In `LandingPage.tsx`, updated the floating chat widget to persist `guestConversationId` in component state, enabling continuous conversation and follow-up messaging even after initial email submission.

## Operations Console v2 (added 2026-10-03)

The staff dashboard was rebuilt as a single console at `apps/frontend/src/pages/ops/`, replacing `StaffDashboard.tsx` and the eight `Admin*Page.tsx` files (nineteen components retired in total). `FullPlatformApp.tsx` mounts it for any account with a `staffRole`. This supersedes the earlier "Staff Dashboard Redesign" and related sections above, which described the previous arrangement.

**Entry point.** `if (user?.staffRole) return <OpsConsole user={user} onExit={logout} />;`

### Navigation and gating
- **Collapsible sidebar**: the 3-bar button in the sidebar brand row hides the sidebar for full-width tables and charts. The choice persists in `localStorage` (`yekis-ops-nav`). At <=860px the same button opens the overlay drawer instead, so the two layouts never conflict.
- Sidebar groups: **Overview** (Command Center) - **Cases** (Support Desk, Dispute Mediation, Risk and Fraud) - **Review Queues** (KYC Reviews, Profile Reports, Receipts) - **Financial** (Contracts, Payments, Payouts, Escrow, Reconciliation, Ledger, Reports) - **Administration** (Users, Staff and Roles, Audit Logs, System Health).
- Entries are filtered by `opsPerms.ts`, which fetches `GET /admin/permissions/matrix` and resolves the signed-in `staffRole` against it. The backend still enforces every route (`requirePermission` on `/admin/*`, `requireStaffRole` elsewhere) - the console only hides links a reviewer cannot open. A deep link into a forbidden page falls back to the first permitted page.
- Sidebar badges count open work per queue. The header also carries a working notifications popover (`GET /notifications`, mark-read via `POST /notifications/:id/read`) and the light/dark toggle.

### Finding things
Every table page searches and pages **on the server** (`page`, `limit`, `q`, plus endpoint filters) with a 350ms debounce, and the pager shows real totals. Two endpoints cannot do this honestly and say so in the UI: reconciliation applies its status filter client-side because the backend filters after pagination, and the audit log narrows the current page because that route has no text search and no date range.

### Command Center
1. **Stat cards** - total users, active contracts, funds in escrow, pending payouts, open disputes, pending KYC, support tickets, pending payments. No trend percentages or sparklines: the backend exposes aggregate totals only, with no time-series endpoint.
2. **Action Center** - ranks live work by severity: breached dispute SLAs, then critical/high risk flags, failing health checks, recon mismatches, pending payouts, KYC queue, profile reports. Each directive opens the relevant page with the record focused.
3. **Charts** - transaction volume by day, escrow by state, payouts vs refunds by week, review workload per queue. All dependency-free SVG. History charts are derived from the most recent 100 rows of the underlying list endpoints and the UI labels that window.
4. **Recent activity** - newest audit events from `dashboard/summary.recentActivity`.

### Review queues (hotkeys enabled)
- **KYC Reviews** (`/kyc/review-queue`): up/down to move, `A` to approve, `R` to focus the rejection reason. Documents open through a 300-second signed URL from `GET /kyc/documents/:id/url`; decision history from `GET /kyc/:userId/history`.
- **Dispute Mediation** (`/disputes/staff/queue`): SLA countdown per case, inline evidence thread, live fee-and-withholding split preview, and claim / add-evidence / escalate / send-to-arbitration alongside resolve.
- **Profile Reports** (`/staff/reports`): resolve as no-action / hide / ban, plus the featured-carousel refresh.
- **Receipts** (`/wallet/topups/queue`): approve, reject, or flag a manual transfer. Flagging raises a `STAFF_FLAGGED` transaction flag that then appears under Risk and Fraud.

### Carried over from the previous dashboard
Support inbox, receipt review, audit log browser, and Admins and Permissions - the last now rendering the **real** permission matrix from the backend instead of the invented one the old page displayed. Role changes accept "No console access" to demote an account. These surfaces use the console's own patterns: the two-pane `queue-wrap` / `q-card` / `queue-detail` layout (Support Desk mirrors KYC and Disputes), inline `expand-row` decisions (Receipts mirrors Payouts), and the `Kv` stat strip, `Empty`, `Banner` and `FilterSelect` primitives shared across every table page.

### Staff actions, and what each one hits
| Surface | Actions | Routes |
|---|---|---|
| Users | open profile, suspend, reinstate, force KYC re-review | `GET /admin/users/:id`, `POST /admin/users/:id/suspend`, `/unsuspend`, `/force-kyc-rereview` |
| KYC | view signed documents, decision history, verify / reject / request clearer | `GET /kyc/documents/:id/url`, `GET /kyc/:userId/history`, `POST /kyc/:userId/review` |
| Disputes | claim, add evidence, escalate stage, send to arbitration, resolve | `POST /disputes/:id/claim`, `/evidence`, `/escalate`, `/arbitration`, `/resolve` |
| Risk | inspect rule payload, file STR (optionally suspending the account), dismiss, lift hold | `POST /tms/:flagId/file-str`, `/dismiss`, `POST /tms/users/:userId/lift-hold` |
| Payouts | confirm / fail settlement with provider ref or failure reason | `POST /admin/payouts/:payoutId/settle` |
| Receipts | approve, reject, flag as suspicious | `POST /wallet/topups/:id/approve`, `/reject`, `/flag` |
| Staff | change role, remove console access | `POST /admin/staff/:userId/role` |
| Profile reports | no-action / hide / ban, refresh featured carousel | `PATCH /staff/reports/:id`, `POST /featured/staff/refresh` |
| Support | reply, attach files, close, reopen | `POST /chat/conversations/:id/messages`, `/chat/upload`, `PATCH /chat/admin/conversations/:id/status` |

Evidence is genuinely real: the viewer exchanges a `KycDocument` id for a 300-second signed URL and renders what the object store returns, and a milestone deliverable opens from its stored `deliverableUrl`. There are no mock documents anywhere in the console.

### Data layer
`opsApi.ts` is an adapter over the shared `api` client (Bearer auth, `/api/v1`, automatic refresh) - not a second HTTP client. The console was authored against a planned `/admin/*` surface that does not exist; the mapping table is documented in `apps/frontend/src/pages/ops/README.md`. Because the non-`/admin` staff surfaces use `requireStaffRole`, restricted roles receive 403 on parts of the overview aggregate, so `overview()` degrades section-by-section rather than failing the page.

### Accessibility
`--ops-text-3` is tertiary text (timestamps, table sub-labels, hints) used by 27 rules. Both themes are tuned to clear WCAG AA (>=4.5:1) against the panel *and* the tinted `--ops-primary-soft` row background: `#646e7b` in light, `#8492a6` in dark. An earlier light-mode value measured only 2.65:1 - legible on the dark theme, invisible on the light one.

### Fixed along the way
- `getProfileReports`, `resolveProfileReport`, and `refreshFeaturedCarousel` all pointed at routes that do not exist (404). Profile moderation and carousel refresh were silently dead; all three now hit their real endpoints.
- Contract and user detail load on demand rather than per-row, removing an N+1 request fan-out from those pages.
- List pages searched and filtered a fixed 100 rows in the browser, so anything outside that window was invisible and the pager never moved. Search, filters and paging now run on the server.
- Filter option lists had drifted from the API: escrow offered "PENDING" (rejected by `/admin/escrows`) and `M_PESA` was missing from every rail filter.
- Contracts "Export CSV" and Reports "Download" had no handler. Both emit real CSV of the rows on screen.


---

### Wallet & Payouts: Transaction Movements & Activity Details
- **Overview & Reconciliation**:
  - The "Wallet & Payouts" workspace tab now includes a comprehensive **Transaction Movement Details** section powered by `GET /api/v1/escrow/wallet/transactions`.
  - Aggregates verified double-entry journal entries from `LedgerAccount` (`2100-USER-${userId}`) and reconciles them with in-flight or manual top-up requests (`WalletTopUp`) and pending withdrawal payouts (`PayoutTransaction`).
- **Key Features**:
  1. **Financial KPIs**: Real-time totals for Total Inflow (ገቢ), Total Outflow (ወጪ), Pending Settlements, and Total Ledger Movements.
  2. **Multi-Rail Categorization & Filters**: Quick-filtering by All Movements, Money In, Money Out, Top-Ups, Payouts, and Escrow Operations, plus status dropdowns (`COMPLETED`, `PENDING`, `PROCESSING`, `FAILED`) and instant search across references, contract titles, counterparty names, and notes.
  3. **Voucher & Movement Detail Modal**: Clicking any transaction movement launches an inspection modal detailing Gross Amount, Platform Fee (7%), Net Settlement, Provider Rails (`TELEBIRR`, `CBE_BIRR`, `M_PESA`), Reference IDs (with 1-click clipboard copy), and counterparties.
  4. **Fiscal Receipt Integration**: Directly connected to `FiscalDocumentSheet` to generate official, bilingual (Amharic/English) AACCSA-compliant electronic receipts (`YKS-TX-...` / ደረሰኝ) with TIN and VAT breakdown.


---

### Escrow Funding And Release (Client to Freelancer)
- **Escrow-First Architecture**:
  - When a project milestone or gig order is paid by the client (`fundMilestoneFromWallet` / `fundGigOrderFromWallet`), funds are debited from the client's wallet and placed in **escrow**: the milestone or gig order transitions to `ESCROW_HELD`, and `releasedAt` stays null.
  - The freelancer is **not** credited at funding time. The money is released — and the freelancer credited — only when the client accepts the delivery, when the 7-day auto-release window expires, or when a staff member resolves a dispute.
  - The delivery/submission step, the 24-hour warning before auto-release, and the dispute window all apply exactly as they do on the external-payment path. The funding **source** never changes the lifecycle.
  - Sibling milestones are evaluated via `checkAndUpdateContractCompletion` so contracts advance to `COMPLETED` seamlessly once every milestone reaches a terminal state.
- **Double-Entry General Ledger Integrity**:
  - Funding posts the `ESCROW_FUND` journal (client wallet -> escrow pool) in the atomic database transaction. The matching `MILESTONE_RELEASE` journal (escrow pool -> freelancer wallet, less platform fee and withholding) is posted by the release path, not by funding, so the chart of accounts and the user's `2100-USER-${userId}` ledger accounts remain in balanced equilibrium.
- **Release Paths**:
  - `acceptMilestone` releases a `SUBMITTED_FOR_REVIEW` milestone on the client's explicit acceptance.
  - The auto-release worker releases a `SUBMITTED_FOR_REVIEW` milestone when the 7-day window expires, unless a dispute was raised first.
  - A staff dispute resolution releases from `DISPUTED`.
  - `ESCROW_HELD` and `WORK_IN_PROGRESS` are **not** release entry states: paying out from them would skip the delivery and the client's acceptance.


---

### Settings & Account Governance Workspace
- **Overview**:
  - Replaced the placeholder settings view with a full-fledged, 5-tab user settings workspace (`apps/frontend/src/SettingsWorkspace.tsx`) mounted in `FullPlatformApp.tsx`.
- **Security & Password Tab**:
  - Password change with Argon2id hash verification on backend (`POST /api/v1/auth/change-password`).
  - Strict strength validation: 8+ characters, uppercase, lowercase, numbers, and symbols.
  - Multi-session rotation option: "Sign out of all other devices" invalidates prior JWT refresh tokens by incrementing `sessionVersion` while minting fresh session credentials for the current client tab.
  - Active session monitoring and one-click remote session revocation (`POST /api/v1/auth/revoke-sessions`).
- **Preferences & Localization Tab**:
  - 4 languages supported: English (`en`), Amharic (`am`), Oromo (`om`), and Tigrinya (`ti`).
  - Live frontend i18n context switching with persistent backend profile sync (`PATCH /api/v1/users/me/profile` with `languagePreference`).
  - Timezone selector with East Africa Time (`Africa/Addis_Ababa`, UTC+3) as default.
  - Theme toggle (Dark / Light mode) with strict theme geometry parity.
- **Notifications Tab**:
  - Granular notification channels: Escrow and milestone releases, proposal submissions, direct chat messages, and security audit events.
  - Configurable in-app and SMS alert toggles.
- **Privacy & Marketplace Visibility Tab**:
  - Available for Work toggle (controls marketplace presence).
  - Directory visibility mode selector (Public, Proposers Only, Private).
- **Data Management & Danger Zone Tab**:
  - Personal Data Archive export (`GET /api/v1/users/me/export`) providing machine-readable JSON archive of user account, KYC records, transactions, wallet summary, notifications, and audit log events in compliance with data privacy regulations.
  - Session sign-out and regulatory retention disclosure (statutory 10-year financial retention under Ethiopian law).


---

### Alert Card Size & Roundness Refinement
- **Compact Layout & Sizing**:
  - Reduced vertical and horizontal padding from bulky `p-3.5` (14px) to compact `px-3 py-1.5` (6px top/bottom, 12px left/right).
  - Scaled status icon avatar down from `size-8` (32px) to `size-6` (24px) with `size-3.5` (14px) inner vector icons.
  - Overall alert card height reduced from ~60px to ~36px, producing a sleek, unobtrusive notification bar across all workspace workflows.
- **Architectural Corner Roundness**:
  - Decreased border-radius from bulbous `rounded-xl` (18px) to crisp, subtle `rounded-[6px]` (matching standard card and container geometry).
  - Avatar badge corners aligned to matching `rounded-[5px]`.
- **System-Wide Application**:
  - Applied across `apps/frontend/src/components/ui/alert.tsx`, `WorkflowWorkspace.tsx`, `SettingsWorkspace.tsx`, `BrowserWallet.tsx`, `ChatWorkspace.tsx`, `PhoneVerification.tsx`, and ops monitoring pages.
