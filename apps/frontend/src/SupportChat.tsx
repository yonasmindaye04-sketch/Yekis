// === IMPORTS ===
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Paperclip, Send, Smile } from "lucide-react";
import { api, type ChatMessage } from "./api/client";


// === MAIN COMPONENT ===
export function SupportChat({ userId }: { userId: string }) {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [subject, setSubject] = useState("Yekis support");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const messagesEnd = useRef<HTMLDivElement>(null);

  const loadThread = async () => {
    try {
      const conversations = await api.getChatConversations();
      const conversation = conversations[0];
      if (!conversation) return;
      setConversationId(conversation.id); setSubject(conversation.subject);
      const next = await api.getChatMessages(conversation.id); setMessages(next); await api.markChatRead(conversation.id);
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load support messages"); }
  };

  useEffect(() => { void loadThread(); const timer = window.setInterval(() => { void loadThread(); }, 5000); return () => window.clearInterval(timer); }, []);
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  const sendMessage = async () => {
    if (!draft.trim() || isSending) return;
    setIsSending(true); setError("");
    try {
      let activeId = conversationId;
      if (!activeId) { const conversation = await api.createChatConversation("Support request"); activeId = conversation.id; setConversationId(activeId); setSubject(conversation.subject); }
      const message = await api.sendChatMessage(activeId, draft.trim()); setMessages((current) => [...current, message]); setDraft("");
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to send message"); }
    finally { setIsSending(false); }
  };

  return <section className="single-chat-shell"><header className="single-chat-header"><button className="single-chat-back" aria-label="Back"><ArrowLeft size={21} /></button><div className="single-chat-avatar">Y</div><div><h2>{subject}</h2><p>Yekis support <span>· Typically replies in a few minutes</span></p></div><span className="single-chat-online" /></header><div className="single-chat-messages">{messages.length === 0 ? <div className="single-chat-welcome"><div className="single-chat-avatar large">Y</div><h3>How can we help?</h3><p>Ask about jobs, contracts, payments, verification, or disputes.</p></div> : messages.map((message) => <div className={`single-chat-message ${message.senderId === userId ? "mine" : "theirs"}`} key={message.id}><div className="single-chat-bubble"><p>{message.body}</p><small>{message.senderId === userId ? "You" : message.sender.staffRole ? "Yekis team" : "Support"} · {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div></div>)}<div ref={messagesEnd} /></div><div className="single-chat-compose"><textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder="Type your message" rows={1} /><button className="chat-compose-icon" aria-label="Attach a file"><Paperclip size={20} /></button><button className="chat-compose-icon" aria-label="Add emoji"><Smile size={20} /></button><button className="chat-send" onClick={() => void sendMessage()} disabled={isSending || !draft.trim()} aria-label="Send message"><Send size={18} /></button></div>{error && <p className="single-chat-error">{error}</p>}</section>;
}
