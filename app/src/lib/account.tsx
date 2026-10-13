"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { plainError } from "./errors";
import { createWalletClient, http, type Address, type WalletClient, type Account } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { keccak256, concatHex, toHex, hexToBytes, bytesToHex, type Hex } from "viem";
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
  /** Second key from the same passkey (BIP-44 index 1): encrypts the credit file. Memory only. */
  encKey: Uint8Array;
  /** Third key from the same passkey (index 2): the wallet of this user's AI agent. */
  agentKey: Hex;
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
  /** When the current session ends (10 minutes after sign-in). */
  expiresAt?: number;
};

const CRED = "advance.credential";
const DEMO = "advance.demoKey";
const STARTED = "advance.sessionStart";
const SESSION_MS = 10 * 60_000; // every sign-in lasts at most 10 minutes
const AccountCtx = createContext<Ctx | null>(null);

/** Mera's documented derivation: PRF output -> BIP-39 entropy -> BIP-44 key. Index 0 = account. */
function deriveKey(prf: Uint8Array, index = 0): Uint8Array {
  const seed = mnemonicToSeedSync(entropyToMnemonic(prf, wordlist));
  const node = HDKey.fromMasterSeed(seed).derive(`m/44'/60'/0'/0/${index}`);
  if (!node.privateKey) throw new Error("derivation produced no key");
  return node.privateKey;
}

/** Demo accounts have no passkey; derive their encryption key from the demo key instead. */
const demoEncKey = (key: Hex) => hexToBytes(keccak256(concatHex([key, toHex("advance/enc")])));
const demoAgentKey = (key: Hex) => keccak256(concatHex([key, toHex("advance/agent")]));

function walletFor(account: Account) {
  return createWalletClient({ account, chain, transport: http(RPC_URL) });
}

function passkeySession(prf: Uint8Array): Session {
  const session = createSecp256k1SigningSession({ privateKey: deriveKey(prf) as Uint8Array<ArrayBuffer> });
  const account = toViemAccount(session);
  return { address: account.address, kind: "passkey", wallet: walletFor(account), encKey: deriveKey(prf, 1), agentKey: bytesToHex(deriveKey(prf, 2)) };
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
  return plainError(e);
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

  // Every session lasts at most SESSION_MS from sign-in; a reload doesn't reset the clock.
  const [expiresAt, setExpiresAt] = useState<number>();
  const begin = useCallback(() => {
    const at = Date.now() + SESSION_MS;
    store.set(STARTED, String(at - SESSION_MS));
    setExpiresAt(at);
  }, []);
  useEffect(() => {
    if (!session || !expiresAt) return;
    const id = setTimeout(() => {
      setSession(undefined); // the demo key is kept, so signing back in resumes the same account
      setExpiresAt(undefined);
      store.del(STARTED);
      setError("Your session ended after 10 minutes. Sign in again to continue.");
    }, Math.max(0, expiresAt - Date.now()));
    return () => clearTimeout(id);
  }, [session, expiresAt]);

  // A demo account survives reloads (within its 10 minutes); a passkey session needs Face ID again.
  useEffect(() => {
    const demo = store.get(DEMO);
    const started = Number(store.get(STARTED) ?? 0);
    if (demo && Date.now() - started < SESSION_MS) {
      setExpiresAt(started + SESSION_MS);
      const account = privateKeyToAccount(demo as `0x${string}`);
      setSession({ address: account.address, kind: "demo", wallet: walletFor(account), encKey: demoEncKey(demo as Hex), agentKey: demoAgentKey(demo as Hex) });
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
      begin();
      return s;
    } catch (e) {
      setError(friendly(e));
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [begin]);

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
    const s: Session = { address: account.address, kind: "demo", wallet: walletFor(account), encKey: demoEncKey(key), agentKey: demoAgentKey(key) };
    setSession(s);
    setError(undefined);
    begin();
    return s;
  }, [begin]);

  const signOut = useCallback(() => {
    store.del(DEMO);
    store.del(STARTED);
    setExpiresAt(undefined);
    setSession(undefined);
  }, []);

  const value = useMemo(
    () => ({ session, ready, busy, error, hasPasskey, signUp, signIn, startDemoAccount, signOut, expiresAt }),
    [session, ready, busy, error, hasPasskey, signUp, signIn, startDemoAccount, signOut, expiresAt],
  );
  return <AccountCtx.Provider value={value}>{children}</AccountCtx.Provider>;
}

export function useAccount() {
  const ctx = useContext(AccountCtx);
  if (!ctx) throw new Error("useAccount outside AccountProvider");
  return ctx;
}

export { deriveKey, walletFor };
export type { Session };
