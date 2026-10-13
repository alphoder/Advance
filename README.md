# Advance

**Get paid today for work you've already done.**

Advance is an onchain credit protocol on Monad. It gives freelancers, small sellers and AI agents an advance against the income they already receive, and gets repaid automatically from every incoming payment. A smart payment address splits each payment in the same transaction: a share repays the advance, the rest reaches the earner. Because repayment happens at the source, by code, lenders can fund small advances without collateral.

> Visa and Credit Coop proved this repayment model for businesses: $2.5B financed, zero defaults. Advance brings it to individuals and their agents, which only works on a chain where every payment settles in under a second for a fraction of a cent.

- **Track:** 1, Onchain Finance & Trading (undercollateralised lending priced on onchain credit history)
- **Live app:** https://advance-monad.vercel.app (Monad testnet) · production deploys from the `release` branch (`git push origin main:release` publishes; pushes to `main` only create previews)
- **Demo video (≤ 3 min):** _add URL_

---

## Try it in 60 seconds

1. Open the app and paste any Monad address into **"What could this address borrow?"**. No sign-in needed. Try **Sybil Sam**, who fakes income by paying himself, and see why he's declined.
2. Tap **Try it as Priya**. Create an account with Face ID (a Mera passkey; no wallet, no seed phrase). Four real clients pay you onchain, your income is scored, and your limit is written onchain.
3. Tap **Get $50 now**. The money arrives in under a second.
4. Tap **Acme Studio pays $100** and watch the payment split: $20 repays the advance, $80 reaches you, in **one transaction**.
5. Turn on **Show me the chain** (bottom of every page) to see every transaction hash, block and contract.

Every number on screen is read from the chain. The only simulated thing is who the demo clients are.

6. When a client payment finishes repaying the advance, a **scratch card** appears in **Rewards**: trust points worth 20% to 90% of the fee, more for faster repayment. Scratch it.
7. Ask anything in the **Ask Advance** bubble (bottom right). Signed in, it reads your live account and tells you how to reach the next level.

## How it works

```
 Client pays $100 ──▶ ReceivablesAccount (one per earner)
                        │ same transaction
                        ├─ 20% ──▶ CreditLine.repay ──▶ AdvancePool (fee to lenders, principal back)
                        └─ 80% ──▶ earner

 Lenders ──deposit──▶ AdvancePool ──▶ Steady (senior) / Boost (junior, first-loss) share tokens
                                         └─ Boost shares trade on a Kuru order book

 Envio HyperSync ─▶ scoring engine (+ Nansen payer checks) ─▶ Chainlink CRE (DON consensus) ─▶ CreditLine.onReport
```

| Contract | What it enforces |
|---|---|
| [`AdvancePool`](contracts/src/AdvancePool.sol) | Two tranches. Losses hit Boost (junior) first. 90% of fees go to lenders, 10% to the protocol. Lending is capped at 90% of the pool. Share price is used as NAV. |
| [`CreditLine`](contracts/src/CreditLine.sol) | Limits are capped per tier ($50 → $200 → $1,000 → $5,000). A flat 2% fee. The fee is repaid before principal. Tiers go up only after full repayment. A missed repayment is recorded publicly after 30 days. Also the Chainlink CRE receiver. **Scratch cards:** when client payments (through the borrower's ReceivablesAccount) finish repaying an advance, it draws a card worth 20–90% of the fee × a speed multiplier (100% ≤ 7 days … 25% ≤ 30 days) × the share repaid by clients, and records trust points. A card is always below the fee, self-repayment earns none, points can't be transferred and are wiped on default. |
| [`ReceivablesAccount` and `ReceivablesFactory`](contracts/src/Receivables.sol) | The atomic split (at least 20% goes to repayment). Payments via EIP-3009 `payWithAuthorization` (the payer signs, a relayer submits, no gas for the payer) or a permissionless `sweep`. CREATE2 addresses, so an earner can share theirs before it is deployed. Never holds funds after a call. |
| [`AgentCreditAdapter`](contracts/src/AgentCreditAdapter.sol) | Opts an ERC-8004-registered agent in. Only the agent's owner can do this. |
| [`CreditFiles`](contracts/src/CreditFiles.sol) | Encrypted credit documents and lender grants, stored as event data. Ciphertext only. |
| [`TestAUSD`](contracts/src/TestAUSD.sol) | Testnet only: a 6-decimal dollar with real EIP-3009 signatures and a public faucet. Mainnet uses real AUSD. |

**Tests:** `cd contracts && forge test` runs 16 tests. They include two 1,000-run fuzz tests: *repayment + payout = payment* with the account always ending empty, and *a scratch card is never worth the fee* across random luck, timing and amounts. Plus tests of scratch cards (client repayment earns one, self-repayment earns none, slower earns less, default wipes points), of the loss waterfall (junior first, then senior), EIP-3009 replay and forgery rejection, the CRE receiver, and agent linking. `cd app && pnpm check` verifies the credit-file cryptography.

## Rewards, the card, and the assistant

- **Scratch cards and trust points (onchain, live):** the reward for repaying fast. Economically it's a fee rebate shared 90/10 by savers and protocol, like the fee itself, and it pays for itself: an advance repaid in 7 days frees the same dollars to fund about four advances a month instead of one. Worked numbers on the [Business page](https://advance-monad.vercel.app/business). Conversion of trust points to MON is the next step.
- **Rewards in the app:** the Advance card (a credit card on the Advance limit, inactive until income is verified), gift cards from eight brands below face value, coupons, tiers and missions. Card issuing and gift-card fulfilment need partners; today they are product UI.
- **Ask Advance:** a Gemini assistant (`gemini-3.5-flash-lite`, falling back to `3.1-flash-lite`) that streams replies in about a second. Signed in, it reads the user's live onchain account through our own endpoints and gives specific advice. The key stays server-side, with a per-IP rate limit ([`api/chat`](app/src/app/api/chat/route.ts)).

## Why Monad

| Monad property | Why Advance needs it |
|---|---|
| ~0.4 s blocks | The split happens the moment a payment lands. The app shows "settled in 0.4s" with the block number. |
| Near-zero fees | Repaying from a $10 payment is economic. On most chains the gas would cost more than the repayment. |
| Parallel execution | Every earner has their own ReceivablesAccount, so payments to different earners don't contend. |
| EVM compatibility | Standard Solidity, Foundry and viem. AUSD's EIP-3009 works unchanged. |
| Ecosystem | AUSD, Kuru order books, the ERC-8004 registry, Nansen coverage and Chainlink CRE are all live on Monad. |

Monad charges the **gas limit you declare**. Every transaction Advance sends estimates gas, then pads it by 15% (see [`app/src/lib/tx.ts`](app/src/lib/tx.ts) and [`app/src/server/relayer.ts`](app/src/server/relayer.ts)).

## Sponsor bounties

### Kuru: Bring New Assets and Markets
- **Requirement:** "Build a new class of tradable markets on Kuru's spot order book, including the infrastructure to make them viable."
- **How:** Advance's Boost tranche is a new asset class: first-loss credit exposure. [`KuruMarket.s.sol`](contracts/script/KuruMarket.s.sol) lists `advJR/AUSD` on Kuru and seeds the AMM vault at the pool's onchain share price, so the book opens at fair value. The Earn page shows the live book next to that fair value and lets savers buy or sell (`placeAndExecuteMarketBuy/Sell`, with a slippage guard). The script was fork-tested against Kuru's deployed testnet Router.
- **Proof:** market [`0xc87C…b26a`](https://testnet.monadexplorer.com/address/0xc87C44c02Bd90408bd0DB896939aF8aFdFa3b26a) · vault seeded at NAV [`tx`](https://testnet.monadexplorer.com/tx/0xe9b38bf4d43e5d32ed1186f74f2890bad6d0d415711d77137871d2fe9bfd3dc0) · first trade [`tx`](https://testnet.monadexplorer.com/tx/0x617e1aeac9b4f3f5339489e5c799d7bdda5c2b2298e9f88c0f7105ff21ae08cd)

### Nansen
- **Requirement:** a product experience powered by Nansen data that goes beyond exposing raw data.
- **How:** [`server/score.ts`](app/src/server/score.ts) calls Nansen `related-wallets` for the borrower and `labels` for every payer. The results drive decisions, not dashboards: a payer Nansen links to the borrower is a hard decline, labelled payers raise the quality score, and every result becomes a plain-English reason ("Nansen links payer 0x9eF6…07b7 to this address"). Responses are cached per payer (100 credits per labels call).
- **Proof:** a sybil decline shown in the video; the score checker on any mainnet address.

### Aurora Intents
- **Requirement:** integrate Aurora Intents into a Monad app for any-chain deposits, swaps, or deposit-and-execute flows.
- **How:** "Deposit from any chain" on the Earn page ([`components/aurora.tsx`](app/src/components/aurora.tsx)). A saver sends USDC from Base, Arbitrum, Solana and more, and dollars arrive at their passkey account on Monad, ready for Steady or Boost. It uses the external-wallet (QR) path, so no extra wallet connection is needed.
- **Proof:** mainnet deposit `_tx_`

### Chainlink CRE
- **Requirement:** build, simulate or deploy a CRE workflow used as an orchestration layer.
- **How:** [`cre/advance-score`](cre/advance-score/main.ts). On a cron trigger, each DON node calls the Advance scoring API, the DON reaches consensus on each borrower's limit (median), and the signed report is written to `CreditLine.onReport` through the CRE forwarder. Limits then no longer depend on one server key.
- **Proof (simulated with `--broadcast`, writing to Monad testnet):** [simulation log](cre/simulation-broadcast.log) · [onchain write](https://testnet.monadexplorer.com/tx/0xa87e7d1dbf127c79c03ec89057991bd9251acc2a8c8a0221ef15ea4cbe5a91ce). A fresh borrower was paid by four clients but had no limit (`available() = 0`). The workflow fetched their score from the live API, the DON agreed on $50, and the report went through Chainlink's simulation forwarder (`0xB9F7…d192`, set with `setForwarder`) into `CreditLine.onReport`: `available()` became $50. Our server key took no part in setting it. The simulation forwarder doesn't verify DON signatures, so after the run it was unset again ([`setForwarder(0)`](https://testnet.monadexplorer.com/tx/0xf5165cfcc73728cfed45866f6474138a30428223a261e4a5e69c84edd27b3e19)); set it to `0xB9F79d863261869B234c481D1f9A7af84AeAd192` to re-run, or to the production forwarder once deployed.
- **Run it:** `cd cre/advance-score && bun install && cd .. && cre workflow simulate advance-score --target staging-settings --broadcast` (needs `cre login` and `CRE_ETH_PRIVATE_KEY` in `cre/.env`).

### Mera-Powered UX
- **Requirement:** Mera is the entire account layer: no seed phrase, no extension, no custody backend.
- **How:** every account, whether borrower, lender or payer, is a Mera passkey ([`lib/account.tsx`](app/src/lib/account.tsx)). Users never buy gas: a relayer tops up new accounts, and client payments are EIP-3009 signatures relayed by the server. A temporary demo account is offered only when a browser can't do passkey PRF.

### Mera: One Passkey, Many Keys
- **Requirement:** the most creative non-wallet use of Mera's PRF-derived key material.
- **How:** from one passkey, BIP-44 index 0 is the wallet key and **index 1 is an encryption key** for a private credit file ([`lib/vault.ts`](app/src/lib/vault.ts)).
  - Invoices are AES-GCM encrypted in the browser and stored as ciphertext on Monad.
  - Sharing with a lender wraps the file key via ECDH to *the lender's* passkey-derived public key. Only that lender can open it; Advance never can.
  - `pnpm check` verifies three things: the owner can open the file, the chosen lender can open it, and a stranger cannot.

### Envio
- **Requirement:** use HyperIndex, HyperSync or HyperRPC to power real onchain data driving a core feature.
- **How:** the score, the activity feed, pool statistics and credit files all read history through Envio HyperSync ([`server/logs.ts`](app/src/server/logs.ts)). On Monad the public RPC caps `eth_getLogs` at 100 blocks, so the core feature depends on HyperSync.

## Contract addresses

| | Monad testnet (10143) | Monad mainnet (143) |
|---|---|---|
| Deployment file | [`app/src/deployments/10143.json`](app/src/deployments/10143.json) | [`app/src/deployments/143.json`](app/src/deployments/143.json) |
| CreditLine | [`0xef70…4135`](https://testnet.monadexplorer.com/address/0xef70B91F2482D81681A28fA3A81bFaFf4D6D4135) | |
| AdvancePool | [`0xe96c…B8cA`](https://testnet.monadexplorer.com/address/0xe96c7E16D2050017346Fc9EBC1B34647Aa6dB8cA) | |
| ReceivablesFactory | [`0x679A…8CBd`](https://testnet.monadexplorer.com/address/0x679ACa5aBF55Fe38c86E815ac57804F0f5778CBd) | |
| Steady token | [`0xD354…7AE2`](https://testnet.monadexplorer.com/address/0xD3549fb2021C8c82B0EF1121e191B095FDF47AE2) | |
| Boost token | [`0x6400…103f`](https://testnet.monadexplorer.com/address/0x64000eA22Ce9896fE3BeF07e076439c2f0F8103f) | |
| TestAUSD | [`0xC9f1…D1Fd`](https://testnet.monadexplorer.com/address/0xC9f1484d32aAae11EF9abFE86EDE8BCa1371D1Fd) | |
| CreditFiles | [`0x9238…3b97`](https://testnet.monadexplorer.com/address/0x9238b3aAdC29017A0b7b02Ad0CaCFFA953633b97) | |
| AgentCreditAdapter | [`0x0729…9F2a`](https://testnet.monadexplorer.com/address/0x07290F0d34FA229F9A6b94F15B1614b3E36F9F2a) | |
| GasTank (fee top-ups) | [`0x9a05…9378`](https://testnet.monadexplorer.com/address/0x9a056b971c08293a07C344A604F59A0A0a3f9378) | |
| Kuru advJR/AUSD market | [`0xc87C…b26a`](https://testnet.monadexplorer.com/address/0xc87C44c02Bd90408bd0DB896939aF8aFdFa3b26a) | |

## Run it yourself

```bash
# contracts
cd contracts && forge test
# local chain + app
anvil --block-time 1 &
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil key 0>
cd ../app && cp .env.example .env.local && pnpm install && pnpm dev
curl -X POST localhost:3000/api/admin/setup -H 'content-type: application/json' -d '{"secret":"local"}'
./scripts/local-agents.sh   # optional: AI-agent credit on anvil (stand-in ERC-8004 registry)
```

To deploy to Monad testnet, run `./scripts/deploy-testnet.sh`. It needs `PRIVATE_KEY` in `.env`, funded with testnet MON.

## Honest limits

- **Income redirection:** a borrower can tell clients to pay a different address after borrowing. This is the core open risk of repayment-at-source. We mitigate it with small starting limits, tiers that rise only through repayment, defaults recorded publicly onchain, and Boost absorbing losses first. SDK integrations where the paying app enforces routing are the long-term fix.
- **Scorer trust:** the CRE workflow runs in simulation (deployment access is pending), so the live app's limits are still set by one scorer key. Tier caps bound the damage, and the scorer can be paused (`setScorer(address(0))`).
- **Rewards:** scratch cards and trust points are live onchain; converting points to MON is not built yet. The Advance card and gift-card purchases are product UI until a card issuer and gift-card supplier are connected.
- **Regulation:** this is a testnet build with a tiny mainnet demo. A real launch would go through licensed partners in each market.

## Built during Metropolis, and with AI

- **Pre-existing code:** none of our own. Libraries used: OpenZeppelin Contracts, forge-std, Next.js, viem, Mera, the Chainlink CRE SDK, the Aurora Intents widget, and noble-curves/hashes.
- **AI disclosure:** this project was built with Claude Code (Anthropic) as a pair programmer, covering contracts, tests, app code, research and documentation. All of it was reviewed and directed by the team.

MIT licensed.
