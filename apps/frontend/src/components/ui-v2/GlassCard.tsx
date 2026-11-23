import type { HTMLAttributes, ReactNode } from "react";
import "./GlassCard.css";

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  noPadding?: boolean;
  accent?: "green" | "blue" | "amber" | "red" | "teal";
}

export function GlassCard({ children, noPadding, accent, className = "", ...props }: GlassCardProps) {
  return (
    <div
      className={[
        "gc",
        noPadding ? "gc--no-pad" : "",
        accent ? `gc--accent-${accent}` : "",
        className,
      ].filter(Boolean).join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

export default GlassCard;
