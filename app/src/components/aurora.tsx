"use client";

import "@aurora-is-near/intents-swap-widget/styles.css";
import { WidgetConfigProvider, WidgetDepositMode } from "@aurora-is-near/intents-swap-widget";

/**
 * Aurora Intents: deposit from any chain. The saver sends USDC (or most assets) from Base, Arbitrum,
 * Solana, … to a one-time address; NEAR Intents delivers dollars to their Advance account on Monad.
 * No wallet connection needed: the QR / external-wallet path.
 */
export default function AuroraDeposit({ address, apiKey }: { address: string; apiKey: string }) {
  return (
    <WidgetConfigProvider
      config={{
        apiKey,
        sendAddress: address,
        hideSendAddress: true,
        allowSwapWithExternalWallet: true,
        connectedWallets: {},
        defaultTargetToken: { symbol: process.env.NEXT_PUBLIC_AURORA_TARGET_SYMBOL || "AUSD", blockchain: "monad" },
        allowedTargetChainsList: ["monad"],
        defaultSourceToken: { symbol: "USDC", blockchain: "base" },
        lockSwapDirection: true,
        slippageTolerance: 50,
      }}
      theme={{ colorScheme: "light", accentColor: "#5b3df5", stylePreset: "clean", borderRadius: "lg", showContainer: false }}
    >
      <WidgetDepositMode />
    </WidgetConfigProvider>
  );
}
