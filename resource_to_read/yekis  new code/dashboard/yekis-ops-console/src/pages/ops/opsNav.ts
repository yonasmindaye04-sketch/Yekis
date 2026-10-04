/* ────────────────────────────────────────────────────────────────────────
   opsNav.ts — sidebar configuration for the Operations Console.
   Badge counts come from GET /admin/badges (see OpsBadges).
   ──────────────────────────────────────────────────────────────────────── */

import {
  BarChart3,
  BookOpen,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  Scale,
  Shield,
  TriangleAlert,
  UserCheck,
  Users,
  Wallet,
  XCircle,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OpsBadges } from "./opsTypes";

export type OpsPageId =
  | "overview"
  | "contracts"
  | "payments"
  | "payouts"
  | "escrow"
  | "reconciliation"
  | "ledger"
  | "kyc"
  | "dispute-queue"
  | "reports-queue"
  | "users"
  | "staff"
  | "reports"
  | "risk"
  | "monitoring";

export interface OpsNavItem {
  id: OpsPageId;
  name: string;
  icon: LucideIcon;
  badge?: (b: OpsBadges) => number;
}
export interface OpsNavGroup {
  label: string;
  items: OpsNavItem[];
}

export const OPS_NAV: OpsNavGroup[] = [
  {
    label: "Overview",
    items: [{ id: "overview", name: "Command Center", icon: LayoutDashboard }],
  },
  {
    label: "Financial",
    items: [
      { id: "contracts", name: "Contracts", icon: FileText },
      { id: "payments", name: "Payments", icon: CreditCard },
      {
        id: "payouts",
        name: "Payouts",
        icon: Wallet,
        badge: (b) => b.payouts,
      },
      { id: "escrow", name: "Escrow", icon: DollarSign },
      {
        id: "reconciliation",
        name: "Reconciliation",
        icon: Scale,
        badge: (b) => b.recon,
      },
      { id: "ledger", name: "Ledger", icon: BookOpen },
    ],
  },
  {
    label: "Review Queues",
    items: [
      { id: "kyc", name: "KYC Reviews", icon: UserCheck, badge: (b) => b.kyc },
      {
        id: "dispute-queue",
        name: "Dispute Mediation",
        icon: Scale,
        badge: (b) => b.disputes,
      },
      {
        id: "reports-queue",
        name: "Profile Reports",
        icon: TriangleAlert,
        badge: (b) => b.reports,
      },
    ],
  },
  {
    label: "Operations",
    items: [
      { id: "users", name: "Users", icon: Users },
      { id: "staff", name: "Staff & Roles", icon: Shield },
      { id: "reports", name: "Reports", icon: BarChart3 },
      { id: "risk", name: "Risk Flags", icon: XCircle, badge: (b) => b.risk },
      {
        id: "monitoring",
        name: "System Health",
        icon: Activity,
        badge: (b) => b.monitoring,
      },
    ],
  },
];

export const OPS_PAGES: OpsNavItem[] = OPS_NAV.flatMap((g) => g.items);
