"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type RefObject } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

/** Hand-drawn notes under the island, each pointing at a nav link. Positions come from the real link rects. */
const HINTS = [
  { href: "/how-it-works", text: "Want to know how it works? Click here!", dx: -250, dy: 96, bend: -70, tone: "terra", tilt: -4 },
  { href: "/compare", text: "Curious how we're different?", dx: 30, dy: 118, bend: 50, tone: "monad", tilt: 3 },
  { href: "/safety", text: "Can it be cheated? We tried.", dx: 200, dy: 80, bend: 80, tone: "terra", tilt: -2 },
] as const;

type Geo = { x: number; y: number; tx: number; ty: number; w: number }[];

export function NavHints({ navRef, visible, onHover }: { navRef: RefObject<HTMLElement | null>; visible: boolean; onHover: (href?: string) => void }) {
  const reduce = useReducedMotion();
  const [geo, setGeo] = useState<Geo>();
  const [active, setActive] = useState<string>();

  const measure = useCallback(() => {
    const nav = navRef.current;
    if (!nav || window.innerWidth < 1024) return setGeo(undefined);
    const next: Geo = [];
    for (const h of HINTS) {
      const link = nav.querySelector<HTMLElement>(`[data-nav="${h.href}"]`);
      if (!link) return setGeo(undefined);
      const r = link.getBoundingClientRect();
      const tx = r.left + r.width / 2;
      next.push({ tx, ty: r.bottom + 8, x: tx + h.dx, y: r.bottom + h.dy, w: 0 });
    }
    setGeo(next);
  }, [navRef]);

  useEffect(() => {
    if (!visible) return;
    // The island finishes its open morph in ~0.6s; measure after it settles, and on resize.
    const t = setTimeout(measure, 650);
    window.addEventListener("resize", measure);
    return () => { clearTimeout(t); window.removeEventListener("resize", measure); };
  }, [visible, measure]);

  const hover = (href?: string) => { setActive(href); onHover(href); };

  return (
    <AnimatePresence>
      {visible && geo && (
        <motion.div
          key="hints"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
          className="pointer-events-none fixed inset-x-0 top-0 z-40 hidden h-72 lg:block"
          aria-label="Shortcuts"
        >
          <svg className="absolute inset-0 size-full overflow-visible" aria-hidden>
            {HINTS.map((h, i) => {
              const g = geo[i];
              const sx = g.x, sy = g.y - 14; // just above the note
              const c1x = sx + h.bend, c1y = sy - 45;
              const c2x = g.tx + h.bend * 0.35, c2y = g.ty + 42;
              const d = `M ${sx} ${sy} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${g.tx} ${g.ty}`;
              const ang = Math.atan2(g.ty - c2y, g.tx - c2x);
              const head = (a: number) => `${g.tx - 11 * Math.cos(ang + a)},${g.ty - 11 * Math.sin(ang + a)}`;
              const color = h.tone === "terra" ? "var(--terra)" : "var(--monad-hi)";
              const on = active === h.href;
              return (
                <g key={h.href} style={{ color }}>
                  <motion.path
                    d={d} fill="none" stroke="currentColor" strokeLinecap="round"
                    initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1, strokeWidth: on ? 3 : 2 }}
                    transition={{ pathLength: { duration: 0.8, delay: 0.3 + i * 0.25, ease: [0.65, 0, 0.35, 1] }, strokeWidth: { duration: 0.15 } }}
                    style={{ filter: on ? `drop-shadow(0 0 6px ${color})` : "none" }}
                  />
                  <motion.polyline
                    points={`${head(0.5)} ${g.tx},${g.ty} ${head(-0.5)}`} fill="none" stroke="currentColor" strokeWidth={on ? 3 : 2} strokeLinecap="round" strokeLinejoin="round"
                    initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: reduce ? 0 : 1.05 + i * 0.25, duration: 0.2 }}
                  />
                </g>
              );
            })}
          </svg>
          {HINTS.map((h, i) => {
            const g = geo[i];
            return (
              <motion.div
                key={h.href}
                initial={reduce ? false : { opacity: 0, y: 6, rotate: h.tilt }} animate={{ opacity: 1, y: 0, rotate: h.tilt }}
                transition={{ delay: reduce ? 0 : 0.15 + i * 0.25, duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="pointer-events-auto absolute -translate-x-1/2"
                style={{ left: g.x, top: g.y - 10 }}
              >
                <Link
                  href={h.href}
                  onMouseEnter={() => hover(h.href)} onMouseLeave={() => hover(undefined)} onFocus={() => hover(h.href)} onBlur={() => hover(undefined)}
                  className={`block whitespace-nowrap font-[family-name:var(--font-hand)] text-[23px] font-bold leading-none transition-transform duration-200 ease-out hover:scale-[1.06] ${h.tone === "terra" ? "text-terra" : "text-monad-hi"}`}
                >
                  {h.text}
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
