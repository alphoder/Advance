import {
  createWalletClient,
  http,
  keccak256,
  encodePacked,
  parseAbi,
  type Address,
  type Hex,
  type Abi,
  type ContractFunctionName,
  type ContractFunctionArgs,
} from "viem";
import { privateKeyToAccount, nonceManager } from "viem/accounts";
import { chain, publicClient, RPC_URL, D } from "@/lib/chain";
import { transferAuthTypes } from "@/lib/abi";
import { HttpError } from "./http";

/** Read the key only when a request needs it, so the site still builds and serves pages without one. */
function key(): Hex {
  const k = process.env.SERVER_PRIVATE_KEY as Hex | undefined;
  if (!k) throw new HttpError(503, "This server isn't set up to send transactions yet.");
  return k;
}
function lazy<T extends object>(make: () => T): T {
  let v: T | undefined;
  return new Proxy({} as T, { get: (_, p) => Reflect.get((v ??= make()), p) });
}

/** Server key: scorer, relayer (pays gas so users never need to), demo-client root. */
export const relayer = lazy(() => privateKeyToAccount(key(), { nonceManager }));
export const wallet = lazy(() => createWalletClient({ account: relayer, chain, transport: http(RPC_URL) }));

/** Monad charges the declared gas limit, not gas used: estimate, then pad 15%. */
export async function send<const abi extends Abi, fn extends ContractFunctionName<abi, "nonpayable" | "payable">>(req: {
  address: Address;
  abi: abi;
  functionName: fn;
  args: ContractFunctionArgs<abi, "nonpayable" | "payable", fn>;
}) {
  await assertFuel();
  const gas = await publicClient.estimateContractGas({ ...req, account: relayer } as never);
  const hash = await wallet.writeContract({ ...req, gas: (gas * 115n) / 100n } as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`tx reverted: ${hash}`);
  return { hash, receipt };
}

/**
 * The relayer pays every visitor's network fees. Below FUEL_MIN it stops spending and says so in plain
 * words, instead of letting a demo fail halfway. Balance is re-read at most every 15s.
 */
const FUEL_MIN = 150_000_000_000_000_000n; // 0.15 MON
let fuel: { at: number; low: boolean } | undefined;
export async function fuelLow() {
  if (fuel && Date.now() - fuel.at < 15_000) return fuel.low;
  let bal = await publicClient.getBalance({ address: relayer.address });
  const tankBal = D.gasTank ? await publicClient.getBalance({ address: D.gasTank }) : 0n;
  if (D.gasTank && bal < REFILL_BELOW && tankBal >= REFILL) { // the relayer pays its own gas from the tank
    const hash = await wallet.writeContract({ address: D.gasTank, abi: tankAbi, functionName: "drip", args: [relayer.address, REFILL], gas: 80_000n });
    await publicClient.waitForTransactionReceipt({ hash, timeout: 30_000 }).catch(() => {});
    bal += REFILL;
  }
  fuel = { at: Date.now(), low: bal < FUEL_MIN || (D.gasTank !== undefined && tankBal < REFILL / 2n) };
  return fuel.low;
}
const REFILL = 1_000_000_000_000_000_000n; // 1 MON
const REFILL_BELOW = 400_000_000_000_000_000n; // 0.4 MON
export const tankAbi = parseAbi(["function drip(address to, uint256 amount)"]);
export async function assertFuel() {
  if (await fuelLow()) throw new HttpError(503, "The demo is very busy right now. Please try again in a little while.");
}

/** Deterministic demo wallets (clients, Sybil Sam's helpers). Never hold real value. */
export function demoAccount(label: string) {
  return privateKeyToAccount(keccak256(encodePacked(["bytes32", "string"], [key(), label])));
}

const domainAbi = parseAbi([
  "function eip712Domain() view returns (bytes1, string name, string version, uint256 chainId, address verifyingContract, bytes32 salt, uint256[] extensions)",
]);
let domainCache: { name: string; version: string; chainId: number; verifyingContract: Address } | undefined;
export async function tokenDomain() {
  if (!domainCache) {
    const [, name, version, chainId, verifyingContract] = await publicClient.readContract({
      address: D.ausd,
      abi: domainAbi,
      functionName: "eip712Domain",
    });
    domainCache = { name, version, chainId: Number(chainId), verifyingContract };
  }
  return domainCache;
}

export function randomNonce(): Hex {
  return `0x${Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString("hex")}`;
}

/** A demo client signs an EIP-3009 transfer; the relayer submits it, so the client needs no gas. */
export async function signTransferAuth(from: ReturnType<typeof demoAccount>, to: Address, value: bigint) {
  const nonce = randomNonce();
  const message = { from: from.address, to, value, validAfter: 0n, validBefore: BigInt(Math.floor(Date.now() / 1000) + 3600), nonce };
  const sig = await from.signTypedData({ domain: await tokenDomain(), types: transferAuthTypes, primaryType: "TransferWithAuthorization", message });
  return { ...message, sig };
}
