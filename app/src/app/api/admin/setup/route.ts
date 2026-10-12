import { handler, body, HttpError } from "@/server/http";
import { demoAccount, send, relayer } from "@/server/relayer";
import { demoClientPays, faucet, dollars } from "@/server/actions";
import { DEMO_CLIENTS } from "@/server/demo";
import { D } from "@/lib/chain";
import { erc20Abi, poolAbi, Tranche } from "@/lib/abi";

/**
 * One-time demo setup on a fresh deployment:
 *  1. seed lender liquidity (Steady + Boost),
 *  2. give demo clients a real payment history,
 *  3. create "Sybil Sam", who fakes income by paying himself through two fresh wallets.
 */
export const POST = handler(async (req) => {
  const b = await body(req);
  if (!process.env.ADMIN_SECRET || b.secret !== process.env.ADMIN_SECRET) throw new HttpError(403, "Forbidden");
  const log: string[] = [];

  if (b.liquidity !== false) {
    await faucet(relayer.address, 10_000);
    await send({ address: D.ausd, abi: erc20Abi, functionName: "approve", args: [D.pool, dollars(10_000)] });
    await send({ address: D.pool, abi: poolAbi, functionName: "deposit", args: [Tranche.Steady, dollars(8_000)] });
    await send({ address: D.pool, abi: poolAbi, functionName: "deposit", args: [Tranche.Boost, dollars(2_000)] });
    log.push("Seeded pool: $8,000 Steady, $2,000 Boost");
  }

  // Demo clients pay a few merchants so each has its own track record.
  for (const c of DEMO_CLIENTS)
    for (let i = 0; i < 5; i++) await demoClientPays(c.id, demoAccount(`merchant-${i}`).address, 10 + i);
  log.push("Demo clients: 5 payments each to other merchants");

  // Pre-fund the client used by "Acme Studio pays…" so the demo payment is a single transaction.
  await faucet(demoAccount("acme-studio").address, 10_000);

  const sam = demoAccount("sybil-sam");
  const salt = Date.now().toString();
  for (const h of ["a", "b"]) {
    const helper = demoAccount(`sybil-helper-${h}-${salt}`);
    await demoClientPays("sybil-sam", helper.address, 200); // Sam funds a fresh wallet...
    await demoClientPays(`sybil-helper-${h}-${salt}`, sam.address, 150); // ...which "pays" him back
  }
  log.push(`Sybil Sam: ${sam.address}`);
  return { log, sybilSam: sam.address };
});
