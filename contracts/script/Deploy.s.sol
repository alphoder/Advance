// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AdvancePool} from "../src/AdvancePool.sol";
import {CreditLine} from "../src/CreditLine.sol";
import {ReceivablesFactory} from "../src/Receivables.sol";

/// forge script script/Deploy.s.sol --rpc-url monad_testnet --broadcast --private-key $PRIVATE_KEY
contract Deploy is Script {
    function run() external {
        IERC20 ausd = IERC20(vm.envOr("AUSD", address(0xa9012a055bd4e0eDfF8Ce09f960291C09D5322dC))); // testnet AUSD
        address scorer = vm.envOr("SCORER", msg.sender);

        vm.startBroadcast();
        AdvancePool pool = new AdvancePool(ausd, msg.sender);
        CreditLine credit = new CreditLine(pool, scorer);
        pool.setCreditLine(address(credit));
        ReceivablesFactory factory = new ReceivablesFactory(credit);
        vm.stopBroadcast();

        console.log("AdvancePool       ", address(pool));
        console.log("SeniorToken       ", address(pool.seniorToken()));
        console.log("JuniorToken       ", address(pool.juniorToken()));
        console.log("CreditLine        ", address(credit));
        console.log("ReceivablesFactory", address(factory));
    }
}
