"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight } from "@phosphor-icons/react";

const EASE = [0.23, 1, 0.32, 1] as const;

/** Top of every website page: one clear question, one clear answer. */
export function PageIntro({ title, sub, children }: { title: ReactNode; sub: ReactNode; children?: ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <section className="relative overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-4xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
        <motion.h1
          initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE }}
          className="text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] sm:text-6xl"
        >
          {title}
        </motion.h1>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.08, ease: EASE }}
          className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-muted"
        >
          {sub}
        </motion.p>
        {children && (
          <motion.div initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.16, ease: EASE }} className="mt-8 flex flex-wrap justify-center gap-3">
            {children}
          </motion.div>
        )}
      </div>
    </section>
  );
}

export function Section({ title, sub, children, center = false, id }: { title?: ReactNode; sub?: ReactNode; children: ReactNode; center?: boolean; id?: string }) {
  return (
    <section id={id} className="mx-auto max-w-6xl scroll-mt-24 px-4 py-16 sm:px-6 sm:py-20">
      {(title || sub) && (
        <div className={`mb-10 ${center ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}`}>
          {title && <h2 className="text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{title}</h2>}
          {sub && <p className="mt-3 text-lg leading-relaxed text-muted">{sub}</p>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Reveal({ children, i = 0, className = "" }: { children: ReactNode; i?: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.08 }}
      transition={{ duration: 0.55, delay: i * 0.06, ease: EASE }} className={className}
    >
      {children}
    </motion.div>
  );
}

/** Ends each page by pointing to the next one, so the site reads as a story. */
export function NextPage({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-8 pt-8 sm:px-6">
      <Link href={href} className="group block">
        <div className="press flex items-center justify-between gap-6 rounded-3xl border border-line bg-panel/80 p-7 transition-colors hover:border-line-strong sm:p-9">
          <div>
            <div className="text-[14px] text-muted">Next</div>
            <div className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</div>
            <div className="mt-1.5 text-muted">{sub}</div>
          </div>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-terra text-[#1a0d08] transition-transform duration-300 group-hover:translate-x-1">
            <ArrowRight className="size-5" weight="bold" />
          </span>
        </div>
      </Link>
    </section>
  );
}

export function CtaLink({ href, children, variant = "primary" }: { href: string; children: ReactNode; variant?: "primary" | "secondary" | "monad" }) {
  const style = {
    primary: "bg-terra text-[#1a0d08] hover:bg-terra-hi shadow-[0_14px_40px_-14px_rgb(226_114_91/0.8)]",
    monad: "bg-monad text-white hover:bg-monad-hi",
    secondary: "border border-line-strong bg-white/[0.03] text-ink hover:bg-white/[0.07]",
  }[variant];
  return (
    <Link href={href} className={`press inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-[15px] font-medium ${style}`}>
      {children}
    </Link>
  );
}

/** A plain-language Q&A row used across pages. */
export function QA({ q, children }: { q: string; children: ReactNode }) {
  return (
    <details className="group rounded-2xl border border-line bg-panel/70 p-5 open:bg-panel">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-medium">
        {q}
        <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line text-muted transition-transform duration-200 group-open:rotate-45">+</span>
      </summary>
      <div className="mt-3 text-[15px] leading-relaxed text-muted">{children}</div>
    </details>
  );
}

/** Honest build status: Live = deployed and tested today; Next = designed, not built yet. */
export function Status({ s }: { s: "live" | "next" | "partial" }) {
  const map = {
    live: ["Live", "bg-monad text-white"],
    partial: ["Partly live", "bg-white/10 text-ink"],
    next: ["Next", "border border-terra/50 text-terra"],
  } as const;
  const [label, cls] = map[s];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[12px] font-medium ${cls}`}>{label}</span>;
}
