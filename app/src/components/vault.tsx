"use client";

import { useState } from "react";
import { isAddress, type Hex } from "viem";
import { useAccount } from "@/lib/account";
import { usePoll } from "@/lib/hooks";
import { sendTx, api } from "@/lib/tx";
import { creditFilesAbi } from "@/lib/abi";
import { D } from "@/lib/chain";
import { encPublicKey, encryptFile, openOwnFile, openSharedFile, prepareFile, wrapForLender } from "@/lib/vault";
import { Button, Panel, ErrorNote, Label, Proof, short } from "./ui";
import { LockKey, LockKeyOpen, UploadSimple } from "@phosphor-icons/react";

type FileRow = { owner: string; id: Hex; name: string; blob: Hex; size: number; tx: string; block: number; ts: number };
type VaultResp = {
  myKey: Hex | null;
  files: FileRow[];
  grantsOut: { id: Hex; lender: string; tx: string }[];
  shared: { owner: string; id: Hex; wrappedKey: Hex; tx: string; file: FileRow | null }[];
};

function useVault() {
  const { session } = useAccount();
  const poll = usePoll<VaultResp>(session ? `/api/vault?address=${session.address}` : undefined, 3000);
  async function ensureKey() {
    if (!session) throw new Error("Sign in first");
    const pub = encPublicKey(session.encKey);
    if (poll.data?.myKey?.toLowerCase() === pub.toLowerCase()) return;
    await sendTx(session, { address: D.creditFiles, abi: creditFilesAbi, functionName: "setEncryptionKey", args: [pub] });
  }
  return { ...poll, ensureKey, session };
}

function show(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  if (!blob.type.startsWith("image/") && blob.type !== "application/pdf") a.download = name;
  a.target = "_blank";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** Borrower side: add documents, share them with one lender. */
export function CreditFileCard() {
  const { data, refresh, ensureKey, session } = useVault();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  const [last, setLast] = useState<string>();
  const [shareTo, setShareTo] = useState<Record<string, string>>({});

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setError(undefined);
    try { await fn(); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }

  async function add(f: File) {
    if (!session) return;
    await run("Encrypting on your device…", async () => {
      const { bytes, mime } = await prepareFile(f);
      await ensureKey();
      const { id, blob } = await encryptFile(session.encKey, bytes, mime);
      setBusy("Storing the encrypted file on Monad…");
      const r = await sendTx(session, { address: D.creditFiles, abi: creditFilesAbi, functionName: "publish", args: [id, f.name.slice(0, 80), blob] });
      setLast(r.hash);
    });
  }

  async function share(f: FileRow) {
    if (!session) return;
    const lender = (shareTo[f.id] ?? "").trim();
    if (!isAddress(lender)) return setError("Enter the lender's Advance address (0x…)");
    await run("Sharing…", async () => {
      const v = await api<VaultResp>(`/api/vault?address=${lender}`);
      if (!v.myKey) throw new Error("That lender hasn't turned on secure documents yet. Ask them to open Earn → Documents shared with you.");
      const wrapped = await wrapForLender(session.encKey, f.blob, f.id, v.myKey);
      const r = await sendTx(session, { address: D.creditFiles, abi: creditFilesAbi, functionName: "grant", args: [f.id, lender, wrapped] });
      setLast(r.hash);
    });
  }

  return (
    <Panel className="space-y-4">
      <div>
        <Label>Your documents</Label>
        <p className="mt-1 text-[14px] text-muted">Encrypted in your browser before they leave it. Nobody, including Advance, can read them unless you share.</p>
      </div>
      <label className="press flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong bg-bg/40 px-4 text-[14.5px] text-muted hover:border-terra/60 hover:text-ink">
        <input type="file" accept="image/*,application/pdf,.txt,.csv" className="sr-only" disabled={Boolean(busy)} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) add(f); }} />
        <UploadSimple className="size-6 text-terra" />
        {busy ?? "Add an invoice or contract"}
      </label>
      {last && <Proof hash={last} />}
      <ErrorNote>{error}</ErrorNote>
      {data?.files.map((f) => {
        const sharedWith = data.grantsOut.filter((g) => g.id === f.id);
        return (
          <div key={f.id} className="rounded-xl border border-line bg-bg/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2 font-medium"><LockKey className="size-4 text-monad-hi" weight="fill" /> {f.name}</div>
                <div className="text-[13px] text-muted">{(f.size / 1024).toFixed(1)} KB encrypted · <Proof hash={f.tx} label="stored onchain" /></div>
              </div>
              <Button variant="secondary" onClick={() => run("Opening…", async () => show(await openOwnFile(session!.encKey, f.blob), f.name))}>Open</Button>
            </div>
            {sharedWith.length > 0 && <div className="mt-2 text-[13px] text-monad-hi">Shared with {sharedWith.map((g) => short(g.lender)).join(", ")}</div>}
            <div className="mt-3 flex gap-2">
              <input
                value={shareTo[f.id] ?? ""} onChange={(e) => setShareTo((s) => ({ ...s, [f.id]: e.target.value }))}
                placeholder="Lender address 0x…" aria-label="Lender address"
                className="min-h-11 min-w-0 flex-1 rounded-xl border border-line-strong bg-bg/60 px-3 font-mono text-[13px] text-ink outline-none placeholder:text-faint focus:border-monad"
              />
              <Button variant="monad" onClick={() => share(f)} disabled={Boolean(busy)}>Share</Button>
            </div>
          </div>
        );
      })}
    </Panel>
  );
}

/** Lender side: turn on secure documents, open files borrowers shared. */
export function SharedWithMe() {
  const { data, refresh, ensureKey, session } = useVault();
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState<string>();
  if (!session) return null;
  const ready = data?.myKey?.toLowerCase() === encPublicKey(session.encKey).toLowerCase();
  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label); setError(undefined);
    try { await fn(); refresh(); } catch (e) { setError((e as Error).message); } finally { setBusy(undefined); }
  }
  return (
    <Panel className="space-y-3">
      <Label>Documents shared with you</Label>
      {!data ? null : !ready ? (
        <div className="space-y-2">
          <p className="text-muted">Borrowers can share encrypted invoices with you. Turn this on to publish your passkey&apos;s public encryption key.</p>
          <Button loading={busy !== undefined} onClick={() => run("Turning on…", ensureKey)}>Turn on secure documents</Button>
        </div>
      ) : data.shared.length === 0 ? (
        <p className="text-muted">Nothing yet. Borrowers can share with your address: <span className="break-all font-mono text-[12.5px] text-ink">{session.address}</span></p>
      ) : (
        data.shared.map((g) => (
          <div key={g.tx} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-bg/40 p-3">
            <div>
              <div className="flex items-center gap-2 font-medium"><LockKeyOpen className="size-4 text-terra" weight="fill" /> {g.file?.name ?? "File"}</div>
              <div className="text-[13px] text-muted">from {short(g.owner)} · <Proof hash={g.tx} label="grant" /></div>
            </div>
            <Button
              variant="secondary" loading={busy === g.tx}
              onClick={() => g.file && run(g.tx, async () => show(await openSharedFile(session.encKey, g.file!.blob, g.id, g.wrappedKey), g.file!.name))}
            >
              Open
            </Button>
          </div>
        ))
      )}
      <ErrorNote>{error}</ErrorNote>
    </Panel>
  );
}

