"use client";

import { ShieldCheck, Cpu, Scales, Lightning, Cube } from "@phosphor-icons/react";
import { usePoll } from "@/lib/hooks";
import { CHAIN_ID } from "@/lib/chain";
import { PageHeader } from "@/components/app/bits";
import { Panel, Stat, ContractList, Label, fmtUsd, CHAIN_NAME } from "@/components/ui";

type Pool = { total: number; lentOut: number; utilisation: number; feesEarned: number; losses: number; advances: number; repayments: number; defaults: number; steadyPrice: number; boostPrice: number };

export default function ProtocolPage() {
  const { data } = usePoll<{ pool: Pool }>("/api/pool", 4000);
  const p = data?.pool;
  const rules = [
    { icon: Scales, title: "Split at the source", body: "ReceivablesAccount repays at least 20% of every payment in the same transaction and never holds funds afterwards." },
    { icon: ShieldCheck, title: "Losses hit Boost first", body: "AdvancePool writes off missed repayments against the junior tranche before Steady loses anything." },
    { icon: Lightning, title: "Limits earned, not granted", body: "CreditLine caps limits at $50, $200, $1,000 and $5,000; each level unlocks only after a full repayment." },
    { icon: Cpu, title: "No single scorer", body: "A Chainlink CRE workflow reaches DON consensus on each limit and writes it through the forwarder." },
  ];
  return (
    <>
      <PageHeader title="Protocol" sub={`The contracts, rules and live state behind Advance on ${CHAIN_NAME} (chain ${CHAIN_ID}). Every number is read live from the chain.`} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Panel><Stat label="Total in the pool" value={p ? fmtUsd(p.total, 0) : "…"} /></Panel>
        <Panel><Stat label="Lent out" value={p ? `${p.utilisation.toFixed(1)}%` : "…"} hint={p ? fmtUsd(p.lentOut, 0) : undefined} tone="terra" /></Panel>
        <Panel><Stat label="Fees to savers" value={p ? fmtUsd(p.feesEarned) : "…"} tone="monad" /></Panel>
        <Panel><Stat label="Missed repayments" value={p ? String(p.defaults) : "…"} hint={p ? `${p.repayments} repayment${p.repayments === 1 ? "" : "s"}, ${p.advances} advance${p.advances === 1 ? "" : "s"}` : undefined} /></Panel>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {rules.map(({ icon: Icon, title, body }) => (
          <Panel key={title} className="flex gap-4">
            <Icon className="size-7 shrink-0 text-monad-hi" weight="duotone" />
            <div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-[14px] text-muted">{body}</p></div>
          </Panel>
        ))}
      </div>
      <Panel className="mt-4">
        <div className="flex items-center gap-2"><Cube className="size-5 text-monad-hi" weight="duotone" /><Label>Deployed contracts</Label></div>
        <div className="mt-3"><ContractList /></div>
      </Panel>
    </>
  );
}
