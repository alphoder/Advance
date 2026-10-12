"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight, Lightning, QrCode, MagnifyingGlass, UsersThree, ClockCounterClockwise } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { useAppData, useScore } from "@/lib/app-data";
import { IS_TESTNET } from "@/lib/chain";
import { Gate } from "@/components/app/shell";
import { ActivityRow, PageHeader, TierLadder, TxLog, EmptyState } from "@/components/app/bits";
import { Button, ErrorNote, Panel, Label, Skeleton, fmtUsd } from "@/components/ui";
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
        title="Your Advance"
        sub={`Signed in with ${session?.kind === "passkey" ? "your passkey" : "a demo account"}. Everything below updates with every Monad block.`}
        action={<Link href="/app/advance"><Button icon={<Lightning className="size-4" weight="fill" />}>Get an advance</Button></Link>}
      />
      <TxLog items={log.slice(0, 6)} />

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-5">
          <Label>Available now</Label>
          <div className="num mt-2 font-mono text-6xl font-semibold text-terra">{fmtUsd(c.available)}</div>
          <p className="mt-2 text-[14px] text-muted">of a {fmtUsd(c.limit)} limit. Flat 2% fee, repaid from your next payments.</p>
          <div className="mt-6 flex gap-2">
            <Link href="/app/advance" className="flex-1"><Button className="w-full" disabled={c.available < 1}>Take it</Button></Link>
            <Link href="/app/get-paid" className="flex-1"><Button variant="secondary" className="w-full" icon={<QrCode className="size-4" />}>Get paid</Button></Link>
          </div>
        </Panel>

        <Panel className="lg:col-span-4">
          <Label>You owe</Label>
          <div className="num mt-2 font-mono text-5xl font-semibold text-monad-hi">{fmtUsd(c.owed)}</div>
          <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <motion.div className="h-full rounded-full bg-monad" initial={{ scaleX: 0 }} animate={{ scaleX: progress }} style={{ transformOrigin: "left" }} transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }} />
          </div>
          <p className="mt-2.5 text-[13px] text-muted">{c.owed > 0 ? `${activity.shareBps / 100}% of each incoming payment pays this down automatically.` : "Nothing owed. Every payment comes to you in full."}</p>
          <div className="mt-5 flex justify-between border-t border-line pt-4 text-[14px]">
            <span className="text-muted">Balance</span><span className="num font-mono">{fmtUsd(activity.balance)}</span>
          </div>
        </Panel>

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
