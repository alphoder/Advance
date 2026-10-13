"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Ticket, Lightning, LockSimple, ShieldCheck, Coins, Star, Crown, CheckCircle, CreditCard } from "@phosphor-icons/react";
import { Mark, Note } from "@/components/site/doodles";
import { PageIntro, Section, Reveal, NextPage, CtaLink, QA, Status } from "@/components/site/kit";
import { AdvanceCard, GiftCard, CouponCard, BRANDS, COUPONS } from "@/components/rewards";
import { Scratch } from "@/components/trust-cards";
import { TIERS, EARN } from "@/lib/rewards-data";
import { fmtUsd } from "@/components/ui";

const SPEED = [
  { d: 7, m: 1 },
  { d: 14, m: 0.75 },
  { d: 21, m: 0.5 },
  { d: 30, m: 0.25 },
];
// luck table onchain: 45% -> 20%, 30% -> 35%, 15% -> 50%, 8% -> 75%, 2% -> 90% of the fee. Expected 34.8%.
const LUCK = { min: 0.2, avg: 0.348, max: 0.9 };

export default function RewardsSite() {
  const [amount, setAmount] = useState(50);
  const [days, setDays] = useState(5);
  const fee = amount * 0.02;
  const speed = days <= 7 ? 1 : days <= 14 ? 0.75 : days <= 21 ? 0.5 : days <= 30 ? 0.25 : 0;
  const pts = (x: number) => Math.floor((fee * x * speed) / 0.01);
  const [scratched, setScratched] = useState(false);

  return (
    <>
      <PageIntro
        title={<>Repay early. <span className="text-terra"><Mark tone="monad" delay={0.7}>Get paid back.</Mark></span></>}
        sub="Every advance your clients repay wins a scratch card with trust points you can convert to MON. Plus the Advance card, gift cards for less, and coupons that unlock as you go."
      >
        <CtaLink href="/app/rewards">Open my rewards</CtaLink>
        <CtaLink href="#scratch" variant="secondary">How scratch cards work</CtaLink>
      </PageIntro>

      {/* scratch cards */}
      <Section id="scratch" title={<span className="flex flex-wrap items-center gap-3">Scratch cards and trust points <Status s="live" /></span>} sub="Built into the credit contract on Monad. The moment a client payment finishes repaying an advance, the contract draws your card.">
        <div className="relative grid grid-cols-1 items-center gap-6 lg:grid-cols-12">
          <Note dir="down-right" arrow="loop" className="-top-16 left-[8%]" tilt={-4}>go on, scratch it</Note>
          <Reveal className="lg:col-span-4">
            <div className="mx-auto w-full max-w-[260px]">
              <Scratch onDone={() => setScratched(true)}>
                <div className="relative grid aspect-[3/4] w-full place-items-center overflow-hidden rounded-2xl bg-[radial-gradient(120%_100%_at_30%_0%,#ffb4a3,#e2725b_55%,#b4452e)] p-4 text-center text-[#1a0d08] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]">
                  <div>
                    <div className="mx-auto w-fit rounded-full bg-[#1a0d08]/15 px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider">Example card</div>
                    <div className="num mt-2 font-mono text-5xl font-bold">50</div>
                    <div className="text-[13px] opacity-80">trust points</div>
                    <div className="mt-3 text-[11.5px] opacity-75">$50 advance · $1 fee<br />Luck 50% · repaid in 4 days</div>
                  </div>
                </div>
              </Scratch>
              <p className="mt-3 text-center text-[13px] text-muted">{scratched ? "Worth $0.50 in MON. Less than the $1 fee, always." : "Drag across the card to scratch."}</p>
            </div>
          </Reveal>
          <div className="grid gap-3 lg:col-span-8">
            {[
              { icon: Lightning, t: "Faster repayment, bigger card", b: "The prize is multiplied by how fast the advance was repaid: 100% within 7 days, 75% within 14, 50% within 21, 25% within 30." },
              { icon: Ticket, t: "Every card is different", b: "Each card holds 20% to 90% of the fee you paid, drawn by the contract at the moment of repayment. Most cards are 20% or 35%; 1 in 50 is the 90% lucky card." },
              { icon: ShieldCheck, t: "Always less than the fee", b: "Even the luckiest card, repaid in a day, is worth less than the fee. So borrowing just to win cards always loses money. We fuzz-tested this 1,000 times." },
              { icon: LockSimple, t: "Locked to you", b: "Only client payments win cards, not paying yourself back. Points can't be sent to anyone, and are lost if an advance is ever missed." },
            ].map(({ icon: Icon, t, b }, i) => (
              <Reveal key={t} i={i}>
                <div className="flex gap-4 rounded-3xl border border-line bg-panel/80 p-5">
                  <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${i % 2 ? "bg-monad text-white" : "bg-terra text-[#1a0d08]"}`}><Icon className="size-5" weight="bold" /></div>
                  <div><h3 className="font-semibold">{t}</h3><p className="mt-1 text-[14.5px] text-muted">{b}</p></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {/* calculator */}
      <Section title="What would my card be worth?" sub="Move the sliders. These are the exact rules the contract uses.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-3xl border border-line bg-panel/80 p-6 sm:p-7 lg:col-span-7">
            <div className="flex items-baseline justify-between"><span className="text-[14px] text-muted">Advance</span><span className="num font-mono text-2xl font-semibold">{fmtUsd(amount)}</span></div>
            <input type="range" min={10} max={5000} step={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Advance amount" className="mt-2 w-full accent-[var(--terra)]" />
            <div className="mt-6 flex items-baseline justify-between"><span className="text-[14px] text-muted">Repaid by clients after</span><span className="num font-mono text-2xl font-semibold">{days} day{days === 1 ? "" : "s"}</span></div>
            <input type="range" min={1} max={30} value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="Days to repay" className="mt-2 w-full accent-[var(--monad)]" />
            <div className="mt-6 grid grid-cols-4 gap-2">
              {SPEED.map((s, i) => {
                const on = speed === s.m;
                return (
                  <div key={s.d} className={`rounded-2xl p-3 text-center transition-colors ${on ? "bg-terra text-[#1a0d08]" : "bg-white/[0.04]"}`}>
                    <div className={`text-[11.5px] ${on ? "opacity-75" : "text-muted"}`}>{i === 0 ? "≤ 7 days" : `≤ ${s.d} days`}</div>
                    <div className="num font-mono text-lg font-semibold">{s.m * 100}%</div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col rounded-3xl bg-monad p-6 text-white sm:p-7 lg:col-span-5">
            <div className="text-[14px] opacity-85">Your fee</div>
            <div className="num font-mono text-3xl font-semibold">{fmtUsd(fee)}</div>
            <div className="mt-5 text-[14px] opacity-85">Your card, on average</div>
            <motion.div key={`${amount}-${days}`} initial={{ opacity: 0.4, y: 4 }} animate={{ opacity: 1, y: 0 }} className="num font-mono text-5xl font-semibold">{pts(LUCK.avg).toLocaleString()} <span className="text-xl font-normal opacity-80">pts</span></motion.div>
            <div className="mt-1 text-[14px] opacity-85">Between {pts(LUCK.min).toLocaleString()} and {pts(LUCK.max).toLocaleString()} points (${(pts(LUCK.min) / 100).toFixed(2)} to ${(pts(LUCK.max) / 100).toFixed(2)} in MON)</div>
            <div className="mt-auto rounded-2xl bg-black/15 p-4 pt-4 text-[13.5px]">
              The best possible card here is {fmtUsd(pts(LUCK.max) / 100)}, less than your {fmtUsd(fee)} fee. It&apos;s cashback for paying fast, never a profit.
            </div>
          </div>
        </div>
      </Section>

      {/* the card */}
      <Section title="The Advance card" sub="A credit card on your Advance limit. It spends what you can borrow, and it's repaid the same way: from 20% of each client payment.">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
          <Reveal><div className="mx-auto max-w-[460px]"><AdvanceCard name="YOUR NAME" /></div></Reveal>
          <div className="grid gap-3">
            {[
              [CreditCard, "Credit, with your limit on it", "Starts at $50 and rises to $200, $1,000 and $5,000 as you repay in full."],
              [LockSimple, "Switches on after your income check", "No verified income, no card. It stays greyed out until a limit is set onchain."],
              [Star, "2 points for every $1", "Card spending earns rewards points for gift cards and better tiers."],
            ].map(([Icon, t, b], i) => {
              const I = Icon as typeof Star;
              return (
                <Reveal key={t as string} i={i}>
                  <div className="flex gap-4 rounded-3xl border border-line bg-panel/80 p-5">
                    <I className="mt-0.5 size-6 shrink-0 text-terra" weight="duotone" />
                    <div><h3 className="font-semibold">{t as string}</h3><p className="mt-1 text-[14.5px] text-muted">{b as string}</p></div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </Section>

      {/* gift cards */}
      <Section title="Gift cards for less" sub="Buy gift cards below face value with your advance or your points. Delivered instantly with a code and PIN.">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {BRANDS.map((b, i) => (
            <Reveal key={b.id} i={i % 4}>
              <GiftCard b={b} />
              <div className="mt-2 flex items-center justify-between px-0.5 text-[13px]"><span className="text-muted">{b.cat}</span><span className="rounded-full bg-terra/15 px-2 py-0.5 font-medium text-terra">Save {b.off}%</span></div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* coupons */}
      <Section title="Coupons that unlock as you repay" sub="New ones every month for borrowers who repay on time.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {COUPONS.slice(0, 4).map((c) => <CouponCard key={c.id} c={c} />)}
        </div>
      </Section>

      {/* tiers */}
      <Section title="Levels that pay you back" sub="Rewards points come from repaying, using your card and buying gift cards. 100 points = $1 in gift cards.">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TIERS.map((t, i) => (
            <Reveal key={t.name} i={i}>
              <div className={`h-full rounded-3xl p-5 ${i === 2 ? "bg-monad text-white" : "border border-line bg-panel/80"}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">{i === 3 ? <Crown weight="fill" className="size-4 text-terra" /> : <Star weight="fill" className={`size-4 ${i === 2 ? "" : "text-terra"}`} />}{t.name}</span>
                  <span className={`font-mono text-[12px] ${i === 2 ? "opacity-80" : "text-faint"}`}>{t.at.toLocaleString()} pts</span>
                </div>
                <ul className={`mt-3 space-y-1.5 text-[13.5px] ${i === 2 ? "opacity-90" : "text-muted"}`}>
                  {t.perks.map((p) => <li key={p} className="flex gap-1.5"><CheckCircle weight="fill" className={`mt-0.5 size-3.5 shrink-0 ${i === 2 ? "" : "text-terra"}`} />{p}</li>)}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-4 rounded-3xl border border-line bg-panel/80 p-6">
          <div className="flex items-center gap-2 text-[14px] font-semibold"><Coins className="size-5 text-terra" weight="duotone" /> How to earn rewards points</div>
          <ul className="mt-3 grid grid-cols-1 gap-x-8 divide-y divide-white/[0.06] text-[14px] sm:grid-cols-2 sm:divide-y-0">
            {EARN.map((e) => <li key={e.t} className="flex justify-between gap-3 py-2"><span className="text-muted">{e.t}</span><span className="shrink-0 font-mono">+{e.pts}</span></li>)}
          </ul>
          <p className="mt-3 text-[13px] text-faint">Rewards never change your credit limit. Only repaying does.</p>
        </div>
      </Section>

      <Section title="Questions about rewards">
        <div className="grid gap-3">
          <QA q="What's the difference between trust points and rewards points?">Trust points are recorded onchain by the credit contract when clients repay an advance, and will convert to MON 30 days after each card (the conversion step is the next thing we ship). Rewards points are for gift cards, coupons and tiers inside the app.</QA>
          <QA q="Couldn't someone borrow and repay over and over to farm cards?">They'd lose money every time. The best card is 90% of the fee, so each loop costs at least 10% of the fee, and paying yourself back wins nothing at all. The contract enforces this, and a fuzz test checks it across 1,000 random draws and timings.</QA>
          <QA q="Who pays for trust points?">They&apos;re a rebate on the fee you already paid, shared by savers and the protocol the same way the fee is split (90/10). Nobody prints tokens. It pays for itself: an advance repaid in a week frees the same dollars to fund about four more advances that month, so savers still earn more over a year than with slow repayment.</QA>
          <QA q="What happens to my points if I miss an advance?">Unclaimed trust points are lost, recorded publicly with the missed advance. That&apos;s part of what makes them worth something: they only exist for people who repay.</QA>
          <QA q="Why doesn't the card show a price in MON?">Points are a number that doesn&apos;t move with the market. You see &quot;+50 trust points&quot;, and the MON amount is worked out when you convert.</QA>
        </div>
      </Section>

      <NextPage href="/app/rewards" title="See your rewards" sub="Your card, your points, your scratch cards and every gift card." />
    </>
  );
}
