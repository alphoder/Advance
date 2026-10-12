"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, http, type Address, type WalletClient, type Account } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { HDKey } from "@scure/bip32";
import { entropyToMnemonic, mnemonicToSeedSync } from "@scure/bip39";
import { wordlist } from "@scure/bip39/wordlists/english.js";
import { createPasskeyWithPrfOutput, getPasskeyPrfOutput, createSecp256k1SigningSession, isMeraError } from "@category-labs/mera";
import { toViemAccount } from "@category-labs/mera/viem";
import { chain, RPC_URL } from "./chain";

type Kind = "passkey" | "demo";
type Session = {
  address: Address;
  kind: Kind;
  wallet: WalletClient<ReturnType<typeof http>, typeof chain, Account>;
  /** PRF output: root for the encrypted credit file key. Passkey sessions only, memory only. */
  prf?: Uint8Array;
};
type Ctx = {
  session?: Session;
  ready: boolean;
  busy: boolean;
  error?: string;
  hasPasskey: boolean;
  signUp: (name: string) => Promise<Session | undefined>;
  signIn: () => Promise<Session | undefined>;
  startDemoAccount: () => Session;
  signOut: () => void;
};

const CRED = "advance.credential";
const DEMO = "advance.demoKey";
const AccountCtx = createContext<Ctx | null>(null);

/** Mera's documented derivation: PRF output -> BIP-39 entropy -> BIP-44 key. Index 0 = account. */
function deriveKey(prf: Uint8Array, index = 0): Uint8Array {
  const seed = mnemonicToSeedSync(entropyToMnemonic(prf, wordlist));
  const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${index}`);
  if (!node.privateKey) throw new Error("derivation produced no key");
  return node.privateKey;
}

function walletFor(account: Account) {
  return createWalletClient({ account, chain, transport: http(RPC_URL) });
}

function passkeySession(prf: Uint8Array): Session {
  const session = createSecp256k1SigningSession({ privateKey: deriveKey(prf) as Uint8Array<ArrayBuffer> });
  const account = toViemAccount(session);
  return { address: account.address, kind: "passkey", wallet: walletFor(account), prf };
}

function friendly(e: unknown) {
  if (isMeraError(e)) {
    switch (e.code) {
      case "PRF_UNAVAILABLE":
        return "This browser's passkey manager can't create an Advance account. Try Safari or Chrome with Google Password Manager, or use a demo account.";
      case "PASSKEY_OPERATION_FAILED":
        return "Sign-in was cancelled. Try again when you're ready.";
      case "CRYPTO_UNAVAILABLE":
        return "Open Advance over https to sign in.";
    }
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k: string) => { try { localStorage.removeItem(k); } catch {} },
};

export function AccountProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session>();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [hasPasskey, setHasPasskey] = useState(false);

  // A demo account survives reloads; a passkey session needs Face ID again (keys live in memory only).
  useEffect(() => {
    const demo = store.get(DEMO);
    if (demo) {
      const account = privateKeyToAccount(demo as `0x${string}`);
      setSession({ address: account.address, kind: "demo", wallet: walletFor(account) });
    }
    setHasPasskey(Boolean(store.get(CRED)));
    setReady(true);
  }, []);

  const run = useCallback(async (fn: () => Promise<Session>) => {
    setBusy(true);
    setError(undefined);
    try {
      const s = await fn();
      setSession(s);
      return s;
    } catch (e) {
      setError(friendly(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, []);

  const signUp = useCallback(
    (name: string) =>
      run(async () => {
        const created = await createPasskeyWithPrfOutput({
          rp: { id: location.hostname, name: "Advance" },
          user: { name: name || "Advance user", displayName: name || "Advance user" },
          timeout: 60_000,
        });
        store.set(CRED, JSON.stringify({ credentialId: created.credentialId, transports: created.transports }));
        store.del(DEMO);
        setHasPasskey(true);
        return passkeySession(created.prfOutput);
      }),
    [run],
  );

  const signIn = useCallback(
    () =>
      run(async () => {
        const raw = store.get(CRED);
        const known = raw ? JSON.parse(raw) : undefined;
        const { prfOutput, credentialId } = await getPasskeyPrfOutput({ rpId: location.hostname, credential: known, timeout: 60_000 });
        store.set(CRED, JSON.stringify(known?.credentialId === credentialId ? known : { credentialId }));
        store.del(DEMO);
        setHasPasskey(true);
        return passkeySession(prfOutput);
      }),
    [],
  );

  const startDemoAccount = useCallback(() => {
    const key = (store.get(DEMO) as `0x${string}` | null) ?? generatePrivateKey();
    store.set(DEMO, key);
    const account = privateKeyToAccount(key);
    const s: Session = { address: account.address, kind: "demo", wallet: walletFor(account) };
    setSession(s);
    setError(undefined);
    return s;
  }, []);

  const signOut = useCallback(() => {
    store.del(DEMO);
    setSession(undefined);
  }, []);

  const value = useMemo(
    () => ({ session, ready, busy, error, hasPasskey, signUp, signIn, startDemoAccount, signOut }),
    [session, ready, busy, error, hasPasskey, signUp, signIn, startDemoAccount, signOut],
  );
  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountCtx);
  if (!ctx) throw new Error("useAccount outside AccountProvider");
  return ctx;
}

export { deriveKey };
