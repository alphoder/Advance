"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AccountProvider } from "@/lib/account";

const ChainViewCtx = createContext<{ on: boolean; toggle: () => void }>({ on: false, toggle: () => {} });
export const useChainView = () => useContext(ChainViewCtx);

export function Providers({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    try { setOn(localStorage.getItem("advance.chainView") === "1"); } catch {}
  }, []);
  const toggle = () =>
    setOn((v) => {
      try { localStorage.setItem("advance.chainView", v ? "0" : "1"); } catch {}
      return !v;
    });
  return (
    <ChainViewCtx.Provider value={{ on, toggle }}>
      <AccountProvider>{children}</AccountProvider>
    </ChainViewCtx.Provider>
  );
}
