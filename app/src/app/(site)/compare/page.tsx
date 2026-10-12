"use client";

import { Check, X } from "@phosphor-icons/react";
import { PageIntro, Section, Reveal, NextPage, CtaLink } from "@/components/site/kit";

const CARD_ROWS: [string, string, string][] = [
  ["Who can get it", "Needs a credit history, a bank and the right country", "Anyone with income onchain, anywhere"],
  ["How you're judged", "Your past debts (credit bureau)", "The money coming in now, checked live"],
  ["Approval", "Days or weeks", "Seconds"],
  ["Repaying", "You must remember every month", "Automatic: 20% of every incoming payment"],
  ["Cost", "About 20% to 30% a year, compounding, plus late fees", "Flat 2%. Never grows, no late fees"],
  ["Debt trap", "Balance can keep growing for years", "Can't grow: fixed amount, at most half a month of income"],
  ["Who lends", "The bank, privately", "A savers' pool; every advance visible onchain"],
  ["Best for", "Spending at shops: rewards, purchase protection", "Getting your own income early"],
];

const OTHERS: { name: string; kind: string; does: string; diff: string }[] = [
  { name: "Stripe Capital, Shopify Capital", kind: "Traditional fintech", does: "Lend to merchants, take a % of each day's sales until repaid.", diff: "Same idea as Advance, but only for sellers inside their own platform, and businesses only." },
  { name: "Square Loans, PayPal Working Capital", kind: "Traditional fintech", does: "The same, for their own merchants.", diff: "Locked to one platform; not for freelancers or agents." },
  { name: "DailyPay, EarnIn, Payactiv", kind: "Earned wage access", does: "Let employees take part of their salary early.", diff: "Your employer has to sign up; mostly US; no freelancers or agents." },
  { name: "Credit Coop (Visa partnership)", kind: "Onchain, businesses", does: "Repayment-at-source smart contracts for card issuers and fintechs: $2.5B financed, zero defaults.", diff: "Businesses only, manual review, large tickets. Advance brings the same model to individuals and agents." },
  { name: "Huma Finance", kind: "Onchain, receivables", does: "Lending against receivables and payment flows.", diff: "The closest in crypto, but mostly funds institutions and fintechs rather than individual earners directly." },
  { name: "3Jane", kind: "Onchain, unsecured", does: "Unsecured credit lines onchain.", diff: "Underwrites on assets and offchain proofs; repayment isn't taken from income automatically." },
  { name: "Maple, Goldfinch, Wildcat, Clearpool", kind: "Onchain, institutional", does: "Undercollateralised loans to companies.", diff: "Large loans, repayment enforced offchain by legal agreements." },
  { name: "Spectral, Cred Protocol", kind: "Onchain credit scores", does: "Score wallets.", diff: "A score only: no lending, no repayment." },
];

const COMBO: [string, boolean[]][] = [
  ["For individuals and AI agents", [false, false, true]],
  ["Repays from every incoming payment, automatically", [true, true, true]],
  ["Works outside one platform", [false, true, true]],
  ["Small amounts from $50", [true, false, true]],
  ["Every decision explained", [false, false, true]],
  ["No wallet or seed phrase to start", [true, false, true]],
];

export default function Compare() {
  return (
    <>
      <PageIntro
        title={<>How Advance is <span className="text-terra">different</span></>}
        sub="The repayment idea is proven. What's new is who it's for and how it works."
      >
        <CtaLink href="/how-it-works">How Advance works</CtaLink>
      </PageIntro>

      <Section title="Why Advance is different, in five lines">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {[
            ["For people, not just businesses", "Stripe, Shopify and Credit Coop lend to companies. Advance lends to individual earners and AI agents."],
            ["Repaid from every payment", "Not a monthly bill you can forget: each incoming payment repays 20% automatically, in the same second."],
            ["Not locked to a platform", "Stripe Capital only works if you sell on Stripe. Advance works for any income paid to your Advance link."],
            ["Small, fair, and explained", "From $50, a flat 2%, and every decision comes with plain-English reasons."],
            ["Only possible on Monad", "One transaction per payment needs sub-second blocks and fees under a cent. Elsewhere it doesn't pay."],
          ].map(([t, b], i) => (
            <Reveal key={t} i={i}>
              <div className={`h-full rounded-3xl p-5 ${i % 2 ? "bg-monad text-white" : "bg-terra text-[#1a0d08]"}`}>
                <div className="font-mono text-[13px] opacity-70">{i + 1}</div>
                <h3 className="mt-2 font-semibold leading-snug">{t}</h3>
                <p className="mt-2 text-[14px] opacity-80">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Advance vs a credit card" sub="A credit card is a spending tool that happens to lend. Advance is your own income, early.">
        <Reveal>
          <div className="overflow-x-auto rounded-3xl border border-line bg-panel/80">
            <table className="w-full min-w-[640px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="p-4 font-medium text-muted" />
                  <th className="p-4 font-medium text-muted">Credit card</th>
                  <th className="p-4 font-semibold text-terra">Advance</th>
                </tr>
              </thead>
              <tbody>
                {CARD_ROWS.map(([k, card, us]) => (
                  <tr key={k} className="border-b border-line/60 last:border-0">
                    <td className="p-4 font-medium">{k}</td>
                    <td className="p-4 text-muted">{card}</td>
                    <td className="p-4">{us}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <p className="mt-4 text-[14.5px] text-muted">Where they meet: Visa already funds card issuers with this repayment model (via Credit Coop). A card that's paid off from your incoming income is a natural next step for Advance.</p>
      </Section>

      <Section title="Who else does something like this" sub="Honest about the neighbours. Some are close; none combine everything.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {OTHERS.map((o, i) => (
            <Reveal key={o.name} i={i % 2}>
              <div className="h-full rounded-3xl border border-line bg-panel/80 p-6">
                <div className="text-[12.5px] text-terra">{o.kind}</div>
                <h3 className="mt-1 text-lg font-semibold">{o.name}</h3>
                <p className="mt-2 text-[14.5px] text-muted">{o.does}</p>
                <p className="mt-3 border-t border-line pt-3 text-[14.5px]"><span className="text-muted">Difference: </span>{o.diff}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="What only Advance puts together">
        <Reveal>
          <div className="overflow-x-auto rounded-3xl border border-line bg-panel/80">
            <table className="w-full min-w-[620px] text-left text-[14.5px]">
              <thead>
                <tr className="border-b border-line">
                  <th className="p-4" />
                  <th className="p-4 font-medium text-muted">Stripe / Shopify Capital</th>
                  <th className="p-4 font-medium text-muted">Credit Coop</th>
                  <th className="p-4 font-semibold text-terra">Advance</th>
                </tr>
              </thead>
              <tbody>
                {COMBO.map(([k, v]) => (
                  <tr key={k} className="border-b border-line/60 last:border-0">
                    <td className="p-4 font-medium">{k}</td>
                    {v.map((yes, i) => (
                      <td key={i} className="p-4">
                        {yes ? <Check className={`size-5 ${i === 2 ? "text-terra" : "text-monad-hi"}`} weight="bold" /> : <X className="size-5 text-faint" />}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <p className="mt-4 text-[14.5px] text-muted">Small amounts, repaid per payment, only make economic sense on a chain as fast and cheap as Monad. That's why nobody has done this for individuals before.</p>
      </Section>

      <NextPage href="/business" title="How Advance makes money" sub="The business model, in plain numbers." />
    </>
  );
}
