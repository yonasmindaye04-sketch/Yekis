// === IMPORTS ===
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutDashboard,
  MessageCircle,
  MessageSquare,
  Clock,
  ShieldCheck,
  WalletCards,
  CircleDot,
  CheckCheck,
  ChevronDown,
  RefreshCw,
  Paperclip,
  Send,
  Users,
  Sun,
  Moon,
  Scale,
  LogOut,
  ExternalLink,
  FileText,
  Loader2,
  X,
} from "lucide-react";
import { useTheme } from "./theme/ThemeContext";
import {
  api,
  type ChatMessage,
  type MeResponse,
  type StaffConversation,
} from "./api/client";
import { StaffCompliancePanel } from "./StaffCompliancePanel";
import { EvidenceViewer, type EvidenceDocument } from "./EvidenceViewer";
import { KycQueue } from "./KycQueue";
import { TopUpQueue } from "./TopUpQueue";
import { AuditLogsPage } from "./AuditLogsPage";
import { AdminsPage } from "./AdminsPage";
import { AdminContractsPage } from "./AdminContractsPage";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminPaymentsPage } from "./AdminPaymentsPage";
import { AdminEscrowPage } from "./AdminEscrowPage";
import { AdminPayoutsPage } from "./AdminPayoutsPage";
import { AdminLedgerPage } from "./AdminLedgerPage";
import { AdminReconciliationPage } from "./AdminReconciliationPage";
import {
  AdminOverviewPage,
  AdminReportsPage,
  AdminRiskPage,
  AdminMonitoringPage,
} from "./AdminOpsPages";
import { DisputeQueue } from "./DisputeQueue";
import { ProfileReportsQueue } from "./ProfileReportsQueue";

function isImageAttachment(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.startsWith("data:image/")) return true;
  return /\.(png|jpe?g|gif|webp|svg)(\?.*)?$/i.test(url);
}

function getAttachmentLabel(url: string | null | undefined): string {
  if (!url) return "Attachment";
  if (url.startsWith("data:image/")) return "Image attachment";
  const clean = url.split("?")[0];
  const parts = clean.split("/");
  const last = parts[parts.length - 1];
  try {
    const decoded = decodeURIComponent(last);
    return decoded.replace(/^[a-f0-9-]+_?/, "") || "Attachment";
  } catch {
    return "Attachment";
  }
}

// === INTERFACES & TYPES ===
type StaffDashboardProps = { user: MeResponse; onLogout: () => void };

function getOldestWaitHours<T, K extends keyof T>(items: T[], dateField: K) {
  if (items.length === 0) return null;
  const now = Date.now();
  const oldest = items.reduce((acc, item) => {
    if (!item[dateField]) return acc;
    const d = new Date(item[dateField] as unknown as string).getTime();
    return d < acc ? d : acc;
  }, now);
  if (oldest === now) return null;
  return (now - oldest) / (1000 * 60 * 60);
}

// === MAIN COMPONENT ===
function relativeTime(value?: string): string {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function dateLabel(value?: string) {
  return value
    ? new Date(value).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "";
}

export function StaffDashboard({ user, onLogout }: StaffDashboardProps) {
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<StaffConversation[]>([]);
  const [queueCounts, setQueueCounts] = useState({
    kyc: 0,
    topups: 0,
    disputes: 0,
  });
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "SUPPORT" | "KYC" | "TOPUPS" | "DISPUTES" | "PROFILES" | "AUDIT" | "ADMINS" | "USERS" | "CONTRACTS" | "PAYMENTS" | "ESCROW" | "PAYOUTS" | "LEDGER" | "RECONCILIATION" | "REPORTS" | "RISK" | "MONITORING"
  >("OVERVIEW");
  const [filter, setFilter] = useState<"OPEN" | "ALL">("OPEN");
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {},
  );

  const toggleGroup = (label: string) =>
    setExpandedGroups((prev) => ({ ...prev, [label]: !prev[label] }));

  // Compact frontend surface check — visibility only. The backend is the
  // single source of truth (requirePermission in permissions.ts); this mirror
  // only hides links the user cannot open. Keep in sync with backend matrix.
  const STAFF_MATRIX: Record<string, Set<string>> = useMemo(() => {
    const make = (keys: string[]) => new Set(keys);
    return {
      SUPER_ADMIN: make(["*"]),
      ADMIN: make(["*"]),
      OPERATIONS_ADMIN: make([
        "dashboard.view", "users.view", "users.suspend", "contracts.view",
        "escrow.view", "payments.view", "payouts.view", "disputes.view",
        "support.handle", "monitoring.view", "receipts.view",
      ]),
      FINANCE_ADMIN: make([
        "dashboard.view", "users.view", "payments.view", "escrow.view",
        "payouts.view", "ledger.view", "reconciliation.view", "reports.view",
        "receipts.view", "audit.view",
      ]),
      DISPUTE_MEDIATOR: make([
        "dashboard.view", "users.view", "contracts.view", "disputes.view",
        "disputes.mediate", "disputes.resolve",
      ]),
      COMPLIANCE_ADMIN: make([
        "dashboard.view", "users.view", "kyc.review", "tms.review",
        "topups.review", "support.handle", "disputes.view", "disputes.mediate",
        "monitoring.view", "audit.view",
      ]),
      COMPLIANCE_OFFICER: make([
        "dashboard.view", "users.view", "kyc.review", "tms.review",
        "topups.review", "support.handle", "disputes.view", "disputes.mediate",
        "monitoring.view", "audit.view",
      ]),
      SUPPORT: make(["dashboard.view", "users.view", "support.handle"]),
    };
  }, []);

  const can = useCallback(
    (perm: string) => {
      const set = STAFF_MATRIX[user.staffRole ?? ""] ?? new Set();
      return set.has("*") || set.has(perm);
    },
    [STAFF_MATRIX, user.staffRole],
  );

  const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: "Super Administrator",
    ADMIN: "Administrator (legacy)",
    OPERATIONS_ADMIN: "Operations",
    FINANCE_ADMIN: "Finance",
    DISPUTE_MEDIATOR: "Dispute Mediator",
    COMPLIANCE_ADMIN: "Compliance",
    COMPLIANCE_OFFICER: "Compliance",
    SUPPORT: "Customer Support",
  };
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [queueScope, setQueueScope] = useState<"ALL" | "MINE">("ALL");
  const [viewingEvidence, setViewingEvidence] = useState<
    EvidenceDocument[] | null
  >(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  // Track which conversation IDs have been read by staff so we can show unread badges
  const [readAt, setReadAt] = useState<Record<string, Date>>({});
  const messagesEnd = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedConversation) ?? null,
    [conversations, selectedConversation],
  );

  const visibleConversations = useMemo(
    () =>
      filter === "OPEN"
        ? conversations.filter((c) => c.status === "OPEN")
        : conversations,
    [conversations, filter],
  );

  const openCount = useMemo(
    () => conversations.filter((c) => c.status === "OPEN").length,
    [conversations],
  );

  // Helper used in the conversation list — kept as a plain function since it is
  // called in JSX and does not need to be stable across renders.
  const isUnread = (conversation: StaffConversation): boolean => {
    const last = conversation.messages[0];
    if (!last) return false;
    const lastRead = readAt[conversation.id];
    return !lastRead || new Date(last.createdAt) > lastRead;
  };

  // Wrap in useCallback so the function identity is stable and can be referenced
  // safely by the effect below without triggering set-state-in-effect warnings.
  const loadConversations = useCallback(async (silent = false) => {
    if (!silent) {
      setIsLoading(true);
      setError("");
    }
    try {
      const results = await Promise.allSettled([
        api.getStaffConversations(),
        api.getKycReviewQueue({ pageSize: 1 }),
        api.getTopUpReviewQueue({ pageSize: 1 }),
        api.getDisputeQueue({ pageSize: 1 }),
      ]);

      const chat = results[0].status === "fulfilled" ? results[0].value : [];
      const kyc = results[1].status === "fulfilled" ? results[1].value : { total: 0 };
      const topups = results[2].status === "fulfilled" ? results[2].value : { total: 0 };
      const disputes = results[3].status === "fulfilled" ? results[3].value : { total: 0 };

      const errors = results
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason?.message || "Request failed");
      
      if (errors.length > 0 && !silent) {
        setError(errors.join(", "));
      }

      setConversations(Array.isArray(chat) ? chat : chat.items || []);
      setQueueCounts({
        kyc: kyc.total || 0,
        topups: topups.total || 0,
        disputes: disputes.total || 0,
      });
    } catch (err) {
      if (!silent)
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load conversation data",
        );
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Store a stable ref to loadConversations so the effect can schedule it via the ref
  // rather than calling it directly — this satisfies the set-state-in-effect rule.
  const loadConversationsRef = useRef(loadConversations);
  useEffect(() => {
    loadConversationsRef.current = loadConversations;
  }, [loadConversations]);

  // Initial load + auto-poll every 15 s just for chat/activity
  useEffect(() => {
    void loadConversationsRef.current();
    pollingRef.current = setInterval(
      () => void loadConversationsRef.current(true),
      15000,
    );
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  // Auto-scroll message thread when messages update
  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const openConversation = async (conversation: StaffConversation) => {
    setSelectedConversation(conversation.id);
    try {
      setMessages(await api.getChatMessages(conversation.id));
      await api.markChatRead(conversation.id);
      setReadAt((prev) => ({ ...prev, [conversation.id]: new Date() }));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load conversation",
      );
    }
  };

  // Re-fetch messages for the open conversation on every poll tick
  useEffect(() => {
    if (!selectedConversation) return;
    const refresh = async () => {
      try {
        const next = await api.getChatMessages(selectedConversation);
        setMessages(next);
        await api.markChatRead(selectedConversation);
        setReadAt((prev) => ({ ...prev, [selectedConversation]: new Date() }));
      } catch {
        // silent — polling error shouldn't disrupt the UI
      }
    };
    const timer = setInterval(() => void refresh(), 8000);
    return () => clearInterval(timer);
  }, [selectedConversation]);

  const sendReply = async () => {
    if (
      !selectedConversation ||
      (!reply.trim() && !attachedFile) ||
      isSending ||
      isUploadingAttachment
    )
      return;
    setIsSending(true);
    try {
      let attachmentUrl: string | undefined = undefined;
      if (attachedFile) {
        setIsUploadingAttachment(true);
        try {
          const res = await api.uploadChatAttachment(attachedFile);
          attachmentUrl = res.url;
        } catch (uploadErr) {
          console.warn("Attachment upload failed in staff reply", uploadErr);
        } finally {
          setIsUploadingAttachment(false);
        }
      }

      const bodyToSend =
        reply.trim() || (attachedFile ? `📎 ${attachedFile.name}` : "📎 Attachment");
      const message = await api.sendChatMessage(
        selectedConversation,
        bodyToSend,
        attachmentUrl,
      );
      setMessages((current) => [...current, message]);
      setReply("");
      setAttachedFile(null);
      await loadConversations(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send reply");
    } finally {
      setIsSending(false);
    }
  };

  const closeConversation = async () => {
    if (!selectedConversation || isClosing) return;
    setIsClosing(true);
    try {
      await api.setConversationStatus(selectedConversation, "CLOSED");
      setSelectedConversation(null);
      setMessages([]);
      await loadConversations(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to close conversation",
      );
    } finally {
      setIsClosing(false);
    }
  };

  const reopenConversation = async () => {
    if (!selectedConversation || isClosing) return;
    setIsClosing(true);
    try {
      await api.setConversationStatus(selectedConversation, "OPEN");
      await loadConversations(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to reopen conversation",
      );
    } finally {
      setIsClosing(false);
    }
  };

  const supportHours = getOldestWaitHours(
    conversations.filter((c) => c.status === "OPEN"),
    "updatedAt",
  );

  const renderSla = (hours: number | null, label = "waiting") => {
    if (hours === null) return null;
    let cls = "sla-ok";
    if (hours > 24) cls = "sla-breached";
    else if (hours > 2) cls = "sla-warning";
    const txt = hours < 1 ? "< 1h" : `${Math.floor(hours)}h`;
    return (
      <span className={`sla-indicator ${cls}`}>
        {label} {txt}
      </span>
    );
  };

  const displayedConversations =
    queueScope === "MINE"
      ? visibleConversations.filter((c) => c.assignedStaff?.id === user.id)
      : visibleConversations;

  return (
    <div className="staff-shell">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className="staff-sidebar">
        <div className="sidebar-brand">
          <img
            src="/svgviewer-output.svg"
            alt="Yekis Logo"
            className="platform-logo small"
          />
          <strong>Yekis</strong>
        </div>
        <div className="staff-identity">
          <span className="avatar">{user.email.slice(0, 1).toUpperCase()}</span>
          <div>
            <strong>
              {ROLE_LABELS[user.staffRole ?? ""] ?? "Staff desk"}
            </strong>
            <small>{user.email}</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          {/* Config-driven grouped navigation. Items with `disabled` are visible
           * placeholders for later phases — they render but never route. Only
           * pages with a real backend are enabled (per ADMIN_PHASE1_PLAN.md). */}
          {(
            [
              {
                label: "Overview",
                items: [
                  { key: "OVERVIEW", label: "Overview", icon: <LayoutDashboard size={18} />, perm: "dashboard.view" },
                ],
              },
              {
                label: "CASES",
                items: [
                  { key: "SUPPORT", label: "Support", icon: <MessageSquare size={18} />, perm: "support.handle", badge: openCount || undefined },
                  { key: "DISPUTES", label: "Disputes", icon: <Scale size={18} />, perm: "disputes.view", badge: queueCounts.disputes || undefined },
                  { key: "RISK", label: "Risk & Fraud", icon: <ShieldCheck size={18} />, perm: "disputes.view" },
                ],
              },
              {
                label: "VERIFICATION",
                items: [
                  { key: "KYC", label: "Identity", icon: <ShieldCheck size={18} />, perm: "kyc.review", badge: queueCounts.kyc || undefined },
                ],
              },
              {
                label: "FINANCE",
                items: [
                  { key: "TOPUPS", label: "Receipts", icon: <WalletCards size={18} />, perm: "topups.review", badge: queueCounts.topups || undefined },
                  { key: "LEDGER", label: "Ledger", icon: <FileText size={18} />, perm: "ledger.view" },
                  { key: "RECONCILIATION", label: "Reconciliation", icon: <FileText size={18} />, perm: "reconciliation.view" },
                  { key: "REPORTS", label: "Reports", icon: <FileText size={18} />, perm: "reports.view" },
                ],
              },
              {
                label: "OPERATIONS",
                items: [
                  { key: "CONTRACTS", label: "Contracts", icon: <FileText size={18} />, perm: "contracts.view" },
                  { key: "PAYMENTS", label: "Payments", icon: <WalletCards size={18} />, perm: "payments.view" },
                  { key: "ESCROW", label: "Escrow", icon: <Scale size={18} />, perm: "escrow.view" },
                  { key: "PAYOUTS", label: "Payouts", icon: <Send size={18} />, perm: "payouts.view" },
                ],
              },
              {
                label: "MONITORING",
                items: [
                  { key: "MONITORING", label: "System Health", icon: <LayoutDashboard size={18} />, perm: "monitoring.view" },
                ],
              },
              {
                label: "USERS",
                items: [
                  { key: "USERS", label: "Users", icon: <Users size={18} />, perm: "users.view" },
                  { key: "PROFILES", label: "Profiles", icon: <Users size={18} />, perm: "users.view" },
                ],
              },
              {
                label: "ADMINISTRATION",
                items: [
                  { key: "AUDIT", label: "Audit Logs", icon: <FileText size={18} />, perm: "audit.view" },
                  { key: "ADMINS", label: "Admins & Permissions", icon: <Users size={18} />, perm: "admins.manage" },
                ],
              },
            ] as {
              label: string;
              items: {
                key:
                  | "OVERVIEW"
                  | "SUPPORT"
                  | "KYC"
                  | "TOPUPS"
                  | "DISPUTES"
                  | "PROFILES"
                  | "AUDIT"
                  | "ADMINS"
                  | "REPORTS"
                  | "USERS"
                  | "CONTRACTS"
                  | "PAYMENTS"
                  | "ESCROW"
                  | "PAYOUTS"
                  | "LEDGER"
                  | "RECONCILIATION"
                  | "RISK"
                  | "MONITORING";
                label: string;
                icon: React.ReactNode;
                perm: string;
                badge?: number;
                disabled?: boolean;
              }[];
            }[]
          ).map((group) => {
            // Default all groups to expanded — collapsing is opt-in via the
            // group header, since all sections are intentionally visible.
            const expanded = expandedGroups[group.label] ?? true;
            const anyItem = group.items.filter((item) => can(item.perm));
            if (anyItem.length === 0) return null;
            return (
              <div className="sidebar-group" key={group.label}>
                {group.items.length > 1 ? (
                  <button
                    type="button"
                    className="sidebar-group-header"
                    onClick={() => toggleGroup(group.label)}
                    aria-expanded={expanded}
                  >
                    <span className="nav-label">{group.label}</span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 0.15s",
                      }}
                    />
                  </button>
                ) : (
                  null
                )}
                {expanded &&
                  group.items.map((item) =>
                    !can(item.perm) ? null : (
                      <button
                        key={item.key}
                        className={activeTab === item.key ? "active" : ""}
                        disabled={(item as any).disabled}
                        onClick={() =>
                          !(item as any).disabled &&
                          setActiveTab(item.key as typeof activeTab)
                        }
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {item.badge ? (
                          <span className="nav-badge">{item.badge}</span>
                        ) : null}
                      </button>
                    ),
                  )}
              </div>
            );
          })}
        </nav>

        <button className="sidebar-settings sidebar-logout" onClick={onLogout}>
          <span className="nav-icon">
            <LogOut size={18} />
          </span>
          <span className="nav-label">Sign out</span>
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main className="staff-main">
        <header className="staff-topbar">
          <div className="staff-topbar-title-area">
            <p className="eyebrow">Operations workspace</p>
            <h1>
              {activeTab === "OVERVIEW" && "Keep Yekis moving."}
              {activeTab === "SUPPORT" && "Support desk"}
              {activeTab === "TOPUPS" && "Receipt reviews"}
              {activeTab === "KYC" && "Identity reviews"}
              {activeTab === "DISPUTES" && "Disputes"}
              {activeTab === "PROFILES" && "Profile moderation"}
              {activeTab === "AUDIT" && "Immutable audit trail"}
              {activeTab === "ADMINS" && "Admins & permissions"}
              {activeTab === "USERS" && "Clients & freelancers"}
              {activeTab === "CONTRACTS" && "Contracts & milestones"}
              {activeTab === "PAYMENTS" && "Payment rails & transactions"}
              {activeTab === "ESCROW" && "Milestone escrow & held funds"}
              {activeTab === "PAYOUTS" && "Disbursements & freelancer payouts"}
              {activeTab === "LEDGER" && "Double-entry financial ledger"}
              {activeTab === "RECONCILIATION" && "Ledger ↔ provider reconciliation"}
              {activeTab === "REPORTS" && "Financial & marketplace reports"}
              {activeTab === "RISK" && "Risk & fraud cases"}
              {activeTab === "MONITORING" && "System health & provider status"}
            </h1>
            <p>
              Coordinate support, payments, identity checks, and disputes from
              one desk.
            </p>
          </div>
          <div className="staff-topbar-actions">
            <div className="staff-filter-toggle">
              <button
                className={queueScope === "ALL" ? "active" : ""}
                onClick={() => setQueueScope("ALL")}
              >
                All Queues
              </button>
              <button
                className={queueScope === "MINE" ? "active" : ""}
                onClick={() => setQueueScope("MINE")}
              >
                My Queue
              </button>
            </div>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="btn-secondary"
              onClick={() => void loadConversations()}
              disabled={isLoading}
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} /> Refresh
            </button>
          </div>
        </header>

        {error && (
          <div className="staff-error">
            <strong>Some queues need attention</strong>
            <span>{error}</span>
          </div>
        )}

        {activeTab === "OVERVIEW" && (
          <section className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminOverviewPage />
          </section>
        )}

        {/* ── Tab Content ───────────────────────────────── */}

        {/* Support Chat Tab */}
        {activeTab === "SUPPORT" && (
          <section id="panel-support" className="staff-panel staff-chat-panel">
            <div className="staff-panel-heading">
              <div>
                <p className="eyebrow">Support desk</p>
                <h2>Client and freelancer conversations</h2>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {/* OPEN / ALL filter toggle */}
                <div className="staff-filter-toggle">
                  <button
                    className={filter === "OPEN" ? "active" : ""}
                    onClick={() => setFilter("OPEN")}
                  >
                    Open
                  </button>
                  <button
                    className={filter === "ALL" ? "active" : ""}
                    onClick={() => setFilter("ALL")}
                  >
                    All
                  </button>
                </div>
                <span className="status-pill">Live queue</span>
                {renderSla(supportHours)}
              </div>
            </div>

            <div className="staff-chat-layout">
              {/* Conversation list */}
              <div className="staff-queue-list">
                {displayedConversations.length === 0 ? (
                  <div className="staff-inbox-empty">
                    <MessageCircle size={32} />
                    <p>
                      {filter === "OPEN"
                        ? "No open conversations."
                        : "No support conversations yet."}
                    </p>
                  </div>
                ) : (
                  displayedConversations.map((conversation) => {
                    const hasUnread = isUnread(conversation);
                    return (
                      <button
                        key={conversation.id}
                        className={`staff-conversation${selectedConversation === conversation.id ? " active" : ""}${hasUnread ? " unread" : ""}`}
                        onClick={() => void openConversation(conversation)}
                      >
                        <span className="staff-conv-dot-wrap">
                          {hasUnread && (
                            <CircleDot
                              size={10}
                              className="staff-conv-unread-dot"
                            />
                          )}
                        </span>
                        <span className="staff-conv-body">
                          <strong>{conversation.subject}</strong>
                          <small>{conversation.creator.email}</small>
                          {conversation.messages[0] && (
                            <span className="staff-conv-preview">
                              {conversation.messages[0].body}
                            </span>
                          )}
                        </span>
                        <span className="staff-conv-meta">
                          <b
                            className={`status-pill ${conversation.status === "CLOSED" ? "closed" : ""}`}
                          >
                            {conversation.status}
                          </b>
                          <small>
                            <Clock size={10} />{" "}
                            {relativeTime(conversation.updatedAt)}
                          </small>
                        </span>
                      </button>
                    );
                  })
                )}
              </div>

              {/* Thread view */}
              <div className="staff-thread">
                {selected ? (
                  <>
                    <div className="staff-thread-head">
                      <div>
                        <strong>{selected.subject}</strong>
                        <span>{selected.creator.email}</span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "center",
                        }}
                      >
                        <span
                          className={`status-pill ${selected.status === "CLOSED" ? "closed" : ""}`}
                        >
                          {selected.status}
                        </span>
                        {selected.status === "OPEN" ? (
                          <button
                            className="btn-secondary"
                            style={{
                              fontSize: "0.78rem",
                              padding: "4px 10px",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                            onClick={closeConversation}
                            disabled={isClosing}
                            title="Mark this conversation as resolved"
                          >
                            <CheckCheck size={14} /> Close
                          </button>
                        ) : (
                          <button
                            className="btn-secondary"
                            style={{
                              fontSize: "0.78rem",
                              padding: "4px 10px",
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                            }}
                            onClick={reopenConversation}
                            disabled={isClosing}
                            title="Reopen this conversation"
                          >
                            <ChevronDown size={14} /> Reopen
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div className="staff-messages">
                      {messages.length === 0 ? (
                        <p className="empty-state">
                          No messages in this conversation yet.
                        </p>
                      ) : (
                        messages.map((message) => {
                          const isOwn = message.senderId === user.id;
                          return (
                            <div
                              key={message.id}
                              className={
                                isOwn ? "staff-message own" : "staff-message"
                              }
                            >
                              <p>{message.body}</p>
                              {message.attachmentUrl && (
                                <div className="staff-msg-attachment">
                                  {isImageAttachment(message.attachmentUrl) && (
                                    <a
                                      href={message.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="staff-attachment-img-link"
                                    >
                                      <img
                                        src={message.attachmentUrl}
                                        alt={getAttachmentLabel(message.attachmentUrl)}
                                        className="staff-attachment-preview"
                                        loading="lazy"
                                      />
                                    </a>
                                  )}
                                  <a
                                    href={message.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="staff-attachment-badge"
                                    download={getAttachmentLabel(message.attachmentUrl)}
                                  >
                                    <FileText size={14} />
                                    <span>{getAttachmentLabel(message.attachmentUrl)}</span>
                                    <ExternalLink size={12} />
                                  </a>
                                </div>
                              )}
                              <small>
                                {isOwn
                                  ? "You"
                                  : message.sender.staffRole
                                    ? "Yekis team"
                                    : message.sender.role}
                                {" · "}
                                {dateLabel(message.createdAt)}
                              </small>
                            </div>
                          );
                        })
                      )}
                      <div ref={messagesEnd} />
                    </div>

                    {/* Reply box — only for open conversations */}
                    {selected.status === "OPEN" ? (
                      <div className="staff-reply-wrapper">
                        {attachedFile && (
                          <div className="staff-attachment-tag">
                            <FileText size={13} />
                            <span>{attachedFile.name}</span>
                            <button
                              type="button"
                              onClick={() => setAttachedFile(null)}
                              title="Remove attachment"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        )}
                        <div className="staff-reply">
                          <label
                            className="chat-compose-icon"
                            aria-label="Attach a file"
                            title="Attach a file"
                            style={{ cursor: "pointer" }}
                          >
                            <Paperclip size={20} />
                            <input
                              type="file"
                              style={{ display: "none" }}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  setAttachedFile(file);
                                }
                                e.target.value = "";
                              }}
                            />
                          </label>
                          <input
                            value={reply}
                            onChange={(e) => setReply(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                void sendReply();
                              }
                            }}
                            placeholder="Reply to this conversation…"
                            disabled={isSending || isUploadingAttachment}
                            style={{ flex: 1, minWidth: 0 }}
                          />
                          <button
                            className="chat-send"
                            onClick={() => void sendReply()}
                            disabled={
                              isSending ||
                              isUploadingAttachment ||
                              (!reply.trim() && !attachedFile)
                            }
                            aria-label="Send message"
                          >
                            {isUploadingAttachment ? (
                              <Loader2 size={18} className="spin" />
                            ) : (
                              <Send size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="staff-reply staff-reply-closed">
                        <span>
                          This conversation is closed. Reopen it to reply.
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="staff-thread-empty">
                    <MessageCircle size={28} />
                    <p>Select a conversation to read and reply.</p>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Top-up Receipts Tab */}
        {activeTab === "TOPUPS" && (
          <section id="panel-receipts">
            <TopUpQueue
              onReview={async (id, d, r) => {
                await api.reviewTopUp(id, d, r);
                await loadConversations();
              }}
              onFlag={async (id, r) => {
                await api.flagTopUpSuspicious(id, r);
                await loadConversations();
              }}
            />
          </section>
        )}

        {/* Identity Reviews Tab */}
        {activeTab === "KYC" && (
          <section id="panel-identity">
            <KycQueue
              onReview={async (id, d, r) => {
                await api.reviewKyc(id, d, r);
                await loadConversations();
              }}
            />
          </section>
        )}

        {/* Disputes Tab */}
        {activeTab === "DISPUTES" && (
          <section id="panel-disputes">
            <DisputeQueue
              onResolve={async (id, o, r, s) => {
                await api.resolveDispute(id, {
                  outcome: o,
                  recommendation: r,
                  freelancerShareMinor: s,
                });
                await loadConversations();
              }}
            />
          </section>
        )}

        {/* Profiles Tab */}
        {activeTab === "PROFILES" && (
          <section
            id="panel-profiles"
            className="staff-panel"
            style={{ padding: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "1.2rem" }}>
                  Featured Profiles
                </h2>
                <p style={{ margin: 0, fontSize: "0.9rem", color: "#666" }}>
                  Manage featured talent on the landing page
                </p>
              </div>
              <button
                onClick={async () => {
                  if (
                    !window.confirm(
                      "Are you sure you want to refresh the featured carousel? This will update the featured talent shown on the landing page.",
                    )
                  ) {
                    return;
                  }
                  try {
                    await api.refreshFeaturedCarousel();
                    alert("Featured carousel refreshed successfully.");
                  } catch (err) {
                    alert(
                      err instanceof Error
                        ? err.message
                        : "Failed to refresh carousel",
                    );
                  }
                }}
                className="btn-secondary"
                style={{ display: "flex", alignItems: "center", gap: 5 }}
              >
                <RefreshCw size={15} /> Refresh Carousel
              </button>
            </div>
            <ProfileReportsQueue />
          </section>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "AUDIT" && (
          <section
            id="panel-audit"
            className="staff-panel"
            style={{ padding: "1.5rem" }}
          >
            <AuditLogsPage />
          </section>
        )}

        {/* Admins & Permissions Tab */}
        {activeTab === "ADMINS" && (
          <section
            id="panel-admins"
            className="staff-panel"
            style={{ padding: "1.5rem" }}
          >
            <AdminsPage />
          </section>
        )}

        {/* Users Library Tab (Phase 2) */}
        {activeTab === "USERS" && (
          <section
            id="panel-users"
            className="staff-panel"
            style={{ padding: "1.5rem" }}
          >
            <AdminUsersPage />
          </section>
        )}

        {/* Contracts Tab (Phase 2) */}
        {activeTab === "CONTRACTS" && (
          <section
            id="panel-contracts"
            className="staff-panel"
            style={{ padding: "1.5rem" }}
          >
            <AdminContractsPage />
          </section>
        )}

        {/* Payments Tab (Phase 3) */}
        {activeTab === "PAYMENTS" && (
          <section id="panel-payments" className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminPaymentsPage />
          </section>
        )}

        {/* Escrow Tab (Phase 3) */}
        {activeTab === "ESCROW" && (
          <section id="panel-escrow" className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminEscrowPage />
          </section>
        )}

        {/* Payouts Tab (Phase 3) */}
        {activeTab === "PAYOUTS" && (
          <section id="panel-payouts" className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminPayoutsPage />
          </section>
        )}

        {/* Ledger Tab (Phase 3) */}
        {activeTab === "LEDGER" && (
          <section id="panel-ledger" className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminLedgerPage />
          </section>
        )}

        {/* Reconciliation Tab (Phase 4) */}
        {activeTab === "RECONCILIATION" && (
          <section id="panel-reconciliation" className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminReconciliationPage />
          </section>
        )}

        {/* Reports Tab (Phase 4) */}
        {activeTab === "REPORTS" && (
          <section id="panel-reports" className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminReportsPage />
          </section>
        )}

        {/* Risk & Fraud Tab (Phase 5) */}
        {activeTab === "RISK" && (
          <section id="panel-risk" className="staff-panel" style={{ padding: "1.5rem" }}>
            <StaffCompliancePanel onChanged={loadConversations} onError={setError} />
            <div style={{ marginTop: 16 }}>
              <AdminRiskPage />
            </div>
          </section>
        )}

        {/* Monitoring Tab (Phase 7) */}
        {activeTab === "MONITORING" && (
          <section id="panel-monitoring" className="staff-panel" style={{ padding: "1.5rem" }}>
            <AdminMonitoringPage />
          </section>
        )}
      </main>

      {viewingEvidence && (
        <EvidenceViewer
          documents={viewingEvidence}
          onClose={() => setViewingEvidence(null)}
        />
      )}
    </div>
  );
}
