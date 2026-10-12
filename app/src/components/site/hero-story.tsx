"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import { CheckCircle, Clock, Warning, Lightning, Vault } from "@phosphor-icons/react";

/**
 * Hero story in CSS 3D: you did the work → you wait 45 days → Advance pays you today → their payment repays it.
 * The stage is laid out at a fixed design size and scaled to fit, so coin flight paths stay exact at any width.
 */

const STEPS = [
  { label: "Job done", t: "The work is done.", s: "You've sent a $100 invoice. Now it sits in your client's approval queue.", ms: 2200 },
  { label: "Stuck", t: "And the invoice just sits there.", s: "Net 30 turns into net 60. You earned it, but you can't use it.", ms: 2600 },
  { label: "Paid now", t: "Advance pays you what you've earned.", s: "$50 lands in your wallet in under a second.", ms: 3000 },
  { label: "Collected", t: "Advance waits for the client, not you.", s: "Whenever they finally pay, $20 goes to Advance and $80 to you, on its own.", ms: 4200 },
];

type P = { x: number; y: number };
const LAYOUTS = {
  wide: { W: 960, H: 400, invoice: { x: 170, y: 205 }, core: { x: 480, y: 165 }, wallet: { x: 790, y: 205 }, pool: { x: 480, y: 335 }, turn: 16,
    tags: { pay: { x: 325, y: 140 }, adv: { x: 635, y: 140 }, rep: { x: 575, y: 285 } } },
  tall: { W: 380, H: 660, invoice: { x: 190, y: 110 }, core: { x: 105, y: 330 }, wallet: { x: 190, y: 550 }, pool: { x: 280, y: 330 }, turn: 0,
    tags: { pay: { x: 255, y: 238 }, adv: { x: 230, y: 445 }, rep: { x: 285, y: 398 } } },
};
type Layout = (typeof LAYOUTS)["wide"];

const EASE = [0.23, 1, 0.32, 1] as const;
const FLY = [0.65, 0, 0.35, 1] as const;
const usd = (n: number) => `$${n.toFixed(2)}`;

export function HeroStory() {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [step, setStep] = useState(0);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const id = setTimeout(() => {
      if (step === STEPS.length - 1) setCycle((c) => c + 1);
      setStep((s) => (s + 1) % STEPS.length);
    }, STEPS[step].ms);
    return () => clearTimeout(id);
  }, [step, cycle]);

  const L: Layout = width && width < 640 ? LAYOUTS.tall : LAYOUTS.wide;
  const scale = width ? width / L.W : 1;

  // pointer tilt, springed so it feels physical
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotY = useSpring(useTransform(mx, (v) => v * 9), { stiffness: 120, damping: 18 });
  const rotX = useSpring(useTransform(my, (v) => 10 - v * 7), { stiffness: 120, damping: 18 });

  const go = (i: number) => { setStep(i); setCycle((c) => c + 1); };
  const k = `${cycle}-${step}`;

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="relative mb-4 h-[132px] text-center sm:h-[92px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: EASE }}
            className="absolute inset-x-0"
          >
            <div className="font-mono text-[12px] tracking-widest text-monad-hi">STEP {step + 1} OF 4</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight sm:text-[28px]">{STEPS[step].t}</div>
            <div className="mt-1 text-[15px] text-muted">{STEPS[step].s}</div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div
        ref={wrap}
        className="relative w-full"
        style={{ height: L.H * scale }}
        onPointerMove={(e) => {
          if (reduce || e.pointerType !== "mouse") return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width - 0.5);
          my.set((e.clientY - r.top) / r.height - 0.5);
        }}
        onPointerLeave={() => { mx.set(0); my.set(0); }}
      >
        {width > 0 && (
          <div className="absolute left-0 top-0 origin-top-left" style={{ width: L.W, height: L.H, transform: `scale(${scale})`, perspective: 1400 }}>
            <motion.div className="relative size-full text-left" style={{ transformStyle: "preserve-3d", rotateX: reduce ? 8 : rotX, rotateY: reduce ? 0 : rotY }}>
              <Rails L={L} step={step} />
              <Invoice at={L.invoice} turn={L.turn} step={step} k={k} />
              <Core at={L.core} step={step} />
              <Pool at={L.pool} step={step} k={k} />
              <Wallet at={L.wallet} turn={-L.turn} step={step} k={k} />
              <Tag at={L.tags.adv} show={step === 2} k={k} delay={0.2} tone="terra">$50 advance to you</Tag>
              <Tag at={L.tags.pay} show={step === 3} k={k} delay={0.4} tone="ink">client finally pays $100</Tag>
              <Tag at={L.tags.rep} show={step === 3} k={k} delay={1.3} tone="monad">$20 back to Advance</Tag>
              <Tag at={L.tags.adv} show={step === 3} k={k} delay={1.3} tone="terra">$80 to you</Tag>
              {!reduce && step === 2 && <Flight key={`a${k}`} from={L.core} to={L.wallet} n={5} tone="terra" delay={0.25} />}
              {!reduce && step === 3 && (
                <>
                  <Flight key={`b${k}`} from={L.invoice} to={L.core} n={5} tone="ink" delay={0.4} />
                  <Flight key={`c${k}`} from={L.core} to={L.pool} n={1} tone="monad" delay={1.35} arc={-40} />
                  <Flight key={`d${k}`} from={L.core} to={L.wallet} n={4} tone="terra" delay={1.35} />
                </>
              )}
            </motion.div>
          </div>
        )}
      </div>

      <div className="mt-6 text-center">
        <div className="mx-auto grid max-w-xl grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <button key={s.label} onClick={() => go(i)} className="press group text-left">
              <div className="h-1 overflow-hidden rounded-full bg-white/10">
                <motion.div
                  key={i === step ? k : `idle${i}`}
                  className={`h-full origin-left rounded-full ${i === 2 ? "bg-terra" : "bg-monad"}`}
                  initial={{ scaleX: i < step ? 1 : 0 }}
                  animate={{ scaleX: i <= step ? 1 : 0 }}
                  transition={{ duration: i === step ? STEPS[i].ms / 1000 : 0.2, ease: "linear" }}
                />
              </div>
              <div className={`mt-2 text-[12.5px] transition-colors ${i === step ? "text-ink" : "text-faint group-hover:text-muted"}`}>{i + 1}. {s.label}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- pieces ---------------- */

function Anchor({ at, z = 0, turn = 0, children }: { at: P; z?: number; turn?: number; children: React.ReactNode }) {
  return (
    <div className="absolute left-0 top-0" style={{ transform: `translate3d(${at.x}px, ${at.y}px, ${z}px) rotateY(${turn}deg)`, transformStyle: "preserve-3d" }}>
      <div className="-translate-x-1/2 -translate-y-1/2" style={{ transformStyle: "preserve-3d" }}>{children}</div>
    </div>
  );
}

function Float({ children, d = 5, dur = 5 }: { children: React.ReactNode; d?: number; dur?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div animate={reduce ? undefined : { y: [0, -d, 0] }} transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }} style={{ transformStyle: "preserve-3d" }}>
      {children}
    </motion.div>
  );
}

function Shadow({ w }: { w: number }) {
  return <div className="absolute left-1/2 top-full -translate-x-1/2 rounded-[50%] bg-black/50 blur-xl" style={{ width: w, height: 26, transform: "translateY(18px) translateZ(-60px)" }} />;
}

/** Faint flow lines between the pieces, with marching dashes once money starts moving. */
function Rails({ L, step }: { L: Layout; step: number }) {
  const line = (a: P, b: P, bend: number) => `M ${a.x} ${a.y} Q ${(a.x + b.x) / 2} ${(a.y + b.y) / 2 + bend} ${b.x} ${b.y}`;
  const paths = [
    { d: line(L.invoice, L.core, -60), on: step === 3, c: "var(--ink)" },
    { d: line(L.core, L.wallet, -60), on: step >= 2, c: "var(--terra)" },
    { d: line(L.core, L.pool, 0), on: step === 3, c: "var(--monad-hi)" },
  ];
  return (
    <svg className="pointer-events-none absolute inset-0 size-full overflow-visible" aria-hidden>
      {paths.map((p, i) => (
        <path key={i} d={p.d} fill="none" stroke={p.on ? p.c : "rgb(255 255 255 / 0.12)"} strokeOpacity={p.on ? 0.55 : 1} strokeWidth={2} strokeDasharray="2 10" strokeLinecap="round"
          style={{ animation: p.on ? "dash 0.6s linear infinite" : undefined, transition: "stroke 300ms ease" }} />
      ))}
    </svg>
  );
}

function Invoice({ at, turn, step, k }: { at: P; turn: number; step: number; k: string }) {
  const d = useMotionValue(0);
  const day = useTransform(d, (n) => `day ${Math.round(n)}`);
  const bar = useTransform(d, (n) => Math.min(n / 60, 1));
  useEffect(() => {
    if (step === 0) return d.jump(0);
    const c = step === 1 ? animate(d, 38, { duration: 2.3, ease: "linear" })
      : step === 2 ? animate(d, 41, { duration: 1, ease: "linear" })
      : animate(d, 52, { duration: 0.5, ease: EASE });
    return () => c.stop();
  }, [step, d]);
  return (
    <Anchor at={at} z={30} turn={turn}>
      <Float d={6} dur={5.2}>
        <div className="relative w-[250px] rounded-2xl bg-[#eef1f6] p-5 text-[#12161d] shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)]">
          <div className="font-mono text-[11px] tracking-wider text-[#12161d]/55">YOUR INVOICE</div>
          <div className="mt-2 text-[13px] text-[#12161d]/70">Northwind, 3 weeks of work</div>
          <div className="num mt-1 font-mono text-[34px] font-semibold leading-none">$100.00</div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#12161d]/10">
            <motion.div className={`h-full origin-left rounded-full transition-colors duration-300 ${step === 3 ? "bg-[#2f7a4f]" : "bg-[#e2725b]"}`} style={{ scaleX: bar }} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[12px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={step === 0 ? "d" : step === 3 ? "p" : "w"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}
                className={`flex items-center gap-1 font-medium ${step === 0 ? "text-[#5b4bc4]" : step === 3 ? "text-[#2f7a4f]" : "text-[#b4452e]"}`}>
                {step === 0 ? <><CheckCircle weight="fill" className="size-3.5" /> Sent</> : step === 3 ? <><CheckCircle weight="fill" className="size-3.5" /> Cleared</> : <><Clock weight="bold" className="size-3.5" /> Pending</>}
              </motion.span>
            </AnimatePresence>
            {step === 0 ? <span className="font-mono text-[#12161d]/55">awaiting approval</span> : <motion.span className="font-mono text-[#12161d]/55">{day}</motion.span>}
          </div>
          <AnimatePresence>
            {step === 3 && (
              <motion.div key={`stamp${k}`} initial={{ opacity: 0, scale: 1.6, rotate: -18 }} animate={{ opacity: 1, scale: 1, rotate: -12 }} exit={{ opacity: 0 }}
                transition={{ type: "spring", duration: 0.45, bounce: 0.35, delay: 0.35 }}
                className="absolute right-3 top-[86px] rounded-md border-[3px] border-[#2f7a4f] px-2 py-0.5 font-mono text-[20px] font-bold tracking-widest text-[#2f7a4f]">
                PAID
              </motion.div>
            )}
          </AnimatePresence>
          <Shadow w={210} />
        </div>
      </Float>
    </Anchor>
  );
}

/** A real 3D coin: front, back and a stacked edge, spinning slowly; it glows when money moves. */
function Core({ at, step }: { at: P; step: number }) {
  const hot = step >= 2;
  const edge = Array.from({ length: 12 });
  return (
    <Anchor at={at} z={60}>
      <Float d={8} dur={4.4}>
        <div className="relative grid size-[120px] place-items-center" style={{ transformStyle: "preserve-3d" }}>
          <motion.div aria-hidden className="absolute -inset-10 rounded-full bg-[#836ef9] blur-3xl" animate={{ opacity: hot ? 0.55 : 0.18, scale: hot ? 1.1 : 0.9 }} transition={{ duration: 0.6, ease: EASE }} />
          <div className="coin-spin relative size-[120px]" style={{ transformStyle: "preserve-3d" }}>
            {edge.map((_, i) => (
              <div key={i} className="absolute inset-0 rounded-full bg-[#4c3db0]" style={{ transform: `translateZ(${-i}px)` }} />
            ))}
            {[0, 180].map((r) => (
              <div key={r} className="absolute inset-0 grid place-items-center rounded-full border border-white/25 bg-[radial-gradient(circle_at_30%_25%,#b3a6ff,#836ef9_45%,#5b4bc4)] text-white shadow-[inset_0_-8px_20px_rgb(0_0_0/0.25)]"
                style={{ transform: r ? `rotateY(180deg) translateZ(12px)` : "translateZ(1px)", backfaceVisibility: "hidden" }}>
                <div className="grid size-[86px] place-items-center rounded-full border-2 border-white/30 text-[44px] font-semibold tracking-tighter">A</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 text-center font-mono text-[12px] tracking-widest text-monad-hi">ADVANCE</div>
        <div className="text-center text-[12px] text-muted">pays you early</div>
      </Float>
    </Anchor>
  );
}

function Pool({ at, step, k }: { at: P; step: number; k: string }) {
  return (
    <Anchor at={at} z={10}>
      <div className="relative flex w-[190px] items-center gap-3 rounded-2xl border border-line-strong bg-[#1a202b]/95 px-4 py-3">
        <Vault className="size-6 text-monad-hi" weight="duotone" />
        <div>
          <div className="text-[12px] text-muted">Savers who fund it</div>
          <div className="text-[13px] font-medium">{step === 3 ? "gets $20 back" : step === 2 ? "lent you $50" : "ready to lend"}</div>
        </div>
      </div>
    </Anchor>
  );
}

function Wallet({ at, turn, step, k }: { at: P; turn: number; step: number; k: string }) {
  const bal = step === 2 ? 50 : step === 3 ? 130 : 0;
  const v = useSpring(0, { duration: 900, bounce: 0 });
  const txt = useTransform(v, (n) => usd(n));
  useEffect(() => {
    if (bal === 0) return v.jump(0); // new loop starts from empty, no count-down
    const id = setTimeout(() => v.set(bal), step === 2 ? 900 : 2200);
    return () => clearTimeout(id);
  }, [bal, step, v]);
  return (
    <Anchor at={at} z={30} turn={turn}>
      <Float d={6} dur={5.8}>
        <div className="relative w-[250px] rounded-2xl border border-line-strong bg-[#161b24] p-5 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.8)]">
          <div className="flex items-center justify-between text-[12px] text-muted"><span>Your wallet</span><span className="font-mono">AUSD</span></div>
          <motion.div className="num mt-2 font-mono text-[34px] font-semibold leading-none text-terra">{txt}</motion.div>
          <div className="mt-4 min-h-[70px] text-[12.5px]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={step < 2 ? "rent" : step === 2 ? "adv" : "paid"} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.25 }}>
                {step < 2 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-muted"><span>Earned</span><span className="font-mono text-ink">$100</span></div>
                    <div className={`flex justify-between ${step === 1 ? "text-[#ff8a75]" : "text-muted"}`}><span className="flex items-center gap-1.5">{step === 1 && <Warning weight="fill" className="size-3.5" />} Received</span><span className="font-mono">$0</span></div>
                  </div>
                )}
                {step >= 2 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-ink"><span className="flex items-center gap-1.5"><Lightning weight="fill" className="size-3.5 text-terra" /> Advance</span><span className="font-mono">+$50</span></div>
                    {step === 3 && <div className="flex justify-between text-ink"><span>Client payment</span><span className="font-mono">+$80</span></div>}
                    <div className="flex justify-between border-t border-white/10 pt-1 text-muted"><span>You owe Advance</span><span className="font-mono">{step === 3 ? "$31" : "$51"}</span></div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <Shadow w={210} />
        </div>
      </Float>
    </Anchor>
  );
}

const COIN = {
  terra: "bg-[radial-gradient(circle_at_30%_25%,#ffb4a3,#e2725b_55%,#b4452e)] text-[#1a0d08]",
  monad: "bg-[radial-gradient(circle_at_30%_25%,#c9bfff,#836ef9_55%,#4c3db0)] text-white",
  ink: "bg-[radial-gradient(circle_at_30%_25%,#ffffff,#d5dae3_55%,#9aa3af)] text-[#12161d]",
};

/** Coins that arc from one piece to another, flipping as they fly. */
function Flight({ from, to, n, tone, delay = 0, arc = -110 }: { from: P; to: P; n: number; tone: keyof typeof COIN; delay?: number; arc?: number }) {
  return (
    <>
      {Array.from({ length: n }).map((_, i) => {
        const spread = (i - (n - 1) / 2) * 14;
        return (
          <motion.div
            key={i}
            className="pointer-events-none absolute left-0 top-0"
            style={{ transformStyle: "preserve-3d" }}
            initial={{ x: from.x, y: from.y, z: 90, opacity: 0, scale: 0.5, rotateY: 0 }}
            animate={{
              x: [from.x, (from.x + to.x) / 2 + spread, to.x],
              y: [from.y, (from.y + to.y) / 2 + arc, to.y],
              z: [90, 160, 60],
              opacity: [0, 1, 1, 0],
              scale: [0.5, 1.15, 0.7],
              rotateY: [0, 540],
            }}
            transition={{ duration: 1.05, delay: delay + i * 0.1, ease: FLY }}
          >
            <div className={`grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-mono text-[15px] font-bold shadow-[0_8px_20px_-6px_rgb(0_0_0/0.6)] ring-1 ring-white/30 ${COIN[tone]}`}>$</div>
          </motion.div>
        );
      })}
    </>
  );
}

const TAG = {
  terra: "border-terra/40 bg-[#2a1a17] text-terra",
  monad: "border-monad/40 bg-[#1e1a33] text-monad-hi",
  ink: "border-white/20 bg-[#1f2530] text-ink",
};

/** A label riding the money line, so each flight says what it is. */
function Tag({ at, show, k, delay, tone, children }: { at: P; show: boolean; k: string; delay: number; tone: keyof typeof TAG; children: React.ReactNode }) {
  return (
    <Anchor at={at} z={120}>
      <AnimatePresence>
        {show && (
          <motion.div key={k} initial={{ opacity: 0, y: 6, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, delay, ease: EASE }}
            className={`whitespace-nowrap rounded-full border px-3 py-1 font-mono text-[13px] font-medium shadow-[0_8px_24px_-8px_rgb(0_0_0/0.7)] ${TAG[tone]}`}>
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </Anchor>
  );
}
