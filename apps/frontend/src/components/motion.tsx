import { useEffect } from "react";

/**
 * Lightweight scroll/motion layer for the marketing site.
 * - PageLoadSplash: disabled for instant 0ms first-paint load
 * - ScrollEffects: lightweight header scroll state toggle
 * - useScrollReveal: reveals [data-reveal] elements as they enter viewport
 */

export function PageLoadSplash() {
  return null;
}

export function ScrollEffects() {
  useEffect(() => {
    document.querySelectorAll(".yekis-scroll-progress").forEach((el) => el.remove());

    let lastScrolled = false;
    const onScroll = () => {
      const isScrolled = window.scrollY > 8;
      if (isScrolled !== lastScrolled) {
        lastScrolled = isScrolled;
        const header = document.querySelector(".marketing-header");
        if (header) header.classList.toggle("is-scrolled", isScrolled);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}

export function useScrollReveal() {
  useEffect(() => {
    const els = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-visible)"),
    );
    if (els.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement;
            el.style.transitionDelay = "0ms";
            el.classList.add("is-visible");
            io.unobserve(el);
          }
        }
      },
      { threshold: 0.06, rootMargin: "0px 0px -10px 0px" },
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}
