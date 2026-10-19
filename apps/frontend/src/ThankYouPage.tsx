import { useI18n } from "./i18n";
import "./marketing.css";

type ThankYouPageProps = {
  action: "signup" | "job-posted" | "contact";
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function ThankYouPage({
  action,
  onNavigate,
  onStart,
}: ThankYouPageProps) {
  const { t } = useI18n();

  const content = {
    signup: {
      title: t.marketing.thankYou.signup,
      message: t.marketing.thankYou.signupMessage,
      btnText: t.marketing.thankYou.verifyBtn,
      btnAction: () => onStart("login"),
    },
    "job-posted": {
      title: t.marketing.thankYou.jobPosted,
      message: t.marketing.thankYou.jobMessage,
      btnText: t.marketing.thankYou.viewDashboard,
      btnAction: () => onStart("login"),
    },
    contact: {
      title: t.marketing.thankYou.contact,
      message: t.marketing.thankYou.contactMessage,
      btnText: t.marketing.thankYou.backHome,
      btnAction: () => onNavigate("home"),
    },
  };

  const current = content[action];

  return (
    <div
      className="marketing-page"
      style={{
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
      }}
    >
      {/* TODO: fire GA4 event here for conversion tracking */}
      <div className="glass-panel" style={{ maxWidth: "600px", width: "100%" }}>
        <h1 style={{ color: "var(--color-primary)" }}>{current.title}</h1>
        <p style={{ fontSize: "18px", margin: "20px 0 40px" }}>
          {current.message}
        </p>
        <button className="btn-primary" onClick={current.btnAction}>
          {current.btnText}
        </button>
      </div>
    </div>
  );
}
