import { createPublicClient, http, type Address, type Chain } from "viem";
import { foundry, monad, monadTestnet } from "viem/chains";
import d31337 from "@/deployments/31337.json";
import d10143 from "@/deployments/10143.json";
import d143 from "@/deployments/143.json";

export type Deployment = {
  chainId: number;
  startBlock: number;
  ausd: Address;
  pool: Address;
  seniorToken: Address;
  juniorToken: Address;
  creditLine: Address;
  factory: Address;
  agentAdapter: Address;
};

const CHAINS: Record<number, { chain: Chain; deployment: Deployment; explorer?: string }> = {
  31337: { chain: foundry, deployment: d31337 as Deployment },
  10143: { chain: monadTestnet, deployment: d10143 as Deployment, explorer: "https://testnet.monadexplorer.com" },
  143: { chain: monad, deployment: d143 as Deployment, explorer: "https://monadscan.com" },
};

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 31337);
const entry = CHAINS[CHAIN_ID];
if (!entry) throw new Error(`Unsupported NEXT_PUBLIC_CHAIN_ID ${CHAIN_ID}`);

export const chain = entry.chain;
export const D = entry.deployment;
export const IS_LOCAL = CHAIN_ID === 31337;
export const IS_TESTNET = CHAIN_ID !== 143;
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || chain.rpcUrls.default.http[0];

export const publicClient = createPublicClient({ chain, transport: http(RPC_URL), pollingInterval: 400 });

export const txUrl = (hash: string) => (entry.explorer ? `${entry.explorer}/tx/${hash}` : undefined);
export const addressUrl = (a: string) => (entry.explorer ? `${entry.explorer}/address/${a}` : undefined);

export const USD = 1_000_000n; // AUSD has 6 decimals
