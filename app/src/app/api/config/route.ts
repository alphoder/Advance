import { handler } from "@/server/http";
import { demoAccount, relayer } from "@/server/relayer";
import { nansenEnabled } from "@/server/nansen";

export const GET = handler(async () => ({
  sybilSam: demoAccount("sybil-sam").address,
  demoClient: demoAccount("client-northwind").address,
  relayer: relayer.address,
  nansen: nansenEnabled(),
  indexer: process.env.ENVIO_API_TOKEN ? "Envio HyperSync" : "RPC",
}));
