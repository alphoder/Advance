"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { decodeEventLog, parseAbi, type Address, type Hex } from "viem";
import { useAccount } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { api } from "@/lib/tx";
import { factoryAbi, receivablesAbi, receiveAuthTypes } from "@/lib/abi";
import { D, IS_TESTNET, publicClient } from "@/lib/chain";
import { Button, Card, ErrorNote, Proof, fmtUsd, short, Spinner } from "@/components/ui";
import { SignIn } from "@/components/sign-in";

const domainAbi = parseAbi([
  "function eip712Domain() view returns (bytes1, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
]);

export function Pay({ borrower }: { borrower: Address }) {
  const q = useSearchParams();
  const { session, ready } = useAccount();
  const [amount, setAmount] = useState(q.get("amount") ?? "100");
  const memo = q.get("for");
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [done, setDone] = useState<{ hash: string; block: number; ms: number; repaid: number; toThem: number }>();
  const { data: bal, refresh } = usePoll<{ balance: number }>(session ? `/api/activity?address=${session.address}` : undefined, 3000);

  if (!ready) return <Spinner />;

  async function pay() {
    if (!session) return;
    const value = BigInt(Math.round(Number(amount) * 1e6));
    if (value <= 0n) return setError("Enter an amount");
    setError(undefined);
    try {
      setBusy("Waiting for your approval…");
      const account = await publicClient.readContract({ address: D.factory, abi: factoryAbi, functionName: "predict", args: [borrower] });
      const [, name, version, chainId, verifyingContract] = await publicClient.readContract({ address: D.ausd, abi: domainAbi, functionName: "eip712Domain" });
      const nonce = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, "0")).join("")}` as Hex;
      const message = { from: session.address, to: account, value, validAfter: 0n, validBefore: BigInt(Math.floor(Date.now() / 1000) + 600), nonce };
      // A signature, not a transaction: the payer never needs gas. Advance relays it.
      const signature = await session.wallet.signTypedData({
        domain: { name, version, chainId: Number(chainId), verifyingContract },
        types: receiveAuthTypes,
        primaryType: "ReceiveWithAuthorization",
        message,
      });
      setBusy("Sending…");
      const started = performance.now();
      const r = await api<{ hash: Hex; block: number }>("/api/relay", {
        borrower,
        from: message.from,
        value: value.toString(),
        validAfter: "0",
        validBefore: message.validBefore.toString(),
        nonce,
        signature,
      });
      const ms = Math.round(performance.now() - started);
      const receipt = await publicClient.getTransactionReceipt({ hash: r.hash });
      let repaid = 0, toThem = Number(value) / 1e6;
      for (const l of receipt.logs) {
        try {
          const d = decodeEventLog({ abi: receivablesAbi, data: l.data, topics: l.topics });
          if (d.eventName === "PaymentSplit") { repaid = Number(d.args.repaid) / 1e6; toThem = Number(d.args.toBorrower) / 1e6; }
        } catch {}
      }
      setDone({ hash: r.hash, block: r.block, ms, repaid, toThem });
      refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(undefined);
    }
  }

  if (done)
    return (
      <Card className="pop text-center">
        <div className="mx-auto grid size-14 place-items-center rounded-full bg-green-soft text-2xl text-green">✓</div>
        <h1 className="num mt-4 text-4xl">Paid {fmtUsd(Number(amount))}</h1>
        <p className="mt-2 text-muted">
          {fmtUsd(done.toThem)} reached {short(borrower)} instantly{done.repaid > 0 ? `, and ${fmtUsd(done.repaid)} paid down their advance` : ""}. One transaction.
        </p>
        <div className="mt-4"><Proof hash={done.hash} block={done.block} ms={done.ms} /></div>
      </Card>
    );

  return (
    <div className="space-y-4">
      <Card>
        <div className="text-[13px] font-medium uppercase tracking-wide text-muted">Payment request</div>
        <h1 className="num mt-1 text-4xl">Pay {short(borrower)}</h1>
        {memo && <p className="mt-1 text-muted">For: {memo}</p>}
        <label htmlFor="amount" className="mt-5 block text-[14px] font-medium">Amount (US dollars)</label>
        <div className="mt-1 flex min-h-14 items-center rounded-2xl border border-line bg-paper px-4">
          <span className="num text-3xl text-muted">$</span>
          <input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="num w-full bg-transparent px-1 text-3xl outline-none" />
        </div>
        <p className="mt-2 text-[13px] text-muted">Paid in AUSD, a US dollar stablecoin. No fees for you.</p>
      </Card>
      {!session ? (
        <SignIn title="Sign in to pay" subtitle="Use Face ID or your fingerprint. No wallet or app to install." />
      ) : (
        <Card className="space-y-3">
          <div className="flex justify-between text-[15px]">
            <span className="text-muted">Your balance</span>
            <span className="num text-xl">{bal ? fmtUsd(bal.balance) : "…"}</span>
          </div>
          {IS_TESTNET && bal && bal.balance < Number(amount) && (
            <Button
              variant="secondary" className="w-full"
              onClick={async () => { setError(undefined); try { await api("/api/faucet", { address: session.address, amount: 1000 }); refresh(); } catch (e) { setError((e as Error).message); } }}
            >
              Get $1,000 of test dollars
            </Button>
          )}
          <Button variant="violet" className="w-full" loading={Boolean(busy)} onClick={pay} disabled={!bal || bal.balance < Number(amount)}>
            {busy ?? `Pay ${fmtUsd(Number(amount) || 0)}`}
          </Button>
          <ErrorNote>{error}</ErrorNote>
        </Card>
      )}
    </div>
  );
}

