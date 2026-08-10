const fs = require('fs');
const path = require('path');

const landingPath = path.join(__dirname, 'apps', 'frontend', 'src', 'LandingPage.tsx');

const landingContent = `import { ArrowUpRight, BriefcaseBusiness, ChartNoAxesCombined, Fingerprint, Handshake, MessageCircle, Shield, ShieldCheck, Wallet, WalletCards } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { api } from "./api/client";

type LandingPageProps = { onStart: (mode: "login" | "register") => void };

export function LandingPage({ onStart }: LandingPageProps) {
  const [showSupport, setShowSupport] = useState(false);
  const [messages, setMessages] = useState<{ id: string; text: string; sender: "agent" | "user" }[]>([
    { id: "1", text: "Hi there! How can we help you today?", sender: "agent" },
  ]);
  const [inputText, setInputText] = useState("");
  const [chatStep, setChatStep] = useState<"initial" | "asking_email" | "submitted">("initial");
  const [supportSending, setSupportSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, showSupport]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { id: Date.now().toString(), text: inputText, sender: "user" as const };
    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

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
        await api.createGuestSupport(inputText, firstUserMsg);
        setMessages((prev) => [
          ...prev,
          { id: Date.now().toString(), text: "Thanks! We've received your message and will email you shortly.", sender: "agent" },
        ]);
        setChatStep("submitted");
      } catch (err) {
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
      <header className="landing-nav"><a className="landing-brand" href="#top"><span className="platform-logo small">Y</span><strong>Yekis</strong></a><nav><a href="#how-it-works">How it works</a><a href="#for-you">For clients and freelancers</a><a href="#about">About Yekis</a></nav><div className="landing-actions"><button className="landing-signin" onClick={() => onStart("login")}>Sign in</button><button className="btn-primary" onClick={() => onStart("register")}>Get started <span>→</span></button></div></header>
      <section className="landing-hero" id="top"><div className="landing-hero-copy"><p className="eyebrow">Ethiopian freelance marketplace</p><h1>Good work starts with clarity.</h1><p>Yekis brings clients and skilled freelancers together with clear briefs, milestone contracts, and payments everyone can follow.</p><div className="landing-hero-actions"><button className="btn-primary" onClick={() => onStart("register")}>Start your workspace <span>→</span></button><a href="#how-it-works">See how it works <span>↓</span></a></div><div className="landing-proof"><span><strong>01</strong> Clear project briefs</span><span><strong>02</strong> Milestone-based escrow</span><span><strong>03</strong> Human support when it matters</span></div></div></section>
      <section className="landing-section landing-intro" id="about"><div><p className="eyebrow">A better way to work together</p><h2>Less uncertainty. More momentum.</h2></div><p>Yekis is a practical workspace for Ethiopia’s independent professionals and the people who hire them. We keep the important parts visible: what is being delivered, when it is due, how funds move, and what happens if plans change.</p></section>
      <section className="landing-section landing-features" id="features"><div className="landing-feature-heading"><div><p className="eyebrow">Everything in one clear place</p><h2>Essential tools for work that moves forward.</h2></div><p>From the first brief to the final release, Yekis gives both sides a dependable rhythm for getting good work done.</p></div><div className="landing-feature-grid"><article className="landing-feature-card landing-feature-muted"><BriefcaseBusiness size={31} strokeWidth={1.5} /><h3>Focused project briefs</h3><p>Turn a need into a clear brief with scope, budget, category, and deadline ready for the right talent.</p><a href="#how-it-works">Explore the workflow <ArrowUpRight size={15} /></a></article><article className="landing-feature-card landing-feature-lime"><ChartNoAxesCombined size={31} strokeWidth={1.5} /><h3>Milestones that build momentum</h3><p>Break the work into visible steps, keep progress easy to follow, and release funds when delivery is accepted.</p><button onClick={() => onStart("register")}>Start a workspace <ArrowUpRight size={15} /></button><span className="feature-corner" /></article><article className="landing-feature-card landing-feature-deep"><Handshake size={31} strokeWidth={1.5} /><h3>Trust in every handoff</h3><p>Shared contracts, identity review, payment records, and human support keep collaboration grounded.</p><button onClick={() => onStart("register")}>Build with confidence <ArrowUpRight size={15} /></button></article></div></section>
      <section className="landing-section landing-proof-section"><div className="landing-proof-media"><img className="landing-proof-main" src="/marketing/yekis-collaboration-banner.png" alt="A client and freelancer collaborating on a project" /><div className="landing-proof-bottom"><div className="landing-proof-stat"><ShieldCheck size={25} /><strong>Work with clarity</strong><span>Evidence stays close to every decision.</span></div><img src="/marketing/yekis-freelancer-poster.png" alt="A freelancer working from a creative studio" /></div></div><div className="landing-proof-copy"><p className="eyebrow">Why Yekis?</p><h2>A workspace built for real Ethiopian work.</h2><p>Great work needs more than a marketplace. It needs a shared understanding of the outcome, a fair way to move money, and a calm place to resolve the details.</p><button className="btn-outline" onClick={() => onStart("register")}>Learn more about Yekis <ArrowUpRight size={16} /></button><div className="landing-proof-signals"><div><WalletCards size={20} /><strong>Visible payments</strong><span>Receipts, approvals, and releases in one record.</span></div><div><ShieldCheck size={20} /><strong>Responsible identity review</strong><span>Purposeful KYC for freelancer payout readiness.</span></div></div></div></section>
      <section className="landing-section" id="how-it-works"><div className="landing-section-heading"><p className="eyebrow">The Yekis loop</p><h2>From first brief to finished work.</h2></div><div className="landing-steps"><article><span>01</span><h3>Describe the outcome</h3><p>Clients publish a focused brief with budget, category, and deadline. Freelancers can see what success looks like before they apply.</p></article><article><span>02</span><h3>Agree on milestones</h3><p>Both sides work from a shared delivery plan. Funds are held against milestones instead of disappearing into uncertainty.</p></article><article><span>03</span><h3>Deliver with a record</h3><p>Submissions, approvals, receipts, and decisions stay together so the work can move forward with confidence.</p></article></div></section>
      <section className="landing-section landing-roles" id="for-you"><div className="landing-section-heading"><p className="eyebrow">Built around your side of the table</p><h2>One platform, two clear paths.</h2></div><div className="landing-role-grid"><article className="landing-role-card landing-role-client"><p className="eyebrow">For clients</p><h3>Bring the right talent into the room.</h3><p>Post your brief, compare proposals, fund approved milestones, and keep contract progress in one place.</p><button onClick={() => onStart("register")}>Create a client workspace <span>→</span></button></article><article className="landing-role-card landing-role-freelancer"><p className="eyebrow">For freelancers</p><h3>Make your next opportunity count.</h3><p>Find work that fits your skills, send thoughtful proposals, deliver in milestones, and build a reliable work record.</p><button onClick={() => onStart("register")}>Join as a freelancer <span>→</span></button></article></div></section>
      <section className="landing-trust"><div><p className="eyebrow">Designed for trust</p><h2>Clear money. Clear evidence. Clear next steps.</h2></div><div className="landing-trust-list"><div><span><Wallet size={20} /></span><strong>Receipt-based top-ups</strong><p>Local payment instructions with review before wallet credit.</p></div><div><span><Fingerprint size={20} /></span><strong>Fayda identity review</strong><p>Freelancers can submit ID and selfie evidence for payout readiness.</p></div><div><span><Shield size={20} /></span><strong>Milestone protection</strong><p>Delivery and release decisions follow a visible contract state.</p></div></div></section>
      <section className="landing-cta"><p className="eyebrow">Ready when you are</p><h2>Put your next project in motion.</h2><p>Start with a focused workspace for finding work, hiring talent, and delivering with confidence.</p><button className="btn-primary" onClick={() => onStart("register")}>Create your free workspace <span>→</span></button></section>
      
      {showSupport && (
        <aside className="landing-support-popover chat-variant">
          <div className="landing-support-head chat-head">
            <div>
              <h3>Yekis Support</h3>
              <p>Typically replies in a few minutes</p>
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
               <input
                 type={chatStep === "asking_email" ? "email" : "text"}
                 value={inputText}
                 onChange={(e) => setInputText(e.target.value)}
                 onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                 placeholder={chatStep === "asking_email" ? "Your email address..." : "Type your message..."}
                 disabled={supportSending}
               />
               <button onClick={handleSendMessage} disabled={supportSending || !inputText.trim()}>
                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
               </button>
             </div>
          )}
        </aside>
      )}

      <button className="landing-chat-fab" onClick={() => setShowSupport((current) => !current)} aria-label="Open Yekis support chat"><MessageCircle size={21} /><span>Need help?</span></button>
      <footer className="landing-footer"><div className="landing-brand"><span className="platform-logo small">Y</span><strong>Yekis</strong></div><span>Work that moves forward.</span><div><a href="#privacy">Privacy policy</a><a href="#terms">Terms and conditions</a></div></footer>
    </main>
  );
}
`;

fs.writeFileSync(landingPath, landingContent);

// Now append CSS to index.css
const cssPath = path.join(__dirname, 'apps', 'frontend', 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');

const additionalCss = `

/* Interactive Chat Variant */
.landing-support-popover.chat-variant {
  display: flex;
  flex-direction: column;
  padding: 0;
  width: min(100%, 380px);
  height: 520px;
  max-height: 80vh;
  background: #f9f6f0;
  overflow: hidden;
}

.landing-support-popover.chat-variant .chat-head {
  padding: 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8e4;
  margin-bottom: 0;
}
.landing-support-popover.chat-variant .chat-head h3 {
  font-size: 1.1rem;
  margin: 0 0 4px;
}
.landing-support-popover.chat-variant .chat-head p {
  color: #5b6b64;
  font-size: 0.82rem;
  margin: 0;
}

.chat-messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.chat-bubble {
  max-width: 85%;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.95rem;
  line-height: 1.4;
  box-shadow: 0 2px 10px rgba(43,54,49,0.03);
}
.chat-bubble.agent {
  align-self: flex-start;
  background: #ffffff;
  color: #2b3631;
  border-bottom-left-radius: 4px;
  border: 1px solid #e2e8e4;
}
.chat-bubble.user {
  align-self: flex-end;
  background: #436a56;
  color: #ffffff;
  border-bottom-right-radius: 4px;
}
.chat-bubble.typing {
  color: #5b6b64;
  font-weight: bold;
  letter-spacing: 2px;
}
.chat-bubble p {
  margin: 0;
}

.chat-composer-area {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px;
  background: #ffffff;
  border-top: 1px solid #e2e8e4;
}
.chat-composer-area input {
  flex: 1;
  min-height: 44px;
  margin: 0;
  border: 1px solid #d1dcd6;
  border-radius: 22px;
  padding: 0 16px;
  background: #f2efe9;
}
.chat-composer-area input:focus {
  border-color: #436a56;
  outline: none;
}
.chat-composer-area button {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: none;
  border-radius: 50%;
  background: transparent;
  color: #436a56;
  cursor: pointer;
}
.chat-composer-area button:disabled {
  color: #baccbe;
  cursor: not-allowed;
}
.chat-composer-area button:not(:disabled):hover {
  background: #e6efea;
}
`;

fs.appendFileSync(cssPath, additionalCss);
console.log('Chat UI implemented');
