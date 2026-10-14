import { NextResponse } from "next/server";
import { isAddress, getAddress, type Address } from "viem";
import { plainError } from "@/lib/errors";

/** Wraps a handler: JSON in/out, readable errors (never stack traces) to the client. */
export function handler<T>(fn: (req: Request) => Promise<T>) {
  return async (req: Request) => {
    try {
      return NextResponse.json(await fn(req), { headers: { "cache-control": "no-store" } });
    } catch (e) {
      if (typeof (e as { digest?: unknown })?.digest === "string") throw e; // Next.js control flow (prerender bail-out etc.)
      const msg = e instanceof HttpError ? e.message : friendly(e);
      if (!(e instanceof HttpError)) console.error(e);
      return NextResponse.json({ error: msg }, { status: e instanceof HttpError ? e.status : 500 });
    }
  };
}

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export function addr(v: unknown, name = "address"): Address {
  if (typeof v !== "string" || !isAddress(v)) throw new HttpError(400, `Invalid ${name}`);
  return getAddress(v);
}

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    return (await req.json()) as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "Expected a JSON body");
  }
}

const friendly = (e: unknown) => plainError(e);

// ponytail: per-process rate limit; good enough for a single-instance demo deployment.
const hits = new Map<string, number>();
export function rateLimit(key: string, ms: number) {
  const last = hits.get(key) ?? 0;
  if (Date.now() - last < ms) throw new HttpError(429, "Slow down: try again in a few seconds");
  hits.set(key, Date.now());
}

const ipHits = new Map<string, number[]>();
/**
 * Per-IP budget for the endpoints that spend the demo's MON, so a script with fresh addresses can't drain it.
 * Generous for a person (a full demo is ~30 calls), tight for a bot.
 * ponytail: in-memory per server instance; move to a shared store (KV) if abuse spreads across instances.
 */
export function ipLimit(req: Request, bucket: string, max: number, windowMs: number) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || "unknown";
  const key = `${bucket}:${ip}`, now = Date.now();
  const recent = (ipHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) throw new HttpError(429, "You're going a bit fast for the demo. Please wait a minute and try again.");
  recent.push(now); ipHits.set(key, recent);
}
export const fuelLimit = (req: Request) => ipLimit(req, "fuel", 80, 10 * 60_000);
