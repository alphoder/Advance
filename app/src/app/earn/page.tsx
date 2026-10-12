"use client";

import { useState } from "react";
import { useAccount } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { api, sendTx } from "@/lib/tx";
import { erc20Abi, poolAbi, Tranche } from "@/lib/abi";
import { D, IS_TESTNET } from "@/lib/chain";
import { Nav, Footer, Button, Card, ErrorNote, Proof, fmtUsd, Label, Spinner } from "@/components/ui";
import { SignIn } from "@/components/sign-in";
import { SharedWithMe } from "@/components/vault";
import { KuruPanel } from "@/components/kuru";
import { AnyChainDeposit } from "@/components/any-chain";

type Pool = {
  steady: number; boost: number; total: number; lentOut: number; cash: number; feesEarned: number; losses: number;
  utilisation: number; steadyPrice: number; boostPrice: number; advances: number; repayments: number; defaults: number;
};
type Position = { shares: number; value: number; earned: number | null };
type PoolResp = { pool: Pool; me?: { wallet: number; steady: Position; boost: Position } };

export default function Earn() {
  const { session, ready } = useAccount();
  const { data, refresh } = usePoll<PoolResp>(`/api/pool${session ? `?lender=${session.address}` : ""}`);
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-4xl space-y-4 px-4 sm:px-6">
        <section className="pb-4 pt-6">
          <h1 className="num text-5xl sm:text-6xl">Earn from real borrower fees</h1>
          <p className="mt-3 max-w-2xl text-lg text-muted">
            Your dollars fund advances for freelancers and sellers. Each advance pays a flat 2% fee: 90% goes to savers like you.
            Pick how much risk you want.
          </p>
        </section>
        {!data ? <div className="py-10 text-center"><Spinner /></div> : <Health p={data.pool} />}
        {data && (
          <div className="grid gap-4 md:grid-cols-2">
            <TrancheCard
              name="Steady" tranche={Tranche.Steady} price={data.pool.steadyPrice} size={data.pool.steady}
              blurb="Lower return. If a borrower misses a repayment, Boost savers absorb it before you lose anything."
              pos={data.me?.steady} wallet={data.me?.wallet} onDone={refresh}
            />
            <TrancheCard
              name="Boost" tranche={Tranche.Boost} price={data.pool.boostPrice} size={data.pool.boost}
              blurb="Higher return. You absorb missed repayments first, and earn a bigger share of every fee for it."
              pos={data.me?.boost} wallet={data.me?.wallet} onDone={refresh} accent
            />
          </div>
        )}
        {data && <KuruPanel nav={data.pool.boostPrice} myShares={data.me?.boost.shares ?? 0} onDone={refresh} />}
        {ready && !session && <div className="pt-4"><SignIn title="Sign in to start earning" /></div>}
        {session && data?.me && <Wallet wallet={data.me.wallet} onDone={refresh} />}
        <AnyChainDeposit />
        {session && <SharedWithMe />}
        <Card className="text-[15px] text-muted">
          <b className="text-ink">Want to sell instead of waiting?</b> Boost shares are a token (advJR) that can trade on a Kuru order book, so you can
          exit any time at the market price. <b className="text-ink">Coming from another chain?</b> Deposit USDC from Base, Arbitrum and more through
          Aurora Intents; it arrives here as AUSD.
        </Card>
      </main>
      <Footer />
    </>
  );
}

function Health({ p }: { p: Pool }) {
  const cushion = p.total ? (p.boost / p.total) * 100 : 0;
  const stats = [
    ["In the pool", fmtUsd(p.total, 0)],
    ["Lent out now", `${fmtUsd(p.lentOut, 0)} · ${p.utilisation.toFixed(1)}%`],
    ["Fees earned by savers", fmtUsd(p.feesEarned)],
    ["Advances funded", String(p.advances)],
    ["Repayments", String(p.repayments)],
    ["Missed repayments", `${p.defaults} (${fmtUsd(p.losses, 0)})`],
  ];
  return (
    <Card>
      <Label>Pool health · live</Label>
      <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
        {stats.map(([k, v]) => (
          <div key={k}>
            <div className="text-[13px] text-muted">{k}</div>
            <div className="num text-2xl sm:text-3xl">{v}</div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <div className="flex justify-between text-[13px] text-muted">
          <span>Protection for Steady savers (Boost cushion)</span><span>{cushion.toFixed(0)}% of the pool</span>
        </div>
        <div className="mt-1.5 flex h-3 overflow-hidden rounded-full bg-line">
          <div className="h-full bg-violet" style={{ width: `${cushion}%` }} title="Boost" />
          <div className="h-full bg-ink/80" style={{ width: `${100 - cushion}%` }} title="Steady" />
        </div>
      </div>
    </Card>
  );
}

function TrancheCard({
  name, tranche, price, size, blurb, pos, wallet, onDone, accent,
}: {
  name: string; tranche: number; price: number; size: number; blurb: string; pos?: Position; wallet?: number; onDone: () => void; accent?: boolean;
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

  return (
    <Card className={accent ? "border-violet/40" : ""}>
      <div className="flex items-baseline justify-between">
        <h2 className={`num text-4xl ${accent ? "text-violet" : ""}`}>{name}</h2>
        <span className="text-[13px] text-muted">{fmtUsd(size, 0)} in {name}</span>
      </div>
      <p className="mt-2 text-muted">{blurb}</p>
      <div className="mt-4 text-[13px] text-muted">Value of 1 share: <span className="num text-xl text-ink">{fmtUsd(price, 6)}</span></div>
      {pos && pos.shares > 0 && (
        <div className="mt-4 rounded-2xl bg-paper p-4">
          <div className="text-[13px] text-muted">Your {name} savings</div>
          <div className="num text-4xl">{fmtUsd(pos.value, 4)}</div>
          {pos.earned === null ? (
            <div className="text-[14px] text-muted">Includes shares bought on the market</div>
          ) : (
            <div className={`text-[14px] ${pos.earned >= 0 ? "text-green" : "text-red"}`}>
              {pos.earned >= 0 ? "You've earned " : "Down "}{fmtUsd(Math.abs(pos.earned), 6)} so far
            </div>
          )}
        </div>
      )}
      {session && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <label className="sr-only" htmlFor={`amt-${name}`}>Amount</label>
            <div className="flex min-h-11 flex-1 items-center rounded-full border border-line bg-paper px-4">
              <span className="text-muted">$</span>
              <input id={`amt-${name}`} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="w-full bg-transparent px-1 outline-none" />
            </div>
            <Button variant={accent ? "violet" : "primary"} loading={busy === "in"} onClick={deposit} disabled={!wallet}>Deposit</Button>
          </div>
          {pos && pos.shares > 0 && (
            <Button variant="secondary" className="w-full" loading={busy === "out"} onClick={withdraw}>Withdraw everything</Button>
          )}
          {last && <Proof hash={last.hash} block={last.block} ms={last.ms} />}
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Card>
  );
}

function Wallet({ wallet, onDone }: { wallet: number; onDone: () => void }) {
  const { session } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <Label>Your balance</Label>
        <div className="num text-3xl">{fmtUsd(wallet)} <span className="text-lg text-muted">AUSD</span></div>
      </div>
      {IS_TESTNET && (
        <Button
          variant="secondary" loading={busy}
          onClick={async () => {
            if (!session) return;
            setBusy(true); setError(undefined);
            try { await api("/api/faucet", { address: session.address, amount: 1000 }); onDone(); }
            catch (e) { setError((e as Error).message); } finally { setBusy(false); }
          }}
        >
          Get $1,000 of test dollars
        </Button>
      )}
      <ErrorNote>{error}</ErrorNote>
    </Card>
  );
}
