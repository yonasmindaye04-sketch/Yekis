/* ────────────────────────────────────────────────────────────────────────
   opsApi.ts — native-fetch service for the Operations Console.
   Plain REST against the NestJS backend; no SDK, no React Query.

   Endpoint map (all JSON, cookie-authenticated, admin-guarded):
     GET   /admin/overview                    → OverviewBundle
     GET   /admin/badges                      → OpsBadges
     GET   /admin/activity                    → ActivityEvent[]
     GET   /admin/health                      → HealthState
     GET   /admin/contracts                   → Contract[]
     GET   /admin/payments                    → Payment[]
     GET   /admin/payouts                     → Payout[]
     POST  /admin/payouts/:id/settle          { outcome, ref?, reason? }
     GET   /admin/escrows                     → Escrow[]
     GET   /admin/reconciliation              → ReconRow[]
     GET   /admin/ledger                      → LedgerBundle
     GET   /admin/users                       → User[]
     GET   /admin/staff                       → StaffMember[]
     PATCH /admin/staff/:id/role              { role }
     GET   /admin/reports                     → ReportsBundle
     GET   /admin/risk-flags                  → RiskFlag[]
     GET   /admin/kyc/queue                   → KycItem[]
     POST  /admin/kyc/:id/decision            { decision, reason? }
     GET   /admin/disputes/mediation          → DisputeItem[]
     POST  /admin/disputes/:id/resolve        { outcome, split?, recommendation }
     GET   /admin/profile-reports             → ProfileReport[]
     POST  /admin/profile-reports/:id/resolve { action, notes }
   ──────────────────────────────────────────────────────────────────────── */

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ActivityEvent,
  Contract,
  DisputeItem,
  DisputeOutcome,
  Escrow,
  HealthState,
  KycDecision,
  KycItem,
  LedgerBundle,
  OpsBadges,
  OverviewBundle,
  Payment,
  Payout,
  ProfileReport,
  ReconRow,
  ReportResolution,
  ReportsBundle,
  RiskFlag,
  StaffMember,
  StaffRole,
  User,
} from "./opsTypes";

const BASE: string =
  ((import.meta as unknown as { env?: Record<string, string | undefined> }).env
    ?.VITE_API_URL) ?? "/api";

export class OpsApiError extends Error {
  constructor(
    public status: number,
    public path: string,
  ) {
    super(`OPS API ${status} — ${path}`);
    this.name = "OpsApiError";
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH",
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    signal,
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new OpsApiError(res.status, path);
  return (await res.json()) as T;
}

const get = <T,>(path: string, signal?: AbortSignal) =>
  request<T>("GET", path, undefined, signal);

export const opsApi = {
  overview: (s?: AbortSignal) => get<OverviewBundle>("/admin/overview", s),
  badges: (s?: AbortSignal) => get<OpsBadges>("/admin/badges", s),
  activity: (s?: AbortSignal) => get<ActivityEvent[]>("/admin/activity", s),
  health: (s?: AbortSignal) => get<HealthState>("/admin/health", s),

  contracts: (s?: AbortSignal) => get<Contract[]>("/admin/contracts", s),
  payments: (s?: AbortSignal) => get<Payment[]>("/admin/payments", s),
  payouts: (s?: AbortSignal) => get<Payout[]>("/admin/payouts", s),
  settlePayout: (
    id: string,
    body: { outcome: "CONFIRMED" | "FAILED"; ref?: string; reason?: string },
  ) => request<void>("POST", `/admin/payouts/${id}/settle`, body),

  escrows: (s?: AbortSignal) => get<Escrow[]>("/admin/escrows", s),
  reconciliation: (s?: AbortSignal) => get<ReconRow[]>("/admin/reconciliation", s),
  ledger: (s?: AbortSignal) => get<LedgerBundle>("/admin/ledger", s),

  users: (s?: AbortSignal) => get<User[]>("/admin/users", s),
  staff: (s?: AbortSignal) => get<StaffMember[]>("/admin/staff", s),
  setStaffRole: (id: string, role: StaffRole) =>
    request<void>("PATCH", `/admin/staff/${id}/role`, { role }),

  reports: (s?: AbortSignal) => get<ReportsBundle>("/admin/reports", s),
  riskFlags: (s?: AbortSignal) => get<RiskFlag[]>("/admin/risk-flags", s),

  kycQueue: (s?: AbortSignal) => get<KycItem[]>("/admin/kyc/queue", s),
  kycDecide: (id: string, decision: KycDecision, reason?: string) =>
    request<void>("POST", `/admin/kyc/${id}/decision`, { decision, reason }),

  disputes: (s?: AbortSignal) =>
    get<DisputeItem[]>("/admin/disputes/mediation", s),
  resolveDispute: (
    id: string,
    body: { outcome: DisputeOutcome; split?: number; recommendation: string },
  ) => request<void>("POST", `/admin/disputes/${id}/resolve`, body),

  profileReports: (s?: AbortSignal) =>
    get<ProfileReport[]>("/admin/profile-reports", s),
  resolveProfileReport: (id: string, action: ReportResolution, notes: string) =>
    request<void>("POST", `/admin/profile-reports/${id}/resolve`, {
      action,
      notes,
    }),
};

/* ── tiny data hook — keeps the console free of any state lib ── */
export interface ApiState<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  reload: () => void;
}

export function useApi<T>(fetcher: (s: AbortSignal) => Promise<T>): ApiState<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fetcher);
  fnRef.current = fetcher;

  const load = useCallback(() => {
    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    fnRef
      .current(ctrl.signal)
      .then((d) => {
        if (!ctrl.signal.aborted) {
          setData(d);
          setLoading(false);
        }
      })
      .catch((e: unknown) => {
        if (!ctrl.signal.aborted) {
          setError(e instanceof Error ? e.message : String(e));
          setLoading(false);
        }
      });
    return ctrl;
  }, []);

  const ctrlRef = useRef<AbortController | null>(null);
  const reload = useCallback(() => {
    ctrlRef.current?.abort();
    ctrlRef.current = load();
  }, [load]);

  useEffect(() => {
    ctrlRef.current = load();
    return () => ctrlRef.current?.abort();
  }, [load]);

  return { data, error, loading, reload };
}

/* ── formatting helpers (minor units → ETB) ── */
export const fmt = (v: number) => `ETB ${(v / 100).toLocaleString()}`;
export const fmt2 = (v: number) => `ETB ${(v / 100).toFixed(2)}`;
export const fmtE = (v: number) => {
  const e = v / 100;
  return e >= 1e6
    ? `${(e / 1e6).toFixed(1)}M`
    : e >= 1e3
      ? `${(e / 1e3).toFixed(0)}K`
      : e.toFixed(0);
};
export const dt = (s: string) =>
  new Date(s).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
export const dts = (s: string) =>
  new Date(s).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
