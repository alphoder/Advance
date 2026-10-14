import { handler, addr, body, rateLimit, fuelLimit } from "@/server/http";
import { faucet } from "@/server/actions";

export const POST = handler(async (req) => {
  fuelLimit(req);
  const b = await body(req);
  const to = addr(b.address);
  rateLimit(`faucet:${to}`, 5_000);
  const amount = Math.min(Number(b.amount) || 1000, 10_000);
  const { hash } = await faucet(to, amount);
  return { hash, amount };
});
