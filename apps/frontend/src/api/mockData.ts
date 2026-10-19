/* ────────────────────────────────────────────────────────────────────────
   mockData.ts — Stateful in-memory Ethiopian marketplace & Ops Console
   fallback store. Ensures all Client, Freelancer, Dual-Role, and Staff
   Operations Console views, charts, tables, Kanban boards, and calendars
   operate with rich, realistic data even when the backend DB is offline.
   ──────────────────────────────────────────────────────────────────────── */

import type {
  Job,
  MeResponse,
  Milestone,
  TopUpRequest,
  WalletResponse,
  Contract,
  Dispute,
  Gig,
  GigOrder,
  ChatConversation,
  ChatMessage,
  SkillSummary,
  SelfProfile,
} from "./client";

const DAY = 86_400_000;
const isoDaysAgo = (days: number) => new Date(Date.now() - days * DAY).toISOString();
const isoDaysFromNow = (days: number) => new Date(Date.now() + days * DAY).toISOString();

export type DemoWorkspaceRole = "CLIENT" | "FREELANCER" | "BOTH" | "ADMIN";

export const DEMO_USERS: Record<DemoWorkspaceRole, MeResponse> = {
  CLIENT: {
    id: "usr-client-01",
    ucid: "YEK-CL-1042",
    email: "abebe.kebede@abyssinia-tech.et",
    phone: "+251911234567",
    role: "CLIENT",
    staffRole: null,
    languagePreference: "en",
    kyc: { tier: "TIER_2", status: "VERIFIED" },
    wallet: { balanceMinor: 24850000 }, // ETB 248,500.00
  },
  FREELANCER: {
    id: "usr-free-01",
    ucid: "YEK-FL-2089",
    email: "hanna.tadesse@addisdev.et",
    phone: "+251922345678",
    role: "FREELANCER",
    staffRole: null,
    languagePreference: "en",
    kyc: { tier: "TIER_2", status: "VERIFIED" },
    wallet: { balanceMinor: 14280000 }, // ETB 142,800.00
  },
  BOTH: {
    id: "usr-both-01",
    ucid: "YEK-DL-3015",
    email: "dawit.mekonnen@ethio-digital.et",
    phone: "+251933456789",
    role: "BOTH",
    staffRole: null,
    languagePreference: "en",
    kyc: { tier: "TIER_3", status: "VERIFIED" },
    wallet: { balanceMinor: 31920000 }, // ETB 319,200.00
  },
  ADMIN: {
    id: "usr-admin-01",
    ucid: "YEK-ST-0001",
    email: "yonael.ops@yekis.et",
    phone: "+251911000111",
    role: "ADMIN",
    staffRole: "SUPER_ADMIN",
    languagePreference: "en",
    kyc: { tier: "TIER_3", status: "VERIFIED" },
    wallet: { balanceMinor: 0 },
  },
};

export interface KanbanTaskItem {
  id: string;
  title: string;
  contractTitle: string;
  partnerName: string;
  category: string;
  amountMinor: number;
  dueDate: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  rail: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
  column: "BACKLOG" | "ESCROW_HELD" | "WORK_IN_PROGRESS" | "SUBMITTED_FOR_REVIEW" | "RELEASED";
}

export interface CalendarScheduleEvent {
  id: string;
  title: string;
  project: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: "MILESTONE_DUE" | "PAYOUT_RELEASE" | "PROPOSAL_DEADLINE" | "KYC_REVIEW";
  amountMinor?: number;
  status: "UPCOMING" | "COMPLETED" | "URGENT";
  rail?: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
}

class MockStore {
  activeRole: DemoWorkspaceRole = (() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("yekis-demo-role") as DemoWorkspaceRole | null;
      if (saved && saved in DEMO_USERS) return saved;
    }
    return "BOTH";
  })();

  walletMinor = 31920000;

  skills: SkillSummary[] = [
    { id: "sk-1", name: "React & TypeScript", category: "WEB_APP_DEVELOPMENT" },
    { id: "sk-2", name: "Telebirr & Chapa API", category: "WEB_APP_DEVELOPMENT" },
    { id: "sk-3", name: "UI/UX & Figma Design", category: "GRAPHIC_DESIGN" },
    { id: "sk-4", name: "Amharic & Afaan Oromo Localization", category: "TRANSLATION" },
    { id: "sk-5", name: "Node.js & PostgreSQL", category: "WEB_APP_DEVELOPMENT" },
    { id: "sk-6", name: "SEO & Growth Marketing", category: "DIGITAL_MARKETING" },
  ];

  jobs: Job[] = [
    {
      id: "job-101",
      clientId: "usr-client-01",
      title: "Telebirr SuperApp Mini-Program & Escrow Checkout UI",
      description:
        "Design and implement a responsive React + TypeScript mini-app checkout module supporting Telebirr H5 web payment signing, automated webhook reconciliation, and Amharic/English localization.",
      category: "WEB_APP_DEVELOPMENT",
      budgetMinMinor: 6500000,
      budgetMaxMinor: 9500000,
      deadline: isoDaysFromNow(14),
      status: "OPEN",
      createdAt: isoDaysAgo(3),
    },
    {
      id: "job-102",
      clientId: "usr-client-02",
      title: "Addis Coffee Export Traceability Dashboard & ERP",
      description:
        "Build an executive supply-chain analytics portal tracking ECX coffee lots from Yirgacheffe and Sidama washing stations to Djibouti port dispatch with tabular ledger exports.",
      category: "WEB_APP_DEVELOPMENT",
      budgetMinMinor: 11000000,
      budgetMaxMinor: 16500000,
      deadline: isoDaysFromNow(21),
      status: "OPEN",
      createdAt: isoDaysAgo(5),
    },
    {
      id: "job-103",
      clientId: "usr-client-01",
      title: "Fayda National ID KYC Onboarding Flow & Brand System",
      description:
        "Create a high-contrast Figma component library and selfie verification onboarding UX compliant with Ethiopian National ID (Fayda eSignet) accessibility standards.",
      category: "GRAPHIC_DESIGN",
      budgetMinMinor: 4200000,
      budgetMaxMinor: 6000000,
      deadline: isoDaysFromNow(10),
      status: "OPEN",
      createdAt: isoDaysAgo(6),
    },
    {
      id: "job-104",
      clientId: "usr-client-03",
      title: "Amharic, Tigrinya & Afaan Oromo FinTech App Localization",
      description:
        "Translate and culturally adapt 1,850 mobile banking UI strings, legal terms, and customer support scripts with Ethiopic typography QA.",
      category: "TRANSLATION",
      budgetMinMinor: 2800000,
      budgetMaxMinor: 4000000,
      deadline: isoDaysFromNow(7),
      status: "OPEN",
      createdAt: isoDaysAgo(2),
    },
    {
      id: "job-105",
      clientId: "usr-client-02",
      title: "Bole Retail E-Commerce Performance Marketing Campaign",
      description:
        "Plan and execute a 60-day Telegram channel, TikTok, and Google Search conversion campaign for an Addis Ababa electronics retailer with weekly ROAS attribution.",
      category: "DIGITAL_MARKETING",
      budgetMinMinor: 3500000,
      budgetMaxMinor: 5500000,
      deadline: isoDaysFromNow(18),
      status: "OPEN",
      createdAt: isoDaysAgo(8),
    },
    {
      id: "job-106",
      clientId: "usr-client-01",
      title: "Regional Microfinance Loan Portfolio Data Normalization",
      description:
        "Audit, clean, and migrate 45,000 borrower repayment rows from legacy spreadsheets into validated PostgreSQL schemas with automated reconciliation checks.",
      category: "DATA_ENTRY",
      budgetMinMinor: 2200000,
      budgetMaxMinor: 3400000,
      deadline: isoDaysFromNow(12),
      status: "OPEN",
      createdAt: isoDaysAgo(4),
    },
  ];

  milestones: Milestone[] = [
    {
      id: "ms-201",
      contractId: "ctr-301",
      sequenceNumber: 1,
      title: "Phase 1: Architecture & Telebirr H5 Signing SDK",
      description: "Complete RSA-SHA256 signing module and sandbox webhook verification.",
      amountMinor: 4500000,
      dueDate: isoDaysAgo(10),
      escrowState: "RELEASED",
      deliverablePath: "/uploads/telebirr-sdk-v1.zip",
      submittedAt: isoDaysAgo(12),
      autoReleaseAt: isoDaysAgo(5),
      releasedAt: isoDaysAgo(9),
    },
    {
      id: "ms-202",
      contractId: "ctr-301",
      sequenceNumber: 2,
      title: "Phase 2: Multi-Rail Escrow Checkout & CBE Birr Flow",
      description: "Frontend checkout modal with live receipt OCR and fallback support.",
      amountMinor: 5000000,
      dueDate: isoDaysFromNow(4),
      escrowState: "SUBMITTED_FOR_REVIEW",
      deliverablePath: "/uploads/checkout-ui-bundle.zip",
      submittedAt: isoDaysAgo(1),
      autoReleaseAt: isoDaysFromNow(6),
      releasedAt: null,
    },
    {
      id: "ms-203",
      contractId: "ctr-302",
      sequenceNumber: 1,
      title: "Supply Chain Lot Tracking Schema & API Endpoints",
      description: "PostgreSQL schema for washing stations, hulling mills, and export lots.",
      amountMinor: 6200000,
      dueDate: isoDaysFromNow(6),
      escrowState: "WORK_IN_PROGRESS",
      deliverablePath: null,
      submittedAt: null,
      autoReleaseAt: null,
      releasedAt: null,
    },
    {
      id: "ms-204",
      contractId: "ctr-302",
      sequenceNumber: 2,
      title: "Executive ECX Analytics & Container Dispatch Map",
      description: "Interactive charts and PDF export for customs documentation.",
      amountMinor: 5800000,
      dueDate: isoDaysFromNow(15),
      escrowState: "ESCROW_HELD",
      deliverablePath: null,
      submittedAt: null,
      autoReleaseAt: null,
      releasedAt: null,
    },
    {
      id: "ms-205",
      contractId: "ctr-303",
      sequenceNumber: 1,
      title: "Amharic & Afaan Oromo Terminology Glossary & Core UI",
      description: " Complete translation of core wallet, KYC, and contract screens.",
      amountMinor: 2900000,
      dueDate: isoDaysAgo(4),
      escrowState: "RELEASED",
      deliverablePath: "/uploads/locales-et-v1.json",
      submittedAt: isoDaysAgo(6),
      autoReleaseAt: isoDaysAgo(1),
      releasedAt: isoDaysAgo(3),
    },
    {
      id: "ms-206",
      contractId: "ctr-304",
      sequenceNumber: 1,
      title: "Fayda eSignet Biometric Liveness Flow Wireframes",
      description: "Figma interactive prototype for mobile and Telegram Mini App.",
      amountMinor: 3800000,
      dueDate: isoDaysFromNow(2),
      escrowState: "ESCROW_HELD",
      deliverablePath: null,
      submittedAt: null,
      autoReleaseAt: null,
      releasedAt: null,
    },
    {
      id: "ms-207",
      contractId: "ctr-305",
      sequenceNumber: 1,
      title: "M-Pesa Till Reconciliation & Automated Ledger Rules",
      description: "Double-entry ledger journal generator with withholding tax calculation.",
      amountMinor: 4100000,
      dueDate: isoDaysFromNow(9),
      escrowState: "PAYMENT_PENDING",
      deliverablePath: null,
      submittedAt: null,
      autoReleaseAt: null,
      releasedAt: null,
    },
    {
      id: "ms-208",
      contractId: "ctr-306",
      sequenceNumber: 1,
      title: "Legacy Inventory ERP API Connector",
      description: "Disputed over incomplete barcode scanner batch endpoint.",
      amountMinor: 2750000,
      dueDate: isoDaysAgo(5),
      escrowState: "DISPUTED",
      deliverablePath: "/uploads/erp-bridge-draft.zip",
      submittedAt: isoDaysAgo(7),
      autoReleaseAt: null,
      releasedAt: null,
    },
  ];

  topUps: TopUpRequest[] = [
    {
      id: "tu-401",
      userId: "usr-both-01",
      amountMinor: 12500000,
      provider: "TELEBIRR",
      senderName: "Dawit Mekonnen",
      referenceNumber: "TB-20261014-88412",
      status: "APPROVED",
      createdAt: isoDaysAgo(7),
      reviewedAt: isoDaysAgo(7),
      rejectionReason: null,
    },
    {
      id: "tu-402",
      userId: "usr-both-01",
      amountMinor: 9500000,
      provider: "CBE_BIRR",
      senderName: "Dawit Mekonnen",
      referenceNumber: "FT26288XK910",
      status: "APPROVED",
      createdAt: isoDaysAgo(3),
      reviewedAt: isoDaysAgo(3),
      rejectionReason: null,
    },
    {
      id: "tu-403",
      userId: "usr-both-01",
      amountMinor: 4500000,
      provider: "M_PESA",
      senderName: "Dawit Mekonnen",
      referenceNumber: "RJK91M28LP",
      status: "PENDING_REVIEW",
      createdAt: isoDaysAgo(0.4),
      reviewedAt: null,
      rejectionReason: null,
    },
  ];

  kanbanTasks: KanbanTaskItem[] = [
    {
      id: "kb-1",
      title: "M-Pesa Till Reconciliation & Tax Rules",
      contractTitle: "FinTech Ledger Automation",
      partnerName: "Awash Digital Solutions",
      category: "Web App Development",
      amountMinor: 4100000,
      dueDate: isoDaysFromNow(9),
      priority: "MEDIUM",
      rail: "M_PESA",
      column: "BACKLOG",
    },
    {
      id: "kb-2",
      title: "Fayda Biometric Liveness Wireframes",
      contractTitle: "National ID KYC Onboarding",
      partnerName: "Selam Design Studio",
      category: "UI/UX Design",
      amountMinor: 3800000,
      dueDate: isoDaysFromNow(2),
      priority: "HIGH",
      rail: "TELEBIRR",
      column: "ESCROW_HELD",
    },
    {
      id: "kb-3",
      title: "Executive ECX Analytics & Container Map",
      contractTitle: "Addis Coffee Export ERP",
      partnerName: "Yirga Agritech PLC",
      category: "Web App Development",
      amountMinor: 5800000,
      dueDate: isoDaysFromNow(15),
      priority: "MEDIUM",
      rail: "CBE_BIRR",
      column: "ESCROW_HELD",
    },
    {
      id: "kb-4",
      title: "Supply Chain Lot Tracking Schema & API",
      contractTitle: "Addis Coffee Export ERP",
      partnerName: "Yirga Agritech PLC",
      category: "Web App Development",
      amountMinor: 6200000,
      dueDate: isoDaysFromNow(6),
      priority: "HIGH",
      rail: "CBE_BIRR",
      column: "WORK_IN_PROGRESS",
    },
    {
      id: "kb-5",
      title: "Amharic & Tigrinya Notification Templates",
      contractTitle: "Omnichannel Bot Localization",
      partnerName: "EthioTelecom Partner Hub",
      category: "Translation",
      amountMinor: 1950000,
      dueDate: isoDaysFromNow(5),
      priority: "LOW",
      rail: "TELEBIRR",
      column: "WORK_IN_PROGRESS",
    },
    {
      id: "kb-6",
      title: "Multi-Rail Escrow Checkout & CBE Birr Flow",
      contractTitle: "Telebirr SuperApp Mini-Program",
      partnerName: "Abyssinia Commerce",
      category: "Web App Development",
      amountMinor: 5000000,
      dueDate: isoDaysFromNow(4),
      priority: "HIGH",
      rail: "TELEBIRR",
      column: "SUBMITTED_FOR_REVIEW",
    },
    {
      id: "kb-7",
      title: "Architecture & Telebirr H5 Signing SDK",
      contractTitle: "Telebirr SuperApp Mini-Program",
      partnerName: "Abyssinia Commerce",
      category: "Web App Development",
      amountMinor: 4500000,
      dueDate: isoDaysAgo(10),
      priority: "HIGH",
      rail: "TELEBIRR",
      column: "RELEASED",
    },
    {
      id: "kb-8",
      title: "Amharic & Afaan Oromo Core Glossary",
      contractTitle: "FinTech Mobile Localization",
      partnerName: "Zemen Microfinance",
      category: "Translation",
      amountMinor: 2900000,
      dueDate: isoDaysAgo(4),
      priority: "MEDIUM",
      rail: "CBE_BIRR",
      column: "RELEASED",
    },
  ];

  calendarEvents: CalendarScheduleEvent[] = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = (day: number) => `${y}-${m}-${String(Math.min(28, Math.max(1, day))).padStart(2, "0")}`;
    const todayNum = now.getDate();

    return [
      {
        id: "ev-1",
        title: "Milestone Review: Multi-Rail Escrow Checkout",
        project: "Telebirr SuperApp Mini-Program",
        date: d(todayNum),
        time: "14:00 EAT",
        type: "MILESTONE_DUE",
        amountMinor: 5000000,
        status: "URGENT",
        rail: "TELEBIRR",
      },
      {
        id: "ev-2",
        title: "Auto-Release Payout Window: Phase 1 SDK",
        project: "Abyssinia Commerce Contract",
        date: d(todayNum + 2),
        time: "10:30 EAT",
        type: "PAYOUT_RELEASE",
        amountMinor: 4500000,
        status: "UPCOMING",
        rail: "TELEBIRR",
      },
      {
        id: "ev-3",
        title: "Fayda Biometric Wireframes Delivery",
        project: "National ID KYC Portal",
        date: d(todayNum + 3),
        time: "17:00 EAT",
        type: "MILESTONE_DUE",
        amountMinor: 3800000,
        status: "UPCOMING",
        rail: "CBE_BIRR",
      },
      {
        id: "ev-4",
        title: "Supply Chain Lot Tracking Schema Demo",
        project: "Addis Coffee Export ERP",
        date: d(todayNum + 6),
        time: "11:00 EAT",
        type: "MILESTONE_DUE",
        amountMinor: 6200000,
        status: "UPCOMING",
        rail: "CBE_BIRR",
      },
      {
        id: "ev-5",
        title: "Proposal Bidding Closes: Localization Brief",
        project: "Amharic & Afaan Oromo FinTech App",
        date: d(todayNum + 7),
        time: "18:00 EAT",
        type: "PROPOSAL_DEADLINE",
        amountMinor: 4000000,
        status: "UPCOMING",
      },
      {
        id: "ev-6",
        title: "Tier 2 TIN & Fayda Compliance Audit",
        project: "Yekis Trust & Safety",
        date: d(Math.max(1, todayNum - 2)),
        time: "09:30 EAT",
        type: "KYC_REVIEW",
        status: "COMPLETED",
      },
      {
        id: "ev-7",
        title: "M-Pesa Escrow Funding Settlement",
        project: "FinTech Ledger Automation",
        date: d(todayNum + 9),
        time: "15:00 EAT",
        type: "PAYOUT_RELEASE",
        amountMinor: 4100000,
        status: "UPCOMING",
        rail: "M_PESA",
      },
    ];
  })();

  getCurrentUser(): MeResponse {
    const base = DEMO_USERS[this.activeRole] ?? DEMO_USERS.BOTH;
    return {
      ...base,
      wallet: { balanceMinor: this.walletMinor },
    };
  }

  setRole(role: DemoWorkspaceRole) {
    this.activeRole = role;
    this.walletMinor = DEMO_USERS[role].wallet?.balanceMinor ?? 24850000;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("yekis-demo-role", role);
    }
  }

  getContracts(): Contract[] {
    return [
      {
        id: "ctr-301",
        jobId: "job-101",
        clientId: "usr-client-01",
        freelancerId: "usr-free-01",
        templateVersion: "v2.4-ET",
        clientAcceptedAt: isoDaysAgo(14),
        freelancerAcceptedAt: isoDaysAgo(14),
        fullyExecuted: true,
        status: "ACTIVE",
        cancellableUntil: null,
        createdAt: isoDaysAgo(14),
        job: {
          id: "job-101",
          title: "Telebirr SuperApp Mini-Program & Escrow Checkout UI",
          status: "IN_PROGRESS",
        },
        milestones: this.milestones.filter((m) => m.contractId === "ctr-301"),
      },
      {
        id: "ctr-302",
        jobId: "job-102",
        clientId: "usr-client-01",
        freelancerId: "usr-both-01",
        templateVersion: "v2.4-ET",
        clientAcceptedAt: isoDaysAgo(9),
        freelancerAcceptedAt: isoDaysAgo(9),
        fullyExecuted: true,
        status: "ACTIVE",
        cancellableUntil: null,
        createdAt: isoDaysAgo(9),
        job: {
          id: "job-102",
          title: "Addis Coffee Export Traceability Dashboard & ERP",
          status: "IN_PROGRESS",
        },
        milestones: this.milestones.filter((m) => m.contractId === "ctr-302"),
      },
      {
        id: "ctr-303",
        jobId: "job-104",
        clientId: "usr-both-01",
        freelancerId: "usr-free-01",
        templateVersion: "v2.4-ET",
        clientAcceptedAt: isoDaysAgo(12),
        freelancerAcceptedAt: isoDaysAgo(12),
        fullyExecuted: true,
        status: "COMPLETED",
        cancellableUntil: null,
        createdAt: isoDaysAgo(12),
        job: {
          id: "job-104",
          title: "Amharic, Tigrinya & Afaan Oromo FinTech App Localization",
          status: "COMPLETED",
        },
        milestones: this.milestones.filter((m) => m.contractId === "ctr-303"),
      },
    ];
  }

  getGigs(): Gig[] {
    return [
      {
        id: "gig-501",
        freelancerId: "usr-free-01",
        title: "I will integrate Telebirr, CBE Birr & M-Pesa into your React or Node app",
        category: "WEB_APP_DEVELOPMENT",
        description:
          "Production-ready Ethiopian payment gateway integration with cryptographic webhook validation, automatic reconciliation, and sandbox test suite.",
        tags: ["Telebirr", "CBE Birr", "M-Pesa", "Node.js", "React"],
        requirements: [{ label: "Merchant API credentials & callback URL", type: "TEXT", required: true }],
        faqJson: [{ question: "Do you support H5 Mini-Apps?", answer: "Yes, both native H5 and web redirect flows." }],
        thumbnailUrl: "/marketing/yekis-collaboration-banner.png",
        mediaUrls: [],
        status: "ACTIVE",
        autoAcceptOrders: true,
        maxRevisions: 3,
        viewCount: 1420,
        ratingAverage: 4.95,
        ratingCount: 38,
        createdAt: isoDaysAgo(20),
        freelancer: {
          id: "usr-free-01",
          displayName: "Hanna Tadesse",
          avatarUrl: null,
          bio: "Senior Full-Stack & FinTech Engineer in Addis Ababa",
          profileCompleteness: 98,
        },
        packages: [
          {
            id: "pkg-1",
            tier: "BASIC",
            title: "Single Rail Setup",
            description: "Telebirr or CBE Birr checkout + webhook verification",
            deliveryDays: 4,
            revisionsIncluded: 2,
            priceMinor: 1800000,
          },
          {
            id: "pkg-2",
            tier: "STANDARD",
            title: "Multi-Rail + Ledger",
            description: "Telebirr + CBE + M-Pesa with reconciliation table",
            deliveryDays: 7,
            revisionsIncluded: 3,
            priceMinor: 3500000,
          },
          {
            id: "pkg-3",
            tier: "PREMIUM",
            title: "Full Escrow Suite",
            description: "End-to-end escrow state machine, payouts & admin UI",
            deliveryDays: 14,
            revisionsIncluded: 5,
            priceMinor: 6800000,
          },
        ],
      },
      {
        id: "gig-502",
        freelancerId: "usr-both-01",
        title: "I will design a high-converting SaaS dashboard & Figma design system",
        category: "GRAPHIC_DESIGN",
        description:
          "Clean shadcn/ui and Tailwind CSS component architecture with light/dark mode tokens, Ethiopic font pairing, and interactive prototypes.",
        tags: ["Figma", "shadcn/ui", "Dashboard", "UI/UX"],
        requirements: [{ label: "Brand guidelines & target user personas", type: "TEXT", required: true }],
        faqJson: null,
        thumbnailUrl: "/marketing/yekis-cta-workspace.png",
        mediaUrls: [],
        status: "ACTIVE",
        autoAcceptOrders: true,
        maxRevisions: 4,
        viewCount: 980,
        ratingAverage: 4.9,
        ratingCount: 24,
        createdAt: isoDaysAgo(15),
        freelancer: {
          id: "usr-both-01",
          displayName: "Dawit Mekonnen",
          avatarUrl: null,
          bio: "Product Designer & Frontend Architect",
          profileCompleteness: 95,
        },
        packages: [
          {
            id: "pkg-4",
            tier: "BASIC",
            title: "Core Dashboard Screen",
            description: "Up to 3 key views with responsive layout & dark mode",
            deliveryDays: 3,
            revisionsIncluded: 2,
            priceMinor: 1500000,
          },
          {
            id: "pkg-5",
            tier: "STANDARD",
            title: "Full SaaS Workspace",
            description: "8 screens + shadcn component kit + interactive prototype",
            deliveryDays: 7,
            revisionsIncluded: 4,
            priceMinor: 3200000,
          },
        ],
      },
    ];
  }

  getDisputes(): Dispute[] {
    return [
      {
        id: "dsp-601",
        contractId: "ctr-306",
        milestoneId: "ms-208",
        category: "QUALITY_OF_WORK",
        stage: "STAGE_3_MEDIATION",
        description:
          "Batch barcode scanner endpoint returns timeout on payloads above 500 SKUs. Freelancer has proposed a streaming fix within 48 hours.",
        negotiationDeadlineAt: isoDaysAgo(2),
        mediationDeadlineAt: isoDaysFromNow(3),
        mediatorRecommendation:
          "Release 70% upon verified streaming patch deployment; refund 30% for 4-day SLA delay.",
        resolutionOutcome: null,
        createdAt: isoDaysAgo(5),
        contract: {
          id: "ctr-306",
          clientId: "usr-client-01",
          freelancerId: "usr-free-02",
          job: { title: "Legacy Inventory ERP API Connector" },
        },
        milestone: {
          id: "ms-208",
          title: "Legacy Inventory ERP API Connector",
          amountMinor: 2750000,
          escrowState: "DISPUTED",
        },
        evidence: [
          {
            id: "evd-1",
            submittedByUserId: "usr-client-01",
            statement: "Load test logs showing 504 timeout at 650 concurrent SKU items.",
            createdAt: isoDaysAgo(4),
          },
          {
            id: "evd-2",
            submittedByUserId: "usr-free-02",
            statement: "Patch PR #42 uploaded with chunked cursor pagination reducing latency to 140ms.",
            createdAt: isoDaysAgo(2),
          },
        ],
      },
    ];
  }

  getConversations(): ChatConversation[] {
    return [
      {
        id: "conv-701",
        subject: "Telebirr SuperApp Mini-Program — Phase 2 Review",
        status: "OPEN",
        createdAt: isoDaysAgo(5),
        updatedAt: isoDaysAgo(0.1),
        latestMessage: {
          body: "I have uploaded the Phase 2 CBE Birr fallback build for your review.",
          createdAt: isoDaysAgo(0.1),
          senderId: "usr-free-01",
        },
        otherParticipant: {
          id: "usr-free-01",
          email: "hanna.tadesse@addisdev.et",
          role: "FREELANCER",
          displayName: "Hanna Tadesse",
        },
        isSupport: false,
        unread: true,
        assignedStaff: null,
      },
      {
        id: "conv-702",
        subject: "Addis Coffee Export ERP — Schema Sign-off",
        status: "OPEN",
        createdAt: isoDaysAgo(3),
        updatedAt: isoDaysAgo(1),
        latestMessage: {
          body: "Washing station lot codes match ECX export manifest format. Proceeding to chart view.",
          createdAt: isoDaysAgo(1),
          senderId: "usr-client-01",
        },
        otherParticipant: {
          id: "usr-client-01",
          email: "abebe.kebede@abyssinia-tech.et",
          role: "CLIENT",
          displayName: "Abebe Kebede",
        },
        isSupport: false,
        unread: false,
        assignedStaff: null,
      },
    ];
  }

  getMessages(conversationId: string): ChatMessage[] {
    return [
      {
        id: "msg-1",
        conversationId,
        senderId: "usr-client-01",
        body: "Selam Hanna! Everything looks solid on the RSA signature verification. How is the CBE Birr receipt fallback coming along?",
        createdAt: isoDaysAgo(1.2),
        sender: {
          id: "usr-client-01",
          email: "abebe.kebede@abyssinia-tech.et",
          role: "CLIENT",
          staffRole: null,
          displayName: "Abebe Kebede",
        },
      },
      {
        id: "msg-2",
        conversationId,
        senderId: "usr-free-01",
        body: "Selam Abebe! I have uploaded the Phase 2 CBE Birr fallback build for your review. Ready for escrow release whenever you verify.",
        createdAt: isoDaysAgo(0.1),
        sender: {
          id: "usr-free-01",
          email: "hanna.tadesse@addisdev.et",
          role: "FREELANCER",
          staffRole: null,
          displayName: "Hanna Tadesse",
        },
      },
    ];
  }

  /* ── Operations Console Mock Responses ────────────────────────────────── */
  handleApiFallback(path: string, method: string, bodyRaw?: unknown): unknown {
    const cleanPath = path.replace(/^\/api\/v1/, "").split("?")[0];
    const parsedBody = (() => {
      if (!bodyRaw) return undefined;
      if (typeof bodyRaw === "string") {
        try {
          return JSON.parse(bodyRaw) as Record<string, unknown>;
        } catch {
          return undefined;
        }
      }
      return bodyRaw as Record<string, unknown>;
    })();

    // Auth & Session
    if (cleanPath === "/users/me" || cleanPath === "/auth/me") {
      return this.getCurrentUser();
    }
    if (cleanPath === "/auth/phone/code") {
      return {
        sent: true,
        expiresAt: new Date(Date.now() + 300_000).toISOString(),
        retryAfterSec: 30,
        devCode: "482910",
      };
    }
    if (cleanPath === "/auth/phone/verify") {
      return { verified: true };
    }
    if (cleanPath.startsWith("/auth/")) {
      if (parsedBody?.role && (parsedBody.role === "CLIENT" || parsedBody.role === "FREELANCER" || parsedBody.role === "BOTH" || parsedBody.role === "ADMIN")) {
        this.setRole(parsedBody.role);
      } else if (typeof parsedBody?.email === "string") {
        const lower = parsedBody.email.toLowerCase();
        if (lower.includes("admin") || lower.includes("ops")) {
          this.setRole("ADMIN");
        } else if (lower.includes("free") || lower.includes("hanna")) {
          this.setRole("FREELANCER");
        } else if (lower.includes("client") || lower.includes("abebe")) {
          this.setRole("CLIENT");
        }
      }
      const user = this.getCurrentUser();
      return {
        id: user.id,
        ucid: user.ucid,
        accessToken: "mock-jwt-access-token",
        refreshToken: "mock-jwt-refresh-token",
        user,
      };
    }

    // Wallet & TopUps
    if (cleanPath === "/escrow/wallet") {
      return { balanceMinor: this.walletMinor } satisfies WalletResponse;
    }
    if (cleanPath === "/wallet/topups" && method === "GET") {
      return this.topUps;
    }
    if (cleanPath.startsWith("/wallet/topups") && method === "POST") {
      const added: TopUpRequest = {
        id: `tu-${Date.now()}`,
        userId: this.getCurrentUser().id,
        amountMinor: 5000000,
        provider: "TELEBIRR",
        referenceNumber: `TB-${Date.now().toString().slice(-6)}`,
        status: "APPROVED",
        createdAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        rejectionReason: null,
      };
      this.topUps = [added, ...this.topUps];
      this.walletMinor += added.amountMinor;
      return { redirectUrl: null, topUpId: added.id, ...added };
    }

    // Jobs & Milestones
    if (cleanPath === "/jobs/mine") {
      return this.jobs;
    }
    if (cleanPath === "/jobs/proposals/mine" || cleanPath.endsWith("/proposals")) {
      return [];
    }
    if (cleanPath === "/jobs" && method === "GET") {
      return { items: this.jobs, total: this.jobs.length, page: 1, pageSize: 20 };
    }
    if (cleanPath === "/jobs" && method === "POST") {
      const payload = parsedBody;
      const newJob: Job = {
        id: `job-${Date.now()}`,
        clientId: this.getCurrentUser().id,
        title: String(payload?.title || "New Marketplace Brief"),
        description: String(payload?.description || "Scoped milestone deliverable."),
        category: String(payload?.category || "WEB_APP_DEVELOPMENT"),
        budgetMinMinor: Number((payload?.budgetMin as { amountMinor?: number })?.amountMinor || payload?.budgetMinMinor || 3000000),
        budgetMaxMinor: Number((payload?.budgetMax as { amountMinor?: number })?.amountMinor || payload?.budgetMaxMinor || 6000000),
        deadline: String(payload?.deadline || isoDaysFromNow(14)),
        status: "OPEN",
        createdAt: new Date().toISOString(),
      };
      this.jobs = [newJob, ...this.jobs];
      return newJob;
    }
    if (cleanPath === "/contracts/milestones" || cleanPath === "/escrow/milestones") {
      return this.milestones;
    }
    if (cleanPath === "/contracts") {
      return this.getContracts();
    }

    // Gigs
    if (cleanPath === "/gigs/mine") {
      return this.getGigs();
    }
    if (cleanPath.startsWith("/gigs/orders")) {
      const orders: GigOrder[] = [
        {
          id: "go-801",
          gigId: "gig-501",
          packageId: "pkg-2",
          clientId: "usr-client-01",
          status: "IN_PROGRESS",
          escrowState: "WORK_IN_PROGRESS",
          revisionStatus: "NONE",
          revisionsUsed: 0,
          totalChargeMinor: 3500000,
          createdAt: isoDaysAgo(2),
          gig: {
            id: "gig-501",
            title: "I will integrate Telebirr, CBE Birr & M-Pesa into your React or Node app",
            freelancerId: "usr-free-01",
          },
        },
      ];
      return orders;
    }
    if (cleanPath.startsWith("/gigs")) {
      const gigs = this.getGigs();
      return { items: gigs, data: gigs, total: gigs.length, page: 1, pageSize: 20 };
    }
    if (cleanPath === "/users/me/profile/completeness") {
      return { profileCompleteness: 96 };
    }

    // Skills, Featured, Profile
    if (cleanPath === "/skills") {
      return this.skills;
    }
    if (cleanPath === "/featured") {
      return [
        {
          id: "ft-1",
          userId: "usr-free-01",
          displayName: "Hanna Tadesse",
          primarySkill: "Full-Stack & FinTech Engineering",
          ratingAverage: 4.95,
          completedContracts: 38,
          bio: "Specialist in Telebirr, CBE Birr, and enterprise React/Node architectures.",
        },
        {
          id: "ft-2",
          userId: "usr-both-01",
          displayName: "Dawit Mekonnen",
          primarySkill: "Product UI/UX & Design Systems",
          ratingAverage: 4.92,
          completedContracts: 29,
          bio: "Designing accessible financial & logistics products for East Africa.",
        },
        {
          id: "ft-3",
          userId: "usr-free-03",
          displayName: "Meron Alemu",
          primarySkill: "Amharic & Afaan Oromo Localization",
          ratingAverage: 5.0,
          completedContracts: 51,
          bio: "Certified fintech, legal, and medical translator for Ethiopian languages.",
        },
      ];
    }
    if (cleanPath.includes("/profile")) {
      const u = this.getCurrentUser();
      const prof: SelfProfile = {
        id: u.id,
        displayName:
          this.activeRole === "CLIENT"
            ? "Abebe Kebede"
            : this.activeRole === "FREELANCER"
              ? "Hanna Tadesse"
              : this.activeRole === "ADMIN"
                ? "Yonael Ops Lead"
                : "Dawit Mekonnen",
        firstName: "Dawit",
        lastName: "Mekonnen",
        bio: "Building resilient escrow-backed software and digital products across Ethiopia.",
        avatarUrl: null,
        profileCompleteness: 96,
        isAvailableForWork: true,
        profileVisibility: "PUBLIC",
        primarySkillId: "sk-1",
        skills: this.skills.slice(0, 4),
        isOwnProfile: true,
      };
      return prof;
    }

    // KYC, Disputes, Chat, Notifications
    if (cleanPath === "/kyc/status") {
      return { tier: "TIER_2", status: "VERIFIED" };
    }
    if (cleanPath === "/disputes" && method === "GET") {
      return this.getDisputes();
    }
    if (cleanPath === "/chat/conversations") {
      return this.getConversations();
    }
    if (cleanPath.startsWith("/chat/conversations/") && cleanPath.endsWith("/messages")) {
      return this.getMessages("conv-701");
    }
    if (cleanPath.startsWith("/notifications")) {
      return {
        items: [
          {
            id: "ntf-1",
            title: "Milestone Submitted for Review",
            body: "Hanna Tadesse submitted Phase 2: Multi-Rail Escrow Checkout (ETB 50,000).",
            readAt: null,
            createdAt: isoDaysAgo(0.2),
            type: "MILESTONE_SUBMITTED",
          },
          {
            id: "ntf-2",
            title: "Telebirr Escrow Funded",
            body: "ETB 62,000.00 locked in escrow for Addis Coffee Export ERP.",
            readAt: isoDaysAgo(1),
            createdAt: isoDaysAgo(2),
            type: "ESCROW_FUNDED",
          },
        ],
        unreadCount: 1,
      };
    }

    /* ── Admin / Operations Console Endpoints ─────────────────────────── */
    if (cleanPath === "/admin/permissions/matrix") {
      return {
        permissions: [
          "DASHBOARD_VIEW",
          "USERS_VIEW",
          "USERS_MANAGE",
          "STAFF_MANAGE",
          "CONTRACTS_VIEW",
          "ESCROW_VIEW",
          "PAYMENTS_VIEW",
          "PAYOUTS_VIEW",
          "PAYOUTS_SETTLE",
          "RECONCILIATION_VIEW",
          "LEDGER_VIEW",
          "REPORTS_VIEW",
          "AUDIT_VIEW",
          "MONITORING_VIEW",
        ],
        roles: {
          SUPER_ADMIN: [
            "DASHBOARD_VIEW",
            "USERS_VIEW",
            "USERS_MANAGE",
            "STAFF_MANAGE",
            "CONTRACTS_VIEW",
            "ESCROW_VIEW",
            "PAYMENTS_VIEW",
            "PAYOUTS_VIEW",
            "PAYOUTS_SETTLE",
            "RECONCILIATION_VIEW",
            "LEDGER_VIEW",
            "REPORTS_VIEW",
            "AUDIT_VIEW",
            "MONITORING_VIEW",
          ],
        },
      };
    }

    if (cleanPath === "/admin/dashboard/summary") {
      return {
        metrics: {
          totalUsers: 2840,
          activeContracts: 142,
          fundsInEscrowMinor: 184250000, // ETB 1,842,500
          pendingPayouts: 6,
          openDisputes: 3,
          pendingIdentity: 8,
          openSupportTickets: 4,
          pendingPayments: 5,
          pendingTopUps: 3,
        },
        recentActivity: [
          {
            id: "act-1",
            eventType: "ESCROW_FUNDED",
            action: "ESCROW_DEPOSIT_CONFIRMED",
            entityType: "Milestone",
            entityId: "ms-204",
            createdAt: isoDaysAgo(0.05),
            actorRole: "CLIENT",
            amountMinor: 5800000,
          },
          {
            id: "act-2",
            eventType: "PAYOUT_SETTLED",
            action: "PAYOUT_CONFIRMED_TELEBIRR",
            entityType: "Payout",
            entityId: "po-901",
            createdAt: isoDaysAgo(0.2),
            actorRole: "FINANCE_ADMIN",
            amountMinor: 4050000,
          },
          {
            id: "act-3",
            eventType: "KYC_VERIFIED",
            action: "FAYDA_TIER2_APPROVED",
            entityType: "User",
            entityId: "usr-free-01",
            createdAt: isoDaysAgo(0.5),
            actorRole: "COMPLIANCE_OFFICER",
            amountMinor: null,
          },
          {
            id: "act-4",
            eventType: "DISPUTE_ESCALATED",
            action: "DISPUTE_STAGE_3_MEDIATION",
            entityType: "Dispute",
            entityId: "dsp-601",
            createdAt: isoDaysAgo(1.1),
            actorRole: "DISPUTE_MEDIATOR",
            amountMinor: 2750000,
          },
        ],
      };
    }

    if (cleanPath === "/admin/monitoring/health") {
      return {
        checks: {
          database: { ok: true, detail: "PostgreSQL 16 primary replica healthy (4.2ms)" },
          redis: { ok: true, detail: "BullMQ worker queues nominal (0 stalled)" },
          objectStore: { ok: true, detail: "S3 bucket yekis-vault-et reachable" },
          telebirrConfigured: { ok: true, detail: "H5 RSA gateway & CBE webhook active" },
        },
        ledger: {
          debitsMinor: 642800000,
          creditsMinor: 642800000,
          isBalanced: true,
        },
        checkedAt: new Date().toISOString(),
      };
    }

    if (cleanPath === "/admin/payments") {
      const items = [
        {
          id: "pay-1",
          provider: "TELEBIRR",
          providerTransactionId: "TB26101899201",
          amountMinor: 5000000,
          status: "SUCCESS",
          createdAt: isoDaysAgo(0.5),
          milestone: {
            id: "ms-202",
            title: "Phase 2: Multi-Rail Escrow Checkout",
            contract: {
              id: "ctr-301",
              client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
              freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse" },
              job: { title: "Telebirr SuperApp Mini-Program" },
            },
          },
        },
        {
          id: "pay-2",
          provider: "CBE_BIRR",
          providerTransactionId: "FT26289C8831",
          amountMinor: 6200000,
          status: "SUCCESS",
          createdAt: isoDaysAgo(2),
          milestone: {
            id: "ms-203",
            title: "Supply Chain Lot Tracking Schema",
            contract: {
              id: "ctr-302",
              client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
              freelancer: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen" },
              job: { title: "Addis Coffee Export ERP" },
            },
          },
        },
        {
          id: "pay-3",
          provider: "M_PESA",
          providerTransactionId: "RJK91M28LP",
          amountMinor: 3800000,
          status: "SUCCESS",
          createdAt: isoDaysAgo(4),
          milestone: {
            id: "ms-206",
            title: "Fayda Biometric Liveness Wireframes",
            contract: {
              id: "ctr-304",
              client: { id: "usr-client-02", email: "solomon@zemenbank.et", displayName: "Solomon T." },
              freelancer: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen" },
              job: { title: "Fayda National ID KYC Onboarding" },
            },
          },
        },
        {
          id: "pay-4",
          provider: "TELEBIRR",
          providerTransactionId: "TB26101144109",
          amountMinor: 4500000,
          status: "SUCCESS",
          createdAt: isoDaysAgo(9),
          milestone: {
            id: "ms-201",
            title: "Phase 1: Architecture & Telebirr H5 SDK",
            contract: {
              id: "ctr-301",
              client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
              freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse" },
              job: { title: "Telebirr SuperApp Mini-Program" },
            },
          },
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/escrows") {
      const items = [
        {
          id: "ms-202",
          title: "Phase 2: Multi-Rail Escrow Checkout",
          amountMinor: 5000000,
          escrowState: "SUBMITTED_FOR_REVIEW",
          createdAt: isoDaysAgo(3),
          contract: {
            id: "ctr-301",
            job: { title: "Telebirr SuperApp Mini-Program" },
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
            freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse" },
          },
          paymentTransactions: [{ provider: "TELEBIRR", providerTransactionId: "TB26101899201", status: "SUCCESS" }],
        },
        {
          id: "ms-203",
          title: "Supply Chain Lot Tracking Schema",
          amountMinor: 6200000,
          escrowState: "WORK_IN_PROGRESS",
          createdAt: isoDaysAgo(5),
          contract: {
            id: "ctr-302",
            job: { title: "Addis Coffee Export ERP" },
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
            freelancer: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen" },
          },
          paymentTransactions: [{ provider: "CBE_BIRR", providerTransactionId: "FT26289C8831", status: "SUCCESS" }],
        },
        {
          id: "ms-204",
          title: "Executive ECX Analytics & Container Map",
          amountMinor: 5800000,
          escrowState: "ESCROW_HELD",
          createdAt: isoDaysAgo(6),
          contract: {
            id: "ctr-302",
            job: { title: "Addis Coffee Export ERP" },
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
            freelancer: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen" },
          },
          paymentTransactions: [{ provider: "CBE_BIRR", providerTransactionId: "FT26289C8839", status: "SUCCESS" }],
        },
        {
          id: "ms-208",
          title: "Legacy Inventory ERP API Connector",
          amountMinor: 2750000,
          escrowState: "DISPUTED",
          createdAt: isoDaysAgo(8),
          contract: {
            id: "ctr-306",
            job: { title: "Legacy Inventory ERP API Connector" },
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
            freelancer: { id: "usr-free-02", email: "bereket@coders.et", displayName: "Bereket Haile" },
          },
          paymentTransactions: [{ provider: "M_PESA", providerTransactionId: "RJK88A12LP", status: "SUCCESS" }],
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/payouts") {
      const items = [
        {
          id: "po-901",
          amountMinor: 4500000,
          feeMinor: 450000,
          netAmountMinor: 4050000,
          provider: "TELEBIRR",
          providerPayoutId: "TB-OUT-88219",
          payoutAccountIdentifier: "+251922345678",
          status: "CONFIRMED",
          errorMessage: null,
          createdAt: isoDaysAgo(1),
          user: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse" },
        },
        {
          id: "po-902",
          amountMinor: 2900000,
          feeMinor: 290000,
          netAmountMinor: 2610000,
          provider: "CBE_BIRR",
          providerPayoutId: null,
          payoutAccountIdentifier: "1000449281723",
          status: "PENDING",
          errorMessage: null,
          createdAt: isoDaysAgo(0.3),
          user: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen" },
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/reconciliation") {
      const items = [
        {
          id: "rec-1",
          provider: "TELEBIRR",
          providerTransactionId: "TB26101899201",
          amountMinor: 5000000,
          status: "SUCCESS",
          createdAt: isoDaysAgo(0.5),
          reconciliationStatus: "MATCHED",
          differenceMinor: 0,
          milestone: { escrowState: "SUBMITTED_FOR_REVIEW" },
        },
        {
          id: "rec-2",
          provider: "CBE_BIRR",
          providerTransactionId: "FT26289C8831",
          amountMinor: 6200000,
          status: "SUCCESS",
          createdAt: isoDaysAgo(2),
          reconciliationStatus: "MATCHED",
          differenceMinor: 0,
          milestone: { escrowState: "WORK_IN_PROGRESS" },
        },
        {
          id: "rec-3",
          provider: "M_PESA",
          providerTransactionId: "RJK91M28LP",
          amountMinor: 3800000,
          status: "SUCCESS",
          createdAt: isoDaysAgo(4),
          reconciliationStatus: "PENDING",
          differenceMinor: null,
          milestone: { escrowState: "ESCROW_HELD" },
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/ledger") {
      return {
        accounts: [
          { id: "acc-1", code: "1010", name: "Telebirr Trust Settlement Asset", type: "ASSET", currency: "ETB", balanceMinor: 384200000 },
          { id: "acc-2", code: "1020", name: "CBE Commercial Escrow Custody", type: "ASSET", currency: "ETB", balanceMinor: 258600000 },
          { id: "acc-3", code: "2010", name: "Client Escrow Liability Pool", type: "LIABILITY", currency: "ETB", balanceMinor: 492500000 },
          { id: "acc-4", code: "2020", name: "Freelancer Payable Clearing", type: "LIABILITY", currency: "ETB", balanceMinor: 98400000 },
          { id: "acc-5", code: "2030", name: "MOR Withholding Tax Payable", type: "LIABILITY", currency: "ETB", balanceMinor: 12400000 },
          { id: "acc-6", code: "4010", name: "Platform Commission Revenue (10%)", type: "REVENUE", currency: "ETB", balanceMinor: 39500000 },
        ],
        journalCount: 418,
        integrity: {
          isBalanced: true,
          totalEntries: 836,
          totalDebitsMinor: 642800000,
          totalCreditsMinor: 642800000,
          discrepancyMinor: 0,
        },
      };
    }

    if (cleanPath === "/admin/ledger/journals") {
      const items = [
        {
          id: "jrn-101",
          description: "Escrow Lock — Telebirr SuperApp Phase 2 (TB26101899201)",
          referenceType: "MILESTONE_ESCROW",
          referenceId: "ms-202",
          postedAt: isoDaysAgo(0.5),
          totalDebitsMinor: 5000000,
          totalCreditsMinor: 5000000,
        },
        {
          id: "jrn-102",
          description: "Milestone Release & 10% Commission Split — Phase 1 SDK",
          referenceType: "PAYOUT_SETTLEMENT",
          referenceId: "po-901",
          postedAt: isoDaysAgo(1),
          totalDebitsMinor: 4500000,
          totalCreditsMinor: 4500000,
        },
        {
          id: "jrn-103",
          description: "CBE Birr Custody Deposit — Addis Coffee Export ERP",
          referenceType: "MILESTONE_ESCROW",
          referenceId: "ms-203",
          postedAt: isoDaysAgo(2),
          totalDebitsMinor: 6200000,
          totalCreditsMinor: 6200000,
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/reports/summary") {
      return {
        financial: {
          transactionVolumeMinor: 642800000,
          releasedFundsMinor: 412000000,
          refundedFundsMinor: 14500000,
          payoutsMinor: 370800000,
          platformFeesMinor: 39500000,
          withholdingMinor: 12400000,
          failedPaymentCount: 2,
          failedPayoutCount: 1,
        },
        marketplace: {
          clientCount: 980,
          freelancerCount: 1860,
          totalContracts: 312,
          contractsByStatus: { ACTIVE: 142, COMPLETED: 158, TERMINATED: 8, CANCELLED: 4 },
          openDisputes: 3,
          openRiskFlags: 2,
        },
        generatedAt: new Date().toISOString(),
      };
    }

    if (cleanPath === "/admin/users") {
      const items = [
        {
          id: "usr-client-01",
          ucid: "YEK-CL-1042",
          email: "abebe.kebede@abyssinia-tech.et",
          phone: "+251911234567",
          displayName: "Abebe Kebede",
          role: "CLIENT",
          staffRole: null,
          isSuspended: false,
          cachedKycTier: "TIER_2",
          cachedKycStatus: "VERIFIED",
          createdAt: isoDaysAgo(45),
        },
        {
          id: "usr-free-01",
          ucid: "YEK-FL-2089",
          email: "hanna.tadesse@addisdev.et",
          phone: "+251922345678",
          displayName: "Hanna Tadesse",
          role: "FREELANCER",
          staffRole: null,
          isSuspended: false,
          cachedKycTier: "TIER_2",
          cachedKycStatus: "VERIFIED",
          createdAt: isoDaysAgo(60),
        },
        {
          id: "usr-both-01",
          ucid: "YEK-DL-3015",
          email: "dawit.mekonnen@ethio-digital.et",
          phone: "+251933456789",
          displayName: "Dawit Mekonnen",
          role: "BOTH",
          staffRole: null,
          isSuspended: false,
          cachedKycTier: "TIER_3",
          cachedKycStatus: "VERIFIED",
          createdAt: isoDaysAgo(30),
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath.startsWith("/admin/users/")) {
      return {
        user: {
          id: "usr-free-01",
          email: "hanna.tadesse@addisdev.et",
          phone: "+251922345678",
          displayName: "Hanna Tadesse",
          cachedKycTier: "TIER_2",
          cachedKycStatus: "VERIFIED",
          profileCompleteness: 98,
        },
        walletBalance: 14280000,
        activity: {
          jobsPosted: 2,
          proposalsSubmitted: 19,
          contractsAsClient: 1,
          contractsAsFreelancer: 14,
          gigsOwned: 3,
          gigOrders: 38,
        },
      };
    }

    if (cleanPath === "/admin/staff") {
      const items = [
        {
          id: "usr-admin-01",
          ucid: "YEK-ST-0001",
          email: "yonael.ops@yekis.et",
          displayName: "Yonael Mindaye",
          role: "BOTH",
          staffRole: "SUPER_ADMIN",
          isSuspended: false,
        },
        {
          id: "usr-staff-02",
          ucid: "YEK-ST-0002",
          email: "selam.finance@yekis.et",
          displayName: "Selamawit Bekele",
          role: "CLIENT",
          staffRole: "FINANCE_ADMIN",
          isSuspended: false,
        },
        {
          id: "usr-staff-03",
          ucid: "YEK-ST-0003",
          email: "kaleb.mediation@yekis.et",
          displayName: "Kaleb Girma",
          role: "FREELANCER",
          staffRole: "DISPUTE_MEDIATOR",
          isSuspended: false,
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/contracts") {
      const items = [
        {
          id: "ctr-301",
          status: "ACTIVE",
          createdAt: isoDaysAgo(14),
          client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede", role: "CLIENT" },
          freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse", role: "FREELANCER" },
          job: { id: "job-101", title: "Telebirr SuperApp Mini-Program", category: "WEB_APP_DEVELOPMENT" },
          _count: { milestones: 2 },
        },
        {
          id: "ctr-302",
          status: "ACTIVE",
          createdAt: isoDaysAgo(9),
          client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede", role: "CLIENT" },
          freelancer: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen", role: "BOTH" },
          job: { id: "job-102", title: "Addis Coffee Export ERP", category: "WEB_APP_DEVELOPMENT" },
          _count: { milestones: 2 },
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath.startsWith("/admin/contracts/")) {
      return {
        contract: {
          id: "ctr-301",
          status: "ACTIVE",
          createdAt: isoDaysAgo(14),
          jobTitle: "Telebirr SuperApp Mini-Program",
          jobCategory: "WEB_APP_DEVELOPMENT",
        },
        parties: {
          client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
          freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse" },
        },
        milestones: [
          { id: "ms-201", title: "Phase 1: Architecture & Telebirr H5 SDK", amountMinor: 4500000, escrowState: "RELEASED" },
          { id: "ms-202", title: "Phase 2: Multi-Rail Escrow Checkout", amountMinor: 5000000, escrowState: "SUBMITTED_FOR_REVIEW" },
        ],
        payments: [
          { provider: "TELEBIRR", amountMinor: 4500000, status: "SUCCESS", createdAt: isoDaysAgo(12), milestone: { title: "Phase 1" } },
          { provider: "TELEBIRR", amountMinor: 5000000, status: "SUCCESS", createdAt: isoDaysAgo(3), milestone: { title: "Phase 2" } },
        ],
        disputes: [],
        totals: { escrowHeldMinor: 5000000, milestoneCount: 2 },
      };
    }

    if (cleanPath === "/kyc/review-queue") {
      return [
        {
          id: "kyc-1",
          userId: "usr-free-04",
          tier: "TIER_2",
          status: "UNDER_REVIEW",
          fullName: "Yohannes Tesfaye",
          documentNumber: "FIN-8839-2019-ET",
          tin: "0049182736",
          businessRegNumber: null,
          isPepMatch: false,
          faydaVerificationAttempted: true,
          faydaVerificationSucceeded: true,
          rejectionReason: null,
          updatedAt: isoDaysAgo(0.4),
          user: { id: "usr-free-04", email: "yohannes.t@addiscloud.et", ucid: "YEK-FL-4102" },
          documents: [
            { id: "doc-1", documentType: "NATIONAL_ID", uploadedAt: isoDaysAgo(0.4) },
            { id: "doc-2", documentType: "SELFIE_LIVENESS", uploadedAt: isoDaysAgo(0.4) },
          ],
        },
      ];
    }

    if (cleanPath === "/disputes/staff/queue") {
      return [
        {
          id: "dsp-601",
          category: "QUALITY_OF_WORK",
          stage: "STAGE_3_MEDIATION",
          description: "Batch barcode scanner endpoint timeout above 500 SKUs.",
          negotiationDeadlineAt: isoDaysAgo(2),
          mediationDeadlineAt: isoDaysFromNow(2),
          createdAt: isoDaysAgo(5),
          evidence: [
            { id: "ev-1", submittedByUserId: "usr-client-01", statement: "504 gateway timeout log attached.", createdAt: isoDaysAgo(4) },
          ],
          contract: {
            id: "ctr-306",
            job: { title: "Legacy Inventory ERP API Connector" },
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et" },
            freelancer: { id: "usr-free-02", email: "bereket@coders.et" },
            milestones: [{ id: "ms-208", title: "ERP API Connector", amountMinor: 2750000, deliverableUrl: "/uploads/erp-bridge.zip" }],
          },
        },
      ];
    }

    if (cleanPath === "/tms/queue") {
      return [
        {
          id: "flg-1",
          type: "VELOCITY",
          status: "PENDING_REVIEW",
          createdAt: isoDaysAgo(0.6),
          reviewNotes: null,
          strReferenceNumber: null,
          details: { releasesInWindow: 5, windowHours: 24, totalAmountMinor: 19500000 },
          user: {
            id: "usr-client-09",
            email: "finance@redsea-import.et",
            phone: "+251911889900",
            ucid: "YEK-CL-1920",
            kyc: { tier: "TIER_2", status: "VERIFIED" },
            wallet: { balanceMinor: 42000000 },
            transactionFlags: [{ id: "flg-1", type: "VELOCITY", status: "PENDING_REVIEW", createdAt: isoDaysAgo(0.6), strFiledAt: null }],
          },
        },
      ];
    }

    if (cleanPath === "/staff/reports") {
      return {
        data: [
          {
            id: "rep-1",
            reason: "OFF_PLATFORM_CONTACT",
            details: "Requested direct Telegram handle in proposal cover letter.",
            status: "PENDING",
            staffNotes: null,
            createdAt: isoDaysAgo(1),
            reportedUser: { id: "usr-free-08", ucid: "YEK-FL-2911", displayName: "Natnael G." },
          },
        ],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      };
    }

    if (cleanPath === "/wallet/topups/queue") {
      return {
        items: [
          {
            id: "tu-403",
            provider: "M_PESA",
            amountMinor: 4500000,
            referenceNumber: "RJK91M28LP",
            status: "PENDING_REVIEW",
            rejectionReason: null,
            receiptImagePath: "/payment/mpesa.svg",
            createdAt: isoDaysAgo(0.4),
            user: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", phone: "+251933456789", ucid: "YEK-DL-3015" },
            userHistory: { approvedCount: 12, approvedTotalMinor: 98500000, rejectedCount: 0 },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      };
    }

    if (cleanPath === "/admin/audit-logs") {
      const items = [
        {
          id: "aud-1",
          userId: "usr-admin-01",
          eventType: "PAYOUT_CONFIRMED",
          entityType: "Payout",
          entityId: "po-901",
          actorRole: "SUPER_ADMIN",
          action: "SETTLE_TELEBIRR_PAYOUT",
          amountMinor: 4050000,
          ipAddress: "196.188.42.19",
          createdAt: isoDaysAgo(0.2),
        },
        {
          id: "aud-2",
          userId: "usr-staff-03",
          eventType: "DISPUTE_MEDIATION_NOTE",
          entityType: "Dispute",
          entityId: "dsp-601",
          actorRole: "DISPUTE_MEDIATOR",
          action: "POST_RECOMMENDATION",
          amountMinor: 2750000,
          ipAddress: "196.188.42.22",
          createdAt: isoDaysAgo(1.1),
        },
      ];
      return { items, total: items.length, page: 1, limit: 25 };
    }

    if (cleanPath === "/chat/admin/conversations") {
      return {
        items: [
          {
            id: "sup-1",
            subject: "CBE Birr Receipt Reference Verification",
            status: "OPEN",
            updatedAt: isoDaysAgo(0.2),
            creator: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", role: "BOTH" },
            assignedStaff: { id: "usr-admin-01", name: "Yonael Ops" },
            messages: [{ body: "Hello, I uploaded FT26289C8831 for our coffee ERP escrow milestone.", createdAt: isoDaysAgo(0.2) }],
          },
        ],
        total: 1,
        page: 1,
        pageSize: 25,
      };
    }

    return {};
  }
}

export const mockStore = new MockStore();
