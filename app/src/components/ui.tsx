"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, PointerEvent, ReactNode } from "react";
import { ArrowUpRight, CircleNotch, Cube, WarningCircle } from "@phosphor-icons/react";
import { txUrl, addressUrl, IS_LOCAL, chain, D } from "@/lib/chain";
import { useChainView } from "./providers";

export const fmtUsd = (n: number, digits = 2) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 === 0 && digits === 2 ? 0 : digits, maximumFractionDigits: digits })}`;
export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

type Variant = "primary" | "monad" | "secondary" | "ghost";
const VARIANT: Record<Variant, string> = {
  primary: "bg-terra text-[#1a0d08] hover:bg-terra-hi shadow-[0_10px_30px_-12px_rgb(226_114_91/0.7)]",
  monad: "bg-monad text-white hover:bg-monad-hi shadow-[0_10px_30px_-12px_rgb(131_110_249/0.7)]",
  secondary: "border border-line-strong bg-white/[0.03] text-ink hover:bg-white/[0.07]",
  ghost: "text-muted hover:text-ink hover:bg-white/[0.05]",
};

export function Button({
  variant = "primary", loading, children, className = "", icon, ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean; icon?: ReactNode }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`press inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-5 text-[14.5px] font-medium disabled:pointer-events-none disabled:opacity-45 ${VARIANT[variant]} ${className}`}
    >
      {loading ? <CircleNotch className="size-4 animate-spin" weight="bold" /> : icon}
      {children}
    </button>
  );
}

/** Glass panel with a pointer-following spotlight border (CSS vars, no React state). */
export function Panel({ children, className = "", as: Tag = "div" }: { children: ReactNode; className?: string; as?: "div" | "section" }) {
  const onMove = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  return (
    <Tag onPointerMove={onMove} className={`glass spotlight rounded-2xl p-5 sm:p-6 ${className}`}>
      {children}
    </Tag>
  );
}

export function Label({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`text-[12.5px] font-medium text-muted ${className}`}>{children}</div>;
}

export function Stat({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "terra" | "monad" }) {
  const color = tone === "terra" ? "text-terra" : tone === "monad" ? "text-monad-hi" : "text-ink";
  return (
    <div>
      <Label>{label}</Label>
      <div className={`num mt-1.5 text-3xl font-semibold ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-[13px] text-muted">{hint}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden />;
}

/** "Proof" link. Always available; shows hash + block when the chain view is on. */
export function Proof({ hash, label = "Proof", block, ms }: { hash?: string; label?: string; block?: number; ms?: number }) {
  const { on } = useChainView();
  if (!hash) return null;
  const url = txUrl(hash);
  const text = on ? `${short(hash)}${block ? ` · #${block.toLocaleString()}` : ""}` : label;
  const inner = (
    <>
      <Cube className="size-3.5" weight="duotone" />
      <span className={on ? "font-mono" : ""}>{IS_LOCAL && !url ? `${text} (local)` : text}</span>
      {url && <ArrowUpRight className="size-3" />}
    </>
  );
  return (
    <span className="inline-flex items-center gap-2 text-[12.5px]">
      {ms !== undefined && (
        <span className="rounded-md bg-monad-soft px-1.5 py-0.5 font-mono text-[11.5px] text-monad-hi">{(ms / 1000).toFixed(2)}s</span>
      )}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted transition-colors hover:text-monad-hi">{inner}</a>
      ) : (
        <span className="inline-flex items-center gap-1 text-muted" title={hash}>{inner}</span>
      )}
    </span>
  );
}

export function AddressLink({ address }: { address: string }) {
  const url = addressUrl(address);
  return url ? (
    <a className="font-mono text-ink/90 underline decoration-line-strong underline-offset-4 hover:text-monad-hi" href={url} target="_blank" rel="noreferrer">{short(address)}</a>
  ) : (
    <span className="font-mono" title={address}>{short(address)}</span>
  );
}

export function ChainToggle({ compact = false }: { compact?: boolean }) {
  const { on, toggle } = useChainView();
  return (
    <button onClick={toggle} aria-pressed={on} className="press inline-flex items-center gap-2 rounded-lg border border-line px-2.5 py-1.5 text-[12.5px] text-muted hover:text-ink">
      <span className={`relative h-4 w-7 rounded-full transition-colors ${on ? "bg-monad" : "bg-white/10"}`}>
        <span className={`absolute left-0 top-0.5 size-3 rounded-full bg-white transition-transform duration-200 ease-out ${on ? "translate-x-3.5" : "translate-x-0.5"}`} />
      </span>
      {compact ? "Chain" : "Show me the chain"}
    </button>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 text-[17px] font-semibold tracking-tight ${className}`}>
      <img src="/icon.svg" alt="" className="size-7" /> Advance
    </Link>
  );
}

export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3.5 py-2.5 text-[13.5px] text-danger">
      <WarningCircle className="mt-0.5 size-4 shrink-0" weight="fill" />
      <span>{children}</span>
    </p>
  );
}

export function ContractList() {
  const rows: [string, string][] = [
    ["AdvancePool", D.pool], ["CreditLine", D.creditLine], ["ReceivablesFactory", D.factory],
    ["Steady share (advSR)", D.seniorToken], ["Boost share (advJR)", D.juniorToken], ["AUSD", D.ausd],
    ["CreditFiles", D.creditFiles], ...(D.kuruMarket ? [["Kuru advJR/AUSD", D.kuruMarket] as [string, string]] : []),
  ];
  return (
    <dl className="grid gap-x-8 gap-y-1 text-[13px] sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 py-1.5">
          <dt className="text-muted">{k}</dt>
          <dd><AddressLink address={v} /></dd>
        </div>
      ))}
    </dl>
  );
}

export const CHAIN_NAME = chain.name;

/** Small (?) that explains a term on hover or keyboard focus. */
export function InfoTip({ children, label = "What is this?" }: { children: ReactNode; label?: string }) {
  return (
    <span className="group/tip relative inline-flex align-middle">
      <button type="button" aria-label={label} className="grid size-4 place-items-center rounded-full border border-current/40 text-[10px] font-semibold leading-none opacity-70 hover:opacity-100 focus-visible:opacity-100">?</button>
      <span role="tooltip" className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-50 w-60 -translate-x-1/2 translate-y-1 rounded-xl border border-line-strong bg-[#0b0e14] px-3 py-2 text-left text-[12.5px] font-normal leading-snug text-ink opacity-0 shadow-[0_12px_30px_-10px_rgb(0_0_0/0.8)] transition-[opacity,transform] duration-150 ease-out group-hover/tip:translate-y-0 group-hover/tip:opacity-100 group-focus-within/tip:translate-y-0 group-focus-within/tip:opacity-100">
        {children}
      </span>
    </span>
  );
}
