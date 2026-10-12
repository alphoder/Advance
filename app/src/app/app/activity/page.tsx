"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ClockCounterClockwise } from "@phosphor-icons/react";
import { useAppData } from "@/lib/app-data";
import { Gate } from "@/components/app/shell";
import { PageHeader, ActivityRow, EmptyState } from "@/components/app/bits";
import { Panel, Stat, Skeleton, fmtUsd } from "@/components/ui";

const TABS = [
  { id: "all", label: "All", types: ["PaymentSplit", "Drawn", "LimitSet", "TierUp", "Defaulted"] },
  { id: "pay", label: "Payments", types: ["PaymentSplit"] },
  { id: "adv", label: "Advances", types: ["Drawn"] },
  { id: "lim", label: "Limits", types: ["LimitSet", "TierUp", "Defaulted"] },
] as const;

export default function ActivityPage() {
  return <Gate><Inner /></Gate>;
}

function Inner() {
  const { activity } = useAppData();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("all");
  if (!activity) return <Skeleton className="h-96" />;
  const types = TABS.find((t) => t.id === tab)!.types as readonly string[];
  const rows = activity.events.filter((e) => types.includes(e.type));
  const c = activity.credit;
  return (
    <>
      <PageHeader title="History" help={["Every advance, payment and limit change appears here, newest first.", "Use the tabs to show only payments, advances or limit changes.", "\"Proof\" opens the transaction on Monad's public record."]} sub="Every advance, payment, split and limit change, straight from the chain. Each row links to its transaction." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Panel><Stat label="Borrowed in total" value={fmtUsd(c.totalBorrowed)} tone="terra" /></Panel>
        <Panel><Stat label="Repaid in total" value={fmtUsd(c.totalRepaid)} tone="monad" hint={`${c.repayments} repayment${c.repayments === 1 ? "" : "s"}`} /></Panel>
        <Panel><Stat label="Owed right now" value={fmtUsd(c.owed)} /></Panel>
      </div>
      <Panel className="mt-4">
        <div role="tablist" className="flex gap-1 rounded-xl border border-line bg-bg/50 p-1">
          {TABS.map((t) => (
            <button key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className="relative flex-1 rounded-lg px-3 py-2 text-[13.5px]">
              {tab === t.id && <motion.span layoutId="tab" className="absolute inset-0 rounded-lg bg-white/[0.07]" transition={{ type: "spring", duration: 0.35, bounce: 0.1 }} />}
              <span className={`relative ${tab === t.id ? "text-ink" : "text-muted"}`}>{t.label}</span>
            </button>
          ))}
        </div>
        {rows.length ? (
          <ul className="mt-2 divide-y divide-line">{rows.map((e, i) => <ActivityRow key={e.key} e={e} i={i} />)}</ul>
        ) : (
          <EmptyState icon={<ClockCounterClockwise className="size-6" />} title="Nothing here yet" body="Activity of this kind will appear as it happens onchain." />
        )}
      </Panel>
    </>
  );
}
