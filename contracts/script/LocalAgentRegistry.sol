// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/// Local-chain stand-in for the ERC-8004 identity registry, so agent credit works on anvil.
/// scripts/local-agents.sh copies its code to the real registry address (0x8004A818…), so no
/// constructor state is relied on: ids start at 1 from an empty counter.
contract LocalAgentRegistry is ERC721("Agents", "AGENT") {
    uint256 private last;

    function register(string calldata) external returns (uint256 id) {
        id = ++last;
        _mint(msg.sender, id);
    }
}
