import { Sun, Moon, MessageCircle } from "lucide-react";
import { useTheme } from "./theme/ThemeContext";

type MarketingHeaderProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function MarketingHeader({ onNavigate, onStart }: MarketingHeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="marketing-header">
      <div className="marketing-header-left">
        <a className="marketing-brand" href="#top" onClick={(e) => { e.preventDefault(); onNavigate("home"); }}>
          <img src="/svgviewer-output.svg" alt="Yekis — Ethiopian freelance marketplace logo" className="platform-logo" />
          <strong>YEKIS</strong>
        </a>
      </div>
      <nav className="marketing-nav-center">
        <button onClick={() => onNavigate("faq")}>FAQ</button>
        <button onClick={() => onNavigate("fees")}>Fees</button>
        <button onClick={() => onNavigate("about")}>About</button>
        <button onClick={() => onNavigate("case-studies")}>Case Studies</button>
      </nav>
      <div className="marketing-nav-right">
        <a href="https://t.me/yekis_channel" target="_blank" rel="noopener noreferrer" className="telegram-link" aria-label="Yekis Telegram Channel">
          <MessageCircle size={18} />
        </a>
        <button className="theme-toggle" onClick={toggleTheme} aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}>
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="btn-ghost" onClick={() => onStart("login")}>Sign in</button>
        <button className="btn-primary" onClick={() => onStart("register")}>Get started</button>
      </div>
    </header>
  );
}