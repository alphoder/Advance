import { handler, addr, body, rateLimit } from "@/server/http";
import { dripGas } from "@/server/actions";

export const POST = handler(async (req) => {
  const to = addr((await body(req)).address);
  try {
    rateLimit(`gas:${to}`, 5_000);
  } catch {
    return { hash: null }; // topped up moments ago
  }
  return { hash: await dripGas(to) };
});
