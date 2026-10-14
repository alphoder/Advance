import { handler, addr, body, fuelLimit } from "@/server/http";
import { dripGas } from "@/server/actions";

export const POST = handler(async (req) => {
  fuelLimit(req);
  const b = await body(req);
  const to = addr(b.address);
  const need = typeof b.need === "string" && /^\d{1,30}$/.test(b.need) ? BigInt(b.need) : 0n;
  // No time-based limit: dripGas only fills up to a capped target, so repeat calls send nothing.
  return { hash: await dripGas(to, need) };
});
