import { useState, useMemo, useRef, useEffect } from "react";
import {
  MessageSquare,
  Wallet,
  Briefcase,
  Search,
  X,
  ArrowUpRight,
} from "lucide-react";
import { events } from "./analytics";
import { useI18n } from "./i18n";
import { openSupportChat } from "./components/supportChatEvents";
import "./landing-v2.css";

type FAQPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

type QuestionItem = {
  key: string;
  catIndex: number;
  category: string;
  q: string;
  a: string;
  id?: string;
  link?: string;
};

export function FAQPage({ onNavigate, onStart }: FAQPageProps) {
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  const categories = useMemo<
    {
      title: string;
      questions: { q: string; a: string; id?: string; link?: string }[];
    }[]
  >(
    () => [
      {
        title: t.marketing.faq.trustTitle,
        questions: [
          { q: t.marketing.faq.q1, a: t.marketing.faq.a1 },
          { q: t.marketing.faq.q2, a: t.marketing.faq.a2 },
          { q: t.marketing.faq.q3, a: t.marketing.faq.a3, id: "disputes" },
          { q: t.marketing.faq.q4, a: t.marketing.faq.a4 },
        ],
      },
      {
        title: t.marketing.faq.startTitle,
        questions: [
          { q: t.marketing.faq.q5, a: t.marketing.faq.a5 },
          { q: t.marketing.faq.q6, a: t.marketing.faq.a6 },
          { q: t.marketing.faq.q7, a: t.marketing.faq.a7, link: "fees" },
          { q: t.marketing.faq.q8, a: t.marketing.faq.a8 },
        ],
      },
      {
        title: t.marketing.faq.paidTitle,
        questions: [
          { q: t.marketing.faq.q9, a: t.marketing.faq.a9 },
          { q: t.marketing.faq.q10, a: t.marketing.faq.a10 },
          { q: t.marketing.faq.q11, a: t.marketing.faq.a11 },
        ],
      },
    ],
    [t],
  );

  const allQuestions: QuestionItem[] = useMemo(() => {
    const list: QuestionItem[] = [];
    categories.forEach((cat, catIdx) => {
      cat.questions.forEach((item, qIdx) => {
        list.push({
          key: `faq-${catIdx}-${qIdx}`,
          catIndex: catIdx,
          category: cat.title,
          q: item.q,
          a: item.a,
          id: item.id,
          link: item.link,
        });
      });
    });
    return list;
  }, [categories]);

  const [activeCategory, setActiveCategory] = useState<"ALL" | number>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>("faq-0-0");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing =
        el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable);
      if (e.key === "/" && !typing) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filteredQuestions = useMemo(() => {
    const needle = searchQuery.trim().toLowerCase();
    return allQuestions.filter((item) => {
      if (activeCategory !== "ALL" && item.catIndex !== activeCategory) {
        return false;
      }
      if (!needle) return true;
      return `${item.q} ${item.a} ${item.category}`.toLowerCase().includes(needle);
    });
  }, [allQuestions, activeCategory, searchQuery]);

  const groupedVisible = useMemo(() => {
    const map = new Map<number, { category: string; items: QuestionItem[] }>();
    filteredQuestions.forEach((item) => {
      const existing = map.get(item.catIndex);
      if (existing) {
        existing.items.push(item);
      } else {
        map.set(item.catIndex, { category: item.category, items: [item] });
      }
    });
    return Array.from(map.entries());
  }, [filteredQuestions]);

  const handleToggle = (key: string, question: string) => {
    if (openKey !== key) {
      events.faqExpanded(question);
    }
    setOpenKey(openKey === key ? null : key);
  };

  let staggerIdx = 0;

  return (
    <div className="yk-v2 yk-v2-subpage">
      <div className="v2-container">
        {/* Breadcrumb */}
        <nav className="v2-sub-breadcrumb" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate("home")}>
            {t.nav.home}
          </button>
          <span>/</span>
          <span className="v2-sub-breadcrumb-cur">{t.marketing.faq.title}</span>
        </nav>

        {/* Hero Header */}
        <header className="v2-sub-hero" style={{ marginBottom: 36 }}>
          <div className="v2-sub-hero-grid">
            <div>
              <span className="v2-eyebrow">Escrow, Payouts &amp; Account Help</span>
              <h1 className="v2-sub-title">{t.marketing.faq.title}</h1>
              <p className="v2-sub-lead">{t.marketing.faq.subtitle}</p>
            </div>

            <div className="v2-sub-kpis">
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">100%</div>
                <div className="v2-sub-kpi-lbl">Milestone Funds Held in ETB Escrow</div>
              </div>
              <div className="v2-sub-kpi-card">
                <div className="v2-sub-kpi-val">&lt; 48h</div>
                <div className="v2-sub-kpi-lbl">Evidence-Backed Dispute Review</div>
              </div>
            </div>
          </div>
        </header>

        {/* Category Filter Tabs */}
        <div className="v2-filter-bar">
          <div className="v2-filter-tabs" role="tablist" aria-label="FAQ Categories">
            <button
              type="button"
              role="tab"
              aria-selected={activeCategory === "ALL"}
              className={`v2-filter-tab ${activeCategory === "ALL" ? "is-active" : ""}`}
              onClick={() => setActiveCategory("ALL")}
            >
              <span>All Questions</span>
              <span className="v2-filter-count">{allQuestions.length}</span>
            </button>
            {categories.map((cat, idx) => (
              <button
                key={cat.title}
                type="button"
                role="tab"
                aria-selected={activeCategory === idx}
                className={`v2-filter-tab ${activeCategory === idx ? "is-active" : ""}`}
                onClick={() => setActiveCategory(idx)}
              >
                <span>{cat.title}</span>
                <span className="v2-filter-count">{cat.questions.length}</span>
              </button>
            ))}
          </div>
        </div>

        {/* V2 FAQ Card Stage */}
        <div className="v2-faq-card" style={{ marginBottom: 56 }}>
          {/* Left Column: Search + Wordmark + Quick Actions */}
          <div className="v2-faq-left" style={{ justifyContent: "flex-start" }}>
            <div className="v2-faq-searchrow">
              <Search className="v2-faq-lens" size={28} />
              <label className="v2-faq-search" style={{ maxWidth: "100%" }}>
                <input
                  ref={inputRef}
                  type="search"
                  placeholder={t.marketing.faq.searchPlaceholder}
                  aria-label={t.marketing.faq.searchPlaceholder}
                  autoComplete="off"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    style={{
                      position: "absolute",
                      right: 10,
                      background: "none",
                      border: "none",
                      color: "var(--v2-text2)",
                      cursor: "pointer",
                      display: "grid",
                      placeItems: "center",
                    }}
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <kbd>/</kbd>
                )}
              </label>
            </div>

            <h2 className="v2-faq-title" aria-hidden="true">
              <span>F</span>
              <span>A</span>
              <span>Q</span>
              <span className="v2-faq-dot" />
            </h2>

            <p className="v2-faq-tag">{t.marketing.faq.subtitle}</p>

            <div
              style={{
                marginTop: 28,
                padding: 20,
                borderRadius: 16,
                background: "var(--v2-surface)",
                border: "1px solid var(--v2-border)",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 15 }}>
                Need help with an active milestone or payout?
              </div>
              <p style={{ fontSize: 13.5, color: "var(--v2-text2)", lineHeight: 1.55 }}>
                Our Addis Ababa support team responds in English and Amharic. Open the live support widget or inspect the ETB fee calculator.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  className="v2-btn v2-btn-primary"
                  style={{ padding: "10px 16px", fontSize: 13.5 }}
                  onClick={() => {
                    if (!openSupportChat()) {
                      onNavigate("about");
                    }
                  }}
                >
                  <MessageSquare size={15} />
                  <span>Ask Support</span>
                </button>
                <button
                  type="button"
                  className="v2-btn"
                  style={{
                    padding: "10px 16px",
                    fontSize: 13.5,
                    borderColor: "var(--v2-border2)",
                    background: "var(--v2-bg2)",
                    color: "var(--v2-text)",
                  }}
                  onClick={() => onNavigate("fees")}
                >
                  <Wallet size={15} />
                  <span>{t.marketing.faq.viewFees}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Accordion List */}
          <div className="v2-faq-right">
            {filteredQuestions.length === 0 ? (
              <div className="v2-faq-empty" aria-live="polite">
                <p style={{ marginBottom: 14 }}>{t.marketing.faq.noResults}</p>
                <button
                  type="button"
                  className="v2-btn"
                  style={{
                    borderColor: "var(--v2-border2)",
                    background: "var(--v2-surface)",
                    color: "var(--v2-text)",
                    padding: "9px 16px",
                    fontSize: 13.5,
                  }}
                  onClick={() => {
                    setSearchQuery("");
                    setActiveCategory("ALL");
                  }}
                >
                  Reset filters
                </button>
              </div>
            ) : (
              <ul className="v2-faq-list">
                {groupedVisible.map(([catIdx, group]) => (
                  <div key={`group-${catIdx}`} style={{ display: "contents" }}>
                    <li
                      className="v2-faq-cat"
                      style={{ ["--i" as string]: staggerIdx++ }}
                    >
                      <span className="v2-faq-catname">{group.category}</span>
                    </li>
                    {group.items.map((item) => {
                      const isOpen = openKey === item.key;
                      return (
                        <li
                          key={item.key}
                          id={item.id}
                          className={isOpen ? "open" : ""}
                          style={{ ["--i" as string]: staggerIdx++ }}
                        >
                          <button
                            type="button"
                            className="v2-faq-q"
                            aria-expanded={isOpen}
                            onClick={() => handleToggle(item.key, item.q)}
                          >
                            <span>{item.q}</span>
                            <span className="v2-faq-chip">
                              <svg viewBox="0 0 14 14" aria-hidden="true">
                                <path d="M7 2v10M3 8.5 7 12l4-3.5" />
                              </svg>
                            </span>
                          </button>
                          <div className="v2-faq-a">
                            <div>
                              <p>
                                {item.a}
                                {item.link === "fees" && (
                                  <button
                                    type="button"
                                    className="v2-faq-link"
                                    onClick={() => onNavigate("fees")}
                                  >
                                    {t.marketing.faq.viewFees} <ArrowUpRight size={13} />
                                  </button>
                                )}
                              </p>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </div>
                ))}
              </ul>
            )}
          </div>
        </div>

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
                <span>{t.marketing.cta.findWork}</span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: allQuestions.map((q) => ({
              "@type": "Question",
              name: q.q,
              acceptedAnswer: { "@type": "Answer", text: q.a },
            })),
          }),
        }}
      />
    </div>
  );
}
