"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDownLeft, ArrowUpRight, Lightning, TrendUp, SlidersHorizontal, Warning, ArrowsSplit, CheckCircle, Question, LockSimple, Ticket } from "@phosphor-icons/react";
import type { Ev, TxLine } from "@/lib/app-data";
import { Panel, Proof, fmtUsd, Label } from "@/components/ui";

/** Page title lives in the top bar; here only the page's action and its "Explain this page" helper. */
// ponytail: title/sub are still accepted so pages keep their copy; drop them if they stay unused
export function PageHeader({ action, help }: { title: string; sub?: string; action?: ReactNode; help?: string[] }) {
  const [open, setOpen] = useState(false);
  if (!action && !help) return null;
  return (
    <div className="mb-5">
      {/* one row: explainer on the left, the page's action on the right */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {help ? (
          <button onClick={() => setOpen((o) => !o)} aria-expanded={open}
            className="press inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-[13px] text-muted hover:text-ink">
            <Question className="size-4 text-terra" weight="fill" /> {open ? "Hide explanation" : "Explain this page"}
          </button>
        ) : <span />}
        {action}
      </div>
      {help && (
        <div>
          <AnimatePresence initial={false}>
            {open && (
              <motion.ol initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="mt-3 grid max-w-3xl gap-2 overflow-hidden">
                {help.map((h, i) => (
                  <li key={h} className="flex gap-3 rounded-xl border border-line bg-panel/80 px-4 py-3 text-[14.5px]">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-terra-soft font-mono text-[12px] text-terra">{i + 1}</span>
                    <span>{h}</span>
                  </li>
                ))}
              </motion.ol>
            )}
          </AnimatePresence>
        </div>
      )}
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
  TrustCard: { icon: <Ticket className="size-[18px]" weight="fill" />, tone: "bg-monad-soft text-monad-hi", label: (e) => `Scratch card #${e.card}: ${e.points} trust points` },
  TrustForfeited: { icon: <Warning className="size-[18px]" weight="bold" />, tone: "bg-danger-soft text-danger", label: (e) => `${e.points} unclaimed trust points lost` },
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
const PERKS = ["Where everyone starts", "After 1 advance repaid in full", "After 2 repaid in full", "After 3 repaid in full"];

/** The level path: a track that fills as you repay, the current level as a solid card, the rest locked.
 *  `verified={false}` (income not checked yet): every level is locked and Level 1 says how to unlock it. */
export function TierLadder({ tier, repayments, verified = true }: { tier: number; repayments: number; verified?: boolean }) {
  if (!verified) tier = -1;
  return (
    <Panel className="@container overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <Label>Your level</Label>
          <div className="mt-1 text-lg font-semibold">{verified
            ? <>Repay in full to climb to <span className="text-terra">{fmtUsd(CAPS[CAPS.length - 1], 0)}</span></>
            : <>Check your income to unlock <span className="text-terra">{fmtUsd(CAPS[0], 0)}</span></>}</div>
        </div>
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-[12.5px] text-muted">{verified ? `${repayments} repayment${repayments === 1 ? "" : "s"} so far` : "Not verified yet"}</span>
      </div>

      <div className="relative mt-6">
        {/* track behind the nodes (desktop) */}
        <div className="absolute left-[12.5%] right-[12.5%] top-[26px] hidden h-1 rounded-full bg-white/[0.07] @2xl:block" />
        <motion.div
          className="absolute left-[12.5%] top-[26px] hidden h-1 origin-left rounded-full bg-[linear-gradient(90deg,var(--terra),var(--monad))] @2xl:block"
          initial={{ width: 0 }} animate={{ width: `${(Math.max(0, Math.min(tier, CAPS.length - 1)) / (CAPS.length - 1)) * 75}%` }}
          transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1], delay: 0.15 }}
        />
        <div className="relative grid grid-cols-2 gap-3 @2xl:grid-cols-4">
          {CAPS.map((cap, i) => {
            const state = i < tier ? "done" : i === tier ? "now" : !verified && i === 0 ? "unlock" : "next";
            return (
              <div key={cap} className="flex flex-col items-center text-center">
                <div className={`relative grid size-[54px] place-items-center rounded-full font-mono text-[15px] font-semibold ring-4 ring-panel ${
                  state === "now" ? "bg-terra text-[#1a0d08] shadow-[0_0_0_6px_rgb(226_114_91/0.18),0_10px_30px_-8px_rgb(226_114_91/0.8)]"
                  : state === "done" ? "bg-monad text-white" : state === "unlock" ? "border-2 border-dashed border-terra/70 bg-terra/10 text-terra" : "bg-[#232a36] text-faint"}`}>
                  {state === "done" ? <CheckCircle weight="fill" className="size-6" /> : state === "now" ? i + 1 : <LockSimple weight="bold" className="size-5" />}
                  {state === "now" && <span className="absolute inset-0 animate-ping rounded-full bg-terra/30 [animation-duration:2.4s]" />}
                </div>
                <div className={`mt-3 w-full rounded-2xl p-3.5 ${state === "now" ? "bg-terra text-[#1a0d08]" : state === "done" ? "bg-monad/15" : state === "unlock" ? "border border-dashed border-terra/50 bg-terra/[0.06]" : "border border-dashed border-line"}`}>
                  <div className={`text-[11.5px] ${state === "now" ? "opacity-70" : "text-muted"}`}>Level {i + 1}{state === "now" ? " · you are here" : ""}</div>
                  <div className={`num mt-0.5 font-mono text-2xl font-semibold ${state === "next" ? "text-muted" : state === "done" ? "text-monad-hi" : ""}`}>{fmtUsd(cap, 0)}</div>
                  <div className={`mt-1 text-[12px] ${state === "now" ? "opacity-75" : state === "unlock" ? "text-terra" : "text-faint"}`}>{state === "unlock" ? "Unlocks when your income is checked" : PERKS[i]}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-5 text-[13px] text-muted">Limits never jump ahead of your track record, so a single bad actor can only ever take a small amount.</p>
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
