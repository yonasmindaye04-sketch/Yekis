import type { ReactNode } from "react";
import "./ShinyBadge.css";

type BadgeVariant = "success" | "warning" | "error" | "info" | "neutral" | "processing";

interface ShinyBadgeProps {
  variant: BadgeVariant;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}

export function ShinyBadge({ variant, children, dot = false, className = "" }: ShinyBadgeProps) {
  return (
    <span className={`sb sb--${variant} ${className}`}>
      {dot && <span className="sb__dot" aria-hidden />}
      {children}
    </span>
  );
}

export default ShinyBadge;
