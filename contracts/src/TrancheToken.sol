// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Pool share token. Freely transferable, so junior shares can trade on Kuru.
contract TrancheToken is ERC20 {
    address public immutable pool;

    error OnlyPool();

    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        pool = msg.sender;
    }

    function decimals() public pure override returns (uint8) {
        return 6; // matches AUSD
    }

    function mint(address to, uint256 amount) external {
        if (msg.sender != pool) revert OnlyPool();
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        if (msg.sender != pool) revert OnlyPool();
        _burn(from, amount);
    }
}
