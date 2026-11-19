import "./marketing.css";
import { LegalDocumentPage, type LegalSection } from "./LegalDocumentPage";

const EFFECTIVE_DATE = "13 November 2026";

type TermsPageProps = {
  onNavigate: (page: string) => void;
};

export function TermsPage({ onNavigate }: TermsPageProps) {
  const sections: LegalSection[] = [
    {
      id: "agreement",
      title: "Agreement and eligibility",
      content: (
        <>
          <p>
            These Terms of Service form a binding agreement between you and Yekis
            for your use of the Yekis website, web workspace, Telegram Mini App,
            bot, support services, and marketplace. By creating an account or using
            the service, you accept these Terms and the{" "}
            <button
              type="button"
              className="legal-inline-link"
              onClick={() => onNavigate("privacy")}
            >
              Privacy Policy
            </button>
            .
          </p>
          <p>
            You must be at least 18 years old, legally able to enter a binding
            contract, and located in a jurisdiction where use of the service is
            lawful. If you use Yekis for an organisation, you confirm that you have
            authority to bind that organisation and that the organisation accepts
            these Terms.
          </p>
        </>
      ),
    },
    {
      id: "platform-role",
      title: "Yekis is a marketplace, not your employer or agent",
      content: (
        <>
          <p>
            Yekis provides the technology and workflow that connect clients and
            freelancers. Yekis is not an employer, staffing agency, recruiter, or
            legal representative of either party. Clients and freelancers are
            independent contractors responsible for the taxes, permits, insurance,
            and legal obligations connected with their work, except where these
            Terms or a signed service agreement expressly provide otherwise.
          </p>
          <p>
            Yekis administers account access, identity and transaction controls,
            contracts, milestone funding, payment records, disputes, and support.
            The commercial relationship for the underlying work is between the
            client and freelancer.
          </p>
        </>
      ),
    },
    {
      id: "accounts",
      title: "Accounts, access, and identity verification",
      content: (
        <>
          <p>
            You must provide accurate registration and profile information, keep it
            current, and use only one account unless Yekis approves another in
            writing. You are responsible for activity under your account and for
            keeping your password and verification codes confidential. Tell
            support immediately if you believe your account or credentials have
            been compromised.
          </p>
          <p>
            Yekis may require phone, email, identity, Fayda, or other verification
            before you post, bid, contract, fund, receive, or withdraw. You must
            submit only genuine information and genuine documents belonging to you
            or, where permitted, your organisation. Verification is not a guarantee
            of a user&apos;s honesty, fitness for a contract, or future performance.
          </p>
        </>
      ),
    },
    {
      id: "marketplace-content",
      title: "Your marketplace content",
      content: (
        <>
          <p>
            You keep ownership of content you submit. You give Yekis a limited,
            non-exclusive, worldwide licence to host, process, display, reproduce,
            and transmit that content only as necessary to operate the service,
            administer transactions, prevent abuse, and comply with law.
          </p>
          <p>
            You confirm that you have the right to submit the content, that it is
            accurate, and that publishing it does not infringe another person&apos;s
            rights. Do not submit another person&apos;s confidential information,
            identity document, payment credential, or private communication unless
            you are authorised to do so.
          </p>
        </>
      ),
    },
    {
      id: "prohibited-use",
      title: "Prohibited conduct",
      content: (
        <>
          <p>You must not use Yekis to:</p>
          <ul>
            <li>Offer or request illegal work, stolen goods, harmful materials, deceptive investment products, or services that violate another person&apos;s rights.</li>
            <li>Commit fraud, falsify identity or KYC documents, impersonate another person, or misrepresent your qualifications, availability, reviews, or deliverables.</li>
            <li>Harass, threaten, discriminate against, stalk, or unlawfully exploit another person.</li>
            <li>Upload malware, malicious code, abusive content, or material that infringes copyright, privacy, confidentiality, or other rights.</li>
            <li>Scrape, reverse engineer, overload, probe, or attempt to bypass the service, its security controls, rate limits, or access restrictions.</li>
            <li>Use another person&apos;s account, share credentials, sell an account, or transfer verification status.</li>
            <li>Move a transaction off-platform or ask another user to do so to avoid fees, dispute records, or Yekis safeguards.</li>
            <li>Attempt to withdraw, refund, or obtain a payment for work that was not authorised, delivered, or payable under the accepted terms.</li>
            <li>Send unsolicited bulk messages, spam, or unlawful marketing communications.</li>
          </ul>
        </>
      ),
    },
    {
      id: "jobs-and-gigs",
      title: "Jobs, proposals, and service packages",
      content: (
        <>
          <p>
            Clients may post jobs with clear descriptions, budgets, deadlines, and
            milestone terms. Freelancers may submit proposals only when they are
            eligible and able to perform the work. Clients may accept a proposal or
            order a published gig package. A proposal, order, or direct message is
            not a contract until the parties complete the required acceptance,
            signature, and funding steps shown in the workspace.
          </p>
          <p>
            A client may withdraw or revise a proposal before acceptance where the
            workspace allows it. After acceptance, the signed service agreement,
            milestone terms, and these Terms govern the engagement. Yekis may
            remove content that violates these Terms or creates a legal or security
            risk.
          </p>
        </>
      ),
    },
    {
      id: "contracts",
      title: "Contracts and the service agreement",
      content: (
        <>
          <p>
            When the parties accept a proposal, Yekis records the agreed scope,
            price, milestone schedule, signatures, and service-agreement terms. The
            workspace copy is the operational record of that agreement. Each party
            should read the agreement and milestone terms before signing or
            funding.
          </p>
          <p>
            Where a signed service agreement conflicts with these Terms, the
            signed agreement controls for that engagement to the extent the
            conflict is lawful. These Terms continue to govern platform use,
            accounts, fees, disputes, confidentiality, and liability.
          </p>
        </>
      ),
    },
    {
      id: "milestone-funding",
      title: "Milestone funding and payment protection",
      content: (
        <>
          <p>
            Funding a milestone allocates the stated amount to that milestone in
            Yekis&apos;s payment and ledger systems. The amount is not released to
            the freelancer merely because it was funded. The freelancer must
            perform the agreed work, submit the delivery, and follow the review and
            dispute process.
          </p>
          <p>
            Yekis&apos; milestone process is a marketplace safeguard designed to
            prevent a freelancer from being paid without delivery and to prevent a
            client from holding submitted work indefinitely without a dispute. It
            is not a guarantee of performance, a promise of a particular dispute
            outcome, an insurance policy, or a representation that funds are held
            by a licensed bank in a separate trust account unless a payment or
            account document expressly says so.
          </p>
          <p>
            Payments remain subject to provider settlement, fraud checks, legal
            holds, and mandatory deductions. If Yekis cannot obtain a valid
            payment, verify it, or release it because of a legal or compliance
            hold, the affected milestone is not treated as released.
          </p>
        </>
      ),
    },
    {
      id: "acceptance-and-release",
      title: "Acceptance, automatic release, and cooling-off",
      content: (
        <>
          <p>
            After the freelancer submits a delivery, the client normally has seven
            calendar days to accept it or raise a dispute. Yekis sends a warning
            before the automatic-release deadline. If the client does not act and
            no legal, security, or dispute hold applies, the milestone may be
            released automatically at the end of that window.
          </p>
          <p>
            A party may raise a dispute within the period allowed by the workspace.
            Raising a timely dispute pauses the automatic release while the dispute
            is handled. A client may also exercise the statutory seven-day
            cooling-off cancellation right where the contract has not begun and the
            applicable conditions in the workspace are met.
          </p>
        </>
      ),
    },
    {
      id: "fees-and-taxes",
      title: "Fees, taxes, and payment-provider charges",
      content: (
        <>
          <p>
            The fee shown before a transaction controls that transaction. The
            current Yekis model charges a seven percent platform fee from the
            freelancer&apos;s released milestone amount and no client deposit
            surcharge. A payment or disbursement provider may also charge its own
            fee, which is disclosed where applicable. See the{" "}
            <button
              type="button"
              className="legal-inline-link"
              onClick={() => onNavigate("fees")}
            >
              Fees page
            </button>{" "}
            for the current published rates.
          </p>
          <p>
            Yekis may change fees prospectively. A change does not apply
            retroactively to a contract or milestone that has already been funded.
            Yekis may deduct or withhold amounts required by law, including tax,
            anti-money-laundering, court, or regulator requirements, and will
            provide the information available to the user for the deduction.
            Users remain responsible for their own tax obligations.
          </p>
        </>
      ),
    },
    {
      id: "wallet-and-payouts",
      title: "Wallet, withdrawals, and recipient responsibility",
      content: (
        <>
          <p>
            Released milestone amounts are credited to the freelancer&apos;s Yekis
            wallet. To withdraw, the freelancer must satisfy the verification,
            compliance, and account conditions shown in the wallet and must approve
            the specific payout, including by SMS code where required. Yekis sends
            payouts through the configured payment provider and records each
            attempt, result, and fee.
          </p>
          <p>
            You must provide a valid payout destination that belongs to or is
            lawfully authorised for you. Check the destination and amount before
            approving a withdrawal. Yekis is not responsible for loss caused by
            false information, an unauthorised device, or a payment to a wrong
            destination that was confirmed by the account holder. A wallet is a
            marketplace balance, not a bank deposit account, and does not earn
            interest unless Yekis expressly states otherwise.
          </p>
        </>
      ),
    },
    {
      id: "disputes",
      title: "Dispute resolution",
      content: (
        <>
          <p>
            A dispute concerns a specific funded milestone or gig order. The
            process moves from negotiation to evidence, mediation, and, where
            needed, arbitration. Both parties must provide truthful information,
            preserve relevant evidence, respond within the stated deadlines, and
            accept the outcome of the process they selected.
          </p>
          <p>
            Yekis may review the contract, payment state, delivery, messages,
            files, and audit history and may release, refund, or divide the
            milestone. A staff resolution is recorded in the ledger and audit
            trail. If mediation does not resolve the matter, the signed agreement
            provides for arbitration in Addis Ababa under the applicable
            Arbitration and Conciliation Proclamation and the rules of the named
            arbitration institution, including AACCSA where the agreement says so.
          </p>
          <p>
            A user must not file a false claim, conceal material evidence, or
            attempt to use a dispute to avoid a genuine obligation. Fraud or
            collusion connected to a dispute may lead to account action and other
            remedies.
          </p>
        </>
      ),
    },
    {
      id: "reviews",
      title: "Reviews and reputation",
      content: (
        <>
          <p>
            Reviews and ratings reflect a counterparty&apos;s experience. They are
            not a guarantee by Yekis, a certification of quality, or permission to
            publish private information. Reviews must be accurate, relevant, and
            free from harassment, threats, discrimination, or content that
            violates these Terms.
          </p>
          <p>
            A review that appears to be false, abusive, or manipulated can be
            reported for review. Yekis may hide, correct, or remove a review
            where its terms or content rules require that action and will preserve
            the review history where a legal or audit obligation applies.
          </p>
        </>
      ),
    },
    {
      id: "intellectual-property",
      title: "Intellectual property and work ownership",
      content: (
        <>
          <p>
            Each party keeps the intellectual property it owned before the
            engagement. Except as the signed service agreement states otherwise,
            payment of a milestone releases to the client the agreed rights in the
            bespoke deliverables paid for under that milestone. Rights not paid
            for, source materials, tools, templates, know-how, and pre-existing
            intellectual property remain with their original owner.
          </p>
          <p>
            A freelancer may include portfolio or pre-existing material only with
            the client&apos;s permission. Yekis may use submitted deliverables and
            portfolio material to operate the service, including displaying a
            public preview where the user chooses to publish it. Yekis does not
            claim ownership of marketplace content merely by hosting it.
          </p>
        </>
      ),
    },
    {
      id: "confidentiality",
      title: "Confidentiality and privacy",
      content: (
        <>
          <p>
            Clients and freelancers must keep non-public information received
            through the service confidential and use it only to perform the
            engagement. These confidentiality duties do not apply to information
            that is public, already lawfully known without restriction, independently
            developed, or lawfully received from another source.
          </p>
          <p>
            Personal data is handled under the Privacy Policy. Users must not
            misuse another person&apos;s data, scrape personal information, contact
            users for unrelated marketing, or upload special-category data that
            the engagement does not require.
          </p>
        </>
      ),
    },
    {
      id: "communications",
      title: "Communications, notices, and support",
      content: (
        <>
          <p>
            Yekis may send account, security, verification, contract, payment,
            delivery, dispute, and legal notices by email, SMS, in-app
            notification, Telegram message, or another method appropriate to the
            service. Keep your contact details current so notices reach you.
          </p>
          <p>
            Support is available through the in-app help desk and the contact
            channels shown on the website. A dispute about work quality, money, or
            contract performance belongs in the relevant workspace dispute flow so
            that both parties and Yekis have the required record. General support
            will not make binding financial or dispute decisions outside that flow.
          </p>
        </>
      ),
    },
    {
      id: "suspension-and-termination",
      title: "Suspension, closure, and termination",
      content: (
        <>
          <p>
            You may close your account when there is no wallet balance, pending
            payout or top-up, active contract, or open dispute. Closure ends access
            and revokes sessions. You remain responsible for fees, disputes, and
            obligations that arose before closure.
          </p>
          <p>
            Yekis may limit or suspend access while investigating fraud, identity
            concerns, security events, payment anomalies, legal requests, or a
            material breach of these Terms. Yekis may terminate an account for
            serious or repeated breach, unlawful use, impersonation, abuse of the
            payment system, or where continued operation is not lawful or safe.
            Where the reason is not urgent, Yekis will normally give notice and an
            opportunity to respond.
          </p>
          <p>
            Suspension does not erase a transaction or release money contrary to
            the contract, dispute rules, or law. Records subject to retention
            duties remain as described in the Privacy Policy.
          </p>
        </>
      ),
    },
    {
      id: "warranties-and-liability",
      title: "Warranties, disclaimers, and liability",
      content: (
        <>
          <p>
            Yekis provides the service on an "as available" and "as
            is" basis to the extent permitted by law. Yekis does not warrant
            that the service will be uninterrupted, that every user is honest or
            qualified, that a dispute will reach a particular result, or that a
            third-party provider will always be available. Users are responsible
            for assessing whether another party, work, payment method, or
            transaction is suitable for them.
          </p>
          <p>
            To the fullest extent permitted by law, Yekis is not responsible for
            indirect or consequential loss, loss of profit, loss of business
            opportunity, or damage arising from another user&apos;s conduct. Yekis
            is also not responsible for losses caused by your failure to secure
            your account, provide accurate information, or follow the contract and
            dispute deadlines.
          </p>
          <p>
            Nothing in these Terms excludes or limits liability or rights that
            cannot lawfully be excluded or limited, including rights under consumer
            protection, anti-money-laundering, or other mandatory law. Any
            exclusion applies only to the extent it is legally effective.
          </p>
        </>
      ),
    },
    {
      id: "indemnity",
      title: "Indemnity",
      content: (
        <p>
          To the extent permitted by law, you agree to indemnify Yekis and its
          personnel against claims, losses, and reasonable costs arising from
          your material breach of these Terms, infringement of another person&apos;s
          rights, unlawful content or conduct, fraudulent information, or a
          misrepresentation about your identity or authority. Yekis will notify
          you of a covered claim where reasonably practicable and allow you to
          participate in its defence.
        </p>
      ),
    },
    {
      id: "changes",
      title: "Changes to these Terms",
      content: (
        <p>
          Yekis may update these Terms to reflect changes to the service, the
          marketplace, or the law. The effective date and version at the top of this
          page identify the current version. We will provide notice through the
          service, email, or another appropriate channel when a change materially
          affects an existing user. A new version applies prospectively from its
          effective date, except where the law or a signed agreement requires
          agreement to a specific change before it takes effect.
        </p>
      ),
    },
    {
      id: "governing-law",
      title: "Governing law and dispute forum",
      content: (
        <>
          <p>
            These Terms and the use of Yekis are governed by the laws of Ethiopia.
            A dispute between a marketplace user and Yekis that cannot be resolved
            through support may be brought before the competent courts of Addis
            Ababa, unless the parties agree to arbitration or another lawful
            forum. Nothing prevents a party from contacting a regulator or
            authority with lawful jurisdiction.
          </p>
          <p>
            A dispute between a client and freelancer follows the dispute process
            in the signed service agreement first. Arbitration does not remove any
            mandatory right to notify a regulator, financial-intelligence
            authority, or law-enforcement body.
          </p>
        </>
      ),
    },
    {
      id: "contact",
      title: "Contact",
      content: (
        <p>
          Yekis is based in Addis Ababa, Ethiopia. For account or marketplace
          support, email{" "}
          <a href="mailto:support@yekis.com">support@yekis.com</a>. For privacy
          questions, use <a href="mailto:privacy@yekis.com">privacy@yekis.com</a>.
          Use the in-app support desk for an issue that requires a recorded case or
          a reply tied to your account.
        </p>
      ),
    },
  ];

  return (
    <LegalDocumentPage
      eyebrow="Legal and trust"
      title="Terms of Service"
      summary="The rules that govern how clients, freelancers, and Yekis use the marketplace, enter agreements, fund milestones, resolve disputes, and protect the service."
      effectiveDate={EFFECTIVE_DATE}
      sections={sections}
      contactEmail="support@yekis.com"
      onNavigate={onNavigate}
    />
  );
}
