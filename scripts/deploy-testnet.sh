#!/usr/bin/env bash
# Deploys Advance to Monad testnet, lists Boost on Kuru, and points the app at it.
# Needs PRIVATE_KEY (funded with testnet MON) in ../.env. The same key becomes the app's scorer/relayer.
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env; set +a
export PATH="$PATH:$HOME/.foundry/bin"
RPC=https://testnet-rpc.monad.xyz
DEPLOYER=$(cast wallet address "$PRIVATE_KEY")
echo "Deployer $DEPLOYER: $(cast balance "$DEPLOYER" --ether --rpc-url $RPC) MON"

cd contracts
SCORER=$DEPLOYER AGENT_REGISTRY=0x8004A818BFB912233c491871b3d84c89A494BD9e \
  forge script script/Deploy.s.sol --rpc-url $RPC --broadcast --private-key "$PRIVATE_KEY" --slow
forge script script/KuruMarket.s.sol --rpc-url $RPC --broadcast --private-key "$PRIVATE_KEY" --slow
cd ..

# Point the app at testnet (keeps other keys already in .env.local)
touch app/.env.local
grep -v -E '^(NEXT_PUBLIC_CHAIN_ID|SERVER_PRIVATE_KEY)=' app/.env.local > app/.env.local.tmp || true
{ echo "NEXT_PUBLIC_CHAIN_ID=10143"; echo "SERVER_PRIVATE_KEY=$PRIVATE_KEY"; cat app/.env.local.tmp; } > app/.env.local
rm app/.env.local.tmp
echo "Deployed. Addresses: app/src/deployments/10143.json"
echo "Next: start the app (pnpm --dir app dev) and run demo setup:"
echo "  curl -X POST localhost:3000/api/admin/setup -H 'content-type: application/json' -d '{\"secret\":\"<ADMIN_SECRET>\",\"liquidity\":true}'"
