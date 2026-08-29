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
import { DisputeQueue } from "./DisputeQueue";
import { ProfileReportsQueue } from "./ProfileReportsQueue";

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
  const [filter, setFilter] = useState<"OPEN" | "ALL">("OPEN");
  const [activeTab, setActiveTab] = useState<
    "OVERVIEW" | "SUPPORT" | "KYC" | "TOPUPS" | "DISPUTES" | "PROFILES"
  >("OVERVIEW");
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [reply, setReply] = useState("");
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
      const [chat, kyc, topups, disputes] = await Promise.all([
        api.getStaffConversations(),
        api.getKycReviewQueue({ pageSize: 1 }),
        api.getTopUpReviewQueue({ pageSize: 1 }),
        api.getDisputeQueue({ pageSize: 1 }),
      ]);
      setConversations(Array.isArray(chat) ? chat : chat.items);
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
    if (!selectedConversation || !reply.trim() || isSending) return;
    setIsSending(true);
    try {
      const message = await api.sendChatMessage(
        selectedConversation,
        reply.trim(),
      );
      setMessages((current) => [...current, message]);
      setReply("");
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
              {user.staffRole === "ADMIN" ? "Administrator" : "Staff desk"}
            </strong>
            <small>{user.email}</small>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button
            className={activeTab === "OVERVIEW" ? "active" : ""}
            onClick={() => setActiveTab("OVERVIEW")}
          >
            <span className="nav-icon">
              <LayoutDashboard size={18} />
            </span>
            <span className="nav-label">Overview</span>
          </button>
          <button
            className={activeTab === "SUPPORT" ? "active" : ""}
            onClick={() => setActiveTab("SUPPORT")}
          >
            <span className="nav-icon">
              <MessageSquare size={18} />
            </span>
            <span className="nav-label">Support</span>
          </button>
          <button
            className={activeTab === "TOPUPS" ? "active" : ""}
            onClick={() => setActiveTab("TOPUPS")}
          >
            <span className="nav-icon">
              <WalletCards size={18} />
            </span>
            <span className="nav-label">Receipts</span>
          </button>
          <button
            className={activeTab === "KYC" ? "active" : ""}
            onClick={() => setActiveTab("KYC")}
          >
            <span className="nav-icon">
              <ShieldCheck size={18} />
            </span>
            <span className="nav-label">Identity</span>
          </button>
          {user.staffRole === "ADMIN" && (
            <button
              className={activeTab === "DISPUTES" ? "active" : ""}
              onClick={() => setActiveTab("DISPUTES")}
            >
              <span className="nav-icon">
                <span
                  className="metric-symbol"
                  style={{ fontSize: 16, fontWeight: "bold" }}
                >
                  !
                </span>
              </span>
              <span className="nav-label">Disputes</span>
            </button>
          )}
          {user.staffRole === "ADMIN" && (
            <button
              className={activeTab === "PROFILES" ? "active" : ""}
              onClick={() => setActiveTab("PROFILES")}
            >
              <span className="nav-icon">
                <Users size={18} />
              </span>
              <span className="nav-label">Profiles</span>
            </button>
          )}
        </nav>

        <button className="sidebar-settings" onClick={onLogout}>
          Sign out
        </button>
      </aside>

      {/* ── Main ────────────────────────────────────────── */}
      <main className="staff-main">
        <header className="staff-topbar">
          <div>
            <p className="eyebrow">Operations workspace</p>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <h1>
                {activeTab === "OVERVIEW" && "Keep Yekis moving."}
                {activeTab === "SUPPORT" && "Support desk"}
                {activeTab === "TOPUPS" && "Receipt reviews"}
                {activeTab === "KYC" && "Identity reviews"}
                {activeTab === "DISPUTES" && "Disputes"}
                {activeTab === "PROFILES" && "Profile Moderation"}
              </h1>
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
            </div>
            <p>
              Coordinate support, payments, identity checks, and disputes from
              one desk.
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              className="theme-toggle"
              onClick={toggleTheme}
              aria-label={
                theme === "light"
                  ? "Switch to dark mode"
                  : "Switch to light mode"
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 38,
                height: 38,
                borderRadius: "50%",
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                cursor: "pointer",
              }}
            >
              {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            <button
              className="btn-secondary"
              onClick={() => void loadConversations()}
              disabled={isLoading}
            >
              <RefreshCw size={15} /> Refresh
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
          <div className="staff-dashboard-top-section">
            <section className="staff-metrics">
              <article
                className="clickable"
                onClick={() => setActiveTab("SUPPORT")}
              >
                <MessageSquare size={19} />
                <span>Open support</span>
                <div className="metric-details">
                  <strong>{openCount}</strong>
                  {renderSla(supportHours)}
                </div>
              </article>
              <article
                className="clickable"
                onClick={() => setActiveTab("TOPUPS")}
              >
                <WalletCards size={19} />
                <span>Receipt reviews</span>
                <div className="metric-details">
                  <strong>{queueCounts.topups}</strong>
                </div>
              </article>
              <article
                className="clickable"
                onClick={() => setActiveTab("KYC")}
              >
                <ShieldCheck size={19} />
                <span>Identity reviews</span>
                <div className="metric-details">
                  <strong>{queueCounts.kyc}</strong>
                </div>
              </article>
              <article
                className="clickable"
                onClick={() => setActiveTab("DISPUTES")}
              >
                <span className="metric-symbol">!</span>
                <span>Disputes</span>
                <div className="metric-details">
                  <strong>{queueCounts.disputes}</strong>
                </div>
              </article>
            </section>
          </div>
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
                        messages.map((message) => (
                          <div
                            key={message.id}
                            className={
                              message.senderId === user.id
                                ? "staff-message own"
                                : "staff-message"
                            }
                          >
                            <p>{message.body}</p>
                            <small>
                              {message.senderId === user.id
                                ? "You"
                                : message.sender.staffRole
                                  ? "Yekis team"
                                  : message.sender.role}
                              {" · "}
                              {dateLabel(message.createdAt)}
                            </small>
                          </div>
                        ))
                      )}
                      <div ref={messagesEnd} />
                    </div>

                    {/* Reply box — only for open conversations */}
                    {selected.status === "OPEN" ? (
                      <div className="staff-reply">
                        <button
                          className="chat-compose-icon"
                          aria-label="Attach a file"
                          onClick={() => {
                            const input = document.createElement("input");
                            input.type = "file";
                            input.onchange = (e) => {
                              const file = (e.target as HTMLInputElement)
                                .files?.[0];
                              if (file)
                                setReply(
                                  (r) => r + (r ? " " : "") + `📎 ${file.name}`,
                                );
                            };
                            input.click();
                          }}
                        >
                          <Paperclip size={20} />
                        </button>
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
                          disabled={isSending}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <button
                          className="chat-send"
                          onClick={() => void sendReply()}
                          disabled={isSending || !reply.trim()}
                          aria-label="Send message"
                        >
                          <Send size={18} />
                        </button>
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

        <StaffCompliancePanel
          onChanged={loadConversations}
          onError={setError}
        />
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
