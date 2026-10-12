"use client";

import type { ScoreResult } from "@/server/score";
import { fmtUsd, short, AddressLink } from "./ui";
import { useChainView } from "./providers";

const ICON = { good: "✓", warn: "!", bad: "✕" } as const;
const TONE = {
  good: "bg-green-soft text-green",
  warn: "bg-amber-soft text-amber",
  bad: "bg-red-soft text-red",
} as const;

export function ScoreDial({ score, approved }: { score: number; approved: boolean }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = approved ? "var(--green)" : score >= 40 ? "var(--amber)" : "var(--red)";
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(.2,.8,.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="num text-5xl leading-none">{score}</span>
        <span className="text-[12px] text-muted">of 100</span>
      </div>
    </div>
  );
}

export function ScoreView({ s, compact = false }: { s: ScoreResult; compact?: boolean }) {
  const { on } = useChainView();
  return (
    <div className="rise space-y-5">
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center">
        <ScoreDial score={s.score} approved={s.approved} />
        <div className="text-center sm:text-left">
          <div className="text-[13px] font-medium uppercase tracking-wide text-muted">Advance Score · {short(s.address)}</div>
          {s.approved ? (
            <>
              <div className="num mt-1 text-4xl sm:text-5xl">Could get {fmtUsd(s.limit)} today</div>
              <p className="mt-1 text-muted">
                Based on about {fmtUsd(s.monthlyIncome, 0)} a month in verified income. Limits grow every time an advance is repaid
                {s.tierCap > s.limit ? "" : ` (current cap ${fmtUsd(s.tierCap)})`}.
              </p>
            </>
          ) : (
            <>
              <div className="num mt-1 text-4xl sm:text-5xl">{s.payments ? "Not yet" : "No income found yet"}</div>
              <p className="mt-1 text-muted">Here&apos;s why, and what would change it.</p>
            </>
          )}
        </div>
      </div>

      <ul className="space-y-2">
        {s.reasons.map((r) => (
          <li key={r.text} className="flex items-start gap-3 text-[15px]">
            <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${TONE[r.kind]}`}>{ICON[r.kind]}</span>
            <span>{r.text}</span>
          </li>
        ))}
      </ul>

      {s.nextSteps.length > 0 && (
        <div className="rounded-2xl bg-violet-soft/60 p-4">
          <div className="text-[13px] font-medium text-violet">How to unlock more</div>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px]">
            {s.nextSteps.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </div>
      )}

      {!compact && (
        <details className="group rounded-2xl border border-line p-4" open={on}>
          <summary className="cursor-pointer list-none text-[14px] font-medium">
            How the score is built <span className="text-muted group-open:hidden">(show)</span>
          </summary>
          <div className="mt-3 space-y-2">
            {s.breakdown.map((b) => (
              <div key={b.name}>
                <div className="flex justify-between text-[13px]"><span>{b.name}</span><span className="text-muted">{b.points} / {b.max}</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-line"><div className="h-full rounded-full bg-ink" style={{ width: `${(b.points / b.max) * 100}%` }} /></div>
              </div>
            ))}
          </div>
          {s.payers.length > 0 && (
            <table className="mt-4 w-full text-left text-[13px]">
              <thead className="text-muted"><tr><th className="py-1 font-normal">Payer</th><th className="font-normal">Paid</th><th className="font-normal">Their history</th><th className="font-normal">Check</th></tr></thead>
              <tbody>
                {s.payers.map((p) => (
                  <tr key={p.address} className="border-t border-line/70">
                    <td className="py-1.5"><AddressLink address={p.address} />{p.labels[0] && <span className="ml-1 text-muted">({p.labels[0]})</span>}</td>
                    <td>{fmtUsd(p.total)}</td>
                    <td>{p.activity} payments</td>
                    <td className={p.linked ? "text-red" : "text-green"}>{p.linked ? (p.linked === "funded" ? "funded by you" : p.linked === "related" ? "linked (Nansen)" : "money flowed back") : "independent"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-[12px] text-muted">
            {s.nansen ? "Payers enriched with Nansen labels and related-wallet data." : "Onchain checks only (Nansen enrichment not configured on this server)."} Limit = monthly income × 50% × score, capped by tier.
          </p>
        </details>
      )}
    </div>
  );
}
