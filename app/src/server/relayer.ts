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

const KEY = process.env.SERVER_PRIVATE_KEY as Hex | undefined;
if (!KEY) throw new Error("SERVER_PRIVATE_KEY missing");

/** Server key: scorer, relayer (pays gas so users never need to), demo-client root. */
export const relayer = privateKeyToAccount(KEY, { nonceManager });
export const wallet = createWalletClient({ account: relayer, chain, transport: http(RPC_URL) });

/** Monad charges the declared gas limit, not gas used: estimate, then pad 15%. */
export async function send<const abi extends Abi, fn extends ContractFunctionName<abi, "nonpayable" | "payable">>(req: {
  address: Address;
  abi: abi;
  functionName: fn;
  args: ContractFunctionArgs<abi, "nonpayable" | "payable", fn>;
}) {
  const gas = await publicClient.estimateContractGas({ ...req, account: relayer } as never);
  const hash = await wallet.writeContract({ ...req, gas: (gas * 115n) / 100n } as never);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`tx reverted: ${hash}`);
  return { hash, receipt };
}

/** Deterministic demo wallets (clients, Sybil Sam's helpers). Never hold real value. */
export function demoAccount(label: string) {
  return privateKeyToAccount(keccak256(encodePacked(["bytes32", "string"], [KEY!, label])));
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
