# Telebirr Lock Escrow Architecture — Complete Developer Guide

**Version:** 1.0  
**Date:** 2026-08-03  
**Scope:** Full TypeScript implementation, regulatory context, fee analysis, and production deployment guide for building a lock-escrow platform using Telebirr direct integration in Ethiopia.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Payment Provider Comparison](#3-payment-provider-comparison)
4. [Telebirr Integration Deep Dive](#4-telebirr-integration-deep-dive)
5. [Authentication & Security](#5-authentication--security)
6. [Full TypeScript Implementation](#6-full-typescript-implementation)
7. [Database Schema](#7-database-schema)
8. [Escrow Flow & State Machine](#8-escrow-flow--state-machine)
9. [Webhook & Return URL Handling](#9-webhook--return-url-handling)
10. [Idempotency & Race Conditions](#10-idempotency--race-conditions)
11. [Fee Structure](#11-fee-structure)
12. [Regulatory Compliance](#12-regulatory-compliance)
13. [Testing & Sandbox](#13-testing--sandbox)
14. [Production Checklist](#14-production-checklist)
15. [Appendix: Environment Variables](#15-appendix-environment-variables)

---

## 1. Executive Summary

This document provides a complete blueprint for building a **Lock Escrow Architecture** using **Telebirr direct integration** in Ethiopia. The system enables buyers to deposit funds that are held in escrow until the seller delivers goods/services, at which point funds are released — or refunded if delivery fails.

**Key decisions documented:**
- **Telebirr** was chosen for lowest transaction fees (0.5% vs Chapa's 2.5%)
- **Direct integration** (not via Chapa) for full control over the payment lifecycle
- **Ledger-based escrow** due to current Ethiopian regulations prohibiting formal escrow accounts
- **TypeScript/Node.js** as the primary backend stack

---

## 2. Architecture Overview

### 2.1 System Components

```
┌─────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────┐
│   Buyer     │────│   Your Web App  │────│  Node.js API    │────│  Telebirr   │
│  (Browser)  │────│   (React/Vue)   │────│  (Escrow Logic) │────│  Gateway    │
└─────────────┘     └─────────────────┘     └────────┬────────┘     └─────────────┘
                                                      │
                                           ┌──────────┴──────────┐
                                           │   PostgreSQL        │
                                           │   escrows           │
                                           │   escrow_audit_logs │
                                           │   webhook_logs      │
                                           └─────────────────────┘
```

### 2.2 Data Flow

1. **Create Escrow** — Buyer initiates transaction; system creates `pending` escrow record
2. **Redirect to Telebirr** — Buyer pays via Telebirr H5 checkout page
3. **Payment Confirmation** — Telebirr sends server-to-server webhook + redirects buyer back
4. **Lock Funds** — Backend verifies payment via API call, marks escrow as `locked`
5. **Seller Delivers** — Seller provides goods/services
6. **Release or Refund** — Buyer confirms delivery (release) or opens dispute (refund)

### 2.3 Escrow State Machine

```
                    ┌─────────────┐
         ┌─────────│   PENDING   │────────┐
         │          │  (created)  │         │
         │          └──────┬──────┘         │
         │                 │ pay            │ timeout
         │                 ▼                │
         │          ┌─────────────┐         │
         │          │   LOCKED    │         │
         │          │ (funds held)│         │
         │          └──────┬──────┘         │
         │                 │                │
    ┌────┴────┐      ┌─────┴─────┐   ┌─────┴─────┐
    │RELEASED │      │ REFUNDED  │   │ DISPUTED  │
    │(seller) │      │ (buyer)   │   │ (arbiter) │
    └─────────┘      └───────────┘   └─────┬─────┘
                                           │
                                    ┌──────┴──────┐
                                    │ RESOLVED    │
                                    │ released/   │
                                    │ refunded    │
                                    └─────────────┘
```

---

## 3. Payment Provider Comparison

### 3.1 Quick Comparison

| Criteria | **Telebirr** | **Chapa** | **CBE Bank Transfer** |
|----------|-------------|-----------|----------------------|
| **Ease of Build** | Complex (RSA, fabric tokens) | Easy (REST API, SDKs) | Very Hard (no public API) |
| **Transaction Fee** | **0.5%** | 2.5% | ~Birr 57.5 flat |
| **Speed** | Instant | Instant | T+2 settlement |
| **Reliability** | Good (test env unstable) | Excellent | Slow, manual |
| **Government/Regulatory** | State-owned (Ethio Telecom) | NBE-licensed since 2022 | State-owned bank |
| **Best For** | High-volume platforms | Fast launch, low maintenance | Large B2B transfers |

### 3.2 Cost at Scale

| Amount | Telebirr (0.5%) | Chapa (2.5%) | CBE (~Birr 57.5) |
|--------|----------------|--------------|-----------------|
| Birr 1,000 | Birr 5 | Birr 25 | Birr 57.50 |
| Birr 10,000 | Birr 50 | Birr 250 | Birr 57.50 |
| Birr 50,000 | Birr 250 | Birr 1,250 | Birr 57.50 |
| Birr 100,000 | Birr 500 | Birr 2,500 | Birr 57.50 |

**Break-even:** Telebirr becomes cheaper than CBE flat fee at transactions under ~Birr 11,500.

### 3.3 Engineering Cost Trade-off

| Factor | Telebirr Direct | Chapa |
|--------|----------------|-------|
| Integration time | 2–4 weeks | 2–3 days |
| RSA key management | Required | Abstracted |
| Fabric token handling | Manual | Abstracted |
| Signature verification | Manual | Built-in |
| Test environment | Unstable | Stable |
| Documentation | Limited | Comprehensive |
| Support | Ethio Telecom | Dedicated dev support |

**Recommendation:** Use Telebirr direct if processing >Birr 5M/month. Use Chapa for faster MVP launch.

---

## 4. Telebirr Integration Deep Dive

### 4.1 Integration Type: H5 C2B Web Payment

For escrow web platforms, **H5 C2B (Customer-to-Business) Web Payment** is the correct choice. Buyers complete payment in a browser without needing the Telebirr app installed.

### 4.2 API Endpoints

| Environment | API Base URL | Web Checkout URL |
|-------------|-------------|------------------|
| **Test** | `https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway` | `https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?` |
| **Production** | `https://superapp.ethiomobilemoney.et:38443/apiaccess/payment/gateway` | `https://superapp.ethiomobilemoney.et:38443/payment/web/paygate?` |

### 4.3 Required Credentials

| Credential | Description | Format |
|------------|-------------|--------|
| `fabricAppId` | Fabric App ID | UUID |
| `appSecret` | App Secret | String |
| `merchantAppId` | Merchant App ID | String |
| `merchantCode` | Merchant Code | 6-digit string |
| `privateKey` | RSA Private Key | Base64 DER or PEM |
| `telebirrPublicKey` | Telebirr's Public Key | For signature verification |
| `notifyUrl` | Webhook endpoint | HTTPS URL |
| `redirectUrl` | Browser return URL | HTTPS URL |

**Key format note:** Ethio Telecom issues keys as bare base64 DER (single long string). The client normalizes these to PEM automatically.

### 4.4 Merchant Onboarding

You **cannot self-register**. You must:
1. Contact Ethio Telecom's enterprise team
2. Submit business registration documents
3. Complete KYC (Know Your Customer)
4. Sign merchant agreement
5. Receive credentials via secure channel

**Timeline:** 1–3 weeks for approval.

---

## 5. Authentication & Security

### 5.1 Two-Layer Authentication

Telebirr uses a dual authentication system:

**Layer 1: Fabric Token**
- Short-lived access token (valid ~1 hour)
- Obtained by POSTing `appSecret` to `/payment/fabric-token/get-token`
- Must be included as `Authorization: Bearer <token>` header

**Layer 2: RSA-PSS Signature**
- Every request payload is signed with your RSA Private Key
- Algorithm: RSA-PSS with SHA256
- MGF1: SHA256
- Salt length: 32 bytes (or MAX_LENGTH)
- Signature included in payload as `sign` field

### 5.2 Why Two Layers?

| Layer | Purpose |
|-------|---------|
| Fabric Token | Proves you have a valid merchant account |
| RSA Signature | Proves the request payload wasn't tampered with |

### 5.3 Security Best Practices

1. **Never expose credentials** — Store in environment variables or secret managers (AWS Secrets Manager, HashiCorp Vault)
2. **HTTPS everywhere** — All endpoints must use TLS 1.2+
3. **Verify signatures** — Always verify RSA signatures on callbacks
4. **Server-to-server verification** — Never fulfill escrow based on browser redirect alone
5. **Idempotent processing** — Use atomic DB updates to prevent double-fulfillment
6. **Input validation** — Validate amounts, currencies, and order IDs
7. **Audit logging** — Log every API call, webhook, and state change immutably
8. **Rate limiting** — Protect webhook endpoints from abuse

---

## 6. Full TypeScript Implementation

### 6.1 Project Structure

```
escrow-platform/
├── src/
│   ├── config/
│   │   └── telebirr.ts          # Configuration and environment variables
│   ├── clients/
│   │   └── telebirr.client.ts   # Core Telebirr API client
│   ├── services/
│   │   └── escrow.service.ts    # Escrow business logic
│   ├── routes/
│   │   ├── escrow.routes.ts     # Express routes for escrow operations
│   │   └── telebirr.routes.ts   # Webhook and return URL handlers
│   ├── jobs/
│   │   └── escrow.cron.ts       # Scheduled jobs (expiry, auto-release)
│   ├── db/
│   │   └── escrow.db.ts         # Database queries and connection
│   └── types/
│       └── escrow.types.ts      # TypeScript interfaces
├── tests/
│   └── escrow.test.ts
├── .env
├── package.json
└── tsconfig.json
```

### 6.2 Type Definitions

```typescript
// src/types/escrow.types.ts

export interface TelebirrConfig {
  fabricAppId: string;
  appSecret: string;
  merchantAppId: string;
  merchantCode: string;
  privateKey: string;
  telebirrPublicKey?: string;
  notifyUrl: string;
  redirectUrl: string;
  environment: 'test' | 'production';
}

export interface FabricTokenResponse {
  code: string;
  msg: string;
  token: string;
  expirationDate?: string;
}

export interface CreateOrderPayload {
  appid: string;
  merch_code: string;
  merch_order_id: string;
  trade_type: string;
  total_amount: string;
  trans_currency: string;
  timeout_express: string;
  title: string;
  description: string;
  notify_url: string;
  redirect_url: string;
  business_type: string;
  timestamp: string;
}

export interface CreateOrderResponse {
  code: string;
  msg: string;
  prepay_id: string;
}

export interface QueryOrderResponse {
  code: string;
  msg: string;
  biz_content: {
    trade_status: string;
    total_amount: string;
    trans_currency: string;
    payment_order_id: string;
    [key: string]: any;
  };
}

export interface OrderStatus {
  paid: boolean;
  tradeStatus: string;
  amount: string;
  currency: string;
  paymentOrderId: string | null;
  raw: QueryOrderResponse;
}

export interface CheckoutResult {
  checkoutUrl: string;
  prepayId: string;
  merchOrderId: string;
}

export interface RefundPayload {
  appid: string;
  merch_code: string;
  payment_order_id: string;
  merch_order_id: string;
  refund_amount: string;
  refund_reason: string;
  timestamp: string;
}

export interface RefundResponse {
  code: string;
  msg: string;
  [key: string]: any;
}

export interface NotificationBody {
  merch_order_id: string;
  payment_order_id: string;
  trade_status: string;
  total_amount: string;
  trans_currency: string;
  trans_end_time: string;
  sign: string;
  sign_type: string;
  [key: string]: any;
}

export interface ReturnUrlParams {
  merch_order_id: string;
  payment_order_id: string;
  trade_status: string;
  total_amount: string;
  trans_currency: string;
  trans_end_time: string;
  sign: string;
  sign_type: string;
}

export interface EscrowRecord {
  id: number;
  escrow_id: string;
  buyer_id: string;
  seller_id: string;
  amount: string;
  currency: string;
  title: string;
  description: string;
  status: 'pending' | 'locked' | 'released' | 'refunded' | 'disputed' | 'expired' | 'cancelled';
  prepay_id: string | null;
  telebirr_payment_order_id: string | null;
  paid_amount: string | null;
  created_at: Date;
  expires_at: Date | null;
  paid_at: Date | null;
  locked_at: Date | null;
  released_at: Date | null;
  released_by: string | null;
  refunded_at: Date | null;
  refunded_by: string | null;
  refund_reason: string | null;
  refund_telebirr_response: any;
  disputed_at: Date | null;
  disputed_by: string | null;
  dispute_reason: string | null;
  dispute_resolution: string | null;
  metadata: any;
  updated_at: Date;
}

export interface CreateEscrowInput {
  buyerId: string;
  sellerId: string;
  amount: string;
  title: string;
  description?: string;
  metadata?: Record<string, any>;
}

export interface ReleaseEscrowInput {
  escrowId: string;
  releasedBy: string;
}

export interface RefundEscrowInput {
  escrowId: string;
  reason: string;
  refundedBy: string;
}
```

### 6.3 Configuration

```typescript
// src/config/telebirr.ts

import { TelebirrConfig } from '../types/escrow.types';

export const telebirrConfig: TelebirrConfig = {
  fabricAppId: process.env.TELEBIRR_FABRIC_APP_ID!,
  appSecret: process.env.TELEBIRR_APP_SECRET!,
  merchantAppId: process.env.TELEBIRR_MERCHANT_APP_ID!,
  merchantCode: process.env.TELEBIRR_MERCHANT_CODE!,
  privateKey: process.env.TELEBIRR_PRIVATE_KEY!,
  telebirrPublicKey: process.env.TELEBIRR_PUBLIC_KEY,
  notifyUrl: process.env.TELEBIRR_NOTIFY_URL!,
  redirectUrl: process.env.TELEBIRR_REDIRECT_URL!,
  environment: (process.env.TELEBIRR_ENVIRONMENT as 'test' | 'production') || 'test',
};

export const BASE_URLS = {
  test: 'https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway',
  production: 'https://superapp.ethiomobilemoney.et:38443/apiaccess/payment/gateway',
};

export const CHECKOUT_URLS = {
  test: 'https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?',
  production: 'https://superapp.ethiomobilemoney.et:38443/payment/web/paygate?',
};
```


### 6.4 Core Telebirr Client

```typescript
// src/clients/telebirr.client.ts

import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import {
  TelebirrConfig,
  FabricTokenResponse,
  CreateOrderPayload,
  CreateOrderResponse,
  QueryOrderResponse,
  OrderStatus,
  CheckoutResult,
  RefundPayload,
  RefundResponse,
  NotificationBody,
  ReturnUrlParams,
  BASE_URLS,
  CHECKOUT_URLS,
} from '../types/escrow.types';

export class TelebirrClient {
  private http: AxiosInstance;
  private tokenCache: string | null = null;
  private tokenExpiry: number = 0;

  constructor(private config: TelebirrConfig) {
    this.http = axios.create({
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'X-APP-Key': this.config.fabricAppId,
      },
    });
  }

  /**
   * Normalize bare base64 DER key to PEM format.
   * Ethio Telecom issues keys without PEM headers.
   */
  private normalizeKey(key: string): string {
    const clean = key.replace(/\s/g, '').trim();
    if (clean.includes('BEGIN')) return key;

    const decoded = Buffer.from(clean.slice(0, 20), 'base64');
    const isPKCS8 = decoded[0] === 0x30;

    const header = isPKCS8
      ? '-----BEGIN PRIVATE KEY-----\n'
      : '-----BEGIN RSA PRIVATE KEY-----\n';
    const footer = isPKCS8
      ? '-----END PRIVATE KEY-----'
      : '-----END RSA PRIVATE KEY-----';

    const chunks = clean.match(/.{1,64}/g)?.join('\n') || clean;
    return `${header}${chunks}\n${footer}`;
  }

  /**
   * Get or refresh fabric token.
   * Cached until 60 seconds before expiry.
   */
  async getFabricToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && now < this.tokenExpiry - 60000) {
      return this.tokenCache;
    }

    const url = `${BASE_URLS[this.config.environment]}/payment/fabric-token/get-token`;
    const response = await this.http.post(url, {
      appSecret: this.config.appSecret,
    });

    const data = response.data as FabricTokenResponse;
    if (data.code !== '0') {
      throw new Error(`Fabric token error: ${data.msg}`);
    }

    this.tokenCache = data.token;
    // Token typically valid for 1 hour, cache for 50 minutes
    const expiryDate = data.expirationDate
      ? new Date(data.expirationDate).getTime()
      : now + 50 * 60 * 1000;
    this.tokenExpiry = expiryDate;

    return this.tokenCache;
  }

  /**
   * Sign payload with RSA-PSS SHA256.
   */
  private signPayload(payload: Record<string, any>): string {
    const normalizedKey = this.normalizeKey(this.config.privateKey);
    const signString = JSON.stringify(payload);

    const signature = crypto.sign('sha256', Buffer.from(signString), {
      key: normalizedKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      saltLength: 32,
    });

    return signature.toString('base64');
  }

  /**
   * Verify signature from Telebirr.
   */
  private verifySignature(payload: Record<string, any>, signatureB64: string): boolean {
    if (!this.config.telebirrPublicKey) {
      throw new Error('telebirrPublicKey required for verification');
    }

    const normalizedKey = this.normalizeKey(this.config.telebirrPublicKey);
    const signString = JSON.stringify(payload);

    try {
      return crypto.verify(
        'sha256',
        Buffer.from(signString),
        {
          key: normalizedKey,
          padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: 32,
        },
        Buffer.from(signatureB64, 'base64')
      );
    } catch {
      return false;
    }
  }

  /**
   * Make authenticated API call to Telebirr.
   */
  private async apiCall(endpoint: string, payload: Record<string, any>): Promise<any> {
    const token = await this.getFabricToken();

    const signedPayload = {
      ...payload,
      sign: this.signPayload(payload),
      sign_type: 'SHA256withRSA',
    };

    const url = `${BASE_URLS[this.config.environment]}${endpoint}`;
    const response = await this.http.post(url, signedPayload, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }

  /**
   * Create checkout URL for escrow payment.
   *
   * @param merchOrderId Must match ^[A-Za-z0-9]+$
   * @param amount Amount in ETB (e.g., "5000.00")
   * @param title Payment title shown to buyer
   * @param description Optional description
   */
  async createCheckoutUrl(
    merchOrderId: string,
    amount: string,
    title: string,
    description: string = ''
  ): Promise<CheckoutResult> {
    // Validate merch_order_id format
    if (!/^[A-Za-z0-9]+$/.test(merchOrderId)) {
      throw new Error('merchOrderId must match ^[A-Za-z0-9]+$ (letters and digits only)');
    }

    const payload: CreateOrderPayload = {
      appid: this.config.merchantAppId,
      merch_code: this.config.merchantCode,
      merch_order_id: merchOrderId,
      trade_type: 'Checkout',
      total_amount: amount,
      trans_currency: 'ETB',
      timeout_express: '24h',
      title,
      description,
      notify_url: this.config.notifyUrl,
      redirect_url: this.config.redirectUrl,
      business_type: 'BuyGoods',
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };

    const response = (await this.apiCall('/payment/order/create', payload)) as CreateOrderResponse;

    if (response.code !== '0') {
      throw new Error(`Order creation failed: ${response.msg}`);
    }

    const checkoutUrl = `${CHECKOUT_URLS[this.config.environment]}prepay_id=${response.prepay_id}`;

    return {
      checkoutUrl,
      prepayId: response.prepay_id,
      merchOrderId,
    };
  }

  /**
   * Query order status via server-to-server call.
   * This is the AUTHORITATIVE source of payment truth.
   */
  async getOrderStatus(merchOrderId: string): Promise<OrderStatus> {
    const payload = {
      appid: this.config.merchantAppId,
      merch_code: this.config.merchantCode,
      merch_order_id: merchOrderId,
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };

    const response = (await this.apiCall('/payment/order/query', payload)) as QueryOrderResponse;
    const bizContent = response.biz_content || {};
    const tradeStatus = (bizContent.trade_status || '').toUpperCase();

    return {
      paid: tradeStatus === 'PAY_SUCCESS',
      tradeStatus,
      amount: bizContent.total_amount || '0.00',
      currency: bizContent.trans_currency || 'ETB',
      paymentOrderId: bizContent.payment_order_id || null,
      raw: response,
    };
  }

  /**
   * Refund an order (full or partial).
   */
  async refundOrder(
    amount: string,
    paymentOrderId: string,
    merchantOrderId: string,
    reason: string = ''
  ): Promise<RefundResponse> {
    const payload: RefundPayload = {
      appid: this.config.merchantAppId,
      merch_code: this.config.merchantCode,
      payment_order_id: paymentOrderId,
      merch_order_id: merchantOrderId,
      refund_amount: amount,
      refund_reason: reason,
      timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    };

    return this.apiCall('/payment/order/refund', payload);
  }

  /**
   * Verify webhook/notification signature.
   */
  verifyNotification(body: NotificationBody): boolean {
    const { sign, sign_type, ...payload } = body;
    if (!sign) return false;
    return this.verifySignature(payload, sign);
  }

  /**
   * Verify return URL query parameters.
   */
  verifyReturnUrl(params: ReturnUrlParams): {
    isValid: boolean;
    isSuccess: boolean;
    merchOrderId: string | null;
    paymentOrderId: string | null;
    amount: string | null;
  } {
    const { sign, sign_type, ...payload } = params;

    if (!sign) {
      return { isValid: false, isSuccess: false, merchOrderId: null, paymentOrderId: null, amount: null };
    }

    const isValid = this.verifySignature(payload as Record<string, any>, sign);
    if (!isValid) {
      return { isValid: false, isSuccess: false, merchOrderId: null, paymentOrderId: null, amount: null };
    }

    return {
      isValid: true,
      isSuccess: (params.trade_status || '').toUpperCase() === 'PAY_SUCCESS',
      merchOrderId: params.merch_order_id || null,
      paymentOrderId: params.payment_order_id || null,
      amount: params.total_amount || null,
    };
  }

  /**
   * Check gateway health (useful for sandbox monitoring).
   */
  async ping(): Promise<{ ok: boolean; latency: number; error?: string }> {
    const start = Date.now();
    try {
      await this.getFabricToken();
      return { ok: true, latency: Date.now() - start };
    } catch (error: any) {
      return { ok: false, latency: Date.now() - start, error: error.message };
    }
  }
}
```

### 6.5 Database Layer

```typescript
// src/db/escrow.db.ts

import { Pool, PoolClient } from 'pg';
import { EscrowRecord } from '../types/escrow.types';

export class Database {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
  }

  async query<T = any>(sql: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(sql, params);
    return result.rows;
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
```

### 6.6 Escrow Service

```typescript
// src/services/escrow.service.ts

import { TelebirrClient } from '../clients/telebirr.client';
import { Database } from '../db/escrow.db';
import {
  EscrowRecord,
  CreateEscrowInput,
  CreateEscrowResult,
  ReleaseEscrowInput,
  RefundEscrowInput,
} from '../types/escrow.types';

export class EscrowService {
  constructor(private telebirr: TelebirrClient, private db: Database) {}

  /**
   * Generate escrow ID matching ^[A-Za-z0-9]+$
   */
  private generateEscrowId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ESC${timestamp}${random}`;
  }

  /**
   * Step 1: Create escrow transaction and Telebirr checkout.
   */
  async createEscrow(input: CreateEscrowInput): Promise<CreateEscrowResult> {
    const escrowId = this.generateEscrowId();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // Default 24h

    await this.db.query(
      `INSERT INTO escrows
       (escrow_id, buyer_id, seller_id, amount, currency, title, description, status, metadata, expires_at, created_at)
       VALUES ($1, $2, $3, $4, 'ETB', $5, $6, 'pending', $7, $8, NOW())`,
      [
        escrowId,
        input.buyerId,
        input.sellerId,
        input.amount,
        input.title,
        input.description || null,
        JSON.stringify(input.metadata || {}),
        expiresAt,
      ]
    );

    const checkout = await this.telebirr.createCheckoutUrl(
      escrowId,
      input.amount,
      input.title,
      input.description || ''
    );

    await this.db.query('UPDATE escrows SET prepay_id = $1 WHERE escrow_id = $2', [
      checkout.prepayId,
      escrowId,
    ]);

    return {
      escrowId,
      checkoutUrl: checkout.checkoutUrl,
      prepayId: checkout.prepayId,
    };
  }

  /**
   * Step 2: Handle Telebirr webhook notification.
   * IDEMPOTENT - safe to call multiple times.
   */
  async handleWebhook(rawBody: string): Promise<{ processed: boolean; reason?: string; escrowId?: string }> {
    const notification = JSON.parse(rawBody);

    // Verify signature
    if (!this.telebirr.verifyNotification(notification)) {
      throw new Error('Invalid webhook signature');
    }

    const merchOrderId = notification.merch_order_id as string;

    // Server-to-server verification (authoritative)
    const status = await this.telebirr.getOrderStatus(merchOrderId);

    if (!status.paid) {
      return { processed: false, reason: 'Payment not confirmed' };
    }

    // Atomic update: pending -> locked
    const result = await this.db.transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE escrows
         SET status = 'locked',
             telebirr_payment_order_id = $1,
             paid_amount = $2,
             paid_at = NOW(),
             locked_at = NOW(),
             updated_at = NOW()
         WHERE escrow_id = $3
           AND status = 'pending'
           AND amount = $2
         RETURNING escrow_id`,
        [status.paymentOrderId, status.amount, merchOrderId]
      );

      if (updateResult.rows.length === 0) {
        return null; // Already processed or amount mismatch
      }

      // Log state change
      await client.query(
        `INSERT INTO escrow_audit_logs
         (escrow_id, from_status, to_status, actor, actor_type, reason, metadata, created_at)
         VALUES ($1, 'pending', 'locked', 'system', 'webhook', 'Payment confirmed', $2, NOW())`,
        [merchOrderId, JSON.stringify(status.raw)]
      );

      return updateResult.rows[0];
    });

    if (!result) {
      return { processed: false, reason: 'Already processed or amount mismatch' };
    }

    return { processed: true, escrowId: merchOrderId };
  }

  /**
   * Step 3: Handle browser return (non-authoritative).
   */
  async handleReturn(queryParams: Record<string, string>): Promise<{
    success: boolean;
    escrowId?: string;
    error?: string;
    status?: string;
  }> {
    const verification = this.telebirr.verifyReturnUrl(queryParams as any);

    if (!verification.isValid) {
      return { success: false, error: 'Invalid signature' };
    }

    // Always verify server-to-server
    const status = await this.telebirr.getOrderStatus(verification.merchOrderId!);

    if (!status.paid) {
      return { success: false, status: status.tradeStatus };
    }

    return {
      success: true,
      escrowId: verification.merchOrderId!,
    };
  }

  /**
   * Step 4a: Release funds to seller.
   */
  async releaseToSeller(input: ReleaseEscrowInput): Promise<EscrowRecord> {
    const escrow = await this.getEscrow(input.escrowId);

    if (escrow.status !== 'locked') {
      throw new Error(`Cannot release escrow in status: ${escrow.status}`);
    }

    return this.db.transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE escrows
         SET status = 'released',
             released_at = NOW(),
             released_by = $1,
             updated_at = NOW()
         WHERE escrow_id = $2
           AND status = 'locked'
         RETURNING *`,
        [input.releasedBy, input.escrowId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Escrow not found or already released');
      }

      await client.query(
        `INSERT INTO escrow_audit_logs
         (escrow_id, from_status, to_status, actor, actor_type, reason, created_at)
         VALUES ($1, 'locked', 'released', $2, 'admin', 'Seller payout authorized', NOW())`,
        [input.escrowId, input.releasedBy]
      );

      return updateResult.rows[0] as EscrowRecord;
    });
  }

  /**
   * Step 4b: Refund to buyer via Telebirr.
   */
  async refundToBuyer(input: RefundEscrowInput): Promise<EscrowRecord> {
    const escrow = await this.getEscrow(input.escrowId);

    if (escrow.status !== 'locked') {
      throw new Error(`Cannot refund escrow in status: ${escrow.status}`);
    }

    if (!escrow.telebirr_payment_order_id || !escrow.paid_amount) {
      throw new Error('Missing payment information for refund');
    }

    // Call Telebirr refund API
    const refundResult = await this.telebirr.refundOrder(
      escrow.paid_amount,
      escrow.telebirr_payment_order_id,
      input.escrowId,
      input.reason
    );

    return this.db.transaction(async (client) => {
      const updateResult = await client.query(
        `UPDATE escrows
         SET status = 'refunded',
             refunded_at = NOW(),
             refunded_by = $1,
             refund_reason = $2,
             refund_telebirr_response = $3,
             updated_at = NOW()
         WHERE escrow_id = $4
           AND status = 'locked'
         RETURNING *`,
        [input.refundedBy, input.reason, JSON.stringify(refundResult), input.escrowId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Escrow not found or already refunded');
      }

      await client.query(
        `INSERT INTO escrow_audit_logs
         (escrow_id, from_status, to_status, actor, actor_type, reason, metadata, created_at)
         VALUES ($1, 'locked', 'refunded', $2, 'admin', $3, $4, NOW())`,
        [input.escrowId, input.refundedBy, input.reason, JSON.stringify(refundResult)]
      );

      return updateResult.rows[0] as EscrowRecord;
    });
  }

  /**
   * Open a dispute on an escrow.
   */
  async openDispute(escrowId: string, openedBy: string, reason: string): Promise<EscrowRecord> {
    const escrow = await this.getEscrow(escrowId);

    if (escrow.status !== 'locked') {
      throw new Error(`Cannot dispute escrow in status: ${escrow.status}`);
    }

    return this.db.transaction(async (client) => {
      await client.query(
        `INSERT INTO escrow_disputes
         (escrow_id, opened_by, reason, status, created_at)
         VALUES ($1, $2, $3, 'open', NOW())`,
        [escrowId, openedBy, reason]
      );

      const updateResult = await client.query(
        `UPDATE escrows
         SET status = 'disputed',
             disputed_at = NOW(),
             disputed_by = $1,
             dispute_reason = $2,
             updated_at = NOW()
         WHERE escrow_id = $3
           AND status = 'locked'
         RETURNING *`,
        [openedBy, reason, escrowId]
      );

      if (updateResult.rows.length === 0) {
        throw new Error('Escrow not found or already disputed');
      }

      await client.query(
        `INSERT INTO escrow_audit_logs
         (escrow_id, from_status, to_status, actor, actor_type, reason, created_at)
         VALUES ($1, 'locked', 'disputed', $2, 'user', $3, NOW())`,
        [escrowId, openedBy, reason]
      );

      return updateResult.rows[0] as EscrowRecord;
    });
  }

  /**
   * Resolve a dispute.
   */
  async resolveDispute(
    escrowId: string,
    resolvedBy: string,
    resolution: 'buyer_wins' | 'seller_wins' | 'split',
    notes: string = ''
  ): Promise<EscrowRecord> {
    const escrow = await this.getEscrow(escrowId);

    if (escrow.status !== 'disputed') {
      throw new Error(`Cannot resolve escrow in status: ${escrow.status}`);
    }

    await this.db.transaction(async (client) => {
      await client.query(
        `UPDATE escrow_disputes
         SET status = 'resolved',
             resolution = $1,
             resolved_by = $2,
             resolved_at = NOW()
         WHERE escrow_id = $3`,
        [resolution, resolvedBy, escrowId]
      );
    });

    if (resolution === 'buyer_wins') {
      return this.refundToBuyer({
        escrowId,
        reason: notes || 'Dispute resolved in buyer favor',
        refundedBy: resolvedBy,
      });
    } else if (resolution === 'seller_wins') {
      return this.releaseToSeller({ escrowId, releasedBy: resolvedBy });
    } else {
      throw new Error('Split resolution requires custom implementation');
    }
  }

  /**
   * Get escrow by ID.
   */
  async getEscrow(escrowId: string): Promise<EscrowRecord> {
    const rows = await this.db.query<EscrowRecord>('SELECT * FROM escrows WHERE escrow_id = $1', [
      escrowId,
    ]);

    if (rows.length === 0) {
      throw new Error('Escrow not found');
    }

    return rows[0];
  }

  /**
   * List escrows for a user.
   */
  async listEscrows(userId: string, role: 'buyer' | 'seller' | 'all' = 'all'): Promise<EscrowRecord[]> {
    let sql = 'SELECT * FROM escrows WHERE ';
    let params: any[] = [];

    if (role === 'buyer') {
      sql += 'buyer_id = $1';
      params = [userId];
    } else if (role === 'seller') {
      sql += 'seller_id = $1';
      params = [userId];
    } else {
      sql += 'buyer_id = $1 OR seller_id = $1';
      params = [userId];
    }

    sql += ' ORDER BY created_at DESC';
    return this.db.query<EscrowRecord>(sql, params);
  }

  /**
   * Auto-expire pending escrows past their expiry date.
   * Call this from a cron job.
   */
  async expirePendingEscrows(): Promise<number> {
    const result = await this.db.query(
      `UPDATE escrows
       SET status = 'expired',
           updated_at = NOW()
       WHERE status = 'pending'
         AND expires_at < NOW()
       RETURNING escrow_id`
    );

    for (const row of result) {
      await this.db.query(
        `INSERT INTO escrow_audit_logs
         (escrow_id, from_status, to_status, actor, actor_type, reason, created_at)
         VALUES ($1, 'pending', 'expired', 'system', 'cron', 'Auto-expired: payment deadline passed', NOW())`,
        [row.escrow_id]
      );
    }

    return result.length;
  }

  /**
   * Auto-release escrows after dispute/confirmation window.
   * Call this from a cron job (e.g., 7 days after lock).
   */
  async autoReleaseEscrows(releaseAfterHours: number = 168): Promise<number> {
    const result = await this.db.query(
      `UPDATE escrows
       SET status = 'released',
           released_at = NOW(),
           released_by = 'system',
           updated_at = NOW()
       WHERE status = 'locked'
         AND locked_at < NOW() - INTERVAL '${releaseAfterHours} hours'
         AND NOT EXISTS (
           SELECT 1 FROM escrow_disputes
           WHERE escrow_disputes.escrow_id = escrows.escrow_id
           AND escrow_disputes.status = 'open'
         )
       RETURNING escrow_id`
    );

    for (const row of result) {
      await this.db.query(
        `INSERT INTO escrow_audit_logs
         (escrow_id, from_status, to_status, actor, actor_type, reason, created_at)
         VALUES ($1, 'locked', 'released', 'system', 'cron', 'Auto-released: confirmation window expired', NOW())`,
        [row.escrow_id]
      );
    }

    return result.length;
  }
}
```


### 6.7 Express Routes

```typescript
// src/routes/escrow.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { EscrowService } from '../services/escrow.service';

export function createEscrowRouter(escrowService: EscrowService): Router {
  const router = Router();

  // Middleware: parse raw body for webhook
  const rawBodyMiddleware = (req: Request, res: Response, next: NextFunction) => {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      (req as any).rawBody = data;
      next();
    });
  };

  /**
   * POST /escrow/create
   * Create a new escrow payment.
   */
  router.post('/create', async (req: Request, res: Response) => {
    try {
      const result = await escrowService.createEscrow({
        buyerId: req.body.buyer_id,
        sellerId: req.body.seller_id,
        amount: req.body.amount,
        title: req.body.title,
        description: req.body.description,
        metadata: req.body.metadata,
      });
      res.json({ success: true, data: result });
    } catch (error: any) {
      console.error('Create escrow error:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /telebirr/notify
   * Telebirr webhook endpoint.
   */
  router.post('/telebirr/notify', rawBodyMiddleware, async (req: Request, res: Response) => {
    try {
      const rawBody = (req as any).rawBody;
      const result = await escrowService.handleWebhook(rawBody);

      // Log webhook for debugging
      console.log('Webhook processed:', result);

      res.json({ success: true, ...result });
    } catch (error: any) {
      console.error('Webhook error:', error);

      // Return 400 for signature errors (don't retry)
      // Return 500 for transient errors you want retried
      if (error.message === 'Invalid webhook signature') {
        return res.status(400).json({ success: false, error: error.message });
      }
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /telebirr/return
   * Browser return handler.
   */
  router.get('/telebirr/return', async (req: Request, res: Response) => {
    try {
      const result = await escrowService.handleReturn(req.query as Record<string, string>);

      if (result.success) {
        return res.redirect(`/escrow/success?id=${result.escrowId}`);
      }

      const reason = encodeURIComponent(result.error || result.status || 'unknown');
      return res.redirect(`/escrow/failed?reason=${reason}`);
    } catch (error: any) {
      return res.redirect(`/escrow/failed?reason=${encodeURIComponent(error.message)}`);
    }
  });

  /**
   * POST /escrow/:id/release
   * Release escrow to seller (admin/arbiter action).
   */
  router.post('/:id/release', async (req: Request, res: Response) => {
    try {
      const escrow = await escrowService.releaseToSeller({
        escrowId: req.params.id,
        releasedBy: req.body.released_by,
      });
      res.json({ success: true, data: escrow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /escrow/:id/refund
   * Refund escrow to buyer (admin/arbiter action).
   */
  router.post('/:id/refund', async (req: Request, res: Response) => {
    try {
      const escrow = await escrowService.refundToBuyer({
        escrowId: req.params.id,
        reason: req.body.reason,
        refundedBy: req.body.refunded_by,
      });
      res.json({ success: true, data: escrow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /escrow/:id/dispute
   * Open a dispute.
   */
  router.post('/:id/dispute', async (req: Request, res: Response) => {
    try {
      const escrow = await escrowService.openDispute(
        req.params.id,
        req.body.opened_by,
        req.body.reason
      );
      res.json({ success: true, data: escrow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /escrow/:id/resolve
   * Resolve a dispute.
   */
  router.post('/:id/resolve', async (req: Request, res: Response) => {
    try {
      const escrow = await escrowService.resolveDispute(
        req.params.id,
        req.body.resolved_by,
        req.body.resolution,
        req.body.notes
      );
      res.json({ success: true, data: escrow });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /escrow/:id
   * Get escrow details.
   */
  router.get('/:id', async (req: Request, res: Response) => {
    try {
      const escrow = await escrowService.getEscrow(req.params.id);
      res.json({ success: true, data: escrow });
    } catch (error: any) {
      res.status(404).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /escrows
   * List escrows for authenticated user.
   */
  router.get('/', async (req: Request, res: Response) => {
    try {
      const escrows = await escrowService.listEscrows(
        req.query.user_id as string,
        (req.query.role as 'buyer' | 'seller' | 'all') || 'all'
      );
      res.json({ success: true, data: escrows });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
```

### 6.8 Application Entry Point

```typescript
// src/app.ts

import express from 'express';
import { TelebirrClient } from './clients/telebirr.client';
import { Database } from './db/escrow.db';
import { EscrowService } from './services/escrow.service';
import { createEscrowRouter } from './routes/escrow.routes';
import { telebirrConfig } from './config/telebirr';

async function main() {
  // Initialize database
  const db = new Database(process.env.DATABASE_URL!);

  // Initialize Telebirr client
  const telebirr = new TelebirrClient(telebirrConfig);

  // Initialize escrow service
  const escrowService = new EscrowService(telebirr, db);

  // Setup Express
  const app = express();
  app.use(express.json());

  // Health check
  app.get('/health', async (req, res) => {
    const ping = await telebirr.ping();
    res.json({
      status: 'ok',
      telebirr: ping.ok ? 'connected' : 'degraded',
      telebirrLatency: ping.latency,
    });
  });

  // Mount escrow routes
  app.use('/escrow', createEscrowRouter(escrowService));

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Escrow server running on port ${PORT}`);
    console.log(`Environment: ${telebirrConfig.environment}`);
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await db.close();
    process.exit(0);
  });
}

main().catch(console.error);
```

### 6.9 Cron Jobs (Auto-Expiry & Auto-Release)

```typescript
// src/jobs/escrow.cron.ts

import { EscrowService } from '../services/escrow.service';

export function startCronJobs(escrowService: EscrowService) {
  // Run every hour: expire pending escrows
  setInterval(async () => {
    try {
      console.log('Running auto-expiry job...');
      const expired = await escrowService.expirePendingEscrows();
      if (expired > 0) console.log(`Expired ${expired} pending escrows`);
    } catch (error) {
      console.error('Auto-expiry job failed:', error);
    }
  }, 60 * 60 * 1000);

  // Run every hour: auto-release confirmed escrows
  setInterval(async () => {
    try {
      console.log('Running auto-release job...');
      const released = await escrowService.autoReleaseEscrows(168); // 7 days
      if (released > 0) console.log(`Auto-released ${released} escrows`);
    } catch (error) {
      console.error('Auto-release job failed:', error);
    }
  }, 60 * 60 * 1000);
}
```

---

## 7. Database Schema

### 7.1 Core Tables

```sql
-- ============================================================
-- 1. ESCROWS TABLE
-- ============================================================
CREATE TABLE escrows (
    id                  SERIAL PRIMARY KEY,
    escrow_id           VARCHAR(64) NOT NULL UNIQUE,
    buyer_id            VARCHAR(64) NOT NULL,
    seller_id           VARCHAR(64) NOT NULL,
    amount              DECIMAL(15, 2) NOT NULL,
    currency            VARCHAR(3) NOT NULL DEFAULT 'ETB',
    title               VARCHAR(255) NOT NULL,
    description         TEXT,
    status              VARCHAR(20) NOT NULL DEFAULT 'pending',
    prepay_id           VARCHAR(128),
    telebirr_payment_order_id VARCHAR(128),
    paid_amount         DECIMAL(15, 2),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at          TIMESTAMP,
    paid_at             TIMESTAMP,
    locked_at           TIMESTAMP,
    released_at         TIMESTAMP,
    released_by         VARCHAR(64),
    refunded_at         TIMESTAMP,
    refunded_by         VARCHAR(64),
    refund_reason       TEXT,
    refund_telebirr_response JSONB,
    disputed_at         TIMESTAMP,
    disputed_by         VARCHAR(64),
    dispute_reason      TEXT,
    dispute_resolution  VARCHAR(20),
    metadata            JSONB DEFAULT '{}',
    updated_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'locked', 'released', 'refunded', 'disputed', 'expired', 'cancelled')),
    CONSTRAINT positive_amount CHECK (amount > 0)
);

CREATE INDEX idx_escrows_buyer ON escrows(buyer_id);
CREATE INDEX idx_escrows_seller ON escrows(seller_id);
CREATE INDEX idx_escrows_status ON escrows(status);
CREATE INDEX idx_escrows_created ON escrows(created_at);

-- ============================================================
-- 2. ESCROW AUDIT LOGS (Immutable)
-- ============================================================
CREATE TABLE escrow_audit_logs (
    id              SERIAL PRIMARY KEY,
    escrow_id       VARCHAR(64) NOT NULL REFERENCES escrows(escrow_id) ON DELETE CASCADE,
    from_status     VARCHAR(20),
    to_status       VARCHAR(20) NOT NULL,
    actor           VARCHAR(64) NOT NULL,
    actor_type      VARCHAR(20) NOT NULL DEFAULT 'system',
    reason          TEXT,
    metadata        JSONB DEFAULT '{}',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_escrow ON escrow_audit_logs(escrow_id);
CREATE INDEX idx_audit_created ON escrow_audit_logs(created_at);

-- ============================================================
-- 3. USERS
-- ============================================================
CREATE TABLE users (
    id              VARCHAR(64) PRIMARY KEY,
    phone           VARCHAR(20) UNIQUE NOT NULL,
    email           VARCHAR(255) UNIQUE,
    full_name       VARCHAR(255) NOT NULL,
    kyc_status      VARCHAR(20) DEFAULT 'pending',
    kyc_verified_at TIMESTAMP,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 4. ESCROW DISPUTES
-- ============================================================
CREATE TABLE escrow_disputes (
    id              SERIAL PRIMARY KEY,
    escrow_id       VARCHAR(64) NOT NULL UNIQUE REFERENCES escrows(escrow_id) ON DELETE CASCADE,
    opened_by       VARCHAR(64) NOT NULL,
    opened_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason          TEXT NOT NULL,
    evidence_urls   TEXT[],
    status          VARCHAR(20) NOT NULL DEFAULT 'open',
    resolution      TEXT,
    resolved_by     VARCHAR(64),
    resolved_at     TIMESTAMP,
    buyer_refund_amount DECIMAL(15, 2) DEFAULT 0,
    seller_payout_amount DECIMAL(15, 2) DEFAULT 0,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 5. WEBHOOK LOGS
-- ============================================================
CREATE TABLE webhook_logs (
    id              SERIAL PRIMARY KEY,
    escrow_id       VARCHAR(64),
    event_type      VARCHAR(50) NOT NULL,
    payload         JSONB NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processed       BOOLEAN NOT NULL DEFAULT FALSE,
    processing_error TEXT,
    received_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at    TIMESTAMP
);

CREATE INDEX idx_webhook_escrow ON webhook_logs(escrow_id);

-- ============================================================
-- 6. TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_escrows_updated_at BEFORE UPDATE ON escrows
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 7.2 Views

```sql
-- Active escrows (locked, not expired)
CREATE VIEW active_escrows AS
SELECT * FROM escrows
WHERE status = 'locked'
  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP);

-- Daily transaction summary
CREATE VIEW daily_summary AS
SELECT
    DATE(created_at) as date,
    COUNT(*) as total_transactions,
    SUM(CASE WHEN status = 'locked' THEN 1 ELSE 0 END) as successful_payments,
    SUM(CASE WHEN status = 'released' THEN 1 ELSE 0 END) as released_count,
    SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) as refunded_count,
    SUM(amount) as total_volume,
    SUM(CASE WHEN status = 'released' THEN amount ELSE 0 END) as released_volume,
    SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as refunded_volume
FROM escrows
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## 8. Escrow Flow & State Machine

### 8.1 State Definitions

| State | Description | Allowed Transitions |
|-------|-------------|---------------------|
| **pending** | Order created, awaiting buyer payment | locked, expired, cancelled |
| **locked** | Payment confirmed, funds held in escrow | released, refunded, disputed |
| **released** | Funds released to seller | — (terminal) |
| **refunded** | Funds refunded to buyer | — (terminal) |
| **disputed** | Dispute opened, under review | released, refunded |
| **expired** | Payment deadline passed | — (terminal) |
| **cancelled** | Manually cancelled before payment | — (terminal) |

### 8.2 Flow Diagram

```
                    +---------+
         +--------->| PENDING |<---------+
         |          |         |          |
         |          +----+----+ | timeout  |
         |               |      |          |
         |          pay  |      v          |
         |               |    +-------+     |
         |               +--->| LOCKED|     |
         |                    |         |     |
         |                    +----+----+     |
         |                         |         |
    +----+----+  +---------+  +----v----+    |
    | RELEASED|  | REFUNDED|  | DISPUTED|    |
    | (seller)|  | (buyer) |  |         |    |
    +---------+  +---------+  +----+----+    |
                                   |         |
                            +------v------+  |
                            |  RESOLVED   |  |
                            | released/   |  |
                            | refunded    |  |
                            +-------------+  |
```

### 8.3 API Flows

#### Create Escrow
```http
POST /escrow/create
Content-Type: application/json

{
  "buyer_id": "user_123",
  "seller_id": "user_456",
  "amount": "5000.00",
  "title": "Laptop Purchase - MacBook Pro",
  "description": "2023 MacBook Pro M2, 16GB RAM",
  "metadata": { "product_id": "prod_789" }
}

Response:
{
  "success": true,
  "data": {
    "escrow_id": "ESC8X2KP9M3N",
    "checkout_url": "https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?prepay_id=PRE123...",
    "prepay_id": "PRE123..."
  }
}
```

#### Telebirr Webhook
```http
POST /telebirr/notify
Content-Type: application/json

{
  "merch_order_id": "ESC8X2KP9M3N",
  "payment_order_id": "PAY987...",
  "trade_status": "PAY_SUCCESS",
  "total_amount": "5000.00",
  "trans_currency": "ETB",
  "trans_end_time": "2026-08-03T15:45:00Z",
  "sign": "base64signature...",
  "sign_type": "SHA256withRSA"
}

Response:
{
  "success": true,
  "processed": true,
  "escrow_id": "ESC8X2KP9M3N"
}
```

#### Release to Seller
```http
POST /escrow/ESC8X2KP9M3N/release
Content-Type: application/json
Authorization: Bearer admin_token

{
  "released_by": "admin_001"
}
```

#### Refund to Buyer
```http
POST /escrow/ESC8X2KP9M3N/refund
Content-Type: application/json
Authorization: Bearer admin_token

{
  "reason": "Item not as described",
  "refunded_by": "admin_001"
}
```

#### Open Dispute
```http
POST /escrow/ESC8X2KP9M3N/dispute
Content-Type: application/json

{
  "opened_by": "user_123",
  "reason": "Received damaged item"
}
```

#### Resolve Dispute
```http
POST /escrow/ESC8X2KP9M3N/resolve
Content-Type: application/json
Authorization: Bearer admin_token

{
  "resolved_by": "admin_001",
  "resolution": "buyer_wins",
  "notes": "Evidence supports buyer claim"
}
```


---

## 9. Webhook & Return URL Handling

### 9.1 The Race Condition Problem

In production, **two events arrive independently and race each other**:

1. **Webhook (server-to-server)** — arrives directly from Telebirr to your backend
2. **Return URL (browser redirect)** — buyer's browser redirects after payment

**Critical rules:**
- Either can arrive first
- Both can arrive
- Neither should be trusted on its own
- **Always verify server-to-server** via `getOrderStatus()`

### 9.2 Webhook Processing Pattern

```typescript
async function handleWebhook(rawBody: string) {
  const notification = JSON.parse(rawBody);

  // 1. Verify signature
  if (!telebirr.verifyNotification(notification)) {
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // 2. Server-to-server verification (authoritative)
  const status = await telebirr.getOrderStatus(notification.merch_order_id);

  if (!status.paid) {
    return res.json({ processed: false });
  }

  // 3. Atomic update with idempotency
  await db.transaction(async (client) => {
    const result = await client.query(
      `UPDATE escrows SET status = 'locked', ...
       WHERE escrow_id = $1 AND status = 'pending'`,
      [notification.merch_order_id]
    );

    if (result.rowCount === 0) {
      // Already processed — silently succeed
      return;
    }

    // Fulfill order
    await fulfillOrder(notification.merch_order_id);
  });

  // 4. Acknowledge with HTTP 200
  return res.json({ success: true });
}
```

### 9.3 Return URL Processing

```typescript
async function handleReturn(queryParams: Record<string, string>) {
  const verification = telebirr.verifyReturnUrl(queryParams);

  if (!verification.isValid) {
    return res.redirect('/payment/failed?reason=invalid');
  }

  // Show appropriate page based on status
  if (verification.isSuccess) {
    return res.redirect(`/escrow/success?id=${verification.merchOrderId}`);
  }

  return res.redirect('/payment/failed');
}
```

### 9.4 Webhook Acknowledgment Contract

| Scenario | HTTP Status | Response Body |
|----------|-------------|---------------|
| Success | 200 | `{"success": true}` |
| Invalid signature | 400 | `{"success": false, "error": "Invalid signature"}` |
| Transient error (DB down) | 500 | `{"success": false}` |
| Already processed | 200 | `{"success": true, "processed": false}` |

**Important:** Return HTTP 200 once you've durably recorded the event. Any non-2xx tells Telebirr the delivery failed, and they will retry.

---

## 10. Idempotency & Race Conditions

### 10.1 The Idempotent Settlement Pattern

This is the **most critical pattern** in escrow. It prevents double-fulfillment when the webhook and return URL race.

```typescript
async function settleEscrow(escrowId: string): Promise<void> {
  // 1. Get authoritative status from Telebirr
  const status = await telebirr.getOrderStatus(escrowId);

  if (!status.paid) {
    return; // Not paid yet
  }

  // 2. Atomic compare-and-set
  const result = await db.query(
    `UPDATE escrows 
     SET status = 'locked',
         telebirr_payment_order_id = $1,
         paid_amount = $2,
         locked_at = NOW()
     WHERE escrow_id = $3 
       AND status = 'pending'
       AND amount = $2
     RETURNING escrow_id`,
    [status.paymentOrderId, status.amount, escrowId]
  );

  // 3. Only the first caller succeeds
  if (result.length === 1) {
    await notifyParties(escrowId);
    await updateAnalytics(escrowId);
  }
  // If result.length === 0, another process already handled it — safe to ignore
}
```

### 10.2 Why This Works

| Scenario | Webhook Handler | Return URL Handler | Outcome |
|----------|----------------|-------------------|---------|
| Webhook arrives first | Locks funds | Sees already locked | No double-process |
| Return arrives first | Sees already locked | Locks funds | No double-process |
| Both arrive simultaneously | One wins DB lock | Other gets 0 rows | No double-process |
| Telebirr retries webhook | Sees already locked | — | Idempotent |

### 10.3 Amount Verification

**Always verify the paid amount matches your expected amount.** Never trust the amount from callbacks.

```typescript
if (status.amount !== expectedAmount) {
  // Log for investigation — possible tampering or rounding issue
  await logAmountMismatch(escrowId, expectedAmount, status.amount);
  throw new Error('Amount mismatch');
}
```

---

## 11. Fee Structure

### 11.1 Telebirr Merchant Fees

| Transaction Type | Fee |
|-----------------|-----|
| **Online merchant payment (C2B)** | **0.5% of transaction value** |
| Consumer P2P transfer | Free or minimal (paid by user) |
| Consumer cash-out | Paid by user |
| B2C disbursement (payout) | Negotiated with Ethio Telecom |

### 11.2 Cost Comparison at Scale

| Transaction Amount | Telebirr (0.5%) | Chapa (2.5%) | CBE Transfer (~Birr 57.5) |
|-------------------|-----------------|--------------|---------------------------|
| Birr 100 | Birr 0.50 | Birr 2.50 | Birr 57.50 |
| Birr 1,000 | Birr 5.00 | Birr 25.00 | Birr 57.50 |
| Birr 10,000 | Birr 50.00 | Birr 250.00 | Birr 57.50 |
| Birr 50,000 | Birr 250.00 | Birr 1,250.00 | Birr 57.50 |
| Birr 100,000 | Birr 500.00 | Birr 2,500.00 | Birr 57.50 |

### 11.3 Engineering Cost Consideration

While Telebirr's 0.5% is cheaper than Chapa's 2.5%, the **engineering cost is significantly higher**:

| Factor | Telebirr Direct | Chapa |
|--------|----------------|-------|
| Integration time | 2–4 weeks | 2–3 days |
| RSA key management | Required | Abstracted |
| Fabric token handling | Manual | Abstracted |
| Signature verification | Manual | Abstracted |
| Test environment stability | Unstable | Stable |
| Documentation | Limited | Comprehensive |

**Recommendation:** Use Telebirr direct if you process >Birr 5M/month (the engineering cost is amortized). Use Chapa for faster launch and lower maintenance.

---

## 12. Regulatory Compliance

### 12.1 Current Regulatory Landscape (Ethiopia)

| Regulation | Status | Impact on Escrow |
|------------|--------|-----------------|
| **NBE PSO License** | Required for payment processing | Telebirr holds this; you operate as merchant |
| **Escrow accounts at banks** | **NOT permitted** for PSOs | Cannot hold funds in segregated escrow account |
| **E-commerce trust mechanisms** | Gap identified in NBE strategy | Workaround: ledger-based escrow in merchant account |
| **KYC requirements** | Required for merchants | Complete Ethio Telecom onboarding |
| **AML/CFT compliance** | Required | Maintain audit logs, report suspicious transactions |

### 12.2 NBE Digital Payments Strategy 2026-2030

The National Bank of Ethiopia explicitly plans to:

> "Review existing regulatory frameworks to permit licensed payment system operators to establish and operate escrow accounts at commercial banks and resolve the discrepancy between settlement timelines and e-commerce return policies."

**What this means for you:**
- Build ledger-based escrow now (legally defensible)
- Monitor NBE announcements for escrow account permissions
- Be ready to migrate to formal escrow accounts when regulations change

### 12.3 Compliance Checklist

- [ ] Complete Telebirr merchant onboarding with full KYC
- [ ] Maintain immutable audit logs of all transactions
- [ ] Implement transaction monitoring for AML/CFT
- [ ] Display clear escrow terms to buyers and sellers
- [ ] Define and publish dispute resolution process
- [ ] Secure user data per Ethiopian data protection laws
- [ ] Maintain sufficient float for refunds and payouts
- [ ] Report large or suspicious transactions to NBE if required

---

## 13. Testing & Sandbox

### 13.1 Test Environment

| Attribute | Value |
|-----------|-------|
| API Base | `https://developerportal.ethiotelebirr.et:38443/apiaccess/payment/gateway` |
| Checkout URL | `https://developerportal.ethiotelebirr.et:38443/payment/web/paygate?` |
| Stability | **Frequently unstable** |
| Common error | `49401024991: "southbound business service is unavailable"` |

### 13.2 Sandbox Tips

1. **Expect transient failures** — the test gateway regularly throws infrastructure errors. Enable retry logic.

2. **Use tunnels for webhooks** — Your `notifyUrl` must be publicly reachable:
   ```bash
   ngrok http 3000
   # Set TELEBIRR_NOTIFY_URL=https://your-ngrok-url/telebirr/notify
   ```

3. **Test card/account numbers** — Provided by Ethio Telecom during onboarding.

4. **Don't disable SSL verification** — The test gateway has an incomplete certificate chain. The client should bundle the CA chain instead of disabling verification.

### 13.3 Test Scenarios

| Scenario | Expected Result |
|----------|----------------|
| Successful payment | Status -> `locked`, webhook received |
| Insufficient funds | Status stays `pending`, buyer sees error |
| Payment timeout | Status -> `expired` after 24h |
| Duplicate webhook | Idempotent — no double-processing |
| Invalid signature | 400 error, no state change |
| Amount mismatch | Logged, no state change |
| Refund after lock | Status -> `refunded`, buyer receives funds |
| Dispute and resolve | Status -> `disputed` -> `released`/`refunded` |

---

## 14. Production Checklist

### 14.1 Pre-Launch

- [ ] Merchant onboarding completed with Ethio Telecom
- [ ] Production credentials received and stored securely
- [ ] Database schema deployed and indexed
- [ ] SSL certificates valid for all domains
- [ ] `notifyUrl` and `redirectUrl` use HTTPS
- [ ] Webhook endpoint publicly accessible
- [ ] Error monitoring configured (Sentry, LogRocket, etc.)
- [ ] Database backups configured
- [ ] Rate limiting enabled on all endpoints
- [ ] Admin dashboard for dispute resolution built

### 14.2 Security

- [ ] Private keys stored in secret manager (AWS Secrets Manager, HashiCorp Vault, etc.)
- [ ] No credentials in code repositories
- [ ] Webhook signatures verified on every request
- [ ] Server-to-server verification on every payment
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention on all user-facing pages
- [ ] CSRF protection on state-changing endpoints
- [ ] Admin endpoints protected with strong authentication

### 14.3 Operations

- [ ] Health check endpoint monitors Telebirr connectivity
- [ ] Cron jobs for auto-expiry and auto-release scheduled
- [ ] Alerting configured for payment failures
- [ ] Escrow liability tracked separately from settlement
- [ ] Sufficient float maintained for refunds
- [ ] Disaster recovery plan documented

### 14.4 Legal

- [ ] Terms of service include escrow terms
- [ ] Dispute resolution process published
- [ ] Privacy policy compliant with Ethiopian law
- [ ] Seller agreement signed by all sellers
- [ ] Refund policy clearly stated

---

## 15. Appendix: Environment Variables

```bash
# Telebirr Configuration
TELEBIRR_ENVIRONMENT=production          # or "test"
TELEBIRR_FABRIC_APP_ID=xxxxxxxx-xxxx-...
TELEBIRR_APP_SECRET=your_app_secret
TELEBIRR_MERCHANT_APP_ID=your_merchant_app_id
TELEBIRR_MERCHANT_CODE=123456
TELEBIRR_PRIVATE_KEY="MIIEvgIBADANBgkqhkiG9w0BAQE..."
TELEBIRR_PUBLIC_KEY="MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8..."
TELEBIRR_NOTIFY_URL=https://yourdomain.com/telebirr/notify
TELEBIRR_REDIRECT_URL=https://yourdomain.com/telebirr/return

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/escrow_db

# Server
PORT=3000
NODE_ENV=production

# Security
JWT_SECRET=your_jwt_secret_for_admin_auth
ADMIN_API_KEY=your_admin_api_key

# Optional: Redis for token caching
REDIS_URL=redis://localhost:6379
```

---

## Summary

This guide provides a complete, production-ready **Lock Escrow Architecture** using **Telebirr** direct integration. Key takeaways:

1. **Telebirr direct integration** gives you the lowest fees (0.5%) but requires handling RSA-PSS signatures, fabric tokens, and manual merchant onboarding.

2. **The escrow state machine** (`pending -> locked -> released/refunded/disputed`) is enforced at the database level with atomic updates.

3. **Idempotency is critical** — use `UPDATE ... WHERE status = 'pending'` to prevent race conditions between webhooks and return URLs.

4. **Server-to-server verification** via `getOrderStatus()` is the only authoritative source of payment truth. Never trust browser redirects alone.

5. **Ethiopian regulations** currently don't allow formal escrow accounts, so funds are held in your merchant account with ledger-based tracking. The NBE plans to change this in the coming years.

6. **The TypeScript implementation** includes: client, service layer, Express routes, database layer, cron jobs, and full type safety.

7. **Security** is layered: RSA signatures, HTTPS, input validation, audit logging, and atomic database operations.

---

*Document Version: 1.0*  
*For questions or updates, refer to the Telebirr Developer Portal at developer.ethiotelecom.et*
