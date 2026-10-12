# Advance

**Get paid today for work you've already done.**

Advance is an onchain credit protocol on Monad. It gives freelancers, small sellers and AI agents an advance against the income they already receive, and gets repaid automatically from every incoming payment. A smart payment address splits each payment in the same transaction: a share repays the advance, the rest reaches the earner. Because repayment happens at the source, by code, lenders can fund small advances without collateral.

> Visa and Credit Coop proved this repayment model for businesses: $2.5B financed, zero defaults. Advance brings it to individuals and their agents, which only works on a chain where every payment settles in under a second for a fraction of a cent.

- **Track:** 1, Onchain Finance & Trading (undercollateralised lending priced on onchain credit history)
- **Live app:** _add URL_
- **Demo video (≤ 3 min):** _add URL_

---

## Try it in 60 seconds

1. Open the app and paste any Monad address into **"What could this address borrow?"**. No sign-in needed. Try **Sybil Sam**, who fakes income by paying himself, and see why he's declined.
2. Tap **Try it as Priya**. Create an account with Face ID (a Mera passkey; no wallet, no seed phrase). Four real clients pay you onchain, your income is scored, and your limit is written onchain.
3. Tap **Get $50 now**. The money arrives in under a second.
4. Tap **Acme Studio pays $100** and watch the payment split: $20 repays the advance, $80 reaches you, in **one transaction**.
5. Turn on **Show me the chain** (bottom of every page) to see every transaction hash, block and contract.

Every number on screen is read from the chain. The only simulated thing is who the demo clients are.

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
| [`CreditLine`](contracts/src/CreditLine.sol) | Limits are capped per tier ($50 → $200 → $1,000 → $5,000). A flat 2% fee. The fee is repaid before principal. Tiers go up only after full repayment. A missed repayment is recorded publicly after 30 days. Also the Chainlink CRE receiver. |
| [`ReceivablesAccount` and `ReceivablesFactory`](contracts/src/Receivables.sol) | The atomic split (at least 20% goes to repayment). Payments via EIP-3009 `payWithAuthorization` (the payer signs, a relayer submits, no gas for the payer) or a permissionless `sweep`. CREATE2 addresses, so an earner can share theirs before it is deployed. Never holds funds after a call. |
| [`AgentCreditAdapter`](contracts/src/AgentCreditAdapter.sol) | Opts an ERC-8004-registered agent in. Only the agent's owner can do this. |
| [`CreditFiles`](contracts/src/CreditFiles.sol) | Encrypted credit documents and lender grants, stored as event data. Ciphertext only. |
| [`TestAUSD`](contracts/src/TestAUSD.sol) | Testnet only: a 6-decimal dollar with real EIP-3009 signatures and a public faucet. Mainnet uses real AUSD. |

**Tests:** `cd contracts && forge test` runs 10 tests. They include a 1,000-run fuzz test proving that *repayment + payout = payment* and that the account always ends empty, plus tests of the loss waterfall (junior first, then senior), EIP-3009 replay and forgery rejection, the CRE receiver, and agent linking. `cd app && pnpm check` verifies the credit-file cryptography.

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
- **Proof:** market `_address_` · first trade `_tx_`

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
- **Proof:** simulation log `_link_` · onchain write `_tx_`

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

## Run it yourself

```bash
# contracts
cd contracts && forge test
# local chain + app
anvil --block-time 1 &
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key <anvil key 0>
cd ../app && cp .env.example .env.local && pnpm install && pnpm dev
curl -X POST localhost:3000/api/admin/setup -H 'content-type: application/json' -d '{"secret":"local"}'
```

To deploy to Monad testnet, run `./scripts/deploy-testnet.sh`. It needs `PRIVATE_KEY` in `.env`, funded with testnet MON.

## Honest limits

- **Income redirection:** a borrower can tell clients to pay a different address after borrowing. This is the core open risk of repayment-at-source. We mitigate it with small starting limits, tiers that rise only through repayment, defaults recorded publicly onchain, and Boost absorbing losses first. SDK integrations where the paying app enforces routing are the long-term fix.
- **Scorer trust:** until the CRE workflow is deployed, one scorer key sets limits. Tier caps bound the damage, and the scorer can be paused (`setScorer(address(0))`).
- **Regulation:** this is a testnet build with a tiny mainnet demo. A real launch would go through licensed partners in each market.

## Built during Metropolis, and with AI

- **Pre-existing code:** none of our own. Libraries used: OpenZeppelin Contracts, forge-std, Next.js, viem, Mera, the Chainlink CRE SDK, the Aurora Intents widget, and noble-curves/hashes.
- **AI disclosure:** this project was built with Claude Code (Anthropic) as a pair programmer, covering contracts, tests, app code, research and documentation. All of it was reviewed and directed by the team.

MIT licensed.
