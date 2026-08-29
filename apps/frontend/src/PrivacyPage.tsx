import "./marketing.css";

type PrivacyPageProps = {
  onNavigate: (page: string) => void;
};

export function PrivacyPage({ onNavigate }: PrivacyPageProps) {
  return (
    <div className="marketing-page">
      <div className="marketing-container">
        <div className="marketing-breadcrumbs">
          <button onClick={() => onNavigate("home")}>Home</button> &gt; Privacy
          Policy
        </div>
        <section className="content-section">
          <h1>Privacy Policy</h1>
          <p className="hero-subtitle">Last updated: [TODO: Date]</p>

          <div className="glass-panel" style={{ marginTop: "40px" }}>
            <h2>1. What We Collect</h2>
            <p>
              We collect information you provide to us directly, such as when
              you create an account, verify your identity, or use our platform.
            </p>

            <h2>2. How We Use Your Data</h2>
            <p>
              We use your data to operate, improve, and protect the platform,
              including processing payments and verifying identity.
            </p>

            <h2>3. KYC Data Processing</h2>
            <p>[TODO: Legal review needed for KYC processing specifics]</p>

            <h2>4. Data Storage & Security</h2>
            <p>
              Your data is stored securely using industry-standard encryption.
            </p>

            <h2>5. Third-Party Services</h2>
            <p>
              We work with licensed providers like Telebirr and CBE to process
              payments securely.
            </p>

            <h2>6. Your Rights</h2>
            <p>
              You have the right to access, correct, or delete your personal
              data.
            </p>

            <h2>7. Data Retention</h2>
            <p>
              We retain data only as long as necessary to fulfill the purposes
              outlined in this policy.
            </p>

            <h2>8. Ethiopian Data Protection Compliance</h2>
            <p>[TODO: Verify alignment with Ethiopian data protection laws]</p>

            <h2>9. Contact Us</h2>
            <p>If you have any questions, contact us at privacy@yekis.com.</p>
          </div>
        </section>
      </div>
    </div>
  );
}
