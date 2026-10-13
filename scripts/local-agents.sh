#!/usr/bin/env bash
# Local only: makes AI-agent credit work on anvil. Puts a stand-in ERC-8004 registry at the testnet
# registry's address and deploys AgentCreditAdapter against it. Re-run after restarting anvil.
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$PATH:$HOME/.foundry/bin"
RPC=http://127.0.0.1:8545
KEY=$(grep '^SERVER_PRIVATE_KEY=' app/.env.local | cut -d= -f2-)
REG=0x8004A818BFB912233c491871b3d84c89A494BD9e
JSON=app/src/deployments/31337.json
cd contracts
TMP=$(forge create script/LocalAgentRegistry.sol:LocalAgentRegistry --rpc-url $RPC --private-key "$KEY" --broadcast 2>/dev/null | awk '/Deployed to:/ {print $3}')
cast rpc anvil_setCode $REG "$(cast code "$TMP" --rpc-url $RPC)" --rpc-url $RPC >/dev/null
FACTORY=$(python3 -c "import json;print(json.load(open('../$JSON'))['factory'])")
ADAPTER=$(forge create src/AgentCreditAdapter.sol:AgentCreditAdapter --rpc-url $RPC --private-key "$KEY" --broadcast --constructor-args $REG "$FACTORY" 2>/dev/null | awk '/Deployed to:/ {print $3}')
python3 - "$ADAPTER" <<PY
import json, sys
p = "../$JSON"; d = json.load(open(p)); d["agentAdapter"] = sys.argv[1]
json.dump(d, open(p, "w"), indent=2); open(p, "a").write("\n")
PY
echo "Registry at $REG, AgentCreditAdapter at $ADAPTER"
