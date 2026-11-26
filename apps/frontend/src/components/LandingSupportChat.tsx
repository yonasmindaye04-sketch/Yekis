// === LANDING SUPPORT CHAT ===
//
// Floating "Need help?" launcher plus its chat popover for public marketing
// pages. Lives in components/ so any landing variant (LandingPage, LandingPageV2)
// can mount the same guest-support flow.
//
// Guest flow: greeting -> create a scoped support ticket with the first message
// -> stay connected to that thread without requiring an account or email.
//
// The ticket endpoint hands back a token scoped to that ONE conversation, which
// is what makes this a real two-way conversation rather than a dead end: the
// guest can read staff replies and send follow-ups. Before this existed the
// widget could POST a ticket but every read and follow-up returned 401, so a
// support answer was written to the database that the visitor never saw.
//
// Live updates arrive over the existing WebSocket, authenticated with the same
// scoped token on a dedicated connection (the app-wide singleton belongs to the
// logged-in session). A slow poll runs as a fallback so replies still land if
// the socket cannot connect.
//
// Styled entirely by the existing .landing-chat-fab / .landing-support-popover
// .chat-variant rules in index.css.
import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Paperclip, Send } from "lucide-react";
import { api, type ChatMessage } from "../api/client";
import { RealtimeSocketManager } from "../api/socket";
import { playSound } from "../lib/soundEffects";
import { type Language, useI18n } from "../i18n";
import { OPEN_SUPPORT_CHAT_EVENT } from "./supportChatEvents";
import { SecureAttachment } from "./SecureAttachment";
import { getAttachmentLabel, isImageAttachment } from "./attachmentMeta";

type Bubble = {
  id: string;
  text: string;
  sender: "agent" | "user";
  /** Storage path returned by the upload endpoint, when the message has a file. */
  attachmentUrl?: string;
};

type ChatStep = "initial" | "submitted";

const SUPPORT_CHAT_COPY: Record<
  Language,
  {
    greeting: string;
    attachedFilePrefix: string;
    attachmentFailed: string;
    syncFailed: string;
    ticketErrorFallback: string;
    sendErrorPrefix: string;
    sendErrorFallback: string;
    sendAnother: string;
    typeMessage: string;
    talkingToPrefix: string;
    connectedStatus: string;
    checkingStatus: string;
    defaultSubtitle: string;
    popoverAria: string;
    title: string;
    closeAria: string;
    inputAria: string;
    attachAria: string;
    sendAria: string;
    openAria: string;
    fabLabel: string;
  }
> = {
  en: {
    greeting: "Hi there! How can we help you today?",
    attachedFilePrefix: "Attached file:",
    attachmentFailed:
      "Your support request was sent, but the attachment could not be uploaded. Please try attaching it again.",
    syncFailed: "We couldn't load the conversation yet — refreshing shortly.",
    ticketErrorFallback:
      "Sorry, there was an error sending your message. Please try again.",
    sendErrorPrefix: "Could not send that:",
    sendErrorFallback: "Could not send that message. Please try again.",
    sendAnother: "Send another message...",
    typeMessage: "Type your message...",
    talkingToPrefix: "You're talking to",
    connectedStatus: "Connected — replies appear here",
    checkingStatus: "Checking for replies...",
    defaultSubtitle: "Typically replies in a few minutes",
    popoverAria: "Yekis support chat",
    title: "Yekis Support",
    closeAria: "Close support chat",
    inputAria: "Support message",
    attachAria: "Attach file",
    sendAria: "Send message",
    openAria: "Open Yekis support chat",
    fabLabel: "Need help?",
  },
  am: {
    greeting: "ሰላም! ዛሬ እንዴት ልንረዳዎ እንችላለን?",
    attachedFilePrefix: "የተያያዘ ፋይል:",
    attachmentFailed:
      "የድጋፍ ጥያቄዎ ተልኳል፣ ነገር ግን አባሪው ፋይል ሊጫን አልቻለም። እባክዎ ደግመው ይሞክሩ።",
    syncFailed: "ውይይቱን ገና መጫን አልቻልንም — በጥቂት ጊዜ ውስጥ ይታደሳል።",
    ticketErrorFallback: "ይቅርታ፣ መልዕክትዎን በመላክ ላይ ስህተት ተፈጥሯል። እባክዎ ደግመው ይሞክሩ።",
    sendErrorPrefix: "መላክ አልተቻለም:",
    sendErrorFallback: "መልዕክቱን መላክ አልተቻለም። እባክዎ ደግመው ይሞክሩ።",
    sendAnother: "ሌላ መልዕክት ይላኩ...",
    typeMessage: "መልዕክትዎን ይጻፉ...",
    talkingToPrefix: "እያወሩ ያሉት ከ",
    connectedStatus: "ተገናኝቷል — ምላሾች እዚህ ይታያሉ",
    checkingStatus: "ምላሾችን በመፈተሽ ላይ...",
    defaultSubtitle: "ብዙውን ጊዜ በጥቂት ደቂቃዎች ውስጥ ይመልሳል",
    popoverAria: "የYeKis የድጋፍ ውይይት",
    title: "የYeKis ድጋፍ",
    closeAria: "የድጋፍ ውይይቱን ዝጋ",
    inputAria: "የድጋፍ መልዕክት",
    attachAria: "ፋይል አያይዝ",
    sendAria: "መልዕክት ላክ",
    openAria: "የYeKis የድጋፍ ውይይት ክፈት",
    fabLabel: "እገዛ ይፈልጋሉ?",
  },
  om: {
    greeting: "Akkam jirtu! Har'a akkamitti isin gargaaruu dandeenya?",
    attachedFilePrefix: "Faayila maxxanfame:",
    attachmentFailed:
      "Gaaffiin deeggarsaa keessan ergameera, garuu faayilli maxxanfame fe'amuu hin dandeenye. Maaloo irra deebi'aa yaalaa.",
    syncFailed: "Haasawa kana fe'uu hin dandeenye — yeroo dhiyootti haarawooma.",
    ticketErrorFallback:
      "Dhiifama, ergaa keessan erguu irratti dogoggorri uumameera. Maaloo irra deebi'aa yaalaa.",
    sendErrorPrefix: "Erguun hin danda'amne:",
    sendErrorFallback: "Ergaa kana erguun hin danda'amne. Irra deebi'aa yaalaa.",
    sendAnother: "Ergaa biraa ergi...",
    typeMessage: "Ergaa keessan barreessaa...",
    talkingToPrefix: "Kan haasofsiisaa jirtan:",
    connectedStatus: "Walqunnameera — deebiin asitti mul'ata",
    checkingStatus: "Deebii sakatta'aa jira...",
    defaultSubtitle: "Yeroo baay'ee daqiiqaa muraasa keessatti deebisa",
    popoverAria: "Haasawa deeggarsaa Yekis",
    title: "Deeggarsa Yekis",
    closeAria: "Haasawa deeggarsaa cufi",
    inputAria: "Ergaa deeggarsaa",
    attachAria: "Faayila maxxansi",
    sendAria: "Ergaa ergi",
    openAria: "Haasawa deeggarsaa Yekis bani",
    fabLabel: "Gargaarsa barbaadduu?",
  },
  ti: {
    greeting: "ሰላም! ሎሚ ብኸመይ ክንሕግዘኩም ንኽእል?",
    attachedFilePrefix: "ዝተተሓሓዘ ፋይል:",
    attachmentFailed:
      "ሕቶ ደገፍኩም ተላኢኹ ኣሎ፣ እቲ ዝተተሓሓዘ ፋይል ግን ክጽዓን ኣይከኣለን። በጃኹም እንደገና ፈትኑ።",
    syncFailed: "ነቲ ዝርርብ ገና ክንጽዕኖ ኣይከኣልናን — ድሕሪ ቁሩብ ግዜ ክሕደስ እዩ።",
    ticketErrorFallback: "ይቕረታ፣ መልእኽትኹም ኣብ ምልኣኽ ጌጋ ኣጋጢሙ። እንደገና ፈትኑ።",
    sendErrorPrefix: "ምልኣኽ ኣይተኻእለን:",
    sendErrorFallback: "ነቲ መልእኽቲ ምልኣኽ ኣይተኻእለን። እንደገና ፈትኑ።",
    sendAnother: "ካልእ መልእኽቲ ስደድ...",
    typeMessage: "መልእኽትኹም ጸሓፉ...",
    talkingToPrefix: "ተዛራቢኹም:",
    connectedStatus: "ተራኺቡ ኣሎ — መልስታት ኣብዚ ይረኣዩ",
    checkingStatus: "መልስታት ይምርምር ኣሎ...",
    defaultSubtitle: "ብልምዲ ኣብ ውሽጢ ሒደት ደቓይቕ ይምልስ",
    popoverAria: "ዝርርብ ደገፍ YeKis",
    title: "ደገፍ YeKis",
    closeAria: "ዝርርብ ደገፍ ዕጾ",
    inputAria: "መልእኽቲ ደገፍ",
    attachAria: "ፋይል ኣተሓሕዝ",
    sendAria: "መልእኽቲ ስደድ",
    openAria: "ዝርርብ ደገፍ YeKis ክፈት",
    fabLabel: "ሓገዝ የድልየኩም ድዩ?",
  },
};

/** Fallback poll interval when the socket is unavailable. */
const POLL_MS = 1500;
const GUEST_SESSION_KEY = "yekis-guest-support-session";

/**
 * Reads the `sub` claim from a JWT without verifying it.
 *
 * Verification is the server's job — we only need to know which sender id is
 * "me" so our own messages are rendered on the correct side. The token is
 * already in this tab's memory and grants nothing beyond the one thread.
 */
function readTokenSubject(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((c) => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    const parsed = JSON.parse(json) as { sub?: string };
    return parsed.sub ?? null;
  } catch {
    return null;
  }
}

export function LandingSupportChat() {
  const { language } = useI18n();
  const copy = SUPPORT_CHAT_COPY[language] ?? SUPPORT_CHAT_COPY.en;
  const greetingBubble: Bubble = {
    id: "greeting",
    text: copy.greeting,
    sender: "agent",
  };
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Bubble[]>([greetingBubble]);
  const [inputText, setInputText] = useState("");
  const [chatStep, setChatStep] = useState<ChatStep>("initial");
  const [guestConversationId, setGuestConversationId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [assignedStaff, setAssignedStaff] = useState<{ id: string; name: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<RealtimeSocketManager | null>(null);
  /** Guest user id, read from the scoped token so "mine" vs "agent" is exact. */
  const guestUserIdRef = useRef<string | null>(null);

  // Keep greeting text synced with the active UI language.
  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.id === "greeting" ? { ...m, text: copy.greeting } : m)),
    );
  }, [copy.greeting]);

  // Keep the newest bubble in view whenever the thread grows or the panel opens.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  // Close the socket when the component goes away so a guest token is not left
  // connected after the visitor navigates away.
  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Let the footer / nav open this widget without mounting a second copy.
  useEffect(() => {
    const openChat = () => setOpen(true);
    window.addEventListener(OPEN_SUPPORT_CHAT_EVENT, openChat);
    return () => window.removeEventListener(OPEN_SUPPORT_CHAT_EVENT, openChat);
  }, []);

  /**
   * Pull the authoritative thread and merge it into the bubble list.
   *
   * The server is the source of truth: it knows the real senders and ids, which
   * is how a staff reply is distinguished from the visitor's own message.
   */
  const syncThread = useCallback(
    async (conversationId: string, token: string) => {
      const serverMessages: ChatMessage[] = await api.getGuestChatMessages(conversationId, token);

      setMessages(() => {
        const real: Bubble[] = serverMessages.map((m) => ({
          id: m.id,
          text: m.body,
          // The visitor owns the thread's guest account, so anything they did not
          // send came from staff.
          sender: m.senderId === guestUserIdRef.current ? "user" : "agent",
          ...(m.attachmentUrl ? { attachmentUrl: m.attachmentUrl } : {}),
        }));
        return [{ id: "greeting", text: copy.greeting, sender: "agent" }, ...real];
      });
    },
    [copy.greeting],
  );

  const startLiveUpdates = useCallback(
    (conversationId: string, token: string) => {
      socketRef.current?.disconnect();

      const socket = new RealtimeSocketManager({ getToken: () => token });
      socketRef.current = socket;

      const offMessage = socket.on<{ conversationId: string }>(
        "chat:new_message",
        (data) => {
          if (data.conversationId === conversationId) {
            playSound("messageReceived");
            void syncThread(conversationId, token).catch(() => {
              /* fall through to the poll */
            });
          }
        },
      );

      const offStatus = socket.onStatusChange((connected) => {
        setLive(connected);
      });

      socket.connect();

      return () => {
        offMessage();
        offStatus();
        socket.disconnect();
        if (socketRef.current === socket) socketRef.current = null;
      };
    },
    [syncThread],
  );

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(GUEST_SESSION_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as {
        conversationId?: string;
        token?: string;
        assignedStaff?: { id: string; name: string } | null;
      };
      if (!saved.conversationId || !saved.token) return;
      guestUserIdRef.current = readTokenSubject(saved.token);
      setGuestConversationId(saved.conversationId);
      setGuestToken(saved.token);
      setAssignedStaff(saved.assignedStaff ?? null);
      setChatStep("submitted");
      void syncThread(saved.conversationId, saved.token).catch(() => {
        sessionStorage.removeItem(GUEST_SESSION_KEY);
        setGuestConversationId(null);
        setGuestToken(null);
        setChatStep("initial");
      });
      startLiveUpdates(saved.conversationId, saved.token);
    } catch {
      sessionStorage.removeItem(GUEST_SESSION_KEY);
    }
  }, [startLiveUpdates, syncThread]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setAttachedFile(file);
    if (file) setInputText((current) => current || file.name);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !attachedFile) return;

    const text = inputText.trim() || (attachedFile ? attachedFile.name : "");
    // Captured before the composer resets: the upload happens later in the await
    // chain, by which point `attachedFile` state is already null. This is the
    // reason guest attachments were silently dropped.
    const pendingFile = attachedFile;

    const optimisticId = `optimistic-${Date.now()}`;
    setMessages((prev) => [...prev, { id: optimisticId, text, sender: "user" }]);
    setInputText("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";

    if (chatStep === "initial") {
      setSending(true);
      try {
        // A visitor can start immediately without creating an account or
        // supplying an email. The backend creates a scoped guest identity;
        // they can continue receiving staff replies in this same window.
        const result = await api.createGuestSupport(undefined, text);
        playSound("messageSent");
        if (result?.id) setGuestConversationId(result.id);
        if (result?.accessToken) setGuestToken(result.accessToken);
        if (result?.accessToken) {
          guestUserIdRef.current = readTokenSubject(result.accessToken);
        }
        if (result?.assignedStaff) setAssignedStaff(result.assignedStaff);
        sessionStorage.setItem(GUEST_SESSION_KEY, JSON.stringify({
          conversationId: result.id,
          token: result.accessToken,
          assignedStaff: result.assignedStaff ?? null,
        }));
        setChatStep("submitted");

        if (result?.id && result?.accessToken) {
          // The ticket endpoint creates the conversation before a guest token
          // exists, so the first attachment is sent as an authenticated
          // follow-up message after the scoped token is issued.
          if (pendingFile) {
            try {
              const upload = await api.uploadGuestChatAttachment(
                pendingFile,
                result.accessToken,
              );
              await api.sendGuestChatMessage(
                result.id,
                result.accessToken,
                `${copy.attachedFilePrefix} ${pendingFile.name}`,
                upload.url,
              );
            } catch {
              setMessages((prev) => [
                ...prev,
                {
                  id: "attachment-error",
                  text: copy.attachmentFailed,
                  sender: "agent",
                },
              ]);
            }
          }

          // Establish the live connection and load the authoritative thread.
          startLiveUpdates(result.id, result.accessToken);
          await syncThread(result.id, result.accessToken).catch(() => {
            setMessages((prev) => [
              ...prev,
              {
                id: "sync-failed",
                text: copy.syncFailed,
                sender: "agent",
              },
            ]);
          });
        }
      } catch (err) {
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        setMessages((prev) => [
          ...prev,
          {
            id: "ticket-error",
            text:
              err instanceof Error && err.message
                ? err.message
                : copy.ticketErrorFallback,
            sender: "agent",
          },
        ]);
      } finally {
        setSending(false);
      }
      return;
    }

// submitted: append to the open ticket so the agent sees the full context.
    if (guestConversationId && guestToken) {
      setSending(true);
      try {
        // The attachment must actually be uploaded. Previously the paperclip
        // showed the filename in the composer but nothing was ever sent, so a
        // guest's screenshot was silently discarded.
        let attachmentUrl: string | undefined;
        if (pendingFile) {
          const up = await api.uploadGuestChatAttachment(pendingFile, guestToken);
          attachmentUrl = up.url;
        }

        await api.sendGuestChatMessage(
          guestConversationId,
          guestToken,
          text,
          attachmentUrl,
        );
        playSound("messageSent");
        await syncThread(guestConversationId, guestToken);
      } catch (err) {
        setMessages((prev) => prev.filter((message) => message.id !== optimisticId));
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            text:
              err instanceof Error && err.message
                ? `${copy.sendErrorPrefix} ${err.message}`
                : copy.sendErrorFallback,
            sender: "agent",
          },
        ]);
      } finally {
        setSending(false);
      }
    }
  };

  // Fallback polling so replies still arrive if the socket cannot connect.
  useEffect(() => {
    if (chatStep !== "submitted" || !guestConversationId || !guestToken) return;
    if (live) return;

    const id = window.setInterval(() => {
      void syncThread(guestConversationId, guestToken).catch(() => {});
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [chatStep, guestConversationId, guestToken, live, syncThread]);

  const placeholder = chatStep === "submitted"
    ? copy.sendAnother
    : attachedFile
      ? attachedFile.name
      : copy.typeMessage;

  const headerSubtitle = assignedStaff
    ? `${copy.talkingToPrefix} ${assignedStaff.name}`
    : chatStep === "submitted"
      ? live
        ? copy.connectedStatus
        : copy.checkingStatus
      : copy.defaultSubtitle;

  return (
    <>
      {open && (
        <aside
          className="landing-support-popover chat-variant"
          aria-label={copy.popoverAria}
        >
          <div className="landing-support-head chat-head">
            <div className="chat-head-info">
              <div className="chat-agent-avatar">Y</div>
              <div>
                <h3>{copy.title}</h3>
                <p>{headerSubtitle}</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label={copy.closeAria}
            >
              ×
            </button>
          </div>

          <div className="chat-messages-area">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`chat-bubble ${message.sender}`}
              >
                <p>{message.text}</p>
                {message.attachmentUrl && (
                  <SecureAttachment
                    url={message.attachmentUrl}
                    token={guestToken}
                    label={getAttachmentLabel(message.attachmentUrl)}
                    isImage={isImageAttachment(message.attachmentUrl)}
                  />
                )}
              </div>
            ))}
            {sending && <div className="chat-bubble agent typing">...</div>}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-composer-area">
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileChange}
              accept="image/*,.pdf,.doc,.docx"
            />
            <input
              type="text"
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void handleSendMessage();
                }
              }}
              placeholder={placeholder}
              disabled={sending}
              aria-label={copy.inputAria}
            />
            <button
              className="chat-attach-btn"
              onClick={() => fileInputRef.current?.click()}
              aria-label={copy.attachAria}
              type="button"
            >
              <Paperclip size={20} strokeWidth={2.5} />
            </button>
            <button
              onClick={() => void handleSendMessage()}
              disabled={sending || (!inputText.trim() && !attachedFile)}
              aria-label={copy.sendAria}
              type="button"
            >
              <Send size={18} />
            </button>
          </div>
        </aside>
      )}

      <button
        className="landing-chat-fab"
        onClick={() => setOpen((current) => !current)}
        aria-label={copy.openAria}
        aria-expanded={open}
      >
        <MessageCircle size={22} color="currentColor" strokeWidth={2.5} />
        <span>{copy.fabLabel}</span>
      </button>
    </>
  );
}
