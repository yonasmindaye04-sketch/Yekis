# Product & Design Department

This document covers the full scope of how the Product & Design Department operates — from day-to-day responsibilities and roles to the design process, tools, and deliverables specific to the Ethiopian Freelance Marketplace.

---

## 1. Core Product Philosophy

*   **The real product is trust, not the interface.** The win is that a client can post work, pay into escrow, and get a delivered result — or their money back — without ever needing informal trust or a lawyer. The UI is just how people reach that outcome.
*   **Bandwidth first.** A large share of target users are Telegram-first and on limited data. Every screen must be designed for low-bandwidth, mobile-first usage. No heavy animations or uncompressed images.
*   **Bilingual by default.** Every screen must be designed to support both **Amharic and English** from Day 1 — not added later. This includes RTL/LTR text layout considerations.
*   **Trust signals everywhere.** Users are coming from a culture of informal Telegram/WhatsApp deals. Every design decision should reinforce the feeling that their money is safe.

---

## 2. Who Is in the Department

| Role | Responsibility |
|---|---|
| **Product Manager (PM)** | Owns the product roadmap, defines features, writes requirements, prioritizes the backlog |
| **UX Researcher** | Conducts user interviews with Ethiopian freelancers & clients to validate assumptions |
| **UX Designer** | Creates wireframes, user flows, and interaction designs |
| **UI Designer** | Converts wireframes into polished, branded visual screens |
| **Content Designer** | Writes all in-app copy in both Amharic and English (button labels, error messages, onboarding text) |

> **For the MVP (Minimum Viable Product):** One person can cover UX + UI. The PM role can be handled by the founder. A bilingual content writer is non-negotiable from the start.

---

## 3. How the Design Process Works (Step by Step)

The team follows a structured loop for every new feature:

```
Discover → Define → Design → Test → Hand Off → Review
```

### Step 1: Discover (Research)
Before designing anything, the UX Researcher first asks:
*   Who is this for? (Ethiopian freelancer? SME client? Both?)
*   What pain are they experiencing right now?
*   How do they currently solve this problem? (Telegram group? WhatsApp? In person?)

**Deliverables:** User interviews (minimum 5 per user type), survey results, persona documents.

---

### Step 2: Define (Problem Statement)
The PM takes the research and turns it into a clear problem statement and feature requirements.

**Example:** *"A freelance graphic designer in Addis can't trust that a client will pay after delivering work. We need to show them — visually and clearly — that funds are already locked in escrow before they start working."*

**Deliverables:** Feature brief, user story (`As a [role], I want to [action] so that [outcome]`), acceptance criteria.

---

### Step 3: Design (Wireframe → Visual)

The UX Designer first builds **low-fidelity wireframes** (black and white, no colors) to map out the structure and user flow. These get reviewed internally and by the PM.

Once the flow is approved, the UI Designer applies the **visual design system** (brand colors, typography, icons) to produce high-fidelity mockups.

**Key Screens to Design for the MVP:**
1.  **Onboarding & KYC** — Registration, ID upload, Fayda ID verification status
2.  **Job Posting** — Client creates a job with scope, milestones, budget
3.  **Bidding** — Freelancer browses and submits proposals
4.  **Contract View** — Both parties see the auto-generated Service Agreement
5.  **Escrow Dashboard** — Visual status indicator of funds (Pending / Held / Released / Disputed)
6.  **Milestone Submission** — Freelancer uploads deliverables, client reviews
7.  **Dispute Flow** — Structured form for raising and resolving disputes
8.  **User Profile** — Verified badge, reviews, portfolio, on-time scores
9.  **Wallet / Withdrawal** — Freelancer sees balance, requests payout

**Deliverables:** Wireframes (Figma), high-fidelity mockups (Figma), interactive prototype.

---

### Step 4: Test (Usability Testing)
Before handing off to Development, the UX Designer runs quick usability tests.

*   Use a **clickable prototype** (Figma).
*   Recruit 3-5 real Ethiopian freelancers and clients from the target demographic.
*   Ask them to complete tasks (e.g., "Find a job, submit a bid, fund escrow") without help.
*   Record where they get stuck.

**Deliverables:** Usability test report, prioritized list of issues to fix before handoff.

---

### Step 5: Hand Off (To Development)
Once designs are approved, the UI Designer packages the screens for the engineering team.

*   All screens exported in Figma with exact specs (padding, font sizes, colors as hex codes).
*   Component library built in Figma and mirrored in the front-end code.
*   All Amharic and English copy strings exported in a spreadsheet for the Content Designer to review.
*   Edge cases designed (e.g., empty states, error states, loading states).

---

### Step 6: Review (QA & Iteration)
After the Development team builds the feature, the UX/UI Designer does a **design QA** pass — checking that the implementation matches the approved designs exactly. Any deviations are flagged back to Engineering.

---

## 4. Design System & Tools

| Tool | Purpose |
|---|---|
| **Figma** | All wireframes, UI design, prototypes, and component library |
| **FigJam** | Collaborative whiteboarding for user flows and brainstorming |
| **Notion / Linear** | Product backlog, feature briefs, meeting notes |
| **Google Forms** | User research surveys |
| **Loom** | Recording prototype walkthroughs for handoff to Engineering |

### Design System Must-Haves
The team must establish a shared design system before designing any individual screens. This includes:
*   **Color palette** — 1 primary brand color, 1 accent, semantic colors (green for success/released funds, red for disputes, yellow for pending)
*   **Typography** — A font that supports the Ethiopic script (e.g., **Noto Sans Ethiopic** from Google Fonts)
*   **Spacing scale** — Consistent 4px/8px grid
*   **Component library** — Buttons, form fields, cards, status badges, modals, navigation bars

---

## 5. Inspiration References

| Platform | What to Study |
|---|---|
| **Upwork** | Milestone-based escrow UI, dispute escalation flow, two-sided review system |
| **Fiverr** | Simple gig-packaging cards (fixed-scope, fixed-price) for low-friction freelancer onboarding |
| **Truelancer** | "Security deposit" framing to visually signal trust to new users |
| **Chapa** | Minimal-friction checkout flow — model the payment UX on this |

---

## 6. Phase 0 — Blocking Decisions (Needed Before Design Starts)

The Product team cannot finalize key screens until these decisions are made:

*   **Escrow Architecture:** Does the client deposit into an in-platform wallet, a bank custodian, or via a Third-Party PSP (like Chapa)? This directly determines how the Escrow Dashboard screen looks and works.
*   **Launch Categories:** Confirm the 4-6 subcategories at launch. The job posting form and search filters are built around these.
*   **Take-rate Split:** Confirm the 10% fee split (5% freelancer / 5% client). This is displayed in the contract and checkout screens.

---

## 7. Phase 2 & Beyond — Future Product Features

> Do **not** design or build these until the MVP has real transaction volume.

*   **Verified/Premium Profiles** — Subscription tier for better visibility and faster payouts
*   **Featured Job Listings** — Clients pay to boost urgent postings
*   **Skill Verification & Training** — Paid certification/testing as both a trust signal and revenue line
*   **Enterprise/Agency Accounts** — Bulk hiring tools and dedicated account management
*   **Diaspora / Foreign-Client Support** — Expanding cross-border payments once domestic compliance is stable

---

## 8. Implemented Screens — Design QA Baseline (Current Code State)

The following screens/components are now built and styled in the frontend (`apps/frontend/src/`). Design QA should review these implementations against this document's standards (bilingual readiness, trust signals, mobile-first):

| Component | File(s) | Notes |
|---|---|---|
| **Public Profile page** | `ProfilePage.tsx` + `ProfilePage.css` | Hero with banner/avatar/KYC badge, stats sidebar, skills chips, portfolio grid, reviews with responses, report-profile modal |
| **Support chat** | `SupportChat.tsx` + `SupportChat.css` | In-app staff chat: theirs/mine bubbles, online indicator, empty state, composer with attach/emoji |
| **Cookie consent banner** | `CookieBanner.tsx` + `CookieBanner.css` | Granular consent (essential/analytics/marketing toggles), theme-aware, mobile bottom-sheet layout |
| **Marketing footer** | `LandingPage.tsx` + `marketing.css` | 4-column grid aligned; social icon hover states fixed; full-width bottom bar |

**Known gap for Content Design:** the Amharic translation strings in `i18n.ts` are still `[TODO: Professional Amharic translation needed]` placeholders — bilingual-by-default is NOT yet met for these screens.

## 9. UX & Marketing Site Updates (Latest Pass)
*   **Motion layer shipped:** branded first-visit splash, scroll progress bar, header elevation on scroll, reveal-on-scroll sections (varied directions + stagger), hero parallax. All effects respect prefers-reduced-motion (splash skipped entirely for those users).
*   **Honest metrics policy:** all fabricated numbers (freelancer/job/escrow counters) and invented testimonials removed from the landing page. Do not reintroduce social-proof numbers until they come from real platform data - the empty state is preferable to fake trust signals.
*   **Footer compacted:** vertical padding reduced ~45 percent; bottom bar spacing tightened.
*   **Registration:** T&C + Privacy acceptance checkbox (required, links to marketing pages) added before account creation.
*   **Sign-in:** social buttons (Google/Apple/Facebook) render only when the backend reports them configured; a consistent "or with email" divider separates them from the password form.
