import { useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import type { ScheduleEvent, ScheduleEventType } from "./dashboardData";
import { useI18n } from "../../i18n";
import { DASHBOARD_COPY } from "./dashboardCopy";
import { railLabel } from "./dashboardData";
import { ContextualHelpTrigger } from "../guide/ContextualHelpTrigger";
import { getTodayAddisIso } from "./KanbanBoardView";

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
  getFiscalYearForEthiopianMonth,
  getFiscalYearInfo,
  getGregorianDateParts,
  gregorianToEthiopian,
  stepEthiopianMonth,
} from "../../lib/ethiopianCalendar";

interface CalendarScheduleViewProps {
  events: ScheduleEvent[];
  onOpenEscrow?: (milestoneId?: string) => void;
}

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
  onOpenEscrow,
}: CalendarScheduleViewProps) {
  const { language } = useI18n();
  const copy = (DASHBOARD_COPY[language] ?? DASHBOARD_COPY.en).calendar;
  const todayIso = useMemo(() => getTodayAddisIso(), []);
  const initialGregorian = useMemo(() => getGregorianDateParts(todayIso), [todayIso]);
  const initialEthiopian = useMemo(() => gregorianToEthiopian(todayIso), [todayIso]);

  const [mode, setMode] = useState<CalendarMode>("gregorian");
  const [year, setYear] = useState(initialGregorian.year);
  const [month, setMonth] = useState(initialGregorian.month - 1);
  const [ethYear, setEthYear] = useState(initialEthiopian.year);
  const [ethMonth, setEthMonth] = useState(initialEthiopian.month);
  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [typeFilter, setTypeFilter] = useState<"ALL" | ScheduleEventType>("ALL");

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

  const jumpToToday = () => {
    const today = getTodayAddisIso();
    const greg = getGregorianDateParts(today);
    const eth = gregorianToEthiopian(today);
    setYear(greg.year);
    setMonth(greg.month - 1);
    setEthYear(eth.year);
    setEthMonth(eth.month);
    setSelectedDate(today);
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

  return (
    <div className="sh-card" data-tour="dashboard-calendar">
      <div className="sh-card-header">
        <div>
          <div className="yk-help-heading-row">
            <h3 className="sh-card-title">{copy.title}</h3>
            <ContextualHelpTrigger helpId="dashboard-calendar" />
          </div>
          <p className="sh-card-desc">
            {copy.subtitle}
          </p>
        </div>
      </div>

      {/* Filter & Month Navigation Bar */}
      <div className="sh-table-toolbar">
        <div className="sh-cal-nav">
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={() => stepMonth(-1)}
            aria-label={
              isFiscal ? copy.prevEthMonthAria : copy.prevMonthAria
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
            aria-label={isFiscal ? copy.nextEthMonthAria : copy.nextMonthAria}
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={jumpToToday}
            style={{ marginLeft: 6 }}
          >
            {copy.todayBtn}
          </button>

          <div
            className="sh-segmented sh-cal-mode-toggle"
            role="group"
            aria-label={copy.calendarSystemAria}
          >
            <button
              type="button"
              className={`sh-seg-btn ${mode === "gregorian" ? "active" : ""}`}
              aria-pressed={mode === "gregorian"}
              onClick={() => switchMode("gregorian")}
            >
              {copy.modeGregorian}
            </button>
            <button
              type="button"
              className={`sh-seg-btn ${mode === "fiscal" ? "active" : ""}`}
              aria-pressed={mode === "fiscal"}
              onClick={() => switchMode("fiscal")}
            >
              {copy.modeFiscal}
            </button>
          </div>
        </div>

        <div
          className="sh-segmented"
          role="group"
          aria-label={copy.filterTypeAria}
        >
          {(
            [
              ["ALL", copy.filterAllEvents],
              ["MILESTONE_DUE", copy.typeLabels.MILESTONE_DUE],
              ["PAYOUT_RELEASE", copy.typeLabels.PAYOUT_RELEASE],
              ["PROPOSAL_DEADLINE", copy.filterProposals],
              ["COMPLIANCE_KYC", copy.typeLabels.COMPLIANCE_KYC],
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
            <span className="sh-fiscal-eyebrow">{copy.fiscalYearEyebrow}</span>
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
            aria-label={copy.fiscalQuartersAria(fiscalView.info.label)}
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
                    {copy.itemsCount(quarter.eventCount)}
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
        aria-label={copy.mobileDatesAria}
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
            {copy.weekdays.map((w) => (
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
              const isToday = todayIso === cell.dateStr;
              const dayTotalMinor = dayEvents.reduce(
                (sum, ev) => sum + ev.amountMinor,
                0,
              );
              const itemLabel =
                dayEvents.length === 0
                  ? copy.noScheduledItems
                  : copy.itemsCount(dayEvents.length);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  className={`sh-cal-cell ${isSelected ? "selected" : ""} ${isToday ? "today" : ""} ${dayEvents.length > 0 ? "has-events" : ""}`}
                  aria-current={isToday ? "date" : undefined}
                  aria-label={`${formatGregorianDate(cell.dateStr, "long")}, ${formatEthiopianDate(
                    cell.dateStr,
                    "long",
                  )}, ${itemLabel}`}
                  onClick={() => selectDate(cell.dateStr)}
                >
                  <div className="sh-cal-cell-head">
                    <span className="sh-cal-day-stack">
                      <span className="sh-mono sh-cal-day-num">{cell.day}</span>
                      {isToday && (
                        <span className="sh-cal-today-tag">{copy.todayBadge}</span>
                      )}
                      {isFiscal && cell.altLabel && (
                        <span className="sh-mono sh-cal-alt-date">
                          {cell.altLabel}
                        </span>
                      )}
                    </span>
                    {dayEvents.length > 0 && (
                      <span className="sh-mono sh-cal-day-count">
                        {copy.itemsCount(dayEvents.length)}
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
                {copy.selectedDateLabel}
                {selectedDate === todayIso ? ` · ${copy.todayBadge}` : ""}
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
            <span className="sh-cal-fiscal-context-label">{copy.fiscalPeriodLabel}</span>
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
                <p style={{ margin: 0 }}>
                  {copy.noItemsOnDate(formatGregorianDate(selectedDate, "long"))}
                </p>
              </div>
            )}

            {(eventsByDate.get(selectedDate) ?? []).map((ev) => (
              <article key={ev.id} className="sh-agenda-item">
                <div className="sh-cell-meta">
                  <span className="sh-mono">{ev.time}</span>
                  <span aria-hidden="true">·</span>
                  <span>{copy.typeLabels[ev.type]}</span>
                  <span aria-hidden="true">·</span>
                  <span className="sh-mono">{ev.contractRef}</span>
                </div>

                <h5 className="sh-agenda-title">{ev.title}</h5>

                <div className="sh-cell-meta" style={{ marginTop: 4 }}>
                  <span>{ev.counterparty}</span>
                  <span aria-hidden="true">·</span>
                  <span>{railLabel(ev.rail)}</span>
                </div>

                <div className="sh-agenda-foot">
                  <strong className="sh-mono">
                    ETB {(ev.amountMinor / 100).toLocaleString()}
                  </strong>

                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <span
                      className={`sh-status-inline ${ev.status === "AT_RISK" ? "crimson" : ev.status === "COMPLETED" ? "emerald" : "amber"}`}
                    >
                      {ev.status === "COMPLETED" ? (
                        <>
                          <CheckCircle2 size={12} /> <span>{copy.statusCompleted}</span>
                        </>
                      ) : ev.status === "AT_RISK" ? (
                        <>
                          <AlertTriangle size={12} /> <span>{copy.statusAtRisk}</span>
                        </>
                      ) : (
                        <>
                          <Clock size={12} /> <span>{copy.typeLabels[ev.type]}</span>
                        </>
                      )}
                    </span>
                    {ev.milestoneId && onOpenEscrow && (
                      <button
                        type="button"
                        className="sh-row-action-btn"
                        onClick={() => onOpenEscrow(ev.milestoneId)}
                      >
                        {copy.openEscrowBtn} <ExternalLink size={11} />
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>

          {/* Upcoming Summary across Month */}
          <div className="sh-cal-upcoming-summary">
            <div className="sh-dropdown-title">{copy.upcomingTitle}</div>
            {upcomingEvents.length === 0 && (
              <span className="sh-cal-upcoming-empty">
                {copy.upcomingEmpty}
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
    </div>
  );
}
