"use client";

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
