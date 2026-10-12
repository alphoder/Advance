"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { PaintBrush, Storefront, VideoCamera, Bicycle, Fingerprint, Wallet, CheckCircle } from "@phosphor-icons/react";
import { PageIntro, Section, Reveal, NextPage, CtaLink, QA } from "@/components/site/kit";
import { fmtUsd } from "@/components/ui";

const PEOPLE = [
  { icon: PaintBrush, who: "Priya, freelance designer", where: "Indore", story: "US clients pay her 30 to 60 days after she delivers. Rent is due on the 1st.", fix: "Takes $50 today. Her next client payment repays it." },
  { icon: Storefront, who: "Tunde, online seller", where: "Lagos", story: "Needs stock before a holiday sale. The bank wants collateral he doesn't have.", fix: "His shop's payment link is his Advance address. Sales repay the stock advance." },
  { icon: VideoCamera, who: "Maya, creator", where: "Manila", story: "Brand deals pay in 45 days, but her video editor needs paying every week.", fix: "An advance covers the editor; brand payments repay it." },
  { icon: Bicycle, who: "Carlos, delivery rider", where: "São Paulo", story: "Paid weekly in stablecoins. One emergency breaks the month.", fix: "A $50 advance costs $1, instead of $7.50 from a payday lender." },
];

export default function Borrow() {
  const [amount, setAmount] = useState(50);
  const rows = [
    { name: "Advance", cost: amount * 0.02, note: "Flat 2%. No interest, no late fees.", us: true },
    { name: "Merchant cash advance", cost: amount * 0.07, note: "Typical factor cost; 30% to 100%+ a year." },
    { name: "Payday loan", cost: amount * 0.15, note: "$15 per $100 for two weeks (CFPB)." },
  ];
  const max = amount * 0.15;
  return (
    <>
      <PageIntro
        title={<>Get paid <span className="text-terra">today</span>, not in 45 days</>}
        sub="Advance is for people who earn real money but wait too long to receive it: freelancers, online sellers, creators and gig workers."
      >
        <CtaLink href="/app?demo=1">Try it as Priya</CtaLink>
        <CtaLink href="/check" variant="secondary">See what I could get</CtaLink>
      </PageIntro>

      <Section title="Built for people like this">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PEOPLE.map(({ icon: Icon, who, where, story, fix }, i) => (
            <Reveal key={who} i={i}>
              <div className="h-full rounded-3xl border border-line bg-panel/80 p-6">
                <div className="flex items-center gap-3">
                  <div className={`grid size-11 place-items-center rounded-2xl ${i % 2 ? "bg-monad text-white" : "bg-terra text-[#1a0d08]"}`}><Icon className="size-6" weight="bold" /></div>
                  <div><div className="font-semibold">{who}</div><div className="text-[13px] text-muted">{where}</div></div>
                </div>
                <p className="mt-4 text-[15px] text-muted">{story}</p>
                <p className="mt-3 flex gap-2 text-[15px]"><CheckCircle className="mt-0.5 size-5 shrink-0 text-terra" weight="fill" />{fix}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="What it costs" sub="Move the slider. The fee is always 2% of what you take, shown in dollars before you agree.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-3xl bg-terra p-7 text-[#1a0d08] lg:col-span-5">
            <div className="text-[14px] font-medium opacity-70">You take</div>
            <div className="num mt-1 font-mono text-6xl font-semibold">{fmtUsd(amount)}</div>
            <input type="range" min={10} max={1000} step={10} value={amount} onChange={(e) => setAmount(Number(e.target.value))} aria-label="Advance amount" className="mt-5 w-full accent-[#1a0d08]" />
            <div className="mt-6 space-y-2 text-[15px]">
              <div className="flex justify-between"><span className="opacity-75">Fee</span><span className="font-mono">{fmtUsd(amount * 0.02)}</span></div>
              <div className="flex justify-between border-t border-[#1a0d08]/20 pt-2 font-semibold"><span>You pay back</span><span className="font-mono">{fmtUsd(amount * 1.02)}</span></div>
              <div className="flex justify-between"><span className="opacity-75">Interest, late fees</span><span>None</span></div>
            </div>
          </div>
          <div className="rounded-3xl border border-line bg-panel/80 p-7 lg:col-span-7">
            <div className="text-[14px] font-medium text-muted">The same amount for two weeks elsewhere</div>
            <div className="mt-5 space-y-6">
              {rows.map((r) => (
                <div key={r.name}>
                  <div className="flex items-baseline justify-between">
                    <span className={r.us ? "font-semibold text-terra" : ""}>{r.name}</span>
                    <span className={`num font-mono text-2xl ${r.us ? "text-terra" : ""}`}>{fmtUsd(r.cost)}</span>
                  </div>
                  <motion.div animate={{ width: `${Math.max(2, (r.cost / max) * 100)}%` }} transition={{ type: "spring", duration: 0.5, bounce: 0 }} className={`mt-2 h-2.5 rounded-full ${r.us ? "bg-terra" : "bg-white/15"}`} />
                  <div className="mt-1.5 text-[13px] text-muted">{r.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      <Section title="What you need" sub="Two things. That's it.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Reveal><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><Fingerprint className="size-8 text-terra" weight="duotone" /><h3 className="mt-4 text-lg font-semibold">A phone or laptop with Face ID or a fingerprint</h3><p className="mt-2 text-[15px] text-muted">That becomes your account. No wallet app, no seed phrase, no password.</p></div></Reveal>
          <Reveal i={1}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><Wallet className="size-8 text-monad-hi" weight="duotone" /><h3 className="mt-4 text-lg font-semibold">Income paid in dollars on Monad</h3><p className="mt-2 text-[15px] text-muted">Clients pay you in AUSD, a US dollar stablecoin. Share your Advance link and new payments count right away.</p></div></Reveal>
        </div>
      </Section>

      <Section title="Your limit grows with you" sub="Everyone starts small. Each advance you repay in full unlocks the next level.">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[50, 200, 1000, 5000].map((cap, i) => (
            <Reveal key={cap} i={i}>
              <div className={`rounded-3xl p-6 ${i === 0 ? "bg-terra text-[#1a0d08]" : "border border-line bg-panel/80"}`}>
                <div className={`text-[13px] ${i === 0 ? "opacity-70" : "text-muted"}`}>Level {i + 1}</div>
                <div className="num mt-1 font-mono text-3xl font-semibold">{fmtUsd(cap)}</div>
                <div className={`mt-2 text-[13px] ${i === 0 ? "opacity-75" : "text-muted"}`}>{i === 0 ? "Where everyone starts" : `After ${i} full repayment${i > 1 ? "s" : ""}`}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Questions borrowers ask">
        <div className="grid gap-3">
          <QA q="What if my clients pay late?">Nothing bad happens. There's no interest and no late fee. The advance just stays open until payments arrive. After 30 days with nothing repaid, the advance is marked as missed onchain, which pauses new advances.</QA>
          <QA q="Can I repay early?">Yes. Tap "Repay early" in the app and pay from your balance any time.</QA>
          <QA q="Can I change how much each payment repays?">Yes, you can raise it above 20% to repay faster. It can never go below 20%.</QA>
          <QA q="Does Advance hold my money?">No. Your Advance address splits each payment in the same transaction and never keeps anything.</QA>
        </div>
      </Section>

      <NextPage href="/save" title="Have dollars? Fund advances" sub="How savers earn from borrower fees, and how their money is protected." />
    </>
  );
}
