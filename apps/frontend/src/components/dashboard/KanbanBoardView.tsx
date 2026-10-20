import React, { useMemo, useState } from "react";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  GripVertical,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import type { KanbanColumnId, KanbanTask } from "./dashboardData";

interface KanbanBoardViewProps {
  tasks: KanbanTask[];
  onTasksChange: (next: KanbanTask[]) => void;
}

const COLUMNS: {
  id: KanbanColumnId;
  title: string;
  subtitle: string;
}[] = [
  {
    id: "BACKLOG",
    title: "Scoping & Awaiting Funding",
    subtitle: "Drafted milestones",
  },
  {
    id: "ESCROW_HELD",
    title: "Escrow Funded",
    subtitle: "Locked in Yekis vault",
  },
  {
    id: "WORK_IN_PROGRESS",
    title: "In Active Delivery",
    subtitle: "Freelancer executing",
  },
  {
    id: "SUBMITTED_FOR_REVIEW",
    title: "Submitted for Review",
    subtitle: "Client QA window",
  },
  {
    id: "RELEASED",
    title: "Released & Settled",
    subtitle: "Disbursed to wallet",
  },
];

const COLUMN_ORDER: KanbanColumnId[] = COLUMNS.map((c) => c.id);

export function KanbanBoardView({ tasks, onTasksChange }: KanbanBoardViewProps) {
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<
    "ALL" | "HIGH" | "MEDIUM" | "LOW"
  >("ALL");
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanColumnId | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [activeMobileColumn, setActiveMobileColumn] =
    useState<KanbanColumnId>("ESCROW_HELD");

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newContract, setNewContract] = useState("Telebirr SuperApp Mini-Program");
  const [newCounterparty, setNewCounterparty] = useState("Hanna Tadesse");
  const [newAmountETB, setNewAmountETB] = useState("45000");
  const [newDueDate, setNewDueDate] = useState("2026-11-10");
  const [newPriority, setNewPriority] = useState<"HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [newRail, setNewRail] = useState<"TELEBIRR" | "CBE_BIRR" | "M_PESA">(
    "TELEBIRR",
  );
  const [newColumn, setNewColumn] = useState<KanbanColumnId>("ESCROW_HELD");

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tasks.filter((t) => {
      if (priorityFilter !== "ALL" && t.priority !== priorityFilter) return false;
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.contractTitle.toLowerCase().includes(q) ||
        t.counterparty.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q)
      );
    });
  }, [tasks, search, priorityFilter]);

  const moveTask = (taskId: string, targetCol: KanbanColumnId) => {
    onTasksChange(
      tasks.map((t) => (t.id === taskId ? { ...t, column: targetCol } : t)),
    );
  };

  const stepTask = (taskId: string, dir: -1 | 1) => {
    const item = tasks.find((t) => t.id === taskId);
    if (!item) return;
    const idx = COLUMN_ORDER.indexOf(item.column);
    const nextIdx = idx + dir;
    if (nextIdx < 0 || nextIdx >= COLUMN_ORDER.length) return;
    const nextCol = COLUMN_ORDER[nextIdx];
    moveTask(taskId, nextCol);
    setActiveMobileColumn(nextCol);
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const amountMinor = Math.max(10000, Math.round(Number(newAmountETB || 0) * 100));
    const created: KanbanTask = {
      id: `kb-${Date.now()}`,
      code: `MS-${Math.floor(2051 + Math.random() * 90)}`,
      title: newTitle.trim(),
      contractTitle: newContract.trim() || "Custom Service Agreement",
      counterparty: newCounterparty.trim() || "Verified Counterparty",
      rail: newRail,
      amountMinor,
      dueDate: newDueDate || "2026-11-15",
      priority: newPriority,
      column: newColumn,
      category: "Web app development",
    };
    onTasksChange([created, ...tasks]);
    setNewTitle("");
    setCreateOpen(false);
  };

  return (
    <div className="sh-card">
      <div className="sh-card-header">
        <div>
          <h3 className="sh-card-title">Milestone & Deliverable Kanban Pipeline</h3>
          <p className="sh-card-desc">
            Drag cards across columns or use stage controls to update escrow workflow state
          </p>
        </div>

        <button
          type="button"
          className="sh-btn sh-btn-primary"
          onClick={() => setCreateOpen(true)}
        >
          <Plus size={14} /> Add Milestone Task
        </button>
      </div>

      {/* Filter Bar */}
      <div className="sh-table-toolbar">
        <div className="sh-search-input-wrap">
          <Search size={14} />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tasks by title, code, or freelancer..."
            aria-label="Search Kanban tasks"
          />
        </div>

        <div className="sh-segmented" role="group" aria-label="Filter by priority">
          {(
            [
              ["ALL", "All Priorities"],
              ["HIGH", "High Priority"],
              ["MEDIUM", "Medium"],
              ["LOW", "Low"],
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
      </div>

      {/* Mobile Stage Tabs (visible on <= 768px) */}
      <div
        className="sh-kanban-mobile-tabs"
        role="tablist"
        aria-label="Kanban workflow stages"
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
              <span>{col.title}</span>
              <span className="sh-mono sh-kanban-mobile-tab-count">
                {colTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* 5-Column Kanban Board */}
      <div className="sh-kanban-grid">
        {COLUMNS.map((col) => {
          const colTasks = filteredTasks.filter((t) => t.column === col.id);
          const colTotalMinor = colTasks.reduce((sum, t) => sum + t.amountMinor, 0);
          const isDropTarget = dragOverCol === col.id;
          const isMobileActive = activeMobileColumn === col.id;

          return (
            <div
              key={col.id}
              className={`sh-kanban-col ${isDropTarget ? "drag-over" : ""} ${isMobileActive ? "mobile-active" : "sh-kanban-col-hidden-mobile"}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOverCol(col.id);
              }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverCol(null);
                if (draggedId) {
                  moveTask(draggedId, col.id);
                  setDraggedId(null);
                }
              }}
            >
              <div className="sh-kanban-col-head">
                <div>
                  <div className="sh-kanban-col-title-row">
                    <h4>{col.title}</h4>
                    <span className="sh-mono sh-kanban-count">{colTasks.length}</span>
                  </div>
                  <p className="sh-kanban-col-sub">
                    {col.subtitle} ·{" "}
                    <span className="sh-mono">
                      ETB {(colTotalMinor / 100).toLocaleString()}
                    </span>
                  </p>
                </div>
              </div>

              <div className="sh-kanban-cards">
                {colTasks.length === 0 ? (
                  <div className="sh-kanban-empty">
                    No milestones in this stage
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const colIdx = COLUMN_ORDER.indexOf(task.column);
                    return (
                      <article
                        key={task.id}
                        className="sh-kanban-card"
                        draggable
                        onDragStart={() => setDraggedId(task.id)}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverCol(null);
                        }}
                      >
                        <div className="sh-kanban-card-top">
                          <span className="sh-cell-meta">
                            <span className="sh-mono">{task.code}</span>
                            <span aria-hidden="true">·</span>
                            <span>{task.rail.replace("_", " ")}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`sh-priority-inline ${task.priority.toLowerCase()}`}
                            >
                              {task.priority === "HIGH" && <AlertCircle size={11} />}
                              {task.priority === "MEDIUM" && <Clock size={11} />}
                              {task.priority === "LOW" && <CheckCircle2 size={11} />}
                              {task.priority}
                            </span>
                          </span>
                          <GripVertical
                            size={13}
                            className="sh-text-muted"
                            aria-hidden="true"
                          />
                        </div>

                        <h5 className="sh-kanban-card-title">{task.title}</h5>

                        <div className="sh-cell-meta" style={{ marginTop: 4 }}>
                          <span>{task.contractTitle}</span>
                          <span aria-hidden="true">·</span>
                          <span>{task.counterparty}</span>
                        </div>

                        <div className="sh-kanban-card-foot">
                          <div>
                            <strong className="sh-mono sh-kanban-amount">
                              ETB {(task.amountMinor / 100).toLocaleString()}
                            </strong>
                            <span className="sh-cell-meta sh-mono" style={{ display: "block" }}>
                              Due {task.dueDate}
                            </span>
                          </div>

                          <div className="sh-kanban-step-btns">
                            <button
                              type="button"
                              className="sh-icon-only-btn compact"
                              disabled={colIdx <= 0}
                              onClick={() => stepTask(task.id, -1)}
                              title="Move to previous stage"
                              aria-label="Move to previous stage"
                            >
                              <ChevronLeft size={13} />
                            </button>
                            <button
                              type="button"
                              className="sh-icon-only-btn compact"
                              disabled={colIdx >= COLUMN_ORDER.length - 1}
                              onClick={() => stepTask(task.id, 1)}
                              title="Advance to next stage"
                              aria-label="Advance to next stage"
                            >
                              <ChevronRight size={13} />
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Milestone Task Modal */}
      {createOpen && (
        <div
          className="sh-sheet-backdrop"
          onClick={() => setCreateOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Add milestone task"
        >
          <aside
            className="sh-sheet-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sh-sheet-header">
              <div>
                <h3 className="sh-sheet-title">Add Milestone Task</h3>
                <p className="sh-sheet-subtitle">
                  Create a new deliverable card in the escrow workflow board
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

            <form className="sh-sheet-body" onSubmit={handleCreateTask}>
              <label className="sh-form-field">
                <span>Milestone Deliverable Title</span>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Phase 3: Telebirr Webhook Load Testing"
                />
              </label>

              <label className="sh-form-field">
                <span>Contract Name</span>
                <input
                  type="text"
                  required
                  value={newContract}
                  onChange={(e) => setNewContract(e.target.value)}
                />
              </label>

              <label className="sh-form-field">
                <span>Counterparty / Assignee</span>
                <input
                  type="text"
                  required
                  value={newCounterparty}
                  onChange={(e) => setNewCounterparty(e.target.value)}
                />
              </label>

              <div className="sh-customizer-grid-2">
                <label className="sh-form-field">
                  <span>Amount (ETB)</span>
                  <input
                    type="number"
                    min={100}
                    required
                    value={newAmountETB}
                    onChange={(e) => setNewAmountETB(e.target.value)}
                  />
                </label>

                <label className="sh-form-field">
                  <span>Due Date</span>
                  <input
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                  />
                </label>
              </div>

              <div className="sh-customizer-grid-2">
                <label className="sh-form-field">
                  <span>Payment Rail</span>
                  <select
                    className="sh-select"
                    value={newRail}
                    onChange={(e) =>
                      setNewRail(
                        e.target.value as "TELEBIRR" | "CBE_BIRR" | "M_PESA",
                      )
                    }
                  >
                    <option value="TELEBIRR">Telebirr</option>
                    <option value="CBE_BIRR">CBE Birr</option>
                    <option value="M_PESA">M-Pesa</option>
                  </select>
                </label>

                <label className="sh-form-field">
                  <span>Priority</span>
                  <select
                    className="sh-select"
                    value={newPriority}
                    onChange={(e) =>
                      setNewPriority(
                        e.target.value as "HIGH" | "MEDIUM" | "LOW",
                      )
                    }
                  >
                    <option value="HIGH">High</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="LOW">Low</option>
                  </select>
                </label>
              </div>

              <label className="sh-form-field">
                <span>Initial Workflow Stage</span>
                <select
                  className="sh-select"
                  value={newColumn}
                  onChange={(e) =>
                    setNewColumn(e.target.value as KanbanColumnId)
                  }
                >
                  {COLUMNS.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
                <button
                  type="submit"
                  className="sh-btn sh-btn-primary"
                  style={{ flex: 1, justifyContent: "center" }}
                >
                  <ShieldCheck size={14} /> Create Milestone Task
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
