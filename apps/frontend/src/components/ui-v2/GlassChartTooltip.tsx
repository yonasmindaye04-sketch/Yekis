import type { ReactNode } from "react";
import "./GlassChartTooltip.css";

export interface TooltipPayloadItem {
  name?: string | number;
  value?: string | number | unknown;
  color?: string;
  [key: string]: unknown;
}

export interface GlassChartTooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<TooltipPayloadItem> | TooltipPayloadItem[];
  label?: ReactNode;
}

export function GlassChartTooltip({ active, payload, label }: GlassChartTooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="gct">
      {label && <p className="gct__label">{label}</p>}
      {payload.map((p, index) => (
        <p key={p.name ? String(p.name) : index} className="gct__row">
          <span className="gct__dot" style={{ background: p.color ?? "var(--color-primary)" }} />
          <span className="gct__name">{String(p.name ?? "")}</span>
          <strong className="gct__val">{String(p.value ?? "")}</strong>
        </p>
      ))}
    </div>
  );
}

export default GlassChartTooltip;
