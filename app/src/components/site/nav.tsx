"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { List, X, ArrowRight } from "@phosphor-icons/react";
import { Logo, ChainToggle, ContractList, CHAIN_NAME } from "@/components/ui";
import { useChainView } from "@/components/providers";
import { publicClient } from "@/lib/chain";

const LINKS = [
  ["How it works", "/how-it-works"],
  ["Borrow", "/borrow"],
  ["Save", "/save"],
  ["Agents", "/agents"],
  ["Compare", "/compare"],
  ["Security", "/safety"],
  ["FAQ", "/faq"],
] as const;

// iOS sheet curve: fast start, long gentle settle. Width is the only thing that moves; text just fades.
const EASE_IOS = [0.32, 0.72, 0, 1] as const;
const MORPH = 0.55;

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

/**
 * Animates between 0 and the content's measured pixel width (never `auto`), so the island
 * resizes in one continuous motion. Content fades out fast on collapse and in after the
 * pill has started opening, so text never squashes.
 */
function Collapse({ open, reduce, children, className = "" }: { open: boolean; reduce: boolean; children: ReactNode; className?: string }) {
  const inner = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    const el = inner.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.scrollWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <motion.div
      initial={false}
      aria-hidden={!open}
      animate={{ width: w ? (open ? w : 0) : "auto", opacity: open ? 1 : 0 }}
      transition={reduce ? { duration: 0 } : {
        width: { duration: MORPH, ease: EASE_IOS },
        opacity: open ? { duration: 0.28, delay: 0.12, ease: "easeOut" } : { duration: 0.14, ease: "easeOut" },
      }}
      className={`overflow-hidden ${open ? "" : "pointer-events-none"} ${className}`}
    >
      <div ref={inner} className="flex w-max items-center">{children}</div>
    </motion.div>
  );
}

/** Dynamic-Island navigation: a floating pill that expands at the top and shrinks to a live status island on scroll. */
export function SiteNav() {
  const reduce = Boolean(useReducedMotion());
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [menu, setMenu] = useState(false);
  const [hoverLink, setHoverLink] = useState<string>();
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const block = useBlock();

  // Hysteresis: collapse past 120px, expand above 60px, so it never flickers around one threshold.
  useMotionValueEvent(scrollY, "change", (y) => setScrolled((was) => (was ? y > 60 : y > 120)));

  // Small open delay and longer close delay: brushing past doesn't trigger a morph, and leaving mid-morph doesn't bounce.
  const onEnter = () => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => setHovered(true), 90); };
  const onLeave = () => { clearTimeout(hoverTimer.current); hoverTimer.current = setTimeout(() => { setHovered(false); setHoverLink(undefined); }, 260); };
  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const expanded = !scrolled || hovered;

  return (
    <>
      <div className="h-20" aria-hidden />
      <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-3">
        <nav
          onMouseEnter={onEnter}
          onMouseLeave={onLeave}
          className="pointer-events-auto flex items-center rounded-full border border-white/[0.08] bg-[#0b0e14]/90 p-1.5 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.9),inset_0_1px_0_rgb(255_255_255/0.06)] backdrop-blur-xl"
          aria-label="Main"
        >
          <Link href="/" className="flex items-center rounded-full py-1 pl-2.5 pr-1.5 text-[15px] font-semibold tracking-tight" aria-label="Advance home">
            <img src="/icon.svg" alt="" className="size-6 shrink-0" />
            <Collapse open={expanded} reduce={reduce}><span className="pl-2 pr-1 whitespace-nowrap">Advance</span></Collapse>
          </Link>

          <Collapse open={expanded} reduce={reduce} className="hidden md:block">
            <ul className="flex items-center pr-1" onMouseLeave={() => setHoverLink(undefined)}>
              {LINKS.map(([label, href]) => (
                <li key={href} onMouseEnter={() => setHoverLink(href)}>
                  <Link href={href} tabIndex={expanded ? 0 : -1} className="relative block whitespace-nowrap rounded-full px-3.5 py-2 text-[14px] text-muted transition-colors duration-200 hover:text-ink">
                    {hoverLink === href && (
                      <motion.span layoutId="island-hover" transition={{ type: "spring", duration: 0.32, bounce: 0.1 }} className="absolute inset-0 rounded-full bg-white/[0.08]" />
                    )}
                    <span className="relative">{label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Collapse>

          <div className="mx-1 hidden items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1.5 font-mono text-[12px] text-muted sm:flex" title={`Latest block on ${CHAIN_NAME}`}>
            <span className="live-dot size-1.5 rounded-full bg-monad text-monad" />
            <span className="tabular-nums">{block ? `#${block.toLocaleString()}` : "…"}</span>
          </div>

          <Link href="/app" className="press inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-terra px-4 py-2 text-[14px] font-medium text-[#1a0d08] hover:bg-terra-hi">
            Open app <ArrowRight className="size-3.5" weight="bold" />
          </Link>

          <button className="press ml-0.5 grid size-9 place-items-center rounded-full text-muted hover:bg-white/[0.06] hover:text-ink md:hidden" onClick={() => setMenu((m) => !m)} aria-label="Menu" aria-expanded={menu}>
            {menu ? <X className="size-[18px]" /> : <List className="size-[18px]" />}
          </button>
        </nav>
      </div>

      {/* Mobile: the island morphs down into a menu card. */}
      <AnimatePresence>
        {menu && (
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: -6 }}
            transition={reduce ? { duration: 0 } : { duration: 0.32, ease: EASE_IOS }}
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
          {[["How it works", "/how-it-works"], ["Borrow", "/borrow"], ["Save", "/save"], ["Agents", "/agents"], ["Compare", "/compare"], ["Business model", "/business"], ["Security", "/safety"], ["Stress tests", "/stress-tests"], ["Technology", "/technology"], ["FAQ", "/faq"], ["Check an address", "/check"], ["Open the app", "/app"]].map(([l, h]) => (
            <Link key={h} href={h} className="text-muted hover:text-ink">{l}</Link>
          ))}
        </div>
        <ChainToggle />
      </div>
      {on && <div className="mt-6"><ContractList /></div>}
    </footer>
  );
}
