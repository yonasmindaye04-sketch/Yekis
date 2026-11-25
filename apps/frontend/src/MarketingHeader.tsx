import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sun, Moon, Menu, X } from "lucide-react";
import { useTheme } from "./theme/ThemeContext";
import { type Language, useI18n } from "./i18n";
import { LanguageSelector } from "./components/LanguageSelector";

const HEADER_ARIA: Record<
  Language,
  {
    mobileMenu: string;
    switchToDark: string;
    switchToLight: string;
    closeMenu: string;
    openMenu: string;
    mobileNav: string;
    primaryNav: string;
    logoAlt: string;
  }
> = {
  en: {
    mobileMenu: "Mobile navigation menu",
    switchToDark: "Switch to dark mode",
    switchToLight: "Switch to light mode",
    closeMenu: "Close navigation menu",
    openMenu: "Open navigation menu",
    mobileNav: "Mobile navigation",
    primaryNav: "Primary navigation",
    logoAlt: "Yekis — Ethiopian freelance marketplace logo",
  },
  am: {
    mobileMenu: "የሞባይል አሰሳ ምናሌ",
    switchToDark: "ወደ ጨለማ ገጽታ ቀይር",
    switchToLight: "ወደ ብርሃን ገጽታ ቀይር",
    closeMenu: "የአሰሳ ምናሌውን ዝጋ",
    openMenu: "የአሰሳ ምናሌውን ክፈት",
    mobileNav: "የሞባይል አሰሳ",
    primaryNav: "ዋና አሰሳ",
    logoAlt: "YeKis — የኢትዮጵያ የፍሪላንስ ገበያ ቦታ አርማ",
  },
  om: {
    mobileMenu: "Menyuu moobaayilaa",
    switchToDark: "Gara bifa dukkanaatti jijjiiri",
    switchToLight: "Gara bifa ifaatti jijjiiri",
    closeMenu: "Menyuu cufi",
    openMenu: "Menyuu bani",
    mobileNav: "Qajeelfama moobaayilaa",
    primaryNav: "Qajeelfama ijoo",
    logoAlt: "Yekis — Asxaa gabaa hojii Itoophiyaa",
  },
  ti: {
    mobileMenu: "ምናሌ ሞባይል",
    switchToDark: "ናብ ጸልማት ቅዲ ቀይር",
    switchToLight: "ናብ ብርሃን ቅዲ ቀይር",
    closeMenu: "ምናሌ ዕጾ",
    openMenu: "ምናሌ ክፈት",
    mobileNav: "ኣሰሳ ሞባይል",
    primaryNav: "ቀንዲ ኣሰሳ",
    logoAlt: "YeKis — ምልክት ዕዳጋ ፍሪላንስ ኢትዮጵያ",
  },
};

type MarketingHeaderProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
  currentPage?: string;
};

export function MarketingHeader({
  onNavigate,
  onStart,
  currentPage,
}: MarketingHeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { t, language } = useI18n();
  const aria = HEADER_ARIA[language] ?? HEADER_ARIA.en;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const primaryNav = [
    { page: "home", label: t.nav.home },
    { page: "faq", label: t.nav.faq },
    { page: "fees", label: t.nav.fees },
    { page: "about", label: t.nav.about },
    { page: "case-studies", label: t.nav.caseStudies },
  ];

  useEffect(() => {
    if (!mobileMenuOpen) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth > 1024) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [mobileMenuOpen]);

  const handleMobileNav = (page: string) => {
    setMobileMenuOpen(false);
    onNavigate(page);
  };

  const handleMobileAuth = (mode: "login" | "register") => {
    setMobileMenuOpen(false);
    onStart(mode);
  };

  const mobileOverlay = (
    <>
      {mobileMenuOpen && (
        <div
          className="marketing-mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="marketing-mobile-drawer"
        className={`marketing-mobile-drawer ${mobileMenuOpen ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!mobileMenuOpen}
        aria-label={aria.mobileMenu}
      >
        <div className="marketing-mobile-drawer-head">
          <LanguageSelector variant="dropdown" className="marketing-drawer-language" />
          <button
            type="button"
            className="marketing-mobile-icon-btn"
            onClick={toggleTheme}
            aria-label={theme === "light" ? aria.switchToDark : aria.switchToLight}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            type="button"
            className="marketing-mobile-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label={aria.closeMenu}
          >
            <X size={20} />
          </button>
        </div>
        <nav className="marketing-mobile-links" aria-label={aria.mobileNav}>
          {primaryNav.map((item) => (
            <button
              type="button"
              key={item.page}
              className={currentPage === item.page ? "is-active" : ""}
              aria-current={currentPage === item.page ? "page" : undefined}
              onClick={() => handleMobileNav(item.page)}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleMobileAuth("login")}
          >
            {t.nav.signIn}
          </button>
          <button
            type="button"
            onClick={() => handleMobileAuth("register")}
          >
            {t.nav.getStarted}
          </button>
        </nav>
      </div>
    </>
  );

  return (
    <>
      <header className="marketing-header">
        <div className="marketing-header-left">
          <a
            className="marketing-brand"
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              handleMobileNav("home");
            }}
          >
            <img
              src="/svgviewer-output.svg"
              alt={aria.logoAlt}
              className="platform-logo"
            />
            <strong><span>YE</span>KIS</strong>
          </a>
        </div>
        <nav className="marketing-nav-center" aria-label={aria.primaryNav}>
          {primaryNav.map((item) => (
            <button
              type="button"
              key={item.page}
              className={currentPage === item.page ? "is-active" : ""}
              aria-current={currentPage === item.page ? "page" : undefined}
              onClick={() => onNavigate(item.page)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="marketing-nav-right">
          <LanguageSelector variant="dropdown" className="marketing-header-language" />
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={theme === "light" ? aria.switchToDark : aria.switchToLight}
          >
            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button
            type="button"
            className="btn-ghost marketing-signin-btn"
            onClick={() => onStart("login")}
          >
            {t.nav.signIn}
          </button>
          <button
            type="button"
            className="btn-primary marketing-cta-btn"
            onClick={() => onStart("register")}
          >
            {t.nav.getStarted}
          </button>
          <button
            type="button"
            className="marketing-mobile-toggle"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-mobile-drawer"
            aria-label={mobileMenuOpen ? aria.closeMenu : aria.openMenu}
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </header>
      {typeof document !== "undefined"
        ? createPortal(mobileOverlay, document.body)
        : mobileOverlay}
    </>
  );
}
