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

export function CalendarScheduleView({
  events,
  onEventsChange,
}: CalendarScheduleViewProps) {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(9); // 0-indexed: 9 = October 2026
  const [selectedDate, setSelectedDate] = useState("2026-10-21");
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
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    // Convert Sunday=0..Saturday=6 into Monday=0..Sunday=6
    const startOffset = (firstDay.getDay() + 6) % 7;

    const cells: { dateStr: string | null; dayNum: number | null }[] = [];
    for (let i = 0; i < startOffset; i++) {
      cells.push({ dateStr: null, dayNum: null });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, "0");
      const dStr = String(d).padStart(2, "0");
      cells.push({
        dateStr: `${year}-${mStr}-${dStr}`,
        dayNum: d,
      });
    }
    return cells;
  }, [year, month]);

  const monthLabel = new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const stepMonth = (delta: -1 | 1) => {
    const d = new Date(year, month + delta, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const selectedDayEvents = eventsByDate.get(selectedDate) ?? [];

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
    setSelectedDate(newDate);
    setNewTitle("");
    setCreateOpen(false);
  };

  return (
    <div className="sh-card">
      <div className="sh-card-header">
        <div>
          <h3 className="sh-card-title">Milestone, Payout & SLA Schedule</h3>
          <p className="sh-card-desc">
            Track upcoming contract deadlines, auto-release windows, and compliance checkpoints
          </p>
        </div>

        <button
          type="button"
          className="sh-btn sh-btn-primary"
          onClick={() => {
            setNewDate(selectedDate);
            setCreateOpen(true);
          }}
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
            aria-label="Previous month"
          >
            <ChevronLeft size={15} />
          </button>
          <strong className="sh-cal-month-title">{monthLabel}</strong>
          <button
            type="button"
            className="sh-icon-only-btn"
            onClick={() => stepMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight size={15} />
          </button>
          <button
            type="button"
            className="sh-btn sh-btn-secondary"
            onClick={() => {
              setYear(2026);
              setMonth(9);
              setSelectedDate("2026-10-21");
            }}
            style={{ marginLeft: 6 }}
          >
            Oct 2026
          </button>
        </div>

        <div className="sh-segmented" role="group" aria-label="Filter calendar by event type">
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
              onClick={() => setTypeFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
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
              if (!cell.dateStr || !cell.dayNum) {
                return <div key={`empty-${idx}`} className="sh-cal-cell empty" />;
              }
              const dayEvents = eventsByDate.get(cell.dateStr) ?? [];
              const isSelected = selectedDate === cell.dateStr;
              const dayTotalMinor = dayEvents.reduce((s, e) => s + e.amountMinor, 0);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  className={`sh-cal-cell ${isSelected ? "selected" : ""} ${dayEvents.length > 0 ? "has-events" : ""}`}
                  onClick={() => setSelectedDate(cell.dateStr!)}
                >
                  <div className="sh-cal-cell-head">
                    <span className="sh-mono sh-cal-day-num">{cell.dayNum}</span>
                    {dayEvents.length > 0 && (
                      <span className="sh-mono sh-cal-day-count">
                        {dayEvents.length} {dayEvents.length === 1 ? "item" : "items"}
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
              <span className="sh-mono sh-text-muted" style={{ fontSize: "0.75rem" }}>
                Selected Date
              </span>
              <h4>{selectedDate}</h4>
            </div>
            <CalendarIcon size={16} className="sh-text-muted" />
          </div>

          <div className="sh-cal-agenda-list">
            {selectedDayEvents.length === 0 ? (
              <div className="sh-kanban-empty">
                <p style={{ margin: "0 0 8px" }}>
                  No scheduled milestones or payouts on {selectedDate}.
                </p>
                <button
                  type="button"
                  className="sh-btn sh-btn-secondary"
                  onClick={() => {
                    setNewDate(selectedDate);
                    setCreateOpen(true);
                  }}
                >
                  <Plus size={13} /> Add Item for {selectedDate}
                </button>
              </div>
            ) : (
              selectedDayEvents.map((ev) => (
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
              ))
            )}
          </div>

          {/* Upcoming Summary across Month */}
          <div className="sh-cal-upcoming-summary">
            <div className="sh-dropdown-title">Upcoming Month Highlights</div>
            {filteredEvents.slice(0, 4).map((ev) => (
              <button
                key={ev.id}
                type="button"
                className="sh-upcoming-row"
                onClick={() => setSelectedDate(ev.date)}
              >
                <span className="sh-mono sh-text-muted">{ev.date.slice(5)}</span>
                <span className="sh-truncate" style={{ flex: 1, textAlign: "left" }}>
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
                  Add a deadline or escrow release checkpoint to your workspace calendar
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
