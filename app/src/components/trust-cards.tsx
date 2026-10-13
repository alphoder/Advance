"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Ticket, Gift, Lightning, LockSimple, Sparkle } from "@phosphor-icons/react";
import { useMaybeAppData, type Ev } from "@/lib/app-data";

/**
 * Trust points: one onchain scratch card per advance repaid by client payments.
 * The prize is already fixed onchain when the card is won; revealing it is just the fun part.
 * Three reveal styles rotate by card number: scratch-off, flip, gift box.
 */

const KEY = "advance:revealed";
const EASE = [0.23, 1, 0.32, 1] as const;
const UNLOCK_DAYS = 30;

function useRevealed() {
  const [set, setSet] = useState<Set<string>>(new Set());
  useEffect(() => {
    try { setSet(new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]"))); } catch {}
  }, []);
  const add = (k: string) => setSet((s) => {
    const n = new Set(s).add(k);
    try { localStorage.setItem(KEY, JSON.stringify([...n])); } catch {}
    return n;
  });
  return [set, add] as const;
}

/** For the dashboard: how many won cards are still waiting to be revealed. */
export function useUnrevealedCards() {
  const data = useMaybeAppData();
  const [revealed] = useRevealed();
  return (data?.activity?.events ?? []).filter((e) => e.type === "TrustCard" && !revealed.has(e.key)).length;
}

export function TrustCards() {
  const data = useMaybeAppData();
  const [revealed, reveal] = useRevealed();
  const cards = (data?.activity?.events ?? []).filter((e) => e.type === "TrustCard");
  const points = data?.activity?.trustPoints ?? 0;
  const newest = cards[0]?.ts;
  const unlock = newest ? new Date((newest + UNLOCK_DAYS * 86400) * 1000) : undefined;

  return (
    <section id="trust" className="mt-10 scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Trust points</h2>
          <p className="text-[14px] text-muted">Every advance your clients repay wins a scratch card. Repay sooner, win bigger. Convertible to MON.</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="flex flex-col rounded-3xl bg-[radial-gradient(120%_120%_at_0%_0%,#9d8cff,#836ef9_45%,#4c3db0)] p-6 text-white lg:col-span-4">
          <div className="flex items-center justify-between text-[13px] opacity-85"><span>Your trust points</span><LockSimple weight="bold" className="size-4" /></div>
          <div className="num mt-1 font-mono text-5xl font-semibold">{points.toLocaleString()}</div>
          <div className="mt-1 text-[13px] opacity-85">{points ? `Worth $${(points / 100).toFixed(2)} in MON when you convert` : "Win your first card by repaying an advance"}</div>
          <div className="mt-auto pt-5 text-[12.5px] opacity-80">
            {unlock ? `Converts to MON from ${unlock.toLocaleDateString("en-US", { month: "short", day: "numeric" })}. ` : ""}
            Points can&apos;t be sent to anyone, and are lost if an advance is missed.
          </div>
        </div>

        <div className="rounded-3xl border border-line bg-panel/80 p-6 lg:col-span-8">
          <div className="text-[14px] font-semibold">How big is my card?</div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[["Within 7 days", "100%"], ["Within 14 days", "75%"], ["Within 21 days", "50%"], ["Within 30 days", "25%"]].map(([k, v], i) => (
              <div key={k} className={`rounded-2xl p-3 ${i === 0 ? "bg-terra text-[#1a0d08]" : "bg-white/[0.04]"}`}>
                <div className={`text-[12px] ${i === 0 ? "opacity-75" : "text-muted"}`}>{k}</div>
                <div className="num mt-0.5 font-mono text-xl font-semibold">{v}</div>
              </div>
            ))}
          </div>
          <ul className="mt-4 space-y-1.5 text-[13.5px] text-muted">
            <li className="flex gap-2"><Sparkle weight="fill" className="mt-0.5 size-4 shrink-0 text-terra" />Each card holds 20% to 90% of the fee you paid, decided onchain the moment it&apos;s repaid. Faster repayment multiplies it.</li>
            <li className="flex gap-2"><Lightning weight="fill" className="mt-0.5 size-4 shrink-0 text-terra" />Only repayments from client payments count. Raise your repay share to clear advances faster.</li>
            <li className="flex gap-2"><LockSimple weight="fill" className="mt-0.5 size-4 shrink-0 text-terra" />A card is always worth less than the fee, so borrowing just to win cards never pays.</li>
          </ul>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {cards.map((e) => (
          <CardSlot key={e.key} e={e} open={revealed.has(e.key)} onOpen={() => reveal(e.key)} />
        ))}
        {cards.length === 0 && (
          <div className="col-span-full flex items-center gap-4 rounded-3xl border border-dashed border-line-strong p-5">
            <div className="grid aspect-[3/4] w-20 shrink-0 place-items-center rounded-2xl bg-[repeating-linear-gradient(135deg,#232a36_0_8px,#1d232e_8px_16px)] text-faint"><Ticket className="size-7" /></div>
            <div className="text-[14px] text-muted">Your first scratch card arrives the moment a client payment finishes repaying an advance. Repay within 7 days for the biggest prize.</div>
          </div>
        )}
      </div>
    </section>
  );
}

function Prize({ e }: { e: Ev }) {
  const days = e.speedBps === 10000 ? "within 7 days" : e.speedBps === 7500 ? "within 14 days" : e.speedBps === 5000 ? "within 21 days" : "within 30 days";
  const jackpot = (e.drawBps ?? 0) >= 7500;
  return (
    <div className="flex size-full flex-col items-center justify-center p-3 text-center">
      {jackpot && <div className="mb-1 rounded-full bg-[#1a0d08]/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider">Lucky card</div>}
      <div className="num font-mono text-4xl font-bold leading-none">{e.points}</div>
      <div className="mt-1 text-[12px] opacity-80">trust points</div>
      <div className="mt-3 space-y-0.5 text-[11px] opacity-75">
        <div>Luck {(e.drawBps ?? 0) / 100}% of fee</div>
        <div>Repaid {days}</div>
      </div>
    </div>
  );
}

function CardSlot({ e, open, onOpen }: { e: Ev; open: boolean; onOpen: () => void }) {
  const style = (e.card ?? 0) % 3; // 1: scratch, 2: flip, 0: gift box
  const face = "relative aspect-[3/4] w-full overflow-hidden rounded-2xl bg-[radial-gradient(120%_100%_at_30%_0%,#ffb4a3,#e2725b_55%,#b4452e)] text-[#1a0d08] shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)]";
  const label = <div className="mt-2 flex items-center justify-between px-0.5 text-[12px] text-muted"><span>Card #{e.card}</span><span>{new Date(e.ts * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>;

  if (open) return <div><div className={face}><Prize e={e} /></div>{label}</div>;

  if (style === 1) return <div><Scratch onDone={onOpen}><div className={face}><Prize e={e} /></div></Scratch>{label}</div>;

  if (style === 2) {
    return (
      <div>
        <button onClick={onOpen} className="group block w-full [perspective:900px]" aria-label="Flip to reveal">
          <motion.div whileHover={{ rotateY: 8 }} className="relative aspect-[3/4] w-full rounded-2xl bg-[radial-gradient(120%_100%_at_30%_0%,#b3a6ff,#836ef9_55%,#4c3db0)] text-white shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)]">
            <div className="absolute inset-3 rounded-xl border border-dashed border-white/40" />
            <div className="flex size-full flex-col items-center justify-center gap-2"><Ticket weight="fill" className="size-10" /><span className="text-[13px] font-medium">Tap to flip</span></div>
          </motion.div>
        </button>
        {label}
      </div>
    );
  }

  return (
    <div>
      <button onClick={onOpen} className="group block w-full" aria-label="Open the gift box">
        <div className="relative grid aspect-[3/4] w-full place-items-center rounded-2xl bg-[#1a202b] ring-1 ring-line-strong">
          <motion.div animate={{ rotate: [0, -4, 4, 0] }} transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 1.4 }} className="flex flex-col items-center gap-2">
            <Gift weight="duotone" className="size-14 text-terra transition-transform group-hover:scale-110" />
            <span className="text-[13px] text-muted">Tap to open</span>
          </motion.div>
        </div>
      </button>
      {label}
    </div>
  );
}

/** Scratch-off foil: drag to scratch; once about half is cleared the whole card reveals. */
export function Scratch({ children, onDone }: { children: React.ReactNode; onDone: () => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [gone, setGone] = useState(false);
  const down = useRef(false);

  useEffect(() => {
    const c = cv.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    c.width = r.width * devicePixelRatio;
    c.height = r.height * devicePixelRatio;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, c.width, c.height);
    grad.addColorStop(0, "#c9ced8"); grad.addColorStop(0.5, "#8e95a3"); grad.addColorStop(1, "#d8dce4");
    g.fillStyle = grad;
    g.fillRect(0, 0, c.width, c.height);
    g.fillStyle = "rgb(18 22 29 / 0.55)";
    g.font = `600 ${14 * devicePixelRatio}px system-ui`;
    g.textAlign = "center";
    g.fillText("Scratch here", c.width / 2, c.height / 2);
  }, []);

  const scratch = (x: number, y: number) => {
    const c = cv.current;
    if (!c || gone) return;
    const r = c.getBoundingClientRect();
    const g = c.getContext("2d")!;
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc((x - r.left) * devicePixelRatio, (y - r.top) * devicePixelRatio, 22 * devicePixelRatio, 0, Math.PI * 2);
    g.fill();
  };
  const check = () => {
    const c = cv.current;
    if (!c || gone) return;
    const d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
    let clear = 0;
    for (let i = 3; i < d.length; i += 64) if (d[i] === 0) clear++;
    if (clear / (d.length / 64) > 0.45) { setGone(true); setTimeout(onDone, 350); }
  };

  return (
    <div className="relative">
      {children}
      <AnimatePresence>
        {!gone && (
          <motion.canvas
            ref={cv} exit={{ opacity: 0 }} transition={{ duration: 0.3, ease: EASE }}
            className="absolute inset-0 size-full cursor-grab touch-none rounded-2xl"
            onPointerDown={(e) => { down.current = true; e.currentTarget.setPointerCapture(e.pointerId); scratch(e.clientX, e.clientY); }}
            onPointerMove={(e) => down.current && scratch(e.clientX, e.clientY)}
            onPointerUp={() => { down.current = false; check(); }}
            aria-label="Scratch to reveal"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
