# Operations & Admin Department

This document contains all sections from the original legal design and compliance roadmap that are the direct responsibility of the Operations & Admin Department.

## 1. Platform Governance & Trust
*   **Identity Verification:** Enforce KYC, flag duplicate accounts, require 2FA, and award a "Verified" badge once KYC is complete. Manually review documents that fail automated verification.
*   **Moderation:** Explicitly forbid illegal, infringing, or unethical services. Actively monitor listings and communications to ensure adherence to ToS.
*   **Fraud Prevention:** Enforce escrow-first rules (no work release before payment, and vice versa). Monitor logs to catch patterns like the same person acting as both freelancer and client. Apply longer escrow holds for suspicious new accounts.
*   **Rating & Reviews:** Manage the double-blind rating system, ensuring reviews are strictly limited to completed, escrow-funded jobs to prevent manipulation.
*   **Customer Support:** Provide responsive support (live chat/helpdesk) for disputes and questions. Maintain published FAQs. Ensure transparency by publishing statistics on dispute outcomes and platform uptime.

## 2. In-App Dispute & Mediation Flow
The Operations team manages the platform's internal dispute resolution to ensure most cases never leave the app.
*   **Stage 0 (Prevention):** Every job is created from templates. All work communication must stay inside the platform. Milestones auto-release if the client takes no action.
*   **Stage 1 (Direct Negotiation - Days 0-7):** When a milestone is rejected or non-payment flagged, the app opens a structured form. Both sides have up to 7 days to resolve it directly.
*   **Stage 2 (Evidence Submission):** If unresolved, the system automatically pulls contract terms, delivered files, and message logs. The dispute is categorized (e.g., non-delivery, scope creep, non-payment).
*   **Stage 3 (Platform Mediation - Days 7-14):** A trained mediator (a human, initially) reviews the evidence against the contract terms and issues a non-binding recommendation within 3-5 days. The recommendation is explained referencing specific contract clauses.
*   **Ongoing Accountability:** Track dispute frequency per user. Chronic disputing, even when "won", signals a bad actor. Establish a path of consequences: Warning → Restricted Account → Suspension.
