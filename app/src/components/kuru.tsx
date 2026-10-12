"use client";

import { useEffect, useState } from "react";
import { useAccount } from "@/lib/account";
import { sendTx } from "@/lib/tx";
import { erc20Abi, kuruBookAbi, KURU } from "@/lib/abi";
import { D, publicClient } from "@/lib/chain";
import { AddressLink, Button, Card, ErrorNote, Label, Proof, fmtUsd } from "./ui";

/** Boost shares trade on a Kuru order book; the pool's share value is shown beside it as fair value. */
export function KuruPanel({ nav, myShares, onDone }: { nav: number; myShares: number; onDone: () => void }) {
  const market = D.kuruMarket;
  const { session } = useAccount();
  const [book, setBook] = useState<{ bid: number; ask: number }>();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [last, setLast] = useState<{ hash: string; block: number; ms: number }>();

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

  if (!market) return null;
  const mid = book && book.bid && book.ask ? (book.bid + book.ask) / 2 : undefined;
  const gap = mid ? ((mid - nav) / nav) * 100 : undefined;

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
        const dollars = 10n;
        const minOut = BigInt(Math.floor((10 / book.ask) * 0.97 * 1e6));
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

  return (
    <Card>
      <Label>Trade Boost on Kuru · live order book</Label>
      <p className="mt-1 text-muted">Don&apos;t want to wait for cash to free up? Sell your Boost shares to another saver at the market price, any time.</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <div><div className="text-[13px] text-muted">Best bid</div><div className="num text-2xl">{book?.bid ? fmtUsd(book.bid, 4) : "—"}</div></div>
        <div><div className="text-[13px] text-muted">Best ask</div><div className="num text-2xl">{book?.ask ? fmtUsd(book.ask, 4) : "—"}</div></div>
        <div><div className="text-[13px] text-muted">Fair value (pool)</div><div className="num text-2xl">{fmtUsd(nav, 4)}</div></div>
      </div>
      {gap !== undefined && (
        <p className="mt-2 text-[14px] text-muted">
          Market is trading {Math.abs(gap).toFixed(2)}% {gap >= 0 ? "above" : "below"} the pool&apos;s share value, which is computed onchain from loans and losses.
        </p>
      )}
      {session && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" loading={busy === "buy"} onClick={() => trade("buy")}>Buy $10 of Boost</Button>
          {myShares > 0 && <Button variant="secondary" loading={busy === "sell"} onClick={() => trade("sell")}>Sell all my Boost</Button>}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[13px] text-muted">
        Market <AddressLink address={market} /> {last && <Proof hash={last.hash} block={last.block} ms={last.ms} />}
      </div>
      <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>
    </Card>
  );
}
