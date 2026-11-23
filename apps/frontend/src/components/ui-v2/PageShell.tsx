import type { ReactNode } from "react";
import "./PageShell.css";

interface PageShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PageShell({ title, subtitle, actions, children, className = "" }: PageShellProps) {
  return (
    <div className={`ps ${className}`}>
      <div className="ps__head">
        <div className="ps__heading">
          <h1 className="ps__title">{title}</h1>
          {subtitle && <p className="ps__sub">{subtitle}</p>}
        </div>
        {actions && <div className="ps__actions">{actions}</div>}
      </div>
      {children}
    </div>
  );
}

export default PageShell;
