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
  const hash = await session.wallet.writeContract({ ...req, gas: (gas * 115n) / 100n } as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, pollingInterval: 250 });
  if (receipt.status !== "success") throw new Error("The transaction was reverted");
  return { hash, block: Number(receipt.blockNumber), ms: Math.round(performance.now() - started) };
}

export async function api<T = Record<string, unknown>>(path: string, body?: object): Promise<T> {
  const res = await fetch(path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const json = await res.json().catch(() => ({ error: `Request failed (${res.status})` }));
  if (!res.ok || json.error) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json as T;
}
