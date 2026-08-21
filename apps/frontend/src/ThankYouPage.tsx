import "./marketing.css";

type ThankYouPageProps = {
  action: 'signup' | 'job-posted' | 'contact';
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function ThankYouPage({ action, onNavigate, onStart }: ThankYouPageProps) {
  const content = {
    signup: {
      title: "Welcome to Yekis!",
      message: "Your account is ready. Next step: verify your identity to start posting or finding work.",
      btnText: "Verify Identity",
      btnAction: () => onStart("login")
    },
    'job-posted': {
      title: "Your job is live!",
      message: "Qualified freelancers will start sending proposals soon.",
      btnText: "View Dashboard",
      btnAction: () => onStart("login")
    },
    contact: {
      title: "Thanks for reaching out!",
      message: "We'll get back to you within 24 hours.",
      btnText: "Back to Home",
      btnAction: () => onNavigate("home")
    }
  };

  const current = content[action];

  return (
    <div className="marketing-page" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      {/* TODO: fire GA4 event here for conversion tracking */}
      <div className="glass-panel" style={{ maxWidth: '600px', width: '100%' }}>
        <h1 style={{ color: 'var(--color-primary)' }}>{current.title}</h1>
        <p style={{ fontSize: '18px', margin: '20px 0 40px' }}>{current.message}</p>
        <button className="btn-primary" onClick={current.btnAction}>{current.btnText}</button>
      </div>
    </div>
  );
}
