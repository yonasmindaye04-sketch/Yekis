import { useI18n } from "./i18n";
import "./marketing.css";

type AboutPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function AboutPage({ onNavigate, onStart: _onStart }: AboutPageProps) {
  const { t } = useI18n();

  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>{t.nav.home}</button> &gt; {t.nav.about}
        </div>
        <section className="content-section">
          <h1>{t.marketing.about.title}</h1>

          <div className="glass-panel" style={{ marginTop: "40px" }}>
            <h2>{t.marketing.about.missionTitle}</h2>
            <p
              style={{
                fontSize: "20px",
                color: "var(--color-primary)",
                fontStyle: "italic",
                margin: "20px 0",
              }}
            >
              &ldquo;{t.marketing.about.missionQuote}&rdquo;
            </p>

            <h2 style={{ marginTop: "40px" }}>{t.marketing.about.problemTitle}</h2>
            <p>
              {t.marketing.about.problemBody}
            </p>
          </div>

          <div style={{ marginTop: "60px" }}>
            <h2>{t.marketing.about.teamTitle}</h2>
            <div
              className="category-card"
              style={{ maxWidth: "300px", margin: "20px 0" }}
            >
              <div
                style={{
                  width: "100px",
                  height: "100px",
                  borderRadius: "50%",
                  background: "var(--color-border)",
                  marginBottom: "20px",
                }}
              ></div>
              <h3>Dawit Alemu</h3>
              <p style={{ color: "var(--color-text-secondary)" }}>Founder &amp; Engineering</p>
            </div>
          </div>

          <div className="glass-panel" style={{ marginTop: "60px" }}>
            <h2>{t.marketing.about.contactTitle}</h2>
            <p>{t.marketing.about.email}</p>
            <p>{t.marketing.about.phone}</p>
            <div style={{ marginTop: "20px" }}>
              <a
                href="https://t.me/yekis_channel"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--color-primary)",
                  marginRight: "20px",
                  textDecoration: "none",
                }}
              >
                {t.marketing.about.telegramChannel}
              </a>
              <a
                href="https://t.me/yekis_group"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--color-primary)",
                  marginRight: "20px",
                  textDecoration: "none",
                }}
              >
                {t.marketing.about.telegramGroup}
              </a>
              <a
                href="https://t.me/yekis_bot"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "var(--color-primary)",
                  textDecoration: "none",
                }}
              >
                {t.marketing.about.telegramBot}
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
