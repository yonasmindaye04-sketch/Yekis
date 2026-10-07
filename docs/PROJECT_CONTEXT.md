# Project Context

> **Update 2026-10-05 (Landing V2 "How it works" rebuilt as stepper + product stage):** the `#how-it-works`
> section's pinned scroll board has been replaced. Rationale, in short:
> 1. **What was wrong.** The section was a `480svh` sticky board — four thumbtacked step cards on a ruled
>    sheet, three dash-masked connectors, three margin status notes, a scroll cue. It carried **eight**
>    accent hues (lime / teal / green / violet tints plus rose / blue / emerald / violet thumbtacks) and
>    three separate status pills, and it cost ~5 screens of scroll to say four sentences. Worse, the only
>    legible thing in it was the step copy; nothing showed the product.
> 2. **What it is now.** One grid module (`.esc-module`): a single centred slogan — *"Pay for **results**,
>    not promises."* — spanning the full width, then a four-step stepper beside a browser frame that holds
>    one **light, high-legibility product screen per step**: budget in escrow, the milestone list with
>    attached files, the delivery review with release actions and the auto-release meter, and the
>    resolution centre with its evidence timeline. The step copy is unchanged.
> 3. **Copy that was cut, on purpose.** The eyebrow ("How your payment is protected"), the old headline
>    ("Clear money. Clear evidence. Clear next steps."), the sub-paragraph, the "See how disputes get
>    resolved" FAQ link and the trust footnote are all gone — the slogan replaces them. Consequence to be
>    aware of: `EscrowSection` no longer takes `onNavigate`, and the FAQ cross-link from this section is
>    no longer there. Put one back if the FAQ funnel matters more than the single-slogan rule.
> 4. **One accent, not eight.** Neutral charcoal + white + a single brand green (`--esc-ac: #22c55e`,
>    `--esc-ac-deep: #16a34a`). Note this is the project's documented **brand emerald** pair — `#22c55e`
>    dark / `#16a34a` light — not the `--v2-primary` lime (`#d8f36b`) that the scroll bar, eyebrow and
>    footer CTA use. Both are established brand values here, so the section reads as deliberate; if the
>    lime/green contrast ever looks off-brand, `--esc-ac` is the single token to repoint.
> 5. **The dark frame is theme-invariant on purpose.** `.esc-stage` is charcoal and `.esc-app` is a light
>    screen in *both* themes. That is not a parity violation — the frame is a screenshot of the product,
>    and the light screen is exactly what keeps the section readable in dark mode (on paper, a dark frame
>    reads as an intentional device mockup). Only the stepper follows the theme, via the existing
>    `--v2-*` tokens. The block's single `:root[data-theme="light"]` rule reassigns one **colour**,
>    `--esc-ac` → `#15803d` so the numbers and the slogan hold up on paper.
> 6. **Scroll-driven animation → a 6.5s autoplay.** The board's whole reason for existing was scroll
>    choreography. The replacement is `useInView`-gated, `6.5s` per step, disabled under
>    `prefers-reduced-motion`, and paused on pointer-enter **or** focus-within so the progress bar under the
>    active step freezes in step with the timer (`.esc-module.is-paused` → `animation-play-state: paused`).
>    The section is now roughly one screen tall instead of five.
> 7. **Accessibility went up, not down.** `role="tablist"` / `tab` / `tabpanel` with `aria-selected`,
>    `aria-controls`, `aria-labelledby`, roving `tabIndex` and Arrow/Home/End keys. Inactive panels are
>    `inert`, which is what keeps their decorative buttons (e.g. "Approve & release $800") out of the tab
>    order — they are mockups of the product, not live controls.
> 8. **Stage height is a max, not a fit.** The four panels are stacked and absolutely positioned, so
>    `.esc-stage { min-height }` must clear the tallest one (`02 · Work`): `590px` desktop, `660px` under
>    `600px`. `560px` was the first guess and clipped `02 · Work` by 9px on desktop and 11px on mobile.
>    If a panel's copy grows, that number has to grow with it.
> 9. **Responsive keeps the copy.** `1040px` → stepper 2-up above the stage; `600px` → single column with a
>    tightened stepper (smaller number chip, tighter padding, `13px` body) rather than hiding the step
>    descriptions, which would have dropped the section's only real text on mobile.
> 10. **Verification.** `tsc -b` and `vite build` exit 0. Checked in headless Chrome against the
>     production build — all four screens at 1600 / 900 / 390px in both themes, no panel clipping and no
>     horizontal overflow. Note ESLint cannot be run repo-wide (its config references `no-unassigned-vars`,
>     absent from the installed plugin); this is pre-existing and unrelated.
>
Last updated: 2026-10-05

> **Update 2026-10-03 (Operations Console v2):** The staff dashboard was consolidated into a single console at `apps/frontend/src/pages/ops/` (shell + 18 pages + shared components + one scoped stylesheet), retiring `StaffDashboard.tsx` and eight `Admin*Page.tsx` components. It mounts from `FullPlatformApp.tsx` for any account carrying a `staffRole`. `opsApi.ts` adapts the console onto the existing backend rather than being a second API client (the console was authored against a planned `/admin/*` surface that does not exist); `opsPerms.ts` derives nav visibility from `GET /admin/permissions/matrix`. Support inbox, receipt review, audit log, admins and permissions, and profile moderation were carried over. Three API client methods that pointed at non-existent routes were corrected, list pages now search/filter/page server-side, and `--ops-text-3` was retuned in both themes to clear WCAG AA.
Last updated: 2026-10-03

> **Update 2026-10-03 (Support chat hardening plan):** `docs/SUPPORT_CHAT_PLAN.md` records a
> verified findings list and a five-stage plan for the native support chat: (1) security —
> rate-limit the public guest endpoint, strip `userId` from attachment keys, and fix the
> unauthenticated / publicly-cached attachment route; (2) first-response-time tracking as the
> core support metric; (3) staff-only internal notes; (4) CSAT; (5) audit completeness for
> chat actions. Priority/severity, SLA, macros and a knowledge base are explicitly deferred
> until there is real ticket volume to calibrate them against. A third-party agent inbox,
> microservices and the wider integration/data-warehouse stack were considered and rejected as
> disproportionate for a Node monolith at this stage.
>
> **Update 2026-10-05 (Marketing header: light-mode fix + Telegram button removed):**
> 1. The Light-Mode Header Bug: the marketing header was **invisible on `LandingPageV2` in light mode** — nav links, the "Sign in" ghost button, the "YEKIS" wordmark and the theme toggle all rendered white-on-cream. The light-mode override in `marketing.css` was scoped to `body:has(.landing-page)`, but `LandingPageV2` renders `<div className="yk-v2">`, not `.landing-page` — that class belongs to the older `LandingPage.tsx`. The selector never matched, so the header fell through to the unscrolled rule `color: #f7faf9` (white, intended for a dark hero). Added `body:has(.yk-v2)` to all three light-mode header rules. **This only ever affected `LandingPageV2`**; the older `LandingPage` light-mode header was already correct, which is why the bug survived. Note the header's white-text default is *correct* on the dark hero — only light mode was broken.
> 2. Telegram Button Removed: the `MessageCircle` link to `t.me/yekis_channel` that sat immediately before the theme toggle is gone from `MarketingHeader.tsx`, and the now-dead `.telegram-link` selectors were stripped from all header colour rules. The channel is still reachable from the footer social row and the floating support widget, so no route to Telegram was lost.
> 3. **Header Geometry Is Unchanged.** A size increase was applied in the same session and then fully reverted — it was never requested and made the header read oversized against the hero. The proportions that ship are the originals: 20px vertical padding (`--space-5`), 36px logo, 18px wordmark (`1.125rem`), 15px nav links (`0.9375rem`), `--space-1` nav gaps, 44px theme toggle, and the "Get started" button inheriting the shared `.btn-primary` treatment. `marketing.css` now has **no geometry diff** for the header — only the light-mode selector fix and the dead-selector cleanup.
> 4. Theme Parity Held: this change is colour/selectors only. The light-mode override changes `color` alone, and the header's geometry is identical in both themes by construction.
> 5. Verification: `npx vite build` exits 0. The light-mode result was **not** visually confirmed in a browser; the fix is a selector-match correction, and it should be re-checked in both themes and in both scrolled/unscrolled states since the header has four colour states in total.
>
> **Update 2026-10-05 (Landing V2 escrow board loosened to fill its area):**
> 1. What Was Wrong: the four pinned step cards were clamped to `clamp(240px, 23vw, 320px)` and positioned at `left` 22–58%, so on a wide viewport they clustered in the middle third of the `100svh` board and left both side margins dead. The three pinned status notes sat at `left` 5/6/76%, two of them jammed against the left edge.
> 2. Cards Now Fill the Area: width is `clamp(260px, 30vw, 460px)` — the cap scales with the viewport instead of pinning at 320px. Card internals were loosened to match the wider box: `.esc-card-body` padding `14px → 17px`, `.esc-tint` padding `18px → 22px`, `.esc-num` `2.6rem → 3rem`, `h3` `1.22rem → 1.3rem`, `p` `0.83rem → 0.88rem` with `line-height 1.55 → 1.6`.
> 3. Repositioned: `PIN_CARDS` moved to `left` 9 / 52 / 9 / 52 and `top` 9 / 22 / 50 / 64 (was 24 / 58 / 22 / 58 and 13 / 24 / 49 / 62), widening the spread in both axes. Card tilts were also toned down slightly (peak `rot` `7deg → 6deg`) so the larger cards read as a spread board rather than scattered debris.
> 4. `PIN_NOTES` moved to `left` 78 / 33 / 31 — "Balance locked" now anchors the top-right corner instead of sitting at 76%, and the two left notes moved into the open column between the card stacks.
> 5. Wires Were Repointed, Not Left Behind: `PIN_WIRES` are hand-authored cubic paths in the same 0–100 board space as the card coordinates, so they had to be re-authored to the new positions (endpoints moved from `46/58` to `32/50`). Leaving them would have left connectors pointing into empty space.
> 6. No Coordinate-Space Change Needed: cards/notes/wires are `position: absolute` with percentage `left`/`top`, and `.esc-pin` is `position: sticky` — already a containing block spanning the full stage. An extra `.esc-board` wrapper was prototyped and removed as unnecessary; the percentages already resolved against the correct origin.
> 7. Static Fallback Widened: the `≤900px` / reduced-motion static stack uses `width: min(500px, 100%)` (was `min(430px, 100%)`), since the cards themselves got larger.
> 8. Theme Parity Held: all of the above is un-themed geometry in the base rules. The only theme-conditional escrow rules remain the per-step accent and thumbtack **colours** at `landing-v2.css` (`.esc-card--1..4`, `.esc-note--1..3`), per the AGENTS.md parity rule.
> 9. Verification: `npx vite build` exits 0. The board is a scroll-driven `480svh` pinned stage, so its composition at intermediate scroll progress was **not** verified in a browser — the card/wire/overlap geometry in particular is tuned by eye and wants a look at 1440px and ~2560px before being called done.
>
> **Update 2026-10-05 (Landing V2 live-metrics section rebuilt):**
> 1. What Changed: `StatsSection` in `apps/frontend/src/LandingPageV2.tsx` and the `.v2-stats*` rules in `apps/frontend/src/landing-v2.css` were rebuilt from the supplied HTML reference. The old 4-up divided band (a `repeat(4, 1fr)` grid using a `gap: 1px` over `--v2-border` background as dividers, absolutely-positioned icons, a gradient underline wiping in on hover) is gone.
> 2. Skewed Cascade: four independent `.v2-stat-card`s sit on a wrapping flex row, each `skewY(-6deg)` with a `margin-top` cascade of `0 / 24 / 48 / 72px`. Hover un-skews to `0deg`, lifts `-20px` and scales `1.02`. `.v2-stat-inner` counter-skews by `calc(var(--skew) * -1)` so the tilted card does not tilt its own text.
> 3. Accents Are Tokenised, Not Hard-Coded: blue / purple / green / amber each drive the blurred orb, label, counter, divider rule, hover border and hover shadow through `--stat-accent*` custom properties. The reference hard-coded dark-only hex and a `#050507` page background; those became `color-mix()` over existing `--v2-*` tokens so both themes work.
> 4. Fills the Container: `.v2-container` is `width: 100%` with 6% gutters and has **no max-width** — `--v2-max: 1180px` is declared at `landing-v2.css:9` but never referenced. The first attempt pinned cards at `max-width: 17rem`, which made the row cluster in the centre and leave both gutters empty. Cards are now `flex: 1 1 auto` with `min-width: 16rem` and no max-width, so the row absorbs the available width.
> 5. Why `min-width` and Not `flex-basis: 0`: a `0` basis means the row can never wrap — all four cards stay on one line at any width and simply get crushed. `min-width` is the wrap trigger; the `auto` basis is what lets the cards grow to fill the row.
> 6. Proportional Scaling: `.v2-stat` is a `container-type: inline-size` container. The counter is `clamp(30px, 13cqi, 64px)` and card height is `clamp(13.5rem, 76cqi, 18rem)`, so a wider card gets a proportionally larger number instead of a small one stranded in whitespace. `76cqi` roughly preserves the reference's ~0.78 width-to-height proportion.
> 7. Backdrop: a violet→teal radial spotlight, a 60px square grid masked to a radial falloff, and SVG film grain, all behind a `z-index: 1` container.
> 8. Theme Parity Held: the four `:root[data-theme="light"]` overrides reassign **only** colour custom properties (`--stat-accent-text`, `--stat-accent-val`, `--stat-accent-edge`, `--stat-accent-shadow`). No geometry, per the AGENTS.md parity rule. Light mode gets darker accents because the reference's 300-weight pastels wash out on paper.
> 9. Responsive: `1024px` goes 2-up with the cascade flattened to alternate-row offsets; `600px` goes single-column and un-skews (`--skew: 0deg`), since a tilted full-width card reads as a bug rather than a flourish.
> 10. Unchanged: the four figures are still hardcoded literals in `STAT_CARDS` (not fetched from an API), and the existing `CountUp` animator — including its `prefers-reduced-motion` short-circuit — is reused as-is. Note that the global reduced-motion block kills `transition-duration` but does not neutralise the skew, so cards stay statically tilted and jump instantly on hover; a stats-specific override was not added.
> 11. Verification: `npx vite build` exits 0. ESLint could not be run — it is broken repo-wide (`config` references `no-unassigned-vars`, absent from the installed `@humanwhocodes/config-array` plugin), unrelated to this change. The visual result was not inspected in a browser.
>
> **Update 2026-10-03 (Customer support is now 100% native — Chatwoot reverted):**
> 1. Why Chatwoot went: the bridge built earlier today worked, but it was the wrong shape. Chatwoot delivers webhooks through an `ssrf_filter` that rejects every private/loopback address with no override, so agent replies were undeliverable locally and would have needed a public ingress in production. It also meant a second inbox, a second message store, a second UI beside the staff dashboard's existing queue, a third-party bubble that cannot be styled to match the design system, and a ~3 GB container stack — all to obtain capabilities the platform already had.
> 2. What was actually missing: **scoped guest access**. `POST /api/v1/chat/guest` is public, but reading and replying sat behind `requireAuth`, so a visitor could raise a ticket and then received `401` on every read and every follow-up. Staff replies were written to the database that the visitor never saw. That single gap is why the widget felt bolted on.
> 3. The fix: `POST /api/v1/chat/guest` now returns a signed `accessToken` carrying `typ: "guest_support"` and one `conversationId` — no refresh token, no role/staff claims, 12h TTL, so it is not a login token. `requireGuestChatAccess` pins it to that single thread and returns `403 TOKEN_SCOPE_MISMATCH` for anything else. The WebSocket accepts it and forces `isStaff` off, so replies arrive live.
> 4. Frontend: `LandingSupportChat` now keeps that token, opens its own socket instance (the app-wide singleton belongs to the logged-in session), and re-reads the authoritative thread so staff replies render on the correct side, with a 5s poll as fallback. `components/supportChatEvents.ts` lets the footer open the one native widget instead of mounting a second copy.
> 5. Duplicate icon fixed: the landing page was rendering both the native bubble and the third-party bubble. Only the native one remains; Settings "Chat with Support" opens the chat workspace and the footer link opens the widget.
> 6. Removed: widget component + SDK bridge, Application API client, bridge service, webhook receiver, signature helpers, `docker-compose.chatwoot.yml`, `.env.chatwoot.example`, the `chatwoot:*` scripts, every `CHATWOOT_*` env var, and the containers/volumes. `Conversation.channel` and the `chatwoot*` columns are dropped by `20261003140000_drop_chatwoot_bridge_columns`; `ChatMessage.origin`/`externalId` stay as generic markers.
> 7. Net result: one chat system, one UI, no tunnel, no extra infrastructure, and support conversations that are actually two-way.
>
> **Update 2026-10-03 (Landing V2 "Ready to start?" CTA + Footer Redesign):**
> 1. One Continuous Bottom Outro: `FinalCTASection` and `FooterV2` in `apps/frontend/src/LandingPageV2.tsx` were rebuilt from the supplied HTML reference into a single visual band — a full-bleed spotlight CTA panel, a rounded "lip" divider, and a footer area hosting a frosted glass card with a giant masked "Yekis" wordmark behind it.
> 2. Pointer-Tracked Spotlight: the CTA panel's lime spotlight follows the cursor via the `--mouse-x` / `--mouse-y` custom properties. Both are written straight to the DOM inside a `pointermove` listener (no React state, no re-render) and recentre on `pointerleave`. Layered behind it: a breathing ambient orb, two drifting colour blobs, an SVG-noise film, and two floating outline glyphs.
> 3. Faithful to the Reference, Native to the Codebase: layout, radii, spacing, typography scale and the button treatment follow the reference, but every colour resolves from a new `--v2-out-*` token family instead of hard-coded hex, and the CTA buttons moved onto dedicated `.v2-outro-btn*` classes so the shared `.v2-btn` system used by the hero is untouched.
> 4. One Motion System, Not Two: the reference's own motion was adopted rather than reimplemented on top of framer-motion. CTA content plays a CSS keyframe (`v2-out-content`, `900ms cubic-bezier(.16,1,.3,1) both`); the footer card and giant wordmark are revealed by a single `IntersectionObserver` that flips `.is-visible` (with an immediate-reveal fallback under `prefers-reduced-motion` or when `IntersectionObserver` is unavailable); button hover/press and the social-icon hover are pure CSS. The `Reveal` component still drives every other section of the page, and the now-dead `Magnetic` / `Stagger` helpers were deleted.
> 5. Sized Up From the Reference: the reference's 1000px card at 12.5px type read too small against the page's other sections. The card is now `min(1320px, 100% - 12%)` with `64px 68px 56px` padding and a 34px radius; nav links 15px, headings 14px, brand 20px, description 15px, social icons 22px, bottom row 12.5px, wordmark `clamp(150px, 22vw, 320px)`, CTA panel `380px` with `52px` buttons.
> 6. Giant Wordmark Fixed (It Was Genuinely Invisible): the reference colour `#151b17` on the `#070907` panel measured **1.14:1 contrast** — the wordmark was effectively not rendered at all. It is now a sage `#4e6553` in dark (**3.15:1**) and `#7d9464` in light (**3.09:1**), with the mask ramp reshaped so the top of the glyphs lands solid instead of already faded. On top of that it now **pops on scroll** via the `v2-out-word-pop` keyframe (`1250ms cubic-bezier(.16,1,.3,1) both`): `translateY(104px) scale(.84)` → overshoot `translateY(-14px) scale(1.045)` → settle, `transform-origin: 50% 100%`. Measured live over CDP: scale `.84 → .89 → .98 → 1.02 → 1.045 → 1`.
> 7. Two Triggers, Not One: the wordmark has its own `IntersectionObserver` (`threshold: .3`). The card is much taller than the wordmark, so sharing the card's observer (`threshold: .12`) fired the pop while the wordmark was still below the fold — the animation was never seen. `.v2-footer-area` also gained `padding-bottom: clamp(72px, 14vh, 180px)`, because the wordmark's box previously ended exactly at the document bottom, so even at maximum scroll only its top ~80px was on screen. A scroll-*scrubbed* variant (`--word-p` written by a rAF loop) was prototyped and rejected: the document ends directly below the wordmark, so a scrub can never reach its end value and the word would sit permanently part-faded.
> 8. Theme Parity by Construction: every colour resolves from a `--v2-out-*` token declared once per theme block (dark default + `:root[data-theme="light"]`). Light mode gets a paper treatment — `#dcecc0 → #ffffff` panel stops, olive `#5e7f16` accents, white glass card — with byte-identical geometry, per the AGENTS.md parity rule. A single `--v2-out-flip` (`0`/`1`) drives the drifting-blob alphas. A shared `--v2-font-mono` token was added so the kicker stops hard-coding a family.
> 9. Content Preserved: navigation still routes through the `onNavigate` contract, the escrow trust note and `EN / አማ` affordance survive, and the JSON-LD `Organization` block is unchanged. Social links are now **TikTok, Telegram, Instagram and Facebook** as inline brand SVGs — Telegram points at the existing `t.me/yekis_channel`; the other three are `href="#"` placeholders pending real profile URLs.
> 10. Latent Bug Fixed: `MobileCTA`'s hide-on-footer observer targeted `.landing-footer`, which the V2 home page does not use — `querySelector` returned `null`, the effect bailed, and the sticky mobile bar never hid. The selector now covers `.v2-footer-area` and `.landing-footer`.
> 11. Scope and Cleanup: this covers the **home page only** — `MarketingFooter.tsx` (non-home marketing pages) is unchanged. Dead `.v2-cta-card`, `.v2-footer-grid`, `.v2-footer-col*`, `.v2-footer-copy`, `.v2-footer-bottom` CSS, five orphaned breakpoint entries, and the now-unused `Magnetic` / `Stagger` motion helpers were removed. `vite build` exits 0 and `tsc -b` is clean for every file this change touches. Note: `tsc -b` currently reports two **pre-existing, unrelated** `TS6133` errors for `ChatwootWidget` / `openChatwootSupport` in `FullPlatformApp.tsx` (dead imports from the in-progress Chatwoot integration) which will block `pnpm --filter frontend build` until addressed.

> **Update 2026-10-03 (Chatwoot Support Bridge — Completed Backend Integration):**
> 1. What Actually Landed Before: the 2026-10-02 entry below described a *widget embed only*. There was no Chatwoot REST client, no webhook receiver, no column anywhere to store a Chatwoot conversation id, and no bridge between the two systems — the widget talked to Chatwoot while `ChatWorkspace` talked to our own database, with zero shared state. With no tokens configured it was entirely inert.
> 2. Division of Labour: Chatwoot is a support-inbox product (contact ↔ agent) and cannot model participant chat. It now backs **support tickets only**; peer-to-peer marketplace chat (client ↔ freelancer, typing indicators, read receipts, attachments) stays on the internal WebSocket engine. Nothing that worked before regresses.
> 3. Two-Way Bridge: `modules/chat/chatwoot.client.ts` (Application API client) plus `modules/chat/chatwoot.service.ts` (orchestration). A support conversation is lazily linked to a Chatwoot conversation on first message; outbound messages and status changes are mirrored out, and inbound agent replies are ingested back as internal `ChatMessage` rows and broadcast live.
> 4. Verified Webhook Receiver: `POST /api/v1/webhooks/chatwoot`, mounted **before** `express.json()` because Chatwoot signs the exact received bytes. Verifies `X-Chatwoot-Signature` (`sha256=` + HMAC-SHA256 over `{timestamp}.{raw_body}`) in constant time and rejects deliveries older than 5 minutes as replays. 14 unit tests in `tests/chatwoot-bridge.test.ts` compute expected signatures independently of the implementation.
> 5. Persistence & Idempotency: migration `20261003120000_chatwoot_support_bridge` adds `Conversation.channel`, `chatwootConversationId` (unique), `chatwootContactId`, `chatwootInboxId`, plus `ChatMessage.origin` and `ChatMessage.externalId` (unique). Purely additive. Inbound deliveries dedupe on `externalId` because Chatwoot retries until it receives a 2xx.
> 6. Blast Radius Contained by Design: outbound pushes are fire-and-forget and logged, so a Chatwoot outage cannot fail or delay an internal chat write. Only agent-authored non-private messages are ingested. Private notes never reach users; incoming messages are ignored because we already hold them.
> 7. Configuration Is All-or-Nothing: `CHATWOOT_BASE_URL` enables the bridge, and the backend **refuses to boot** unless the token, account id, inbox id, webhook secret and HMAC key are all present — a half-configured bridge would silently swallow support replies. Left unset, the bridge is completely inert. Blank env values count as absent so a `.env` copied from `.env.example` still boots.
> 8. Pre-existing WebSocket IDOR Fixed: client-requested channel subscriptions had **no authorization check**, letting any authenticated user subscribe to `conversation:<any-id>` and receive another user's messages, typing state and read receipts in real time. Subscribe/typing/read are now verified against conversation membership, private channels are no longer client-requestable, and a DB error during the check fails closed.
> 9. Widget Defects Fixed: the identity effect omitted `fetchedHash` from its dependencies so the anti-impersonation hash was usually never sent; the component waited on a `chatwoot:ready` event nothing dispatches; global settings were spread after the computed values (stale object could override the theme); and the widget mounted on three shells at once, injecting the SDK three times. The fetched hash is now keyed by user id.
> 10. Infrastructure: `docker-compose.chatwoot.yml` now has no insecure default secrets (it previously shipped a known `SECRET_KEY_BASE` and database password), uses the `pgvector/pgvector:pg16` image Chatwoot v3.16 actually requires, drops the obsolete `version` key, and is accompanied by the `.env.chatwoot.example` its own header told you to copy.
>
> **Update 2026-10-02 (Social Auth: Telegram Integration, Facebook Purge, and Google Icon Fix):**
> 1. Facebook Deprecated & Replaced with Telegram: Completely removed Facebook OAuth from `SocialSignInButtons.tsx` and replaced it with native Telegram authentication, leveraging Yekis's established Telegram bot infrastructure (`@ye_kis_bot`).
> 2. Dual Telegram Cryptographic Verification: Updated `telegram.service.ts` and `auth.routes.ts` to support both Telegram MiniApp `initData` and browser-based Telegram Login Widget payload verification.
> 3. Google Sign-In Icon & Visual Reliability: Fixed the issue where Google Sign-In appeared blank/invisible. Replaced with an always-visible 36px circular button with the official 4-color Google "G" SVG icon, overlaid with the Google GIS iframe and fallback prompt handler.
> 4. Role-Aware Social Registration: Updated Google and Telegram auth endpoints to accept the selected registration `role` (`CLIENT` or `FREELANCER`) so new users signing up via social providers are provisioned with their intended role.
>
> **Update 2026-10-02 (Chatwoot Real-Time Customer Support Integration — SUPERSEDED, see 2026-10-03 above):**
> 1. Customer Support Architecture: Integrated Chatwoot as Yekis's dedicated real-time customer support platform. Yekis preserves its internal PostgreSQL/WebSocket `ChatWorkspace` for freelancer-client contracts, while Chatwoot handles customer support tickets, pre-sales questions, and dispute assistance.
> 2. React SDK & Dynamic Identity Widget: Built `components/ChatwootWidget.tsx` delivering non-blocking script injection, dynamic light/dark theme synchronization (`setColorScheme`), and automated user profile synchronization (email, name, role, KYC tier, wallet balance). Added session reset on logout to safeguard user privacy.
> 3. Backend Anti-Impersonation HMAC Verification: Configured `CHATWOOT_INBOX_HMAC_KEY` in `env.ts`, created `lib/chatwoot.ts` for computing HMAC-SHA256 user signatures, and added `GET /api/v1/chat/support/chatwoot-identity` so the client widget auto-verifies logged-in users with Chatwoot.
> 4. Omnichannel Triggers: Wired `MarketingFooter.tsx` ("Contact Support") and the user Settings panel to trigger `openChatwootSupport()` with progressive email fallback.
> 5. Self-Hosting Stack: Authored `docker-compose.chatwoot.yml` for running Chatwoot web, worker (Sidekiq), PostgreSQL, and Redis locally or on Ethiopian cloud servers.
>
> ⚠️ **Scope note:** items 3–5 above are accurate as written, but this pass delivered only the *widget*. There was no Chatwoot API client, webhook receiver, or shared state with the internal chat store, so nothing actually reached an agent inbox. The 2026-10-03 entry records the backend bridge that completes it, plus the widget and security defects found along the way.
>
> **Update 2026-09-08 (Admin Dashboard Accessibility, Authentication, and Support Chat Delivery):**
> 1. Staff Sidebar Scroll Accessibility: Resolved the issue where lower menu options (Audit Logs, Admins & Permissions, Sign out) became inaccessible when accordion groups expand. Updated `.staff-sidebar` with strict viewport containment and `.staff-sidebar .sidebar-nav` with `flex: 1 1 0; min-height: 0; overflow-y: auto;` with slim custom scrollbars and a pinned bottom sign-out button.
> 2. Admin Router Authentication Fix: Resolved the `401 {"error": "Unauthenticated"}` error across the Admin Overview and operations features by mounting `adminRouter.use(requireAuth)` at the router level in `admin.routes.ts`, reliably populating `req.user` for all permission checks.
> 3. Polling-Resilient Rate Limiting: Fixed login `UNKNOWN_ERROR` lockouts caused by background dashboard polling exceeding the legacy 300-request/15-minute rate limit. Increased general API limits in `app.ts` to 2,000 req/15m in production and 10,000 in development, added structured JSON error payloads, and enhanced `client.ts` to handle 429 gracefully with clear feedback.
> 4. Support Desk Delivery & Multi-Staff Routing: Fixed landing page floating chat inquiries failing to reach support agents. In `chat.service.ts` and `chat.routes.ts`, expanded auto-assignment to all active staff roles (`SUPPORT`, `ADMIN`, `SUPER_ADMIN`, `OPERATIONS_ADMIN`), registered assigned staff as conversation participants, wired real-time fan-out notifications via `notifyStaffOfEvent("SUPPORT_REQUEST_CREATED")`, and updated `LandingPage.tsx` to maintain conversation sessions for continuous follow-up messages.
>
> **Update 2026-09-05 (Late Afternoon - CBE & Safaricom M-Pesa Integration + Manual Verification Fallback):**
> 1. Multi-Rail Payments Expansion: Added **Commercial Bank of Ethiopia (CBE / CBE Birr)** and **Safaricom M-Pesa (Ethiopia)** alongside Telebirr across Instant Checkout, Manual Transfers, and Freelancer Wallet Withdrawals.
> 2. Safaricom M-Pesa Payment Client: Built `mpesa.client.ts` implementing the `PaymentProviderClient` interface with B2C disbursement simulation, transaction reference generation, and registered under `PROVIDER_CLIENTS` in `escrow.service.ts`.
> 3. Zero-Dead-End Manual Verification Fallback: Eliminated user dead-ends when automated gateway APIs are unreachable or experience latency:
>    - *Checkout Initiation Fallback:* If automated checkout fails, clients receive an actionable fallback card offering a 1-click transition to Manual Transfer with amount and provider pre-filled.
>    - *Receipt Attachment on Stalled Requests:* Implemented `POST /api/v1/wallet/topups/:topUpId/attach-receipt` allowing users to upload bank/mobile money receipts to existing `CHECKOUT_PENDING` requests, automatically promoting them to `PENDING` manual review.
> 4. Operations Queue Enhancements: Updated `TopUpQueue.tsx` with color-coded provider badges (Telebirr blue, CBE purple, M-Pesa emerald) and destination account indicators (`0910 011 818`, `1000 223 344`, `0777 011 818 / Till 882199`) for fast staff verification.
> 5. Unified Frontend & Mobile Experience: Updated both `BrowserWallet.tsx` (Desktop Web) and `App.tsx` (Mobile & Telegram Mini App) with 3-way provider selectors, 1-click account copying, and inline receipt attachment modals.
>
> **Update 2026-09-05 (Afternoon - Chat Attachment Persistence & Support Desk Visibility Fix):**
> 1. Persistent Storage & Streaming Endpoints: Built `uploadChatAttachment` and `getChatAttachmentStream` in `objectStore.ts`, integrated `POST /api/v1/chat/upload` (Multer memoryStorage 15MB limit) and `GET /api/v1/chat/attachments/:key(*)` into `chat.routes.ts`, routing files to MinIO object store with local filesystem fallback under `uploads/chat-attachments/`.
> 2. Resolved Client Attachment Bug: Fixed `ChatWorkspace.tsx` which previously generated temporary browser-scoped `blob:` URLs that could not be accessed by other users. File attachments are now uploaded to the backend first, returning a permanent streaming endpoint URL stored in the message's `attachmentUrl`.
> 3. Support Desk Attachment Rendering: Updated `StaffDashboard.tsx` to inspect `message.attachmentUrl` and display rich previews: inline responsive image previews for images, and styled download chips with `FileText` and `ExternalLink` for other documents/archives.
> 4. Support Desk Reply Attachments: Empowered support staff to attach documents/images in reply messages, with file selection tags, deletion controls, and async upload handling.
>
> **Update 2026-09-05 (Morning - Operations Workspace Layout Fix & Auth Polish):**
> 1. Operations Workspace Overview Layout Fix: Resolved the horizontal clipping and window scrollbar issue caused by `.staff-dashboard-top-section` forcing `StaffCompliancePanel` side-by-side into a 25% column next to the 4 metric cards. Re-architected with `.staff-overview-layout` so the 4 metric cards (`.staff-metrics`) span the full width at the top, and `StaffCompliancePanel` sits full-width underneath with responsive two-column grid (`.dispute-queue-container`). Added `overflow-x: hidden;` to `.staff-shell` and `.staff-main`.
> 2. Compact Social Sign-in: Maintained a single-row layout of circular icons for Google, Apple, and Facebook to preserve vertical viewport space on the login and registration forms.
> 2. Layout & Horizontal Clipping Fix: Eliminated the horizontal displacement bug where `scrollIntoView()` scrolled the parent workspace container horizontally, pushing the left half of the chat sidebar off-screen. Replaced with container-scoped vertical scrolling (`scrollTop = scrollHeight`), and added `min-width: 0` and `overflow-x: hidden` with adjusted grid layout (`290px minmax(0, 1fr)`). Removed redundant outer toolbar header for full-height chat workspace.
> 3. Role-Based Chat Workflow: Passed `role={platformRole}` to `ChatWorkspace`, displaying role-specific subtitles ("Your project discussions" vs "Client conversations & proposals"), role-aware empty thread states, role-aware New Chat Modal (Client sees "Freelancer Email/ID"; Freelancer sees "Client Email/ID"), and distinct role badge colors (Blue for Client, Emerald for Freelancer, Purple for Support).
> 4. Support vs Direct Scoping & Smart Replies: Overhauled backend `generateSmartReplies` in `chat.service.ts` to be conversation-type and role aware. When chatting with Support, suggested replies are support-focused (wallet deposits, milestone questions, KYC verification) instead of out-of-context freelancer proposals. In direct conversations, clients receive project discussion prompts while freelancers receive proposal and timeline prompts. Hid "Extract Deal" on Support tickets so it only shows during client ↔ freelancer contract negotiations.
>
> **Update 2026-09-04 (Late Evening):** Auth Header Cleanup, Login Form Collision Fix, and Comprehensive Section Alignment Polish:
> 1. Auth Card Header Logo Removal: Removed the top-right logo pill container in the auth card per user request, preserving clean typographic hierarchy.
> 2. Login Page Collision Fix: Fixed collision where negative margins pulled the "Forgot your password?" button into the green submit button; repositioned "Forgot your password?" inline with the Password label row and centered social login buttons with clean spacing.
> 3. Client & Freelancer Workspace Alignment Polish:
>    - Client Jobs & Proposals: Displayed budget range (ETB min – max), category, deadline, and proposal count pill on client job cards; formatted proposal rows with status pills and non-overlapping action buttons (Shortlist, Accept, Reject).
>    - Client Job Brief Form: Spanned Title input across 2 columns in the 3-column form grid to eliminate the blank slot beside Category, and aligned the Publish button with proper top margin.
>    - Freelancer Opportunities & Proposals: Added real-time search filtering on open briefs; replaced raw milestone JSON with styled breakdown cards; added direct Apply button; formatted freelancer proposals with clear status badges and aligned Withdraw buttons.
> 4. Wallet & Verification Layout Refinement:
>    - Automatically defaulted `showTopUp` to true for Clients so deposit options are immediately visible.
>    - Refactored `.payment-account` to horizontal flex alignment (`display: flex; align-items: center; gap: 16px;`) so Telebirr and CBE logos sit beside account details instead of awkwardly stacking vertically.
>    - Set `.browser-topup-fields` and verification forms to clean 2-column grids with mobile single-column responsiveness.
> 5. Landing Page Role Cards Alignment: Balanced "For clients" and "For freelancers" cards with `flex-direction: column; justify-content: space-between;` and bottom-pinned CTA buttons.
> 6. Profile Edit Page Alignment & Layout Redesign: Replaced smashed `PublicProposersPrivate` inline text with a 3-card visibility selector with titles and descriptions; replaced displaced raw checkbox with an iOS-style toggle slider card for "Available for Work"; styled Additional Skills tags with interactive toggle pills and active emerald highlights; organized inputs into personal details, skills, and preferences sections with 2-column grid alignment and a completeness progress bar.
>
> **Update 2026-09-04 (Evening):** Real-time WebSocket Messaging & "Mini-Me" AI Negotiation Co-Pilot:
> 1. Real-Time WebSocket Infrastructure (`/api/v1/ws`): Replaced latency-heavy 5-second polling with event-driven bidirectional WebSockets supporting thread subscriptions (`conversation:<id>`), private user alerts (`user:<id>`), typing pulse (`chat:typing`), read receipts (`chat:read`), and instant message delivery (`chat:message`).
> 2. Direct 2-Party Negotiation Channels (`POST /api/v1/chat/direct`): Enabled direct client ↔ freelancer project negotiation threads alongside official support tickets, with participant metadata, role badges, online indicators, and unread counters.
> 3. "Mini-Me" AI Co-Pilot Capabilities:
>    - Contextual Smart Replies: In-composer quick reply pills dynamically suggested from conversation context (`POST /api/v1/chat/conversations/:id/assistant/suggest-replies`).
>    - Thread Summary & Digest: Generates structured summaries with topic breakdown, agreed deliverable bullet points, detected timeline, and agreed budget in ETB (`POST /api/v1/chat/conversations/:id/assistant/summarize`).
>    - 1-Click Deal Terms Extractor: Synthesizes negotiation dialog into escrow-ready milestone proposal cards with confidence rating and direct contract creation link (`POST /api/v1/chat/conversations/:id/assistant/extract-deal`).
> 4. In-Composer Anti-Circumvention Protection: Real-time regex scan detects off-platform contact leaks (phone numbers, Telegram handles, external emails, wire requests) with an inline escrow safety advisory protecting users before sending.
> 5. Responsive 2-Column Chat Workspace: Created `ChatWorkspace.tsx` and `ChatWorkspace.css` mounted seamlessly in `FullPlatformApp.tsx`, featuring sidebar thread search, filter tabs (All / Direct / Support), attachment support, and smooth mobile breakpoint navigation.
>
> **Update 2026-09-04 (Afternoon):** Auth Screen Redesign & Single-Page Viewport Optimization:
> 1. Redesigned Cookies & Privacy Consents: eliminated the 4 sprawling vertical checkboxes by introducing a compact single-line required agreement with an expandable `Options ▾` disclosure for optional telemetry/marketing preferences, reducing vertical footprint by over 110px.
> 2. Interactive In-Page Legal Overlays: replaced disruptive external navigation with dedicated in-page modal dialogs for Terms of Service and Privacy Policy, enabling users to read, inspect, and accept terms without losing filled registration inputs.
> 3. Enriched Brand Logo & Balanced Right Column: enlarged the auth panel header logo badge to 48px with a branded pill badge and expanded the auth card width to 490px, beautifully filling the empty horizontal space.
> 4. Guaranteed 100vh Single-Screen Experience: set `.platform-auth` to `height: 100vh; overflow: hidden;` and placed Phone + Date of Birth in a responsive 2-column grid, completely eliminating scrollbars so users never need to scroll down/up to log in or register.
>
> **Update 2026-09-04:** Hardened Local Infrastructure Resilience & Startup Health Checks:
> 1. Configured `restart: unless-stopped` across PostgreSQL (`yekis-postgres-1`), Redis (`yekis-redis-1`), and MinIO (`yekis-minio-1`) in [docker-compose.yml](file:///c:/Users/Za/Desktop/project/Yekis/docker-compose.yml), ensuring Docker preserves running database and storage containers across system reboots and Docker Desktop restarts.
> 2. Added eager `prisma.$connect()` database connectivity verification during server boot in [server.ts](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/src/server.ts), logging an explicit error and guidance if PostgreSQL is unreachable before user requests are processed.
> 3. Added convenience scripts `pnpm infra:up` and `pnpm infra:down` as well as automatic `predev` hooks in root [package.json](file:///c:/Users/Za/Desktop/project/Yekis/package.json) and [apps/backend/package.json](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/package.json), ensuring Docker containers are automatically booted whenever `pnpm dev` is run.
> 4. Fixed Telebirr checkout HTTP 400 parameter mismatch error (`49401024995:Parameter:.biz_content.title type mismatch`) in [telebirr.client.ts](file:///c:/Users/Za/Desktop/project/Yekis/apps/backend/src/modules/escrow/providers/telebirr.client.ts) by sanitizing `title` to strip characters forbidden by Telebirr's regex pattern (including hyphens `-` in `Top-up`), and wired dynamic `redirect_url` in the preOrder payload to return to the active application upon payment completion/exit.
>
> **Update 2026-09-04 (Night):** Refined Telegram Mini App UX and Telebirr Checkout:
> 1. Removed the 3 temporary trust badges from the onboarding screen per user feedback.
> 2. Restructured the Telegram Mini App welcome screen with generous header (38px) and footer (52px) breathing space, expanded touch targets (20px 18px role cards, 48px icon containers, 12px 14px tab buttons), and relaxed typographic line-height (1.5-1.55) for a natural, native-feeling mobile experience.
> 3. Standardized Telebirr commodity naming: replaced raw internal database IDs with clean human-readable title `Yekis Escrow - Top-up ETB {amount}` across pre-order payloads.
> 4. Resolved Telebirr Developer Sandbox `Failed to query the consumer in Digital Payment system based on the input value` barrier: added sandbox guidance notes and an in-app checkout pop-up with a one-touch `Simulate Instant Payment (Sandbox)` bypass endpoint (`POST /api/v1/wallet/topups/checkout/:topUpId/simulate-success`) for seamless local development and testing without needing Ethio Telecom test MSISDNs.
> **Update 2026-09-03 (Night):** Resolved Telegram Mini App operational issues:
> 1. Fixed Telebirr checkout redirect inside Telegram Mini App by routing through `Telegram.WebApp.openLink(redirectUrl)` instead of `window.location.href`, preventing Android/iOS WebView navigation failure (`net::ERR_UNKNOWN_URL_SCHEME`). Added auto-settlement for mock sandbox top-ups in `topup.service.ts` when live credentials are not present.
> 2. Fixed universal upload/read `INTERNAL_ERROR` 500 responses across proposals, KYC, receipts, and deliverables by restarting the MinIO object store container (`yekis-minio-1`), creating the `marketplace-dev` bucket, and wiring `ensureObjectStoreReady()` on server startup in `server.ts` to auto-initialize missing buckets.
> **Update 2026-09-03 (Evening):** Resolved statutory 7-day cooling-off cancellation route registration bug in `contracts.routes.ts` (un-nesting `POST /api/v1/contracts/:contractId/cancel-cooling-off` from inside the accept error handler), purged stale transpiled `.js` files from `apps/backend/src` that were shadowing TypeScript files and causing runtime TMS environment variable failures, hardened `recordAuditEvent` with strictly typed `Prisma.InputJsonValue` metadata, unified `BotSession.staffRole` to include the `SUPPORT` staff role, wired up `cancelContractCoolingOff` in frontend `api/client.ts` and `WorkflowWorkspace.tsx`, and added full test coverage in `cooling-off.test.ts` (all 34 backend tests passing).
> **Update 2026-09-03:** Synchronized PostgreSQL database schema with Prisma (`WalletTopUp.providerTransactionId` and ledger models) resolving Operations dashboard 500 error. Polished Operations Workspace UI: replaced textual `(!)` dispute icon with `lucide-react` `Scale` icon across sidebar and metrics cards, added queue count badges, realigned topbar actions, enhanced sign-out button, and scoped AML review panel to Overview tab. Refactored marketing footer grid layout and typography to fix visual alignment: standardized 38px column title baselines matching the brand logo, eliminated asymmetric brand column padding, normalized button and link vertical heights with flex alignment, restored the bottom border divider, and enhanced responsive wrapping across desktop, tablet, and mobile. Implemented core Double-Entry General Ledger (`LedgerAccount`, `LedgerJournal`, `LedgerEntry`), Telebirr B2C automated disbursement payout rail with `PayoutTransaction` lifecycle and rollback guards, multi-script anti-circumvention engine (Amharic Fidel numerals, words, leetspeak), and WebSocket real-time foundation (`/api/v1/ws`).
> **Update 2026-08-22:** Refactored light and dark mode design systems to eliminate contrast anomalies, ensure WCAG compliance, harmonize brand emerald colors (`#16a34a` in light, `#22c55e` in dark), eliminate low-opacity icon backgrounds, and polish landing copy to remove AI-slop / developer jargon.
> **Update 2026-08-21:** Aligned the marketing and landing page spacing to match the AFRO-TECH system, using a full-bleed layout with consistent 6% horizontal gutters instead of a constrained 1200px container.

## Product Vision

Yekis_jobs is a trust-centered Ethiopian freelance marketplace. Clients and freelancers move from verified identity to job, proposal, signed contract, funded milestone, delivery, release, dispute resolution, and payout without leaving the platform.

The core promise is mutual protection: clients fund work against explicit milestones, freelancers can see that money is held before delivery, inactive clients cannot hold submitted work indefinitely, and either party can escalate a disputed milestone through a recorded process.

## Audience And Roles

- Clients post work, review proposals, sign agreements, fund milestones, accept delivery, and raise disputes.
- Freelancers discover work, bid, sign agreements, submit milestones, receive releases, and request withdrawals.
- Compliance Officers review identity evidence and top-ups, mediate disputes, and process TMS flags.
- Admins share current compliance operations and can be extended with broader platform administration.

Users may have `CLIENT`, `FREELANCER`, or `BOTH` marketplace roles. Staff authority is separate through `COMPLIANCE_OFFICER` or `ADMIN`.

## Product Scope

### Identity And Access

- Email/password and Telegram Mini App authentication.
- Minimum contracting-age enforcement and purpose-specific consent capture.
- Tier 1 KYC gates job posting, bidding, and funding.
- Tier 2 KYC gates withdrawal.
- Periodic review creates a pending-review marker without silently revoking an already verified user's access.

### Marketplace

- Searchable category-based jobs.
- Client job management and proposal review.
- Freelancer proposal submission and withdrawal.
- One proposal per freelancer per job and self-bid prevention.
- Atomic proposal acceptance, competing-proposal rejection, contract creation, and PDF generation.

### Contract And Escrow

- Immutable generated service-agreement PDF stored in object storage.
- Independent client and freelancer signature timestamps.
- Milestone funding only after both signatures.
- Signed, raw-body provider webhooks with idempotent processing.
- Delivery submission, five-day review window, warning, explicit acceptance, and auto-release.
- Server-side platform fee and withholding calculation.

### Disputes And Compliance

- One dispute per milestone, allowing separate cases within a multi-milestone contract.
- Negotiation, evidence, mediation, arbitration, and resolution stages.
- Release, refund, or bounded partial split.
- Structuring, velocity, pass-through, and wallet-mismatch TMS rules.
- Staff queue for dismissal or recording an externally filed STR.
- Append-only audit events for important transitions.

### Profiles And Reputation

- Rich user profiles featuring bio, titles, verified skills, and portfolio items.
- Profile completeness tracking to encourage robust freelancer presence.
- A Featured Talent Carousel managed by staff to highlight top performers.
- Double-blind contract review system: ratings and feedback remain hidden until both parties submit or the review window closes.
- Bayesian average rating calculation to ensure fair representation of user reputation.
- Staff moderation capabilities via profile reporting.

### Supporting Experiences

- Wallet balance and Tier 2 withdrawal request.
- Receipt-based manual top-up with staff approval.
- In-app notifications with SMS/Telegram worker integration.
- Guest and authenticated support conversations with automated load-balanced staff assignment and file attachments.
- Staff dashboard for KYC, top-up, dispute, and TMS queues.
- Public-facing marketing site with escrow explanation, FAQ, transparent pricing, and technical SEO infrastructure (robots.txt, sitemap.xml, structured data).

## Current Implementation Status

### Implemented And Locally Verified

- React browser UI linked to current API request shapes and paths.
- Express/TypeScript modules for all primary user and staff workflows.
- PostgreSQL persistence through Prisma migrations.
- Redis/BullMQ delayed and periodic workers.
- MinIO/S3-compatible KYC and contract document storage with bucket initialization.
- Role, party, KYC-tier, state-transition, and staff authorization checks.
- Concurrency guards around proposal acceptance, pending funding, release, refund, and partial split.
- Integration tests for frontend-to-API linkage and successful backend/frontend builds.
- Manual end-to-end runs for release, withdrawal, dispute split, and TMS hold/dismissal.

### Implemented Behind Development Mocks Or Stubs

- Fayda verification uses deterministic development behavior pending formal API access.
- PEP/sanctions screening uses a stub pending an approved source.
- Telebirr and CBE collection (PAY-002: Chapa removed 2026-08-26) share an adapter and webhook architecture, but request/response mappings need real sandbox verification.
- SMS and Telegram delivery require credentials and Telegram account linking to become operational.

### Not Production-Ready

- Live Telebirr B2C production credentials and physical custodial escrow bank account (blocked on NBE licensing / bank agreement; currently using simulated sandbox provider).
- Production Ethiopian hosting, object lock, backup/restore, secret management, TLS, monitoring, and incident runbooks must be established.
- Regulatory thresholds, retention, withholding treatment, e-signature evidence, and STR procedures require Ethiopian legal/compliance validation before launch.

## Technical Shape

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React 19, Vite, TypeScript | User, wallet, support, and staff workflows |
| API | Express, TypeScript, Zod | Authentication, authorization, orchestration, validation |
| Data | PostgreSQL, Prisma | Transactional source of truth and migrations |
| Jobs | Redis, BullMQ | Auto-release, KYC refresh, notification work |
| Documents | MinIO/S3-compatible storage | KYC evidence, receipts, and contract PDFs |
| Shared contracts | Workspace Zod schemas | Common API payload types |

See `ARCHITECTURE.md` for component and state-machine detail and `WALKTHROUGH.md` for the complete human journey.

## Product Assumptions

1. Escrow is mandatory for marketplace contract payments.
2. Identity verification is a gate, not an optional profile enhancement.
3. Both parties must sign before milestone funding.
4. Fees, tax, wallet credits, and resolution amounts are server-controlled.
5. Auto-release protects freelancers when a client does not respond.
6. A dispute belongs to the specific milestone whose delivery or payment is contested.
7. Staff tools support human compliance decisions; they do not pretend external regulatory actions are automated.

## Compliance Design Constraints

| Constraint | Design response |
|---|---|
| Ethiopian data localization | Production personal data and documents must use approved domestic hosting |
| AML/CFT auditability | Important transitions write immutable-intent `AuditLog` rows with database-level protections |
| Tiered KYC | Tier 1 gates marketplace money entry; Tier 2 gates money exit |
| Withholding | Server-calculated rates and threshold are environment controlled |
| Electronic acceptance | Independent party timestamps and immutable generated contract document |
| Document retention | Object-store references in PostgreSQL; production bucket must enable versioning/object lock |
| Suspicious activity | TMS queues a human decision and records, but does not submit, an STR |

These are engineering constraints, not legal certification. Production policy must be confirmed by Ethiopian counsel, tax, banking, and compliance stakeholders.

## Success Definition

The pilot is functionally complete when a real user can complete the journey in `WALKTHROUGH.md` with sandbox or live approved providers, every financial state reconciles to provider records, compliance staff can operate all queues, and production controls have been tested through failure and recovery scenarios.

## Documentation Practice

Documentation is part of the definition of done. Every implementation change updates the relevant Markdown file and `CHANGELOG.md`; the persistent repository rule is in `.agents/AGENTS.md`.
