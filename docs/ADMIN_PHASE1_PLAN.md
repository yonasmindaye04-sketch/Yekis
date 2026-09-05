# Admin Ops Dashboard — Phase 1 (Foundation) Implementation Plan

Date: 2026-08-29 · Scope: Admin authentication, RBAC/permissions, audit logging, shared admin layout/navigation.

## A. Audit of the existing codebase (relevant to Phase 1)

| Layer | What exists today | Reuse decision |
|---|---|---|
| Frontend stack | React 19 + Vite + TS, no routing lib (state-driven view switch), `StaffDashboard.tsx` with sidebar tabs: Overview, Support, Receipts, Identity, Disputes, Profiles | Keep. Rework sidebar into grouped IA; keep tab renderers. |
| Backend stack | Express + TS + Zod, `/api/v1` prefix, `requireAuth` (JWT + suspension re-check), `requireStaffRole(...)` guard in `middleware/staffRole.ts` (accepts `COMPLIANCE_OFFICER`/`ADMIN`/`SUPPORT`) | Keep. Add `requirePermission(...)` next to it. |
| Auth | Email/password + Telegram + OAuth; access 1h / refresh 30d with `/auth/refresh` rotation | Keep. No changes needed for Phase 1. |
| Admin API | `modules/admin/admin.routes.ts`: audit-log viewer, user search, suspend/unsuspend, force KYC re-review | Keep. Extend with staff/permission endpoints. |
| Audit | `AuditLog` Prisma model + `lib/audit.ts` `recordAuditEvent()` (append-only by convention; DB-level UPDATE/DELETE revoke planned for prod) | Keep. Extend model additively (previous/new state, amount, request id). |
| DB | PostgreSQL + Prisma. `User.staffRole` enum: `COMPLIANCE_OFFICER`, `ADMIN`, `SUPPORT` | Add new role enum values, never rename/delete existing ones. |
| Some ops queues already live | KYC queue, top-up review, dispute staff queue, TMS queue, support chat, profile reports, finance read models | Untouched in Phase 1. Their routes keep using `requireStaffRole`; new permission middleware is additive. |

### Missing in Phase 1 scope
1. Permission matrix (roles → granular permissions with VIEW/CREATE/EDIT/APPROVE/EXECUTE/MANAGE semantics) and an `requirePermission` middleware.
2. Audit log fields for previous/new state, amount, request id, actor role, IP — and a consistent event-write discipline for admin actions.
3. Admin-facing UI for audit logs (backend already exists) and for staff roles/permissions.
4. Grouped sidebar navigation per the agreed information architecture.

### Conflicts / migration risks
- Renaming `COMPLIANCE_OFFICER` → `COMPLIANCE_ADMIN` would break existing routes/seed. **Decision:** keep `COMPLIANCE_OFFICER`; treat `COMPLIANCE_ADMIN` as a *new* alias role. The permission map covers both. No destructive enum rename.
- Postgres enum `ADD VALUE` cannot run inside a transaction — migration file must stay non-transactional (same approach as `20260829213000_add_support_staff_role`).

---

## B. Phase 1 implementation checklist

### 1. Admin authentication
- **Existing to reuse:** `requireAuth` (JWT verify + suspended re-check), auth login routes, `/auth/refresh`.
- **Files to modify:** none (auth already enforced).
- **Files to create:** none.
- **DB changes:** none.
- **API changes:** none.
- **Security:** suspension/role re-check on every request already done in `requireAuth`; role changes (added in §2) take effect on next request because staff role is re-read from the DB in the permission middleware, not trusted from the JWT.
- **Tests:** verify protected staff route rejects non-staff tokens (extend existing tests).

### 2. RBAC / admin permissions
- **Existing to reuse:** `staffRole` column, `requireStaffRole` middleware, `admin.routes.ts` mount under `/api/v1/admin`.
- **Files to create:**
  - `apps/backend/src/modules/admin/permissions.ts` — pure, testable permission matrix (`PERMISSIONS`, `ROLE_PERMISSIONS`, `hasRolePermission`, `requirePermission`).
- **Files to modify:**
  - `apps/backend/prisma/schema.prisma` — extend `StaffRole` enum (additive): `SUPER_ADMIN`, `OPERATIONS_ADMIN`, `FINANCE_ADMIN`, `DISPUTE_MEDIATOR`, `COMPLIANCE_ADMIN`.
  - `apps/backend/src/modules/admin/admin.routes.ts` — add staff management + matrix endpoints.
  - `apps/backend/src/modules/admin/permissions.ts` consumed by guarded routes (admin endpoints use `requirePermission`; existing modules stay on `requireStaffRole` until later phases).
- **DB changes:** enum values added only (no renames, no drops). Migration: `ALTER TYPE "StaffRole" ADD VALUE ...` per value.
- **API changes:**
  - `GET /api/v1/admin/permissions/matrix` — returns the role → permission map (for UI display).
  - `GET /api/v1/admin/staff` — list staff accounts (id, email, ucid, role, staffRole, createdAt, isSuspended).
  - `POST /api/v1/admin/staff/:userId/role` — body `{ staffRole }`; set or clear (`null`). Guarded by `admins.manage`.
- **Security considerations:**
  - `requirePermission` re-reads `staffRole` from Postgres on every request (no trust in stale JWT).
  - Guard: cannot remove/demote the last active `SUPER_ADMIN` (or legacy `ADMIN`) account; cannot change one's own role.
  - Every role change audited with previous/new state (see §3).
- **Tests:** unit tests for matrix (permission membership, super-admin full access, support least-privilege) and for the role-change guard logic.

### 3. Audit logging
- **Existing to reuse:** `AuditLog` model, `lib/audit.ts#recordAuditEvent` (append-only), admin audit viewer endpoint.
- **Files to modify:**
  - `apps/backend/prisma/schema.prisma` — additive `AuditLog` columns: `actorRole TEXT`, `action TEXT`, `previousState JSONB`, `newState JSONB`, `amountMinor INT`, `requestId TEXT`, `ipAddress TEXT` (+ indexes on `action`, `createdAt`).
  - `apps/backend/src/lib/audit.ts` — extend `recordAuditEvent(options)` with optional fields; keep existing call sites compiling (all-new params optional; `action` defaults to `eventType`).
- **Files to create:** none.
- **DB changes:** additive nullable columns only — safe for existing rows.
- **API changes:** reuse `GET /api/v1/admin/audit-logs` (already paginated/filterable). The new fields are returned automatically.
- **Security:** no admin write/update/delete path for audit rows; role changes are themselves logged; sensitive fields (`amountMinor`) optional and server-set only.
- **Tests:** unit test for `recordAuditEvent` normalization (defaults for absent fields) with a mocked prisma client.

### 4. Shared admin layout / navigation
- **Existing to reuse:** `StaffDashboard.tsx` (sidebar shell, tab renderers, theme toggle, polling), existing queue components (`KycQueue`, `TopUpQueue`, `DisputeQueue`, `ProfileReportsQueue`, support chat panel).
- **Files to modify:** `apps/frontend/src/StaffDashboard.tsx` (grouped collapsible sidebar; role-aware visibility; add Audit Logs + Admins tabs), `apps/frontend/src/api/client.ts` (new admin API methods).
- **Files to create:**
  - `apps/frontend/src/AuditLogsPage.tsx` — searchable/filterable audit table backed by real `/admin/audit-logs` data.
  - `apps/frontend/src/AdminsPage.tsx` — staff list + role editor (guarded to users with `admins.manage`) + permission matrix display from `/admin/permissions/matrix`.
- **DB changes:** none.
- **API changes:** consumed endpoints listed in §2. Marketing/ops modules without real backend yet (Contracts, Escrow, Payments, Payouts, Reconciliation, Ledger, Reports, Risk, Monitoring, Settings) appear in the nav as **disabled placeholders** (no fake data, no routing) — they land in Phases 2–7.
- **Security:** nav items filtered by `staffRole` client-side for UX only; server-side guards are the actual enforcement.
- **Tests:** build-level (type check covers nav config); option: none at UI level in Phase 1.

## C. Phase 1 definition of done
- `pnpm --filter backend build` + `pnpm --filter frontend build` pass.
- New unit tests pass (`permissions`, `audit`).
- Seed still creates admin + compliance + support accounts unchanged.
- Existing staff routes keep working (no guard behavior change for existing roles).
- CHANGELOG + API.md updated.
