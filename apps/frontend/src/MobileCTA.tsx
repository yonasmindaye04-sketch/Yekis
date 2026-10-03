import { useState, useEffect } from "react";
import { Briefcase, Search } from "lucide-react";

interface MobileCTAProps {
  onStart: (mode: "login" | "register") => void;
}

export function MobileCTA({ onStart }: MobileCTAProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Hide when footer is in view (landing V2 uses .v2-footer-area,
    // legacy marketing pages use .landing-footer)
    const footer = document.querySelector(
      ".v2-footer-area, .landing-footer",
    );
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => setVisible(!entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  // Only show on mobile
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isMobile || !visible) return null;

  return (
    <div className="mobile-cta-bar">
      <button className="mobile-cta-hire" onClick={() => onStart("register")}>
        <Briefcase size={16} />
        Post a Job
      </button>
      <button className="mobile-cta-work" onClick={() => onStart("register")}>
        <Search size={16} />
        Find Work
      </button>
    </div>
  );
}
