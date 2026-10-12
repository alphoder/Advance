"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import {
  ArrowRight, Lightning, ShieldCheck, LockKey, ChartLineUp, Robot, Globe, Fingerprint, Scales, Link as LinkIcon, Cpu,
} from "@phosphor-icons/react";
import { publicClient, CHAIN_ID } from "@/lib/chain";
import { usePoll } from "@/lib/hooks";
import { Panel, fmtUsd, CHAIN_NAME } from "@/components/ui";

const SplitScene = dynamic(() => import("@/components/three/split-scene"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse rounded-3xl bg-white/[0.02]" />,
});

const EASE = [0.23, 1, 0.32, 1] as const;

/* ---------------- Hero ---------------- */

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid min-h-[calc(100dvh-4rem)] max-w-7xl items-center gap-6 px-4 pb-10 pt-8 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:pt-4">
        <div>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-white/[0.03] px-3 py-1 text-[13px] text-muted"
          >
            <span className="live-dot size-1.5 rounded-full bg-monad text-monad" /> Live on {CHAIN_NAME}
          </motion.div>
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.06 }}
            className="mt-6 text-[42px] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[68px]"
          >
            Get paid today for work you&apos;ve <span className="text-terra">already done.</span>
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.12 }}
            className="mt-6 max-w-[46ch] text-lg leading-relaxed text-muted"
          >
            Advances on the money already heading your way. Your next client payment repays it automatically, in the same transaction.
          </motion.p>
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: EASE, delay: 0.18 }}
            className="mt-9 flex flex-wrap gap-3"
          >
            <Link href="/app?demo=1" className="press inline-flex min-h-12 items-center gap-2 rounded-xl bg-terra px-6 text-[15px] font-medium text-[#1a0d08] shadow-[0_14px_40px_-14px_rgb(226_114_91/0.8)] hover:bg-terra-hi">
              Try the 60-second demo <ArrowRight className="size-4" weight="bold" />
            </Link>
            <a href="#check" className="press inline-flex min-h-12 items-center gap-2 rounded-xl border border-line-strong bg-white/[0.03] px-6 text-[15px] font-medium hover:bg-white/[0.07]">
              Check any address
            </a>
          </motion.div>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1, ease: EASE, delay: 0.1 }}
          className="relative h-[380px] sm:h-[460px] lg:h-[600px]"
        >
          <SplitScene reduced={Boolean(reduce)} />
        </motion.div>
      </div>
      <LiveStrip />
    </section>
  );
}

/** Real numbers only: live block height, measured block time, pool size and advances from the chain. */
function LiveStrip() {
  const [block, setBlock] = useState<bigint>();
  const [rate, setRate] = useState<number>();
  const { data } = usePoll<{ pool: { total: number; advances: number; repayments: number; feesEarned: number } }>("/api/pool", 6000);
  useEffect(() => {
    let first: { n: bigint; t: number } | undefined;
    const tick = async () => {
      try {
        const n = await publicClient.getBlockNumber({ cacheTime: 0 });
        setBlock(n);
        const now = performance.now();
        if (!first) first = { n, t: now };
        else if (n > first.n) setRate((now - first.t) / Number(n - first.n));
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const cells = [
    ["Latest block", block ? `#${block.toLocaleString()}` : "…"],
    ["Measured block time", rate ? `${(rate / 1000).toFixed(2)}s` : "…"],
    ["Funds in the pool", data ? fmtUsd(data.pool.total, 0) : "…"],
    ["Advances funded", data ? String(data.pool.advances) : "…"],
    ["Repayments at source", data ? String(data.pool.repayments) : "…"],
  ];
  return (
    <div className="relative border-y border-line bg-bg-2/60 backdrop-blur">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px px-4 sm:px-6 md:grid-cols-5">
        {cells.map(([k, v]) => (
          <div key={k} className="py-4">
            <div className="text-[12px] text-faint">{k}</div>
            <div className="num mt-0.5 font-mono text-[17px] text-ink">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- How it works: pinned steps with scroll-linked progress ---------------- */

const STEPS = [
  { icon: Fingerprint, title: "Sign in with your face", body: "A Mera passkey becomes your account. No wallet, no seed phrase, no app to install." },
  { icon: ChartLineUp, title: "We read the money you already earn", body: "Who pays you, how often, and whether those payers are real. Every reason is shown in plain words." },
  { icon: Lightning, title: "Get an advance in under a second", body: "Start at $50 with a flat 2% fee, shown in dollars. No interest that grows, no late fees." },
  { icon: Scales, title: "Your next payment repays it", body: "Clients pay your Advance link. 20% repays, 80% reaches you, in one Monad transaction." },
];

export function HowItWorks() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 85%", "end 55%"] });
  return (
    <section id="how" className="mx-auto max-w-7xl px-4 py-24 sm:px-6 sm:py-32">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Credit that repays itself.</h2>
        <p className="mt-4 text-lg text-muted">
          Lenders say no because they can&apos;t control repayment. Advance moves repayment to the source: the payment itself.
        </p>
      </div>
      <div ref={ref} className="relative mt-16">
        <ProgressRail progress={scrollYProgress} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => <Step key={s.title} index={i} {...s} progress={scrollYProgress} />)}
        </div>
      </div>
    </section>
  );
}

/** Horizontal rail above the cards (desktop): fills with scroll, one node per step. */
function ProgressRail({ progress }: { progress: MotionValue<number> }) {
  const scaleX = useTransform(progress, [0, 1], [0, 1]);
  return (
    <div className="relative mb-8 hidden h-3 lg:block" aria-hidden>
      <div className="absolute inset-x-[12.5%] top-1/2 h-px -translate-y-1/2 bg-line-strong" />
      <motion.div style={{ scaleX, transformOrigin: "left" }} className="absolute inset-x-[12.5%] top-1/2 h-0.5 -translate-y-1/2 rounded-full bg-gradient-to-r from-monad to-terra" />
      {STEPS.map((_, i) => <RailNode key={i} index={i} progress={progress} />)}
    </div>
  );
}

function RailNode({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const at = index / (STEPS.length - 1);
  const scale = useTransform(progress, [at - 0.08, at], [0.6, 1]);
  const opacity = useTransform(progress, [at - 0.08, at], [0.35, 1]);
  return (
    <motion.span
      style={{ left: `${12.5 + index * 25}%`, scale, opacity }}
      className={`absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full ring-4 ring-bg ${index % 2 ? "bg-terra" : "bg-monad"}`}
    />
  );
}

function Step({ icon: Icon, title, body, index, progress }: (typeof STEPS)[number] & { index: number; progress: MotionValue<number> }) {
  const at = index / (STEPS.length - 1);
  const opacity = useTransform(progress, [at - 0.25, at], [0.4, 1]);
  const y = useTransform(progress, [at - 0.25, at], [10, 0]);
  return (
    <motion.div style={{ opacity, y }} className="h-full">
      <Panel className="flex h-full flex-col">
        <div className="grid size-12 place-items-center rounded-xl border border-line bg-white/[0.03]">
          <Icon className={`size-6 ${index % 2 ? "text-terra" : "text-monad-hi"}`} weight="duotone" />
        </div>
        <h3 className="mt-5 text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{body}</p>
      </Panel>
    </motion.div>
  );
}

/* ---------------- Bento: what else is inside ---------------- */

export function Bento() {
  const reveal = (i: number) => ({
    initial: { opacity: 0, y: 20 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.15 },
    transition: { duration: 0.6, delay: i * 0.06, ease: EASE },
  });
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <h2 className="max-w-2xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">A full credit market, not a single trick.</h2>
      <div className="mt-12 grid gap-4 md:grid-cols-6 md:grid-rows-[auto_auto]">
        <motion.div {...reveal(0)} className="md:col-span-4">
          <Link href="/app/earn" className="block h-full">
            <div className="relative h-full overflow-hidden rounded-2xl border border-line bg-[radial-gradient(120%_120%_at_100%_0%,rgb(131_110_249/0.28),transparent_55%),linear-gradient(180deg,#1c2230,#161b24)] p-7">
              <ShieldCheck className="size-8 text-monad-hi" weight="duotone" />
              <h3 className="mt-5 text-2xl font-semibold">Two risk levels for savers</h3>
              <p className="mt-2 max-w-md text-muted">Steady is protected first. Boost absorbs missed repayments first and earns more for it. Returns come from real borrower fees.</p>
              <div className="mt-8 flex gap-3">
                <div className="flex-[4] rounded-xl bg-white/[0.06] p-3"><div className="text-[12px] text-muted">Steady</div><div className="num font-mono text-lg">80% of pool</div></div>
                <div className="flex-1 rounded-xl bg-monad/25 p-3"><div className="text-[12px] text-monad-hi">Boost</div><div className="num font-mono text-lg">20%</div></div>
              </div>
            </div>
          </Link>
        </motion.div>
        <motion.div {...reveal(1)} className="md:col-span-2">
          <Link href="/app/files" className="block h-full">
            <div className="h-full rounded-2xl border border-line bg-[#161b24] bg-[linear-gradient(160deg,rgb(226_114_91/0.22),transparent_60%)] p-7">
              <LockKey className="size-8 text-terra" weight="duotone" />
              <h3 className="mt-5 text-xl font-semibold">One passkey, many keys</h3>
              <p className="mt-2 text-muted">Your passkey also derives an encryption key. Share an invoice with one lender, and nobody else can read it.</p>
            </div>
          </Link>
        </motion.div>
        <motion.div {...reveal(2)} className="md:col-span-2">
          <Link href="/app/market" className="block h-full">
            <div className="h-full rounded-2xl border border-line bg-panel/70 p-7">
              <LinkIcon className="size-8 text-monad-hi" weight="duotone" />
              <h3 className="mt-5 text-xl font-semibold">Credit you can trade</h3>
              <p className="mt-2 text-muted">Boost shares list on a Kuru order book, priced next to their onchain fair value.</p>
            </div>
          </Link>
        </motion.div>
        <motion.div {...reveal(3)} className="md:col-span-2">
          <Link href="/app/agents" className="block h-full">
            <div className="relative h-full overflow-hidden rounded-2xl border border-line bg-[#161b24] bg-[conic-gradient(from_200deg_at_80%_20%,rgb(131_110_249/0.25),transparent_30%,rgb(226_114_91/0.2),transparent_70%)] p-7">
              <Robot className="size-8 text-ink" weight="duotone" />
              <h3 className="mt-5 text-xl font-semibold">Credit for AI agents</h3>
              <p className="mt-2 text-muted">ERC-8004 agents borrow working capital and repay from their next job.</p>
            </div>
          </Link>
        </motion.div>
        <motion.div {...reveal(4)} className="md:col-span-2">
          <div className="h-full rounded-2xl border border-line bg-panel/70 p-7">
            <div className="flex gap-2"><Globe className="size-8 text-terra" weight="duotone" /><Cpu className="size-8 text-monad-hi" weight="duotone" /></div>
            <h3 className="mt-5 text-xl font-semibold">Any chain in, consensus on top</h3>
            <p className="mt-2 text-muted">Deposit from Base or Solana with Aurora. Chainlink CRE nodes agree on every credit limit.</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/* ---------------- Cost comparison ---------------- */

export function Compare() {
  const rows = [
    { name: "Advance", cost: 1, note: "Flat 2%, shown upfront", us: true },
    { name: "Merchant cash advance", cost: 3.5, note: "30% to 100%+ effective a year" },
    { name: "Payday loan", cost: 7.5, note: "$15 per $100, about 391% a year (CFPB)" },
  ];
  const max = 7.5;
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">What $50 for two weeks costs.</h2>
          <p className="mt-4 max-w-[44ch] text-lg text-muted">85% of freelancers get paid late at least some of the time. The fast options punish them for it.</p>
        </div>
        <div className="space-y-6">
          {rows.map((r, i) => (
            <div key={r.name}>
              <div className="flex items-baseline justify-between">
                <span className={r.us ? "font-semibold text-terra" : "text-ink"}>{r.name}</span>
                <span className={`num font-mono text-2xl ${r.us ? "text-terra" : ""}`}>{fmtUsd(r.cost)}</span>
              </div>
              <motion.div
                initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, delay: i * 0.1, ease: EASE }}
                style={{ width: `${(r.cost / max) * 100}%`, transformOrigin: "left" }}
                className={`mt-2 h-2.5 rounded-full ${r.us ? "bg-terra" : "bg-white/15"}`}
              />
              <div className="mt-1.5 text-[13px] text-muted">{r.note}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Why Monad ---------------- */

export function WhyMonad() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="relative overflow-hidden rounded-3xl border border-line bg-[radial-gradient(80%_120%_at_0%_100%,rgb(131_110_249/0.25),transparent_60%),linear-gradient(180deg,#1a202b,#12161d)] p-8 sm:p-14">
        <h2 className="max-w-3xl text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Repaying from every payment only works on Monad.</h2>
        <p className="mt-5 max-w-[60ch] text-lg text-muted">
          One payment means one onchain split. On most chains the fee to split a $10 payment costs more than the repayment.
          On Monad it costs a fraction of a cent and settles before you lift your thumb.
        </p>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {[
            ["~0.4s", "blocks, so the split lands while you watch"],
            ["< $0.01", "per split, so a $10 payment can repay a loan"],
            ["Parallel", "execution: every earner has their own account"],
          ].map(([big, small]) => (
            <div key={big}>
              <div className="num text-4xl font-semibold text-monad-hi">{big}</div>
              <div className="mt-1 text-muted">{small}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Final call to action: two paths ---------------- */

export function TwoPaths() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/app?demo=1" className="group block">
          <div className="press h-full rounded-3xl bg-terra p-8 text-[#1a0d08] sm:p-10">
            <div className="text-[15px] font-medium opacity-70">I earn money</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Get my first advance</div>
            <ArrowRight className="mt-10 size-7 transition-transform duration-300 group-hover:translate-x-1.5" weight="bold" />
          </div>
        </Link>
        <Link href="/app/earn" className="group block">
          <div className="press h-full rounded-3xl bg-monad p-8 text-white sm:p-10">
            <div className="text-[15px] font-medium opacity-75">I have dollars</div>
            <div className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Fund advances, earn fees</div>
            <ArrowRight className="mt-10 size-7 transition-transform duration-300 group-hover:translate-x-1.5" weight="bold" />
          </div>
        </Link>
      </div>
      <p className="mt-6 text-center text-[13px] text-faint">Network {CHAIN_ID}. Every number in this app is read from the chain.</p>
    </section>
  );
}

/* ---------------- Home: Advance in one picture ---------------- */

export function OnePicture() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Advance in one picture.</h2>
        <p className="mt-4 text-lg text-muted">You get money today. When your client pays later, the payment splits itself: a small part repays the advance, the rest is yours.</p>
      </div>
      <div className="mt-12 grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <div className="rounded-3xl bg-terra p-6 text-[#1a0d08]">
          <div className="text-[13px] font-medium opacity-70">Today</div>
          <div className="num mt-1 font-mono text-4xl font-semibold">+$50</div>
          <p className="mt-2 text-[15px] opacity-80">You take an advance. It arrives in about a second.</p>
        </div>
        <div className="hidden items-center text-faint md:flex"><ArrowRight className="size-6" /></div>
        <div className="rounded-3xl border border-line bg-panel p-6">
          <div className="text-[13px] font-medium text-muted">Next week</div>
          <div className="num mt-1 font-mono text-4xl font-semibold">$100</div>
          <p className="mt-2 text-[15px] text-muted">A client pays your Advance link, like any normal payment.</p>
        </div>
        <div className="hidden items-center text-faint md:flex"><ArrowRight className="size-6" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-3xl bg-monad p-5 text-white">
            <div className="num font-mono text-3xl font-semibold">$20</div>
            <p className="mt-1 text-[13.5px] opacity-85">repays the advance</p>
          </div>
          <div className="rounded-3xl bg-terra p-5 text-[#1a0d08]">
            <div className="num font-mono text-3xl font-semibold">$80</div>
            <p className="mt-1 text-[13.5px] opacity-80">lands with you</p>
          </div>
        </div>
      </div>
      <div className="mt-8 text-center">
        <Link href="/how-it-works" className="inline-flex items-center gap-1.5 text-[15px] text-terra hover:text-terra-hi">See the full walkthrough and simulator <ArrowRight className="size-4" /></Link>
      </div>
    </section>
  );
}

/* ---------------- Home: choose your path ---------------- */

export function ChoosePath() {
  const paths = [
    { href: "/borrow", who: "I earn money", t: "Get paid early", b: "Freelancers, sellers, creators and gig workers.", cls: "bg-terra text-[#1a0d08]" },
    { href: "/save", who: "I have dollars", t: "Earn from fees", b: "Fund advances and choose your risk level.", cls: "bg-monad text-white" },
    { href: "/agents", who: "I build AI agents", t: "Credit for agents", b: "Working capital for agents that earn onchain.", cls: "border border-line-strong bg-panel text-ink" },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <h2 className="text-center text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">Which one are you?</h2>
      <div className="mt-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        {paths.map((p) => (
          <Link key={p.href} href={p.href} className="group block">
            <div className={`press h-full rounded-3xl p-7 ${p.cls}`}>
              <div className="text-[14px] font-medium opacity-75">{p.who}</div>
              <div className="mt-2 text-3xl font-semibold tracking-tight">{p.t}</div>
              <p className="mt-2 text-[15px] opacity-80">{p.b}</p>
              <ArrowRight className="mt-8 size-6 transition-transform duration-300 group-hover:translate-x-1.5" weight="bold" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Home: explore the rest ---------------- */

export function Explore() {
  const items = [
    { href: "/stress-tests", t: "We tried to break it", b: "13 ways to cheat or lose money, and what stops each." },
    { href: "/compare", t: "How we're different", b: "Advance vs credit cards, Stripe Capital, Credit Coop and more." },
    { href: "/safety", t: "Security", b: "What we've tested, identity checks, and honest risks." },
    { href: "/business", t: "Business model", b: "How Advance makes money, in plain numbers." },
    { href: "/check", t: "Check any address", b: "See what an address could borrow, and why." },
    { href: "/technology", t: "Why Monad", b: "Live chain stats, contracts, and the tech stack." },
    { href: "/agents", t: "AI agents", b: "Working capital for agents that earn onchain." },
    { href: "/faq", t: "FAQ and glossary", b: "Including the tough questions." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <Link key={i.href} href={i.href} className="group block">
            <div className="press h-full rounded-3xl border border-line bg-panel/80 p-6 transition-colors hover:border-line-strong">
              <div className="flex items-center justify-between"><h3 className="font-semibold">{i.t}</h3><ArrowRight className="size-4 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink" /></div>
              <p className="mt-2 text-[14.5px] text-muted">{i.b}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
