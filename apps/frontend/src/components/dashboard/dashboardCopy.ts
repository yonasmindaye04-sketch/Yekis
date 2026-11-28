import { type Language } from "../../i18n";
import type { LedgerContractRecord, KanbanColumnId } from "./dashboardData";

export type DashboardCopy = {
  palette: {
    dialogAria: string;
    placeholder: string;
    searchAria: string;
    empty: (query: string) => string;
    navNavigate: string;
    navExecute: string;
    navToggle: string;
    groups: {
      modes: string;
      navigation: string;
      roleMode: string;
      appearance: string;
    };
    actions: {
      d1Label: string;
      d1Hint: string;
      d2TableLabel: string;
      d2TableHint: string;
      d2KanbanLabel: string;
      d2KanbanHint: string;
      d2CalendarLabel: string;
      d2CalendarHint: string;
      jobsLabel: string;
      jobsHint: string;
      gigsLabel: string;
      gigsHint: string;
      contractsLabel: string;
      contractsHint: string;
      escrowLabel: string;
      escrowHint: string;
      walletLabel: string;
      walletHint: string;
      chatLabel: string;
      chatHint: string;
      verificationLabel: string;
      verificationHint: string;
      casesLabel: string;
      casesHint: string;
      profileLabel: string;
      profileHint: string;
      settingsLabel: string;
      settingsHint: string;
      roleClientLabel: string;
      roleClientHint: (active: boolean) => string;
      roleFreelancerLabel: string;
      roleFreelancerHint: (active: boolean) => string;
      roleBothLabel: string;
      roleBothHint: (active: boolean) => string;
      customizerLabel: string;
      customizerHint: string;
      sidebarToggleLabel: string;
      sidebarToggleHint: string;
      themeLabel: (isLight: boolean) => string;
      themeHint: string;
    };
  };
  customizer: {
    triggerTitle: string;
    triggerAria: string;
    triggerText: string;
    dialogAria: string;
    title: string;
    subtitle: string;
    closeAria: string;
    templateModeLabel: string;
    d1Title: string;
    d1Desc: string;
    d2Title: string;
    d2Desc: string;
    sidebarArchLabel: string;
    sidebarStandard: string;
    sidebarStandardDesc: string;
    sidebarInset: string;
    sidebarInsetDesc: string;
    sidebarFloating: string;
    sidebarFloatingDesc: string;
    railWidthLabel: string;
    railExpanded: string;
    railExpandedDesc: string;
    railCompact: string;
    railCompactDesc: string;
    densityLabel: string;
    densityCompact: string;
    densityCompactDesc: string;
    densityComfortable: string;
    densityComfortableDesc: string;
    radiusLabel: string;
    radiusCrisp: string;
    radiusDefault: string;
    radiusSoft: string;
    colorThemeLabel: string;
    lightLabel: string;
    lightDesc: string;
    darkLabel: string;
    darkDesc: string;
    resetBtn: string;
  };
  charts: {
    cashflowTitle: string;
    cashflowDesc: string;
    windowAria: string;
    escrowFunded: (range: string) => string;
    releasedToTalent: (range: string) => string;
    periodLabel: (label: string) => string;
    latestLabel: (label: string) => string;
    inPrefix: string;
    outPrefix: string;
    cashflowSvgAria: string;
    railMixTitle: string;
    railMixDesc: (range: string) => string;
    milestonesSettled: (n: number) => string;
    railSvgAria: string;
  };
  overview: {
    modeAria: string;
    opsModeAria: string;
    quickJumpTitle: string;
    refreshTitle: string;
    refreshAria: string;
    vsPrior30d: (topUpCount: number) => string;
    approvedTopUps: string;
    pendingReceiptVerif: string;
    openWalletDeskBtn: string;
    milestoneBacked: (activeCount: number) => string;
    releasedYtd: string;
    submittedQa: string;
    inspectContractsBtn: string;
    onTimeDelta: string;
    acrossContracts: (n: number) => string;
    inActiveDelivery: string;
    escrowFundedReady: string;
    milestonesCount: (n: number) => string;
    openKanbanBtn: string;
    combinedBudgetPool: string;
    exploreBriefsBtn: string;
    duePrefix: (date: string) => string;
    deadlinePrefix: (date: string) => string;
    contractPrefix: (shortId: string) => string;
  };
  table: {
    statuses: Record<LedgerContractRecord["escrowState"], string>;
    title: string;
    subtitle: (count: number) => string;
    exportSelected: (n: number) => string;
    exportCsv: string;
    columnsBtn: string;
    toggleColumnsTitle: string;
    colCounterparty: string;
    colCategory: string;
    colRail: string;
    colDueDate: string;
    colFee: string;
    mobileViewAria: string;
    cardsBtn: string;
    tableBtn: string;
    searchPlaceholder: string;
    searchAria: string;
    clearSearchAria: string;
    filterStateAria: string;
    filterAll: string;
    filterRailAria: string;
    allRails: string;
    cardsListAria: string;
    emptyMsg: string;
    selectItemAria: (title: string) => string;
    duePrefix: (date: string) => string;
    feePrefix: string;
    inspectBtn: string;
    regionAria: string;
    selectAllAria: string;
    thMilestoneContract: string;
    thCounterparty: string;
    thScopeRail: string;
    thState: string;
    thDueDate: string;
    thEscrowEtb: string;
    thFee: string;
    thProviderFee: string;
    thClientFee: string;
    thClientTotal: string;
    thNetPayout: string;
    thActions: string;
    clientFeeZeroTitle: string;
    clientFeeZeroNote: string;
    selectedFooter: (selected: number, total: number) => string;
    rowsPerPage: string;
    pageOf: (page: number, totalPages: number) => string;
    prevPageAria: string;
    nextPageAria: string;
    inspectorAria: string;
    closeInspectorAria: string;
    detailContract: string;
    detailCounterparty: string;
    detailCategory: string;
    detailGross: string;
    detailFee: string;
    detailProviderFee: string;
    detailClientFee: string;
    detailClientTotal: string;
    detailNet: string;
    detailDueDate: string;
    detailState: string;
    actionsLabel: string;
    fundMilestoneBtn: string;
    reviewReleaseBtn: string;
    submitDeliveryBtn: string;
    disputeBtn: string;
    openEscrowBtn: string;
    awaitingSignatureNote: string;
    openContractRoomBtn: string;
    emptyTitle: string;
    emptyDesc: string;
    emptyPostJobCta: string;
    emptyContractsCta: string;
    closeBtn: string;
  };
  kanban: {
    columns: Record<KanbanColumnId, { title: string; subtitle: string }>;
    emptyStageActions: Record<
      KanbanColumnId,
      { hint: string; ctaLabel: string }
    >;
    emptyBoardTitle: string;
    emptyBoardDesc: string;
    emptyPostJobCta: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchAria: string;
    clientFilterAria: string;
    allClients: string;
    freelancerFilterAria: string;
    allFreelancers: string;
    contractFilterAria: string;
    allContracts: string;
    priorityAria: string;
    priorityAll: string;
    priorityHighFilter: string;
    priorityMediumFilter: string;
    priorityLowFilter: string;
    overdueOnlyBtn: string;
    clearFiltersBtn: string;
    priorityLabels: Record<"HIGH" | "MEDIUM" | "LOW", string>;
    mobileTabsAria: string;
    emptyCol: string;
    filteredEmptyCol: (hiddenCount: number) => string;
    openContractsCta: string;
    openWalletCta: string;
    boardSummary: (shown: number, total: number, overdue: number) => string;
    taskCountLabel: (shown: number, total: number, filtered: boolean) => string;
    overdueColCount: (n: number) => string;
    overdueDaysLabel: (days: number) => string;
    dueTodayLabel: string;
    dueSoonLabel: (days: number) => string;
    settledLabel: string;
    onTrackLabel: string;
    collapseColumnAria: (title: string) => string;
    expandColumnAria: (title: string) => string;
    collapseEmptyBtn: string;
    expandAllBtn: string;
    scrollLeftAria: string;
    scrollRightAria: string;
    scrollHint: string;
    duePrefix: (date: string) => string;
    viewDetailsAria: (title: string) => string;
    detailsAria: string;
    detailContract: string;
    detailClient: string;
    detailFreelancer: string;
    detailCategory: string;
    detailRail: string;
    detailAmount: string;
    detailPlatformFee: string;
    detailProviderFee: string;
    detailClientFee: string;
    detailClientTotal: string;
    detailNetPayout: string;
    clientFeeZeroNote: string;
    detailDueDate: string;
    detailScheduleStatus: string;
    detailPriority: string;
    detailStage: string;
    detailDeliverable: string;
    openDeliverableBtn: string;
    detailFundedAt: string;
    detailSubmittedAt: string;
    detailAutoReleaseAt: string;
    detailReleasedAt: string;
    actionsLabel: string;
    fundMilestoneBtn: string;
    reviewReleaseBtn: string;
    submitDeliveryBtn: string;
    disputeBtn: string;
    openEscrowBtn: string;
    awaitingSignatureNote: string;
    openContractRoomBtn: string;
    closeBtn: string;
    closeAria: string;
  };
  calendar: {
    typeLabels: {
      MILESTONE_DUE: string;
      PAYOUT_RELEASE: string;
      PROPOSAL_DEADLINE: string;
      COMPLIANCE_KYC: string;
      PERSONAL_REMINDER: string;
    };
    weekdays: [string, string, string, string, string, string, string];
    title: string;
    subtitle: string;
    prevEthMonthAria: string;
    prevMonthAria: string;
    nextEthMonthAria: string;
    nextMonthAria: string;
    todayBtn: string;
    todayBadge: string;
    selectedBadge: string;
    openEscrowBtn: string;
    calendarSystemAria: string;
    modeGregorian: string;
    modeFiscal: string;
    filterTypeAria: string;
    filterAllEvents: string;
    filterProposals: string;
    fiscalYearEyebrow: string;
    fiscalQuartersAria: (label: string) => string;
    itemsCount: (n: number) => string;
    noScheduledItems: string;
    mobileDatesAria: string;
    selectedDateLabel: string;
    fiscalPeriodLabel: string;
    noItemsOnDate: (dateLabel: string) => string;
    statusCompleted: string;
    statusAtRisk: string;
    upcomingTitle: string;
    upcomingEmpty: string;
  };
};

export const DASHBOARD_COPY: Record<Language, DashboardCopy> = {
  en: {
    palette: {
      dialogAria: "Global Command Palette",
      placeholder:
        "Type a command, jump to a dashboard, or switch workspace role...",
      searchAria: "Command search",
      empty: (q) => `No matching commands or views for "${q}".`,
      navNavigate: "Navigate",
      navExecute: "Execute",
      navToggle: "Toggle anywhere",
      groups: {
        modes: "Shadcn Dashboard Modes",
        navigation: "Workspace Navigation",
        roleMode: "Workspace Mode (Dual-Role)",
        appearance: "Appearance & Shell",
      },
      actions: {
        d1Label: "Switch to Dashboard 1: Executive Analytics & KPIs",
        d1Hint: "Area charts, rail mix & KPI deltas",
        d2TableLabel: "Switch to Dashboard 2: Advanced Ledger & Data Grid",
        d2TableHint: "Multi-filter table, sorting & CSV export",
        d2KanbanLabel: "Open Milestone & Deliverable Kanban Board",
        d2KanbanHint: "5-stage drag-and-drop escrow workflow",
        d2CalendarLabel: "Open Contract & Payout Schedule Calendar",
        d2CalendarHint: "Monthly deadline grid & day agenda",
        jobsLabel: "Jobs & Briefs Marketplace",
        jobsHint: "Post a brief or submit proposals",
        gigsLabel: "Fixed-Scope Gigs Catalog",
        gigsHint: "Browse packaged Ethiopian talent services",
        contractsLabel: "Contracts & Service Agreements",
        contractsHint:
          "Review and sign AACCSA agreements & download contract PDFs",
        escrowLabel: "Escrow Center & Milestones",
        escrowHint:
          "Fund milestone vaults, submit deliverables & release payouts",
        walletLabel: "Wallet & Telebirr / CBE Top-Ups",
        walletHint: "Manage ETB balance & upload payment receipts",
        chatLabel: "Messages & Contract Chat",
        chatHint: "Real-time client, freelancer & staff messaging",
        verificationLabel: "Fayda National ID & KYC Verification",
        verificationHint: "Verify identity to unlock withdrawals",
        casesLabel: "Disputes & Mediation Center",
        casesHint: "Submit evidence and track AACCSA arbitration",
        profileLabel: "Public Portfolio & Profile",
        profileHint: "Inspect skills, verified badges & reviews",
        settingsLabel: "Account Settings",
        settingsHint: "Preferences & support",
        roleClientLabel: "Switch to Client Mode (Hiring & Escrow)",
        roleClientHint: (a) => (a ? "Active mode" : "Switch to Client view"),
        roleFreelancerLabel: "Switch to Freelancer Mode (Talent & Payouts)",
        roleFreelancerHint: (a) =>
          a ? "Active mode" : "Switch to Freelancer view",
        roleBothLabel: "Switch to Combined Mode (Client + Freelancer)",
        roleBothHint: (a) => (a ? "Active mode" : "Hire and deliver work"),
        customizerLabel: "Open Workspace Layout Customizer",
        customizerHint: "Sidebar variant, density & corner radius",
        sidebarToggleLabel: "Toggle Sidebar Collapse (Icon Rail / Expanded)",
        sidebarToggleHint: "Maximize horizontal table canvas",
        themeLabel: (isLight) =>
          `Switch to ${isLight ? "Dark" : "Light"} Theme`,
        themeHint: "Yekis Emerald color system",
      },
    },
    customizer: {
      triggerTitle: "Customize workspace layout & appearance",
      triggerAria: "Customize workspace layout",
      triggerText: "Customize",
      dialogAria: "Workspace Layout Customizer",
      title: "Workspace Customizer",
      subtitle:
        "Configure sidebar framing, dashboard template mode, and table density.",
      closeAria: "Close customizer",
      templateModeLabel: "Dashboard Template Mode",
      d1Title: "Dashboard 1",
      d1Desc: "Executive KPIs & Cashflow Charts",
      d2Title: "Dashboard 2",
      d2Desc: "Data Grid, Kanban & Schedule",
      sidebarArchLabel: "Sidebar Architecture",
      sidebarStandard: "Standard",
      sidebarStandardDesc: "Flush edge",
      sidebarInset: "Inset",
      sidebarInsetDesc: "Framed canvas",
      sidebarFloating: "Floating",
      sidebarFloatingDesc: "Detached rail",
      railWidthLabel: "Navigation Rail Width",
      railExpanded: "Expanded (256px)",
      railExpandedDesc: "Full labels & role card",
      railCompact: "Compact Icon Rail",
      railCompactDesc: "Maximizes table width",
      densityLabel: "Data Table & List Density",
      densityCompact: "Compact (38px)",
      densityCompactDesc: "High-density financial rows",
      densityComfortable: "Comfortable (46px)",
      densityComfortableDesc: "Relaxed spacing",
      radiusLabel: "Surface Radius Scale",
      radiusCrisp: "Crisp (6px)",
      radiusDefault: "Default (8px)",
      radiusSoft: "Soft (12px)",
      colorThemeLabel: "Color Theme (Yekis Emerald)",
      lightLabel: "Alabaster Light",
      lightDesc: "#F8FAFC canvas · #16A34A accent",
      darkLabel: "Carbon Dark",
      darkDesc: "#090D12 canvas · #22C55E accent",
      resetBtn: "Reset to Default Layout",
    },
    charts: {
      cashflowTitle: "Escrow Inflow & Released Payouts",
      cashflowDesc:
        "Gross ETB funded into milestone escrow vs settled freelancer disbursements",
      windowAria: "Select chart time window",
      escrowFunded: (r) => `Escrow Funded (${r})`,
      releasedToTalent: (r) => `Released to Talent (${r})`,
      periodLabel: (l) => `Period: ${l}`,
      latestLabel: (l) => `Latest (${l})`,
      inPrefix: "In",
      outPrefix: "Out",
      cashflowSvgAria: "Escrow inflow and payout velocity area chart",
      railMixTitle: "Payments by method",
      railMixDesc: (r) => `Telebirr · CBE Birr · M-Pesa volume (${r})`,
      milestonesSettled: (n) => `${n} milestones settled`,
      railSvgAria: "Payment rail settlement stacked bar chart",
    },
    overview: {
      modeAria: "Select Dashboard Template Mode",
      opsModeAria: "Operations view mode",
      quickJumpTitle: "Open Command Palette (Ctrl+K)",
      refreshTitle: "Refresh workspace data",
      refreshAria: "Refresh workspace data",
      vsPrior30d: (n) => `vs prior 30d · ${n} top-ups`,
      approvedTopUps: "Approved Telebirr / CBE Top-Ups",
      pendingReceiptVerif: "Pending Receipt Verification",
      openWalletDeskBtn: "Open Wallet & Top-Up Desk",
      milestoneBacked: (n) => `100% milestone-backed · ${n} active`,
      releasedYtd: "Released & Settled YTD",
      submittedQa: "Submitted Awaiting QA",
      inspectContractsBtn: "Inspect Escrow Contracts",
      onTimeDelta: "98.2% on-time",
      acrossContracts: (n) => `Across ${n} contracts`,
      inActiveDelivery: "In Active Delivery",
      escrowFundedReady: "Escrow Funded & Ready",
      milestonesCount: (n) => `${n} milestones`,
      openKanbanBtn: "Open Milestone Kanban Board",
      combinedBudgetPool: "Combined Max Budget Pool",
      exploreBriefsBtn: "Explore All Briefs",
      duePrefix: (d) => `Due ${d}`,
      deadlinePrefix: (d) => `Deadline ${d}`,
      contractPrefix: (id) => `Contract #${id}`,
    },
    table: {
      statuses: {
        ESCROW_HELD: "Escrow Held",
        WORK_IN_PROGRESS: "In Progress",
        SUBMITTED_FOR_REVIEW: "Submitted",
        RELEASED: "Released",
        PAYMENT_PENDING: "Awaiting Funding",
        DISPUTED: "Disputed",
        ACCEPTED: "Accepted",
        REFUNDED: "Refunded",
        PARTIAL_REFUND: "Partially Refunded",
      },
      title: "Milestones & Payments List",
      subtitle: (n) => `${n} records · Total volume`,
      exportSelected: (n) => `Export Selected (${n})`,
      exportCsv: "Export CSV",
      columnsBtn: "Columns",
      toggleColumnsTitle: "Toggle Columns",
      colCounterparty: "Counterparty",
      colCategory: "Category",
      colRail: "Payment Method",
      colDueDate: "Due Date",
      colFee: "Platform Fee",
      mobileViewAria: "Mobile layout view",
      cardsBtn: "Cards",
      tableBtn: "Table",
      searchPlaceholder: "Filter milestones, contracts, or counterparty...",
      searchAria: "Filter milestones or contracts",
      clearSearchAria: "Clear search",
      filterStateAria: "Filter by milestone state",
      filterAll: "All",
      filterRailAria: "Filter by payment method",
      allRails: "All Payment Methods",
      cardsListAria: "Milestones and payments card list",
      emptyMsg:
        "No contract milestones match your current search or filter criteria.",
      selectItemAria: (t) => `Select ${t}`,
      duePrefix: (d) => `Due ${d}`,
      feePrefix: "Fee",
      inspectBtn: "Inspect",
      regionAria: "Milestones and payments list",
      selectAllAria: "Select all visible rows",
      thMilestoneContract: "Milestone & Contract",
      thCounterparty: "Counterparty",
      thScopeRail: "Scope & Method",
      thState: "State",
      thDueDate: "Due Date",
      thEscrowEtb: "Escrow (ETB)",
      thFee: "Platform fee",
      thProviderFee: "Provider fee",
      thClientFee: "Client fee",
      thClientTotal: "Total",
      thNetPayout: "Net payout",
      thActions: "Actions",
      clientFeeZeroTitle: "Client fee: ETB 0",
      clientFeeZeroNote: "Platform fees are paid by the freelancer. You pay ETB 0 in fees.",
      selectedFooter: (s, t) => `${s} of ${t} row(s) selected`,
      rowsPerPage: "Rows per page",
      pageOf: (p, tp) => `Page ${p} of ${tp}`,
      prevPageAria: "Previous page",
      nextPageAria: "Next page",
      inspectorAria: "Milestone details",
      closeInspectorAria: "Close inspector",
      detailContract: "Contract",
      detailCounterparty: "Counterparty",
      detailCategory: "Category",
      detailGross: "Gross Escrow Amount",
      detailFee: "Platform fee",
      detailProviderFee: "Provider fee",
      detailClientFee: "Client fee",
      detailClientTotal: "Total charge",
      detailNet: "Net Freelancer Payout",
      detailDueDate: "Due Date",
      detailState: "Current State",
      actionsLabel: "Payment & Contract Actions",
      fundMilestoneBtn: "Fund Milestone",
      reviewReleaseBtn: "Review & Release",
      submitDeliveryBtn: "Submit Delivery",
      disputeBtn: "Dispute",
      openEscrowBtn: "View payments",
      awaitingSignatureNote: "Waiting for both parties to accept the contract agreement before funding.",
      openContractRoomBtn: "View your contracts",
      emptyTitle: "No milestones yet",
      emptyDesc: "Milestones will appear here once you accept a proposal and create a contract.",
      emptyPostJobCta: "Post a job",
      emptyContractsCta: "View your contracts",
      closeBtn: "Close",
    },
    kanban: {
      columns: {
        BACKLOG: {
          title: "Payment pending",
          subtitle: "Awaiting payment",
        },
        ESCROW_HELD: {
          title: "Escrow held",
          subtitle: "Funded and protected",
        },
        WORK_IN_PROGRESS: {
          title: "In progress",
          subtitle: "Work underway",
        },
        SUBMITTED_FOR_REVIEW: {
          title: "Ready for review",
          subtitle: "Delivery submitted",
        },
        RELEASED: {
          title: "Paid",
          subtitle: "Released to freelancer",
        },
        DISPUTED_REFUNDED: {
          title: "In dispute / Refunded",
          subtitle: "Paused or returned",
        },
      },
      emptyStageActions: {
        BACKLOG: {
          hint: "Accepted proposal milestones awaiting funding appear here automatically.",
          ctaLabel: "View your contracts",
        },
        ESCROW_HELD: {
          hint: "Milestones funded into escrow appear here ready for delivery.",
          ctaLabel: "View payments",
        },
        WORK_IN_PROGRESS: {
          hint: "Funded milestones appear here once the freelancer starts work.",
          ctaLabel: "View your contracts",
        },
        SUBMITTED_FOR_REVIEW: {
          hint: "Submitted deliverables awaiting client review and release appear here.",
          ctaLabel: "View payments",
        },
        RELEASED: {
          hint: "Released milestones paid out to the freelancer appear here.",
          ctaLabel: "View payments",
        },
        DISPUTED_REFUNDED: {
          hint: "Disputed or refunded milestones are tracked separately here.",
          ctaLabel: "View payments",
        },
      },
      emptyBoardTitle: "No milestones yet",
      emptyBoardDesc: "Post a job and agree contract milestones to track stages on your board.",
      emptyPostJobCta: "Post a job",
      title: "Milestone Board",
      subtitle:
        "Live overview of milestone stages. Open any card to fund, review delivery, or open the contract.",
      searchPlaceholder: "Search milestones by title, code, contract, or party...",
      searchAria: "Search Kanban milestones",
      clientFilterAria: "Filter by client",
      allClients: "All Clients",
      freelancerFilterAria: "Filter by freelancer",
      allFreelancers: "All Freelancers",
      contractFilterAria: "Filter by contract",
      allContracts: "All Contracts",
      priorityAria: "Filter by priority",
      priorityAll: "All Priorities",
      priorityHighFilter: "High Priority",
      priorityMediumFilter: "Medium",
      priorityLowFilter: "Low",
      overdueOnlyBtn: "Overdue only",
      clearFiltersBtn: "Clear filters",
      priorityLabels: { HIGH: "HIGH", MEDIUM: "MEDIUM", LOW: "LOW" },
      mobileTabsAria: "Kanban workflow stages",
      emptyCol: "No milestones in this stage",
      filteredEmptyCol: (n) =>
        n > 0
          ? `${n} ${n === 1 ? "milestone" : "milestones"} hidden by active filters`
          : "No milestones match the active filters",
      openContractsCta: "View your contracts",
      openWalletCta: "Open Wallet",
      boardSummary: (shown, total, overdue) =>
        `${shown} of ${total} ${total === 1 ? "milestone" : "milestones"}${overdue > 0 ? ` · ${overdue} overdue` : ""}`,
      taskCountLabel: (shown, total, filtered) =>
        filtered && shown !== total
          ? `${shown} of ${total}`
          : `${shown} ${shown === 1 ? "task" : "tasks"}`,
      overdueColCount: (n) => `${n} overdue`,
      overdueDaysLabel: (d) => `Overdue ${d}d`,
      dueTodayLabel: "Due today",
      dueSoonLabel: (d) => `Due in ${d}d`,
      settledLabel: "Settled",
      onTrackLabel: "On track",
      collapseColumnAria: (title) => `Collapse ${title} column`,
      expandColumnAria: (title) => `Expand ${title} column`,
      collapseEmptyBtn: "Collapse empty",
      expandAllBtn: "Expand all",
      scrollLeftAria: "Scroll stages left",
      scrollRightAria: "Scroll stages right",
      scrollHint: "Scroll horizontally or use arrows to browse all 5 stages",
      duePrefix: (d) => `Due ${d}`,
      viewDetailsAria: (title) => `View details for ${title}`,
      detailsAria: "Milestone details",
      detailContract: "Contract",
      detailClient: "Client",
      detailFreelancer: "Freelancer",
      detailCategory: "Category",
      detailRail: "Payment Rail",
      detailAmount: "Gross Escrow Amount",
      detailPlatformFee: "Platform fee",
      detailProviderFee: "Provider fee",
      detailClientFee: "Client fee",
      detailClientTotal: "Total charge",
      detailNetPayout: "Net Freelancer Payout",
      clientFeeZeroNote: "Platform fees are paid by the freelancer. You pay ETB 0 in fees.",
      detailDueDate: "Due Date",
      detailScheduleStatus: "Schedule Status",
      detailPriority: "Priority",
      detailStage: "Workflow Stage",
      detailDeliverable: "Deliverable Link",
      openDeliverableBtn: "Open deliverable",
      detailFundedAt: "Escrow Funded",
      detailSubmittedAt: "Submitted",
      detailAutoReleaseAt: "Auto-Release",
      detailReleasedAt: "Released",
      actionsLabel: "Escrow & Contract Actions",
      fundMilestoneBtn: "Fund Milestone",
      reviewReleaseBtn: "Review & Release",
      submitDeliveryBtn: "Submit Delivery",
      disputeBtn: "Dispute",
      openEscrowBtn: "View payments",
      awaitingSignatureNote: "Waiting for both parties to sign the agreement before funding.",
      openContractRoomBtn: "View your contracts",
      closeBtn: "Close",
      closeAria: "Close",
    },
    calendar: {
      typeLabels: {
        MILESTONE_DUE: "Milestone Due",
        PAYOUT_RELEASE: "Payout Release",
        PROPOSAL_DEADLINE: "Proposal Deadline",
        COMPLIANCE_KYC: "Compliance SLA",
        PERSONAL_REMINDER: "Personal Reminder",
      },
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      title: "Milestone, Payout & SLA Schedule",
      subtitle:
        "Track live contract deadlines, release windows, and Ethiopian fiscal calendar quarters",
      prevEthMonthAria: "Previous Ethiopian month",
      prevMonthAria: "Previous month",
      nextEthMonthAria: "Next Ethiopian month",
      nextMonthAria: "Next month",
      todayBtn: "Today",
      todayBadge: "Today",
      selectedBadge: "Selected",
      openEscrowBtn: "View payments",
      calendarSystemAria: "Calendar system",
      modeGregorian: "Gregorian",
      modeFiscal: "Ethiopian Fiscal",
      filterTypeAria: "Filter calendar by event type",
      filterAllEvents: "All Events",
      filterProposals: "Proposals",
      fiscalYearEyebrow: "Ethiopian Fiscal Year",
      fiscalQuartersAria: (l) => `Fiscal quarters for ${l}`,
      itemsCount: (n) => `${n} ${n === 1 ? "item" : "items"}`,
      noScheduledItems: "no scheduled items",
      mobileDatesAria: "Scheduled dates in the visible month",
      selectedDateLabel: "Selected Date",
      fiscalPeriodLabel: "Fiscal period",
      noItemsOnDate: (d) => `No scheduled milestones or payouts on ${d}.`,
      statusCompleted: "Completed",
      statusAtRisk: "SLA At Risk",
      upcomingTitle: "Upcoming Month Highlights",
      upcomingEmpty: "No items match this filter.",
    },
  },
  am: {
    palette: {
      dialogAria: "ዓለም አቀፍ የትዕዛዝ መፈለጊያ",
      placeholder: "ትዕዛዝ ይጻፉ፣ ወደ ዳሽቦርድ ይዝለሉ ወይም ሚና ይቀይሩ...",
      searchAria: "ትዕዛዝ ፈልግ",
      empty: (q) => `ለ"${q}" የሚዛመድ ትዕዛዝ ወይም ገጽ የለም።`,
      navNavigate: "አስስ",
      navExecute: "ፈጽም",
      navToggle: "በየትኛውም ቦታ ክፈት",
      groups: {
        modes: "የዳሽቦርድ ሁነታዎች",
        navigation: "የሥራ ቦታ አሰሳ",
        roleMode: "የሥራ ቦታ ሚና",
        appearance: "ገጽታ እና አቀማመጥ",
      },
      actions: {
        d1Label: "ወደ ዳሽቦርድ 1 ቀይር፡ አፈጻጸም እና ትንታኔ",
        d1Hint: "የገንዘብ ፍሰት እና KPI አመልካቾች",
        d2TableLabel: "ወደ ዳሽቦርድ 2 ቀይር፡ የመዝገብ እና የውሂብ ሰንጠረዥ",
        d2TableHint: "ሰንጠረዥ፣ መደርደር እና CSV መላክ",
        d2KanbanLabel: "የምዕራፍ እና አቅርቦት Kanban ሰሌዳ ክፈት",
        d2KanbanHint: "ባለ 5-ደረጃ የኤስክሮ ሂደት",
        d2CalendarLabel: "የውል እና የክፍያ የቀን መቁጠሪያ ክፈት",
        d2CalendarHint: "ወርሃዊ የቀነ-ገደብ እና የቀን መርሐ ግብር",
        jobsLabel: "የሥራዎች እና ጨረታዎች ገበያ",
        jobsHint: "ሥራ ይለጥፉ ወይም ፕሮፖዛል ያቅርቡ",
        gigsLabel: "ቋሚ ዋጋ ያላቸው ጊጎች ዝርዝር",
        gigsHint: "የኢትዮጵያ ባለሙያዎችን አገልግሎቶች ያስሱ",
        contractsLabel: "ውሎች እና የአገልግሎት ስምምነቶች",
        contractsHint: "የAACCSA ስምምነቶችን ይፈርሙ እና PDF ያውርዱ",
        escrowLabel: "የኤስክሮ ማዕከል እና ምዕራፎች",
        escrowHint: "ኤስክሮ ይክፈሉ፣ ሥራ ያስረክቡ እና ክፍያ ይልቀቁ",
        walletLabel: "ቦርሳ እና ቴሌብር / CBE መሙላት",
        walletHint: "የETB ቀሪ ሂሳብን ያስተዳድሩ እና ደረሰኝ ይላኩ",
        chatLabel: "መልዕክቶች እና የውል ውይይት",
        chatHint: "ቀጥታ የደንበኛ፣ ባለሙያ እና የድጋፍ ውይይት",
        verificationLabel: "የፋይዳ ብሔራዊ መታወቂያ እና KYC ማረጋገጫ",
        verificationHint: "ገንዘብ ለማውጣት ማንነትዎን ያረጋግጡ",
        casesLabel: "አለመግባባቶች እና የሽምግልና ማዕከል",
        casesHint: "ማስረጃ ያቅርቡ እና የAACCSA ግልግልን ይከታተሉ",
        profileLabel: "የሕዝብ ፖርትፎሊዮ እና መገለጫ",
        profileHint: "ክህሎቶችን፣ የተረጋገጡ ባጆችን እና ግምገማዎችን ይመልከቱ",
        settingsLabel: "የመለያ ቅንብሮች",
        settingsHint: "ምርጫዎች እና ድጋፍ",
        roleClientLabel: "ወደ ደንበኛ ሁነታ ቀይር (ቅጥር እና ኤስክሮ)",
        roleClientHint: (a) => (a ? "ንቁ ሁነታ" : "ወደ ደንበኛ እይታ ቀይር"),
        roleFreelancerLabel: "ወደ ባለሙያ ሁነታ ቀይር (ሥራ እና ክፍያ)",
        roleFreelancerHint: (a) => (a ? "ንቁ ሁነታ" : "ወደ ባለሙያ እይታ ቀይር"),
        roleBothLabel: "ወደ ጥምር ሁነታ ቀይር (ደንበኛ + ባለሙያ)",
        roleBothHint: (a) => (a ? "ንቁ ሁነታ" : "ይቅጠሩ እና ሥራ ያቅርቡ"),
        customizerLabel: "የሥራ ቦታ አቀማመጥ አብጅ ክፈት",
        customizerHint: "የጎን አሞሌ፣ ጥግግት እና ቅርጽ",
        sidebarToggleLabel: "የጎን አሞሌን አሳጥር / ዘርጋ",
        sidebarToggleHint: "የሰንጠረዥ ስፋትን ያስፋ",
        themeLabel: (isLight) =>
          isLight ? "ወደ ጨለማ ገጽታ ቀይር" : "ወደ ብርሃን ገጽታ ቀይር",
        themeHint: "የYekis ኤመራልድ ቀለም ስርዓት",
      },
    },
    customizer: {
      triggerTitle: "የሥራ ቦታ አቀማመጥን ያብጁ",
      triggerAria: "የሥራ ቦታ አቀማመጥን አብጅ",
      triggerText: "አብጅ",
      dialogAria: "የሥራ ቦታ አቀማመጥ ማበጃ",
      title: "የሥራ ቦታ ማበጃ",
      subtitle: "የጎን አሞሌን፣ የዳሽቦርድ ቅርጽን እና የሰንጠረዥ ጥግግትን ያዋቅሩ።",
      closeAria: "ማበጃን ዝጋ",
      templateModeLabel: "የዳሽቦርድ ቅርጽ",
      d1Title: "ዳሽቦርድ 1",
      d1Desc: "ዋና KPIs እና የገንዘብ ፍሰት ገበታዎች",
      d2Title: "ዳሽቦርድ 2",
      d2Desc: "ሰንጠረዥ፣ Kanban እና መርሐ ግብር",
      sidebarArchLabel: "የጎን አሞሌ ቅርጽ",
      sidebarStandard: "መደበኛ",
      sidebarStandardDesc: "ሙሉ ጠርዝ",
      sidebarInset: "ውስጣዊ",
      sidebarInsetDesc: "ክፈፍ ያለው",
      sidebarFloating: "ተንሳፋፊ",
      sidebarFloatingDesc: "ተነጥሎ የቆመ",
      railWidthLabel: "የአሰሳ አሞሌ ስፋት",
      railExpanded: "የተዘረጋ (256px)",
      railExpandedDesc: "ሙሉ መለያዎች እና ሚና",
      railCompact: "ጠባብ አዶ አሞሌ",
      railCompactDesc: "የሰንጠረዥ ስፋትን ይጨምራል",
      densityLabel: "የሰንጠረዥ እና ዝርዝር ጥግግት",
      densityCompact: "ጥቅጥቅ (38px)",
      densityCompactDesc: "ብዙ የፋይናንስ መስመሮች",
      densityComfortable: "ምቹ (46px)",
      densityComfortableDesc: "ሰፊ ክፍተት",
      radiusLabel: "የማዕዘን ክብነት",
      radiusCrisp: "ስል (6px)",
      radiusDefault: "መደበኛ (8px)",
      radiusSoft: "ለስላሳ (12px)",
      colorThemeLabel: "የቀለም ገጽታ (Yekis ኤመራልድ)",
      lightLabel: "ብርሃን ገጽታ",
      lightDesc: "#F8FAFC መደብ · #16A34A ቀለም",
      darkLabel: "ጨለማ ገጽታ",
      darkDesc: "#090D12 መደብ · #22C55E ቀለም",
      resetBtn: "ወደ መደበኛ አቀማመጥ መልስ",
    },
    charts: {
      cashflowTitle: "የኤስክሮ ገቢ እና የተለቀቁ ክፍያዎች",
      cashflowDesc: "ወደ ምዕራፍ ኤስክሮ የገባ ጠቅላላ ETB እና ለባለሙያዎች የተከፈለ",
      windowAria: "የገበታ ጊዜ ይምረጡ",
      escrowFunded: (r) => `የተከፈለ ኤስክሮ (${r})`,
      releasedToTalent: (r) => `ለባለሙያ የተለቀቀ (${r})`,
      periodLabel: (l) => `ጊዜ፡ ${l}`,
      latestLabel: (l) => `የቅርብ ጊዜ (${l})`,
      inPrefix: "ገቢ",
      outPrefix: "ወጪ",
      cashflowSvgAria: "የኤስክሮ ገቢ እና ክፍያ ገበታ",
      railMixTitle: "ክፍያዎች በዘዴ",
      railMixDesc: (r) => `ቴሌብር · CBE ብር · M-Pesa መጠን (${r})`,
      milestonesSettled: (n) => `${n} ምዕራፎች ተጠናቅቀዋል`,
      railSvgAria: "የክፍያ መንገዶች አሞሌ ገበታ",
    },
    overview: {
      modeAria: "የዳሽቦርድ ቅርጽ ይምረጡ",
      opsModeAria: "የሥራ እይታ ሁነታ",
      quickJumpTitle: "የትዕዛዝ መፈለጊያ ክፈት (Ctrl+K)",
      refreshTitle: "ውሂብ አድስ",
      refreshAria: "ውሂብ አድስ",
      vsPrior30d: (n) => `ካለፉት 30 ቀናት · ${n} መሙላቶች`,
      approvedTopUps: "የጸደቁ የቴሌብር / CBE መሙላቶች",
      pendingReceiptVerif: "የደረሰኝ ማረጋገጫ የሚጠብቁ",
      openWalletDeskBtn: "ቦርሳ እና መሙያ ክፈት",
      milestoneBacked: (n) => `100% በምዕራፍ የተደገፈ · ${n} ንቁ`,
      releasedYtd: "እስካሁን የተለቀቀ ክፍያ",
      submittedQa: "ግምገማ የሚጠብቁ",
      inspectContractsBtn: "የኤስክሮ ውሎችን መርምር",
      onTimeDelta: "98.2% በሰዓቱ",
      acrossContracts: (n) => `በ${n} ውሎች ውስጥ`,
      inActiveDelivery: "በመሠራት ላይ ያሉ",
      escrowFundedReady: "ኤስክሮ ተከፍሎ ዝግጁ",
      milestonesCount: (n) => `${n} ምዕራፎች`,
      openKanbanBtn: "የምዕራፍ Kanban ሰሌዳ ክፈት",
      combinedBudgetPool: "ጠቅላላ ከፍተኛ በጀት",
      exploreBriefsBtn: "ሁሉንም ሥራዎች አስስ",
      duePrefix: (d) => `ማለቂያ ${d}`,
      deadlinePrefix: (d) => `የመጨረሻ ቀን ${d}`,
      contractPrefix: (id) => `ውል #${id}`,
    },
    table: {
      statuses: {
        ESCROW_HELD: "በኤስክሮ የተያዘ",
        WORK_IN_PROGRESS: "በሂደት ላይ",
        SUBMITTED_FOR_REVIEW: "ቀርቧል",
        RELEASED: "ተለቋል",
        PAYMENT_PENDING: "ክፍያ በመጠበቅ ላይ",
        DISPUTED: "አለመግባባት",
        ACCEPTED: "ተቀብሏል",
        REFUNDED: "ተመልሷል",
        PARTIAL_REFUND: "በከፊል ተመልሷል",
      },
      title: "የምዕራፎች እና ክፍያዎች ዝርዝር",
      subtitle: (n) => `${n} መዝገቦች · ጠቅላላ መጠን`,
      exportSelected: (n) => `የተመረጡትን ላክ (${n})`,
      exportCsv: "CSV ላክ",
      columnsBtn: "አምዶች",
      toggleColumnsTitle: "አምዶችን አሳይ/ደብቅ",
      colCounterparty: "ተዋዋይ ወገን",
      colCategory: "ምድብ",
      colRail: "የክፍያ መንገድ",
      colDueDate: "የመጨረሻ ቀን",
      colFee: "የመድረክ ክፍያ",
      mobileViewAria: "የሞባይል እይታ",
      cardsBtn: "ካርዶች",
      tableBtn: "ሰንጠረዥ",
      searchPlaceholder: "ምዕራፎችን፣ ውሎችን ወይም ተዋዋይን አጣራ...",
      searchAria: "ምዕራፎችን ወይም ውሎችን አጣራ",
      clearSearchAria: "ፍለጋ አጽዳ",
      filterStateAria: "በኤስክሮ ሁኔታ አጣራ",
      filterAll: "ሁሉም",
      filterRailAria: "በክፍያ መንገድ አጣራ",
      allRails: "ሁሉም የክፍያ መንገዶች",
      cardsListAria: "የውሎች እና ምዕራፎች ካርድ ዝርዝር",
      emptyMsg: "ከፍለጋዎ ጋር የሚዛመዱ የውል ምዕራፎች የሉም።",
      selectItemAria: (t) => `${t}ን ምረጥ`,
      duePrefix: (d) => `ማለቂያ ${d}`,
      feePrefix: "ክፍያ",
      inspectBtn: "መርምር",
      regionAria: "የኤስክሮ ውሎች እና ምዕራፎች መዝገብ",
      selectAllAria: "ሁሉንም የሚታዩ ረድፎች ምረጥ",
      thMilestoneContract: "ምዕራፍ እና ውል",
      thCounterparty: "ተዋዋይ ወገን",
      thScopeRail: "ወሰን እና መንገድ",
      thState: "ሁኔታ",
      thDueDate: "የመጨረሻ ቀን",
      thEscrowEtb: "ኤስክሮ (ETB)",
      thFee: "የመድረክ ክፍያ",
      thProviderFee: "የአገልግሎት ክፍያ",
      thClientFee: "የደንበኛ ክፍያ",
      thClientTotal: "ጠቅላላ",
      thNetPayout: "የተጣራ ክፍያ",
      thActions: "ድርጊቶች",
      clientFeeZeroTitle: "የደንበኛ ክፍያ፡ ETB 0",
      clientFeeZeroNote: "የመድረክ ክፍያዎች የሚከፈሉት በባለሙያ ነው። እርስዎ ETB 0 ክፍያ ይከፍላሉ።",
      selectedFooter: (s, t) => `ከ${t} ውስጥ ${s} ተመርጧል`,
      rowsPerPage: "በገጽ ረድፎች",
      pageOf: (p, tp) => `ገጽ ${p} ከ ${tp}`,
      prevPageAria: "ቀዳሚ ገጽ",
      nextPageAria: "ቀጣይ ገጽ",
      inspectorAria: "የምዕራፍ መዝገብ ዝርዝሮች",
      closeInspectorAria: "መርማሪን ዝጋ",
      detailContract: "ውል",
      detailCounterparty: "ተዋዋይ ወገን",
      detailCategory: "ምድብ",
      detailGross: "ጠቅላላ የኤስክሮ መጠን",
      detailFee: "የመድረክ ክፍያ",
      detailProviderFee: "የክፍያ አገልግሎት ክፍያ",
      detailClientFee: "የደንበኛ ክፍያ",
      detailClientTotal: "ጠቅላላ ክፍያ",
      detailNet: "ለባለሙያ የሚከፈል የተጣራ",
      detailDueDate: "የመጨረሻ ቀን",
      detailState: "የአሁኑ የኤስክሮ ሁኔታ",
      actionsLabel: "የኤስክሮ እና ውል ድርጊቶች",
      fundMilestoneBtn: "ምዕራፍ ክፈል",
      reviewReleaseBtn: "ገምግም እና ልቀቅ",
      submitDeliveryBtn: "አቅርቦት አስገባ",
      disputeBtn: "አለመግባባት",
      openEscrowBtn: "ክፍያዎችን ይመልከቱ",
      awaitingSignatureNote: "ገንዘብ ከመክፈልዎ በፊት ሁለቱም ወገኖች ውሉን እስኪፈርሙ በመጠበቅ ላይ።",
      openContractRoomBtn: "ውሎችዎን ይመልከቱ",
      emptyTitle: "እስካሁን ምንም ምዕራፎች የሉም",
      emptyDesc: "ፕሮፖዛል አጽድቀው ውል ሲፈጥሩ ምዕራፎች እዚህ ይታያሉ።",
      emptyPostJobCta: "ሥራ ለጥፍ",
      emptyContractsCta: "ውሎችዎን ይመልከቱ",
      closeBtn: "ዝጋ",
    },
    kanban: {
      columns: {
        BACKLOG: { title: "ክፍያ በመጠባበቅ ላይ", subtitle: "ክፍያ ይጠብቃል" },
        ESCROW_HELD: { title: "በኤስክሮው የተያዘ", subtitle: "ተከፍሎ የተጠበቀ" },
        WORK_IN_PROGRESS: { title: "በሂደት ላይ", subtitle: "ሥራ በመሠራት ላይ" },
        SUBMITTED_FOR_REVIEW: { title: "ለግምገማ ዝግጁ", subtitle: "ሥራው ቀርቧል" },
        RELEASED: { title: "ተከፍሏል", subtitle: "ለባለሙያ ተለቋል" },
        DISPUTED_REFUNDED: { title: "በክርክር / የተመለሰ", subtitle: "የቆመ ወይም የተመለሰ" },
      },
      emptyStageActions: {
        BACKLOG: {
          hint: "ክፍያ የሚጠብቁ የጸደቁ ምዕራፎች እዚህ በራስ-ሰር ይታያሉ።",
          ctaLabel: "ውሎችዎን ይመልከቱ",
        },
        ESCROW_HELD: {
          hint: "በኤስክሮ የተያዙ እና ለመጀመር ዝግጁ የሆኑ ምዕራፎች እዚህ ይታያሉ።",
          ctaLabel: "ክፍያዎችን ይመልከቱ",
        },
        WORK_IN_PROGRESS: {
          hint: "ባለሙያው ሥራ ሲጀምር የተከፈሉ ምዕራፎች እዚህ ይታያሉ።",
          ctaLabel: "ውሎችዎን ይመልከቱ",
        },
        SUBMITTED_FOR_REVIEW: {
          hint: "የደንበኛ ማረጋገጫ እና ክፍያ መልቀቂያ የሚጠብቁ አቅርቦቶች እዚህ ይገባሉ።",
          ctaLabel: "ክፍያዎችን ይመልከቱ",
        },
        RELEASED: {
          hint: "ወደ ባለሙያ ቦርሳ የተለቀቁ ምዕራፎች እዚህ ይታያሉ።",
          ctaLabel: "ክፍያዎችን ይመልከቱ",
        },
        DISPUTED_REFUNDED: {
          hint: "በክርክር ላይ ያሉ ወይም የተመለሱ ምዕራፎች እዚህ ይታያሉ።",
          ctaLabel: "ክፍያዎችን ይመልከቱ",
        },
      },
      emptyBoardTitle: "እስካሁን ምንም ምዕራፎች የሉም",
      emptyBoardDesc: "በቦርድዎ ላይ ደረጃዎችን ለመከታተል ሥራ ይለጥፉ እና የውል ምዕራፎችን ይስማሙ።",
      emptyPostJobCta: "ሥራ ለጥፍ",
      title: "የምዕራፍ ቦርድ",
      subtitle: "የአገልጋይ ኤስክሮ ሁኔታ የንባብ-ብቻ ትንበያ። እርምጃ ለመውሰድ ካርድ ይክፈቱ።",
      searchPlaceholder: "ተግባራትን በርዕስ፣ በኮድ፣ በውል ወይም በተዋዋይ ፈልግ...",
      searchAria: "የKanban ተግባራትን ፈልግ",
      clientFilterAria: "በደንበኛ አጣራ",
      allClients: "ሁሉም ደንበኞች",
      freelancerFilterAria: "በባለሙያ አጣራ",
      allFreelancers: "ሁሉም ባለሙያዎች",
      contractFilterAria: "በውል አጣራ",
      allContracts: "ሁሉም ውሎች",
      priorityAria: "በቅድሚያ አጣራ",
      priorityAll: "ሁሉም ቅድሚያዎች",
      priorityHighFilter: "ከፍተኛ ቅድሚያ",
      priorityMediumFilter: "መካከለኛ",
      priorityLowFilter: "ዝቅተኛ",
      overdueOnlyBtn: "ጊዜያቸው ያለፈባቸው ብቻ",
      clearFiltersBtn: "ማጣሪያዎችን አጽዳ",
      priorityLabels: { HIGH: "ከፍተኛ", MEDIUM: "መካከለኛ", LOW: "ዝቅተኛ" },
      mobileTabsAria: "የKanban ሂደት ደረጃዎች",
      emptyCol: "በዚህ ደረጃ ምንም ምዕራፎች የሉም",
      filteredEmptyCol: (n) =>
        n > 0
          ? `${n} ምዕራፎች በንቁ ማጣሪያዎች ተደብቀዋል`
          : "ከንቁ ማጣሪያዎች ጋር የሚዛመድ ምዕራፍ የለም",
      openContractsCta: "ውሎችን ክፈት",
      openWalletCta: "ቦርሳ ክፈት",
      boardSummary: (shown, total, overdue) =>
        `ከ${total} ምዕራፎች ${shown}${overdue > 0 ? ` · ${overdue} ጊዜያቸው ያለፈ` : ""}`,
      taskCountLabel: (shown, total, filtered) =>
        filtered && shown !== total ? `${shown} / ${total}` : `${shown} ተግባራት`,
      overdueColCount: (n) => `${n} ጊዜው ያለፈ`,
      overdueDaysLabel: (d) => `${d} ቀን አልፏል`,
      dueTodayLabel: "ዛሬ ማለቂያ",
      dueSoonLabel: (d) => `በ${d} ቀን`,
      settledLabel: "ተከፍሏል",
      onTrackLabel: "በጊዜው",
      collapseColumnAria: (title) => `${title} አምድን ሰብስብ`,
      expandColumnAria: (title) => `${title} አምድን ዘርጋ`,
      collapseEmptyBtn: "ባዶዎችን ሰብስብ",
      expandAllBtn: "ሁሉንም ዘርጋ",
      scrollLeftAria: "ወደ ግራ ሸብልል",
      scrollRightAria: "ወደ ቀኝ ሸብልል",
      scrollHint: "ሁሉንም 5 ደረጃዎች ለማየት በአግድም ይሸብልሉ ወይም ቀስቶችን ይጠቀሙ",
      duePrefix: (d) => `ማለቂያ ${d}`,
      viewDetailsAria: (title) => `የ${title} ዝርዝሮችን ይመልከቱ`,
      detailsAria: "የምዕራፍ ተግባር ዝርዝሮች",
      detailContract: "ውል",
      detailClient: "ደንበኛ",
      detailFreelancer: "ባለሙያ",
      detailCategory: "ምድብ",
      detailRail: "የክፍያ መንገድ",
      detailAmount: "ጠቅላላ የኤስክሮ መጠን",
      detailPlatformFee: "የመድረክ ክፍያ",
      detailProviderFee: "የክፍያ አገልግሎት ክፍያ",
      detailClientFee: "የደንበኛ ክፍያ",
      detailClientTotal: "ጠቅላላ ክፍያ",
      detailNetPayout: "ለባለሙያ የሚከፈል የተጣራ",
      clientFeeZeroNote: "የመድረክ ክፍያዎች የሚከፈሉት በባለሙያ ነው። እርስዎ ETB 0 ክፍያ ይከፍላሉ።",
      detailDueDate: "የመጨረሻ ቀን",
      detailScheduleStatus: "የጊዜ ሰሌዳ ሁኔታ",
      detailPriority: "ቅድሚያ",
      detailStage: "የሂደት ደረጃ",
      detailDeliverable: "የአቅርቦት አገናኝ",
      openDeliverableBtn: "አቅርቦቱን ክፈት",
      detailFundedAt: "ኤስክሮ የተያዘበት",
      detailSubmittedAt: "የቀረበበት",
      detailAutoReleaseAt: "ራስ-ሰር መልቀቂያ",
      detailReleasedAt: "የተለቀቀበት",
      actionsLabel: "የኤስክሮ እና ውል ድርጊቶች",
      fundMilestoneBtn: "ምዕራፍ ክፈል",
      reviewReleaseBtn: "ገምግም እና ልቀቅ",
      submitDeliveryBtn: "አቅርቦት አስገባ",
      disputeBtn: "አለመግባባት",
      openEscrowBtn: "ክፍያዎችን ይመልከቱ",
      awaitingSignatureNote: "ገንዘብ ከመክፈልዎ በፊት ሁለቱም ወገኖች ውሉን እስኪፈርሙ በመጠበቅ ላይ።",
      openContractRoomBtn: "ውሎችዎን ይመልከቱ",
      closeBtn: "ዝጋ",
      closeAria: "ዝጋ",
    },
    calendar: {
      typeLabels: {
        MILESTONE_DUE: "የምዕራፍ ማለቂያ",
        PAYOUT_RELEASE: "የክፍያ መልቀቂያ",
        PROPOSAL_DEADLINE: "የጨረታ ቀነ-ገደብ",
        COMPLIANCE_KYC: "የማረጋገጫ SLA",
        PERSONAL_REMINDER: "የግል ማስታወሻ",
      },
      weekdays: ["ሰኞ", "ማክሰኞ", "ረቡዕ", "ሐሙስ", "ዓርብ", "ቅዳሜ", "እሑድ"],
      title: "የምዕራፍ፣ ክፍያ እና SLA መርሐ ግብር",
      subtitle:
        "የውል ቀነ-ገደቦችን፣ የክፍያ መልቀቂያዎችን እና የኢትዮጵያ በጀት ዓመት ጊዜያትን ይከታተሉ",
      prevEthMonthAria: "ቀዳሚ የኢትዮጵያ ወር",
      prevMonthAria: "ቀዳሚ ወር",
      nextEthMonthAria: "ቀጣይ የኢትዮጵያ ወር",
      nextMonthAria: "ቀጣይ ወር",
      todayBtn: "ዛሬ",
      todayBadge: "ዛሬ",
      selectedBadge: "የተመረጠ",
      openEscrowBtn: "ክፍያዎችን ይመልከቱ",
      calendarSystemAria: "የቀን መቁጠሪያ ስርዓት",
      modeGregorian: "ግሪጎሪያን",
      modeFiscal: "የኢትዮጵያ በጀት ዓመት",
      filterTypeAria: "በክስተት አይነት አጣራ",
      filterAllEvents: "ሁሉም ክስተቶች",
      filterProposals: "ፕሮፖዛሎች",
      fiscalYearEyebrow: "የኢትዮጵያ በጀት ዓመት",
      fiscalQuartersAria: (l) => `ለ${l} የበጀት ሩብ ዓመታት`,
      itemsCount: (n) => `${n} ንጥሎች`,
      noScheduledItems: "ምንም የታቀዱ ንጥሎች የሉም",
      mobileDatesAria: "በዚህ ወር ውስጥ የታቀዱ ቀናት",
      selectedDateLabel: "የተመረጠ ቀን",
      fiscalPeriodLabel: "የበጀት ወቅት",
      noItemsOnDate: (d) => `በ${d} የታቀዱ ምዕራፎች ወይም ክፍያዎች የሉም።`,
      statusCompleted: "ተጠናቅቋል",
      statusAtRisk: "SLA በስጋት ላይ",
      upcomingTitle: "የሚመጣው ወር ዋና ዋና ጉዳዮች",
      upcomingEmpty: "ከዚህ ማጣሪያ ጋር የሚዛመድ የለም።",
    },
  },
  om: {
    palette: {
      dialogAria: "Gabatee Ajaja Waliigalaa",
      placeholder:
        "Ajaja barreessi, gara daashboordii utaali ykn gahee jijjiiri...",
      searchAria: "Ajaja barbaadi",
      empty: (q) => `Ajajni ykn fuulli "${q}" wajjin walsimu hin argamne.`,
      navNavigate: "Imali",
      navExecute: "Raawwadhu",
      navToggle: "Bakka kamittuu bani",
      groups: {
        modes: "Haalota Daashboordii",
        navigation: "Qajeelcha Bakka Hojii",
        roleMode: "Gahee Bakka Hojii",
        appearance: "Bifaafi Qindaa'ina",
      },
      actions: {
        d1Label: "Gara Daashboordii 1 Jijjiiri: Xiinxalaafi KPI",
        d1Hint: "Chaatii maallaqaa, karaa kaffaltiifi KPI",
        d2TableLabel: "Gara Daashboordii 2 Jijjiiri: Galmee & Gabatee",
        d2TableHint: "Gabatee calaltuu hedduufi baasii CSV",
        d2KanbanLabel: "Gabatee Kanban Boqonnaa Hojii Bani",
        d2KanbanHint: "Adeemsa escrow sadarkaa 5",
        d2CalendarLabel: "Kalaandarii Waliigalteefi Kaffaltii Bani",
        d2CalendarHint: "Daangaa yeroo ji'aafi sagantaa guyyaa",
        jobsLabel: "Gabaa Hojiifi Ibsa Hojii",
        jobsHint: "Ibsa hojii maxxansi ykn yaada dorgommii dhiyeessi",
        gigsLabel: "Galaana Giigota Gatii Dhaabbataa",
        gigsHint: "Tajaajiloota ogeeyyii Itoophiyaa ilaali",
        contractsLabel: "Waliigalteewwaniifi Walta'iinsa",
        contractsHint: "Waliigaltee AACCSA mallatteessiifi PDF buufadhu",
        escrowLabel: "Giddugala Escrow fi Boqonnaa Hojii",
        escrowHint: "Escrow guuti, hojii dhiyeessiifi kaffaltii gadhiisi",
        walletLabel: "Boorsaa fi Guutuu Telebirr / CBE",
        walletHint: "Madaallii ETB bulchiifi nagahee olkaa'i",
        chatLabel: "Ergaawwaniifi Haasaa Waliigaltee",
        chatHint: "Ergaa maamila, ogeessaafi deeggarsaa yeroo qabatamaa",
        verificationLabel: "Eenyummaa Biyyaalessaa Fayda & KYC",
        verificationHint: "Baasii banuuf eenyummaa mirkaneessi",
        casesLabel: "Giddugala Falmiifi Araaraa",
        casesHint: "Ragaa dhiyeessiifi murtee AACCSA hordofi",
        profileLabel: "Poortifooliyoo Hawaasaafi Piroofaayila",
        profileHint: "Ogummaa, baajii mirkanaafi yaada ilaali",
        settingsLabel: "Qindaa'ina Herregaa",
        settingsHint: "Filannoowwaniifi deeggarsa",
        roleClientLabel: "Gara Haala Maamilaatti Jijjiiri",
        roleClientHint: (a) => (a ? "Haala banaa" : "Gara mul'ata Maamilaa"),
        roleFreelancerLabel: "Gara Haala Ogeessaatti Jijjiiri",
        roleFreelancerHint: (a) =>
          a ? "Haala banaa" : "Gara mul'ata Ogeessaa",
        roleBothLabel: "Gara Haala Waloo Jijjiiri (Maamila + Ogeessa)",
        roleBothHint: (a) => (a ? "Haala banaa" : "Qacariifi hojii dhiyeessi"),
        customizerLabel: "Qindeessaa Bifa Bakka Hojii Bani",
        customizerHint: "Bifa cinaa, rukkinnaafi naannoo",
        sidebarToggleLabel: "Cinaa Cufi / Bal'isi",
        sidebarToggleHint: "Bal'ina gabatee guddisa",
        themeLabel: (isLight) =>
          isLight ? "Gara Bifa Dukkanaatti Jijjiiri" : "Gara Bifa Ifaatti Jijjiiri",
        themeHint: "Sirna halluu Yekis Emerald",
      },
    },
    customizer: {
      triggerTitle: "Qindaa'inaafi bifa bakka hojii sirreessi",
      triggerAria: "Qindaa'ina bakka hojii sirreessi",
      triggerText: "Sirreessi",
      dialogAria: "Qindeessaa Bakka Hojii",
      title: "Qindeessaa Bakka Hojii",
      subtitle:
        "Bifa cinaa, unka daashboordiifi rukkinna gabatee qindeessi.",
      closeAria: "Qindeessaa cufi",
      templateModeLabel: "Haala Unka Daashboordii",
      d1Title: "Daashboordii 1",
      d1Desc: "KPI Ijoofi Chaatii Maallaqaa",
      d2Title: "Daashboordii 2",
      d2Desc: "Gabatee, Kanban & Sagantaa",
      sidebarArchLabel: "Ijaarsa Cinaa",
      sidebarStandard: "Idilee",
      sidebarStandardDesc: "Qarqara guutuu",
      sidebarInset: "Keessaa",
      sidebarInsetDesc: "Fureemii qabu",
      sidebarFloating: "Bololi'aa",
      sidebarFloatingDesc: "Adda bahe",
      railWidthLabel: "Bal'ina Cinaa Qajeelchaa",
      railExpanded: "Bal'ifame (256px)",
      railExpandedDesc: "Maqaa guutuufi gahee",
      railCompact: "Cinaa Mallattoo Gabaabaa",
      railCompactDesc: "Bal'ina gabatee guddisa",
      densityLabel: "Rukkinna Gabateefi Tarree",
      densityCompact: "Walitti dhiyaataa (38px)",
      densityCompactDesc: "Tarree faayinaansii hedduu",
      densityComfortable: "Mijataa (46px)",
      densityComfortableDesc: "Addaan fagaataa",
      radiusLabel: "Sadarkaa Geengoo Qarqarri",
      radiusCrisp: "Qara (6px)",
      radiusDefault: "Idilee (8px)",
      radiusSoft: "Lallaafaa (12px)",
      colorThemeLabel: "Halluu Fuulaa (Yekis Emerald)",
      lightLabel: "Bifa Ifaa",
      lightDesc: "Fuula #F8FAFC · #16A34A",
      darkLabel: "Bifa Dukkanaa",
      darkDesc: "Fuula #090D12 · #22C55E",
      resetBtn: "Gara Qindaa'ina Idileetti Deebisi",
    },
    charts: {
      cashflowTitle: "Galii Escrow fi Kaffaltii Gadhiifame",
      cashflowDesc:
        "ETB waliigalaa escrow keessa gale vs kaffaltii ogeessaaf raawwatame",
      windowAria: "Yeroo chaatii filadhu",
      escrowFunded: (r) => `Escrow Kaffalame (${r})`,
      releasedToTalent: (r) => `Ogeessaaf Gadhiifame (${r})`,
      periodLabel: (l) => `Yeroo: ${l}`,
      latestLabel: (l) => `Dhiyeenya (${l})`,
      inPrefix: "Gali",
      outPrefix: "Ba'i",
      cashflowSvgAria: "Chaatii galii escrow fi kaffaltii",
      railMixTitle: "Kaffaltiiwwan karaadhaan",
      railMixDesc: (r) => `Telebirr · CBE Birr · M-Pesa (${r})`,
      milestonesSettled: (n) => `Boqonnaa ${n} xumuraman`,
      railSvgAria: "Chaatii karaa kaffaltii",
    },
    overview: {
      modeAria: "Haala Unka Daashboordii Filadhu",
      opsModeAria: "Haala mul'ata hojii",
      quickJumpTitle: "Gabatee Ajajaa Bani (Ctrl+K)",
      refreshTitle: "Daataa bakka hojii haaromsi",
      refreshAria: "Daataa bakka hojii haaromsi",
      vsPrior30d: (n) => `guyyoota 30 darbaniif · guutinsa ${n}`,
      approvedTopUps: "Guutinsa Telebirr / CBE Mirkaneeffame",
      pendingReceiptVerif: "Mirkaneessa Nagahee Eegaa Jiru",
      openWalletDeskBtn: "Boorsaa fi Guutinsa Bani",
      milestoneBacked: (n) => `100% boqonnaan deeggarame · ${n} banaa`,
      releasedYtd: "Kaffaltii Hanga Ammaa Gadhiifame",
      submittedQa: "Gamaaggamaaf Dhiyaate",
      inspectContractsBtn: "Waliigaltee Escrow Sakatta'i",
      onTimeDelta: "98.2% yeroon",
      acrossContracts: (n) => `Waliigaltee ${n} keessatti`,
      inActiveDelivery: "Adeemsa Dhiyeessaa Irra",
      escrowFundedReady: "Escrow Guutamee Qophaa'aa",
      milestonesCount: (n) => `Boqonnaa ${n}`,
      openKanbanBtn: "Gabatee Kanban Bani",
      combinedBudgetPool: "Kuusaa Baajata Olaanaa Waliigalaa",
      exploreBriefsBtn: "Ibsa Hojii Hunda Ilaali",
      duePrefix: (d) => `Xumura ${d}`,
      deadlinePrefix: (d) => `Daangaa yeroo ${d}`,
      contractPrefix: (id) => `Waliigaltee #${id}`,
    },
    table: {
      statuses: {
        ESCROW_HELD: "Escrown Qabame",
        WORK_IN_PROGRESS: "Hojirra Jira",
        SUBMITTED_FOR_REVIEW: "Dhiyaateera",
        RELEASED: "Gadhiifameera",
        PAYMENT_PENDING: "Kaffaltii Eega",
        DISPUTED: "Falmii Irra",
        ACCEPTED: "Qabsiyyateera",
        REFUNDED: "Deebi'ameera",
        PARTIAL_REFUND: "Dhuma deebi'ameera",
      },
      title: "Tarree Boqonnaa Hojiifi Kaffaltiiwwanii",
      subtitle: (n) => `Galmee ${n} · Hanga waliigalaa`,
      exportSelected: (n) => `Kan Filataman Baasi (${n})`,
      exportCsv: "CSV Baasi",
      columnsBtn: "Tarjaa",
      toggleColumnsTitle: "Tarjaa Mul'isi/Dhoksi",
      colCounterparty: "Gama Biraa",
      colCategory: "Ramaddii",
      colRail: "Karaa Kaffaltii",
      colDueDate: "Guyyaa Xumuraa",
      colFee: "Kaffaltii Waltajjii",
      mobileViewAria: "Mul'ata mobaayilaa",
      cardsBtn: "Kaardii",
      tableBtn: "Gabatee",
      searchPlaceholder: "Boqonnaa hojii, waliigaltee ykn gama biraa calali...",
      searchAria: "Boqonnaa hojii ykn waliigaltee calali",
      clearSearchAria: "Barbaacha haqi",
      filterStateAria: "Haala escrown calali",
      filterAll: "Hunda",
      filterRailAria: "Karaa kaffaltiin calali",
      allRails: "Karaa Kaffaltii Hunda",
      cardsListAria: "Tarree kaardii waliigalteefi boqonnaa hojii",
      emptyMsg:
        "Boqonnaan hojii waliigaltee barbaacha keessan wajjin walsimu hin jiru.",
      selectItemAria: (t) => `${t} filadhu`,
      duePrefix: (d) => `Xumura ${d}`,
      feePrefix: "Kaffaltii",
      inspectBtn: "Sakatta'i",
      regionAria: "Galmee waliigaltee escrow fi boqonnaa hojii",
      selectAllAria: "Tarree mul'atu hunda filadhu",
      thMilestoneContract: "Boqonnaa & Waliigaltee",
      thCounterparty: "Gama Biraa",
      thScopeRail: "Daangaa & Karaa",
      thState: "Haala",
      thDueDate: "Guyyaa Xumuraa",
      thEscrowEtb: "Escrow (ETB)",
      thFee: "Kaffaltii waltajjii",
      thProviderFee: "Kaffaltii dhiyeessaa",
      thClientFee: "Kaffaltii maamilaa",
      thClientTotal: "Waliigala",
      thNetPayout: "Kaffaltii qulqulluu",
      thActions: "Gochaawwan",
      clientFeeZeroTitle: "Kaffaltii maamilaa: ETB 0",
      clientFeeZeroNote: "Kaffaltiin waltajjii ogeessaan kaffalama. Isin kaffaltii ETB 0 kaffaltu.",
      selectedFooter: (s, t) => `${t} keessaa ${s} filatame`,
      rowsPerPage: "Tarree fuula tokkoon",
      pageOf: (p, tp) => `Fuula ${p} / ${tp}`,
      prevPageAria: "Fuula duraa",
      nextPageAria: "Fuula itti aanu",
      inspectorAria: "Bal'ina galmee boqonnaa hojii",
      closeInspectorAria: "Sakatta'aa cufi",
      detailContract: "Waliigaltee",
      detailCounterparty: "Gama Biraa",
      detailCategory: "Ramaddii",
      detailGross: "Hanga Escrow Waliigalaa",
      detailFee: "Kaffaltii waltajjii",
      detailProviderFee: "Kaffaltii tajaajila kaffaltii",
      detailClientFee: "Kaffaltii maamilaa",
      detailClientTotal: "Kaffaltii waliigalaa",
      detailNet: "Kaffaltii Qulqulluu Ogeessaa",
      detailDueDate: "Guyyaa Xumuraa",
      detailState: "Haala Escrow Ammaa",
      actionsLabel: "Gochaalee Escrow fi Waliigaltee",
      fundMilestoneBtn: "Boqonnaa Kaffali",
      reviewReleaseBtn: "Gamaaggamii Gadhiisi",
      submitDeliveryBtn: "Bu'aa Dhiyeessi",
      disputeBtn: "Falmii Dhiyeessi",
      openEscrowBtn: "Kaffaltiiwwan ilaalaa",
      awaitingSignatureNote: "Kaffaltii dura gareen lamaan waliigaltee akka mallatteessan eegamaa jira.",
      openContractRoomBtn: "Waliigalteewwan keessan ilaalaa",
      emptyTitle: "Ammatti boqonnaan hojii hin jiru",
      emptyDesc: "Piropoozaala mirkaneessuun waliigaltee yoo uumtan boqonnaawwan asitti mul'atu.",
      emptyPostJobCta: "Hojii maxxansi",
      emptyContractsCta: "Waliigalteewwan keessan ilaalaa",
      closeBtn: "Cufi",
    },
    kanban: {
      columns: {
        BACKLOG: { title: "Kaffaltii eegaa jira", subtitle: "Kaffaltii eeggata" },
        ESCROW_HELD: { title: "Escrow keessatti qabame", subtitle: "Kaffalamee eegama" },
        WORK_IN_PROGRESS: { title: "Adeemsa irra", subtitle: "Hojiin deemaa jira" },
        SUBMITTED_FOR_REVIEW: { title: "Gamaaggamaaf qophii", subtitle: "Bu'aan hojii dhiyaate" },
        RELEASED: { title: "Kaffalameera", subtitle: "Ogeessaaf gadhiifame" },
        DISPUTED_REFUNDED: { title: "Falmii irra / Deebi'e", subtitle: "Dhaabate ykn deebi'e" },
      },
      emptyStageActions: {
        BACKLOG: {
          hint: "Boqonnaawwan mirkanaa'an kaffaltii eegan asitti ofumaan mul'atu.",
          ctaLabel: "Waliigalteewwan keessan ilaalaa",
        },
        ESCROW_HELD: {
          hint: "Boqonnaawwan escrow keessatti qabaman jalqabuuf qophaa'anii asitti mul'atu.",
          ctaLabel: "Kaffaltiiwwan ilaalaa",
        },
        WORK_IN_PROGRESS: {
          hint: "Yeroo ogeessi hojii jalqabu boqonnaawwan kaffalaman asitti mul'atu.",
          ctaLabel: "Waliigalteewwan keessan ilaalaa",
        },
        SUBMITTED_FOR_REVIEW: {
          hint: "Bu'aawwan mirkaneessa maamilaafi gadhiisa kaffaltii eegan asitti galu.",
          ctaLabel: "Kaffaltiiwwan ilaalaa",
        },
        RELEASED: {
          hint: "Boqonnaawwan mirkanaa'anii gara boorsaa ogeessaatti gadhiifaman asitti mul'atu.",
          ctaLabel: "Kaffaltiiwwan ilaalaa",
        },
        DISPUTED_REFUNDED: {
          hint: "Boqonnaawwan falmii keessa jiran ykn deebi'an asitti addatti hordofamu.",
          ctaLabel: "Kaffaltiiwwan ilaalaa",
        },
      },
      emptyBoardTitle: "Ammatti boqonnaan hojii hin jiru",
      emptyBoardDesc: "Gabatee keessan irratti sadarkaalee hordofuuf hojii maxxansaatii boqonnaa waliigaltee uumaa.",
      emptyPostJobCta: "Hojii maxxansi",
      title: "Gabatee Boqonnaa Hojii",
      subtitle:
        "Mul'ata dubbisaa qofa kan haala escrow sarvara irra jiru. Kaffaluuf, gamaaggamuuf ykn waliigaltee banuuf kaardii bani.",
      searchPlaceholder: "Hojiiwwan mata duree, koodii, waliigaltee ykn qaamaan barbaadi...",
      searchAria: "Hojiiwwan Kanban barbaadi",
      clientFilterAria: "Maamilaan calali",
      allClients: "Maamiltoota Hunda",
      freelancerFilterAria: "Ogeessaan calali",
      allFreelancers: "Ogeessota Hunda",
      contractFilterAria: "Waliigalteedhaan calali",
      allContracts: "Waliigaltee Hunda",
      priorityAria: "Sadarkaa dursaatiin calali",
      priorityAll: "Dursa Hunda",
      priorityHighFilter: "Dursa Olaanaa",
      priorityMediumFilter: "Giddugaleessa",
      priorityLowFilter: "Gadi aanaa",
      overdueOnlyBtn: "Yeroon darbe qofa",
      clearFiltersBtn: "Calaltuu haqi",
      priorityLabels: { HIGH: "OLAANAA", MEDIUM: "GIDDUGALEESSA", LOW: "GADI AANAA" },
      mobileTabsAria: "Sadarkaalee hojii Kanban",
      emptyCol: "Sadarkaa kana keessa boqonnaan hojii hin jiru",
      filteredEmptyCol: (n) =>
        n > 0
          ? `Boqonnaan ${n} calaltuuwwaniin dhokfameera`
          : "Boqonnaan calaltuuwwan kanaan walsimu hin jiru",
      openContractsCta: "Waliigaltee Bani",
      openWalletCta: "Boorsaa Bani",
      boardSummary: (shown, total, overdue) =>
        `Boqonnaa ${total} keessaa ${shown}${overdue > 0 ? ` · ${overdue} yeroon darbe` : ""}`,
      taskCountLabel: (shown, total, filtered) =>
        filtered && shown !== total ? `${shown} / ${total}` : `Hojii ${shown}`,
      overdueColCount: (n) => `${n} yeroon darbe`,
      overdueDaysLabel: (d) => `Guyyaa ${d} darbe`,
      dueTodayLabel: "Har'a xumurama",
      dueSoonLabel: (d) => `Guyyaa ${d} keessatti`,
      settledLabel: "Kaffalameera",
      onTrackLabel: "Yeroo irra",
      collapseColumnAria: (title) => `Tarjaa ${title} dachaasi`,
      expandColumnAria: (title) => `Tarjaa ${title} diriirsi`,
      collapseEmptyBtn: "Duwwaa dachaasi",
      expandAllBtn: "Hunda diriirsi",
      scrollLeftAria: "Gara bitaatti sochoosi",
      scrollRightAria: "Gara mirgaatti sochoosi",
      scrollHint: "Sadarkaalee 5 hunda ilaaluuf dalga sochoosi ykn xiyyoota fayyadami",
      duePrefix: (d) => `Xumura ${d}`,
      viewDetailsAria: (title) => `Bal'ina ${title} ilaali`,
      detailsAria: "Bal'ina hojii boqonnaa",
      detailContract: "Waliigaltee",
      detailClient: "Maamila",
      detailFreelancer: "Ogeessa",
      detailCategory: "Ramaddii",
      detailRail: "Karaa Kaffaltii",
      detailAmount: "Hanga Escrow Waliigalaa",
      detailPlatformFee: "Kaffaltii waltajjii",
      detailProviderFee: "Kaffaltii tajaajila kaffaltii",
      detailClientFee: "Kaffaltii maamilaa",
      detailClientTotal: "Kaffaltii waliigalaa",
      detailNetPayout: "Kaffaltii Qulqulluu Ogeessaa",
      clientFeeZeroNote: "Kaffaltiin waltajjii ogeessaan kaffalama. Isin kaffaltii ETB 0 kaffaltu.",
      detailDueDate: "Guyyaa Xumuraa",
      detailScheduleStatus: "Haala Yeroo",
      detailPriority: "Sadarkaa Dursaa",
      detailStage: "Sadarkaa Adeemsaa",
      detailDeliverable: "Geessituu Bu'aa",
      openDeliverableBtn: "Bu'aa bani",
      detailFundedAt: "Yeroo Escrow",
      detailSubmittedAt: "Kan Dhiyaate",
      detailAutoReleaseAt: "Gadhiisa Ofumaa",
      detailReleasedAt: "Kan Gadhiifame",
      actionsLabel: "Gochaalee Escrow fi Waliigaltee",
      fundMilestoneBtn: "Boqonnaa Kaffali",
      reviewReleaseBtn: "Gamaaggamii Gadhiisi",
      submitDeliveryBtn: "Bu'aa Dhiyeessi",
      disputeBtn: "Falmii Dhiyeessi",
      openEscrowBtn: "Kaffaltiiwwan ilaalaa",
      awaitingSignatureNote: "Kaffaltii dura gareen lamaan waliigaltee akka mallatteessan eegamaa jira.",
      openContractRoomBtn: "Waliigalteewwan keessan ilaalaa",
      closeBtn: "Cufi",
      closeAria: "Cufi",
    },
    calendar: {
      typeLabels: {
        MILESTONE_DUE: "Xumura Boqonnaa",
        PAYOUT_RELEASE: "Gadhiisa Kaffaltii",
        PROPOSAL_DEADLINE: "Daangaa Dorgommii",
        COMPLIANCE_KYC: "SLA Mirkaneessaa",
        PERSONAL_REMINDER: "Yaadachiisa Dhuunfaa",
      },
      weekdays: ["Wix", "Qib", "Rob", "Kam", "Jim", "San", "Dil"],
      title: "Sagantaa Boqonnaa, Kaffaltiifi SLA",
      subtitle:
        "Daangaa yeroo waliigaltee, gadhiisa kaffaltiifi bara baajataa Itoophiyaa hordofaa",
      prevEthMonthAria: "Ji'a Itoophiyaa duraa",
      prevMonthAria: "Ji'a duraa",
      nextEthMonthAria: "Ji'a Itoophiyaa itti aanu",
      nextMonthAria: "Ji'a itti aanu",
      todayBtn: "Har'a",
      todayBadge: "Har'a",
      selectedBadge: "Filatame",
      openEscrowBtn: "Kaffaltiiwwan ilaalaa",
      calendarSystemAria: "Sirna kalaandarii",
      modeGregorian: "Giriigooriyaan",
      modeFiscal: "Bara Baajataa Itoophiyaa",
      filterTypeAria: "Gosa taateetiin calali",
      filterAllEvents: "Taatee Hunda",
      filterProposals: "Yaadota Dorgommii",
      fiscalYearEyebrow: "Bara Baajataa Itoophiyaa",
      fiscalQuartersAria: (l) => `Kurmaana bara baajataa ${l}`,
      itemsCount: (n) => `Wanta ${n}`,
      noScheduledItems: "wanti saganteessame hin jiru",
      mobileDatesAria: "Guyyoota ji'a mul'atu keessatti saganteessaman",
      selectedDateLabel: "Guyyaa Filatame",
      fiscalPeriodLabel: "Yeroo baajataa",
      noItemsOnDate: (d) => `${d} irratti boqonnaan ykn kaffaltiin saganteessame hin jiru.`,
      statusCompleted: "Xumurameera",
      statusAtRisk: "SLA Balaa Irra",
      upcomingTitle: "Ijoowwan Ji'a Dhufuu",
      upcomingEmpty: "Wanti calaltuu kana wajjin walsimu hin jiru.",
    },
  },
  ti: {
    palette: {
      dialogAria: "ዓለምለኻዊ መደለዪ ትእዛዝ",
      placeholder: "ትእዛዝ ጽሓፍ፣ ናብ ዳሽቦርድ ዝለል ወይ ተራ ቀይር...",
      searchAria: "ትእዛዝ ድለ",
      empty: (q) => `ን"${q}" ዝሰማማዕ ትእዛዝ ወይ ገጽ የለን።`,
      navNavigate: "ዳህስስ",
      navExecute: "ፈጽም",
      navToggle: "ኣብ ዝኾነ ቦታ ክፈት",
      groups: {
        modes: "ቅድታት ዳሽቦርድ",
        navigation: "ዳህሳስ ቦታ ስራሕ",
        roleMode: "ተራ ቦታ ስራሕ",
        appearance: "ትርኢትን ቅርጽን",
      },
      actions: {
        d1Label: "ናብ ዳሽቦርድ 1 ቀይር፡ ትንታነን KPIን",
        d1Hint: "ቻርትታት ዋሕዚ ገንዘብን መለክዒታት KPIን",
        d2TableLabel: "ናብ ዳሽቦርድ 2 ቀይር፡ መዝገብን ሰንጠረዥን",
        d2TableHint: "ብዙሕ መጻረዪ ሰንጠረዥን ምውጻእ CSVን",
        d2KanbanLabel: "ሰሌዳ Kanban ምዕራፍን ኣቕርቦትን ክፈት",
        d2KanbanHint: "ብ5-ብርኪ ዝሰርሕ መስርሕ ኤስክሮ",
        d2CalendarLabel: "ዓውደ-ኣዋርሕ ውዕልን ክፍሊትን ክፈት",
        d2CalendarHint: "ወርሓዊ ደረት ግዜን መደብ መዓልትን",
        jobsLabel: "ዕዳጋ ስራሕትን ዝርዝር ስራሕን",
        jobsHint: "ስራሕ ዘርግሕ ወይ ፕሮፖዛል ኣቅርብ",
        gigsLabel: "ካታሎግ ቀዋሚ ዋጋ ዘለዎም ጊጋት",
        gigsHint: "ኣገልግሎታት ኢትዮጵያውያን ክኢላታት ዳህስስ",
        contractsLabel: "ውዕላትን ስምምዓት ኣገልግሎትን",
        contractsHint: "ስምምዓት AACCSA ፈርምን PDF ኣውርድን",
        escrowLabel: "ማእከል ኤስክሮን ምዕራፋትን",
        escrowHint: "ኤስክሮ ክፈል፣ ስራሕ ኣረክብን ክፍሊት ልቀቕን",
        walletLabel: "ቦርሳን ምምላእ ቴሌብር / CBEን",
        walletHint: "ቀሪ ETB ኣመሓድርን ቅብሊት ስደድን",
        chatLabel: "መልእኽትታትን ዕላል ውዕልን",
        chatHint: "ቀጥታዊ መልእኽቲ ዓሚል፣ ክኢላን ደገፍን",
        verificationLabel: "ሃገራዊ መታወቂያ ፋይዳን መረጋገጺ KYCን",
        verificationHint: "ገንዘብ ንምውጻእ መንነትካ ኣረጋግጽ",
        casesLabel: "ማእከል ክርክራትን ሽምግልናን",
        casesHint: "መረዳእታ ኣቅርብን ግልግል AACCSA ተኸታተልን",
        profileLabel: "ህዝባዊ ፖርትፎሊዮን መግለጽን",
        profileHint: "ክእለታት፣ ዝተረጋገጹ ባጃትን ግምገማታትን ርአ",
        settingsLabel: "ቅንብራት ሕሳብ",
        settingsHint: "ምርጫታትን ደገፍን",
        roleClientLabel: "ናብ ተራ ዓሚል ቀይር (ቆጻርነትን ኤስክሮን)",
        roleClientHint: (a) => (a ? "ንጡፍ ተራ" : "ናብ ትርኢት ዓሚል ቀይር"),
        roleFreelancerLabel: "ናብ ተራ ክኢላ ቀይር (ስራሕን ክፍሊትን)",
        roleFreelancerHint: (a) => (a ? "ንጡፍ ተራ" : "ናብ ትርኢት ክኢላ ቀይር"),
        roleBothLabel: "ናብ ሓባራዊ ተራ ቀይር (ዓሚል + ክኢላ)",
        roleBothHint: (a) => (a ? "ንጡፍ ተራ" : "ቁጸርን ስራሕ ኣቅርብን"),
        customizerLabel: "መመዓራረዪ ቅርጺ ቦታ ስራሕ ክፈት",
        customizerHint: "ቅርጺ ጎናዊ ኣሞሌ፣ ጽግዕትን ኩርናዕን",
        sidebarToggleLabel: "ጎናዊ ኣሞሌ ዕጸው / ዘርግሕ",
        sidebarToggleHint: "ስፍሓት ሰንጠረዥ የዕቢ",
        themeLabel: (isLight) =>
          isLight ? "ናብ ጸልማት ገጽ ቀይር" : "ናብ ብርሃን ገጽ ቀይር",
        themeHint: "ስርዓት ሕብሪ Yekis Emerald",
      },
    },
    customizer: {
      triggerTitle: "ቅርጽን ትርኢትን ቦታ ስራሕ ኣመዓራሪ",
      triggerAria: "ቅርጺ ቦታ ስራሕ ኣመዓራሪ",
      triggerText: "ኣመዓራሪ",
      dialogAria: "መመዓራረዪ ቅርጺ ቦታ ስራሕ",
      title: "መመዓራረዪ ቦታ ስራሕ",
      subtitle: "ቅርጺ ጎናዊ ኣሞሌ፣ ቅዲ ዳሽቦርድን ጽግዕቲ ሰንጠረዥን ኣዳሉ።",
      closeAria: "መመዓራረዪ ዕጸው",
      templateModeLabel: "ቅዲ ዳሽቦርድ",
      d1Title: "ዳሽቦርድ 1",
      d1Desc: "ቀንዲ KPIsን ቻርት ዋሕዚ ገንዘብን",
      d2Title: "ዳሽቦርድ 2",
      d2Desc: "ሰንጠረዥ፣ Kanbanን መደብን",
      sidebarArchLabel: "ቅርጺ ጎናዊ ኣሞሌ",
      sidebarStandard: "ስሩዕ",
      sidebarStandardDesc: "ምሉእ ወሰን",
      sidebarInset: "ውሽጣዊ",
      sidebarInsetDesc: "ክፈፍ ዘለዎ",
      sidebarFloating: "ተንሳፋፊ",
      sidebarFloatingDesc: "ዝተፈልየ",
      railWidthLabel: "ስፍሓት ኣሞሌ ዳህሳስ",
      railExpanded: "ዝተዘርግሐ (256px)",
      railExpandedDesc: "ምሉእ ምልክታትን ተራን",
      railCompact: "ጸቢብ ኣሞሌ ምልክት",
      railCompactDesc: "ስፍሓት ሰንጠረዥ የዕቢ",
      densityLabel: "ጽግዕቲ ሰንጠረዥን ዝርዝርን",
      densityCompact: "ጽግዕግዕ (38px)",
      densityCompactDesc: "ብዙሓት መስመራት ፋይናንስ",
      densityComfortable: "ምቹእ (46px)",
      densityComfortableDesc: "ሰፊሕ ክፍተት",
      radiusLabel: "ዓቐን ክብነት ኩርናዕ",
      radiusCrisp: "በሊሕ (6px)",
      radiusDefault: "ስሩዕ (8px)",
      radiusSoft: "ልስሉስ (12px)",
      colorThemeLabel: "ሕብሪ ገጽ (Yekis Emerald)",
      lightLabel: "ብርሃን ገጽ",
      lightDesc: "#F8FAFC መደብ · #16A34A",
      darkLabel: "ጸልማት ገጽ",
      darkDesc: "#090D12 መደብ · #22C55E",
      resetBtn: "ናብ ስሩዕ ቅርጺ መልስ",
    },
    charts: {
      cashflowTitle: "እቶት ኤስክሮን ዝተለቀቁ ክፍሊታትን",
      cashflowDesc: "ናብ ኤስክሮ ምዕራፍ ዝኣተወ ጠቕላላ ETB vs ንክኢላታት ዝተኸፍለ",
      windowAria: "ግዜ ቻርት ምረጽ",
      escrowFunded: (r) => `ዝተኸፍለ ኤስክሮ (${r})`,
      releasedToTalent: (r) => `ንክኢላ ዝተለቀቀ (${r})`,
      periodLabel: (l) => `ግዜ፡ ${l}`,
      latestLabel: (l) => `ናይ ቀረባ (${l})`,
      inPrefix: "እቶት",
      outPrefix: "ወጻኢ",
      cashflowSvgAria: "ቻርት እቶት ኤስክሮን ክፍሊትን",
      railMixTitle: "ክፍሊታት ብኣገባብ",
      railMixDesc: (r) => `ቴሌብር · CBE ብር · M-Pesa (${r})`,
      milestonesSettled: (n) => `${n} ምዕራፋት ተዛዚሞም`,
      railSvgAria: "ቻርት መንገድታት ክፍሊት",
    },
    overview: {
      modeAria: "ቅዲ ዳሽቦርድ ምረጽ",
      opsModeAria: "ቅዲ ትርኢት ስራሕ",
      quickJumpTitle: "መደለዪ ትእዛዝ ክፈት (Ctrl+K)",
      refreshTitle: "ዳታ ኣሐድስ",
      refreshAria: "ዳታ ኣሐድስ",
      vsPrior30d: (n) => `ካብ ዝሓለፉ 30 መዓልታት · ${n} ምምላእ`,
      approvedTopUps: "ዝጸደቁ ምምላኣት ቴሌብር / CBE",
      pendingReceiptVerif: "ምርግጋጽ ቅብሊት ዝጽበዩ",
      openWalletDeskBtn: "ቦርሳን ምምላእን ክፈት",
      milestoneBacked: (n) => `100% ብምዕራፍ ዝተደገፈ · ${n} ንጡፍ`,
      releasedYtd: "ክሳብ ሕጂ ዝተለቀቀ ክፍሊት",
      submittedQa: "ግምገማ ዝጽበዩ",
      inspectContractsBtn: "ውዕላት ኤስክሮ መርምር",
      onTimeDelta: "98.2% ብሰዓቱ",
      acrossContracts: (n) => `ኣብ ${n} ውዕላት`,
      inActiveDelivery: "ኣብ ከይዲ ስራሕ",
      escrowFundedReady: "ኤስክሮ ተኸፊሉ ድሉው",
      milestonesCount: (n) => `${n} ምዕራፋት`,
      openKanbanBtn: "ሰሌዳ Kanban ክፈት",
      combinedBudgetPool: "ጠቕላላ ዝለዓለ ባጀት",
      exploreBriefsBtn: "ኩሎም ስራሕቲ ርአ",
      duePrefix: (d) => `መወዳእታ ${d}`,
      deadlinePrefix: (d) => `ደረት ግዜ ${d}`,
      contractPrefix: (id) => `ውዕል #${id}`,
    },
    table: {
      statuses: {
        ESCROW_HELD: "ብኤስክሮ ዝተታሕዘ",
        WORK_IN_PROGRESS: "ኣብ ከይዲ",
        SUBMITTED_FOR_REVIEW: "ቀሪቡ",
        RELEASED: "ተለቂቑ",
        PAYMENT_PENDING: "ክፍሊት ይጽበ",
        DISPUTED: "ክርክር ኣሎ",
        ACCEPTED: "ተቀብሏል",
        REFUNDED: "ተመልሷል",
        PARTIAL_REFUND: "በከፊል ተመልሷል",
      },
      title: "ዝርዝር ምዕራፋትን ክፍሊታትን",
      subtitle: (n) => `${n} መዝገባት · ጠቕላላ መጠን`,
      exportSelected: (n) => `ዝተመርጹ ኣውጽእ (${n})`,
      exportCsv: "CSV ኣውጽእ",
      columnsBtn: "ዓምድታት",
      toggleColumnsTitle: "ዓምድታት ኣርኢ/ሕባእ",
      colCounterparty: "ተዋዓዓሊ ወገን",
      colCategory: "ምድብ",
      colRail: "መንገዲ ክፍሊት",
      colDueDate: "መወዳእታ ዕለት",
      colFee: "ክፍሊት መድረኽ",
      mobileViewAria: "ትርኢት ሞባይል",
      cardsBtn: "ካርድታት",
      tableBtn: "ሰንጠረዥ",
      searchPlaceholder: "ምዕራፋት፣ ውዕላት ወይ ተዋዓዓሊ ኣጻሪ...",
      searchAria: "ምዕራፋት ወይ ውዕላት ኣጻሪ",
      clearSearchAria: "ድለያ ኣጽሪ",
      filterStateAria: "ብኩነታት ኤስክሮ ኣጻሪ",
      filterAll: "ኩሉ",
      filterRailAria: "ብመንገዲ ክፍሊት ኣጻሪ",
      allRails: "ኩሎም መንገድታት ክፍሊት",
      cardsListAria: "ዝርዝር ካርድታት ውዕላትን ምዕራፋትን",
      emptyMsg: "ምስ ድለያኹም ዝሰማማዕ ምዕራፍ ውዕል የለን።",
      selectItemAria: (t) => `ን${t} ምረጽ`,
      duePrefix: (d) => `መወዳእታ ${d}`,
      feePrefix: "ክፍሊት",
      inspectBtn: "መርምር",
      regionAria: "መዝገብ ውዕላት ኤስክሮን ምዕራፋትን",
      selectAllAria: "ኩሎም ዝርኣዩ መስመራት ምረጽ",
      thMilestoneContract: "ምዕራፍን ውዕልን",
      thCounterparty: "ተዋዓዓሊ ወገን",
      thScopeRail: "ወሰንን መንገድን",
      thState: "ኩነታት",
      thDueDate: "መወዳእታ ዕለት",
      thEscrowEtb: "ኤስክሮ (ETB)",
      thFee: "ክፍሊት መድረኽ",
      thProviderFee: "ክፍሊት ኣገልግሎት",
      thClientFee: "ክፍሊት ዓሚል",
      thClientTotal: "ጠቕላላ",
      thNetPayout: "ጽሩይ ክፍሊት",
      thActions: "ተግባራት",
      clientFeeZeroTitle: "ክፍሊት ዓሚል፡ ETB 0",
      clientFeeZeroNote: "ክፍሊት መድረኽ ብክኢላ ይኽፈል። ንስኹም ETB 0 ክፍሊት ትኸፍሉ።",
      selectedFooter: (s, t) => `ካብ ${t} እቶም ${s} ተመሪጾም`,
      rowsPerPage: "መስመራት ኣብ ገጽ",
      pageOf: (p, tp) => `ገጽ ${p} ካብ ${tp}`,
      prevPageAria: "ዝሓለፈ ገጽ",
      nextPageAria: "ዝቕጽል ገጽ",
      inspectorAria: "ዝርዝራት መዝገብ ምዕራፍ",
      closeInspectorAria: "መርመሪ ዕጸው",
      detailContract: "ውዕል",
      detailCounterparty: "ተዋዓዓሊ ወገን",
      detailCategory: "ምድብ",
      detailGross: "ጠቕላላ መጠን ኤስክሮ",
      detailFee: "ክፍሊት መድረኽ",
      detailProviderFee: "ክፍሊት ኣገልግሎት ክፍሊት",
      detailClientFee: "ክፍሊት ዓሚል",
      detailClientTotal: "ጠቕላላ ክፍሊት",
      detailNet: "ጽሩይ ክፍሊት ክኢላ",
      detailDueDate: "መወዳእታ ዕለት",
      detailState: "ናይ ሕጂ ኩነታት ኤስክሮ",
      actionsLabel: "ተግባራት ኤስክሮን ውዕልን",
      fundMilestoneBtn: "ምዕራፍ ክፈል",
      reviewReleaseBtn: "ገምግምን ልቀቕን",
      submitDeliveryBtn: "ኣቕርቦት ኣእቱ",
      disputeBtn: "ክርክር",
      openEscrowBtn: "ክፍሊታት ርኣዩ",
      awaitingSignatureNote: "ቅድሚ ምኽፋል ክልቲኦም ወገናት ነቲ ውዕል ክፍርሙ ይጽበዩ ኣለዉ።",
      openContractRoomBtn: "ውዕላትኩም ርኣዩ",
      emptyTitle: "ክሳብ ሕጂ ምዕራፋት የለዉን",
      emptyDesc: "ፕሮፖዛል ኣጽዲቕኩም ውዕል ምስ ፈጠርኩም ምዕራፋት ኣብዚ ክርኣዩ እዮም።",
      emptyPostJobCta: "ስራሕ ለጥፍ",
      emptyContractsCta: "ውዕላትኩም ርኣዩ",
      closeBtn: "ዕጸው",
    },
    kanban: {
      columns: {
        BACKLOG: { title: "ክፍሊት ይጽበ", subtitle: "ክፍሊት ይጽበ ኣሎ" },
        ESCROW_HELD: { title: "ኣብ ኤስክሮው ዝተታሕዘ", subtitle: "ተኸፊሉ ዝተዓቀበ" },
        WORK_IN_PROGRESS: { title: "ኣብ መስርሕ", subtitle: "ስራሕ ይካየድ ኣሎ" },
        SUBMITTED_FOR_REVIEW: { title: "ንገምጋም ድሉው", subtitle: "ዝተሰርሐ ቀሪቡ" },
        RELEASED: { title: "ተኸፊሉ", subtitle: "ንክኢላ ተለቂቑ" },
        DISPUTED_REFUNDED: { title: "ኣብ ክርክር / ዝተመልሰ", subtitle: "ጠጠው ዝበለ ወይ ዝተመልሰ" },
      },
      emptyStageActions: {
        BACKLOG: {
          hint: "ክፍሊት ዝጽበዩ ዝጸደቁ ምዕራፋት ኣብዚ ብርእሶም ይርኣዩ።",
          ctaLabel: "ውዕላትኩም ርኣዩ",
        },
        ESCROW_HELD: {
          hint: "ኣብ ኤስክሮ ዝተዓቀቡን ንምጅማር ድሉዋት ዝኾኑን ምዕራፋት ኣብዚ ይርኣዩ።",
          ctaLabel: "ክፍሊታት ርኣዩ",
        },
        WORK_IN_PROGRESS: {
          hint: "ክኢላ ስራሕ ምስ ጀመረ ዝተኸፈሉ ምዕራፋት ኣብዚ ይርኣዩ።",
          ctaLabel: "ውዕላትኩም ርኣዩ",
        },
        SUBMITTED_FOR_REVIEW: {
          hint: "ምርግጋጽ ዓሚልን ምልቃቕ ክፍሊትን ዝጽበዩ ኣቕርቦታት ኣብዚ ይኣትዉ።",
          ctaLabel: "ክፍሊታት ርኣዩ",
        },
        RELEASED: {
          hint: "ናብ ቦርሳ ክኢላ ዝተለቀቁ ምዕራፋት ኣብዚ ይርኣዩ።",
          ctaLabel: "ክፍሊታት ርኣዩ",
        },
        DISPUTED_REFUNDED: {
          hint: "ኣብ ክርክር ዘለዉ ወይ ዝተመልሱ ምዕራፋት ኣብዚ ብፍሉይ ይርኣዩ።",
          ctaLabel: "ክፍሊታት ርኣዩ",
        },
      },
      emptyBoardTitle: "ክሳብ ሕጂ ምዕራፋት የለዉን",
      emptyBoardDesc: "ኣብ ቦርድኩም ብርክታት ንምክትታል ስራሕ ለጥፉን ምዕራፋት ውዕል ተሰማምዑን።",
      emptyPostJobCta: "ስራሕ ለጥፍ",
      title: "ቦርድ ምዕራፍ",
      subtitle:
        "ናይ ንባብ ጥራይ ትንቢት ኩነታት ኤስክሮ ሰርቨር። ንምኽፋል፣ ንምግምጋም ወይ ውዕል ንምኽፋት ካርድ ክፈቱ።",
      searchPlaceholder: "ዕዮታት ብኣርእስቲ፣ ኮድ፣ ውዕል ወይ ወገን ድለ...",
      searchAria: "ዕዮታት Kanban ድለ",
      clientFilterAria: "ብዓሚል ኣጻሪ",
      allClients: "ኩሎም ዓማዊል",
      freelancerFilterAria: "ብክኢላ ኣጻሪ",
      allFreelancers: "ኩሎም ክኢላታት",
      contractFilterAria: "ብውዕል ኣጻሪ",
      allContracts: "ኩሎም ውዕላት",
      priorityAria: "ብቀዳምነት ኣጻሪ",
      priorityAll: "ኩሉ ቀዳምነት",
      priorityHighFilter: "ልዑል ቀዳምነት",
      priorityMediumFilter: "ማእከላይ",
      priorityLowFilter: "ትሑት",
      overdueOnlyBtn: "ግዜኦም ዝሓለፎም ጥራይ",
      clearFiltersBtn: "መጻረዪ ኣጽሪ",
      priorityLabels: { HIGH: "ልዑል", MEDIUM: "ማእከላይ", LOW: "ትሑት" },
      mobileTabsAria: "ብርክታት መስርሕ Kanban",
      emptyCol: "ኣብዚ ብርኪ ምዕራፋት የለዉን",
      filteredEmptyCol: (n) =>
        n > 0
          ? `${n} ምዕራፋት ብንጡፋት መጻረዪታት ተሓቢኦም`
          : "ምስ ንጡፋት መጻረዪታት ዝሰማማዕ የለን",
      openContractsCta: "ውዕላት ክፈት",
      openWalletCta: "ቦርሳ ክፈት",
      boardSummary: (shown, total, overdue) =>
        `ካብ ${total} ምዕራፋት ${shown}${overdue > 0 ? ` · ${overdue} ግዜኦም ዝሓለፎም` : ""}`,
      taskCountLabel: (shown, total, filtered) =>
        filtered && shown !== total ? `${shown} / ${total}` : `${shown} ዕዮታት`,
      overdueColCount: (n) => `${n} ግዜኡ ዝሓለፎ`,
      overdueDaysLabel: (d) => `${d} መዓልቲ ሓሊፉ`,
      dueTodayLabel: "ሎሚ መወዳእታ",
      dueSoonLabel: (d) => `ኣብ ${d} መዓልቲ`,
      settledLabel: "ተኸፊሉ",
      onTrackLabel: "ኣብ ግዜኡ",
      collapseColumnAria: (title) => `ዓምዲ ${title} ኣክብ`,
      expandColumnAria: (title) => `ዓምዲ ${title} ዘርግሕ`,
      collapseEmptyBtn: "ባዶታት ኣክብ",
      expandAllBtn: "ኩሉ ዘርግሕ",
      scrollLeftAria: "ንጸጋም ሸብልል",
      scrollRightAria: "ንየማን ሸብልል",
      scrollHint: "ኩሎም 5 ብርክታት ንምርኣይ ብጋድም ሸብልሉ ወይ ቀስትታት ተጠቐሙ",
      duePrefix: (d) => `መወዳእታ ${d}`,
      viewDetailsAria: (title) => `ዝርዝር ${title} ርኣይ`,
      detailsAria: "ዝርዝር ዕዮ ምዕራፍ",
      detailContract: "ውዕል",
      detailClient: "ዓሚል",
      detailFreelancer: "ክኢላ",
      detailCategory: "ምድብ",
      detailRail: "መንገዲ ክፍሊት",
      detailAmount: "ጠቕላላ መጠን ኤስክሮ",
      detailPlatformFee: "ክፍሊት መድረኽ",
      detailProviderFee: "ክፍሊት ኣገልግሎት ክፍሊት",
      detailClientFee: "ክፍሊት ዓሚል",
      detailClientTotal: "ጠቕላላ ክፍሊት",
      detailNetPayout: "ጽሩይ ክፍሊት ክኢላ",
      clientFeeZeroNote: "ክፍሊት መድረኽ ብክኢላ ይኽፈል። ንስኹም ETB 0 ክፍሊት ትኸፍሉ።",
      detailDueDate: "መወዳእታ ዕለት",
      detailScheduleStatus: "ኩነታት ግዜ",
      detailPriority: "ቀዳምነት",
      detailStage: "ብርኪ መስርሕ",
      detailDeliverable: "መላግቦ ኣቕርቦት",
      openDeliverableBtn: "ኣቕርቦት ክፈት",
      detailFundedAt: "ኤስክሮ ዝተታሕዘሉ",
      detailSubmittedAt: "ዝቀረበሉ",
      detailAutoReleaseAt: "ርእሰ-ምልቃቕ",
      detailReleasedAt: "ዝተለቀቀሉ",
      actionsLabel: "ተግባራት ኤስክሮን ውዕልን",
      fundMilestoneBtn: "ምዕራፍ ክፈል",
      reviewReleaseBtn: "ገምግምን ልቀቕን",
      submitDeliveryBtn: "ኣቕርቦት ኣእቱ",
      disputeBtn: "ክርክር",
      openEscrowBtn: "ክፍሊታት ርኣዩ",
      awaitingSignatureNote: "ቅድሚ ምኽፋል ክልቲኦም ወገናት ነቲ ውዕል ክፍርሙ ይጽበዩ ኣለዉ።",
      openContractRoomBtn: "ውዕላትኩም ርኣዩ",
      closeBtn: "ዕጸው",
      closeAria: "ዕጸው",
    },
    calendar: {
      typeLabels: {
        MILESTONE_DUE: "መወዳእታ ምዕራፍ",
        PAYOUT_RELEASE: "ምልቃቕ ክፍሊት",
        PROPOSAL_DEADLINE: "ደረት ግዜ ፕሮፖዛል",
        COMPLIANCE_KYC: "SLA መረጋገጺ",
        PERSONAL_REMINDER: "ውልቃዊ መዘኻኸሪ",
      },
      weekdays: ["ሰኑይ", "ሰሉስ", "ረቡዕ", "ሓሙስ", "ዓርቢ", "ቀዳም", "ሰንበት"],
      title: "መደብ ምዕራፍ፣ ክፍሊትን SLAን",
      subtitle:
        "ደረት ግዜ ውዕላት፣ ምልቃቕ ክፍሊትን ዓመት ባጀት ኢትዮጵያን ተኸታተሉ",
      prevEthMonthAria: "ዝሓለፈ ወርሒ ኢትዮጵያ",
      prevMonthAria: "ዝሓለፈ ወርሒ",
      nextEthMonthAria: "ዝቕጽል ወርሒ ኢትዮጵያ",
      nextMonthAria: "ዝቕጽል ወርሒ",
      todayBtn: "ሎሚ",
      todayBadge: "ሎሚ",
      selectedBadge: "ዝተመርጸ",
      openEscrowBtn: "ክፍሊታት ርኣዩ",
      calendarSystemAria: "ስርዓት ዓውደ-ኣዋርሕ",
      modeGregorian: "ግሪጎርያን",
      modeFiscal: "ዓመት ባጀት ኢትዮጵያ",
      filterTypeAria: "ብዓይነት ፍጻመ ኣጻሪ",
      filterAllEvents: "ኩሎም ፍጻመታት",
      filterProposals: "ፕሮፖዛላት",
      fiscalYearEyebrow: "ዓመት ባጀት ኢትዮጵያ",
      fiscalQuartersAria: (l) => `ርብዒ ዓመታት ባጀት ${l}`,
      itemsCount: (n) => `${n} ነገራት`,
      noScheduledItems: "ዝተመደቡ ነገራት የለዉን",
      mobileDatesAria: "ኣብዚ ወርሒ ዝተመደቡ ዕለታት",
      selectedDateLabel: "ዝተመርጸ ዕለት",
      fiscalPeriodLabel: "እዋን ባጀት",
      noItemsOnDate: (d) => `ኣብ ${d} ዝተመደቡ ምዕራፋት ወይ ክፍሊታት የለዉን።`,
      statusCompleted: "ተዛዚሙ",
      statusAtRisk: "SLA ኣብ ስግኣት",
      upcomingTitle: "ቀንዲ ፍጻመታት ዝመጽእ ወርሒ",
      upcomingEmpty: "ምስዚ መጻረዪ ዝሰማማዕ የለን።",
    },
  },
};
