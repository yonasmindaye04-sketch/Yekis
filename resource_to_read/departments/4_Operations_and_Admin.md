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

## 3. Implemented Support & Payment-Ops Tooling (Current State)
*   **In-app support chat (LIVE):** The `SupportChat` workspace component connects users directly to Yekis staff ("Typically replies in a few minutes") with full message persistence — this replaces external WhatsApp/Telegram DMs for support and keeps conversations inside the auditable platform.
*   **Payment exception review:** Escrow funding transactions stuck in PENDING for more than 3 hours are automatically excluded from the reconciliation sweep and surface for **manual Ops follow-up** (user likely never completed Telebirr checkout). Everything younger settles automatically — no manual verification needed.
*   **Manual wallet top-ups remain a manual flow:** `WalletTopUp` requests (receipt photo + reference number) require staff approval/rejection — distinct from API-funded milestones, which settle via verified webhooks only.
*   **Telegram ops endpoints:** `/api/v1/bot/telegram/start-polling` now correctly returns an error when `TELEGRAM_BOT_TOKEN` is unconfigured (previously reported false success). Configure the token before enabling bot-based support intake.

## 4. Operations Updates (Latest Pass)
*   **Top-up receipts now flow end-to-end:** receipt uploads require the MinIO bucket (OBJECT_STORE_BUCKET) to exist - it was created for the dev environment (marketplace-dev). New-environment checklist item: create the bucket before accepting top-ups or KYC documents.
*   **Registration consent gate:** users cannot create accounts without accepting T&C/Privacy - support should direct sign-in issues from users who ticked-but-didn-t-submit to simply retry.
*   **Password reset is live:** reset emails deliver via SMTP once SMTP_* env vars are set; the email deep-links into the in-app reset form. Without SMTP configured the backend logs the email content to the console (dev only).
*   **Social sign-in support notes:** users signing in with Google/Apple/Facebook have no platform password initially - password reset via email is the path to set one. Provider link conflicts (social identity already bound to another account) return a clear error to the user; escalate to Admin if a legitimate user is blocked.
