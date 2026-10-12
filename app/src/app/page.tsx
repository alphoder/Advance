"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { isAddress } from "viem";
import type { ScoreResult } from "@/server/score";
import { Nav, Footer, Button, Card, ErrorNote, fmtUsd } from "@/components/ui";
import { ScoreView } from "@/components/score-view";
import { api } from "@/lib/tx";
import { publicClient, chain } from "@/lib/chain";
import { usePoll } from "@/lib/hooks";

export default function Home() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <Hero />
        <HowItWorks />
        <Compare />
        <WhyMonad />
        <ForLenders />
      </main>
      <Footer />
    </>
  );
}

function Hero() {
  return (
    <section className="grid gap-10 pb-16 pt-8 lg:grid-cols-[1.05fr_1fr] lg:items-start lg:pt-16">
      <div className="rise">
        <p className="inline-flex rounded-full bg-violet-soft px-3 py-1 text-[13px] font-medium text-violet">For freelancers, sellers and creators</p>
        <h1 className="num mt-5 text-[44px] leading-[1.02] sm:text-6xl lg:text-7xl">
          Get paid today for work you&apos;ve already done.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          Advance gives you money now, based on the payments you already receive. When your next payment arrives, a small slice
          pays the advance back by itself. No paperwork, no interest that grows, no wallet to set up.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/app?demo=1"><Button variant="violet">Try it as Priya · 60 seconds</Button></Link>
          <Link href="/app"><Button variant="secondary">Sign in with Face ID</Button></Link>
        </div>
        <p className="mt-3 text-[13px] text-muted">The demo uses real transactions on {chain.name}. Nothing is simulated except the clients.</p>
      </div>
      <ScoreChecker />
    </section>
  );
}

function ScoreChecker() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScoreResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { data: cfg } = usePoll<{ sybilSam: string; nansen: boolean; indexer: string }>("/api/config", 60_000);

  async function check(address: string) {
    setError(undefined);
    if (!isAddress(address)) return setError("That doesn't look like a Monad address (it should start with 0x and be 42 characters).");
    setLoading(true);
    try {
      setResult(await api<ScoreResult>(`/api/score?address=${address}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rise shadow-[0_30px_80px_-40px_rgba(22,19,15,0.35)]">
      <h2 className="text-xl font-semibold">What could this address borrow?</h2>
      <p className="mt-1 text-[15px] text-muted">Paste any Monad address. No sign-in. We read its income and explain the answer.</p>
      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(e: FormEvent) => { e.preventDefault(); check(input.trim()); }}
      >
        <label htmlFor="addr" className="sr-only">Monad address</label>
        <input
          id="addr"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="0x…"
          spellCheck={false}
          autoComplete="off"
          className="min-h-11 flex-1 rounded-full border border-line bg-paper px-4 font-mono text-[14px] outline-none focus:border-ink"
        />
        <Button type="submit" loading={loading}>Check score</Button>
      </form>
      {cfg && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-muted">
          Try:
          <button className="rounded-full border border-line px-3 py-1 hover:border-ink" onClick={() => { setInput(cfg.sybilSam); check(cfg.sybilSam); }}>
            Sybil Sam (fakes his income)
          </button>
        </div>
      )}
      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      {result && <div className="mt-5 border-t border-line pt-5"><ScoreView s={result} /></div>}
      {cfg && <p className="mt-4 text-[12px] text-muted">History via {cfg.indexer}{cfg.nansen ? " · payers checked with Nansen" : ""}.</p>}
    </Card>
  );
}

function HowItWorks() {
  return (
    <section className="border-t border-line py-16">
      <h2 className="num text-4xl sm:text-5xl">How it works</h2>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["1", "We look at the money you already earn", "Who pays you, how often, and whether those payers are real. You see every reason."],
          ["2", "You get an advance in under a second", "Start at $50. The cost is a flat 2%, shown in dollars before you agree. Nothing grows."],
          ["3", "Your next payment pays it back", "Clients pay your Advance link. 20% of each payment repays the advance, the rest is yours, instantly."],
        ].map(([n, t, d]) => (
          <Card key={n}>
            <div className="num text-5xl text-violet">{n}</div>
            <h3 className="mt-3 text-lg font-semibold">{t}</h3>
            <p className="mt-1 text-muted">{d}</p>
          </Card>
        ))}
      </div>
      <SplitDiagram />
    </section>
  );
}

function SplitDiagram() {
  return (
    <Card className="mt-4 overflow-hidden">
      <div className="grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
        <div className="text-center md:text-left">
          <div className="text-[13px] uppercase tracking-wide text-muted">Your client pays</div>
          <div className="num text-6xl">$100</div>
        </div>
        <svg viewBox="0 0 160 90" className="mx-auto h-24 w-40" aria-hidden>
          <path d="M0 45 H60 C90 45 90 15 120 15 H160" stroke="var(--violet)" strokeWidth="3" fill="none" />
          <path d="M0 45 H60 C90 45 90 75 120 75 H160" stroke="var(--green)" strokeWidth="3" fill="none" />
          <circle cx="60" cy="45" r="6" fill="var(--ink)" />
        </svg>
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-4 rounded-2xl bg-violet-soft px-4 py-3">
            <span className="text-violet">Pays back your advance</span><span className="num text-3xl text-violet">$20</span>
          </div>
          <div className="flex items-baseline justify-between gap-4 rounded-2xl bg-green-soft px-4 py-3">
            <span className="text-green">Lands with you</span><span className="num text-3xl text-green">$80</span>
          </div>
        </div>
      </div>
      <p className="mt-4 text-center text-[14px] text-muted md:text-left">Both happen in the same transaction, in the same second. Advance never holds your money.</p>
    </Card>
  );
}

function Compare() {
  const rows = [
    ["Advance", "$1.00", "Flat 2%, shown upfront. No interest, no late fees.", true],
    ["Typical payday loan", "$7.50", "$15 per $100 for two weeks: about 391% a year (CFPB)", false],
    ["Merchant cash advance", "$2–$5+", "Effective rates from 30% to well over 100% a year", false],
    ["Waiting for the invoice", "$0", "…and 30 to 60 days without the money", false],
  ] as const;
  return (
    <section className="border-t border-line py-16">
      <h2 className="num text-4xl sm:text-5xl">What $50 for two weeks costs</h2>
      <p className="mt-2 max-w-2xl text-muted">85% of freelancers get paid late at least some of the time. The fast options are expensive. Ours isn&apos;t.</p>
      <div className="mt-8 overflow-hidden rounded-3xl border border-line bg-card">
        {rows.map(([name, cost, note, us]) => (
          <div key={name} className={`grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 border-b border-line px-5 py-4 last:border-0 sm:grid-cols-[14rem_7rem_1fr] ${us ? "bg-violet-soft/50" : ""}`}>
            <div className={`font-medium ${us ? "text-violet" : ""}`}>{name}</div>
            <div className="num text-right text-3xl sm:text-left">{cost}</div>
            <div className="col-span-2 text-[14px] text-muted sm:col-span-1">{note}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function WhyMonad() {
  const [block, setBlock] = useState<bigint>();
  const [rate, setRate] = useState<number>();
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
  return (
    <section className="border-t border-line py-16">
      <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
        <div>
          <h2 className="num text-4xl sm:text-5xl">Why this only works on Monad</h2>
          <p className="mt-4 text-lg text-muted">
            Repaying from every single payment means one onchain transaction per payment. On most chains, the fee to split a $10 payment
            costs more than the repayment. On Monad it costs a fraction of a cent and settles before you lift your thumb.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Card><div className="text-[13px] text-muted">Live block on {chain.name}</div><div className="num mt-1 text-3xl">{block ? `#${block.toLocaleString()}` : "…"}</div></Card>
          <Card><div className="text-[13px] text-muted">Measured block time</div><div className="num mt-1 text-3xl">{rate ? `${(rate / 1000).toFixed(2)}s` : "…"}</div></Card>
          <Card><div className="text-[13px] text-muted">Smallest payment that can repay</div><div className="num mt-1 text-3xl">{fmtUsd(1)}</div></Card>
          <Card><div className="text-[13px] text-muted">Advances run in parallel</div><div className="num mt-1 text-3xl">One account each</div></Card>
        </div>
      </div>
    </section>
  );
}

function ForLenders() {
  return (
    <section className="border-t border-line py-16">
      <Card className="grid gap-6 bg-ink text-paper md:grid-cols-[1.4fr_1fr] md:items-center">
        <div>
          <h2 className="num text-4xl">Have dollars? Fund advances and earn.</h2>
          <p className="mt-2 text-paper/70">
            Returns come from real borrower fees, not token rewards. Choose <b className="text-paper">Steady</b> (protected first) or{" "}
            <b className="text-paper">Boost</b> (absorbs missed repayments first, earns more). Deposit from any chain.
          </p>
        </div>
        <div className="flex md:justify-end">
          <Link href="/earn"><Button variant="violet">Start earning</Button></Link>
        </div>
      </Card>
    </section>
  );
}
