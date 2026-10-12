"use client";

import { useMemo, useState } from "react";
import { decodeEventLog, zeroAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import type { ScoreResult } from "@/server/score";
import { useAccount, walletFor, type Session } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { api, sendTx } from "@/lib/tx";
import { agentAbi, creditAbi, identityRegistryAbi, ERC8004_REGISTRY } from "@/lib/abi";
import { D, publicClient } from "@/lib/chain";
import { Nav, Footer, Button, Card, ErrorNote, Label, Proof, fmtUsd, short } from "@/components/ui";
import { SignIn } from "@/components/sign-in";
import { ScoreView } from "@/components/score-view";

type Activity = { credit: { limit: number; owed: number; available: number; repayments: number; tier: number }; balance: number; events: { type: string; key: string; tx: string; amount?: number; repaid?: number; toYou?: number }[] };

export default function Agents() {
  const { session, ready } = useAccount();
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 sm:px-6">
        <section className="pb-2 pt-6">
          <p className="inline-flex rounded-full bg-violet-soft px-3 py-1 text-[13px] font-medium text-violet">For AI agents that earn</p>
          <h1 className="num mt-4 text-5xl sm:text-6xl">Working capital for your AI agent</h1>
          <p className="mt-3 text-lg text-muted">
            Agents that sell services earn onchain. Advance lets them borrow against those earnings, and repays automatically from the next job.
            Your agent gets its own wallet from your passkey, and its identity comes from the ERC-8004 agent registry.
          </p>
        </section>
        {D.agentAdapter === zeroAddress ? (
          <Card><p className="text-muted">Agent credit runs on Monad testnet, where the ERC-8004 registry lives. It isn&apos;t set up on this network.</p></Card>
        ) : !ready ? null : !session ? (
          <SignIn title="Sign in to set up your agent" />
        ) : (
          <AgentFlow owner={session} />
        )}
      </main>
      <Footer />
    </>
  );
}

function AgentFlow({ owner }: { owner: Session }) {
  // One passkey, many keys: index 2 is the agent's own wallet.
  const agent = useMemo<Session>(() => {
    const account = privateKeyToAccount(owner.agentKey);
    return { ...owner, address: account.address, wallet: walletFor(account) };
  }, [owner]);
  const { data: agentId, refresh: refreshId } = usePoll<{ id: string }>(`/api/agent?address=${agent.address}`, 4000);
  const { data: act, refresh } = usePoll<Activity>(`/api/activity?address=${agent.address}`);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [score, setScore] = useState<ScoreResult>();
  const [proofs, setProofs] = useState<{ label: string; hash: string; ms?: number }[]>([]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setError(undefined);
    try { await fn(); refresh(); refreshId(); } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }
  const add = (label: string, hash: string, ms?: number) => setProofs((p) => [{ label, hash, ms }, ...p]);

  const registered = agentId && agentId.id !== "0";
  const c = act?.credit;

  return (
    <>
      <Card className="space-y-3">
        <Label>Your agent</Label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="num text-3xl">{registered ? `Agent #${agentId!.id}` : "Not registered yet"}</div>
            <div className="font-mono text-[13px] text-muted">wallet {short(agent.address)} · owned by {short(owner.address)}</div>
          </div>
          {!registered && (
            <Button
              variant="violet" loading={busy === "reg"}
              onClick={() => run("reg", async () => {
                const uri = `data:application/json,${encodeURIComponent(JSON.stringify({ name: "Advance demo agent", description: "Sells design reviews to other agents", wallet: agent.address }))}`;
                const r = await sendTx(owner, { address: ERC8004_REGISTRY, abi: identityRegistryAbi, functionName: "register", args: [uri] });
                const receipt = await publicClient.getTransactionReceipt({ hash: r.hash });
                const minted = receipt.logs.map((l) => { try { return decodeEventLog({ abi: identityRegistryAbi, data: l.data, topics: l.topics }); } catch { return null; } })
                  .find((d) => d?.eventName === "Transfer");
                if (!minted) throw new Error("Registry didn't return an agent ID");
                add(`Registered agent #${minted.args.tokenId} in ERC-8004`, r.hash);
                const l = await sendTx(owner, { address: D.agentAdapter, abi: agentAbi, functionName: "linkAgent", args: [minted.args.tokenId, agent.address] });
                add("Linked the agent to Advance (opened its payment address)", l.hash);
              })}
            >
              Register &amp; link agent
            </Button>
          )}
        </div>
      </Card>

      {registered && c && (
        <Card className="space-y-4">
          <Label>Agent credit line</Label>
          {c.limit === 0 ? (
            <div className="flex flex-wrap gap-2">
              <Button loading={busy === "earn"} onClick={() => run("earn", async () => {
                const r = await api<{ txs: { label: string; hash: string }[] }>("/api/demo/seed", { address: agent.address });
                r.txs.forEach((t) => add(t.label.replace("paid you", "paid your agent"), t.hash));
              })}>Demo: 4 customers pay the agent</Button>
              <Button variant="secondary" loading={busy === "score"} onClick={() => run("score", async () => {
                const r = await api<{ score: ScoreResult; txs: { label: string; hash: string }[] }>("/api/apply", { address: agent.address });
                setScore(r.score);
                r.txs.forEach((t) => add(t.label.replace("your", "the agent's"), t.hash));
              })}>Score the agent</Button>
            </div>
          ) : (
            <>
              <div>
                <div className="num text-6xl">{fmtUsd(c.available)}</div>
                <p className="text-muted">available to the agent · owes {fmtUsd(c.owed)} · repaid {c.repayments}×</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {c.available >= 1 && (
                  <Button variant="violet" loading={busy === "draw"} onClick={() => run("draw", async () => {
                    const amt = Math.floor(c.available);
                    const r = await sendTx(agent, { address: D.creditLine, abi: creditAbi, functionName: "draw", args: [BigInt(amt) * 1_000_000n] });
                    add(`Agent drew ${fmtUsd(amt)} of working capital (to buy compute)`, r.hash, r.ms);
                  })}>Agent borrows {fmtUsd(Math.floor(c.available))}</Button>
                )}
                <Button variant="secondary" loading={busy === "job"} onClick={() => run("job", async () => {
                  const r = await api<{ hash: string; ms: number }>("/api/demo/pay", { address: agent.address, amount: 40 });
                  add("A customer paid the agent $40 for a job: repayment taken in the same transaction", r.hash, r.ms);
                })}>Agent completes a $40 job</Button>
              </div>
            </>
          )}
          {score && <ScoreView s={score} compact />}
        </Card>
      )}

      {busy && <Card className="text-muted">Working onchain…</Card>}
      <ErrorNote>{error}</ErrorNote>
      {proofs.length > 0 && (
        <Card className="space-y-2">
          <Label>Onchain</Label>
          {proofs.map((p) => (
            <div key={p.hash + p.label} className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
              <span>✓ {p.label}</span><Proof hash={p.hash} ms={p.ms} />
            </div>
          ))}
        </Card>
      )}
      {act && act.events.filter((e) => e.type === "PaymentSplit").length > 0 && (
        <Card>
          <Label>Agent earnings</Label>
          <ul className="mt-2 divide-y divide-line text-[15px]">
            {act.events.filter((e) => e.type === "PaymentSplit").map((e) => (
              <li key={e.key} className="flex justify-between py-2">
                <span>Earned {fmtUsd(e.amount!)}</span>
                <span className="text-muted">{fmtUsd(e.repaid!)} repaid · {fmtUsd(e.toYou!)} kept</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
