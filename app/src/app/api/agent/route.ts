import { zeroAddress } from "viem";
import { handler, addr } from "@/server/http";
import { D, publicClient } from "@/lib/chain";
import { agentAbi } from "@/lib/abi";

export const GET = handler(async (req) => {
  const wallet = addr(new URL(req.url).searchParams.get("address"));
  if (D.agentAdapter === zeroAddress) return { id: "0" };
  const id = await publicClient.readContract({ address: D.agentAdapter, abi: agentAbi, functionName: "agentIdOf", args: [wallet] });
  return { id: id.toString() };
});
