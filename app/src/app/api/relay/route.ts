import { handler, addr, body, HttpError } from "@/server/http";
import { relayPayment, ensureAccount } from "@/server/actions";
import type { Hex } from "viem";

/** Relays a client's signed EIP-3009 payment to a borrower's Advance address. The client pays no gas. */
export const POST = handler(async (req) => {
  const b = await body(req);
  const hex = (v: unknown) => {
    if (typeof v !== "string" || !/^0x[0-9a-fA-F]+$/.test(v)) throw new HttpError(400, "Invalid signature data");
    return v as Hex;
  };
  const started = Date.now();
  const { account } = await ensureAccount(addr(b.borrower, "borrower"));
  const { hash, receipt } = await relayPayment({
    account,
    from: addr(b.from, "payer"),
    value: BigInt(String(b.value)),
    validAfter: BigInt(String(b.validAfter)),
    validBefore: BigInt(String(b.validBefore)),
    nonce: hex(b.nonce),
    signature: hex(b.signature),
  });
  return { hash, block: Number(receipt.blockNumber), ms: Date.now() - started };
});
