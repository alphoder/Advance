// Self-check for the credit-file crypto: node scripts/vault-check.ts
import assert from "node:assert/strict";
import { encryptFile, openOwnFile, wrapForLender, openSharedFile, encPublicKey } from "../src/lib/vault.ts";

const rand = () => crypto.getRandomValues(new Uint8Array(32));
const borrower = rand(), lender = rand(), stranger = rand();
const doc = new TextEncoder().encode("INVOICE #1042 · Northwind Agency · $240");

const { id, blob } = await encryptFile(borrower, doc, "text/plain");
assert.ok(!Buffer.from(blob.slice(2), "hex").includes(Buffer.from("Northwind")), "plaintext must not appear in blob");
assert.equal(await (await openOwnFile(borrower, blob)).text(), "INVOICE #1042 · Northwind Agency · $240");

const wrapped = await wrapForLender(borrower, blob, id, encPublicKey(lender));
assert.equal(await (await openSharedFile(lender, blob, id, wrapped)).text(), "INVOICE #1042 · Northwind Agency · $240");
await assert.rejects(openSharedFile(stranger, blob, id, wrapped), "a stranger cannot open a grant");
await assert.rejects(openOwnFile(lender, blob), "the lender cannot use the owner's self-wrap");
console.log("vault crypto: ok");
