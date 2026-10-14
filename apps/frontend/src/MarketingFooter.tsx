import { Send, MessageCircle, Bot, Mail, ShieldCheck } from "lucide-react";
import { openSupportChat } from "./components/supportChatEvents";
import { useI18n } from "./i18n";
import { LanguageSelector } from "./components/LanguageSelector";
import "./marketing.css";

type MarketingFooterProps = {
  onNavigate: (page: string) => void;
};

export function MarketingFooter({ onNavigate }: MarketingFooterProps) {
  const { t } = useI18n();

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
              {t.marketing.footer.desc}
            </p>
          </div>
          <nav className="footer-col" aria-label={t.marketing.footer.platform}>
            <h4>{t.marketing.footer.platform}</h4>
            <button onClick={() => onNavigate("faq")}>{t.marketing.footer.faq}</button>
            <button onClick={() => onNavigate("fees")}>{t.marketing.footer.fees}</button>
            <button onClick={() => onNavigate("case-studies")}>
              {t.marketing.footer.caseStudies}
            </button>
          </nav>
          <nav className="footer-col" aria-label={t.marketing.footer.company}>
            <h4>{t.marketing.footer.company}</h4>
            <button onClick={() => onNavigate("about")}>{t.marketing.footer.about}</button>
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
              {t.marketing.footer.contactSupport}
            </a>
          </nav>
          <nav className="footer-col" aria-label={t.marketing.footer.legal}>
            <h4>{t.marketing.footer.legal}</h4>
            <button onClick={() => onNavigate("privacy")}>
              {t.marketing.footer.privacy}
            </button>
            <button onClick={() => onNavigate("terms")}>
              {t.marketing.footer.terms}
            </button>
          </nav>
          <nav className="footer-col footer-social-col" aria-label={t.marketing.footer.social}>
            <h4>{t.marketing.footer.social}</h4>
            <a
              href="https://t.me/yekis_channel"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Send size={16} /> {t.marketing.footer.telegram}
            </a>
            <a
              href="https://t.me/yekis_group"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle size={16} /> {t.marketing.footer.community}
            </a>
            <a
              href="https://t.me/ye_kis_bot"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Bot size={16} /> {t.marketing.footer.yekisBot}
            </a>
            <a
              href="mailto:support@yekis.com"
            >
              <Mail size={16} /> {t.marketing.footer.emailUs}
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <div className="footer-bottom-left">
            <span>
              {t.marketing.footer.copyright}
            </span>
            <span className="footer-escrow-note">
              <ShieldCheck size={15} /> {t.marketing.footer.escrowNote}
            </span>
          </div>
          <LanguageSelector variant="segmented" />
        </div>
      </div>
    </footer>
  );
}
