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
  await api("/api/gas", { address: session.address }).catch(() => undefined);
  const gas = await publicClient.estimateContractGas({ ...req, account: session.wallet.account } as never);
  const limit = (gas * 115n) / 100n;
  // Monad executes slightly behind consensus: a fresh fee top-up can be confirmed yet not visible to the
  // node checking this transaction. Wait until the fee is covered, and retry once if it's still rejected.
  await untilFunded(session.address, limit * (await publicClient.getGasPrice()) * 2n);
  const send = () => session.wallet.writeContract({ ...req, gas: limit } as never);
  const hash = await send().catch(async (e) => {
    if (!/invalid params|Missing or invalid|insufficient funds/i.test(String((e as Error).message))) throw e;
    await new Promise((r) => setTimeout(r, 1500));
    return send();
  });
  const receipt = await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 250 });
  if (receipt.status !== "success") throw new Error("The transaction was reverted");
  return { hash, block: Number(receipt.blockNumber), ms: Math.round(performance.now() - started) };
}

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
