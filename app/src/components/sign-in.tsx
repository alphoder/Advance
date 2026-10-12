"use client";

import { useEffect, useState } from "react";
import { Fingerprint, ArrowRight, UserCircle } from "@phosphor-icons/react";
import { useAccount } from "@/lib/account";
import { Button, ErrorNote, Panel } from "./ui";

export function SignIn({ title = "Sign in to Advance", subtitle }: { title?: string; subtitle?: string }) {
  const { signUp, signIn, startDemoAccount, busy, error, hasPasskey } = useAccount();
  const [name, setName] = useState("");
  const [mode, setMode] = useState<"new" | "back">("new");
  useEffect(() => { if (hasPasskey) setMode("back"); }, [hasPasskey]);

  return (
    <Panel className="rise mx-auto max-w-md p-7 sm:p-9">
      <div className="relative grid size-16 place-items-center rounded-2xl border border-line-strong bg-[radial-gradient(circle_at_30%_20%,rgb(226_114_91/0.35),transparent_60%),#0f1b42]">
        <Fingerprint className="size-8 text-terra" weight="duotone" />
      </div>
      <h1 className="mt-6 text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">
        {subtitle ?? "Use Face ID, your fingerprint or device PIN. No password, no wallet, no seed phrase. Your account lives in your passkey."}
      </p>

      {mode === "new" ? (
        <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); signUp(name.trim()); }}>
          <label className="block text-[13.5px] font-medium" htmlFor="name">Your name</label>
          <input
            id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Priya" autoComplete="name"
            className="min-h-12 w-full rounded-xl border border-line-strong bg-bg/60 px-4 text-ink outline-none placeholder:text-faint focus:border-terra"
          />
          <Button type="submit" loading={busy} className="min-h-12 w-full" icon={<Fingerprint className="size-5" weight="bold" />}>Create account with passkey</Button>
          <button type="button" className="w-full py-1 text-[13.5px] text-muted hover:text-ink" onClick={() => setMode("back")}>I already have an Advance passkey</button>
        </form>
      ) : (
        <div className="mt-6 space-y-3">
          <Button loading={busy} className="min-h-12 w-full" onClick={() => signIn()} icon={<Fingerprint className="size-5" weight="bold" />}>Sign in with passkey</Button>
          <button type="button" className="w-full py-1 text-[13.5px] text-muted hover:text-ink" onClick={() => setMode("new")}>Create a new account instead</button>
        </div>
      )}

      <div className="mt-4"><ErrorNote>{error}</ErrorNote></div>
      <div className="mt-6 border-t border-line pt-5">
        <button onClick={() => startDemoAccount()} className="group flex w-full items-center gap-3 rounded-xl px-1 text-left text-[13.5px] text-muted hover:text-ink">
          <UserCircle className="size-5" />
          <span className="flex-1">Passkey not working here? Use a temporary demo account</span>
          <ArrowRight className="size-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>
    </Panel>
  );
}
