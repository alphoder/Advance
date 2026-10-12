import { handler, addr } from "@/server/http";
import { scoreAddress } from "@/server/score";

export const GET = handler(async (req) => scoreAddress(addr(new URL(req.url).searchParams.get("address"))));
