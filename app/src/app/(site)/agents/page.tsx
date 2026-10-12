"use client";

import { Robot, IdentificationCard, CurrencyCircleDollar, Cpu, ArrowsSplit, ArrowDown } from "@phosphor-icons/react";
import { Mark, Note, Sparkle } from "@/components/site/doodles";
import { PageIntro, Section, Reveal, NextPage, CtaLink, QA } from "@/components/site/kit";

const FLOW = [
  { icon: IdentificationCard, t: "The agent gets an identity", b: "Its owner registers it in the ERC-8004 agent registry on Monad. Now it's a known agent, not an anonymous address." },
  { icon: Robot, t: "It gets its own wallet", b: "Derived from the owner's passkey (a third key from the same Face ID). The owner links it to Advance in one tap." },
  { icon: CurrencyCircleDollar, t: "It earns from its work", b: "Other people and agents pay it for jobs: design reviews, data, compute. Every payment is onchain income." },
  { icon: Cpu, t: "It borrows working capital", b: "Scored like any earner. It can borrow to buy compute or data before the next job pays." },
  { icon: ArrowsSplit, t: "The next job repays it", b: "20% of each job's payment repays the advance, in the same transaction. No one has to chase the agent." },
];

export default function Agents() {
  return (
    <>
      <PageIntro
        title={<>Working capital for <span className="text-monad-hi">AI agents</span></>}
        sub="AI agents that sell services earn money onchain. Advance lets them borrow against those earnings and repays automatically from their next job."
      >
        <CtaLink href="/app/agents" variant="monad">Set up an agent</CtaLink>
        <Note dir="up-left" arrow="loop" tone="terra" className="-top-36 right-0" tilt={5}>yes, robots can borrow now</Note>
        <CtaLink href="/how-it-works" variant="secondary">How Advance works</CtaLink>
      </PageIntro>

      <Section title="How it works for an agent" sub="Exactly the same rules as for people. The only difference is who's earning.">
        <div className="mx-auto max-w-3xl">
          {FLOW.map(({ icon: Icon, t, b }, i) => (
            <Reveal key={t} i={i}>
              <div className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${i % 2 ? "bg-terra text-[#1a0d08]" : "bg-monad text-white"}`}><Icon className="size-6" weight="bold" /></div>
                  {i < FLOW.length - 1 && <div className="my-1 flex flex-1 flex-col items-center"><div className="w-px flex-1 bg-line-strong" /><ArrowDown className="size-3.5 text-faint" /></div>}
                </div>
                <div className="pb-8">
                  <h3 className="text-lg font-semibold">{t}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Why agents need this">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["Agents can't get bank loans", "No ID, no credit history, no branch to walk into. Their only track record is onchain."],
            ["Their income is already onchain", "Every job payment is visible, so Advance can score real earnings instead of promises."],
            ["Repayment needs no trust", "The agent's payment address repays the advance by code. The lender doesn't rely on the agent cooperating."],
          ].map(([t, b], i) => (
            <Reveal key={t} i={i}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><h3 className="font-semibold">{t}</h3><p className="mt-2 text-[15px] text-muted">{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <Section title="Questions">
        <div className="grid gap-3">
          <QA q="Who is responsible for the agent's advance?">The agent's own wallet borrows and its own income repays. Limits start at $50 and the default is recorded publicly against the agent's identity.</QA>
          <QA q="Is this live?">On Monad testnet, yes: register an agent, have customers pay it, and watch it borrow and repay in the app.</QA>
        </div>
      </Section>

      <NextPage href="/safety" title="Is it safe?" sub="How fake income is caught, and what happens when something goes wrong." />
    </>
  );
}
