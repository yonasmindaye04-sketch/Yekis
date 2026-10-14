import { Sun, Moon } from "lucide-react";
import { useTheme } from "./theme/ThemeContext";
import { useI18n } from "./i18n";
import { LanguageSelector } from "./components/LanguageSelector";

type MarketingHeaderProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function MarketingHeader({ onNavigate, onStart }: MarketingHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { t } = useI18n();

  return (
    <header className="marketing-header">
      <div className="marketing-header-left">
        <a
          className="marketing-brand"
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onNavigate("home");
          }}
        >
          <img
            src="/svgviewer-output.svg"
            alt="Yekis — Ethiopian freelance marketplace logo"
            className="platform-logo"
          />
          <strong>YEKIS</strong>
        </a>
      </div>
      <nav className="marketing-nav-center">
        <button onClick={() => onNavigate("faq")}>{t.nav.faq}</button>
        <button onClick={() => onNavigate("fees")}>{t.nav.fees}</button>
        <button onClick={() => onNavigate("about")}>{t.nav.about}</button>
        <button onClick={() => onNavigate("case-studies")}>{t.nav.caseStudies}</button>
      </nav>
      <div className="marketing-nav-right">
        <LanguageSelector variant="dropdown" />
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          aria-label={
            theme === "light" ? "Switch to dark mode" : "Switch to light mode"
          }
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
        <button className="btn-ghost" onClick={() => onStart("login")}>
          {t.nav.signIn}
        </button>
        <button className="btn-primary" onClick={() => onStart("register")}>
          {t.nav.getStarted}
        </button>
      </div>
    </header>
  );
}
