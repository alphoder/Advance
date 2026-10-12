"use client";

import { motion, useReducedMotion } from "motion/react";
import { CheckCircle, WarningCircle, XCircle, Sparkle } from "@phosphor-icons/react";
import type { ScoreResult } from "@/server/score";
import { fmtUsd, short, AddressLink } from "./ui";

const ICON = {
  good: <CheckCircle className="size-[18px] text-monad-hi" weight="fill" />,
  warn: <WarningCircle className="size-[18px] text-terra" weight="fill" />,
  bad: <XCircle className="size-[18px] text-danger" weight="fill" />,
} as const;

export function ScoreDial({ score, approved, size = 168 }: { score: number; approved: boolean; size?: number }) {
  const reduce = useReducedMotion();
  const r = 70;
  const c = 2 * Math.PI * r;
  const color = approved ? "var(--monad)" : score >= 40 ? "var(--terra)" : "var(--danger)";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 160 160" className="size-full -rotate-90">
        <circle cx="80" cy="80" r={r} fill="none" stroke="rgb(140 162 225 / 0.12)" strokeWidth="10" />
        <motion.circle
          cx="80" cy="80" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round" strokeDasharray={c}
          initial={{ strokeDashoffset: reduce ? c * (1 - score / 100) : c }}
          animate={{ strokeDashoffset: c * (1 - score / 100) }}
          transition={{ duration: 1.1, ease: [0.23, 1, 0.32, 1] }}
          style={{ filter: `drop-shadow(0 0 12px ${color})` }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="num text-5xl font-semibold">{score}</div>
          <div className="text-[12px] text-muted">Advance Score</div>
        </div>
      </div>
    </div>
  );
}

export function ScoreView({ s, detail = true }: { s: ScoreResult; detail?: boolean }) {
  return (
    <div className="rise space-y-6">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
        <ScoreDial score={s.score} approved={s.approved} />
        <div className="text-center sm:text-left">
          <div className="font-mono text-[12.5px] text-faint">{short(s.address)}</div>
          {s.approved ? (
            <>
              <div className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">Could get <span className="text-terra">{fmtUsd(s.limit)}</span> today</div>
              <p className="mt-1.5 max-w-md text-muted">Based on about {fmtUsd(s.monthlyIncome, 0)} a month of verified income. Limits rise each time an advance is repaid.</p>
            </>
          ) : (
            <>
              <div className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">{s.payments ? "Not yet" : "No income found yet"}</div>
              <p className="mt-1.5 max-w-md text-muted">Here&apos;s why, and what would change it.</p>
            </>
          )}
        </div>
      </div>

      <ul className="grid gap-2.5">
        {s.reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-3 text-[15px]">
            <span className="mt-0.5">{ICON[r.kind]}</span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>

      {s.nextSteps.length > 0 && (
        <div className="rounded-xl border border-monad/25 bg-monad-soft p-4">
          <div className="flex items-center gap-2 text-[13px] font-medium text-monad-hi"><Sparkle className="size-4" weight="fill" /> How to unlock more</div>
          <ul className="mt-2 grid gap-1 text-[14.5px]">
            {s.nextSteps.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}

      {detail && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <div className="text-[13px] font-medium text-muted">How the score is built</div>
            <div className="mt-3 grid gap-3">
              {s.breakdown.map((b, i) => (
                <div key={b.name}>
                  <div className="flex justify-between text-[13.5px]"><span>{b.name}</span><span className="font-mono text-muted">{b.points}/{b.max}</span></div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      initial={{ scaleX: 0 }} animate={{ scaleX: b.points / b.max }} transition={{ duration: 0.8, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
                      style={{ transformOrigin: "left" }} className="h-full rounded-full bg-gradient-to-r from-monad to-terra"
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-[12.5px] text-faint">
              {s.nansen ? "Payers enriched with Nansen labels and related-wallet data." : "Onchain checks only (Nansen not configured on this server)."} Limit = monthly income × 50% × score, capped by level.
            </p>
          </div>
          {s.payers.length > 0 && (
            <div>
              <div className="text-[13px] font-medium text-muted">Who pays this address</div>
              <div className="mt-3 grid gap-2">
                {s.payers.map((p) => (
                  <div key={p.address} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/[0.02] px-3.5 py-2.5 text-[13.5px]">
                    <div>
                      <AddressLink address={p.address} />
                      <div className="text-[12px] text-faint">{p.labels[0] ?? `${p.activity} payments of its own`}</div>
                    </div>
                    <div className="text-right">
                      <div className="num font-mono">{fmtUsd(p.total)}</div>
                      <div className={`text-[12px] ${p.linked ? "text-danger" : "text-monad-hi"}`}>
                        {p.linked ? (p.linked === "funded" ? "funded by you" : p.linked === "related" ? "linked (Nansen)" : "money flowed back") : "independent"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
