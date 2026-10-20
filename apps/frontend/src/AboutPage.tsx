import { useState } from "react";
import {
  ShieldCheck,
  BadgeCheck,
  Scale,
  Mail,
  Phone,
  Send,
  MessageCircle,
  Bot,
  CheckCircle2,
  ArrowUpRight,
  Briefcase,
  Award,
  MessageSquare,
} from "lucide-react";
import { useI18n } from "./i18n";
import { openSupportChat } from "./components/supportChatEvents";
import "./landing-v2.css";

type AboutPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

const TEAM_MEMBERS = [
  {
    initials: "DA",
    name: "Dawit Alemu",
    role: "Founder & Engineering",
    bio: "Architected Yekis's double-entry ETB escrow ledger, Telebirr/CBE payout integrations, and Fayda identity verification pipeline.",
    tone: "linear-gradient(140deg, var(--v2-primary), var(--v2-teal))",
  },
  {
    initials: "ST",
    name: "Selamawit Tadesse",
    role: "Escrow & Tax Compliance",
    bio: "Oversees Ethiopian ERCA withholding tax automation (3% TIN-verified vs. 30% statutory) and commercial bank reconciliation.",
    tone: "linear-gradient(140deg, var(--v2-teal), var(--v2-violet))",
  },
  {
    initials: "BH",
    name: "Bereket Hailu",
    role: "Dispute Mediation Lead",
    bio: "Leads evidence-backed contract arbitration in Addis Ababa, ensuring milestone disputes are reviewed by a human specialist within 48 hours.",
    tone: "linear-gradient(140deg, var(--v2-violet), var(--v2-primary))",
  },
  {
    initials: "HM",
    name: "Hana Mekonnen",
    role: "Community & Freelancer Success",
    bio: "Supports 480+ verified Ethiopian developers, designers, translators, and analysts across Addis Ababa, Bahir Dar, Hawassa, and Mekelle.",
    tone: "linear-gradient(140deg, var(--v2-primary), #eab308)",
  },
];

export function AboutPage({ onNavigate, onStart }: AboutPageProps) {
  const { t } = useI18n();

  const [fullName, setFullName] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [topic, setTopic] = useState("ESCROW_INQUIRY");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const pillars = [
    {
      num: "01 / ESCROW",
      Icon: ShieldCheck,
      title: t.marketing.about.feature1Title,
      body: t.marketing.about.feature1Desc,
    },
    {
      num: "02 / IDENTITY",
      Icon: BadgeCheck,
      title: t.marketing.about.feature2Title,
      body: t.marketing.about.feature2Desc,
    },
    {
      num: "03 / MEDIATION",
      Icon: Scale,
      title: t.marketing.about.feature3Title,
      body: t.marketing.about.feature3Desc,
    },
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !contactInfo.trim() || !message.trim()) {
      setError("Please fill in your name, email or phone (+251), and message.");
      return;
    }
    setError(null);
    setSubmitted(true);
  };

  return (
    <div className="yk-v2 yk-v2-subpage">
      <div className="v2-container">
        {/* Breadcrumb */}
        <nav className="v2-sub-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate("home")}>
            {t.nav.home}
          </button>
          <span>/</span>
          <span className="v2-sub-breadcrumb-cur">{t.nav.about}</span>
        </nav>

        {/* Hero Section */}
        <header className="v2-sub-hero">
          <div className="v2-sub-hero-grid">
            <div>
              <span className="v2-eyebrow">{t.marketing.about.eyebrow}</span>
              <h1 className="v2-sub-title">{t.marketing.about.title}</h1>
              <p
                style={{
                  fontSize: "clamp(1.15rem, 1.6vw, 1.45rem)",
                  color: "var(--v2-primary)",
                  fontWeight: 700,
                  margin: "14px 0",
                  lineHeight: 1.4,
                }}
              >
                &ldquo;{t.marketing.about.missionQuote}&rdquo;
              </p>
              <p className="v2-sub-lead">{t.marketing.about.intro}</p>
            </div>

            <div className="v2-sub-kpis">
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">Addis Ababa</div>
                <div className="v2-sub-kpi-lbl">Built &amp; Operated in Ethiopia</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">100% ETB</div>
                <div className="v2-sub-kpi-lbl">Telebirr, CBE Birr &amp; M-Pesa Native</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">Fayda + TIN</div>
                <div className="v2-sub-kpi-lbl">Verified Counterparty Identity</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">4 Languages</div>
                <div className="v2-sub-kpi-lbl">English, አማርኛ, Afaan Oromoo, ትግርኛ</div>
              </div>
            </div>
          </div>
        </header>

        {/* Mission & The Problem We Solve Split Panel */}
        <section style={{ marginBottom: 64 }}>
          <div className="v2-about-panel">
            <div className="v2-about-content">
              <span className="v2-eyebrow">{t.marketing.about.missionTitle}</span>
              <h2 className="v2-about-title" style={{ marginTop: 14 }}>
                {t.marketing.about.problemTitle}
              </h2>
              <div className="v2-about-intro">
                <p>{t.marketing.about.problemBody}</p>
                <p>{t.marketing.about.intro}</p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 28 }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-primary"
                  onClick={() => onStart("register")}
                >
                  <span>{t.nav.getStarted}</span>
                  <ArrowUpRight size={16} />
                </button>
                <button
                  type="button"
                  className="v2-btn"
                  style={{
                    borderColor: "var(--v2-border2)",
                    background: "var(--v2-surface)",
                    color: "var(--v2-text)",
                  }}
                  onClick={() => onNavigate("case-studies")}
                >
                  <span>Explore Case Studies</span>
                </button>
              </div>
            </div>

            <div className="v2-about-visual">
              <img
                src="https://images.pexels.com/photos/3184465/pexels-photo-3184465.jpeg?auto=compress&cs=tinysrgb&w=1400"
                alt="Ethiopian team collaborating on milestone-funded projects"
                loading="lazy"
              />
              <div className="v2-about-visual-bar">
                <span>{t.marketing.about.visualEscrow}</span>
                <span>{t.marketing.about.visualKyc}</span>
                <span>{t.marketing.about.visualMediation}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Three Trust Pillars */}
        <section aria-label="Core Trust Pillars">
          <div style={{ marginBottom: 28 }}>
            <span className="v2-eyebrow">How We Protect Every Contract</span>
            <h2 className="v2-sec-title">Three non-negotiable guarantees</h2>
          </div>

          <div className="v2-about-pillars">
            {pillars.map(({ num, Icon, title, body }) => (
              <article key={num} className="v2-pillar-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="v2-pillar-num">{num}</span>
                  <span className="v2-policy-icon">
                    <Icon size={16} />
                  </span>
                </div>
                <h3 style={{ fontSize: 21, fontWeight: 800 }}>{title}</h3>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: "var(--v2-text2)" }}>{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* Leadership & Operations Team */}
        <section aria-labelledby="about-team-heading">
          <span className="v2-eyebrow">Addis Ababa Operations &amp; Engineering</span>
          <h2 className="v2-sec-title" id="about-team-heading">
            {t.marketing.about.teamTitle}
          </h2>
          <p className="v2-sec-sub">
            Built by engineers, compliance specialists, and dispute mediators dedicated to making remote work reliable across Ethiopia.
          </p>

          <div className="v2-team-grid">
            {TEAM_MEMBERS.map((member) => (
              <article key={member.name} className="v2-team-card">
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: member.tone,
                    color: "#052e16",
                    fontWeight: 800,
                    fontSize: 18,
                    display: "grid",
                    placeItems: "center",
                    fontFamily: "var(--v2-font-head)",
                  }}
                  aria-hidden="true"
                >
                  {member.initials}
                </div>
                <div>
                  <h3 style={{ fontSize: 19, fontWeight: 800 }}>{member.name}</h3>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "var(--v2-primary)",
                      marginTop: 3,
                    }}
                  >
                    {member.role}
                  </div>
                </div>
                <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "var(--v2-text2)" }}>
                  {member.bio}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Contact Channels + Validated Inquiry Form */}
        <section style={{ marginBottom: 64 }} aria-labelledby="about-contact-heading">
          <div className="v2-contact-split">
            {/* Left: Direct Channels */}
            <div>
              <span className="v2-eyebrow">Direct Support &amp; Community</span>
              <h2 id="about-contact-heading" style={{ fontSize: 28, fontWeight: 800, marginTop: 12 }}>
                {t.marketing.about.contactTitle}
              </h2>
              <p style={{ fontSize: 14.5, color: "var(--v2-text2)", marginTop: 8, lineHeight: 1.6 }}>
                Reach our Addis Ababa operations desk directly via email, phone, Telegram, or live support chat.
              </p>

              <div className="v2-contact-channels">
                <a href="mailto:support@yekis.com" className="v2-contact-channel">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Mail size={17} color="var(--v2-primary)" />
                    <span>{t.marketing.about.email}</span>
                  </span>
                  <ArrowUpRight size={16} />
                </a>

                <a href="tel:+251911000000" className="v2-contact-channel">
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Phone size={17} color="var(--v2-primary)" />
                    <span>{t.marketing.about.phone}</span>
                  </span>
                  <ArrowUpRight size={16} />
                </a>

                <a
                  href="https://t.me/yekis_channel"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v2-contact-channel"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Send size={17} color="var(--v2-primary)" />
                    <span>{t.marketing.about.telegramChannel}</span>
                  </span>
                  <ArrowUpRight size={16} />
                </a>

                <a
                  href="https://t.me/yekis_group"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v2-contact-channel"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <MessageCircle size={17} color="var(--v2-primary)" />
                    <span>{t.marketing.about.telegramGroup}</span>
                  </span>
                  <ArrowUpRight size={16} />
                </a>

                <a
                  href="https://t.me/ye_kis_bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="v2-contact-channel"
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <Bot size={17} color="var(--v2-primary)" />
                    <span>{t.marketing.about.telegramBot}</span>
                  </span>
                  <ArrowUpRight size={16} />
                </a>

                <button
                  type="button"
                  className="v2-contact-channel"
                  style={{ cursor: "pointer", width: "100%" }}
                  onClick={() => {
                    openSupportChat();
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                    <MessageSquare size={17} color="var(--v2-primary)" />
                    <span>Open Live Support Chat Widget</span>
                  </span>
                  <ArrowUpRight size={16} />
                </button>
              </div>
            </div>

            {/* Right: Interactive Inquiry Form */}
            <div>
              <h3 style={{ fontSize: 21, fontWeight: 800, marginBottom: 6 }}>
                Send us a direct message
              </h3>
              <p style={{ fontSize: 13.5, color: "var(--v2-text2)", marginBottom: 20 }}>
                Questions about enterprise hiring, NGO grant escrow, or account verification? We reply within one business day.
              </p>

              {submitted ? (
                <div
                  style={{
                    padding: 28,
                    borderRadius: 18,
                    background: "var(--v2-surface)",
                    border: "1.5px solid var(--v2-primary)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                  }}
                  role="status"
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, color: "var(--v2-primary)", fontWeight: 800, fontSize: 18 }}>
                    <CheckCircle2 size={22} />
                    <span>Message received by Yekis Support</span>
                  </div>
                  <p style={{ fontSize: 14.5, color: "var(--v2-text2)", lineHeight: 1.6 }}>
                    Thank you, <strong style={{ color: "var(--v2-text)" }}>{fullName}</strong>. Our Addis Ababa team has logged your inquiry regarding <strong style={{ color: "var(--v2-text)" }}>{topic.replace("_", " ")}</strong> and will reach out via <strong style={{ color: "var(--v2-text)" }}>{contactInfo}</strong>.
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 4 }}>
                    <button
                      type="button"
                      className="v2-btn v2-btn-primary"
                      onClick={() => onNavigate("thank-you-contact")}
                    >
                      <span>View Confirmation Page</span>
                      <ArrowUpRight size={15} />
                    </button>
                    <button
                      type="button"
                      className="v2-btn"
                      style={{
                        borderColor: "var(--v2-border2)",
                        background: "var(--v2-bg2)",
                        color: "var(--v2-text)",
                      }}
                      onClick={() => {
                        setSubmitted(false);
                        setFullName("");
                        setContactInfo("");
                        setMessage("");
                      }}
                    >
                      Send Another Message
                    </button>
                  </div>
                </div>
              ) : (
                <form className="v2-form-grid" onSubmit={handleSubmit} noValidate>
                  <div className="v2-form-field">
                    <label htmlFor="about-contact-name">Your Name or Organization</label>
                    <input
                      id="about-contact-name"
                      type="text"
                      placeholder="e.g.,Selamawit Bekele · Abyssinia Tech"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                    />
                  </div>

                  <div className="v2-form-field">
                    <label htmlFor="about-contact-info">Email or Ethiopian Phone (+251)</label>
                    <input
                      id="about-contact-info"
                      type="text"
                      placeholder="e.g., selam@company.et or +251 911 234 567"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                    />
                  </div>

                  <div className="v2-form-field">
                    <label htmlFor="about-contact-topic">Inquiry Topic</label>
                    <select
                      id="about-contact-topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                    >
                      <option value="ESCROW_INQUIRY">Milestone Escrow &amp; Corporate Hiring</option>
                      <option value="FREELANCER_KYC">Freelancer Fayda ID &amp; TIN Verification</option>
                      <option value="PAYOUT_RAILS">Telebirr / CBE Birr / M-Pesa Payouts</option>
                      <option value="PARTNERSHIP">NGO / Enterprise Partnership</option>
                    </select>
                  </div>

                  <div className="v2-form-field">
                    <label htmlFor="about-contact-msg">How can we help?</label>
                    <textarea
                      id="about-contact-msg"
                      rows={4}
                      placeholder="Tell us about your project timeline, team needs, or question..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>

                  {error && <div className="v2-form-error">{error}</div>}

                  <button type="submit" className="v2-btn v2-btn-primary" style={{ width: "100%" }}>
                    <span>Send Inquiry to Yekis Team</span>
                    <ArrowUpRight size={16} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="v2-outro-cta" style={{ borderRadius: 28, minHeight: 320 }}>
          <span className="v2-outro-ambient" aria-hidden />
          <div className="v2-outro-cta-inner" style={{ paddingTop: 42, paddingBottom: 42 }}>
            <h2>{t.marketing.cta.title}</h2>
            <p>{t.marketing.cta.subtitle}</p>
            <div className="v2-outro-actions">
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-primary"
                onClick={() => onStart("register")}
              >
                <span className="v2-outro-shine" aria-hidden />
                <Briefcase />
                <span>{t.marketing.cta.postJob}</span>
              </button>
              <button
                type="button"
                className="v2-outro-btn v2-outro-btn-ghost"
                onClick={() => onStart("register")}
              >
                <Award />
                <span>{t.marketing.cta.findWork}</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
