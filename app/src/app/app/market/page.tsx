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
        title="Sell or buy savings"
        help={["Boost savings are a token you can sell to another saver, instead of waiting to withdraw.", "\"Fair value\" is what one share is worth inside the pool right now.", "If the market price is below fair value, you'd be selling at a discount."]}
        sub="Your Boost savings are a token. You can sell them to another saver any time, or buy more, on the Kuru exchange."
      />
      {data ? <KuruPanel nav={data.pool.boostPrice} myShares={data.me?.boost.shares ?? 0} onDone={refresh} /> : <Skeleton className="h-80" />}
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {[
          ["Why a market", "Savers can exit any time by selling to another saver, instead of waiting for lent-out cash to come back."],
          ["How it's priced", "Trading started at the pool's own share price, so it opened at fair value. Any gap is shown live above."],
          ["What you're buying", "A share of the Boost savings pool: bigger cut of borrower fees, but it absorbs missed repayments first."],
        ].map(([t, b]) => (
          <Panel key={t}><h3 className="font-semibold">{t}</h3><p className="mt-1.5 text-[14px] text-muted">{b}</p></Panel>
        ))}
      </div>
    </>
  );
}
