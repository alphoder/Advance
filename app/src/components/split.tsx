"use client";

import { fmtUsd, Proof } from "./ui";

export type SplitEvent = { key: string; amount: number; repaid: number; toYou: number; tx: string; block: number; ms?: number };

/** The wow moment: one payment visibly splits into "repays advance" and "lands with you". */
export function SplitAnimation({ e }: { e: SplitEvent }) {
  return (
    <div key={e.key} className="relative overflow-hidden rounded-3xl border border-line bg-card p-5">
      <div className="text-center text-[13px] font-medium uppercase tracking-wide text-muted">Payment received</div>
      <div className="relative mx-auto mt-2 h-40 max-w-sm">
        <div className="pop absolute left-1/2 top-0 -translate-x-1/2 rounded-full bg-ink px-5 py-2 text-paper">
          <span className="num text-3xl">{fmtUsd(e.amount)}</span>
        </div>
        <svg viewBox="0 0 300 100" className="absolute inset-x-0 top-10 h-20 w-full" aria-hidden>
          <path d="M150 0 C150 50 40 40 40 95" stroke="var(--violet)" strokeWidth="3" fill="none" strokeDasharray="200" strokeDashoffset="200">
            <animate attributeName="stroke-dashoffset" from="200" to="0" dur="0.6s" begin="0.3s" fill="freeze" />
          </path>
          <path d="M150 0 C150 50 260 40 260 95" stroke="var(--green)" strokeWidth="3" fill="none" strokeDasharray="200" strokeDashoffset="200">
            <animate attributeName="stroke-dashoffset" from="200" to="0" dur="0.6s" begin="0.3s" fill="freeze" />
          </path>
        </svg>
        <div className="pop absolute bottom-0 left-0 w-[46%] rounded-2xl bg-violet-soft px-3 py-2 text-center" style={{ animationDelay: "0.8s" }}>
          <div className="num text-2xl text-violet">{fmtUsd(e.repaid)}</div>
          <div className="text-[12px] text-violet">{e.repaid > 0 ? "repaid your advance" : "nothing owed"}</div>
        </div>
        <div className="pop absolute bottom-0 right-0 w-[46%] rounded-2xl bg-green-soft px-3 py-2 text-center" style={{ animationDelay: "0.8s" }}>
          <div className="num text-2xl text-green">{fmtUsd(e.toYou)}</div>
          <div className="text-[12px] text-green">landed with you</div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-center">
        <span className="text-[13px] text-muted">One transaction · block {e.block.toLocaleString()}</span>
        <Proof hash={e.tx} block={e.block} ms={e.ms} />
      </div>
    </div>
  );
}
