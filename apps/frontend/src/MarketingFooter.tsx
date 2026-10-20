import { useEffect, useRef, useState } from "react";
import { ArrowUp, ShieldCheck } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { openSupportChat } from "./components/supportChatEvents";
import { LandingSupportChat } from "./components/LandingSupportChat";
import { useI18n } from "./i18n";
import { LanguageSelector } from "./components/LanguageSelector";
import "./landing-v2.css";

type MarketingFooterProps = {
  onNavigate: (page: string) => void;
};

const prefersReduced = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function MarketingFooter({ onNavigate }: MarketingFooterProps) {
  const { t } = useI18n();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const NAV_COLS = [
    {
      heading: t.marketing.footer.platform,
      links: [
        { label: t.marketing.footer.faq, page: "faq" },
        { label: t.marketing.footer.fees, page: "fees" },
        { label: t.marketing.footer.caseStudies, page: "case-studies" },
      ],
    },
    {
      heading: t.marketing.footer.company,
      links: [
        { label: t.marketing.footer.about, page: "about" },
        {
          label: t.marketing.footer.contactSupport,
          href: "mailto:support@yekis.com",
          support: true,
        },
      ],
    },
    {
      heading: t.marketing.footer.legal,
      links: [
        { label: t.marketing.footer.privacy, page: "privacy" },
        { label: t.marketing.footer.terms, page: "terms" },
      ],
    },
  ];

  const SOCIAL = [
    {
      label: "TikTok",
      href: "#",
      svg: '<path fill="currentColor" d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 1 1 .77-5.06V9.7a5.68 5.68 0 0 0-.77-.05A5.68 5.68 0 1 0 15.54 15.3V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z"/>',
    },
    {
      label: "Telegram",
      href: "https://t.me/yekis_channel",
      svg: '<path fill="currentColor" d="M21.94 4.6 18.9 19.2c-.23 1.02-.84 1.27-1.7.79l-4.7-3.46-2.27 2.18c-.25.25-.46.46-.94.46l.33-4.79 8.72-7.88c.38-.34-.08-.53-.59-.19L6.06 13.1l-4.65-1.45c-1.01-.32-1.03-1.01.21-1.5l18.17-7c.84-.31 1.58.2 1.15 1.44Z"/>',
    },
    {
      label: "Telegram Community",
      href: "https://t.me/yekis_group",
      svg: '<path fill="currentColor" d="M12 2C6.48 2 2 6.04 2 11.02c0 2.83 1.44 5.36 3.7 7.01L4.8 22l4.38-2.19c.9.25 1.84.39 2.82.39 5.52 0 10-4.04 10-9.02S17.52 2 12 2Zm1.1 12.14-2.6-2.77-5.07 2.77 5.58-5.92 2.66 2.77 5.01-2.77-5.58 5.92Z"/>',
    },
    {
      label: "Yekis Bot",
      href: "https://t.me/ye_kis_bot",
      svg: '<rect x="3" y="6" width="18" height="14" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="9" cy="13" r="1.5" fill="currentColor"/><circle cx="15" cy="13" r="1.5" fill="currentColor"/><path d="M12 2v4M8 2h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    },
  ];

  const year = new Date().getFullYear();
  const areaRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const area = areaRef.current;
    const card = area?.querySelector<HTMLElement>(".v2-footer-card");
    const word = area?.querySelector<HTMLElement>(".v2-footer-word");
    if (!area || !card || !word) return;
    if (prefersReduced() || !("IntersectionObserver" in window)) {
      card.classList.add("is-visible");
      area.classList.add("is-visible");
      return;
    }

    const cardIO = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          en.target.classList.add("is-visible");
          cardIO.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    cardIO.observe(card);

    const wordIO = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (!en.isIntersecting) continue;
          area.classList.add("is-visible");
          wordIO.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    wordIO.observe(word);

    return () => {
      cardIO.disconnect();
      wordIO.disconnect();
    };
  }, []);

  return (
    <div className="yk-v2 yk-v2-footer-shell">
      <footer className="v2-footer-area" id="yk-footer" ref={areaRef}>
        <div className="v2-footer-divider" aria-hidden />

        <span className="v2-footer-glow v2-footer-glow-l" aria-hidden />
        <span className="v2-footer-glow v2-footer-glow-r" aria-hidden />

        <div className="v2-footer-card">
          <div className="v2-footer-top">
            <div className="v2-footer-lead">
              <button
                className="v2-footer-logo"
                onClick={() => onNavigate("home")}
                aria-label="Yekis Home"
              >
                <span className="v2-footer-symbol" aria-hidden>
                  <svg viewBox="0 0 24 24">
                    <path d="M5 4l7 9v7" />
                    <path d="M19 4l-7 9" />
                  </svg>
                </span>
                <span>Yekis</span>
              </button>
              <p className="v2-footer-desc">{t.marketing.footer.desc}</p>
              <nav className="v2-footer-social" aria-label={t.marketing.footer.social}>
                {SOCIAL.map(({ label, href, svg }) => (
                  <a
                    key={label}
                    href={href}
                    title={label}
                    aria-label={label}
                    target={href.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                      dangerouslySetInnerHTML={{ __html: svg }}
                    />
                  </a>
                ))}
              </nav>
            </div>

            <div className="v2-footer-nav">
              {NAV_COLS.map((col) => (
                <nav key={col.heading} aria-label={col.heading}>
                  <h4>{col.heading}</h4>
                  <div className="v2-footer-nav-links">
                    {col.links.map((lk) =>
                      "href" in lk ? (
                        <a
                          key={lk.label}
                          href={lk.href}
                          onClick={(e) => {
                            if (lk.support && openSupportChat()) {
                              e.preventDefault();
                            }
                          }}
                        >
                          {lk.label}
                        </a>
                      ) : (
                        <button key={lk.label} onClick={() => onNavigate(lk.page!)}>
                          {lk.label}
                        </button>
                      ),
                    )}
                  </div>
                </nav>
              ))}
            </div>
          </div>

          <div className="v2-footer-rule" aria-hidden />

          <div className="v2-footer-base">
            <div className="v2-footer-meta">
              <p>
                &copy; {year} Yekis &mdash; Addis Ababa &middot; {t.marketing.footer.copyright}
              </p>
              <span className="v2-footer-escrow">
                <ShieldCheck />
                {t.marketing.footer.escrowNote}
              </span>
            </div>
            <div className="v2-footer-legal">
              <LanguageSelector variant="segmented" />
              <button onClick={() => onNavigate("privacy")}>
                {t.marketing.footer.privacy}
              </button>
              <button onClick={() => onNavigate("terms")}>
                {t.marketing.footer.terms}
              </button>
            </div>
          </div>
        </div>

        <div className="v2-footer-word" aria-hidden>
          Yekis
        </div>
      </footer>

      <AnimatePresence>
        {showTop && (
          <motion.button
            className="yk-v2-to-top"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.9 }}
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: prefersReduced() ? "auto" : "smooth",
              })
            }
            aria-label="Back to top"
          >
            <ArrowUp size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      <LandingSupportChat />
    </div>
  );
}
