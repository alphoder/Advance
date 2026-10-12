import type { Address } from "viem";

const KEY = process.env.NANSEN_API_KEY;
const BASE = "https://api.nansen.ai/api/v1/profiler/address";

export const nansenEnabled = () => Boolean(KEY);

export type Label = { label: string; category?: string };
export type Related = { address: string; relation: string; address_label?: string | null };

// ponytail: in-process cache; labels cost 100 credits per call, so each payer is scored once per server lifetime.
// Move to Redis/KV if we run more than one instance.
const cache = new Map<string, Promise<unknown>>();

async function post<T>(path: string, body: object): Promise<T[]> {
  if (!KEY) return [];
  const key = path + JSON.stringify(body);
  if (!cache.has(key)) {
    cache.set(
      key,
      fetch(`${BASE}/${path}`, {
        method: "POST",
        headers: { apikey: KEY, "content-type": "application/json" },
        body: JSON.stringify(body),
      })
        .then(async (r) => (r.ok ? ((await r.json()) as { data?: T[] }).data ?? [] : []))
        .catch(() => []),
    );
  }
  return cache.get(key) as Promise<T[]>;
}

export const labelsOf = (a: Address) =>
  post<Label>("labels", { address: a, chain: "monad", pagination: { page: 1, per_page: 20 } });

export const relatedOf = (a: Address) =>
  post<Related>("related-wallets", { wallet_address: a, chain: "monad", pagination: { page: 1, per_page: 50 } });
