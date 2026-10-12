import { NextResponse } from "next/server";
import { isAddress, getAddress, type Address } from "viem";

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

function friendly(e: unknown) {
  const m = e instanceof Error ? (e as { shortMessage?: string }).shortMessage ?? e.message : String(e);
  return m.split("\n")[0].slice(0, 200);
}

// ponytail: per-process rate limit; good enough for a single-instance demo deployment.
const hits = new Map<string, number>();
export function rateLimit(key: string, ms: number) {
  const last = hits.get(key) ?? 0;
  if (Date.now() - last < ms) throw new HttpError(429, "Slow down: try again in a few seconds");
  hits.set(key, Date.now());
}
