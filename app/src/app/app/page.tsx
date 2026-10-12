"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Lightning, QrCode, MagnifyingGlass, UsersThree, ClockCounterClockwise, CheckCircle, Circle } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { useAppData, useScore } from "@/lib/app-data";
import { IS_TESTNET } from "@/lib/chain";
import { Gate } from "@/components/app/shell";
import { ActivityRow, PageHeader, TierLadder, TxLog, EmptyState } from "@/components/app/bits";
import { Button, ErrorNote, Panel, Label, Skeleton, fmtUsd, InfoTip } from "@/components/ui";
import type { Activity } from "@/lib/app-data";
import { ScoreDial } from "@/components/score-view";
import { SplitAnimation } from "@/components/split";

export default function Overview() {
  return <Gate><Inner /></Gate>;
}

function Inner() {
  const { session } = useAccount();
  const { activity, log, apply, seed, score } = useAppData();
  const demo = useSearchParams().get("demo") === "1";
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(label); setError(undefined);
    try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }
  const verify = (withDemo: boolean) => run(withDemo ? "Four clients are paying you onchain…" : "Reading your income…", async () => {
    if (withDemo) await seed();
    await apply();
  });

  // Demo mode: start the story automatically for a brand-new account.
  const started = useRef(false);
  useEffect(() => {
    if (demo && activity && !started.current && activity.credit.limit === 0 && activity.events.length === 0) {
      started.current = true;
      verify(true);
    }
  }, [demo, activity]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activity) return <OverviewSkeleton />;
  const c = activity.credit;
  const fresh = c.limit === 0 && activity.events.length === 0;

  if (fresh || (score && !score.approved && c.limit === 0)) {
    return (
      <>
        <PageHeader title="Let's see what you could get" sub="We read the payments you've received on Monad, check every payer, and explain the result in plain words." />
        <div className="grid gap-4 md:grid-cols-2">
          <ChoiceCard
            icon={<MagnifyingGlass className="size-6 text-terra" weight="duotone" />}
            title="Check my income"
            body="Score the payments this account has already received."
            cta="Check now" loading={busy?.startsWith("Reading")} disabled={Boolean(busy)} onClick={() => verify(false)}
          />
          {IS_TESTNET && (
            <ChoiceCard
              icon={<UsersThree className="size-6 text-monad-hi" weight="duotone" />}
              title="Demo: four clients pay me first"
              body="Northwind, Lumen, Orbit and Kite pay you real test dollars onchain. Then we score it."
              cta="Run the demo" variant="monad" loading={busy?.startsWith("Four")} disabled={Boolean(busy)} onClick={() => verify(true)}
            />
          )}
        </div>
        {busy && <Panel className="mt-4 flex items-center gap-3"><span className="live-dot size-2 rounded-full bg-terra text-terra" /> {busy}</Panel>}
        <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
        {score && !score.approved && <Panel className="mt-4 text-muted">Not approved yet. <Link href="/app/score" className="text-ink underline underline-offset-4">See why on your score page</Link>.</Panel>}
        <div className="mt-4"><TxLog items={log} /></div>
      </>
    );
  }

  const lastSplit = activity.events.find((e) => e.type === "PaymentSplit");
  const progress = c.totalBorrowed ? Math.min(1, c.totalRepaid / (c.totalRepaid + c.owed)) : 0;

  return (
    <>
      <PageHeader
        title="Home"
        sub="Everything about your advance, updated with every Monad block."
        help={["\"Available now\" is how much you can take right now.", "\"You owe\" goes down by itself: 20% of every payment you receive repays it.", "Your score decides your limit. Repay in full to reach the next level.", "Not sure what to do? Follow the \"Your next step\" card."]}
      />
      <NextStep c={c} hasDrawn={activity.events.some((e) => e.type === "Drawn")} />
      <TxLog items={log.slice(0, 6)} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* The pair: terracotta is the earner's money, purple is repayment to the protocol. */}
        <div className="rounded-3xl bg-terra p-6 text-[#1a0d08] sm:p-7 lg:col-span-5">
          <div className="flex items-center gap-2 text-[14px] font-medium opacity-70">Available now <InfoTip>The most you can take as an advance right now. It grows each time you repay in full.</InfoTip></div>
          <div className="num mt-2 font-mono text-6xl font-semibold tracking-tight">{fmtUsd(c.available)}</div>
          <p className="mt-2 text-[14px] opacity-75">of a {fmtUsd(c.limit)} limit. Flat 2% fee, repaid from your next payments.</p>
          <div className="mt-6 flex gap-2">
            <Link href="/app/advance" className="flex-1">
              <button disabled={c.available < 1} className="press inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#1a0d08] px-5 text-[14.5px] font-medium text-terra-hi hover:bg-black disabled:opacity-45">Take it</button>
            </Link>
            <Link href="/app/get-paid" className="flex-1">
              <button className="press inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#1a0d08]/25 px-5 text-[14.5px] font-medium hover:bg-[#1a0d08]/10"><QrCode className="size-4" /> Get paid</button>
            </Link>
          </div>
        </div>

        <div className="rounded-3xl bg-monad p-6 text-white sm:p-7 lg:col-span-4">
          <div className="flex items-center gap-2 text-[14px] font-medium opacity-75">You owe <InfoTip>Your advance plus its 2% fee. Payments you receive pay this down automatically; you never have to repay by hand.</InfoTip></div>
          <div className="num mt-2 font-mono text-5xl font-semibold tracking-tight">{fmtUsd(c.owed)}</div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/25">
            <motion.div className="h-full rounded-full bg-white" initial={{ scaleX: 0 }} animate={{ scaleX: progress }} style={{ transformOrigin: "left" }} transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} />
          </div>
          <p className="mt-2.5 text-[13px] opacity-80">{c.owed > 0 ? `${activity.shareBps / 100}% of each incoming payment pays this down automatically.` : "Nothing owed. Every payment comes to you in full."}</p>
          <div className="mt-5 flex justify-between border-t border-white/25 pt-4 text-[14px]">
            <span className="flex items-center gap-2 opacity-80">Balance <InfoTip>Dollars (AUSD) in your Advance account that you can spend or send.</InfoTip></span><span className="num font-mono">{fmtUsd(activity.balance)}</span>
          </div>
        </div>

        <ScoreTile />

        <div className="lg:col-span-7">
          {lastSplit ? (
            <SplitAnimation e={{ key: lastSplit.key, amount: lastSplit.amount!, repaid: lastSplit.repaid!, toYou: lastSplit.toYou!, tx: lastSplit.tx, block: lastSplit.block }} />
          ) : (
            <Panel className="h-full">
              <EmptyState
                icon={<QrCode className="size-6" />} title="No payments through Advance yet"
                body="Share your payment link with a client. You'll see every payment split here as it lands."
                action={<Link href="/app/get-paid"><Button variant="secondary">Open my payment link</Button></Link>}
              />
            </Panel>
          )}
        </div>
        <div className="lg:col-span-5"><TierLadder tier={c.tier} repayments={c.repayments} /></div>

        <Panel className="lg:col-span-12">
          <div className="flex items-center justify-between">
            <Label>Recent activity</Label>
            <Link href="/app/activity" className="inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">All activity <ArrowRight className="size-3.5" /></Link>
          </div>
          {activity.events.length ? (
            <ul className="mt-1 divide-y divide-line">{activity.events.filter((e) => e.type !== "Repaid").slice(0, 5).map((e, i) => <ActivityRow key={e.key} e={e} i={i} />)}</ul>
          ) : (
            <EmptyState icon={<ClockCounterClockwise className="size-6" />} title="Nothing yet" body="Your advances and payments will appear here." />
          )}
        </Panel>
      </div>
    </>
  );
}

function ScoreTile() {
  const { session } = useAccount();
  const { score: applied } = useAppData();
  const { data } = useScore(session?.address);
  const s = applied ?? data;
  return (
    <Panel className="flex flex-col items-center justify-center text-center lg:col-span-3">
      {s ? <ScoreDial score={s.score} approved={s.approved} size={132} /> : <Skeleton className="size-32 rounded-full" />}
      <Link href="/app/score" className="mt-3 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">Why this score <ArrowRight className="size-3.5" /></Link>
    </Panel>
  );
}

function ChoiceCard({ icon, title, body, cta, onClick, loading, disabled, variant = "primary" }: {
  icon: React.ReactNode; title: string; body: string; cta: string; onClick: () => void; loading?: boolean; disabled?: boolean; variant?: "primary" | "monad";
}) {
  return (
    <Panel className="flex flex-col">
      <div className="grid size-12 place-items-center rounded-xl border border-line bg-white/[0.03]">{icon}</div>
      <h3 className="mt-5 text-xl font-semibold">{title}</h3>
      <p className="mt-1.5 flex-1 text-muted">{body}</p>
      <Button className="mt-6 self-start" variant={variant} onClick={onClick} loading={loading} disabled={disabled}>{cta}</Button>
    </Panel>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
      <Skeleton className="h-10 w-64 lg:col-span-12" />
      <Skeleton className="h-52 lg:col-span-5" />
      <Skeleton className="h-52 lg:col-span-4" />
      <Skeleton className="h-52 lg:col-span-3" />
      <Skeleton className="h-64 lg:col-span-7" />
      <Skeleton className="h-64 lg:col-span-5" />
    </div>
  );
}

/** Always tells a beginner exactly one thing to do next, based on where they are. */
function NextStep({ c, hasDrawn }: { c: Activity["credit"]; hasDrawn: boolean }) {
  const steps = ["Verify income", "Take an advance", "Get paid", "Repaid"];
  const stage = c.owed > 0 ? 2 : hasDrawn ? 3 : c.limit > 0 ? 1 : 0;
  const card =
    stage === 1 ? { t: `Take your first advance: up to ${fmtUsd(c.available)}`, b: "Pick an amount, see the exact cost, tap once. It arrives in about a second.", href: "/app/advance", cta: "Get money now" }
    : stage === 2 ? { t: `Share your payment link to repay ${fmtUsd(c.owed)}`, b: "When a client pays your link, 20% of the payment repays your advance automatically. You don't do anything else.", href: "/app/get-paid", cta: "Open my payment link" }
    : { t: c.available >= 1 ? `All repaid. You can take up to ${fmtUsd(c.available)} again` : "All repaid", b: "Nothing owed: every payment now comes to you in full. Repaying in full is how your limit grows.", href: "/app/advance", cta: "Get money now" };
  return (
    <div className="mb-4 rounded-3xl border border-terra/35 bg-[linear-gradient(120deg,rgb(226_114_91/0.16),transparent_60%)] p-5 sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-[13px] font-medium text-terra">Your next step</div>
          <div className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{card.t}</div>
          <p className="mt-1 max-w-xl text-[14.5px] text-muted">{card.b}</p>
        </div>
        <Link href={card.href} className="press inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-terra px-6 font-medium text-[#1a0d08] hover:bg-terra-hi">
          {card.cta} <ArrowRight className="size-4" weight="bold" />
        </Link>
      </div>
      <ol className="mt-5 grid grid-cols-4 gap-2">
        {steps.map((s, i) => (
          <li key={s} className="flex items-center gap-2 text-[12.5px]">
            {i < stage || (i === 3 && stage === 3) ? <CheckCircle className="size-4 shrink-0 text-monad-hi" weight="fill" /> : <Circle className={`size-4 shrink-0 ${i === stage ? "text-terra" : "text-faint"}`} weight={i === stage ? "fill" : "regular"} />}
            <span className={i === stage ? "text-ink" : "text-muted"}>{s}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
