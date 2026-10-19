import { useI18n } from "./i18n";
import "./marketing.css";

type CaseStudiesPageProps = {
  onNavigate: (page: string) => void;
};

export function CaseStudiesPage({ onNavigate }: CaseStudiesPageProps) {
  const { t } = useI18n();

  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>{t.nav.home}</button> &gt; {t.nav.caseStudies}
        </div>
        <section className="content-section">
          <h1>{t.marketing.caseStudies.title}</h1>
          <p className="hero-subtitle">
            {t.marketing.caseStudies.subtitle}
          </p>

          <div className="case-study-grid" style={{ marginTop: "40px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <span className="placeholder-badge">{t.marketing.caseStudies.comingSoon}</span>
                <div
                  style={{
                    color: "var(--color-primary)",
                    fontSize: "14px",
                    marginBottom: "10px",
                    fontWeight: 600,
                  }}
                >
                  {t.marketing.categories.c1Title1} {t.marketing.categories.c1Title2}
                </div>
                <h3>{t.marketing.caseStudies.title} #{i}</h3>
                <p
                  style={{
                    margin: "15px 0",
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {t.marketing.testimonials.t1Quote}
                </p>
                <div
                  style={{
                    borderTop: "1px solid var(--color-border)",
                    paddingTop: "15px",
                    marginTop: "15px",
                  }}
                >
                  <div style={{ fontSize: "14px", marginBottom: "5px" }}>
                    <strong>Budget:</strong> 45,000 ETB
                  </div>
                  <div style={{ fontSize: "14px", marginBottom: "15px" }}>
                    <strong>Timeline:</strong> 3 weeks
                  </div>
                  <div
                    style={{
                      fontStyle: "italic",
                      color: "var(--color-text)",
                      fontSize: "14px",
                    }}
                  >
                    &ldquo;{t.marketing.testimonials.t2Quote}&rdquo;
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: "60px", textAlign: "center" }}>
            <button
              className="btn-secondary"
              onClick={() => onNavigate("faq")}
              style={{ marginRight: "20px" }}
            >
              {t.marketing.caseStudies.readFaq}
            </button>
            <button
              className="btn-secondary"
              onClick={() => onNavigate("home")}
            >
              {t.marketing.caseStudies.browseCategories}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
