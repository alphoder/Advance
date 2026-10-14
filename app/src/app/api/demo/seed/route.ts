import { handler, addr, body, rateLimit, fuelLimit, ipLimit } from "@/server/http";
import { demoClientPays, dripGas } from "@/server/actions";
import { DEMO_CLIENTS } from "@/server/demo";

/** Demo mode: four real clients pay the visitor, building a genuine onchain income history. */
export const POST = handler(async (req) => {
  fuelLimit(req); ipLimit(req, "new-account", 6, 60 * 60_000); // each seed is a new demo account
  const to = addr((await body(req)).address);
  rateLimit(`seed:${to}`, 30_000);
  const txs = [];
  for (const c of DEMO_CLIENTS) {
    const { hash } = await demoClientPays(c.id, to, c.amount);
    txs.push({ label: `${c.name} paid you $${c.amount}`, hash });
  }
  const gas = await dripGas(to);
  if (gas) txs.push({ label: "Covered your network fees", hash: gas });
  return { txs };
});
