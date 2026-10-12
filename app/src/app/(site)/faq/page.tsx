"use client";

import Link from "next/link";
import { PageIntro, Section, NextPage, QA } from "@/components/site/kit";

const GLOSSARY: [string, string][] = [
  ["Advance", "Money you get today, paid back from money you'll receive soon. Like being paid early."],
  ["Limit", "The most you can have advanced at once. Starts at $50 and grows."],
  ["Level", "Your limit tier: $50, $200, $1,000, $5,000. Repaying in full moves you up."],
  ["Advance Score", "A 0 to 100 score built from who pays you and how. Every point is explained."],
  ["Advance address", "Your personal payment address. It splits every incoming payment automatically."],
  ["Split", "What happens to each payment: 20% repays what you owe, 80% goes to you, in one transaction."],
  ["Passkey", "Signing in with Face ID, fingerprint or device PIN. It replaces passwords and wallet secret words."],
  ["AUSD", "A digital US dollar (stablecoin). One AUSD is meant to equal one dollar."],
  ["Steady", "The safer way to save. Protected from losses first, lower return."],
  ["Boost", "The higher-return way to save. Absorbs missed repayments first."],
  ["Pool", "All savers' dollars together, which fund advances."],
  ["Proof", "A link to the transaction on Monad's public record, so anyone can verify it happened."],
  ["Monad", "The blockchain Advance runs on. Its transactions take under a second and cost under a cent."],
  ["Missed repayment", "An advance with nothing repaid after 30 days. It's recorded publicly and pauses new advances."],
];

export default function Faq() {
  return (
    <>
      <PageIntro title="Questions, answered plainly" sub="If a word on this site doesn't make sense, it's in the glossary below." />

      <Section title="The basics">
        <div className="grid gap-3">
          <QA q="What is Advance, in one sentence?">An app that pays you today for money that's already on its way to you, and takes the repayment from that money automatically when it arrives.</QA>
          <QA q="Is this a loan?">It works like a small, short loan against income you're already owed. The difference: there's no interest that grows, and you never have to remember to repay. Your next payments repay it.</QA>
          <QA q="What does it cost?">A flat 2% of what you take. Take $50, pay back $51. Nothing else, no matter how long it takes.</QA>
          <QA q="Do I need crypto experience?">No. You sign in with Face ID and see dollars. The blockchain is there so everything is verifiable, but you never need to touch it.</QA>
          <QA q="Why do I start at only $50?">Because the score is built from your track record. Every advance you repay in full raises your limit: $200, then $1,000, then $5,000.</QA>
        </div>
      </Section>

      <Section title="The tough questions" sub="Real questions people asked us while we built Advance.">
        <div className="grid gap-3">
          <QA q="My limit is $50 and my $300 salary arrives next week. How does the math work?">
            You take $50 today and owe $51 (the $50 plus the 2% fee). When the $300 salary reaches your Advance link, 20% of it would be $60, but you only owe $51, so only $51 is taken and $249 lands with you, in the same second.
            In total you got $299 of your $300 salary, $50 of it early, for a $1 fee. Because you repaid in full, your limit rises to $200.
          </QA>
          <QA q="What if a friend sends me a fake salary every month and I give it back in cash?">
            It can pass, but only for $50: everyone starts there, and limits rise only after full repayment. Then the default is public forever. See every scenario on our <Link href="/stress-tests" className="text-terra underline underline-offset-4">stress tests</Link> page.
          </QA>
          <QA q="What if my whole family (or a friend group) pays each other in a circle, even through an exchange?">
            Exchanges hide the trail, so we don&apos;t rely on tracing. Today each account is capped at $50 to start. We&apos;re adding rules so income from personal wallets never unlocks more, connected accounts share one limit, and bigger limits need proof you&apos;re a unique person. Details on the <Link href="/stress-tests" className="text-terra underline underline-offset-4">stress tests</Link> page.
          </QA>
          <QA q="What if I get a big limit and lose my job the next day?">
            The limit is at most half a month of verified income, so the most anyone can take is about two weeks of pay. Your last paycheck repays first if it's paid to your Advance link. Next, we're adding a freeze on new advances when income stops, and keeping the debt collectible when income returns.
          </QA>
          <QA q="Do I need to do KYC?">
            Not for $50 to $200. As limits grow, so will the checks (being built): at $1,000 you&apos;ll prove you&apos;re one unique person, privately, with no documents stored; at $5,000 a licensed partner verifies you. See <Link href="/safety" className="text-terra underline underline-offset-4">security</Link>.
          </QA>
          <QA q="How is this different from a credit card?">
            A card lends against your past debts, charges interest that compounds, and you must remember to pay. Advance lends against income arriving now, charges a flat 2%, and repays itself. Full comparison on the <Link href="/compare" className="text-terra underline underline-offset-4">compare</Link> page.
          </QA>
          <QA q="Isn't this already done by someone else?">
            The repayment idea is proven (Stripe Capital, Shopify Capital, Credit Coop with Visa), but only for businesses or inside one platform. Advance is the first to offer it to any earner and to AI agents. See <Link href="/compare" className="text-terra underline underline-offset-4">compare</Link>.
          </QA>
          <QA q="How does Advance make money?">
            It keeps 10% of the 2% fee on every advance (savers get 90%), plus partner fees and score access later. Savers carry the lending risk, so Advance never lends its own money. See the <Link href="/business" className="text-terra underline underline-offset-4">business model</Link>.
          </QA>
        </div>
      </Section>

      <Section title="Money and safety">
        <div className="grid gap-3">
          <QA q="Who gives me the money?">Savers who put dollars into the Advance pool. They earn from the fees borrowers pay.</QA>
          <QA q="Can Advance take my money?">No. Your Advance address only splits payments by fixed rules (at least 20% to repay what you owe, the rest to you) and never holds funds.</QA>
          <QA q="What if I can't repay?">There's no interest or penalty. If nothing is repaid within 30 days, it's recorded as missed and new advances pause.</QA>
          <QA q="Are my documents safe?">They're encrypted on your device before they leave it. Only you, and a lender you choose, can open them.</QA>
        </div>
      </Section>

      <Section title="Glossary">
        <dl className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {GLOSSARY.map(([term, def]) => (
            <div key={term} className="rounded-2xl border border-line bg-panel/80 p-5">
              <dt className="font-semibold">{term}</dt>
              <dd className="mt-1 text-[15px] text-muted">{def}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <NextPage href="/app?demo=1" title="Ready to see it for real?" sub="A 60-second demo with real transactions on Monad." />
    </>
  );
}
