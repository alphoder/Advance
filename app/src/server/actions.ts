import { parseEther, parseSignature, type Address, type Hex } from "viem";
import { D, publicClient, USD, IS_TESTNET } from "@/lib/chain";
import { ausdAbi, creditAbi, factoryAbi, receivablesAbi, receiveAuthTypes, erc20Abi } from "@/lib/abi";
import { send, wallet, relayer, demoAccount, signTransferAuth, tokenDomain, randomNonce, assertFuel } from "./relayer";
import { HttpError } from "./http";

export const dollars = (n: number) => BigInt(Math.round(n * 1e6)) * (USD / 1_000_000n);

export async function ensureAccount(borrower: Address) {
  const existing = await publicClient.readContract({ address: D.factory, abi: factoryAbi, functionName: "accountOf", args: [borrower] });
  if (existing !== "0x0000000000000000000000000000000000000000") return { account: existing, hash: undefined };
  const { hash } = await send({ address: D.factory, abi: factoryAbi, functionName: "open", args: [borrower] });
  const account = await publicClient.readContract({ address: D.factory, abi: factoryAbi, functionName: "accountOf", args: [borrower] });
  return { account, hash };
}

export async function setLimit(borrower: Address, limitUsd: number) {
  return send({ address: D.creditLine, abi: creditAbi, functionName: "setLimit", args: [borrower, dollars(limitUsd)] });
}

export async function faucet(to: Address, amountUsd: number) {
  if (!IS_TESTNET) throw new HttpError(400, "The faucet only exists on testnet");
  return send({ address: D.ausd, abi: ausdAbi, functionName: "faucet", args: [to, dollars(amountUsd)] });
}

/** A demo client pays `to` with a signed EIP-3009 transfer; the relayer pays gas. */
export async function demoClientPays(client: string, to: Address, amountUsd: number) {
  const c = demoAccount(client);
  const value = dollars(amountUsd);
  const bal = await publicClient.readContract({ address: D.ausd, abi: erc20Abi, functionName: "balanceOf", args: [c.address] });
  if (bal < value) await faucet(c.address, Math.max(1000, amountUsd));
  const a = await signTransferAuth(c, to, value);
  const { v, r, s } = parseSignature(a.sig);
  return send({
    address: D.ausd,
    abi: ausdAbi,
    functionName: "transferWithAuthorization",
    args: [a.from, a.to, a.value, a.validAfter, a.validBefore, a.nonce, Number(v ?? 27n), r, s],
  });
}

/** A client pays a borrower's Advance address; repayment and payout settle in the same transaction. */
export async function relayPayment(p: {
  account: Address; from: Address; value: bigint; validAfter: bigint; validBefore: bigint; nonce: Hex; signature: Hex;
}) {
  const { v, r, s } = parseSignature(p.signature);
  return send({
    address: p.account,
    abi: receivablesAbi,
    functionName: "payWithAuthorization",
    args: [p.from, p.value, p.validAfter, p.validBefore, p.nonce, Number(v ?? 27n), r, s],
  });
}

export async function demoClientPaysAccount(client: string, borrower: Address, amountUsd: number) {
  const { account } = await ensureAccount(borrower);
  const c = demoAccount(client);
  const value = dollars(amountUsd);
  const bal = await publicClient.readContract({ address: D.ausd, abi: erc20Abi, functionName: "balanceOf", args: [c.address] });
  if (bal < value) await faucet(c.address, Math.max(1000, amountUsd));
  const message = { from: c.address, to: account, value, validAfter: 0n, validBefore: BigInt(Math.floor(Date.now() / 1000) + 3600), nonce: randomNonce() };
  const signature = await c.signTypedData({ domain: await tokenDomain(), types: receiveAuthTypes, primaryType: "ReceiveWithAuthorization", message });
  return relayPayment({ account, ...message, signature });
}

/** Gas drip: users never buy MON. Tops a new account up to a small working balance. */
/** Tops a user up so their next transaction's fee is covered: at least the base amount, at most a cap. */
export async function dripGas(to: Address, need = 0n) {
  const base = parseEther(IS_TESTNET ? "0.05" : "0.02");
  const cap = parseEther(IS_TESTNET ? "0.5" : "0.1"); // bounds what any one request can take from the relayer
  const wanted = (need * 110n) / 100n;
  const target = wanted > cap ? cap : wanted > base ? wanted : base;
  const bal = await publicClient.getBalance({ address: to });
  if (need > 0n ? bal >= need : bal >= base / 2n) return undefined; // already covered: nothing to send
  await assertFuel();
  const hash = await wallet.sendTransaction({ to, value: target - bal, gas: 21_000n, account: relayer, chain: wallet.chain });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
