import { decodeEventLog, getAddress, toEventSelector, type Hex } from "viem";
import { handler, addr } from "@/server/http";
import { fetchLogs, addrTopic, type RawLog } from "@/server/logs";
import { D } from "@/lib/chain";
import { creditFilesAbi } from "@/lib/abi";

const sel = (n: string) => toEventSelector(creditFilesAbi.find((x) => x.type === "event" && x.name === n)!);
const decode = (l: RawLog) => ({ ...decodeEventLog({ abi: creditFilesAbi, data: l.data, topics: l.topics as [Hex, ...Hex[]] }), tx: l.txHash, block: l.blockNumber, ts: l.timestamp });

/** Ciphertext only: the server can list files and grants but never decrypt them. */
export const GET = handler(async (req) => {
  const me = addr(new URL(req.url).searchParams.get("address"));
  const q = (topics: (Hex[] | null)[]) => fetchLogs({ address: [D.creditFiles], topics, fromBlock: D.startBlock });
  const [mine, out, inc] = await Promise.all([
    q([[sel("FilePublished")], [addrTopic(me)]]),
    q([[sel("AccessGranted")], [addrTopic(me)]]),
    q([[sel("AccessGranted")], null, null, [addrTopic(me)]]),
  ]);
  const grantsIn = inc.map(decode).map((g) => ({ ...(g.args as { owner: string; id: Hex; lender: string; wrappedKey: Hex }), tx: g.tx }));
  const sharedFiles = grantsIn.length ? await q([[sel("FilePublished")], null, grantsIn.map((g) => g.id)]) : [];
  const keyOwners = [me, ...grantsIn.map((g) => getAddress(g.owner))];
  const keys = await q([[sel("EncryptionKey")], keyOwners.map(addrTopic)]);
  const keyOf: Record<string, Hex> = {};
  for (const k of keys.map(decode)) {
    const a = k.args as { owner: string; pubkey: Hex };
    keyOf[a.owner.toLowerCase()] = a.pubkey; // latest wins (logs are block-ordered)
  }
  const file = (l: RawLog) => {
    const d = decode(l);
    const a = d.args as { owner: string; id: Hex; name: string; blob: Hex };
    return { owner: a.owner, id: a.id, name: a.name, blob: a.blob, size: (a.blob.length - 2) / 2, tx: d.tx, block: d.block, ts: d.ts };
  };
  return {
    myKey: keyOf[me.toLowerCase()] ?? null,
    files: mine.map(file).reverse(),
    grantsOut: out.map(decode).map((g) => ({ ...(g.args as { id: Hex; lender: string }), tx: g.tx })),
    shared: grantsIn.map((g) => ({ ...g, file: sharedFiles.map(file).find((f) => f.id === g.id) ?? null })).reverse(),
  };
});
