"use client";

import { useState, type ReactNode } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  ShoppingCart, AirplaneTilt, Car, GameController, Coffee, FilmSlate, Hamburger, BookOpen, WifiHigh, Copy, Check,
} from "@phosphor-icons/react";
import { BRAND_INFO } from "@/lib/rewards-data";

/* ---------------- Brands ---------------- */

export type Brand = {
  id: string; name: string; cat: "Food" | "Travel" | "Rides" | "Fun" | "Learning";
  icon: typeof Coffee; bg: string; fg: string; word: string; pattern?: string; off: number; prefix: string; amounts: number[];
};

const dots = (c: string) => `radial-gradient(${c} 1.2px, transparent 1.4px) 0 0 / 14px 14px`;
const lines = (c: string) => `repeating-linear-gradient(135deg, ${c} 0 2px, transparent 2px 12px)`;

const LOOKS: Brand[] = [
  { id: "cartwheel", name: "Cartwheel", cat: "Food", icon: ShoppingCart, bg: "linear-gradient(135deg,#23905a,#0f4d30)", fg: "#ffffff", word: "font-black italic tracking-tight", pattern: dots("rgb(255 255 255 / 0.12)"), off: 6, prefix: "CRTW", amounts: [25, 50, 100] },
  { id: "nimbus", name: "Nimbus Air", cat: "Travel", icon: AirplaneTilt, bg: "linear-gradient(160deg,#7cc2ff,#1f5fbf 70%)", fg: "#ffffff", word: "font-light uppercase tracking-[0.22em]", off: 4, prefix: "NMBS", amounts: [50, 100, 250] },
  { id: "velo", name: "Velo", cat: "Rides", icon: Car, bg: "linear-gradient(115deg,#111 0 62%,#ffd400 62% 70%,#111 70%)", fg: "#ffd400", word: "font-extrabold uppercase tracking-tight", off: 8, prefix: "VELO", amounts: [10, 25, 50] },
  { id: "pixelhaus", name: "Pixelhaus", cat: "Fun", icon: GameController, bg: "linear-gradient(135deg,#240a52,#7a1fff 55%,#00d4ff)", fg: "#ffffff", word: "font-mono font-bold tracking-tight", pattern: lines("rgb(255 255 255 / 0.06)"), off: 10, prefix: "PXLH", amounts: [20, 50, 100] },
  { id: "brewline", name: "Brewline", cat: "Food", icon: Coffee, bg: "linear-gradient(135deg,#f6ead6,#e6d2b0)", fg: "#4a2c1a", word: "font-semibold italic tracking-tight", pattern: dots("rgb(74 44 26 / 0.08)"), off: 12, prefix: "BRWL", amounts: [10, 25, 50] },
  { id: "reelhouse", name: "Reelhouse", cat: "Fun", icon: FilmSlate, bg: "linear-gradient(135deg,#c8142f,#5e0716)", fg: "#ffe9d6", word: "font-black uppercase tracking-[0.18em]", pattern: lines("rgb(0 0 0 / 0.12)"), off: 7, prefix: "REEL", amounts: [15, 30, 60] },
  { id: "forkful", name: "forkful", cat: "Food", icon: Hamburger, bg: "linear-gradient(135deg,#ff7a2f,#e8420f)", fg: "#ffffff", word: "font-extrabold lowercase tracking-tight", off: 9, prefix: "FORK", amounts: [15, 30, 50] },
  { id: "stackd", name: "Stackd", cat: "Learning", icon: BookOpen, bg: "linear-gradient(135deg,#eef1f6,#d5dbe6)", fg: "#12161d", word: "font-bold tracking-tight", pattern: lines("rgb(18 22 29 / 0.05)"), off: 5, prefix: "STKD", amounts: [20, 50, 100] },
];

// discounts live in one place (rewards-data), shared with the assistant
export const BRANDS: Brand[] = LOOKS.map((b) => ({ ...b, off: BRAND_INFO.find((x) => x.id === b.id)!.off }));

export const brand = (id: string) => BRANDS.find((b) => b.id === id)!;

/* ---------------- Gift card ---------------- */

export function GiftCard({ b, amount, className = "", style }: { b: Brand; amount?: number; className?: string; style?: React.CSSProperties }) {
  const Icon = b.icon;
  return (
    <div
      className={`relative aspect-[1.586] w-full overflow-hidden rounded-2xl shadow-[0_18px_40px_-18px_rgb(0_0_0/0.8)] ring-1 ring-white/10 ${className}`}
      style={{ background: b.pattern ? `${b.pattern}, ${b.bg}` : b.bg, color: b.fg, ...style }}
    >
      <Icon weight="duotone" className="absolute -bottom-[14%] -right-[8%] size-[62%] opacity-[0.16]" />
      <div className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgb(255_255_255/0.22)_45%,transparent_60%)] opacity-60 mix-blend-overlay" />
      <div className="absolute inset-0 flex flex-col justify-between p-[7%]">
        <div className="flex items-start justify-between gap-2">
          <div className={`flex items-center gap-1.5 text-[clamp(14px,1.6vw,20px)] leading-none ${b.word}`}><Icon weight="fill" className="size-[1.1em]" />{b.name}</div>
          <div className="font-mono text-[9px] uppercase tracking-[0.2em] opacity-70">Gift card</div>
        </div>
        <div className="flex items-end justify-between">
          <div className="num font-mono text-[clamp(18px,2.2vw,28px)] font-semibold leading-none">{amount ? `$${amount}` : ""}</div>
          <div className="font-mono text-[9px] tracking-widest opacity-60">{b.prefix} ••••</div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Advance card (metal, tilts with the pointer) ---------------- */

/** A credit card on the advance line: it spends your Advance limit, repaid the same way (20% of client payments). */
export function AdvanceCard({ frozen = false, locked = false, name = "PRIYA SHARMA", limit = 50, className = "" }: { frozen?: boolean; locked?: boolean; name?: string; limit?: number; className?: string }) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, (v) => (0.5 - v) * 14), { stiffness: 150, damping: 18 });
  const ry = useSpring(useTransform(mx, (v) => (v - 0.5) * 18), { stiffness: 150, damping: 18 });
  const sheen = useTransform([mx, my] as const, ([x, y]: number[]) =>
    `radial-gradient(circle at ${x * 100}% ${y * 100}%, rgb(255 255 255 / 0.22), transparent 45%)`);
  return (
    <div className={`[perspective:1200px] ${className}`}>
      <motion.div
        onPointerMove={(e) => {
          if (reduce) return;
          const r = e.currentTarget.getBoundingClientRect();
          mx.set((e.clientX - r.left) / r.width);
          my.set((e.clientY - r.top) / r.height);
        }}
        onPointerLeave={() => { mx.set(0.5); my.set(0.5); }}
        style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
        className={`relative aspect-[1.586] w-full overflow-hidden rounded-[22px] text-white shadow-[0_40px_80px_-30px_rgb(131_110_249/0.55)] ring-1 ring-white/15 transition-[filter] duration-300 ${frozen || locked ? "grayscale" : ""}`}
      >
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#2c2550_0%,#171a26_45%,#12161d_70%,#3a1f1a_100%)]" />
        <div className="absolute inset-0 opacity-40 [background:repeating-linear-gradient(90deg,rgb(255_255_255/0.025)_0_1px,transparent_1px_3px)]" />
        <div className="absolute -left-1/4 -top-1/2 size-[90%] rounded-full bg-[#836ef9] opacity-30 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 size-[80%] rounded-full bg-[#e2725b] opacity-25 blur-3xl" />
        <motion.div className="absolute inset-0" style={{ background: sheen }} />
        <div className="absolute inset-0 flex flex-col justify-between p-[6.5%]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2 text-[clamp(15px,1.7vw,20px)] font-semibold tracking-tight"><img src="/icon.svg" alt="" className="size-[1.4em]" /> Advance</div>
            <div className="text-right font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">credit<div className="mt-1 normal-case tracking-normal text-white/80">limit ${limit.toLocaleString()}</div></div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative h-[clamp(28px,3.4vw,40px)] w-[clamp(38px,4.6vw,54px)] rounded-md bg-[linear-gradient(135deg,#f3d27a,#b98a2c_55%,#f0cf7a)] shadow-inner">
              <div className="absolute inset-[22%_0] border-y border-black/25" />
              <div className="absolute inset-[0_38%] border-x border-black/25" />
            </div>
            <WifiHigh weight="bold" className="size-6 rotate-90 text-white/70" />
          </div>
          <div className="num font-mono text-[clamp(15px,2vw,24px)] tracking-[0.14em] [text-shadow:0_1px_0_rgb(0_0_0/0.6),0_-1px_0_rgb(255_255_255/0.15)]">5412 •••• •••• 4821</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/50">Cardholder</div>
              <div className="font-mono text-[clamp(11px,1.2vw,14px)] tracking-widest">{name}</div>
            </div>
            <div>
              <div className="font-mono text-[8px] uppercase tracking-[0.2em] text-white/50">Valid thru</div>
              <div className="font-mono text-[clamp(11px,1.2vw,14px)] tracking-widest">09/29</div>
            </div>
            <div className="text-right text-[clamp(13px,1.4vw,17px)] font-bold italic tracking-tight text-[#b3a6ff]">monad</div>
          </div>
        </div>
        {frozen && !locked && <div className="absolute inset-0 grid place-items-center bg-[#9ec9ff]/15 font-mono text-sm tracking-[0.3em] text-white backdrop-blur-[2px]">FROZEN</div>}
        {locked && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-[#12161d]/55 text-white backdrop-blur-[2px]">
            <span className="font-mono text-sm tracking-[0.3em]">NOT ACTIVE</span>
            <span className="text-[12px] text-white/75">Activates once your income is checked</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}

/* ---------------- Codes and barcodes ---------------- */

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function makeCode(prefix: string) {
  const r = crypto.getRandomValues(new Uint8Array(12));
  const g = (o: number) => Array.from(r.slice(o, o + 4), (n) => ALPHA[n % ALPHA.length]).join("");
  return `${prefix}-${g(0)}-${g(4)}-${g(8)}`;
}
export const makePin = () => String(1000 + (crypto.getRandomValues(new Uint16Array(1))[0] % 9000));

export function Barcode({ value, className = "" }: { value: string; className?: string }) {
  let h = 2166136261;
  const bars: { x: number; w: number }[] = [];
  let x = 0;
  for (let i = 0; i < 58; i++) {
    h = Math.imul(h ^ value.charCodeAt(i % value.length) ^ i, 16777619) >>> 0;
    const w = 1 + (h % 3);
    if (i % 2 === 0) bars.push({ x, w });
    x += w + (h >> 4) % 2;
  }
  return (
    <svg viewBox={`0 0 ${x} 40`} preserveAspectRatio="none" className={className} aria-label={`Barcode ${value}`}>
      {bars.map((b, i) => <rect key={i} x={b.x} y={0} width={b.w} height={40} fill="currentColor" />)}
    </svg>
  );
}

export function CopyCode({ code, dark = false }: { code: string; dark?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard?.writeText(code).catch(() => {}); setOk(true); setTimeout(() => setOk(false), 1400); }}
      className={`press flex w-full items-center justify-between gap-2 rounded-lg border border-dashed px-3 py-2 font-mono text-[13px] tracking-wider ${dark ? "border-black/30" : "border-white/25"}`}
    >
      <span className="truncate">{code}</span>
      {ok ? <Check className="size-4 shrink-0" weight="bold" /> : <Copy className="size-4 shrink-0 opacity-70" />}
    </button>
  );
}

/* ---------------- Coupons: each format looks different ---------------- */

export type Coupon = { id: string; brand: string; value: ReactNode; what: string; detail: string; code?: string; ends: string; kind: "ticket" | "stamp" | "badge" | "strip" };

export const COUPONS: Coupon[] = [
  { id: "c1", brand: "velo", kind: "ticket", value: <>20<span className="text-[0.5em]">% OFF</span></>, what: "Your next 5 rides", detail: "Up to $8 off each ride.", code: "VELO-ADV20", ends: "Ends Oct 31" },
  { id: "c2", brand: "brewline", kind: "stamp", value: "Buy 1, get 1", what: "Any handcrafted drink", detail: "Show the code at the counter.", code: "BREW-B1G1-7K", ends: "Ends Nov 15" },
  { id: "c3", brand: "nimbus", kind: "ticket", value: "$40", what: "Off flights over $300", detail: "Economy and premium economy.", code: "NMBS40-ADVANCE", ends: "Ends Dec 1" },
  { id: "c4", brand: "pixelhaus", kind: "badge", value: "3 months free", what: "Pixelhaus Pass Ultimate", detail: "New members. Cancel anytime.", code: "PXL-3MO-FREE", ends: "Ends Nov 30" },
  { id: "c5", brand: "cartwheel", kind: "strip", value: "10% back", what: "In points on groceries", detail: "Paid with your Advance card. No code needed.", ends: "Always on" },
  { id: "c6", brand: "forkful", kind: "badge", value: "Free delivery", what: "For 30 days", detail: "On orders over $15.", code: "FORKFREE30", ends: "Ends Nov 8" },
];

export function CouponCard({ c, unlocked = true }: { c: Coupon; unlocked?: boolean }) {
  const b = brand(c.brand);
  const Icon = b.icon;
  const [on, setOn] = useState(false);
  const light = b.fg !== "#ffffff" && b.fg !== "#ffe9d6" && b.fg !== "#ffd400";

  if (c.kind === "stamp") {
    // loyalty-card style with stamp circles
    return (
      <div className="relative overflow-hidden rounded-2xl p-5" style={{ background: b.bg, color: b.fg }}>
        <div className="flex items-center justify-between"><div className={`flex items-center gap-1.5 text-lg ${b.word}`}><Icon weight="fill" />{b.name}</div><span className="text-[12px] opacity-70">{c.ends}</span></div>
        <div className="mt-3 text-3xl font-semibold tracking-tight">{c.value}</div>
        <div className="text-[14px] opacity-80">{c.what}</div>
        <div className="mt-3 flex gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`grid size-8 place-items-center rounded-full border-2 border-dashed ${i < 5 ? "border-transparent" : "border-current/40"}`} style={i < 5 ? { background: "rgb(74 44 26 / 0.18)" } : undefined}>
              {i < 5 && <Icon weight="fill" className="size-4" />}
            </div>
          ))}
        </div>
        <div className="mt-4"><CopyCode code={c.code!} dark={light} /></div>
      </div>
    );
  }

  if (c.kind === "badge") {
    // round "seal" on the left, details on the right
    return (
      <div className="flex items-center gap-5 rounded-2xl border border-line-strong bg-panel p-5">
        <div className="relative grid size-24 shrink-0 place-items-center rounded-full text-center text-[13px] font-bold leading-tight" style={{ background: b.bg, color: b.fg }}>
          <div className="absolute inset-1.5 rounded-full border-2 border-dashed" style={{ borderColor: b.fg, opacity: 0.45 }} />
          <span className="px-3">{c.value}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-1.5 font-semibold"><Icon weight="fill" style={{ color: b.id === "forkful" ? "#ff7a2f" : "#a594ff" }} />{b.name}</div><span className="text-[12px] text-faint">{c.ends}</span></div>
          <div className="mt-1 text-[15px]">{c.what}</div>
          <div className="text-[13px] text-muted">{c.detail}</div>
          <div className="mt-3"><CopyCode code={c.code!} /></div>
        </div>
      </div>
    );
  }

  if (c.kind === "strip") {
    // always-on offer with an activate switch
    return (
      <div className="flex items-center gap-4 rounded-2xl border border-line-strong bg-panel p-5">
        <div className="grid size-12 shrink-0 place-items-center rounded-xl" style={{ background: b.bg, color: b.fg }}><Icon weight="fill" className="size-6" /></div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold">{c.value} <span className="font-normal text-muted">at {b.name}</span></div>
          <div className="text-[13px] text-muted">{c.detail}</div>
        </div>
        <button role="switch" aria-checked={on} aria-label="Activate offer" onClick={() => setOn(!on)}
          className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-terra" : "bg-white/15"}`}>
          <span className={`absolute left-0.5 top-0.5 size-6 rounded-full bg-white shadow transition-transform duration-200 ease-out ${on ? "translate-x-5" : ""}`} />
        </button>
      </div>
    );
  }

  // ticket: brand stub + perforation + details
  return (
    <div className={`relative flex overflow-hidden rounded-2xl ${unlocked ? "" : "opacity-60"}`}>
      <div className="flex w-[38%] shrink-0 flex-col justify-between p-5" style={{ background: b.bg, color: b.fg }}>
        <div className={`flex items-center gap-1.5 text-[15px] ${b.word}`}><Icon weight="fill" />{b.name}</div>
        <div className="num mt-4 font-mono text-4xl font-bold leading-none">{c.value}</div>
      </div>
      <div className="relative w-0 border-l-2 border-dashed border-white/20">
        <span className="absolute -left-3 -top-3 size-6 rounded-full bg-bg" />
        <span className="absolute -bottom-3 -left-3 size-6 rounded-full bg-bg" />
      </div>
      <div className="min-w-0 flex-1 bg-panel p-5">
        <div className="flex items-center justify-between gap-2 text-[12px] text-faint"><span>Coupon</span><span>{c.ends}</span></div>
        <div className="mt-1 text-[16px] font-semibold">{c.what}</div>
        <div className="text-[13px] text-muted">{c.detail}</div>
        <div className="mt-3"><CopyCode code={c.code!} /></div>
      </div>
    </div>
  );
}
