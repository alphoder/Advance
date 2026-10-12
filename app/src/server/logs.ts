import { toHex, type Address, type Hex } from "viem";
import { publicClient, CHAIN_ID, IS_LOCAL } from "@/lib/chain";

export type RawLog = {
  address: Address;
  topics: Hex[];
  data: Hex;
  blockNumber: number;
  txHash: Hex;
  logIndex: number;
  timestamp: number; // unix seconds
};

/** topics[i]: null = any, otherwise any of the listed values. */
export type LogQuery = { address?: Address[]; topics: (Hex[] | null)[]; fromBlock: number };

const TOKEN = process.env.ENVIO_API_TOKEN;
const HYPERSYNC = `https://${CHAIN_ID}.hypersync.xyz/query`;

/**
 * Historical logs. Envio HyperSync on Monad (the public RPC caps eth_getLogs at 100 blocks);
 * plain eth_getLogs on a local chain.
 */
export async function fetchLogs(q: LogQuery): Promise<RawLog[]> {
  if (IS_LOCAL) return rpcLogs(q);
  if (!TOKEN) throw new Error("ENVIO_API_TOKEN is required to read history on Monad");
  return hypersyncLogs(q);
}

async function rpcLogs(q: LogQuery): Promise<RawLog[]> {
  const logs = (await publicClient.request({
    method: "eth_getLogs",
    params: [{ address: q.address, topics: q.topics as never, fromBlock: toHex(q.fromBlock), toBlock: "latest" }],
  })) as { address: Address; topics: Hex[]; data: Hex; blockNumber: Hex; transactionHash: Hex; logIndex: Hex }[];
  const times = new Map<string, number>();
  for (const bn of new Set(logs.map((l) => l.blockNumber))) {
    const b = await publicClient.getBlock({ blockNumber: BigInt(bn) });
    times.set(bn, Number(b.timestamp));
  }
  return logs.map((l) => ({
    address: l.address,
    topics: l.topics,
    data: l.data,
    blockNumber: Number(l.blockNumber),
    txHash: l.transactionHash,
    logIndex: Number(l.logIndex),
    timestamp: times.get(l.blockNumber)!,
  }));
}

type HsLog = {
  address: Address;
  topic0?: Hex; topic1?: Hex; topic2?: Hex; topic3?: Hex;
  data: Hex;
  block_number: number;
  transaction_hash: Hex;
  log_index: number;
};
type HsBatch = { logs?: HsLog[]; blocks?: { number: number; timestamp: Hex | number }[] };

async function hypersyncLogs(q: LogQuery): Promise<RawLog[]> {
  const out: RawLog[] = [];
  let from = q.fromBlock;
  for (let page = 0; page < 50; page++) {
    const res = await fetch(HYPERSYNC, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({
        from_block: from,
        logs: [{ address: q.address ?? [], topics: q.topics.map((t) => t ?? []) }],
        field_selection: {
          log: ["address", "topic0", "topic1", "topic2", "topic3", "data", "block_number", "transaction_hash", "log_index"],
          block: ["number", "timestamp"],
        },
      }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HyperSync ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { data: HsBatch[] | HsBatch; next_block: number; archive_height?: number };
    const batches = Array.isArray(body.data) ? body.data : [body.data];
    const times = new Map<number, number>();
    for (const b of batches) for (const blk of b.blocks ?? []) times.set(Number(blk.number), Number(blk.timestamp));
    for (const b of batches)
      for (const l of b.logs ?? [])
        out.push({
          address: l.address,
          topics: [l.topic0, l.topic1, l.topic2, l.topic3].filter(Boolean) as Hex[],
          data: l.data,
          blockNumber: Number(l.block_number),
          txHash: l.transaction_hash,
          logIndex: Number(l.log_index),
          timestamp: times.get(Number(l.block_number)) ?? 0,
        });
    if (!body.next_block || (body.archive_height !== undefined && body.next_block >= body.archive_height)) break;
    if (body.next_block <= from) break;
    from = body.next_block;
  }
  return out.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex);
}

export const addrTopic = (a: Address): Hex => `0x${a.slice(2).toLowerCase().padStart(64, "0")}`;
