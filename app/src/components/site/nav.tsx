"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { List, X, ArrowRight } from "@phosphor-icons/react";
import { Logo, ChainToggle, ContractList, CHAIN_NAME } from "@/components/ui";
import { useChainView } from "@/components/providers";
import { publicClient } from "@/lib/chain";

const LINKS = [
  ["How it works", "/#how"],
  ["Earn", "/app/earn"],
  ["Agents", "/app/agents"],
  ["Protocol", "/app/protocol"],
] as const;

// Apple-ish spring: settles quickly, a hint of bounce, interruptible mid-morph.
const SPRING = { type: "spring", duration: 0.55, bounce: 0.22 } as const;

function useBlock() {
  const [n, setN] = useState<bigint>();
  useEffect(() => {
    const tick = () => publicClient.getBlockNumber({ cacheTime: 0 }).then(setN).catch(() => {});
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return n;
}

/** Dynamic-Island navigation: a floating pill that expands at the top and shrinks to a live status island on scroll. */
export function SiteNav() {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hoverLink, setHoverLink] = useState<string>();
  const block = useBlock();
  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 80));

  const expanded = !scrolled || hovered;
  const t = reduce ? { duration: 0 } : SPRING;

  return (
    <>
      <div className="h-20" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
        <motion.nav
          layout
          transition={t}
          onHoverStart={() => setHovered(true)}
          onHoverEnd={() => { setHovered(false); setHoverLink(undefined); }}
          style={{ borderRadius: 999 }}
          className="pointer-events-auto flex items-center gap-1 border border-white/[0.08] bg-[#0b0e14]/90 p-1.5 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl"
          aria-label="Main"
        >
          <motion.div layout="position" transition={t} className="flex items-center pl-2.5 pr-1">
            <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight">
              <img src="/icon.svg" alt="" className="size-6" />
              <AnimatePresence initial={false}>
                {expanded && (
                  <motion.span
                    initial={{ opacity: 0, filter: "blur(4px)", width: 0 }} animate={{ opacity: 1, filter: "blur(0px)", width: "auto" }}
                    exit={{ opacity: 0, filter: "blur(4px)", width: 0 }} transition={t} className="overflow-hidden whitespace-nowrap"
                  >
                    Advance
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </motion.div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.ul
                key="links"
                initial={{ opacity: 0, filter: "blur(6px)", width: 0 }} animate={{ opacity: 1, filter: "blur(0px)", width: "auto" }}
                exit={{ opacity: 0, filter: "blur(6px)", width: 0 }} transition={t}
                className="hidden items-center overflow-hidden md:flex"
              >
                {LINKS.map(([label, href]) => (
                  <li key={href} onMouseEnter={() => setHoverLink(href)}>
                    <Link href={href} className="relative block whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] text-muted transition-colors duration-200 hover:text-ink">
                      {hoverLink === href && (
                        <motion.span layoutId="island-hover" transition={{ type: "spring", duration: 0.35, bounce: 0.15 }} className="absolute inset-0 rounded-full bg-white/[0.08]" />
                      )}
                      <span className="relative">{label}</span>
                    </Link>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>

          <motion.div layout="position" transition={t} className="mx-1 hidden items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1.5 font-mono text-[12px] text-muted sm:flex" title={`Latest block on ${CHAIN_NAME}`}>
            <span className="live-dot size-1.5 rounded-full bg-monad text-monad" />
            {block ? `#${block.toLocaleString()}` : "…"}
          </motion.div>

          <motion.div layout="position" transition={t}>
            <Link href="/app" className="press inline-flex items-center gap-1.5 rounded-full bg-terra px-4 py-2 text-[14px] font-medium text-[#1a0d08] hover:bg-terra-hi">
              Open app <ArrowRight className="size-3.5" weight="bold" />
            </Link>
          </motion.div>

          <button className="press ml-0.5 grid size-9 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-ink md:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>
            {menu ? <X className="size-[18px]" /> : <List className="size-[18px]" />}
          </button>
        </motion.nav>
      </div>

      {/* Mobile: the island morphs down into a menu card. */}
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: -12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={reduce ? { duration: 0 } : { type: "spring", duration: 0.4, bounce: 0.18 }}
            style={{ transformOrigin: "top center" }}
            className="fixed inset-x-3 top-[70px] z-50 rounded-[28px] border border-white/[0.08] bg-[#0b0e14]/95 p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.9)] backdrop-blur-xl md:hidden"
          >
            {LINKS.map(([label, href], i) => (
              <motion.div key={href} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i, duration: 0.2 }}>
                <Link href={href} onClick={() => setMenu(false)} className="block rounded-2xl px-4 py-3 text-[15px] text-ink hover:bg-white/[0.05]">{label}</Link>
              </motion.div>
            ))}
            <div className="mt-1 flex items-center gap-2 px-4 py-2 font-mono text-[12px] text-muted">
              <span className="live-dot size-1.5 rounded-full bg-monad text-monad" /> {block ? `Block #${block.toLocaleString()}` : "Connecting…"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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
