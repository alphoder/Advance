"use client";

import Link from "next/link";
import { plainError } from "@/lib/errors";
import { useState } from "react";
import { motion } from "motion/react";
import { ShieldCheck, Rocket, Coins } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { api, sendTx } from "@/lib/tx";
import { erc20Abi, poolAbi, Tranche } from "@/lib/abi";
import { D, IS_TESTNET } from "@/lib/chain";
import { PageHeader } from "@/components/app/bits";
import { Button, ErrorNote, Panel, Label, Proof, Stat, Skeleton, fmtUsd } from "@/components/ui";
import { AnyChainDeposit } from "@/components/any-chain";

export type Pool = {
  steady: number; boost: number; total: number; lentOut: number; cash: number; feesEarned: number; losses: number;
  utilisation: number; steadyPrice: number; boostPrice: number; advances: number; repayments: number; defaults: number;
};
export type Position = { shares: number; value: number; earned: number | null };
export type PoolResp = { pool: Pool; me?: { wallet: number; steady: Position; boost: Position } };

export default function EarnPage() {
  const { session } = useAccount();
  const { data, refresh } = usePoll<PoolResp>(`/api/pool${session ? `?lender=${session.address}` : ""}`);
  return (
    <>
      <PageHeader
        title="Save and earn"
        help={["Put dollars in Steady (safer) or Boost (higher return).", "Your dollars fund advances. Borrowers' 2% fees become your earnings.", "If a borrower never repays, Boost absorbs the loss before Steady loses anything.", "On the test network, \"Get test dollars\" gives you free pretend dollars to try it."]}
        sub="Your dollars fund advances for freelancers and sellers. Every advance pays a flat 2% fee; 90% of it goes to savers. Choose your risk."
        action={!session ? <Link href="/app"><Button>Sign in to deposit</Button></Link> : undefined}
      />
      {!data ? <Skeleton className="h-48" /> : <Health p={data.pool} />}
      {data && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <TrancheCard name="Steady" tranche={Tranche.Steady} price={data.pool.steadyPrice} size={data.pool.steady} pos={data.me?.steady} wallet={data.me?.wallet} onDone={refresh}
            icon={<ShieldCheck className="size-6 text-ink" weight="duotone" />}
            blurb="Lower return. If a borrower misses a repayment, Boost savers absorb it before you lose anything." />
          <TrancheCard name="Boost" tranche={Tranche.Boost} price={data.pool.boostPrice} size={data.pool.boost} pos={data.me?.boost} wallet={data.me?.wallet} onDone={refresh} accent
            icon={<Rocket className="size-6 text-monad-hi" weight="duotone" />}
            blurb="Higher return. You absorb missed repayments first, and earn a bigger share of every fee for it." />
        </div>
      )}
      {session && data?.me && (
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5"><WalletCard wallet={data.me.wallet} onDone={refresh} /></div>
          <div className="lg:col-span-7"><AnyChainDeposit /></div>
        </div>
      )}
    </>
  );
}

function Health({ p }: { p: Pool }) {
  const cushion = p.total ? (p.boost / p.total) * 100 : 0;
  return (
    <Panel>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        <Stat label="In the pool" value={fmtUsd(p.total, 0)} />
        <Stat label="Lent out now" value={`${p.utilisation.toFixed(1)}%`} hint={fmtUsd(p.lentOut, 0)} tone="terra" />
        <Stat label="Fees earned by savers" value={fmtUsd(p.feesEarned)} tone="monad" />
        <Stat label="Missed repayments" value={String(p.defaults)} hint={`${fmtUsd(p.losses, 0)} written off`} />
      </div>
      <div className="mt-6">
        <div className="flex justify-between text-[12.5px] text-muted"><span>Boost cushion protecting Steady</span><span className="font-mono">{cushion.toFixed(0)}%</span></div>
        <div className="mt-2 flex h-3 gap-0.5 overflow-hidden rounded-full">
          <motion.div className="h-full rounded-l-full bg-monad" initial={{ width: 0 }} animate={{ width: `${cushion}%` }} transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }} />
          <div className="h-full flex-1 rounded-r-full bg-white/15" />
        </div>
      </div>
    </Panel>
  );
}

function TrancheCard({ name, tranche, price, size, blurb, pos, wallet, onDone, accent, icon }: {
  name: string; tranche: number; price: number; size: number; blurb: string; pos?: Position; wallet?: number; onDone: () => void; accent?: boolean; icon: React.ReactNode;
}) {
  const { session } = useAccount();
  const [amount, setAmount] = useState("100");
  const [busy, setBusy] = useState<"in" | "out">();
  const [error, setError] = useState<string>();
  const [last, setLast] = useState<{ hash: string; block: number; ms: number }>();

  async function deposit() {
    if (!session) return;
    const amt = BigInt(Math.round(Number(amount) * 1e6));
    if (amt <= 0n) return setError("Enter an amount");
    setBusy("in"); setError(undefined);
    try {
      await sendTx(session, { address: D.ausd, abi: erc20Abi, functionName: "approve", args: [D.pool, amt] });
      setLast(await sendTx(session, { address: D.pool, abi: poolAbi, functionName: "deposit", args: [tranche, amt] }));
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }
  async function withdraw() {
    if (!session || !pos?.shares) return;
    setBusy("out"); setError(undefined);
    try {
      setLast(await sendTx(session, { address: D.pool, abi: poolAbi, functionName: "withdraw", args: [tranche, BigInt(Math.round(pos.shares * 1e6))] }));
      onDone();
    } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }

  // The pair: Steady is terracotta, Boost is Monad purple. Solid cards, ink text on terracotta, white on purple.
  const ink = accent ? "text-white" : "text-[#1a0d08]";
  return (
    <div className={`rounded-3xl p-6 sm:p-7 ${accent ? "bg-monad" : "bg-terra"} ${ink}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-xl bg-black/15 [&_svg]:!text-current">{icon}</div>
          <div>
            <h3 className="text-2xl font-semibold tracking-tight">{name}</h3>
            <div className="font-mono text-[12.5px] opacity-75">{fmtUsd(size, 0)} deposited</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[12px] opacity-75">1 share is worth</div>
          <div className="num font-mono text-lg font-semibold">{fmtUsd(price, 6)}</div>
        </div>
      </div>
      <p className="mt-4 text-[14.5px] opacity-80">{blurb}</p>
      {pos && pos.shares > 0 && (
        <div className="mt-5 rounded-2xl bg-black/15 p-4">
          <div className="text-[12.5px] opacity-75">Your {name} savings</div>
          <div className="num mt-1 font-mono text-3xl font-semibold">{fmtUsd(pos.value, 4)}</div>
          <div className="text-[13px] opacity-80">
            {pos.earned === null ? "Includes shares bought on the market" : `${pos.earned >= 0 ? "Earned" : "Down"} ${fmtUsd(Math.abs(pos.earned), 6)} so far`}
          </div>
        </div>
      )}
      {session && (
        <div className="mt-5 space-y-2.5">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={`amt-${name}`}>Amount to deposit in {name}</label>
            <div className="flex min-h-11 flex-1 items-center rounded-xl bg-black/20 px-3 focus-within:ring-2 focus-within:ring-current/40">
              <span className="opacity-60">$</span>
              <input id={`amt-${name}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="w-full bg-transparent px-1 font-mono outline-none" />
            </div>
            <button onClick={deposit} disabled={!wallet || busy === "in"}
              className={`press inline-flex min-h-11 items-center gap-2 rounded-xl px-5 text-[14.5px] font-medium disabled:opacity-50 ${accent ? "bg-white text-[#2b1f7a] hover:bg-white/90" : "bg-[#1a0d08] text-terra-hi hover:bg-black"}`}>
              {busy === "in" ? "Depositing…" : "Deposit"}
            </button>
          </div>
          {pos && pos.shares > 0 && (
            <button onClick={withdraw} disabled={busy === "out"} className="press min-h-11 w-full rounded-xl border border-current/30 text-[14.5px] font-medium hover:bg-black/10 disabled:opacity-50">
              {busy === "out" ? "Withdrawing…" : "Withdraw everything"}
            </button>
          )}
          {last && <div className="[&_*]:!text-current"><Proof hash={last.hash} block={last.block} ms={last.ms} /></div>}
          {error && <p role="alert" className="rounded-xl bg-black/25 px-3 py-2 text-[13px]">{plainError(error)}</p>}
        </div>
      )}
    </div>
  );
}

function WalletCard({ wallet, onDone }: { wallet: number; onDone: () => void }) {
  const { session } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Panel className="h-full">
      <div className="flex items-center gap-2"><Coins className="size-5 text-terra" weight="duotone" /><Label>Your balance</Label></div>
      <div className="num mt-2 font-mono text-4xl font-semibold">{fmtUsd(wallet)} <span className="text-lg text-muted">AUSD</span></div>
      {IS_TESTNET && (
        <Button className="mt-5" variant="secondary" loading={busy}
          onClick={async () => {
            if (!session) return;
            setBusy(true); setError(undefined);
            try { await api("/api/faucet", { address: session.address, amount: 1000 }); onDone(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
          }}>
          Get $1,000 of test dollars
        </Button>
      )}
      <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
    </Panel>
  );
}
