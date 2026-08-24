# Yekis- Master Design, Legal and Compliance Document

This document is the source of truth for product, legal, financial, compliance, and engineering decisions. When an item is marked DECIDED, other sections must not independently describe the same matter as unresolved. When an item is marked PENDING or TBD, implementation must not assume a final value or legal conclusion until the responsible owner records the decision.

*Master Design, Legal & Compliance Document — Consolidated Draft*

Table of Contents

# **PART I — PRODUCT & MARKET**

## 1.0 The Research Questions Driving This Project

## 2.0 How Contractual/Freelance Work Happens in Ethiopia Today

### 2.1 Hallmarks of genuine independence (vs. employment)

## 3.0 How the Platform Mediates Between Freelancers and Clients

### 3.1 Escrow Architecture Options

In-Platform Wallet (Internal Ledger)  
Bank Custodian (Segregated Accounts)  
Third-Party Escrow (Licensed PSP)

### 3.2 Escrow funds flow

## 4.0 Who Already Provides This Kind of Service

### 4.1 Marketplaces (product layer)

### 4.2 Payment Integration Options

Chapa  
Telebirr (Ethio Telecom)  
Commercial Bank of Ethiopia (CBE)  
Aggregator vs. Direct Integration

### 4.3 Architecture  Integration Comparison Matrix

### 4.4 Pros/Cons Summary by Architecture

In-Platform Wallet (Internal Ledger)  
Bank Custodian (Segregated Account)  
Third-Party Escrow (Licensed PSP)

### 4.5 Dispute-resolution institutions (legal layer)

## 5.0 Known Obstacles to Address

## 6.0 How to Outperform Existing Providers

## 7.0 Existing Systems to Draw Design Inspiration From

## 8.0 Business Model and Fees

### 8.1 Fee comparison

## 9.0 Launch Scope

### 9.1 Launch categories

# 

# **PART II — LEGAL & COMPLIANCE**

## 10.0 Legal and Regulatory Environment — Overview

### 10.1 Electronic Transactions Proclamation No. 1205/2020

### 10.2 Arbitration and Enforceability

### 10.3 Licensing and Financial Regulation

### 10.3.1 Platform Regulatory Classification

### 10.3.2 Payment-Service Licensing Boundary

### 10.3.3 Customer Funds, Custody and Escrow

### 10.3.4 Customer Funds vs. Platform Revenue

### 10.3.5 Float, Interest and Liquidity

### 10.3.6 Tax, Withholding and Financial Treatment

### 10.3.7 Approved Financial Partners and Their Roles

### 10.3.8 Payment Partner Validation & Architecture Decision Gate

## 11.0 KYC / AML Compliance Framework

### 11.1 Legal basis

### 11.2 Tiered KYC (with Fayda ID)

### 11.3 Hard-block workflow

### 11.4 Transaction monitoring & STR filing

### 11.5 Record retention

## 12.0 Data Protection (PDPP) Compliance Framework

### 12.1 Mandatory ECA registration

1\. Company registration certificate \+ TIN  
2\. Board resolution authorizing DPO appointment  
3\. DPO engagement letter / CV \+ independence declaration  
4\. ROPA (Register of Processing Activities) — all 6+ processing activities documented  
5\. Privacy Notice (Amharic \+ English) — live URL or draft  
6\. Data Processing Agreements with subprocessors (Chapa, cloud provider, Fayda)  
7\. Security measures summary (encryption, access control, breach response plan)  
8\. Cross-border transfer assessment (confirm none at launch; SCC template ready)  
9\. Application form \+ fee (\~ETB 10k–20k; confirm current amount)  
Week 1: Finalize ROPA, privacy notice, DPO engagement  
Week 2: Compile all documents, legal review  
Week 3: Submit application (ECA portal or physical)  
Week 4–8: ECA review (expect 1–2 rounds of questions; respond within 48h)  
Week 8–10: Receive registration certificate  
Week 10: Publish ECA registration number in privacy notice footer & onboarding

### 12.2 Consent and privacy notice

### 12.3 Data subject rights required user-facing tools

### 12.4 Data localization

### 12.5 Breach notification 72-hour protocol

### 12.6 Security by design

## 13.0 Integrated Compliance Architecture

## 14.0 Compliance Implementation Checklist

Phase 1 — Immediate (0–30 days): legal foundation  
Phase 2 — Short-term (30–90 days): technical build  
Phase 3 — Medium-term (90–180 days): operational maturity  
Phase 4 — Ongoing

## 15.0 Open Legal Questions for the Law Firm

Independent contractor status & misclassification  
Contract formation, scope, and deemed acceptance  
Payment, tax, and escrow  
IP and confidentiality  
Liability, indemnification, and termination  
Arbitration and electronic formalities  
Platform-specific  
Compliance-specific (from the KYC/AML/PDPP review)

## 16.0 Legal Sources & References

DPO Appointment & ECA Registration — Decision Log  
1\. Volume Assumptions & DPO Trigger Analysis  
2\. DPO Engagement Model Comparison

## 18.0 Master Freelance Service Agreement Clause by Clause

1\. Independent contractor status  
2\. Scope of work and deliverables  
3\. Schedule and milestones  
Sample Schedule B — milestone table  
4\. Revisions and scope creep  
5\. Payment terms and escrow  
6\. Tax withholding  
7\. Intellectual property  
8\. Confidentiality  
9\. Liability  
10\. Termination  
11\. Dispute resolution and arbitration  
12\. Independent contractor affirmation and platform role  
13\. Language and acceptance

# **PART IV — DISPUTE RESOLUTION**

Stage 0 — Prevention  
Stage 1 — Direct negotiation (days 0–7)  
Stage 2 — Evidence submission  
Stage 3 — Platform mediation (days 7–14)  
Stage 4 — Acceptance or arbitration (day 14+)  
Dispute-resolution method comparison

**PART V — TECHNICAL & OPERATIONS**

## 20.0 Payment Integration

Aggregator vs. direct integration

## 21.0 Technical & UX Implementation Checklist

## 22.0 Platform Governance & Trust

## 23.0 Go-to-Market and Launch Roadmap

Target customers  
Marketing  
Pilot launch  
Roadmap phases

## 24.0 Open Decisions for the Next Draft

# **PART I — PRODUCT & MARKET**

## 1.0 The Research Questions Driving This Project

Everything in this document is organized around answering these questions directly:

How freelancing work and hiring clients actually operate in Ethiopia today

How the platform can mediate so both sides have a smooth way of working

What institutions already provide freelancing/contractual-work services

The known obstacles in this space that need to be addressed

How to outperform existing companies offering similar services, and with what

Why building the system is not the finish line — a real existing problem has to be solved

The legal actions and lawsuit exposure that need to be addressed

Which existing programs/systems can inspire the design and solve the major issues

How the platform becomes competitive and profitable

What licensing path minimizes regulatory burden while enabling escrow?

How do withholding tax and VAT apply to freelancer payments and platform fees?

##   2.0 How Contractual/Freelance Work Happens in Ethiopia Today

Freelancers are not employees under Ethiopian law. Employees fall under the Labour Proclamation No. 1156/2019 (working hours, leave, severance, unfair-dismissal protection). Independent contractors instead fall under a “contract of services” governed by the Civil Code (Articles 2610–2631) and the Commercial Code — not an employment contract. No mandated leave, no severance, no labor-court protection by default.

Ethiopian courts apply a “substance over form” doctrine. Even a contract titled “Freelance Service Agreement” can be reclassified as employment if the freelancer works under the client's direct supervision, keeps fixed hours, or serves one client exclusively over a long period. Reclassification triggers retroactive back taxes, social security contributions, and penalties for the client.

In practice today, most freelance work happens informally: Telegram groups and bots (e.g. Afriwork's @freelanceethbot), personal referrals, and ad-hoc verbal or WhatsApp agreements. There is no standard written contract, no escrow, and no formal recourse when something goes wrong — the market runs on reputation and hope.A significant portion of the talent pool possesses the technical competence to produce excellent results, yet they often operate without the necessary professional framework for formal agreements.

##   2.1 Tax reality on the ground

Most freelancers operate entirely outside the tax system. Registering for a TIN, filing as a sole proprietor, or formalizing as a business is an extra step most informal freelancers never take — not out of evasion so much as the transaction simply never demands it. A Telegram-negotiated logo design or a WhatsApp-arranged translation job has no institutional touchpoint that would ever require one.

Clients rarely withhold tax in practice, even though the law requires it.

The Income Tax Proclamation's 3%/30% withholding obligation on service payments exists on paper, but an individual client or a small business paying a freelancer informally typically has neither the awareness that the obligation applies to them nor the administrative habit of withholding and remitting anything. In practice, the freelancer is simply paid the full agreed amount, and the tax question never enters the transaction at all.

Disputes resolve  or don't as personal conflicts, not legal ones. With no written contract, no independent record of what was agreed, and no accessible institution to appeal to, a disagreement over scope, quality, or payment plays out through social pressure: a mutual contact vouching for one side, a freelancer posting a warning in a community group, a client simply ghosting and moving on. There is no small-claims process anyone actually uses for a 5,000 ETB disagreement, and going to a mediator or lawyer costs more than most jobs are worth. The dispute doesn't get resolved so much as it gets absorbed as a bad experience.

Why this matters for the platform. These three facts aren't just background — they're the actual gap the product has to close, not merely a compliance box to check. If the platform requires a TIN at signup the way a bank might, it excludes the majority of the real freelancer population before it ever gets started; the tiered KYC design (Tier 1 with no TIN requirement, Tier 2 gating only withdrawal) exists specifically to onboard people as they are, not as the tax code assumes them to be. Withholding tax has to be something the platform does automatically at the moment of release — the same way the withholding-tax logic in Section 6 already works — because it will never happen if left to the client's discretion, exactly as it doesn't happen today. And the structured, evidence-backed dispute flow in Part IV isn't a nice-to-have layered on top of a working system — it's the direct fix for 'disputes become personal conflicts,' replacing social pressure and ghosting with a process someone actually has a reason to use because it's free, fast, and already sitting inside the same app they got paid through.

## 2.2 Hallmarks of genuine independence (vs. employment)

| Characteristic | Independent Contractor (Civil Code) | Employee (Labour Proclamation) |
| :---- | :---- | :---- |
| Control of work | Freelancer controls methods, timing, and location | Employer directs when, where, and how work is done |
| Tools & equipment | Freelancer provides own hardware and software | Employer provides tools and materials |
| Exclusivity | Non-exclusive; freelancer serves multiple clients | Typically exclusive to a single employer |
| Mandatory benefits | None; no mandated leave or severance | Entitled to leave, severance, and social security |
| Governing law | Civil Code and Commercial Code | Labour Proclamation No. 1156/2019 |
| Payment structure | Milestone-based or invoice-based | Salary or periodic wage |

## 

## 3.0 How the Platform Mediates Between Freelancers and Clients

A mediation layer needs four things working together — this is the actual product, not just “an app”:

Standardized digital contracts at the point of hire — an auto-generated Master Service Agreement (not an employment agreement) with scope, milestones, price, and revision terms, written to preserve independent-contractor status.

Escrow-based milestone payments — client funds are held at contract start, released per milestone on approval, refunded on validated non-delivery.

A structured dispute flow before anyone needs a lawyer — evidence submission → platform mediation → referral to arbitration only if unresolved.

A two-way accountability record — verified reviews, an on-time-payment score for clients, an on-time-delivery score for freelancers.

## 3.1 Escrow Architecture Options

| Architecture Option | Mechanism | Compliance Implication |
| :---- | :---- | :---- |
| In-Platform Wallet | Clients pay into platform-owned wallets via APIs like Telebirr. | High — Requires PSP licensing. |
| Bank Custodian Account | Funds are wired to a segregated bank account held by the platform. | Moderate — Simpler regulatory footprint. |
| Third-Party Escrow | Engage a licensed professional escrow or PSP provider. | Low — Offloads custody risk to partner. |

3.1.1 In-Platform Wallet (Internal Ledger)

Description: Marketplace holds funds in an internal ledger ("e-wallet") when clients pay, releasing to freelancers after work. Users deposit via a payment provider; platform credits their account and debits it for payout.  
Regulatory implication: potentially the highest regulatory burden because the platform itself would be involved in customer-fund custody/payment functions. See Section 10.3 for the legal determination.  
Compliance implication: enhanced KYC/AML, transaction monitoring, reconciliation, safeguarding, and reporting may apply depending on final regulatory classification.  
Operational implication: requires a robust internal ledger, reconciliation, safeguarding, security, and explicit treatment of customer-fund float.  
Settlement flows: client pays (via Chapa/Telebirr/CBE API) → funds enter platform account → platform credits client's wallet; later, platform initiates transfer (via bank or PSP) to freelancer's account and debits wallet. End-to-end audit trails required.  
Disputes/Refunds: Platform mediates disputes and refunds via payment provider's refund API. Card/wallet payments may have chargebacks/reversals (Chapa supports card disputes); wallet must temporarily hold funds until cleared. Fraud risk is moderate (platform risks embezzlement or hacking of internal ledger); strong security required.  
User UX: Mid friction. Users trust funds held by the marketplace only if the platform is reputable. Onboarding straightforward (just sign up). Payment/withdrawal speed depends on integration — often near-instant wallet credit, but payout may take hours/days (bank transfer time).  
Cost & Liquidity: High development and compliance costs (licensing, capital, KYC team). The platform needs liquidity to front payouts. Interest on floats typically goes to platforms or is prohibited. No per-transaction fees to third parties (unless using gateway for actual transfers). Scalability depends on  
system performance.  
Failure modes: technical bugs or insolvency could freeze all funds — risk is high.  
Contracts/Policies: Clear User Terms explaining wallet mechanism, Escrow Agreement outlining hold/release conditions, Arbitration Clause for final dispute resolution, internal KYC/AML policies. Effectively renders the marketplace a financial institution under NBE rules (compliance docs, audit rights, etc.).

3.1.2 Bank Custodian (Segregated Accounts)

Description: Clients pay into a bank account (or sub-accounts) held by the platform as custodian; funds are released from that account to freelancers. Platform never creates an internal ledger — instead maintains 1:1 mapping to client/freelancer transactions and instructs the bank to hold/release funds.  
Regulatory implication: may reduce direct custody risk if the bank is the lawful custodian, but licensing treatment must be confirmed for the exact structure. A written custody agreement is required.  
Operational Controls: Bank account(s) must be ring-fenced. The platform reconciles bank statements to customer transactions.  
Settlement: Client pays via chosen integration; funds swept into custodian account(s). When work is done, the platform instructs the bank to transfer to the freelancer's account. Reconciliation simpler (bank does ledger) but integration with bank systems (API or manual) required for speed.  
Liquidity & Interest: Custodial funds in bank, possibly earning interest (depending on agreement; ethically should go to clients or as contractually agreed). The platform needs predictable cash flow but less internal float management.  
Disputes/Chargebacks: Similar to internal wallet, but disputes may involve reversing transfers via the bank. Chargebacks (for card payments) still apply to incoming transactions (handled by gateway). If a dispute arises, the platform directs the bank to hold the disputed amount. Fraud risk is lower (bank holds funds), though platform risks miscommunication or bank errors.  
UX: Trust higher (bank escrow is familiar). Onboarding is similar. Fund transfers to freelancers may be slower if reliant on bank processing (but can use instant transfer rails if supported).  
Cost & Scalability: Requires banking fees (account maintenance, transaction charges). Implementation complexity moderate (bank APIs or manual transfer). Scalability depends on the bank's system.  
Failure modes: banking downtime or wrong account details.

3.1.3 Third-Party Escrow (Licensed PSP)

Description: Marketplace partners with a licensed payment/escrow provider (e.g., a fintech or bank API) that holds and disburses funds. Marketplace never directly controls funds. Example: a provider like ShegerPay verifies Telebirr/CBE transfers without custody, or an escrow service holds payments until release.  
Regulatory implication: potentially the lowest direct custody burden if the licensed provider lawfully holds/settles the funds, but the partner's exact licensed scope and the platform's residual obligations must be confirmed in writing.  
Operational Controls: Less internal work: PSP's API/portal manages transactions. Settlement: Client pays via third party (e.g., Telebirr to merchant wallet, or Chapa to account); PSP notifies marketplace (webhook/API); later, marketplace tells PSP to release funds to freelancer (or PSP auto-releases on confirmation). Reconciliation handled by PSP (provides transaction logs and webhooks). Liquidity needs minimal since PSP maintains float.  
Disputes: PSPs usually support refunds or holds (subject to their policies). Chapa has a refund API; Telebirr/CBE via ShegerPay relies on verification (if wrong reference, no payment seen). Marketplace must follow PSP's dispute process. Fraud risk shifts to PSP (non-custodial means less internal risk).  
UX: Potentially higher trust if PSP is well-known. Onboarding may require customers to use that PSP (e.g., new Telebirr short code or checkout widget). Payment/withdrawal speeds depend on PSP's rails (often near-instant if wallet-to-wallet).  
Cost & Scalability: Usually per-transaction fees (often higher than straight bank transfer). Implementation is easier (integrate PSP API/SDK) and scaling managed by PSP. Failure modes: PSP outages, API/fee changes.

3.2 Escrow Funds Flow

Phase 1 — Client Wallet Top-Up (Before Any Work) The client must first load their in-platform wallet with real ETB. They transfer funds externally via Telebirr, Chapa, or CBE Birr, then submit a top-up request with a receipt image and sender reference. A staff member reviews and approves it — wallet balance is never credited automatically. This step is always human-gated.

Phase 2 — Contract Signing (Trust Lock) Both the client and freelancer must digitally sign the contract before any money moves. The moment the second signature is recorded, the platform automatically funds all milestones from the client's wallet in a single atomic transaction. If the wallet balance is insufficient at that moment, the client receives a notification to top up and must fund manually.

Phase 3 — Escrow Holding (Funds Locked) When a milestone is funded, the client is charged the gross milestone amount \+ a 5% platform fee add-on. This is atomically deducted from their wallet and the milestone is marked ESCROW\_HELD. The freelancer is notified they can begin work.

Phase 4 — Work Delivery & Review Window The freelancer submits work; the milestone moves to SUBMITTED\_FOR\_REVIEW. Two timed jobs are queued: a 24-hour warning to the client before the deadline, and an auto-release that fires on expiry. The client either accepts (releases funds immediately) or raises a dispute (freezes escrow and cancels both timers).

Phase 5 — Release & Fee Split On acceptance (by the client or by auto-release timer), funds are released atomically: the milestone is marked RELEASED, and the freelancer's wallet receives the net amount — gross minus a 5% platform fee, minus withholding tax (3% with a TIN, 30% without, only applied on milestones ≥ ETB 10,000). The platform's commission and withholding tax never separately land anywhere — they are simply not credited to the freelancer, kept in the platform's own ledger. When every milestone on a contract reaches a terminal state (RELEASED, REFUNDED, or PARTIAL\_REFUND), the contract is automatically marked COMPLETED.

Phase 5b — Dispute Path If either party raises a dispute, escrow is frozen and auto-release is cancelled. A mediator resolves it with one of three outcomes: full release to freelancer, full refund to client's wallet, or a partial split of both.

Phase 6 — Freelancer Withdrawal The freelancer requests a payout to their Telebirr/CBE account. This requires Tier 2 KYC. A mismatched payout destination (not matching KYC identity) is a hard block held for compliance review; suspicious rapid pass-through patterns are soft-flagged for staff but not blocked. (Note: the live payout SDK is not yet connected — balances are debited internally but no real external transfer fires in the current build.)

3.3 Payment Partner Validation & Architecture Decision Gate  
Before implementing client balances, escrow, deposits, withdrawals, or automated release logic, the platform must validate the actual capabilities and legal role of the financial institution or licensed payment partner that will hold, safeguard, process, or settle customer funds. The platform should not assume that an API for accepting payments also provides a legally approved escrow or hold-and-release service. This section is a mandatory pre-engineering decision gate. It converts the proposed milestone \+ escrow \+ invoice model into a payment architecture that is technically possible, contractually supported, and legally approved for the intended Ethiopian operating model.

3A.1 Core Architecture Principle

The marketplace should remain the business-logic and transaction-orchestration layer: contracts, milestones, invoices, approvals, disputes, ledger presentation, audit records, and release instructions. The regulated financial partner should perform the regulated payment, custody, safeguarding, settlement, and payout functions that it is licensed and contractually authorized to perform. The platform database is not the money. A user balance shown in the application is an accounting representation backed by verified external funds. Every deposit, escrow hold, release, refund, fee, and withdrawal must have a corresponding external transaction or approved custody position and a complete internal ledger record.  
3A.2 Partner Validation Matrix  
The following matrix must be completed with written responses from each prospective partner. A general payment API is not sufficient evidence that escrow or conditional release is supported.

| Partner | Licensed Role | Hold/ Safeguard Funds? | Conditional Release? | Deposit API | Payout API | Written Conf. |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| Telebirr | PII — verify scope | TBD | TBD | TBD | TBD | Required |
| CBE / Bank | Bank — verify structure | TBD | TBD | TBD | TBD | Required |
| Dashen / Bank | Bank — verify structure | TBD | TBD | TBD | TBD | Required |
| M-PESA Ethiopia | PII — verify scope | TBD | TBD | TBD | TBD | Required |
| Other PII | Verify NBE license | TBD | TBD | TBD | TBD | Required |
| Other PSO/PSP | Verify NBE license | Do not assume custody | TBD | TBD | TBD | Required |

3A.3 Questions for Telebirr / PII Partners  
Can the platform collect money from a verified client and associate it with a specific contract and milestone?  
Can funds remain held or safeguarded pending a contractual milestone release condition?  
Can the partner support conditional release to a different verified beneficiary, such as a freelancer?  
Can release be instructed through an API, or must it be performed manually?  
Can the partner support full and partial refunds to the original payer?  
Can funds remain frozen while a contract dispute is under review?  
Are transaction-status webhooks provided for payments, failures, reversals, refunds, and payouts?  
What are settlement times, transaction limits, fees, KYC requirements, and reconciliation/reporting capabilities?  
What agreement, approval, license, or additional authorization does the marketplace need?  
Can the partner confirm in writing that the proposed marketplace flow is permitted under its licensed service and product terms?

3A.4 Questions for Commercial Banks

Can the bank establish a legally appropriate customer-funds, trust, segregated, settlement, or escrow structure?  
Who legally owns the funds while held?  
Can funds belonging to different clients/projects be accounted for separately?  
Can deposits and payouts be supported by API, SFTP, bulk file, or controlled portal workflows?  
Can funds remain frozen during disputes, with full or partial release/refund after resolution?  
What KYC/AML, reporting, reconciliation, audit, fees, limits, and contractual requirements apply?  
Can the bank provide written confirmation of the proposed custody/escrow structure and the platform's responsibilities?

3A.5 Architecture Decision Matrix  
Score each option only after written partner responses and legal review. The preferred MVP is the option that supports the complete business flow with the lowest regulatory and custody risk.

| Criterion | Weight | Platform Custody | Bank Custodian / Escrow | Licensed PII / PSP |
| :---- | :---- | :---- | :---- | :---- |
| Regulatory feasibility | 25% | High risk until approved | Validate | Validate |
| Custody / safeguarding | 20% | Platform responsibility | Bank responsibility | Partner responsibility |
| Escrow hold/release | 15% | Technically controllable | Must be confirmed | Must be confirmed |
| API capability | 10% | Full control | Depends on bank | Depends on partner |
| MVP speed | 10% | Low risk unless licensed | Medium | Potentially fastest |
| Operational complexity | 10% | High | Medium | Lower for platform |
| Cost | 5% | High compliance burden | Bank/escrow fees | Partner fees |
| Scalability | 5% | High technical control | High | High if limits permit |

### 3A.6 Mandatory Decision Rule

Do not build a simulated escrow by depositing customer money into the platform's normal operating account and maintaining virtual balances. If no provider can legally and technically support conditional escrow release, redesign the custody and settlement structure with the bank/PII and legal advisers.

### 3A.7 Dispute and Money-Freeze Requirements

The selected architecture must identify exactly where disputed funds remain, who can move them, the dispute timeline, required evidence, final decision authority, and the treatment of full release, full refund, and partial allocation. The partner agreement must also address what happens if a freelancer has already withdrawn funds before a dispute is raised.

### 3A.8 Platform Fee Flow

Platform fees must be separate ledger entries from customer funds. Example: ETB 20,000 milestone; ETB 2,000 platform fee; ETB 18,000 freelancer proceeds, subject to final contract and tax treatment. The platform revenue account must remain logically and legally separate from customer funds.

### 3A.9 MVP Operational Model

The first release should support manual fallbacks: one primary payment partner, fixed-price milestone contracts, manual early withdrawal approval, daily reconciliation, manual dispute/refund handling, complete audit logging, and API automation after the process is proven.

### 3A.10 Engineering Requirements

The financial domain model should include accounts, ledger transactions and entries, payment intents, external references, escrow holds, invoices, releases, withdrawals, refunds, disputes, fees, settlements, and reconciliation records. Every external callback must be idempotent. Manual adjustments require requester, approver, reason, before/after values, external reference, timestamp, and audit record.

### 3A.11 Pre-Launch Approval Checklist

Written confirmation from the selected bank/PII/PSP covering collection, custody/holding, release, refund, and payout.  
Written legal/regulatory assessment of the platform's role and required approvals.  
Executed commercial and technical partner agreement.  
Confirmed KYC/AML and data-sharing responsibilities.  
Confirmed fees, settlement times, limits, and refund rules.  
Confirmed dispute freeze/release process.  
Completed ledger, state-machine, and reconciliation design.  
Completed security, access-control, audit, backup, and incident-response design.  
Successful sandbox and end-to-end test transactions.  
Tested manual fallback procedures.

### 3A.12 Final Decision Principle

The payment partner should be selected based on its ability to support the real money lifecycle, not merely because it has an easy API. The required lifecycle is: Client funding → verified payment → safeguarding/holding → contract/milestone allocation → work submission → acceptance or dispute → release/refund → freelancer settlement → withdrawal → reconciliation. Once a partner confirms this lifecycle in writing, the detailed Milestone \+ Escrow \+ Invoice Payment Model that follows becomes the product and engineering specification.

### 3A.13 Integrated Milestone \+ Escrow \+ Invoice Payment Model

The platform should treat milestone definition, escrow funding, and invoicing as three connected layers of one payment system. A milestone defines what must be delivered; escrow protects the money while the work is being performed; and the invoice creates the formal financial record for the amount being funded, released, refunded, or otherwise settled. These mechanisms should operate  
inside the same contract and transaction record rather than as separate processes.

### 3A.13.1 The Role of Each Component

Milestones are the project-control layer. Each project is divided into clearly defined deliverables, target dates, acceptance criteria, payment amounts, and release conditions. A milestone should be specific enough that both parties can determine objectively whether it has been completed.  
Escrow is the payment-protection layer. The client commits the agreed funds before the corresponding work begins, and the funds remain held until the contractual release condition occurs. Release may follow client approval, deemed acceptance after the review period, or a dispute-resolution outcome. Funds should not be treated as the freelancer's earned income until the contractual release event occurs.  
Invoices are the financial-documentation layer. An invoice should identify the client, freelancer, contract, milestone, deliverable, amount, applicable platform fee, tax/withholding treatment where applicable, payment status, issue date, due/funding date, and transaction reference. The invoice is a record/request for payment; it is not itself the escrow account or the release mechanism.

### 3A.13.2 Recommended End-to-End Workflow

1\. Contract creation — The client and freelancer agree on the scope, total project price, milestones, deadlines, acceptance criteria, revision rules, dispute rules, and payment terms. The platform generates the Master Freelance Service Agreement and Schedule B milestone table.  
2\. Milestone definition — Each milestone receives a unique ID and specifies its deliverable, amount, target date, review period, acceptance criteria, and escrow release trigger.  
3\. Invoice generation — The platform generates a milestone invoice/payment request linked directly to the contract and milestone. The invoice shows the gross milestone amount and any separately disclosed platform/payment charges and tax treatment.  
4\. Client funding — The client pays the amount required to fund the milestone through the approved payment rail. The payment provider confirms the transaction, and the platform records the payment against the invoice and escrow transaction.  
5\. Escrow confirmation — Once the required funds are confirmed and held under the approved custody/escrow structure, the milestone becomes ESCROW\_HELD. The freelancer is notified that work may begin.  
6\. Work and submission — The freelancer performs the work and submits the agreed deliverable through the platform. The milestone becomes SUBMITTED\_FOR\_REVIEW and the review clock starts.  
7\. Client review — The client may accept the milestone, request permitted revisions, or raise a dispute. Requests outside the original scope should trigger the scope-change process rather than indefinite revision cycles.  
8\. Acceptance and release — When the client accepts, the platform records acceptance and instructs the approved escrow/custody mechanism to release the milestone funds. If the client does not respond within the agreed review period, deemed acceptance/auto-release may occur where legally enforceable and contractually agreed.  
9\. Settlement and receipt — At release, the platform calculates the freelancer's net amount after any contractually disclosed platform fees and legally required withholding. The invoice is marked PAID/SETTLED, a payment receipt is generated, and the transaction is written to the immutable audit trail.  
10\. Dispute path — If either party disputes the milestone before release, escrow remains frozen, automatic release is cancelled, and the dispute process begins. The final outcome may be full release, full refund, or a partial allocation, with the invoice and escrow records updated to match the outcome.  
11\. Project completion — When all milestones reach a terminal state such as RELEASED, REFUNDED, or PARTIAL\_REFUND, the contract is marked completed and the platform generates the final project-level financial summary.

### 3A.13.3 Recommended State Model

The payment system should use explicit, auditable states rather than relying on a single 'paid/unpaid' field.

| State | Meaning | Allowed Next States |
| :---- | :---- | :---- |
| INVOICE\_DRAFT | A milestone invoice is being prepared. | INVOICE\_ISSUED/ CANCELLED |
| INVOICE\_ISSUED | Payment request is issued to the client. | PAYMENT\_PENDING/ CANCELLED |
| PAYMENT\_PENDING | Payment has been initiated but not confirmed. | ESCROW\_HELD/ PAYMENT\_FAILED |
| ESCROW\_HELD | Funds are confirmed and held pending delivery/acceptance. | SUBMITTED\_FOR\_REVIEW/ REFUNDED / DISPUTED |
| SUBMITTED\_FOR\_REVIEW | Freelancer has submitted the milestone. | ACCEPTED/ REVISION\_REQUESTED/ DISPUTED/ AUTO\_RELEASED |
| REVISION\_REQUESTED | Client requests changes within agreed scope. | SUBMITTED\_FOR\_REVIEW/ DISPUTED |
| ACCEPTED | Client has accepted the milestone. | RELEASE\_PENDING/ RELEASED |
| RELEASED | Escrow funds have been released and settlement recorded. | WITHDRAWAL\_PENDING/ SETTLED |
| DISPUTED | The escrow is frozen while the dispute is resolved. | RELEASED/REFUNDED/ PARTIAL\_REFUND |
| REFUNDED | Funds are returned to the client according to the applicable refund outcome. | CLOSED |
| PARTIAL\_REFUND | The dispute outcome allocates part to the freelancer and part back to the client. | CLOSED |

### 3A.13.4 Invoice Design

Each invoice should be permanently linked to a contract and, where applicable, a single milestone. At minimum it should contain: invoice number; contract ID; milestone ID; client and freelancer identities; service description; deliverable; gross milestone amount; platform fee; payment-processing/escrow fee if applicable; withholding-tax treatment; net freelancer amount; currency; issue date; funding deadline; review/acceptance status; payment status; transaction/reference ID; refund or dispute status; and links to the relevant contract and delivery record. The invoice should not imply that the freelancer has been paid merely because the invoice was issued. The system should distinguish clearly between Invoice Issued, Funded/Escrow Held, Released, Settled, Refunded, and Disputed.

### 3A.13.5 Funding Models Within the Same Framework

The same milestone \+ escrow \+ invoice model can support different commercial arrangements. For fixed-price work, each milestone has a fixed amount. For recurring or time-based services, the platform can generate invoices for an agreed billing period while still applying an escrow or pre-funding rule where appropriate. For larger projects, the client may fund all milestones upfront, as contemplated elsewhere in this document, while the platform releases them progressively. Alternatively, subject to the final legal and custody structure, the client may fund milestones one at a time. The platform should not mix these models invisibly. The contract must state whether the full project amount is funded at contract start or whether each milestone is separately funded, and  
The user interface and invoice must reflect the same rule.

### 3A.13.6 Example — ETB 100,000 Website Project

A client hires a freelancer for ETB 100,000. The contract contains four milestones: Milestone 1 — UI/UX design, ETB 20,000; Milestone 2 — frontend, ETB 30,000; Milestone 3 — backend, ETB 30,000; Milestone 4 — testing and deployment, ETB 20,000. For Milestone 1, the platform creates Invoice INV-001 for ETB 20,000. The client funds the required amount through the approved payment rail. The payment is confirmed and the funds are placed/recorded as escrow-held. The freelancer completes the UI/UX work and submits it. The client accepts it. The platform records the acceptance, releases the escrowed amount according to the custody arrangement, calculates any applicable platform fee and withholding, marks the invoice as settled, issues a receipt, and opens/funds the next milestone according to the contract. If the client disputes Milestone 1, the ETB 20,000 remains frozen while the dispute process operates. If the mediator determines that the freelancer is entitled to the full amount, the escrow is released and the invoice is settled. If the work was not delivered, the funds may be refunded according to the contract and escrow rules. If the outcome is partial, the invoice and transaction record reflect the partial release and refund.

### 3A.13.7 Why the Combined Model Matters

The combined model closes the trust gap identified in the Ethiopian market research. Informal freelance work commonly lacks a standard written contract, escrow, and formal recourse. The platform's value proposition is therefore not simply listing jobs; it is creating a controlled transaction from agreement to delivery to payment or refund. For clients, the model means money is committed to a defined project and protected while deliverables are reviewed. For freelancers, it means the payment is secured before work begins and is released according to objective milestones rather than relying on a client's informal promise to pay. For the platform, it creates a traceable contract, invoice, escrow, delivery, approval, dispute, and settlement record.

### 3A.13.8 Disputes, Refunds, and Auto-Release

The payment system must be designed so a dispute immediately freezes the relevant escrow amount and prevents automatic release. The existing dispute architecture in this document should remain the governing process: prevention through clear scope and acceptance criteria; direct negotiation; evidence submission; platform mediation; and arbitration where the dispute remains unresolved. Auto-release should only operate where the contract and applicable law permit deemed acceptance. The review period, warning notifications, evidence requirements, and exceptions should be explicit. A client should not be able to avoid payment simply by becoming inactive, and a freelancer should not receive funds automatically where a valid dispute was raised within the review window.

### 3A.13.9 Tax and Fee Treatment

The invoice and settlement record should separate the project's gross value from the platform's revenue and any legally required withholding. The system should not obscure these amounts inside a single 'net payment' number. At release, the platform should calculate the applicable deductions according to the final tax advice and contract terms, show them to the relevant parties, and retain the supporting transaction record. The document's existing proposal for a transaction take-rate and a possible payment/escrow processing fee should be treated as the commercial model, not as a substitute for legal/tax confirmation. Final withholding rates, thresholds, VAT treatment, and the platform's status as withholding agent must be confirmed by Ethiopian counsel and the relevant authorities before launch.

### 3A.13.10 Custody and Regulatory Boundary

The marketplace should keep the payment-document layer separate from the custody layer. The platform can generate invoices, maintain contract and milestone records, calculate release instructions, and maintain an auditable transaction ledger; however, the legal entity that actually holds customer money must be determined by the final escrow architecture. The current document identifies three architecture options: an in-platform wallet/internal ledger, a bank custodian/segregated account, and a third-party licensed PSP/escrow provider. The third-party licensed PSP model has the lowest stated regulatory burden because custody is handled by the licensed partner, while an internal wallet creates materially greater licensing, capital, KYC/AML, custody, reconciliation, and operational obligations. The final architecture must be confirmed with NBE/regulatory counsel before implementation.

### 3A.13.11 Audit and Accounting Requirements

Every financial event should generate an immutable audit record: invoice creation; invoice modification; payment initiation; payment confirmation; escrow funding; milestone submission; acceptance; revision request; dispute opening; dispute resolution; release; refund; fee assessment; tax withholding; withdrawal request; payout; and reversal. Each event should carry a timestamp, actor, contract ID, milestone ID, invoice ID, transaction/reference ID, amount, currency, and resulting state. The platform should maintain separate logical balances for client funds held for projects, amounts attributable to released freelancer earnings, platform fees, refunds, and tax/withholding amounts. Reconciliation should be performed against the external PSP or bank/custodian records. No UI balance should be treated as proof of actual external funds without reconciliation.

### 3A.13.12 User Experience

The client should see a single payment timeline: Contract Signed → Invoice Issued → Funded → Escrow Held → Freelancer Working → Submitted → Under Review → Released/Refunded/Disputed. The freelancer should see the same milestone timeline with the amount expected, amount secured, amount released, and amount available for withdrawal. The invoice should be accessible from the contract and milestone pages, while the escrow status should be visible without requiring the user to understand the underlying banking or PSP architecture. The system should use plain-language statuses such as 'Money Secured,' 'Work Submitted,' 'Waiting for Your Review,' and 'Payment Released,' while retaining precise internal states for audit and operations.

### 3A.13.13 Recommended Product Rule

For the launch model, every paid project should have: (1) a digitally accepted freelance service agreement; (2) one or more clearly defined milestones; (3) a milestone-linked invoice/payment record; (4) confirmed funding before the corresponding work begins; (5) escrow/custody protection under the legally approved architecture; (6) a defined review and acceptance window; (7) a dispute freeze mechanism; (8) automatic settlement and receipt generation after release; and (9) a complete audit trail. This creates the platform's core trust loop: Agree → Invoice → Fund → Secure → Work → Submit → Review → Release or Dispute → Settle. The objective is that a client can obtain a delivered result or an appropriate refund, while a freelancer can see that the agreed payment is secured before doing the work.

### 3A.13.14 Required Supporting Documents and Policies

The combined model should be supported by the documents already identified in this Master Design: Platform Terms of Service; Master Freelance Service Agreement; Escrow Agreement; Dispute Resolution Policy; Arbitration Clause; KYC/AML Policy; Funds Custody Agreement if a bank is used; and SLA with payment partners. The invoice terms, escrow release rules, milestone acceptance rules, refund rules, and dispute freeze rules should be consistent across these documents.

## 4.0 Who Already Provides This Kind of Service

### 4.1 Marketplaces (product layer)

Global: Upwork, Fiverr, Freelancer.com, Truelancer — mature escrow and reputation systems, but not built for Ethiopian payment rails or local legal context.

Aezop (by Alyah Technologies) — founded to fix the trust deficit and “digital glass ceiling” African freelancers face on global platforms.

Afriwork — large Telegram-driven job/freelance board, huge reach, but purely a listings channel with no escrow or contracts.

Jobbers.io — commission-free positioning, still thin on Ethiopia-specific payment integration.

### 4.2 Payment Integration Options

### 4.2.1 Chapa

Overview: Chapa is Ethiopia's leading domestic payment gateway, offering an API/SDK and hosted checkout. It enables payments via Telebirr, CBE Birr, Amole, local bank transfers, etc.  
Integration Methods: Chapa provides a REST API (e.g., POST https://api.chapa.co/v1/transaction/initialize) and SDKs in several languages.  
Supports standard checkout (hosted UI) and Direct Charge API for custom flows. Webhooks (e.g., /v1/transaction/verify) notify on payment success. Sandbox/test mode available.  
Supported Rails: Telebirr (mobile money, 1–75,000 ETB per tx), CBE Birr (wallet, 1–150,000 ETB), and various bank channels (CBE Bank Transfer up to \~10M ETB, Awash Bank, Enat Bank, etc.). Also supports Visa/Mastercard via Flutterwave (for cross-border) and mobile wallets like Amole.  
Settlement & Fees: Settlements within \~1–3 hours (often same-day). Fees per-transaction (around 2% quoted by third parties). Exact rates may vary by method (Telebirr, card, etc.). Chapa remits funds to the merchant's designated bank or wallet after collecting multiple transactions.  
Dispute/Refund: Chapa supports issuing refunds via its API. Cardholders can dispute charges (Chapa provides dispute response guidance). For Telebirr/CBE payments, no chargeback from mobile money; the platform must handle disputes manually. Chapa marks failed/refunded transactions accordingly.  
Documentation: Official docs at developer.chapa.co provide full API specs (Accept/Verify/Refund transactions, Virtual Accounts for wallet-like features, etc.). SDKs and webhooks supported.

### 4.2.2 Telebirr (Ethio Telecom)

Overview: Telebirr is state-owned Ethio Telecom's mobile money service. Tens of millions of users (34.3M subscribers as of 2023, targeting \~44M by FY2024). Vast agent network (planned 124k agents). Telebirr is a payment instrument issuer regulated by NBE's mobile money directive.  
Integration Methods: Ethio Telecom provides a merchant API (via developer portal) for Telebirr payments. Flow: customer sends money from Telebirr app or USSD (\*127\#) to the merchant's Telebirr number/short code; merchant verifies payment. customer initiates Telebirr payment → Telebirr immediately credits merchant's Telebirr wallet with reference code → platform calls /verify with that reference to confirm. No funds held by verifier — Telebirr settles instantly to the merchant's wallet and issues transaction ID.  
Supported Rails: Purely Telebirr wallet (app or USSD, plus agent-assisted cash-in). Every Ethio subscriber can use it once registered. Account tiers with limits: daily balance up to 75,000 ETB and daily transactions up to 150,000 ETB (per NBE directive). Chapa also exposes Telebirr with 75k max.  
Settlement & Fees: Payments essentially immediate to the merchant's Telebirr account (Telebirr "settles the transfer directly"). Funds can be pulled to the bank or spent from a wallet. Ethio Telecom tariff varies by range but generally small % or fixed fee. Settlement to the bank may take hours if using "Birr to bank" transfer.  
Dispute/Refund: No automatic chargeback; incorrect payments handled manually (merchant refunds by sending Telebirr back). The platform must ask Ethio Telecom for reversals. Chapa's Telebirr integration would be custodial (taking payment first, then crediting wallet); direct integration is non-custodial. For disputes, the marketplace needs a policy (e.g., refunding after review).  
Constraints: Must register as merchant/agent with Ethio Telecom and comply with telecom regulations. No public sandbox. KYC handled Ethio Telecom's customer verification. Must deal with Telebirr's limits (max 75k per tx, \~150k/day). Connectivity (USSD/SMS or app) required.  
Documentation: Ethio Telecom developer portal (private) provides integration docs. Insights from ShegerPay's guide note Telebirr's "massive user base" and official API. Developers often rely on sample code (GitHub Telebirr libraries) and Telebirr merchant support.

### 4.2.3 Commercial Bank of Ethiopia (CBE)

Overview: CBE is Ethiopia's largest bank (state-owned) with deepest branch and agent network. Operates traditional accounts plus mobile wallet "CBE Birr".  
Integration Methods: CBE offers a proprietary "CBE Birr API" for merchants to receive payments directly into their CBE account. Without public API, a common method is reference-based verification: platform provides user an FT (fund transfer) reference; user transfers from CBE Mobile/ATM/branch to merchant's account and shares FT number; platform verifies via CBE's system. Example  
customer transfers funds (via any CBE channel) to merchant → CBE issues FT reference → platform API call verifies amount and credit. Non-custodial (funds go straight to merchant).  
Supported Rails: CBE Mobile Banking, ATMs, Internet banking, or branch transfers into merchant's CBE account. Also CBE Birr (mobile wallet) using the same FT reference system. Chapa's "CBE Bank Transfer" supports up to 9,999,999 ETB per tx, and "CBEBirr" (wallet) up to 150k. Essentially any CBE-to-CBE payment can be integrated.  
Settlement & Fees: Bank transfers settle in real time on CBE core. As soon as the customer completes the transfer, funds are in the merchant account ("settles directly"). The platform detects this and confirms it to the client.  
Fees are typical bank fees (negligible for mobile transfers). For CBE Birr, Telebirr-like mobile money tariffs apply.  
Dispute/Refund: No card-style reversals. Mistaken transfers must be manually refunded via bank. The platform should encourage customers to double-check details, and may refund via new transfer if needed. Chaps or verification APIs (like ShegerPay) do not hold funds, so the marketplace must use its own account to send refunds.  
Documentation: CBE's merchant integration docs are not publicly available; enterprises often establish direct relationships. ShegerPay blog confirms official CBE Birr API exists. Developers commonly use utility tools (CBE's own app or banking integration).  
Aggregator vs. Direct Integration  
Using Chapa as an aggregator covers Telebirr, CBE Birr, cards, and bank transfer behind one API  
the fastest path to launch. Chapa handles the telecom/bank relationships, KYC onboarding, and settlement reconciliation.  
If not using an aggregator, two separate tracks are needed: (1) Telebirr via direct API integration (merchant ID, callback URL, redirect flow), and (2) CBE via direct bank transfers into a Bank Custodian Account held in the platform's name, pending a formal CBE API path.  
Either way, gateways only process payment; they don't provide escrow logic. The backend must independently track deposited funds through three explicit stages:  
Payment Pending → Escrow Held → Released / Refunded.  
On the frontend: a clear UI lets the client choose a payment method (Telebirr Pay, QR code, or CBE bank transfer) at contract start; once funds are deposited, the system marks the project Funded and work can begin.

### 4.3 Architecture  Integration Comparison Matrix

### 4.4 Pros/Cons Summary by Architecture

| Architecture | Pros | Cons |
| :---- | :---- | :---- |
| In-Platform Wallet (Internal Ledger) | Full control over flow; flexible (custom rules, escrow logic); No reliance on third-party holding | Highest legal risk (requires NBE license, heavy compliance); Large engineering and capital burden; Potentially slower payouts; Must manage float and fraud risk; Moderate user trust |
| Bank Custodian (Segregated Account) | Easier trust (bank escrow); Less developer work (bank does accounting); Possibly avoids heavy licensing if structured correctly; Good UX and scalability (bank-grade) | Licensing ambiguity remains; Complexity in bank integrations; Bank fees apply; Releasing funds dependent on bank processes; Lower flexibility for split payments |
| Third-Party Escrow (Licensed PSP) | Lowest regulatory burden (PSP handles licensing/custody); Quick implementation using APIs/SDKs; Good scalability (PSP infrastructure); Dispute/refund support often built-in | Higher per-transaction costs (2%+ and/or monthly fees); Dependence on third party's uptime and policies; Possible onboarding friction (users pay via specific PSP) |

### 4.5 Dispute-resolution institutions (legal layer)

ECCSA (Ethiopian Chamber of Commerce and Sectoral Associations) — runs a Legal & Arbitration department with an established arbitration center.

AACCSA (Addis Ababa Chamber of Commerce) — its own arbitration institute; awards enforceable abroad since Ethiopia's New York Convention accession.

EACC (Ethiopian Arbitration and Conciliation Centre) — nonprofit ADR body founded 2004\.

Ordinary courts — commercial benches for contract disputes; separate labor courts if a relationship is reclassified as employment.

## 5.0 Known Obstacles to Address

Trust deficit in both directions — no existing local platform solves this structurally.

Payment fragmentation — Chapa gives you the rails, not the escrow logic; that has to be built.

Cross-border payment / forex control — a regulatory obstacle if diaspora/foreign-client support is ever activated.

Misclassification risk — badly written contracts could expose clients, and by extension the platform, to being treated as an employer.

Arbitrability limits — commercial/contract disputes are arbitrable; disputes recharacterized as employment fall under labor-court jurisdiction instead.

Informal sector / tax registration — requiring formal business registration at signup risks excluding most of the real supply side.

Skill verification — no low-cost, credible way to verify competence beyond a portfolio.

Bandwidth/data cost sensitivity — a large share of target users are Telegram-first; a heavy web-only app will lose them.

Language — English-only excludes a large pool of capable Amharic-speaking freelancers and clients.

## 6.0 How to Outperform Existing Providers

| Competitor Weakness | Our Counter Strategy |
| :---- | :---- |
| Global platforms: no local payment rails, high fees in birr terms. | Native Chapa integration and lower effective take-rate. |
| Telegram groups: no escrow, zero identity verification. | Escrow, auto-generated contracts, and Fayda ID verification. |
| Aezop: Still building trust infrastructure. | Fast-track legal and payment integration for a working product. |
| General: English-only, web-first interfaces. | Amharic-first UX and Telegram bot parallel front-end. |

*Shipping the app is not the win. The win is that a client can post work, pay into escrow, and get a delivered result — or their money back — without ever needing informal trust or a lawyer.*

## 7.0 Existing Systems to Draw Design Inspiration From

Upwork — milestone-based escrow, structured dispute process, two-sided reviews.

Fiverr — simple gig-packaging (fixed-scope, fixed-price listings).

Truelancer — “security deposit” framing for protection.

Aezop — the closest direct analog, built specifically to solve the African trust/verification gap.

Chapa's own developer model — minimal-friction API integration as a template.

ECCSA/AACCSA arbitration model — inspiration for how the in-app dispute flow should escalate into something real and enforceable.

## 8.0 Business Model and Fees

Take-rate on transactions (launch lever) — a percentage of each completed transaction, split between freelancer and client.

Chosen model: 10–15%, split 5% freelancer / 5% client  materially below the global 10–20% range. A small escrow/payment-processing fee (\~1–2%) can cover payment costs. Tax treatment, including VAT registration and withholding, is subject to applicable statutory thresholds and final tax advice; see Section 10.3.6.

### 8.1 Fee comparison

| Platform | Fee Structure | Local Integration | Dispute Recourse |
| :---- | :---- | :---- | :---- |
| Our Platform (Proposed) | 10–15%, split 5/5 | Native (Telebirr/CBE) | AACCSA Arbitration |
| Global (Upwork/Fiverr) | 10–20% | None (No ETB rails) | Global Arbitration |
| Informal (Telegram) | 0% | Informal | None (Reputation only) |

Phase 2, once real transaction volume exists:

Verified/premium profiles, featured job listings, skill verification & training as a paid product, diaspora and foreign-client acquisition, enterprise/agency accounts, and subscription tiers or job-board advertising.

## 9.0 Launch Scope

Category scope: soft skills, tech skills, and digital skills — not a general marketplace.

Geographic scope: domestic-only at launch — no cross-border payment or forex complexity to start. The platform is designed to be able to include diaspora clients later, once that complexity is deliberately taken on.

### 9.1 Launch categories

Tech skills:

- Web development (frontend, backend, full-stack)  
- Mobile app development  
- WordPress / CMS setup & maintenance  
- QA / manual testing  
- IT support & basic networking/troubleshooting

Digital / creative skills:

- Graphic design (branding, social media graphics, print)  
- Digital marketing & social media management  
- Content writing & copywriting (English \+ Amharic)  
- Video editing & basic motion graphics  
- SEO  
- Translation & transcription (Amharic ↔ English at minimum, and more languages over time)

Soft-skill / professional services:

- Virtual assistance & admin support  
- Business & finance consulting (bookkeeping, basic financial planning)  
- Tutoring & training/coaching  
- Customer service / call-handling support  
- HR & recruitment support for small businesses  
- Legal & compliance consulting  
- Construction consulting & project management  
- Market & academic research

*Recommended approach: pick 4–6 subcategories total across the three buckets where a realistic pipeline of freelancers and clients already exists, get escrow \+ dispute flow working smoothly there, then expand category by category.*

# **PART II .  LEGAL & COMPLIANCE**

## 10.0 Legal and Regulatory Environment — Overview

### 10.1 Electronic Transactions Proclamation No. 1205/2020

Grants full legal recognition to electronic contracts and signatures, formed and executed online.

Article 4 — platform operators are responsible parties: must request, verify, and store the true identity, address, and license information of freelancers (a statutory KYC mandate).

“Buy Ethiopian” requirement: at least 50% of offerings must be local. Easily met at a domestic-only launch; monitor if diaspora/cross-border ever expands.

Consumer protections: sellers must display service details, prices, and terms; buyers may review/correct orders before confirming; a 7-day cooling-off right lets consumers cancel without penalty before service has begun.

Electronic message confidentiality is protected, and breach is a criminal matter; the mutual NDA in the Service Agreement should establish on-platform communication as a permitted-disclosure environment so dispute evidence remains usable.

### 10.2 Arbitration and Enforceability

Article 42 of the Proclamation requires unresolved disputes to go to arbitration.

Arbitration and Conciliation Proclamation No. 1237/2021 (enacted 2 April 2021\) governs arbitral proceedings, upholds party autonomy, and makes domestic awards final. Article 49(2) specifically allows parties to waive cassation-court review for “fundamental error of law” by express agreement — the arbitration clause should include this waiver explicitly rather than assume it.

Ethiopia ratified the 1958 New York Convention via Proclamation No. 1184/2020 (February 2020\)  confirmed this exact date with counsel, as other sources reference late 2020\. A valid award is enforceable abroad, subject to reciprocity and public-policy exceptions.

Recommendation: name Addis Ababa as the seat, Ethiopian law as governing law, and AACCSA as the arbitral institution verify AACCSA's current name and rules directly with the institution.

### 10.3 Licensing and Financial Regulation

### 10.3.1 Platform Regulatory Classification

The platform is a freelance marketplace and transaction-orchestration service. Its legal classification must be determined from the activities it actually performs, not simply from the label “marketplace.” The key regulatory question is whether the platform merely connects parties and records payment instructions, or whether it receives, holds, safeguards, transfers, or issues customer funds or payment instruments.  
The final classification must be confirmed in writing with Ethiopian legal counsel and, where appropriate, the National Bank of Ethiopia (NBE). The document must not state that the platform is licensed, exempt, or permitted to hold customer funds until that determination is documented.

### 10.3.2 Payment-Service Licensing Boundary

If the platform itself holds customer funds, operates a wallet, controls customer balances, or performs regulated payment aggregation or transfer functions, additional NBE licensing or authorization may apply. The exact classification—such as Payment System Operator, Payment Instrument Issuer, or another regulated role—must be confirmed against the current NBE framework.  
Using a licensed bank, Payment Instrument Issuer (PII), Payment System Operator (PSO), or other authorized payment partner may reduce the platform’s regulated custody burden, but it does not automatically remove the platform’s own legal, contractual, tax, KYC/AML, consumer-protection, or reporting obligations.

### 10.3.3 Customer Funds, Custody and Escrow

The platform must distinguish payment processing, custody of customer funds, and the platform’s internal transaction ledger. An invoice records and requests a payment; a milestone defines when the payment is earned; escrow/custody determines where the funds are held and when they may be released.  
The platform must not treat a normal operating bank account as an escrow account merely because customer balances are tracked in software. If customer funds are held before release, the legal owner, custodian, safeguarding mechanism, segregation requirements, permitted uses, release authority, refund mechanism, and insolvency treatment must be documented.  
The approved custody architecture may be: (a) a properly licensed/authorized platform wallet; (b) a bank or other approved custodian/segregated structure; or (c) a licensed PII/PSO/escrow partner. The final choice is a regulatory decision gate and must be confirmed before production custody begins.

### 10.3.4 Customer Funds vs. Platform Revenue

Customer funds and platform revenue must remain logically and, where required, legally segregated. Client funds allocated to projects, escrowed funds, freelancer proceeds, refunds, and pending settlements must never be treated as the platform’s operating cash.  
Platform commission, subscription revenue, payment fees retained by the platform, and other platform income must be recorded separately from customer funds. The internal ledger may represent both categories, but the accounting treatment and underlying bank/PSP balances must remain reconcilable.

### 10.3.5 Float, Interest and Liquidity

If customer funds remain in a bank or other custody structure before release, the platform must obtain written legal and contractual guidance on whether the funds may generate interest, who is entitled to that interest, whether the platform may use or benefit from customer float, and what minimum liquidity or safeguarding requirements apply.  
The platform must not rely on customer funds to finance its own operations or front payouts unless that activity is expressly permitted by the applicable regulatory and contractual structure.

### 10.3.6 Tax, Withholding and Financial Treatment

The platform must distinguish the project’s gross contractual amount, the platform’s commission, payment-processing charges, legally required withholding, and the freelancer’s net settlement. The applicable withholding-tax rate, VAT registration threshold, invoicing obligations, and tax-agent responsibilities must be confirmed with Ethiopian tax counsel and the relevant authority before launch.  
The milestone \+ escrow \+ invoice workflow should therefore record gross amount, deductions, tax/withholding treatment, net amount, invoice status, and external payment references separately. Contract language should reflect the final tax determination rather than hard-code an unverified rate.

### 10.3.7 Approved Financial Partners and Their Roles

A bank, Telebirr/PII, PSO/PSP, payment gateway, and escrow/custody provider are not interchangeable. A provider that can collect a payment is not necessarily authorized or technically able to hold funds conditionally and release them to a different beneficiary.  
For every proposed partner, obtain written confirmation of its licensed role, collection capability, custody/holding capability, conditional release capability, payout capability, refund/reversal process, KYC/AML responsibilities, transaction limits, settlement timing, fees, reconciliation reports, webhook support, and contractual requirements  
.

### 10.3.8 Payment Partner Validation & Architecture Decision Gate

The detailed partner-validation matrix and question set in Part I, Section 3.3 is also a legal/compliance decision gate. No customer-fund custody or production release flow should be implemented until the selected bank, PII, PSO/PSP, or other financial partner confirms its licensed role and the proposed collection, custody/holding, conditional-release, refund, payout, KYC/AML, reconciliation, and settlement flow in writing.

## 11.0 KYC / AML Compliance Framework

*A prior draft cited the 2013 Anti-Money Laundering Proclamation and 5–7-year retention. Both are now confirmed outdated — flagged below as corrections.*

### 11.1 Legal basis

Prevention and Suppression of Money Laundering and Financing of Terrorism Proclamation No. 1387/2025 — replaces Proclamation No. 780/2013. The gazetted proclamation number was not resolved in research; get the final number and full text from counsel before citing it anywhere official.

NBE Directive FIS/04/2021 — requirements for account-based transactions and regulatory limits.

Proclamation No. 1237/2021 — beneficial-ownership requirements (note: same number as the Arbitration Proclamation; confirm with counsel this isn't a citation error in the source research).

FIC (Financial Intelligence Center) reporting obligations — Suspicious Transaction Reports (STRs) within 24 hours of suspicion.

### 11.2 Tiered KYC (with Fayda ID)

| Tier | User Type | Requirements | Verification |
| :---- | :---- | :---- | :---- |
| Tier 1 — Basic | All Registered Users | Fayda ID, Phone, Address, Email | OCR \+ SMS |
| Tier 2 — Payout | Freelancers | TIN/Business Reg \+ Bank Details | Manual Review |
| Tier 3 — High-Risk | PEPs & Large Volumes | Enhanced Due Diligence | Ongoing Audit |

Fayda ID integration: Ethiopia's national digital ID (Proclamation No. 1284/2023), biometric-linked and government-verified — the strongest available defense against ghost accounts.

Unique customer ID: assign one platform-wide ID per user, linking all accounts/profiles/transactions (mirrors NBE Directive FIS/04/2021, Art. 4.2).

PEP screening: automated screening against domestic and foreign politically-exposed-persons lists, mandatory under the AML framework.

### 11.3 Hard-block workflow

UNVERIFIED → can browse and save drafts only; cannot bid, withdraw, or receive payments.

PENDING REVIEW → ID submitted, awaiting manual/automated review.

VERIFIED → full features unlocked, “Verified” badge shown.

SUSPENDED → triggered by a PEP hit, an STR filing, a sanctions match, or confirmed suspicious activity.

### 11.4 Transaction monitoring & STR filing

| Monitoring Red Flag | Suspicious Transaction Pattern |
| :---- | :---- |
| Structuring | Multiple deposits totaling \>ETB 500k within 7 days. |
| Velocity | Volume \>300% of 90-day average. |
| Geographic Risk | Transfers to sanctioned jurisdictions. |
| Round Amounts | Repeated transactions of exact round figures (e.g. 50k). |
| Rapid Movement | Deposit and withdrawal within 24 hours. |

STR process: Detection → internal review by a designated Compliance Officer → file STR to the FIC within 24 hours of suspicion → if confirmed, freeze funds, suspend the account, and preserve records.

The NBE Directive expects a dedicated KYC unit led by at least a Manager-level Compliance Officer.

### 11.5 Record retention

10 years minimum for KYC/identification records, transaction records, and STR filings/supporting documentation, from the end of the business relationship or transaction completion — not the 5–7 years used in earlier drafts.

Training records: 5 years. Audit reports: 10 years.

Architecture implication: design the database with immutable audit trails and WORM (Write Once Read Many) storage; budget for the long-term storage cost this implies.

## 12.0 Data Protection (PDPP) Compliance Framework

*Personal Data Protection Proclamation No. 1321/2024 — GDPR-like obligations around consent, data  localization, and subject rights.*

### 12.1 Mandatory ECA registration

PDPP Art. 33 makes registration mandatory, not optional: “Data controllers and processors must register with the Ethiopian Communications Authority (ECA) before engaging in data processing activities.” The platform is a data controller (it determines the purposes and means of processing).

Maintain a Register of Processing Activities: what data is collected, why, how long it's kept, who it's shared with, and where it's stored.

Appoint a Data Protection Officer (DPO) if the platform engages in large-scale processing of personal data or handles sensitive financial data — confirm applicability with counsel based on actual processing volume.

### 12.2 Consent and privacy notice

Valid consent under PDPP Arts. 8 and 11 must be freely given, specific (separate per purpose), informed (plain language, Amharic \+ English), unambiguous (active opt-in, no pre-ticked boxes), and withdrawable.

Granular consent at registration: identity verification for KYC/AML (required, no opt-out), financial data processing for payments (required, no opt-out), platform notifications (optional), marketing use of profile data (optional), anonymized analytics sharing (optional).

### 12.3 Data subject rights  required user-facing tools

| Data Subject Right | UX/Technical Implementation |
| :---- | :---- |
| Right to Access | “Download My Data” button → CSV export in 30 days. |
| Rectification | In-app edit forms with ID verification workflows. |
| Erasure | Soft-delete for AML period, followed by hard-delete. |
| Portability | Machine-readable JSON export functionality. |
| Objection | Granular opt-out toggles in account settings. |

Important caveat: the right to erasure does not override the AML 10-year retention requirement. On a deletion request: inform the user that KYC/transaction data is retained per AML law, delete all non-AML data (marketing preferences, chat history beyond the dispute period), and anonymize retained data where possible.

### 12.4 Data localization

PDPP Art. 22 — data sovereignty: personal data collected in Ethiopia must be stored domestically as the default. Cross-border transfer is permitted only if the ECA has approved the recipient country as adequate, ECA-approved safeguards (SCCs, binding corporate rules) are in place, or the user gives explicit informed consent after risk disclosure.

Practical architecture: primary hosting (web/app servers, database, document store) stays on Ethiopian-based cloud providers (e.g. Ethio Telecom Cloud, Safaricom Ethiopia) or on-premise. International use is restricted to ECA-approved encrypted backups and aggregated, anonymized analytics only — never raw personal data without explicit consent.

### 12.5 Breach notification  72-hour protocol

Hour 0: breach detected. Hour 1: incident response team activated, containment begins. Hour 6: internal assessment of scope, data types, and severity. Hour 24: draft notifications, legal review. Hour 48: notify the ECA and affected users if high risk. Hour 72: hard deadline all required notifications sent, actions documented for ECA audit.

ECA notification must include the nature of the breach, categories and approximate number of affected subjects, likely consequences, measures taken or proposed, and contact details.

### 12.6 Security by design

AES-256 encryption at rest, TLS 1.3 in transit, row-level encryption for sensitive fields (TIN, bank account, ID numbers), RBAC \+ MFA for admin access, immutable audit logging retained for 10 years, and annual third-party penetration testing.

## 13.0 Integrated Compliance Architecture

How KYC/AML and PDPP work together through the user lifecycle:

Account creation → granular PDPP consent → Tier 1 KYC form.

Hard block in place: cannot bid, withdraw, or receive payment until KYC clears.

ID upload \+ liveness check (OCR/biometric, Fayda-first) → automated verification.

Pass → “Verified” badge, full features unlocked. Fail/manual → request more documents, loop back.

Ongoing transaction monitoring: real-time risk scoring, threshold alerts, PEP/sanctions screening, pattern detection.

Suspicious activity → file an STR to the FIC within 24 hours and freeze the account. Otherwise → normal escrow and payment flow.

On a data-deletion request: retain KYC/transaction data for the AML period (10 years), delete marketing/chat/profile data, anonymize where possible, and confirm to the user within 30 days.

## 14.0 Compliance Implementation Checklist

Phase 1 — Immediate (0–30 days): legal foundation

| ID | Phase 1 Action Item | Owner | Target Day |
| :---- | :---- | :---- | :---- |
| 1 | Obtain AML Proclamation text; update policies | Legal Counsel | Day 7 |
| 2 | Register as Data Controller with ECA | Compliance Lead | Day 14 |
| 3 | Draft Bilingual Privacy Notice | Legal / Product | Day 21 |

| Deadline | Task / Action Item | Owner | Blocking Risk |
| :---- | :---- | :---- | :---- |
| Day 45 | Implement Unique Customer ID architecture (link all accounts/transactions) | Engineering | NBE Directive FIS/04/2021 non-compliance |
| Day 45 | Build granular consent UI at registration (5 checkboxes per PDPP Arts. 8 & 11\) | Engineering / Product | Invalid consent; PDPP violation |
| Day 45 | Configure primary hosting on Ethiopian cloud (Ethio Telecom / Safaricom / on-premise) | DevOps | Data localization violation (PDPP Art. 22\) |
| Day 60 | Integrate Fayda ID verification API as primary KYC method | Engineering | No automated KYC; manual bottleneck |
| Day 60 | Build PEP/sanctions screening integration | Engineering | AML gap; cannot detect high-risk users |
| Day 60 | Execute ECA-approved SCCs for any encrypted backups to AWS/Azure/GCP | Legal / DevOps | Cross-border transfer illegal |
| Day 60 | Conduct DPIA for cross-border transfers (mandatory for high-risk processing) | Compliance / DPO | Processing high-risk data without assessment |
| Day 75 | Deploy Transaction Monitoring System (TMS) with automated red-flag rules | Engineering | No STR detection; regulatory violation |
| Day 75 | Implement user-facing data rights tools (access, rectify, export, delete non-AML data) | Engineering | Data subject rights unenforceable |
| Day 90 | Build STR filing workflow automation (detection → review → FIC submission within 24h) | Engineering / Compliance | Manual STR filing misses 24h deadline |

Phase 2 — Short-term (30–90 days): technical build

| \# | Action | Owner | Deadline |
| :---- | :---- | :---- | :---- |
| 6 | Build the KYC document-upload portal with encrypted storage | Engineering | Day 45 |
| 7 | Integrate Fayda ID verification (or a third-party KYC provider) | Engineering | Day 60 |
| 8 | Implement hard-block logic on withdrawals/profile changes until verified | Engineering | Day 45 |
| 9 | Build the “Verified” badge and KYC status dashboard | Engineering | Day 60 |
| 10 | Deploy transaction monitoring with automated red-flag detection | Engineering | Day 90 |
| 11 | Implement PEP/sanctions screening (automated daily checks) | Engineering | Day 75 |
| 12 | Build the data-rights portal: access, rectification, erasure, portability | Engineering | Day 90 |

Compliance & Engineering Roadmap

| Deadline | Task / Action Item | Owner | Blocking Risk |
| :---- | :---- | :---- | :---- |
| Day 45 | Implement Unique Customer ID architecture (link all accounts/transactions) | Engineering | NBE Directive FIS/04/2021 non-compliance |
| Day 45 | Build granular consent UI at registration (5 checkboxes per PDPP Arts. 8 & 11\) | Engineering / Product | Invalid consent; PDPP violation |
| Day 45 | Configure primary hosting on Ethiopian cloud (Ethio Telecom / Safaricom / on-premise) | DevOps | Data localization violation (PDPP Art. 22\) |
| Day 60 | Integrate Fayda ID verification API as primary KYC method | Engineering | No automated KYC; manual bottleneck |
| Day 60 | Build PEP/sanctions screening integration | Engineering | AML gap; cannot detect high-risk users |
| Day 60 | Execute ECA-approved SCCs for any encrypted backups to AWS/Azure/GCP | Legal / DevOps | Cross-border transfer illegal |
| Day 60 | Conduct DPIA for cross-border transfers (mandatory for high-risk processing) | Compliance / DPO | Processing high-risk data without assessment |
| Day 75 | Deploy Transaction Monitoring System (TMS) with automated red-flag rules | Engineering | No STR detection; regulatory violation |
| Day 75 | Implement user-facing data rights tools (access, rectify, export, delete non-AML data) | Engineering | Data subject rights unenforceable |
| Day 90 | Build STR filing workflow automation (detection → review → FIC submission within 24h) | Engineering / Compliance | Manual STR filing misses 24h deadline |

Phase 3 — Medium-term (90–180 days): operational maturity

| \# | Action | Owner | Deadline |
| :---- | :---- | :---- | :---- |
| 13 | Establish the Compliance Officer role and KYC unit | Management | Day 100 |
| 14 | Create the STR filing workflow with a 24-hour SLA to the FIC | Compliance | Day 105 |
| 15 | Conduct a DPIA for high-risk/cross-border processing | DPO/Legal | Day 120 |
| 16 | Execute ECA-approved SCCs with any international cloud providers | Legal | Day 120 |
| 17 | Implement immutable audit logging for all data access | Engineering | Day 135 |
| 18 | Conduct a penetration test and remediate findings | Security | Day 150 |
| 19 | Train staff on AML red flags and PDPP obligations | HR/Compliance | Day 180 |
| 20 | Establish the breach-response playbook (72-hour protocol) | DPO/Legal | Day 120 |

Security, Audit & Ongoing Operations Roadmap

| Deadline | Task / Action Item | Owner | Blocking Risk |
| :---- | :---- | :---- | :---- |
| Day 100 | Implement 72-hour breach notification runbook (with templates) | Compliance / Security | Missed 72h deadline; ECA penalties |
| Day 100 | Establish Register of Processing Activities (live document) | DPO / Compliance | PDPP Art. 30 violation; audit failure |
| Day 110 | Penetration test \+ security audit (before launch) | Security | Launch with vulnerabilities; breach risk |
| Day 120 | Automate STR filing workflow (end-to-end) | Engineering | Operational burden; missed deadlines |
| Day 120 | Deploy encryption at rest (AES-256) \+ in transit (TLS 1.3) \+ HSM (for key management) | Security / DevOps | Data breach exposure; non-compliance |
| Day 120 | Train Compliance Officer and support team (on PDPP/KYC/AML procedures) | Compliance / HR | Operational errors; regulatory violations |
| Day 120 | Establish metrics dashboard: STR volume, KYC pass/fail, breach incidents, DSAR SLA | Compliance / Engineering | No visibility; cannot manage compliance |
| Day 150 | Configure automated KYC refresh (for high-risk users, quarterly) | Engineering / Compliance | Stale KYC data; AML gap |
| Day 150 | Implement data retention automation (10-yr WORM \+ deletion of non-AML data on request) | Engineering | Manual process errors; retention violations |
| Day 180 | Conduct first annual DPIA review | DPO | PDPP requirement missed |

Phase 4 — Ongoing

Annual: review KYC/AML policies, re-certify staff training, penetration testing.

Semi-annual: independent internal audit of KYC/AML systems (per NBE Directive).

Quarterly: review data retention schedules and purge expired non-AML data.

Daily: refresh PEP/sanctions screening lists.

## 15.0 Open Legal Questions for the Law Firm

Consolidated from clause-by-clause review comments — organized by topic so the firm can work through it systematically.

Independent contractor status & misclassification

Do Ethiopian courts require specific “magic words” or a standalone affidavit of independent-contractor status beyond contractual language?

Does the Civil Code (cited variously as Arts. 2591 et seq. and 2610–2631 in different research passes — reconcile the correct range) or the Labour Proclamation creates rebuttable presumptions that should be addressed?

What additional evidence (invoices, multiple clients, business registration) should the platform require from freelancers to support independent-contractor status?

Is this contractual affirmation alone sufficient protection against reclassification, given that labor courts look to substance over form?

Contract formation, scope, and deemed acceptance

Does Ethiopian contract law require “certainty of object” (Civil Code Art. 1678\) such that vague deliverables could void the contract?

Is a “deemed acceptance” provision enforceable under Ethiopian contract principles, or does it require explicit waiver language?

Does Ethiopian law impose a mandatory “reasonable time” default where dates are missing (Civil Code Art. 1737)?

Are liquidated damages for delay permissible, or subject to judicial reduction?

Are “change order” requirements enforceable, or could unilateral client scope changes be treated as forming a new contract?

Payment, tax, and escrow

Does Ethiopian tax law require the client (or platform) to withhold tax at source for independent-contractor payments, and at what rate?

At what threshold does VAT registration apply?

Does the escrow mechanism create a trust, stakeholder arrangement, or third-party-beneficiary issue under Ethiopian law?

Can the platform's escrow rules override contractual payment or termination terms?

Is partial-payment-for-partial-work a default rule under the Civil Code (Art. 1737), or must it be expressly agreed?

Payment, Escrow & Financial-Partner Questions

Licensing Clarification (NBE): Does the chosen model (esp. in-wallet or bank custodian) require a Payment System Operator or Payment Instrument Issuer license? If we hold client funds internally, does NBE classify us as a payment gateway? Can we use Chapa/CBE integrations to avoid this?

NBE Consultation: Meet with NBE (Payment Systems Supervision Directorate) to explain the business model. Ask about capital requirements, sandbox programs, and any exemptions for escrow-only services.

Telebirr Onboarding: What is the process to register as a Telebirr merchant/agent for our platform? What are the API integration requirements, fees, and expected settlement times? Confirm daily and per-transaction limits (NBE's 150k ETB/day rule).

CBE Integration: Does CBE provide a direct integration for CBE Birr? How can merchants automatically verify CBE fund transfers? Are there fees for corporate escrow accounts?

Chapa Details: Can Chapa act purely as a passthrough (non-custodial) if desired? What fees and settlement schedule apply to a marketplace model? Does Chapa support split disbursements (e.g., instantaneous payouts to freelancers)? Confirm refund/dispute processes.

KYC/AML Compliance: What thresholds trigger KYC for an online marketplace? How to register with the Financial Intelligence Center (FIC)? What record-keeping is required (10-year retention per Proclamation No. 1387/2025)?

Data/Telecom Regulations: Does routing payments via Telco networks require additional telecom licenses or security standards? (Ethiopian Communications Authority, PDPP compliance).

Arbitration Logistics: Contact Addis Ababa Arbitration and Conciliation Center (AACCSA) / Ethiopian Chambers of Commerce to understand formal arbitration procedures: how to include their rules in contracts, typical timeline and cost.

Tax and Float: Verify with tax advisors if holding a float creates any VAT or interest tax issues. Since Safaricom's M-Pesa is entering Ethiopia, ask how multi-rail competition might affect Telebirr usage limits.

Decide the point at which diaspora/cross-border support gets activated, and what forex/legal groundwork that requires when it does.

IP and confidentiality

Does Ethiopian copyright law recognize a “work-for-hire” doctrine, or is an explicit assignment required?

What is the status of moral rights under Ethiopian law, and is a waiver valid or merely a promise not to enforce?

Does IP assignment require registration with the Ethiopian Intellectual Property Office to be effective against third parties?

Liability, indemnification, and termination

Does Ethiopian law permit contractual liability caps and exclusion of consequential damages, or do mandatory provisions (Civil Code Arts. 1791–1794) override them?

Is “gross negligence” a recognized category under Ethiopian tort law?

Are indemnification clauses enforceable, and do they require specific formalities?

Does Ethiopian law require “reasonable notice” for termination even where the contract specifies immediate termination for cause?

Arbitration and electronic formalities

Does Proclamation No. 1237/2021 Art. 49 permits contractually waiving cassation-bench appeal for “fundamental error of law” — does the current clause achieve that, or does it need explicit language?

Is a sole arbitrator appropriate, or do default rules require a panel?

Does the New York Convention affect enforceability of the clause for any future cross-border disputes?

Does Ethiopian law recognize electronic signatures and click-wrap agreements for this kind of agreement, and is a “wet ink” signature or notarization required for the IP assignment or arbitration agreement specifically?

If enforced in Ethiopian courts, will a certified Amharic translation of an English-language agreement be required? Should English be named as the authoritative version?

Platform-specific

Does Ethiopian law recognize any form of “platform immunity,” or could the platform be joined as a necessary party in arbitration?

Should the platform's Terms of Service be explicitly incorporated by reference into the Service Agreement?

Compliance-specific (from the KYC/AML/PDPP review)

Is the platform a “payment instrument issuer” or “money transfer operator” under NBE regulations, and does FIS/04/2021 apply directly or by analogy?

Does current processing volume trigger the mandatory DPO appointment?

What is the ECA's current registration procedure, timeline, and fee for data controllers?

Can the platform get direct API access to verify Fayda IDs, or is an intermediary required?

Has the ECA approved any standard contractual clauses for cloud providers (AWS/Azure/GCP)?

How does the 10-year AML retention period interact with PDPP erasure rights specifically for arbitration/dispute records?

## 16.0 Legal Sources & References

Primary proclamations and reference portals to build from — verify current text directly before citing in any final contract.

| Topic | Source |
| :---- | :---- |
| Employment vs. contractor | Labour Proclamation No. 1156/2019; Civil Code (contract-of-services provisions, exact article range to confirm) |
| E-contracts, e-signatures, e-commerce KYC | Electronic Transactions Proclamation No. 1205/2020 |
| Arbitration & cassation waiver | Arbitration and Conciliation Working Procedure Proclamation No. 1237/2021, esp. Art. 49(2) |
| New York Convention accession | Proclamation No. 1184/2020 (date to confirm with counsel) |
| National digital ID | Fayda ID Proclamation No. 1284/2023 |
| AML/CFT | Prevention and Suppression of Money Laundering and Financing of Terrorism (Amendment) Proclamation No. 1387/2025 (successor to No. 780/2013); NBE Directive FIS/04/2021 |
| Data protection | Personal Data Protection Proclamation No. 1321/2024, esp. Arts. 8, 11, 22, 33, and Chapter 3 |
| IP / copyright | Copyright and Neighboring Rights Protection Proclamation No. 410/2004, as amended by No. 872/2014; Ethiopian Intellectual Property Office |
| Tax | Income Tax Proclamation No. 979/2016 (as amended); VAT Proclamation No. 285/2002 (as amended); Federal Tax Administration Proclamation No. 983/2016 |
| Reference portals | justice.gov.et (Ministry of Justice's official proclamation database); lawethiopia.com; chilot.me (Federal Negarit Gazette mirrors) |

User Terms & Conditions / Agreements

Clearly define user roles (client, freelancer), platform fees, payment/escrow mechanics, rights and obligations, termination, liability limits.

Escrow Agreement

Embedded clause or addendum stating that all payments made for jobs are held in escrow by the platform (or partner) until mutual release. Specifies release conditions, dispute hold, and refund triggers.

Dispute Resolution Policy

Formal process for how and when disputes between clients and freelancers can be raised (deadlines, required evidence, escalation steps). Details mediation and expected timelines.  
Arbitration Clause

Commits both parties to resolve unresolved disputes via arbitration (e.g., Addis Ababa Arbitration Center / AACCSA) rather than court. Specifies governing law (Ethiopian law) and arbitration rules.  
KYC/AML Policy

Procedures for Know-Your-Customer and Anti-Money Laundering compliance. Defines customer due diligence (ID checks, risk assessments), transaction monitoring, and STR reporting to FIC.  
Funds Custody Agreement (if using bank)

Legal contract with the bank or escrow provider specifying that customer funds are held in trust, conditions for release, handling of interest (if any), and liability allocations.  
SLA with Payment Partners

Contracts with Chapa/Telebirr/CBE (if directly integrating) outlining service levels, roles, fees, and support obligations. For third-party PSPs, an SLA with them (and a data-processing agreement if personal data is involved).

DPO Appointment & ECA Registration — Decision Log

1\. Volume Assumptions & DPO Trigger Analysis

Under Article 37 of the Personal Data Protection Proclamation (PDPP), an organization must appoint a Data Protection Officer (DPO) if its data processing operations meet any of the following criteria:

The processing is carried out by a public authority.  
The organization's core activities require the regular and systematic monitoring of data subjects on a large scale.  
The core activities consist of the large-scale processing of special categories of personal data, as defined in Article 32\.

Based on conservative launch estimates for the platform's first year, we anticipate a user base of 6,000 data subjects (comprising 5,000 freelancers and 1,000 clients). Additionally, we project roughly 15,000 projects generating approximately 45,000 payment events.

When mapping these projections to our data practices, two key compliance triggers emerge:

Regular and Systematic Monitoring: The platform’s core operations inherently require continuous monitoring. This includes mandatory Know Your Customer (KYC) procedures utilizing identity documents and biometrics, routine payment processing, dispute evidence gathering, and comprehensive communications logging.  
Special Categories of Data: The platform will process sensitive financial information, including bank account details and transaction histories, which qualify as special category data under PDPP Article 32\.

2\. DPO Engagement Model Comparison  
Decision: Engage fractional DPO via law firm (privacy \+ fintech experience) for Year 1\. Reassess at 10k users.  
3\. ECA Registration — Decision Log

4\. ROPA Template Structure (Per PDPP Art. 30\)

5\. Ongoing Compliance Calendar (DPO / ECA)

Monthly

DPO: Review STR filings, KYC rejection rates, breach log  
Engineering: Verify WORM integrity, backup restore test (quarterly)

Quarterly

DPO: ROPA review & update, DPIA refresh (if new processing), staff training  
Legal: Regulatory update scan (NBE, ECA, FIC, MoJ)  
Engineering: Penetration test (bi-annual), vendor security review

Annually

DPO: Annual report to board, ECA registration renewal  
Legal: External privacy audit, DPO independence review  
Engineering: Full DR test, encryption key rotation

Event-Driven

New processing activity → DPIA \+ ROPA update (before launch)  
Data breach → 72h notification (ECA \+ users), DPO leads response  
Regulatory change → Impact assessment \+ policy update (within 30 days)  
Subprocessor change → DPA update \+ ROPA update

# **PART III — CONTRACTS**

## 17.0 Contract Structure Overview

### 17.0.1 Core Contract Structure

Two separate documents, kept clearly distinct:

Platform Terms of Service — governs the relationship between the platform and every user (account rules, fees, prohibited conduct, liability limits, how disputes route into the flow in Part IV).

Master Freelance Service Agreement — the actual per-job contract between a specific freelancer and client, executed digitally on contract acceptance. This is the one that matters most for misclassification protection, and is set out clause-by-clause below.

### 17.1 Required Contracts and Policies for Escrow Operations

* User Terms & Conditions / Agreements  
* Escrow Agreement  
* Dispute Resolution Policy  
* Arbitration Clause  
* KYC/AML Policy  
* Funds Custody Agreement (if using bank)  
* SLA with Payment Partners

## 18.0 Master Freelance Service Agreement  Clause by Clause

Clause 1 — Independent Contractor Acknowledgment

*1.1 The Freelancer acknowledges and agrees that he/she/they is engaged by the Client as an independent contractor and not as an employee, agent, partner, or joint venture of the Client or of the Platform Operator. Nothing in this Agreement shall be construed to create an employment relationship between the Freelancer and either the Client or the Platform Operator for any purpose whatsoever, including but not limited to Labor Proclamation No. 1156/2019 or any successor legislation.*

*1.2 The Freelancer retains sole discretion over the manner, method, and means by which the Services are performed, subject only to the Deliverable specifications agreed in the applicable Job Posting and Milestone Schedule.*

*1.3 The Freelancer is solely responsible for the payment of all applicable taxes on income received under this Agreement, subject to the Platform Operator's withholding obligations as a registered ERCA Withholding Tax Agent.*

Clause 2 — Escrow Release Conditions

*2.1 The Client agrees to fund the Escrow Account in the full amount specified in the Milestone Schedule prior to the commencement of work on any Milestone. Work on a Milestone shall not commence until Escrow funding for that Milestone has been confirmed by the Platform Operator.*

*2.2 Escrow funds held for a Milestone shall be released to the Freelancer upon the occurrence of any one of the following Release Conditions: (a) the Client approves the Milestone Deliverable through the Platform interface; (b) seven (7) calendar days elapse from the Freelancer's submission of Milestone Deliverable without the Client raising a Dispute through the Platform interface (Automatic Release); or (c) a Dispute raised by the Client is resolved in the Freelancer's favor by the Platform's mediation panel or by AACCSA arbitration.*

*2.3 Upon release, the Platform Operator shall disburse the net Milestone amount (after deduction of the Platform Commission and applicable Withholding Tax) to the Freelancer*

Clause 3 — Dispute Resolution

*3.1 In the event of any dispute arising out of or relating to this Agreement or the Services performed hereunder (a "Dispute"), the parties agree to attempt resolution through the following tiered process:*

*3.2 Tier 1 — Negotiation: Within three (3) business days of a Dispute being raised, the parties shall communicate directly through the Platform's messaging system to attempt a mutually agreeable resolution.*

*3.3 Tier 2 — Platform Mediation: If Tier 1 negotiation fails, either party may escalate the Dispute to the Platform Operator's mediation panel. The panel shall convene within three (3) business days and issue a non-binding recommendation within five (5) business days of convening.*

*3.4 Tier 3 — Arbitration: If Tier 2 mediation fails or if either party rejects the mediation recommendation, the Dispute shall be submitted to binding arbitration administered by the Addis Ababa Chamber of Commerce and Sectoral Associations Arbitration Institute (AACCSA) in accordance with its Arbitration Rules. The seat of arbitration shall be Addis Ababa, Ethiopia. The language of arbitration shall be English or Amharic, as agreed by the parties. The arbitral award shall be final and binding and may be enforced before the Federal First Instance Court of Ethiopia.*

Clause 4 — Intellectual Property Assignment

*4.1 Assignment of Rights. Upon the final release of all Escrow funds associated with a Deliverable, the Freelancer hereby irrevocably assigns, transfers, and conveys to the Client all right, title, and interest in and to the intellectual property rights arising from such Deliverable, including but not limited to copyrights, patents, and trademarks under the laws of Ethiopia.*

*4.2 Retention of Rights. Until full payment is released from Escrow, the Freelancer retains all ownership and intellectual property rights in the Work. The Client shall have no right to use, modify, or distribute any Deliverable until the Milestone payment has been released.*

*4.3 Pre-Existing Materials. Notwithstanding Clause 4.1, the Freelancer retains ownership of any tools, software, or methodologies owned by the Freelancer prior to the commencement of the Services. The Freelancer grants the Client a non-exclusive, perpetual, royalty-free license to use such Pre-Existing Materials solely as incorporated into the final Deliverables.*

Clause 5 — Confidentiality

*5.1 Each party (as "Receiving Party") agrees to keep strictly confidential all non-public information disclosed by the other party (as "Disclosing Party") in connection with this Agreement, including but not limited to: business strategies, technical specifications, financial data, client lists, and personal data of users (the "Confidential Information").*

*5.2 The Receiving Party shall use the Confidential Information solely for the purpose of performing its obligations under this Agreement and shall not disclose the Confidential Information to any third party without the Disclosing Party's prior written consent, except as required by law or by order of a competent court or regulatory authority in Ethiopia.*

*5.3 These confidentiality obligations shall survive termination of this Agreement for a period of three (3) years from the date of termination.*

*5.4 The Freelancer acknowledges that any personal data of the Client's customers or employees encountered in the course of performing Services constitutes Confidential Information and is additionally subject to the Ethiopian Personal Data Protection Proclamation of 2023\.*

3\. Schedule and milestones

*3.1 Project Schedule. The Work shall be performed in accordance with the milestone schedule set out in Schedule B, which specifies: (a) milestone description; (b) target delivery date; (c) associated payment tranche; and (d) escrow release trigger.*

Sample Schedule B — milestone table

| Project Milestone | Key Deliverable | Payment Tranche | Escrow Trigger |
| :---- | :---- | :---- | :---- |
| 1\. Kick-off | Project plan & wireframes | 50% upfront | Initial Deposit |
| 2\. Final Delivery | Complete assets \+ source files | 50% balance | Client Acceptance |

4\. Revisions and scope creep

The Agreement includes up to two rounds of reasonable revisions within the original agreed scope. Any material change to requirements or additional deliverables constitutes “scope expansion” and requires a separate written agreement and adjusted pricing — this protects freelancers from open-ended revision cycles and preserves the integrity of the original project budget.

5\. Payment terms and escrow

*5.1 Escrow Funding. Client shall deposit the full project fee into Escrow before work begins. Milestone payments will be released from Escrow upon Client's written acceptance of each milestone deliverable. If a client fails to respond within the Review Period, the deliverable is deemed accepted and funds release automatically.*

Before work commences, the client deposits 100% of the project fee into escrow via local rails (Chapa, supporting Telebirr, CBE Birr, and bank transfer). Funds release to the freelancer in full on acceptance or on expiry of the review window.

6\. Tax withholding

The platform acts as a withholding agent for payments of ETB 10,000 or more per project: 3% withholding tax if the freelancer has provided a TIN, 30% otherwise. The freelancer remains responsible for filing their own personal income tax; the platform's own commission revenue is subject to 15% VAT once registration thresholds are crossed.

7\. Intellectual property

*7.1 Assignment. Upon full payment (complete release of Escrow funds), all IP rights in the final deliverables transfer to the Client. Until the Freelancer is paid in full, the Freelancer retains all IP rights, and the Client is prohibited from using or modifying the deliverables.*

*7.2 Pre-Existing Materials. Freelancer retains ownership of tools, methodologies, or software libraries owned prior to the project (“Pre-Existing Materials”). Client receives a license to use Pre-Existing Materials solely as incorporated into the final deliverables.*

8\. Confidentiality

*8.1 Mutual Confidentiality. Each party shall keep the other's confidential information secret. Permitted disclosures (e.g. as required by law, or communications conducted on-platform for dispute-evidence purposes) are accepted. Breach of confidentiality shall be deemed material breach.*

9\. Liability

*9.1 Limitation of Liability. Neither party shall be liable to the other for indirect or consequential damages. Freelancer's total liability is limited to the total fees paid under this Agreement.*

10\. Termination

*10.1 Termination Rights. Clients may terminate if Freelancer misses a milestone deadline by more than a specified number of days. Freelancer may terminate if Client fails to fund Escrow within a specified period. In either case, any funds in Escrow shall be refunded or released per the Escrow rules and work delivered to date.*

10.4 Record Retention. Both parties acknowledge that the Platform is required under the Prevention and Suppression of Money Laundering and Financing of Terrorism (Amendment) Proclamation No. 1387/2025 to retain KYC records, transaction data, STR filings, and dispute records for a minimum of 10 (ten) years from the end of the business relationship or transaction completion. This retention obligation survives termination of this Agreement.

11\. Dispute resolution and arbitration

Dispute escalation mirrors Part IV of this document: informal negotiation → timed platform mediation with a non-binding recommendation → arbitration if still unresolved.

11.1 Arbitration Clause. Any dispute arising under this Agreement that cannot be resolved by mediation shall be finally settled by arbitration in Addis Ababa, Ethiopia, under the Arbitration and Conciliation Proclamation No. 1237/2021. The arbitration shall be conducted in English by a sole arbitrator appointed by the Addis Ababa Chamber of Commerce Sectoral Associations (AACCSA), unless the parties agree otherwise. The award shall be final and binding on the parties.

11.1(a) Cassation Waiver. The Parties expressly and irrevocably waive any right to seek cassation review before the Federal Supreme Court Cassation Bench on grounds of 'fundamental error of law' under Article 49(2) of the Arbitration and Conciliation Proclamation No. 1237/2021. The arbitral award shall be final and binding with no further recourse to any court, except for the limited grounds of setting aside under Article 47 of Proclamation No. 1237/2021.

11.1(b) Governing Law and Seat. The seat of arbitration shall be Addis Ababa, Ethiopia. The governing law of this Agreement and the arbitration shall be the laws of the Federal Democratic Republic of Ethiopia.

11.1(c) Enforcement. This arbitration agreement and any resulting award shall be enforceable in accordance with the New York Convention on the Recognition and Enforcement of Foreign Arbitral Awards (1958), to which Ethiopia is a party via Proclamation No. 1184/2020.

12.9 Record Retention & Data Preservation. Notwithstanding any data deletion request under the Personal Data Protection Proclamation No. 1321/2024, the Platform shall retain all KYC documentation, transaction records, communications related to disputes, and STR filings for a minimum of 10 (ten) years as mandated by the Prevention and Suppression of Money Laundering and Financing of Terrorism (Amendment) Proclamation No. 1387/2025. Such retained data shall be stored in immutable, WORM-compliant storage with full audit trails.

12\. Independent contractor affirmation and platform role

Restated near the signature block: the freelancer affirms independent-contractor status; the platform is a neutral marketplace/payment facilitator, not a party to this Agreement and not the employer of either side. The platform's Terms of Service are incorporated by reference.

13\. Language and acceptance

This Agreement is drafted in English; if a certified Amharic translation is required for enforcement in Ethiopian courts, English is named as the authoritative version pending counsel's confirmation. Acceptance is digital, by both parties, timestamped and stored — relying on the Electronic Transactions Proclamation's recognition of e-signatures.

*Every clause above is drafting-stage language for the engaged law firm to review, correct, and finalize against current Ethiopian law — see Part II, Section 15 for the specific open questions attached to each clause.*

## 19.0 In-App Dispute & Mediation Flow

# **PART IV — DISPUTE RESOLUTION**

## 19.0 In-App Dispute & Mediation Flow

Stage 0 — Prevention

Every job is created from the contract template above, so scope, deliverables, revision limits, deadlines, and price are explicit and timestamped before work starts. All work-related communication happens inside the platform's messaging, not external channels.

Stage 1 — Direct negotiation (days 0–7)

A structured resolution thread opens: both sides state what was agreed, what was delivered/expected, and what's disputed. The platform acknowledges within 1 business day; most misunderstandings resolve within this window.

Stage 2 — Evidence submission

Each side submits contract/milestone terms (auto-attached), delivered files or links, and the in-app message log (auto-pulled, not user-submitted). The dispute is categorized: non-delivery, late delivery, quality dispute, scope creep, non-payment, or communication breakdown.

Stage 3 — Platform mediation (days 7–14)

A trained mediator reviews the evidence against the contract terms and issues a non-binding recommendation within 3–5 business days: full release, full refund, partial split, or revision with a new deadline — explained with reference to the specific contract clause it's based on.

Stage 4 — Acceptance or arbitration (day 14+)

If both parties accept, funds move accordingly and the case feeds both users' accountability scores. If either rejects it, either side may file for arbitration; the platform hands over the full evidence bundle already assembled in Stage 2\. Arbitration typically concludes in 30–60 days.

Dispute-resolution method comparison

| Resolution Method | Deciding Party | Binding Status | SLA/Timeline | Cost Overhead |
| :---- | :---- | :---- | :---- | :---- |
| Direct Negotiation | Freelancer & Client | Yes (Consensual) | 0–7 Days | Zero |
| Platform Mediation | Platform Moderator | Non-Binding | 7–14 Days | Very Low |
| AACCSA Arbitration | Sole Arbitrator | Final & Binding | 30–60 Days | Moderate |

Important: if a dispute is recharacterized as an employment relationship, it falls under labor-court jurisdiction, and any arbitration award may be set aside — the contract's independent-contractor clauses (Part III, Clause 1\) exist specifically to prevent this.

# **PART V — TECHNICAL & OPERATIONS**

## 20.0 Payment Integration

Telebirr (Ethio Telecom) — the leading mobile money service. Integrate via API: merchant ID/API key, callback URL, payment request, redirect to Telebirr's payment page, receive status via callback. USSD (\*127\#) extends reach to non-smartphone users.

Risk Note: Telebirr API documentation is not publicly available; onboarding requires direct engagement with Ethio Telecom.

CBE Birr — accept via bank transfer today, with an API integration path to follow.

EthSwitch — the national interoperability switch, enabling interbank transfers (which may simplify future integrations) so clients can pay from any domestic bank account.

Other wallets — M-PESA (Safaricom Ethiopia), HelloCash (NMB), Amole (Dashen) — increasingly interoperable via EthSwitch.

Aggregator vs. direct integration

Using Chapa as an aggregator covers Telebirr, CBE Birr, cards, and bank transfer behind one API — the fastest path to launch.

If not using an aggregator, two separate tracks are needed: Telebirr via direct API integration (merchant ID, callback URL, redirect flow), and CBE via direct bank transfers into a Bank Custodian Account held in the platform's name, pending a formal CBE API path.

Either way, gateways only process payment — they don't provide escrow logic. The backend must independently track deposited funds through three explicit stages: Payment Pending → Escrow Held → Released / Refunded.

On the frontend: a clear UI lets the client choose a payment method (Telebirr Pay, QR code, or CBE bank transfer) at contract start; once funds are deposited, the system marks the project “Funded” and work can begin.

## 21.0 Technical & UX Implementation Checklist

APIs — Telebirr and bank integrations, tested in sandbox before going live.

Escrow logic — the Pending → Held → Released/Refunded state machine, with automated release if the client takes no action within the acceptance window.

User interface — clear status indicators (“Escrow Paid,” “Awaiting Release,” “Dispute Raised”), explicit “Accept & Release” and “Raise Dispute” actions, visible countdown timers.

Smart contracts / blockchain — no Ethiopian legal framework yet for crypto-based escrow; stick to fiat rails for now.

Security — a real audit and penetration test, secure secret storage, HTTPS/secure cookies, input validation, API rate-limiting.

Logging & auditing — immutable logs of every transaction, status change, and dispute communication, usable as evidence if a case escalates to arbitration.

Compliance tooling — KYC data-collection forms, document upload, KYC-status tagging, and a hard block on withdrawals/profile changes until KYC clears.

The Telegram front-end — given how much Ethiopian freelance work already happens on Telegram, a Telegram bot as a parallel front-end reduces data costs and meets users where they already are, while the backend still runs the full contract and escrow logic informal groups lack.

## 22.0 Platform Governance & Trust

Identity verification — enforce KYC, flag duplicate accounts, require 2FA, award a “Verified” badge on completion.

Moderation — forbid illegal, infringing, or unethical services; actively monitor listings and communications; give users a reporting mechanism.

Rating & reviews — a double-blind rating system limited to completed, escrow-funded jobs to prevent manipulation.

Fraud prevention — escrow-first rules, logs to catch patterns like one person acting as both freelancer and client, and a trust score or longer escrow hold for new accounts.

Customer support — responsive support for disputes and questions, plus published FAQs on how escrow and disputes work.

Transparency — publish statistics on dispute outcomes and platform uptime/security; community-building reinforces trust over time.

Technical and Operations (Cont.)

## 23.0 Go-to-Market and Launch Roadmap

Target customers

In-demand digital skills first — web/app development, graphic design, digital marketing — consistent with the narrowed category decision in Part I, Section 9\.

Tech graduates and freelancers concentrated in Addis Ababa and other major cities; local SMEs/startups as the first client base.

Marketing

Partner with universities and coding schools to recruit freelancers; collaborate with the ICT Taskforce or Ministry of Innovation; social media campaigns (Facebook, LinkedIn) and webinar demos showing escrow protection; referral bonuses for early adopters.

Pilot launch

Beta in one sector or city; collect feedback specifically on the payment and dispute process; iterate the UI; expand categories one at a time.

Roadmap phases

| Phase | Key milestones | Duration |
| :---- | :---- | :---- |
| Phase 0 — Foundations | Confirm launch subcategories; lock take-rate % and split; finalize escrow architecture (blocks everything else) | Immediate |
| Phase 1 — Legal & regulatory (0–30 days) | Engage a law firm; register the business entity; file as data controller with the ECA | 0–30 days |
| Phase 2 — Core development (30–90 days) | KYC status tracking (OCR \+ liveness); Telebirr/bank API integration; escrow module; frontend status UI | 30–90 days |
| Phase 3 — Operational maturity (90–180 days) | DPO role established; security audit and penetration test; 72-hour breach protocol formalized; AML monitoring automated | 90–180 days |
| Phase 4 — Testing & launch | Beta testing; feedback iteration; public launch prep; launch | Following Phase 3 |

The platform solves Ethiopia's trust deficit in freelance work by guaranteeing delivery or refund through enforceable contracts and escrow.

Technical and Operations (Cont.)

## 24.0 Open Decisions for the Next Draft

Confirm the final 4–6 launch subcategories out of the full list in Part I, Section 9\.

Engage a law firm with Part III (contract clauses) and Part II, Section 15 (open legal questions) as their brief.

Confirm AACCSA's current name and rules directly, and default the arbitration clause to it, pending the comparison against ECCSA/EACC.

Lock the take-rate percentage and split for launch (proposed: 10%, split 5%/5%).

Decide the escrow architecture to build first — in-platform wallet, bank custodian account, or third-party escrow — and whether to use Chapa as an aggregator or integrate Telebirr/CBE directly.

Resolve the 2024 AML Proclamation's final gazetted number with counsel before it's cited in any published policy.

Determine whether current processing volume triggers the mandatory DPO appointment, and complete ECA data-controller registration.

Quarterly KYC refresh for high-risk users | Owner: Compliance | Deadline: Quarterly | Blocking Risk: Stale KYC; AML violation

Annual DPIA review | Owner: DPO | Deadline: Annually | Blocking Risk: PDPP Art. 33 violation

Bi-annual penetration testing | Owner: Security | Deadline: Semi-annually | Blocking Risk: Undetected vulnerabilities

Monthly STR/CTR reporting to FIC | Owner: Compliance Officer | Deadline: Monthly | Blocking Risk: Regulatory reporting failure

Annual ECA registration renewal | Owner: Compliance | Deadline: Annually | Blocking Risk: Loss of lawful processing status

Continuous monitoring of regulatory updates (NBE, ECA, FIC, Ministry of Justice) | Owner: Legal/Compliance | Deadline: Ongoing | Blocking Risk: Missed law changes; non-compliance

Annual security audit \+ certification review | Owner: Security | Deadline: Annually | Blocking Risk: Compliance drift

Quarterly vendor security assessments (Chapa, cloud, Fayda) | Owner: Security/Procurement | Deadline: Quarterly | Blocking Risk: Third-party risk

Annual Register of Processing Activities review & update | Owner: DPO | Deadline: Annually | Blocking Risk: PDPP violation

Quarterly data retention audit: purge expired non-AML data, verify WORM integrity | Owner: Compliance/Engineering | Deadline: Quarterly | Blocking Risk: Retention violations  

Architecture Comparison Matrix

| Model × Integration | Legal Risk | Implementation | Trust | Cost | Speed | Disputes | Scalability |
| :---- | :---- | :---- | :---- | :---- | :---- | :---- | :---- |
| In-Wallet \+ Chapa | Very High — needs PSP license | Very Complex | Moderate | Low/Medium | Moderate | Self-managed | Moderate |
| In-Wallet \+ Telebirr Direct | Very High | Very Complex | Moderate | Low | Fast | Self-managed | Moderate |
| Bank Custodian \+ Chapa | Medium | Moderate | High | Medium | Medium | Bank/PSP managed | High |
| Bank Custodian \+ CBE Direct | Medium | Moderate | High | Low | Fast | Manual/bank process | High |
| 3rd-Party PSP (Chapa Escrow) | Low | Low | High | High | High | PSP-managed | High |
| 3rd-Party PSP \+ Telebirr/CBE | Low | Low | High | High | High | PSP-managed | High |

DPO Engagement Model Comparison

| Model | Cost (ETB/yr) | Independence | Expertise | Speed to Appoint | Best For |
| :---- | :---- | :---- | :---- | :---- | :---- |
| Fractional — Law Firm | 600,000–1,200,000 | High | Privacy \+ Ethiopian law | 1–2 weeks | Pre-Series A |
| Fractional — Specialist | 400,000–800,000 | High | Privacy-specific | 1 week | Cost-optimized |
| In-House — Hire | 1,500,000–3,000,000+ | Medium | Build over time | 2–3 months | Post-Series A |
| Hybrid | 500,000–1,000,000 | High | Balanced | 2 weeks | Recommended |

Register of Processing Activities (ROPA)

| Activity | Data Categories | Purpose | Legal Basis | Retention | Recipients |
| :---- | :---- | :---- | :---- | :---- | :---- |
| User Registration & KYC | Name, ID, biometric, phone | Verification | Legal/Contract | 10 years | Fayda, FIC |
| Payment Processing | Bank info, wallet ID | Escrow | Contract | 10 years | Chapa, CBE, Bank |
| Dispute Resolution | Communications, notes | Arbitration | Contract | 10 years | AACCSA, FIC |
| Communications | Content, metadata | Notifications | Consent | 30 days | Email/SMS |
| Analytics | Usage, performance | Improvement | Legitimate interest | 2 years | Internal |
| Regulatory Reporting | STR logs, audit records | Compliance | Legal obligation | 10 years | FIC, NBE, ECA |

Compliance Budget Summary

| Item | Frequency | Estimated Cost (ETB) | Notes |
| :---- | :---- | :---- | :---- |
| Fractional DPO | Monthly | 600,000–1,200,000 | 12 months |
| ECA Registration Fee | One-time | 10,000–20,000 | Confirm current |
| Legal Fees | One-time | 200,000–500,000 | External counsel |
| Annual ECA Renewal | Annual | 10,000–20,000 | Year 2+ |
| Penetration Testing | Bi-annual | 150,000–300,000 | External firm |
| DPIA | Annual | 100,000–200,000 | If high-risk |
| Staff Training | Quarterly | 50,000–100,000 | DPO-led |
| Total Year 1 |  | \~1,120,000–2,320,000 | Excludes eng. security |

