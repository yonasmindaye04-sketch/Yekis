# Yekis User & Support FAQ (Code-Verified Reference)

> **Purpose**: Reference answers to recurring questions asked by Yekis users (clients and freelancers), verified directly against the current backend and frontend codebase. Maintained in `docs/` so product, support, and engineering teams can reuse and extend it without guessing platform behaviour.
>
> - **Rule of accuracy**: Every answer below distinguishes **live enforced behaviour**, **ranking/display behaviour**, **frontend demo/fallback behaviour**, and **known gaps** in the current implementation.
> - **Related references**: [SYSTEM_DESIGN.md](./SYSTEM_DESIGN.md) §3.11, [SIDEBAR_FEATURES_REFERENCE.md](./SIDEBAR_FEATURES_REFERENCE.md), and [DASHBOARD_CONTENTS_REFERENCE.md](./DASHBOARD_CONTENTS_REFERENCE.md).

---

## 1. Profiles, Work Eligibility & Featured Talent

### Q1. Does setting up a user's profile affect their ability to work, and what are the criteria to appear in the "Featured Talent" section?

#### A. Ability to Work (Hard Gates vs. Discovery & Ranking)
1. **Hard eligibility gates (`requireKycVerified`)**:
   - Completing profile fields (`bio`, `skills`, `portfolioItems`, `avatarUrl`, `profileCompleteness`) does **not** block a user from working on Yekis.
   - Basic profile editing (`PATCH /api/v1/users/me/profile`) is intentionally open to all authenticated users before KYC (`apps/backend/src/modules/profiles/profile.routes.ts`).
   - Economic actions—posting jobs, submitting proposals, creating or ordering gigs, funding escrow, and releasing/withdrawing payouts—are gated by **Fayda KYC verification (`requireKycVerified("TIER_1")` / `"TIER_2"`)** and account `role` (`CLIENT`, `FREELANCER`, `BOTH`), not by `profileCompleteness` (`jobs.routes.ts`, `gigs/gig.routes.ts`, `escrow/escrow.routes.ts`).
2. **Where profile setup *does* impact work in practice**:
   - **Personalised Open-Brief Feed (`GET /api/v1/jobs/feed` -> `getFreelancerFeed()` in `apps/backend/src/modules/jobs/jobs.service.ts`)**:
     - If a freelancer has skills configured, the feed filters to briefs whose category matches their skills **unless** `profileCompleteness >= 80` (`HIGH_COMPLETENESS_THRESHOLD`), in which case non-matching open briefs are also included below matched briefs.
     - Selecting a `primarySkillId` counts **double** (`+2`) toward skill-category strength, and `profileCompleteness` adds up to `+20` points (`completeness * 0.2`) to feed ranking.
     - If a freelancer has no skills set yet, they receive the plain recent open-briefs list with `matchingAvailable: false`.
   - **Proposal Ordering for Clients (`listProposalsForJob()` in `apps/backend/src/modules/jobs/proposals.service.ts`)**:
     - Clients viewing proposals on a job see proposals sorted by `freelancer.profileCompleteness` **descending** (higher completeness appears first; ties preserve submission order).
   - **Profile Visibility (`profileVisibility` in `apps/backend/src/modules/profiles/profile.service.ts`)**:
     - `PUBLIC`: Anyone can view the full profile.
     - `PROPOSERS`: Full bio, portfolio, and stats are restricted to authenticated users who share a contract with the member; others see a limited view.
     - `PRIVATE`: Profile returns `403` to everyone except the owner and staff.

#### B. Criteria to Appear in the "Featured Talent" Section
The Featured Talent carousel (`GET /api/v1/featured` -> `refreshFeaturedCarousel()` in `apps/backend/src/modules/featured/featured.service.ts`) is cached in Redis (`featured:carousel`) for 1 hour and refreshed every 6 hours by `featuredRefresh.worker.ts` (or manually by an Admin in `apps/frontend/src/pages/ops/pages/FeaturedTalent.tsx`). It selects up to **12** talent cards across **4 buckets** in priority order:

| Slot Bucket | Max Slots | Exact Code Criteria (`featured.service.ts`) |
|---|---|---|
| 1. `STAFF_PINNED` | Up to 3 | Most recent `FeaturedLog` entries with `reason: "STAFF_PINNED"`, excluding `role === "CLIENT"` and `isSuspended === true`. |
| 2. `TOP_RATED` | Up to 4 | `role` in `["FREELANCER", "BOTH"]`, `profileVisibility === "PUBLIC"`, `isSuspended === false`, `kyc.status === "VERIFIED"`, `ratingBayesianScore > 0`, ordered by `ratingBayesianScore` descending. |
| 3. `RECENTLY_VERIFIED` | Up to 3 | `role` in `["FREELANCER", "BOTH"]`, `profileVisibility === "PUBLIC"`, `isSuspended === false`, `kyc.status === "VERIFIED"`, and `kyc.lastVerifiedAt` within the last **30 days**, ordered by `lastVerifiedAt` descending. |
| 4. `CATEGORY_BALANCING` | Up to 2 | `role` in `["FREELANCER", "BOTH"]`, `profileVisibility === "PUBLIC"`, `isSuspended === false`, `kyc.status === "VERIFIED"`, and `primarySkillId` not already represented in slots 1–3, ordered by `ratingBayesianScore` descending. |

* **Important notes**:
  - `profileCompleteness`, `bio`, `avatarUrl`, and `isAvailableForWork` are **not** hard eligibility filters for Featured Talent. However, setting `profileVisibility` to `PROPOSERS` or `PRIVATE` excludes a freelancer from buckets 2–4, and setting `primarySkillId` enables category-balancing selection.
  - On the frontend (`apps/frontend/src/FeaturedCarousel.tsx`), if `GET /api/v1/featured` fails or returns an empty array, the carousel falls back to built-in `DEMO_TALENTS` showcase profiles.

---

### Q2. Does setting up a profile really matter for clients (for example, setting skills, bio, and completeness)?

* **Skills & `profileCompleteness` for `CLIENT`-only accounts**:
  - In the onboarding dialog (`evaluateProfileCompletion()` in `apps/frontend/src/components/ProfileCompletionDialog.tsx`), `requiresSkills` is `false` for `CLIENT` accounts (`true` only for `FREELANCER` and `BOTH`). Clients only have 2 setup milestones there: custom photo + name & bio.
  - In the full profile editor (`apps/frontend/src/ProfileEditPage.tsx`), `showSkillsGuidance` is `false` when `accountRole === "CLIENT"` (the sidebar shows `"Marketplace Member"` instead of `"Select primary skill"`), although the Skills and Portfolio form sections remain visible on the page.
  - On the backend, `skills`, `primarySkillId`, and `profileCompleteness` are only evaluated in freelancer discovery flows (`getFreelancerFeed()`, `listProposalsForJob()`, and `featured.service.ts`). Clients cannot bid on jobs and are excluded from Featured Talent, so setting skills on a `CLIENT`-only account has **no matching or ranking effect**.
* **What *does* matter for clients**:
  - **Name, photo, and bio**: Shown on the client's public profile (`GET /api/v1/users/:userId/profile`), in messaging threads, and on contract views, helping freelancers assess who they are contracting with.
  - **Profile visibility (`PUBLIC` / `PROPOSERS` / `PRIVATE`)**: Controls whether freelancers can view the client's full profile before or during engagement.
  - **Fayda KYC verification**: Required (`TIER_1` / `TIER_2`) to post jobs, purchase gigs, fund escrow, and release milestone payments.

---

## 2. Ratings & Reviews

### Q3. Does the platform have a rating system for freelancers and a review section for both parties?

* **Backend rating & review system (both parties)**:
  - **Contract reviews (`apps/backend/src/modules/reviews/review.service.ts` & `review.routes.ts`)**:
    - Both parties on a contract (`contract.clientId` and `contract.freelancerId`) can call `POST /api/v1/reviews/contracts/:contractId/review` with a `1–5` integer `rating` and optional `comment` (max 2,000 chars, contact-sanitized) once the contract has at least one `RELEASED` milestone.
    - Reviews are created double-blind (`isBlind: true`) and revealed either when both parties submit or after **14 days** via the daily sweep in `apps/backend/src/queue/reviewReveal.worker.ts`.
    - Revealed reviews update `User.ratingAverage`, `User.ratingCount`, and `User.ratingBayesianScore` (prior `m = 3`, `C = 3.0` in `recalculateUserRating()`).
    - The reviewed user can respond (`POST /api/v1/reviews/:reviewId/respond`) or dispute (`POST /api/v1/reviews/:reviewId/dispute`).
  - **Known schema limitation on contract reviews**:
    - In `apps/backend/prisma/schema.prisma`, `Review.contractId` is marked `@unique` (`Contract.review` is `Review?`), which enforces at most one `Review` row per `contractId` at the database level even though `submitReview()` checks `allReviews.length >= 2` for early mutual reveal. In practice, a contract review is therefore revealed by the 14-day `reviewReveal.worker.ts` job, and a second party attempting to submit on the same `contractId` would hit a unique-constraint error unless the schema constraint is changed to `@@unique([contractId, authorId])`.
  - **Gig order reviews (`apps/backend/src/modules/gigs/gig.service.ts` & `gig.routes.ts`)**:
    - Buyers (clients) can review `COMPLETED` gig orders via `POST /api/v1/gigs/orders/:orderId/review` with an overall rating plus 4 category scores (`communication`, `quality`, `deadline`, `valueForMoney`), updating `Gig.ratingAverage` and `Gig.ratingCount`.
* **Frontend UI coverage (viewing vs. submitting)**:
  - **Viewing reviews (live)**: [ProfilePage.tsx](file:///c:/Users/MrYoYo/Desktop/project/yekis/Yekis/apps/frontend/src/ProfilePage.tsx) fetches `GET /api/v1/reviews/users/:userId/reviews` and renders the Reviews section (stars, reviewer name, date, comment, and target response) for any user profile (client or freelancer). The Featured Talent quick-view modal in [FeaturedCarousel.tsx](file:///c:/Users/MrYoYo/Desktop/project/yekis/Yekis/apps/frontend/src/FeaturedCarousel.tsx) also has a **Client Reviews** block.
  - **Submitting / responding / disputing reviews (gap)**: Although `api.submitReview()`, `api.respondToReview()`, `api.disputeReview()`, and `api.reviewGigOrder()` are defined in `apps/frontend/src/api/client.ts`, **no UI modal or form in `apps/frontend/src/` currently calls them**. End users cannot yet submit, reply to, or dispute a review through the web/Mini App interface without adding a UI trigger.

---

## 3. Profile Editing & Featured Talent Display Fields

### Q4. Where do freelancers edit their Engagement / Hourly Rate, and what Featured Talent card info can users actually edit?

* **Engagement / Hourly Rate (`hourlyRateETB`)**:
  - **Not editable / not persisted**: There is currently **no** hourly rate or engagement rate field in `User` (`apps/backend/prisma/schema.prisma`), `updateProfileSchema` (`apps/backend/src/modules/profiles/profile.validation.ts`), `updateProfile()` (`profile.service.ts`), or `ProfileEditPage.tsx`.
* **What users CAN edit vs. what is a frontend fallback in the Featured Talent modal**:
  - `buildFeaturedCard()` in `apps/backend/src/modules/featured/featured.service.ts` returns only the following user-controlled and computed fields from Postgres:
    - **User-editable in `ProfileEditPage.tsx`**: `firstName` / `lastName` (shown as `displayName`), `avatarUrl`, `bio` (shown under **ABOUT**), `skills` & `primarySkill` (shown under **SKILLS & EXPERTISE** and role subtitle), and `isAvailableForWork` (shown as **Available for new projects**).
    - **System-computed**: `ratingAverage`, `ratingCount`, `totalJobsCompleted`, `kycBadge`, `kycTier`.
  - All other fields visible in the Featured Talent quick-view modal (`apps/frontend/src/FeaturedCarousel.tsx`) are **frontend defaults / synthetic placeholders** when not present on the API payload:

| Modal Field | Backend Returned? | Current Source in `FeaturedCarousel.tsx` |
|---|---|---|
| **Engagement Rate (`ETB ... / hr starting`)** | No | `t.hourlyRateETB \|\| 950 + (idx % 5) * 250` (modal display falls back to `950`) |
| **Location** | No | Defaults to `"Addis Ababa"` |
| **Languages** | No | Defaults to `"Amharic, English"` |
| **Member Since** | No | Defaults to `"2025"` |
| **On-time Rate** | No | `"98%"` if `totalJobsCompleted > 0`, else `null` (modal falls back to `"100%"`) |
| **Response Time** | No | Defaults to `"~1 hr"` |
| **Client Reviews** | No (not joined in `featured.service.ts`) | Defaults to `[]` (shows `"New Verified Talent"` empty state; `DEMO_TALENTS` supply static sample reviews) |
