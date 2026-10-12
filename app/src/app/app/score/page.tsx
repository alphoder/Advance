"use client";

import { ArrowsClockwise } from "@phosphor-icons/react";
import { useState } from "react";
import { useAccount } from "@/lib/account";
import { useAppData, useScore } from "@/lib/app-data";
import { Gate } from "@/components/app/shell";
import { PageHeader, TxLog } from "@/components/app/bits";
import { Button, ErrorNote, Panel, Skeleton } from "@/components/ui";
import { ScoreView } from "@/components/score-view";

export default function ScorePage() {
  return <Gate><Inner /></Gate>;
}

function Inner() {
  const { session } = useAccount();
  const { score: applied, apply, log } = useAppData();
  const { data, refresh } = useScore(session?.address);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const s = applied ?? data;
  return (
    <>
      <PageHeader
        title="My score"
        help={["Your score (0 to 100) is built only from facts on the blockchain: who pays you and how.", "Purple ticks help you. Orange and red items explain what's holding you back.", "\"How to unlock more\" tells you exactly what to do next.", "After new payments arrive, tap \"Re-check\" to update your limit."]}
        sub="Your score is built only from onchain facts: who pays you, how independent they are, how steady it is, and how you repay. Here is every input."
        action={
          <Button variant="secondary" loading={busy} icon={<ArrowsClockwise className="size-4" />}
            onClick={async () => { setBusy(true); setError(undefined); try { await apply(); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>
            Re-check and update my limit
          </Button>
        }
      />
      <ErrorNote>{error}</ErrorNote>
      <div className="space-y-4">
        <TxLog items={log.slice(0, 3)} />
        <Panel className="p-6 sm:p-8">{s ? <ScoreView s={s} /> : <div className="flex gap-6"><Skeleton className="size-40 rounded-full" /><div className="flex-1 space-y-3"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-4 w-2/3" /></div></div>}</Panel>
      </div>
    </>
  );
}
