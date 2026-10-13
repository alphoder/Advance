"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  SquaresFour, Lightning, QrCode, Gauge, ClockCounterClockwise, LockKey, Vault, ChartLineUp, Robot, Cube,
  List, X, SignOut, Copy, Check, Fingerprint, UserCircle, Question, Gift,
} from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { AppDataProvider } from "@/lib/app-data";
import { publicClient, CHAIN_ID } from "@/lib/chain";
import { ChainToggle, Logo, short } from "@/components/ui";
import { SignIn } from "@/components/sign-in";
import { DemoGuide } from "./demo-guide";

type Item = { href: string; label: string; icon: typeof SquaresFour };
export const NAV: { group: string; items: Item[] }[] = [
  { group: "Borrow", items: [
    { href: "/app", label: "Home", icon: SquaresFour },
    { href: "/app/advance", label: "Get money now", icon: Lightning },
    { href: "/app/get-paid", label: "Get paid", icon: QrCode },
    { href: "/app/rewards", label: "Rewards and gift cards", icon: Gift },
    { href: "/app/score", label: "My score", icon: Gauge },
    { href: "/app/activity", label: "History", icon: ClockCounterClockwise },
    { href: "/app/files", label: "My documents", icon: LockKey },
  ] },
  { group: "Save", items: [
    { href: "/app/earn", label: "Save and earn", icon: Vault },
    { href: "/app/market", label: "Sell or buy savings", icon: ChartLineUp },
  ] },
  { group: "More", items: [
    { href: "/app/agents", label: "AI agents", icon: Robot },
    { href: "/app/protocol", label: "Proof and contracts", icon: Cube },
  ] },
];

const ALL: Item[] = NAV.flatMap((g) => g.items);

export function AppShell({ children }: { children: ReactNode }) {
  const { session } = useAccount();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  const current = ALL.find((i) => i.href === pathname) ?? ALL[0];

  const body = (
    <div className="relative flex min-h-[100dvh]">
      <aside className="sticky top-0 hidden h-[100dvh] w-64 shrink-0 flex-col border-r border-line bg-[#161b24]/95 px-3 py-5 backdrop-blur-2xl lg:flex">
        <SideNav pathname={pathname} />
      </aside>

      <AnimatePresence>
        {open && (
          <>
            <motion.div className="fixed inset-0 z-40 bg-bg/70 backdrop-blur-sm lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-line bg-bg-2 px-3 py-5 lg:hidden"
              initial={{ transform: "translateX(-100%)" }} animate={{ transform: "translateX(0%)" }} exit={{ transform: "translateX(-100%)" }}
              transition={{ duration: 0.32, ease: [0.32, 0.72, 0, 1] }}
            >
              <SideNav pathname={pathname} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Dynamic-Island top bar: one floating pill instead of a full-width header */}
        <header className="pointer-events-none sticky top-3 z-30 flex justify-center px-3 sm:px-6">
          <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-line-strong bg-[#0b0e14]/90 p-1.5 shadow-[0_18px_50px_-18px_rgb(0_0_0/0.9)] backdrop-blur-xl">
            <button className="press grid size-8 place-items-center rounded-full text-muted hover:text-ink lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><List className="size-5" /></button>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.h1 key={current.href} initial={{ opacity: 0, y: 6, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -6, filter: "blur(3px)" }}
                transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }} className="truncate px-3 text-[14px] font-semibold">
                {current.label}
              </motion.h1>
            </AnimatePresence>
            <LiveBlock />
            <div className="hidden sm:block"><ChainToggle compact /></div>
            <AccountMenu />
          </div>
        </header>
        <main className="relative flex-1">
          <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-96" />
          <div className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</div>
        </main>
      </div>
      <Suspense><DemoGuide /></Suspense>
    </div>
  );

  return session ? <AppDataProvider address={session.address}>{body}</AppDataProvider> : body;
}

function SideNav({ pathname }: { pathname: string }) {
  return (
    <>
      <div className="px-2"><Logo /></div>
      <nav className="mt-8 flex-1 space-y-6 overflow-y-auto">
        {NAV.map((g) => (
          <div key={g.group}>
            <div className="px-3 text-[11.5px] font-medium text-faint">{g.group}</div>
            <ul className="mt-1.5 space-y-0.5">
              {g.items.map(({ href, label, icon: Icon }) => {
                const active = pathname === href;
                return (
                  <li key={href}>
                    <Link href={href} className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] transition-colors ${active ? "text-ink" : "text-muted hover:text-ink"}`}>
                      {active && <motion.span layoutId="nav-active" className="absolute inset-0 rounded-xl border border-line-strong bg-white/[0.05]" transition={{ type: "spring", duration: 0.4, bounce: 0.15 }} />}
                      <Icon className={`relative size-[18px] ${active ? (g.group === "Borrow" ? "text-terra" : "text-monad-hi") : ""}`} weight={active ? "fill" : "regular"} />
                      <span className="relative">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      <Link href="/how-it-works" className="flex items-center gap-2.5 rounded-xl border border-line bg-white/[0.02] p-3 text-[13px] text-muted transition-colors hover:text-ink">
        <Question className="size-5 shrink-0 text-terra" weight="duotone" />
        <span>New here? <span className="text-ink">See how Advance works</span></span>
      </Link>
      <div className="mt-2 px-1 text-[11.5px] text-faint">Network {CHAIN_ID}. Every number is read from the chain.</div>
    </>
  );
}

function LiveBlock() {
  const [n, setN] = useState<bigint>();
  useEffect(() => {
    const tick = () => publicClient.getBlockNumber({ cacheTime: 0 }).then(setN).catch(() => {});
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="hidden items-center gap-2 rounded-full bg-white/[0.04] px-3 py-1.5 font-mono text-[12px] text-muted md:flex" title="Latest block">
      <span className="live-dot size-1.5 rounded-full bg-monad text-monad" />
      {n ? `#${n.toLocaleString()}` : "…"}
    </div>
  );
}

function AccountMenu() {
  const { session, signOut } = useAccount();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  if (!session) return <Link href="/app" className="press rounded-full bg-terra px-3.5 py-1.5 text-[13px] font-medium text-[#1a0d08]">Sign in</Link>;
  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} className="press flex items-center gap-2 rounded-full bg-white/[0.06] py-1.5 pl-2.5 pr-3 text-[13px] hover:bg-white/[0.09]">
        {session.kind === "passkey" ? <Fingerprint className="size-4 text-terra" weight="duotone" /> : <UserCircle className="size-4 text-muted" />}
        <span className="font-mono">{short(session.address)}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.16, ease: [0.23, 1, 0.32, 1] }} style={{ transformOrigin: "top right" }}
            className="absolute right-0 top-11 z-50 w-72 rounded-2xl border border-line-strong bg-panel p-2 shadow-[0_24px_60px_-20px_rgb(5_7_10/0.9)]"
          >
            <div className="px-3 py-2.5">
              <div className="text-[12px] text-muted">{session.kind === "passkey" ? "Passkey account (Mera)" : "Temporary demo account"}</div>
              <div className="mt-1 break-all font-mono text-[12.5px]">{session.address}</div>
            </div>
            <button
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] hover:bg-white/[0.05]"
              onClick={async () => { await navigator.clipboard.writeText(session.address); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
            >
              {copied ? <Check className="size-4 text-monad-hi" /> : <Copy className="size-4" />} Copy address
            </button>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13.5px] text-danger hover:bg-danger-soft" onClick={() => { setOpen(false); signOut(); }}>
              <SignOut className="size-4" /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Pages that act for a borrower render this instead of their content when signed out. */
export function Gate({ children, title, subtitle }: { children: ReactNode; title?: string; subtitle?: string }) {
  const { session, ready } = useAccount();
  const demo = useSearchParams().get("demo") === "1";
  if (!ready) return null;
  if (session) return <>{children}</>;
  return (
    <div className="py-6">
      <SignIn
        title={demo ? "Meet Priya. You're her now." : title}
        subtitle={demo ? "Priya is a freelance designer whose clients pay late. Create her account with Face ID. Four real clients will pay you onchain, then you get your first advance." : subtitle}
      />
    </div>
  );
}
