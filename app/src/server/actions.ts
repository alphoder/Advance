import { parseEther, parseSignature, type Address, type Hex } from "viem";
import { D, publicClient, USD, IS_TESTNET } from "@/lib/chain";
import { ausdAbi, creditAbi, factoryAbi, receivablesAbi, receiveAuthTypes, erc20Abi, kuruBookAbi, poolAbi } from "@/lib/abi";
import { send, wallet, relayer, demoAccount, signTransferAuth, tokenDomain, randomNonce, assertFuel, tankAbi } from "./relayer";
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
  const cap = parseEther(IS_TESTNET ? "0.8" : "0.1"); // bounds what any one request can take from the relayer
  const wanted = (need * 110n) / 100n;
  const target = wanted > cap ? cap : wanted > base ? wanted : base;
  const bal = await publicClient.getBalance({ address: to });
  if (need > 0n ? bal >= need : bal >= base / 2n) return undefined; // already covered: nothing to send
  await assertFuel();
  // Through the tank: Monad reverts value sends that take an EOA under its 10 MON reserve. send() throws on a revert.
  if (D.gasTank) return (await send({ address: D.gasTank, abi: tankAbi, functionName: "drip", args: [to, target - bal] })).hash;
  const hash = await wallet.sendTransaction({ to, value: target - bal, gas: 21_000n, account: relayer, chain: wallet.chain });
  const r = await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 }).catch(() => undefined); // the client re-checks the balance itself
  if (r?.status === "reverted") throw new HttpError(503, "The demo is very busy right now. Please try again in a little while.");
  return hash;
}

/**
 * Keeps the Kuru advJR book near the pool's NAV. Buyers push the AMM price up and the book is shallow on
 * testnet, so when the best bid is more than 2% above NAV the relayer sells a little of its seeded Boost
 * inventory into it: the same mint-at-NAV, sell-on-Kuru arbitrage any saver could do. At most once a minute.
 * ponytail: sell side only (visitors buy far more than they sell); add a buy side if the book ever trades below NAV.
 */
let lastKeep = 0;
export async function keepKuruAtNav() {
  const market = D.kuruMarket;
  if (!market || Date.now() - lastKeep < 60_000) return;
  lastKeep = Date.now();
  const STEP = 30_000_000n; // 30 advJR
  for (let i = 0; i < 4; i++) {
    const [[bid], nav, inv] = await Promise.all([
      publicClient.readContract({ address: market, abi: kuruBookAbi, functionName: "bestBidAsk" }) as Promise<readonly [bigint, bigint]>,
      publicClient.readContract({ address: D.pool, abi: poolAbi, functionName: "sharePrice", args: [1] }) as Promise<bigint>,
      publicClient.readContract({ address: D.juniorToken, abi: erc20Abi, functionName: "balanceOf", args: [relayer.address] }),
    ]);
    if (Number(bid) / 1e18 <= (Number(nav) / 1e6) * 1.02 || inv < STEP) return;
    await send({ address: market, abi: kuruBookAbi, functionName: "placeAndExecuteMarketSell", args: [STEP, 0n, false, false] });
  }
}
