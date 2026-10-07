/* ────────────────────────────────────────────────────────────────────────
   opsNav.ts — sidebar configuration for the Operations Console.
   Badge counts come from opsApi.badges(); visibility comes from opsPerms.
   ──────────────────────────────────────────────────────────────────────── */

import {
  Activity,
  BarChart3,
  BookOpen,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Scale,
  Shield,
  TriangleAlert,
  UserCheck,
  UserRound,
  Users,
  Wallet,
  WalletCards,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { OpsBadges } from "./opsTypes";
import type { OpsPageId } from "./opsPerms";

export type { OpsPageId } from "./opsPerms";

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
    label: "Cases",
    items: [
      {
        id: "support",
        name: "Support Desk",
        icon: MessageSquare,
        badge: (b) => b.tickets,
      },
      {
        id: "dispute-queue",
        name: "Dispute Mediation",
        icon: Scale,
        badge: (b) => b.disputes,
      },
      {
        id: "risk",
        name: "Risk & Fraud",
        icon: XCircle,
        badge: (b) => b.risk,
      },
    ],
  },
  {
    label: "Review Queues",
    items: [
      { id: "kyc", name: "KYC Reviews", icon: UserCheck, badge: (b) => b.kyc },
      {
        id: "reports-queue",
        name: "Profile Reports",
        icon: TriangleAlert,
        badge: (b) => b.reports,
      },
      { id: "gigs", name: "Gig Moderation", icon: FileText },
      {
        id: "receipts",
        name: "Receipts",
        icon: WalletCards,
        badge: (b) => b.receipts,
      },
    ],
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
      { id: "withholding", name: "Tax Reports", icon: FileText },
      { id: "ledger", name: "Ledger", icon: BookOpen },
      { id: "reports", name: "Reports", icon: BarChart3 },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "users", name: "Users", icon: Users },
      { id: "staff", name: "Staff & Roles", icon: Shield },
      { id: "featured", name: "Featured Talent", icon: UserCheck },
      { id: "bot", name: "Telegram Bot", icon: MessageSquare },
      { id: "audit", name: "Audit Logs", icon: FileText },
      {
        id: "monitoring",
        name: "System Health",
        icon: Activity,
        badge: (b) => b.monitoring,
      },
    ],
  },
  {
    label: "Account",
    items: [{ id: "profile", name: "My Profile", icon: UserRound }],
  },
];

export const OPS_PAGES: OpsNavItem[] = OPS_NAV.flatMap((g) => g.items);
