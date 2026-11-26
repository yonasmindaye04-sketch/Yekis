import { useMemo, useState } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  SlidersHorizontal,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  X,
  LayoutList,
  Table2,
} from "lucide-react";
import type { LedgerContractRecord } from "./dashboardData";
import { railLabel } from "./dashboardData";
import { useShadcnLayout } from "./ShadcnLayoutContext";
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";
import { ContextualHelpTrigger } from "../guide/ContextualHelpTrigger";


interface AdvancedDataTableProps {
  records: LedgerContractRecord[];
  onOpenContracts?: () => void;
  onStatusUpdate?: (id: string, nextState: LedgerContractRecord["escrowState"]) => void;
}

type SortField = "title" | "counterparty" | "amountMinor" | "dueDate" | "escrowState";
type SortDir = "asc" | "desc";

type StatusFilter =
  | "ALL"
  | "ESCROW_HELD"
  | "WORK_IN_PROGRESS"
  | "SUBMITTED_FOR_REVIEW"
  | "RELEASED"
  | "DISPUTED";

const STATUS_META: Record<
  LedgerContractRecord["escrowState"],
  { label: string; tone: "emerald" | "amber" | "crimson" | "neutral" }
> = {
  ESCROW_HELD: { label: "Escrow Held", tone: "emerald" },
  WORK_IN_PROGRESS: { label: "In Progress", tone: "emerald" },
  SUBMITTED_FOR_REVIEW: { label: "Submitted", tone: "amber" },
  ACCEPTED: { label: "Accepted", tone: "emerald" },
  RELEASED: { label: "Released", tone: "emerald" },
  PAYMENT_PENDING: { label: "Awaiting Funding", tone: "neutral" },
  DISPUTED: { label: "Disputed", tone: "crimson" },
  REFUNDED: { label: "Refunded", tone: "neutral" },
  PARTIAL_REFUND: { label: "Partially Refunded", tone: "amber" },
};

export function AdvancedDataTable({
  records,
  onOpenContracts,
  onStatusUpdate,
}: AdvancedDataTableProps) {
  const { density } = useShadcnLayout();
  const { language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).table;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [railFilter, setRailFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState<number>(10);
  const [page, setPage] = useState<number>(1);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<LedgerContractRecord | null>(null);
  const [mobileViewMode, setMobileViewMode] = useState<"cards" | "table">("cards");

  const [visibleCols, setVisibleCols] = useState({
    counterparty: true,
    category: true,
    rail: true,
    dueDate: true,
    fee: true,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records
      .filter((r) => {
        if (statusFilter !== "ALL" && r.escrowState !== statusFilter) return false;
        if (railFilter !== "ALL" && r.rail !== railFilter) return false;
        if (!q) return true;
        return (
          r.title.toLowerCase().includes(q) ||
          r.contractTitle.toLowerCase().includes(q) ||
          r.counterparty.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q) ||
          r.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const cmp =
          sortField === "amountMinor"
            ? a.amountMinor - b.amountMinor
            : sortField === "dueDate"
              ? a.dueDate.localeCompare(b.dueDate)
              : sortField === "title"
                ? a.title.localeCompare(b.title)
                : sortField === "counterparty"
                  ? a.counterparty.localeCompare(b.counterparty)
                  : a.escrowState.localeCompare(b.escrowState);
        return sortDir === "asc" ? cmp : -cmp;
      });
  }, [records, search, statusFilter, railFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const toggleAllVisible = () => {
    const allSelected =
      pagedRows.length > 0 && pagedRows.every((r) => selectedIds.has(r.id));
    const next = new Set(selectedIds);
    if (allSelected) {
      pagedRows.forEach((r) => next.delete(r.id));
    } else {
      pagedRows.forEach((r) => next.add(r.id));
    }
    setSelectedIds(next);
  };

  const toggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const exportCsv = (subset?: LedgerContractRecord[]) => {
    const target = subset ?? filtered;
    const headers = [
      "Reference",
      "Milestone Title",
      "Contract",
      "Counterparty",
      "Category",
      "Payment Rail",
      "Escrow State",
      "Amount (ETB)",
      "Fee (ETB)",
      "Due Date",
    ];
    const lines = target.map((r) =>
      [
        r.code,
        `"${r.title.replace(/"/g, '""')}"`,
        `"${r.contractTitle.replace(/"/g, '""')}"`,
        `"${r.counterparty}"`,
        `"${r.category}"`,
        r.rail,
        r.escrowState,
        (r.amountMinor / 100).toFixed(2),
        (r.feeMinor / 100).toFixed(2),
        r.dueDate,
      ].join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `yekis-contracts-ledger-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalFilteredMinor = filtered.reduce((acc, r) => acc + r.amountMinor, 0);

  return (
    <div className="sh-card" data-tour="dashboard-data-table">
      <div className="sh-card-header">
        <div>
          <div className="yk-help-heading-row">
            <h3 className="sh-card-title">{copy.title}</h3>
            <ContextualHelpTrigger helpId="dashboard-data-table" />
          </div>
          <p className="sh-card-desc">
            {copy.subtitle(filtered.length)}{" "}
            <strong className="sh-mono">
              ETB {(totalFilteredMinor / 100).toLocaleString()}
            </strong>
          </p>
        </div>

        <div className="sh-table-header-actions">
          {selectedIds.size > 0 && (
            <button
              type="button"
              className="sh-btn sh-btn-primary"
              onClick={() =>
                exportCsv(records.filter((r) => selectedIds.has(r.id)))
              }
            >
              <Download size={14} /> {copy.exportSelected(selectedIds.size)}
            </button>
          )}
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => exportCsv()}
          >
            <Download size={14} /> {copy.exportCsv}
          </button>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="sh-btn sh-btn-secondary"
              onClick={() => setColMenuOpen((o) => !o)}
              aria-expanded={colMenuOpen}
            >
              <SlidersHorizontal size={14} /> {copy.columnsBtn}
            </button>
            {colMenuOpen && (
              <div className="sh-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                <div className="sh-dropdown-title">{copy.toggleColumnsTitle}</div>
                {(
                  [
                    ["counterparty", copy.colCounterparty],
                    ["category", copy.colCategory],
                    ["rail", copy.colRail],
                    ["dueDate", copy.colDueDate],
                    ["fee", copy.colFee],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="sh-dropdown-check">
                    <input
                      type="checkbox"
                      checked={visibleCols[key]}
                      onChange={(e) =>
                        setVisibleCols((prev) => ({
                          ...prev,
                          [key]: e.target.checked,
                        }))
                      }
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div
            className="sh-segmented sh-mobile-view-switcher"
            role="group"
            aria-label={copy.mobileViewAria}
          >
            <button
              type="button"
              className={`sh-seg-btn ${mobileViewMode === "cards" ? "active" : ""}`}
              onClick={() => setMobileViewMode("cards")}
              aria-pressed={mobileViewMode === "cards"}
            >
              <LayoutList size={13} /> {copy.cardsBtn}
            </button>
            <button
              type="button"
              className={`sh-seg-btn ${mobileViewMode === "table" ? "active" : ""}`}
              onClick={() => setMobileViewMode("table")}
              aria-pressed={mobileViewMode === "table"}
            >
              <Table2 size={13} /> {copy.tableBtn}
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="sh-table-toolbar">
        <div className="sh-search-input-wrap">
          <Search size={14} />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={copy.searchPlaceholder}
            aria-label={copy.searchAria}
          />
          {search && (
            <button
              type="button"
              className="sh-clear-input"
              onClick={() => setSearch("")}
              aria-label={copy.clearSearchAria}
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div className="sh-segmented" role="group" aria-label={copy.filterStateAria}>
          {(
            [
              ["ALL", copy.filterAll],
              ["ESCROW_HELD", copy.statuses.ESCROW_HELD],
              ["WORK_IN_PROGRESS", copy.statuses.WORK_IN_PROGRESS],
              ["SUBMITTED_FOR_REVIEW", copy.statuses.SUBMITTED_FOR_REVIEW],
              ["RELEASED", copy.statuses.RELEASED],
              ["DISPUTED", copy.statuses.DISPUTED],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`sh-seg-btn ${statusFilter === key ? "active" : ""}`}
              onClick={() => {
                setStatusFilter(key);
                setPage(1);
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <select
          className="sh-select"
          value={railFilter}
          onChange={(e) => {
            setRailFilter(e.target.value);
            setPage(1);
          }}
          aria-label={copy.filterRailAria}
        >
          <option value="ALL">{copy.allRails}</option>
          <option value="TELEBIRR">Telebirr</option>
          <option value="CBE_BIRR">CBE Birr</option>
          <option value="M_PESA">M-Pesa</option>
          <option value="INTERNAL_WALLET">Wallet</option>
          <option value="UNFUNDED">Not funded</option>
        </select>
      </div>

      {/* Mobile Stacked Summary Cards (shown on <=768px when mobileViewMode === "cards") */}
      <div
        className={`sh-mobile-ledger-cards ${mobileViewMode === "cards" ? "is-active" : ""}`}
        aria-label={copy.cardsListAria}
      >
        {pagedRows.length === 0 ? (
          <div className="sh-kanban-empty">
            {copy.emptyMsg}
          </div>
        ) : (
          pagedRows.map((row) => {
            const statusInfo = STATUS_META[row.escrowState];
            const isSelected = selectedIds.has(row.id);
            return (
              <article
                key={row.id}
                className={`sh-mobile-ledger-card ${isSelected ? "selected" : ""}`}
                onClick={() => setInspectedRecord(row)}
              >
                <div className="sh-mobile-ledger-card-top">
                  <div
                    className="sh-mobile-ledger-check"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(row.id)}
                      aria-label={copy.selectItemAria(row.title)}
                    />
                    <span className="sh-mono sh-cell-meta">{row.code}</span>
                    <span aria-hidden="true" className="sh-cell-meta">·</span>
                    <span className="sh-mono sh-cell-meta">
                      {railLabel(row.rail)}
                    </span>
                  </div>
                  <span className={`sh-status-inline ${statusInfo.tone}`}>
                    {statusInfo.tone === "emerald" && <ShieldCheck size={13} />}
                    {statusInfo.tone === "amber" && <Clock size={13} />}
                    {statusInfo.tone === "crimson" && <AlertTriangle size={13} />}
                    {statusInfo.tone === "neutral" && <CheckCircle2 size={13} />}
                    <span>{copy.statuses[row.escrowState]}</span>
                  </span>
                </div>

                <h4 className="sh-mobile-ledger-title">{row.title}</h4>
                <div className="sh-cell-meta">
                  <span>{row.contractTitle}</span>
                  <span aria-hidden="true">·</span>
                  <span>{row.counterparty}</span>
                </div>

                <div className="sh-mobile-ledger-foot">
                  <div>
                    <strong className="sh-mono sh-mobile-ledger-amount">
                      ETB{" "}
                      {(row.amountMinor / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </strong>
                    <span className="sh-cell-meta sh-mono" style={{ display: "block" }}>
                      {copy.duePrefix(row.dueDate)} · {copy.feePrefix}{" "}
                      {(row.feeMinor / 100).toLocaleString()}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="sh-row-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectedRecord(row);
                    }}
                  >
                    {copy.inspectBtn} <ExternalLink size={12} />
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* Data Grid */}
      <div
        className={`sh-table-scroll ${mobileViewMode === "cards" ? "sh-hide-on-mobile-cards" : ""}`}
        tabIndex={0}
        role="region"
        aria-label={copy.regionAria}
      >
        <table className={`sh-data-table ${density === "compact" ? "compact" : "comfortable"}`}>
          <thead>
            <tr>
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={
                    pagedRows.length > 0 &&
                    pagedRows.every((r) => selectedIds.has(r.id))
                  }
                  onChange={toggleAllVisible}
                  aria-label={copy.selectAllAria}
                />
              </th>
              <th>
                <button
                  type="button"
                  className="sh-th-sort"
                  onClick={() => handleSort("title")}
                >
                  <span>{copy.thMilestoneContract}</span>
                  {sortField === "title" ? (
                    sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} />
                  )}
                </button>
              </th>
              {visibleCols.counterparty && (
                <th>
                  <button
                    type="button"
                    className="sh-th-sort"
                    onClick={() => handleSort("counterparty")}
                  >
                    <span>{copy.thCounterparty}</span>
                    {sortField === "counterparty" ? (
                      sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={13} />
                    )}
                  </button>
                </th>
              )}
              {visibleCols.category && <th>{copy.thScopeRail}</th>}
              <th>
                <button
                  type="button"
                  className="sh-th-sort"
                  onClick={() => handleSort("escrowState")}
                >
                  <span>{copy.thState}</span>
                  {sortField === "escrowState" ? (
                    sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} />
                  )}
                </button>
              </th>
              {visibleCols.dueDate && (
                <th>
                  <button
                    type="button"
                    className="sh-th-sort"
                    onClick={() => handleSort("dueDate")}
                  >
                    <span>{copy.thDueDate}</span>
                    {sortField === "dueDate" ? (
                      sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                    ) : (
                      <ArrowUpDown size={13} />
                    )}
                  </button>
                </th>
              )}
              <th className="sh-num-col">
                <button
                  type="button"
                  className="sh-th-sort right"
                  onClick={() => handleSort("amountMinor")}
                >
                  <span>{copy.thEscrowEtb}</span>
                  {sortField === "amountMinor" ? (
                    sortDir === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />
                  ) : (
                    <ArrowUpDown size={13} />
                  )}
                </button>
              </th>
              {visibleCols.fee && <th className="sh-num-col">{copy.thFee10}</th>}
              <th className="sh-num-col">{copy.thActions}</th>
            </tr>
          </thead>
          <tbody>
            {pagedRows.length === 0 ? (
              <tr>
                <td colSpan={9} className="sh-table-empty">
                  {copy.emptyMsg}
                </td>
              </tr>
            ) : (
              pagedRows.map((row) => {
                const statusInfo = STATUS_META[row.escrowState];
                const isSelected = selectedIds.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={isSelected ? "selected" : ""}
                    onClick={() => setInspectedRecord(row)}
                    style={{ cursor: "pointer" }}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleRow(row.id)}
                        aria-label={copy.selectItemAria(row.title)}
                      />
                    </td>
                    <td>
                      <div className="sh-cell-primary">{row.title}</div>
                      <div className="sh-cell-meta">
                        <span className="sh-mono">{row.code}</span>
                        <span aria-hidden="true">·</span>
                        <span>{row.contractTitle}</span>
                      </div>
                    </td>
                    {visibleCols.counterparty && (
                      <td>
                        <div className="sh-cell-primary">{row.counterparty}</div>
                        <div className="sh-cell-meta">{row.counterpartyEmail}</div>
                      </td>
                    )}
                    {visibleCols.category && (
                      <td>
                        <div className="sh-cell-meta">
                          <span>{row.category}</span>
                          {visibleCols.rail && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="sh-mono">{railLabel(row.rail)}</span>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                    <td>
                      <span className={`sh-status-inline ${statusInfo.tone}`}>
                        {statusInfo.tone === "emerald" && <ShieldCheck size={13} />}
                        {statusInfo.tone === "amber" && <Clock size={13} />}
                        {statusInfo.tone === "crimson" && <AlertTriangle size={13} />}
                        {statusInfo.tone === "neutral" && <CheckCircle2 size={13} />}
                        <span>{copy.statuses[row.escrowState]}</span>
                      </span>
                    </td>
                    {visibleCols.dueDate && (
                      <td className="sh-mono sh-cell-date">{row.dueDate}</td>
                    )}
                    <td className="sh-num-col sh-mono sh-font-semibold">
                      {(row.amountMinor / 100).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    {visibleCols.fee && (
                      <td className="sh-num-col sh-mono sh-text-muted">
                        {(row.feeMinor / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    )}
                    <td
                      className="sh-num-col"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="sh-row-action-btn"
                        onClick={() => setInspectedRecord(row)}
                      >
                        {copy.inspectBtn} <ExternalLink size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="sh-table-footer">
        <div className="sh-table-footer-meta">
          <span>
            {copy.selectedFooter(selectedIds.size, filtered.length)}
          </span>
          <span aria-hidden="true">·</span>
          <label className="sh-page-size-label">
            {copy.rowsPerPage}
            <select
              className="sh-select compact"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
          </label>
        </div>

        <div className="sh-pagination-controls">
          <span className="sh-mono" style={{ fontSize: "0.78rem" }}>
            {copy.pageOf(safePage, totalPages)}
          </span>
          <button
            type="button"
            className="sh-icon-only-btn"
            disabled={safePage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label={copy.prevPageAria}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="sh-icon-only-btn"
            disabled={safePage >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            aria-label={copy.nextPageAria}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Row Inspector Modal */}
      {inspectedRecord && (
        <div
          className="sh-sheet-backdrop"
          onClick={() => setInspectedRecord(null)}
          role="dialog"
          aria-modal="true"
          aria-label={copy.inspectorAria}
        >
          <aside
            className="sh-sheet-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sh-sheet-header">
              <div>
                <span className="sh-mono sh-text-muted" style={{ fontSize: "0.76rem" }}>
                  {inspectedRecord.code} · {railLabel(inspectedRecord.rail)}
                </span>
                <h3 className="sh-sheet-title">{inspectedRecord.title}</h3>
              </div>
              <button
                type="button"
                className="sh-icon-only-btn"
                onClick={() => setInspectedRecord(null)}
                aria-label={copy.closeInspectorAria}
              >
                <X size={16} />
              </button>
            </div>

            <div className="sh-sheet-body">
              <div className="sh-kv-list">
                <div className="sh-kv-row">
                  <span>{copy.detailContract}</span>
                  <strong>{inspectedRecord.contractTitle}</strong>
                </div>
                <div className="sh-kv-row">
                  <span>{copy.detailCounterparty}</span>
                  <strong>
                    {inspectedRecord.counterparty} ({inspectedRecord.counterpartyEmail})
                  </strong>
                </div>
                <div className="sh-kv-row">
                  <span>{copy.detailCategory}</span>
                  <strong>{inspectedRecord.category}</strong>
                </div>
                <div className="sh-kv-row">
                  <span>{copy.detailGross}</span>
                  <strong className="sh-mono">
                    ETB {(inspectedRecord.amountMinor / 100).toLocaleString()}
                  </strong>
                </div>
                <div className="sh-kv-row">
                  <span>{copy.detailFee}</span>
                  <strong className="sh-mono">
                    ETB {(inspectedRecord.feeMinor / 100).toLocaleString()}
                  </strong>
                </div>
                <div className="sh-kv-row">
                  <span>{copy.detailNet}</span>
                  <strong className="sh-mono" style={{ color: "var(--color-primary)" }}>
                    ETB{" "}
                    {(
                      (inspectedRecord.amountMinor - inspectedRecord.feeMinor) /
                      100
                    ).toLocaleString()}
                  </strong>
                </div>
                <div className="sh-kv-row">
                  <span>{copy.detailDueDate}</span>
                  <strong className="sh-mono">{inspectedRecord.dueDate}</strong>
                </div>
                <div className="sh-kv-row">
                  <span>{copy.detailState}</span>
                  <strong>{copy.statuses[inspectedRecord.escrowState]}</strong>
                </div>
              </div>

              {onStatusUpdate && (
                <div className="sh-customizer-group" style={{ marginTop: 18 }}>
                  <label className="sh-customizer-label">{copy.updateStageLabel}</label>
                  <div className="sh-customizer-grid-2">
                    {(
                      [
                        ["ESCROW_HELD", copy.statuses.ESCROW_HELD],
                        ["WORK_IN_PROGRESS", copy.statuses.WORK_IN_PROGRESS],
                        ["SUBMITTED_FOR_REVIEW", copy.statuses.SUBMITTED_FOR_REVIEW],
                        ["RELEASED", copy.stageReleasePayout],
                      ] as const
                    ).map(([st, lbl]) => (
                      <button
                        key={st}
                        type="button"
                        className={`sh-choice-btn ${inspectedRecord.escrowState === st ? "active" : ""}`}
                        onClick={() => {
                          onStatusUpdate(inspectedRecord.id, st);
                          setInspectedRecord({
                            ...inspectedRecord,
                            escrowState: st,
                          });
                        }}
                      >
                        <span className="sh-choice-head">
                          <span>{lbl}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="sh-sheet-footer" style={{ display: "flex", gap: 8 }}>
              {onOpenContracts && (
                <button
                  type="button"
                  className="sh-btn sh-btn-primary"
                  onClick={() => {
                    setInspectedRecord(null);
                    onOpenContracts();
                  }}
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  {copy.openContractRoomBtn}
                </button>
              )}
              <button
                type="button"
                className="sh-btn sh-btn-secondary"
                onClick={() => setInspectedRecord(null)}
              >
                {copy.closeBtn}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
