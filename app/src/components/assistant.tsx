"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChatCircleDots, X, PaperPlaneRight, ArrowCounterClockwise, Sparkle } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { OWNED_KEY, OWNED_START } from "@/lib/rewards-data";

/** "Ask Advance": a chat assistant in the bottom-right corner on every page. Replies stream in. */

type Msg = { role: "user" | "model"; text: string };
const EASE = [0.23, 1, 0.32, 1] as const;

/** Open the assistant from anywhere with a question already asked. */
export const ask = (q: string) => window.dispatchEvent(new CustomEvent("advance:ask", { detail: q }));

const ASK_IN = ["How do I raise my limit?", "How can I earn more points?", "When is my advance fully repaid?", "Which gift card is the best deal?"];
const ASK_OUT = ["How does Advance work?", "What does an advance cost?", "What if my client pays late?", "How do savers earn?"];

export function Assistant() {
  const { session } = useAccount();
  const address = session?.address;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    field.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sendRef = useRef<(q: string) => void>(() => {});
  useEffect(() => {
    const on = (e: Event) => { setOpen(true); sendRef.current((e as CustomEvent<string>).detail); };
    window.addEventListener("advance:ask", on);
    return () => window.removeEventListener("advance:ask", on);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [msgs]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const history: Msg[] = [...msgs, { role: "user", text: q }];
    setMsgs([...history, { role: "model", text: "" }]);
    setInput("");
    setBusy(true);
    let giftCards: unknown = OWNED_START;
    try { const s = localStorage.getItem(OWNED_KEY); if (s) giftCards = JSON.parse(s); } catch {}
    const put = (t: string) => setMsgs((m) => [...m.slice(0, -1), { role: "model", text: t }]);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, address, page: pathname, giftCards: address ? giftCards : undefined }),
      });
      if (!r.ok || !r.body) { put((await r.text()) || "Something went wrong. Try again."); return; }
      const reader = r.body.pipeThrough(new TextDecoderStream()).getReader();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += value;
        put(acc);
      }
      if (!acc) put("I didn't catch that. Could you ask again?");
    } catch {
      put("I couldn't reach the assistant. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  sendRef.current = send;
  const asks = address ? ASK_IN : ASK_OUT;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog" aria-label="Ask Advance"
            initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.22, ease: EASE }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed bottom-24 right-3 z-[60] flex h-[min(600px,calc(100dvh-8rem))] w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-3xl border border-line-strong bg-[#141922]/95 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8)] backdrop-blur-xl sm:right-5 sm:w-[390px]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4 py-3">
              <div className="grid size-9 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#b3a6ff,#836ef9_50%,#5b4bc4)] text-white"><Sparkle weight="fill" className="size-4" /></div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-semibold">Ask Advance</div>
                <div className="flex items-center gap-1.5 text-[12px] text-muted"><span className="size-1.5 rounded-full bg-[#4ade80]" />{address ? "Knows your account" : "Replies in seconds"}</div>
              </div>
              {msgs.length > 0 && (
                <button onClick={() => setMsgs([])} aria-label="New chat" title="New chat" className="press rounded-lg p-2 text-muted hover:text-ink"><ArrowCounterClockwise className="size-4" /></button>
              )}
              <button onClick={() => setOpen(false)} aria-label="Close" className="press rounded-lg p-2 text-muted hover:text-ink"><X className="size-4" /></button>
            </div>

            <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <Bubble role="model">
                {address
                  ? "Hi! I can see your account: your limit, what you owe, your payments and your rewards. Ask me how to grow your limit, repay faster or earn more points."
                  : "Hi! Ask me anything about Advance: how it works, what it costs, or what happens if a client pays late. Sign in and I can give advice on your own account."}
              </Bubble>
              {msgs.map((m, i) => (
                <Bubble key={i} role={m.role}>{m.text ? <Rich text={m.text} /> : <Dots />}</Bubble>
              ))}
              {msgs.length === 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {asks.map((a) => (
                    <button key={a} onClick={() => send(a)} className="press rounded-full border border-line-strong bg-white/[0.03] px-3 py-1.5 text-[13px] text-muted hover:text-ink">{a}</button>
                  ))}
                </div>
              )}
            </div>

            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2 border-t border-line p-3">
              <textarea
                ref={field} value={input} rows={1} maxLength={1500}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                placeholder="Ask anything…" aria-label="Your question"
                className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-line bg-white/[0.04] px-3 py-2.5 text-[14px] outline-none placeholder:text-faint focus:border-monad/60"
              />
              <button type="submit" disabled={busy || !input.trim()} aria-label="Send"
                className="press grid size-[42px] shrink-0 place-items-center rounded-xl bg-terra text-[#1a0d08] transition-opacity disabled:opacity-40">
                <PaperPlaneRight weight="fill" className="size-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close assistant" : "Ask Advance"}
        className="press fixed bottom-5 right-5 z-[60] grid size-14 place-items-center rounded-full bg-[radial-gradient(circle_at_30%_25%,#b3a6ff,#836ef9_50%,#5b4bc4)] text-white shadow-[0_16px_40px_-10px_rgb(131_110_249/0.8)] ring-1 ring-white/20"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={open ? "x" : "c"} initial={{ opacity: 0, rotate: -45, scale: 0.8 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: 45, scale: 0.8 }} transition={{ duration: 0.18, ease: EASE }}>
            {open ? <X weight="bold" className="size-6" /> : <ChatCircleDots weight="fill" className="size-7" />}
          </motion.span>
        </AnimatePresence>
      </button>
    </>
  );
}

function Bubble({ role, children }: { role: Msg["role"]; children: ReactNode }) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[14px] leading-relaxed ${role === "user" ? "rounded-br-md bg-terra text-[#1a0d08]" : "rounded-bl-md bg-white/[0.06] text-ink"}`}>
        {children}
      </div>
    </div>
  );
}

function Dots() {
  return (
    <span className="flex gap-1 py-1.5" aria-label="Thinking">
      {[0, 1, 2].map((i) => (
        <motion.span key={i} className="size-1.5 rounded-full bg-muted" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
      ))}
    </span>
  );
}

/** Just enough markdown: bullets, **bold**, and in-app paths as links. */
function Rich({ text }: { text: string }) {
  const inline = (s: string) =>
    s.split(/(\[[^\]]+\]\(\/[^)\s]*\)|\*\*[^*]+\*\*|\/app(?:\/[a-z-]+)?)/g).map((p, i) => {
      const md = p.match(/^\[([^\]]+)\]\((\/[^)\s]*)\)$/);
      if (md) return <Link key={i} href={md[2]} className="text-monad-hi underline underline-offset-2">{md[1]}</Link>;
      return p.startsWith("**") ? <strong key={i} className="font-semibold">{p.slice(2, -2)}</strong>
        : p.startsWith("/app") ? <Link key={i} href={p} className="text-monad-hi underline underline-offset-2">{p}</Link>
          : p;
    });
  const lines = text.split("\n");
  return (
    <div className="space-y-1.5">
      {lines.map((l, i) => {
        const b = l.match(/^\s*[-*•]\s+(.*)/);
        if (b) return <div key={i} className="flex gap-2"><span className="mt-[9px] size-1 shrink-0 rounded-full bg-terra" /><span>{inline(b[1])}</span></div>;
        return l.trim() ? <p key={i}>{inline(l)}</p> : null;
      })}
    </div>
  );
}
