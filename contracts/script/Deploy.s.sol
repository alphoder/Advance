// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {AdvancePool} from "../src/AdvancePool.sol";
import {CreditLine} from "../src/CreditLine.sol";
import {ReceivablesFactory} from "../src/Receivables.sol";
import {TestAUSD} from "../src/TestAUSD.sol";
import {AgentCreditAdapter} from "../src/AgentCreditAdapter.sol";
import {CreditFiles} from "../src/CreditFiles.sol";

/// forge script script/Deploy.s.sol --rpc-url <rpc> --broadcast --private-key $PRIVATE_KEY
/// Env: AUSD (omit to deploy TestAUSD), SCORER, CRE_FORWARDER, AGENT_REGISTRY (all optional).
/// Writes ../deployments/<chainId>.json for the app.
contract Deploy is Script {
    function run() external {
        address ausdAddr = vm.envOr("AUSD", address(0));
        address scorer = vm.envOr("SCORER", msg.sender);
        address forwarder = vm.envOr("CRE_FORWARDER", address(0));
        address registry = vm.envOr("AGENT_REGISTRY", address(0));

        vm.startBroadcast();
        if (ausdAddr == address(0)) ausdAddr = address(new TestAUSD());
        AdvancePool pool = new AdvancePool(IERC20(ausdAddr), msg.sender);
        CreditLine credit = new CreditLine(pool, scorer);
        pool.setCreditLine(address(credit));
        if (forwarder != address(0)) credit.setForwarder(forwarder);
        ReceivablesFactory factory = new ReceivablesFactory(credit);
        address adapter =
            registry == address(0) ? address(0) : address(new AgentCreditAdapter(IERC721(registry), factory));
        CreditFiles files = new CreditFiles();
        vm.stopBroadcast();

        string memory j = "d";
        vm.serializeUint(j, "chainId", block.chainid);
        vm.serializeUint(j, "startBlock", block.number);
        vm.serializeAddress(j, "ausd", ausdAddr);
        vm.serializeAddress(j, "pool", address(pool));
        vm.serializeAddress(j, "seniorToken", address(pool.seniorToken()));
        vm.serializeAddress(j, "juniorToken", address(pool.juniorToken()));
        vm.serializeAddress(j, "creditLine", address(credit));
        vm.serializeAddress(j, "agentAdapter", adapter);
        vm.serializeAddress(j, "creditFiles", address(files));
        string memory out = vm.serializeAddress(j, "factory", address(factory));
        vm.writeJson(out, string.concat(vm.projectRoot(), "/../app/src/deployments/", vm.toString(block.chainid), ".json"));
        console.log(out);
    }
}
