"use client";

import type { Abi, Address, ContractFunctionArgs, ContractFunctionName } from "viem";
import { publicClient } from "./chain";
import type { useAccount } from "./account";

type Session = NonNullable<ReturnType<typeof useAccount>["session"]>;

/** Sends a contract call from the user's account. Monad bills the declared gas limit, so estimate + 15%. */
export async function sendTx<const abi extends Abi, fn extends ContractFunctionName<abi, "nonpayable" | "payable">>(
  session: Session,
  req: { address: Address; abi: abi; functionName: fn; args: ContractFunctionArgs<abi, "nonpayable" | "payable", fn> },
) {
  const started = performance.now();
  const gas = await publicClient.estimateContractGas({ ...req, account: session.wallet.account } as never);
  const limit = (gas * 115n) / 100n;
  // Monad requires gas limit × max fee up front (contract-creating calls like linking an agent need
  // ~0.13 MON), so ask the relayer for exactly that, then wait until the node checking us can see it.
  const { maxFeePerGas } = await publicClient.estimateFeesPerGas();
  const need = limit * maxFeePerGas;
  await api("/api/gas", { address: session.address, need: need.toString() }).catch(() => undefined);
  await untilFunded(session.address, need);
  // Monad's RPC can report a stale transaction count right after a confirmation, so back-to-back
  // transactions (approve then buy, register then link) would reuse a nonce. Track it here too.
  const send = async () => {
    const chainCount = await publicClient.getTransactionCount({ address: session.address, blockTag: "pending" });
    const nonce = Math.max(chainCount, nextNonce.get(session.address) ?? 0);
    const h = await session.wallet.writeContract({ ...req, gas: limit, nonce } as never);
    nextNonce.set(session.address, nonce + 1);
    return h;
  };
  let hash: `0x${string}` | undefined;
  // The node taking the transaction can lag a few seconds behind the one that confirmed the top-up
  // ("Signer had insufficient balance"), so keep trying for ~10s, re-asking for the top-up each time.
  for (let attempt = 0; !hash; attempt++) {
    try { hash = await send(); } catch (e) {
      const m = String((e as Error).message) + String((e as { details?: string }).details ?? "");
      if (attempt >= 5 || !/insufficient (funds|balance)|invalid params|Missing or invalid|nonce/i.test(m)) throw e;
      await new Promise((r) => setTimeout(r, 2000));
      await api("/api/gas", { address: session.address, need: need.toString() }).catch(() => undefined);
    }
  }
  const receipt = await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 250 });
  if (receipt.status !== "success") throw new Error("The transaction was reverted");
  return { hash, block: Number(receipt.blockNumber), ms: Math.round(performance.now() - started) };
}

const nextNonce = new Map<string, number>();

async function untilFunded(address: Address, need: bigint) {
  for (let i = 0; i < 12; i++) {
    if ((await publicClient.getBalance({ address }).catch(() => 0n)) >= need) return;
    await new Promise((r) => setTimeout(r, 500));
  }
}

export async function api<T = Record<string, unknown>>(path: string, body?: object): Promise<T> {
  const res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const json = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  if (!res.ok || json.error) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}
