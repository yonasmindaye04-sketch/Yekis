import "./marketing.css";

type FeesPageProps = {
  onNavigate: (page: string) => void;
  onStart: (mode: "login" | "register") => void;
};

export function FeesPage({ onNavigate, onStart }: FeesPageProps) {
  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>Home</button> &gt; Fees
        </div>
        <section className="content-section">
          <h1>Simple, transparent pricing</h1>
          <p className="hero-subtitle" style={{ marginBottom: "40px" }}>
            You only pay when a job is successfully completed — never upfront.
          </p>

          <div className="glass-panel">
            <h2>Platform Fees</h2>
            <ul
              style={{
                listStyleType: "disc",
                paddingLeft: "20px",
                color: "var(--color-text)",
              }}
            >
              <li>
                Platform fee: [TODO: X%] of each completed milestone, split
                between client and freelancer
              </li>
              <li>No listing fees</li>
              <li>No subscription fees</li>
              <li>No hidden charges</li>
              <li>
                Withholding tax: 3% for TIN-verified freelancers, 30% for
                unverified (per ERCA regulation)
              </li>
            </ul>
          </div>

          <div style={{ marginTop: "60px" }}>
            <h2>How we compare</h2>
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
                      Feature
                    </th>
                    <th
                      style={{ padding: "16px", color: "var(--color-primary)" }}
                    >
                      Yekis
                    </th>
                    <th style={{ padding: "16px", color: "var(--color-text)" }}>
                      Informal Trust
                    </th>
                    <th style={{ padding: "16px", color: "var(--color-text)" }}>
                      Hiring a Lawyer
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "16px" }}>Payment Protection</td>
                    <td
                      style={{ padding: "16px", color: "var(--color-primary)" }}
                    >
                      Escrow Held
                    </td>
                    <td style={{ padding: "16px" }}>None</td>
                    <td style={{ padding: "16px" }}>High retainers</td>
                  </tr>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td style={{ padding: "16px" }}>Dispute Resolution</td>
                    <td
                      style={{ padding: "16px", color: "var(--color-primary)" }}
                    >
                      Included
                    </td>
                    <td style={{ padding: "16px" }}>"He said, she said"</td>
                    <td style={{ padding: "16px" }}>Expensive litigation</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ marginTop: "40px", textAlign: "center" }}>
            <button className="btn-secondary" onClick={() => onNavigate("faq")}>
              Read more in our FAQ
            </button>
          </div>

          <div className="final-cta">
            <button
              className="btn-primary"
              onClick={() => onStart("register")}
              style={{ marginRight: "20px" }}
            >
              Post a Job
            </button>
            <button
              className="btn-secondary"
              onClick={() => onStart("register")}
            >
              Find Work
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
