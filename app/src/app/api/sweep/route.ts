import { handler, addr, body } from "@/server/http";
import { send } from "@/server/relayer";
import { receivablesAbi, erc20Abi } from "@/lib/abi";
import { D, publicClient } from "@/lib/chain";

/** Keeper: splits plain transfers that landed on an Advance address. Permissionless onchain. */
export const POST = handler(async (req) => {
  const account = addr((await body(req)).account, "account");
  const bal = await publicClient.readContract({ address: D.ausd, abi: erc20Abi, functionName: "balanceOf", args: [account] });
  if (bal === 0n) return { hash: null };
  const { hash } = await send({ address: account, abi: receivablesAbi, functionName: "sweep", args: [] });
  return { hash };
});
