"use client";

import { useEffect, useState } from "react";
import { Fingerprint, Database, MagnifyingGlass, Cpu, ChartLineUp, Globe, IdentificationCard, Lightning } from "@phosphor-icons/react";
import { publicClient, CHAIN_ID } from "@/lib/chain";
import { PageIntro, Section, Reveal, NextPage, CtaLink } from "@/components/site/kit";
import { ContractList, CHAIN_NAME } from "@/components/ui";

const STACK = [
  { icon: Fingerprint, name: "Mera", role: "Passkey accounts", b: "Face ID becomes the wallet. The same passkey also derives the encryption key and the agent's wallet." },
  { icon: Database, name: "Envio HyperSync", role: "Payment history", b: "Reads every payment an account has received, fast. The score depends on it." },
  { icon: MagnifyingGlass, name: "Nansen", role: "Payer checks", b: "Labels and related-wallet data to tell real clients from someone paying themselves." },
  { icon: Cpu, name: "Chainlink CRE", role: "Trust-minimised scoring", b: "Independent nodes agree on each credit limit before it's written onchain." },
  { icon: ChartLineUp, name: "Kuru", role: "Credit market", b: "Boost shares trade on a Kuru order book, priced next to their fair value." },
  { icon: Globe, name: "Aurora Intents", role: "Any-chain deposits", b: "Savers fund the pool from Base, Arbitrum, Solana and more." },
  { icon: IdentificationCard, name: "ERC-8004", role: "Agent identity", b: "AI agents are registered, so their credit history belongs to a known identity." },
  { icon: Lightning, name: "AUSD", role: "Dollars", b: "A US dollar stablecoin that supports signed payments, so payers never need gas." },
];

function useLiveChain() {
  const [n, setN] = useState<bigint>();
  const [rate, setRate] = useState<number>();
  useEffect(() => {
    let first: { n: bigint; t: number } | undefined;
    const tick = async () => {
      try {
        const b = await publicClient.getBlockNumber({ cacheTime: 0 });
        setN(b);
        const now = performance.now();
        if (!first) first = { n: b, t: now };
        else if (b > first.n) setRate((now - first.t) / Number(b - first.n));
      } catch {}
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return { n, rate };
}

export default function Technology() {
  const { n, rate } = useLiveChain();
  return (
    <>
      <PageIntro
        title={<>Why this only works on <span className="text-monad-hi">Monad</span></>}
        sub="Repaying from every single payment means one onchain transaction per payment. That only makes sense where transactions are instant and nearly free."
      >
        <CtaLink href="/app/protocol" variant="monad">See live protocol state</CtaLink>
      </PageIntro>

      <Section>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Reveal><div className="h-full rounded-3xl bg-monad p-6 text-white"><div className="text-[13px] opacity-80">Latest block on {CHAIN_NAME}</div><div className="num mt-1 font-mono text-4xl font-semibold">{n ? `#${n.toLocaleString()}` : "…"}</div><div className="mt-2 text-[14px] opacity-80">Live, updating now.</div></div></Reveal>
          <Reveal i={1}><div className="h-full rounded-3xl bg-terra p-6 text-[#1a0d08]"><div className="text-[13px] opacity-75">Measured block time</div><div className="num mt-1 font-mono text-4xl font-semibold">{rate ? `${(rate / 1000).toFixed(2)}s` : "…"}</div><div className="mt-2 text-[14px] opacity-75">The split lands while you watch.</div></div></Reveal>
          <Reveal i={2}><div className="h-full rounded-3xl border border-line bg-panel/80 p-6"><div className="text-[13px] text-muted">Cost to split one payment</div><div className="num mt-1 font-mono text-4xl font-semibold">&lt; $0.01</div><div className="mt-2 text-[14px] text-muted">So even a $10 payment can repay a loan.</div></div></Reveal>
        </div>
      </Section>

      <Section title="How the pieces fit" sub="Four smart contracts do the money work. Everything else reads, scores or connects.">
        <Reveal>
          <div className="grid grid-cols-1 gap-3 rounded-3xl border border-line bg-panel/80 p-5 sm:p-7 md:grid-cols-4">
            {[
              ["AdvancePool", "Holds savers' dollars in Steady and Boost. Losses hit Boost first."],
              ["CreditLine", "Each borrower's limit, advance and repayments. Limits rise by level."],
              ["Receivables", "Each borrower's payment address. Splits every payment in the same transaction."],
              ["CreditFiles", "Encrypted documents and who they're shared with. Ciphertext only."],
            ].map(([t, b], i) => (
              <div key={t} className={`rounded-2xl p-4 ${i === 2 ? "bg-terra text-[#1a0d08]" : i === 0 ? "bg-monad text-white" : "border border-line bg-bg/50"}`}>
                <div className="font-mono text-[14px] font-semibold">{t}</div>
                <div className={`mt-1.5 text-[13.5px] ${i === 0 || i === 2 ? "opacity-80" : "text-muted"}`}>{b}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      <Section title="Built with">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map(({ icon: Icon, name, role, b }, i) => (
            <Reveal key={name} i={i % 4}>
              <div className="h-full rounded-3xl border border-line bg-panel/80 p-5">
                <Icon className="size-7 text-monad-hi" weight="duotone" />
                <div className="mt-3 font-semibold">{name}</div>
                <div className="text-[13px] text-terra">{role}</div>
                <p className="mt-2 text-[14px] text-muted">{b}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section title="Deployed contracts" sub={`Network ${CHAIN_ID}. Every address is verifiable on the explorer.`}>
        <div className="rounded-3xl border border-line bg-panel/80 p-6"><ContractList /></div>
      </Section>

      <NextPage href="/faq" title="Still have questions?" sub="Plain answers and a glossary of every term." />
    </>
  );
}
