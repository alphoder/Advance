import { decodeEventLog, getAddress, isAddressEqual, zeroAddress, type Address, type Hex } from "viem";
import { D, publicClient, USD } from "@/lib/chain";
import { agentAbi, creditAbi, erc20Abi, factoryAbi } from "@/lib/abi";
import { fetchLogs, addrTopic, type RawLog } from "./logs";
import { labelsOf, relatedOf, nansenEnabled } from "./nansen";

const TRANSFER: Hex = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const DAY = 86_400;

export type Reason = { kind: "good" | "warn" | "bad"; text: string };
export type PayerInfo = {
  address: Address;
  total: number; // USD
  payments: number;
  activity: number; // outgoing payments this payer has made to anyone
  ageDays: number;
  labels: string[];
  linked?: "funded" | "roundtrip" | "related";
};
export type ScoreResult = {
  address: Address;
  account: Address;
  score: number;
  approved: boolean;
  limit: number; // USD the scorer will set
  tierCap: number;
  monthlyIncome: number;
  totalIncome: number;
  payments: number;
  payers: PayerInfo[];
  breakdown: { name: string; points: number; max: number }[];
  reasons: Reason[];
  nextSteps: string[];
  nansen: boolean;
  credit: { tier: number; repayments: number; defaulted: boolean; limit: number; principal: number; fee: number };
};

const usd = (v: bigint) => Number(v) / Number(USD);
const fmt = (n: number) => `$${n.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

function transfers(logs: RawLog[]) {
  return logs.map((l) => {
    const { args } = decodeEventLog({ abi: erc20Abi, eventName: "Transfer", data: l.data, topics: l.topics as [Hex, ...Hex[]] });
    return { from: getAddress(args.from), to: getAddress(args.to), value: args.value, ts: l.timestamp, tx: l.txHash };
  });
}

const cache = new Map<string, { at: number; result: Promise<ScoreResult> }>();

export function scoreAddress(address: Address): Promise<ScoreResult> {
  const key = address.toLowerCase();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5_000) return hit.result;
  const result = compute(getAddress(address));
  cache.set(key, { at: Date.now(), result });
  result.catch(() => cache.delete(key));
  return result;
}

async function compute(address: Address): Promise<ScoreResult> {
  const from = D.startBlock;
  const [account, credit, now] = await Promise.all([
    publicClient.readContract({ address: D.factory, abi: factoryAbi, functionName: "predict", args: [address] }),
    publicClient.readContract({ address: D.creditLine, abi: creditAbi, functionName: "creditOf", args: [address] }),
    publicClient.getBlock().then((b) => Number(b.timestamp)),
  ]);
  const tierCap = usd(await publicClient.readContract({ address: D.creditLine, abi: creditAbi, functionName: "tierCaps", args: [BigInt(credit.tier)] }));

  // Income: stablecoin transfers into the borrower or their Advance address.
  const [incomingLogs, outgoingLogs] = await Promise.all([
    fetchLogs({ address: [D.ausd], topics: [[TRANSFER], null, [addrTopic(address), addrTopic(account)]], fromBlock: from }),
    fetchLogs({ address: [D.ausd], topics: [[TRANSFER], [addrTopic(address)], null], fromBlock: from }),
  ]);
  const internal = [zeroAddress, D.pool, D.creditLine, account, address];
  const income = transfers(incomingLogs).filter((t) => !internal.some((a) => isAddressEqual(a, t.from)));
  const outgoing = transfers(outgoingLogs);

  const byPayer = new Map<Address, { total: number; payments: number; firstPaid: number }>();
  for (const t of income) {
    const p = byPayer.get(t.from) ?? { total: 0, payments: 0, firstPaid: t.ts };
    p.total += usd(t.value);
    p.payments++;
    byPayer.set(t.from, p);
  }
  const payerAddrs = [...byPayer.keys()];

  // Payer footprint: how active and how old each payer is onchain.
  const payerOutLogs = payerAddrs.length
    ? await fetchLogs({ address: [D.ausd], topics: [[TRANSFER], payerAddrs.map(addrTopic), null], fromBlock: from })
    : [];
  const payerFirstIn = payerAddrs.length
    ? await fetchLogs({ address: [D.ausd], topics: [[TRANSFER], null, payerAddrs.map(addrTopic)], fromBlock: from })
    : [];
  const activity = new Map<string, number>();
  const firstSeen = new Map<string, number>();
  for (const t of [...transfers(payerOutLogs), ...transfers(payerFirstIn)]) {
    for (const a of [t.from, t.to]) if (byPayer.has(a) && (!firstSeen.has(a) || t.ts < firstSeen.get(a)!)) firstSeen.set(a, t.ts);
    if (byPayer.has(t.from)) activity.set(t.from, (activity.get(t.from) ?? 0) + 1);
  }

  // Nansen: who is this borrower related to, and who are the payers?
  const [related, payerLabels] = await Promise.all([
    relatedOf(address),
    Promise.all(payerAddrs.map((p) => labelsOf(p))),
  ]);
  const relatedSet = new Set(related.map((r) => r.address.toLowerCase()));

  const payers: PayerInfo[] = payerAddrs.map((a, i) => {
    const p = byPayer.get(a)!;
    const sentToPayer = outgoing.filter((t) => isAddressEqual(t.to, a));
    let linked: PayerInfo["linked"];
    if (relatedSet.has(a.toLowerCase())) linked = "related";
    else if (sentToPayer.some((t) => t.ts <= p.firstPaid)) linked = "funded";
    else if (sentToPayer.length) linked = "roundtrip";
    return {
      address: a,
      total: p.total,
      payments: p.payments,
      activity: activity.get(a) ?? 0,
      ageDays: Math.max(0, (now - (firstSeen.get(a) ?? now)) / DAY),
      labels: payerLabels[i].map((l) => l.label),
      linked,
    };
  }).sort((a, b) => b.total - a.total);

  // ---------- features ----------
  const totalIncome = payers.reduce((s, p) => s + p.total, 0);
  const payments = income.length;
  const independent = payers.filter((p) => !p.linked);
  const topShare = totalIncome ? payers[0].total / totalIncome : 0;
  const times = income.map((t) => t.ts);
  const spanDays = times.length ? (Math.max(...times) - Math.min(...times)) / DAY : 0;
  const activeWeeks = new Set(times.map((t) => Math.floor(t / (7 * DAY)))).size;

  const n = independent.length;
  let diversity = n >= 4 ? 25 : [0, 6, 13, 19][n];
  if (topShare > 0.6 && n > 1) diversity -= 5;
  const linkedPayers = payers.filter((p) => p.linked);
  const independence = linkedPayers.length ? 0 : payers.length ? 25 : 0;
  const quality = payers.length
    ? (payers.reduce((s, p) => s + (p.labels.length ? 1 : Math.min(1, p.activity / 5) * 0.6 + Math.min(1, p.ageDays / 30) * 0.4), 0) / payers.length) * 15
    : 0;
  const regularity = payments ? Math.min(15, (activeWeeks / 4) * 12 + (spanDays >= 28 ? 3 : 0)) : 0;
  const circular = payers.some((p) => p.linked === "roundtrip") ? 0 : payers.length ? 10 : 0;
  const history = credit.defaulted ? 0 : Math.min(10, 4 + credit.repayments * 2);

  const breakdown = [
    { name: "Different people paying you", points: diversity, max: 25 },
    { name: "Payers independent of you", points: independence, max: 25 },
    { name: "Payers with a real track record", points: quality, max: 15 },
    { name: "Steady income over time", points: regularity, max: 15 },
    { name: "No money flowing back", points: circular, max: 10 },
    { name: "Advance repayment history", points: history, max: 10 },
  ].map((b) => ({ ...b, points: Math.round(Math.max(0, b.points)) }));
  const score = breakdown.reduce((s, b) => s + b.points, 0);

  // ---------- reasons, in plain words ----------
  const reasons: Reason[] = [];
  const nextSteps: string[] = [];
  if (!payments) {
    reasons.push({ kind: "bad", text: "No incoming payments found yet" });
    nextSteps.push("Share your Advance payment link and get paid by a client");
  } else {
    const weeks = Math.max(1, Math.round(spanDays / 7));
    reasons.push({
      kind: n >= 2 ? "good" : "warn",
      text: `Paid ${payments} time${payments > 1 ? "s" : ""} by ${payers.length} ${payers.length === 1 ? "person" : "different people"}${spanDays >= 7 ? ` over ${weeks} week${weeks > 1 ? "s" : ""}` : ""}, ${fmt(totalIncome)} in total`,
    });
  }
  for (const p of linkedPayers) {
    const short = `${p.address.slice(0, 6)}…${p.address.slice(-4)}`;
    reasons.push({
      kind: "bad",
      text:
        p.linked === "funded"
          ? `Payer ${short} was funded by this same address before paying it`
          : p.linked === "related"
            ? `Nansen links payer ${short} to this address`
            : `Money paid by ${short} flowed back to it afterwards`,
    });
  }
  if (linkedPayers.length) nextSteps.push("Get paid by clients who are independent of you");
  const labelled = payers.filter((p) => p.labels.length);
  if (labelled.length) reasons.push({ kind: "good", text: `${labelled.length} payer${labelled.length > 1 ? "s are" : " is"} a known entity on Nansen (${labelled[0].labels[0]})` });
  const fresh = payers.filter((p) => !p.labels.length && p.activity < 2);
  if (fresh.length) reasons.push({ kind: "warn", text: `${fresh.length} payer${fresh.length > 1 ? "s have" : " has"} almost no payment history of their own` });
  else if (payers.length) reasons.push({ kind: "good", text: "Every payer has a real payment history of their own" });
  if (topShare > 0.6 && payers.length > 1) reasons.push({ kind: "warn", text: `${Math.round(topShare * 100)}% of income comes from one payer` });
  if (n > 0 && n < 3) nextSteps.push(`Get paid by ${3 - n} more independent client${3 - n > 1 ? "s" : ""}`);
  if (payments && spanDays < 28) nextSteps.push("Keep receiving payments over the coming weeks");
  if (credit.defaulted) reasons.push({ kind: "bad", text: "A previous advance was not repaid" });
  else if (credit.repayments) reasons.push({ kind: "good", text: `Repaid on Advance ${credit.repayments} time${credit.repayments > 1 ? "s" : ""}` });
  if (!linkedPayers.length && !credit.defaulted && credit.tier < 3) nextSteps.push(`Repay an advance in full to unlock up to ${fmt(usd([50n, 200n, 1000n, 5000n][credit.tier + 1] * USD))}`);
  const agentId = D.agentAdapter !== zeroAddress
    ? await publicClient.readContract({ address: D.agentAdapter, abi: agentAbi, functionName: "agentIdOf", args: [address] })
    : 0n;
  if (agentId > 0n) reasons.unshift({ kind: "good", text: `Registered AI agent #${agentId} (ERC-8004), earning onchain` });
  if (nansenEnabled()) reasons.push({ kind: "good", text: "Payers checked against Nansen labels and related wallets" });

  const hardDecline = linkedPayers.length > 0 || credit.defaulted;
  const approved = !hardDecline && totalIncome > 0 && score >= 40;
  const monthlyIncome = totalIncome / Math.max(1, spanDays / 30);
  const limit = approved ? Math.floor(Math.min(monthlyIncome * 0.5 * (score / 100), tierCap)) : 0;

  return {
    address,
    account,
    score,
    approved,
    limit,
    tierCap,
    monthlyIncome,
    totalIncome,
    payments,
    payers,
    breakdown,
    reasons,
    nextSteps: [...new Set(nextSteps)].slice(0, 3),
    nansen: nansenEnabled(),
    credit: {
      tier: credit.tier,
      repayments: credit.repayments,
      defaulted: credit.defaulted,
      limit: usd(credit.limit),
      principal: usd(credit.principal),
      fee: usd(credit.fee),
    },
  };
}
