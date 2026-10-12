"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";

/**
 * Hand-drawn layer for the whole site: marks (underline, circle, scribble-out, highlight), sparkles,
 * and annotation notes with curvy arrows. Everything draws itself once when it scrolls into view.
 */

const DRAW = [0.65, 0, 0.35, 1] as const;
type Tone = "terra" | "monad";
const colorOf = (t: Tone) => (t === "terra" ? "var(--terra)" : "var(--monad-hi)");

function useDraw(delay = 0) {
  const reduce = useReducedMotion();
  return {
    initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, amount: 0.8 },
    transition: { pathLength: { duration: 0.65, delay, ease: DRAW }, opacity: { duration: 0.01, delay } },
  };
}

/* ---------------- Marks: wrap inline text ---------------- */

export function Mark({
  children, kind = "underline", tone = "terra", delay = 0.35,
}: { children: ReactNode; kind?: "underline" | "circle" | "scribble" | "highlight"; tone?: Tone; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const seen = useInView(ref, { once: true, amount: 0.5 });
  const reduce = useReducedMotion();
  const on = seen || !!reduce;
  const draw = {
    initial: { pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 },
    animate: on ? { pathLength: 1, opacity: 1 } : undefined,
    transition: { pathLength: { duration: 0.65, delay, ease: DRAW }, opacity: { duration: 0.01, delay } },
  };
  const color = colorOf(tone);
  return (
    <span ref={ref} className="relative inline-block whitespace-nowrap">
      {kind === "highlight" && (
        <motion.span
          aria-hidden
          initial={{ scaleX: reduce ? 1 : 0 }} animate={on ? { scaleX: 1 } : undefined}
          transition={{ duration: 0.5, delay, ease: DRAW }}
          style={{ transformOrigin: "left", background: tone === "terra" ? "rgb(226 114 91 / 0.28)" : "rgb(131 110 249 / 0.32)" }}
          className="absolute inset-x-[-4px] bottom-[0.08em] top-[0.45em] -z-10 -rotate-1 rounded-sm"
        />
      )}
      <span className={kind === "scribble" ? "text-muted" : ""}>{children}</span>
      {kind === "underline" && (
        <svg aria-hidden viewBox="0 0 200 20" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-[0.18em] left-[-2%] h-[0.32em] w-[104%]" style={{ color }}>
          <motion.path d="M2 14 C 40 4, 80 18, 120 9 S 180 6, 198 11" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" {...draw} />
        </svg>
      )}
      {kind === "circle" && (
        <svg aria-hidden viewBox="0 0 200 100" preserveAspectRatio="none" className="pointer-events-none absolute -inset-x-[18%] -inset-y-[34%] h-[168%] w-[136%]" style={{ color }}>
          <motion.path d="M150 14 C 108 0, 26 6, 10 44 C -2 76, 70 96, 132 90 C 186 84, 200 52, 176 28 C 160 12, 120 8, 96 10" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" {...draw} />
        </svg>
      )}
      {kind === "scribble" && (
        <svg aria-hidden viewBox="0 0 200 40" preserveAspectRatio="none" className="pointer-events-none absolute inset-x-[-4%] top-[18%] h-[64%] w-[108%]" style={{ color }}>
          <motion.path d="M4 26 L 40 12 L 34 30 L 78 10 L 70 30 L 116 12 L 108 30 L 152 12 L 146 28 L 196 14" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" {...draw} />
        </svg>
      )}
    </span>
  );
}

/* ---------------- Sparkle doodle ---------------- */

export function Sparkle({ className = "", tone = "terra", delay = 0.6 }: { className?: string; tone?: Tone; delay?: number }) {
  const draw = useDraw(delay);
  return (
    <svg aria-hidden viewBox="0 0 40 40" className={`pointer-events-none absolute size-8 ${className}`} style={{ color: colorOf(tone) }}>
      <motion.path d="M20 3 L20 13 M20 27 L20 37 M3 20 L13 20 M27 20 L37 20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...draw} />
      <motion.path d="M9 9 L13 13 M27 27 L31 31 M31 9 L27 13 M13 27 L9 31" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...useDraw(delay + 0.2)} />
    </svg>
  );
}

/* ---------------- Notes with arrows ---------------- */

const ARROWS = {
  // shaft, head
  swoop: ["M10 10 C 52 2, 96 20, 84 46 C 78 60, 92 70, 106 72", "M95 63 L106 72 L93 78"],
  loop: ["M8 14 C 40 4, 70 10, 66 32 C 62 52, 34 44, 44 30 C 56 14, 92 34, 104 70", "M94 63 L104 70 L106 58"],
  zigzag: ["M8 10 C 30 30, 50 0, 64 22 C 78 44, 88 30, 104 70", "M94 64 L104 70 L106 58"],
} as const;

type Dir = "down-left" | "down-right" | "up-left" | "up-right";

export function Note({
  children, dir = "down-right", arrow = "swoop", tone = "terra", className = "", tilt = -3, delay = 0.1,
}: { children: ReactNode; dir?: Dir; arrow?: keyof typeof ARROWS; tone?: Tone; className?: string; tilt?: number; delay?: number }) {
  const reduce = useReducedMotion();
  const color = colorOf(tone);
  const flipX = dir.endsWith("left");
  const flipY = dir.startsWith("up");
  const [shaft, head] = ARROWS[arrow];
  const drawShaft = useDraw(delay + 0.25);
  const drawHead = useDraw(delay + 0.85);

  const svg = (
    <motion.svg
      viewBox="0 0 120 84" aria-hidden className="h-16 w-28 shrink-0"
      style={{ scaleX: flipX ? -1 : 1, scaleY: flipY ? -1 : 1, color }}
      whileHover={reduce ? undefined : { rotate: [0, -4, 4, 0], transition: { duration: 0.5 } }}
    >
      <motion.path d={shaft} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" {...drawShaft} />
      <motion.path d={head} fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...drawHead} />
    </motion.svg>
  );
  const text = (
    <motion.span
      initial={reduce ? false : { opacity: 0, y: flipY ? -4 : 4 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.8 }}
      transition={{ duration: 0.4, delay, ease: [0.23, 1, 0.32, 1] }}
      style={{ rotate: tilt, color }}
      className={`block w-max max-w-[15rem] font-[family-name:var(--font-hand)] text-[23px] font-bold leading-[1.05] ${flipX ? "text-left" : "text-right"}`}
    >
      {children}
    </motion.span>
  );
  return (
    <div aria-hidden data-note className={`pointer-events-none absolute z-10 hidden flex-col xl:flex ${flipX ? "items-start" : "items-end"} ${className}`}>
      {flipY ? <>{svg}{text}</> : <>{text}{svg}</>}
    </div>
  );
}
