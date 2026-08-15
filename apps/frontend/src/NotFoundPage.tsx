import "./marketing.css";

type NotFoundPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function NotFoundPage({ onNavigate, onStart }: NotFoundPageProps) {
  return (
    <div className="marketing-page" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
      <div className="marketing-container">
        <h1 style={{ fontSize: '120px', color: 'var(--yekis-lime)', margin: 0 }}>404</h1>
        <h2 style={{ marginBottom: '40px' }}>This page doesn't exist — but great opportunities do.</h2>
        <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
          <button className="btn-primary" onClick={() => onNavigate("home")}>Go to Homepage</button>
          <button className="btn-secondary" onClick={() => onStart("register")}>Browse Jobs</button>
          <button className="btn-secondary" onClick={() => onStart("register")}>Find Freelancers</button>
        </div>
      </div>
    </div>
  );
}
