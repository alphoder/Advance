import { handler, addr, body, rateLimit, fuelLimit } from "@/server/http";
import { scoreAddress } from "@/server/score";
import { syncedTo } from "@/server/logs";
import { publicClient } from "@/lib/chain";
import { ensureAccount, setLimit, dripGas } from "@/server/actions";

/** Score the borrower and, if approved, write the limit onchain (scorer key) and open their Advance address. */
export const POST = handler(async (req) => {
  fuelLimit(req);
  const borrower = addr((await body(req)).address);
  rateLimit(`apply:${borrower}`, 3_000);
  await syncedTo(Number(await publicClient.getBlockNumber())); // payments made a second ago must count
  const score = await scoreAddress(borrower, true);
  const txs: { label: string; hash: string }[] = [];
  if (score.approved) {
    const { hash } = await ensureAccount(borrower);
    if (hash) txs.push({ label: "Opened your Advance address", hash });
    if (score.limit !== score.credit.limit) {
      const r = await setLimit(borrower, score.limit);
      txs.push({ label: `Set your limit to $${score.limit}`, hash: r.hash });
    }
    const gas = await dripGas(borrower);
    if (gas) txs.push({ label: "Covered your network fees", hash: gas });
  }
  return { score, txs };
});
