import { useEffect, useState } from "react";

/**
 * Lightweight scroll/motion layer for the marketing site.
 * - PageLoadSplash: branded first-paint animation (once per session)
 * - ScrollEffects: top progress bar, header shadow, hero parallax
 * - useScrollReveal: reveals [data-reveal] elements as they enter viewport
 *
 * All motion is disabled automatically for users with
 * `prefers-reduced-motion: reduce` (handled in scroll.css).
 */

const SPLASH_KEY = "yekis_splash_seen";

// ── Splash ────────────────────────────────────────────────

export function PageLoadSplash() {
  const [show, setShow] = useState(() => {
    try {
      return sessionStorage.getItem(SPLASH_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (!show) return;
    const fadeTimer = setTimeout(() => setFading(true), 850);
    const doneTimer = setTimeout(() => {
      setShow(false);
      try {
        sessionStorage.setItem(SPLASH_KEY, "1");
      } catch {
        /* private mode - show again next visit, harmless */
      }
    }, 1350);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div
      className={`yekis-splash ${fading ? "yekis-splash-fade" : ""}`}
      aria-hidden="true"
    >
      <div className="yekis-splash-inner">
        <img src="/svgviewer-output.svg" alt="" className="yekis-splash-logo" />
        <span className="yekis-splash-word">Yekis</span>
        <div className="yekis-splash-bar">
          <div className="yekis-splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}

// ── Header shadow + hero parallax ──────

export function ScrollEffects() {
  useEffect(() => {
    // Clean up any lingering scroll progress bar elements if present
    document.querySelectorAll(".yekis-scroll-progress").forEach((el) => el.remove());

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;

        const header = document.querySelector(".marketing-header");
        if (header) header.classList.toggle("is-scrolled", doc.scrollTop > 8);

        document
          .querySelectorAll<HTMLElement>("[data-parallax]")
          .forEach((el) => {
            const speed = Number(el.dataset.parallax) || 0.15;
            const rect = el.getBoundingClientRect();
            // Only parallax while the element is near the viewport
            if (rect.bottom < 0 || rect.top > window.innerHeight) return;
            el.style.setProperty(
              "--parallax-y",
              `${Math.round(doc.scrollTop * speed * 10) / 10}px`,
            );
          });
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}

// ── Reveal-on-scroll for [data-reveal] elements ───────────

export function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"),
    );
    if (els.length === 0) return;

    // Elements already in view on mount reveal immediately (no pop-in flash)
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            const delay = Number(el.dataset.revealDelay) || 0;
            el.style.transitionDelay = `${delay}ms`;
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
