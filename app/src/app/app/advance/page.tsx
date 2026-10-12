"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Lightning, CheckCircle, ArrowRight } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { useAppData } from "@/lib/app-data";
import { sendTx } from "@/lib/tx";
import { creditAbi, erc20Abi } from "@/lib/abi";
import { D } from "@/lib/chain";
import { Gate } from "@/components/app/shell";
import { PageHeader, TierLadder, EmptyState } from "@/components/app/bits";
import { Button, ErrorNote, Panel, Label, Proof, Skeleton, fmtUsd } from "@/components/ui";

export default function AdvancePage() {
  return <Gate><Inner /></Gate>;
}

function Inner() {
  const { session } = useAccount();
  const { activity, refresh, pushLog } = useAppData();
  const [amount, setAmount] = useState(0);
  const [busy, setBusy] = useState<"draw" | "repay">();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<{ hash: string; block: number; ms: number; amount: number }>();
  const c = activity?.credit;
  const max = Math.floor(c?.available ?? 0);
  useEffect(() => { if (max && (!amount || amount > max)) setAmount(max); }, [max]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!activity || !c) return <Skeleton className="h-96" />;
  if (c.limit === 0 && c.owed === 0)
    return (
      <Panel>
        <EmptyState icon={<Lightning className="size-6" />} title="No limit yet" body="Verify your income first. It takes a few seconds."
          action={<Link href="/app"><Button>Verify my income</Button></Link>} />
      </Panel>
    );

  const fee = amount * 0.02;
  const share = activity.shareBps / 10_000;
  const incomeToRepay = (amount + fee) / share;

  async function draw() {
    if (!session || amount < 1) return;
    setBusy("draw"); setError(undefined);
    try {
      const r = await sendTx(session, { address: D.creditLine, abi: creditAbi, functionName: "draw", args: [BigInt(amount) * 1_000_000n] });
      setDone({ ...r, amount });
      pushLog([{ label: `Advance of ${fmtUsd(amount)} received`, hash: r.hash, ms: r.ms }]);
      refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }

  async function repayEarly() {
    if (!session || !activity) return;
    setBusy("repay"); setError(undefined);
    try {
      const amt = BigInt(Math.round(Math.min(c!.owed, activity.balance) * 1e6));
      await sendTx(session, { address: D.ausd, abi: erc20Abi, functionName: "approve", args: [D.creditLine, amt] });
      const r = await sendTx(session, { address: D.creditLine, abi: creditAbi, functionName: "repay", args: [session.address, amt] });
      pushLog([{ label: `Repaid ${fmtUsd(Number(amt) / 1e6)} early`, hash: r.hash, ms: r.ms }]);
      refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }

  return (
    <>
      <PageHeader title="Get an advance" sub="Pick an amount. You see the full cost in dollars before anything happens, and it repays itself from your next payments." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          {c.defaulted ? (
            <p className="text-danger">A previous advance wasn&apos;t repaid within 30 days, so new advances are paused. This is recorded onchain.</p>
          ) : max < 1 ? (
            <EmptyState icon={<Lightning className="size-6" />} title="You're at your limit"
              body="Your next client payments pay down what you owe. Once it's repaid in full, your limit grows."
              action={<Link href="/app/get-paid"><Button variant="secondary">Open my payment link</Button></Link>} />
          ) : (
            <>
              <Label>How much do you need?</Label>
              <div className="num mt-3 font-mono text-7xl font-semibold tracking-tight text-terra">{fmtUsd(amount)}</div>
              <input
                type="range" min={1} max={max} step={1} value={amount} onChange={(e) => setAmount(Number(e.target.value))}
                aria-label="Advance amount"
                className="mt-6 w-full cursor-pointer accent-[var(--terra)]"
              />
              <div className="mt-1 flex justify-between font-mono text-[12px] text-faint"><span>$1</span><span>{fmtUsd(max)} available</span></div>
              <div className="mt-6 flex flex-wrap gap-2">
                {[...new Set([10, Math.floor(max / 2), max])].filter((v) => v >= 1 && v <= max).map((v) => (
                  <button key={v} onClick={() => setAmount(v)} className={`press rounded-lg border px-3.5 py-1.5 font-mono text-[13.5px] ${v === amount ? "border-terra bg-terra-soft text-terra" : "border-line text-muted hover:text-ink"}`}>{fmtUsd(v)}</button>
                ))}
              </div>
              <Button className="mt-8 min-h-12 w-full text-[15px]" loading={busy === "draw"} onClick={draw} icon={<Lightning className="size-4" weight="fill" />}>
                Get {fmtUsd(amount)} now
              </Button>
            </>
          )}
          <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
          <AnimatePresence>
            {done && (
              <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-terra/40 bg-terra-soft p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="size-6 text-terra" weight="fill" />
                  <div><div className="font-semibold">{fmtUsd(done.amount)} is in your account</div><Proof hash={done.hash} block={done.block} ms={done.ms} /></div>
                </div>
                <Link href="/app/get-paid" className="inline-flex items-center gap-1 text-[13.5px] text-terra">Now get paid <ArrowRight className="size-3.5" /></Link>
              </motion.div>
            )}
          </AnimatePresence>
        </Panel>

        <div className="space-y-4 lg:col-span-5">
          <Panel>
            <Label>The whole cost, in dollars</Label>
            <dl className="mt-4 space-y-3 text-[14.5px]">
              <Row k="You get now" v={fmtUsd(amount)} />
              <Row k="Flat fee (2%)" v={fmtUsd(fee)} />
              <Row k="You pay back" v={fmtUsd(amount + fee)} strong />
              <Row k="Interest, late fees" v="None" />
              <Row k="A payday loan would cost" v={fmtUsd(amount * 0.15)} muted />
            </dl>
          </Panel>
          <Panel>
            <Label>How it repays itself</Label>
            <p className="mt-3 text-[14.5px]">
              {Math.round(share * 100)}% of each payment you receive goes to this advance, in the same transaction. After about{" "}
              <span className="font-mono text-terra">{fmtUsd(incomeToRepay, 0)}</span> of income, it&apos;s fully repaid.
            </p>
            <div className="mt-4 flex h-3 overflow-hidden rounded-full">
              <div className="bg-monad" style={{ width: `${share * 100}%` }} title="Repays advance" />
              <div className="flex-1 bg-terra" title="To you" />
            </div>
            <div className="mt-2 flex justify-between text-[12px] text-muted"><span className="text-monad-hi">{Math.round(share * 100)}% repays</span><span className="text-terra">{Math.round((1 - share) * 100)}% to you</span></div>
          </Panel>
          {c.owed > 0 && (
            <Panel>
              <div className="flex items-center justify-between gap-3">
                <div><Label>You owe</Label><div className="num mt-1 font-mono text-2xl text-monad-hi">{fmtUsd(c.owed)}</div></div>
                {activity.balance >= 1 && <Button variant="secondary" loading={busy === "repay"} onClick={repayEarly}>Repay {fmtUsd(Math.min(c.owed, activity.balance))} early</Button>}
              </div>
            </Panel>
          )}
        </div>
        <div className="lg:col-span-12"><TierLadder tier={c.tier} repayments={c.repayments} /></div>
      </div>
    </>
  );
}

function Row({ k, v, strong, muted }: { k: string; v: string; strong?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "border-t border-line pt-3 font-semibold" : ""} ${muted ? "text-muted" : ""}`}>
      <dt className={strong ? "" : "text-muted"}>{k}</dt><dd className="num font-mono">{v}</dd>
    </div>
  );
}
