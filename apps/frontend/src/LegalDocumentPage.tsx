import type { ReactNode } from "react";
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

export function LegalDocumentPage({
  eyebrow,
  title,
  summary,
  effectiveDate,
  sections,
  contactEmail,
  onNavigate,
}: LegalDocumentPageProps) {
  return (
    <main className="legal-page">
      <div className="legal-page-container">
        <nav className="legal-breadcrumbs" aria-label="Breadcrumb">
          <button type="button" onClick={() => onNavigate("home")}>
            Home
          </button>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>

        <header className="legal-hero">
          <p className="legal-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p className="legal-summary">{summary}</p>
          <div className="legal-meta" aria-label="Document details">
            <span>Effective {effectiveDate}</span>
            <span>Version 1.1</span>
            <span>English</span>
          </div>
        </header>

        <div className="legal-layout">
          <aside className="legal-toc">
            <p className="legal-toc-title">On this page</p>
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
              <strong>Need help?</strong>
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
