"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ArrowCounterClockwise, Confetti } from "@phosphor-icons/react";
import { fmtUsd } from "@/components/ui";

const FEE = 0.02;
const SHARE = 0.2;
const CLIENTS = ["Northwind Agency", "Lumen Labs", "Orbit Apparel", "Kite & Co", "Acme Studio"];

type Pay = { id: number; from: string; amount: number; repaid: number; toYou: number; owedAfter: number };

/**
 * Hands-on explainer, pure arithmetic (no chain): take an advance, then add client payments and
 * watch 20% of each one pay it down until it's gone. Same rules as the CreditLine and ReceivablesAccount contracts.
 */
export function RepaySimulator() {
  const [advance, setAdvance] = useState(50);
  const [taken, setTaken] = useState(false);
  const [pays, setPays] = useState<Pay[]>([]);
  const total = advance * (1 + FEE);
  const owed = pays.length ? pays[pays.length - 1].owedAfter : total;
  const received = pays.reduce((s, p) => s + p.toYou, 0);
  const done = taken && owed <= 0.0001;

  function pay(amount: number) {
    const repaid = Math.min(amount * SHARE, owed);
    setPays((p) => [...p, { id: Date.now(), from: CLIENTS[p.length % CLIENTS.length], amount, repaid, toYou: amount - repaid, owedAfter: owed - repaid }]);
  }
  function reset() { setTaken(false); setPays([]); }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      {/* Controls */}
      <div className="rounded-3xl border border-line bg-panel p-6 sm:p-7 lg:col-span-5">
        <div className="flex items-center justify-between">
          <div className="text-[13px] font-medium text-muted">1. Take an advance</div>
          <button onClick={reset} className="press inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-[13px] text-muted hover:text-ink"><ArrowCounterClockwise className="size-4" /> Start over</button>
        </div>
        <div className="num mt-2 font-mono text-5xl font-semibold text-terra">{fmtUsd(advance)}</div>
        <input type="range" min={10} max={50} step={5} value={advance} disabled={taken} onChange={(e) => setAdvance(Number(e.target.value))}
          aria-label="Advance amount" className="mt-4 w-full accent-[var(--terra)] disabled:opacity-40" />
        <p className="mt-2 text-[14px] text-muted">
          You&apos;ll pay back <span className="font-mono text-ink">{fmtUsd(total)}</span>: the advance plus a flat 2% fee. That&apos;s the whole cost.
        </p>
        {!taken ? (
          <button onClick={() => setTaken(true)} className="press mt-5 min-h-12 w-full rounded-xl bg-terra font-medium text-[#1a0d08] hover:bg-terra-hi">
            Take {fmtUsd(advance)} now
          </button>
        ) : (
          <>
            <div className="mt-6 text-[13px] font-medium text-muted">2. Now a client pays you</div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[50, 100, 250].map((a) => (
                <button key={a} onClick={() => pay(a)} disabled={done}
                  className="press min-h-11 rounded-xl bg-monad font-mono text-[14px] font-medium text-white hover:bg-monad-hi disabled:opacity-40">
                  +{fmtUsd(a)}
                </button>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-faint">Each payment goes to your Advance address, which splits it instantly.</p>
          </>
        )}
      </div>

      {/* Live result */}
      <div className="rounded-3xl border border-line bg-panel p-6 sm:p-7 lg:col-span-7">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-monad p-4 text-white">
            <div className="text-[13px] opacity-80">You still owe</div>
            <div className="num font-mono text-3xl font-semibold">{fmtUsd(taken ? Math.max(0, owed) : 0)}</div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/25">
              <motion.div className="h-full rounded-full bg-white" animate={{ scaleX: taken ? 1 - Math.max(0, owed) / total : 0 }} style={{ transformOrigin: "left" }} transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }} />
            </div>
          </div>
          <div className="rounded-2xl bg-terra p-4 text-[#1a0d08]">
            <div className="text-[13px] opacity-75">Reached you from clients</div>
            <div className="num font-mono text-3xl font-semibold">{fmtUsd(received)}</div>
            <div className="mt-3 text-[12.5px] opacity-75">plus the {taken ? fmtUsd(advance) : "$0"} advance up front</div>
          </div>
        </div>

        <div className="mt-5 min-h-48">
          {!taken && <p className="pt-10 text-center text-muted">Take an advance to start.</p>}
          {taken && pays.length === 0 && <p className="pt-10 text-center text-muted">{fmtUsd(advance)} is in your account. Now add a client payment.</p>}
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {pays.map((p) => (
                <motion.li key={p.id} initial={{ opacity: 0, y: -8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
                  className="rounded-xl border border-line bg-bg/50 p-3">
                  <div className="flex items-baseline justify-between text-[14px]">
                    <span>{p.from} paid <span className="font-mono">{fmtUsd(p.amount)}</span></span>
                    <span className="text-[12.5px] text-muted">{p.repaid > 0 ? `owe ${fmtUsd(Math.max(0, p.owedAfter))} after` : "nothing owed"}</span>
                  </div>
                  <div className="mt-2 flex h-6 overflow-hidden rounded-lg font-mono text-[11.5px] font-medium">
                    {p.repaid > 0 && (
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(p.repaid / p.amount) * 100}%` }} transition={{ duration: 0.5, delay: 0.15 }}
                        className="flex min-w-fit items-center justify-center bg-monad px-1.5 text-white">{fmtUsd(p.repaid)}</motion.div>
                    )}
                    <div className="flex flex-1 items-center justify-center bg-terra text-[#1a0d08]">{fmtUsd(p.toYou)} to you</div>
                  </div>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex items-center gap-3 rounded-xl border border-terra/40 bg-terra-soft p-4">
                <Confetti className="size-6 shrink-0 text-terra" weight="fill" />
                <div className="text-[14.5px]"><b>Fully repaid, automatically.</b> Your limit grows from $50 to $200, and every next payment comes to you in full.</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

/** "Where does the money go?" diagram: the two loops of the product, drawn with animated connectors. */
export function MoneyFlow() {
  const Node = ({ label, sub, tone }: { label: string; sub: string; tone: "terra" | "monad" | "plain" }) => (
    <div className={`rounded-2xl px-4 py-3 text-center ${tone === "terra" ? "bg-terra text-[#1a0d08]" : tone === "monad" ? "bg-monad text-white" : "border border-line-strong bg-panel-2"}`}>
      <div className="text-[15px] font-semibold">{label}</div>
      <div className={`text-[12px] ${tone === "plain" ? "text-muted" : "opacity-75"}`}>{sub}</div>
    </div>
  );
  const Arrow = ({ label, tone }: { label: string; tone: "terra" | "monad" | "plain" }) => {
    const color = tone === "terra" ? "var(--terra)" : tone === "monad" ? "var(--monad)" : "var(--muted)";
    return (
      <div className="flex flex-col items-center justify-center gap-1 px-1 py-2 sm:py-0">
        <span className="font-mono text-[12px]" style={{ color }}>{label}</span>
        <svg viewBox="0 0 120 12" className="h-3 w-full max-w-28 rotate-90 sm:rotate-0" aria-hidden>
          <line x1="2" y1="6" x2="110" y2="6" stroke={color} strokeWidth="2" strokeDasharray="6 6" className="[animation:dash_1s_linear_infinite]" />
          <path d="M108 1 L118 6 L108 11" fill="none" stroke={color} strokeWidth="2" />
        </svg>
      </div>
    );
  };
  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-line bg-panel/80 p-5 sm:p-7">
        <div className="mb-4 text-[13px] font-medium text-muted">Today: you get the money</div>
        <div className="grid grid-cols-1 items-center sm:grid-cols-[1fr_auto_1fr]">
          <Node label="Savers' pool" sub="dollars from savers" tone="monad" />
          <Arrow label="$50 advance" tone="terra" />
          <Node label="You" sub="money arrives in 1 second" tone="terra" />
        </div>
      </div>
      <div className="rounded-3xl border border-line bg-panel/80 p-5 sm:p-7">
        <div className="mb-4 text-[13px] font-medium text-muted">Later: a client pays you, and it repays itself</div>
        <div className="grid grid-cols-1 items-center sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Node label="Your client" sub="pays $100 as usual" tone="plain" />
          <Arrow label="$100" tone="plain" />
          <Node label="Your Advance address" sub="splits it instantly" tone="plain" />
          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-[auto_1fr]">
            <Arrow label="$20" tone="monad" />
            <Node label="Savers' pool" sub="advance + fee repaid" tone="monad" />
            <Arrow label="$80" tone="terra" />
            <Node label="You" sub="the rest, same second" tone="terra" />
          </div>
        </div>
      </div>
    </div>
  );
}
