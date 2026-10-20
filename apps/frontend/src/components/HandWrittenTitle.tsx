import { motion } from "framer-motion";
import { useState } from "react";
import "./HandWrittenTitle.css";

interface HandWrittenTitleProps {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
}

export function HandWrittenTitle({
  eyebrow = "Yekis Jobs",
  title = "Make ideas visible.",
  subtitle = "Where verified Ethiopian talent and ambitious teams build together — protected by escrow from day one.",
}: HandWrittenTitleProps) {
  const [animationKey, setAnimationKey] = useState(0);

  const drawAnimation = {
    hidden: {
      pathLength: 0,
      opacity: 0,
    },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        pathLength: {
          duration: 0.85,
          ease: [0.22, 1, 0.36, 1] as const,
        },
        opacity: {
          duration: 0.2,
        },
      },
    },
  };

  return (
    <div className="yk-hw">
      <div className="yk-hw-ambient yk-hw-ambient-one" />
      <div className="yk-hw-ambient yk-hw-ambient-two" />

      <motion.div
        key={animationKey}
        className="yk-hw-card"
        initial={{ opacity: 0, scale: 0.985 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="yk-hw-grain" />

        <motion.svg
          className="yk-hw-line"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid meet"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.15 }}
          aria-hidden="true"
        >
          <motion.path
            d="
              M 950 90
              C 1250 300, 1050 480, 600 520
              C 250 520, 150 480, 150 300
              C 150 120, 350 80, 600 80
              C 850 80, 950 180, 950 180
            "
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            variants={drawAnimation}
          />
        </motion.svg>

        <div className="yk-hw-content">
          <motion.span
            className="yk-hw-eyebrow"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ delay: 0.04, duration: 0.22 }}
          >
            {eyebrow}
          </motion.span>

          <motion.h2
            className="yk-hw-title"
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              delay: 0.08,
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {title}
          </motion.h2>

          {subtitle && (
            <motion.p
              className="yk-hw-sub"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ delay: 0.12, duration: 0.25 }}
            >
              {subtitle}
            </motion.p>
          )}

          <motion.button
            type="button"
            className="yk-hw-replay"
            onClick={() => setAnimationKey((current) => current + 1)}
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ delay: 0.16, duration: 0.22 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="yk-hw-replay-icon" aria-hidden="true">
              ↻
            </span>
            Replay animation
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
