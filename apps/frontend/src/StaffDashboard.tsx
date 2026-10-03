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
  BarChart2,
  Activity,
  BookOpen,
  AlertTriangle,
  CreditCard,
  Receipt,
  XCircle,
  ChevronDown,
  Menu,
  Search,
} from "lucide-react";
import { useTheme } from "./theme/ThemeContext";
import "./ops-console.css";
import { NotificationCenter } from "./NotificationCenter";
import {
  api,
  type ChatMessage,
  type MeResponse,
  type StaffConversation,
} from "./api/client";
import { StaffCompliancePanel } from "./StaffCompliancePanel";
import { EvidenceViewer, type EvidenceDocument } from "./EvidenceViewer";
import { KycQueue } from "./KycQueue";
import { YekisAvatar } from "./components/YekisAvatar";
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
  // Breadcrumb page names (mockup: "Ops / <Page>")
  const CRUMB_LABELS: Record<string, string> = {
    OVERVIEW: "Command Center",
    SUPPORT: "Support",
    TOPUPS: "Receipts",
    KYC: "KYC Reviews",
    DISPUTES: "Dispute Mediation",
    PROFILES: "Profile Reports",
    AUDIT: "Audit Logs",
    ADMINS: "Staff & Roles",
    USERS: "Users",
    CONTRACTS: "Contracts",
    PAYMENTS: "Payments",
    ESCROW: "Escrow",
    PAYOUTS: "Payouts",
    LEDGER: "Ledger",
    RECONCILIATION: "Reconciliation",
    REPORTS: "Reports",
    RISK: "Risk Flags",
    MONITORING: "System Health",
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

  const displayedConversations =
    queueScope === "MINE"
      ? visibleConversations.filter((c) => c.assignedStaff?.id === user.id)
      : visibleConversations;

  return (
    <div className="staff-shell">
      {/* ── Sidebar ─────────────────────────────────────── */}
      <aside className={`staff-sidebar${sidebarOpen ? " oc-open" : ""}`}>
        <div className="oc-brand">
          <div className="oc-brand-logo">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div>
            <span className="oc-brand-name">Yekis</span>
            <span className="oc-brand-tag">OPS CONSOLE</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="oc-nav">
          {(
            [
              {
                label: "Overview",
                items: [
                  { key: "OVERVIEW", label: "Command Center", icon: <LayoutDashboard size={16} />, perm: "dashboard.view" },
                ],
              },
              {
                label: "Financial",
                items: [
                  { key: "CONTRACTS",      label: "Contracts",      icon: <FileText size={16} />,    perm: "contracts.view" },
                  { key: "PAYMENTS",       label: "Payments",       icon: <CreditCard size={16} />,  perm: "payments.view" },
                  { key: "PAYOUTS",        label: "Payouts",        icon: <WalletCards size={16} />, perm: "payouts.view" },
                  { key: "ESCROW",         label: "Escrow",         icon: <Scale size={16} />,       perm: "escrow.view" },
                  { key: "RECONCILIATION", label: "Reconciliation", icon: <FileText size={16} />,    perm: "reconciliation.view" },
                  { key: "LEDGER",         label: "Ledger",         icon: <BookOpen size={16} />,    perm: "ledger.view" },
                  { key: "TOPUPS",         label: "Receipts",       icon: <Receipt size={16} />,     perm: "topups.review", badge: queueCounts.topups || undefined },
                ],
              },
              {
                label: "Review Queues",
                items: [
                  { key: "KYC",      label: "KYC Reviews",      icon: <ShieldCheck size={16} />,   perm: "kyc.review",     badge: queueCounts.kyc      || undefined },
                  { key: "DISPUTES", label: "Dispute Mediation", icon: <Scale size={16} />,         perm: "disputes.view",  badge: queueCounts.disputes || undefined },
                  { key: "PROFILES", label: "Profile Reports",   icon: <AlertTriangle size={16} />, perm: "users.view" },
                  { key: "SUPPORT",  label: "Support",           icon: <MessageSquare size={16} />, perm: "support.handle", badge: openCount            || undefined },
                ],
              },
              {
                label: "Operations",
                items: [
                  { key: "USERS",      label: "Users",         icon: <Users size={16} />,       perm: "users.view" },
                  { key: "ADMINS",     label: "Staff & Roles", icon: <ShieldCheck size={16} />, perm: "admins.manage" },
                  { key: "REPORTS",    label: "Reports",       icon: <BarChart2 size={16} />,   perm: "reports.view" },
                  { key: "RISK",       label: "Risk Flags",    icon: <XCircle size={16} />,     perm: "tms.review" },
                  { key: "AUDIT",      label: "Audit Logs",    icon: <FileText size={16} />,    perm: "audit.view" },
                  { key: "MONITORING", label: "System Health", icon: <Activity size={16} />,    perm: "monitoring.view" },
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
              }[];
            }[]
          ).map((group) => {
            const visibleItems = group.items.filter((item) => can(item.perm));
            if (visibleItems.length === 0) return null;
            return (
              <div className="oc-nav-group" key={group.label}>
                <span className="oc-nav-label">{group.label}</span>
                {visibleItems.map((item) => (
                  <button
                    key={item.key}
                    className={`oc-nav-item${activeTab === item.key ? " active" : ""}`}
                    onClick={() => {
                      setActiveTab(item.key as typeof activeTab);
                      setSidebarOpen(false);
                    }}
                  >
                    <span className="oc-nav-ic">{item.icon}</span>
                    <span>{item.label}</span>
                    {item.badge ? (
                      <span className="oc-nav-badge">{item.badge}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>

        {/* User footer */}
        <div className="oc-side-footer">
          <div className="oc-userchip">
            <YekisAvatar
              userId={user.id}
              email={user.email}
              size={34}
              animate="hover"
              className="oc-avatar"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="nm">
                {ROLE_LABELS[user.staffRole ?? ""] ?? "Staff desk"}
              </div>
              <div className="em">{user.email}</div>
            </div>
            <button
              className="oc-logout"
              onClick={onLogout}
              title="Sign out"
              aria-label="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>
      <div
        className={`oc-overlay${sidebarOpen ? " show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* ── Main ────────────────────────────────────────── */}
      <main className="staff-main">
        <header className="oc-header">
          <button
            className="oc-menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={18} />
          </button>
          <div className="oc-crumb">
            Ops / <b>{CRUMB_LABELS[activeTab] ?? activeTab}</b>
          </div>
          <div className="oc-search">
            <Search size={15} />
            <input
              placeholder="Search contracts, users, TX IDs…"
              aria-label="Search (not wired yet)"
              readOnly
              title="Global console search — coming soon"
            />
          </div>
          <div className="oc-hdr-right">
            <div className="oc-seg">
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
            <NotificationCenter />
            <button
              type="button"
              className="oc-icon-btn"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              title={theme === "light" ? "Dark mode" : "Light mode"}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
            <button
              className="oc-btn oc-btn-ghost oc-btn-sm"
              onClick={() => void loadConversations()}
              disabled={isLoading}
            >
              <RefreshCw size={14} className={isLoading ? "fa-spin" : ""} /> Refresh
            </button>
          </div>
        </header>

        <div className="oc-content">
        {error && (
          <div className="oc-banner oc-b-red" style={{ marginBottom: 16 }}>
            <span className="oc-banner-ic"><AlertTriangle size={17} /></span>
            <div><b>Some queues need attention.</b> {error}</div>
          </div>
        )}

        {activeTab === "OVERVIEW" && (
          <AdminOverviewPage
            onNavigate={setActiveTab}
            queueCounts={queueCounts}
            openSupportCount={
              conversations.filter((c) => c.status === "OPEN").length
            }
          />
        )}

        {/* ── Tab Content ───────────────────────────────── */}

        {/* Support Chat Tab */}
        {activeTab === "SUPPORT" && (
          <div className="oc-fade">
            <div className="oc-page-head">
              <div>
                <div className="oc-page-title">Support Desk</div>
                <div className="oc-page-sub">Client and freelancer conversations</div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <div className="oc-seg">
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
                <span className="oc-pill oc-p-green"><span className="oc-pdot"></span>Live queue</span>
                {supportHours !== null && (
                  <span className={`oc-sla ${supportHours > 24 ? "breach" : supportHours > 2 ? "warn" : "ok"}`}>
                    ● waiting {supportHours < 1 ? "< 1h" : `${Math.floor(supportHours)}h`}
                  </span>
                )}
              </div>
            </div>

            <div className="oc-card oc-chat-split">
              {/* Conversation list */}
              <div className="oc-chat-list">
                {displayedConversations.length === 0 ? (
                  <div className="oc-empty">
                    <MessageCircle size={32} style={{ color: "var(--oc-border-strong, #c3ccdb)" }} />
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
                        className={`oc-conv${selectedConversation === conversation.id ? " active" : ""}`}
                        onClick={() => void openConversation(conversation)}
                      >
                        <span style={{ width: 10, display: "flex", justifyContent: "center", paddingTop: 4 }}>
                          {hasUnread && (
                            <CircleDot size={10} style={{ color: "var(--oc-primary)" }} />
                          )}
                        </span>
                        <span className="oc-conv-body">
                          <strong>{conversation.subject}</strong>
                          <small>{conversation.creator.email}</small>
                          {conversation.messages[0] && (
                            <span className="oc-conv-preview">
                              {conversation.messages[0].body}
                            </span>
                          )}
                        </span>
                        <span className="oc-conv-meta">
                          <span className={`oc-pill ${conversation.status === "CLOSED" ? "oc-p-gray" : "oc-p-green"}`}>
                            <span className="oc-pdot"></span>{conversation.status}
                          </span>
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
              <div className="oc-thread">
                {selected ? (
                  <>
                    <div className="oc-thread-head">
                      <div>
                        <strong>{selected.subject}</strong>
                        <span>{selected.creator.email}</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span className={`oc-pill ${selected.status === "CLOSED" ? "oc-p-gray" : "oc-p-green"}`}>
                          <span className="oc-pdot"></span>{selected.status}
                        </span>
                        {selected.status === "OPEN" ? (
                          <button
                            className="oc-btn oc-btn-ghost oc-btn-sm"
                            onClick={closeConversation}
                            disabled={isClosing}
                            title="Mark this conversation as resolved"
                          >
                            <CheckCheck size={14} /> Close
                          </button>
                        ) : (
                          <button
                            className="oc-btn oc-btn-ghost oc-btn-sm"
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
                    <div className="oc-msgs">
                      {messages.length === 0 ? (
                        <p className="oc-empty" style={{ padding: "20px" }}>
                          No messages in this conversation yet.
                        </p>
                      ) : (
                        messages.map((message) => {
                          const isOwn = message.senderId === user.id;
                          return (
                            <div
                              key={message.id}
                              className={isOwn ? "oc-msg own" : "oc-msg"}
                            >
                              <p>{message.body}</p>
                              {message.attachmentUrl && (
                                <div className="oc-msg-attach">
                                  {isImageAttachment(message.attachmentUrl) && (
                                    <a
                                      href={message.attachmentUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <img
                                        src={message.attachmentUrl}
                                        alt={getAttachmentLabel(message.attachmentUrl)}
                                        loading="lazy"
                                      />
                                    </a>
                                  )}
                                  <a
                                    href={message.attachmentUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="oc-msg-file"
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
                      <>
                        {attachedFile && (
                          <div className="oc-reply-tag">
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
                        <div className="oc-reply">
                          <label
                            className="oc-attach-btn"
                            aria-label="Attach a file"
                            title="Attach a file"
                          >
                            <Paperclip size={18} />
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
                          />
                          <button
                            className="oc-send"
                            onClick={() => void sendReply()}
                            disabled={
                              isSending ||
                              isUploadingAttachment ||
                              (!reply.trim() && !attachedFile)
                            }
                            aria-label="Send message"
                          >
                            {isUploadingAttachment ? (
                              <Loader2 size={16} className="fa-spin" />
                            ) : (
                              <Send size={16} />
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="oc-reply" style={{ color: "var(--oc-text-3)", fontSize: 13, fontWeight: 600 }}>
                        This conversation is closed. Reopen it to reply.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="oc-empty" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <MessageCircle size={28} style={{ color: "var(--oc-border-strong, #c3ccdb)" }} />
                    <p>Select a conversation to read and reply.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Top-up Receipts Tab */}
        {activeTab === "TOPUPS" && (
          <div className="oc-fade">
            <div className="oc-page-head">
              <div>
                <div className="oc-page-title">Receipt Reviews</div>
                <div className="oc-page-sub">Verify manual wallet top-up receipts</div>
              </div>
            </div>
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
          </div>
        )}

        {/* Identity Reviews Tab */}
        {activeTab === "KYC" && (
          <div className="oc-fade">
            <KycQueue
              onReview={async (id, d, r) => {
                await api.reviewKyc(id, d, r);
                await loadConversations();
              }}
            />
          </div>
        )}

        {/* Disputes Tab */}
        {activeTab === "DISPUTES" && (
          <div className="oc-fade">
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
          </div>
        )}

        {/* Profiles Tab */}
        {activeTab === "PROFILES" && (
          <div className="oc-fade">
            <div className="oc-page-head">
              <div>
                <div className="oc-page-title">Profile Moderation</div>
                <div className="oc-page-sub">User reports & featured talent on the landing page</div>
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
                className="oc-btn oc-btn-ghost oc-btn-sm"
              >
                <RefreshCw size={14} /> Refresh Carousel
              </button>
            </div>
            <ProfileReportsQueue />
          </div>
        )}

        {/* Audit Logs Tab */}
        {activeTab === "AUDIT" && (
          <div className="oc-fade">
            <AuditLogsPage />
          </div>
        )}

        {/* Admins & Permissions Tab */}
        {activeTab === "ADMINS" && (
          <div className="oc-fade">
            <AdminsPage />
          </div>
        )}

        {/* Users Library Tab */}
        {activeTab === "USERS" && (
          <div className="oc-fade">
            <AdminUsersPage />
          </div>
        )}

        {/* Contracts Tab */}
        {activeTab === "CONTRACTS" && (
          <div className="oc-fade">
            <AdminContractsPage />
          </div>
        )}

        {/* Payments Tab */}
        {activeTab === "PAYMENTS" && (
          <div className="oc-fade">
            <AdminPaymentsPage />
          </div>
        )}

        {/* Escrow Tab */}
        {activeTab === "ESCROW" && (
          <div className="oc-fade">
            <AdminEscrowPage />
          </div>
        )}

        {/* Payouts Tab */}
        {activeTab === "PAYOUTS" && (
          <div className="oc-fade">
            <AdminPayoutsPage />
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === "LEDGER" && (
          <div className="oc-fade">
            <AdminLedgerPage />
          </div>
        )}

        {/* Reconciliation Tab */}
        {activeTab === "RECONCILIATION" && (
          <div className="oc-fade">
            <AdminReconciliationPage />
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "REPORTS" && (
          <div className="oc-fade">
            <AdminReportsPage />
          </div>
        )}

        {/* Risk & Fraud Tab */}
        {activeTab === "RISK" && (
          <div className="oc-fade">
            <StaffCompliancePanel onChanged={loadConversations} onError={setError} />
            <div style={{ marginTop: 16 }}>
              <AdminRiskPage />
            </div>
          </div>
        )}

        {/* Monitoring Tab */}
        {activeTab === "MONITORING" && (
          <div className="oc-fade">
            <AdminMonitoringPage />
          </div>
        )}
        </div>
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
