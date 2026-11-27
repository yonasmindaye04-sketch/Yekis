import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  PanelLeftClose,
  PanelLeftOpen,
  ExternalLink,
  RotateCcw,
  Eye,
} from "lucide-react";
import type { EscrowFeeConfig } from "../../api/client";
import type { KanbanColumnId, KanbanTask } from "./dashboardData";
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";
import { railLabel } from "./dashboardData";
import { ContextualHelpTrigger } from "../guide/ContextualHelpTrigger";

interface KanbanBoardViewProps {
  tasks: KanbanTask[];
  viewerRole?: "CLIENT" | "FREELANCER" | "ADMIN";
  feeConfig?: EscrowFeeConfig | null;
  onNavigateView?: (view: string) => void;
  onOpenContracts?: (contractId?: string) => void;
  onOpenEscrow?: (milestoneId?: string) => void;
  onRequestFundMilestone?: (task: KanbanTask) => void;
}

const COLUMNS: {
  id: KanbanColumnId;
}[] = [
  { id: "BACKLOG" },
  { id: "ESCROW_HELD" },
  { id: "WORK_IN_PROGRESS" },
  { id: "SUBMITTED_FOR_REVIEW" },
  { id: "RELEASED" },
];

export type KanbanDueStatus =
  | { state: "settled"; diffDays: 0 }
  | { state: "overdue"; diffDays: number }
  | { state: "due-today"; diffDays: 0 }
  | { state: "due-soon"; diffDays: number }
  | { state: "on-track"; diffDays: number };

export function getTodayAddisIso(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Addis_Ababa",
  }).format(now);
}

function parseIsoDateUtc(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return Date.UTC(year, month - 1, day);
}

export function getKanbanDueStatus(
  dueDate: string,
  column: KanbanColumnId,
  todayIso: string = getTodayAddisIso(),
): KanbanDueStatus {
  if (column === "RELEASED") {
    return { state: "settled", diffDays: 0 };
  }
  const dueUtc = parseIsoDateUtc(dueDate);
  const todayUtc = parseIsoDateUtc(todayIso);
  if (dueUtc === null || todayUtc === null) {
    return { state: "on-track", diffDays: 0 };
  }
  const diffDays = Math.round((dueUtc - todayUtc) / 86_400_000);
  if (diffDays < 0) {
    return { state: "overdue", diffDays: Math.abs(diffDays) };
  }
  if (diffDays === 0) {
    return { state: "due-today", diffDays: 0 };
  }
  if (diffDays <= 3) {
    return { state: "due-soon", diffDays };
  }
  return { state: "on-track", diffDays };
}

function useModalDialog(
  ref: React.RefObject<HTMLDialogElement | null>,
  isOpen: boolean,
  onClose: () => void,
) {
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (isOpen) {
      if (!dialog.open && typeof dialog.showModal === "function") {
        dialog.showModal();
      }
    } else if (dialog.open && typeof dialog.close === "function") {
      dialog.close();
    }
  }, [ref, isOpen]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);

    // Fallback for browsers lacking native closedby="any" support
    const supportsClosedBy =
      typeof HTMLDialogElement !== "undefined" &&
      "closedBy" in HTMLDialogElement.prototype;

    if (supportsClosedBy) {
      return () => {
        dialog.removeEventListener("close", handleClose);
      };
    }

    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e) && dialog.open) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [ref, onClose]);
}

function formatShortTimestamp(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso.slice(0, 10);
  return parsed.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Africa/Addis_Ababa",
  });
}

export function KanbanBoardView({
  tasks,
  viewerRole = "CLIENT",
  feeConfig,
  onNavigateView,
  onOpenContracts,
  onOpenEscrow,
  onRequestFundMilestone,
}: KanbanBoardViewProps) {
  const { language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).kanban;
  const uid = useId();
  const isClientView = viewerRole === "CLIENT";

  const clientFeeNote = useMemo(() => {
    if (!feeConfig) return copy.clientFeeZeroNote;
    const totalPct = (
      (feeConfig.freelancerPlatformFeeRate + feeConfig.paymentProviderFeeRate) *
      100
    )
      .toFixed(1)
      .replace(/\.0$/, "");
    return `${copy.clientFeeZeroNote} (${totalPct}%)`;
  }, [copy.clientFeeZeroNote, feeConfig]);

  const [search, setSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<string>("ALL");
  const [freelancerFilter, setFreelancerFilter] = useState<string>("ALL");
  const [contractFilter, setContractFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<
    "ALL" | "HIGH" | "MEDIUM" | "LOW"
  >("ALL");
  const [overdueOnly, setOverdueOnly] = useState(false);

  const [collapsedCols, setCollapsedCols] = useState<Set<KanbanColumnId>>(
    () => new Set(),
  );
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeMobileColumn, setActiveMobileColumn] =
    useState<KanbanColumnId>("ESCROW_HELD");

  // Horizontal scroll affordance state
  const gridRef = useRef<HTMLDivElement | null>(null);
  const startSentinelRef = useRef<HTMLDivElement | null>(null);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [moreStart, setMoreStart] = useState(false);
  const [moreEnd, setMoreEnd] = useState(false);

  // Dialog ref
  const detailsDialogRef = useRef<HTMLDialogElement | null>(null);

  const todayIso = useMemo(() => getTodayAddisIso(), []);

  useModalDialog(detailsDialogRef, selectedTaskId !== null, () =>
    setSelectedTaskId(null),
  );

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) ?? null,
    [tasks, selectedTaskId],
  );

  // Dynamic filter options
  const clientOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => t.client).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [tasks],
  );
  const freelancerOptions = useMemo(
    () =>
      Array.from(new Set(tasks.map((t) => t.freelancer).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [tasks],
  );
  const contractOptions = useMemo(
    () =>
      Array.from(
        new Set(tasks.map((t) => t.contractTitle).filter(Boolean)),
      ).sort((a, b) => a.localeCompare(b)),
    [tasks],
  );

  const hasActiveFilters = Boolean(
    search.trim() ||
      clientFilter !== "ALL" ||
      freelancerFilter !== "ALL" ||
      contractFilter !== "ALL" ||
      priorityFilter !== "ALL" ||
      overdueOnly,
  );

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (clientFilter !== "ALL" && t.client !== clientFilter) return false;
      if (freelancerFilter !== "ALL" && t.freelancer !== freelancerFilter)
        return false;
      if (contractFilter !== "ALL" && t.contractTitle !== contractFilter)
        return false;
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (overdueOnly) {
        const dueStatus = getKanbanDueStatus(t.dueDate, t.column, todayIso);
        if (dueStatus.state !== "overdue") return false;
      }
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.contractTitle.toLowerCase().includes(q) ||
        t.counterparty.toLowerCase().includes(q) ||
        t.client.toLowerCase().includes(q) ||
        t.freelancer.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q)
      );
    });
  }, [
    tasks,
    search,
    clientFilter,
    freelancerFilter,
    contractFilter,
    priorityFilter,
    overdueOnly,
    todayIso,
  ]);

  const totalOverdueCount = useMemo(
    () =>
      filteredTasks.filter(
        (t) => getKanbanDueStatus(t.dueDate, t.column, todayIso).state === "overdue",
      ).length,
    [filteredTasks, todayIso],
  );

  const emptyColumnIds = useMemo(
    () =>
      COLUMNS.filter(
        (col) => !filteredTasks.some((t) => t.column === col.id),
      ).map((col) => col.id),
    [filteredTasks],
  );

  const hasUncollapsedEmpty = useMemo(
    () => emptyColumnIds.some((id) => !collapsedCols.has(id)),
    [emptyColumnIds, collapsedCols],
  );

  // Track horizontal scroll state and IntersectionObserver sentinel fallback
  useEffect(() => {
    if (typeof window === "undefined") return;
    const scroller = gridRef.current;
    if (!scroller) return;

    const updateScrollButtons = () => {
      const maxScroll = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
      setCanScrollLeft(scroller.scrollLeft > 4);
      setCanScrollRight(scroller.scrollLeft < maxScroll - 4);
    };

    updateScrollButtons();
    scroller.addEventListener("scroll", updateScrollButtons, { passive: true });
    window.addEventListener("resize", updateScrollButtons);

    let observer: IntersectionObserver | null = null;
    const supportsScrollTimeline =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "scroll()");

    if (
      !supportsScrollTimeline &&
      typeof IntersectionObserver !== "undefined" &&
      startSentinelRef.current &&
      endSentinelRef.current
    ) {
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.target === startSentinelRef.current) {
              setMoreStart(!entry.isIntersecting);
            } else if (entry.target === endSentinelRef.current) {
              setMoreEnd(!entry.isIntersecting);
            }
          }
        },
        { root: scroller, threshold: 0.99 },
      );
      observer.observe(startSentinelRef.current);
      observer.observe(endSentinelRef.current);
    }

    return () => {
      scroller.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
      observer?.disconnect();
    };
  }, [collapsedCols, filteredTasks.length]);

  const scrollBoardBy = (dir: -1 | 1) => {
    const scroller = gridRef.current;
    if (!scroller) return;
    scroller.scrollBy({
      left: dir * 296,
      behavior: "smooth",
    });
  };

  const toggleCollapseCol = (colId: KanbanColumnId) => {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      if (next.has(colId)) next.delete(colId);
      else next.add(colId);
      return next;
    });
  };

  const collapseEmptyCols = () => {
    setCollapsedCols((prev) => {
      const next = new Set(prev);
      for (const id of emptyColumnIds) next.add(id);
      return next;
    });
  };

  const expandAllCols = () => {
    setCollapsedCols(new Set());
  };

  const clearAllFilters = () => {
    setSearch("");
    setClientFilter("ALL");
    setFreelancerFilter("ALL");
    setContractFilter("ALL");
    setPriorityFilter("ALL");
    setOverdueOnly(false);
  };

  const openEscrowTarget = (milestoneId?: string) => {
    if (onOpenEscrow) {
      onOpenEscrow(milestoneId);
    } else if (onNavigateView) {
      onNavigateView("escrow");
    }
  };

  const openContractsTarget = (contractId?: string) => {
    if (onOpenContracts) {
      onOpenContracts(contractId);
    } else if (onNavigateView) {
      onNavigateView("contracts");
    }
  };

  const renderDueIndicator = (
    task: KanbanTask,
    dueStatus: ReturnType<typeof getKanbanDueStatus>,
  ) => {
    if (dueStatus.state === "overdue") {
      return (
        <span className="sh-kanban-due-status overdue">
          <AlertTriangle size={11} aria-hidden="true" />
          <span>{copy.overdueDaysLabel(dueStatus.diffDays)}</span>
        </span>
      );
    }
    if (dueStatus.state === "due-today") {
      return (
        <span className="sh-kanban-due-status due-today">
          <Clock size={11} aria-hidden="true" />
          <span>{copy.dueTodayLabel}</span>
        </span>
      );
    }
    if (dueStatus.state === "due-soon") {
      return (
        <span className="sh-kanban-due-status due-soon">
          <Clock size={11} aria-hidden="true" />
          <span>{copy.dueSoonLabel(dueStatus.diffDays)}</span>
        </span>
      );
    }
    if (dueStatus.state === "settled") {
      return (
        <span className="sh-kanban-due-status settled">
          <CheckCircle2 size={11} aria-hidden="true" />
          <span>{copy.settledLabel}</span>
        </span>
      );
    }
    return (
      <span className="sh-cell-meta sh-mono">
        {copy.duePrefix(task.dueDate || "—")}
      </span>
    );
  };

  const detailsTitleId = `${uid}-details-title`;

  return (
    <div className="sh-card" data-tour="dashboard-kanban">
      <div className="sh-card-header">
        <div>
          <div className="yk-help-heading-row">
            <h3 className="sh-card-title">{copy.title}</h3>
            <ContextualHelpTrigger helpId="dashboard-kanban" />
          </div>
          <p className="sh-card-desc">{copy.subtitle}</p>
        </div>
      </div>

      {/* Filter Bar: Search + Client, Freelancer, Contract, Priority & Overdue */}
      <div className="sh-kanban-filter-bar">
        <div className="sh-kanban-filter-row">
          <div className="sh-search-input-wrap">
            <Search size={14} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={copy.searchPlaceholder}
              aria-label={copy.searchAria}
            />
          </div>

          <div className="sh-kanban-selects">
            <select
              name="kanban-client-filter"
              className="sh-select sh-kanban-filter-select"
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              aria-label={copy.clientFilterAria}
            >
              <option value="ALL">{copy.allClients}</option>
              {clientOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              name="kanban-freelancer-filter"
              className="sh-select sh-kanban-filter-select"
              value={freelancerFilter}
              onChange={(e) => setFreelancerFilter(e.target.value)}
              aria-label={copy.freelancerFilterAria}
            >
              <option value="ALL">{copy.allFreelancers}</option>
              {freelancerOptions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <select
              name="kanban-contract-filter"
              className="sh-select sh-kanban-filter-select"
              value={contractFilter}
              onChange={(e) => setContractFilter(e.target.value)}
              aria-label={copy.contractFilterAria}
            >
              <option value="ALL">{copy.allContracts}</option>
              {contractOptions.map((ct) => (
                <option key={ct} value={ct}>
                  {ct}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="sh-kanban-filter-row">
          <div
            className="sh-segmented"
            role="group"
            aria-label={copy.priorityAria}
          >
            {(
              [
                ["ALL", copy.priorityAll],
                ["HIGH", copy.priorityHighFilter],
                ["MEDIUM", copy.priorityMediumFilter],
                ["LOW", copy.priorityLowFilter],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`sh-seg-btn ${priorityFilter === key ? "active" : ""}`}
                onClick={() => setPriorityFilter(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="sh-kanban-filter-actions">
            <button
              type="button"
              className={`sh-btn sh-btn-secondary sh-kanban-overdue-toggle ${overdueOnly ? "active" : ""}`}
              aria-pressed={overdueOnly}
              onClick={() => setOverdueOnly((v) => !v)}
            >
              <AlertTriangle size={13} aria-hidden="true" />
              <span>{copy.overdueOnlyBtn}</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                className="sh-btn sh-btn-secondary"
                onClick={clearAllFilters}
              >
                <RotateCcw size={13} aria-hidden="true" />
                <span>{copy.clearFiltersBtn}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Board Summary + Column Collapse & Intentional Horizontal Scroll Controls */}
      <div className="sh-kanban-board-bar">
        <div className="sh-kanban-summary-text">
          <span className="sh-mono">
            {copy.boardSummary(
              filteredTasks.length,
              tasks.length,
              totalOverdueCount,
            )}
          </span>
          {totalOverdueCount > 0 && (
            <span className="sh-kanban-overdue-flag">
              <AlertTriangle size={12} aria-hidden="true" />
              <span>{copy.overdueColCount(totalOverdueCount)}</span>
            </span>
          )}
        </div>

        <div className="sh-kanban-board-controls">
          {hasUncollapsedEmpty && (
            <button
              type="button"
              className="sh-btn sh-btn-secondary sh-btn-compact"
              onClick={collapseEmptyCols}
            >
              <PanelLeftClose size={13} aria-hidden="true" />
              <span>{copy.collapseEmptyBtn}</span>
            </button>
          )}
          {collapsedCols.size > 0 && (
            <button
              type="button"
              className="sh-btn sh-btn-secondary sh-btn-compact"
              onClick={expandAllCols}
            >
              <PanelLeftOpen size={13} aria-hidden="true" />
              <span>{copy.expandAllBtn}</span>
            </button>
          )}

          {(canScrollLeft || canScrollRight) && (
            <div className="sh-kanban-scroll-nav">
              <span className="sh-kanban-scroll-hint">{copy.scrollHint}</span>
              <button
                type="button"
                className="sh-icon-only-btn compact"
                disabled={!canScrollLeft}
                onClick={() => scrollBoardBy(-1)}
                aria-label={copy.scrollLeftAria}
                title={copy.scrollLeftAria}
              >
                <ChevronLeft size={14} aria-hidden="true" />
              </button>
              <button
                type="button"
                className="sh-icon-only-btn compact"
                disabled={!canScrollRight}
                onClick={() => scrollBoardBy(1)}
                aria-label={copy.scrollRightAria}
                title={copy.scrollRightAria}
              >
                <ChevronRight size={14} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Stage Tabs (visible on <= 1024px) */}
      <div
        className="sh-kanban-mobile-tabs"
        role="tablist"
        aria-label={copy.mobileTabsAria}
      >
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.column === col.id);
          const isActive = activeMobileColumn === col.id;
          return (
            <button
              key={col.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`sh-kanban-mobile-tab ${isActive ? "active" : ""}`}
              onClick={() => setActiveMobileColumn(col.id)}
            >
              <span>{copy.columns[col.id].title}</span>
              <span className="sh-mono sh-kanban-mobile-tab-count">
                {colTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5-Column Horizontal Scrollable Read-Only Kanban Projection */}
      <div
        ref={gridRef}
        className={`sh-kanban-grid ${moreStart ? "more-start" : ""} ${moreEnd ? "more-end" : ""}`}
      >
        <div
          ref={startSentinelRef}
          className="sh-kanban-scroll-sentinel"
          aria-hidden="true"
        />

        {COLUMNS.map((col) => {
          const colAllTasks = tasks.filter((t) => t.column === col.id);
          const colTasks = filteredTasks.filter((t) => t.column === col.id);
          const colTotalMinor = colTasks.reduce(
            (sum, t) => sum + t.amountMinor,
            0,
          );
          const colOverdueCount = colTasks.filter(
            (t) =>
              getKanbanDueStatus(t.dueDate, t.column, todayIso).state ===
              "overdue",
          ).length;
          const isMobileActive = activeMobileColumn === col.id;
          const isCollapsed = collapsedCols.has(col.id);
          const colTitle = copy.columns[col.id].title;
          const stageEmptyAction = copy.emptyStageActions[col.id];

          return (
            <div
              key={col.id}
              className={`sh-kanban-col ${isCollapsed ? "is-collapsed" : ""} ${isMobileActive ? "mobile-active" : "sh-kanban-col-hidden-mobile"}`}
            >
              {isCollapsed ? (
                <div className="sh-kanban-col-collapsed-rail">
                  <button
                    type="button"
                    className="sh-icon-only-btn compact"
                    aria-expanded={false}
                    aria-label={copy.expandColumnAria(colTitle)}
                    title={copy.expandColumnAria(colTitle)}
                    onClick={() => toggleCollapseCol(col.id)}
                  >
                    <PanelLeftOpen size={13} aria-hidden="true" />
                  </button>

                  <span className="sh-mono sh-kanban-count">
                    {colTasks.length}
                  </span>

                  {colOverdueCount > 0 && (
                    <span
                      className="sh-kanban-overdue-flag sh-mono"
                      title={copy.overdueColCount(colOverdueCount)}
                    >
                      {colOverdueCount}!
                    </span>
                  )}

                  <button
                    type="button"
                    className="sh-kanban-collapsed-label"
                    onClick={() => toggleCollapseCol(col.id)}
                    aria-label={copy.expandColumnAria(colTitle)}
                  >
                    {colTitle}
                  </button>
                </div>
              ) : (
                <>
                  <div className="sh-kanban-col-head">
                    <div className="sh-kanban-col-title-row">
                      <h4>{colTitle}</h4>
                      <div className="sh-kanban-col-head-actions">
                        <span className="sh-mono sh-kanban-count">
                          {copy.taskCountLabel(
                            colTasks.length,
                            colAllTasks.length,
                            hasActiveFilters,
                          )}
                        </span>
                        <button
                          type="button"
                          className="sh-icon-only-btn compact sh-kanban-collapse-btn"
                          aria-expanded={true}
                          aria-label={copy.collapseColumnAria(colTitle)}
                          title={copy.collapseColumnAria(colTitle)}
                          onClick={() => toggleCollapseCol(col.id)}
                        >
                          <PanelLeftClose size={13} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                    <p className="sh-kanban-col-sub">
                      <span>{copy.columns[col.id].subtitle}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="sh-mono">
                        ETB {(colTotalMinor / 100).toLocaleString()}
                      </span>
                      {colOverdueCount > 0 && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="sh-kanban-overdue-flag">
                            {copy.overdueColCount(colOverdueCount)}
                          </span>
                        </>
                      )}
                    </p>
                  </div>

                  <div className="sh-kanban-cards">
                    {colTasks.length === 0 ? (
                      <div className="sh-kanban-empty">
                        {hasActiveFilters ? (
                          <>
                            <p className="sh-kanban-empty-title">
                              {copy.filteredEmptyCol(colAllTasks.length)}
                            </p>
                            <button
                              type="button"
                              className="sh-btn sh-btn-secondary sh-btn-compact"
                              onClick={clearAllFilters}
                            >
                              <RotateCcw size={12} aria-hidden="true" />
                              <span>{copy.clearFiltersBtn}</span>
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="sh-kanban-empty-title">
                              {copy.emptyCol}
                            </p>
                            <p className="sh-kanban-empty-hint">
                              {stageEmptyAction.hint}
                            </p>
                            {(onNavigateView || onOpenContracts || onOpenEscrow) && (
                              <div className="sh-kanban-empty-actions">
                                <button
                                  type="button"
                                  className="sh-btn sh-btn-secondary sh-btn-compact"
                                  onClick={() =>
                                    col.id === "BACKLOG" || col.id === "WORK_IN_PROGRESS"
                                      ? openContractsTarget()
                                      : openEscrowTarget()
                                  }
                                >
                                  <span>{stageEmptyAction.ctaLabel}</span>
                                  <ExternalLink size={11} aria-hidden="true" />
                                </button>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const dueStatus = getKanbanDueStatus(
                          task.dueDate,
                          task.column,
                          todayIso,
                        );
                        const state = task.escrowState ?? task.column;
                        const canFund =
                          isClientView &&
                          state === "PAYMENT_PENDING" &&
                          task.contractFullyExecuted !== false &&
                          Boolean(onRequestFundMilestone);
                        const canReview =
                          isClientView && state === "SUBMITTED_FOR_REVIEW";
                        const canSubmit =
                          !isClientView &&
                          (state === "ESCROW_HELD" || state === "WORK_IN_PROGRESS");

                        return (
                          <article
                            key={task.id}
                            className="sh-kanban-card"
                            onClick={() => setSelectedTaskId(task.id)}
                          >
                            <div className="sh-kanban-card-top">
                              <span className="sh-cell-meta">
                                <span className="sh-mono">{task.code}</span>
                                <span aria-hidden="true">·</span>
                                <span>{railLabel(task.rail)}</span>
                                <span aria-hidden="true">·</span>
                                <span
                                  className={`sh-priority-inline ${task.priority.toLowerCase()}`}
                                >
                                  {task.priority === "HIGH" && (
                                    <AlertCircle size={11} aria-hidden="true" />
                                  )}
                                  {task.priority === "MEDIUM" && (
                                    <Clock size={11} aria-hidden="true" />
                                  )}
                                  {task.priority === "LOW" && (
                                    <CheckCircle2 size={11} aria-hidden="true" />
                                  )}
                                  {copy.priorityLabels[task.priority]}
                                </span>
                              </span>
                            </div>

                            <h5 className="sh-kanban-card-title">
                              <button
                                type="button"
                                className="sh-kanban-card-title-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedTaskId(task.id);
                                }}
                                aria-label={copy.viewDetailsAria(task.title)}
                              >
                                {task.title}
                              </button>
                            </h5>

                            <div className="sh-kanban-card-parties">
                              <span className="sh-truncate">{task.contractTitle}</span>
                              <span className="sh-cell-meta sh-truncate">
                                {task.client} → {task.freelancer}
                              </span>
                            </div>

                            <div className="sh-kanban-card-foot">
                              <div className="sh-kanban-card-metrics">
                                <strong className="sh-mono sh-kanban-amount">
                                  ETB {(task.amountMinor / 100).toLocaleString()}
                                </strong>
                                {renderDueIndicator(task, dueStatus)}
                              </div>

                              <div
                                className="sh-kanban-step-btns"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {canFund && (
                                  <button
                                    type="button"
                                    className="sh-btn sh-btn-primary sh-btn-compact"
                                    onClick={() => onRequestFundMilestone?.(task)}
                                  >
                                    {copy.fundMilestoneBtn}
                                  </button>
                                )}
                                {canReview && (
                                  <button
                                    type="button"
                                    className="sh-row-action-btn"
                                    onClick={() => openEscrowTarget(task.id)}
                                  >
                                    {copy.reviewReleaseBtn}
                                  </button>
                                )}
                                {canSubmit && (
                                  <button
                                    type="button"
                                    className="sh-row-action-btn"
                                    onClick={() => openEscrowTarget(task.id)}
                                  >
                                    {copy.submitDeliveryBtn}
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="sh-icon-only-btn compact"
                                  onClick={() => setSelectedTaskId(task.id)}
                                  title={copy.viewDetailsAria(task.title)}
                                  aria-label={copy.viewDetailsAria(task.title)}
                                >
                                  <Eye size={12} aria-hidden="true" />
                                </button>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        <div
          ref={endSentinelRef}
          className="sh-kanban-scroll-sentinel"
          aria-hidden="true"
        />
      </div>

      {/* Inline Task Details Native Modal Dialog (read-only server state + real actions) */}
      <dialog
        ref={detailsDialogRef}
        className="sh-kanban-dialog sh-sheet-dialog"
        aria-labelledby={detailsTitleId}
        {...({ closedby: "any" } as Record<string, string>)}
      >
        {selectedTask && (
          <div className="sh-sheet-panel sh-kanban-dialog-panel">
            <div className="sh-sheet-header">
              <div className="sh-kanban-dialog-head-copy">
                <span className="sh-mono sh-text-muted" style={{ fontSize: "0.76rem" }}>
                  {selectedTask.code} · {railLabel(selectedTask.rail)}
                </span>
                <h1 id={detailsTitleId} className="sh-sheet-title">
                  {selectedTask.title}
                </h1>
              </div>
              <button
                type="button"
                className="sh-icon-only-btn"
                onClick={() => setSelectedTaskId(null)}
                aria-label={copy.closeAria}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div className="sh-sheet-body">
              {(() => {
                const dueStatus = getKanbanDueStatus(
                  selectedTask.dueDate,
                  selectedTask.column,
                  todayIso,
                );
                return (
                  <div className="sh-kv-list">
                    <div className="sh-kv-row">
                      <span>{copy.detailContract}</span>
                      <strong>{selectedTask.contractTitle}</strong>
                    </div>
                    <div className="sh-kv-row">
                      <span>{copy.detailClient}</span>
                      <strong>{selectedTask.client}</strong>
                    </div>
                    <div className="sh-kv-row">
                      <span>{copy.detailFreelancer}</span>
                      <strong>{selectedTask.freelancer}</strong>
                    </div>
                    <div className="sh-kv-row">
                      <span>{copy.detailCategory}</span>
                      <strong>{selectedTask.category}</strong>
                    </div>
                    <div className="sh-kv-row">
                      <span>{copy.detailRail}</span>
                      <strong>{railLabel(selectedTask.rail)}</strong>
                    </div>
                    <div className="sh-kv-row">
                      <span>{copy.detailAmount}</span>
                      <strong className="sh-mono">
                        ETB {(selectedTask.amountMinor / 100).toLocaleString()}
                      </strong>
                    </div>
                    {isClientView ? (
                      <>
                        <div className="sh-kv-row">
                          <span>{copy.detailClientFee}</span>
                          <strong className="sh-mono">
                            ETB {(selectedTask.clientFeeMinor / 100).toLocaleString()}
                          </strong>
                        </div>
                        <div className="sh-kv-row">
                          <span>{copy.detailClientTotal}</span>
                          <strong className="sh-mono" style={{ color: "var(--color-primary)" }}>
                            ETB {(selectedTask.clientTotalChargeMinor / 100).toLocaleString()}
                          </strong>
                        </div>
                        <p className="sh-cell-meta" style={{ margin: "6px 0 0" }}>
                          {clientFeeNote}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="sh-kv-row">
                          <span>{copy.detailPlatformFee}</span>
                          <strong className="sh-mono">
                            ETB {(selectedTask.platformFeeMinor / 100).toLocaleString()}
                          </strong>
                        </div>
                        <div className="sh-kv-row">
                          <span>{copy.detailProviderFee}</span>
                          <strong className="sh-mono">
                            ETB {(selectedTask.providerFeeMinor / 100).toLocaleString()}
                          </strong>
                        </div>
                        <div className="sh-kv-row">
                          <span>{copy.detailNetPayout}</span>
                          <strong className="sh-mono" style={{ color: "var(--color-primary)" }}>
                            ETB {(selectedTask.netPayoutMinor / 100).toLocaleString()}
                          </strong>
                        </div>
                      </>
                    )}
                    <div className="sh-kv-row">
                      <span>{copy.detailDueDate}</span>
                      <strong className="sh-mono">
                        {selectedTask.dueDate || "—"}
                      </strong>
                    </div>
                    <div className="sh-kv-row">
                      <span>{copy.detailScheduleStatus}</span>
                      <strong>{renderDueIndicator(selectedTask, dueStatus)}</strong>
                    </div>
                    <div className="sh-kv-row">
                      <span>{copy.detailStage}</span>
                      <strong>{copy.columns[selectedTask.column].title}</strong>
                    </div>
                    {selectedTask.fundedAt && (
                      <div className="sh-kv-row">
                        <span>{copy.detailFundedAt}</span>
                        <strong className="sh-mono">
                          {formatShortTimestamp(selectedTask.fundedAt)}
                        </strong>
                      </div>
                    )}
                    {selectedTask.submittedAt && (
                      <div className="sh-kv-row">
                        <span>{copy.detailSubmittedAt}</span>
                        <strong className="sh-mono">
                          {formatShortTimestamp(selectedTask.submittedAt)}
                        </strong>
                      </div>
                    )}
                    {selectedTask.autoReleaseAt && (
                      <div className="sh-kv-row">
                        <span>{copy.detailAutoReleaseAt}</span>
                        <strong className="sh-mono">
                          {formatShortTimestamp(selectedTask.autoReleaseAt)}
                        </strong>
                      </div>
                    )}
                    {selectedTask.releasedAt && (
                      <div className="sh-kv-row">
                        <span>{copy.detailReleasedAt}</span>
                        <strong className="sh-mono">
                          {formatShortTimestamp(selectedTask.releasedAt)}
                        </strong>
                      </div>
                    )}
                    {selectedTask.deliverableUrl && (
                      <div className="sh-kv-row">
                        <span>{copy.detailDeliverable}</span>
                        <a
                          href={selectedTask.deliverableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="sh-inline-link"
                        >
                          {copy.openDeliverableBtn}{" "}
                          <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

              {(() => {
                const state = selectedTask.escrowState ?? selectedTask.column;
                const disputable =
                  state === "ESCROW_HELD" ||
                  state === "WORK_IN_PROGRESS" ||
                  state === "SUBMITTED_FOR_REVIEW";
                return (
                  <div className="sh-customizer-group">
                    <span className="sh-customizer-label">{copy.actionsLabel}</span>
                    {isClientView &&
                      state === "PAYMENT_PENDING" &&
                      selectedTask.contractFullyExecuted === false && (
                        <p className="sh-cell-meta" style={{ margin: "0 0 8px" }}>
                          {copy.awaitingSignatureNote}
                        </p>
                      )}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {isClientView &&
                        state === "PAYMENT_PENDING" &&
                        selectedTask.contractFullyExecuted !== false &&
                        onRequestFundMilestone && (
                          <button
                            type="button"
                            className="sh-btn sh-btn-primary"
                            onClick={() => {
                              const target = selectedTask;
                              setSelectedTaskId(null);
                              onRequestFundMilestone(target);
                            }}
                          >
                            {copy.fundMilestoneBtn}
                          </button>
                        )}
                      {isClientView && state === "SUBMITTED_FOR_REVIEW" && (
                        <button
                          type="button"
                          className="sh-btn sh-btn-primary"
                          onClick={() => {
                            const id = selectedTask.id;
                            setSelectedTaskId(null);
                            openEscrowTarget(id);
                          }}
                        >
                          {copy.reviewReleaseBtn}
                        </button>
                      )}
                      {!isClientView &&
                        (state === "ESCROW_HELD" || state === "WORK_IN_PROGRESS") && (
                          <button
                            type="button"
                            className="sh-btn sh-btn-primary"
                            onClick={() => {
                              const id = selectedTask.id;
                              setSelectedTaskId(null);
                              openEscrowTarget(id);
                            }}
                          >
                            {copy.submitDeliveryBtn}
                          </button>
                        )}
                      {disputable && (
                        <button
                          type="button"
                          className="sh-btn sh-btn-secondary"
                          onClick={() => {
                            const id = selectedTask.id;
                            setSelectedTaskId(null);
                            openEscrowTarget(id);
                          }}
                        >
                          {copy.disputeBtn}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="sh-sheet-footer sh-kanban-dialog-footer">
              {(onOpenEscrow || onNavigateView) && (
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => {
                    const id = selectedTask.id;
                    setSelectedTaskId(null);
                    openEscrowTarget(id);
                  }}
                >
                  <span>{copy.openEscrowBtn}</span>
                  <ExternalLink size={13} aria-hidden="true" />
                </button>
              )}
              {(onOpenContracts || onNavigateView) && (
                <button
                  type="button"
                  className="sh-btn sh-btn-primary"
                  onClick={() => {
                    const cId = selectedTask.contractId;
                    setSelectedTaskId(null);
                    openContractsTarget(cId);
                  }}
                >
                  <span>{copy.openContractRoomBtn}</span>
                  <ExternalLink size={13} aria-hidden="true" />
                </button>
              )}
              <button
                type="button"
                className="sh-btn sh-btn-secondary"
                onClick={() => setSelectedTaskId(null)}
              >
                {copy.closeBtn}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}
