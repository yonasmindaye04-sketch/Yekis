import { Send, MessageCircle, Bot, Mail, ShieldCheck } from "lucide-react";
import { openSupportChat } from "./components/supportChatEvents";
import "./marketing.css";

type MarketingFooterProps = {
  onNavigate: (page: string) => void;
};

export function MarketingFooter({ onNavigate }: MarketingFooterProps) {
  return (
    <footer className="landing-footer marketing-footer">
      <div className="marketing-container">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <div
              className="landing-brand"
              style={{ marginBottom: 16, cursor: "pointer" }}
              onClick={() => onNavigate("home")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onNavigate("home");
              }}
              aria-label="Yekis Home"
            >
              <img
                src="/svgviewer-output.svg"
                alt="Yekis Logo"
                className="platform-logo small"
              />
              <strong>Yekis</strong>
            </div>
            <p className="footer-desc">
              Ethiopia's freelance marketplace. Post work, fund a milestone, review the
              result and release payment.
            </p>
          </div>
          <nav className="footer-col" aria-label="Platform">
            <h4>Platform</h4>
            <button onClick={() => onNavigate("faq")}>FAQ</button>
            <button onClick={() => onNavigate("fees")}>Fees</button>
            <button onClick={() => onNavigate("case-studies")}>
              Case Studies
            </button>
          </nav>
          <nav className="footer-col" aria-label="Company">
            <h4>Company</h4>
            <button onClick={() => onNavigate("about")}>About Us</button>
            <a
              href="mailto:support@yekis.com"
              onClick={(e) => {
                // Prefer the in-page support widget; fall back to email when it
                // isn't mounted on this page.
                if (openSupportChat()) {
                  e.preventDefault();
                }
              }}
            >
              Contact Support
            </a>
          </nav>
          <nav className="footer-col" aria-label="Legal">
            <h4>Legal</h4>
            <button onClick={() => onNavigate("privacy")}>
              Privacy Policy
            </button>
            <button onClick={() => onNavigate("terms")}>
              Terms of Service
            </button>
          </nav>
          <nav className="footer-col footer-social-col" aria-label="Social">
            <h4>Social</h4>
            <a
              href="https://t.me/yekis_channel"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send size={16} /> Telegram Channel
            </a>
            <a
              href="https://t.me/yekis_group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={16} /> Community
            </a>
            <a
              href="https://t.me/ye_kis_bot"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Bot size={16} /> Yekis Bot
            </a>
            <a
              href="mailto:support@yekis.com"
            >
              <Mail size={16} /> Email Us
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span>
              © {new Date().getFullYear()} Yekis. All rights reserved.
            </span>
            <span className="footer-escrow-note">
              <ShieldCheck size={15} /> Payments secured by Yekis Escrow
            </span>
          </div>
          <button className="footer-lang-toggle">EN / አማ</button>
        </div>
      </div>
    </footer>
  );
}
