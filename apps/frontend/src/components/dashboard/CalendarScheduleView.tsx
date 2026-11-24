import React, { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";
import type { ScheduleEvent, ScheduleEventType } from "./dashboardData";
import {
  formatEthiopianDate,
  formatEthiopianDateAmharic,
  formatEthiopianMonthYear,
  formatGregorianDate,
  formatGregorianDateRange,
  getEthiopianMonthCells,
  getEthiopianMonthRange,
  getFiscalQuarter,
  getFiscalQuarterForMonth,
  getFiscalQuarters,
  getFiscalYear,
  getFiscalYearForEthiopianMonth,
  getFiscalYearInfo,
  getGregorianDateParts,
  gregorianToEthiopian,
  isValidIsoDate,
  stepEthiopianMonth,
} from "../../lib/ethiopianCalendar";

interface CalendarScheduleViewProps {
  events: ScheduleEvent[];
  onEventsChange: (next: ScheduleEvent[]) => void;
}

const TYPE_LABELS: Record<ScheduleEventType, string> = {
  MILESTONE_DUE: "Milestone Due",
  PAYOUT_RELEASE: "Payout Release",
  PROPOSAL_DEADLINE: "Proposal Deadline",
  COMPLIANCE_KYC: "Compliance SLA",
};

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DEMO_DATE = "2026-10-21";
const DEMO_YEAR = 2026;
const DEMO_GREGORIAN_MONTH = 9; // 0-indexed: 9 = October 2026

type CalendarMode = "gregorian" | "fiscal";

interface CalendarCell {
  dateStr: string;
  day: number;
  altLabel: string | null;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function gregorianMonthStartIso(year: number, month: number): string {
  return `${year}-${pad2(month + 1)}-01`;
}

function gregorianCells(year: number, month: number): Array<CalendarCell | null> {
  const firstDay = new Date(Date.UTC(year, month, 1));
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstDay.getUTCDay() + 6) % 7;

  const cells: Array<CalendarCell | null> = Array.from(
    { length: startOffset },
    () => null,
  );

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({
      dateStr: `${year}-${pad2(month + 1)}-${pad2(day)}`,
      day,
      altLabel: null,
    });
  }

  return cells;
}

export function CalendarScheduleView({
  events,
  onEventsChange,
}: CalendarScheduleViewProps) {
  const initialEthiopian = gregorianToEthiopian(DEMO_DATE);
  const [mode, setMode] = useState<CalendarMode>("gregorian");
  const [year, setYear] = useState(DEMO_YEAR);
  const [month, setMonth] = useState(DEMO_GREGORIAN_MONTH);
  const [ethYear, setEthYear] = useState(initialEthiopian.year);
  const [ethMonth, setEthMonth] = useState(initialEthiopian.month);
  const [selectedDate, setSelectedDate] = useState(DEMO_DATE);
  const [typeFilter, setTypeFilter] = useState<"ALL" | ScheduleEventType>("ALL");
  const [createOpen, setCreateOpen] = useState(false);

  // New event form state
  const [newTitle, setNewTitle] = useState("");
  const [newContractRef, setNewContractRef] = useState("CNT-801 · MS-03");
  const [newDate, setNewDate] = useState("2026-10-24");
  const [newTime, setNewTime] = useState("15:00 EAT");
  const [newType, setNewType] = useState<ScheduleEventType>("MILESTONE_DUE");
  const [newAmountETB, setNewAmountETB] = useState("52000");
  const [newCounterparty, setNewCounterparty] = useState("Hanna Tadesse");

  const isFiscal = mode === "fiscal";

  const filteredEvents = useMemo(() => {
    if (typeFilter === "ALL") return events;
    return events.filter((ev) => ev.type === typeFilter);
  }, [events, typeFilter]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, ScheduleEvent[]>();
    for (const ev of filteredEvents) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [filteredEvents]);

  const calendarCells = useMemo(() => {
    if (isFiscal) {
      return getEthiopianMonthCells(ethYear, ethMonth).map((cell) =>
        cell
          ? {
              ...cell,
              altLabel: formatGregorianDate(cell.dateStr, "short"),
            }
          : null,
      );
    }

    return gregorianCells(year, month);
  }, [isFiscal, ethYear, ethMonth, year, month]);

  const monthLabel = isFiscal
    ? formatEthiopianMonthYear(ethYear, ethMonth)
    : formatGregorianDate(gregorianMonthStartIso(year, month), "month-year");

  const visibleMonthRange = useMemo(() => {
    if (isFiscal) {
      return getEthiopianMonthRange(ethYear, ethMonth);
    }

    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    return {
      startIso: gregorianMonthStartIso(year, month),
      endIso: `${year}-${pad2(month + 1)}-${pad2(daysInMonth)}`,
    };
  }, [isFiscal, year, month, ethYear, ethMonth]);

  const visibleDateSet = useMemo(
    () =>
      new Set(
        calendarCells
          .filter((cell): cell is CalendarCell => cell !== null)
          .map((cell) => cell.dateStr),
      ),
    [calendarCells],
  );

  const selectedFiscal = useMemo(
    () => getFiscalQuarter(selectedDate),
    [selectedDate],
  );

  const monthSubLabel = isFiscal
    ? formatGregorianDateRange(visibleMonthRange.startIso, visibleMonthRange.endIso)
    : `EFY ${selectedFiscal.fiscalYear} E.C. · Q${selectedFiscal.quarter}`;

  const fiscalView = useMemo(() => {
    if (!isFiscal) return null;

    const fiscalYear = getFiscalYearForEthiopianMonth(ethYear, ethMonth);
    const info = getFiscalYearInfo(fiscalYear);
    const activeQuarter = getFiscalQuarterForMonth(ethMonth);
    const quarters = getFiscalQuarters(fiscalYear).map((quarter) => {
      const quarterEvents = filteredEvents
        .filter(
          (ev) => ev.date >= quarter.startIso && ev.date <= quarter.endIso,
        )
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        ...quarter,
        eventCount: quarterEvents.length,
        totalMinor: quarterEvents.reduce((sum, ev) => sum + ev.amountMinor, 0),
        firstEventDate: quarterEvents[0]?.date ?? null,
      };
    });

    return { fiscalYear, info, activeQuarter, quarters };
  }, [isFiscal, ethYear, ethMonth, filteredEvents]);

  const mobileDates = useMemo(
    () =>
      Array.from(eventsByDate.entries())
        .filter(([dateStr]) => visibleDateSet.has(dateStr))
        .sort(([a], [b]) => a.localeCompare(b)),
    [eventsByDate, visibleDateSet],
  );

  const upcomingEvents = useMemo(
    () =>
      [...filteredEvents]
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 4),
    [filteredEvents],
  );

  const selectDate = (dateStr: string) => {
    setSelectedDate(dateStr);

    if (isFiscal) {
      const eth = gregorianToEthiopian(dateStr);
      setEthYear(eth.year);
      setEthMonth(eth.month);
      return;
    }

    const gregorian = getGregorianDateParts(dateStr);
    setYear(gregorian.year);
    setMonth(gregorian.month - 1);
  };

  const stepMonth = (delta: -1 | 1) => {
    if (isFiscal) {
      const next = stepEthiopianMonth(ethYear, ethMonth, delta);
      const nextRange = getEthiopianMonthRange(next.year, next.month);
      setEthYear(next.year);
      setEthMonth(next.month);

      if (
        selectedDate < nextRange.startIso ||
        selectedDate > nextRange.endIso
      ) {
        selectDate(nextRange.startIso);
      }
      return;
    }

    const next = new Date(year, month + delta, 1);
    const nextYear = next.getFullYear();
    const nextMonth = next.getMonth();
    const nextStart = gregorianMonthStartIso(nextYear, nextMonth);
    const daysInNextMonth = new Date(
      Date.UTC(nextYear, nextMonth + 1, 0),
    ).getUTCDate();
    const nextEnd = `${nextYear}-${pad2(nextMonth + 1)}-${pad2(daysInNextMonth)}`;

    setYear(nextYear);
    setMonth(nextMonth);

    if (selectedDate < nextStart || selectedDate > nextEnd) {
      selectDate(nextStart);
    }
  };

  const jumpToDemoWeek = () => {
    const eth = gregorianToEthiopian(DEMO_DATE);
    setYear(DEMO_YEAR);
    setMonth(DEMO_GREGORIAN_MONTH);
    setEthYear(eth.year);
    setEthMonth(eth.month);
    setSelectedDate(DEMO_DATE);
  };

  const switchMode = (nextMode: CalendarMode) => {
    if (nextMode === mode) return;

    setMode(nextMode);

    const eth = gregorianToEthiopian(selectedDate);
    setEthYear(eth.year);
    setEthMonth(eth.month);

    const gregorian = getGregorianDateParts(selectedDate);
    setYear(gregorian.year);
    setMonth(gregorian.month - 1);
  };

  const toggleEventStatus = (id: string) => {
    onEventsChange(
      events.map((ev) =>
        ev.id === id
          ? {
              ...ev,
              status: ev.status === "COMPLETED" ? "SCHEDULED" : "COMPLETED",
            }
          : ev,
      ),
    );
  };

  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const created: ScheduleEvent = {
      id: `ev-${Date.now()}`,
      title: newTitle.trim(),
      contractRef: newContractRef.trim() || "CNT-809",
      date: newDate,
      time: newTime,
      type: newType,
      amountMinor: Math.max(0, Math.round(Number(newAmountETB || 0) * 100)),
      rail: "TELEBIRR",
      status: "SCHEDULED",
      counterparty: newCounterparty.trim() || "Marketplace Counterparty",
    };
    onEventsChange([...events, created]);
    selectDate(newDate);
    setNewTitle("");
    setCreateOpen(false);
  };

  const openCreateForSelectedDate = () => {
    setNewDate(selectedDate);
    setCreateOpen(true);
  };

  return (
    <div className="sh-card">
      <div className="sh-card-header">
        <div>
          <h3 className="sh-card-title">Milestone, Payout & SLA Schedule</h3>
          <p className="sh-card-desc">
            Track upcoming contract deadlines, auto-release windows, and
            compliance checkpoints across the Gregorian and Ethiopian fiscal
            calendars
          </p>
        </div>

        <button
          type="button"
          className="sh-btn sh-btn-primary"
          onClick={openCreateForSelectedDate}
        >
          <Plus size={14} /> Schedule Deadline
        </button>
      </div>

      {/* Filter & Month Navigation Bar */}
      <div className="sh-table-toolbar">
        <div className="sh-cal-nav">
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={() => stepMonth(-1)}
            aria-label={
              isFiscal ? "Previous Ethiopian month" : "Previous month"
            }
          >
            <ChevronLeft size={15} />
          </button>

          <div className="sh-cal-month-label">
            <strong className="sh-cal-month-title">{monthLabel}</strong>
            <span className="sh-cal-month-sub">{monthSubLabel}</span>
          </div>

          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={() => stepMonth(1)}
            aria-label={isFiscal ? "Next Ethiopian month" : "Next month"}
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={jumpToDemoWeek}
            style={{ marginLeft: 6 }}
          >
            Oct 2026
          </button>

          <div
            className="sh-segmented sh-cal-mode-toggle"
            role="group"
            aria-label="Calendar system"
          >
            <button
              type="button"
              className={`sh-seg-btn ${mode === "gregorian" ? "active" : ""}`}
              aria-pressed={mode === "gregorian"}
              onClick={() => switchMode("gregorian")}
            >
              Gregorian
            </button>
            <button
              type="button"
              className={`sh-seg-btn ${mode === "fiscal" ? "active" : ""}`}
              aria-pressed={mode === "fiscal"}
              onClick={() => switchMode("fiscal")}
            >
              Ethiopian Fiscal
            </button>
          </div>
        </div>

        <div
          className="sh-segmented"
          role="group"
          aria-label="Filter calendar by event type"
        >
          {(
            [
              ["ALL", "All Events"],
              ["MILESTONE_DUE", "Milestone Due"],
              ["PAYOUT_RELEASE", "Payout Release"],
              ["PROPOSAL_DEADLINE", "Proposals"],
              ["COMPLIANCE_KYC", "Compliance SLA"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`sh-seg-btn ${typeFilter === key ? "active" : ""}`}
              aria-pressed={typeFilter === key}
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Ethiopian Fiscal Year Context */}
      {fiscalView && (
        <div className="sh-fiscal-bar">
          <div className="sh-fiscal-summary">
            <span className="sh-fiscal-eyebrow">Ethiopian Fiscal Year</span>
            <div className="sh-fiscal-title-row">
              <strong>{fiscalView.info.label}</strong>
              <span className="sh-fiscal-year-greg">
                {fiscalView.info.gregorianLabel}
              </span>
            </div>
            <span className="sh-fiscal-range">
              Hamle 1, {fiscalView.fiscalYear - 1} – Sene 30,{" "}
              {fiscalView.fiscalYear} E.C.
              <span className="sh-fiscal-range-sep"> · </span>
              {fiscalView.info.rangeLabel}
            </span>
          </div>

          <div
            className="sh-fiscal-quarters"
            role="group"
            aria-label={`Fiscal quarters for ${fiscalView.info.label}`}
          >
            {fiscalView.quarters.map((quarter) => {
              const isActive = fiscalView.activeQuarter === quarter.quarter;
              const targetDate = quarter.firstEventDate ?? quarter.startIso;

              return (
                <button
                  key={quarter.quarter}
                  type="button"
                  className={`sh-fiscal-quarter ${isActive ? "active" : ""}`}
                  aria-pressed={isActive}
                  title={`${quarter.label} · ${quarter.monthLabel}: ${formatGregorianDateRange(
                    quarter.startIso,
                    quarter.endIso,
                  )}`}
                  onClick={() => selectDate(targetDate)}
                >
                  <span className="sh-fiscal-quarter-label">
                    {quarter.label}
                  </span>
                  <span className="sh-fiscal-quarter-months">
                    {quarter.monthLabel}
                  </span>
                  <span className="sh-fiscal-quarter-meta">
                    {quarter.eventCount}{" "}
                    {quarter.eventCount === 1 ? "item" : "items"}
                    {quarter.totalMinor > 0
                      ? ` · ETB ${(quarter.totalMinor / 100).toLocaleString()}`
                      : ""}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Mobile Quick-Jump Date Strip (visible on <= 768px) */}
      <div
        className="sh-cal-mobile-strip"
        role="region"
        aria-label="Scheduled dates in the visible month"
      >
        {mobileDates.map(([dateStr, list]) => {
          const isSelected = selectedDate === dateStr;
          return (
            <button
              key={dateStr}
              type="button"
              className={`sh-cal-mobile-pill ${isSelected ? "active" : ""}`}
              aria-pressed={isSelected}
              onClick={() => selectDate(dateStr)}
            >
              <span className="sh-mono">
                {isFiscal
                  ? formatEthiopianDate(dateStr, "short")
                  : formatGregorianDate(dateStr, "short")}
              </span>
              <span className="sh-mono sh-cal-mobile-pill-count">
                {list.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Split Layout: Month Grid + Right Agenda Inspector */}
      <div className="sh-cal-split">
        <div className="sh-cal-grid-wrap">
          <div className="sh-cal-weekdays">
            {WEEKDAYS.map((w) => (
              <div key={w} className="sh-cal-weekday">
                {w}
              </div>
            ))}
          </div>

          <div className="sh-cal-days">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`empty-${idx}`} className="sh-cal-cell empty" />;
              }
              const dayEvents = eventsByDate.get(cell.dateStr) ?? [];
              const isSelected = selectedDate === cell.dateStr;
              const dayTotalMinor = dayEvents.reduce(
                (sum, ev) => sum + ev.amountMinor,
                0,
              );
              const itemLabel =
                dayEvents.length === 0
                  ? "no scheduled items"
                  : `${dayEvents.length} ${dayEvents.length === 1 ? "item" : "items"}`;

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  className={`sh-cal-cell ${isSelected ? "selected" : ""} ${dayEvents.length > 0 ? "has-events" : ""}`}
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={`${formatGregorianDate(cell.dateStr, "long")}, ${formatEthiopianDate(
                    cell.dateStr,
                    "long",
                  )}, ${itemLabel}`}
                  onClick={() => selectDate(cell.dateStr)}
                >
                  <div className="sh-cal-cell-head">
                    <span className="sh-cal-day-stack">
                      <span className="sh-mono sh-cal-day-num">{cell.day}</span>
                      {isFiscal && cell.altLabel && (
                        <span className="sh-mono sh-cal-alt-date">
                          {cell.altLabel}
                        </span>
                      )}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="sh-mono sh-cal-day-count">
                        {dayEvents.length}{" "}
                        {dayEvents.length === 1 ? "item" : "items"}
                      </span>
                    )}
                  </div>

                  <div className="sh-cal-cell-events">
                    {dayEvents.slice(0, 2).map((ev) => (
                      <div
                        key={ev.id}
                        className={`sh-cal-event-line ${ev.status === "AT_RISK" ? "crimson" : ev.status === "COMPLETED" ? "muted" : "emerald"}`}
                      >
                        <span className="sh-truncate">{ev.title}</span>
                      </div>
                    ))}
                    {dayTotalMinor > 0 && (
                      <div className="sh-cal-day-vol sh-mono">
                        ETB {(dayTotalMinor / 100).toLocaleString()}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right-hand Agenda Inspector */}
        <aside className="sh-cal-agenda">
          <div className="sh-cal-agenda-head">
            <div>
              <span
                className="sh-mono sh-text-muted"
                style={{ fontSize: "0.75rem" }}
              >
                Selected Date
              </span>
              <h4>{formatGregorianDate(selectedDate, "long")}</h4>
              <p className="sh-cal-dual-date">
                {formatEthiopianDate(selectedDate, "long")}
              </p>
              <p className="sh-cal-amharic-date">
                {formatEthiopianDateAmharic(selectedDate)}
              </p>
            </div>
            <CalendarIcon size={16} className="sh-text-muted" />
          </div>

          <div className="sh-cal-fiscal-context">
            <span className="sh-cal-fiscal-context-label">Fiscal period</span>
            <strong>
              EFY {selectedFiscal.fiscalYear} E.C. · Q
              {selectedFiscal.quarter}
            </strong>
            <span className="sh-cal-fiscal-context-months">
              {selectedFiscal.monthLabel}
            </span>
            <span className="sh-mono sh-cal-fiscal-context-range">
              {formatGregorianDateRange(
                selectedFiscal.startIso,
                selectedFiscal.endIso,
              )}
            </span>
          </div>

          <div className="sh-cal-agenda-list">
            {eventsByDate.get(selectedDate)?.length ? null : (
              <div className="sh-kanban-empty">
                <p style={{ margin: "0 0 8px" }}>
                  No scheduled milestones or payouts on{" "}
                  {formatGregorianDate(selectedDate, "long")}.
                </p>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={openCreateForSelectedDate}
                >
                  <Plus size={13} /> Add Item for{" "}
                  {formatGregorianDate(selectedDate, "medium")}
                </button>
              </div>
            )}

            {(eventsByDate.get(selectedDate) ?? []).map((ev) => (
              <article key={ev.id} className="sh-agenda-item">
                <div className="sh-cell-meta">
                  <span className="sh-mono">{ev.time}</span>
                  <span aria-hidden="true">·</span>
                  <span>{TYPE_LABELS[ev.type]}</span>
                  <span aria-hidden="true">·</span>
                  <span className="sh-mono">{ev.contractRef}</span>
                </div>

                <h5 className="sh-agenda-title">{ev.title}</h5>

                <div className="sh-cell-meta" style={{ marginTop: 4 }}>
                  <span>{ev.counterparty}</span>
                  <span aria-hidden="true">·</span>
                  <span>{ev.rail.replace("_", " ")}</span>
                </div>

                <div className="sh-agenda-foot">
                  <strong className="sh-mono">
                    ETB {(ev.amountMinor / 100).toLocaleString()}
                  </strong>

                  <button
                    type="button"
                    className="sh-row-action-btn"
                    onClick={() => toggleEventStatus(ev.id)}
                  >
                    {ev.status === "COMPLETED" ? (
                      <>
                        <CheckCircle2 size={12} /> Completed
                      </>
                    ) : ev.status === "AT_RISK" ? (
                      <>
                        <AlertTriangle size={12} /> SLA At Risk
                      </>
                    ) : (
                      <>
                        <Clock size={12} /> Mark Complete
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>

          {/* Upcoming Summary across Month */}
          <div className="sh-cal-upcoming-summary">
            <div className="sh-dropdown-title">Upcoming Month Highlights</div>
            {upcomingEvents.length === 0 && (
              <span className="sh-cal-upcoming-empty">
                No items match this filter.
              </span>
            )}
            {upcomingEvents.map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="sh-upcoming-row"
                title={`${formatGregorianDate(ev.date, "long")} · ${formatEthiopianDate(ev.date, "long")}`}
                onClick={() => selectDate(ev.date)}
              >
                <span className="sh-mono sh-text-muted">
                  {isFiscal
                    ? formatEthiopianDate(ev.date, "short")
                    : formatGregorianDate(ev.date, "short")}
                </span>
                <span
                  className="sh-truncate"
                  style={{ flex: 1, textAlign: "left" }}
                >
                  {ev.title}
                </span>
                <strong className="sh-mono">
                  ETB {(ev.amountMinor / 100).toLocaleString()}
                </strong>
              </button>
            ))}
          </div>
        </aside>
      </div>

      {/* Schedule Event Modal */}
      {createOpen && (
        <div
          className="sh-sheet-backdrop"
          onClick={() => setCreateOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Schedule deadline"
        >
          <aside
            className="sh-sheet-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sh-sheet-header">
              <div>
                <h3 className="sh-sheet-title">Schedule Milestone or Payout</h3>
                <p className="sh-sheet-subtitle">
                  Add a deadline or escrow release checkpoint to your workspace
                  calendar
                </p>
              </div>
              <button
                type="button"
                className="sh-icon-only-btn"
                onClick={() => setCreateOpen(false)}
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <form className="sh-sheet-body" onSubmit={handleCreateEvent}>
              <label className="sh-form-field">
                <span>Event Title</span>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Phase 2 Acceptance Sign-Off"
                />
              </label>

              <div className="sh-customizer-grid-2">
                <label className="sh-form-field">
                  <span>Date</span>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                  />
                  {isValidIsoDate(newDate) && (
                    <small className="sh-form-hint">
                      {formatEthiopianDate(newDate, "long")} · EFY{" "}
                      {getFiscalYear(newDate)} E.C. · Q
                      {getFiscalQuarter(newDate).quarter}
                    </small>
                  )}
                </label>

                <label className="sh-form-field">
                  <span>Time (EAT)</span>
                  <input
                    type="text"
                    required
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                  />
                </label>
              </div>

              <div className="sh-customizer-grid-2">
                <label className="sh-form-field">
                  <span>Event Type</span>
                  <select
                    className="sh-select"
                    value={newType}
                    onChange={(e) =>
                      setNewType(e.target.value as ScheduleEventType)
                    }
                  >
                    <option value="MILESTONE_DUE">Milestone Due</option>
                    <option value="PAYOUT_RELEASE">Payout Release</option>
                    <option value="PROPOSAL_DEADLINE">Proposal Deadline</option>
                    <option value="COMPLIANCE_KYC">Compliance SLA</option>
                  </select>
                </label>

                <label className="sh-form-field">
                  <span>Amount (ETB)</span>
                  <input
                    type="number"
                    required
                    value={newAmountETB}
                    onChange={(e) => setNewAmountETB(e.target.value)}
                  />
                </label>
              </div>

              <div className="sh-customizer-grid-2">
                <label className="sh-form-field">
                  <span>Contract Reference</span>
                  <input
                    type="text"
                    required
                    value={newContractRef}
                    onChange={(e) => setNewContractRef(e.target.value)}
                  />
                </label>

                <label className="sh-form-field">
                  <span>Counterparty</span>
                  <input
                    type="text"
                    required
                    value={newCounterparty}
                    onChange={(e) => setNewCounterparty(e.target.value)}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button
                  type="submit"
                  className="sh-btn sh-btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  Save to Schedule
                </button>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </aside>
        </div>
      )}
    </div>
  );
}
