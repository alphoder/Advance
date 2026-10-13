"use client";

import { CalendarBlank, Fingerprint, ChartLineUp, Lightning, ArrowsSplit, Ticket } from "@phosphor-icons/react";
import { Mark, Note, Sparkle } from "@/components/site/doodles";
import { PageIntro, Section, Reveal, NextPage, CtaLink } from "@/components/site/kit";
import { RepaySimulator, MoneyFlow } from "@/components/site/simulator";

const STEPS = [
  { icon: Fingerprint, title: "Sign in with your face", body: "Your passkey (Face ID or fingerprint) is your account. There's no wallet to install and no 12 secret words to write down." },
  { icon: ChartLineUp, title: "We look at money you already receive", body: "Advance reads the payments sent to your account on Monad: who paid you, how often, and whether those payers are real. You see every reason." },
  { icon: Lightning, title: "You get an advance in one second", body: "Your first limit is $50. Pick an amount, see the exact cost in dollars, tap once. The money arrives before you put your phone down." },
  { icon: ArrowsSplit, title: "Your next payment repays it", body: "Clients pay your Advance link like any payment link. 20% of each payment goes to repay the advance and 80% comes to you, in the same second." },
];

export default function HowItWorks() {
  return (
    <>
      <PageIntro
        title={<>How Advance <span className="text-terra"><Mark tone="monad" delay={0.7}>works</Mark></span></>}
        sub="Advance pays you today for money that is already on its way to you. When that money arrives, a small slice pays the advance back by itself."
      >
        <CtaLink href="#simulator">Try the simulator</CtaLink>
        <CtaLink href="/app?demo=1" variant="secondary">Try the real demo</CtaLink>
      </PageIntro>

      <Section title="The problem, in one picture" sub="You finished the work. The money is coming. But not today.">
        <Reveal>
          <div className="rounded-3xl border border-line bg-panel/80 p-6 sm:p-8">
            <div className="relative h-28">
              <div className="absolute inset-x-0 top-12 h-1 rounded-full bg-white/10" />
              {[
                { day: 1, label: "You finish the work", tone: "bg-ink" },
                { day: 30, label: "Rent is due", tone: "bg-danger" },
                { day: 45, label: "Client finally pays", tone: "bg-monad" },
              ].map((m) => (
                <div key={m.day} className="absolute top-0 -translate-x-1/2 text-center" style={{ left: `${(m.day / 50) * 100}%` }}>
                  <div className="whitespace-nowrap text-[13px] font-medium">{m.label}</div>
                  <div className={`mx-auto mt-3 size-4 rounded-full ring-4 ring-panel ${m.tone}`} />
                  <div className="mt-2 font-mono text-[12px] text-muted">day {m.day}</div>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/[0.03] p-4 text-[15px] text-muted">
              <CalendarBlank className="mt-0.5 size-5 shrink-0 text-terra" />
              <p>85% of freelancers get paid late at least some of the time. Banks won&apos;t lend against money they can&apos;t see, and fast options like payday loans cost about 391% a year.</p>
            </div>
          </div>
        </Reveal>
      </Section>

      <Section title="Four steps" sub="That's the whole product. No paperwork, no credit card, no interest that grows.">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <Reveal key={title} i={i}>
              <div className="flex h-full gap-4 rounded-3xl border border-line bg-panel/80 p-6">
                <div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${i % 2 ? "bg-terra text-[#1a0d08]" : "bg-monad text-white"}`}>
                  <Icon className="size-6" weight="bold" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal>
          <a href="/rewards" className="group flex flex-col gap-4 rounded-3xl bg-[radial-gradient(120%_120%_at_0%_0%,#9d8cff,#836ef9_45%,#4c3db0)] p-6 text-white sm:flex-row sm:items-center sm:p-7">
            <div className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white/15"><Ticket weight="fill" className="size-7" /></div>
            <div className="flex-1">
              <div className="text-[13px] opacity-80">And a bonus</div>
              <h3 className="text-xl font-semibold">Repay fast, win a scratch card</h3>
              <p className="mt-1 text-[15px] opacity-85">When clients repay your advance within a week, the contract hands you up to 90% of the fee back as trust points.</p>
            </div>
            <span className="text-[15px] font-medium transition-transform group-hover:translate-x-1">How it works →</span>
          </a>
        </Reveal>
      </Section>

      <Section id="simulator" title="Try it yourself" sub="A simulator with pretend money. Take an advance, then press the buttons to have clients pay you. Watch the advance pay itself off.">
        <Note dir="down-left" arrow="loop" className="right-[8%] top-10" tilt={3}>go on, press the buttons!</Note>
        <RepaySimulator />
      </Section>

      <Section title="Where the money comes from, and goes" sub="Advances are funded by savers. Repayments and fees flow back to them automatically.">
        <MoneyFlow />
      </Section>

      <Section title="Why it's safe to lend this way" sub="The lender doesn't have to trust you to remember to repay. The repayment is built into the payment itself, by code.">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            ["Small to start", "Everyone starts at $50. Limits grow only after advances are repaid in full."],
            ["Fake income is caught", "If the people paying you are really you, Advance can tell, and says so in plain words."],
            ["Losses are cushioned", "If someone never repays, savers who chose higher returns (Boost) absorb it first."],
          ].map(([t, b], i) => (
            <Reveal key={t} i={i}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><h3 className="font-semibold">{t}</h3><p className="mt-2 text-[15px] text-muted">{b}</p></div></Reveal>
          ))}
        </div>
      </Section>

      <NextPage href="/borrow" title="Is it for me?" sub="Who Advance is built for, and exactly what it costs." />
    </>
  );
}
