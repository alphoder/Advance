"use client";

import Link from "next/link";
import { UserFocus, XCircle, Warning, LockKey, TestTube, ShieldCheck, ArrowRight, Fingerprint, IdentificationBadge, Scales, Key } from "@phosphor-icons/react";
import { PageIntro, Section, Reveal, NextPage, CtaLink, Status } from "@/components/site/kit";

const TESTS: { t: string; b: string; s: "live" | "partial" | "next" }[] = [
  { t: "Every payment splits exactly", b: "A randomized test runs 1,000 payments of random sizes and repayment shares. Repayment + payout always equals the payment, and the account always ends empty.", s: "live" },
  { t: "Losses hit Boost before Steady", b: "Tests write off a loss smaller than Boost (Steady untouched) and one larger than Boost (only the excess reaches Steady).", s: "live" },
  { t: "Signed payments can't be abused", b: "Replaying a signature, changing its amount, or submitting it from the wrong contract are all rejected.", s: "live" },
  { t: "Limits can't be exceeded", b: "Borrowing over the limit, setting limits without permission, and lending past 90% of the pool all fail.", s: "live" },
  { t: "Agents and Chainlink reports", b: "Only an agent's real owner can link it; only the Chainlink forwarder can submit score reports.", s: "live" },
  { t: "Document encryption", b: "A self-check proves the owner and the chosen lender can open a file, a stranger can't, and no plain text leaks into what's stored.", s: "live" },
  { t: "Rehearsed on a copy of Monad testnet", b: "Full deployment, the Kuru market, ERC-8004 agent registration, buying and selling, run against the real deployed Kuru and registry contracts.", s: "live" },
  { t: "Every screen clicked through", b: "Sign-up, advance, client payment and split, savings deposit, encrypted sharing and agents tested end to end in a browser.", s: "live" },
  { t: "Independent security audit", b: "Required before any meaningful amount of real money.", s: "next" },
];

const KYC: { lvl: string; limit: string; ask: string; stops: string; s: "live" | "next" }[] = [
  { lvl: "1 to 2", limit: "$50 to $200", ask: "Your passkey and onchain income. Every address checked against sanctions lists.", stops: "Sanctioned users. Amounts too small to be worth faking.", s: "live" },
  { lvl: "3", limit: "$1,000", ask: "Proof you're one unique person (World ID, zkPassport or Self). No name or document stored.", stops: "One person running many accounts; family and friend rings.", s: "next" },
  { lvl: "4", limit: "$5,000+", ask: "Full KYC through a licensed partner, plus verified income (employer, payroll, or a bank or Upwork proof).", stops: "Fake income; lets a big default be pursued legally.", s: "next" },
  { lvl: "Via partners", limit: "Any", ask: "Users verified by a partner payment or payroll app arrive pre-checked.", stops: "All of the above, with no extra steps.", s: "next" },
];

export default function Safety() {
  return (
    <>
      <PageIntro
        title={<>Security, <span className="text-terra">tested</span> and honest</>}
        sub="How Advance protects borrowers, savers and the system: what we've tested, how fraud is stopped, how identity grows with your limit, and the risks we haven't solved."
      >
        <CtaLink href="/stress-tests">See every attack we tested</CtaLink>
        <CtaLink href="/check" variant="secondary">Try the fraud check</CtaLink>
      </PageIntro>

      <Section title="What we've tested" sub="Each of these runs in the project today. The code is public on GitHub.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {TESTS.map((t, i) => (
            <Reveal key={t.t} i={i % 3}>
              <div className="h-full rounded-3xl border border-line bg-panel/80 p-6">
                <div className="flex items-start justify-between gap-3"><TestTube className="size-7 text-monad-hi" weight="duotone" /><Status s={t.s} /></div>
                <h3 className="mt-3 font-semibold">{t.t}</h3>
                <p className="mt-2 text-[14.5px] text-muted">{t.b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Catching fake income" sub="The obvious trick: pay yourself from a second account and pretend it's a client.">
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
                <li className="flex gap-2.5"><XCircle className="mt-0.5 size-5 shrink-0 text-danger" weight="fill" />Payer A was funded by Sam&apos;s own account before it &quot;paid&quot; him</li>
                <li className="flex gap-2.5"><XCircle className="mt-0.5 size-5 shrink-0 text-danger" weight="fill" />Payer B was funded by Sam&apos;s own account before it &quot;paid&quot; him</li>
                <li className="flex gap-2.5"><Warning className="mt-0.5 size-5 shrink-0 text-terra" weight="fill" />2 payers have almost no payment history of their own</li>
              </ul>
            </div>
          </Reveal>
        </div>
        <Link href="/stress-tests" className="mt-4 flex items-center justify-between gap-4 rounded-3xl border border-line bg-panel/80 p-5 transition-colors hover:border-line-strong">
          <span><b>Friends, family rings, exchange loops, new accounts, bust-outs, job loss…</b> <span className="text-muted">See all 13 scenarios and what stops each.</span></span>
          <ArrowRight className="size-5 shrink-0 text-terra" />
        </Link>
      </Section>

      <Section title="Identity that grows with your limit" sub="Asking for a passport to borrow $50 would shut out the people Advance is for. So checks grow as limits grow.">
        <Reveal>
          <div className="overflow-x-auto rounded-3xl border border-line bg-panel/80">
            <table className="w-full min-w-[760px] text-left text-[14.5px]">
              <thead><tr className="border-b border-line text-muted"><th className="p-4 font-medium">Level</th><th className="p-4 font-medium">Limit</th><th className="p-4 font-medium">What we ask for</th><th className="p-4 font-medium">What it stops</th><th className="p-4 font-medium">Status</th></tr></thead>
              <tbody>
                {KYC.map((k) => (
                  <tr key={k.lvl} className="border-b border-line/60 align-top last:border-0">
                    <td className="p-4 font-medium">{k.lvl}</td><td className="p-4 font-mono">{k.limit}</td><td className="p-4">{k.ask}</td><td className="p-4 text-muted">{k.stops}</td><td className="p-4"><Status s={k.s} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <Reveal><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><IdentificationBadge className="size-7 text-terra" weight="duotone" /><h3 className="mt-3 font-semibold">Private by design</h3><p className="mt-2 text-[14.5px] text-muted">Personal data never touches the blockchain. A licensed partner checks you; only a stamp goes onchain (&quot;passed KYC&quot;, &quot;unique human&quot;, &quot;not sanctioned&quot;).</p></div></Reveal>
          <Reveal i={1}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><Scales className="size-7 text-terra" weight="duotone" /><h3 className="mt-3 font-semibold">Regulation</h3><p className="mt-2 text-[14.5px] text-muted">Lending above small amounts needs a licensed partner in each country, the same route Credit Coop and 3Jane use today.</p></div></Reveal>
        </div>
      </Section>

      <Section title="How the system itself is protected">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: ShieldCheck, t: "Advance never holds your money", b: "Your Advance address splits each payment in the same transaction and keeps nothing." },
            { icon: Key, t: "A stolen key is capped", b: "Limits are capped by level inside the contract; the scorer can be paused instantly." },
            { icon: Fingerprint, t: "No passwords to steal", b: "Accounts are passkeys. Nothing to phish, no seed phrase to lose." },
            { icon: LockKey, t: "Documents stay encrypted", b: "Encrypted on your device; only you and a lender you choose can open them. Not even Advance." },
          ].map(({ icon: Icon, t, b }, i) => (
            <Reveal key={t} i={i}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><Icon className="size-7 text-monad-hi" weight="duotone" /><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-2 text-[14.5px] text-muted">{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <Section title="What we haven't solved yet">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {[
            ["Redirected income", "A borrower can ask clients to pay a different address. Small limits and public defaults keep it small; partner apps that route payments are the long-term fix."],
            ["Collusion between real people", "No lender can read intent. A friend with a real salary can prop someone up for $50. Circles (friends guaranteeing each other) are the next defence."],
            ["Not yet audited", "The contracts are tested but not externally audited. That comes before real money at scale."],
          ].map(([t, b], i) => (
            <Reveal key={t} i={i}><div className="h-full rounded-3xl border border-terra/30 bg-terra-soft p-6"><Warning className="size-7 text-terra" weight="duotone" /><h3 className="mt-3 font-semibold">{t}</h3><p className="mt-2 text-[14.5px] text-muted">{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <NextPage href="/stress-tests" title="We tried to break it" sub="Every attack scenario, and what stops each one." />
    </>
  );
}
