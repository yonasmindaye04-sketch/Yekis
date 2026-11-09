import { useEffect, useMemo, useRef } from "react";
import type { ElementType, RefObject } from "react";

export type ProximityPopTitleProps = {
  text: string;
  as?: ElementType;
  settled?: boolean;
  className?: string;
  stageRef?: RefObject<HTMLElement | null>;
  radius?: number;
  lerp?: number;
  lift?: number;
  grow?: number;
  hoverColor?: [number, number, number];
};

/**
 * Interactive Proximity Pop Text Animation
 * As the pointer moves across the stage/hero, letters near the cursor pop upwards,
 * scale smoothly, turn purple (#a78bfa), and glow with a soft text shadow.
 */
export function ProximityPopTitle({
  text,
  as: Tag = "h1",
  settled = true,
  className = "",
  stageRef,
  radius = 110,
  lerp = 0.16,
  lift = 0.22,
  grow = 0.35,
  hoverColor = [167, 139, 250], // #a78bfa purple
}: ProximityPopTitleProps) {
  const headRef = useRef<HTMLElement>(null);
  const words = useMemo(() => text.split(" "), [text]);

  useEffect(() => {
    const head = headRef.current;
    if (!head || !settled) return;

    const chars = Array.from(head.querySelectorAll<HTMLElement>(".v2-letter, .pop-char, .char"));
    if (chars.length === 0) return;

    const RADIUS = radius;
    const LERP = lerp;
    const LIFT = lift;
    const GROW = grow;
    const PURPLE: [number, number, number] = hoverColor;

    function getOffsetRelativeTo(element: HTMLElement, targetParent: HTMLElement) {
      let x = 0;
      let y = 0;
      let el: HTMLElement | null = element;
      while (el && el !== targetParent) {
        x += el.offsetLeft;
        y += el.offsetTop;
        el = el.offsetParent as HTMLElement | null;
      }
      return { x, y };
    }

    let centers: Array<{ x: number; y: number; cur: number; last: number }> = [];

    function measure() {
      if (!head) return;
      centers = chars.map((s) => {
        const pos = getOffsetRelativeTo(s, head);
        return {
          x: pos.x + s.offsetWidth / 2,
          y: pos.y + s.offsetHeight / 2,
          cur: 0,
          last: -1,
        };
      });
    }

    measure();
    if (document.fonts) {
      document.fonts.ready.then(measure);
    }

    window.addEventListener("resize", measure, { passive: true });

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => {
        measure();
      });
      ro.observe(head);
    }

    const stage: HTMLElement =
      stageRef?.current ||
      head.closest<HTMLElement>(".v2-hero, .hero-section, main") ||
      head.parentElement ||
      head;

    let px = 0;
    let py = 0;
    let inside = false;
    let rafId = 0;
    let isRunning = false;

    const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

    function frame() {
      let hasActive = false;
      const isLight = document.documentElement.getAttribute("data-theme") === "light";
      const restColor: [number, number, number] = isLight ? [15, 23, 42] : [244, 244, 245];
      const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      for (let k = 0; k < chars.length; k++) {
        const c = centers[k];
        if (!c) continue;

        // Target intensity: 1 at the cursor, smoothstep falloff to 0 at RADIUS
        let target = 0;
        if (inside) {
          const d = Math.hypot(px - c.x, py - c.y);
          if (d < RADIUS) {
            const t = 1 - d / RADIUS;
            target = t * t * (3 - 2 * t);
          }
        }

        c.cur += (target - c.cur) * LERP;
        if (c.cur < 0.001 && target === 0) c.cur = 0;

        if (c.cur > 0.0001) {
          hasActive = true;
        }

        if (c.cur === c.last) continue;
        c.last = c.cur;

        const t = c.cur;
        const st = chars[k].style;

        if (reduced) {
          st.transform = "";
          st.color = t
            ? `rgb(${mix(restColor[0], PURPLE[0], t)},${mix(restColor[1], PURPLE[1], t)},${mix(restColor[2], PURPLE[2], t)})`
            : "";
          st.textShadow = t
            ? `0 0 ${(28 * t) | 0}px rgba(167,139,250,${(0.55 * t).toFixed(3)})`
            : "";
        } else {
          st.transform = t
            ? `translateY(${(-LIFT * t).toFixed(4)}em) scale(${(1 + GROW * t).toFixed(4)})`
            : "";

          st.color = t
            ? `rgb(${mix(restColor[0], PURPLE[0], t)},${mix(restColor[1], PURPLE[1], t)},${mix(restColor[2], PURPLE[2], t)})`
            : "";

          st.textShadow = t
            ? `0 0 ${(28 * t) | 0}px rgba(167,139,250,${(0.55 * t).toFixed(3)})`
            : "";
        }
      }

      if (inside || hasActive) {
        rafId = requestAnimationFrame(frame);
      } else {
        isRunning = false;
      }
    }

    function startLoop() {
      if (!isRunning) {
        isRunning = true;
        rafId = requestAnimationFrame(frame);
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      const r = head.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
      inside = true;
      startLoop();
    };

    const onPointerLeave = () => {
      inside = false;
      startLoop();
    };

    const onWindowBlur = () => {
      inside = false;
      startLoop();
    };

    stage.addEventListener("pointermove", onPointerMove, { passive: true });
    stage.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("pointerleave", onPointerLeave, { passive: true });
    window.addEventListener("blur", onWindowBlur);

    return () => {
      stage.removeEventListener("pointermove", onPointerMove);
      stage.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("resize", measure);
      if (ro) ro.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      chars.forEach((ch) => {
        ch.style.transform = "";
        ch.style.color = "";
        ch.style.textShadow = "";
      });
    };
  }, [text, settled, stageRef, radius, lerp, lift, grow, hoverColor]);

  let idx = 0;
  return (
    <Tag
      ref={headRef}
      className={`v2-hero-title pop ${settled ? "settled" : ""} ${className}`.trim()}
      aria-label={text}
    >
      {words.map((word, wi) => (
        <span className="v2-word" key={`${word}-${wi}`} aria-hidden="true">
          {Array.from(word).map((ch) => {
            const myIdx = idx++;
            return (
              <span
                className="v2-letter char pop-char"
                key={`${ch}-${myIdx}`}
                style={
                  {
                    "--d": `${(myIdx * 0.007).toFixed(3)}s`,
                    "--i": myIdx,
                  } as React.CSSProperties
                }
              >
                {ch}
              </span>
            );
          })}
        </span>
      ))}
    </Tag>
  );
}
