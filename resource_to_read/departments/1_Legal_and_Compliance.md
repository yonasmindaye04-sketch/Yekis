# Legal & Compliance Department

This document contains all sections from the original legal design and compliance roadmap that are the direct responsibility of the Legal & Compliance Department.

## 1. How Contractual/Freelance Work Happens in Ethiopia Today
*   **Misclassification Risk:** Freelancers are not employees under Ethiopian law. They fall under the Civil Code and Commercial Code (contract of services). Misclassification is a huge legal landmine. A "freelancer" working fixed hours, under direct supervision, exclusively for one client can be reclassified as an employee, triggering back taxes, penalties, and retroactive benefits. Contract templates must preserve the hallmarks of genuine independence.
*   **Current State:** Most freelance work happens informally (Telegram, WhatsApp) with no standard written contract, no escrow, and no formal recourse.

## 2. Legal and Regulatory Environment
*   **Electronic Transactions Proclamation No. 1205/2020:** Grants legal recognition to electronic contracts and signatures. Mandates platforms to verify sellers' true identity (KYC mandate), ensure 50% of offerings are local, set up dispute-resolution systems, and provide a 7-day cooling-off right to cancel. Protects electronic messages.
*   **Arbitration and Enforceability:** Under Article 42 of the Proclamation and Arbitration and Conciliation Proclamation No. 1237/2021, unresolved disagreements must be submitted to arbitration. Ethiopia acceded to the 1958 New York Convention, making awards enforceable. Seat should be Addis Ababa.
*   **Licensing & Financial Regulations:** Operates as an e-commerce business. Likely treated as a payment facilitator requiring registration or partnership (Telebirr/CBE API).
*   **PDPP (No. 1321/2024):** Imposes GDPR-like obligations: publish privacy notice, obtain consent, localize data (must be stored on Ethiopian servers), and report breaches within 72 hours.
*   **Compliance Checklist:** KYC/AML (valid ID, address, TIN, transaction monitoring), Tax (withholding & VAT), Data protection, Record-keeping (5-7 years, updated to 10 years per AML).

## 3. Contract / ToS Template Outline (Brief for a Law Firm)
*   **Platform Terms of Service:** Governs relationship between platform and users.
*   **Service Agreement:** The per-job contract. Includes:
    *   Independent Contractor Status & No Exclusivity.
    *   Scope, Deliverables, Timeline, & Milestones.
    *   Payment Terms (tied to escrow) & Revisions Policy.
    *   Intellectual Property (work-for-hire).
    *   Confidentiality & Liability (capped).
    *   Termination & Dispute escalation.
    *   Arbitration clause (Seat: Addis Ababa, e.g., AACCSA).
    *   Digital Acceptance (timestamped and stored).

## 4. KYC/AML Compliance Framework
*   **Updated Legal Basis:** Prevention and Suppression of Money Laundering and Financing of Terrorism (Amendment) Proclamation No. 1387/2025 (promulgated September 24, 2025; replaces Proclamation No. 780/2013), NBE Directive FIS/04/2021.
*   **Data Collection:** Implement Fayda ID Integration, Unique Customer IDs, and automated PEP (Politically Exposed Persons) Screening.
*   **Record Retention:** CRITICAL CORRECTION - Retain KYC and transaction data for **10 years** (not 5-7 years) per the AML framework. Require WORM (Write Once Read Many) storage.
*   **Payment Settlement Audit Trail (IMPLEMENTED):** All escrow funding settles exclusively via cryptographically verified provider webhooks (RSA-PSS signature verification — unsigned webhooks are rejected with HTTP 401). A reconciliation sweep (`PAYMENT_RECONCILED_VIA_QUERY` audit events) documents every payment resolved via direct provider status queries, so the audit log answers *why and when* each transaction settled even when a webhook was missed.

## 5. PDPP Compliance
*   **Mandatory ECA Registration:** Must register as a Data Controller with the Ethiopian Communications Authority (ECA) before processing data. Maintain a Register of Processing Activities. Appoint a Data Protection Officer (DPO) if handling sensitive financial data.
*   **Granular Consent:** Consent must be specific and unbundled (e.g., separate checkboxes for KYC, marketing, analytics).
*   **Data Subject Rights:** Users have rights to access, rectification, and erasure, though erasure does not override 10-year AML retention rules.
*   **Data Localization:** Primary servers must be in Ethiopia (Ethio Telecom Cloud, Safaricom Ethiopia). Cross-border backups require ECA approval and Standard Contractual Clauses (SCCs).
*   **Breach Notification:** Strict 72-hour protocol to notify ECA and users.

## 6. Critical Open Questions for Lawyer
1.  **AML Proclamation Number:** ✅ RESOLVED — finalized as Proclamation No. 1387/2025 (promulgated September 24, 2025). Obtain the full gazetted text from counsel before citing in published policies.
2.  **Platform Classification:** Is the platform a "payment instrument issuer" or "money transfer operator" under NBE?
3.  **DPO Requirement:** ✅ ASSESSED — PDPP Art. 37 thresholds (large-scale + special-category financial data) are met at projected launch volumes; DPO appointment treated as mandatory (fractional engagement). See the Decision Log in the Master Design document.
4.  **ECA Registration Process:** IN PROGRESS — registration tracked as a Phase 1 blocker; document checklist and timeline live in the Master Design document's ECA tracker.
5.  **Fayda ID API Access:** Can the platform obtain direct API access?
6.  **Cross-Border SCCs:** Has ECA approved any SCCs for AWS/Azure/GCP backups?
7.  **Arbitration Data:** How does 10-year AML retention interact with PDPP erasure rights for dispute records?

## 7. Consent & Data-Protection Updates (Latest Pass)
*   **T&C / Privacy acceptance at registration:** signup is blocked until the user expressly accepts the Terms and Conditions and Privacy Policy (including escrow, dispute-resolution, and KYC data-processing terms) - satisfies PDPP Art. 8 active opt-in for the core processing purposes.
*   **Social sign-in data handling:** Google/Apple/Facebook credentials are verified server-side against provider JWKS/Graph APIs; only verified email + profile name/avatar are stored. Unverified provider emails are rejected (prevents account hijack via self-asserted mailboxes). Provider identity links (googleId/appleId/facebookId) are unique and never silently merged across accounts; link conflicts are refused and audited.
*   **Analytics consent:** GA4 loads ONLY after the user accepts the analytics cookie category (cookie banner); measurement ID is env-configured and absent = fully disabled. Page-view events fire on marketing navigation.
*   **No fabricated personal data:** Telegram and social sign-ups no longer create synthetic dates of birth; real DOB is captured at Tier-2 Fayda verification (AML data integrity).
