# Master Freelance Service Agreement (የነፃ ስራ ውል ስምምነት)

**This Master Freelance Service Agreement ("Agreement") is executed digitally by and between the Client and the Freelancer (collectively, the "Parties") upon mutual acceptance of a project bid on the Ethiopian Freelance Marketplace ("Platform").**

### PREAMBLE
WHEREAS, the Client requires certain professional, digital, or technical services as detailed in the Job Posting and Schedule A; and
WHEREAS, the Freelancer possesses the professional qualifications, technical skills, and equipment necessary to perform such services and desires to provide them as an independent contractor; and
WHEREAS, the Platform Operator (Ethiopian Freelance Marketplace PLC) acts as a neutral transaction-orchestration venue and payment facilitator to manage the contractual and escrow flows under this Agreement;
NOW, THEREFORE, in consideration of the mutual covenants, terms, and conditions herein, the Parties agree as follows:

---

## 1. INDEPENDENT CONTRACTOR STATUS & JURISDICTIONAL BOUNDARIES
1.1 **Genuine Independence:** The Freelancer acknowledges and agrees that they are engaged by the Client solely as an independent contractor ("contract of services" under Articles 2610–2631 of the Civil Code of Ethiopia) and not as an employee, agent, partner, or joint venture of the Client or of the Platform Operator.
1.2 **No Employment Relationship:** Nothing in this Agreement shall be construed to create an employment relationship for any purpose whatsoever, and the Parties explicitly agree that the Labour Proclamation No. 1156/2019 does not apply to this relationship.
1.3 **Autonomy and Control:** The Freelancer retains absolute and sole discretion over the manner, timing, methods, and physical location in which the services are performed, subject only to the deliverable specifications agreed in Schedule A. The Client shall not directly supervise or direct the Freelancer's day-to-day work.
1.4 **Tools and Equipment:** The Freelancer is solely responsible for providing all hardware, software, licenses, internet access, and workspace required to perform the services under this Agreement.
1.5 **Non-Exclusivity:** This relationship is strictly non-exclusive. The Freelancer maintains the unrestricted right to serve multiple clients, run their own independent business, and bid on other projects simultaneously.
1.6 **No Authority to Bind:** The Freelancer has no authority, express or implied, to enter into contracts, assume obligations, or make representations on behalf of the Client or the Platform Operator.

---

## 2. SCOPE OF WORK, DELIVERABLES, & QUALITY STANDARDS
2.1 **Schedule A Specifications:** The Freelancer shall deliver the specific digital or professional assets described in **Schedule A** (the "Deliverables"). To prevent scope creep, Schedule A must detail file formats, resolution, quantity, and specific handover materials (e.g., source files, documentation).
2.2 **Professional Diligence:** The Freelancer shall perform the services with professional diligence, meeting the standard of care customary in their industry.
2.3 **On-Platform Requirement:** All project-related communications, files, and milestones must be exchanged exclusively through the Platform's encrypted messaging and submission systems to maintain an audit trail.

---

## 3. SCHEDULE, MILESTONES, & PAYMENT ARCHITECTURE (ESCROW)
3.1 **Milestone Schedule B:** The services shall be divided into milestones as specified in the **Milestone Payment Table (Schedule B)**.
3.2 **Upfront Escrow Funding:** The Client must deposit 100% of the funds for each milestone (including the gross milestone fee plus any platform add-on fees) into the Platform's ring-fenced escrow custodian account before the Freelancer is authorized to begin work on that milestone.
3.3 **No Unfunded Work:** The Freelancer must not commence work on any milestone until they receive a system notification that the milestone escrow is **"ESCROW_HELD"**. The Client agrees that the platform operates on a "no-payment, no-work" protection mechanism.
3.4 **Escrow State Machine:** Escrowed funds shall move strictly according to the platform's state machine: `PAYMENT_PENDING` -> `ESCROW_HELD` -> `SUBMITTED_FOR_REVIEW` -> `ACCEPTED` / `DISPUTED` -> `RELEASED` / `REFUNDED`.

---

## 4. REVIEW PERIOD, REVISIONS, & DEEMED ACCEPTANCE
4.1 **Client Inspection Window:** Upon deliverable submission, the milestone state changes to `SUBMITTED_FOR_REVIEW`, starting a strict **five (5) business days / seven (7) calendar days** inspection window.
4.2 **Acceptance or Revision:** Within this inspection window, the Client must either:
*   (a) Approve the deliverable, which triggers immediate, irrevocable release of escrow funds to the Freelancer.
*   (b) Request revisions that align with the original scope of Schedule A.
*   (c) Raise a formal dispute through the Platform interface.
4.3 **Revision Limits:** The Freelancer agrees to provide up to two (2) rounds of reasonable revisions, provided they conform to the original specifications in Schedule A. Any request for material changes or additional assets constitutes "scope expansion" and requires a new contract or an agreed price adjustment.
4.4 **Deemed Acceptance (Auto-Release):** If the Client fails to approve, request revisions, or raise a dispute within the inspection window, the deliverable is contractually "deemed accepted." An automated background task will release the escrowed funds to the Freelancer.

---

## 5. INTELLECTUAL PROPERTY RIGHTS & WORK-FOR-HIRE DYNAMICS
5.1 **Conditional Assignment:** The Agreement is structured as a work-for-hire assignment under the Copyright and Neighboring Rights Protection Proclamation No. 410/2004 (as amended by No. 872/2014). The irrevocable transfer of all copyrights, trademark rights, and intellectual property in the Deliverables occurs **ONLY AND EXCLUSIVELY** upon the complete release of the milestone escrow funds to the Freelancer.
5.2 **Retention of Ownership:** Until payment is released in full, the Freelancer retains absolute ownership of all intellectual property in the work. The Client is legally prohibited from using, modifying, publishing, or distributing any unreleased deliverables.
5.3 **Pre-Existing Materials:** The Freelancer retains ownership of all tools, source libraries, templates, or methodologies owned prior to the project ("Pre-Existing Materials"). The Freelancer grants the Client a perpetual, royalty-free, non-exclusive license to use Pre-Existing Materials solely as integrated into the final Deliverables.

---

## 6. PLATFORM COMMISSIONS & STATUTORY TAX WITHHOLDING
6.1 **Platform Commission:** The Platform Operator automatically deducts a 10% total commission (split as 5% client fee add-on and 5% freelancer payout deduction) upon escrow release.
6.2 **Withholding Tax Agent (ERCA Compliance):** Pursuant to the Income Tax Proclamation No. 979/2016, for any milestone payout of **10,000 ETB or more**, the Platform Operator, as a registered withholding agent, must deduct tax at source:
*   **With TIN:** 3% withholding tax.
*   **Without TIN:** 30% withholding tax.
6.3 **Tax Remittance:** The Platform Operator remits all withheld taxes to the Ministry of Revenues monthly and issues a digital withholding tax certificate to the Freelancer.
6.4 **VAT Obligation:** The platform's commission is subject to a 15% VAT, which is tracked as a platform liability and is never deducted from the freelancer’s contractual payout.

---

## 7. CONFIDENTIALITY & "PERMITTED DISCLOSURE" WAIVER
7.1 **Mutual Confidentiality:** Each party agrees to keep secret all non-public business, financial, or technical information of the other party encountered during the project.
7.2 **Secrecy of Messages Waiver:** Under the Electronic Transactions Proclamation No. 1205/2020, electronic communications are highly protected. The Parties explicitly waive absolute message secrecy for all communications conducted on the Platform, designating the Platform Operator's dispute mediators as authorized recipients of chat logs and file metadata solely to resolve disputes.
7.3 **Survival:** Confidentially obligations shall survive the termination of this Agreement for a period of three (3) years.

---

## 8. LIMITATION OF LIABILITY & INDEMNIFICATION
8.1 **Consequential Damages Exclusion:** Neither party, nor the Platform Operator, shall be liable to the other for any indirect, incidental, special, or consequential damages, including loss of profits, revenue, or data.
8.2 **Liability Cap:** The Freelancer's maximum aggregate liability to the Client for any breach, negligence, or indemnity claim under this Agreement is strictly capped at the total fee actually paid to the Freelancer under this specific contract.
8.3 **Marketplace Neutrality:** The Parties agree to indemnify and hold harmless the Platform Operator against any claims, losses, or legal costs arising from a breach of this Agreement by either party.

---

## 9. SUSPICIOUS ACTIVITY MONITORING & COMPLIANCE
9.1 **Transaction Monitoring:** The Platform's automated Transaction Monitoring System (TMS) actively scans transactions for financial anomalies (e.g., structuring, rapid velocity, pass-through transfers) under the **Prevention and Suppression of Money Laundering and Financing of Terrorism Proclamation No. 1387/2025**.
9.2 **FIC Reporting:** The Compliance Officer is legally required to freeze suspicious accounts and file a Suspicious Transaction Report (STR) with the Financial Intelligence Center (FIC) within 24 hours of confirmation. The Parties agree to cooperate with such regulatory holds.

---

## 10. MULTI-STAGE DISPUTE RESOLUTION PROTOCOL
10.1 **Mandatory Path:** In the event of a dispute regarding deliverable quality, deadlines, or payment, the Parties must attempt to resolve the issue strictly through the following tiered process before filing for external arbitration:
*   **Stage 1 - Direct Negotiation (Days 0–7):** The parties must engage in a structured resolution thread inside the Platform chat to align expectations against Schedule A.
*   **Stage 2 - Evidence Compilation:** If negotiation fails, the system auto-compiles an immutable evidence package consisting of the digital contract PDF, file SHA-256 hashes, upload timestamps, and platform chat history. External communications (e.g., Telegram DMs, WhatsApp) are strictly excluded from evidence.
*   **Stage 3 - Platform Mediation (Days 7–14):** An assigned platform mediator reviews the compiled evidence package against the contract terms and issues a non-binding recommendation (e.g., refund, split release, or final revision).

---

## 11. BINDING ARBITRATION & CASSATION BENCH WAIVER
11.1 **AACCSA Institutional Arbitration:** If platform mediation is rejected, the dispute shall be finally settled by binding arbitration in accordance with the Arbitration and Conciliation Proclamation No. 1237/2021.
*   **Arbitral Institution:** The Addis Ababa Chamber of Commerce and Sectoral Associations Arbitration Institute (AACCSA).
*   **Arbitrator:** A sole arbitrator appointed under AACCSA rules.
*   **Seat and Governing Law:** Addis Ababa, Ethiopia. The governing law is the laws of the Federal Democratic Republic of Ethiopia.
*   **Language:** English and/or Amharic.
11.2 **CASSATION COURT WAIVER:** Pursuant to **Article 49(2) of Proclamation No. 1237/2021**, the Parties **EXPRESSLY AND IRREVOCABLY WAIVE ANY RIGHT TO SEEK CASSATION REVIEW** before the Federal Supreme Court Cassation Bench on the grounds of a "fundamental error of law." The arbitral award shall be final, binding, and subject only to the narrow setting-aside grounds under Article 47.
11.3 **New York Convention Enforcement:** This arbitration clause is enforceable under the 1958 New York Convention, which Ethiopia acceded to via Proclamation No. 1184/2020, ensuring enforceability against diaspora or foreign clients.

---

## 12. IMMUTABLE RECORD RETENTION & WORM STORAGE
12.1 **10-Year Hold Mandate:** Under the Prevention and Suppression of Money Laundering Proclamation No. 1387/2025 and NBE Directive FIS/04/2021, the Platform Operator must store all user identities (KYC), transactions, contract PDFs, and dispute communications in Write Once Read Many (WORM) storage for a **minimum of ten (10) years** following transaction completion or account closure.
12.2 **Sovereignty Compliance:** In accordance with the Personal Data Protection Proclamation No. 1321/2024, all personal data must be stored on local servers within the territory of Ethiopia (Ethio Telecom Cloud or Safaricom Ethiopia).

---

## 13. LANGUAGE & DIGITAL ACCEPTANCE
13.1 **Digital Signature:** Pursuant to the Electronic Transactions Proclamation No. 1205/2020, clicking "I Accept" on this contract constitutes a legally binding electronic signature. The contract is immediately timestamped, hashed, and stored immutably.
13.2 **Authoritative Version:** This contract is drafted in English. If a certified Amharic translation is required by an Ethiopian court or AACCSA tribunal for enforcement, the English version shall remain the authoritative standard for interpretation.

---

## SCHEDULE A: DELIVERABLES SPECIFICATION (ናሙና መርሃ-ግብር ሀ)
*(To be completed by the client and freelancer at the point of hire)*

*   **Project Category:** [e.g., Web Development / Graphic Design]
*   **Deliverable 1 Description:** [Detailed text of the asset to be created]
*   **File Formats Required:** [e.g., .SVG, .PNG, source .PSD, Figma Link]
*   **Technical Specifications:** [e.g., responsive design, specific screen widths, print resolution]
*   **Quantity:** [Number of assets]
*   **Handover Documentation:** [e.g., deployment guide, system architecture manual]

---

## SCHEDULE B: MILESTONE PAYMENT TABLE (ናሙና መርሃ-ግብር ለ)
*(To be populated automatically by the system)*

| Milestone ID | Key Deliverable / Stage | Gross Payment (ETB) | Review Window | Escrow Trigger | Payout Deductions |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MS-01** | UI Wireframes & Mockups | 20,000 ETB | 5 Business Days | Initial Deposit | Withholding Tax + Commission |
| **MS-02** | Complete Assets & Handover | 30,000 ETB | 5 Business Days | Written Approval | Withholding Tax + Commission |

---

## LOCAL LANGUAGE SYNTHESES (አካባቢያዊ ቋንቋዎች ማጠቃለያ)

### አማርኛ (AMHARIC)
*ይህ ውል በደንበኛው እና በነፃ ስራ ተቋራጩ መካከል የሚደረግ ህጋዊ ስምምነት ነው። በፍትሐ ብሔር ሕግ ቁጥር 2610-2631 መሠረት ይህ ግንኙነት የስራ ቅጥር ሳይሆን የነፃ ስራ ውል ነው። በዋናነት የአገልግሎት ክፍያው በመያዣ ሂሳብ (Escrow) ውስጥ የሚቀመጥ ሲሆን ስራው በተገቢው ሁኔታ ተጠናቆ ሲረከብ ወይም በ5 የስራ ቀናት ውስጥ ደንበኛው ምላሽ ካልሰጠ ገንዘቡ ወዲያውኑ ለባለሙያው ይለቀቃል። በታክስ አዋጅ ቁጥር 979/2016 መሠረት ከ10,000 ብር በላይ ለሆኑ ክፍያዎች የግብር መያዣ (3% ወይም 30%) ተቀናሽ ይደረጋል። አለመግባባቶች ሲፈጠሩ በአዲስ አበባ ንግድና ዘርፍ ማህበራት ምክር ቤት (AACCSA) በሽምግልና ዳኝነት የሚፈቱ ሲሆን፤ በአዋጅ ቁጥር 1237/2021 አንቀጽ 49(2) መሠረት ተዋዋይ ወገኖች በፌደራል ጠቅላይ ፍርድ ቤት ሰበር ሰሚ ችሎት ላይ የሰበር አቤቱታ የማቅረብ መብታቸውን በፈቃደኝነት ትተዋል።*

### OROMOO (AFAN OROMO)
*Waliigalteen kun kofaltoo dhuunfaa (independent contractor) fi maamilicha gidduutti kan raawwatamudha. Labsii Hojjataa fi Hojjechiisaa lakk. 1156/2019 malee seera siviilii Keewwata 2610-2631 irratti kan hundaa'edha. Kafaltiin hundi kuusaa wabii (Escrow) keessa kan taa'u yoo ta'u, hojiin dhiyaatee guyyoota hojii 5 keessatti yoo maamilichi hin mirkaneessin kafaltiin kofaltoo dhuunfaaf ni gadi lakkifama. Kafaltii qarshii 10,000 olii irratti gibirri (3% ykn 30%) ni hir'ifama. Waldhabbiin yoo uumame araara fi dhumarratti dhimma kana dhimma araaraa AACCSA jalatti xumurama. Labsii lakk. 1237/2021 keewwata 49(2) irratti hundaa'uun, mirgi iyyannoo mana murtii kassaasiitti dhiyeeffachuu dhiifameera.*

### ትግርኛ (TIGRIGNA)
*እዚ ውል ስምምነት ኣብ መንጎ ዓማዊን ናጻ ተቋራጺ ስራሕን ዝግበር ሕጋዊ ስምምነት እዩ። ብመሰረት ሰቪል ኮድ ቁፅሪ 2610-2631 እዚ ርክብ ናጻ ስራሕ እምበር ናይ ቅጥር ስራሕ ኣይኮነን። ክፍሊት ብውሑስ ሕሳብ (Escrow) ዝተታሕዘ ኮይኑ፡ እቲ ስራሕ ተጠናቒቁ ክረከብ ከሎ ወይ ዓማዊ ብሰንኪ ዘይምላሹ ኣብ ውሽጢ 5 መዓልትታት ስራሕ ብኣውቶማቲክ ንባለሙያ ይለቀቕ። ብመሰረት ሕጊ ግብሪ ቁፅሪ 979/2016 ካብ 10,000 ብር ንላዕሊ ንዝኾኑ ክፍሊታት ግብሪ (3% ወይ 30%) ተቀናሽ ይግበር። ዘይምርድዳእ ክመጽእ ከሎ ብሽምግልና ዳኝነት ቤት ምኽሪ ንግድን ዘፈር ማሕበራትን ኣዲስ ኣበባ (AACCSA) ዝፍታሕ ኮይኑ፤ ብመሰረት ኣዋጅ ቁፅሪ 1237/2021 ዓንቀጽ 49(2) ተዋዋእቲ ወገናት ናብ ፈደራል ጠቕላይ ቤት ፍርዲ ሰበር ሰሚ ኽኢላ ናይ ምቕራብ መሰሎም ብፍቓዶም ገዲፎም እዮም።*
