import "./marketing.css";

type TermsPageProps = {
  onNavigate: (page: string) => void;
};

export function TermsPage({ onNavigate }: TermsPageProps) {
  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>Home</button> &gt; Terms of
          Service
        </div>
        <section className="content-section">
          <h1>Terms of Service</h1>
          <p className="hero-subtitle">Last updated: [TODO: Date]</p>

          <div className="glass-panel" style={{ marginTop: "40px" }}>
            <h2>1. Eligibility</h2>
            <p>You must be at least 18 years old to use Yekis.</p>

            <h2>2. Account Registration</h2>
            <p>
              You must provide accurate information when registering for an
              account.
            </p>

            <h2>3. KYC Requirements</h2>
            <p>
              Identity verification is required for certain platform activities,
              including withdrawals.
            </p>

            <h2>4. Job Posting & Proposals</h2>
            <p>Jobs must be legal and adhere to our community guidelines.</p>

            <h2>5. Escrow Terms</h2>
            <p>
              Funds placed in escrow are held by Yekis and released only upon
              milestone approval or dispute resolution.
            </p>

            <h2>6. Milestone Payment Process</h2>
            <p>
              Payments are tied to clear deliverables. Automatic release occurs
              if no response is received within 5 days.
            </p>

            <h2>7. Dispute Resolution</h2>
            <p>
              Disagreements are reviewed by Yekis. If unresolved, formal
              arbitration is conducted through the AACCSA arbitration body.
            </p>

            <h2>8. Fee Structure</h2>
            <p>
              Yekis charges a platform fee on completed milestones. See our Fees
              page for details.
            </p>

            <h2>9. Intellectual Property</h2>
            <p>
              Ownership of delivered work transfers upon full payment release.
            </p>

            <h2>10. Platform Liability</h2>
            <p>[TODO: Legal review needed for liability limitations]</p>

            <h2>11. Termination</h2>
            <p>
              Yekis reserves the right to suspend or terminate accounts that
              violate these terms.
            </p>

            <h2>12. Governing Law</h2>
            <p>These terms are governed by the laws of Ethiopia.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
