import { useI18n } from "./i18n";
import "./marketing.css";

type FeesPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function FeesPage({ onNavigate, onStart }: FeesPageProps) {
  const { t } = useI18n();

  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>{t.nav.home}</button> &gt; {t.nav.fees}
        </div>
        <section className="content-section">
          <h1>{t.marketing.fees.title}</h1>
          <p className="hero-subtitle" style={{ marginBottom: "40px" }}>
            {t.marketing.fees.subheadline}
          </p>

          <div className="glass-panel">
            <h2>{t.marketing.fees.panelTitle}</h2>
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: "20px",
                color: "var(--color-text)",
              }}
            >
              <li>{t.marketing.fees.feeItem1}</li>
              <li>{t.marketing.fees.feeItem2}</li>
              <li>{t.marketing.fees.feeItem3}</li>
              <li>{t.marketing.fees.feeItem4}</li>
              <li>{t.marketing.fees.feeItem5}</li>
            </ul>
          </div>

          <div style={{ marginTop: "60px" }}>
            <h2>{t.marketing.fees.compareTitle}</h2>
            <div style={{ overflowX: "auto", marginTop: "20px" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr style={{ borderBottom: "2px solid var(--color-border)" }}>
                    <th style={{ padding: "16px", color: "var(--color-text)" }}>
                      {t.marketing.fees.featureCol}
                    </th>
                    <th
                      style={{ padding: "16px", color: "var(--color-primary)" }}
                    >
                      {t.marketing.fees.yekisCol}
                    </th>
                    <th style={{ padding: "16px", color: "var(--color-text)" }}>
                      {t.marketing.fees.informalCol}
                    </th>
                    <th style={{ padding: "16px", color: "var(--color-text)" }}>
                      {t.marketing.fees.lawyerCol}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "16px" }}>{t.marketing.fees.row1Feature}</td>
                    <td
                      style={{ padding: "16px", color: "var(--color-primary)" }}
                    >
                      {t.marketing.fees.row1Yekis}
                    </td>
                    <td style={{ padding: "16px" }}>{t.marketing.fees.row1Informal}</td>
                    <td style={{ padding: "16px" }}>{t.marketing.fees.row1Lawyer}</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "16px" }}>{t.marketing.fees.row2Feature}</td>
                    <td
                      style={{ padding: "16px", color: "var(--color-primary)" }}
                    >
                      {t.marketing.fees.row2Yekis}
                    </td>
                    <td style={{ padding: "16px" }}>{t.marketing.fees.row2Informal}</td>
                    <td style={{ padding: "16px" }}>{t.marketing.fees.row2Lawyer}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <button className="btn-secondary" onClick={() => onNavigate("faq")}>
              {t.marketing.fees.readFaq}
            </button>
          </div>

          <div className="final-cta">
            <button
              className="btn-primary"
              onClick={() => onStart("register")}
              style={{ marginRight: "20px" }}
            >
              {t.marketing.cta.postJob}
            </button>
            <button
              className="btn-secondary"
              onClick={() => onStart("register")}
            >
              {t.marketing.cta.findWork}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
