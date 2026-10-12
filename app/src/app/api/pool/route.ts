import { decodeEventLog, toEventSelector, type Hex } from "viem";
import { handler, addr } from "@/server/http";
import { fetchLogs, addrTopic } from "@/server/logs";
import { D, publicClient, USD } from "@/lib/chain";
import { poolAbi, erc20Abi, creditAbi } from "@/lib/abi";

const usd = (v: bigint) => Number(v) / Number(USD);
// share maths rounds down by up to 1 micro-dollar; don't show that as a loss
const dust = (n: number) => (Math.abs(n) < 0.00001 ? 0 : n);
const ev = (n: string) => toEventSelector((poolAbi as readonly { type: string; name?: string }[]).find((x) => x.type === "event" && x.name === n) as never);
const read = (functionName: string, args: unknown[] = []) =>
  publicClient.readContract({ address: D.pool, abi: poolAbi, functionName: functionName as never, args: args as never }) as Promise<bigint>;

/** Pool health for everyone, plus the caller's position if `lender` is given. */
export const GET = handler(async (req) => {
  const lenderParam = new URL(req.url).searchParams.get("lender");
  const [senior, junior, outstanding, fees, losses, util, seniorPrice, juniorPrice, cash] = await Promise.all([
    read("seniorAssets"), read("juniorAssets"), read("outstanding"), read("totalFeesEarned"), read("totalLosses"),
    read("utilisationBps"), read("sharePrice", [0]), read("sharePrice", [1]),
    publicClient.readContract({ address: D.ausd, abi: erc20Abi, functionName: "balanceOf", args: [D.pool] }),
  ]);
  const feeTopics = await fetchLogs({ address: [D.creditLine], topics: [[toEventSelector("Repaid(address,address,uint256,uint256)"), toEventSelector("Drawn(address,uint256,uint256)"), toEventSelector("Defaulted(address,uint256)")]], fromBlock: D.startBlock });
  let advances = 0, repayments = 0, defaults = 0;
  for (const l of feeTopics) {
    const d = decodeEventLog({ abi: creditAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
    if (d.eventName === "Drawn") advances++;
    else if (d.eventName === "Repaid") repayments++;
    else if (d.eventName === "Defaulted") defaults++;
  }

  const pool = {
    steady: usd(senior),
    boost: usd(junior),
    total: usd(senior + junior),
    lentOut: usd(outstanding),
    cash: usd(cash),
    feesEarned: usd(fees),
    losses: usd(losses),
    utilisation: Number(util) / 100,
    steadyPrice: Number(seniorPrice) / 1e6,
    boostPrice: Number(juniorPrice) / 1e6,
    advances,
    repayments,
    defaults,
  };
  if (!lenderParam) return { pool };

  const lender = addr(lenderParam, "lender");
  const [sShares, jShares, wallet, logs] = await Promise.all([
    publicClient.readContract({ address: D.seniorToken, abi: erc20Abi, functionName: "balanceOf", args: [lender] }),
    publicClient.readContract({ address: D.juniorToken, abi: erc20Abi, functionName: "balanceOf", args: [lender] }),
    publicClient.readContract({ address: D.ausd, abi: erc20Abi, functionName: "balanceOf", args: [lender] }),
    fetchLogs({ address: [D.pool], topics: [[ev("Deposit"), ev("Withdraw")], [addrTopic(lender)]], fromBlock: D.startBlock }),
  ]);
  const net = [0, 0];
  for (const l of logs) {
    const d = decodeEventLog({ abi: poolAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] });
    const a = d.args as { tranche: number; assets: bigint };
    net[a.tranche] += (d.eventName === "Deposit" ? 1 : -1) * usd(a.assets);
  }
  const steadyValue = (usd(sShares) * Number(seniorPrice)) / 1e6;
  const boostValue = (usd(jShares) * Number(juniorPrice)) / 1e6;
  return {
    pool,
    me: {
      wallet: usd(wallet),
      // Earnings vs. net deposits. Shares bought on Kuru have no deposit record, so we don't guess a cost basis.
      steady: { shares: usd(sShares), value: steadyValue, earned: net[0] > 0 ? dust(steadyValue - net[0]) : null },
      boost: { shares: usd(jShares), value: boostValue, earned: net[1] > 0 ? dust(boostValue - net[1]) : null },
    },
  };
});
