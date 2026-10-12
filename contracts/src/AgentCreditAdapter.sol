// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ReceivablesFactory} from "./Receivables.sol";

/// @notice Opts an ERC-8004 registered agent into Advance. Only the agent's owner can link it.
/// The agent's wallet then borrows like any earner: income flows through its receivables account.
contract AgentCreditAdapter {
    IERC721 public immutable identityRegistry; // ERC-8004 IdentityRegistry (ERC-721)
    ReceivablesFactory public immutable factory;

    mapping(address => uint256) public agentIdOf; // wallet => agentId (0 = not an agent)
    mapping(uint256 => address) public walletOf;

    event AgentLinked(uint256 indexed agentId, address indexed wallet, address receivables);

    error NotAgentOwner();

    constructor(IERC721 identityRegistry_, ReceivablesFactory factory_) {
        identityRegistry = identityRegistry_;
        factory = factory_;
    }

    function linkAgent(uint256 agentId, address wallet) external returns (address receivables) {
        if (identityRegistry.ownerOf(agentId) != msg.sender) revert NotAgentOwner();
        delete agentIdOf[walletOf[agentId]];
        agentIdOf[wallet] = agentId;
        walletOf[agentId] = wallet;
        receivables = factory.open(wallet);
        emit AgentLinked(agentId, wallet, receivables);
    }
}
