// Live smoke test of the deployed demo: node scripts/smoke.mjs [--health-only] [base-url]
// Checks /api/health, then (unless --health-only) a fresh account onboards, draws $50, and a client
// payment splits and repays it. Exits non-zero on any failure, so CI emails the team.
import { createPublicClient, createWalletClient, http, parseAbi, defineChain } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";

const healthOnly = process.argv.includes("--health-only");
const BASE = process.argv.find((a) => a.startsWith("http")) ?? "https://advance-monad.vercel.app";
const chain = defineChain({ id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } } });
const pc = createPublicClient({ chain, transport: http(undefined, { retryCount: 5, retryDelay: 300 }) });
const api = async (path, body) => {
  const r = await fetch(BASE + path, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {});
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`${path}: ${r.status} ${j.error ?? ""}`);
  return j;
};
const step = async (name, fn) => { const t = Date.now(); try { const out = await fn(); console.log(`ok   ${name} (${Date.now() - t} ms)${out ? " · " + out : ""}`); } catch (e) { console.log(`FAIL ${name}: ${e.message}`); process.exitCode = 1; throw e; } };

try {
  await step("health", async () => {
    const h = await api("/api/health");
    for (const [k, c] of Object.entries(h.checks)) console.log(`       ${c.ok ? "✓" : "✗"} ${k}: ${c.detail}`);
    if (!h.ok) throw new Error("a dependency is unhealthy (see above)");
  });
  if (!healthOnly) {
    const acct = privateKeyToAccount(generatePrivateKey());
    const w = createWalletClient({ account: acct, chain, transport: http() });
    const D = await (await fetch("https://raw.githubusercontent.com/alphoder/Advance/main/app/src/deployments/10143.json")).json();
    const credit = parseAbi(["function draw(uint256)", "function owed(address) view returns (uint256)"]);
    await step("onboard: clients pay, score, limit onchain", async () => {
      await api("/api/demo/seed", { address: acct.address });
      const a = await api("/api/apply", { address: acct.address });
      if (!a.score?.approved || a.score.limit < 50) throw new Error(`not approved (limit ${a.score?.limit})`);
      return `limit $${a.score.limit}`;
    });
    await step("draw $50 (user-signed, fees topped up)", async () => {
      const req = { address: D.creditLine, abi: credit, functionName: "draw", args: [50_000_000n], account: acct };
      const gas = (await pc.estimateContractGas(req)) * 115n / 100n;
      const f = await pc.estimateFeesPerGas(); const maxFeePerGas = f.maxFeePerGas * 3n / 2n;
      await api("/api/gas", { address: acct.address, need: (gas * maxFeePerGas * 2n).toString() });
      let hash;
      for (let i = 0; i < 6 && !hash; i++) { try { hash = await w.writeContract({ ...req, gas, maxFeePerGas, maxPriorityFeePerGas: f.maxPriorityFeePerGas }); } catch (e) { if (i === 5) throw e; await new Promise((r) => setTimeout(r, 2000)); } }
      const r = await pc.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error("draw reverted");
      return hash;
    });
    await step("client pays $250: split repays the advance", async () => {
      const before = await pc.readContract({ address: D.creditLine, abi: credit, functionName: "owed", args: [acct.address] });
      const p = await api("/api/demo/pay", { address: acct.address, amount: 250 });
      await new Promise((r) => setTimeout(r, 1500));
      const after = await pc.readContract({ address: D.creditLine, abi: credit, functionName: "owed", args: [acct.address] });
      if (!(after < before)) throw new Error(`owed did not drop (${before} → ${after})`);
      return `owed $${Number(before) / 1e6} → $${Number(after) / 1e6} in ${p.ms} ms`;
    });
  }
  console.log(process.exitCode ? "\nSMOKE FAILED" : "\nSMOKE PASSED");
} catch { console.log("\nSMOKE FAILED"); process.exitCode = 1; }
