import { decodeEventLog, toEventSelector, type Hex } from "viem";
import { handler, addr } from "@/server/http";
import { fetchLogs, addrTopic } from "@/server/logs";
import { D, publicClient, USD } from "@/lib/chain";
import { creditAbi, erc20Abi, factoryAbi, receivablesAbi } from "@/lib/abi";

const usd = (v: bigint) => Number(v) / Number(USD);
const sel = (abi: readonly unknown[], name: string) =>
  toEventSelector((abi as { type: string; name: string }[]).find((x) => x.type === "event" && x.name === name) as never);

/** Everything the borrower dashboard shows, straight from the chain. */
export const GET = handler(async (req) => {
  const borrower = addr(new URL(req.url).searchParams.get("address"));
  const [account, opened, credit, owed, available, balance, mon] = await Promise.all([
    publicClient.readContract({ address: D.factory, abi: factoryAbi, functionName: "predict", args: [borrower] }),
    publicClient.readContract({ address: D.factory, abi: factoryAbi, functionName: "accountOf", args: [borrower] }),
    publicClient.readContract({ address: D.creditLine, abi: creditAbi, functionName: "creditOf", args: [borrower] }),
    publicClient.readContract({ address: D.creditLine, abi: creditAbi, functionName: "owed", args: [borrower] }),
    publicClient.readContract({ address: D.creditLine, abi: creditAbi, functionName: "available", args: [borrower] }),
    publicClient.readContract({ address: D.ausd, abi: erc20Abi, functionName: "balanceOf", args: [borrower] }),
    publicClient.getBalance({ address: borrower }),
  ]);
  const shareBps = opened !== "0x0000000000000000000000000000000000000000"
    ? Number(await publicClient.readContract({ address: account, abi: receivablesAbi, functionName: "shareBps" }))
    : 2000;

  const [creditLogs, splitLogs] = await Promise.all([
    fetchLogs({
      address: [D.creditLine],
      topics: [["Drawn", "Repaid", "LimitSet", "TierUp", "Defaulted"].map((n) => sel(creditAbi, n)), [addrTopic(borrower)]],
      fromBlock: D.startBlock,
    }),
    fetchLogs({ address: [account], topics: [[sel(receivablesAbi, "PaymentSplit")]], fromBlock: D.startBlock }),
  ]);

  const events = [
    ...creditLogs.map((l) => ({ l, d: decodeEventLog({ abi: creditAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] }) })),
    ...splitLogs.map((l) => ({ l, d: decodeEventLog({ abi: receivablesAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] }) })),
  ]
    .map(({ l, d }) => {
      const a = d.args as Record<string, bigint | number | string>;
      const base = { type: d.eventName, tx: l.txHash, block: l.blockNumber, ts: l.timestamp, key: `${l.txHash}:${l.logIndex}` };
      switch (d.eventName) {
        case "PaymentSplit":
          return { ...base, payer: a.payer, amount: usd(a.amount as bigint), repaid: usd(a.repaid as bigint), toYou: usd(a.toBorrower as bigint) };
        case "Drawn":
          return { ...base, amount: usd(a.amount as bigint), fee: usd(a.fee as bigint) };
        case "Repaid":
          return { ...base, amount: usd((a.principal as bigint) + (a.fee as bigint)) };
        case "LimitSet":
          return { ...base, amount: usd(a.limit as bigint), tier: Number(a.tier) };
        case "TierUp":
          return { ...base, tier: Number(a.tier) };
        default:
          return { ...base, amount: usd(a.principalLost as bigint) };
      }
    })
    .sort((x, y) => y.block - x.block || y.key.localeCompare(x.key));

  return {
    account,
    accountOpen: opened !== "0x0000000000000000000000000000000000000000",
    shareBps,
    balance: usd(balance),
    gas: Number(mon) / 1e18,
    credit: {
      limit: usd(credit.limit),
      principal: usd(credit.principal),
      fee: usd(credit.fee),
      owed: usd(owed),
      available: usd(available),
      totalBorrowed: usd(credit.totalBorrowed),
      totalRepaid: usd(credit.totalRepaid),
      repayments: credit.repayments,
      tier: credit.tier,
      defaulted: credit.defaulted,
    },
    events,
  };
});
