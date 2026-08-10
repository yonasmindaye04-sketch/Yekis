# Architecture And Product Decisions

## 2026-08-07

### Per-Milestone Disputes

A dispute is unique by `milestoneId`, not by contract. Multi-milestone contracts can therefore resolve one contested delivery without collapsing the whole agreement into a single case.

### Financial Transitions Must Be Retry-Safe

Proposal acceptance uses serializable isolation. Funding permits one pending attempt per milestone. Release, refund, and split use guarded state updates and transactions. These controls are required because HTTP retries, worker retries, and concurrent requests are normal operating conditions.

### Periodic KYC Review Does Not Revoke Access Automatically

The refresh worker sets `periodicReviewPending` for staff follow-up while preserving `VERIFIED`. Access changes require an explicit review decision, avoiding an unreviewed scheduled job disabling active users.

### External Boundaries Stay Explicit

Development mocks and provider adapters may exercise the full local journey, but documentation and UI must not describe them as live fund movement or production identity verification. STR filing remains a human action that the platform records.

### Documentation Is Part Of Done

Every implementation change updates its relevant Markdown source of truth and `CHANGELOG.md`. One authoritative completeness checklist is maintained to prevent contradictory status documents.

## 2026-08-03

### Chosen Stack

- Express and TypeScript for a compact, typed API and service layer.
- React and Vite for browser and Telegram Mini App delivery.
- Prisma and PostgreSQL for schema-driven transactional persistence.
- BullMQ and Redis for delayed and retryable workflows.
- MinIO/S3-compatible storage for regulated and generated documents.

### Core Product Decisions

- Escrow is milestone based.
- Contracts are generated from accepted proposals.
- KYC is a tiered action gate.
- Both parties sign before funding.
- Disputes use a structured, auditable escalation path.
- Financial totals and transitions are server controlled.
