"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "./tx";

/** Polls a GET endpoint. Monad makes a block every ~0.4s, so 1.5s feels live without hammering the API. */
export function usePoll<T>(path: string | undefined, ms = 1500) {
  const [state, setState] = useState<{ path?: string; data?: T; error?: string }>({});
  const current = useRef(path);
  current.current = path;

  const refresh = useCallback(async () => {
    const p = current.current;
    if (!p) return;
    try {
      const data = await api<T>(p);
      if (current.current === p) setState({ path: p, data }); // drop responses for a stale path
    } catch (e) {
      if (current.current === p) setState((s) => ({ ...s, path: p, error: (e as Error).message }));
    }
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(() => document.visibilityState === "visible" && refresh(), ms);
    return () => clearInterval(id);
  }, [path, ms, refresh]);

  const fresh = state.path === path;
  return { data: fresh ? state.data : undefined, error: fresh ? state.error : undefined, refresh };
}
