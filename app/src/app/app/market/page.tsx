"use client";

import { useAccount } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { PageHeader } from "@/components/app/bits";
import { KuruPanel } from "@/components/kuru";
import { Panel, Skeleton } from "@/components/ui";
import type { PoolResp } from "../earn/page";

export default function MarketPage() {
  const { session } = useAccount();
  const { data, refresh } = usePoll<PoolResp>(`/api/pool${session ? `?lender=${session.address}` : ""}`, 4000);
  return (
    <>
      <PageHeader
        title="Kuru market"
        sub="Boost shares are first-loss credit you can trade. They list on a Kuru order book, priced next to their fair value computed onchain from loans and losses."
      />
      {data ? <KuruPanel nav={data.pool.boostPrice} myShares={data.me?.boost.shares ?? 0} onDone={refresh} /> : <Skeleton className="h-80" />}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ["Why a market", "Savers can exit any time by selling to another saver, instead of waiting for lent-out cash to come back."],
          ["How it's priced", "The AMM vault was seeded at the pool's share price, so trading opens at fair value. The gap to fair value is shown live."],
          ["What you're buying", "Boost shares earn the larger share of borrower fees and absorb missed repayments first."],
        ].map(([t, b]) => (
          <Panel key={t}><h3 className="font-semibold">{t}</h3><p className="mt-1.5 text-[14px] text-muted">{b}</p></Panel>
        ))}
      </div>
    </>
  );
}
