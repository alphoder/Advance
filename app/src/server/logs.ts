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
  if (IS_LOCAL || process.env.LOGS_VIA_RPC === "1") return rpcLogs(q); // LOGS_VIA_RPC: local forks only
  if (!TOKEN) throw new Error("ENVIO_API_TOKEN is required to read history on Monad");
  return cachedHypersync(q);
}

/**
 * HyperSync rate-limits (429), and every dashboard polls. So per query: identical requests share one
 * call, results are reused for FRESH_MS, later calls fetch only blocks after the last one seen, and a
 * 429 falls back to the last good result instead of an error.
 * ponytail: per-instance memory; a shared cache (KV) if many server instances hammer the same queries.
 */
const FRESH_MS = 2500;
type Entry = { logs: RawLog[]; next: number; at: number; pending?: Promise<RawLog[]> };
const seen = new Map<string, Entry>();

function cachedHypersync(q: LogQuery): Promise<RawLog[]> {
  const key = JSON.stringify(q);
  const e = seen.get(key);
  if (e?.pending) return e.pending;
  if (e && Date.now() - e.at < FRESH_MS) return Promise.resolve(e.logs);
  const pending = hypersyncLogs({ ...q, fromBlock: e ? e.next : q.fromBlock })
    .then(({ logs, next }) => {
      const all = e ? e.logs.concat(logs) : logs;
      seen.set(key, { logs: all, next, at: Date.now() });
      return all;
    })
    .catch((err) => {
      if (e) { seen.set(key, { ...e, pending: undefined }); return e.logs; } // stale beats an error
      seen.delete(key);
      throw err;
    });
  seen.set(key, { logs: e?.logs ?? [], next: e?.next ?? q.fromBlock, at: e?.at ?? 0, pending });
  return pending;
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

async function hypersyncLogs(q: LogQuery): Promise<{ logs: RawLog[]; next: number }> {
  const out: RawLog[] = [];
  let from = q.fromBlock;
  for (let page = 0; page < 50; page++) {
    const res = await hsFetch({
      from_block: from,
      logs: [{ address: q.address ?? [], topics: q.topics.map((t) => t ?? []) }],
      field_selection: {
        log: ["address", "topic0", "topic1", "topic2", "topic3", "data", "block_number", "transaction_hash", "log_index"],
        block: ["number", "timestamp"],
      },
    });
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
    const stop = !body.next_block || (body.archive_height !== undefined && body.next_block >= body.archive_height) || body.next_block <= from;
    if (body.next_block > from) from = body.next_block;
    if (stop) break;
  }
  return { logs: out.sort((a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex), next: from };
}

/** One HyperSync call; on 429 waits (Retry-After, else 1s) and tries once more. */
async function hsFetch(query: object) {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(HYPERSYNC, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify(query),
      cache: "no-store",
    });
    if (res.ok) return res;
    if (res.status === 429 && attempt === 0) {
      await new Promise((r) => setTimeout(r, Math.min(3000, Number(res.headers.get("retry-after")) * 1000 || 1000)));
      continue;
    }
    throw new Error(res.status === 429 ? "The history service is busy. Retrying shortly." : `HyperSync ${res.status}: ${await res.text()}`);
  }
}

export const addrTopic = (a: Address): Hex => `0x${a.slice(2).toLowerCase().padStart(64, "0")}`;
