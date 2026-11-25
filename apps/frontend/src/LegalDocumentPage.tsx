import type { ReactNode } from "react";
import { type Language, useI18n } from "./i18n";
import "./LegalDocumentPage.css";

export type LegalSection = {
  id: string;
  title: string;
  content: ReactNode;
};

type LegalDocumentPageProps = {
  eyebrow: string;
  title: string;
  summary: string;
  effectiveDate: string;
  sections: LegalSection[];
  contactEmail: string;
  onNavigate: (page: string) => void;
};

const LEGAL_CHROME: Record<
  Language,
  {
    breadcrumbAria: string;
    home: string;
    detailsAria: string;
    effectivePrefix: string;
    version: string;
    languageLabel: string;
    onThisPage: string;
    needHelp: string;
  }
> = {
  en: {
    breadcrumbAria: "Breadcrumb",
    home: "Home",
    detailsAria: "Document details",
    effectivePrefix: "Effective",
    version: "Version 1.1",
    languageLabel: "English",
    onThisPage: "On this page",
    needHelp: "Need help?",
  },
  am: {
    breadcrumbAria: "መዳረሻ",
    home: "መነሻ",
    detailsAria: "የሰነድ ዝርዝሮች",
    effectivePrefix: "የሚፀናበት ቀን",
    version: "እትም 1.1",
    languageLabel: "አማርኛ",
    onThisPage: "በዚህ ገጽ ላይ",
    needHelp: "እገዛ ይፈልጋሉ?",
  },
  om: {
    breadcrumbAria: "Daandii fuulaa",
    home: "Mana",
    detailsAria: "Bal'ina sanadaa",
    effectivePrefix: "Hojiirra kan oolu",
    version: "Gulantaa 1.1",
    languageLabel: "Afaan Oromoo",
    onThisPage: "Fuula kana irratti",
    needHelp: "Gargaarsa barbaadduu?",
  },
  ti: {
    breadcrumbAria: "መገዲ ገጽ",
    home: "መበገሲ",
    detailsAria: "ዝርዝራት ሰነድ",
    effectivePrefix: "ዝጸንዓሉ ዕለት",
    version: "ሕታም 1.1",
    languageLabel: "ትግርኛ",
    onThisPage: "ኣብዚ ገጽ",
    needHelp: "ሓገዝ የድልየኩም ድዩ?",
  },
};

export function LegalDocumentPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
  contactEmail,
  onNavigate,
}: LegalDocumentPageProps) {
  const { language } = useI18n();
  const chrome = LEGAL_CHROME[language] ?? LEGAL_CHROME.en;

  return (
    <main className="legal-page">
      <div className="legal-page-container">
        <nav className="legal-breadcrumbs" aria-label={chrome.breadcrumbAria}>
          <button type="button" onClick={() => onNavigate("home")}>
            {chrome.home}
          </button>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>

        <header className="legal-hero">
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-summary">{summary}</p>
          <div className="legal-meta" aria-label={chrome.detailsAria}>
            <span>
              {chrome.effectivePrefix} {effectiveDate}
            </span>
            <span>{chrome.version}</span>
            <span>{chrome.languageLabel}</span>
          </div>
        </header>

        <div className="legal-layout">
          <aside className="legal-toc">
            <p className="legal-toc-title">{chrome.onThisPage}</p>
            <ol>
              {sections.map((section, index) => (
                <li key={section.id}>
                  <a href={`#${section.id}`}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {section.title}
                  </a>
                </li>
              ))}
            </ol>
            <div className="legal-toc-contact">
              <strong>{chrome.needHelp}</strong>
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>
            </div>
          </aside>

          <article className="legal-content">
            {sections.map((section, index) => (
              <section
                className="legal-section"
                id={section.id}
                key={section.id}
                aria-labelledby={`${section.id}-heading`}
              >
                <h2 id={`${section.id}-heading`}>
                  <span className="legal-section-number" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {section.title}
                </h2>
                {section.content}
              </section>
            ))}
          </article>
        </div>
      </div>
    </main>
  );
}
