"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, ShareNetwork, Storefront } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { useAppData } from "@/lib/app-data";
import { api } from "@/lib/tx";
import { IS_TESTNET } from "@/lib/chain";
import { Gate } from "@/components/app/shell";
import { PageHeader, ActivityRow } from "@/components/app/bits";
import { Button, ErrorNote, Panel, Label, fmtUsd } from "@/components/ui";
import { SplitAnimation, type SplitEvent } from "@/components/split";

export default function GetPaidPage() {
  return <Gate><Inner /></Gate>;
}

function Inner() {
  const { session } = useAccount();
  const { activity, refresh, pushLog } = useAppData();
  const [amount, setAmount] = useState("");
  const [memo, setMemo] = useState("");
  const [qr, setQr] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [split, setSplit] = useState<SplitEvent>();
  const [busy, setBusy] = useState(false);
  const [simAmount, setSimAmount] = useState(100);
  const [error, setError] = useState<string>();
  const lastMs = useRef<number | undefined>(undefined);
  const seen = useRef<Set<string> | null>(null);

  const origin = typeof window !== "undefined" ? location.origin : "";
  const params = new URLSearchParams();
  if (Number(amount) > 0) params.set("amount", amount);
  if (memo.trim()) params.set("for", memo.trim());
  const link = session ? `${origin}/pay/${session.address}${params.size ? `?${params}` : ""}` : "";

  useEffect(() => {
    if (link) QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#edf0f9", light: "#00000000" } }).then(setQr).catch(() => {});
  }, [link]);

  // Animate every PaymentSplit that lands after the page opened.
  useEffect(() => {
    if (!activity) return;
    const splits = activity.events.filter((e) => e.type === "PaymentSplit");
    if (!seen.current) {
      seen.current = new Set(splits.map((e) => e.key));
      const last = splits[0];
      if (last) setSplit({ key: last.key, amount: last.amount!, repaid: last.repaid!, toYou: last.toYou!, tx: last.tx, block: last.block });
      return;
    }
    const fresh = splits.find((e) => !seen.current!.has(e.key));
    splits.forEach((e) => seen.current!.add(e.key));
    if (fresh) setSplit({ key: fresh.key, amount: fresh.amount!, repaid: fresh.repaid!, toYou: fresh.toYou!, tx: fresh.tx, block: fresh.block, ms: lastMs.current });
  }, [activity]);

  async function simulate() {
    if (!session) return;
    setBusy(true); setError(undefined);
    try {
      const r = await api<{ hash: string; ms: number }>("/api/demo/pay", { address: session.address, amount: simAmount });
      lastMs.current = r.ms;
      setSplit((x) => (x && x.tx === r.hash ? { ...x, ms: r.ms } : x));
      pushLog([{ label: `Acme Studio paid you ${fmtUsd(simAmount)}`, hash: r.hash, ms: r.ms }]);
      refresh();
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const payments = activity?.events.filter((e) => e.type === "PaymentSplit") ?? [];
  const received = payments.reduce((s, e) => s + (e.toYou ?? 0), 0);

  return (
    <>
      <PageHeader title="Get paid" help={["Send your link or QR code to a client, like any invoice.", "When they pay, the payment is split in that same second.", "If you owe anything, 20% repays it. The rest is yours.", "On the test network, the purple button plays a client, so you can watch a payment split."]} sub="Clients pay your link with a passkey or wallet. Any advance you owe is repaid from the payment in the same second; the rest is yours." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Panel className="lg:col-span-7">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-[180px_1fr]">
            <div className="grid aspect-square place-items-center rounded-2xl border border-line bg-bg/60 p-3">
              {qr ? <img src={qr} alt="QR code for your payment link" className="size-full" /> : <div className="skeleton size-full" />}
            </div>
            <div className="min-w-0">
              <Label>Make an invoice link</Label>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <label htmlFor="amt" className="text-[12.5px] text-muted">Amount (optional)</label>
                  <div className="mt-1 flex min-h-11 items-center rounded-xl border border-line-strong bg-bg/60 px-3 focus-within:border-terra">
                    <span className="text-faint">$</span>
                    <input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="240" className="w-full bg-transparent px-1 font-mono outline-none placeholder:text-faint" />
                  </div>
                </div>
                <div>
                  <label htmlFor="memo" className="text-[12.5px] text-muted">For (optional)</label>
                  <input id="memo" value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="Logo design" className="mt-1 min-h-11 w-full rounded-xl border border-line-strong bg-bg/60 px-3 outline-none placeholder:text-faint focus:border-terra" />
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-line bg-bg/60 p-1.5 pl-3">
                <span className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-muted">{link}</span>
                <Button variant="secondary" className="min-h-9 px-3"
                  onClick={async () => { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1400); }}
                  icon={copied ? <Check className="size-4 text-monad-hi" /> : <Copy className="size-4" />}>{copied ? "Copied" : "Copy"}</Button>
                {typeof navigator !== "undefined" && "share" in navigator && (
                  <Button variant="secondary" className="min-h-9 px-3" onClick={() => navigator.share({ title: "Pay me with Advance", url: link }).catch(() => {})} icon={<ShareNetwork className="size-4" />}>Share</Button>
                )}
              </div>
              <p className="mt-3 text-[12.5px] text-faint">Payment address <span className="break-all font-mono">{activity?.account}</span></p>
            </div>
          </div>
        </Panel>

        <Panel className="lg:col-span-5">
          <Label>Received through Advance</Label>
          <div className="num mt-2 font-mono text-5xl font-semibold text-terra">{fmtUsd(received)}</div>
          <p className="mt-1 text-[13.5px] text-muted">across {payments.length} payment{payments.length === 1 ? "" : "s"}, after repayments</p>
          {IS_TESTNET && (
            <div className="mt-6 rounded-xl border border-dashed border-line-strong p-4">
              <div className="flex items-center gap-2 text-[13.5px] font-medium"><Storefront className="size-4 text-monad-hi" /> Demo: a client pays you</div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {[25, 100, 250].map((a) => (
                  <button key={a} onClick={() => setSimAmount(a)} className={`press rounded-lg border px-3 py-1.5 font-mono text-[13px] ${a === simAmount ? "border-monad bg-monad-soft text-monad-hi" : "border-line text-muted"}`}>{fmtUsd(a)}</button>
                ))}
              </div>
              <Button className="mt-3 w-full" variant="monad" loading={busy} onClick={simulate}>Acme Studio pays {fmtUsd(simAmount)}</Button>
            </div>
          )}
          <div className="mt-3"><ErrorNote>{error}</ErrorNote></div>
        </Panel>

        <div className="lg:col-span-7">{split ? <SplitAnimation e={split} /> : <Panel className="grid h-full min-h-60 place-items-center text-center text-muted">Your next payment will split here, live.</Panel>}</div>
        <Panel className="lg:col-span-5">
          <Label>Payments</Label>
          {payments.length ? <ul className="mt-1 divide-y divide-line">{payments.slice(0, 6).map((e, i) => <ActivityRow key={e.key} e={e} i={i} />)}</ul> : <p className="mt-3 text-[14px] text-muted">No payments yet.</p>}
        </Panel>
      </div>
    </>
  );
}
