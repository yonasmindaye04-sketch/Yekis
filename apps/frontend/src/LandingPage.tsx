import {
  Wallet,
  Briefcase,
  CheckCircle,
  Shield,
  ShieldCheck,
  MessageCircle,
  Paperclip,
  Send,
  Clock,
  Code,
  Palette,
  Megaphone,
  PenTool,
  Languages,
  Database,
  ArrowRight,
  Users,
  Award,
  WalletCards,
  Fingerprint,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "./api/client";
import { ShareButtons } from "./ShareButtons";
import { MarketingFooter } from "./MarketingFooter";
import "./marketing.css";
import { useScrollReveal } from "./components/motion";

type LandingPageProps = {
  onStart: (mode: "login" | "register") => void;
  onNavigate: (page: string) => void;
};

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
  useScrollReveal();
  const [showSupport, setShowSupport] = useState(false);
  const [messages, setMessages] = useState<
    {
      id: string;
      text: string;
      sender: "agent" | "user";
      attachmentUrl?: string;
    }[]
  >([
    { id: "1", text: "Hi there! How can we help you today?", sender: "agent" },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatStep, setChatStep] = useState<
    "initial" | "asking_email" | "submitted"
  >("initial");
  const [supportSending, setSupportSending] = useState(false);
  const [assignedStaff, setAssignedStaff] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    const text =
      inputText.trim() || (attachedFile ? `📎 ${attachedFile.name}` : "");
    const userMessage = {
      id: Date.now().toString(),
      text,
      sender: "user" as const,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (chatStep === "initial") {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "Thanks for reaching out! Please provide your email address so our team can get back to you.",
            sender: "agent",
          },
        ]);
        setChatStep("asking_email");
      }, 800);
    } else if (chatStep === "asking_email") {
      if (!text.includes("@")) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: "Please enter a valid email address so we can reply to you.",
            sender: "agent",
          },
        ]);
        return;
      }
      setSupportSending(true);
      try {
        const firstUserMsg =
          messages.find((m) => m.sender === "user")?.text || "No message";
        const result = (await api.createGuestSupport(text, firstUserMsg)) as {
          assignedStaff?: { id: string; name: string };
        };
        if (result?.assignedStaff) setAssignedStaff(result.assignedStaff);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text: result?.assignedStaff
              ? `Thanks! You're now connected with ${result.assignedStaff.name}. We'll get back to you soon.`
              : "Thanks! We've received your message and will email you shortly.",
            sender: "agent",
          },
        ]);
        setChatStep("submitted");
      } catch (err: any) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString(),
            text:
              err?.message ||
              "Sorry, there was an error sending your message. Please try again.",
            sender: "agent",
          },
        ]);
      } finally {
        setSupportSending(false);
      }
    }
  };

  return (
    <main className="landing-page marketing-page">
      {/* === HERO SECTION (Item 2: Dual CTA above the fold) === */}
      <section className="hero-section" id="top" data-parallax="0.12">
        <p className="hero-eyebrow">
          Ethiopia's escrow-protected freelance marketplace
        </p>
        <h1 className="hero-title">
          Your money is protected before a single hour of work begins.
        </h1>
        <p className="hero-subtitle">
          No handshake deals. No "I'll pay you when it's done." Your payment
          sits safely with Yekis until you approve the work — or you get it
          back.
        </p>
        <div className="hero-actions">
          <button
            className="btn-primary"
            onClick={() => onStart("register")}
            style={{ fontSize: "18px", padding: "16px 32px" }}
          >
            <Briefcase
              size={20}
              style={{ marginRight: 8, verticalAlign: "text-bottom" }}
            />
            I Need to Hire
          </button>
          <button
            className="btn-secondary"
            onClick={() => onStart("register")}
            style={{ fontSize: "18px", padding: "16px 32px" }}
          >
            <Users
              size={20}
              style={{ marginRight: 8, verticalAlign: "text-bottom" }}
            />
            I Want to Work
          </button>
        </div>
      </section>

      {/* === ESCROW EXPLAINER (Item 1: Core differentiator) === */}
      <section className="escrow-explainer" id="how-it-works" data-reveal>
        <div className="marketing-container">
          <p className="hero-eyebrow" style={{ textAlign: "center" }}>
            How your payment is protected
          </p>
          <h2
            style={{
              textAlign: "center",
              fontSize: "clamp(28px, 4vw, 48px)",
              marginBottom: 12,
              color: "var(--color-text)",
              fontFamily: "Hanken Grotesk, sans-serif",
            }}
          >
            Clear money. Clear evidence. Clear next steps.
          </h2>
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              maxWidth: 700,
              margin: "0 auto 50px",
              fontSize: 18,
            }}
          >
            Every payment follows four transparent steps — guaranteed protection
            for both clients and freelancers.
          </p>
          <div className="step-grid">
            <div className="step-card">
              <div className="step-icon">
                <Wallet size={32} />
              </div>
              <span
                style={{
                  fontFamily: "Hanken Grotesk, sans-serif",
                  fontSize: 44,
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  lineHeight: 1,
                  opacity: 0.8,
                }}
              >
                01
              </span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Fund</h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                You deposit the agreed amount into escrow before work starts. It
                is held safely and not sent to the freelancer until you approve.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <Briefcase size={32} />
              </div>
              <span
                style={{
                  fontFamily: "Hanken Grotesk, sans-serif",
                  fontSize: 44,
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  lineHeight: 1,
                  opacity: 0.8,
                }}
              >
                02
              </span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Work</h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                The freelancer completes the agreed milestone and submits the
                deliverables for your review.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <CheckCircle size={32} />
              </div>
              <span
                style={{
                  fontFamily: "Hanken Grotesk, sans-serif",
                  fontSize: 44,
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  lineHeight: 1,
                  opacity: 0.8,
                }}
              >
                03
              </span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Approve</h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                Once you are satisfied with the delivered work, you approve it
                and funds release immediately to the freelancer's wallet.
              </p>
            </div>
            <div className="step-card">
              <div className="step-icon">
                <Shield size={32} />
              </div>
              <span
                style={{
                  fontFamily: "Hanken Grotesk, sans-serif",
                  fontSize: 44,
                  color: "var(--color-primary)",
                  fontWeight: 700,
                  lineHeight: 1,
                  opacity: 0.8,
                }}
              >
                04
              </span>
              <h3 style={{ margin: "12px 0 8px", fontSize: 20 }}>Protected</h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 15,
                  lineHeight: 1.6,
                }}
              >
                If revisions are needed or an issue arises, our support team
                mediates with clear evidence to ensure fair resolution.
              </p>
            </div>
          </div>
          <p
            style={{
              textAlign: "center",
              color: "var(--color-text-secondary)",
              marginTop: 40,
              fontStyle: "italic",
              fontSize: 15,
            }}
          >
            Every step is recorded and time-stamped so both parties have
            complete peace of mind.
          </p>
          <div style={{ textAlign: "center", marginTop: 24 }}>
            <button
              onClick={() => onNavigate("faq")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: "pointer",
                fontSize: 16,
                fontWeight: 600,
              }}
            >
              See how disputes get resolved{" "}
              <ArrowRight
                size={16}
                style={{ verticalAlign: "text-bottom", marginLeft: 4 }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* === LIVE PROOF COUNTERS (Item 6) === */}
      {/* === CATEGORIES === */}
      <section className="content-section" data-reveal>
        <div className="marketing-container">
          <p className="hero-eyebrow">Browse by category</p>
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 40px)",
              marginBottom: 8,
              fontFamily: "Hanken Grotesk, sans-serif",
              color: "var(--color-text)",
            }}
          >
            Find the right expertise.
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 17,
              marginBottom: 40,
            }}
          >
            Six launch categories covering Ethiopia's most in-demand digital
            skills.
          </p>
          <div className="categories-grid">
            {Object.entries(categoryLabels).map(([key, label]) => (
              <button
                key={key}
                className="category-card"
                onClick={() => onStart("register")}
              >
                <div
                  style={{ color: "var(--color-primary)", marginBottom: 16 }}
                >
                  {categoryIcons[key]}
                </div>
                <h3 style={{ fontSize: 16, margin: 0 }}>{label}</h3>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* === CASE STUDIES === */}
      <section
        className="content-section"
        data-reveal="left"
        data-reveal-delay="80"
      >
        <div className="marketing-container">
          <p className="hero-eyebrow">Success stories</p>
          <h2
            style={{
              fontSize: "clamp(24px, 3vw, 40px)",
              marginBottom: 8,
              fontFamily: "Hanken Grotesk, sans-serif",
              color: "var(--color-text)",
            }}
          >
            Real projects. Real results.
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 17,
              marginBottom: 40,
            }}
          >
            Featured outcomes from verified, escrow-protected projects on Yekis.
          </p>
          <div className="case-study-grid">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <span className="placeholder-badge">Featured</span>
                <h3
                  style={{
                    margin: "12px 0 8px",
                    fontSize: 18,
                    color: "var(--color-text)",
                  }}
                >
                  Project #{i}
                </h3>
                <p
                  style={{
                    color: "var(--color-text-secondary)",
                    fontSize: 14,
                    marginBottom: 16,
                  }}
                >
                  Delivered on schedule with 100% milestone completion and
                  escrow-secured payouts.
                </p>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: 12,
                    marginTop: 12,
                  }}
                >
                  <span
                    style={{
                      color: "var(--color-primary)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    Escrow-protected
                  </span>
                  <ShareButtons title={`Yekis Case Study #${i}`} compact />
                </div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: "center", marginTop: 32 }}>
            <button
              onClick={() => onNavigate("case-studies")}
              style={{
                background: "none",
                border: "none",
                color: "var(--color-primary)",
                cursor: "pointer",
                fontSize: 15,
                fontWeight: 600,
              }}
            >
              View all case studies{" "}
              <ArrowRight
                size={14}
                style={{ verticalAlign: "text-bottom", marginLeft: 4 }}
              />
            </button>
          </div>
        </div>
      </section>

      {/* === TRUST INDICATORS === */}
      <section className="content-section" data-reveal data-reveal-delay="80">
        <div className="marketing-container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 30,
            }}
          >
            <div className="glass-panel">
              <WalletCards
                size={24}
                style={{ color: "var(--color-primary)", marginBottom: 16 }}
              />
              <h3
                style={{
                  fontSize: 18,
                  marginBottom: 8,
                  color: "var(--color-text)",
                }}
              >
                Secure Local Payments
              </h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                Deposit and withdraw easily via Telebirr or CBE Bank with swift
                account verification.
              </p>
            </div>
            <div className="glass-panel">
              <Fingerprint
                size={24}
                style={{ color: "var(--color-primary)", marginBottom: 16 }}
              />
              <h3
                style={{
                  fontSize: 18,
                  marginBottom: 8,
                  color: "var(--color-text)",
                }}
              >
                Verified Identities
              </h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                Freelancers verify with Ethiopian National ID (Fayda) so you
                always know who you are hiring.
              </p>
            </div>
            <div className="glass-panel">
              <ShieldCheck
                size={24}
                style={{ color: "var(--color-primary)", marginBottom: 16 }}
              />
              <h3
                style={{
                  fontSize: 18,
                  marginBottom: 8,
                  color: "var(--color-text)",
                }}
              >
                Milestone Escrow Protection
              </h3>
              <p style={{ color: "var(--color-text-secondary)", fontSize: 14 }}>
                Funds stay safely locked in escrow until you inspect and approve
                each milestone delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === RESPONSE TIME PROMISE === */}
      <section className="support-promise" data-reveal="zoom">
        <div className="marketing-container" style={{ textAlign: "center" }}>
          <Clock
            size={32}
            style={{
              color: "var(--color-primary)",
              marginBottom: 16,
              marginInline: "auto",
            }}
          />
          <h2
            style={{
              fontSize: 24,
              marginBottom: 8,
              fontFamily: "Hanken Grotesk, sans-serif",
              color: "var(--color-text)",
            }}
          >
            Dedicated Support When You Need It
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 16,
              maxWidth: 520,
              margin: "0 auto",
            }}
          >
            Our team is available to assist with jobs, contracts, payments,
            verification, and dispute resolution.
          </p>
        </div>
      </section>

      {/* === ROLES SECTION (Two-sided marketplace) === */}
      <section className="content-section" data-reveal="zoom">
        <div className="marketing-container">
          <p className="hero-eyebrow" style={{ textAlign: "center" }}>
            Built for both sides
          </p>
          <h2
            style={{
              textAlign: "center",
              fontSize: "clamp(24px, 3vw, 40px)",
              marginBottom: 40,
              fontFamily: "Hanken Grotesk, sans-serif",
              color: "var(--color-text)",
            }}
          >
            One platform, two clear paths.
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 30,
            }}
          >
            <div
              className="glass-panel"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <p className="hero-eyebrow" style={{ marginBottom: 12 }}>
                For clients
              </p>
              <h3
                style={{
                  fontSize: 22,
                  marginBottom: 12,
                  color: "var(--color-text)",
                }}
              >
                Hire verified Ethiopian professionals.
              </h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 15,
                  marginBottom: 24,
                }}
              >
                Post your project brief, compare proposals, fund approved
                milestones into escrow, and track delivery effortlessly.
              </p>
              <button
                className="btn-primary"
                onClick={() => onStart("register")}
              >
                Create a client workspace
              </button>
            </div>
            <div
              className="glass-panel"
              style={{ border: "1px solid var(--color-border)" }}
            >
              <p className="hero-eyebrow" style={{ marginBottom: 12 }}>
                For freelancers
              </p>
              <h3
                style={{
                  fontSize: 22,
                  marginBottom: 12,
                  color: "var(--color-text)",
                }}
              >
                Get hired, work safely, and get paid on time.
              </h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  fontSize: 15,
                  marginBottom: 24,
                }}
              >
                Find quality projects, submit proposals, work with guaranteed
                milestone escrow, and build a verified career profile.
              </p>
              <button
                className="btn-secondary"
                onClick={() => onStart("register")}
              >
                Join as a freelancer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="final-cta" data-reveal="zoom">
        <div className="marketing-container">
          <p className="hero-eyebrow">Ready to start?</p>
          <h2
            style={{
              fontSize: "clamp(28px, 4vw, 48px)",
              marginBottom: 16,
              fontFamily: "Hanken Grotesk, sans-serif",
              color: "var(--color-text)",
            }}
          >
            Put your next project in motion.
          </h2>
          <p
            style={{
              color: "var(--color-text-secondary)",
              fontSize: 18,
              maxWidth: 600,
              margin: "0 auto 32px",
            }}
          >
            Post a job or join as a freelancer with full escrow protection from
            start to finish.
          </p>
          <div className="hero-actions" style={{ justifyContent: "center" }}>
            <button
              className="btn-primary"
              onClick={() => onStart("register")}
              style={{ fontSize: 17, padding: "14px 28px" }}
            >
              <Briefcase
                size={18}
                style={{ marginRight: 8, verticalAlign: "text-bottom" }}
              />{" "}
              Post a Job
            </button>
            <button
              className="btn-secondary"
              onClick={() => onStart("register")}
              style={{ fontSize: 17, padding: "14px 28px" }}
            >
              <Award
                size={18}
                style={{ marginRight: 8, verticalAlign: "text-bottom" }}
              />{" "}
              Find Work
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
                <p>
                  {assignedStaff
                    ? `You're talking to ${assignedStaff.name}`
                    : "Typically replies in a few minutes"}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSupport(false)}
              aria-label="Close support chat"
            >
              ×
            </button>
          </div>
          <div className="chat-messages-area">
            {messages.map((msg) => (
              <div key={msg.id} className={"chat-bubble " + msg.sender}>
                <p>{msg.text}</p>
              </div>
            ))}
            {supportSending && (
              <div className="chat-bubble agent typing">...</div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {chatStep !== "submitted" && (
            <div className="chat-composer-area">
              <button
                className="chat-attach-btn"
                style={{
                  background: "var(--color-primary-light)",
                  color: "var(--color-primary)",
                  borderRadius: 8,
                  border: "none",
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach file"
                type="button"
              >
                <Paperclip
                  size={20}
                  color="var(--color-primary)"
                  strokeWidth={2.5}
                  style={{ display: "block" }}
                />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                style={{ display: "none" }}
                onChange={handleFileChange}
                accept="image/*,.pdf,.doc,.docx"
              />
              <input
                type={chatStep === "asking_email" ? "email" : "text"}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={
                  chatStep === "asking_email"
                    ? "Your email address..."
                    : attachedFile
                      ? `📎 ${attachedFile.name}`
                      : "Type your message..."
                }
                disabled={supportSending}
              />
              <button
                onClick={handleSendMessage}
                disabled={
                  supportSending || (!inputText.trim() && !attachedFile)
                }
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          )}
        </aside>
      )}

      {/* === FLOATING CHAT BUTTON === */}
      <button
        className="landing-chat-fab"
        onClick={() => setShowSupport((c) => !c)}
        aria-label="Open Yekis support chat"
      >
        <MessageCircle
          size={22}
          color="currentColor"
          strokeWidth={2.5}
          style={{ display: "block", flexShrink: 0 }}
        />
        <span>Need help?</span>
      </button>

      {/* === FOOTER === */}
      <MarketingFooter onNavigate={onNavigate} />

      {/* Organization structured data (Item 23) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Yekis",
            url: "https://yekis.com",
            logo: "https://yekis.com/svgviewer-output.svg",
            description:
              "Ethiopia's escrow-protected freelance marketplace. Post work, pay into escrow, get your result or your money back.",
            sameAs: ["https://t.me/yekis_channel", "https://t.me/yekis_group"],
            // TODO: Add real address once physical office confirmed
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer support",
              availableLanguage: ["English", "Amharic"],
            },
          }),
        }}
      />
    </main>
  );
}
