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
*   **Updated Legal Basis:** Prevention and Suppression of Money Laundering and Financing of Terrorism Proclamation No. ___/2024, NBE Directive FIS/04/2021.
*   **Data Collection:** Implement Fayda ID Integration, Unique Customer IDs, and automated PEP (Politically Exposed Persons) Screening.
*   **Record Retention:** CRITICAL CORRECTION - Retain KYC and transaction data for **10 years** (not 5-7 years) per the AML framework. Require WORM (Write Once Read Many) storage.

## 5. PDPP Compliance
*   **Mandatory ECA Registration:** Must register as a Data Controller with the Ethiopian Communications Authority (ECA) before processing data. Maintain a Register of Processing Activities. Appoint a Data Protection Officer (DPO) if handling sensitive financial data.
*   **Granular Consent:** Consent must be specific and unbundled (e.g., separate checkboxes for KYC, marketing, analytics).
*   **Data Subject Rights:** Users have rights to access, rectification, and erasure, though erasure does not override 10-year AML retention rules.
*   **Data Localization:** Primary servers must be in Ethiopia (Ethio Telecom Cloud, Safaricom Ethiopia). Cross-border backups require ECA approval and Standard Contractual Clauses (SCCs).
*   **Breach Notification:** Strict 72-hour protocol to notify ECA and users.

## 6. Critical Open Questions for Lawyer
1.  **AML Proclamation Number:** Confirm the final gazetted number for the 2024 AML Proclamation.
2.  **Platform Classification:** Is the platform a "payment instrument issuer" or "money transfer operator" under NBE?
3.  **DPO Requirement:** Does the volume/sensitivity trigger mandatory DPO appointment under PDPP?
4.  **ECA Registration Process:** Current procedure, timeline, and fee for data controller registration?
5.  **Fayda ID API Access:** Can the platform obtain direct API access?
6.  **Cross-Border SCCs:** Has ECA approved any SCCs for AWS/Azure/GCP backups?
7.  **Arbitration Data:** How does 10-year AML retention interact with PDPP erasure rights for dispute records?
