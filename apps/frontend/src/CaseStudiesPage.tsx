import "./marketing.css";

type CaseStudiesPageProps = {
  onNavigate: (page: string) => void;
};

export function CaseStudiesPage({ onNavigate }: CaseStudiesPageProps) {
  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>Home</button> &gt; Case Studies
        </div>
        <section className="content-section">
          <h1>Real projects. Real results.</h1>
          <p className="hero-subtitle">Case studies from verified, escrow-protected projects on Yekis.</p>
          
          <div className="case-study-grid" style={{ marginTop: '40px' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="card">
                <span className="placeholder-badge">Coming Soon</span>
                <div style={{ color: 'var(--color-teal)', fontSize: '14px', marginBottom: '10px' }}>Category Placeholder</div>
                <h3>Project Title Placeholder</h3>
                <p style={{ margin: '15px 0', color: 'var(--color-text-secondary)' }}>Outcome summary placeholder. This is where the story of successful escrow-protected work will go.</p>
                <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '15px', marginTop: '15px' }}>
                  <div style={{ fontSize: '14px', marginBottom: '5px' }}><strong>Budget:</strong> [ETB Range]</div>
                  <div style={{ fontSize: '14px', marginBottom: '15px' }}><strong>Timeline:</strong> [Duration]</div>
                  <div style={{ fontStyle: 'italic', color: 'var(--color-text)', fontSize: '14px' }}>"Client quote placeholder..."</div>
                </div>
                <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button className="btn-secondary" style={{ padding: '8px 16px', fontSize: '12px' }}>Share</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '60px', textAlign: 'center' }}>
            <button className="btn-secondary" onClick={() => onNavigate("faq")} style={{ marginRight: '20px' }}>Read FAQ</button>
            <button className="btn-secondary" onClick={() => onNavigate("home")}>Browse Categories</button>
          </div>
        </section>
      </div>
    </div>
  );
}
