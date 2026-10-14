import { useI18n } from "./i18n";
import "./marketing.css";

type NotFoundPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function NotFoundPage({ onNavigate, onStart }: NotFoundPageProps) {
  const { t } = useI18n();

  return (
    <div
      className="marketing-page"
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      <div className="marketing-container">
        <h1
          style={{
            fontSize: "120px",
            color: "var(--color-primary)",
            margin: 0,
          }}
        >
          404
        </h1>
        <h2 style={{ marginBottom: "40px" }}>
          {t.marketing["404"].subtitle}
        </h2>
        <div style={{ display: "flex", gap: "20px", justifyContent: "center" }}>
          <button className="btn-primary" onClick={() => onNavigate("home")}>
            {t.marketing["404"].homeLink}
          </button>
          <button className="btn-secondary" onClick={() => onStart("register")}>
            {t.marketing["404"].jobsLink}
          </button>
          <button className="btn-secondary" onClick={() => onStart("register")}>
            {t.marketing.cta.findWork}
          </button>
        </div>
      </div>
    </div>
  );
}
