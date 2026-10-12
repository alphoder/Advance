"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Address } from "viem";
import type { ScoreResult } from "@/server/score";
import { useAccount } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { api, sendTx } from "@/lib/tx";
import { creditAbi, erc20Abi } from "@/lib/abi";
import { D, IS_TESTNET } from "@/lib/chain";
import { Nav, Footer, Button, Card, ErrorNote, Proof, fmtUsd, short, Label, Spinner, ChainToggle } from "@/components/ui";
import { SignIn } from "@/components/sign-in";
import { ScoreView } from "@/components/score-view";
import { SplitAnimation, type SplitEvent } from "@/components/split";

type Ev = { type: string; key: string; tx: string; block: number; ts: number; amount?: number; fee?: number; repaid?: number; toYou?: number; tier?: number; payer?: string };
type Activity = {
  account: Address;
  accountOpen: boolean;
  shareBps: number;
  balance: number;
  gas: number;
  credit: { limit: number; principal: number; fee: number; owed: number; available: number; totalBorrowed: number; totalRepaid: number; repayments: number; tier: number; defaulted: boolean };
  events: Ev[];
};
type TxLine = { label: string; hash: string };

export default function Page() {
  return (
    <>
      <Nav />
      <main className="mx-auto w-full max-w-2xl px-4 pb-10 sm:px-6">
        <Suspense fallback={<div className="py-20 text-center"><Spinner /></div>}>
          <AppInner />
        </Suspense>
      </main>
      <Footer />
    </>
  );
}

function AppInner() {
  const { session, ready } = useAccount();
  const demo = useSearchParams().get("demo") === "1";
  if (!ready) return <div className="py-20 text-center"><Spinner /></div>;
  if (!session)
    return (
      <div className="pt-6">
        <SignIn
          title={demo ? "Meet Priya. You're her now." : undefined}
          subtitle={demo ? "Priya is a freelance designer whose clients pay late. Create her account with Face ID. Then four real clients will pay you, and you'll get your first advance." : undefined}
        />
      </div>
    );
  return <Dashboard address={session.address} demo={demo} />;
}

function Dashboard({ address, demo }: { address: Address; demo: boolean }) {
  const { session, signOut } = useAccount();
  const { data, refresh } = usePoll<Activity>(`/api/activity?address=${address}`);
  const [score, setScore] = useState<ScoreResult>();
  const [steps, setSteps] = useState<TxLine[]>([]);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [split, setSplit] = useState<SplitEvent>();
  const lastMs = useRef<number | undefined>(undefined);
  const seen = useRef<Set<string> | null>(null);

  // Animate any PaymentSplit that appears after the first load.
  useEffect(() => {
    if (!data) return;
    const splits = data.events.filter((e) => e.type === "PaymentSplit");
    if (!seen.current) { seen.current = new Set(splits.map((e) => e.key)); return; }
    const fresh = splits.find((e) => !seen.current!.has(e.key));
    splits.forEach((e) => seen.current!.add(e.key));
    if (fresh) setSplit({ key: fresh.key, amount: fresh.amount!, repaid: fresh.repaid!, toYou: fresh.toYou!, tx: fresh.tx, block: fresh.block, ms: lastMs.current });
  }, [data]);

  async function step<T>(label: string, fn: () => Promise<T>) {
    setBusy(label);
    setError(undefined);
    try {
      return await fn();
    } catch (e) {
      setError((e as Error).message);
      throw e;
    } finally {
      setBusy(undefined);
    }
  }

  async function apply() {
    const r = await step("Reading your income…", () => api<{ score: ScoreResult; txs: TxLine[] }>("/api/apply", { address }));
    setScore(r.score);
    setSteps((s) => [...s, ...r.txs]);
    refresh();
    return r.score;
  }

  async function runDemo() {
    const r = await step("Four clients are paying you…", () => api<{ txs: TxLine[] }>("/api/demo/seed", { address }));
    setSteps(r.txs);
    await apply();
  }

  // Demo mode: start the story automatically for a brand-new account.
  const started = useRef(false);
  useEffect(() => {
    if (demo && data && !started.current && data.credit.limit === 0 && data.events.length === 0 && !data.credit.defaulted) {
      started.current = true;
      runDemo().catch(() => {});
    }
  }, [demo, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return <div className="py-20 text-center"><Spinner /></div>;
  const c = data.credit;
  const fresh = c.limit === 0 && data.events.length === 0;
  const link = typeof window !== "undefined" ? `${location.origin}/pay/${address}` : "";

  return (
    <div className="space-y-4 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[14px] text-muted">
          {session?.kind === "demo" ? "Demo account" : "Passkey account"} · <span className="font-mono">{short(address)}</span>
          <button onClick={signOut} className="ml-2 underline underline-offset-4">sign out</button>
        </div>
        <ChainToggle />
      </div>

      {busy && (
        <Card className="flex items-center gap-3"><Spinner /> <span>{busy}</span></Card>
      )}
      <ErrorNote>{error}</ErrorNote>

      {steps.length > 0 && (
        <Card className="space-y-2">
          <Label>What just happened onchain</Label>
          {steps.map((s) => (
            <div key={s.hash} className="flex flex-wrap items-center justify-between gap-2 text-[15px]">
              <span>✓ {s.label}</span><Proof hash={s.hash} />
            </div>
          ))}
        </Card>
      )}

      {fresh && !busy && !score && (
        <Card className="rise">
          <h1 className="num text-4xl">Let&apos;s see what you could get</h1>
          <p className="mt-2 text-muted">We read the payments you&apos;ve received on Monad and explain the result in plain words. It takes a second.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button onClick={() => apply()}>Check my income</Button>
            {IS_TESTNET && <Button variant="secondary" onClick={() => runDemo()}>Demo: have 4 clients pay me first</Button>}
          </div>
        </Card>
      )}

      {score && !score.approved && c.limit === 0 && (
        <Card>
          <ScoreView s={score} compact />
          {IS_TESTNET && score.payments === 0 && (
            <Button className="mt-4" variant="violet" onClick={() => runDemo()}>Demo: have 4 clients pay me</Button>
          )}
        </Card>
      )}

      {split && <SplitAnimation e={split} />}

      {(c.limit > 0 || c.owed > 0) && <Borrow data={data} onDone={(ms) => { lastMs.current = ms; refresh(); }} />}

      {(c.limit > 0 || data.events.length > 0) && (
        <PaymentLink
          link={link}
          account={data.account}
          shareBps={data.shareBps}
          onPaid={(ms) => { lastMs.current = ms; setSplit((x) => (x ? { ...x, ms } : x)); refresh(); }}
        />
      )}

      {score?.approved && <Card><ScoreView s={score} compact /></Card>}

      {data.events.length > 0 && <Feed events={data.events} />}

      {c.limit > 0 && (
        <Card>
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label>Your score</Label>
              <p className="mt-1 text-muted">Re-check after new payments to raise your limit.</p>
            </div>
            <Button variant="secondary" onClick={() => apply()}>Re-check</Button>
          </div>
        </Card>
      )}
    </div>
  );
}

function Borrow({ data, onDone }: { data: Activity; onDone: (ms?: number) => void }) {
  const { session } = useAccount();
  const c = data.credit;
  const [amount, setAmount] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [last, setLast] = useState<{ hash: string; block: number; ms: number; amount: number }>();
  const options = [...new Set([c.available, Math.floor(c.available / 2), 10].filter((n) => n >= 1 && n <= c.available))].sort((a, b) => b - a);
  const pick = amount ?? options[0];

  async function draw() {
    if (!session || !pick) return;
    setBusy(true);
    setError(undefined);
    try {
      const r = await sendTx(session, { address: D.creditLine, abi: creditAbi, functionName: "draw", args: [BigInt(Math.round(pick * 1e6))] });
      setLast({ ...r, amount: pick });
      setAmount(undefined);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function repayEarly() {
    if (!session) return;
    setBusy(true);
    setError(undefined);
    try {
      const amt = BigInt(Math.round(Math.min(c.owed, data.balance) * 1e6));
      await sendTx(session, { address: D.ausd, abi: erc20Abi, functionName: "approve", args: [D.creditLine, amt] });
      await sendTx(session, { address: D.creditLine, abi: creditAbi, functionName: "repay", args: [session.address, amt] });
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const progress = c.totalBorrowed ? Math.min(1, c.totalRepaid / (c.totalRepaid + c.owed)) : 0;

  return (
    <Card className="space-y-5">
      {c.defaulted ? (
        <p className="text-red">A previous advance wasn&apos;t repaid within 30 days, so new advances are paused. This is recorded onchain.</p>
      ) : (
        <div>
          <Label>Available now</Label>
          <div className="num mt-1 text-7xl leading-none">{fmtUsd(c.available)}</div>
          <p className="mt-2 text-muted">Limit {fmtUsd(c.limit)} · level {c.tier + 1} of 4 · repaid {c.repayments} time{c.repayments === 1 ? "" : "s"}</p>
        </div>
      )}

      {c.available >= 1 && !c.defaulted && (
        <div className="rounded-2xl bg-paper p-4">
          <div className="flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                key={o} onClick={() => setAmount(o)}
                className={`rounded-full border px-4 py-2 text-[15px] ${o === pick ? "border-ink bg-ink text-paper" : "border-line bg-card"}`}
              >
                {fmtUsd(o)}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[15px]">
            You get <b>{fmtUsd(pick)}</b> now. You pay back <b>{fmtUsd(pick * 1.02)}</b>, taken as {data.shareBps / 100}% of each payment you receive.
            No interest. No late fees.
          </p>
          <p className="mt-1 text-[13px] text-muted">A typical payday loan would cost {fmtUsd(pick * 0.15)} for two weeks.</p>
          <Button className="mt-4 w-full" variant="violet" loading={busy} onClick={draw}>Get {fmtUsd(pick)} now</Button>
        </div>
      )}

      {last && (
        <div className="pop rounded-2xl bg-green-soft p-4 text-green">
          <div className="num text-3xl">{fmtUsd(last.amount)} is yours</div>
          <div className="mt-1"><Proof hash={last.hash} block={last.block} ms={last.ms} /></div>
        </div>
      )}

      {c.owed > 0 && (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[15px]">You owe <b>{fmtUsd(c.owed)}</b></span>
            <span className="text-[13px] text-muted">repays itself from your next payments</span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-line">
            <div className="h-full rounded-full bg-violet transition-all duration-700" style={{ width: `${progress * 100}%` }} />
          </div>
          {data.balance >= 1 && (
            <button onClick={repayEarly} disabled={busy} className="mt-3 text-[14px] text-muted underline underline-offset-4 hover:text-ink">
              Pay back {fmtUsd(Math.min(c.owed, data.balance))} early from my balance
            </button>
          )}
        </div>
      )}

      <div className="flex justify-between border-t border-line pt-4 text-[14px] text-muted">
        <span>Your balance</span><span className="num text-xl text-ink">{fmtUsd(data.balance)}</span>
      </div>
      <ErrorNote>{error}</ErrorNote>
    </Card>
  );
}

function PaymentLink({ link, account, shareBps, onPaid }: { link: string; account: string; shareBps: number; onPaid: (ms?: number) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="space-y-4">
      <div>
        <Label>Your payment link</Label>
        <p className="mt-1 text-muted">Send this to clients. When they pay, {shareBps / 100}% goes to any advance you owe and the rest reaches you in the same second.</p>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-line bg-paper p-1 pl-4">
        <span className="min-w-0 flex-1 truncate font-mono text-[13px]">{link}</span>
        <Button
          variant="secondary"
          onClick={async () => {
            if (navigator.share) await navigator.share({ title: "Pay me with Advance", url: link }).catch(() => {});
            else { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); }
          }}
        >
          {copied ? "Copied" : "Share"}
        </Button>
      </div>
      <p className="break-all text-[13px] text-muted">Payment address: <span className="font-mono">{account}</span></p>
      {IS_TESTNET && <SimulateButton onPaid={onPaid} />}
    </Card>
  );
}

function SimulateButton({ onPaid }: { onPaid: (ms?: number) => void }) {
  const { session } = useAccount();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [amount, setAmount] = useState(100);
  return (
    <div className="rounded-2xl border border-dashed border-line p-4">
      <div className="text-[14px] font-medium">Demo: a client pays you</div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        {[25, 100, 250].map((a) => (
          <button key={a} onClick={() => setAmount(a)} className={`rounded-full border px-3 py-1.5 text-[14px] ${a === amount ? "border-ink bg-ink text-paper" : "border-line"}`}>{fmtUsd(a)}</button>
        ))}
        <Button
          loading={busy}
          onClick={async () => {
            if (!session) return;
            setBusy(true);
            setError(undefined);
            try {
              const r = await api<{ ms: number }>("/api/demo/pay", { address: session.address, amount });
              onPaid(r.ms);
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Acme Studio pays {fmtUsd(amount)}
        </Button>
      </div>
      <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>
    </div>
  );
}

const LABEL: Record<string, (e: Ev) => string> = {
  PaymentSplit: (e) => `Got paid ${fmtUsd(e.amount!)}: ${fmtUsd(e.repaid!)} repaid, ${fmtUsd(e.toYou!)} to you`,
  Drawn: (e) => `Took an advance of ${fmtUsd(e.amount!)}`,
  Repaid: (e) => `Repaid ${fmtUsd(e.amount!)}`,
  LimitSet: (e) => `Limit set to ${fmtUsd(e.amount!)}`,
  TierUp: (e) => `Level up! Now level ${e.tier! + 1} of 4`,
  Defaulted: (e) => `Missed repayment recorded (${fmtUsd(e.amount!)})`,
};

function Feed({ events }: { events: Ev[] }) {
  const visible = events.filter((e) => e.type !== "Repaid"); // repayments show inside PaymentSplit
  return (
    <Card>
      <Label>Activity</Label>
      <ul className="mt-3 divide-y divide-line">
        {visible.slice(0, 20).map((e) => (
          <li key={e.key} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[15px]">
            <span className={e.type === "TierUp" ? "font-medium text-violet" : ""}>{LABEL[e.type]?.(e) ?? e.type}</span>
            <span className="flex items-center gap-3 text-[13px] text-muted">
              {new Date(e.ts * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              <Proof hash={e.tx} block={e.block} label="proof" />
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
