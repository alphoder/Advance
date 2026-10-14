# Advance

**Get paid today for work you've already done.**

The credit line that repays itself. Advance pays freelancers, sellers and AI agents now against income already on its way, and every client payment settles it automatically: **20% to the advance, 80% to the earner, in one Monad transaction.** No collateral, no chasing, no paperwork.

**[Live app](https://advance-monad.vercel.app)** (Monad testnet) · **Demo video:** _add URL_ · **Track 1:** Onchain Finance & Trading

---

## Why it's needed

**The people.** The World Bank counts **154 to 435 million online gig workers**, up to 12.5% of the global workforce, with demand up 41% since 2016 and 40% of platform traffic from low- and middle-income countries ([AP](https://www.ksl.com/article/news/business/online-gig-work-is-growing-rapidly-but-workers-lack-job-protections-a-world-bank-report-says/50725351), [SIA](https://www.staffingindustry.com/news/global-daily-news/world-bank-estimates-there-are-435-million-online-gig-workers-globally)).

**The wait.** Across 100,000+ freelancers, **29% of invoices are paid late** ([Bonsai data via Plutio](https://www.plutio.com/freelancer-magazine/late-invoice-payments)). Net-30 terms already mean a month without pay; late invoices add weeks more. In the UK, freelancers waiting on late invoices have turned to payday lenders ([Insider](https://www.insider.co.uk/news/survey-freelancers-turning-payday-lenders-9894632)).

**The gap.** Businesses solve this with invoice factoring, a market that moves **trillions of dollars of receivables a year** ([Market.us](https://market.us/report/invoice-factoring-market/)). Individuals can't: banks don't lend against a freelancer's invoice, and the fast options cost **7 to 15% for two weeks**. The hardest hit are paid in stablecoins by clients abroad, with real, regular income and no credit history any lender recognises.

**The opening.** That income is already onchain, public and verifiable. Advance turns it into credit, and on Monad repayment can come out of every single payment, so it can't be skipped.

## How it works

```
 1. Sign in        passkey (Face ID / fingerprint). No wallet, no seed phrase.
 2. Get scored     payments already received on Monad: how many, how regular, from how many real payers.
 3. Get a limit    written onchain. $50 → $200 → $1,000 → $5,000, one level per advance repaid.
 4. Take it        flat 2% fee, shown in dollars. Arrives in about a second.
 5. Get paid       clients pay your Advance link. Each payment splits in the same transaction:

    client pays $100 ──▶ ReceivablesAccount ──┬─ $20 ──▶ CreditLine.repay ──▶ AdvancePool (savers)
                                               └─ $80 ──▶ you

 Savers fund the pool and earn 90% of fees: Steady (protected) or Boost (first loss, higher return).
 Boost shares trade on a Kuru order book, so savers can exit any time.
```

Repayment happens at the source, enforced by code. That is what lets small advances work without collateral.

## Try it in 2 minutes

1. Open **[advance-monad.vercel.app/app?demo=1](https://advance-monad.vercel.app/app?demo=1)** and press **"Just looking or judging? Try it instantly"**.
2. The demo runs itself: four clients pay you onchain, your income is scored, a **$50 limit** is written onchain.
3. **Get money now → Get $50 now.** It lands in about a second.
4. **Get paid → $250 → Acme Studio pays.** Watch the split: $50 repays, $200 is yours, one transaction. Pay once more to clear the advance.
5. **Rewards → Trust points.** Your scratch card was drawn onchain. Scratch it.
6. Ask anything in the **Ask Advance** bubble. It reads your live account.

Also: **Save and earn** (deposit into Boost) · **Sell or buy savings** (Kuru) · **AI agents** (register, get paid, borrow) · **Check any address** (try Sybil Sam) · **Chain** toggle (every contract, transaction and block).

Every number on screen is read from the chain. Every action links to its proof on the explorer.

## What we built

| Part | What it does |
|---|---|
| [`AdvancePool`](contracts/src/AdvancePool.sol) | Two tranches. Losses hit Boost first. 90% of fees to savers. Lending capped at 90% of the pool. |
| [`CreditLine`](contracts/src/CreditLine.sol) | Tiered limits, flat 2% fee, fee repaid before principal, public default after 30 days. Draws onchain scratch cards for fast repayment. Chainlink CRE receiver. |
| [`Receivables`](contracts/src/Receivables.sol) | One payment address per earner (CREATE2, shareable before it exists). Splits every payment atomically. Gasless client payments via EIP-3009. Never holds funds after a call. |
| [`AgentCreditAdapter`](contracts/src/AgentCreditAdapter.sol) | Credit for ERC-8004-registered AI agents. Only the owner can opt an agent in. |
| [`CreditFiles`](contracts/src/CreditFiles.sol) | Encrypted invoices onchain, readable only by the lender the borrower chooses. |
| [`GasTank`](contracts/src/GasTank.sol) | Covers every user's network fees. Nobody ever needs to hold MON. |
| [Scoring](app/src/server/score.ts) | Reads income history, rejects self-funded and round-trip payers, explains every decision in plain English. |
| [CRE workflow](cre/advance-score/main.ts) | A Chainlink DON fetches the score, agrees on the limit and writes it onchain. No single key decides who gets credit. |
| [App](app/src) | Full website (how it works, security, 15 attack scenarios) and dashboard: borrow, get paid, score, history, documents, savings, market, agents, rewards. |
| [Ask Advance](app/src/app/api/chat/route.ts) | AI assistant that reads the user's live account and tells them exactly how to reach the next level. |

## Architecture

```
┌──────────────────────── Browser ────────────────────────┐
│  Next.js app · Mera passkey derives three keys:         │
│    0 wallet · 1 document encryption · 2 AI-agent wallet  │
│  Signs its own txs: draw, deposit, trade, register agent│
└───────────────┬───────────────────────────┬─────────────┘
                │ /api                      │ signed txs
┌───────────────▼───────────────┐           │
│  Server (Vercel)              │           │
│  score   ◀── Envio HyperSync  │           │
│  relayer ─ setLimit, open     │           │
│            account, relay     │           │
│            client payments    │           │
│  GasTank.drip ─ fee top-ups   │           │
│  chat    ──▶ Gemini           │           │
└───────────────┬───────────────┘           │
                ▼                           ▼
┌─────────────────────────── Monad ────────────────────────────┐
│  CreditLine ◀──▶ AdvancePool ──▶ Steady / Boost tokens ──▶ Kuru│
│      ▲                                                        │
│  ReceivablesAccount (one per earner) · CreditFiles · GasTank  │
│  AgentCreditAdapter ──▶ ERC-8004 registry                     │
└──────▲───────────────────────────────────────────────────────┘
       │ onReport
 Chainlink CRE DON ── fetches score API ── median consensus ── forwarder
```

**Flows**

| | Steps |
|---|---|
| **Borrow** | `/api/apply` scores the address from HyperSync history → scorer writes `setLimit` (capped by tier) → borrower signs `CreditLine.draw` → pool sends AUSD. |
| **Repay** | Client signs an EIP-3009 transfer → relayer submits `ReceivablesAccount.payWithAuthorization` → one transaction: ≥20% to `CreditLine.repay` (fee first, then principal) → rest to the earner. Full repayment raises the tier and draws a scratch card. |
| **Save** | `AdvancePool.deposit` mints Steady or Boost shares. Fees raise the share price. Exit with `withdraw` or sell Boost on Kuru. |
| **Agents** | Owner registers the agent in ERC-8004 → `linkAgent` opens its payment address → customers pay it → it's scored and draws like any earner. |
| **Documents** | Encrypted in the browser with key 1 → stored as `CreditFiles` events → shared by ECDH to one lender's passkey key. |

**Who can do what**

| Role | Can | Can't |
|---|---|---|
| Borrower | Draw up to their limit, repay faster (raise the split above 20%) | Lower the split, raise their own limit |
| Scorer key | Set limits, capped by tier | Exceed a tier cap, move funds. Can be paused (`setScorer(0)`) |
| CRE forwarder | Deliver DON-agreed limits | Anything else |
| Relayer | Pay gas, submit client-signed payments, call `GasTank.drip` | Move anyone's funds or forge a payment |
| Owner | Mark a default after 30 days, set scorer, forwarder, treasury | Touch deposits or user balances |

**Repo**

```
contracts/   Solidity + Foundry tests (src, test, script)
app/         Next.js: site pages, dashboard, /api routes, server (score, relayer, logs)
cre/         Chainlink CRE workflow + broadcast simulation log
scripts/     testnet deploy, local AI-agent setup
```

## Business model

Revenue is the advance fee: **2% flat**. **90% goes to savers, 10% to Advance**, enforced in the deployed contract.

| On a $100 advance | Repaid in 30 days | Repaid in 7 days |
|---|---|---|
| Fee | $2.00 | $2.00 |
| Average scratch card | −$0.17 | −$0.70 |
| Advances the same $100 funds per month | 1 | about 4 |
| Savers earn per month | $1.64 | $4.69 |

Fast repayment costs a bigger reward but turns the same dollars over four times, so scratch cards pay for themselves.

**Next revenue lines:** partner apps that embed "get paid early" and share the fee · paid credit-score lookups from the public repayment record · gift-card margin · higher-fee agent credit · management fees on institutional Steady capital.

**Growth:** start with contributors already paid in AUSD on Monad, then partner with invoicing, payroll and marketplace apps. Limits grow only with repayment, so good borrowers stay.

## Built with

| | Used for |
|---|---|
| **Monad** | Sub-second, sub-cent transactions make repaying from every $10 payment viable. |
| **Mera** | Passkey accounts. One passkey derives the wallet, an encryption key for private documents, and the AI agent's wallet. |
| **Envio HyperSync** | All history: score, activity, pool stats, scratch cards. Monad's public RPC returns only 100 blocks of logs. |
| **Kuru** | Order book for Boost shares, listed at the pool's fair value. |
| **Chainlink CRE** | Decentralised limit-setting, proven onchain (see bounties). |
| **AUSD** | Dollar stablecoin with EIP-3009. Testnet uses a mirror with real signatures. |
| **Gemini** | Ask Advance. |
| Foundry · Next.js 16 · viem · Vercel | Contracts, app, hosting. |

## Security

**Contracts**
- The split is atomic: repayment + payout always equals the payment, and the account always ends empty (1,000-run fuzz test).
- A scratch card can never be worth the fee (1,000-run fuzz test). Self-repayment earns nothing. Points are non-transferable and wiped on default.
- Client signatures (EIP-3009) can't be replayed or forged.
- Losses hit Boost before Steady.
- Limits rise only after full repayment, so a new bad actor can take at most $50, and the default is public forever.
- `forge test`: **16 tests, all passing.**

**Fraud.** 15 attack scenarios, each answered on the [Stress tests](https://advance-monad.vercel.app/stress-tests) page: paying yourself, round-tripping money, payer circles, borrow-and-vanish, reward farming, a stolen scorer key.

**Keys and money**
- Users hold their own keys (passkeys). No custody backend.
- Invoices are encrypted in the browser (AES-GCM) and shared by ECDH to one lender. Advance itself can't read them.
- The relayer only pays gas. Fee top-ups come from the GasTank, capped per request and sized to the transaction, with a fuel guard that shows a clear message instead of failing.
- Server keys never reach the browser. Demo endpoints are rate-limited.

**Open risk.** A borrower could tell clients to pay a different address after borrowing. Small starting limits, repayment-gated tiers, public defaults and Boost's first-loss buffer contain it; payment-app integrations close it.

## Why Monad

| | |
|---|---|
| ~0.4 s blocks | The split lands the instant the client pays. |
| Sub-cent fees | Repaying from a $10 payment costs less than the repayment. On most chains it wouldn't. |
| Parallel execution | Every earner has their own payment account, so payments never contend. |
| EVM | Standard Solidity, Foundry, viem. AUSD's EIP-3009 works unchanged. |

## Bounties

**Kuru: a new asset class.** First-loss credit exposure, tradable. [`KuruMarket.s.sol`](contracts/script/KuruMarket.s.sol) lists advJR/AUSD and seeds the vault at the pool's onchain share price, so the book opens at fair value. The app shows the book beside fair value and trades with a slippage guard.
[Market](https://testnet.monadexplorer.com/address/0xc87C44c02Bd90408bd0DB896939aF8aFdFa3b26a) · [vault seeded at NAV](https://testnet.monadexplorer.com/tx/0xe9b38bf4d43e5d32ed1186f74f2890bad6d0d415711d77137871d2fe9bfd3dc0) · [first trade](https://testnet.monadexplorer.com/tx/0x617e1aeac9b4f3f5339489e5c799d7bdda5c2b2298e9f88c0f7105ff21ae08cd)

**Envio: HyperSync powers the core feature.** [`server/logs.ts`](app/src/server/logs.ts) mirrors the protocol's history with one incremental query, so scoring works across any history length and load stays inside rate limits however many people use the site.

**Mera: passkeys are the entire account layer.** [`lib/account.tsx`](app/src/lib/account.tsx), [`lib/vault.ts`](app/src/lib/vault.ts). Index 0: wallet. Index 1: encryption key for private invoices. Index 2: the AI agent's wallet. `pnpm check` proves the owner and the chosen lender can decrypt, and a stranger can't.

**Chainlink CRE: decentralised credit limits.** [`cre/advance-score`](cre/advance-score/main.ts). Simulated with `--broadcast` on Monad testnet: a borrower with no limit got $50 written by the DON report through the CRE forwarder.
Onchain writes: [run 1](https://testnet.monadexplorer.com/tx/0xa87e7d1dbf127c79c03ec89057991bd9251acc2a8c8a0221ef15ea4cbe5a91ce), [run 2](https://testnet.monadexplorer.com/tx/0xa1ddfe019cae56fdcb02bc26ad98a568db34b4c5c57fc5c0a796fc7dfcf9b3f4) · [simulation log](cre/simulation-broadcast.log). The simulation forwarder doesn't verify signatures, so it was [unset](https://testnet.monadexplorer.com/tx/0xf5165cfcc73728cfed45866f6474138a30428223a261e4a5e69c84edd27b3e19) after the run.

## Contracts (Monad testnet)

| | |
|---|---|
| CreditLine | [`0xef70…4135`](https://testnet.monadexplorer.com/address/0xef70B91F2482D81681A28fA3A81bFaFf4D6D4135) |
| AdvancePool | [`0xe96c…B8cA`](https://testnet.monadexplorer.com/address/0xe96c7E16D2050017346Fc9EBC1B34647Aa6dB8cA) |
| ReceivablesFactory | [`0x679A…8CBd`](https://testnet.monadexplorer.com/address/0x679ACa5aBF55Fe38c86E815ac57804F0f5778CBd) |
| Steady / Boost | [`0xD354…7AE2`](https://testnet.monadexplorer.com/address/0xD3549fb2021C8c82B0EF1121e191B095FDF47AE2) / [`0x6400…103f`](https://testnet.monadexplorer.com/address/0x64000eA22Ce9896fE3BeF07e076439c2f0F8103f) |
| AgentCreditAdapter | [`0x0729…9F2a`](https://testnet.monadexplorer.com/address/0x07290F0d34FA229F9A6b94F15B1614b3E36F9F2a) |
| CreditFiles | [`0x9238…3b97`](https://testnet.monadexplorer.com/address/0x9238b3aAdC29017A0b7b02Ad0CaCFFA953633b97) |
| GasTank | [`0x9a05…9378`](https://testnet.monadexplorer.com/address/0x9a056b971c08293a07C344A604F59A0A0a3f9378) |
| TestAUSD | [`0xC9f1…D1Fd`](https://testnet.monadexplorer.com/address/0xC9f1484d32aAae11EF9abFE86EDE8BCa1371D1Fd) |
| Kuru advJR/AUSD | [`0xc87C…b26a`](https://testnet.monadexplorer.com/address/0xc87C44c02Bd90408bd0DB896939aF8aFdFa3b26a) |

All addresses: [`app/src/deployments/10143.json`](app/src/deployments/10143.json).

## Run it

```bash
cd contracts && forge test                       # 16 tests
anvil --block-time 1 &
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil key 0>
cd ../app && cp .env.example .env.local && pnpm install && pnpm dev
curl -X POST localhost:3000/api/admin/setup -H 'content-type: application/json' -d '{"secret":"local"}'
```

Testnet deploy: `./scripts/deploy-testnet.sh` (needs a funded `PRIVATE_KEY` in `.env`). Production deploys from the `release` branch.

## Limits

- Live limits are set by one scorer key until the CRE workflow is deployed. Tier caps bound it; the scorer can be paused.
- Trust points can't be converted to MON yet. The Advance card and gift cards need issuing partners.
- Nansen payer checks and Aurora any-chain deposits are written but switched off (no API keys).

Built during Monad Metropolis with Claude Code as a pair programmer; every change was reviewed and directed by the team. MIT licensed.
