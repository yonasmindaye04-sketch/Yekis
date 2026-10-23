/* ────────────────────────────────────────────────────────────────────────
   mockData.ts — Stateful in-memory Ethiopian marketplace & Ops Console
   fallback store. Ensures all Client, Freelancer, Dual-Role, and Staff
   Operations Console views, charts, tables, Kanban boards, calendars,
   proposals, contracts, escrow milestones, gigs, disputes, portfolios,
   reviews, chat, and notifications operate with rich, realistic data.
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
  Proposal,
  NotificationItem,
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

  skills: (SkillSummary & { nameEn: string; nameAm: string })[] = [
    { id: "sk-1", name: "React & TypeScript", nameEn: "React & TypeScript", nameAm: "ሪአክት እና ታይፕስክሪፕት", category: "WEB_APP_DEVELOPMENT" },
    { id: "sk-2", name: "Telebirr & CBE Birr API", nameEn: "Telebirr & CBE Birr API", nameAm: "የቴሌብር እና ሲቢኢ ብር ኤፒአይ", category: "WEB_APP_DEVELOPMENT" },
    { id: "sk-3", name: "UI/UX & Figma Design", nameEn: "UI/UX & Figma Design", nameAm: "የገጽታ ዲዛይን (Figma)", category: "GRAPHIC_DESIGN" },
    { id: "sk-4", name: "Amharic & Afaan Oromo Localization", nameEn: "Amharic & Afaan Oromo Localization", nameAm: "የአማርኛ እና አፋን ኦሮሞ ትርጉም", category: "TRANSLATION" },
    { id: "sk-5", name: "Node.js & PostgreSQL", nameEn: "Node.js & PostgreSQL", nameAm: "ኖድ ጄኤስ እና ፖስትግሬስ", category: "WEB_APP_DEVELOPMENT" },
    { id: "sk-6", name: "SEO & Growth Marketing", nameEn: "SEO & Growth Marketing", nameAm: "ዲጂታል ግብይት እና ኤስኢኦ", category: "DIGITAL_MARKETING" },
    { id: "sk-7", name: "Telegram Mini-App Engineering", nameEn: "Telegram Mini-App Engineering", nameAm: "የቴሌግራም ሚኒ-አፕ ልማት", category: "WEB_APP_DEVELOPMENT" },
    { id: "sk-8", name: "Brand Identity & Packaging", nameEn: "Brand Identity & Packaging", nameAm: "የብራንድ ማንነት እና ዲዛይን", category: "GRAPHIC_DESIGN" },
    { id: "sk-9", name: "B2B Copywriting & Grant Proposals", nameEn: "B2B Copywriting & Grant Proposals", nameAm: "የይዘት ጽሑፍ እና ፕሮፖዛል", category: "CONTENT_WRITING" },
    { id: "sk-10", name: "Financial Data ETL & Reconciliation", nameEn: "Financial Data ETL & Reconciliation", nameAm: "የፋይናንስ ዳታ ትንተና", category: "DATA_ENTRY" },
  ];

  jobs: (Job & { _count?: { proposals?: number } })[] = [
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
      proposalsCount: 3,
      _count: { proposals: 3 },
    },
    {
      id: "job-102",
      clientId: "usr-client-01",
      title: "Addis Coffee Export Traceability Dashboard & ERP",
      description:
        "Build an executive supply-chain analytics portal tracking ECX coffee lots from Yirgacheffe and Sidama washing stations to Djibouti port dispatch with tabular ledger exports.",
      category: "WEB_APP_DEVELOPMENT",
      budgetMinMinor: 11000000,
      budgetMaxMinor: 16500000,
      deadline: isoDaysFromNow(21),
      status: "OPEN",
      createdAt: isoDaysAgo(5),
      proposalsCount: 2,
      _count: { proposals: 2 },
    },
    {
      id: "job-103",
      clientId: "usr-both-01",
      title: "Fayda National ID KYC Onboarding Flow & Brand System",
      description:
        "Create a high-contrast Figma component library and selfie verification onboarding UX compliant with Ethiopian National ID (Fayda eSignet) accessibility standards.",
      category: "GRAPHIC_DESIGN",
      budgetMinMinor: 4200000,
      budgetMaxMinor: 6000000,
      deadline: isoDaysFromNow(10),
      status: "OPEN",
      createdAt: isoDaysAgo(6),
      proposalsCount: 2,
      _count: { proposals: 2 },
    },
    {
      id: "job-104",
      clientId: "usr-client-01",
      title: "Amharic, Tigrinya & Afaan Oromo FinTech App Localization",
      description:
        "Translate and culturally adapt 1,850 mobile banking UI strings, legal terms, and customer support scripts with Ethiopic typography QA.",
      category: "TRANSLATION",
      budgetMinMinor: 2800000,
      budgetMaxMinor: 4000000,
      deadline: isoDaysFromNow(7),
      status: "OPEN",
      createdAt: isoDaysAgo(2),
      proposalsCount: 1,
      _count: { proposals: 1 },
    },
    {
      id: "job-105",
      clientId: "usr-both-01",
      title: "Bole Retail E-Commerce Performance Marketing Campaign",
      description:
        "Plan and execute a 60-day Telegram channel, TikTok, and Google Search conversion campaign for an Addis Ababa electronics retailer with weekly ROAS attribution.",
      category: "DIGITAL_MARKETING",
      budgetMinMinor: 3500000,
      budgetMaxMinor: 5500000,
      deadline: isoDaysFromNow(18),
      status: "OPEN",
      createdAt: isoDaysAgo(8),
      proposalsCount: 1,
      _count: { proposals: 1 },
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
      proposalsCount: 1,
      _count: { proposals: 1 },
    },
    {
      id: "job-107",
      clientId: "usr-both-01",
      title: "NGO Annual Impact Report & Amharic/English Editorial Copy",
      description:
        "Write, edit, and structure a 40-page bilingual annual report covering rural solar electrification and agricultural cooperatives across Amhara, Oromia, and SNNPR.",
      category: "CONTENT_WRITING",
      budgetMinMinor: 3000000,
      budgetMaxMinor: 4800000,
      deadline: isoDaysFromNow(16),
      status: "OPEN",
      createdAt: isoDaysAgo(1),
      proposalsCount: 1,
      _count: { proposals: 1 },
    },
  ];

  proposals: Proposal[] = [
    {
      id: "prp-101",
      jobId: "job-101",
      freelancerId: "usr-free-01",
      coverLetter:
        "I have built 4 production Telebirr H5 Mini-Apps with RSA-SHA256 webhook verification and automatic reconciliation. I can deliver both the checkout UI and sandbox test suite in 10 days.",
      quotedAmountMinor: 8200000,
      estimatedDays: 10,
      milestoneBreakdown: [
        {
          title: "Phase 1: Telebirr H5 Signing & Checkout UI",
          amount: { amountMinor: 4200000, currency: "ETB" },
          dueDate: isoDaysFromNow(5),
        },
        {
          title: "Phase 2: Webhook Reconciliation & Amharic QA",
          amount: { amountMinor: 4000000, currency: "ETB" },
          dueDate: isoDaysFromNow(10),
        },
      ],
      status: "SHORTLISTED",
      createdAt: isoDaysAgo(2),
      freelancer: {
        id: "usr-free-01",
        ucid: "YEK-FL-2089",
        email: "hanna.tadesse@addisdev.et",
      },
      job: {
        id: "job-101",
        title: "Telebirr SuperApp Mini-Program & Escrow Checkout UI",
        status: "OPEN",
        clientId: "usr-client-01",
      },
    },
    {
      id: "prp-102",
      jobId: "job-101",
      freelancerId: "usr-both-01",
      coverLetter:
        "Senior Frontend & FinTech Architect here. I will deliver a mobile-first checkout experience with CBE Birr receipt OCR fallback and complete bilingual tokens.",
      quotedAmountMinor: 7800000,
      estimatedDays: 9,
      milestoneBreakdown: [
        {
          title: "Complete Multi-Rail Checkout & Receipt Flow",
          amount: { amountMinor: 7800000, currency: "ETB" },
          dueDate: isoDaysFromNow(9),
        },
      ],
      status: "SUBMITTED",
      createdAt: isoDaysAgo(1.5),
      freelancer: {
        id: "usr-both-01",
        ucid: "YEK-DL-3015",
        email: "dawit.mekonnen@ethio-digital.et",
      },
      job: {
        id: "job-101",
        title: "Telebirr SuperApp Mini-Program & Escrow Checkout UI",
        status: "OPEN",
        clientId: "usr-client-01",
      },
    },
    {
      id: "prp-103",
      jobId: "job-102",
      freelancerId: "usr-free-01",
      coverLetter:
        "Experienced with ECX lot tracking and PostgreSQL geospatial queries. Ready to build the washing-station-to-Djibouti container dispatch ledger and PDF customs manifest exporter.",
      quotedAmountMinor: 13500000,
      estimatedDays: 16,
      milestoneBreakdown: [
        {
          title: "Database Schema & Washing Station Ingestion API",
          amount: { amountMinor: 6500000, currency: "ETB" },
          dueDate: isoDaysFromNow(8),
        },
        {
          title: "Executive Analytics Dashboard & Customs Export",
          amount: { amountMinor: 7000000, currency: "ETB" },
          dueDate: isoDaysFromNow(16),
        },
      ],
      status: "SUBMITTED",
      createdAt: isoDaysAgo(2.5),
      freelancer: {
        id: "usr-free-01",
        ucid: "YEK-FL-2089",
        email: "hanna.tadesse@addisdev.et",
      },
      job: {
        id: "job-102",
        title: "Addis Coffee Export Traceability Dashboard & ERP",
        status: "OPEN",
        clientId: "usr-client-01",
      },
    },
    {
      id: "prp-104",
      jobId: "job-103",
      freelancerId: "usr-free-04",
      coverLetter:
        "Our Addis design studio specializes in accessible biometric eKYC flows and Ethiopic design systems. We include interactive Figma variables for both dark and light mode.",
      quotedAmountMinor: 5100000,
      estimatedDays: 8,
      milestoneBreakdown: [
        {
          title: "Fayda eSignet Biometric Wireframes & Figma Component Kit",
          amount: { amountMinor: 5100000, currency: "ETB" },
          dueDate: isoDaysFromNow(8),
        },
      ],
      status: "SHORTLISTED",
      createdAt: isoDaysAgo(3),
      freelancer: {
        id: "usr-free-04",
        ucid: "YEK-FL-4102",
        email: "nahom.girma@addisdesign.et",
      },
      job: {
        id: "job-103",
        title: "Fayda National ID KYC Onboarding Flow & Brand System",
        status: "OPEN",
        clientId: "usr-both-01",
      },
    },
    {
      id: "prp-105",
      jobId: "job-104",
      freelancerId: "usr-free-03",
      coverLetter:
        "Certified Ethiopian financial translator with 50+ completed fintech localization contracts. I provide glossary alignment across Amharic, Afaan Oromo, and Tigrinya.",
      quotedAmountMinor: 3400000,
      estimatedDays: 6,
      milestoneBreakdown: [
        {
          title: "1,850 UI Strings & Legal Glossary Translation",
          amount: { amountMinor: 3400000, currency: "ETB" },
          dueDate: isoDaysFromNow(6),
        },
      ],
      status: "SUBMITTED",
      createdAt: isoDaysAgo(1),
      freelancer: {
        id: "usr-free-03",
        ucid: "YEK-FL-3890",
        email: "meron.alemu@lexethiopia.et",
      },
      job: {
        id: "job-104",
        title: "Amharic, Tigrinya & Afaan Oromo FinTech App Localization",
        status: "OPEN",
        clientId: "usr-client-01",
      },
    },
    {
      id: "prp-106",
      jobId: "job-105",
      freelancerId: "usr-free-01",
      coverLetter:
        "I have built barcode and POS inventory sync pipelines for 3 Addis retail chains using chunked streaming and idempotent upserts.",
      quotedAmountMinor: 6400000,
      estimatedDays: 11,
      milestoneBreakdown: [
        {
          title: "Phase 1: POS Webhook & Barcode Batch Ingestion",
          amount: { amountMinor: 3200000, currency: "ETB" },
          dueDate: isoDaysFromNow(5),
        },
        {
          title: "Phase 2: Automated Stock Reconciliation & Alerting",
          amount: { amountMinor: 3200000, currency: "ETB" },
          dueDate: isoDaysFromNow(11),
        },
      ],
      status: "SUBMITTED",
      createdAt: isoDaysAgo(1.2),
      freelancer: {
        id: "usr-free-01",
        ucid: "YEK-FL-2089",
        email: "hanna.tadesse@addisdev.et",
      },
      job: {
        id: "job-105",
        title: "Telegram Bot & Mini-App for Addis Logistics Fleet Dispatch",
        status: "OPEN",
        clientId: "usr-client-01",
      },
    },
    {
      id: "prp-107",
      jobId: "job-106",
      freelancerId: "usr-both-01",
      coverLetter:
        "Ready to normalize all 45,000 microfinance borrower rows with automated TIN/phone validation and zero-downtime PostgreSQL migration scripts.",
      quotedAmountMinor: 2850000,
      estimatedDays: 7,
      milestoneBreakdown: [
        {
          title: "Cleaned PostgreSQL Dump & Validation Audit Report",
          amount: { amountMinor: 2850000, currency: "ETB" },
          dueDate: isoDaysFromNow(7),
        },
      ],
      status: "SHORTLISTED",
      createdAt: isoDaysAgo(0.8),
      freelancer: {
        id: "usr-both-01",
        ucid: "YEK-DL-3015",
        email: "dawit.mekonnen@ethio-digital.et",
      },
      job: {
        id: "job-106",
        title: "Regional Microfinance Loan Portfolio Data Normalization",
        status: "OPEN",
        clientId: "usr-client-01",
      },
    },
    {
      id: "prp-108",
      jobId: "job-107",
      freelancerId: "usr-free-03",
      coverLetter:
        "Experienced bilingual editorial lead for development NGOs across Ethiopia. Will deliver both English and natural Amharic layout-ready copy.",
      quotedAmountMinor: 3900000,
      estimatedDays: 10,
      milestoneBreakdown: [
        {
          title: "40-Page Bilingual Annual Impact Report Copy & Proofread",
          amount: { amountMinor: 3900000, currency: "ETB" },
          dueDate: isoDaysFromNow(10),
        },
      ],
      status: "SUBMITTED",
      createdAt: isoDaysAgo(0.5),
      freelancer: {
        id: "usr-free-03",
        ucid: "YEK-FL-3890",
        email: "meron.alemu@lexethiopia.et",
      },
      job: {
        id: "job-107",
        title: "NGO Annual Impact Report & Amharic/English Editorial Copy",
        status: "OPEN",
        clientId: "usr-both-01",
      },
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
      description: "Complete translation of core wallet, KYC, and contract screens.",
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
      dueDate: isoDaysFromNow(5),
      escrowState: "PAYMENT_PENDING",
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

  contractsMeta: Array<{
    id: string;
    jobId: string;
    clientId: string;
    freelancerId: string;
    templateVersion: string;
    clientAcceptedAt: string | null;
    freelancerAcceptedAt: string | null;
    fullyExecuted: boolean;
    status: string;
    cancellableUntil: string | null;
    createdAt: string;
    job: { id: string; title: string; status: string };
  }> = [
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
    },
    {
      id: "ctr-305",
      jobId: "job-106",
      clientId: "usr-both-01",
      freelancerId: "usr-free-01",
      templateVersion: "v2.4-ET",
      clientAcceptedAt: isoDaysAgo(4),
      freelancerAcceptedAt: isoDaysAgo(4),
      fullyExecuted: true,
      status: "ACTIVE",
      cancellableUntil: null,
      createdAt: isoDaysAgo(4),
      job: {
        id: "job-106",
        title: "FinTech M-Pesa Till Reconciliation & Automated Ledger",
        status: "IN_PROGRESS",
      },
    },
    {
      id: "ctr-304",
      jobId: "job-103",
      clientId: "usr-client-01",
      freelancerId: "usr-both-01",
      templateVersion: "v2.4-ET",
      clientAcceptedAt: isoDaysAgo(1),
      freelancerAcceptedAt: null,
      fullyExecuted: false,
      status: "ACTIVE",
      cancellableUntil: isoDaysFromNow(1),
      createdAt: isoDaysAgo(1),
      job: {
        id: "job-103",
        title: "Fayda National ID KYC Onboarding Flow & Brand System",
        status: "IN_PROGRESS",
      },
    },
    {
      id: "ctr-306",
      jobId: "job-105",
      clientId: "usr-client-01",
      freelancerId: "usr-free-01",
      templateVersion: "v2.4-ET",
      clientAcceptedAt: isoDaysAgo(11),
      freelancerAcceptedAt: isoDaysAgo(11),
      fullyExecuted: true,
      status: "ACTIVE",
      cancellableUntil: null,
      createdAt: isoDaysAgo(11),
      job: {
        id: "job-105",
        title: "Legacy Inventory ERP API Connector",
        status: "IN_PROGRESS",
      },
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
    {
      id: "tu-404",
      userId: "usr-client-01",
      amountMinor: 8000000,
      provider: "CBE_BIRR",
      senderName: "Abebe Kebede",
      referenceNumber: "FT26290AB774",
      status: "PENDING_REVIEW",
      createdAt: isoDaysAgo(0.2),
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

  gigs: Gig[] = [
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
    {
      id: "gig-503",
      freelancerId: "usr-free-03",
      title: "I will localize your app or website into natural Amharic, Afaan Oromo & Tigrinya",
      category: "TRANSLATION",
      description:
        "Human localization for fintech, e-commerce, and NGO platforms with Ethiopic typography QA and cultural adaptation.",
      tags: ["Amharic", "Afaan Oromo", "Tigrinya", "Localization"],
      requirements: [{ label: "JSON/CSV string file or Figma link", type: "TEXT", required: true }],
      faqJson: null,
      thumbnailUrl: "/marketing/yekis-collaboration-banner.png",
      mediaUrls: [],
      status: "ACTIVE",
      autoAcceptOrders: true,
      maxRevisions: 3,
      viewCount: 840,
      ratingAverage: 5.0,
      ratingCount: 51,
      createdAt: isoDaysAgo(18),
      freelancer: {
        id: "usr-free-03",
        displayName: "Meron Alemu",
        avatarUrl: null,
        bio: "Certified Ethiopian FinTech & Legal Translator",
        profileCompleteness: 99,
      },
      packages: [
        {
          id: "pkg-6",
          tier: "BASIC",
          title: "500 UI Strings",
          description: "1 language pair + glossary + in-context proofread",
          deliveryDays: 3,
          revisionsIncluded: 2,
          priceMinor: 1200000,
        },
        {
          id: "pkg-7",
          tier: "STANDARD",
          title: "2,000 Strings (Trilingual)",
          description: "Amharic + Afaan Oromo + Tigrinya complete UI pack",
          deliveryDays: 6,
          revisionsIncluded: 3,
          priceMinor: 2950000,
        },
      ],
    },
    {
      id: "gig-504",
      freelancerId: "usr-free-01",
      title: "I will build a custom Telegram Mini-App with Fayda KYC & Telebirr checkout",
      category: "WEB_APP_DEVELOPMENT",
      description:
        "Full-stack Telegram WebApp with cryptographic initData authentication, BotFather menu integration, and instant ETB escrow payments.",
      tags: ["Telegram", "Mini-App", "Bot", "Telebirr"],
      requirements: [{ label: "Bot username & feature scope", type: "TEXT", required: true }],
      faqJson: null,
      thumbnailUrl: "/marketing/yekis-cta-workspace.png",
      mediaUrls: [],
      status: "DRAFT",
      autoAcceptOrders: true,
      maxRevisions: 3,
      viewCount: 310,
      ratingAverage: 4.92,
      ratingCount: 14,
      createdAt: isoDaysAgo(1),
      freelancer: {
        id: "usr-free-01",
        displayName: "Hanna Tadesse",
        avatarUrl: null,
        bio: "Senior Full-Stack & FinTech Engineer in Addis Ababa",
        profileCompleteness: 98,
      },
      packages: [
        {
          id: "pkg-8",
          tier: "BASIC",
          title: "Mini-App Starter",
          description: "Telegram auth + 3 responsive screens + webhook bot",
          deliveryDays: 5,
          revisionsIncluded: 2,
          priceMinor: 2400000,
        },
      ],
    },
  ];

  gigOrders: GigOrder[] = [
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
    {
      id: "go-802",
      gigId: "gig-502",
      packageId: "pkg-5",
      clientId: "usr-client-01",
      status: "DELIVERED",
      escrowState: "SUBMITTED_FOR_REVIEW",
      submittedAt: isoDaysAgo(0.5),
      deliverableUrl: "https://figma.com/file/yekis-saas-kit-v2",
      autoReleaseAt: isoDaysFromNow(6.5),
      revisionStatus: "NONE",
      revisionsUsed: 1,
      totalChargeMinor: 3200000,
      createdAt: isoDaysAgo(6),
      gig: {
        id: "gig-502",
        title: "I will design a high-converting SaaS dashboard & Figma design system",
        freelancerId: "usr-both-01",
      },
    },
  ];

  disputes: Dispute[] = [
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
        freelancerId: "usr-free-01",
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
          submittedByUserId: "usr-free-01",
          statement: "Patch PR #42 uploaded with chunked cursor pagination reducing latency to 140ms.",
          createdAt: isoDaysAgo(2),
        },
      ],
    },
    {
      id: "dsp-602",
      contractId: "ctr-302",
      milestoneId: "ms-203",
      category: "SCOPE_CREEP",
      stage: "STAGE_2_EVIDENCE",
      description:
        "Clarification needed on whether Djibouti customs XML schema v3 is part of Milestone 1 or Milestone 2.",
      negotiationDeadlineAt: isoDaysAgo(1),
      mediationDeadlineAt: isoDaysFromNow(5),
      mediatorRecommendation: null,
      resolutionOutcome: null,
      createdAt: isoDaysAgo(3),
      contract: {
        id: "ctr-302",
        clientId: "usr-client-01",
        freelancerId: "usr-both-01",
        job: { title: "Addis Coffee Export Traceability Dashboard & ERP" },
      },
      milestone: {
        id: "ms-203",
        title: "Supply Chain Lot Tracking Schema & API Endpoints",
        amountMinor: 6200000,
        escrowState: "WORK_IN_PROGRESS",
      },
      evidence: [
        {
          id: "evd-3",
          submittedByUserId: "usr-both-01",
          statement: "Signed contract annex lists ECX washing station schema in Phase 1 and Customs XML in Phase 2.",
          createdAt: isoDaysAgo(1.5),
        },
      ],
    },
    {
      id: "dsp-603",
      contractId: "ctr-301",
      milestoneId: "ms-202",
      category: "LATE_DELIVERY",
      stage: "STAGE_1_NEGOTIATION",
      description:
        "Sandbox callback URL from telecom partner was offline for 36 hours; requesting 2-day milestone extension.",
      negotiationDeadlineAt: isoDaysAgo(0.2),
      mediationDeadlineAt: null,
      mediatorRecommendation: null,
      resolutionOutcome: null,
      createdAt: isoDaysAgo(2),
      contract: {
        id: "ctr-301",
        clientId: "usr-client-01",
        freelancerId: "usr-free-01",
        job: { title: "Telebirr SuperApp Mini-Program & Escrow Checkout UI" },
      },
      milestone: {
        id: "ms-202",
        title: "Phase 2: Multi-Rail Escrow Checkout & CBE Birr Flow",
        amountMinor: 5000000,
        escrowState: "SUBMITTED_FOR_REVIEW",
      },
      evidence: [],
    },
  ];

  conversations: ChatConversation[] = [
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
    {
      id: "conv-703",
      subject: "Fayda National ID KYC Onboarding — Figma Prototype",
      status: "OPEN",
      createdAt: isoDaysAgo(2),
      updatedAt: isoDaysAgo(0.4),
      latestMessage: {
        body: "We added high-contrast Amharic voiceover prompts for the selfie liveness step.",
        createdAt: isoDaysAgo(0.4),
        senderId: "usr-free-04",
      },
      otherParticipant: {
        id: "usr-free-04",
        email: "nahom.girma@addisdesign.et",
        role: "FREELANCER",
        displayName: "Nahom Girma",
      },
      isSupport: false,
      unread: false,
      assignedStaff: null,
    },
    {
      id: "conv-704",
      subject: "Yekis Support Desk — Escrow & Telebirr Assistance",
      status: "OPEN",
      createdAt: isoDaysAgo(4),
      updatedAt: isoDaysAgo(0.3),
      latestMessage: {
        body: "Your CBE Birr transfer FT26288XK910 has been reconciled and credited.",
        createdAt: isoDaysAgo(0.3),
        senderId: "usr-admin-01",
      },
      otherParticipant: {
        id: "usr-admin-01",
        email: "yonael.ops@yekis.et",
        role: "ADMIN",
        displayName: "Yekis Support Desk",
      },
      isSupport: true,
      unread: false,
      assignedStaff: { id: "usr-admin-01", name: "Yonael Mindaye" },
    },
  ];

  messagesByConv: Record<string, ChatMessage[]> = {
    "conv-701": [
      {
        id: "msg-101",
        conversationId: "conv-701",
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
        id: "msg-102",
        conversationId: "conv-701",
        senderId: "usr-free-01",
        body: "Selam Abebe! I have uploaded the Phase 2 CBE Birr fallback build for your review. Ready for escrow release whenever you verify.",
        createdAt: isoDaysAgo(0.4),
        sender: {
          id: "usr-free-01",
          email: "hanna.tadesse@addisdev.et",
          role: "FREELANCER",
          staffRole: null,
          displayName: "Hanna Tadesse",
        },
      },
      {
        id: "msg-103",
        conversationId: "conv-701",
        senderId: "usr-client-01",
        body: "Great, I am running the sandbox checkout test now and will confirm the milestone release shortly.",
        createdAt: isoDaysAgo(0.1),
        sender: {
          id: "usr-client-01",
          email: "abebe.kebede@abyssinia-tech.et",
          role: "CLIENT",
          staffRole: null,
          displayName: "Abebe Kebede",
        },
      },
    ],
    "conv-702": [
      {
        id: "msg-201",
        conversationId: "conv-702",
        senderId: "usr-both-01",
        body: "Hello Abebe, I have pushed the Yirgacheffe and Sidama washing station lot schema with hulling mill foreign keys.",
        createdAt: isoDaysAgo(1.5),
        sender: {
          id: "usr-both-01",
          email: "dawit.mekonnen@ethio-digital.et",
          role: "BOTH",
          staffRole: null,
          displayName: "Dawit Mekonnen",
        },
      },
      {
        id: "msg-202",
        conversationId: "conv-702",
        senderId: "usr-client-01",
        body: "Washing station lot codes match ECX export manifest format. Proceeding to chart view.",
        createdAt: isoDaysAgo(1),
        sender: {
          id: "usr-client-01",
          email: "abebe.kebede@abyssinia-tech.et",
          role: "CLIENT",
          staffRole: null,
          displayName: "Abebe Kebede",
        },
      },
    ],
    "conv-703": [
      {
        id: "msg-300",
        conversationId: "conv-703",
        senderId: "usr-client-01",
        body: "Selam Nahom, could we include Amharic voiceover guidance on the biometric liveness screen for rural agents?",
        createdAt: isoDaysAgo(0.8),
        sender: {
          id: "usr-client-01",
          email: "abebe.kebede@abyssinia-tech.et",
          role: "CLIENT",
          staffRole: null,
          displayName: "Abebe Kebede",
        },
      },
      {
        id: "msg-301",
        conversationId: "conv-703",
        senderId: "usr-free-04",
        body: "We added high-contrast Amharic voiceover prompts for the selfie liveness step. Proposed budget is ETB 51,000 over 8 days.",
        createdAt: isoDaysAgo(0.4),
        sender: {
          id: "usr-free-04",
          email: "nahom.girma@addisdesign.et",
          role: "FREELANCER",
          staffRole: null,
          displayName: "Nahom Girma",
        },
      },
    ],
    "conv-704": [
      {
        id: "msg-401",
        conversationId: "conv-704",
        senderId: "usr-both-01",
        body: "Hello Support, I uploaded CBE Birr receipt FT26288XK910 for ETB 95,000.",
        createdAt: isoDaysAgo(0.5),
        sender: {
          id: "usr-both-01",
          email: "dawit.mekonnen@ethio-digital.et",
          role: "BOTH",
          staffRole: null,
          displayName: "Dawit Mekonnen",
        },
      },
      {
        id: "msg-402",
        conversationId: "conv-704",
        senderId: "usr-admin-01",
        body: "Selam! Your CBE Birr transfer FT26288XK910 has been reconciled and credited to your escrow wallet.",
        createdAt: isoDaysAgo(0.3),
        sender: {
          id: "usr-admin-01",
          email: "yonael.ops@yekis.et",
          role: "ADMIN",
          staffRole: "SUPER_ADMIN",
          displayName: "Yonael Mindaye (Support)",
        },
      },
    ],
    "sup-1": [
      {
        id: "msg-sup-101",
        conversationId: "sup-1",
        senderId: "usr-both-01",
        body: "Hello Support team, I uploaded CBE Birr receipt FT26289C8831 for our Addis Coffee Export ERP milestone. Could you confirm verification?",
        createdAt: isoDaysAgo(0.4),
        sender: {
          id: "usr-both-01",
          email: "dawit.mekonnen@ethio-digital.et",
          role: "BOTH",
          staffRole: null,
          displayName: "Dawit Mekonnen",
        },
      },
      {
        id: "msg-sup-102",
        conversationId: "sup-1",
        senderId: "usr-admin-01",
        body: "Selam Dawit! We see transfer reference FT26289C8831 in the CBE settlement feed and are completing verification now.",
        createdAt: isoDaysAgo(0.2),
        sender: {
          id: "usr-admin-01",
          email: "yonael.ops@yekis.et",
          role: "ADMIN",
          staffRole: "SUPER_ADMIN",
          displayName: "Yonael Mindaye (Ops)",
        },
      },
      {
        id: "msg-sup-103",
        conversationId: "sup-1",
        senderId: "usr-both-01",
        body: "Thank you! Please let me know as soon as the milestone transitions to FUNDED.",
        createdAt: isoDaysAgo(0.1),
        sender: {
          id: "usr-both-01",
          email: "dawit.mekonnen@ethio-digital.et",
          role: "BOTH",
          staffRole: null,
          displayName: "Dawit Mekonnen",
        },
      },
    ],
    "sup-2": [
      {
        id: "msg-sup-201",
        conversationId: "sup-2",
        senderId: "usr-free-01",
        body: "Selam! Please confirm my 10-digit ERCA TIN certificate so my withholding tax rate updates from 30% to 3%.",
        createdAt: isoDaysAgo(0.6),
        sender: {
          id: "usr-free-01",
          email: "hanna.tadesse@addisdev.et",
          role: "FREELANCER",
          staffRole: null,
          displayName: "Hanna Tadesse",
        },
      },
      {
        id: "msg-sup-202",
        conversationId: "sup-2",
        senderId: "usr-admin-01",
        body: "Selam Hanna! Your TIN certificate has been queued with Compliance and will be verified within the hour.",
        createdAt: isoDaysAgo(0.3),
        sender: {
          id: "usr-admin-01",
          email: "yonael.ops@yekis.et",
          role: "ADMIN",
          staffRole: "SUPER_ADMIN",
          displayName: "Yonael Mindaye (Ops)",
        },
      },
    ],
  };

  notifications: NotificationItem[] = [
    {
      id: "ntf-1",
      type: "milestone-submitted",
      message: "Hanna Tadesse submitted Phase 2: Multi-Rail Escrow Checkout (ETB 50,000) for your review.",
      isRead: false,
      createdAt: isoDaysAgo(0.15),
      metadata: { contractId: "ctr-301", milestoneId: "ms-202" },
    },
    {
      id: "ntf-2",
      type: "proposal-received",
      message: "New proposal from Hanna Tadesse (ETB 82,000) on Telebirr SuperApp Mini-Program.",
      isRead: false,
      createdAt: isoDaysAgo(0.4),
      metadata: { jobId: "job-101", proposalId: "prp-101" },
    },
    {
      id: "ntf-3",
      type: "escrow-funded",
      message: "ETB 62,000.00 locked in escrow via CBE Birr for Addis Coffee Export ERP.",
      isRead: false,
      createdAt: isoDaysAgo(1.1),
      metadata: { contractId: "ctr-302", milestoneId: "ms-203" },
    },
    {
      id: "ntf-4",
      type: "new-message",
      message: "Nahom Girma sent a message in Fayda National ID KYC Onboarding.",
      isRead: true,
      createdAt: isoDaysAgo(1.4),
      metadata: { conversationId: "conv-703" },
    },
    {
      id: "ntf-5",
      type: "dispute-raised",
      message: "Stage 3 Mediation recommendation posted on Legacy Inventory ERP API Connector.",
      isRead: true,
      createdAt: isoDaysAgo(2.2),
      metadata: { disputeId: "dsp-601" },
    },
    {
      id: "ntf-6",
      type: "SUPPORT_REQUEST_CREATED",
      message: "Support ticket #SUP-1: CBE Birr Receipt Reference Verification awaiting response.",
      isRead: false,
      createdAt: isoDaysAgo(0.25),
      metadata: { conversationId: "sup-1" },
    },
  ];

  portfolioItems = [
    {
      id: "pf-1",
      title: "Telebirr H5 SuperApp Checkout & Escrow SDK",
      description: "Cryptographic RSA-SHA256 payment signing, instant callback reconciliation, and bilingual UI for 120k+ monthly active users.",
      thumbnailUrl: "/marketing/yekis-collaboration-banner.png",
      projectUrl: "https://yekis.et/case-studies",
      displayOrder: 1,
    },
    {
      id: "pf-2",
      title: "ECX Specialty Coffee Traceability & Export Portal",
      description: "Supply-chain ledger tracking Yirgacheffe & Sidama lots from washing stations to Djibouti port dispatch.",
      thumbnailUrl: "/marketing/yekis-cta-workspace.png",
      projectUrl: "https://yekis.et/case-studies",
      displayOrder: 2,
    },
    {
      id: "pf-3",
      title: "Fayda National ID eSignet Biometric Verification Flow",
      description: "Accessible mobile-first KYC verification flow supporting Amharic, Afaan Oromo, Tigrinya, and English.",
      thumbnailUrl: "/marketing/yekis-collaboration-banner.png",
      projectUrl: "https://yekis.et/case-studies",
      displayOrder: 3,
    },
  ];

  reviews = [
    {
      id: "rev-1",
      rating: 5,
      comment: "Delivered our Telebirr H5 checkout module 2 days ahead of schedule. Zero webhook drops in production!",
      createdAt: isoDaysAgo(8),
      reviewer: { displayName: "Abebe Kebede — Abyssinia Commerce" },
    },
    {
      id: "rev-2",
      rating: 5,
      comment: "Exceptional attention to detail on the Amharic and Afaan Oromo localization and Ethiopic typography.",
      createdAt: isoDaysAgo(16),
      reviewer: { displayName: "Sara Mohammed — Horizon NGO" },
    },
    {
      id: "rev-3",
      rating: 5,
      comment: "Milestone structure was crystal clear and the PostgreSQL reconciliation scripts saved our finance team 15 hours a week.",
      createdAt: isoDaysAgo(24),
      reviewer: { displayName: "Solomon Tesfaye — Zemen Microfinance" },
    },
  ];

  withholdingReports = [
    {
      id: "wh-2026-10",
      periodMonth: "2026-10",
      totalWithholdingMinor: 5550000,
      transactionCount: 31,
      filedAt: null as string | null,
      eraReferenceNumber: null as string | null,
    },
    {
      id: "wh-2026-09",
      periodMonth: "2026-09",
      totalWithholdingMinor: 6850000,
      transactionCount: 42,
      filedAt: isoDaysAgo(18) as string | null,
      eraReferenceNumber: "ERCA-WH-202609-88412" as string | null,
    },
    {
      id: "wh-2026-08",
      periodMonth: "2026-08",
      totalWithholdingMinor: 6120000,
      transactionCount: 38,
      filedAt: isoDaysAgo(48) as string | null,
      eraReferenceNumber: "ERCA-WH-202608-77109" as string | null,
    },
    {
      id: "wh-2026-07",
      periodMonth: "2026-07",
      totalWithholdingMinor: 4980000,
      transactionCount: 29,
      filedAt: isoDaysAgo(79) as string | null,
      eraReferenceNumber: "ERCA-WH-202607-64902" as string | null,
    },
  ];

  customEmail: string | null = null;
  customPhone: string | null = null;
  customStaffRole: string | null = null;
  registeredRolesByEmail: Record<string, DemoWorkspaceRole> = {};

  getCurrentUser(): MeResponse {
    const base = DEMO_USERS[this.activeRole] ?? DEMO_USERS.BOTH;
    return {
      ...base,
      email: this.customEmail || base.email,
      phone: this.customPhone || base.phone,
      staffRole:
        this.activeRole === "ADMIN"
          ? (this.customStaffRole ?? base.staffRole)
          : null,
      wallet: { balanceMinor: this.walletMinor },
    };
  }

  setRole(role: DemoWorkspaceRole) {
    this.activeRole = role;
    this.customEmail = null;
    this.customPhone = null;
    this.customStaffRole = null;
    this.walletMinor = DEMO_USERS[role].wallet?.balanceMinor ?? 24850000;
    if (typeof window !== "undefined") {
      window.localStorage.setItem("yekis-demo-role", role);
    }
  }

  getContracts(): Contract[] {
    const uid = this.getCurrentUser().id;
    return this.contractsMeta.map((c) => {
      let clientId = c.clientId;
      let freelancerId = c.freelancerId;
      if (this.activeRole === "CLIENT") {
        clientId = uid;
      } else if (this.activeRole === "FREELANCER") {
        freelancerId = uid;
      } else if (this.activeRole === "BOTH") {
        // For dual-role, make user the Client on ctr-301, ctr-304, ctr-305 (to test funding/releasing/cooling-off)
        // and the Freelancer on ctr-302, ctr-306 (to test submitting deliverables)
        if (c.id === "ctr-301" || c.id === "ctr-304" || c.id === "ctr-305") {
          clientId = uid;
        } else {
          freelancerId = uid;
        }
      }
      return {
        ...c,
        clientId,
        freelancerId,
        milestones: this.milestones.filter((m) => m.contractId === c.id),
      };
    });
  }

  getGigs(): Gig[] {
    return this.gigs;
  }

  getDisputes(): Dispute[] {
    const uid = this.getCurrentUser().id;
    return this.disputes.map((d) => ({
      ...d,
      contract: d.contract
        ? {
            ...d.contract,
            clientId: this.activeRole === "FREELANCER" ? d.contract.clientId : uid,
            freelancerId: this.activeRole === "FREELANCER" ? uid : d.contract.freelancerId,
          }
        : d.contract,
    }));
  }

  getConversations(): ChatConversation[] {
    const u = this.getCurrentUser();
    return this.conversations.map((c) => {
      if (c.isSupport) return c;
      // Ensure otherParticipant is always the counterparty relative to the signed-in user
      if (c.otherParticipant && c.otherParticipant.id === u.id) {
        const fallbackOther =
          u.role === "FREELANCER"
            ? {
                id: "usr-client-01",
                email: "abebe.kebede@abyssinia-tech.et",
                role: "CLIENT",
                displayName: "Abebe Kebede",
              }
            : {
                id: "usr-free-01",
                email: "hanna.tadesse@addisdev.et",
                role: "FREELANCER",
                displayName: "Hanna Tadesse",
              };
        return { ...c, otherParticipant: fallbackOther };
      }
      return c;
    });
  }

  getMessages(conversationId: string): ChatMessage[] {
    const raw = this.messagesByConv[conversationId] ?? this.messagesByConv["conv-701"] ?? [];
    if (conversationId.startsWith("sup-")) {
      return raw;
    }
    const u = this.getCurrentUser();
    if (u.role === "ADMIN" || u.staffRole) {
      return raw;
    }
    const conv = this.getConversations().find((c) => c.id === conversationId);
    const otherId = conv?.otherParticipant?.id;
    return raw.map((m) => {
      if (conv?.isSupport) {
        if (m.sender.staffRole) return m;
        return {
          ...m,
          senderId: u.id,
          sender: { ...m.sender, id: u.id, email: u.email, role: u.role },
        };
      }
      if (otherId && m.senderId === otherId) {
        return m;
      }
      return {
        ...m,
        senderId: u.id,
        sender: { ...m.sender, id: u.id, email: u.email, role: u.role },
      };
    });
  }

  /* ── Operations Console & Platform Mock API Handler ──────────────────── */
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
      const rawEmail =
        typeof parsedBody?.email === "string"
          ? parsedBody.email.trim()
          : typeof parsedBody?.identifier === "string"
            ? parsedBody.identifier.trim()
            : "";
      const lower = rawEmail.toLowerCase();

      if (
        parsedBody?.role &&
        (parsedBody.role === "CLIENT" ||
          parsedBody.role === "FREELANCER" ||
          parsedBody.role === "BOTH" ||
          parsedBody.role === "ADMIN")
      ) {
        this.setRole(parsedBody.role);
        if (lower) {
          this.registeredRolesByEmail[lower] = parsedBody.role;
          this.customEmail = rawEmail;
        }
        if (typeof parsedBody?.phone === "string" && parsedBody.phone.trim()) {
          this.customPhone = parsedBody.phone.trim();
        }
      } else if (lower) {
        if (this.registeredRolesByEmail[lower]) {
          this.setRole(this.registeredRolesByEmail[lower]);
          this.customEmail = rawEmail;
        } else if (
          lower.includes("admin") ||
          lower.includes("ops") ||
          lower.includes("compliance") ||
          lower.includes("support")
        ) {
          this.setRole("ADMIN");
          this.customEmail = rawEmail;
          if (lower.includes("compliance")) {
            this.customStaffRole = "COMPLIANCE_OFFICER";
          } else if (lower.includes("support")) {
            this.customStaffRole = "SUPPORT";
          } else {
            this.customStaffRole = "SUPER_ADMIN";
          }
        } else if (
          lower.includes("free") ||
          lower.includes("hanna") ||
          lower.includes("seller") ||
          lower.includes("selam")
        ) {
          this.setRole("FREELANCER");
        } else if (lower.includes("client") || lower.includes("abebe")) {
          this.setRole("CLIENT");
        } else {
          this.setRole("BOTH");
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
      return {
        balanceMinor: this.walletMinor,
        availableMinor: this.walletMinor,
        pendingMinor: 4500000,
      } satisfies WalletResponse;
    }
    if (cleanPath === "/escrow/wallet/withdraw" && method === "POST") {
      const amountMinor = Number(parsedBody?.amountMinor || 0);
      if (amountMinor > 0 && amountMinor <= this.walletMinor) {
        this.walletMinor -= amountMinor;
      }
      return {
        balanceMinor: this.walletMinor,
        message: "Withdrawal queued for instant payout.",
      };
    }
    if (cleanPath === "/wallet/topups" && method === "GET") {
      return this.topUps;
    }
    if (cleanPath.startsWith("/wallet/topups") && method === "POST") {
      const amt = Number(parsedBody?.amountMinor || 5000000);
      const prov = (parsedBody?.provider as "TELEBIRR" | "CBE_BIRR" | "M_PESA") || "TELEBIRR";
      const added: TopUpRequest = {
        id: `tu-${Date.now()}`,
        userId: this.getCurrentUser().id,
        amountMinor: amt,
        provider: prov,
        senderName: "Dawit Mekonnen",
        referenceNumber: String(parsedBody?.referenceNumber || `TB-${Date.now().toString().slice(-6)}`),
        status: "APPROVED",
        createdAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
        rejectionReason: null,
      };
      this.topUps = [added, ...this.topUps];
      this.walletMinor += added.amountMinor;
      return { redirectUrl: null, topUpId: added.id, credited: true, ...added };
    }
    if (cleanPath.startsWith("/wallet/topups/") && method === "GET") {
      if (cleanPath.endsWith("/receipt-url")) {
        return { url: "/payment/Telebirr.png" };
      }
      const id = cleanPath.split("/").pop() || "tu-401";
      const found = this.topUps.find((t) => t.id === id) || this.topUps[0];
      return {
        ...found,
        providerTransactionId: found.referenceNumber,
        credited: found.status === "APPROVED",
      };
    }

    // Jobs & Proposals
    if (cleanPath === "/jobs/mine") {
      return this.jobs;
    }
    if (cleanPath === "/jobs/proposals/mine") {
      return this.proposals;
    }
    if (cleanPath.match(/^\/jobs\/[^/]+\/proposals$/) && method === "GET") {
      const jobId = cleanPath.split("/")[2];
      return this.proposals.filter((p) => p.jobId === jobId);
    }
    if (cleanPath.match(/^\/jobs\/[^/]+\/proposals$/) && method === "POST") {
      const jobId = cleanPath.split("/")[2];
      const job = this.jobs.find((j) => j.id === jobId) || this.jobs[0];
      const quotedAmount =
        Number((parsedBody?.quotedAmount as { amountMinor?: number })?.amountMinor) ||
        Number(parsedBody?.quotedAmountMinor) ||
        5500000;
      const newProposal: Proposal = {
        id: `prp-${Date.now()}`,
        jobId,
        freelancerId: this.getCurrentUser().id,
        coverLetter: String(parsedBody?.coverLetter || "Experienced Ethiopian specialist ready to deliver on schedule."),
        quotedAmountMinor: quotedAmount,
        estimatedDays: Number(parsedBody?.estimatedDays || 7),
        milestoneBreakdown: [
          {
            title: "Project delivery",
            amount: { amountMinor: quotedAmount, currency: "ETB" },
            dueDate: isoDaysFromNow(Number(parsedBody?.estimatedDays || 7)),
          },
        ],
        status: "SUBMITTED",
        createdAt: new Date().toISOString(),
        freelancer: {
          id: this.getCurrentUser().id,
          ucid: this.getCurrentUser().ucid,
          email: this.getCurrentUser().email,
        },
        job: {
          id: job.id,
          title: job.title,
          status: job.status,
          clientId: job.clientId || "usr-client-01",
        },
      };
      this.proposals = [newProposal, ...this.proposals];
      return newProposal;
    }
    if (cleanPath.match(/^\/jobs\/proposals\/[^/]+\/decision$/) && method === "POST") {
      const proposalId = cleanPath.split("/")[3];
      const decision = String(parsedBody?.decision || "SHORTLISTED");
      let target: Proposal | undefined;
      this.proposals = this.proposals.map((p) => {
        if (p.id === proposalId) {
          target = { ...p, status: decision };
          return target;
        }
        return p;
      });
      if (decision === "ACCEPTED" && target) {
        const newContractId = `ctr-${Date.now().toString().slice(-4)}`;
        const newMilestoneId = `ms-${Date.now().toString().slice(-4)}`;
        const newMilestone: Milestone = {
          id: newMilestoneId,
          contractId: newContractId,
          sequenceNumber: 1,
          title: target.milestoneBreakdown?.[0]?.title || "Milestone 1 Delivery",
          description: "Generated from accepted proposal",
          amountMinor: target.quotedAmountMinor,
          dueDate: isoDaysFromNow(target.estimatedDays || 7),
          escrowState: "PAYMENT_PENDING",
          deliverablePath: null,
          submittedAt: null,
          autoReleaseAt: null,
          releasedAt: null,
        };
        this.milestones = [newMilestone, ...this.milestones];
        this.contractsMeta = [
          {
            id: newContractId,
            jobId: target.jobId,
            clientId: this.getCurrentUser().id,
            freelancerId: target.freelancerId,
            templateVersion: "v2.4-ET",
            clientAcceptedAt: new Date().toISOString(),
            freelancerAcceptedAt: new Date().toISOString(),
            fullyExecuted: true,
            status: "ACTIVE",
            cancellableUntil: null,
            createdAt: new Date().toISOString(),
            job: {
              id: target.jobId,
              title: target.job?.title || "Marketplace Contract",
              status: "IN_PROGRESS",
            },
          },
          ...this.contractsMeta,
        ];
      }
      return { proposal: target };
    }
    if (cleanPath.match(/^\/jobs\/proposals\/[^/]+\/withdraw$/) && method === "POST") {
      const proposalId = cleanPath.split("/")[3];
      const found = this.proposals.find((p) => p.id === proposalId);
      this.proposals = this.proposals.filter((p) => p.id !== proposalId);
      return found ?? { id: proposalId, status: "WITHDRAWN" };
    }
    if (cleanPath === "/jobs" && method === "GET") {
      return { items: this.jobs, total: this.jobs.length, page: 1, pageSize: 20 };
    }
    if (cleanPath.match(/^\/jobs\/[^/]+$/) && method === "GET") {
      const jobId = cleanPath.split("/")[2];
      return this.jobs.find((j) => j.id === jobId) || this.jobs[0];
    }
    if (cleanPath === "/jobs" && method === "POST") {
      const payload = parsedBody;
      const newJob: Job & { _count?: { proposals?: number } } = {
        id: `job-${Date.now()}`,
        clientId: this.getCurrentUser().id,
        title: String(payload?.title || "New Marketplace Brief"),
        description: String(payload?.description || "Scoped milestone deliverable."),
        category: String(payload?.category || "WEB_APP_DEVELOPMENT"),
        budgetMinMinor: Number(
          (payload?.budgetMin as { amountMinor?: number })?.amountMinor ||
            payload?.budgetMinMinor ||
            3000000,
        ),
        budgetMaxMinor: Number(
          (payload?.budgetMax as { amountMinor?: number })?.amountMinor ||
            payload?.budgetMaxMinor ||
            6000000,
        ),
        deadline: String(payload?.deadline || isoDaysFromNow(14)),
        status: "OPEN",
        createdAt: new Date().toISOString(),
        proposalsCount: 0,
        _count: { proposals: 0 },
      };
      this.jobs = [newJob, ...this.jobs];
      return newJob;
    }

    // Contracts & Escrow Milestones
    if (cleanPath === "/contracts/milestones" || cleanPath === "/escrow/milestones") {
      return this.milestones;
    }
    if (cleanPath === "/contracts" && method === "GET") {
      return this.getContracts();
    }
    if (cleanPath.match(/^\/contracts\/[^/]+\/accept$/) && method === "POST") {
      const contractId = cleanPath.split("/")[2];
      const nowIso = new Date().toISOString();
      this.contractsMeta = this.contractsMeta.map((c) =>
        c.id === contractId
          ? {
              ...c,
              clientAcceptedAt: c.clientAcceptedAt ?? nowIso,
              freelancerAcceptedAt: c.freelancerAcceptedAt ?? nowIso,
              fullyExecuted: true,
            }
          : c,
      );
      return this.getContracts().find((c) => c.id === contractId) ?? this.getContracts()[0];
    }
    if (cleanPath.match(/^\/contracts\/[^/]+\/cancel-cooling-off$/) && method === "POST") {
      const contractId = cleanPath.split("/")[2];
      this.contractsMeta = this.contractsMeta.map((c) =>
        c.id === contractId ? { ...c, status: "CANCELLED" } : c,
      );
      return this.getContracts().find((c) => c.id === contractId) ?? this.getContracts()[0];
    }
    if (cleanPath.match(/^\/contracts\/[^/]+\/document$/)) {
      return { url: "/Terms" };
    }
    if ((cleanPath === "/escrow/fund" || cleanPath === "/escrow/fund-from-wallet") && method === "POST") {
      const milestoneId = String(parsedBody?.milestoneId || "ms-207");
      this.milestones = this.milestones.map((m) => {
        if (m.id === milestoneId) {
          if (this.walletMinor >= m.amountMinor) {
            this.walletMinor -= m.amountMinor;
          }
          return { ...m, escrowState: "ESCROW_HELD" };
        }
        return m;
      });
      const updated = this.milestones.find((m) => m.id === milestoneId) || this.milestones[0];
      return {
        ...updated,
        redirectUrl: null,
        providerTransactionId: `TB-${Date.now().toString().slice(-8)}`,
      };
    }
    if (cleanPath.match(/^\/escrow\/milestones\/[^/]+\/submit$/) && method === "POST") {
      const milestoneId = cleanPath.split("/")[3];
      const nowIso = new Date().toISOString();
      const autoIso = isoDaysFromNow(7);
      this.milestones = this.milestones.map((m) =>
        m.id === milestoneId
          ? {
              ...m,
              escrowState: "SUBMITTED_FOR_REVIEW",
              submittedAt: nowIso,
              autoReleaseAt: autoIso,
              deliverablePath: "/uploads/milestone-deliverable.zip",
            }
          : m,
      );
      return this.milestones.find((m) => m.id === milestoneId) || this.milestones[0];
    }
    if (cleanPath.match(/^\/escrow\/milestones\/[^/]+\/accept$/) && method === "POST") {
      const milestoneId = cleanPath.split("/")[3];
      const nowIso = new Date().toISOString();
      this.milestones = this.milestones.map((m) => {
        if (m.id === milestoneId) {
          this.walletMinor += Math.round(m.amountMinor * 0.92);
          return {
            ...m,
            escrowState: "RELEASED",
            releasedAt: nowIso,
          };
        }
        return m;
      });
      return this.milestones.find((m) => m.id === milestoneId) || this.milestones[0];
    }

    // Gigs & Gig Orders
    if (cleanPath === "/gigs/mine") {
      return this.gigs;
    }
    if (cleanPath === "/gigs" && method === "POST") {
      const created: Gig = {
        id: `gig-${Date.now()}`,
        freelancerId: this.getCurrentUser().id,
        title: String(parsedBody?.title || "Custom Ethiopian Freelance Service"),
        category: String(parsedBody?.category || "WEB_APP_DEVELOPMENT"),
        description: String(parsedBody?.description || "Fixed-price escrow service package."),
        tags: Array.isArray(parsedBody?.tags) ? (parsedBody.tags as string[]) : ["Ethiopia", "Escrow"],
        requirements: [],
        faqJson: null,
        thumbnailUrl: "/marketing/yekis-collaboration-banner.png",
        mediaUrls: [],
        status: "ACTIVE",
        autoAcceptOrders: true,
        maxRevisions: Number(parsedBody?.maxRevisions ?? 2),
        viewCount: 1,
        ratingAverage: 5.0,
        ratingCount: 1,
        createdAt: new Date().toISOString(),
        freelancer: {
          id: this.getCurrentUser().id,
          displayName: "Hanna Tadesse",
          avatarUrl: null,
          bio: "Verified Yekis Specialist",
          profileCompleteness: 98,
        },
        packages: Array.isArray(parsedBody?.packages)
          ? (parsedBody.packages as Gig["packages"])?.map((p, idx) => ({
              ...p,
              id: `pkg-new-${idx}-${Date.now()}`,
            }))
          : [],
      };
      this.gigs = [created, ...this.gigs];
      return created;
    }
    if (cleanPath.match(/^\/gigs\/[^/]+\/status$/) && method === "POST") {
      const gigId = cleanPath.split("/")[2];
      const nextStatus = String(parsedBody?.status || "PAUSED");
      this.gigs = this.gigs.map((g) => (g.id === gigId ? { ...g, status: nextStatus } : g));
      return this.gigs.find((g) => g.id === gigId) || this.gigs[0];
    }
    if (cleanPath === "/gigs/orders" && method === "POST") {
      const packageId = String(parsedBody?.packageId || "pkg-1");
      let matchedGig = this.gigs[0];
      let matchedPkg = matchedGig.packages?.[0];
      for (const g of this.gigs) {
        const foundPkg = g.packages?.find((p) => p.id === packageId);
        if (foundPkg) {
          matchedGig = g;
          matchedPkg = foundPkg;
          break;
        }
      }
      const order: GigOrder = {
        id: `go-${Date.now()}`,
        gigId: matchedGig.id,
        packageId,
        clientId: this.getCurrentUser().id,
        status: "PENDING_PAYMENT",
        escrowState: "PAYMENT_PENDING",
        revisionStatus: "NONE",
        revisionsUsed: 0,
        totalChargeMinor: matchedPkg?.priceMinor ?? 1800000,
        createdAt: new Date().toISOString(),
        gig: {
          id: matchedGig.id,
          title: matchedGig.title,
          freelancerId: matchedGig.freelancerId,
        },
        package: matchedPkg,
      };
      this.gigOrders = [order, ...this.gigOrders];
      return order;
    }
    if (cleanPath.match(/^\/gigs\/orders\/[^/]+\/fund$/) && method === "POST") {
      const orderId = cleanPath.split("/")[3];
      this.gigOrders = this.gigOrders.map((o) =>
        o.id === orderId ? { ...o, status: "IN_PROGRESS", escrowState: "WORK_IN_PROGRESS" } : o,
      );
      return this.gigOrders.find((o) => o.id === orderId) || this.gigOrders[0];
    }
    if (cleanPath.match(/^\/gigs\/orders\/[^/]+\/submit$/) && method === "POST") {
      const orderId = cleanPath.split("/")[3];
      this.gigOrders = this.gigOrders.map((o) =>
        o.id === orderId
          ? {
              ...o,
              status: "DELIVERED",
              escrowState: "SUBMITTED_FOR_REVIEW",
              submittedAt: new Date().toISOString(),
              deliverableUrl: String(parsedBody?.deliverableUrl || "/uploads/gig-delivery.zip"),
            }
          : o,
      );
      return this.gigOrders.find((o) => o.id === orderId) || this.gigOrders[0];
    }
    if (cleanPath.match(/^\/gigs\/orders\/[^/]+\/accept$/) && method === "POST") {
      const orderId = cleanPath.split("/")[3];
      this.gigOrders = this.gigOrders.map((o) =>
        o.id === orderId ? { ...o, status: "COMPLETED", escrowState: "RELEASED" } : o,
      );
      return this.gigOrders.find((o) => o.id === orderId) || this.gigOrders[0];
    }
    if (cleanPath.startsWith("/gigs/orders")) {
      return this.gigOrders;
    }
    if (cleanPath.startsWith("/gigs")) {
      const activeGigs = this.gigs.filter((g) => g.status === "ACTIVE");
      return { items: activeGigs, data: activeGigs, total: activeGigs.length, page: 1, pageSize: 20 };
    }
    if (cleanPath === "/users/me/profile/completeness") {
      return { profileCompleteness: 96 };
    }

    // Skills, Featured, Portfolio, Reviews, Profile
    if (cleanPath === "/skills") {
      return this.skills;
    }
    if (cleanPath === "/featured") {
      return [
        {
          id: "usr-free-01",
          userId: "usr-free-01",
          displayName: "Hanna Tadesse",
          avatarUrl: null,
          primarySkill: { id: "sk-1", nameEn: "Full-Stack & FinTech Engineering" },
          ratingAverage: 4.95,
          totalJobsCompleted: 38,
          completedContracts: 38,
          kycBadge: "shield",
          bio: "Specialist in Telebirr, CBE Birr, and enterprise React/Node architectures.",
        },
        {
          id: "usr-both-01",
          userId: "usr-both-01",
          displayName: "Dawit Mekonnen",
          avatarUrl: null,
          primarySkill: { id: "sk-3", nameEn: "Product UI/UX & Design Systems" },
          ratingAverage: 4.92,
          totalJobsCompleted: 29,
          completedContracts: 29,
          kycBadge: "shield",
          bio: "Designing accessible financial & logistics products for East Africa.",
        },
        {
          id: "usr-free-03",
          userId: "usr-free-03",
          displayName: "Meron Alemu",
          avatarUrl: null,
          primarySkill: { id: "sk-4", nameEn: "Amharic & Afaan Oromo Localization" },
          ratingAverage: 5.0,
          totalJobsCompleted: 51,
          completedContracts: 51,
          kycBadge: "shield",
          bio: "Certified fintech, legal, and medical translator for Ethiopian languages.",
        },
      ];
    }
    if (cleanPath.startsWith("/featured/staff/")) {
      return { ok: true, refreshedAt: new Date().toISOString() };
    }
    if (cleanPath.startsWith("/reviews/")) {
      if (method === "POST") {
        const added = {
          id: `rev-${Date.now()}`,
          rating: Number(parsedBody?.rating || 5),
          comment: String(parsedBody?.comment || "Great collaboration and timely delivery."),
          createdAt: new Date().toISOString(),
          reviewer: { displayName: this.getCurrentUser().email },
        };
        this.reviews = [added, ...this.reviews];
        return added;
      }
      return { items: this.reviews, total: this.reviews.length };
    }
    if (cleanPath.startsWith("/portfolio")) {
      if (method === "POST") {
        const item = {
          id: `pf-${Date.now()}`,
          title: String(parsedBody?.title || "New Portfolio Case Study"),
          description: String(parsedBody?.description || "Delivered with Yekis milestone escrow."),
          thumbnailUrl: String(parsedBody?.thumbnailUrl || "/marketing/yekis-collaboration-banner.png"),
          projectUrl: String(parsedBody?.projectUrl || "https://yekis.et"),
          displayOrder: this.portfolioItems.length + 1,
        };
        this.portfolioItems = [...this.portfolioItems, item];
        return item;
      }
      if (method === "DELETE") {
        const itemId = cleanPath.split("/").pop();
        this.portfolioItems = this.portfolioItems.filter((i) => i.id !== itemId);
        return { deleted: true };
      }
      return this.portfolioItems;
    }
    if (cleanPath.includes("/profile")) {
      const u = this.getCurrentUser();
      const displayName =
        this.activeRole === "CLIENT"
          ? "Abebe Kebede"
          : this.activeRole === "FREELANCER"
            ? "Hanna Tadesse"
            : this.activeRole === "ADMIN"
              ? "Yonael Ops Lead"
              : "Dawit Mekonnen";
      const [firstName, lastName] = displayName.split(" ");
      return {
        id: u.id,
        displayName,
        firstName: String(parsedBody?.firstName || firstName || "Dawit"),
        lastName: String(parsedBody?.lastName || lastName || "Mekonnen"),
        bio: String(
          parsedBody?.bio ||
            "Building resilient escrow-backed software, Telebirr integrations, and digital products across Ethiopia.",
        ),
        avatarUrl: null,
        profileCompleteness: 96,
        isAvailableForWork: parsedBody?.isAvailableForWork !== undefined ? Boolean(parsedBody.isAvailableForWork) : true,
        profileVisibility: (parsedBody?.profileVisibility as "PUBLIC" | "PROPOSERS" | "PRIVATE") || "PUBLIC",
        primarySkillId: String(parsedBody?.primarySkillId || "sk-1"),
        skills: this.skills.slice(0, 6),
        portfolio: this.portfolioItems,
        kyc: { tier: u.kyc?.tier ?? "TIER_2", status: u.kyc?.status ?? "VERIFIED", badgeType: "FAYDA_VERIFIED" },
        stats: {
          jobsCompleted: 38,
          rating: { average: 4.95, count: 38 },
          earnedRange: "ETB 450,000+",
          memberSince: "2025-02-10T00:00:00.000Z",
        },
        isOwnProfile: true,
        canViewFullProfile: true,
      };
    }

    // KYC, Disputes, Chat, Notifications
    if (cleanPath === "/kyc/status") {
      return {
        tier: "TIER_2",
        status: "VERIFIED",
        nextReviewDueAt: isoDaysFromNow(180),
        rejectionReason: null,
        documentsSubmitted: ["NATIONAL_ID", "SELFIE_LIVENESS", "TIN_CERTIFICATE"],
      };
    }
    if (cleanPath === "/kyc/documents" || cleanPath === "/kyc/upgrade-tier2") {
      return { tier: "TIER_2", status: "VERIFIED" };
    }
    if (cleanPath.match(/^\/kyc\/documents\/[^/]+\/url$/)) {
      return { url: "/payment/Telebirr.png" };
    }
    if (cleanPath === "/kyc/fayda/initiate") {
      return {
        authorizeUrl: "https://esignet.ida.gov.et/authorize",
        requestUri: "urn:ietf:params:oauth:request_uri:mock-fayda-par",
        state: "mock-fayda-state",
        clientId: "yekis-fayda-client",
      };
    }
    if (cleanPath === "/disputes" && method === "GET") {
      return this.getDisputes();
    }
    if (cleanPath === "/disputes" && method === "POST") {
      const created: Dispute = {
        id: `dsp-${Date.now().toString().slice(-4)}`,
        contractId: String(parsedBody?.contractId || "ctr-301"),
        milestoneId: String(parsedBody?.milestoneId || "ms-202"),
        category: String(parsedBody?.category || "QUALITY_ISSUE"),
        stage: "STAGE_1_NEGOTIATION",
        description: String(parsedBody?.description || "Milestone scope discrepancy reported."),
        negotiationDeadlineAt: isoDaysFromNow(7),
        mediationDeadlineAt: null,
        mediatorRecommendation: null,
        resolutionOutcome: null,
        createdAt: new Date().toISOString(),
        contract: {
          id: String(parsedBody?.contractId || "ctr-301"),
          clientId: "usr-client-01",
          freelancerId: "usr-free-01",
          job: { title: "Active Escrow Contract" },
        },
        milestone: {
          id: String(parsedBody?.milestoneId || "ms-202"),
          title: "Disputed Milestone",
          amountMinor: 5000000,
          escrowState: "DISPUTED",
        },
        evidence: [],
      };
      this.disputes = [created, ...this.disputes];
      return created;
    }
    if (cleanPath.match(/^\/disputes\/[^/]+\/escalate$/) && method === "POST") {
      const disputeId = cleanPath.split("/")[2];
      this.disputes = this.disputes.map((d) =>
        d.id === disputeId ? { ...d, stage: "STAGE_2_EVIDENCE" } : d,
      );
      return this.disputes.find((d) => d.id === disputeId) || this.disputes[0];
    }
    if (cleanPath.match(/^\/disputes\/[^/]+\/evidence$/) && method === "POST") {
      const disputeId = cleanPath.split("/")[2];
      const statement = String(parsedBody?.statement || "Evidence submitted.");
      this.disputes = this.disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              evidence: [
                ...(d.evidence || []),
                {
                  id: `evd-${Date.now()}`,
                  submittedByUserId: this.getCurrentUser().id,
                  statement,
                  createdAt: new Date().toISOString(),
                },
              ],
            }
          : d,
      );
      return this.disputes.find((d) => d.id === disputeId) || this.disputes[0];
    }
    if (cleanPath.match(/^\/disputes\/[^/]+\/arbitration$/) && method === "POST") {
      const disputeId = cleanPath.split("/")[2];
      this.disputes = this.disputes.map((d) =>
        d.id === disputeId ? { ...d, stage: "STAGE_4_ARBITRATION" } : d,
      );
      return this.disputes.find((d) => d.id === disputeId) || this.disputes[0];
    }
    if (cleanPath.match(/^\/disputes\/[^/]+\/(resolve|claim|arbitration-award)$/) && method === "POST") {
      const disputeId = cleanPath.split("/")[2];
      this.disputes = this.disputes.map((d) =>
        d.id === disputeId
          ? {
              ...d,
              stage: "RESOLVED",
              resolutionOutcome: String(parsedBody?.outcome || "PARTIAL_SPLIT"),
              mediatorRecommendation: String(parsedBody?.recommendation || d.mediatorRecommendation || "Resolved by staff mediator."),
            }
          : d,
      );
      return this.disputes.find((d) => d.id === disputeId) || this.disputes[0];
    }

    // Chat & Assistant
    if (cleanPath === "/chat/conversations" && method === "GET") {
      return this.getConversations();
    }
    if (
      (cleanPath === "/chat/conversations" ||
        cleanPath === "/chat/support" ||
        cleanPath === "/chat/direct" ||
        cleanPath === "/chat/guest") &&
      method === "POST"
    ) {
      const isSupport = cleanPath.includes("support") || cleanPath.includes("guest");
      const newConv: ChatConversation = {
        id: `conv-${Date.now()}`,
        subject: String(parsedBody?.subject || (isSupport ? "Support Request" : "Direct Project Discussion")),
        status: "OPEN",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        latestMessage: parsedBody?.body
          ? {
              body: String(parsedBody.body),
              createdAt: new Date().toISOString(),
              senderId: this.getCurrentUser().id,
            }
          : null,
        otherParticipant: {
          id: isSupport ? "usr-admin-01" : "usr-free-01",
          email: isSupport ? "support@yekis.et" : "hanna.tadesse@addisdev.et",
          role: isSupport ? "ADMIN" : "FREELANCER",
          displayName: isSupport ? "Yekis Support Desk" : "Hanna Tadesse",
        },
        isSupport,
        unread: false,
        assignedStaff: isSupport ? { id: "usr-admin-01", name: "Yonael Mindaye" } : null,
      };
      this.conversations = [newConv, ...this.conversations];
      this.messagesByConv[newConv.id] = [
        {
          id: `msg-${Date.now()}`,
          conversationId: newConv.id,
          senderId: "usr-admin-01",
          body: isSupport
            ? "Selam! Welcome to Yekis Support. How can our escrow or verification team help you today?"
            : "Selam! Let's discuss the project milestones and deliverables here.",
          createdAt: new Date().toISOString(),
          sender: {
            id: "usr-admin-01",
            email: "support@yekis.et",
            role: "ADMIN",
            staffRole: "SUPER_ADMIN",
            displayName: isSupport ? "Yekis Support Desk" : "Hanna Tadesse",
          },
        },
      ];
      return { ...newConv, accessToken: "mock-guest-token" };
    }
    if (cleanPath.startsWith("/chat/conversations/") && cleanPath.endsWith("/messages")) {
      const parts = cleanPath.split("/");
      const convId = parts[3] || "conv-701";
      if (method === "POST") {
        const u = this.getCurrentUser();
        const isStaffReply = convId.startsWith("sup-") || u.role === "ADMIN" || Boolean(u.staffRole);
        const isInternal = Boolean(parsedBody?.internal);
        const msg: ChatMessage & { origin?: string } = {
          id: `msg-${Date.now()}`,
          conversationId: convId,
          senderId: isStaffReply ? "usr-admin-01" : u.id,
          body: String(parsedBody?.body || ""),
          attachmentUrl: (parsedBody?.attachmentUrl as string | undefined) ?? null,
          createdAt: new Date().toISOString(),
          ...(isInternal ? { origin: "STAFF_INTERNAL" } : {}),
          sender: {
            id: isStaffReply ? "usr-admin-01" : u.id,
            email: isStaffReply ? "yonael.ops@yekis.et" : u.email,
            role: isStaffReply ? "ADMIN" : u.role,
            staffRole: isStaffReply ? (u.staffRole || "SUPER_ADMIN") : u.staffRole,
            displayName: isStaffReply
              ? "Yonael Mindaye (Ops)"
              : u.role === "CLIENT"
                ? "Abebe Kebede"
                : u.role === "FREELANCER"
                  ? "Hanna Tadesse"
                  : "Dawit Mekonnen",
          },
        };
        const existing = this.messagesByConv[convId] ?? [];
        this.messagesByConv[convId] = [...existing, msg];
        this.conversations = this.conversations.map((c) =>
          c.id === convId
            ? {
                ...c,
                updatedAt: msg.createdAt,
                latestMessage: { body: msg.body, createdAt: msg.createdAt, senderId: msg.senderId },
              }
            : c,
        );
        return msg;
      }
      return this.getMessages(convId);
    }
    if (cleanPath.endsWith("/assistant/suggest-replies")) {
      return {
        suggestions: [
          "Looks great! I have reviewed the build and will release the escrow milestone now.",
          "Can we split this into two milestones—Phase 1 (ETB 45,000) and Phase 2 (ETB 40,000)?",
          "I have uploaded the Telebirr sandbox logs and deliverable zip for your inspection.",
        ],
      };
    }
    if (cleanPath.endsWith("/assistant/summarize")) {
      return {
        topic: "Telebirr H5 Checkout & CBE Birr Receipt Fallback Review",
        keyPoints: [
          "Phase 1 RSA signature verification was approved and released.",
          "Phase 2 CBE Birr fallback build is uploaded and awaiting client QA sign-off.",
          "Both parties agreed on a 50,000 ETB milestone release upon verification.",
        ],
        agreedBudgetETB: "50,000 ETB",
        detectedTimeline: "4 days remaining",
        nextStep: "Inspect Phase 2 deliverable and release escrow milestone #MS-202.",
        messageCount: 6,
        lastActivity: new Date().toISOString(),
      };
    }
    if (cleanPath.endsWith("/assistant/extract-deal")) {
      return {
        suggestedTitle: "Phase 2: Multi-Rail Escrow Checkout & CBE Birr Flow",
        suggestedBudgetETB: 50000,
        estimatedDays: 5,
        confidence: "HIGH",
        readyForEscrow: true,
      };
    }
    if (cleanPath.endsWith("/read") && cleanPath.startsWith("/chat/")) {
      return { ok: true };
    }

    // Notifications (returns NotificationItem[] array)
    if (cleanPath === "/notifications" && method === "GET") {
      return this.notifications;
    }
    if (cleanPath.match(/^\/notifications\/[^/]+\/read$/) && method === "POST") {
      const id = cleanPath.split("/")[2];
      this.notifications = this.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      );
      return { ok: true };
    }

    /* ── Admin / Operations Console Endpoints ─────────────────────────── */
    if (cleanPath === "/admin/permissions/matrix") {
      const allPerms = [
        "dashboard.view",
        "users.view",
        "users.suspend",
        "admins.manage",
        "contracts.view",
        "escrow.view",
        "payments.view",
        "payouts.view",
        "payouts.settle",
        "reconciliation.view",
        "ledger.view",
        "reports.view",
        "receipts.view",
        "topups.review",
        "kyc.review",
        "tms.review",
        "disputes.view",
        "disputes.mediate",
        "disputes.resolve",
        "support.handle",
        "profiles.moderate",
        "gigs.moderate",
        "featured.manage",
        "bot.manage",
        "monitoring.view",
        "audit.view",
      ];
      return {
        permissions: allPerms,
        roles: {
          SUPER_ADMIN: ["*", ...allPerms],
          ADMIN: ["*", ...allPerms],
          OPERATIONS_ADMIN: [
            "dashboard.view",
            "users.view",
            "users.suspend",
            "contracts.view",
            "escrow.view",
            "payments.view",
            "payouts.view",
            "payouts.settle",
            "disputes.view",
            "support.handle",
            "gigs.moderate",
            "featured.manage",
            "bot.manage",
            "monitoring.view",
            "receipts.view",
          ],
          FINANCE_ADMIN: [
            "dashboard.view",
            "users.view",
            "payments.view",
            "escrow.view",
            "payouts.view",
            "payouts.settle",
            "ledger.view",
            "reconciliation.view",
            "reports.view",
            "receipts.view",
            "topups.review",
            "audit.view",
          ],
          DISPUTE_MEDIATOR: [
            "dashboard.view",
            "users.view",
            "contracts.view",
            "escrow.view",
            "disputes.view",
            "disputes.mediate",
            "disputes.resolve",
          ],
          COMPLIANCE_ADMIN: [
            "dashboard.view",
            "users.view",
            "kyc.review",
            "tms.review",
            "support.handle",
            "disputes.view",
            "disputes.mediate",
            "monitoring.view",
            "audit.view",
            "topups.review",
            "profiles.moderate",
          ],
          COMPLIANCE_OFFICER: [
            "dashboard.view",
            "users.view",
            "kyc.review",
            "tms.review",
            "support.handle",
            "disputes.view",
            "disputes.mediate",
            "monitoring.view",
            "audit.view",
            "topups.review",
            "profiles.moderate",
          ],
          SUPPORT: ["dashboard.view", "users.view", "contracts.view", "support.handle"],
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

    if (cleanPath === "/admin/payments" || cleanPath.match(/^\/admin\/payments\/[^/]+\/action$/)) {
      const storeWithPayments = this as unknown as {
        adminPaymentsStore?: Array<Record<string, unknown>>;
      };
      if (!storeWithPayments.adminPaymentsStore) {
        storeWithPayments.adminPaymentsStore = [
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
            status: "PENDING",
            createdAt: isoDaysAgo(0.35),
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
          {
            id: "pay-5",
            provider: "CBE_BIRR",
            providerTransactionId: "FT26290ERR44",
            amountMinor: 2750000,
            status: "FAILED",
            createdAt: isoDaysAgo(1.2),
            milestone: {
              id: "ms-208",
              title: "Legacy Inventory ERP API Connector",
              contract: {
                id: "ctr-306",
                client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede" },
                freelancer: { id: "usr-free-02", email: "bereket@coders.et", displayName: "Bereket Haile" },
                job: { title: "Legacy Inventory ERP API Connector" },
              },
            },
          },
        ];
      }
      if (cleanPath.endsWith("/action") && method === "POST") {
        const pid = cleanPath.split("/")[3];
        const act = String(parsedBody?.action || "VERIFY");
        storeWithPayments.adminPaymentsStore = storeWithPayments.adminPaymentsStore.map((p) => {
          if (p.id !== pid) return p;
          const nextStatus =
            act === "VERIFY" || act === "RESYNC"
              ? "SUCCESS"
              : act === "REFUND"
                ? "FAILED"
                : "PENDING";
          return {
            ...p,
            status: nextStatus,
            providerTransactionId: parsedBody?.ref ? String(parsedBody.ref) : p.providerTransactionId,
          };
        });
        return { ok: true };
      }
      const query = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
      const q = (query.get("q") || "").trim().toLowerCase();
      const st = (query.get("status") || "").trim().toUpperCase();
      const pr = (query.get("provider") || "").trim().toUpperCase();
      const items = storeWithPayments.adminPaymentsStore.filter((p) => {
        if (st && p.status !== st) return false;
        if (pr && p.provider !== pr) return false;
        if (q) {
          const hay = JSON.stringify(p).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/escrows" || cleanPath.match(/^\/admin\/escrows\/[^/]+\/(release|hold|unhold|action)$/)) {
      const storeWithEscrows = this as unknown as {
        adminEscrowsStore?: Array<Record<string, unknown>>;
      };
      if (!storeWithEscrows.adminEscrowsStore) {
        storeWithEscrows.adminEscrowsStore = [
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
            escrowHolds: [],
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
            escrowHolds: [],
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
            escrowHolds: [],
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
            escrowHolds: [{ id: "hold-1", reason: "Dispute mediation active", createdAt: isoDaysAgo(4) }],
          },
          {
            id: "ms-205",
            title: "Full i18n JSON Bundles & Terminology Glossary",
            amountMinor: 2800000,
            escrowState: "RELEASED",
            createdAt: isoDaysAgo(10),
            contract: {
              id: "ctr-303",
              job: { title: "Amharic & Afaan Oromo FinTech App Localization" },
              client: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen" },
              freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse" },
            },
            paymentTransactions: [{ provider: "TELEBIRR", providerTransactionId: "TB26100774120", status: "SUCCESS" }],
            escrowHolds: [],
          },
        ];
      }
      if (method === "POST") {
        const msId = cleanPath.split("/")[3];
        const verb = cleanPath.split("/")[4];
        const reason = String(parsedBody?.reason || "Administrative escrow action executed.");
        const customAction = String(parsedBody?.action || "").toUpperCase();
        storeWithEscrows.adminEscrowsStore = storeWithEscrows.adminEscrowsStore.map((e) => {
          if (e.id !== msId) return e;
          if (verb === "release" || customAction === "RELEASE") {
            return { ...e, escrowState: "RELEASED", escrowHolds: [] };
          }
          if (verb === "hold" || customAction === "HOLD") {
            return {
              ...e,
              escrowHolds: [{ id: `hold-${Date.now()}`, reason, createdAt: new Date().toISOString() }],
            };
          }
          if (verb === "unhold" || customAction === "UNHOLD") {
            return { ...e, escrowHolds: [] };
          }
          if (customAction === "PARTIAL_SPLIT") {
            return { ...e, escrowState: "PARTIAL_REFUND", escrowHolds: [] };
          }
          if (customAction === "REFUND_CLIENT") {
            return { ...e, escrowState: "REFUNDED", escrowHolds: [] };
          }
          if (customAction === "RETURN_WIP") {
            return { ...e, escrowState: "WORK_IN_PROGRESS", escrowHolds: [] };
          }
          return e;
        });
        return { ok: true };
      }
      const query = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
      const q = (query.get("q") || "").trim().toLowerCase();
      const st = (query.get("escrowState") || "").trim().toUpperCase();
      const items = storeWithEscrows.adminEscrowsStore.filter((e) => {
        if (st && e.escrowState !== st) return false;
        if (q) {
          const hay = JSON.stringify(e).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/payouts" || cleanPath.match(/^\/admin\/payouts\/[^/]+\/settle$/)) {
      const storeWithPayouts = this as unknown as {
        adminPayoutsStore?: Array<Record<string, unknown>>;
      };
      if (!storeWithPayouts.adminPayoutsStore) {
        storeWithPayouts.adminPayoutsStore = [
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
          {
            id: "po-903",
            amountMinor: 3400000,
            feeMinor: 340000,
            netAmountMinor: 3060000,
            provider: "M_PESA",
            providerPayoutId: null,
            payoutAccountIdentifier: "+251711904812",
            status: "PENDING",
            errorMessage: null,
            createdAt: isoDaysAgo(0.1),
            user: { id: "usr-free-03", email: "meron.alemu@lexethiopia.et", displayName: "Meron Alemu" },
          },
          {
            id: "po-904",
            amountMinor: 5100000,
            feeMinor: 510000,
            netAmountMinor: 4590000,
            provider: "TELEBIRR",
            providerPayoutId: "TB-PROC-9012",
            payoutAccountIdentifier: "+251911665544",
            status: "PROCESSING",
            errorMessage: null,
            createdAt: isoDaysAgo(0.45),
            user: { id: "usr-free-04", email: "yohannes.t@addiscloud.et", displayName: "Yohannes Tesfaye" },
          },
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
            id: "po-905",
            amountMinor: 2750000,
            feeMinor: 275000,
            netAmountMinor: 2475000,
            provider: "CBE_BIRR",
            providerPayoutId: null,
            payoutAccountIdentifier: "10009918200",
            status: "FAILED",
            errorMessage: "Beneficiary CBE account name mismatch / dormant wallet",
            createdAt: isoDaysAgo(1.6),
            user: { id: "usr-free-02", email: "bereket@coders.et", displayName: "Bereket Haile" },
          },
        ];
      }
      if (cleanPath.endsWith("/settle") && method === "POST") {
        const poId = cleanPath.split("/")[3];
        const decision = String(parsedBody?.decision || "CONFIRMED");
        const nextProvider = parsedBody?.provider ? String(parsedBody.provider) : null;
        const nextAcct = parsedBody?.payoutAccountIdentifier ? String(parsedBody.payoutAccountIdentifier) : null;
        storeWithPayouts.adminPayoutsStore = storeWithPayouts.adminPayoutsStore.map((p) => {
          if (p.id !== poId) return p;
          if (decision === "RETRY" || decision === "SWITCH_RAIL") {
            return {
              ...p,
              status: "PROCESSING",
              provider: nextProvider || p.provider,
              payoutAccountIdentifier: nextAcct || p.payoutAccountIdentifier,
              providerPayoutId: parsedBody?.providerPayoutId || `RETRY-${Date.now().toString().slice(-5)}`,
              errorMessage: null,
            };
          }
          if (decision === "HOLD") {
            return {
              ...p,
              status: "PENDING",
              errorMessage: String(parsedBody?.failureReason || "Compliance review hold placed by Finance Admin"),
            };
          }
          return {
            ...p,
            status: decision === "CONFIRMED" ? "CONFIRMED" : "FAILED",
            provider: nextProvider || p.provider,
            payoutAccountIdentifier: nextAcct || p.payoutAccountIdentifier,
            providerPayoutId:
              decision === "CONFIRMED"
                ? String(parsedBody?.providerPayoutId || `SETTLED-${Date.now().toString().slice(-6)}`)
                : p.providerPayoutId,
            errorMessage:
              decision === "FAILED"
                ? String(parsedBody?.failureReason || "Failed on rail — wallet re-credited")
                : null,
          };
        });
        return { ok: true, settledAt: new Date().toISOString() };
      }
      const query = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
      const q = (query.get("q") || "").trim().toLowerCase();
      const st = (query.get("status") || "").trim().toUpperCase();
      const pr = (query.get("provider") || "").trim().toUpperCase();
      const items = storeWithPayouts.adminPayoutsStore.filter((p) => {
        if (st && p.status !== st) return false;
        if (pr && p.provider !== pr) return false;
        if (q) {
          const hay = JSON.stringify(p).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/admin/reconciliation" || cleanPath.match(/^\/admin\/reconciliation\/[^/]+\/resolve$/)) {
      const storeWithRecon = this as unknown as {
        adminReconStore?: Array<Record<string, unknown>>;
      };
      if (!storeWithRecon.adminReconStore) {
        storeWithRecon.adminReconStore = [
          {
            id: "rec-4",
            provider: "CBE_BIRR",
            providerTransactionId: "FT26291VAR902",
            amountMinor: 5800000,
            status: "SUCCESS",
            createdAt: isoDaysAgo(0.3),
            reconciliationStatus: "MISMATCH",
            differenceMinor: -45000, // ETB -450.00 unrecorded bank gateway fee
            milestone: { escrowState: "ESCROW_HELD" },
          },
          {
            id: "rec-5",
            provider: "TELEBIRR",
            providerTransactionId: "TB26101990442",
            amountMinor: 4200000,
            status: "SUCCESS",
            createdAt: isoDaysAgo(0.8),
            reconciliationStatus: "MISMATCH",
            differenceMinor: 120000, // ETB +1,200.00 duplicate callback credit
            milestone: { escrowState: "WORK_IN_PROGRESS" },
          },
          {
            id: "rec-3",
            provider: "M_PESA",
            providerTransactionId: "RJK91M28LP",
            amountMinor: 3800000,
            status: "SUCCESS",
            createdAt: isoDaysAgo(1.4),
            reconciliationStatus: "PENDING",
            differenceMinor: null,
            milestone: { escrowState: "ESCROW_HELD" },
          },
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
        ];
      }
      if (cleanPath.endsWith("/resolve") && method === "POST") {
        const recId = cleanPath.split("/")[3];
        const act = String(parsedBody?.action || "FORCE_MATCH");
        storeWithRecon.adminReconStore = storeWithRecon.adminReconStore.map((r) => {
          if (r.id !== recId) return r;
          if (act === "FLAG_FAILED") {
            return { ...r, reconciliationStatus: "FAILED" };
          }
          return {
            ...r,
            reconciliationStatus: "MATCHED",
            differenceMinor: 0,
          };
        });
        return { ok: true };
      }
      const query = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
      const pr = (query.get("provider") || "").trim().toUpperCase();
      const rs = (query.get("recStatus") || "").trim().toUpperCase();
      const items = storeWithRecon.adminReconStore.filter((r) => {
        if (pr && r.provider !== pr) return false;
        if (rs && r.reconciliationStatus !== rs) return false;
        return true;
      });
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
          { id: "acc-6", code: "4010", name: "Platform Commission Revenue (5%)", type: "REVENUE", currency: "ETB", balanceMinor: 39500000 },
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

    if (cleanPath === "/admin/ledger/journals" || cleanPath.match(/^\/admin\/ledger\/journals\/[^/]+\/action$/)) {
      const storeWithJournals = this as unknown as {
        adminJournalsStore?: Array<Record<string, unknown>>;
      };
      if (!storeWithJournals.adminJournalsStore) {
        storeWithJournals.adminJournalsStore = [
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
            description: "Milestone Release & Commission Split — Phase 1 SDK (3% WHT Deducted)",
            referenceType: "PAYOUT_SETTLEMENT",
            referenceId: "po-901",
            postedAt: isoDaysAgo(1),
            totalDebitsMinor: 4500000,
            totalCreditsMinor: 4500000,
          },
          {
            id: "jrn-103",
            description: "CBE Birr Custody Deposit — Addis Coffee Export ERP (FT26289C8831)",
            referenceType: "MILESTONE_ESCROW",
            referenceId: "ms-203",
            postedAt: isoDaysAgo(2),
            totalDebitsMinor: 6200000,
            totalCreditsMinor: 6200000,
          },
          {
            id: "jrn-104",
            description: "ERCA Monthly Withholding Accrual Transfer — Period 2026-09",
            referenceType: "WITHHOLDING_TAX",
            referenceId: "wh-2026-09",
            postedAt: isoDaysAgo(4),
            totalDebitsMinor: 6850000,
            totalCreditsMinor: 6850000,
          },
          {
            id: "jrn-105",
            description: "Platform Service Fee Realization (10% Marketplace Commission)",
            referenceType: "PLATFORM_FEE",
            referenceId: "ctr-303",
            postedAt: isoDaysAgo(6),
            totalDebitsMinor: 280000,
            totalCreditsMinor: 280000,
          },
        ];
      }
      if (method === "POST") {
        const act = String(parsedBody?.action || "ADJUSTMENT");
        const amt = Number(parsedBody?.amountMinor || 45000);
        const desc = String(
          parsedBody?.description ||
            (act === "REVERSE"
              ? `Contra-Reversal Entry for ${cleanPath.split("/")[4]}`
              : "Manual Ledger Adjustment Entry — Finance Admin"),
        );
        const refType = String(parsedBody?.referenceType || "MANUAL_ADJUSTMENT");
        storeWithJournals.adminJournalsStore = [
          {
            id: `jrn-${Date.now().toString().slice(-4)}`,
            description: desc,
            referenceType: refType,
            referenceId: String(parsedBody?.referenceId || "adj-01"),
            postedAt: new Date().toISOString(),
            totalDebitsMinor: amt,
            totalCreditsMinor: amt,
          },
          ...storeWithJournals.adminJournalsStore,
        ];
        return { ok: true };
      }
      const query = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
      const q = (query.get("q") || "").trim().toLowerCase();
      const rt = (query.get("referenceType") || "").trim().toUpperCase();
      const items = storeWithJournals.adminJournalsStore.filter((j) => {
        if (rt && rt !== "ALL" && j.referenceType !== rt) return false;
        if (q) {
          const hay = JSON.stringify(j).toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
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
      const allUsers = [
        {
          id: "usr-client-01",
          ucid: "YEK-CL-1042",
          email: "abebe.kebede@abyssinia-tech.et",
          phone: "+251911234567",
          displayName: "Abebe Kebede",
          role: "CLIENT",
          staffRole: null,
          isSuspended: Boolean((this as unknown as { suspendedUsers?: Record<string, boolean> }).suspendedUsers?.["usr-client-01"]),
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
          isSuspended: Boolean((this as unknown as { suspendedUsers?: Record<string, boolean> }).suspendedUsers?.["usr-free-01"]),
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
          isSuspended: Boolean((this as unknown as { suspendedUsers?: Record<string, boolean> }).suspendedUsers?.["usr-both-01"]),
          cachedKycTier: "TIER_3",
          cachedKycStatus: "VERIFIED",
          createdAt: isoDaysAgo(30),
        },
        {
          id: "usr-free-03",
          ucid: "YEK-FL-3890",
          email: "meron.alemu@lexethiopia.et",
          phone: "+251944112233",
          displayName: "Meron Alemu",
          role: "FREELANCER",
          staffRole: null,
          isSuspended: Boolean((this as unknown as { suspendedUsers?: Record<string, boolean> }).suspendedUsers?.["usr-free-03"]),
          cachedKycTier: "TIER_3",
          cachedKycStatus: "VERIFIED",
          createdAt: isoDaysAgo(75),
        },
      ];
      const query = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
      const q = (query.get("q") || "").trim().toLowerCase();
      const roleFilter = (query.get("role") || "").trim().toUpperCase();
      const items = allUsers.filter((u) => {
        if (roleFilter && u.role !== roleFilter) return false;
        if (q) {
          const hay = `${u.displayName} ${u.email} ${u.phone} ${u.ucid}`.toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      });
      return { items, total: items.length, page: 1, pageSize: 25 };
    }
    if (cleanPath.match(/^\/admin\/users\/[^/]+\/(suspend|unsuspend|force-kyc-rereview)$/) && method === "POST") {
      const uid = cleanPath.split("/")[3];
      const storeWithSusp = this as unknown as { suspendedUsers?: Record<string, boolean> };
      if (!storeWithSusp.suspendedUsers) storeWithSusp.suspendedUsers = {};
      if (cleanPath.endsWith("/suspend")) storeWithSusp.suspendedUsers[uid] = true;
      if (cleanPath.endsWith("/unsuspend")) storeWithSusp.suspendedUsers[uid] = false;
      return {
        id: uid,
        isSuspended: Boolean(storeWithSusp.suspendedUsers[uid]),
        kycRecordId: "kyc-1",
        periodicReviewPending: true,
        nextReviewDueAt: isoDaysFromNow(14),
      };
    }
    if (cleanPath.startsWith("/admin/users/")) {
      const uid = cleanPath.split("/")[3] || "usr-free-01";
      const storeWithSusp = this as unknown as { suspendedUsers?: Record<string, boolean> };
      const isSuspended = Boolean(storeWithSusp.suspendedUsers?.[uid]);
      const profiles: Record<string, {
        user: {
          id: string;
          ucid: string;
          email: string;
          phone: string;
          displayName: string;
          role: "CLIENT" | "FREELANCER" | "BOTH";
          isSuspended: boolean;
          cachedKycTier: string;
          cachedKycStatus: string;
          profileCompleteness: number;
          createdAt: string;
        };
        walletBalance: number;
        walletBalanceMinor: number;
        activity: {
          jobsPosted: number;
          proposalsSubmitted: number;
          contractsAsClient: number;
          contractsAsFreelancer: number;
          gigsOwned: number;
          gigOrders: number;
        };
        recentConversations: Array<{ id: string; subject: string; status: string; updatedAt: string }>;
        recentAudit: Array<{ id: string; eventType: string; entityType: string; action: string | null; createdAt: string }>;
      }> = {
        "usr-client-01": {
          user: {
            id: "usr-client-01",
            ucid: "YEK-CL-1042",
            email: "abebe.kebede@abyssinia-tech.et",
            phone: "+251911234567",
            displayName: "Abebe Kebede",
            role: "CLIENT",
            isSuspended,
            cachedKycTier: "TIER_2",
            cachedKycStatus: "VERIFIED",
            profileCompleteness: 95,
            createdAt: isoDaysAgo(45),
          },
          walletBalance: 24500000,
          walletBalanceMinor: 24500000,
          activity: {
            jobsPosted: 8,
            proposalsSubmitted: 0,
            contractsAsClient: 6,
            contractsAsFreelancer: 0,
            gigsOwned: 0,
            gigOrders: 4,
          },
          recentConversations: [
            { id: "sup-101", subject: "Telebirr Corporate Escrow Deposit Receipt Inquiry", status: "CLOSED", updatedAt: isoDaysAgo(3) },
            { id: "sup-102", subject: "VAT Fiscal Invoice TIN Verification for Abyssinia Tech", status: "OPEN", updatedAt: isoDaysAgo(0.8) },
          ],
          recentAudit: [
            { id: "aud-u1", eventType: "ESCROW_FUNDED", entityType: "Milestone", action: "TELEBIRR_H5_DEPOSIT", createdAt: isoDaysAgo(0.5) },
            { id: "aud-u2", eventType: "MILESTONE_RELEASED", entityType: "Milestone", action: "CLIENT_APPROVAL", createdAt: isoDaysAgo(4) },
            { id: "aud-u3", eventType: "KYC_VERIFIED", entityType: "KycRecord", action: "TIER_2_APPROVED", createdAt: isoDaysAgo(40) },
          ],
        },
        "usr-free-01": {
          user: {
            id: "usr-free-01",
            ucid: "YEK-FL-2089",
            email: "hanna.tadesse@addisdev.et",
            phone: "+251922345678",
            displayName: "Hanna Tadesse",
            role: "FREELANCER",
            isSuspended,
            cachedKycTier: "TIER_2",
            cachedKycStatus: "VERIFIED",
            profileCompleteness: 98,
            createdAt: isoDaysAgo(60),
          },
          walletBalance: 14280000,
          walletBalanceMinor: 14280000,
          activity: {
            jobsPosted: 2,
            proposalsSubmitted: 19,
            contractsAsClient: 1,
            contractsAsFreelancer: 14,
            gigsOwned: 3,
            gigOrders: 38,
          },
          recentConversations: [
            { id: "sup-2", subject: "Fayda TIN Certificate Tier 2 Upgrade Inquiry", status: "OPEN", updatedAt: isoDaysAgo(0.6) },
          ],
          recentAudit: [
            { id: "aud-f1", eventType: "PAYOUT_SETTLED", entityType: "Payout", action: "TELEBIRR_DISBURSEMENT", createdAt: isoDaysAgo(1) },
            { id: "aud-f2", eventType: "DELIVERABLE_SUBMITTED", entityType: "Milestone", action: "UPLOAD_BUILD_ARCHIVE", createdAt: isoDaysAgo(2) },
            { id: "aud-f3", eventType: "KYC_VERIFIED", entityType: "KycRecord", action: "FAYDA_TIER2_APPROVED", createdAt: isoDaysAgo(15) },
          ],
        },
        "usr-both-01": {
          user: {
            id: "usr-both-01",
            ucid: "YEK-DL-3015",
            email: "dawit.mekonnen@ethio-digital.et",
            phone: "+251933456789",
            displayName: "Dawit Mekonnen",
            role: "BOTH",
            isSuspended,
            cachedKycTier: "TIER_3",
            cachedKycStatus: "VERIFIED",
            profileCompleteness: 100,
            createdAt: isoDaysAgo(30),
          },
          walletBalance: 31850000,
          walletBalanceMinor: 31850000,
          activity: {
            jobsPosted: 5,
            proposalsSubmitted: 24,
            contractsAsClient: 4,
            contractsAsFreelancer: 11,
            gigsOwned: 4,
            gigOrders: 29,
          },
          recentConversations: [
            { id: "sup-1", subject: "CBE Birr Receipt Reference Verification", status: "OPEN", updatedAt: isoDaysAgo(0.2) },
          ],
          recentAudit: [
            { id: "aud-b1", eventType: "TOPUP_SUBMITTED", entityType: "WalletTopUp", action: "CBE_RECEIPT_UPLOAD", createdAt: isoDaysAgo(0.3) },
            { id: "aud-b2", eventType: "CONTRACT_SIGNED", entityType: "Contract", action: "ESCROW_ACTIVE", createdAt: isoDaysAgo(5) },
            { id: "aud-b3", eventType: "KYC_VERIFIED", entityType: "KycRecord", action: "TIER_3_BUSINESS_APPROVED", createdAt: isoDaysAgo(25) },
          ],
        },
        "usr-free-03": {
          user: {
            id: "usr-free-03",
            ucid: "YEK-FL-3890",
            email: "meron.alemu@lexethiopia.et",
            phone: "+251944112233",
            displayName: "Meron Alemu",
            role: "FREELANCER",
            isSuspended,
            cachedKycTier: "TIER_3",
            cachedKycStatus: "VERIFIED",
            profileCompleteness: 96,
            createdAt: isoDaysAgo(75),
          },
          walletBalance: 8940000,
          walletBalanceMinor: 8940000,
          activity: {
            jobsPosted: 0,
            proposalsSubmitted: 15,
            contractsAsClient: 0,
            contractsAsFreelancer: 9,
            gigsOwned: 2,
            gigOrders: 21,
          },
          recentConversations: [
            { id: "sup-301", subject: "M-Pesa Safaricom Payout Settlement Confirmation", status: "CLOSED", updatedAt: isoDaysAgo(4) },
          ],
          recentAudit: [
            { id: "aud-m1", eventType: "PAYOUT_REQUESTED", entityType: "Payout", action: "MPESA_WITHDRAWAL", createdAt: isoDaysAgo(0.1) },
            { id: "aud-m2", eventType: "WHT_CERTIFICATE_ISSUED", entityType: "TaxVoucher", action: "ERCA_3PCT_WHT", createdAt: isoDaysAgo(6) },
          ],
        },
      };
      return profiles[uid] ?? profiles["usr-free-01"];
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
    if (cleanPath.match(/^\/admin\/staff\/[^/]+\/(role|status)$/) && method === "POST") {
      const uid = cleanPath.split("/")[3];
      return {
        id: uid,
        email: "selam.finance@yekis.et",
        staffRole: String(parsedBody?.staffRole || "FINANCE_ADMIN"),
        isSuspended: Boolean(parsedBody?.suspended),
      };
    }

    if (cleanPath === "/admin/gigs") {
      const rows = this.gigs.map((g) => ({
        id: g.id,
        title: g.title,
        description: g.description,
        category: g.category,
        status: g.status,
        updatedAt: g.createdAt,
        freelancer: {
          id: g.freelancer?.id || g.freelancerId,
          email: "hanna.tadesse@addisdev.et",
          displayName: g.freelancer?.displayName || "Hanna Tadesse",
        },
        packages: (g.packages || []).map((p) => ({
          tier: p.tier,
          priceMinor: p.priceMinor,
          deliveryDays: p.deliveryDays,
        })),
      }));
      return { items: rows, total: rows.length, page: 1, pageSize: 25 };
    }
    if (cleanPath.match(/^\/admin\/gigs\/[^/]+\/moderation$/) && method === "POST") {
      const gigId = cleanPath.split("/")[3];
      const nextStatus = String(parsedBody?.status || "ACTIVE");
      this.gigs = this.gigs.map((g) => (g.id === gigId ? { ...g, status: nextStatus } : g));
      return { id: gigId, status: nextStatus };
    }

    if (cleanPath === "/admin/contracts" || cleanPath.startsWith("/admin/contracts/")) {
      const storeWithContracts = this as unknown as {
        adminContractsStore?: Array<{
          id: string;
          status: string;
          createdAt: string;
          client: { id: string; email: string; displayName: string; role: string };
          freelancer: { id: string; email: string; displayName: string; role: string };
          job: { id: string; title: string; category: string };
          milestones: Array<{ id: string; title: string; amountMinor: number; escrowState: string }>;
          payments: Array<{ provider: string; amountMinor: number; status: string; createdAt: string; milestone: { title: string } }>;
          disputes: Array<{ id: string; stage: string; category: string }>;
        }>;
      };
      if (!storeWithContracts.adminContractsStore) {
        storeWithContracts.adminContractsStore = [
          {
            id: "ctr-301",
            status: "ACTIVE",
            createdAt: isoDaysAgo(14),
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede", role: "CLIENT" },
            freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse", role: "FREELANCER" },
            job: { id: "job-101", title: "Telebirr SuperApp Mini-Program", category: "WEB_APP_DEVELOPMENT" },
            milestones: [
              { id: "ms-201", title: "Phase 1: Architecture & Telebirr H5 SDK", amountMinor: 4500000, escrowState: "RELEASED" },
              { id: "ms-202", title: "Phase 2: Multi-Rail Escrow Checkout", amountMinor: 5000000, escrowState: "SUBMITTED_FOR_REVIEW" },
            ],
            payments: [
              { provider: "TELEBIRR", amountMinor: 4500000, status: "SUCCESS", createdAt: isoDaysAgo(12), milestone: { title: "Phase 1" } },
              { provider: "TELEBIRR", amountMinor: 5000000, status: "SUCCESS", createdAt: isoDaysAgo(3), milestone: { title: "Phase 2" } },
            ],
            disputes: [],
          },
          {
            id: "ctr-302",
            status: "ACTIVE",
            createdAt: isoDaysAgo(9),
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede", role: "CLIENT" },
            freelancer: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen", role: "BOTH" },
            job: { id: "job-102", title: "Addis Coffee Export ERP", category: "WEB_APP_DEVELOPMENT" },
            milestones: [
              { id: "ms-203", title: "Supply Chain Lot Tracking Schema", amountMinor: 6200000, escrowState: "WORK_IN_PROGRESS" },
              { id: "ms-204", title: "Executive ECX Analytics & Container Map", amountMinor: 5800000, escrowState: "ESCROW_HELD" },
            ],
            payments: [
              { provider: "CBE_BIRR", amountMinor: 6200000, status: "SUCCESS", createdAt: isoDaysAgo(5), milestone: { title: "Lot Tracking Schema" } },
              { provider: "CBE_BIRR", amountMinor: 5800000, status: "SUCCESS", createdAt: isoDaysAgo(2), milestone: { title: "ECX Analytics" } },
            ],
            disputes: [],
          },
          {
            id: "ctr-306",
            status: "ACTIVE",
            createdAt: isoDaysAgo(8),
            client: { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", displayName: "Abebe Kebede", role: "CLIENT" },
            freelancer: { id: "usr-free-02", email: "bereket@coders.et", displayName: "Bereket Haile", role: "FREELANCER" },
            job: { id: "job-106", title: "Legacy Inventory ERP API Connector", category: "WEB_APP_DEVELOPMENT" },
            milestones: [
              { id: "ms-208", title: "ERP API Connector & SKU Batch Sync", amountMinor: 2750000, escrowState: "DISPUTED" },
            ],
            payments: [
              { provider: "M_PESA", amountMinor: 2750000, status: "SUCCESS", createdAt: isoDaysAgo(7), milestone: { title: "ERP API Connector" } },
            ],
            disputes: [{ id: "dsp-601", stage: "STAGE_3_MEDIATION", category: "QUALITY_OF_WORK" }],
          },
          {
            id: "ctr-303",
            status: "COMPLETED",
            createdAt: isoDaysAgo(12),
            client: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", displayName: "Dawit Mekonnen", role: "BOTH" },
            freelancer: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", displayName: "Hanna Tadesse", role: "FREELANCER" },
            job: { id: "job-104", title: "Amharic & Afaan Oromo FinTech App Localization", category: "TRANSLATION" },
            milestones: [
              { id: "ms-205", title: "Full i18n JSON Bundles & Terminology Glossary", amountMinor: 2800000, escrowState: "RELEASED" },
            ],
            payments: [
              { provider: "TELEBIRR", amountMinor: 2800000, status: "SUCCESS", createdAt: isoDaysAgo(10), milestone: { title: "Full i18n JSON Bundles" } },
            ],
            disputes: [],
          },
        ];
      }

      if (cleanPath.match(/^\/admin\/contracts\/[^/]+\/intervene$/) && method === "POST") {
        const cid = cleanPath.split("/")[3];
        const act = String(parsedBody?.action || "RELEASE_MILESTONE");
        storeWithContracts.adminContractsStore = storeWithContracts.adminContractsStore.map((c) => {
          if (c.id !== cid) return c;
          if (act === "RELEASE_MILESTONE") {
            return {
              ...c,
              milestones: c.milestones.map((m, idx) =>
                idx === c.milestones.length - 1 || m.escrowState !== "RELEASED"
                  ? { ...m, escrowState: "RELEASED" }
                  : m,
              ),
              status: "COMPLETED",
            };
          }
          if (act === "TERMINATE_REFUND") {
            return {
              ...c,
              status: "TERMINATED",
              milestones: c.milestones.map((m) =>
                m.escrowState !== "RELEASED" ? { ...m, escrowState: "REFUNDED" } : m,
              ),
            };
          }
          if (act === "OPEN_MEDIATION") {
            return {
              ...c,
              disputes: [
                ...c.disputes,
                { id: `dsp-${Date.now().toString().slice(-3)}`, stage: "STAGE_3_MEDIATION", category: "ADMIN_ESCALATION" },
              ],
            };
          }
          if (act === "COMPLETE_CONTRACT") {
            return { ...c, status: "COMPLETED" };
          }
          return c;
        });
        return { ok: true };
      }

      if (cleanPath === "/admin/contracts") {
        const query = new URLSearchParams(path.includes("?") ? path.split("?")[1] : "");
        const q = (query.get("q") || "").trim().toLowerCase();
        const st = (query.get("status") || "").trim().toUpperCase();
        const filtered = storeWithContracts.adminContractsStore.filter((c) => {
          if (st && c.status !== st) return false;
          if (q) {
            const hay = `${c.id} ${c.job.title} ${c.client.displayName} ${c.freelancer.displayName}`.toLowerCase();
            if (!hay.includes(q)) return false;
          }
          return true;
        });
        const items = filtered.map((c) => ({
          id: c.id,
          status: c.status,
          createdAt: c.createdAt,
          client: c.client,
          freelancer: c.freelancer,
          job: c.job,
          _count: { milestones: c.milestones.length },
        }));
        return { items, total: items.length, page: 1, pageSize: 25 };
      }

      const cid = cleanPath.split("/")[3] || "ctr-301";
      const found =
        storeWithContracts.adminContractsStore.find((c) => c.id === cid) ||
        storeWithContracts.adminContractsStore[0];
      const escrowHeldMinor = found.milestones
        .filter((m) => m.escrowState !== "RELEASED" && m.escrowState !== "REFUNDED")
        .reduce((acc, m) => acc + m.amountMinor, 0);
      return {
        contract: {
          id: found.id,
          status: found.status,
          createdAt: found.createdAt,
          jobTitle: found.job.title,
          jobCategory: found.job.category,
        },
        parties: {
          client: found.client,
          freelancer: found.freelancer,
        },
        milestones: found.milestones,
        payments: found.payments,
        disputes: found.disputes,
        totals: { escrowHeldMinor, milestoneCount: found.milestones.length },
      };
    }

    if (cleanPath === "/kyc/review-queue") {
      const items = [
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
        {
          id: "kyc-2",
          userId: "usr-free-05",
          tier: "TIER_3",
          status: "UNDER_REVIEW",
          fullName: "Meron Alemu Bekele",
          documentNumber: "PASS-EP9948102",
          tin: "0091827364",
          businessRegNumber: "AA/BOLE/2025/99104",
          isPepMatch: false,
          faydaVerificationAttempted: true,
          faydaVerificationSucceeded: true,
          rejectionReason: null,
          updatedAt: isoDaysAgo(0.8),
          user: { id: "usr-free-05", email: "meron.alemu@lexethiopia.et", ucid: "YEK-FL-3890" },
          documents: [
            { id: "doc-3", documentType: "PASSPORT", uploadedAt: isoDaysAgo(0.8) },
            { id: "doc-4", documentType: "TIN_CERTIFICATE", uploadedAt: isoDaysAgo(0.8) },
          ],
        },
      ];
      return { items, total: items.length, page: 1, pageSize: 25 };
    }
    if (cleanPath.match(/^\/kyc\/[^/]+\/review$/) && method === "POST") {
      return { ok: true };
    }
    if (cleanPath.match(/^\/kyc\/[^/]+\/history$/)) {
      return [
        {
          id: "kh-1",
          staffUserId: "usr-admin-01",
          decision: "VERIFIED",
          tierAtDecision: "TIER_1",
          reason: "Phone & Fayda OTP verified",
          createdAt: isoDaysAgo(10),
        },
      ];
    }

    if (cleanPath === "/disputes/staff/queue") {
      const items = [
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
            { id: "ev-2", submittedByUserId: "usr-free-01", statement: "Streaming pagination fix deployed on staging.", createdAt: isoDaysAgo(2) },
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
      return { items, total: items.length, page: 1, pageSize: 25 };
    }

    if (cleanPath === "/tms/queue") {
      const items = [
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
      return { items, total: items.length, page: 1, pageSize: 25 };
    }
    if (cleanPath === "/tms/activity") {
      return [
        {
          id: "tms-act-1",
          userId: "usr-admin-01",
          eventType: "TMS_SCAN_COMPLETED",
          entityType: "TransactionFlag",
          entityId: "flg-1",
          action: "RULE_VELOCITY_TRIGGERED",
          actorRole: "COMPLIANCE_OFFICER",
          amountMinor: 19500000,
          requestId: "req-tms-01",
          ipAddress: "196.188.42.19",
          createdAt: isoDaysAgo(0.6),
          user: { id: "usr-admin-01", email: "yonael.ops@yekis.et", staffRole: "SUPER_ADMIN" },
        },
      ];
    }
    if (cleanPath.match(/^\/tms\/[^/]+\/(file-str|dismiss)$/) || cleanPath.match(/^\/tms\/users\/[^/]+\/lift-hold$/)) {
      return { ok: true };
    }

    if (cleanPath === "/staff/reports" || (cleanPath.match(/^\/staff\/reports\/[^/]+$/) && method === "PATCH")) {
      const storeWithReports = this as unknown as {
        profileReportsStore?: Array<Record<string, unknown>>;
      };
      if (!storeWithReports.profileReportsStore) {
        storeWithReports.profileReportsStore = [
          {
            id: "rep-1",
            reason: "OFF_PLATFORM_CONTACT",
            severity: "HIGH",
            sourceContext: "Proposal #PRP-884 · Telebirr SuperApp Mini-Program",
            details:
              "Requested direct Telegram handle (@natnael_dev_et) and direct CBE bank transfer in proposal cover letter to bypass the 10% platform commission.",
            flaggedExcerpt:
              "Selam Abebe, we can skip the Yekis escrow fee if you message me directly on Telegram @natnael_dev_et and transfer 50% upfront to my CBE account 100038492011.",
            status: "PENDING",
            staffNotes: null,
            createdAt: isoDaysAgo(1),
            priorReportsCount: 2,
            priorWarningsCount: 1,
            activeContractsCount: 1,
            escrowExposureMinor: 4500000,
            reportedUser: {
              id: "usr-free-01",
              ucid: "YEK-FL-2911",
              displayName: "Natnael Girma",
              email: "natnael.g@codersaddis.et",
              role: "FREELANCER",
              kycTier: "TIER_2",
              kycStatus: "VERIFIED",
            },
            reporter: {
              id: "usr-client-01",
              ucid: "YEK-CL-1042",
              displayName: "Abebe Kebede",
              email: "abebe.kebede@abyssinia-tech.et",
              role: "CLIENT",
            },
            checks: {
              regexFlagged: true,
              repeatOffender: true,
              escrowAtRisk: true,
              faydaVerified: true,
            },
            evidence: [
              { id: "doc-1", t: "PROPOSAL_COVER_LETTER", k: "id-front" },
              { id: "doc-2", t: "REGEX_FILTER_LOG", k: "tin" },
            ],
            history: [
              {
                d: "RESOLVED_WARNED",
                by: "kaleb.mediation@yekis.et",
                at: isoDaysAgo(18),
                reason: "First strike warning issued for sharing phone number in gig FAQ.",
              },
            ],
          },
          {
            id: "rep-2",
            reason: "IMPERSONATION",
            severity: "CRITICAL",
            sourceContext: "Public Portfolio & Gig Listing #GIG-512",
            details:
              "Copied portfolio UI screenshots, ECX coffee export case study metrics, and Bole trade registration number from Hanna Tadesse's verified Tier 3 profile.",
            flaggedExcerpt:
              "Lead Architect of the Addis Coffee Export ERP (Reg: AA/BOLE/2025/99104) — 100% verified ECX logistics platform builder.",
            status: "PENDING",
            staffNotes: null,
            createdAt: isoDaysAgo(0.4),
            priorReportsCount: 3,
            priorWarningsCount: 2,
            activeContractsCount: 0,
            escrowExposureMinor: 0,
            reportedUser: {
              id: "usr-free-03",
              ucid: "YEK-FL-4402",
              displayName: "Biniyam Tekle",
              email: "biniyam.ethio@devmail.et",
              role: "FREELANCER",
              kycTier: "TIER_1",
              kycStatus: "PENDING",
            },
            reporter: {
              id: "usr-free-01",
              ucid: "YEK-FL-2089",
              displayName: "Hanna Tadesse",
              email: "hanna.tadesse@addisdev.et",
              role: "FREELANCER",
            },
            checks: {
              regexFlagged: true,
              repeatOffender: true,
              escrowAtRisk: false,
              faydaVerified: false,
            },
            evidence: [
              { id: "doc-3", t: "PORTFOLIO_HASH_MATCH", k: "id-front" },
              { id: "doc-4", t: "STOLEN_TIN_REG_CLAIM", k: "tin" },
            ],
            history: [
              {
                d: "AUTOMATED_SIMILARITY_FLAG",
                by: "system.trust@yekis.et",
                at: isoDaysAgo(1.2),
                reason: "98.4% image perceptual hash match against verified freelancer YEK-FL-2089.",
              },
            ],
          },
          {
            id: "rep-3",
            reason: "FRAUD",
            severity: "CRITICAL",
            sourceContext: "Direct Chat #CONV-741 · ERP Inventory Sync",
            details:
              "Sent an unverified CBE Birr receipt screenshot in direct chat claiming Milestone #2 was funded, pressuring freelancer to hand over production SSH credentials before escrow state transitioned to ESCROW_HELD.",
            flaggedExcerpt:
              "I already transferred ETB 65,000 via CBE Birr (Ref FT26000UNVERIFIED). The admin queue is slow—send me the production database dump now or I will cancel.",
            status: "PENDING",
            staffNotes: null,
            createdAt: isoDaysAgo(0.7),
            priorReportsCount: 1,
            priorWarningsCount: 0,
            activeContractsCount: 2,
            escrowExposureMinor: 6200000,
            reportedUser: {
              id: "usr-client-01",
              ucid: "YEK-CL-3190",
              displayName: "Robel Assefa",
              email: "robel.imports@boletrade.et",
              role: "CLIENT",
              kycTier: "TIER_2",
              kycStatus: "VERIFIED",
            },
            reporter: {
              id: "usr-both-01",
              ucid: "YEK-DL-3015",
              displayName: "Dawit Mekonnen",
              email: "dawit.mekonnen@ethio-digital.et",
              role: "BOTH",
            },
            checks: {
              regexFlagged: true,
              repeatOffender: false,
              escrowAtRisk: true,
              faydaVerified: true,
            },
            evidence: [
              { id: "doc-1", t: "CHAT_TRANSCRIPT_SNAPSHOT", k: "id-front" },
              { id: "doc-2", t: "UNMATCHED_CBE_RECEIPT", k: "license" },
            ],
            history: [
              {
                d: "ESCALATED_FROM_SUPPORT",
                by: "yonael.ops@yekis.et",
                at: isoDaysAgo(0.6),
                reason: "Receipt reference FT26000UNVERIFIED not found in CBE custody settlement ledger.",
              },
            ],
          },
          {
            id: "rep-4",
            reason: "ABUSIVE_LANGUAGE",
            severity: "MEDIUM",
            sourceContext: "Contract #CTR-304 · Milestone Revision Thread",
            details:
              "Used hostile language in milestone revision thread after client requested an RTL/Amharic typography alignment fix.",
            flaggedExcerpt:
              "Stop wasting my time with nitpicky Figma alignment checks or I will wipe the staging branch tonight.",
            status: "PENDING",
            staffNotes: null,
            createdAt: isoDaysAgo(2.3),
            priorReportsCount: 1,
            priorWarningsCount: 0,
            activeContractsCount: 1,
            escrowExposureMinor: 3800000,
            reportedUser: {
              id: "usr-both-01",
              ucid: "YEK-FL-3318",
              displayName: "Samuel Bekele",
              email: "samuel.b@hawassadevs.et",
              role: "FREELANCER",
              kycTier: "TIER_2",
              kycStatus: "VERIFIED",
            },
            reporter: {
              id: "usr-client-01",
              ucid: "YEK-CL-1804",
              displayName: "Solomon T.",
              email: "solomon@zemenbank.et",
              role: "CLIENT",
            },
            checks: {
              regexFlagged: false,
              repeatOffender: false,
              escrowAtRisk: true,
              faydaVerified: true,
            },
            evidence: [
              { id: "doc-3", t: "REVISION_THREAD_LOG", k: "id-front" },
            ],
            history: [],
          },
          {
            id: "rep-5",
            reason: "SPAM",
            severity: "LOW",
            sourceContext: "Direct Message Broadcast",
            details:
              "Sent unsolicited bulk messages to 14 freelancers offering paid Telegram channel promotions and artificial gig review swaps.",
            flaggedExcerpt:
              "Boost your Yekis gig ranking in 24 hours! Join our Addis review exchange group for ETB 500.",
            status: "RESOLVED_PROFILE_HIDDEN",
            staffNotes: "Profile hidden until promotional links removed from bio.",
            createdAt: isoDaysAgo(5),
            priorReportsCount: 2,
            priorWarningsCount: 1,
            activeContractsCount: 0,
            escrowExposureMinor: 0,
            reportedUser: {
              id: "usr-free-03",
              ucid: "YEK-FL-5012",
              displayName: "Kirubel M.",
              email: "kirubel.seo@addispromo.et",
              role: "FREELANCER",
              kycTier: "TIER_1",
              kycStatus: "VERIFIED",
            },
            reporter: {
              id: "usr-free-03",
              ucid: "YEK-FL-3890",
              displayName: "Meron Alemu",
              email: "meron.alemu@lexethiopia.et",
              role: "FREELANCER",
            },
            checks: {
              regexFlagged: true,
              repeatOffender: true,
              escrowAtRisk: false,
              faydaVerified: true,
            },
            evidence: [
              { id: "doc-4", t: "BULK_DM_RATE_LOG", k: "tin" },
            ],
            history: [
              {
                d: "RESOLVED_PROFILE_HIDDEN",
                by: "yonael.ops@yekis.et",
                at: isoDaysAgo(4.2),
                reason: "Profile hidden until promotional links removed from bio.",
              },
            ],
          },
        ];
      }

      if (method === "PATCH") {
        const repId = cleanPath.split("/")[3];
        const nextStatus = String(parsedBody?.status || "RESOLVED_NO_ACTION");
        const staffNotes = String(parsedBody?.staffNotes || "Reviewed by Trust & Safety.");
        storeWithReports.profileReportsStore = storeWithReports.profileReportsStore.map((r) => {
          if (r.id !== repId) return r;
          const prevHist = Array.isArray(r.history) ? (r.history as Array<Record<string, unknown>>) : [];
          return {
            ...r,
            status: nextStatus,
            staffNotes,
            priorWarningsCount:
              nextStatus === "RESOLVED_WARNED"
                ? Number(r.priorWarningsCount ?? 0) + 1
                : r.priorWarningsCount,
            history: [
              {
                d: nextStatus,
                by: this.getCurrentUser().email || "yonael.ops@yekis.et",
                at: new Date().toISOString(),
                reason: staffNotes,
              },
              ...prevHist,
            ],
          };
        });
        return { ok: true };
      }

      return {
        data: storeWithReports.profileReportsStore,
        pagination: {
          page: 1,
          limit: 25,
          total: storeWithReports.profileReportsStore.length,
          totalPages: 1,
        },
      };
    }

    if (cleanPath === "/wallet/topups/queue") {
      const items = this.topUps.map((t) => ({
        ...t,
        status: t.status === "PENDING_REVIEW" ? "PENDING" : t.status,
        receiptImagePath: "/payment/Telebirr.png",
        user:
          t.userId === "usr-client-01"
            ? { id: "usr-client-01", email: "abebe.kebede@abyssinia-tech.et", phone: "+251911234567", ucid: "YEK-CL-1042" }
            : { id: t.userId || "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", phone: "+251933456789", ucid: "YEK-DL-3015" },
        userHistory: { approvedCount: 12, approvedTotalMinor: 98500000, rejectedCount: 0 },
      }));
      return {
        items,
        total: items.length,
        page: 1,
        pageSize: 25,
      };
    }
    if (cleanPath.match(/^\/wallet\/topups\/[^/]+\/(approve|reject|flag)$/) && method === "POST") {
      const parts = cleanPath.split("/");
      const topUpId = parts[3];
      const action = parts[4];
      this.topUps = this.topUps.map((t) =>
        t.id === topUpId
          ? {
              ...t,
              status: action === "approve" ? "APPROVED" : action === "reject" ? "REJECTED" : "FLAGGED",
              reviewedAt: new Date().toISOString(),
            }
          : t,
      );
      return { ok: true };
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
        {
          id: "aud-3",
          userId: "usr-staff-02",
          eventType: "ESCROW_FUNDED",
          entityType: "Milestone",
          entityId: "ms-204",
          actorRole: "FINANCE_ADMIN",
          action: "VERIFY_CBE_RECEIPT",
          amountMinor: 5800000,
          ipAddress: "196.188.42.31",
          createdAt: isoDaysAgo(1.8),
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
            createdAt: isoDaysAgo(1),
            updatedAt: isoDaysAgo(0.2),
            creator: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", role: "BOTH" },
            assignedStaff: { id: "usr-admin-01", name: "Yonael Ops" },
            messages: [{ body: "Hello, I uploaded FT26289C8831 for our coffee ERP escrow milestone.", createdAt: isoDaysAgo(0.2) }],
          },
          {
            id: "sup-2",
            subject: "Fayda TIN Certificate Tier 2 Upgrade Inquiry",
            status: "OPEN",
            createdAt: isoDaysAgo(2),
            updatedAt: isoDaysAgo(0.6),
            creator: { id: "usr-free-01", email: "hanna.tadesse@addisdev.et", role: "FREELANCER" },
            assignedStaff: null,
            messages: [{ body: "Please confirm my 10-digit ERCA TIN certificate for 3% withholding rate.", createdAt: isoDaysAgo(0.6) }],
          },
        ],
        total: 2,
        page: 1,
        pageSize: 25,
      };
    }
    if (cleanPath.match(/^\/chat\/admin\/conversations\/[^/]+\/(claim|status)$/)) {
      return {
        id: "sup-1",
        subject: "CBE Birr Receipt Reference Verification",
        status: String(parsedBody?.status || "OPEN"),
        createdAt: isoDaysAgo(1),
        updatedAt: new Date().toISOString(),
        creator: { id: "usr-both-01", email: "dawit.mekonnen@ethio-digital.et", role: "BOTH" },
        assignedStaff: { id: "usr-admin-01", name: "Yonael Ops" },
        messages: [],
      };
    }

    if (cleanPath === "/finance/withholding" && method === "GET") {
      return { items: this.withholdingReports, total: this.withholdingReports.length };
    }
    if (cleanPath.match(/^\/finance\/withholding\/[^/]+\/file$/) && method === "POST") {
      const reportId = cleanPath.split("/")[3];
      const eraRef = String(parsedBody?.eraReferenceNumber || "ERCA-FILED-2026");
      this.withholdingReports = this.withholdingReports.map((r) =>
        r.id === reportId
          ? { ...r, filedAt: new Date().toISOString(), eraReferenceNumber: eraRef }
          : r,
      );
      return { ok: true };
    }

    if (cleanPath === "/telegram/health") {
      return {
        status: "HEALTHY",
        transport: "LONG_POLLING (Dev Mode)",
        webhook: {
          pendingUpdateCount: 0,
          lastErrorMessage: "No reported delivery error",
        },
      };
    }
    if (cleanPath === "/telegram/info") {
      return {
        bot: {
          id: 719283746,
          username: "YekisEscrowBot",
          firstName: "Yekis Jobs & Escrow Bot",
        },
      };
    }
    if (cleanPath.startsWith("/telegram/")) {
      return { ok: true };
    }

    return {};
  }
}

export const mockStore = new MockStore();
