"use client";

import { useState } from "react";
import { useAccount } from "@/lib/account";
import { Button, Card, ErrorNote } from "./ui";

export function SignIn({ title = "Sign in to Advance", subtitle }: { title?: string; subtitle?: string }) {
  const { signUp, signIn, startDemoAccount, busy, error, hasPasskey } = useAccount();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"new" | "back">(hasPasskey ? "back" : "new");

  return (
    <Card className="rise mx-auto max-w-md">
      <div className="grid size-14 place-items-center rounded-2xl bg-ink text-paper">
        <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3M9 9v1M15 9v1M12 9v4h-1M9 16c1.5 1.2 4.5 1.2 6 0" strokeLinecap="round" />
        </svg>
      </div>
      <h1 className="num mt-5 text-4xl">{title}</h1>
      <p className="mt-2 text-muted">
        {subtitle ?? "Use Face ID, your fingerprint or your device PIN. No password, no wallet, no seed phrase. Your account lives in your passkey."}
      </p>

      {mode === "new" ? (
        <form className="mt-5 space-y-3" onSubmit={(e) => { e.preventDefault(); signUp(name.trim()); }}>
          <label className="block text-[14px] font-medium" htmlFor="name">Your name</label>
          <input
            id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya" autoComplete="name"
            className="min-h-11 w-full rounded-full border border-line bg-paper px-4 outline-none focus:border-ink"
          />
          <Button type="submit" loading={busy} className="w-full">Create account with a passkey</Button>
          <button type="button" className="w-full text-[14px] text-muted underline underline-offset-4" onClick={() => setMode("back")}>
            I already have an Advance passkey
          </button>
        </form>
      ) : (
        <div className="mt-5 space-y-3">
          <Button loading={busy} className="w-full" onClick={() => signIn()}>Sign in with passkey</Button>
          <button type="button" className="w-full text-[14px] text-muted underline underline-offset-4" onClick={() => setMode("new")}>
            Create a new account instead
          </button>
        </div>
      )}

      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      <div className="mt-5 border-t border-line pt-4 text-[13px] text-muted">
        Passkey not working on this browser?{" "}
        <button className="font-medium text-ink underline underline-offset-4" onClick={() => startDemoAccount()}>
          Use a temporary demo account
        </button>{" "}
        (kept only in this browser).
      </div>
    </Card>
  );
}
