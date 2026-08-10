# Development & Engineering Department

This document contains all sections from the original legal design and compliance roadmap that dictate technical architecture and features for the Development & Engineering Department.

## 1. Must-Have Resources, Tools & Roles

To successfully build and maintain the platform's escrow, compliance, and core features, the Development & Engineering department MUST HAVE the following:

### A. Key Personnel (Roles)
*   **System Architect / Lead Backend Engineer:** To design the state machine for the escrow logic and ensure the WORM storage compliance.
*   **Frontend/Mobile Developers:** Focused on building lightweight, responsive UIs (e.g., using React/Next.js) tailored for low-bandwidth, Telegram-first users.
*   **DevSecOps Engineer:** Dedicated to managing the local Ethiopian cloud infrastructure, handling encryption, and configuring ECA-compliant backups.
*   **QA/Testing Engineer:** To build automated tests for payment edge-cases and manual testing of the dispute flows.

### B. Core Technology Stack (Recommended)
*   **Frontend:** React, Next.js, or Vue (optimized for minimal bundle size).
*   **Backend:** Node.js, Go, or Python (Django/FastAPI) capable of high concurrency for payment webhooks.
*   **Database:** PostgreSQL (with auditing extensions like `pgaudit` to support the 10-year immutable WORM requirements).
*   **Infrastructure:** Local Ethiopian cloud providers (Ethio Telecom Cloud, Safaricom Ethiopia) to strictly comply with PDPP Art. 22 data localization.

### C. Critical API Credentials & Third-Party Tools
*   **Fayda ID API Access:** Essential for the automated KYC verification layer.
*   **Payment Gateway Sandbox Keys:** Developer accounts for Telebirr, Chapa, and CBE API to build the escrow logic before touching real money.
*   **Monitoring & Security:** Sentry (or similar) for error tracking, and automated rate-limiting middleware to prevent API abuse.

## 2. Payment Integration (Money Layer)
*   **Telebirr (Ethio Telecom):** Leading mobile money service. Integrate via API (merchant ID, callback URL, status webhooks). Supports USSD (*220#) for non-smartphone users.
*   **CBE Birr:** Integrate via Commercial Bank of Ethiopia API.
*   **Other Wallets & Banks:** EthSwitch interoperability (M-PESA, HelloCash, Amole). Monitor NBE updates for direct bank transfer API access.
*   **Architecture:** Use HTTPS, validate callback signatures, transparently display local transaction fees (e.g., Telebirr 0.5% charge).

## 3. Technical & UX Implementation Checklist
*   **Escrow Logic (Core Feature):** Track projects through states: `Payment Pending` → `Escrow Held` → `Released / Refunded`. Requires an automated cron job to release funds if the client takes no action within the acceptance window (e.g., 5 days).
*   **APIs:** Test Telebirr and bank integrations against sandbox environments.
*   **User Interface:** Clear status indicators ("Escrow Paid", "Awaiting Review"), explicit "Accept & Release" / "Raise Dispute" actions, countdown timers for acceptance deadlines.
*   **Security:** Conduct security audits, secure secret storage, secure cookies, input validation, and API rate-limiting. Strong encryption at rest and in transit.
*   **Logging & Auditing:** Immutable logs of every payment transaction, status change, and dispute communication for arbitration officers.

## 4. Integrated Compliance Architecture
The platform requires a sophisticated technical pipeline to handle both KYC/AML and Data Privacy (PDPP).

### 4.1 KYC Workflow Integration
*   Implement a **Hard Block** system: Unverified users cannot withdraw funds, change profiles, bid on projects, or receive payments.
*   Integrate ID Upload + Liveness Check (OCR/Biometric), preferably integrating with **Fayda ID** verification APIs.
*   Assign platform-wide Unique Customer IDs to link all user accounts and transactions.

### 4.2 Transaction Monitoring System (TMS)
*   Build automated monitoring for AML red flags:
    *   Structuring (multiple small payments just under threshold)
    *   Velocity (abnormal frequency of jobs)
    *   Pass-through (funds deposited and immediately withdrawn without work)
    *   Wallet mismatches
*   Flag suspicious activity for internal compliance review (to file STR to FIC within 24 hours).

### 4.3 Data Localization & Storage Infrastructure
*   **Primary Database (Ethiopia):** Web servers, primary database, and file store (KYC docs, messages, contracts) must be hosted on Ethiopian servers (e.g., Ethio Telecom Cloud, Safaricom Ethiopia) to comply with PDPP Art. 22.
*   **Backups:** Cross-border backups (AWS/GCP/Azure) are highly restricted and require encrypted backups with ECA-approved Standard Contractual Clauses (SCCs).
*   **WORM Storage:** Database architecture must support Write Once Read Many (WORM) storage for compliance records. All KYC and transaction data must be retained immutably for **10 years**.
*   **Data Erasure Tools:** Build tooling to handle user deletion requests by wiping marketing/chat data but securely preserving AML transaction data.
