"use client";

import { motion, useReducedMotion } from "motion/react";
import { Proof, fmtUsd } from "./ui";

export type SplitEvent = { key: string; amount: number; repaid: number; toYou: number; tx: string; block: number; ms?: number };

const EASE = [0.23, 1, 0.32, 1] as const;

/** One payment visibly becomes two: purple to the Monad pool, terracotta to the earner. */
export function SplitAnimation({ e }: { e: SplitEvent }) {
  const reduce = useReducedMotion();
  const t = (d: number) => ({ duration: 0.5, delay: reduce ? 0 : d, ease: EASE });
  return (
    <div key={e.key} className="relative overflow-hidden rounded-2xl border border-line bg-[radial-gradient(70%_90%_at_50%_0%,rgb(131_110_249/0.18),transparent_70%),#0a1230] p-6">
      <div className="text-center text-[12.5px] font-medium text-muted">Payment received · split in one transaction</div>
      <div className="relative mx-auto mt-4 h-48 max-w-md">
        <motion.div initial={reduce ? false : { opacity: 0, scale: 0.9, y: -8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={t(0)}
          className="absolute left-1/2 top-0 -translate-x-1/2 rounded-2xl border border-line-strong bg-panel-2 px-6 py-2.5 shadow-[0_0_40px_-10px_rgb(237_240_249/0.4)]">
          <span className="num font-mono text-3xl font-semibold">{fmtUsd(e.amount)}</span>
        </motion.div>
        <svg viewBox="0 0 400 110" preserveAspectRatio="none" className="absolute inset-x-0 top-[52px] h-[70px] w-full" aria-hidden>
          <motion.path d="M200 0 C200 60 70 40 70 105" stroke="var(--monad)" strokeWidth="2.5" fill="none" strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={t(0.25)} style={{ filter: "drop-shadow(0 0 6px var(--monad))" }} />
          <motion.path d="M200 0 C200 60 330 40 330 105" stroke="var(--terra)" strokeWidth="2.5" fill="none" strokeLinecap="round"
            initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={t(0.25)} style={{ filter: "drop-shadow(0 0 6px var(--terra))" }} />
        </svg>
        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={t(0.7)}
          className="absolute bottom-0 left-0 w-[44%] rounded-xl border border-monad/40 bg-monad-soft px-3 py-2.5 text-center">
          <div className="num font-mono text-2xl font-semibold text-monad-hi">{fmtUsd(e.repaid)}</div>
          <div className="text-[12px] text-monad-hi/80">{e.repaid > 0 ? "repaid your advance" : "nothing owed"}</div>
        </motion.div>
        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={t(0.7)}
          className="absolute bottom-0 right-0 w-[44%] rounded-xl border border-terra/40 bg-terra-soft px-3 py-2.5 text-center">
          <div className="num font-mono text-2xl font-semibold text-terra">{fmtUsd(e.toYou)}</div>
          <div className="text-[12px] text-terra/80">landed with you</div>
        </motion.div>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3 text-[12.5px] text-muted">
        <span>Block {e.block.toLocaleString()}</span>
        <Proof hash={e.tx} block={e.block} ms={e.ms} />
      </div>
    </div>
  );
}
