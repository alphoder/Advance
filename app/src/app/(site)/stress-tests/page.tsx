"use client";

import { useState } from "react";
import { Mark, Note, Sparkle } from "@/components/site/doodles";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown } from "@phosphor-icons/react";
import { PageIntro, Section, NextPage, CtaLink, Status } from "@/components/site/kit";

type Attack = {
  q: string;
  how: string;
  today: string;
  stops: { s: "live" | "next" | "partial"; t: string }[];
  verdict: string;
};

const GROUPS: { title: string; sub: string; items: Attack[] }[] = [
  {
    title: "Faking income",
    sub: "The obvious way to cheat a lender that judges you by income is to invent income.",
    items: [
      {
        q: "What if I pay myself from a second account?",
        how: "Send money to a fresh wallet, then have that wallet \"pay\" you, so it looks like a client.",
        today: "Declined. The score sees the payer was funded by your own address before it paid you, and says so in plain words.",
        stops: [{ s: "live", t: "Payer funded by borrower = hard decline" }, { s: "live", t: "Payers with no history of their own lower the score" }],
        verdict: "Caught",
      },
      {
        q: "What if the money goes back to my friend after he pays me?",
        how: "A friend pays you $300; you send it back to the same friend.",
        today: "Declined. Money flowing back to a payer is flagged as round-tripping.",
        stops: [{ s: "live", t: "Round-trip detection on every payer" }],
        verdict: "Caught",
      },
      {
        q: "What if my friend pays me every month and I give it back in cash?",
        how: "A real friend with a real wallet sends a monthly \"salary\". Nothing on-chain links you.",
        today: "This can pass, but only for $50: everyone starts at level 1, however much income they show.",
        stops: [
          { s: "live", t: "Everyone starts at $50; limits rise only after full repayment" },
          { s: "live", t: "A missed repayment is recorded publicly after 30 days" },
          { s: "next", t: "Income from personal wallets alone can never unlock more than $50" },
        ],
        verdict: "Capped at $50",
      },
      {
        q: "What if I wash the money through an exchange (me → exchange → mom → exchange → dad → me)?",
        how: "Exchanges pool everyone's funds, so the on-chain trail between family members disappears.",
        today: "Tracing can't follow it, so we don't rely on tracing. The loop's payers are personal wallets, which keeps it at the starting limit.",
        stops: [
          { s: "live", t: "Starting limit of $50 per account" },
          { s: "next", t: "Limits grow only with income from businesses or verified sources, never from personal wallets" },
        ],
        verdict: "Capped at $50, after months of effort and exchange fees",
      },
    ],
  },
  {
    title: "Many accounts, many people",
    sub: "If one fake account gets $50, can a group get more?",
    items: [
      {
        q: "What if I default, then just make a new account?",
        how: "A new address has no bad record attached to it.",
        today: "You start again at $50 with no history, and have to fake months of income again for one more $50.",
        stops: [
          { s: "live", t: "New accounts start at $50 with zero history" },
          { s: "next", t: "Payers who previously paid a defaulted account are flagged" },
          { s: "next", t: "$1,000+ requires proof you are one unique person (World ID, zkPassport or Self)" },
        ],
        verdict: "Not worth it",
      },
      {
        q: "What if four family members pay each other in a circle?",
        how: "Mom pays me, I pay dad, dad pays my brother, my brother pays mom. Each account looks paid.",
        today: "Each account could reach $50, so $200 for the family.",
        stops: [
          { s: "next", t: "Ring detection: a loop with no outside money scores near zero" },
          { s: "next", t: "Connected accounts share one limit: $50 for the whole family" },
          { s: "next", t: "One default freezes every connected account" },
        ],
        verdict: "$200 today, $0 to $50 once shipped",
      },
      {
        q: "What if a group of friends with real salaries all pay one person?",
        how: "Real money from real wallets, returned off the books.",
        today: "No lender can read intent, and this looks like real clients. It's capped by the starting limit.",
        stops: [
          { s: "live", t: "Starting limit and slow growth" },
          { s: "next", t: "Business payers count far more than personal ones" },
          { s: "next", t: "Circles: friends guarantee each other, so colluding costs them their own money" },
        ],
        verdict: "Can't be fully detected; kept small",
      },
    ],
  },
  {
    title: "Honest borrowers, bad outcomes",
    sub: "Not every loss is fraud. These are ordinary credit risks.",
    items: [
      {
        q: "What if I repay small advances honestly, then take the big one and vanish?",
        how: "Classic \"bust-out\": build trust at $50, $200, $1,000, then default at the top.",
        today: "Limits rise only after full repayment, so this takes months of real repayments first.",
        stops: [
          { s: "live", t: "Levels: $50 → $200 → $1,000 → $5,000, one full repayment each" },
          { s: "next", t: "More independent payers needed for higher levels, and a minimum time at each level" },
          { s: "next", t: "Full KYC through a licensed partner at $5,000" },
        ],
        verdict: "Slow, costly, and identity-checked at the top",
      },
      {
        q: "What if I get a high limit and take it all the day I lose my job?",
        how: "No fraud, just a real borrower whose income stops.",
        today: "The limit is at most half a month of verified income, so the most taken is about two weeks of pay. The last paycheck repays first if it's paid to the Advance address.",
        stops: [
          { s: "live", t: "Limit = monthly income × 50% × score, capped by level" },
          { s: "live", t: "20% of every payment repays automatically" },
          { s: "next", t: "New advances freeze when income stops arriving" },
          { s: "next", t: "Debt stays collectible: repayment resumes with the next job" },
        ],
        verdict: "Ordinary credit risk: capped, priced in, partly recoverable",
      },
      {
        q: "What if I tell clients to pay a different address after I borrow?",
        how: "Repayment only happens if income reaches the Advance address.",
        today: "Possible. It's the main open risk of repaying from income.",
        stops: [
          { s: "live", t: "Small starting limits; the default is recorded publicly" },
          { s: "live", t: "Boost savers absorb losses before Steady" },
          { s: "next", t: "Payroll and payment-app partners route payments automatically" },
        ],
        verdict: "Open risk, kept small",
      },
    ],
  },
  {
    title: "Attacking the system itself",
    sub: "What if someone goes after the contracts or the servers instead of the rules?",
    items: [
      {
        q: "Can someone reuse or forge a client's signed payment?",
        how: "Replay an old payment signature, or change the amount.",
        today: "Rejected by the token contract. Each signature works once, for one amount, to one address.",
        stops: [{ s: "live", t: "Tested: replay rejected, forged amount rejected, wrong submitter rejected" }],
        verdict: "Blocked",
      },
      {
        q: "Can a payment get stuck, or split wrongly?",
        how: "Rounding, odd amounts, or edge cases leaving money behind.",
        today: "A 1,000-run randomized test proves repayment + payout always equals the payment and nothing is left behind.",
        stops: [{ s: "live", t: "Fuzz-tested split, account always ends empty" }],
        verdict: "Proven by test",
      },
      {
        q: "What if the scoring server's key is stolen?",
        how: "An attacker sets huge limits for themselves.",
        today: "Limits are capped by level inside the contract, so a stolen key can't grant more than the borrower's level allows.",
        stops: [
          { s: "live", t: "Level caps enforced on-chain" },
          { s: "live", t: "The scorer can be paused instantly" },
          { s: "partial", t: "Chainlink CRE nodes agree on limits instead of one key (workflow built, not yet deployed)" },
        ],
        verdict: "Damage capped",
      },
    ],
  },
];

function AttackCard({ a }: { a: Attack }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-3xl border border-line bg-panel/80">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-start justify-between gap-4 p-5 text-left sm:p-6">
        <div>
          <div className="text-[16px] font-semibold">{a.q}</div>
          <div className="mt-1.5 text-[13.5px] text-terra">{a.verdict}</div>
        </div>
        <CaretDown className={`mt-1 size-5 shrink-0 text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="overflow-hidden">
            <div className="grid gap-4 border-t border-line p-5 sm:p-6 md:grid-cols-2">
              <div>
                <div className="text-[12.5px] font-medium text-muted">The attack</div>
                <p className="mt-1 text-[14.5px]">{a.how}</p>
                <div className="mt-4 text-[12.5px] font-medium text-muted">What happens today</div>
                <p className="mt-1 text-[14.5px]">{a.today}</p>
              </div>
              <div>
                <div className="text-[12.5px] font-medium text-muted">What stops it</div>
                <ul className="mt-2 space-y-2">
                  {a.stops.map((s) => (
                    <li key={s.t} className="flex items-start gap-2.5 text-[14px]"><Status s={s.s} /><span>{s.t}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function StressTests() {
  const total = GROUPS.flatMap((g) => g.items).length;
  return (
    <>
      <PageIntro
        title={<>We tried to <span className="text-terra"><Mark tone="monad" delay={0.7}>break it</Mark></span></>}
        sub={`${total} ways someone could cheat or lose money with Advance, and what stops each one. Every defence is marked Live (built and tested today) or Next (designed, being built).`}
      >
        <CtaLink href="/check">Test the fraud check yourself</CtaLink>
        <CtaLink href="/safety" variant="secondary">Security overview</CtaLink>
      </PageIntro>
      <div className="relative mx-auto mt-2 flex max-w-6xl flex-wrap items-center justify-center gap-3 px-4 text-[13px] text-muted">
        <Note dir="down-right" arrow="swoop" className="left-[6%] top-14" tilt={-4}>tap any question to open it</Note>
        <span className="flex items-center gap-2"><Status s="live" /> built and tested now</span>
        <span className="flex items-center gap-2"><Status s="partial" /> built, not deployed</span>
        <span className="flex items-center gap-2"><Status s="next" /> designed, being built</span>
      </div>
      {GROUPS.map((g) => (
        <Section key={g.title} title={g.title} sub={g.sub}>
          <div className="grid gap-3">{g.items.map((a) => <AttackCard key={a.q} a={a} />)}</div>
        </Section>
      ))}
      <Section title="The principle behind all of it" center>
        <div className="mx-auto max-w-3xl rounded-3xl bg-monad p-7 text-center text-lg text-white sm:p-9">
          No lender can read intent. So Advance keeps the payoff from cheating small, makes every default public and permanent, and makes the trust needed for big limits slow and expensive to build.
        </div>
      </Section>
      <NextPage href="/compare" title="How is this different?" sub="Advance vs credit cards, Stripe Capital, Credit Coop, Huma and more." />
    </>
  );
}
