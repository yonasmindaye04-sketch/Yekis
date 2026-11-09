import { useState } from "react";
import "./HandWrittenTitle.css";

interface HandWrittenTitleProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  asHeading?: "h1" | "h2";
}

export function HandWrittenTitle({
  eyebrow = "Yekis Jobs",
  title = "Make ideas visible.",
  subtitle = "Where verified Ethiopian talent and ambitious teams build together.",
  asHeading = "h2",
}: HandWrittenTitleProps) {
  const [animationKey, setAnimationKey] = useState(0);

  const Heading = asHeading;

  return (
    <section
      className="yk-hw"
      aria-label={title}
      onClick={() => setAnimationKey((current) => current + 1)}
      title="Click to replay animation"
    >
      <span key={`pill-${animationKey}`} className="yk-hw-pill">
        {eyebrow}
      </span>

      <div key={`stage-${animationKey}`} className="yk-hw-stage">
        <svg
          className="yk-hw-circle"
          viewBox="0 0 1200 600"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            pathLength="1"
            d="
              M 950 90
              C 1250 300, 1050 480, 600 520
              C 250 520, 150 480, 150 300
              C 150 120, 350 80, 600 80
              C 850 80, 950 180, 950 180
            "
          />
        </svg>

        <div className="yk-hw-content">
          <Heading className="yk-hw-title">{title}</Heading>
          {subtitle && <p className="yk-hw-sub">{subtitle}</p>}
        </div>
      </div>
    </section>
  );
}
