# Telebirr Payment Integration

This document provides a comprehensive, start-to-finish guide on how the Telebirr payment integration works in the Yekis platform. It details the architecture, the specific files involved, the cryptographic signing process, and the webhook handling.

---

## 1. High-Level Overview

Yekis uses the **Telebirr C2B Web Checkout** API. When a user needs to pay (e.g., funding a milestone or adding money to their wallet if that path is re-enabled), the flow is:

1. **Authentication:** The backend requests a short-lived "Fabric Token" from Telebirr.
2. **Pre-Order:** The backend sends a pre-order request to Telebirr with the payment details (amount, order ID, etc.) and signs it using RSA-PSS.
3. **Checkout URL:** Telebirr returns a `prepay_id`. The backend constructs a Web Checkout URL using this ID and signs it again.
4. **User Redirection:** The frontend redirects the user's browser to the Web Checkout URL. The user logs into Telebirr and authorizes the payment.
5. **Webhook:** Telebirr asynchronously sends an HTTP POST webhook to our backend to confirm the payment was successful. The backend verifies the signature on this webhook to ensure it actually came from Telebirr, and then updates the database.

---

## 2. File Structure

All Telebirr-specific logic is isolated in the backend's escrow module to keep the core business logic clean.

### Core Files

*   **`apps/backend/src/modules/escrow/providers/telebirr.client.ts`**
    *   **Purpose:** The main orchestrator. It implements the `PaymentProviderClient` interface.
    *   **What it does:** It handles the `initiatePayment` function (steps 1, 2, 3, and 4 above) and the `verifyWebhookSignature` function (step 5).
*   **`apps/backend/src/modules/escrow/providers/telebirr.token.ts`**
    *   **Purpose:** Manages the Fabric Token required by Telebirr.
    *   **What it does:** Fetches a new token from Telebirr using the `TELEBIRR_FABRIC_APP_ID` and `TELEBIRR_APP_SECRET`. It caches this token in Redis for 50 minutes (the token is valid for 1 hour) to reduce API calls and latency.
*   **`apps/backend/src/modules/escrow/providers/telebirr.signing.ts`**
    *   **Purpose:** Handles all cryptographic signing and verification.
    *   **What it does:** Implements the `SHA256withRSAandMGF1` (RSA-PSS) algorithm using native Node.js `crypto`. It ensures keys are sorted alphabetically to create a canonical string before signing, which is a strict requirement from Telebirr.
*   **`apps/backend/src/modules/escrow/webhooks.routes.ts`**
    *   **Purpose:** Receives the asynchronous webhook from Telebirr.
    *   **What it does:** Exposes the `POST /telebirr` endpoint. It extracts the embedded signature, verifies it using `telebirr.client.ts`, maps the Telebirr status (`trade_status`) to our internal status, updates the database, and responds with the exact JSON Telebirr expects (`{ code: 0, msg: "success" }`).
*   **`apps/backend/src/config/env.ts`**
    *   **Purpose:** Defines and validates all required environment variables.

---

## 3. Configuration & Credentials

To operate in live/production mode, the following environment variables must be set in your `.env` file:

```env
# Telebirr API URLs
TELEBIRR_BASE_URL="https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway"
TELEBIRR_WEB_BASE_URL="https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?"

# App Credentials (for getting the Fabric Token)
TELEBIRR_FABRIC_APP_ID="your_fabric_app_id"
TELEBIRR_APP_SECRET="your_app_secret"

# Merchant Credentials (for creating the order)
TELEBIRR_MERCHANT_APP_ID="your_merchant_app_id"
TELEBIRR_MERCHANT_CODE="your_merchant_code"

# Cryptographic Keys
TELEBIRR_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
TELEBIRR_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"

# Webhook URL (where Telebirr sends the receipt)
TELEBIRR_NOTIFY_URL="https://your-domain.com/api/v1/webhooks/telebirr"
```

> **Note on Mock Mode:** If any of the 5 core credentials (`TELEBIRR_FABRIC_APP_ID`, `TELEBIRR_APP_SECRET`, `TELEBIRR_MERCHANT_APP_ID`, `TELEBIRR_MERCHANT_CODE`, `TELEBIRR_PRIVATE_KEY`) are missing, `telebirr.client.ts` automatically falls back to **Mock Mode**. It will return a fake transaction ID and a `null` redirect URL, allowing local development to continue without crashing.

---

## 4. Deep Dive: The Cryptographic Signature (RSA-PSS)

Telebirr's most complex requirement is how requests are signed. They require **RSA-PSS** padding, which is more secure than traditional PKCS#1 v1.5 padding.

In `telebirr.signing.ts`, the process works like this:

1.  **Exclude Fields:** Fields like `sign`, `sign_type`, and `header` are stripped from the payload.
2.  **Flatten `biz_content`:** Any nested fields inside `biz_content` are brought up to the root level.
3.  **Sort:** The remaining keys are sorted in strict ASCII alphabetical order.
4.  **Stringify:** The keys and values are joined with `=` and `&` (e.g., `appid=123&merch_code=456&nonce_str=abc...`). This is the "canonical string".
5.  **Sign:** This string is hashed with SHA-256 and signed with your `TELEBIRR_PRIVATE_KEY` using Node's `crypto.createSign("RSA-SHA256")` with `RSA_PKCS1_PSS_PADDING` and a salt length of 32 bytes (`RSA_PSS_SALTLEN_DIGEST`).
6.  **Attach:** The resulting Base64 string is attached to the payload in the `sign` field.

---

## 5. Deep Dive: Webhook Handling

When Telebirr sends a webhook, they do **not** put the signature in the HTTP headers (unlike Stripe, Chapa, or CBE). Instead, they embed the signature directly inside the JSON body in a field called `"sign"`.

In `webhooks.routes.ts` (specifically `handleTelebirrWebhook`):

1.  **Parse Raw Body:** We capture the raw Buffer of the request body before Express tries to parse it as JSON. This ensures whitespace isn't altered, which would break the signature.
2.  **Extract & Verify:** We pass the raw body to `verifyWebhookSignature`. It parses the JSON, extracts the `"sign"` field, removes it from the payload, rebuilds the canonical string, and verifies it against the `TELEBIRR_PUBLIC_KEY`.
3.  **Map Status:** Telebirr uses `trade_status` (e.g., "completed", "failed"). We map this to our internal `SUCCESS`, `FAILED`, or `PENDING` states.
4.  **Database Update:** We pass the mapped status and the `merch_order_id` to `handlePaymentWebhook` (in `escrow.service.ts`), which idempotently updates the database and releases funds if appropriate.
5.  **Acknowledge:** Telebirr requires a very specific response. If everything succeeds, we **must** return HTTP 200 with exactly: `{"code": 0, "msg": "success"}`. If we return anything else, Telebirr assumes the webhook failed and will keep retrying.

---

## 6. Token Caching

The Fabric token is cached in Redis (`telebirr.token.ts`). 
- **Key:** `telebirr:fabric_token`
- **TTL:** 3000 seconds (50 minutes)
- **Invalidation:** If `telebirr.client.ts` ever receives a `401 Unauthorized` from Telebirr, it automatically deletes the Redis key so that the *next* request will fetch a fresh token.

---

## 7. Current Project State

As of August 2026, the Telebirr Web Checkout integration is actively used for **Automatic Wallet Top-Ups**.

When a user clicks "Pay with Telebirr" on the Wallet page:
1. `initiateCheckoutTopUp` is called, creating a `WalletTopUp` record in the database with status `CHECKOUT_PENDING` and returning the checkout URL.
2. The user pays on Telebirr.
3. Telebirr sends a webhook to `POST /api/v1/webhooks/telebirr`.
4. The webhook handler (`handleTelebirrWebhook`) detects that the `merch_order_id` belongs to a `WalletTopUp` record instead of an escrow `PaymentTransaction`.
5. It routes to `handleTopUpWebhook`, which atomically approves the top-up and credits the user's wallet balance.

Payouts (B2C) for freelancer withdrawals are currently mocked/stubbed and will require integration with Telebirr's B2C API.
