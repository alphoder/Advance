"use client";

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { sendTx } from "@/lib/tx";
import { erc20Abi, kuruBookAbi, KURU } from "@/lib/abi";
import { D, publicClient } from "@/lib/chain";
import { AddressLink, Button, ErrorNote, Label, Panel, Proof, fmtUsd } from "./ui";

/** Boost shares on a Kuru order book; the pool's share value is shown beside it as fair value. */
export function KuruPanel({ nav, myShares, onDone }: { nav: number; myShares: number; onDone: () => void }) {
  const market = D.kuruMarket;
  const { session } = useAccount();
  const [book, setBook] = useState<{ bid: number; ask: number }>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [last, setLast] = useState<{ hash: string; block: number; ms: number }>();
  const [usd, setUsd] = useState(10);

  useEffect(() => {
    if (!market) return;
    const read = () =>
      publicClient.readContract({ address: market, abi: kuruBookAbi, functionName: "bestBidAsk" })
        .then(([b, a]) => setBook({ bid: Number(b) / 1e18, ask: a > 10n ** 30n ? 0 : Number(a) / 1e18 }))
        .catch(() => {});
    read();
    const id = setInterval(read, 2000);
    return () => clearInterval(id);
  }, [market]);

  if (!market)
    return (
      <Panel>
        <Label>Kuru market</Label>
        <p className="mt-2 text-muted">The Boost market lists on Kuru when Advance is deployed to Monad testnet (<span className="font-mono">contracts/script/KuruMarket.s.sol</span>). It isn&apos;t live on this network.</p>
      </Panel>
    );

  const mid = book && book.bid && book.ask ? (book.bid + book.ask) / 2 : undefined;
  const gap = mid ? ((mid - nav) / nav) * 100 : undefined;
  const spread = book && book.bid && book.ask ? ((book.ask - book.bid) / book.ask) * 100 : undefined;

  async function trade(kind: "buy" | "sell") {
    if (!session || !book || !market) return;
    setBusy(kind); setError(undefined);
    try {
      if (kind === "sell") {
        const size = BigInt(Math.floor(myShares * 1e6));
        const minOut = (size * BigInt(Math.floor(book.bid * 0.97 * 1e6))) / 1_000_000n; // 3% slippage guard
        await sendTx(session, { address: D.juniorToken, abi: erc20Abi, functionName: "approve", args: [market, size] });
        setLast(await sendTx(session, { address: market, abi: kuruBookAbi, functionName: "placeAndExecuteMarketSell", args: [(size * KURU.sizePrecision) / 1_000_000n, minOut, false, false] }));
      } else {
        const dollars = BigInt(usd);
        const minOut = BigInt(Math.floor((usd / book.ask) * 0.97 * 1e6));
        await sendTx(session, { address: D.ausd, abi: erc20Abi, functionName: "approve", args: [market, dollars * 1_000_000n] });
        setLast(await sendTx(session, { address: market, abi: kuruBookAbi, functionName: "placeAndExecuteMarketBuy", args: [dollars * KURU.pricePrecision, minOut, false, false] }));
      }
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  // Price ladder: fair value centred, bid/ask placed relative to it (±5% window).
  const pos = (v: number) => `${Math.max(0, Math.min(100, 50 + ((v - nav) / nav) * 1000))}%`;

  return (
    <Panel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="live-dot size-1.5 rounded-full bg-monad text-monad" />
          <Label>advJR / AUSD on Kuru · live</Label>
        </div>
        <div className="text-[12.5px] text-muted">Market <AddressLink address={market} /></div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
        <div><Label>Best bid</Label><div className="num mt-1 font-mono text-3xl font-semibold text-terra">{book?.bid ? fmtUsd(book.bid, 4) : "…"}</div></div>
        <div><Label>Best ask</Label><div className="num mt-1 font-mono text-3xl font-semibold text-monad-hi">{book?.ask ? fmtUsd(book.ask, 4) : "…"}</div></div>
        <div><Label>Fair value (pool)</Label><div className="num mt-1 font-mono text-3xl font-semibold">{fmtUsd(nav, 4)}</div></div>
        <div><Label>Spread</Label><div className="num mt-1 font-mono text-3xl font-semibold">{spread !== undefined ? `${spread.toFixed(2)}%` : "…"}</div></div>
      </div>

      <div className="relative mt-8 h-14">
        <div className="absolute inset-x-0 top-6 h-px bg-line-strong" />
        <div className="absolute top-3 h-7 w-px bg-ink" style={{ left: "50%" }} />
        <div className="absolute top-11 -translate-x-1/2 text-[11.5px] text-muted" style={{ left: "50%" }}>fair value</div>
        {book?.bid ? <motion.div animate={{ left: pos(book.bid) }} transition={{ type: "spring", duration: 0.6, bounce: 0.1 }} className="absolute top-4 size-4 -translate-x-1/2 rounded-full bg-terra shadow-[0_0_14px_var(--terra)]" /> : null}
        {book?.ask ? <motion.div animate={{ left: pos(book.ask) }} transition={{ type: "spring", duration: 0.6, bounce: 0.1 }} className="absolute top-4 size-4 -translate-x-1/2 rounded-full bg-monad shadow-[0_0_14px_var(--monad)]" /> : null}
      </div>
      {gap !== undefined && (
        <p className="mt-2 text-[13.5px] text-muted">Market is trading <span className="font-mono text-ink">{Math.abs(gap).toFixed(2)}%</span> {gap >= 0 ? "above" : "below"} the onchain fair value.</p>
      )}

      {session ? (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <div className="rounded-3xl bg-monad p-5 text-white">
            <div className="flex items-center gap-2 text-[14px] font-medium"><ArrowUp className="size-4" weight="bold" /> Buy Boost</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[10, 50, 100].map((v) => (
                <button key={v} onClick={() => setUsd(v)} className={`press rounded-lg px-3 py-1.5 font-mono text-[13px] ${v === usd ? "bg-white text-[#2b1f7a]" : "bg-black/15 hover:bg-black/25"}`}>{fmtUsd(v)}</button>
              ))}
            </div>
            <button onClick={() => trade("buy")} disabled={busy === "buy"} className="press mt-4 min-h-11 w-full rounded-xl bg-white text-[14.5px] font-medium text-[#2b1f7a] hover:bg-white/90 disabled:opacity-50">
              {busy === "buy" ? "Buying…" : `Buy ${fmtUsd(usd)} of Boost`}
            </button>
          </div>
          <div className="rounded-3xl bg-terra p-5 text-[#1a0d08]">
            <div className="flex items-center gap-2 text-[14px] font-medium"><ArrowDown className="size-4" weight="bold" /> Sell Boost</div>
            <p className="mt-3 font-mono text-[13px] opacity-75">You hold {myShares.toLocaleString(undefined, { maximumFractionDigits: 4 })} shares</p>
            <button onClick={() => trade("sell")} disabled={busy === "sell" || myShares <= 0} className="press mt-4 min-h-11 w-full rounded-xl bg-[#1a0d08] text-[14.5px] font-medium text-terra-hi hover:bg-black disabled:opacity-50">
              {busy === "sell" ? "Selling…" : "Sell all my Boost"}
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-6 text-[14px] text-muted">Sign in to trade.</p>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">{last && <Proof hash={last.hash} block={last.block} ms={last.ms} />}</div>
      <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>
    </Panel>
  );
}
