"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useAccount } from "@/lib/account";
import { CHAIN_ID } from "@/lib/chain";
import { Button, Card, Label } from "./ui";

const AuroraDeposit = dynamic(() => import("./aurora"), { ssr: false, loading: () => <p className="text-muted">Loading…</p> });
const KEY = process.env.NEXT_PUBLIC_AURORA_API_KEY;

export function AnyChainDeposit() {
  const { session } = useAccount();
  const [open, setOpen] = useState(false);
  if (!session || !KEY) return null;
  return (
    <Card>
      <Label>Deposit from any chain · Aurora Intents</Label>
      <p className="mt-1 text-muted">
        Have USDC on Base, Arbitrum, Ethereum or Solana? Send it here and it arrives as dollars in your Advance account on Monad,
        ready to deposit into Steady or Boost. No bridge, no wallet switching.
        {CHAIN_ID !== 143 && " Cross-chain deposits settle on Monad mainnet."}
      </p>
      {open ? <div className="mt-4"><AuroraDeposit address={session.address} apiKey={KEY} /></div> : (
        <Button className="mt-4" variant="secondary" onClick={() => setOpen(true)}>Deposit from another chain</Button>
      )}
    </Card>
  );
}
