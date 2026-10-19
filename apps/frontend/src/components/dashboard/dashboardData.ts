import type {
  Contract,
  Dispute,
  Job,
  MeResponse,
  Milestone,
  Proposal,
  TopUpRequest,
  WalletResponse,
} from "../../api/client";

export type TimeRangeKey = "7d" | "30d" | "90d" | "12m";

export type KanbanColumnId =
  | "BACKLOG"
  | "ESCROW_HELD"
  | "WORK_IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "RELEASED";

export interface KanbanTask {
  id: string;
  code: string;
  title: string;
  contractTitle: string;
  counterparty: string;
  rail: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
  amountMinor: number;
  dueDate: string;
  priority: "HIGH" | "MEDIUM" | "LOW";
  column: KanbanColumnId;
  category: string;
}

export type ScheduleEventType =
  | "MILESTONE_DUE"
  | "PAYOUT_RELEASE"
  | "PROPOSAL_DEADLINE"
  | "COMPLIANCE_KYC";

export interface ScheduleEvent {
  id: string;
  title: string;
  contractRef: string;
  date: string; // YYYY-MM-DD
  time: string;
  type: ScheduleEventType;
  amountMinor: number;
  rail: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
  status: "SCHEDULED" | "COMPLETED" | "AT_RISK";
  counterparty: string;
}

export interface LedgerContractRecord {
  id: string;
  code: string;
  title: string;
  contractTitle: string;
  counterparty: string;
  counterpartyEmail: string;
  category: string;
  rail: "TELEBIRR" | "CBE_BIRR" | "M_PESA";
  escrowState:
    | "ESCROW_HELD"
    | "WORK_IN_PROGRESS"
    | "SUBMITTED_FOR_REVIEW"
    | "RELEASED"
    | "PAYMENT_PENDING"
    | "DISPUTED";
  amountMinor: number;
  feeMinor: number;
  dueDate: string;
  updatedAt: string;
}

export interface TimeSeriesPoint {
  label: string;
  escrowInflowETB: number;
  payoutReleasedETB: number;
  telebirrETB: number;
  cbeBirrETB: number;
  mpesaETB: number;
  milestonesCompleted: number;
}

export const DEMO_ACCOUNTS: Record<
  "CLIENT" | "FREELANCER" | "BOTH" | "ADMIN",
  MeResponse
> = {
  CLIENT: {
    id: "usr-client-addis-01",
    ucid: "YEK-CL-8821",
    email: "dawit.bekele@abyssiniatech.et",
    phone: "+251911248910",
    role: "CLIENT",
    staffRole: null,
    languagePreference: "en",
    kyc: { tier: "TIER_2", status: "VERIFIED" },
    wallet: { balanceMinor: 48_250_000 },
  },
  FREELANCER: {
    id: "usr-free-addis-02",
    ucid: "YEK-FL-4409",
    email: "hanna.tadesse@studiohabesha.et",
    phone: "+251922819044",
    role: "FREELANCER",
    staffRole: null,
    languagePreference: "en",
    kyc: { tier: "TIER_2", status: "VERIFIED" },
    wallet: { balanceMinor: 31_400_000 },
  },
  BOTH: {
    id: "usr-both-addis-03",
    ucid: "YEK-DL-9102",
    email: "yonas.mindaye@yekisventures.et",
    phone: "+251911904512",
    role: "BOTH",
    staffRole: null,
    languagePreference: "en",
    kyc: { tier: "TIER_2", status: "VERIFIED" },
    wallet: { balanceMinor: 64_900_000 },
  },
  ADMIN: {
    id: "usr-staff-ops-01",
    ucid: "YEK-OPS-0001",
    email: "selamawit.girma@ops.yekis.et",
    phone: "+251911001122",
    role: "ADMIN",
    staffRole: "SUPER_ADMIN",
    languagePreference: "en",
    kyc: { tier: "TIER_2", status: "VERIFIED" },
    wallet: { balanceMinor: 0 },
  },
};

export const FALLBACK_WALLET: WalletResponse = {
  balanceMinor: 34_850_000, // ETB 348,500.00
};

export const FALLBACK_TOPUPS: TopUpRequest[] = [
  {
    id: "tup-9012",
    amountMinor: 12_500_000,
    status: "APPROVED",
    paymentMethod: "TELEBIRR",
    referenceNumber: "TLB-20261018-8841",
    rejectionReason: null,
    reviewedAt: "2026-10-18T11:30:00Z",
    createdAt: "2026-10-18T10:15:00Z",
  },
  {
    id: "tup-9015",
    amountMinor: 8_400_000,
    status: "APPROVED",
    paymentMethod: "CBE_BIRR",
    referenceNumber: "FT26291K9821",
    rejectionReason: null,
    reviewedAt: "2026-10-16T15:20:00Z",
    createdAt: "2026-10-16T14:05:00Z",
  },
  {
    id: "tup-9019",
    amountMinor: 4_500_000,
    status: "PENDING",
    paymentMethod: "M_PESA",
    referenceNumber: "MPS-9941204",
    rejectionReason: null,
    reviewedAt: null,
    createdAt: "2026-10-19T06:40:00Z",
  },
];

export const FALLBACK_JOBS: Job[] = [
  {
    id: "job-eth-101",
    title: "Telebirr SuperApp Mini-Program & Merchant Settlement API",
    category: "WEB_APP_DEVELOPMENT",
    description:
      "Architect and deliver a high-throughput merchant checkout integration for Telebirr H5 and CBE Birr with automated webhook reconciliation and Amharic/English localization.",
    budgetMinMinor: 8_500_000,
    budgetMaxMinor: 14_000_000,
    deadline: "2026-11-12",
    status: "OPEN",
  },
  {
    id: "job-eth-102",
    title: "Fayda National Digital ID eKYC Onboarding UX Redesign",
    category: "GRAPHIC_DESIGN",
    description:
      "Design a low-bandwidth, mobile-first biometric selfie and Fayda FIN verification flow tailored for Ethiopian smartphone tiers with clear visual guidance.",
    budgetMinMinor: 4_200_000,
    budgetMaxMinor: 6_800_000,
    deadline: "2026-11-04",
    status: "OPEN",
  },
  {
    id: "job-eth-103",
    title: "Bilingual Financial Compliance & AACCSA Contract Templates",
    category: "TRANSLATION",
    description:
      "Translate and legally adapt 14 software service agreements and milestone acceptance schedules between English and Amharic under Ethiopian commercial code.",
    budgetMinMinor: 2_800_000,
    budgetMaxMinor: 4_500_000,
    deadline: "2026-10-29",
    status: "OPEN",
  },
  {
    id: "job-eth-104",
    title: "Addis Logistics Fleet Telemetry & Route Analytics Dashboard",
    category: "WEB_APP_DEVELOPMENT",
    description:
      "Build a real-time React + PostgreSQL dispatch console tracking Djibouti-Addis corridor freight milestones, fuel vouchers, and driver wallet payouts.",
    budgetMinMinor: 11_000_000,
    budgetMaxMinor: 16_500_000,
    deadline: "2026-11-20",
    status: "OPEN",
  },
  {
    id: "job-eth-105",
    title: "Ethiopian Specialty Coffee Export Brand Identity & Packaging",
    category: "GRAPHIC_DESIGN",
    description:
      "Create a cohesive export packaging system, traceability QR verification landing page, and buyer deck for Yirgacheffe & Guji specialty roasters.",
    budgetMinMinor: 3_600_000,
    budgetMaxMinor: 5_400_000,
    deadline: "2026-11-08",
    status: "OPEN",
  },
];

export const FALLBACK_MILESTONES: Milestone[] = [
  {
    id: "ms-2041-a",
    contractId: "cnt-eth-801",
    title: "Phase 1: Telebirr H5 Checkout & Signature Verification",
    amountMinor: 6_500_000,
    dueDate: "2026-10-24",
    escrowState: "WORK_IN_PROGRESS",
    deliverableUrl: null,
    submittedAt: null,
    autoReleaseAt: null,
    releasedAt: null,
  },
  {
    id: "ms-2042-b",
    contractId: "cnt-eth-801",
    title: "Phase 2: Automated Ledger Webhook & Retry Worker",
    amountMinor: 7_500_000,
    dueDate: "2026-11-05",
    escrowState: "ESCROW_HELD",
    deliverableUrl: null,
    submittedAt: null,
    autoReleaseAt: null,
    releasedAt: null,
  },
  {
    id: "ms-2043-c",
    contractId: "cnt-eth-802",
    title: "Fayda eKYC Mobile Prototype & Design System Tokens",
    amountMinor: 4_800_000,
    dueDate: "2026-10-21",
    escrowState: "SUBMITTED_FOR_REVIEW",
    deliverableUrl: "https://figma.com/file/yekis-fayda-ekyc-v2",
    submittedAt: "2026-10-18T14:20:00Z",
    autoReleaseAt: "2026-10-25T14:20:00Z",
    releasedAt: null,
  },
  {
    id: "ms-2044-d",
    contractId: "cnt-eth-803",
    title: "Amharic/English Service Agreement Corpus & Glossary",
    amountMinor: 3_200_000,
    dueDate: "2026-10-15",
    escrowState: "RELEASED",
    deliverableUrl: "https://storage.yekis.et/deliverables/corpus-v1.pdf",
    submittedAt: "2026-10-14T09:10:00Z",
    autoReleaseAt: null,
    releasedAt: "2026-10-15T16:45:00Z",
  },
  {
    id: "ms-2045-e",
    contractId: "cnt-eth-804",
    title: "Corridor Telemetry PostGIS Schema & Dispatch API",
    amountMinor: 8_200_000,
    dueDate: "2026-10-28",
    escrowState: "ESCROW_HELD",
    deliverableUrl: null,
    submittedAt: null,
    autoReleaseAt: null,
    releasedAt: null,
  },
  {
    id: "ms-2046-f",
    contractId: "cnt-eth-805",
    title: "Mobile Banking USSD Fallback & SMS Gateway Integration",
    amountMinor: 5_400_000,
    dueDate: "2026-11-02",
    escrowState: "PAYMENT_PENDING",
    deliverableUrl: null,
    submittedAt: null,
    autoReleaseAt: null,
    releasedAt: null,
  },
  {
    id: "ms-2047-g",
    contractId: "cnt-eth-806",
    title: "Legacy Inventory ERP Data Migration & Reconciliation",
    amountMinor: 3_900_000,
    dueDate: "2026-10-17",
    escrowState: "DISPUTED",
    deliverableUrl: "https://storage.yekis.et/deliverables/erp-dump.zip",
    submittedAt: "2026-10-16T18:00:00Z",
    autoReleaseAt: null,
    releasedAt: null,
  },
];

export const INITIAL_LEDGER_RECORDS: LedgerContractRecord[] = [
  {
    id: "ms-2041-a",
    code: "CNT-801 · MS-01",
    title: "Phase 1: Telebirr H5 Checkout & Signature Verification",
    contractTitle: "Telebirr SuperApp Mini-Program",
    counterparty: "Hanna Tadesse",
    counterpartyEmail: "hanna.tadesse@studiohabesha.et",
    category: "Web app development",
    rail: "TELEBIRR",
    escrowState: "WORK_IN_PROGRESS",
    amountMinor: 6_500_000,
    feeMinor: 650_000,
    dueDate: "2026-10-24",
    updatedAt: "2026-10-19T06:15:00Z",
  },
  {
    id: "ms-2042-b",
    code: "CNT-801 · MS-02",
    title: "Phase 2: Automated Ledger Webhook & Retry Worker",
    contractTitle: "Telebirr SuperApp Mini-Program",
    counterparty: "Hanna Tadesse",
    counterpartyEmail: "hanna.tadesse@studiohabesha.et",
    category: "Web app development",
    rail: "TELEBIRR",
    escrowState: "ESCROW_HELD",
    amountMinor: 7_500_000,
    feeMinor: 750_000,
    dueDate: "2026-11-05",
    updatedAt: "2026-10-18T14:30:00Z",
  },
  {
    id: "ms-2043-c",
    code: "CNT-802 · MS-01",
    title: "Fayda eKYC Mobile Prototype & Design System Tokens",
    contractTitle: "Fayda National ID eKYC UX",
    counterparty: "Nahom Girma",
    counterpartyEmail: "nahom.g@addisdesign.et",
    category: "Graphic design",
    rail: "CBE_BIRR",
    escrowState: "SUBMITTED_FOR_REVIEW",
    amountMinor: 4_800_000,
    feeMinor: 480_000,
    dueDate: "2026-10-21",
    updatedAt: "2026-10-18T14:20:00Z",
  },
  {
    id: "ms-2044-d",
    code: "CNT-803 · MS-01",
    title: "Amharic/English Service Agreement Corpus & Glossary",
    contractTitle: "Bilingual AACCSA Contract Templates",
    counterparty: "Meron Alemu",
    counterpartyEmail: "meron.alemu@lexethiopia.et",
    category: "Translation",
    rail: "CBE_BIRR",
    escrowState: "RELEASED",
    amountMinor: 3_200_000,
    feeMinor: 320_000,
    dueDate: "2026-10-15",
    updatedAt: "2026-10-15T16:45:00Z",
  },
  {
    id: "ms-2045-e",
    code: "CNT-804 · MS-01",
    title: "Corridor Telemetry PostGIS Schema & Dispatch API",
    contractTitle: "Addis Logistics Fleet Console",
    counterparty: "Biniyam Kebede",
    counterpartyEmail: "biniyam@corridortech.et",
    category: "Web app development",
    rail: "TELEBIRR",
    escrowState: "ESCROW_HELD",
    amountMinor: 8_200_000,
    feeMinor: 820_000,
    dueDate: "2026-10-28",
    updatedAt: "2026-10-17T09:10:00Z",
  },
  {
    id: "ms-2046-f",
    code: "CNT-805 · MS-01",
    title: "Mobile Banking USSD Fallback & SMS Gateway Integration",
    contractTitle: "Rural Microfinance USSD Bridge",
    counterparty: "Robel Tesfaye",
    counterpartyEmail: "robel@ethiofintech.et",
    category: "Web app development",
    rail: "M_PESA",
    escrowState: "PAYMENT_PENDING",
    amountMinor: 5_400_000,
    feeMinor: 540_000,
    dueDate: "2026-11-02",
    updatedAt: "2026-10-18T19:00:00Z",
  },
  {
    id: "ms-2047-g",
    code: "CNT-806 · MS-02",
    title: "Legacy Inventory ERP Data Migration & Reconciliation",
    contractTitle: "Bole Pharma Supply Chain ERP",
    counterparty: "Kaleb Solomon",
    counterpartyEmail: "kaleb@bolepharma.et",
    category: "Data entry",
    rail: "CBE_BIRR",
    escrowState: "DISPUTED",
    amountMinor: 3_900_000,
    feeMinor: 390_000,
    dueDate: "2026-10-17",
    updatedAt: "2026-10-17T11:25:00Z",
  },
  {
    id: "ms-2048-h",
    code: "CNT-807 · MS-01",
    title: "Yirgacheffe Export Traceability Landing & Buyer Portal",
    contractTitle: "Specialty Coffee Export Brand",
    counterparty: "Lulit Hailu",
    counterpartyEmail: "lulit@origincoffee.et",
    category: "Digital marketing",
    rail: "TELEBIRR",
    escrowState: "RELEASED",
    amountMinor: 4_150_000,
    feeMinor: 415_000,
    dueDate: "2026-10-11",
    updatedAt: "2026-10-11T17:30:00Z",
  },
  {
    id: "ms-2049-i",
    code: "CNT-808 · MS-01",
    title: "Amharic Voiceover & Motion Explainer for Telebirr Merchants",
    contractTitle: "Merchant Onboarding Campaign",
    counterparty: "Samuel Getachew",
    counterpartyEmail: "samuel.g@creativesaddis.et",
    category: "Content writing",
    rail: "M_PESA",
    escrowState: "WORK_IN_PROGRESS",
    amountMinor: 2_950_000,
    feeMinor: 295_000,
    dueDate: "2026-10-26",
    updatedAt: "2026-10-18T08:40:00Z",
  },
];

export const INITIAL_KANBAN_TASKS: KanbanTask[] = [
  {
    id: "kb-101",
    code: "MS-2046",
    title: "Mobile Banking USSD Fallback & SMS Gateway",
    contractTitle: "Rural Microfinance USSD Bridge",
    counterparty: "Robel Tesfaye",
    rail: "M_PESA",
    amountMinor: 5_400_000,
    dueDate: "2026-11-02",
    priority: "MEDIUM",
    column: "BACKLOG",
    category: "Web app development",
  },
  {
    id: "kb-102",
    code: "MS-2050",
    title: "Security Audit & Penetration Test Scope Sign-Off",
    contractTitle: "Telebirr SuperApp Mini-Program",
    counterparty: "Hanna Tadesse",
    rail: "TELEBIRR",
    amountMinor: 3_800_000,
    dueDate: "2026-11-09",
    priority: "LOW",
    column: "BACKLOG",
    category: "Web app development",
  },
  {
    id: "kb-103",
    code: "MS-2042",
    title: "Phase 2: Automated Ledger Webhook & Retry Worker",
    contractTitle: "Telebirr SuperApp Mini-Program",
    counterparty: "Hanna Tadesse",
    rail: "TELEBIRR",
    amountMinor: 7_500_000,
    dueDate: "2026-11-05",
    priority: "HIGH",
    column: "ESCROW_HELD",
    category: "Web app development",
  },
  {
    id: "kb-104",
    code: "MS-2045",
    title: "Corridor Telemetry PostGIS Schema & Dispatch API",
    contractTitle: "Addis Logistics Fleet Console",
    counterparty: "Biniyam Kebede",
    rail: "TELEBIRR",
    amountMinor: 8_200_000,
    dueDate: "2026-10-28",
    priority: "HIGH",
    column: "ESCROW_HELD",
    category: "Web app development",
  },
  {
    id: "kb-105",
    code: "MS-2041",
    title: "Phase 1: Telebirr H5 Checkout & Signature Verification",
    contractTitle: "Telebirr SuperApp Mini-Program",
    counterparty: "Hanna Tadesse",
    rail: "TELEBIRR",
    amountMinor: 6_500_000,
    dueDate: "2026-10-24",
    priority: "HIGH",
    column: "WORK_IN_PROGRESS",
    category: "Web app development",
  },
  {
    id: "kb-106",
    code: "MS-2049",
    title: "Amharic Voiceover & Motion Explainer for Merchants",
    contractTitle: "Merchant Onboarding Campaign",
    counterparty: "Samuel Getachew",
    rail: "M_PESA",
    amountMinor: 2_950_000,
    dueDate: "2026-10-26",
    priority: "MEDIUM",
    column: "WORK_IN_PROGRESS",
    category: "Content writing",
  },
  {
    id: "kb-107",
    code: "MS-2043",
    title: "Fayda eKYC Mobile Prototype & Design System Tokens",
    contractTitle: "Fayda National ID eKYC UX",
    counterparty: "Nahom Girma",
    rail: "CBE_BIRR",
    amountMinor: 4_800_000,
    dueDate: "2026-10-21",
    priority: "HIGH",
    column: "SUBMITTED_FOR_REVIEW",
    category: "Graphic design",
  },
  {
    id: "kb-108",
    code: "MS-2044",
    title: "Amharic/English Service Agreement Corpus & Glossary",
    contractTitle: "Bilingual AACCSA Contract Templates",
    counterparty: "Meron Alemu",
    rail: "CBE_BIRR",
    amountMinor: 3_200_000,
    dueDate: "2026-10-15",
    priority: "MEDIUM",
    column: "RELEASED",
    category: "Translation",
  },
  {
    id: "kb-109",
    code: "MS-2048",
    title: "Yirgacheffe Export Traceability Landing & Buyer Portal",
    contractTitle: "Specialty Coffee Export Brand",
    counterparty: "Lulit Hailu",
    rail: "TELEBIRR",
    amountMinor: 4_150_000,
    dueDate: "2026-10-11",
    priority: "LOW",
    column: "RELEASED",
    category: "Digital marketing",
  },
];

export const INITIAL_SCHEDULE_EVENTS: ScheduleEvent[] = [
  {
    id: "ev-1",
    title: "Fayda eKYC Prototype Acceptance Review",
    contractRef: "CNT-802 · MS-01",
    date: "2026-10-21",
    time: "14:00 EAT",
    type: "MILESTONE_DUE",
    amountMinor: 4_800_000,
    rail: "CBE_BIRR",
    status: "SCHEDULED",
    counterparty: "Nahom Girma",
  },
  {
    id: "ev-2",
    title: "Auto-Release Window: eKYC Design System",
    contractRef: "CNT-802 · MS-01",
    date: "2026-10-25",
    time: "14:20 EAT",
    type: "PAYOUT_RELEASE",
    amountMinor: 4_800_000,
    rail: "CBE_BIRR",
    status: "SCHEDULED",
    counterparty: "Nahom Girma",
  },
  {
    id: "ev-3",
    title: "Telebirr H5 Checkout Delivery Milestone",
    contractRef: "CNT-801 · MS-01",
    date: "2026-10-24",
    time: "17:00 EAT",
    type: "MILESTONE_DUE",
    amountMinor: 6_500_000,
    rail: "TELEBIRR",
    status: "SCHEDULED",
    counterparty: "Hanna Tadesse",
  },
  {
    id: "ev-4",
    title: "Amharic Motion Explainer Final Cut",
    contractRef: "CNT-808 · MS-01",
    date: "2026-10-26",
    time: "11:30 EAT",
    type: "MILESTONE_DUE",
    amountMinor: 2_950_000,
    rail: "M_PESA",
    status: "SCHEDULED",
    counterparty: "Samuel Getachew",
  },
  {
    id: "ev-5",
    title: "Corridor Telemetry PostGIS API Delivery",
    contractRef: "CNT-804 · MS-01",
    date: "2026-10-28",
    time: "16:00 EAT",
    type: "MILESTONE_DUE",
    amountMinor: 8_200_000,
    rail: "TELEBIRR",
    status: "SCHEDULED",
    counterparty: "Biniyam Kebede",
  },
  {
    id: "ev-6",
    title: "Bilingual Legal Templates Proposal Cutoff",
    contractRef: "JOB-ETH-103",
    date: "2026-10-29",
    time: "18:00 EAT",
    type: "PROPOSAL_DEADLINE",
    amountMinor: 4_500_000,
    rail: "CBE_BIRR",
    status: "SCHEDULED",
    counterparty: "Open Marketplace",
  },
  {
    id: "ev-7",
    title: "AACCSA Contract Corpus Payout Settled",
    contractRef: "CNT-803 · MS-01",
    date: "2026-10-15",
    time: "16:45 EAT",
    type: "PAYOUT_RELEASE",
    amountMinor: 3_200_000,
    rail: "CBE_BIRR",
    status: "COMPLETED",
    counterparty: "Meron Alemu",
  },
  {
    id: "ev-8",
    title: "ERP Migration Mediation SLA Deadline",
    contractRef: "CNT-806 · DSP-19",
    date: "2026-10-19",
    time: "15:00 EAT",
    type: "COMPLIANCE_KYC",
    amountMinor: 3_900_000,
    rail: "CBE_BIRR",
    status: "AT_RISK",
    counterparty: "Kaleb Solomon",
  },
  {
    id: "ev-9",
    title: "Telebirr SuperApp Webhook Retry Worker",
    contractRef: "CNT-801 · MS-02",
    date: "2026-11-05",
    time: "17:00 EAT",
    type: "MILESTONE_DUE",
    amountMinor: 7_500_000,
    rail: "TELEBIRR",
    status: "SCHEDULED",
    counterparty: "Hanna Tadesse",
  },
];

export const TIME_SERIES_BY_RANGE: Record<TimeRangeKey, TimeSeriesPoint[]> = {
  "7d": [
    { label: "13 Oct", escrowInflowETB: 42000, payoutReleasedETB: 28000, telebirrETB: 24000, cbeBirrETB: 12000, mpesaETB: 6000, milestonesCompleted: 3 },
    { label: "14 Oct", escrowInflowETB: 58000, payoutReleasedETB: 35000, telebirrETB: 34000, cbeBirrETB: 16000, mpesaETB: 8000, milestonesCompleted: 4 },
    { label: "15 Oct", escrowInflowETB: 51000, payoutReleasedETB: 49000, telebirrETB: 29000, cbeBirrETB: 15000, mpesaETB: 7000, milestonesCompleted: 5 },
    { label: "16 Oct", escrowInflowETB: 76000, payoutReleasedETB: 41000, telebirrETB: 45000, cbeBirrETB: 21000, mpesaETB: 10000, milestonesCompleted: 4 },
    { label: "17 Oct", escrowInflowETB: 64000, payoutReleasedETB: 53000, telebirrETB: 38000, cbeBirrETB: 18000, mpesaETB: 8000, milestonesCompleted: 6 },
    { label: "18 Oct", escrowInflowETB: 89000, payoutReleasedETB: 62000, telebirrETB: 52000, cbeBirrETB: 25000, mpesaETB: 12000, milestonesCompleted: 7 },
    { label: "19 Oct", escrowInflowETB: 94500, payoutReleasedETB: 68500, telebirrETB: 56500, cbeBirrETB: 26000, mpesaETB: 12000, milestonesCompleted: 8 },
  ],
  "30d": [
    { label: "W1 Sep", escrowInflowETB: 165000, payoutReleasedETB: 118000, telebirrETB: 98000, cbeBirrETB: 46000, mpesaETB: 21000, milestonesCompleted: 11 },
    { label: "W2 Sep", escrowInflowETB: 192000, payoutReleasedETB: 144000, telebirrETB: 114000, cbeBirrETB: 52000, mpesaETB: 26000, milestonesCompleted: 14 },
    { label: "W3 Sep", escrowInflowETB: 218000, payoutReleasedETB: 159000, telebirrETB: 128000, cbeBirrETB: 61000, mpesaETB: 29000, milestonesCompleted: 16 },
    { label: "W4 Sep", escrowInflowETB: 204000, payoutReleasedETB: 172000, telebirrETB: 119000, cbeBirrETB: 58000, mpesaETB: 27000, milestonesCompleted: 15 },
    { label: "W1 Oct", escrowInflowETB: 246000, payoutReleasedETB: 188000, telebirrETB: 145000, cbeBirrETB: 69000, mpesaETB: 32000, milestonesCompleted: 19 },
    { label: "W2 Oct", escrowInflowETB: 279000, payoutReleasedETB: 214000, telebirrETB: 164000, cbeBirrETB: 79000, mpesaETB: 36000, milestonesCompleted: 22 },
    { label: "W3 Oct", escrowInflowETB: 312500, payoutReleasedETB: 239000, telebirrETB: 186000, cbeBirrETB: 86500, mpesaETB: 40000, milestonesCompleted: 25 },
  ],
  "90d": [
    { label: "Aug W1", escrowInflowETB: 380000, payoutReleasedETB: 290000, telebirrETB: 220000, cbeBirrETB: 110000, mpesaETB: 50000, milestonesCompleted: 28 },
    { label: "Aug W3", escrowInflowETB: 435000, payoutReleasedETB: 325000, telebirrETB: 255000, cbeBirrETB: 125000, mpesaETB: 55000, milestonesCompleted: 33 },
    { label: "Sep W1", escrowInflowETB: 490000, payoutReleasedETB: 370000, telebirrETB: 290000, cbeBirrETB: 138000, mpesaETB: 62000, milestonesCompleted: 37 },
    { label: "Sep W3", escrowInflowETB: 545000, payoutReleasedETB: 412000, telebirrETB: 324000, cbeBirrETB: 152000, mpesaETB: 69000, milestonesCompleted: 42 },
    { label: "Oct W1", escrowInflowETB: 618000, payoutReleasedETB: 468000, telebirrETB: 368000, cbeBirrETB: 174000, mpesaETB: 76000, milestonesCompleted: 48 },
    { label: "Oct W3", escrowInflowETB: 684000, payoutReleasedETB: 524000, telebirrETB: 412000, cbeBirrETB: 189000, mpesaETB: 83000, milestonesCompleted: 54 },
  ],
  "12m": [
    { label: "Nov 25", escrowInflowETB: 820000, payoutReleasedETB: 640000, telebirrETB: 480000, cbeBirrETB: 240000, mpesaETB: 100000, milestonesCompleted: 64 },
    { label: "Jan 26", escrowInflowETB: 960000, payoutReleasedETB: 750000, telebirrETB: 570000, cbeBirrETB: 275000, mpesaETB: 115000, milestonesCompleted: 76 },
    { label: "Mar 26", escrowInflowETB: 1140000, payoutReleasedETB: 890000, telebirrETB: 680000, cbeBirrETB: 320000, mpesaETB: 140000, milestonesCompleted: 91 },
    { label: "May 26", escrowInflowETB: 1380000, payoutReleasedETB: 1060000, telebirrETB: 820000, cbeBirrETB: 390000, mpesaETB: 170000, milestonesCompleted: 108 },
    { label: "Jul 26", escrowInflowETB: 1620000, payoutReleasedETB: 1270000, telebirrETB: 970000, cbeBirrETB: 450000, mpesaETB: 200000, milestonesCompleted: 129 },
    { label: "Sep 26", escrowInflowETB: 1890000, payoutReleasedETB: 1490000, telebirrETB: 1130000, cbeBirrETB: 525000, mpesaETB: 235000, milestonesCompleted: 148 },
    { label: "Oct 26", escrowInflowETB: 2150000, payoutReleasedETB: 1710000, telebirrETB: 1290000, cbeBirrETB: 595000, mpesaETB: 265000, milestonesCompleted: 168 },
  ],
};

export const FALLBACK_PROPOSALS: Proposal[] = [
  {
    id: "prop-eth-301",
    jobId: "job-eth-101",
    freelancerId: "usr-free-addis-02",
    coverLetter:
      "Delivered 4 Telebirr H5 + CBE Birr enterprise merchant integrations over the last 18 months with idempotent webhook reconciliation and Amharic receipts.",
    quotedAmountMinor: 12_500_000,
    estimatedDays: 14,
    milestoneBreakdown: [
      {
        title: "Phase 1: Telebirr H5 Checkout & Signature Verification",
        amount: { amountMinor: 6_000_000, currency: "ETB" },
        dueDate: "2026-10-28",
      },
      {
        title: "Phase 2: Automated Ledger Webhook & Retry Worker",
        amount: { amountMinor: 6_500_000, currency: "ETB" },
        dueDate: "2026-11-08",
      },
    ],
    status: "SHORTLISTED",
    createdAt: "2026-10-18T09:15:00Z",
    freelancer: {
      id: "usr-free-addis-02",
      ucid: "YEK-FL-4409",
      email: "hanna.tadesse@studiohabesha.et",
    },
    job: {
      id: "job-eth-101",
      title: "Telebirr SuperApp Mini-Program & Merchant Settlement API",
      status: "OPEN",
      clientId: "usr-client-addis-01",
    },
  },
  {
    id: "prop-eth-302",
    jobId: "job-eth-102",
    freelancerId: "usr-free-addis-02",
    coverLetter:
      "Designed Fayda National ID eKYC mobile flows with sub-2MB bundle budgets and offline-resilient document capture guides.",
    quotedAmountMinor: 5_800_000,
    estimatedDays: 10,
    milestoneBreakdown: [
      {
        title: "Fayda eKYC Mobile Prototype & Design System Tokens",
        amount: { amountMinor: 5_800_000, currency: "ETB" },
        dueDate: "2026-11-01",
      },
    ],
    status: "SUBMITTED",
    createdAt: "2026-10-18T14:40:00Z",
    freelancer: {
      id: "usr-free-addis-02",
      ucid: "YEK-FL-4409",
      email: "hanna.tadesse@studiohabesha.et",
    },
    job: {
      id: "job-eth-102",
      title: "Fayda National Digital ID eKYC Onboarding UX Redesign",
      status: "OPEN",
      clientId: "usr-client-addis-01",
    },
  },
];

export const FALLBACK_CONTRACTS: Contract[] = [
  {
    id: "cnt-eth-801",
    jobId: "job-eth-101",
    clientId: "usr-client-addis-01",
    freelancerId: "usr-free-addis-02",
    templateVersion: "YEKIS-STD-v2.4 (AACCSA Bilingual)",
    clientAcceptedAt: "2026-10-12T10:00:00Z",
    freelancerAcceptedAt: "2026-10-12T11:15:00Z",
    fullyExecuted: true,
    status: "ACTIVE",
    cancellableUntil: null,
    createdAt: "2026-10-12T09:45:00Z",
    job: {
      id: "job-eth-101",
      title: "Telebirr SuperApp Mini-Program & Merchant Settlement API",
      status: "IN_PROGRESS",
    },
    milestones: [
      FALLBACK_MILESTONES[0],
      FALLBACK_MILESTONES[1],
    ],
  },
  {
    id: "cnt-eth-802",
    jobId: "job-eth-102",
    clientId: "usr-client-addis-01",
    freelancerId: "usr-free-addis-02",
    templateVersion: "YEKIS-STD-v2.4 (AACCSA Bilingual)",
    clientAcceptedAt: "2026-10-10T08:30:00Z",
    freelancerAcceptedAt: "2026-10-10T09:05:00Z",
    fullyExecuted: true,
    status: "ACTIVE",
    cancellableUntil: null,
    createdAt: "2026-10-10T08:00:00Z",
    job: {
      id: "job-eth-102",
      title: "Fayda National Digital ID eKYC Onboarding UX Redesign",
      status: "IN_PROGRESS",
    },
    milestones: [FALLBACK_MILESTONES[2]],
  },
  {
    id: "cnt-eth-803",
    jobId: "job-eth-103",
    clientId: "usr-both-addis-03",
    freelancerId: "usr-free-addis-02",
    templateVersion: "YEKIS-STD-v2.4 (AACCSA Bilingual)",
    clientAcceptedAt: "2026-10-02T12:00:00Z",
    freelancerAcceptedAt: "2026-10-02T13:10:00Z",
    fullyExecuted: true,
    status: "COMPLETED",
    cancellableUntil: null,
    createdAt: "2026-10-02T11:30:00Z",
    job: {
      id: "job-eth-103",
      title: "Bilingual Financial Compliance & AACCSA Contract Templates",
      status: "COMPLETED",
    },
    milestones: [FALLBACK_MILESTONES[3]],
  },
];

export const FALLBACK_DISPUTES: Dispute[] = [
  {
    id: "dsp-eth-401",
    contractId: "cnt-eth-806",
    milestoneId: "ms-2047-g",
    category: "QUALITY_ISSUE",
    stage: "STAGE_2_EVIDENCE",
    description:
      "Legacy ERP batch import script requires UTF-8 Amharic collation patch for 1,240 historical SKU records before final sign-off.",
    negotiationDeadlineAt: "2026-10-20T18:00:00Z",
    mediationDeadlineAt: "2026-10-24T18:00:00Z",
    mediatorRecommendation: null,
    resolutionOutcome: null,
    createdAt: "2026-10-17T11:25:00Z",
    contract: {
      id: "cnt-eth-806",
      clientId: "usr-client-addis-01",
      freelancerId: "usr-free-addis-02",
      job: { title: "Legacy Inventory ERP Data Migration & Reconciliation" },
    },
    milestone: {
      id: "ms-2047-g",
      title: "Legacy Inventory ERP Data Migration & Reconciliation",
      amountMinor: 3_900_000,
      escrowState: "DISPUTED",
    },
    evidence: [
      {
        id: "ev-doc-01",
        submittedByUserId: "usr-client-addis-01",
        statement:
          "Attached PostgreSQL validation log showing 1,240 rows where Amharic product descriptions need UTF-8 normalization.",
        createdAt: "2026-10-17T14:10:00Z",
      },
      {
        id: "ev-doc-02",
        submittedByUserId: "usr-free-addis-02",
        statement:
          "Uploaded patched migration script v1.2 with NFC Unicode normalization; ready for staging verification.",
        createdAt: "2026-10-18T09:35:00Z",
      },
    ],
  },
];

