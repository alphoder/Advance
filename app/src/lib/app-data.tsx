"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import type { Address } from "viem";
import type { ScoreResult } from "@/server/score";
import { usePoll } from "./hooks";
import { api } from "./tx";

export type Ev = {
  type: string; key: string; tx: string; block: number; ts: number;
  amount?: number; fee?: number; repaid?: number; toYou?: number; tier?: number; payer?: string;
};
export type Activity = {
  account: Address;
  accountOpen: boolean;
  shareBps: number;
  balance: number;
  gas: number;
  credit: {
    limit: number; principal: number; fee: number; owed: number; available: number;
    totalBorrowed: number; totalRepaid: number; repayments: number; tier: number; defaulted: boolean;
  };
  events: Ev[];
};
export type TxLine = { label: string; hash: string; ms?: number };

type Ctx = {
  activity?: Activity;
  refresh: () => void;
  score?: ScoreResult;
  /** Score the borrower; if approved the server writes the limit onchain. */
  apply: () => Promise<{ score: ScoreResult; txs: TxLine[] }>;
  /** Demo: four real clients pay this address. */
  seed: () => Promise<TxLine[]>;
  log: TxLine[];
  pushLog: (l: TxLine[]) => void;
};

const AppData = createContext<Ctx | null>(null);

export function AppDataProvider({ address, children }: { address: Address; children: ReactNode }) {
  const { data: activity, refresh } = usePoll<Activity>(`/api/activity?address=${address}`);
  const [score, setScore] = useState<ScoreResult>();
  const [log, setLog] = useState<TxLine[]>([]);
  const pushLog = useCallback((l: TxLine[]) => setLog((x) => [...l, ...x].slice(0, 30)), []);

  const apply = useCallback(async () => {
    const r = await api<{ score: ScoreResult; txs: TxLine[] }>("/api/apply", { address });
    setScore(r.score);
    pushLog(r.txs);
    refresh();
    return r;
  }, [address, pushLog, refresh]);

  const seed = useCallback(async () => {
    const r = await api<{ txs: TxLine[] }>("/api/demo/seed", { address });
    pushLog(r.txs);
    refresh();
    return r.txs;
  }, [address, pushLog, refresh]);

  return <AppData.Provider value={{ activity, refresh, score, apply, seed, log, pushLog }}>{children}</AppData.Provider>;
}

export function useAppData() {
  const ctx = useContext(AppData);
  if (!ctx) throw new Error("useAppData outside AppDataProvider");
  return ctx;
}

/** Score fetched lazily for pages that show it before any apply. */
export function useScore(address?: Address) {
  return usePoll<ScoreResult>(address ? `/api/score?address=${address}` : undefined, 30_000);
}
