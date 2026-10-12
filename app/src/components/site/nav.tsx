"use client";

import Link from "next/link";
import { useState } from "react";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { List, X } from "@phosphor-icons/react";
import { Logo, ChainToggle, ContractList, CHAIN_NAME } from "@/components/ui";
import { useChainView } from "@/components/providers";

const LINKS = [
  ["How it works", "/#how"],
  ["Earn", "/app/earn"],
  ["Agents", "/app/agents"],
  ["Protocol", "/app/protocol"],
] as const;

export function SiteNav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 12));
  return (
    <header className="sticky top-0 z-40">
      <div className={`transition-[background-color,border-color] duration-300 ${scrolled ? "border-b border-line bg-bg/75 backdrop-blur-xl" : "border-b border-transparent"}`}>
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-lg px-3 py-2 text-[14px] text-muted transition-colors hover:text-ink">{label}</Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/app" className="press hidden rounded-xl bg-terra px-4 py-2 text-[14px] font-medium text-[#1a0d08] hover:bg-terra-hi sm:inline-flex">Open app</Link>
            <button className="press rounded-lg p-2 text-muted md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu">
              {open ? <X className="size-5" /> : <List className="size-5" />}
            </button>
          </div>
        </div>
      </div>
      {open && (
        <motion.nav initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="glass mx-4 mt-2 grid gap-1 rounded-2xl p-2 md:hidden">
          {LINKS.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2.5 text-ink">{label}</Link>
          ))}
          <Link href="/app" className="mt-1 rounded-xl bg-terra px-3 py-2.5 text-center font-medium text-[#1a0d08]">Open app</Link>
        </motion.nav>
      )}
    </header>
  );
}

export function SiteFooter() {
  const { on } = useChainView();
  return (
    <footer className="mx-auto mt-auto w-full max-w-7xl px-4 pb-10 pt-20 sm:px-6">
      <div className="flex flex-col gap-6 border-t border-line pt-8 md:flex-row md:items-start md:justify-between">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-3 text-[14px] text-muted">Credit for the next billion earners and their agents, repaid at the source. Running on {CHAIN_NAME}.</p>
        </div>
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 text-[14px] sm:grid-cols-3">
          <Link href="/app" className="text-muted hover:text-ink">Borrow</Link>
          <Link href="/app/earn" className="text-muted hover:text-ink">Earn</Link>
          <Link href="/app/agents" className="text-muted hover:text-ink">Agents</Link>
          <Link href="/app/market" className="text-muted hover:text-ink">Market</Link>
          <Link href="/app/protocol" className="text-muted hover:text-ink">Protocol</Link>
        </div>
        <ChainToggle />
      </div>
      {on && <div className="mt-6"><ContractList /></div>}
    </footer>
  );
}
