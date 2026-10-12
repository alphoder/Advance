"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Lightning, TrendUp, SlidersHorizontal, Warning, ArrowsSplit, CheckCircle } from "@phosphor-icons/react";
import type { Ev, TxLine } from "@/lib/app-data";
import { Panel, Proof, fmtUsd, Label } from "@/components/ui";

export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h2>
        {sub && <p className="mt-2 max-w-[62ch] text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

const EV: Record<string, { icon: ReactNode; label: (e: Ev) => string; tone: string }> = {
  PaymentSplit: {
    icon: <ArrowsSplit className="size-[18px]" weight="bold" />, tone: "bg-terra-soft text-terra",
    label: (e) => `Got paid ${fmtUsd(e.amount!)}: ${fmtUsd(e.repaid!)} repaid, ${fmtUsd(e.toYou!)} to you`,
  },
  Drawn: { icon: <ArrowDownLeft className="size-[18px]" weight="bold" />, tone: "bg-monad-soft text-monad-hi", label: (e) => `Advance of ${fmtUsd(e.amount!)} received` },
  Repaid: { icon: <ArrowUpRight className="size-[18px]" weight="bold" />, tone: "bg-monad-soft text-monad-hi", label: (e) => `Repaid ${fmtUsd(e.amount!)}` },
  LimitSet: { icon: <SlidersHorizontal className="size-[18px]" weight="bold" />, tone: "bg-white/[0.06] text-ink", label: (e) => `Limit set to ${fmtUsd(e.amount!)}` },
  TierUp: { icon: <TrendUp className="size-[18px]" weight="bold" />, tone: "bg-terra-soft text-terra", label: (e) => `Level up: now level ${e.tier! + 1} of 4` },
  Defaulted: { icon: <Warning className="size-[18px]" weight="bold" />, tone: "bg-danger-soft text-danger", label: (e) => `Missed repayment recorded (${fmtUsd(e.amount!)})` },
};

export function ActivityRow({ e, i = 0 }: { e: Ev; i?: number }) {
  const meta = EV[e.type] ?? { icon: <Lightning className="size-[18px]" />, tone: "bg-white/[0.06]", label: () => e.type };
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: Math.min(i, 8) * 0.04, ease: [0.23, 1, 0.32, 1] }}
      className="flex items-center gap-3.5 py-3"
    >
      <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${meta.tone}`}>{meta.icon}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[14.5px]">{meta.label(e)}</div>
        <div className="text-[12px] text-faint">{new Date(e.ts * 1000).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} · block {e.block.toLocaleString()}</div>
      </div>
      <Proof hash={e.tx} block={e.block} />
    </motion.li>
  );
}

const CAPS = [50, 200, 1000, 5000];
export function TierLadder({ tier, repayments }: { tier: number; repayments: number }) {
  return (
    <Panel>
      <div className="flex items-baseline justify-between">
        <Label>Your level</Label>
        <span className="text-[12.5px] text-muted">{repayments} repayment{repayments === 1 ? "" : "s"}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {CAPS.map((cap, i) => {
          const state = i < tier ? "done" : i === tier ? "now" : "next";
          return (
            <div key={cap} className={`rounded-xl border p-3 transition-colors ${state === "now" ? "border-terra/50 bg-terra-soft" : state === "done" ? "border-monad/30 bg-monad-soft" : "border-line bg-white/[0.02]"}`}>
              <div className="text-[11.5px] text-muted">Level {i + 1}</div>
              <div className={`num mt-0.5 font-mono text-lg ${state === "now" ? "text-terra" : state === "done" ? "text-monad-hi" : "text-faint"}`}>{fmtUsd(cap)}</div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[13px] text-muted">Each advance repaid in full unlocks the next level. Limits never jump ahead of your track record.</p>
    </Panel>
  );
}

export function TxLog({ items, title = "What just happened onchain" }: { items: TxLine[]; title?: string }) {
  if (!items.length) return null;
  return (
    <Panel>
      <Label>{title}</Label>
      <ul className="mt-3 divide-y divide-line">
        {items.map((t, i) => (
          <motion.li
            key={t.hash + t.label} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05, duration: 0.3 }}
            className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]"
          >
            <span className="flex items-center gap-2.5"><CheckCircle className="size-4 text-monad-hi" weight="fill" /> {t.label}</span>
            <Proof hash={t.hash} ms={t.ms} />
          </motion.li>
        ))}
      </ul>
    </Panel>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="grid size-14 place-items-center rounded-2xl border border-line bg-white/[0.03] text-muted">{icon}</div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm text-[14px] text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
