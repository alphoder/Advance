"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Snowflake, Star, Gift, X, CheckCircle, Target, Crown, Coins } from "@phosphor-icons/react";
import { POINTS, POINT_VALUE, TIERS, EARN, MISSIONS, tierOf, nextTier, OWNED_START, OWNED_KEY, type OwnedCard } from "@/lib/rewards-data";
import { PageHeader } from "@/components/app/bits";
import { TrustCards } from "@/components/trust-cards";
import { AdvanceCard, GiftCard, CouponCard, Barcode, CopyCode, BRANDS, COUPONS, brand, makeCode, makePin, type Brand } from "@/components/rewards";

type Owned = OwnedCard;
const STARTER = OWNED_START;
const KEY = OWNED_KEY;
const CATS = ["All", "Food", "Travel", "Rides", "Fun", "Learning"] as const;
const EASE = [0.23, 1, 0.32, 1] as const;
const TIER = tierOf(POINTS);
const NEXT = nextTier(POINTS);

export default function Rewards() {
  const [frozen, setFrozen] = useState(false);
  const [cat, setCat] = useState<(typeof CATS)[number]>("All");
  const [buying, setBuying] = useState<Brand>();
  const [owned, setOwned] = useState<Owned[]>(STARTER);

  useEffect(() => {
    try { const s = localStorage.getItem(KEY); if (s) setOwned(JSON.parse(s)); } catch {}
  }, []);
  const add = (o: Owned) => {
    const next = [o, ...owned];
    setOwned(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  return (
    <>
      <PageHeader
        title="Rewards"
        help={["Spend anywhere with your Advance card.", "Buy gift cards for less than their value.", "Repay on time to earn points and unlock coupons."]}
        sub="Spend with your Advance card, buy gift cards below face value, and unlock coupons every time you repay on time."
      />

      {/* Card + points */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-3xl border border-line bg-panel/80 p-5 sm:p-7 lg:col-span-7">
          <div className="mx-auto max-w-[440px]"><AdvanceCard frozen={frozen} /></div>
          <div className="mx-auto mt-6 grid max-w-[440px] grid-cols-3 gap-2 text-center">
            {[["Spendable", "$50.00"], ["Cashback this month", "$3.20"], ["Card", frozen ? "Frozen" : "Active"]].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-white/[0.03] px-2 py-3"><div className="text-[12px] text-muted">{k}</div><div className="num mt-0.5 font-mono text-[15px] font-semibold">{v}</div></div>
            ))}
          </div>
          <div className="mx-auto mt-3 flex max-w-[440px] gap-2">
            <button onClick={() => setFrozen(!frozen)} className="press flex flex-1 items-center justify-center gap-2 rounded-xl border border-line-strong bg-white/[0.03] py-2.5 text-[14px] hover:bg-white/[0.07]">
              <Snowflake className="size-4" /> {frozen ? "Unfreeze card" : "Freeze card"}
            </button>
            <a href="#gift-cards" className="press flex flex-1 items-center justify-center gap-2 rounded-xl bg-terra py-2.5 text-[14px] font-medium text-[#1a0d08] hover:bg-terra-hi">
              <Gift className="size-4" weight="bold" /> Buy a gift card
            </a>
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-5">
          <div className="rounded-3xl bg-monad p-6 text-white">
            <div className="flex items-center justify-between text-[13px] opacity-80"><span>Advance points</span><span className="flex items-center gap-1"><Star weight="fill" className="size-3.5" /> {TIER.name}</span></div>
            <div className="num mt-1 font-mono text-5xl font-semibold">{POINTS.toLocaleString()}</div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-black/20"><motion.div className="h-full rounded-full bg-white" initial={{ width: 0 }} animate={{ width: `${NEXT ? (POINTS / NEXT.at) * 100 : 100}%` }} transition={{ duration: 0.9, ease: EASE, delay: 0.2 }} /></div>
            <div className="mt-2 text-[13px] opacity-85">{NEXT ? `${(NEXT.at - POINTS).toLocaleString()} more points to ${NEXT.name}: ${NEXT.perks.slice(0, 2).join(", ").toLowerCase()}.` : "Top tier reached."}</div>
          </div>
          <div className="flex-1 rounded-3xl border border-line bg-panel/80 p-6">
            <div className="flex items-center gap-2 text-[14px] font-semibold"><Coins className="size-5 text-terra" weight="duotone" /> Your points are worth</div>
            <div className="num mt-2 font-mono text-4xl font-semibold text-terra">${(POINTS * POINT_VALUE).toFixed(2)}</div>
            <div className="mt-1 text-[14px] text-muted">in gift cards. 100 points = $1, on top of each card&apos;s discount.</div>
            <a href="#earn" className="press mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line-strong px-4 py-2 text-[14px] hover:bg-white/[0.05]"><Target className="size-4" /> How to earn more</a>
          </div>
        </div>
      </div>

      <TrustCards />

      {/* Earn more */}
      <section id="earn" className="mt-10 scroll-mt-24">
        <h2 className="text-xl font-semibold tracking-tight">Earn more</h2>
        <p className="text-[14px] text-muted">Repay on time, use your card, bring a friend. Points turn into gift cards and better perks.</p>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {TIERS.map((t, i) => {
            const cur = t.name === TIER.name;
            const reached = POINTS >= t.at;
            return (
              <div key={t.name} className={`relative rounded-3xl p-5 ${cur ? "bg-monad text-white" : "border border-line bg-panel/80"} ${reached || cur ? "" : "opacity-90"}`}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold">{i === TIERS.length - 1 ? <Crown weight="fill" className="size-4 text-terra" /> : <Star weight={reached ? "fill" : "regular"} className={`size-4 ${cur ? "" : "text-terra"}`} />}{t.name}</span>
                  <span className={`font-mono text-[12px] ${cur ? "opacity-80" : "text-faint"}`}>{t.at.toLocaleString()} pts</span>
                </div>
                {cur && <div className="mt-1 text-[12px] opacity-85">You are here</div>}
                {!reached && <div className="mt-1 text-[12px] text-terra">{(t.at - POINTS).toLocaleString()} to go</div>}
                <ul className={`mt-3 space-y-1.5 text-[13px] ${cur ? "opacity-90" : "text-muted"}`}>
                  {t.perks.map((p) => <li key={p} className="flex gap-1.5"><CheckCircle weight="fill" className={`mt-0.5 size-3.5 shrink-0 ${cur ? "" : reached ? "text-terra" : "text-faint"}`} />{p}</li>)}
                </ul>
              </div>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-3xl border border-line bg-panel/80 p-6 lg:col-span-7">
            <div className="flex items-center gap-2 text-[14px] font-semibold"><Target className="size-5 text-monad-hi" weight="duotone" /> Missions this month</div>
            <ul className="mt-4 space-y-4">
              {MISSIONS.map((m, i) => {
                const done = m.done >= m.of;
                return (
                  <li key={m.id}>
                    <div className="flex items-baseline justify-between gap-3 text-[14px]">
                      <span className={done ? "text-muted line-through decoration-white/30" : ""}>{m.t}</span>
                      <span className={`shrink-0 font-mono text-[12.5px] ${done ? "text-faint" : "text-terra"}`}>{done ? "Claimed" : m.reward}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.07]">
                        <motion.div className={`h-full rounded-full ${done ? "bg-white/30" : "bg-monad"}`} initial={{ width: 0 }} whileInView={{ width: `${(m.done / m.of) * 100}%` }} viewport={{ once: true }} transition={{ duration: 0.8, ease: EASE, delay: i * 0.06 }} />
                      </div>
                      <span className="w-16 text-right font-mono text-[12px] text-faint">{"money" in m ? `$${m.done}/$${m.of}` : `${m.done}/${m.of}`}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="rounded-3xl border border-line bg-panel/80 p-6 lg:col-span-5">
            <div className="flex items-center gap-2 text-[14px] font-semibold"><Coins className="size-5 text-terra" weight="duotone" /> Always earning</div>
            <ul className="mt-4 divide-y divide-white/[0.06] text-[14px]">
              {EARN.map((e) => (
                <li key={e.t} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="text-muted">{e.t}</span>
                  <span className="shrink-0 font-mono text-ink">{typeof e.pts === "number" ? `+${e.pts}` : `+${e.pts}`}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-[12.5px] text-faint">At {TIER.name} you earn more on repayments. Points never affect your credit limit; only repayments do.</p>
          </div>
        </div>
      </section>

      {/* Gift cards */}
      <section id="gift-cards" className="mt-10 scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="text-xl font-semibold tracking-tight">Gift cards</h2><p className="text-[14px] text-muted">Pay with your advance or your points. Delivered instantly.</p></div>
          <div className="flex flex-wrap gap-1.5">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`press rounded-full px-3.5 py-1.5 text-[13px] transition-colors ${cat === c ? "bg-ink text-bg" : "bg-white/[0.05] text-muted hover:text-ink"}`}>{c}</button>
            ))}
          </div>
        </div>
        <motion.div layout className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          <AnimatePresence mode="popLayout" initial={false}>
            {BRANDS.filter((b) => cat === "All" || b.cat === cat).map((b) => (
              <motion.button
                layout key={b.id} onClick={() => setBuying(b)}
                initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.2, ease: EASE }}
                className="group text-left"
              >
                <GiftCard b={b} className="transition-transform duration-300 ease-out group-hover:-translate-y-1 group-hover:-rotate-1" />
                <div className="mt-2.5 flex items-center justify-between gap-2 px-0.5">
                  <div className="min-w-0"><div className="truncate text-[14px] font-medium">{b.name}</div><div className="text-[12px] text-faint">{b.cat} · from ${b.amounts[0]}</div></div>
                  <span className="shrink-0 rounded-full bg-terra/15 px-2 py-0.5 text-[12px] font-medium text-terra">Save {b.off}%</span>
                </div>
              </motion.button>
            ))}
          </AnimatePresence>
        </motion.div>
      </section>

      {/* Wallet of bought cards */}
      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">My gift cards</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {owned.map((o) => {
            const b = brand(o.brand);
            return (
              <div key={o.id} className="flex gap-4 rounded-2xl border border-line bg-panel/80 p-4">
                <div className="w-32 shrink-0 sm:w-40"><GiftCard b={b} amount={o.amount} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2"><span className="font-medium">{b.name}</span><span className="text-[12px] text-faint">{o.at}</span></div>
                  <div className="text-[13px] text-muted"><span className="num font-mono text-ink">${o.left.toFixed(2)}</span> left of ${o.amount}</div>
                  <div className="mt-2"><CopyCode code={o.code} /></div>
                  <div className="mt-1.5 text-[12px] text-faint">PIN <span className="font-mono text-muted">{o.pin}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Coupons */}
      <section className="mt-10">
        <div><h2 className="text-xl font-semibold tracking-tight">Coupons</h2><p className="text-[14px] text-muted">Unlocked by repaying on time. New ones every month.</p></div>
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {COUPONS.map((c) => <CouponCard key={c.id} c={c} />)}
        </div>
      </section>

      <AnimatePresence>{buying && <BuySheet b={buying} onClose={() => setBuying(undefined)} onBought={add} />}</AnimatePresence>
    </>
  );
}

function BuySheet({ b, onClose, onBought }: { b: Brand; onClose: () => void; onBought: (o: Owned) => void }) {
  const [amount, setAmount] = useState(b.amounts[1]);
  const [pay, setPay] = useState<"advance" | "points">("advance");
  const [done, setDone] = useState<Owned>();
  const price = amount * (1 - b.off / 100);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const buy = () => {
    const o: Owned = { id: crypto.randomUUID(), brand: b.id, amount, left: amount, code: makeCode(b.prefix), pin: makePin(), at: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" }) };
    setDone(o);
    onBought(o);
  };

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-end bg-bg/70 backdrop-blur-sm sm:place-items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog" aria-modal aria-label={`Buy a ${b.name} gift card`}
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 16, scale: 0.98 }} transition={{ duration: 0.25, ease: EASE }}
        className="relative w-full max-w-md rounded-t-3xl border border-line-strong bg-[#161b24] p-6 sm:rounded-3xl"
      >
        <button onClick={onClose} aria-label="Close" className="press absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:text-ink"><X className="size-5" /></button>
        <div className="[perspective:1000px]">
          <motion.div className="relative" style={{ transformStyle: "preserve-3d" }} animate={{ rotateY: done ? 180 : 0 }} transition={{ type: "spring", duration: 0.8, bounce: 0.15 }}>
            <div style={{ backfaceVisibility: "hidden" }}><GiftCard b={b} amount={amount} /></div>
            <div className="absolute inset-0 flex flex-col justify-between rounded-2xl bg-[#f4f6fa] p-[6%] text-[#12161d]" style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}>
              <div className="flex items-center justify-between text-[12px]"><span className="font-semibold">{b.name}</span><span className="font-mono">${amount}.00</span></div>
              <Barcode value={done?.code ?? "x"} className="h-14 w-full text-[#12161d]" />
              <div className="flex items-end justify-between font-mono text-[12px]"><span>{done?.code}</span><span>PIN {done?.pin}</span></div>
            </div>
          </motion.div>
        </div>

        {!done ? (
          <>
            <div className="mt-5 text-[13px] text-muted">Amount</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {b.amounts.map((a) => (
                <button key={a} onClick={() => setAmount(a)} className={`press rounded-xl border py-2.5 font-mono text-[15px] transition-colors ${a === amount ? "border-terra bg-terra/10 text-terra" : "border-line-strong text-ink hover:bg-white/[0.04]"}`}>${a}</button>
              ))}
            </div>
            <div className="mt-4 text-[13px] text-muted">Pay with</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {([["advance", "Advance balance", `$${price.toFixed(2)}`], ["points", "Points", `${Math.round(price * 100).toLocaleString()} pts`]] as const).map(([k, t, v]) => (
                <button key={k} onClick={() => setPay(k)} className={`press rounded-xl border p-3 text-left transition-colors ${pay === k ? "border-monad bg-monad/10" : "border-line-strong hover:bg-white/[0.04]"}`}>
                  <div className="text-[13px] text-muted">{t}</div><div className="num font-mono text-[15px]">{v}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-[14px]"><span className="text-muted">You save</span><span className="font-mono text-terra">${(amount - price).toFixed(2)} ({b.off}%)</span></div>
            <button onClick={buy} className="press mt-4 w-full rounded-xl bg-terra py-3 text-[15px] font-medium text-[#1a0d08] hover:bg-terra-hi">
              Buy for {pay === "advance" ? `$${price.toFixed(2)}` : `${Math.round(price * 100).toLocaleString()} pts`}
            </button>
          </>
        ) : (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.3, ease: EASE }} className="mt-5">
            <div className="flex items-center gap-2 text-[15px] font-semibold"><CheckCircle weight="fill" className="size-5 text-terra" /> Your {b.name} card is ready</div>
            <div className="mt-3"><CopyCode code={done.code} /></div>
            <div className="mt-2 text-[13px] text-muted">PIN <span className="font-mono text-ink">{done.pin}</span>. Saved to My gift cards.</div>
            <button onClick={onClose} className="press mt-4 w-full rounded-xl border border-line-strong py-3 text-[15px] hover:bg-white/[0.05]">Done</button>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
}
