"use client";

import Link from "next/link";
import { UserFocus, XCircle, ShieldCheck, LockKey, TestTube, Warning, ArrowRight } from "@phosphor-icons/react";
import { PageIntro, Section, Reveal, NextPage, CtaLink } from "@/components/site/kit";

export default function Safety() {
  return (
    <>
      <PageIntro
        title={<>Safe by <span className="text-terra">design</span>, honest about risks</>}
        sub="How Advance catches fake income, limits the damage when someone doesn't repay, and keeps your documents private."
      >
        <CtaLink href="/check">Test the fraud check</CtaLink>
      </PageIntro>

      <Section title="Catching fake income" sub="The obvious trick: pay yourself from a second account and pretend it's a client. Advance checks every payer.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <div className="h-full rounded-3xl border border-line bg-panel/80 p-6">
              <UserFocus className="size-9 text-danger" weight="duotone" />
              <h3 className="mt-4 text-xl font-semibold">Meet Sybil Sam</h3>
              <p className="mt-2 text-[15px] text-muted">Sam sends money to two brand-new accounts. Those accounts then &quot;pay&quot; Sam, so it looks like he has two clients.</p>
              <Link href="/check" className="mt-5 inline-flex items-center gap-1.5 text-[14px] text-terra">Check Sam&apos;s score yourself <ArrowRight className="size-4" /></Link>
            </div>
          </Reveal>
          <Reveal i={1} className="lg:col-span-7">
            <div className="h-full rounded-3xl border border-danger/30 bg-danger-soft p-6">
              <div className="text-[13px] font-medium text-danger">What Advance tells Sam</div>
              <div className="mt-2 text-2xl font-semibold">Not yet</div>
              <ul className="mt-4 space-y-2.5 text-[15px]">
                <li className="flex gap-2.5"><XCircle className="mt-0.5 size-5 shrink-0 text-danger" weight="fill" />Payer A was funded by Sam's own account before it &quot;paid&quot; him</li>
                <li className="flex gap-2.5"><XCircle className="mt-0.5 size-5 shrink-0 text-danger" weight="fill" />Payer B was funded by Sam's own account before it &quot;paid&quot; him</li>
                <li className="flex gap-2.5"><Warning className="mt-0.5 size-5 shrink-0 text-terra" weight="fill" />2 payers have almost no payment history of their own</li>
              </ul>
            </div>
          </Reveal>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["Different payers", "One big client is riskier than four steady ones."],
            ["Payers with a history", "Brand-new wallets that only ever paid you look suspicious."],
            ["Nansen checks", "Known entities and wallets linked to you are flagged using Nansen's onchain data."],
          ].map(([t, b], i) => (
            <Reveal key={t} i={i}><div className="h-full rounded-3xl border border-line bg-panel/80 p-5"><h3 className="font-semibold">{t}</h3><p className="mt-1.5 text-[14.5px] text-muted">{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <Section title="When someone doesn't repay">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["Small limits", "Everyone starts at $50. A single missed repayment can only cost the pool a little."],
            ["Public record", "After 30 days, a missed repayment is written onchain. Any app can see it, and new advances stop."],
            ["Boost absorbs first", "Losses come out of the Boost tranche before Steady savers lose anything."],
          ].map(([t, b], i) => (
            <Reveal key={t} i={i}><div className={`h-full rounded-3xl p-6 ${i === 2 ? "bg-monad text-white" : "border border-line bg-panel/80"}`}><ShieldCheck className="size-7" weight="duotone" /><h3 className="mt-3 font-semibold">{t}</h3><p className={`mt-1.5 text-[15px] ${i === 2 ? "opacity-85" : "text-muted"}`}>{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <Section title="Your documents stay private" sub="You can add invoices to strengthen your file. They're encrypted on your device with a key only your passkey can recreate.">
        <Reveal>
          <div className="flex flex-col gap-5 rounded-3xl border border-line bg-panel/80 p-6 sm:flex-row sm:items-center">
            <LockKey className="size-12 shrink-0 text-terra" weight="duotone" />
            <p className="text-[15px] text-muted">Advance stores only scrambled data on Monad. To show an invoice to a lender, you share it with that one lender, and only their passkey can unlock it. Not even Advance can read it.</p>
          </div>
        </Reveal>
      </Section>

      <Section title="Tested, and honest about what's left">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Reveal><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><TestTube className="size-8 text-monad-hi" weight="duotone" /><h3 className="mt-4 font-semibold">What we tested</h3><p className="mt-2 text-[15px] text-muted">A 1,000-run randomized test proves every payment splits exactly, with nothing lost or stuck. Losses always hit Boost before Steady. Signed payments can&apos;t be replayed or forged.</p></div></Reveal>
          <Reveal i={1}><div className="h-full rounded-3xl border border-terra/30 bg-terra-soft p-6"><Warning className="size-8 text-terra" weight="duotone" /><h3 className="mt-4 font-semibold">The honest risk</h3><p className="mt-2 text-[15px] text-muted">A borrower could ask clients to pay a different address after borrowing. That&apos;s why limits start small, grow slowly, and missed repayments are public. Long term, payment apps that build in Advance will route payments automatically.</p></div></Reveal>
        </div>
      </Section>

      <NextPage href="/technology" title="Under the hood" sub="Why this only works on Monad, and what it's built with." />
    </>
  );
}
