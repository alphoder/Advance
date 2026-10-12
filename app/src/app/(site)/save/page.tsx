"use client";

import { useState } from "react";
import { Mark, Note, Sparkle } from "@/components/site/doodles";
import { motion } from "motion/react";
import { ShieldCheck, Rocket, Coins, Globe, ChartLineUp } from "@phosphor-icons/react";
import { PageIntro, Section, Reveal, NextPage, CtaLink, QA } from "@/components/site/kit";
import { fmtUsd } from "@/components/ui";

const STEADY = 8000;
const BOOST = 2000;

export default function Save() {
  const [loss, setLoss] = useState(0);
  const boostLeft = Math.max(0, BOOST - loss);
  const steadyLeft = STEADY - Math.max(0, loss - BOOST);
  return (
    <>
      <PageIntro
        title={<>Earn from <span className="text-monad-hi"><Mark delay={0.7}>real</Mark></span> borrower fees</>}
        sub="Your dollars fund advances. Every advance pays a flat 2% fee, and 90% of it goes to savers. Choose how much risk you want."
      >
        <CtaLink href="/app/earn" variant="monad">Open savings pools</CtaLink>
        <CtaLink href="#protection" variant="secondary">How my money is protected</CtaLink>
      </PageIntro>

      <Section title="Two ways to save" sub="Same pool of advances, two levels of risk.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-3xl bg-terra p-7 text-[#1a0d08]">
              <ShieldCheck className="size-9" weight="duotone" />
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">Steady</h3>
              <p className="mt-2 text-[15px] opacity-80">Lower return, protected first. If a borrower never repays, Boost savers absorb that loss before Steady loses anything.</p>
              <div className="mt-6 rounded-2xl bg-black/15 p-4 text-[14px]">Good for: dollars you want to keep safe while earning something.</div>
            </div>
          </Reveal>
          <Reveal i={1}>
            <div className="h-full rounded-3xl bg-monad p-7 text-white">
              <Rocket className="size-9" weight="duotone" />
              <h3 className="mt-4 text-3xl font-semibold tracking-tight">Boost</h3>
              <p className="mt-2 text-[15px] opacity-85">Higher return. You take missed repayments first, and in exchange you earn a bigger share of every fee.</p>
              <div className="mt-6 rounded-2xl bg-black/15 p-4 text-[14px]">Good for: savers who understand credit risk and want more yield.</div>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section id="protection" title="What happens if borrowers don't repay?" sub="Drag the slider to imagine missed repayments in a $10,000 pool. Watch who absorbs the loss.">
        <div className="relative rounded-3xl border border-line bg-panel/80 p-6 sm:p-8">
          <Note dir="down-left" arrow="zigzag" className="-top-20 right-[22%]" tilt={4}>drag it and watch Steady stay safe</Note>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="text-[14px] text-muted">Missed repayments</div>
            <div className="num font-mono text-4xl font-semibold text-danger">{fmtUsd(loss)}</div>
          </div>
          <input type="range" min={0} max={4000} step={50} value={loss} onChange={(e) => setLoss(Number(e.target.value))} aria-label="Missed repayments" className="mt-4 w-full accent-[var(--danger)]" />
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            {[
              { name: "Boost (absorbs first)", left: boostLeft, total: BOOST, cls: "bg-monad" },
              { name: "Steady (protected)", left: steadyLeft, total: STEADY, cls: "bg-terra" },
            ].map((t) => (
              <div key={t.name}>
                <div className="flex justify-between text-[14px]"><span>{t.name}</span><span className="font-mono">{fmtUsd(t.left)} of {fmtUsd(t.total)}</span></div>
                <div className="mt-2 h-4 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div animate={{ scaleX: t.left / t.total }} style={{ transformOrigin: "left" }} transition={{ type: "spring", duration: 0.45, bounce: 0 }} className={`h-full rounded-full ${t.cls}`} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-[15px] text-muted">
            {loss === 0 ? "No losses: both tranches keep everything and earn fees."
              : loss <= BOOST ? `Boost absorbs all ${fmtUsd(loss)}. Steady savers lose nothing.`
              : `Boost is used up. Only the extra ${fmtUsd(loss - BOOST)} reaches Steady.`}
            {" "}In practice, limits start at $50, so a single missed repayment is small.
          </p>
        </div>
      </Section>

      <Section title="Where your return comes from" sub="Not token rewards. Real fees paid by borrowers.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          {[
            ["A borrower takes", "$50"],
            ["They pay a flat fee", "$1.00"],
            ["Savers receive 90%", "$0.90"],
            ["Protocol keeps 10%", "$0.10"],
          ].map(([k, v], i) => (
            <Reveal key={k} i={i}><div className={`rounded-3xl p-5 ${i === 2 ? "bg-monad text-white" : "border border-line bg-panel/80"}`}><div className={`text-[13px] ${i === 2 ? "opacity-80" : "text-muted"}`}>{k}</div><div className="num mt-1 font-mono text-3xl font-semibold">{v}</div></div></Reveal>
          ))}
        </div>
        <p className="mt-4 text-[14px] text-muted">An advance usually repays in 3 to 4 weeks, so the same dollar can be lent out again and again.</p>
      </Section>

      <Section title="More ways in and out">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { icon: Globe, t: "Deposit from any chain", b: "Have USDC on Base, Arbitrum or Solana? Send it through Aurora Intents and it arrives as dollars on Monad." },
            { icon: ChartLineUp, t: "Sell any time on Kuru", b: "Boost shares are a token. Sell them to another saver on the Kuru order book instead of waiting." },
            { icon: Coins, t: "See everything live", b: "Pool size, money lent out, fees earned and missed repayments update with every Monad block." },
          ].map(({ icon: Icon, t, b }, i) => (
            <Reveal key={t} i={i}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><Icon className="size-8 text-monad-hi" weight="duotone" /><h3 className="mt-4 font-semibold">{t}</h3><p className="mt-2 text-[15px] text-muted">{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <Section title="Questions savers ask">
        <div className="grid gap-3">
          <QA q="Can I withdraw whenever I want?">Yes, as long as the cash isn't lent out at that moment. At most 90% of the pool is ever lent, and Boost holders can also sell on Kuru any time.</QA>
          <QA q="What is the expected return?">It depends on how much of the pool is lent and how fast advances repay. The 2% fee per 3 to 4 week cycle is roughly 25% to 35% a year on lent money, before losses.</QA>
          <QA q="Who decides who gets an advance?">An open scoring model that reads onchain income and checks payers. Chainlink nodes agree on each limit before it's written onchain.</QA>
        </div>
      </Section>

      <NextPage href="/agents" title="Credit for AI agents" sub="The same product, for software that earns money." />
    </>
  );
}
