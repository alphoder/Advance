"use client";

import { Coins, Plugs, Gauge, Globe, Robot, Bank, Gift, Ticket } from "@phosphor-icons/react";
import { Mark, Note, Sparkle } from "@/components/site/doodles";
import { PageIntro, Section, Reveal, NextPage, Status } from "@/components/site/kit";

const STREAMS = [
  { icon: Coins, t: "The advance fee", b: "Every advance pays a flat 2%. Savers get 90% of it; Advance keeps 10%. This split is already in the deployed contract.", s: "live" as const },
  { icon: Plugs, t: "Partner apps", b: "Payment apps, payroll tools and marketplaces add Advance for their users and share the fee. They bring borrowers at almost no cost.", s: "next" as const },
  { icon: Gauge, t: "Credit score access", b: "Every repayment builds a public credit record. Apps pay per lookup to check an address's score and its reasons.", s: "next" as const },
  { icon: Globe, t: "Any-chain deposit fee", b: "A small cut (about 0.1% to 0.2%) of savers' cross-chain deposits through Aurora.", s: "next" as const },
  { icon: Robot, t: "Agent credit", b: "AI agents are newer and riskier, so their advances can carry a higher fee once there's enough history.", s: "next" as const },
  { icon: Gift, t: "Gift card margin", b: "Brands sell gift cards below face value. Advance passes most of the discount to users and keeps a slice of each sale.", s: "next" as const },
  { icon: Bank, t: "Managing larger capital", b: "Once loss data builds up, investment funds can supply the Steady side and pay a management fee, like private credit funds.", s: "next" as const },
];

const SCALE: [string, string, string, string, string][] = [
  ["10,000", "$24M", "$480k", "$48k", "$96k"],
  ["100,000", "$240M", "$4.8M", "$480k", "$960k"],
  ["1,000,000", "$2.4B", "$48M", "$4.8M", "$9.6M"],
];

export default function Business() {
  return (
    <>
      <PageIntro
        title={<>How Advance makes <span className="text-terra"><Mark kind="highlight" tone="monad" delay={0.7}>money</Mark></span></>}
        sub="Advance takes a small share of a fee borrowers already pay. Savers carry the lending risk, so the company never lends its own money."
      />

      <Section title="The money from one advance">
        <Note dir="down-right" arrow="loop" className="right-[4%] top-4" tilt={-4}>this is how we eat</Note>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            ["Borrower takes", "$100", "border border-line bg-panel/80"],
            ["Flat fee (2%)", "$2.00", "border border-line bg-panel/80"],
            ["To savers (90%)", "$1.80", "bg-monad text-white"],
            ["To Advance (10%)", "$0.20", "bg-terra text-[#1a0d08]"],
          ].map(([k, v, cls], i) => (
            <Reveal key={k} i={i}><div className={`rounded-3xl p-5 ${cls}`}><div className="text-[13px] opacity-75">{k}</div><div className="num mt-1 font-mono text-3xl font-semibold">{v}</div></div></Reveal>
          ))}
        </div>
      </Section>

      <Section title="Seven ways it earns" sub="Live means it's in the product today; Next means it's designed and coming.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {STREAMS.map(({ icon: Icon, t, b, s }, i) => (
            <Reveal key={t} i={i % 3}>
              <div className="h-full rounded-3xl border border-line bg-panel/80 p-6">
                <div className="flex items-start justify-between"><Icon className="size-8 text-monad-hi" weight="duotone" /><Status s={s} /></div>
                <h3 className="mt-4 font-semibold">{t}</h3>
                <p className="mt-2 text-[14.5px] text-muted">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Scratch cards pay for themselves" sub="Borrowers who repay fast win part of their fee back. That costs the pool a little per advance, and earns it more per month.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[
            { t: "Repaid in 30 days", cls: "border border-line bg-panel/80", rows: [["Fee on $100", "$2.00"], ["Average card (8.7% of fee)", "−$0.17"], ["Kept per advance", "$1.83"], ["Advances per month", "1"], ["Savers earn per month", "$1.64"]] },
            { t: "Repaid in 7 days", cls: "bg-monad text-white", rows: [["Fee on $100", "$2.00"], ["Average card (34.8% of fee)", "−$0.70"], ["Kept per advance", "$1.30"], ["Advances per month", "about 4"], ["Savers earn per month", "$4.69"]] },
          ].map((c, i) => (
            <Reveal key={c.t} i={i}>
              <div className={`h-full rounded-3xl p-6 ${c.cls}`}>
                <div className="flex items-center gap-2 font-semibold"><Ticket weight="duotone" className={`size-5 ${i ? "" : "text-terra"}`} />{c.t}</div>
                <dl className="mt-4 space-y-2 text-[14.5px]">
                  {c.rows.map(([k, v], j) => (
                    <div key={k} className={`flex justify-between ${j === c.rows.length - 1 ? "border-t pt-2 font-semibold " + (i ? "border-white/25" : "border-line") : ""}`}>
                      <dt className={j === c.rows.length - 1 ? "" : i ? "opacity-80" : "text-muted"}>{k}</dt><dd className="num font-mono">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-[14px] text-muted">Same $100 of savers&apos; money, one month. The card is a rebate split 90/10 between savers and Advance, exactly like the fee.</p>
      </Section>

      <Section title="Why it's a good business">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            ["No lending risk on our books", "Missed repayments come out of the savers' pool (Boost first), so Advance's share is close to pure margin."],
            ["Tiny cost per borrower", "A split costs under a cent on Monad, payer checks are cached, and there's no collections team."],
            ["Money that turns over", "An advance repays in about 3 to 4 weeks, so the same dollar earns fees about 12 times a year."],
          ].map(([t, b], i) => (
            <Reveal key={t} i={i}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><h3 className="font-semibold">{t}</h3><p className="mt-2 text-[14.5px] text-muted">{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <Section title="What it adds up to" sub="An illustration, not a forecast: a typical borrower takes $200 a month.">
        <Reveal>
          <div className="overflow-x-auto rounded-3xl border border-line bg-panel/80">
            <table className="w-full min-w-[600px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-line text-muted">
                  <th className="p-4 font-medium">Borrowers</th><th className="p-4 font-medium">Advanced a year</th><th className="p-4 font-medium">Fees (2%)</th><th className="p-4 font-medium">Advance at 10%</th><th className="p-4 font-medium text-terra">At 20%</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {SCALE.map((r) => (
                  <tr key={r[0]} className="border-b border-line/60 last:border-0">{r.map((c, i) => <td key={i} className={`p-4 ${i === 4 ? "text-terra" : ""}`}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <p className="mt-4 text-[14.5px] text-muted">Honestly: the fee share alone matters only at scale. That's why partner apps (cheap borrowers) and score access (a second product) are central to the plan.</p>
      </Section>

      <Section title="How it grows">
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {["Freelancers already paid in stablecoins", "Payment apps on Monad embed Advance", "Larger limits as repayment data builds", "Investment funds supply the Steady side", "AI agents as they earn onchain"].map((t, i) => (
            <Reveal key={t} i={i}>
              <li className={`h-full list-none rounded-3xl p-5 ${i === 0 ? "bg-terra text-[#1a0d08]" : "border border-line bg-panel/80"}`}>
                <div className={`font-mono text-[13px] ${i === 0 ? "opacity-70" : "text-muted"}`}>{i === 0 ? "Start" : i === 4 ? "Later" : "Then"}</div>
                <div className="mt-1 font-medium">{t}</div>
              </li>
            </Reveal>
          ))}
        </ol>
      </Section>

      <NextPage href="/faq" title="Questions?" sub="Plain answers, including the tough ones." />
    </>
  );
}
