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
          duration: 2.6,
          ease: [0.43, 0.13, 0.23, 0.96] as const,
        },
        opacity: {
          duration: 0.4,
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
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <div className="yk-hw-grain" />

        <motion.svg
          className="yk-hw-line"
          viewBox="0 0 1200 600"
          preserveAspectRatio="xMidYMid meet"
          initial="hidden"
          animate="visible"
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.7 }}
          >
            {eyebrow}
          </motion.span>

          <motion.h2
            className="yk-hw-title"
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              delay: 0.55,
              duration: 0.9,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {title}
          </motion.h2>

          {subtitle && (
            <motion.p
              className="yk-hw-sub"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
            >
              {subtitle}
            </motion.p>
          )}

          <motion.button
            type="button"
            className="yk-hw-replay"
            onClick={() => setAnimationKey((current) => current + 1)}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35, duration: 0.6 }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
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
