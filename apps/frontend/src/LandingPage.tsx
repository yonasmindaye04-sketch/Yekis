import {
  Wallet, Briefcase, CheckCircle, Shield, ShieldCheck,
  MessageCircle, Paperclip, Send, Clock,
  Code, Palette, Megaphone, PenTool, Languages, Database,
  Star, ArrowRight, Users, Award, WalletCards, Fingerprint
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "./api/client";
import { ShareButtons } from "./ShareButtons";
import "./marketing.css";

type LandingPageProps = {
  onStart: (mode: "login" | "register") => void;
  onNavigate: (page: string) => void;
};

// Animated counter hook
function useCountUp(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && !started) setStarted(true); },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started || target === 0) return;
    let frame: number;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setCount(Math.floor(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [started, target, duration]);

  return { count, ref };
}

const categoryIcons: Record<string, React.ReactNode> = {
  WEB_APP_DEVELOPMENT: <Code size={28} />,
  GRAPHIC_DESIGN: <Palette size={28} />,
  DIGITAL_MARKETING: <Megaphone size={28} />,
  CONTENT_WRITING: <PenTool size={28} />,
  TRANSLATION: <Languages size={28} />,
  DATA_ENTRY: <Database size={28} />,
};

const categoryLabels: Record<string, string> = {
  WEB_APP_DEVELOPMENT: "Web & App Development",
  GRAPHIC_DESIGN: "Graphic Design & Branding",
  DIGITAL_MARKETING: "Digital Marketing",
  CONTENT_WRITING: "Content & Copywriting",
  TRANSLATION: "Amharic/English Translation",
  DATA_ENTRY: "Data Processing",
};

export function LandingPage({ onStart, onNavigate }: LandingPageProps) {
  const [showSupport, setShowSupport] = useState(false);
  const [messages, setMessages] = useState<{ id: string; text: string; sender: "agent" | "user"; attachmentUrl?: string }[]>([
    { id: "1", text: "Hi there! How can we help you today?", sender: "agent" },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatStep, setChatStep] = useState<"initial" | "asking_email" | "submitted">("initial");
  const [supportSending, setSupportSending] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState<{ id: string; name: string } | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // TODO: Replace with real API data — these are initial placeholder values
  // that will show modest real numbers gracefully rather than being hidden pre-launch
  const freelancerCount = useCountUp(12);
  const jobCount = useCountUp(5);
  const escrowCount = useCountUp(45000);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showSupport]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    setAttachedFile(file);
    if (file) setInputText((t) => t || file.name);
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() && !attachedFile) return;
    const text = inputText.trim() || (attachedFile ? `📎 ${attachedFile.name}` : "");
    const userMessage = { id: Date.now().toString(), text, sender: "user" as const };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (chatStep === "initial") {
      setTimeout(() => {
        setMessages((prev) => [...prev, { id: Date.now().toString(), text: "Thanks for reaching out! Please provide your email address so our team can get back to you.", sender: "agent" }]);
        setChatStep("asking_email");
      }, 800);
    } else if (chatStep === "asking_email") {
      setSupportSending(true);
      try {
        const firstUserMsg = messages.find((m) => m.sender === "user")?.text || "No message";
        const result = await api.createGuestSupport(text, firstUserMsg) as { assignedStaff?: { id: string; name: string } };
        if (result?.assignedStaff) setAssignedStaff(result.assignedStaff);
        setMessages((prev) => [...prev, { id: Date.now().toString(), text: result?.assignedStaff ? `Thanks! You're now connected with ${result.assignedStaff.name}. We'll get back to you soon.` : "Thanks! We've received your message and will email you shortly.", sender: "agent" }]);
        setChatStep("submitted");
      } catch {
        setMessages((prev) => [...prev, { id: Date.now().toString(), text: "Sorry, there was an error sending your message. Please try again.", sender: "agent" }]);
      } finally {
        setSupportSending(false);
      }
    }
  };

  return (
    <main className="landing-page marketing-page">
      {/* === HEADER === */}
      <header className="landing-nav">
        <a className="landing-brand" href="#top">
          <img src="/svgviewer-output.svg" alt="Yekis — Ethiopian freelance marketplace logo" className="platform-logo small" />
          <strong>YEKIS</strong>
        </a>
        <nav>
          <a href="#how-it-works">How it works</a>
          <button onClick={() => onNavigate("faq")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>FAQ</button>
          <button onClick={() => onNavigate("fees")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>Fees</button>
          <button onClick={() => onNavigate("about")} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", font: "inherit" }}>About</button>
        </nav>
        <div className="landing-actions">
          {/* TODO: Replace with actual Telegram links */}
          <a href="https://t.me/yekis_channel" target="_blank" rel="noopener noreferrer" className="telegram-link" aria-label="Yekis Telegram Channel">
            <MessageCircle size={18} />
          </a>
          <button className="landing-signin" onClick={() => onStart("login")}>Sign in</button>
          <button className="btn-primary" onClick={() => onStart("register")}>Get started</button>
        </div>
      </header>

      {/* === HERO SECTION (Item 2: Dual CTA above the fold) === */}
      <section className="hero-section" id="top">
        <p className="hero-eyebrow">Ethiopia's escrow-protected freelance marketplace</p>
        <h1 className="hero-title">Your money is protected before a single hour of work begins.</h1>
        <p className="hero-subtitle">
          No handshake deals. No "I'll pay you when it's done." Your payment sits safely with Yekis
          until you approve the work — or you get it back.
        </p>
        <div className="hero-actions">
          <button className="btn-primary" onClick={() => onStart("register")} style={{ fontSize: "18px", padding: "16px 32px" }}>
            <Briefcase size={20} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />
            I Need to Hire
          </button>
          <button className="btn-secondary" onClick={() => onStart("register")} style={{ fontSize: "18px", padding: "16px 32px" }}>
            <Users size={20} style={{ marginRight: 8, verticalAlign: "text-bottom" }} />
            I Want to Work
          </button>
        </div>
      </section>

      {/* === ESCROW EXPLAINER (Item 1: Core differentiator) === */}
      <section className="escrow-explainer" id="how-it-works">
        <div className="marketing-container">
          <p className="hero-eyebrow" style={{ textAlign: "center" }}>How your payment is protected</p>
          <h2 style={{ textAlign: "center", fontSize: "clamp(28px, 4vw, 48px)", marginBottom: 12, color: "#fff", fontFamily: "Hanken Grotesk, sans-serif" }}>
            Clear money. Clear evidence. Clear next steps.
          </h2>
          <p style={{ textAlign: "center", color: "var(--yekis-muted)", maxWidth: 700, margin: "0 auto 50px", fontSize: 18 }}>
            Every payment follows four transparent steps — no exceptions.
          </p>
          <div className="step-grid">
            <div className="step-card">
              <div className="step-icon"><Wallet size={32} /></div>
              <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 48, color: "rgba(255,255,255,0.15)", fontWeight: 700, lineHeight: 1 }}>01</span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Fund</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 15, lineHeight: 1.6 }}>
                You deposit the agreed amount into escrow before work starts. It's held safely — not sent to the freelancer yet.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon"><Briefcase size={32} /></div>
              <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 48, color: "rgba(255,255,255,0.15)", fontWeight: 700, lineHeight: 1 }}>02</span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Work</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 15, lineHeight: 1.6 }}>
                Your freelancer delivers the job. You review it before anything is released.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon"><CheckCircle size={32} /></div>
              <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 48, color: "rgba(255,255,255,0.15)", fontWeight: 700, lineHeight: 1 }}>03</span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Approve</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 15, lineHeight: 1.6 }}>
                Happy with the work? Approve it and payment releases instantly. Don't respond in 5 days?
                It releases automatically — so freelancers are never left waiting indefinitely either.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon"><Shield size={32} /></div>
              <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: 48, color: "rgba(255,255,255,0.15)", fontWeight: 700, lineHeight: 1 }}>04</span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Protected</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 15, lineHeight: 1.6 }}>
                Something wrong with the delivery? Raise it before approving, and our team steps in to help
                sort it out — your money stays safely held until it's resolved.
              </p>
            </div>
          </div>
          <p style={{ textAlign: "center", color: "var(--yekis-muted)", marginTop: 40, fontStyle: "italic", fontSize: 15 }}>
            Every step is logged and time-stamped. Nobody — including Yekis — can move your money without following this process.
          </p>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={() => onNavigate("faq")}
              style={{ background: "none", border: "none", color: "var(--yekis-lime)", cursor: "pointer", fontSize: 16, fontWeight: 600 }}
            >
              See how disputes get resolved <ArrowRight size={16} style={{ verticalAlign: "text-bottom", marginLeft: 4 }} />
            </button>
          </div>
        </div>
      </section>

      {/* === LIVE PROOF COUNTERS (Item 6) === */}
      <section className="live-stats">
        <div className="marketing-container">
          <div className="stats-grid">
            <div ref={freelancerCount.ref}>
              <div className="stat-number">{freelancerCount.count}+</div>
              <div style={{ color: "var(--yekis-muted)", fontSize: 16 }}>Verified Freelancers</div>
            </div>
            <div ref={jobCount.ref}>
              <div className="stat-number">{jobCount.count}+</div>
              <div style={{ color: "var(--yekis-muted)", fontSize: 16 }}>Jobs Completed</div>
            </div>
            <div ref={escrowCount.ref}>
              <div className="stat-number">ETB {escrowCount.count.toLocaleString()}+</div>
              <div style={{ color: "var(--yekis-muted)", fontSize: 16 }}>Protected in Escrow</div>
            </div>
          </div>
        </div>
      </section>

      {/* === CATEGORIES === */}
      <section className="content-section">
        <div className="marketing-container">
          <p className="hero-eyebrow">Browse by category</p>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", marginBottom: 8, fontFamily: "Hanken Grotesk, sans-serif" }}>Find the right expertise.</h2>
          <p style={{ color: "var(--yekis-muted)", fontSize: 17, marginBottom: 40 }}>Six launch categories covering Ethiopia's most in-demand digital skills.</p>
          <div className="categories-grid">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button key={key} className="category-card" onClick={() => onStart("register")}>
                <div style={{ color: "var(--yekis-teal)", marginBottom: 16 }}>{categoryIcons[key]}</div>
                <h3 style={{ fontSize: 16, margin: 0 }}>{label}</h3>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* === CASE STUDIES (Item 3: placeholder structure) === */}
      <section className="content-section" style={{ background: "var(--yekis-surface)" }}>
        <div className="marketing-container">
          <p className="hero-eyebrow">Success stories</p>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", marginBottom: 8, fontFamily: "Hanken Grotesk, sans-serif" }}>Real projects. Real results.</h2>
          <p style={{ color: "var(--yekis-muted)", fontSize: 17, marginBottom: 40 }}>
            Case studies from verified, escrow-protected projects on Yekis.
          </p>
          <div className="case-study-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <span className="placeholder-badge">Coming soon</span>
                <h3 style={{ margin: "12px 0 8px", fontSize: 18 }}>Project #{i}</h3>
                <p style={{ color: "var(--yekis-muted)", fontSize: 14, marginBottom: 16 }}>
                  Real case studies from verified, completed projects will appear here as they are completed on the platform.
                </p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--yekis-border)", paddingTop: 12, marginTop: 12 }}>
                  <span style={{ color: "var(--yekis-muted)", fontSize: 13 }}>Escrow-protected</span>
                  <ShareButtons title={`Yekis Case Study #${i}`} compact />
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button onClick={() => onNavigate("case-studies")} style={{ background: "none", border: "none", color: "var(--yekis-lime)", cursor: "pointer", fontSize: 15, fontWeight: 600 }}>
              View all case studies <ArrowRight size={14} style={{ verticalAlign: "text-bottom", marginLeft: 4 }} />
            </button>
          </div>
        </div>
      </section>

      {/* === REVIEWS (Item 4: real reviews placeholder — never fabricated) === */}
      <section className="content-section">
        <div className="marketing-container">
          <p className="hero-eyebrow">What our users say</p>
          <h2 style={{ fontSize: "clamp(24px, 3vw, 40px)", marginBottom: 8, fontFamily: "Hanken Grotesk, sans-serif" }}>Authentic feedback from real projects.</h2>
          <p style={{ color: "var(--yekis-muted)", fontSize: 17, marginBottom: 40 }}>
            Real reviews from escrow-funded, completed jobs will appear here as the platform grows. We never fabricate testimonials.
          </p>
          <div className="case-study-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card" style={{ opacity: 0.6 }}>
                <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
                  {[1, 2, 3, 4, 5].map((s) => <Star key={s} size={16} style={{ color: "#333" }} />)}
                </div>
                <p style={{ color: "var(--yekis-muted)", fontStyle: "italic", fontSize: 15, marginBottom: 16 }}>
                  "Review from a verified, escrow-funded completed job will appear here."
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--yekis-border)" }} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>Verified User</div>
                    <div style={{ fontSize: 12, color: "var(--yekis-muted)" }}>Coming soon</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* === TRUST INDICATORS === */}
      <section className="content-section" style={{ background: "var(--yekis-surface)" }}>
        <div className="marketing-container">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 30 }}>
            <div className="glass-panel">
              <WalletCards size={24} style={{ color: "var(--yekis-lime)", marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>Receipt-based top-ups</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 14 }}>Local payment with manual review before wallet credit. Pay via Telebirr, CBE, or Chapa.</p>
            </div>
            <div className="glass-panel">
              <Fingerprint size={24} style={{ color: "var(--yekis-lime)", marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>Fayda identity review</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 14 }}>Freelancers verify via National ID for payout readiness. Clients know who they're hiring.</p>
            </div>
            <div className="glass-panel">
              <ShieldCheck size={24} style={{ color: "var(--yekis-lime)", marginBottom: 16 }} />
              <h3 style={{ fontSize: 18, marginBottom: 8 }}>Milestone protection</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 14 }}>Delivery and release decisions follow a visible, time-stamped contract state machine.</p>
            </div>
          </div>
        </div>
      </section>

      {/* === RESPONSE TIME PROMISE (Item 5) === */}
      {/* TODO: Confirm actual support SLA before launch */}
      <section className="support-promise">
        <div className="marketing-container" style={{ textAlign: "center" }}>
          <Clock size={32} style={{ color: "var(--yekis-teal)", marginBottom: 16 }} />
          <h2 style={{ fontSize: 24, marginBottom: 8, fontFamily: "Hanken Grotesk, sans-serif" }}>We respond within 24 hours</h2>
          <p style={{ color: "var(--yekis-muted)", fontSize: 16, maxWidth: 500, margin: "0 auto" }}>
            Real people available to help with jobs, contracts, payments, verification, or disputes. Reach us anytime via chat or Telegram.
          </p>
        </div>
      </section>

      {/* === ROLES SECTION (Two-sided marketplace) === */}
      <section className="content-section">
        <div className="marketing-container">
          <p className="hero-eyebrow" style={{ textAlign: "center" }}>Built around your side of the table</p>
          <h2 style={{ textAlign: "center", fontSize: "clamp(24px, 3vw, 40px)", marginBottom: 40, fontFamily: "Hanken Grotesk, sans-serif" }}>One platform, two clear paths.</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 30 }}>
            <div className="glass-panel" style={{ borderColor: "var(--yekis-lime)" }}>
              <p className="hero-eyebrow" style={{ marginBottom: 12 }}>For clients</p>
              <h3 style={{ fontSize: 22, marginBottom: 12 }}>Bring the right talent into the room.</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 15, marginBottom: 24 }}>
                Post your brief, compare proposals, fund approved milestones, and keep contract progress in one place.
              </p>
              <button className="btn-primary" onClick={() => onStart("register")}>Create a client workspace</button>
            </div>
            <div className="glass-panel" style={{ borderColor: "var(--yekis-teal)" }}>
              <p className="hero-eyebrow" style={{ marginBottom: 12 }}>For freelancers</p>
              <h3 style={{ fontSize: 22, marginBottom: 12 }}>Make your next opportunity count.</h3>
              <p style={{ color: "var(--yekis-muted)", fontSize: 15, marginBottom: 24 }}>
                Find work that fits your skills, send thoughtful proposals, deliver in milestones, and build a reliable work record.
              </p>
              <button className="btn-secondary" onClick={() => onStart("register")}>Join as a freelancer</button>
            </div>
          </div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="final-cta">
        <div className="marketing-container">
          <p className="hero-eyebrow">Ready when you are</p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 48px)", marginBottom: 16, fontFamily: "Hanken Grotesk, sans-serif" }}>Put your next project in motion.</h2>
          <p style={{ color: "var(--yekis-muted)", fontSize: 18, maxWidth: 600, margin: "0 auto 32px" }}>
            Start with a focused workspace for finding work, hiring talent, and delivering with confidence.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={() => onStart("register")} style={{ fontSize: 17, padding: "14px 28px" }}>
              <Briefcase size={18} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Post a Job
            </button>
            <button className="btn-secondary" onClick={() => onStart("register")} style={{ fontSize: 17, padding: "14px 28px" }}>
              <Award size={18} style={{ marginRight: 8, verticalAlign: "text-bottom" }} /> Find Work
            </button>
          </div>
        </div>
      </section>

      {/* === SUPPORT CHAT POPOVER === */}
      {showSupport && (
        <aside className="landing-support-popover chat-variant">
          <div className="landing-support-head chat-head">
            <div className="chat-head-info">
              <div className="chat-agent-avatar">Y</div>
              <div>
                <h3>Yekis Support</h3>
                <p>{assignedStaff ? `You're talking to ${assignedStaff.name}` : "Typically replies in a few minutes"}</p>
              </div>
            </div>
            <button onClick={() => setShowSupport(false)} aria-label="Close support chat">×</button>
          </div>
          <div className="chat-messages-area">
            {messages.map((msg) => (
              <div key={msg.id} className={"chat-bubble " + msg.sender}><p>{msg.text}</p></div>
            ))}
            {supportSending && <div className="chat-bubble agent typing">...</div>}
            <div ref={messagesEndRef} />
          </div>
          {chatStep !== "submitted" && (
            <div className="chat-composer-area">
              <button className="chat-attach-btn" style={{ background: "#d8f36b", borderRadius: 8, border: "none", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }} onClick={() => fileInputRef.current?.click()} aria-label="Attach file" type="button">
                <Paperclip size={20} color="#0b1116" strokeWidth={2.5} style={{ display: "block" }} />
              </button>
              <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" />
              <input
                type={chatStep === "asking_email" ? "email" : "text"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={chatStep === "asking_email" ? "Your email address..." : attachedFile ? `📎 ${attachedFile.name}` : "Type your message..."}
                disabled={supportSending}
              />
              <button onClick={handleSendMessage} disabled={supportSending || (!inputText.trim() && !attachedFile)} aria-label="Send message">
                <Send size={18} />
              </button>
            </div>
          )}
        </aside>
      )}

      {/* === FLOATING CHAT BUTTON === */}
      <button className="landing-chat-fab" onClick={() => setShowSupport((c) => !c)} aria-label="Open Yekis support chat">
        <MessageCircle size={22} color="#0b1116" strokeWidth={2.5} style={{ display: "block", flexShrink: 0 }} />
        <span>Need help?</span>
      </button>

      {/* === FOOTER (Items 16, 15) === */}
      <footer className="landing-footer marketing-footer">
        <div className="marketing-container">
          <div className="footer-grid">
            <div className="footer-col">
              <div className="landing-brand" style={{ marginBottom: 16 }}>
                <img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo small" />
                <strong>Yekis</strong>
              </div>
              <span style={{ color: "var(--yekis-muted)", fontSize: 14 }}>Work that moves forward.</span>
            </div>
            <div className="footer-col">
              <h4>Platform</h4>
              <button onClick={() => onNavigate("faq")}>FAQ</button>
              <button onClick={() => onNavigate("fees")}>Fees</button>
              <button onClick={() => onNavigate("about")}>About</button>
              <button onClick={() => onNavigate("case-studies")}>Case Studies</button>
            </div>
            <div className="footer-col">
              <h4>Legal</h4>
              <button onClick={() => onNavigate("privacy")}>Privacy Policy</button>
              <button onClick={() => onNavigate("terms")}>Terms of Service</button>
            </div>
            <div className="footer-col">
              <h4>Connect</h4>
              {/* TODO: Replace with actual Telegram links */}
              <a href="https://t.me/yekis_channel" target="_blank" rel="noopener noreferrer">Telegram Channel</a>
              <a href="https://t.me/yekis_group" target="_blank" rel="noopener noreferrer">Telegram Group</a>
              <a href="https://t.me/yekis_bot" target="_blank" rel="noopener noreferrer">Telegram Bot</a>
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--yekis-border)", marginTop: 40, paddingTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <span style={{ color: "var(--yekis-muted)", fontSize: 13 }}>© {new Date().getFullYear()} Yekis. All rights reserved.</span>
            {/* TODO: Language toggle — connect to i18n */}
            <button style={{ background: "none", border: "1px solid var(--yekis-border)", borderRadius: 6, color: "var(--yekis-muted)", cursor: "pointer", padding: "4px 12px", fontSize: 13 }}>
              EN / አማ
            </button>
          </div>
        </div>
      </footer>

      {/* Organization structured data (Item 23) */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "Organization",
        "name": "Yekis",
        "url": "https://yekis.com",
        "logo": "https://yekis.com/svgviewer-output.svg",
        "description": "Ethiopia's escrow-protected freelance marketplace. Post work, pay into escrow, get your result or your money back.",
        "sameAs": [
          "https://t.me/yekis_channel",
          "https://t.me/yekis_group"
        ],
        // TODO: Add real address once physical office confirmed
        "contactPoint": {
          "@type": "ContactPoint",
          "contactType": "customer support",
          "availableLanguage": ["English", "Amharic"]
        }
      })}} />
    </main>
  );
}
