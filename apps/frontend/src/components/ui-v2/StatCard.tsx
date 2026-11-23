import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { GlassCard } from "./GlassCard";
import "./StatCard.css";

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: { pct: number; label?: string };
  icon?: LucideIcon;
  accent?: "green" | "blue" | "amber" | "red" | "teal";
  chart?: ReactNode;
  className?: string;
}

export function StatCard({ label, value, delta, icon: Icon, accent = "green", chart, className = "" }: StatCardProps) {
  const up = delta ? delta.pct >= 0 : null;
  return (
    <GlassCard accent={accent} className={`sc ${className}`}>
      <div className="sc__top">
        <div>
          <span className="sc__label">{label}</span>
          {Icon && (
            <div className={`sc__icon sc__icon--${accent}`}>
              <Icon size={16} />
            </div>
          )}
        </div>
        {chart && <div className="sc__chart">{chart}</div>}
      </div>
      <div className="sc__value">{value}</div>
      {delta && (
        <div className={`sc__delta sc__delta--${up ? "up" : "down"}`}>
          {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          <span>{up ? "+" : ""}{delta.pct}%</span>
          {delta.label && <span className="sc__delta-label">{delta.label}</span>}
        </div>
      )}
    </GlassCard>
  );
}

export default StatCard;
