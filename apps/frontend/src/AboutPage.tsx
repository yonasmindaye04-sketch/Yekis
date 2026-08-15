import "./marketing.css";

type AboutPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function AboutPage({ onNavigate, onStart }: AboutPageProps) {
  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>Home</button> &gt; About
        </div>
        <section className="content-section">
          <h1>About Yekis</h1>
          
          <div className="glass-panel" style={{ marginTop: '40px' }}>
            <h2>Our Mission</h2>
            <p style={{ fontSize: '20px', color: 'var(--yekis-teal)', fontStyle: 'italic', margin: '20px 0' }}>
              "Yekis exists to give Ethiopian freelancers and their clients a workspace where good work can happen without needing informal trust or a lawyer."
            </p>
            
            <h2 style={{ marginTop: '40px' }}>The Problem We Solve</h2>
            <p>The trust gap in Ethiopian freelance work holds back incredible talent. Clients fear paying upfront and receiving nothing. Freelancers fear delivering work and never getting paid. Yekis bridges this gap with milestone-based escrow, protecting both sides.</p>
          </div>

          <div style={{ marginTop: '60px' }}>
            <h2>Our Team</h2>
            <div className="category-card" style={{ maxWidth: '300px', margin: '20px 0' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--yekis-border)', marginBottom: '20px' }}></div>
              {/* TODO: Add real photo */}
              <h3>Placeholder Name</h3>
              <p style={{ color: 'var(--yekis-muted)' }}>Founder</p>
            </div>
          </div>

          <div className="glass-panel" style={{ marginTop: '60px' }}>
            <h2>Contact Information</h2>
            <p>Email: hello@yekis.com</p>
            <p>Phone: +251 900 000000</p>
            <div style={{ marginTop: '20px' }}>
              <a href="#" style={{ color: 'var(--yekis-lime)', marginRight: '20px', textDecoration: 'none' }}>Telegram Channel</a>
              <a href="#" style={{ color: 'var(--yekis-lime)', marginRight: '20px', textDecoration: 'none' }}>Telegram Group</a>
              <a href="#" style={{ color: 'var(--yekis-lime)', textDecoration: 'none' }}>Telegram Bot</a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
