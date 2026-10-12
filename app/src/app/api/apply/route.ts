import { handler, addr, body, rateLimit } from "@/server/http";
import { scoreAddress } from "@/server/score";
import { ensureAccount, setLimit, dripGas } from "@/server/actions";

/** Score the borrower and, if approved, write the limit onchain (scorer key) and open their Advance address. */
export const POST = handler(async (req) => {
  const borrower = addr((await body(req)).address);
  rateLimit(`apply:${borrower}`, 3_000);
  const score = await scoreAddress(borrower);
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
