import { handler, addr, body, rateLimit } from "@/server/http";
import { demoClientPaysAccount } from "@/server/actions";

/** Demo mode: a client pays the borrower's Advance address; the split happens in that same transaction. */
export const POST = handler(async (req) => {
  const b = await body(req);
  const borrower = addr(b.address);
  rateLimit(`pay:${borrower}`, 2_000);
  const amount = Math.min(Math.max(Number(b.amount) || 100, 1), 1000);
  const started = Date.now();
  const { hash, receipt } = await demoClientPaysAccount("acme-studio", borrower, amount);
  return { hash, block: Number(receipt.blockNumber), ms: Date.now() - started, amount };
});
