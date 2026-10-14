import { formatEther } from "viem";
import { handler } from "@/server/http";
import { fetchLogs } from "@/server/logs";
import { relayer } from "@/server/relayer";
import { D, publicClient } from "@/lib/chain";
import { erc20Abi, kuruBookAbi, poolAbi } from "@/lib/abi";

/** One call that says whether the live demo can serve a visitor end to end, and if not, why. */
export const GET = handler(async () => {
  const checks: Record<string, { ok: boolean; detail: string }> = {};
  const check = async (name: string, fn: () => Promise<[boolean, string]>) => {
    try { const [ok, detail] = await fn(); checks[name] = { ok, detail }; } catch (e) { checks[name] = { ok: false, detail: String((e as Error).message).slice(0, 160) }; }
  };
  await Promise.all([
    check("rpc", async () => { const b = await publicClient.getBlockNumber(); return [b > 0n, `block ${b}`]; }),
    check("hypersync", async () => { const l = await fetchLogs({ address: [D.creditLine], topics: [], fromBlock: D.startBlock }); return [l.length > 0, `${l.length} CreditLine events indexed`]; }),
    check("fuel", async () => {
      const [tank, rel] = await Promise.all([D.gasTank ? publicClient.getBalance({ address: D.gasTank }) : Promise.resolve(0n), publicClient.getBalance({ address: relayer.address })]);
      const total = Number(formatEther(tank + rel));
      return [total >= 1, `GasTank ${Number(formatEther(tank)).toFixed(2)} + relayer ${Number(formatEther(rel)).toFixed(2)} MON (~${Math.floor(total)} judge sessions)`];
    }),
    check("pool", async () => { const cash = await publicClient.readContract({ address: D.ausd, abi: erc20Abi, functionName: "balanceOf", args: [D.pool] }); return [cash >= 1_000_000_000n, `$${(Number(cash) / 1e6).toFixed(0)} available to lend`]; }),
    check("kuru", async () => {
      if (!D.kuruMarket) return [true, "no market on this chain"];
      const [[bid, ask], nav] = await Promise.all([
        publicClient.readContract({ address: D.kuruMarket, abi: kuruBookAbi, functionName: "bestBidAsk" }) as Promise<readonly [bigint, bigint]>,
        publicClient.readContract({ address: D.pool, abi: poolAbi, functionName: "sharePrice", args: [1] }) as Promise<bigint>,
      ]);
      const n = Number(nav) / 1e6, gap = (Number(ask) / 1e18 / n - 1) * 100;
      return [bid > 0n && Math.abs(gap) < 10, `bid ${(Number(bid) / 1e18).toFixed(4)} ask ${(Number(ask) / 1e18).toFixed(4)} NAV ${n.toFixed(4)} (${gap.toFixed(1)}%)`];
    }),
    check("assistant", async () => [Boolean(process.env.GEMINI_API_KEY), process.env.GEMINI_API_KEY ? "key set" : "GEMINI_API_KEY missing"]),
  ]);
  return { ok: Object.values(checks).every((c) => c.ok), checks };
});
