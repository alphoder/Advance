"use client";

import { useState, type FormEvent } from "react";
import { isAddress } from "viem";
import { MagnifyingGlass, UserFocus } from "@phosphor-icons/react";
import type { ScoreResult } from "@/server/score";
import { api } from "@/lib/tx";
import { usePoll } from "@/lib/hooks";
import { Button, ErrorNote, Panel, Skeleton } from "@/components/ui";
import { ScoreView } from "@/components/score-view";

/** Public score checker: any address, no sign-in. The fastest way for anyone to understand Advance. */
export function ScoreChecker() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<ScoreResult>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const { data: cfg } = usePoll<{ sybilSam: string; nansen: boolean; indexer: string }>("/api/config", 60_000);

  async function check(address: string) {
    setError(undefined);
    if (!isAddress(address)) return setError("That doesn't look like a Monad address. It starts with 0x and is 42 characters long.");
    setLoading(true);
    try {
      setResult(await api<ScoreResult>(`/api/score?address=${address}`));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="check" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-24 sm:px-6">
      <div className="mb-10 max-w-2xl">
        <h2 className="text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">What could this address borrow?</h2>
        <p className="mt-4 text-lg text-muted">Paste any Monad address. We read its income onchain, check every payer, and explain the answer.</p>
      </div>
      <Panel className="p-5 sm:p-8">
        <form className="flex flex-col gap-3 sm:flex-row" onSubmit={(e: FormEvent) => { e.preventDefault(); check(input.trim()); }}>
          <label htmlFor="addr" className="sr-only">Monad address</label>
          <div className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-line-strong bg-bg/60 px-4 focus-within:border-monad">
            <MagnifyingGlass className="size-5 text-faint" />
            <input
              id="addr" value={input} onChange={(e) => setInput(e.target.value)} placeholder="0x…" spellCheck={false} autoComplete="off"
              className="w-full bg-transparent font-mono text-[14px] text-ink outline-none placeholder:text-faint"
            />
          </div>
          <Button type="submit" loading={loading} className="min-h-12">Check score</Button>
        </form>
        {cfg && (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-[13px] text-muted">
            Try a known case:
            <button
              className="press inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 hover:border-danger/50 hover:text-ink"
              onClick={() => { setInput(cfg.sybilSam); check(cfg.sybilSam); }}
            >
              <UserFocus className="size-4 text-danger" /> Sybil Sam, who pays himself
            </button>
          </div>
        )}
        <div className="mt-5"><ErrorNote>{error}</ErrorNote></div>
        {loading && !result && (
          <div className="mt-6 flex items-center gap-6">
            <Skeleton className="size-40 rounded-full" />
            <div className="flex-1 space-y-3"><Skeleton className="h-8 w-2/3" /><Skeleton className="h-4 w-1/2" /><Skeleton className="h-4 w-3/5" /></div>
          </div>
        )}
        {result && <div className="mt-8 border-t border-line pt-8"><ScoreView s={result} /></div>}
        {cfg && <p className="mt-6 text-[12.5px] text-faint">History via {cfg.indexer}{cfg.nansen ? ", payers checked with Nansen" : ""}.</p>}
      </Panel>
    </section>
  );
}
