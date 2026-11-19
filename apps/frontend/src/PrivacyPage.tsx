import "./marketing.css";
import { LegalDocumentPage, type LegalSection } from "./LegalDocumentPage";

const EFFECTIVE_DATE = "13 November 2026";

type PrivacyPageProps = {
  onNavigate: (page: string) => void;
};

export function PrivacyPage({ onNavigate }: PrivacyPageProps) {
  const sections: LegalSection[] = [
    {
      id: "scope",
      title: "Who we are and what this policy covers",
      content: (
        <>
          <p>
            Yekis is an Ethiopian freelance marketplace operated from Addis Ababa,
            Ethiopia. This Privacy Policy explains how Yekis collects, uses, shares,
            retains, and protects personal data when you visit the Yekis website,
            create an account, use the web workspace or Telegram Mini App, interact
            with the support team, post a job, bid on work, enter a contract, fund
            or receive a milestone payment, or use another Yekis feature.
          </p>
          <p>
            Yekis is the data controller for personal data processed through those
            services. The marketplace parties also act as independent controllers for
            information they provide to one another for a transaction, such as a
            client&apos;s business contact details shown to the freelancer they hire.
          </p>
        </>
      ),
    },
    {
      id: "information-we-collect",
      title: "Information we collect",
      content: (
        <>
          <p>We collect only information that is needed to operate, secure, and improve the marketplace.</p>
          <ul>
            <li>
              <strong>Account and authentication information:</strong> first and last
              name, display name, email address, phone number, date of birth, role,
              language and timezone preferences, password hash, Google or other
              linked provider identifier, Telegram user or chat identifier,
              verification status, and account creation or update times.
            </li>
            <li>
              <strong>Profile and marketplace information:</strong> biography, avatar,
              skills, portfolio files, availability, profile visibility, job briefs,
              proposals, cover letters, screening answers, gig listings and packages,
              contracts, milestone descriptions, delivery files, messages, reviews,
              profile views, and feature-placement activity.
            </li>
            <li>
              <strong>Identity and compliance information:</strong> verification tier,
              UCID, Fayda biometric identifier, identity documents, a selfie or other
              verification image when you choose to submit one, consent records,
              review decisions, and transaction-monitoring flags or suspicious
              transaction report records where the law requires them.
            </li>
            <li>
              <strong>Financial and payment information:</strong> wallet balance, ETB
              amounts, top-up and payment status, provider transaction references,
              withdrawals and payout destinations, ledger entries, platform fees,
              provider charges, statutory deductions, and financial audit events. Yekis
              does not store complete payment-card credentials; payment providers
              process those details directly.
            </li>
            <li>
              <strong>Communications:</strong> support conversations, direct
              messages, dispute statements and evidence, notifications, email and
              SMS delivery records, Telegram messages, and the consent choices you
              make.
            </li>
            <li>
              <strong>Technical and security information:</strong> IP address, device
              and browser information, request identifiers, authentication and security
              events, timestamps, error records, and audit-log entries for important
              state changes.
            </li>
          </ul>
        </>
      ),
    },
    {
      id: "sensitive-information",
      title: "Sensitive identity and financial information",
      content: (
        <>
          <p>
            Some information used by a freelance marketplace is sensitive. Identity
            documents, biometric identifiers, date of birth, financial records, and
            dispute evidence can create serious harm if exposed. Yekis processes
            this information only for the purpose for which you submit it, including
            identity verification, fraud prevention, payment execution, contract
            administration, dispute handling, and legal or regulatory compliance.
          </p>
          <p>
            Do not place unnecessary sensitive information in a job brief, proposal,
            message, portfolio item, or dispute statement. Access to KYC documents,
            financial records, and other restricted records is limited by staff
            role and is written to the audit trail.
          </p>
        </>
      ),
    },
    {
      id: "how-we-use",
      title: "Why we use your information",
      content: (
        <ul>
          <li>Create and secure your account, authenticate you, and recover access.</li>
          <li>Verify identity, screen for fraud, enforce marketplace rules, and comply with anti-money-laundering requirements.</li>
          <li>Publish the profile, portfolio, listings, proposals, reviews, and other content you choose to make visible to other users.</li>
          <li>Match clients and freelancers, create contracts, administer milestones, process payments, and calculate fees.</li>
          <li>Send service, delivery, payment, security, and account notifications you have asked to receive.</li>
          <li>Provide support, resolve disputes, enforce contracts, and maintain the marketplace record.</li>
          <li>Protect Yekis, its users, and the public from fraud, abuse, spam, and unlawful activity.</li>
          <li>Understand aggregate platform use and improve the product when you have permitted analytics.</li>
          <li>Meet tax, regulatory, audit, and other legal obligations.</li>
        </ul>
      ),
    },
    {
      id: "legal-bases",
      title: "Why we are permitted to process it",
      content: (
        <>
          <p>
            Depending on the processing activity, Yekis relies on one or more of the
            following legal bases under applicable law, including the Personal Data
            Protection Proclamation No. 1321/2024:
          </p>
          <ul>
            <li><strong>Performance of a contract:</strong> when processing is needed to provide the service you request, such as accounts, contracts, milestones, and payouts.</li>
            <li><strong>Legal obligation:</strong> when identity, AML, tax, audit, or record-keeping law requires us to process or retain information.</li>
            <li><strong>Legitimate interests:</strong> when processing is necessary for security, fraud prevention, service improvement, and marketplace integrity, after balancing those interests against your rights.</li>
            <li><strong>Consent:</strong> for optional analytics and marketing communications, and where the law specifically requires consent.</li>
          </ul>
          <p>
            You may withdraw consent at any time through account settings or by
            contacting us. Withdrawal does not affect processing that was lawful before
            withdrawal or processing based on another legal basis.
          </p>
        </>
      ),
    },
    {
      id: "sharing",
      title: "When we share information",
      content: (
        <>
          <p>Yekis does not sell personal data. We share information only for the purposes described in this policy, including:</p>
          <ul>
            <li><strong>Other marketplace users:</strong> information needed to present your public profile, communicate with you, administer a proposal, contract, milestone, review, or dispute, and show the identity information required for a transaction.</li>
            <li><strong>Service providers:</strong> hosting, database, object storage, Redis, email, SMS, monitoring, and support providers that process data on Yekis&apos;s instructions.</li>
            <li><strong>Payment providers:</strong> Telebirr and other providers configured for a transaction, to verify payment, hold or release milestone funds, disburse withdrawals, and reconcile records.</li>
            <li><strong>Identity and authentication providers:</strong> eSignet or Fayda for verification, Google or another configured identity provider for sign-in, and Telegram for Mini App authentication and messages.</li>
            <li><strong>Analytics and service providers you permit:</strong> Google Analytics is loaded only in a production configuration after you accept analytics cookies.</li>
            <li><strong>Professional advisers and authorities:</strong> auditors, lawyers, regulators, courts, law-enforcement bodies, or financial-intelligence authorities when disclosure is required or necessary to protect the platform and its users.</li>
            <li><strong>A business transaction:</strong> a merger, financing, restructuring, or sale, subject to confidentiality safeguards and continued notice to affected users.</li>
          </ul>
        </>
      ),
    },
    {
      id: "international-transfers",
      title: "Storage and international transfers",
      content: (
        <>
          <p>
            Yekis is designed to host its primary application, database, and object
            storage in Ethiopia. The current production deployment uses an
            Ethiopian cloud region. Access from another country, use of a global
            identity or communication provider, or support access from outside
            Ethiopia can nevertheless constitute an international transfer.
          </p>
          <p>
            Where a transfer is necessary, Yekis uses the access, contractual, and
            technical safeguards required by applicable law. Contact us for
            information about the providers and safeguards relevant to your data.
          </p>
        </>
      ),
    },
    {
      id: "security",
      title: "How we protect information",
      content: (
        <>
          <p>Yekis applies proportionate technical and organisational safeguards, including:</p>
          <ul>
            <li>Argon2id password hashing and short-lived, revocable session tokens.</li>
            <li>HTTPS for production traffic, security headers, a content security policy, rate limiting, and strict request validation.</li>
            <li>Role-based access to identity, compliance, financial, support, and dispute records.</li>
            <li>Restricted object storage and time-limited signed links for sensitive files.</li>
            <li>Append-only audit records for important financial, security, and administrative changes.</li>
            <li>Risk controls that flag unusual transaction patterns for human review.</li>
          </ul>
          <p>
            No online service can promise absolute security. If a breach affects
            your information, Yekis will contain the incident, revoke affected
            sessions, notify affected users and the appropriate authority within
            the legally required period, and record the response.
          </p>
        </>
      ),
    },
    {
      id: "retention",
      title: "How long we keep information",
      content: (
        <>
          <p>
            Yekis keeps personal data only as long as necessary for the purpose it
            was collected, to perform the service, to resolve disputes, and to meet
            legal obligations. The main retention periods are:
          </p>
          <ul>
            <li><strong>Active account and marketplace content:</strong> while the account is active and as needed to operate the transactions and relationships entered into.</li>
            <li><strong>Identity, KYC, financial, transaction, consent, dispute, and audit records:</strong> generally for up to ten years where applicable law or regulatory record-keeping rules require retention.</li>
            <li><strong>Support conversations and dispute evidence:</strong> while the matter is open and for the period needed to establish, exercise, or defend legal claims.</li>
            <li><strong>Security and technical records:</strong> for the period needed to investigate incidents, enforce the terms, and protect the service.</li>
            <li><strong>Consent history:</strong> retained as evidence of what you agreed to and when.</li>
          </ul>
          <p>
            When you request erasure, Yekis destroys profile content, credentials,
            uploaded personal media, chat and direct-message content written by you,
            portfolio items, skills, marketplace copy, notifications, and analytics.
            The account is closed and its sessions are revoked. Records that law
            requires Yekis to retain, including identity evidence, KYC records,
            wallets, transactions, ledger entries, audit logs, consent history,
            contracts, milestones, disputes, evidence, and reviews written about you,
            remain available for the required period. The erasure response lists the
            retained categories.
          </p>
        </>
      ),
    },
    {
      id: "cookies",
      title: "Cookies, browser storage, and analytics",
      content: (
        <>
          <p>
            Yekis uses browser storage for functions that cannot work without it,
            including authentication tokens, theme and language preferences, consent
            choices, and temporary payment-return state. Essential storage is not
            switched off because it is required for account security and the service
            to function.
          </p>
          <p>
            Optional analytics uses Google Analytics in production only when a
            measurement identifier is configured and you have accepted analytics
            cookies. Yekis&apos;s analytics events are designed not to include email
            addresses, phone numbers, names, account identifiers, or user-specific
            payment amounts. You can reject analytics and marketing choices in the
            consent banner and change your mind later.
          </p>
        </>
      ),
    },
    {
      id: "your-rights",
      title: "Your privacy rights",
      content: (
        <>
          <p>Subject to applicable law, you may have the right to:</p>
          <ul>
            <li>Know what personal data Yekis holds about you and obtain a copy.</li>
            <li>Receive that data in a portable, machine-readable format.</li>
            <li>Correct inaccurate or incomplete information.</li>
            <li>Ask Yekis to erase personal data when no legal obligation requires retention.</li>
            <li>Withdraw consent and stop optional marketing or analytics processing.</li>
            <li>Restrict or object to processing that is based on legitimate interests.</li>
            <li>Receive notice of a legally required disclosure and challenge it where the law allows.</li>
            <li>Complain to the competent Ethiopian data protection authority.</li>
          </ul>
          <p>
            Yekis cannot delete financial or identity records that must be retained
            by law, and cannot erase records while money is in flight, a contract is
            active, or a dispute is open. In those cases, the request is refused with
            the specific items that must first be resolved.
          </p>
        </>
      ),
    },
    {
      id: "exercise-rights",
      title: "How to exercise your rights",
      content: (
        <>
          <p>
            Signed-in users can export their data and request account erasure from
            account settings. Export produces the account, profile, verification,
            financial, marketplace, communications, consent, and compliance records
            that Yekis holds. Erasure requires fresh authentication so that another
            person cannot close your account without your consent.
          </p>
          <p>
            For a correction, restriction, objection, complaint, or any other
            privacy request, email <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>.
            Include enough detail for us to identify the account and the request.
            We may ask for verification before acting. Yekis aims to acknowledge a
            request promptly and will explain if a lawful exception applies.
          </p>
        </>
      ),
    },
    {
      id: "automated-processing",
      title: "Automated checks and human review",
      content: (
        <>
          <p>
            Yekis uses rules to detect unusual transaction patterns, possible
            duplicate or fraudulent accounts, incomplete verification, security
            anomalies, and content that may breach the terms. These rules can place
            an account, payment, or listing under review. Final compliance, KYC, and
            dispute decisions are made by authorised people through controlled
            workflows and are recorded in the audit trail.
          </p>
          <p>
            You can ask for the information used to make a decision, request human
            review, or contest an outcome where applicable law gives you that right.
          </p>
        </>
      ),
    },
    {
      id: "children",
      title: "Children and minimum age",
      content: (
        <p>
          Yekis is not intended for children. You must be at least 18 years old and
          legally able to enter a binding contract to create an account or use the
          marketplace. We do not knowingly collect personal data directly from a
          child. If you believe a child has provided information to us, contact us
          immediately so we can review and remove it where required.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to this policy",
      content: (
        <p>
          Yekis may update this policy when the service, our processing, or the law
          changes. The effective date and version at the top of this page identify
          the current version. We will provide additional notice through the service
          or by email when a change materially affects your rights. Continuing to use
          Yekis after the notice means the updated policy applies from its effective
          date, except where the law requires fresh consent.
        </p>
      ),
    },
    {
      id: "contact",
      title: "Contact and complaints",
      content: (
        <>
          <p>
            Yekis is based in Addis Ababa, Ethiopia. Send privacy questions to{" "}
            <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>. For general
            account or marketplace support, email{" "}
            <a href="mailto:support@yekis.com">support@yekis.com</a>.
          </p>
          <p>
            If you are not satisfied with our response, you may ask for escalation
            to our privacy contact or complain to the competent Ethiopian data
            protection authority. We will not retaliate against you for making a
            good-faith privacy request or complaint.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalDocumentPage
      eyebrow="Legal and trust"
      title="Privacy Policy"
      summary="How Yekis handles identity, marketplace, payment, communications, and security data, and the choices and rights you have over that information."
      effectiveDate={EFFECTIVE_DATE}
      sections={sections}
      contactEmail="privacy@yekis.com"
      onNavigate={onNavigate}
    />
  );
}
