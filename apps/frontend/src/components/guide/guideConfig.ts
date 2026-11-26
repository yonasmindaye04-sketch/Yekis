import type {
  ContextualHelpItem,
  GuideModuleId,
  HelpDocTopic,
  KeyboardShortcutItem,
  ModuleTourConfig,
} from "./guideTypes";

export const MODULE_TOURS: Record<GuideModuleId, ModuleTourConfig> = {
  overview: {
    id: "overview",
    title: "Dashboard & Operations Overview",
    shortLabel: "Dashboard",
    summary:
      "Monitor live wallet funds, escrow protection, milestone velocity, payment rail settlement mix, and operational workflows from one command center.",
    whenToUse:
      "Start here to track active contracts, inspect cashflow across Telebirr/CBE Birr/M-Pesa, or switch into the Data Table, Kanban, or Ethiopian Fiscal Calendar.",
    keyActions: [
      "Click any KPI card to drill down into pending top-ups, released payouts, or open briefs",
      "Switch between Executive Analytics and Operations Pipeline (Table, Kanban, Calendar)",
      "Press Ctrl/Cmd + K or click Quick Jump to navigate directly to any module",
    ],
    steps: [
      {
        id: "overview-kpis",
        target: '[data-tour="dashboard-kpis"]',
        title: "Live Financial & Delivery KPIs",
        description:
          "Track your available wallet balance, funds locked in escrow, active milestones, and open briefs. Click any card to expand a quick breakdown.",
        whyItMatters:
          "Gives you an instant pulse on committed escrow funds and delivery health before opening individual contracts.",
        placement: "bottom",
        prepareAction: "dashboard-analytics",
        docTopicId: "doc-dashboard",
      },
      {
        id: "overview-modes",
        target: '[data-tour="dashboard-mode-switcher"]',
        title: "Analytics vs. Operations Pipeline",
        description:
          "Switch between Executive Analytics charts and the Operations Pipeline suite (Data Table, Kanban Board, and Schedule Calendar).",
        whyItMatters:
          "Lets you move from high-level cashflow trends straight into milestone execution without leaving your dashboard.",
        placement: "bottom",
        prepareAction: "dashboard-analytics",
        docTopicId: "doc-dashboard",
      },
      {
        id: "overview-cashflow",
        target: '[data-tour="dashboard-cashflow-chart"]',
        title: "Escrow Inflow & Released Payouts",
        description:
          "Compare money funded into escrow against payouts released to talent over 7D, 30D, 90D, or 12M windows.",
        whyItMatters:
          "Helps clients and freelancers reconcile real funding dates against completed milestone releases.",
        placement: "top",
        prepareAction: "dashboard-analytics",
        optional: true,
        docTopicId: "doc-escrow",
      },
      {
        id: "overview-rails",
        target: '[data-tour="dashboard-rail-mix"]',
        title: "Payment Rail Settlement Mix",
        description:
          "See volume settled across Telebirr, CBE Birr, and Safaricom M-Pesa for both escrow funding and approved top-ups.",
        whyItMatters:
          "Confirms which Ethiopian payment rails your account uses most for reconciliation and payouts.",
        placement: "top",
        prepareAction: "dashboard-analytics",
        optional: true,
        docTopicId: "doc-wallet",
      },
      {
        id: "overview-pipeline-table",
        target: '[data-tour="dashboard-data-table"]',
        title: "Operations Ledger Data Table",
        description:
          "Search, sort, filter by rail or escrow status, inspect individual milestone rows, and export CSV records.",
        whyItMatters:
          "Provides an auditable tabular view of every milestone across your contracts.",
        placement: "top",
        prepareAction: "dashboard-table",
        optional: true,
        docTopicId: "doc-dashboard",
      },
      {
        id: "overview-quick-jump",
        target: '[data-tour="dashboard-quick-jump"]',
        title: "Quick Jump Command Palette",
        description:
          "Open Quick Jump anytime (Ctrl/Cmd + K) to switch workspaces, toggle Pipeline views, or change themes with your keyboard.",
        whyItMatters:
          "Cuts navigation time across all 12 Yekis modules to a few keystrokes.",
        placement: "bottom",
        prepareAction: "dashboard-analytics",
        optional: true,
      },
    ],
  },

  jobs: {
    id: "jobs",
    title: "Jobs & Project Briefs",
    shortLabel: "Jobs",
    summary:
      "Clients publish milestone-scoped project briefs and freelancers search, filter, and submit tailored proposals.",
    whenToUse:
      "Visit Jobs to post a new hiring scope or discover open Ethiopian marketplace opportunities matching your category and budget.",
    keyActions: [
      "Publish a brief with budget range, category, and target deadline (Clients)",
      "Filter open briefs by keyword, category, ETB budget preset, and deadline window",
      "Inspect brief scope and submit a milestone-backed proposal (Freelancers)",
    ],
    steps: [
      {
        id: "jobs-publish",
        target: '[data-tour="jobs-publish-form"]',
        title: "Publish an Escrow-Protected Brief",
        description:
          "Define your project category, scope (20+ chars), ETB budget range, and deadline. Posting requires Tier 1 KYC verification.",
        whyItMatters:
          "Clear scopes and realistic ETB ranges attract stronger, faster proposals from verified talent.",
        placement: "bottom",
        roles: ["CLIENT", "BOTH"],
        optional: true,
        docTopicId: "doc-jobs",
      },
      {
        id: "jobs-my-briefs",
        target: '[data-tour="jobs-my-briefs"]',
        title: "Track Your Published Briefs",
        description:
          "Review briefs you have posted, monitor incoming proposal counts, and check brief statuses in one place.",
        placement: "top",
        roles: ["CLIENT", "BOTH"],
        optional: true,
        docTopicId: "doc-jobs",
      },
      {
        id: "jobs-search-filters",
        target: '[data-tour="jobs-filters"]',
        title: "Filter Open Opportunities",
        description:
          "Narrow open marketplace briefs by keyword, launch category, ETB budget range, or upcoming deadline.",
        whyItMatters:
          "Helps freelancers focus immediately on high-fit projects before deadlines close.",
        placement: "bottom",
        roles: ["FREELANCER", "BOTH"],
        optional: true,
        docTopicId: "doc-jobs",
      },
      {
        id: "jobs-board-list",
        target: '[data-tour="jobs-board-list"]',
        title: "Inspect Briefs & Apply",
        description:
          "Open any brief card to read full deliverables and click Apply to quote your rate, timeline, and milestone plan.",
        placement: "top",
        roles: ["FREELANCER", "BOTH"],
        optional: true,
        docTopicId: "doc-proposals",
      },
    ],
  },

  proposals: {
    id: "proposals",
    title: "Proposal Pipeline",
    shortLabel: "Proposals",
    summary:
      "Manage incoming candidate bids on your briefs or track proposals you have submitted across the marketplace.",
    whenToUse:
      "Open Proposals to shortlist, accept, or reject freelancer bids — or check whether your submitted bids have been shortlisted or accepted.",
    keyActions: [
      "Shortlist strong candidates before making a final award decision (Clients)",
      "Accept a proposal to automatically generate a binding AACCSA service contract",
      "Track bid status (Submitted, Shortlisted, Accepted) or withdraw pending bids (Freelancers)",
    ],
    steps: [
      {
        id: "proposals-hiring-pipeline",
        target: '[data-tour="proposals-hiring-pipeline"]',
        title: "Candidate Proposal Pipeline",
        description:
          "Review cover letters, quoted ETB amounts, and delivery timelines submitted against each of your open briefs.",
        whyItMatters:
          "Accepting a proposal immediately transitions both parties into a structured bilateral contract.",
        placement: "bottom",
        roles: ["CLIENT", "BOTH"],
        optional: true,
        docTopicId: "doc-proposals",
      },
      {
        id: "proposals-mine",
        target: '[data-tour="proposals-my-list"]',
        title: "Your Submitted Proposals",
        description:
          "Monitor every bid you have sent, see live review statuses, and withdraw pending proposals if your availability changes.",
        placement: "top",
        roles: ["FREELANCER", "BOTH"],
        optional: true,
        docTopicId: "doc-proposals",
      },
    ],
  },

  gigs: {
    id: "gigs",
    title: "Gig Marketplace",
    shortLabel: "Gigs",
    summary:
      "Browse fixed-price, tiered service packages (Basic, Standard, Premium) backed by milestone-grade escrow protection.",
    whenToUse:
      "Use Gigs when you want standardized deliverables with transparent pricing and turnaround times instead of custom bidding.",
    keyActions: [
      "Filter services by category, keyword, rating, price, or delivery speed",
      "Compare Basic, Standard, and Premium package inclusions before ordering",
      "Order directly with escrow protection or manage seller listings under My Gigs",
    ],
    steps: [
      {
        id: "gigs-controls",
        target: '[data-tour="gigs-search-controls"]',
        title: "Search & Category Filters",
        description:
          "Search service packages by keyword, filter across all 10 Ethiopian launch categories, and sort by rating, price, or delivery speed.",
        placement: "bottom",
        optional: true,
        docTopicId: "doc-gigs",
      },
      {
        id: "gigs-grid",
        target: '[data-tour="gigs-catalog-grid"]',
        title: "Service Package Cards",
        description:
          "Select any gig card to inspect package tiers, seller verification, revision limits, and place an escrow-protected order.",
        whyItMatters:
          "Every gig purchase holds funds in escrow until you review and accept the delivered work.",
        placement: "top",
        optional: true,
        docTopicId: "doc-gigs",
      },
    ],
  },

  contracts: {
    id: "contracts",
    title: "Contracts & Service Agreements",
    shortLabel: "Contracts",
    summary:
      "Review bilingual AACCSA-aligned service agreements, record bilateral e-signatures, download PDFs, and manage contract milestones.",
    whenToUse:
      "Open Contracts right after a proposal is accepted to sign the agreement, inspect milestone schedules, or jump to Escrow and Chat.",
    keyActions: [
      "Check Client and Freelancer e-signature status and click Accept Agreement",
      "Download the official Agreement PDF or open direct counterparty chat",
      "Jump straight into Escrow Center filtered to a specific contract",
    ],
    steps: [
      {
        id: "contracts-kpis",
        target: '[data-tour="contracts-kpis"]',
        title: "Contract Status Summary",
        description:
          "See total contracts, agreements awaiting signatures, active executed contracts, and cancelled agreements at a glance.",
        placement: "bottom",
        docTopicId: "doc-contracts",
      },
      {
        id: "contracts-filters",
        target: '[data-tour="contracts-filters"]',
        title: "Filter by Signature Stage or Search",
        description:
          "Filter agreements by Awaiting Signatures, Executed, or Cancelled, or search by milestone title or contract ID.",
        placement: "bottom",
        docTopicId: "doc-contracts",
      },
      {
        id: "contracts-list",
        target: '[data-tour="contracts-list"]',
        title: "Agreement Cards, E-Signatures & Milestones",
        description:
          "Sign pending agreements, download the Agreement PDF, open Escrow Center for funding/delivery, or message your counterparty.",
        whyItMatters:
          "Both parties must e-sign an agreement before escrow milestones can be funded and work officially begins.",
        placement: "top",
        optional: true,
        docTopicId: "doc-contracts",
      },
    ],
  },

  escrow: {
    id: "escrow",
    title: "Escrow Center",
    shortLabel: "Escrow Center",
    summary:
      "Fund milestones from your wallet, submit deliverables, release funds, inspect 120-hour auto-release protection, and check tax/fee splits.",
    whenToUse:
      "Use Escrow Center whenever money needs to be locked for work to start, deliverables are ready for QA review, or funds are ready for release.",
    keyActions: [
      "Fund pending milestones from your ETB wallet before delivery begins (Clients)",
      "Submit completed milestone deliverables for 120-hour QA review (Freelancers)",
      "Inspect Tax & Fee Split (5% platform fee + 3% or 30% withholding tax) or raise a dispute if needed",
    ],
    steps: [
      {
        id: "escrow-kpis",
        target: '[data-tour="escrow-kpis"]',
        title: "Escrow Vault Totals",
        description:
          "Monitor funds currently held in escrow, milestones awaiting funding, released payouts, and any disputed amounts.",
        placement: "bottom",
        docTopicId: "doc-escrow",
      },
      {
        id: "escrow-filters",
        target: '[data-tour="escrow-filters"]',
        title: "Filter by Escrow Lifecycle State",
        description:
          "Switch between Payment Pending, Escrow Held, Submitted for Review, Released, and Disputed milestones.",
        placement: "bottom",
        docTopicId: "doc-escrow",
      },
      {
        id: "escrow-milestones",
        target: '[data-tour="escrow-milestones-list"]',
        title: "Milestone Actions & Tax/Fee Split",
        description:
          "Fund milestones, submit work, release approved payments, or expand Tax & Fee Split to preview exact Ethiopian withholding and platform fee deductions.",
        whyItMatters:
          "Submitted milestones automatically release after 120 hours unless disputed, protecting freelancers from payment stalls.",
        placement: "top",
        optional: true,
        docTopicId: "doc-escrow",
      },
    ],
  },

  wallet: {
    id: "wallet",
    title: "Wallet & Payouts",
    shortLabel: "Wallet & Payouts",
    summary:
      "Manage your ETB wallet balance, top up via Telebirr, CBE Birr, or Safaricom M-Pesa, withdraw earnings with 2FA approval, and download fiscal receipts.",
    whenToUse:
      "Visit Wallet & Payouts to deposit funds before hiring, withdraw cleared earnings, or inspect your full transaction movement ledger.",
    keyActions: [
      "Top up via Instant Checkout or Manual Transfer receipt verification",
      "Withdraw cleared earnings with SMS 2FA approval code (Freelancers / Dual-Role)",
      "Filter Transaction Movements and print formal Invoices or Payout Vouchers",
    ],
    steps: [
      {
        id: "wallet-hero",
        target: '[data-tour="wallet-hero"]',
        title: "Available ETB Balance & Fiscal Documents",
        description:
          "View your spendable or withdrawable ETB balance and generate formal VAT/withholding invoices or payout vouchers.",
        placement: "bottom",
        docTopicId: "doc-wallet",
      },
      {
        id: "wallet-withdraw",
        target: '[data-tour="wallet-withdraw"]',
        title: "Withdraw Earnings with 2FA",
        description:
          "Choose Telebirr, CBE Bank, or M-Pesa, enter your destination and amount, request a 6-digit approval code, and submit your payout.",
        whyItMatters:
          "2FA approval codes protect your earnings against unauthorized transfers.",
        placement: "top",
        roles: ["FREELANCER", "BOTH"],
        optional: true,
        docTopicId: "doc-wallet",
      },
      {
        id: "wallet-topup",
        target: '[data-tour="wallet-topup"]',
        title: "Top Up Your Wallet",
        description:
          "Add ETB using Manual Transfer (upload your bank/Telebirr receipt) or Instant Checkout so your wallet is ready to fund milestones.",
        placement: "top",
        optional: true,
        docTopicId: "doc-wallet",
      },
      {
        id: "wallet-audit",
        target: '[data-tour="wallet-recent-topups"]',
        title: "Top-Up Audit Log & Ledger Movements",
        description:
          "Track receipt verification status, attach missing receipts to stalled checkouts, and download receipts per transaction.",
        placement: "top",
        optional: true,
        docTopicId: "doc-wallet",
      },
    ],
  },

  chat: {
    id: "chat",
    title: "Messages & Collaboration",
    shortLabel: "Messages",
    summary:
      "Communicate directly with contract counterparties or Yekis Support inside protected threads with Mini-Me AI co-pilot assistance.",
    whenToUse:
      "Use Messages to coordinate deliverables, share files securely, request support from staff, or draft contract-grounded replies.",
    keyActions: [
      "Filter conversations by All, Direct, or Support threads",
      "Start a new direct discussion or open a Support ticket",
      "Use Mini-Me smart replies, thread summaries, and deal-term extraction",
    ],
    steps: [
      {
        id: "chat-sidebar",
        target: '[data-tour="chat-sidebar"]',
        title: "Conversations & Filters",
        description:
          "Search threads, switch between Direct and Support conversations, or click New Chat to message a user or open a support ticket.",
        placement: "right",
        docTopicId: "doc-chat",
      },
      {
        id: "chat-filters",
        target: '[data-tour="chat-filter-tabs"]',
        title: "Direct vs. Support Channels",
        description:
          "Isolate client/freelancer negotiations from official Yekis Support desk conversations with one click.",
        placement: "bottom",
        optional: true,
        docTopicId: "doc-chat",
      },
      {
        id: "chat-main",
        target: '[data-tour="chat-main-pane"]',
        title: "Protected Thread & Mini-Me Co-Pilot",
        description:
          "Exchange messages and attachments inside an anti-circumvention protected thread. Off-platform phone/email sharing is flagged to keep your escrow valid.",
        whyItMatters:
          "Keeping scope discussions inside Yekis creates an auditable record if mediation is ever required.",
        placement: "left",
        optional: true,
        docTopicId: "doc-chat",
      },
    ],
  },

  profile: {
    id: "profile",
    title: "Marketplace Profile",
    shortLabel: "My Profile",
    summary:
      "Showcase your verified identity tier, availability, primary and secondary skills, portfolio projects, and double-blind client reviews.",
    whenToUse:
      "Review how clients and collaborators see you, check your verification badge, or jump into Edit Profile to strengthen your readiness score.",
    keyActions: [
      "Verify your KYC badge, rating, completed jobs, and availability status",
      "Click Edit Profile to update your photo, bio, skills, and portfolio",
      "Check how your skills and past work samples appear on the board",
    ],
    steps: [
      {
        id: "profile-masthead",
        target: '[data-tour="profile-masthead"]',
        title: "Identity Masthead & Verification",
        description:
          "Displays your profile photo, display name, Fayda KYC verification status, availability, and marketplace performance stats.",
        placement: "bottom",
        optional: true,
        docTopicId: "doc-profile",
      },
      {
        id: "profile-skills",
        target: '[data-tour="profile-skills-rail"]',
        title: "Skills & Trust Credentials",
        description:
          "Your primary skill and verified credentials appear here so clients can quickly assess your domain fit.",
        placement: "right",
        optional: true,
        docTopicId: "doc-profile",
      },
      {
        id: "profile-portfolio",
        target: '[data-tour="profile-canvas"]',
        title: "Bio, Portfolio & Verified Reviews",
        description:
          "Presents your professional summary, project links, and double-blind contract reviews.",
        placement: "left",
        optional: true,
        docTopicId: "doc-profile",
      },
    ],
  },

  cases: {
    id: "cases",
    title: "Disputes & Mediation",
    shortLabel: "Disputes & Mediation",
    summary:
      "Resolve milestone disagreements through Yekis's structured 4-stage dispute lifecycle from direct negotiation up to AACCSA arbitration.",
    whenToUse:
      "Visit Disputes & Mediation when a milestone has been paused under dispute to submit written evidence, track SLA timers, or escalate.",
    keyActions: [
      "Monitor negotiation deadlines (Stage 1) before escalating to Evidence (Stage 2)",
      "Submit formal written evidence statements and technical notes for mediator review",
      "Escalate unresolved Stage 3 cases to AACCSA binding arbitration",
    ],
    steps: [
      {
        id: "cases-workspace",
        target: '[data-tour="disputes-workspace"]',
        title: "Four-Stage Dispute Resolution",
        description:
          "Active disputes freeze auto-release timers immediately. Each card shows the current stage (Negotiation, Evidence, Mediation, or Arbitration), disputed amount, and available actions.",
        whyItMatters:
          "Structured evidence and 48-hour mediation SLAs ensure fair, auditable escrow outcomes without losing funds.",
        placement: "bottom",
        docTopicId: "doc-disputes",
      },
    ],
  },

  verification: {
    id: "verification",
    title: "KYC Identity Verification",
    shortLabel: "KYC Verification",
    summary:
      "Complete Fayda National ID + biometric verification for Tier 1 marketplace access and optional TIN/business checks for Tier 2 withdrawals.",
    whenToUse:
      "Complete Tier 1 before posting jobs, bidding, or ordering gigs, and Tier 2 before requesting payouts with the 3% verified TIN withholding rate.",
    keyActions: [
      "Submit your legal name, date of birth, Fayda ID number, and clear ID photo",
      "Complete the Fayda eSignet biometric selfie popup check",
      "Submit your 10-digit Ethiopian TIN to unlock Tier 2 withdrawals and lower withholding tax",
    ],
    steps: [
      {
        id: "kyc-header",
        target: '[data-tour="kyc-status-header"]',
        title: "Current Verification Tier & Status",
        description:
          "Shows whether your account is Awaiting Documents, In Review, or Verified, along with your active Tier 1 or Tier 2 level.",
        placement: "bottom",
        optional: true,
        docTopicId: "doc-kyc",
      },
      {
        id: "kyc-form",
        target: '[data-tour="kyc-form-card"]',
        title: "Fayda ID & Biometric Submission",
        description:
          "Enter your name, date of birth, Fayda FIN, and upload a sharp photo or PDF showing all four corners of your ID.",
        whyItMatters:
          "Biometric Fayda verification prevents duplicate accounts and protects every contract party on Yekis.",
        placement: "top",
        optional: true,
        docTopicId: "doc-kyc",
      },
    ],
  },

  settings: {
    id: "settings",
    title: "Account Settings & Privacy",
    shortLabel: "Settings",
    summary:
      "Manage password security, linked OAuth providers, language/timezone/theme preferences, audio feedback, onboarding tour progress, and PDPP data rights.",
    whenToUse:
      "Open Settings to change your password, switch between English/Amharic/Oromiffa/Tigrigna, reset onboarding tours, export your data, or manage account privacy.",
    keyActions: [
      "Update password, revoke other sessions, or link Google sign-in under Security",
      "Customize language, regional clock, layout density, and sound feedback",
      "Restart or reset Yekis Guide onboarding progress, export JSON data, or deactivate account",
    ],
    steps: [
      {
        id: "settings-tabs",
        target: '[data-tour="settings-tabs"]',
        title: "Five Settings Workspaces",
        description:
          "Switch cleanly between Security & Password, Preferences & Localization, Notifications, Privacy & Visibility, and Data & Account.",
        placement: "bottom",
        docTopicId: "doc-settings",
      },
      {
        id: "settings-customizer",
        target: '[data-tour="settings-layout-customizer"]',
        title: "Workspace Layout Customizer",
        description:
          "Adjust sidebar framing (Sidebar, Inset, Floating), density (Compact/Comfortable), and card radius to suit your screen.",
        placement: "left",
        optional: true,
        docTopicId: "doc-settings",
      },
      {
        id: "settings-panel",
        target: '[data-tour="settings-active-panel"]',
        title: "Active Settings Controls",
        description:
          "Configure your active tab settings here. Under Preferences & Localization you can also reset Yekis Guide tour progress at any time.",
        placement: "top",
        optional: true,
        docTopicId: "doc-settings",
      },
    ],
  },
};

export const CONTEXTUAL_HELP_ITEMS: Record<string, ContextualHelpItem> = {
  "dashboard-kpis": {
    id: "dashboard-kpis",
    module: "overview",
    featureName: "Dashboard KPI Cards",
    whatItDoes:
      "Summarizes your live ETB wallet balance, escrow-protected funds, active deliverables, and open briefs with period comparisons.",
    whyItIsUseful:
      "Click any KPI card to expand a quick financial or delivery breakdown and jump directly to the relevant workspace.",
    docTopicId: "doc-dashboard",
  },
  "dashboard-cashflow": {
    id: "dashboard-cashflow",
    module: "overview",
    featureName: "Escrow Inflow & Released Payouts",
    whatItDoes:
      "Charts real milestone escrow deposits (green) against released freelancer payouts (teal) across 7D, 30D, 90D, and 12M windows.",
    whyItIsUseful:
      "Shows actual money movement timing so you can verify funding spikes and payout completions without manual spreadsheets.",
    docTopicId: "doc-escrow",
  },
  "dashboard-rail-mix": {
    id: "dashboard-rail-mix",
    module: "overview",
    featureName: "Payment Rail Settlement Mix",
    whatItDoes:
      "Breaks down transaction volume across Telebirr, CBE Birr, and Safaricom M-Pesa for escrow funding and approved wallet top-ups.",
    whyItIsUseful:
      "Helps you see which Ethiopian payment rails carry your settlements and verify settled milestone counts per period.",
    docTopicId: "doc-wallet",
  },
  "dashboard-pipeline-stages": {
    id: "dashboard-pipeline-stages",
    module: "overview",
    featureName: "Pipeline Stages & View Switcher",
    whatItDoes:
      "Toggles between Executive Analytics charts and the Operations Pipeline (Data Table, Kanban Board, and Schedule Calendar).",
    whyItIsUseful:
      "Lets you switch seamlessly from financial overview to day-to-day milestone tracking using the same live records.",
    docTopicId: "doc-dashboard",
  },
  "dashboard-kanban": {
    id: "dashboard-kanban",
    module: "overview",
    featureName: "Kanban Workflow",
    whatItDoes:
      "Organizes milestones into five escrow stages: Scoping, Escrow Funded, In Active Delivery, Submitted for Review, and Released.",
    whyItIsUseful:
      "Visually highlights bottlenecks and deliverables waiting on review so nothing misses an auto-release or due date.",
    docTopicId: "doc-dashboard",
  },
  "dashboard-data-table": {
    id: "dashboard-data-table",
    module: "overview",
    featureName: "Operations Data Table",
    whatItDoes:
      "Provides sortable, filterable, multi-select milestone ledger rows with column visibility controls, row inspection, and CSV export.",
    whyItIsUseful:
      "Ideal for auditing exact ETB amounts, 10% fee estimates, payment rails, and due dates across many contracts.",
    docTopicId: "doc-dashboard",
  },
  "dashboard-calendar": {
    id: "dashboard-calendar",
    module: "overview",
    featureName: "Schedule Calendar (Gregorian & Ethiopian Fiscal)",
    whatItDoes:
      "Plots milestone due dates, payout releases, and proposal deadlines across both Gregorian and Ethiopian Fiscal (EFY) calendars.",
    whyItIsUseful:
      "Aligns project delivery dates with Ethiopian fiscal quarters (Hamle to Sene) and local business schedules.",
    docTopicId: "doc-dashboard",
  },
  "wallet-financial-actions": {
    id: "wallet-financial-actions",
    module: "wallet",
    featureName: "Wallet Top-Up & 2FA Payouts",
    whatItDoes:
      "Handles ETB deposits via Telebirr, CBE Birr, or M-Pesa (Instant or Manual receipt) and 2FA OTP-protected earnings withdrawals.",
    whyItIsUseful:
      "Keeps funding fast and payouts strictly verified so only you can authorize transfers to your phone or bank account.",
    docTopicId: "doc-wallet",
  },
  "escrow-financial-actions": {
    id: "escrow-financial-actions",
    module: "escrow",
    featureName: "Escrow Actions & Tax/Fee Split",
    whatItDoes:
      "Controls milestone funding, deliverable submission, payment release, 120-hour auto-release countdowns, and Ethiopian tax/fee previews.",
    whyItIsUseful:
      "Guarantees funds are locked before work starts and shows exact net payout after platform fee and ERCA withholding tax.",
    docTopicId: "doc-escrow",
  },
  "contracts-management": {
    id: "contracts-management",
    module: "contracts",
    featureName: "Contract & Milestone Management",
    whatItDoes:
      "Tracks bilateral e-signatures, generates downloadable AACCSA service agreement PDFs, and links each milestone to Escrow and Chat.",
    whyItIsUseful:
      "Ensures both client and freelancer agree to the exact deliverables and statutory terms before money moves.",
    docTopicId: "doc-contracts",
  },
  "jobs-brief-publishing": {
    id: "jobs-brief-publishing",
    module: "jobs",
    featureName: "Publishing & Filtering Project Briefs",
    whatItDoes:
      "Lets verified clients define scoped budgets and deadlines, and lets freelancers filter open briefs by category, budget, and urgency.",
    whyItIsUseful:
      "Reduces proposal mismatch by locking clear scope expectations up front.",
    docTopicId: "doc-jobs",
  },
  "proposals-pipeline": {
    id: "proposals-pipeline",
    module: "proposals",
    featureName: "Proposal Review & Shortlisting",
    whatItDoes:
      "Displays incoming freelancer bids grouped by brief, allowing clients to shortlist, accept into a contract, or decline.",
    whyItIsUseful:
      "Keeps candidate comparison structured and converts accepted bids directly into milestone contracts.",
    docTopicId: "doc-proposals",
  },
  "disputes-resolution": {
    id: "disputes-resolution",
    module: "cases",
    featureName: "4-Stage Dispute & Mediation Flow",
    whatItDoes:
      "Pauses milestone auto-release and guides parties through Negotiation, Evidence submission, Staff Mediation, and AACCSA Arbitration.",
    whyItIsUseful:
      "Protects locked escrow funds with transparent timelines and formal evidence records.",
    docTopicId: "doc-disputes",
  },
  "kyc-verification": {
    id: "kyc-verification",
    module: "verification",
    featureName: "Fayda Biometric & TIN Verification",
    whatItDoes:
      "Verifies identity via Fayda ID + eSignet biometric check (Tier 1) and Ethiopian TIN/business registration (Tier 2).",
    whyItIsUseful:
      "Unlocks hiring/bidding (Tier 1), payouts (Tier 2), and lowers withholding tax from 30% to the verified 3% rate.",
    docTopicId: "doc-kyc",
  },
};

export const HELP_DOC_TOPICS: HelpDocTopic[] = [
  {
    id: "doc-dashboard",
    module: "overview",
    title: "Dashboard, Pipeline & Calendar Views",
    category: "Workspace",
    summary:
      "Understand your KPI strip, Executive Analytics charts, Data Table, Kanban board, and dual Gregorian / Ethiopian Fiscal Calendar.",
    howItWorks: [
      "Executive Analytics shows real-time Wallet Balance, Protected Escrow, Active Milestones, and Open Briefs, plus cashflow and payment rail charts.",
      "Click any KPI card to expand its drill-down drawer with direct links to Wallet, Contracts, Kanban, or Jobs.",
      "Switch to Operations Pipeline to manage milestones in a sortable Data Table (with CSV export), a 5-stage Kanban board, or the Schedule Calendar.",
      "In the Calendar view, toggle between Gregorian dates and the Ethiopian Fiscal Calendar (Hamle 1 to Sene 30) with Q1-Q4 fiscal navigation.",
    ],
    tips: [
      "Charts show an empty state until your account has real escrow funding, top-ups, or milestone releases.",
      "Press Ctrl/Cmd + K anytime to jump directly between modules or Dashboard views.",
    ],
  },
  {
    id: "doc-jobs",
    module: "jobs",
    title: "Posting & Finding Project Briefs",
    category: "Hiring & Work",
    summary:
      "How clients publish escrow-ready briefs and how freelancers filter and apply to open opportunities.",
    howItWorks: [
      "Clients with Tier 1 KYC verified can publish briefs with a title, launch category, 20+ character scope, ETB min/max budget, and deadline.",
      "Freelancers and dual-role accounts browse open briefs using keyword search, category, ETB budget presets, and deadline windows.",
      "Submitting a proposal lets you propose a quoted ETB total, estimated days, cover letter, and attachments.",
    ],
    tips: [
      "Keep all negotiation and scope details inside Yekis; off-platform phone numbers or emails are masked.",
    ],
  },
  {
    id: "doc-proposals",
    module: "proposals",
    title: "Reviewing & Managing Proposals",
    category: "Hiring & Work",
    summary:
      "How clients shortlist or accept bids into contracts, and how freelancers track or withdraw proposals.",
    howItWorks: [
      "Clients see every published brief with all incoming freelancer proposals grouped underneath.",
      "Use Shortlist to mark top candidates before awarding, or Accept to create a bilateral contract immediately.",
      "Freelancers see all submitted bids under My Proposals and can withdraw Submitted or Shortlisted proposals before acceptance.",
    ],
    tips: [
      "Accepting one proposal automatically generates the contract and milestone breakdown in the Contracts module.",
    ],
  },
  {
    id: "doc-gigs",
    module: "gigs",
    title: "Gig Marketplace & Tiered Packages",
    category: "Services",
    summary:
      "Buy fixed-scope service packages (Basic, Standard, Premium) or publish your own seller gigs.",
    howItWorks: [
      "Browse active gigs by category, keyword, rating, price, or delivery time.",
      "Each gig offers up to three transparent tiers with fixed delivery days, included revisions, and ETB pricing.",
      "Ordering a gig locks the package total in escrow until the freelancer delivers and you approve.",
    ],
    tips: [
      "Freelancers and dual-role users can create and manage their own service packages from My Gigs.",
    ],
  },
  {
    id: "doc-contracts",
    module: "contracts",
    title: "Bilateral Contracts & E-Signatures",
    category: "Agreements",
    summary:
      "Execute AACCSA-aligned bilingual service agreements and manage milestone lifecycles.",
    howItWorks: [
      "Contracts begin in Awaiting Signatures until both the Client and Freelancer click Accept Agreement.",
      "Once executed, download the immutable Agreement PDF or open the Escrow Center filtered to that contract.",
      "Contracts carry a statutory 7-day cooling-off window before work starts, per Ethiopian Electronic Transactions Proclamation No. 1205/2020.",
    ],
    tips: [
      "Use Chat with Freelancer / Client directly from a contract card to open a scoped discussion thread.",
    ],
  },
  {
    id: "doc-escrow",
    module: "escrow",
    title: "Escrow Center, Auto-Release & Taxes",
    category: "Finance & Trust",
    summary:
      "Fund milestones safely, submit deliverables, and understand Ethiopian withholding tax and fee splits.",
    howItWorks: [
      "Clients fund each milestone from their ETB wallet once the contract is fully executed (state moves from Payment Pending to Escrow Held).",
      "Freelancers submit completed deliverables (Submitted for Review), starting a 120-hour client QA window.",
      "If no dispute is raised within 120 hours, escrow auto-releases to the freelancer. Expanding Tax & Fee Split previews the 5% platform fee and withholding tax (3% with verified TIN, 30% without).",
    ],
    tips: [
      "Always verify work before clicking Release Funds, or open a dispute before the 120-hour timer expires if deliverables are incomplete.",
    ],
  },
  {
    id: "doc-wallet",
    module: "wallet",
    title: "Wallet Top-Ups, 2FA Withdrawals & Receipts",
    category: "Finance & Trust",
    summary:
      "Deposit ETB via Telebirr, CBE Birr, or Safaricom M-Pesa, withdraw earnings securely, and print fiscal vouchers.",
    howItWorks: [
      "Top up using Manual Transfer (transfer to the displayed Yekis CBE, Telebirr, or M-Pesa account and upload your receipt) or Instant Checkout.",
      "To withdraw earnings, choose your payout rail, enter the ETB amount and destination account/phone, request a 6-digit approval OTP, and confirm.",
      "Every movement is recorded in Transaction Movements with downloadable Invoice & Escrow Receipts or Payout Vouchers.",
    ],
    tips: [
      "Tier 2 KYC verification is required for withdrawals and unlocks the 3% TIN withholding rate.",
    ],
  },
  {
    id: "doc-chat",
    module: "chat",
    title: "Protected Messaging & Mini-Me Co-Pilot",
    category: "Collaboration",
    summary:
      "Message counterparties or Yekis Support with real-time updates, attachments, and context-aware AI reply drafting.",
    howItWorks: [
      "Switch between All, Direct (project threads), and Support (staff help desk) conversations.",
      "Anti-circumvention filters detect and warn against off-platform phone numbers, emails, or external payment requests.",
      "Use Mini-Me Co-Pilot inside a thread to generate tone-matched smart replies, summarize long threads, or extract deal terms.",
    ],
    tips: [
      "Need platform help? Click New Chat and choose Support to reach an assigned Yekis support specialist.",
    ],
  },
  {
    id: "doc-profile",
    module: "profile",
    title: "Marketplace Profile & Readiness",
    category: "Identity",
    summary:
      "Present your verified credentials, primary skill, availability, and portfolio to win trust.",
    howItWorks: [
      "Your masthead shows your avatar, KYC verification tier, availability status, and verified contract stats.",
      "Click Edit Profile to upload a compressed photo, write a 50+ character bio, select up to 10 skills, and add portfolio projects.",
      "Double-blind reviews appear after both parties review or once the 14-day blind window closes.",
    ],
    tips: [
      "Reaching 85%+ profile completeness improves visibility across talent searches and proposals.",
    ],
  },
  {
    id: "doc-disputes",
    module: "cases",
    title: "Four-Stage Disputes & Mediation",
    category: "Protection",
    summary:
      "How Yekis freezes escrow and resolves milestone disagreements fairly.",
    howItWorks: [
      "Raising a dispute on an active milestone freezes the 120-hour auto-release clock immediately.",
      "Stage 1 (Negotiation): Parties have a negotiation window to settle directly before escalating.",
      "Stage 2 (Evidence): Both parties submit written statements and technical verification notes.",
      "Stage 3 (Mediation) & Stage 4 (AACCSA Arbitration): A Yekis mediator issues a recommendation, or parties escalate to binding AACCSA arbitration.",
    ],
    tips: [
      "Include milestone deliverable links and clear acceptance criteria comparisons in your Stage 2 evidence statement.",
    ],
  },
  {
    id: "doc-kyc",
    module: "verification",
    title: "Fayda KYC & Tier Progression",
    category: "Compliance",
    summary:
      "Verify identity with Fayda National ID and optional TIN/business registration.",
    howItWorks: [
      "Tier 1 requires your legal name, date of birth, Fayda ID number (FIN), ID photo/PDF, and Fayda eSignet biometric check.",
      "Tier 1 enables job posting, bidding, contracting, and gig ordering.",
      "Tier 2 adds your Ethiopian TIN or business registration for compliance review, unlocking withdrawals and the 3% withholding rate.",
    ],
    tips: [
      "Ensure all four corners of your Fayda card are crisp and legible in JPG, PNG, WebP, or PDF (up to 10 MB).",
    ],
  },
  {
    id: "doc-settings",
    module: "settings",
    title: "Security, Localization, Onboarding & Data Rights",
    category: "Account",
    summary:
      "Manage passwords, Google linking, 4-language switching, layout options, Yekis Guide progress, and PDPP export/erasure.",
    howItWorks: [
      "Security & Password lets you rotate passwords, revoke other active sessions, and link/unlink Google sign-in (with step-up auth).",
      "Preferences & Localization controls English, Amharic, Afaan Oromoo, and Tigrigna, timezone, theme, and Yekis Guide tour resets.",
      "Data & Account supports PDPP Art. 13 JSON data export and Art. 15 account deactivation once obligations are cleared.",
    ],
    tips: [
      "You can restart any individual module tour or reset all onboarding progress from Preferences or the Help menu.",
    ],
  },
];

export const KEYBOARD_SHORTCUTS: KeyboardShortcutItem[] = [
  {
    id: "shortcut-palette",
    keys: ["Ctrl / Cmd", "K"],
    description: "Open or close Quick Jump command palette",
    scope: "Global Workspace",
  },
  {
    id: "shortcut-help",
    keys: ["Shift", "?"],
    description: "Open or close the Yekis Guide Help menu",
    scope: "Global Workspace",
  },
  {
    id: "shortcut-esc",
    keys: ["Esc"],
    description: "Close active help popover, modal dialog, or exit product tour",
    scope: "Overlays & Tours",
  },
  {
    id: "shortcut-tour-next",
    keys: ["Right Arrow"],
    description: "Advance to the next step during an active product tour",
    scope: "Product Tour",
  },
  {
    id: "shortcut-tour-prev",
    keys: ["Left Arrow"],
    description: "Return to the previous step during an active product tour",
    scope: "Product Tour",
  },
  {
    id: "shortcut-tabs",
    keys: ["Left / Right Arrow", "Home / End"],
    description: "Switch tabs inside Settings and segmented toolbars",
    scope: "Tablists",
  },
];
