"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { decodeEventLog, parseAbi, type Address, type Hex } from "viem";
import { useAccount } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { api } from "@/lib/tx";
import { factoryAbi, receivablesAbi, receiveAuthTypes } from "@/lib/abi";
import { D, IS_TESTNET, publicClient } from "@/lib/chain";
import { Button, Panel, ErrorNote, Proof, fmtUsd, short, Skeleton } from "@/components/ui";
import { CheckCircle, Fingerprint, ShieldCheck } from "@phosphor-icons/react";
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

  if (!ready) return <Skeleton className="h-96" />;

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
      <Panel className="pop p-8 text-center">
        <div className="mx-auto grid size-16 place-items-center rounded-full border border-terra/40 bg-terra-soft"><CheckCircle className="size-9 text-terra" weight="fill" /></div>
        <h1 className="num mt-5 text-4xl font-semibold">Paid {fmtUsd(Number(amount))}</h1>
        <p className="mx-auto mt-3 max-w-sm text-muted">
          {fmtUsd(done.toThem)} reached {short(borrower)} instantly{done.repaid > 0 ? `, and ${fmtUsd(done.repaid)} paid down their advance` : ""}. One transaction, no fees for you.
        </p>
        <div className="mt-5 flex justify-center"><Proof hash={done.hash} block={done.block} ms={done.ms} /></div>
      </Panel>
    );

  return (
    <div className="space-y-4">
      <Panel className="p-6 sm:p-8">
        <div className="text-[13px] font-medium text-muted">Payment request</div>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Pay <span className="font-mono">{short(borrower)}</span></h1>
        {memo && <p className="mt-1 text-muted">For: {memo}</p>}
        <label htmlFor="amount" className="mt-6 block text-[13.5px] font-medium">Amount (US dollars)</label>
        <div className="mt-2 flex min-h-16 items-center rounded-xl border border-line-strong bg-bg/60 px-4 focus-within:border-terra">
          <span className="font-mono text-3xl text-faint">$</span>
          <input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} className="num w-full bg-transparent px-1 font-mono text-3xl font-semibold outline-none" />
        </div>
        <p className="mt-3 flex items-center gap-2 text-[13px] text-muted"><ShieldCheck className="size-4 text-monad-hi" /> Paid in AUSD, a US dollar stablecoin. You sign, Advance covers the network fee.</p>
      </Panel>
      {!session ? (
        <SignIn title="Sign in to pay" subtitle="Use Face ID or your fingerprint. No wallet or app to install." />
      ) : (
        <Panel className="space-y-3">
          <div className="flex justify-between text-[15px]">
            <span className="text-muted">Your balance</span>
            <span className="num font-mono text-xl">{bal ? fmtUsd(bal.balance) : "…"}</span>
          </div>
          {IS_TESTNET && bal && bal.balance < Number(amount) && (
            <Button
              variant="secondary" className="w-full"
              onClick={async () => { setError(undefined); try { await api("/api/faucet", { address: session.address, amount: 1000 }); refresh(); } catch (e) { setError((e as Error).message); } }}
            >
              Get $1,000 of test dollars
            </Button>
          )}
          <Button className="min-h-12 w-full" icon={<Fingerprint className="size-5" weight="bold" />} loading={Boolean(busy)} onClick={pay} disabled={!bal || bal.balance < Number(amount)}>
            {busy ?? `Pay ${fmtUsd(Number(amount) || 0)}`}
          </Button>
          <ErrorNote>{error}</ErrorNote>
        </Panel>
      )}
    </div>
  );
}

