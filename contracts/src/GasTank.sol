// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

/// @notice Holds the MON that covers visitors' network fees. Monad reverts value transfers that take an
/// account (EOA) below its 10 MON reserve, so a busy relayer EOA can't send top-ups itself once it is under
/// 10 MON. A contract has no reserve: the relayer only pays gas and asks the tank to send the MON.
contract GasTank {
    address public immutable operator;

    error OnlyOperator();
    error SendFailed();

    constructor(address operator_) {
        operator = operator_;
    }

    receive() external payable {}

    function drip(address payable to, uint256 amount) external {
        if (msg.sender != operator) revert OnlyOperator();
        (bool ok,) = to.call{value: amount}("");
        if (!ok) revert SendFailed();
    }
}
