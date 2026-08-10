import { BriefcaseBusiness, ChartNoAxesCombined, Fingerprint, Handshake, MessageCircle, Paperclip, Shield, ShieldCheck, Wallet, WalletCards } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "./api/client";

type LandingPageProps = { onStart: (mode: "login" | "register") => void };

export function LandingPage({ onStart }: LandingPageProps) {
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
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), text: "Thanks for reaching out! Please provide your email address so our team can get back to you.", sender: "agent" },
        ]);
        setChatStep("asking_email");
      }, 800);
    } else if (chatStep === "asking_email") {
      setSupportSending(true);
      try {
        const firstUserMsg = messages.find((m) => m.sender === "user")?.text || "No message";
        const result = await api.createGuestSupport(text, firstUserMsg) as { assignedStaff?: { id: string; name: string } };
        if (result?.assignedStaff) setAssignedStaff(result.assignedStaff);
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), text: result?.assignedStaff
              ? `Thanks! You're now connected with ${result.assignedStaff.name}. We'll get back to you soon.`
              : "Thanks! We've received your message and will email you shortly.",
            sender: "agent" },
        ]);
        setChatStep("submitted");
      } catch {
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), text: "Sorry, there was an error sending your message. Please try again.", sender: "agent" },
        ]);
      } finally {
        setSupportSending(false);
      }
    }
  };

  return (
    <main className="landing-page">
      {/* === HEADER === */}
      <header className="landing-nav"><a className="landing-brand" href="#top"><img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo small" /><strong>YEKIS</strong></a><nav><a href="#how-it-works">How it works</a><a href="#for-you">For clients and freelancers</a><a href="#about">About Yekis</a></nav><div className="landing-actions"><button className="landing-signin" onClick={() => onStart("login")}>Sign in</button><button className="btn-primary" onClick={() => onStart("register")}>Get started</button></div></header>
      {/* === HERO SECTION === */}
      <section className="landing-hero" id="top"><div className="landing-hero-copy"><p className="eyebrow">Ethiopian freelance marketplace</p><h1>Good work starts with clarity.</h1><p>Yekis brings clients and skilled freelancers together with clear briefs, milestone contracts, and payments everyone can follow.</p><div className="landing-hero-actions"><button className="btn-primary" onClick={() => onStart("register")}>Start your workspace</button><a href="#how-it-works">See how it works</a></div></div></section>
      {/* === ABOUT SECTION === */}
      <section className="landing-section" id="about" style={{ background: "#121413", color: "#e2e3e0", padding: "120px 5vw", borderRadius: "40px", marginTop: "80px", maxWidth: "1400px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "60px", alignItems: "start" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
            <p style={{ fontFamily: "JetBrains Mono, monospace", fontSize: "12px", color: "#d3ef62", textTransform: "uppercase", letterSpacing: "1px", margin: 0 }}>A BETTER WAY TO WORK TOGETHER</p>
            <h2 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "48px", fontWeight: "700", lineHeight: "1.1", color: "#ffffff", margin: 0 }}>Less uncertainty.<br/>More momentum.</h2>
          </div>
          <div style={{ paddingTop: "48px" }}>
            <p style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", color: "#c6c8b1", lineHeight: "1.6", margin: 0, maxWidth: "600px" }}>
              Yekis is a practical workspace for Ethiopia’s independent professionals and the people who hire them. We keep the important parts visible: what is being delivered, when it is due, how funds move, and what happens if plans change.
            </p>
          </div>
        </div>

        <div style={{ marginTop: "60px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "48px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
                <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "48px", color: "rgba(255,255,255,0.2)", lineHeight: "1", fontWeight: "700" }}>01</span>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "18px", color: "#ffffff", fontWeight: "600", margin: 0 }}>Clear project briefs</h3>
              </div>
              <p style={{ color: "#c6c8b1", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>Define scope, deliverables, and expectations upfront to eliminate ambiguity.</p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
                <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "48px", color: "rgba(255,255,255,0.2)", lineHeight: "1", fontWeight: "700" }}>02</span>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "18px", color: "#ffffff", fontWeight: "600", margin: 0 }}>Milestone-based escrow</h3>
              </div>
              <p style={{ color: "#c6c8b1", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>Secure payments released only when specific project milestones are met and approved.</p>
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "24px", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: "16px" }}>
                <span style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "48px", color: "rgba(255,255,255,0.2)", lineHeight: "1", fontWeight: "700" }}>03</span>
                <h3 style={{ fontFamily: "Hanken Grotesk, sans-serif", fontSize: "18px", color: "#ffffff", fontWeight: "600", margin: 0 }}>Human support when it matters</h3>
              </div>
              <p style={{ color: "#c6c8b1", fontSize: "14px", lineHeight: "1.6", margin: 0 }}>Real people available to help resolve disputes and keep your projects moving forward.</p>
            </div>
          </div>
        </div>
      </section>
      {/* === FEATURES SECTION === */}
      <section className="landing-section landing-features" id="features"><div className="landing-feature-heading"><div><p className="eyebrow">Everything in one clear place</p><h2>Essential tools for work that moves forward.</h2></div><p>From the first brief to the final release, Yekis gives both sides a dependable rhythm for getting good work done.</p></div><div className="landing-feature-grid"><article className="landing-feature-card landing-feature-muted"><BriefcaseBusiness size={31} strokeWidth={1.5} /><h3>Focused project briefs</h3><p>Turn a need into a clear brief with scope, budget, category, and deadline ready for the right talent.</p><a href="#how-it-works">Explore the workflow</a></article><article className="landing-feature-card landing-feature-lime"><ChartNoAxesCombined size={31} strokeWidth={1.5} /><h3>Milestones that build momentum</h3><p>Break the work into visible steps, keep progress easy to follow, and release funds when delivery is accepted.</p><button onClick={() => onStart("register")}>Start a workspace</button><span className="feature-corner" /></article><article className="landing-feature-card landing-feature-deep"><Handshake size={31} strokeWidth={1.5} /><h3>Trust in every handoff</h3><p>Shared contracts, identity review, payment records, and human support keep collaboration grounded.</p><button onClick={() => onStart("register")}>Build with confidence</button></article></div></section>
      {/* === PROOF / WHY YEKIS SECTION === */}
      <section className="landing-section landing-proof-section"><div className="landing-proof-media"><img className="landing-proof-main" src="/marketing/yekis-collaboration-banner.png" alt="A client and freelancer collaborating on a project" /><div className="landing-proof-bottom"><div className="landing-proof-stat"><ShieldCheck size={25} /><strong>Work with clarity</strong><span>Evidence stays close to every decision.</span></div><img src="/marketing/yekis-freelancer-poster.png" alt="A freelancer working from a creative studio" /></div></div><div className="landing-proof-copy"><p className="eyebrow">Why Yekis?</p><h2>A workspace built for real Ethiopian work.</h2><p>Great work needs more than a marketplace. It needs a shared understanding of the outcome, a fair way to move money, and a calm place to resolve the details.</p><button className="btn-outline" onClick={() => onStart("register")}>Learn more about Yekis</button><div className="landing-proof-signals"><div><WalletCards size={20} /><strong>Visible payments</strong><span>Receipts, approvals, and releases in one record.</span></div><div><ShieldCheck size={20} /><strong>Responsible identity review</strong><span>Purposeful KYC for freelancer payout readiness.</span></div></div></div></section>
      {/* === HOW IT WORKS SECTION === */}
      <section className="landing-section" id="how-it-works"><div className="landing-section-heading"><p className="eyebrow">The Yekis loop</p><h2>From first brief to finished work.</h2></div><div className="landing-steps"><article><span>01</span><h3>Describe the outcome</h3><p>Clients publish a focused brief with budget, category, and deadline. Freelancers can see what success looks like before they apply.</p></article><article><span>02</span><h3>Agree on milestones</h3><p>Both sides work from a shared delivery plan. Funds are held against milestones instead of disappearing into uncertainty.</p></article><article><span>03</span><h3>Deliver with a record</h3><p>Submissions, approvals, receipts, and decisions stay together so the work can move forward with confidence.</p></article></div></section>
      {/* === ROLES SECTION === */}
      <section className="landing-section landing-roles" id="for-you"><div className="landing-section-heading"><p className="eyebrow">Built around your side of the table</p><h2>One platform, two clear paths.</h2></div><div className="landing-role-grid"><article className="landing-role-card landing-role-client"><p className="eyebrow">For clients</p><h3>Bring the right talent into the room.</h3><p>Post your brief, compare proposals, fund approved milestones, and keep contract progress in one place.</p><button onClick={() => onStart("register")}>Create a client workspace</button></article><article className="landing-role-card landing-role-freelancer"><p className="eyebrow">For freelancers</p><h3>Make your next opportunity count.</h3><p>Find work that fits your skills, send thoughtful proposals, deliver in milestones, and build a reliable work record.</p><button onClick={() => onStart("register")}>Join as a freelancer</button></article></div></section>
      {/* === TRUST SECTION === */}
      <section className="landing-trust"><div><p className="eyebrow">Designed for trust</p><h2>Clear money. Clear evidence. Clear next steps.</h2></div><div className="landing-trust-list"><div><span><Wallet size={20} /></span><strong>Receipt-based top-ups</strong><p>Local payment instructions with review before wallet credit.</p></div><div><span><Fingerprint size={20} /></span><strong>Fayda identity review</strong><p>Freelancers can submit ID and selfie evidence for payout readiness.</p></div><div><span><Shield size={20} /></span><strong>Milestone protection</strong><p>Delivery and release decisions follow a visible contract state.</p></div></div></section>
      {/* === CTA SECTION === */}
      <section className="landing-cta"><p className="eyebrow">Ready when you are</p><h2>Put your next project in motion.</h2><p>Start with a focused workspace for finding work, hiring talent, and delivering with confidence.</p><button className="btn-primary" onClick={() => onStart("register")}>Create your free workspace</button></section>
      
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
            <button onClick={() => setShowSupport(false)} aria-label="Close support">×</button>
          </div>
          
          <div className="chat-messages-area">
            {messages.map((msg) => (
              <div key={msg.id} className={"chat-bubble " + msg.sender}>
                <p>{msg.text}</p>
              </div>
            ))}
            {supportSending && <div className="chat-bubble agent typing">...</div>}
            <div ref={messagesEndRef} />
          </div>

          {chatStep !== "submitted" && (
             <div className="chat-composer-area">
               <button
                 className="chat-attach-btn"
                 style={{ background: "#d8f36b", borderRadius: "8px", border: "none", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}
                 onClick={() => fileInputRef.current?.click()}
                 aria-label="Attach file"
                 type="button"
               >
                 <Paperclip size={20} color="#0b1116" strokeWidth={2.5} style={{ display: "block" }} />
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
                 placeholder={chatStep === "asking_email" ? "Your email address..." : attachedFile ? `📎 ${attachedFile.name}` : "Type your message..."}
                 disabled={supportSending}
               />
               <button onClick={handleSendMessage} disabled={supportSending || (!inputText.trim() && !attachedFile)}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
               </button>
             </div>
          )}
        </aside>
      )}

      {/* === FLOATING CHAT BUTTON === */}
      <button className="landing-chat-fab" onClick={() => setShowSupport((current) => !current)} aria-label="Open Yekis support chat"><MessageCircle size={22} color="#0b1116" strokeWidth={2.5} style={{ display: "block", flexShrink: 0 }} /><span>Need help?</span></button>
      
      {/* === FOOTER === */}
      <footer className="landing-footer"><div className="landing-brand"><img src="/svgviewer-output.svg" alt="Yekis Logo" className="platform-logo small" /><strong>Yekis</strong></div><span>Work that moves forward.</span><div><a href="#privacy">Privacy policy</a><a href="#terms">Terms and conditions</a></div></footer>
    </main>
  );
}
