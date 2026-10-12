"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { txUrl, addressUrl, IS_LOCAL, chain, D } from "@/lib/chain";
import { useChainView } from "./providers";
import { useAccount } from "@/lib/account";

export const fmtUsd = (n: number, digits = 2) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: n % 1 === 0 && digits === 2 ? 0 : digits, maximumFractionDigits: digits })}`;
export const short = (a?: string) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function Button({
  variant = "primary",
  loading,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "violet"; loading?: boolean }) {
  const styles = {
    primary: "bg-ink text-paper hover:bg-black",
    violet: "bg-violet text-white hover:brightness-110",
    secondary: "bg-card text-ink border border-line hover:border-ink/40",
    ghost: "text-ink hover:bg-ink/5",
  }[variant];
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 text-[15px] font-medium transition active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 ${styles} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return <span aria-hidden className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent ${className}`} />;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-line bg-card p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-[13px] font-medium uppercase tracking-wide text-muted">{children}</div>;
}

/** "See proof" link. Always available; louder when the chain view is on. */
export function Proof({ hash, label = "See proof", block, ms }: { hash?: string; label?: string; block?: number; ms?: number }) {
  const { on } = useChainView();
  if (!hash) return null;
  const url = txUrl(hash);
  const text = on ? `${short(hash)}${block ? ` · block ${block.toLocaleString()}` : ""}` : label;
  return (
    <span className="inline-flex items-center gap-2 text-[13px] text-muted">
      {ms !== undefined && <span className="rounded-full bg-violet-soft px-2 py-0.5 font-medium text-violet">settled in {(ms / 1000).toFixed(2)}s</span>}
      {url ? (
        <a href={url} target="_blank" rel="noreferrer" className={`underline decoration-line underline-offset-4 hover:text-ink ${on ? "font-mono" : ""}`}>
          {text} ↗
        </a>
      ) : (
        <span className={on ? "font-mono" : ""} title={hash}>{IS_LOCAL ? `${text} (local chain)` : text}</span>
      )}
    </span>
  );
}

export function AddressLink({ address }: { address: string }) {
  const url = addressUrl(address);
  return url ? (
    <a className="font-mono underline decoration-line underline-offset-4" href={url} target="_blank" rel="noreferrer">{short(address)}</a>
  ) : (
    <span className="font-mono" title={address}>{short(address)}</span>
  );
}

export function ChainToggle() {
  const { on, toggle } = useChainView();
  return (
    <button onClick={toggle} aria-pressed={on} className="inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 text-[13px] text-muted hover:text-ink">
      <span className={`relative h-4 w-7 rounded-full transition ${on ? "bg-violet" : "bg-line"}`}>
        <span className={`absolute top-0.5 size-3 rounded-full bg-white transition ${on ? "left-3.5" : "left-0.5"}`} />
      </span>
      Show me the chain
    </button>
  );
}

export function Nav() {
  const { session } = useAccount();
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
      <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <img src="/icon.svg" alt="" className="size-7" /> Advance
      </Link>
      <nav className="flex items-center gap-1 text-[15px] sm:gap-2">
        <Link href="/earn" className="rounded-full px-3 py-2 text-muted hover:text-ink">Earn</Link>
        <Link href="/app" className="rounded-full bg-ink px-4 py-2 text-paper">{session ? "My Advance" : "Sign in"}</Link>
      </nav>
    </header>
  );
}

export function Footer() {
  const { on } = useChainView();
  return (
    <footer className="mx-auto mt-auto w-full max-w-6xl px-4 pb-10 pt-16 text-[13px] text-muted sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
        <span>Advance runs on {chain.name}. Every number on this site is read from the chain.</span>
        <ChainToggle />
      </div>
      {on && <ContractList />}
    </footer>
  );
}

function ContractList() {
  const rows: [string, string][] = [
    ["AdvancePool", D.pool], ["CreditLine", D.creditLine], ["ReceivablesFactory", D.factory],
    ["Steady share token (advSR)", D.seniorToken], ["Boost share token (advJR)", D.juniorToken], ["AUSD", D.ausd],
  ];
  return (
    <dl className="mt-4 grid gap-x-6 gap-y-1 font-mono text-[12px] sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b border-line/60 py-1">
          <dt className="font-sans text-muted">{k}</dt>
          <dd><AddressLink address={v} /></dd>
        </div>
      ))}
    </dl>
  );
}

export function ErrorNote({ children }: { children?: ReactNode }) {
  if (!children) return null;
  return <p role="alert" className="rounded-2xl bg-red-soft px-4 py-3 text-[14px] text-red">{children}</p>;
}
