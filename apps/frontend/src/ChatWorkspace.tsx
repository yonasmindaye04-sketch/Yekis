// === IMPORTS ===
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Bot,
  CheckCheck,
  FileText,
  Loader2,
  Paperclip,
  Plus,
  Search,
  Send,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import { YekisAvatar } from "./components/YekisAvatar";
import { SecureAttachment } from "./components/SecureAttachment";
import { getAttachmentLabel, isImageAttachment } from "./components/attachmentMeta";
import {
  api,
  type ChatConversation,
  type ChatMessage,
  type ConversationSummaryResponse,
  type DealTermsResponse,
  type MeResponse,
} from "./api/client";
import { realtimeSocket } from "./api/socket";
import "./ChatWorkspace.css";

// === ANTI-CIRCUMVENTION PATTERNS ===
const CIRCUMVENTION_REGEXES = [
  /(?:\+?251[\s-]?)?0?9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/,
  /\b\d{10,}\b/,
  /(?:@|t\.me\/)[\w_]{4,}/i,
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  /\b(telegram|whatsapp|phone number|call me|dm me on|direct pay|wire me|pay off[- ]platform|cbe transfer directly)\b/i,
];

interface ChatWorkspaceProps {
  userId?: string;
  user?: MeResponse;
  role?: "CLIENT" | "FREELANCER";
  onNavigateToContracts?: () => void;
}

export function ChatWorkspace({
  userId,
  user,
  role = "CLIENT",
  onNavigateToContracts,
}: ChatWorkspaceProps) {
  const currentUserId = userId || user?.id || "";

  // Conversation & message state
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  // Filters & Search
  const [activeFilter, setActiveFilter] = useState<"ALL" | "DIRECT" | "SUPPORT">("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Real-time socket states
  const [isConnected, setIsConnected] = useState(realtimeSocket.isConnected);
  const [isRemoteTyping, setIsRemoteTyping] = useState(false);
  const typingTimerRef = useRef<number | null>(null);

  // Mini-Me AI Co-Pilot state
  const [smartReplies, setSmartReplies] = useState<string[]>([]);
  const [isLoadingReplies, setIsLoadingReplies] = useState(false);
  const [summaryData, setSummaryData] = useState<ConversationSummaryResponse | null>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [dealData, setDealData] = useState<DealTermsResponse | null>(null);
  const [isLoadingDeal, setIsLoadingDeal] = useState(false);
  const [showDealModal, setShowDealModal] = useState(false);

  // New Chat Modal state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatType, setNewChatType] = useState<"DIRECT" | "SUPPORT">("DIRECT");
  const [newChatRecipientId, setNewChatRecipientId] = useState("");
  const [newChatSubject, setNewChatSubject] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  // Mobile layout navigation
  const [showMobileChatView, setShowMobileChatView] = useState(false);

  // Attachment draft
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const typingDispatchTimeout = useRef<number | null>(null);

  // --- Realtime socket status listener ---
  useEffect(() => {
    realtimeSocket.connect();
    const unsubStatus = realtimeSocket.onStatusChange((status) => {
      setIsConnected(status);
    });
    return () => unsubStatus();
  }, []);

  // --- Load all conversations on mount ---
  const loadConversations = async () => {
    try {
      const convList = await api.getChatConversations();
      setConversations(convList);
      if (convList.length > 0 && !activeConversationId) {
        setActiveConversationId(convList[0].id);
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  useEffect(() => {
    void loadConversations();
  }, []);

  // A short visible-tab fallback keeps messages fresh while a WebSocket is
  // reconnecting or a proxy does not support upgrades.
  useEffect(() => {
    if (isConnected) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      void api.getChatConversations().then(setConversations).catch(() => {});
      if (activeConversationId) {
        void api.getChatMessages(activeConversationId).then(setMessages).catch(() => {});
      }
    };
    const timer = window.setInterval(refresh, 2000);
    return () => window.clearInterval(timer);
  }, [isConnected, activeConversationId]);

  // --- Global incoming message listener ---
  useEffect(() => {
    const unsubGlobal = realtimeSocket.on<{
      conversationId: string;
      id: string;
      attachmentUrl?: string | null;
      body: string;
      senderId: string;
    }>("chat:new_message", (data) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === data.conversationId) {
            return {
              ...c,
              unread: c.id !== activeConversationId,
              latestMessage: {
                body: data.body,
                createdAt: new Date().toISOString(),
                senderId: data.senderId,
              },
            };
          }
          return c;
        })
      );
    });

    return () => unsubGlobal();
  }, [activeConversationId]);

  // --- Active conversation handling & socket subscription ---
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = `conversation:${activeConversationId}`;
    realtimeSocket.subscribe(channel);
    realtimeSocket.sendRead(activeConversationId);
    void api.markChatRead(activeConversationId).catch(() => {});

    // Mark current thread as read in local state
    setConversations((prev) =>
      prev.map((c) => (c.id === activeConversationId ? { ...c, unread: false } : c))
    );

    // Fetch messages
    const fetchThread = async () => {
      try {
        const msgs = await api.getChatMessages(activeConversationId);
        setMessages(msgs);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load messages");
      }
    };
    void fetchThread();

    // Fetch initial smart replies from Mini-Me AI Co-Pilot
    fetchSmartReplies(activeConversationId);

    // Subscribe to live messages on this specific conversation
    const unsubMessage = realtimeSocket.on<ChatMessage>("chat:message", (msg) => {
      if (msg.conversationId === activeConversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        if (msg.senderId !== currentUserId) {
          fetchSmartReplies(activeConversationId);
        }
      }
    });

    // Subscribe to typing indicators
    const unsubTyping = realtimeSocket.on<{
      userId: string;
      conversationId: string;
      isTyping: boolean;
    }>("chat:typing", (payload) => {
      if (
        payload.conversationId === activeConversationId &&
        payload.userId !== currentUserId
      ) {
        setIsRemoteTyping(payload.isTyping);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        if (payload.isTyping) {
          typingTimerRef.current = window.setTimeout(() => {
            setIsRemoteTyping(false);
          }, 3500);
        }
      }
    });

    return () => {
      realtimeSocket.unsubscribe(channel);
      unsubMessage();
      unsubTyping();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
  }, [activeConversationId, currentUserId]);

  // Scroll to bottom when messages update (strictly vertical, preventing horizontal scroll displacement)
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages.length, isRemoteTyping]);

  // --- Fetch Mini-Me Smart Replies ---
  const fetchSmartReplies = async (convId: string) => {
    setIsLoadingReplies(true);
    try {
      const res = await api.getSmartReplies(convId);
      setSmartReplies(res.suggestions || []);
    } catch {
      setSmartReplies([]);
    } finally {
      setIsLoadingReplies(false);
    }
  };

  // --- Mini-Me Summarize Thread ---
  const handleSummarize = async () => {
    if (!activeConversationId) return;
    setIsLoadingSummary(true);
    setShowSummaryModal(true);
    try {
      const summary = await api.summarizeChat(activeConversationId);
      setSummaryData(summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to summarize chat");
    } finally {
      setIsLoadingSummary(false);
    }
  };

  // --- Mini-Me Extract Deal Terms ---
  const handleExtractDeal = async () => {
    if (!activeConversationId) return;
    setIsLoadingDeal(true);
    setShowDealModal(true);
    try {
      const deal = await api.extractDealTerms(activeConversationId);
      setDealData(deal);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to extract deal terms");
    } finally {
      setIsLoadingDeal(false);
    }
  };

  // --- Anti-circumvention detection ---
  const circumventionAlert = useMemo(() => {
    if (!draft.trim()) return null;
    for (const rx of CIRCUMVENTION_REGEXES) {
      if (rx.test(draft)) {
        return "Escrow Safety Notice: Direct contact details or off-platform payment terms detected. Direct transactions void escrow insurance, dispute resolution, and AML statutory protections. Keep communication and payments strictly on Yekis.";
      }
    }
    return null;
  }, [draft]);

  // --- Handle user typing event ---
  const handleDraftChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setDraft(val);

    if (activeConversationId) {
      if (!typingDispatchTimeout.current) {
        realtimeSocket.sendTyping(activeConversationId, true);
      } else {
        clearTimeout(typingDispatchTimeout.current);
      }
      typingDispatchTimeout.current = window.setTimeout(() => {
        if (activeConversationId) {
          realtimeSocket.sendTyping(activeConversationId, false);
        }
        typingDispatchTimeout.current = null;
      }, 2000);
    }
  };

  // --- Send message ---
  const handleSendMessage = async (customText?: string) => {
    const rawText = (customText ?? draft).trim();
    if ((!rawText && !attachedFile && !attachmentUrl) || !activeConversationId || isSending) return;

    setIsSending(true);
    setError("");

    try {
      if (activeConversationId) {
        realtimeSocket.sendTyping(activeConversationId, false);
      }

      let finalAttachmentUrl = attachmentUrl;
      const fileToUpload = attachedFile;

      if (fileToUpload) {
        try {
          setIsUploadingAttachment(true);
          const uploadRes = await api.uploadChatAttachment(fileToUpload);
          finalAttachmentUrl = uploadRes.url;
        } catch (uploadErr) {
          console.warn("Upload failed, falling back to data URL", uploadErr);
        } finally {
          setIsUploadingAttachment(false);
        }
      }

      const textToSend = rawText || (fileToUpload ? `📎 ${fileToUpload.name}` : "📎 Attachment");

      const newMsg = await api.sendChatMessage(
        activeConversationId,
        textToSend,
        finalAttachmentUrl || undefined
      );

      setMessages((prev) =>
        prev.some((message) => message.id === newMsg.id)
          ? prev
          : [...prev, newMsg],
      );
      if (!customText) setDraft("");
      setAttachmentUrl(null);
      setAttachedFile(null);
      setAttachmentName(null);

      // Update conversations list with latest message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? {
                ...c,
                latestMessage: {
                  body: newMsg.body,
                  createdAt: newMsg.createdAt,
                  senderId: newMsg.senderId,
                },
              }
            : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setIsSending(false);
      setIsUploadingAttachment(false);
    }
  };

  // --- Create New Conversation ---
  const handleCreateNewChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChatSubject.trim()) return;

    setIsCreatingChat(true);
    setError("");
    try {
      let createdId = "";
      if (newChatType === "DIRECT") {
        if (!newChatRecipientId.trim()) {
          setError("Recipient User ID or Email is required for direct chat");
          setIsCreatingChat(false);
          return;
        }
        const directConv = await api.createDirectConversation(
          newChatRecipientId.trim(),
          newChatSubject.trim()
        );
        createdId = directConv.id;
      } else {
// Uses the support endpoint so the backend notifies the support desk and
    // assigns an agent right away.
        const supportConv = await api.createSupportConversation(newChatSubject.trim());
        createdId = supportConv.id;
      }

      await loadConversations();
      setActiveConversationId(createdId);
      setShowNewChatModal(false);
      setNewChatSubject("");
      setNewChatRecipientId("");
      setShowMobileChatView(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create conversation");
    } finally {
      setIsCreatingChat(false);
    }
  };

  // --- Active conversation details ---
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Filtered conversations
  const filteredConversations = useMemo(() => {
    return conversations.filter((c) => {
      if (activeFilter === "DIRECT" && c.isSupport) return false;
      if (activeFilter === "SUPPORT" && !c.isSupport) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const subjectMatch = c.subject?.toLowerCase().includes(q);
      const participantMatch =
        c.otherParticipant?.displayName?.toLowerCase().includes(q) ||
        c.otherParticipant?.email?.toLowerCase().includes(q);
      const lastMsgMatch = c.latestMessage?.body?.toLowerCase().includes(q);

      return subjectMatch || participantMatch || lastMsgMatch;
    });
  }, [conversations, activeFilter, searchQuery]);

  return (
    <div className="chat-workspace">
      {/* ── LEFT SIDEBAR: THREADS LIST ── */}
      <aside
        className={`chat-sidebar ${
          showMobileChatView ? "chat-sidebar-hidden-mobile" : ""
        }`}
      >
        <div className="chat-sidebar-header">
          <div className="chat-sidebar-title-row">
            <div>
              <h2>Messages</h2>
              <span className="chat-sidebar-subtitle">
                {role === "FREELANCER"
                  ? "Client conversations & proposals"
                  : "Your project discussions"}
              </span>
            </div>
            <button
              className="chat-btn-new"
              onClick={() => setShowNewChatModal(true)}
              title="Start new conversation"
            >
              <Plus size={16} />
              <span>New</span>
            </button>
          </div>

          <div className="chat-search-box">
            <Search size={15} className="chat-search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="chat-search-clear"
                onClick={() => setSearchQuery("")}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="chat-filter-tabs">
            <button
              className={`filter-tab ${activeFilter === "ALL" ? "active" : ""}`}
              onClick={() => setActiveFilter("ALL")}
            >
              All
            </button>
            <button
              className={`filter-tab ${activeFilter === "DIRECT" ? "active" : ""}`}
              onClick={() => setActiveFilter("DIRECT")}
            >
              Direct
            </button>
            <button
              className={`filter-tab ${activeFilter === "SUPPORT" ? "active" : ""}`}
              onClick={() => setActiveFilter("SUPPORT")}
            >
              Support
            </button>
          </div>
        </div>

        <div className="chat-conversations-list">
          {filteredConversations.length === 0 ? (
            <div className="chat-empty-threads">
              <p>
                {activeFilter === "SUPPORT"
                  ? "No support tickets found"
                  : role === "FREELANCER"
                  ? "No client conversations found"
                  : "No conversations found"}
              </p>
              <button
                className="chat-empty-cta"
                onClick={() => {
                  setNewChatType(activeFilter === "SUPPORT" ? "SUPPORT" : "DIRECT");
                  setShowNewChatModal(true);
                }}
              >
                {activeFilter === "SUPPORT"
                  ? "Contact Support"
                  : role === "CLIENT"
                  ? "Message a Freelancer"
                  : "Start a Conversation"}
              </button>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = c.id === activeConversationId;
              const isSupport = c.isSupport;
              const title = isSupport
                ? "Yekis Support"
                : c.otherParticipant?.displayName ||
                  c.otherParticipant?.email?.split("@")[0] ||
                  c.subject;
              const avatarLetter = isSupport
                ? "Y"
                : (title[0] || "U").toUpperCase();
              const roleBadge = isSupport
                ? "SUPPORT"
                : c.otherParticipant?.role || "CLIENT";
              const roleBadgeClass = isSupport
                ? "support"
                : (c.otherParticipant?.role || "CLIENT").toLowerCase();

              return (
                <div
                  key={c.id}
                  className={`chat-thread-item ${isActive ? "active" : ""} ${
                    c.unread ? "unread" : ""
                  }`}
                  onClick={() => {
                    setActiveConversationId(c.id);
                    setShowMobileChatView(true);
                  }}
                >
                  {isSupport ? (
                    <div className="thread-avatar support-avatar">
                      {avatarLetter}
                    </div>
                  ) : (
                    <YekisAvatar
                      userId={c.otherParticipant?.id || c.id}
                      displayName={title}
                      size={40}
                      animate="hover"
                      className="thread-avatar"
                    />
                  )}

                  <div className="thread-content">
                    <div className="thread-title-row">
                      <strong className="thread-name">{title}</strong>
                      <span className={`thread-role-badge ${roleBadgeClass}`}>{roleBadge}</span>
                      {c.latestMessage && (
                        <span className="thread-time">
                          {new Date(c.latestMessage.createdAt).toLocaleTimeString(
                            [],
                            { hour: "2-digit", minute: "2-digit" }
                          )}
                        </span>
                      )}
                    </div>
                    <div className="thread-preview-row">
                      <p className="thread-snippet">
                        {c.latestMessage ? c.latestMessage.body : c.subject}
                      </p>
                      {c.unread && <span className="thread-unread-badge" />}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>


      </aside>

      {/* ── RIGHT MAIN: ACTIVE CONVERSATION ── */}
      <main
        className={`chat-window ${
          !showMobileChatView ? "chat-window-hidden-mobile" : ""
        }`}
      >
        {activeConversation ? (
          <>
            {/* Window Header */}
            <header className="chat-window-header">
              <button
                className="chat-mobile-back"
                onClick={() => setShowMobileChatView(false)}
                title="Back to conversations"
              >
                <ArrowLeft size={18} />
              </button>

              {activeConversation.isSupport ? (
                <div className="chat-header-avatar">Y</div>
              ) : (
                <YekisAvatar
                  userId={activeConversation.otherParticipant?.id}
                  displayName={activeConversation.otherParticipant?.displayName}
                  email={activeConversation.otherParticipant?.email}
                  size={40}
                  animate="hover"
                  className="chat-header-avatar"
                />
              )}

              <div className="chat-header-meta">
                <h3>
                  {activeConversation.isSupport
                    ? "Yekis Support"
                    : activeConversation.otherParticipant?.displayName ||
                      activeConversation.otherParticipant?.email ||
                      activeConversation.subject}
                </h3>
                <div className="chat-header-sub">
                  {isRemoteTyping ? (
                    <span className="typing-indicator-text">
                      typing<span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                    </span>
                  ) : (
<span>
                      {activeConversation.isSupport
                        ? "Official Support"
                        : `${
                            activeConversation.otherParticipant?.role || "CLIENT"
                          } · Online`}
                    </span>
                  )}
                </div>
              </div>

              {/* Header Mini-Me Co-Pilot Actions */}
              <div className="chat-header-actions">
                <button
                  className="chat-copilot-btn"
                  onClick={handleSummarize}
                  title="Mini-Me: Summarize Thread"
                >
                  <Bot size={15} />
                  <span>Thread Summary</span>
                </button>

                {!activeConversation.isSupport && (
                  <button
                    className="chat-copilot-btn deal-btn"
                    onClick={handleExtractDeal}
                    title={
                      role === "CLIENT"
                        ? "Mini-Me: Extract milestone terms & create contract"
                        : "Mini-Me: Extract Deal Terms"
                    }
                  >
                    <Sparkles size={15} />
                    <span>Extract Deal</span>
                  </button>
                )}
              </div>
            </header>

            {/* Messages Feed */}
            <div className="chat-messages-container" ref={messagesContainerRef}>
              {messages.length === 0 ? (
                <div className="chat-thread-welcome">
                  <div className="welcome-icon">
                    {activeConversation.isSupport ? (
                      <Bot size={28} />
                    ) : (
                      <Sparkles size={28} />
                    )}
                  </div>
                  <h4>
                    {activeConversation.isSupport
                      ? "Yekis Support Desk"
                      : "Direct Workspace"}
                  </h4>
                  <p>
                    {activeConversation.isSupport
                      ? "Have questions about payments, disputes, or account verification? Our support team is here to help."
                      : role === "CLIENT"
                      ? "Negotiate deliverables, discuss milestones, or clarify requirements with this freelancer safely under Escrow protection."
                      : "Discuss project details, propose milestones, and align with your client under Yekis Escrow protection."}
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.senderId === currentUserId;
                  const senderName = isMine
                    ? "You"
                    : m.sender.displayName ||
                      (m.sender.staffRole ? "Yekis Support" : m.sender.email);

                  return (
                    <div
                      key={m.id}
                      className={`chat-bubble-row ${isMine ? "mine" : "theirs"}`}
                    >
                      <div className="chat-bubble">
                        {!isMine && (
                          <span className="bubble-sender">{senderName}</span>
                        )}
                        <p className="bubble-body">{m.body}</p>
                        {m.attachmentUrl && (
                          <SecureAttachment
                            url={m.attachmentUrl}
                            token={api.getToken()}
                            label={getAttachmentLabel(m.attachmentUrl)}
                            isImage={isImageAttachment(m.attachmentUrl)}
                          />
                        )}
                        <div className="bubble-meta">
                          <span className="bubble-time">
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine && (
                            <CheckCheck size={13} className="bubble-check" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              {isRemoteTyping && (
                <div className="chat-typing-bubble">
                  <span>typing</span>
                  <div className="typing-dots">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* ── MINI-ME SMART REPLY CHIPS ── */}
            {(smartReplies.length > 0 || isLoadingReplies) && (
              <div className="chat-smart-replies-bar">
                <div className="smart-replies-label">
                  <Sparkles size={13} />
                  <span>Mini-Me:</span>
                </div>
                {isLoadingReplies ? (
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-tertiary)", fontStyle: "italic" }}>
                    Analyzing context...
                  </span>
                ) : (
                  <div className="smart-replies-list">
                    {smartReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        className="smart-reply-chip"
                        onClick={() => handleSendMessage(reply)}
                        title="Click to send this response"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── ANTI-CIRCUMVENTION CAUTION ── */}
            {circumventionAlert && (
              <div className="chat-anti-circumvention-banner">
                <ShieldAlert size={18} className="shield-icon" />
                <p>{circumventionAlert}</p>
              </div>
            )}

            {/* ── COMPOSER ── */}
            <div className="chat-composer-section">
              <div className="composer-input-box">
                <textarea
                  value={draft}
                  onChange={handleDraftChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendMessage();
                    }
                  }}
                  placeholder={
                    activeConversation.isSupport
                      ? "Describe your question or issue... (Enter to send)"
                      : role === "CLIENT"
                      ? "Type a message or discuss milestone terms... (Enter to send)"
                      : "Type a message or milestone proposal... (Enter to send)"
                  }
                  rows={1}
                />

                <div className="composer-actions">
                  <label
                    className="composer-icon-btn"
                    title="Attach document or image"
                  >
                    <Paperclip size={18} />
                    <input
                      type="file"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setAttachedFile(file);
                          setAttachmentName(file.name);
                          setAttachmentUrl(URL.createObjectURL(file));
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>

                  <button
                    className="composer-send-btn"
                    disabled={(!draft.trim() && !attachmentUrl && !attachedFile) || isSending || isUploadingAttachment}
                    onClick={() => void handleSendMessage()}
                    title="Send message"
                  >
                    {isUploadingAttachment ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
                  </button>
                </div>
              </div>
              {(attachmentName || attachmentUrl) && (
                <div className="composer-attachment-tag">
                  <FileText size={13} />
                  <span>{attachmentName || "File attached ready to send"}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAttachmentUrl(null);
                      setAttachedFile(null);
                      setAttachmentName(null);
                    }}
                    title="Remove attachment"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
              {error && <p className="chat-error-banner">{error}</p>}
            </div>
          </>
        ) : (
          <div className="chat-no-active">
            <div className="no-active-icon">
              <Bot size={42} />
            </div>
            <h3>
              {role === "FREELANCER"
                ? "Freelancer Messages Workspace"
                : "Client Messages Workspace"}
            </h3>
            <p>
              {role === "FREELANCER"
                ? "Select a conversation from the left to collaborate with clients, negotiate milestones, or reach official support."
                : "Select a conversation from the left to discuss project terms with freelancers, or start a new support inquiry."}
            </p>
            <button
              className="chat-primary-btn"
              onClick={() => setShowNewChatModal(true)}
            >
              <Plus size={16} />
              <span>Start New Conversation</span>
            </button>
          </div>
        )}
      </main>

      {/* ── MODAL: THREAD SUMMARY (MINI-ME DIGEST) ── */}
      {showSummaryModal && (
        <div
          className="chat-modal-overlay"
          onClick={() => setShowSummaryModal(false)}
        >
          <div
            className="chat-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chat-modal-header">
              <div className="modal-title-with-icon">
                <Bot size={20} className="modal-bot-icon" />
                <h3>Mini-Me Thread Digest</h3>
              </div>
              <button
                className="chat-modal-close"
                onClick={() => setShowSummaryModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="chat-modal-body">
              {isLoadingSummary ? (
                <div className="chat-modal-loading">
                  <Sparkles size={24} className="spin-icon" />
                  <p>Analyzing conversation context & extracting key terms...</p>
                </div>
              ) : summaryData ? (
                <div className="summary-content">
                  <div className="summary-section">
                    <span className="summary-label">Topic</span>
                    <p className="summary-val bold">{summaryData.topic}</p>
                  </div>

                  <div className="summary-section">
                    <span className="summary-label">Key Requirements</span>
                    <ul className="summary-list">
                      {summaryData.keyPoints.map((point, idx) => (
                        <li key={idx}>{point}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="summary-grid">
                    <div>
                      <span className="summary-label">Agreed Budget</span>
                      <p className="summary-val highlight">
                        {summaryData.agreedBudgetETB
                          ? `ETB ${summaryData.agreedBudgetETB}`
                          : "Pending final quote"}
                      </p>
                    </div>
                    <div>
                      <span className="summary-label">Estimated Timeline</span>
                      <p className="summary-val">{summaryData.detectedTimeline}</p>
                    </div>
                  </div>

                  <div className="summary-section">
                    <span className="summary-label">Recommended Next Action</span>
                    <p className="summary-val callout">{summaryData.nextStep}</p>
                  </div>
                </div>
              ) : (
                <p>No summary could be generated yet.</p>
              )}
            </div>

            <div className="chat-modal-footer">
              <button
                className="chat-secondary-btn"
                onClick={() => setShowSummaryModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EXTRACT DEAL TERMS ── */}
      {showDealModal && (
        <div
          className="chat-modal-overlay"
          onClick={() => setShowDealModal(false)}
        >
          <div
            className="chat-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chat-modal-header">
              <div className="modal-title-with-icon">
                <Sparkles size={20} className="modal-sparkle-icon" />
                <h3>Mini-Me Deal Terms Extractor</h3>
              </div>
              <button
                className="chat-modal-close"
                onClick={() => setShowDealModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="chat-modal-body">
              {isLoadingDeal ? (
                <div className="chat-modal-loading">
                  <Sparkles size={24} className="spin-icon" />
                  <p>Extracting contract deliverables & pricing...</p>
                </div>
              ) : dealData ? (
                <div className="deal-terms-card">
                  <div className="deal-header-badge">
                    <span
                      className={`confidence-pill ${dealData.confidence.toLowerCase()}`}
                    >
                      Confidence: {dealData.confidence}
                    </span>
                    <span
                      className={`escrow-pill ${
                        dealData.readyForEscrow ? "ready" : "pending"
                      }`}
                    >
                      {dealData.readyForEscrow
                        ? "Escrow Ready"
                        : "Requires Further Alignment"}
                    </span>
                  </div>

                  <div className="deal-field">
                    <label>Suggested Milestone Title</label>
                    <strong>{dealData.suggestedTitle}</strong>
                  </div>

                  <div className="deal-grid">
                    <div>
                      <label>Suggested Budget</label>
                      <b className="deal-amount">
                        ETB {dealData.suggestedBudgetETB.toLocaleString()}
                      </b>
                    </div>
                    <div>
                      <label>Estimated Duration</label>
                      <b>{dealData.estimatedDays} Days</b>
                    </div>
                  </div>

                  <p className="deal-disclaimer">
                    Review terms before initiating escrow funding. Yekis holds
                    funds in trust until delivery acceptance.
                  </p>
                </div>
              ) : (
                <p>No deal terms could be extracted from this conversation.</p>
              )}
            </div>

            <div className="chat-modal-footer">
              <button
                className="chat-secondary-btn"
                onClick={() => setShowDealModal(false)}
              >
                Cancel
              </button>
              {onNavigateToContracts && (
                <button
                  className="chat-primary-btn"
                  onClick={() => {
                    setShowDealModal(false);
                    onNavigateToContracts();
                  }}
                >
                  <span>Go to Contracts & Escrow</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE NEW CONVERSATION ── */}
      {showNewChatModal && (
        <div
          className="chat-modal-overlay"
          onClick={() => setShowNewChatModal(false)}
        >
          <div
            className="chat-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chat-modal-header">
              <h3>Start New Conversation</h3>
              <button
                className="chat-modal-close"
                onClick={() => setShowNewChatModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNewChat}>
              <div className="chat-modal-body">
                <div className="chat-type-selector">
                  <button
                    type="button"
                    className={`type-btn ${
                      newChatType === "DIRECT" ? "active" : ""
                    }`}
                    onClick={() => setNewChatType("DIRECT")}
                  >
                    Direct Message
                  </button>
                  <button
                    type="button"
                    className={`type-btn ${
                      newChatType === "SUPPORT" ? "active" : ""
                    }`}
                    onClick={() => setNewChatType("SUPPORT")}
                  >
                    Support Ticket
                  </button>
                </div>

                {newChatType === "DIRECT" && (
                  <div className="form-group">
                    <label>
                      {role === "CLIENT"
                        ? "Freelancer Email or User ID"
                        : "Client Email or User ID"}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        role === "CLIENT"
                          ? "e.g. freelancer@domain.com or user ID"
                          : "e.g. client@domain.com or user ID"
                      }
                      value={newChatRecipientId}
                      onChange={(e) => setNewChatRecipientId(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Subject / Topic</label>
                  <input
                    type="text"
                    placeholder={
                      newChatType === "SUPPORT"
                        ? "e.g. Payment inquiry, verification help, or dispute"
                        : role === "CLIENT"
                        ? "e.g. Mobile App Frontend Milestones"
                        : "e.g. Milestone proposal & deliverables"
                    }
                    value={newChatSubject}
                    onChange={(e) => setNewChatSubject(e.target.value)}
                    required
                  />
                </div>

                {error && <p className="chat-modal-error">{error}</p>}
              </div>

              <div className="chat-modal-footer">
                <button
                  type="button"
                  className="chat-secondary-btn"
                  onClick={() => setShowNewChatModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="chat-primary-btn"
                  disabled={isCreatingChat}
                >
                  {isCreatingChat ? "Creating..." : "Start Chat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
