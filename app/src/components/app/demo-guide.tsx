"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CaretDown, CheckCircle, Circle, Compass, X } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { useAppData } from "@/lib/app-data";

const KEY = "advance.demo";

/** A judge-facing checklist that follows you across pages. Each step completes from onchain state. */
export function DemoGuide() {
  const { session } = useAccount();
  const fromUrl = useSearchParams().get("demo") === "1";
  const [on, setOn] = useState(false);
  useEffect(() => {
    try {
      if (fromUrl) localStorage.setItem(KEY, "1");
      setOn(localStorage.getItem(KEY) === "1");
    } catch {}
  }, [fromUrl]);
  if (!on || !session) return null;
  return <Guide onClose={() => { try { localStorage.removeItem(KEY); } catch {} setOn(false); }} />;
}

function Guide({ onClose }: { onClose: () => void }) {
  const { activity } = useAppData();
  const [open, setOpen] = useState(false); // collapsed: a pill showing the next step, so it never covers the page
  const ev = activity?.events ?? [];
  const c = activity?.credit;
  const steps = [
    { label: "Verify your income", hint: "Four clients pay you, then we score it", href: "/app", done: Boolean(c && (c.limit > 0 || c.repayments > 0)) },
    { label: "Take your first advance", hint: "Money in under a second", href: "/app/advance", done: ev.some((e) => e.type === "Drawn") },
    { label: "Get paid by a client", hint: "Watch the payment split", href: "/app/get-paid", done: ev.some((e) => e.type === "PaymentSplit" && (e.repaid ?? 0) > 0) },
    { label: "Level up your limit", hint: "Repay in full, unlock $200", href: "/app/score", done: (c?.tier ?? 0) >= 1 },
  ];
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);

  return (
    <div className="fixed bottom-4 right-4 z-40 w-[min(340px,calc(100vw-2rem))]">
      <div className="overflow-hidden rounded-2xl border border-line-strong bg-panel shadow-[0_24px_60px_-20px_rgb(2_6_20/0.9)]">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative grid size-9 place-items-center">
            <svg viewBox="0 0 36 36" className="absolute inset-0 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgb(140 162 225 / 0.15)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--terra)" strokeWidth="3" strokeLinecap="round" strokeDasharray={94.2} strokeDashoffset={94.2 * (1 - done / steps.length)} style={{ transition: "stroke-dashoffset 600ms var(--ease-out)" }} />
            </svg>
            <Compass className="size-4 text-terra" weight="fill" />
          </div>
          <button className="flex-1 text-left" onClick={() => setOpen((o) => !o)}>
            <div className="text-[13.5px] font-semibold">Demo tour · {done}/{steps.length}</div>
            <div className="text-[12px] text-muted">{next ? `Next: ${next.label}` : "You've seen the whole loop"}</div>
          </button>
          <button className="press rounded-md p-1 text-muted hover:text-ink" onClick={() => setOpen((o) => !o)} aria-label="Toggle tour">
            <CaretDown className={`size-4 transition-transform duration-200 ${open ? "" : "rotate-180"}`} />
          </button>
          <button className="press rounded-md p-1 text-muted hover:text-ink" onClick={onClose} aria-label="Close tour"><X className="size-4" /></button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }} className="border-t border-line"
            >
              {steps.map((s) => (
                <li key={s.label}>
                  <Link href={s.href} className="flex items-start gap-3 px-4 py-2.5 transition-colors hover:bg-white/[0.04]">
                    {s.done ? <CheckCircle className="mt-0.5 size-[18px] text-monad-hi" weight="fill" /> : <Circle className={`mt-0.5 size-[18px] ${s === next ? "text-terra" : "text-faint"}`} />}
                    <div>
                      <div className={`text-[13.5px] ${s.done ? "text-muted line-through decoration-faint" : ""}`}>{s.label}</div>
                      {!s.done && <div className="text-[12px] text-faint">{s.hint}</div>}
                    </div>
                  </Link>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
