// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Create2} from "@openzeppelin/contracts/utils/Create2.sol";
import {CreditLine} from "./CreditLine.sol";

/// @dev EIP-3009 (supported by AUSD). Only the `to` address may submit, so it can't be front-run.
interface IERC3009 {
    function receiveWithAuthorization(
        address from,
        address to,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external;
}

/// @notice A borrower's payment address. Every payment is split in the same transaction:
/// `shareBps` repays the credit line, the rest goes to the borrower. Never holds funds after a call.
contract ReceivablesAccount {
    using SafeERC20 for IERC20;

    uint256 public constant BPS = 10_000;
    uint256 public constant MIN_SHARE_BPS = 2_000; // 20%

    address public immutable borrower;
    CreditLine public immutable creditLine;
    IERC20 public immutable asset;
    uint256 public shareBps = MIN_SHARE_BPS;

    event PaymentSplit(address indexed payer, uint256 amount, uint256 repaid, uint256 toBorrower);
    event ShareSet(uint256 shareBps);

    error OnlyBorrower();
    error BadShare();

    constructor(address borrower_, CreditLine creditLine_) {
        borrower = borrower_;
        creditLine = creditLine_;
        asset = creditLine_.asset();
    }

    /// @notice Borrower may repay faster, never slower than the minimum.
    function setRepaymentShare(uint256 bps) external {
        if (msg.sender != borrower) revert OnlyBorrower();
        if (bps < MIN_SHARE_BPS || bps > BPS) revert BadShare();
        shareBps = bps;
        emit ShareSet(bps);
    }

    /// @notice Split whatever plain transfers have landed here. Permissionless (keeper, app, anyone).
    function sweep() external {
        _split(address(0));
    }

    /// @notice Client pays with an EIP-3009 signature; a relayer submits it and the split is atomic.
    function payWithAuthorization(
        address from,
        uint256 value,
        uint256 validAfter,
        uint256 validBefore,
        bytes32 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        IERC3009(address(asset)).receiveWithAuthorization(
            from, address(this), value, validAfter, validBefore, nonce, v, r, s
        );
        _split(from);
    }

    function _split(address payer) internal {
        uint256 amount = asset.balanceOf(address(this));
        if (amount == 0) return;
        uint256 owed = creditLine.owed(borrower);
        uint256 repay = amount * shareBps / BPS;
        if (repay > owed) repay = owed;
        if (repay > 0) {
            asset.forceApprove(address(creditLine), repay);
            creditLine.repay(borrower, repay);
        }
        uint256 rest = amount - repay;
        if (rest > 0) asset.safeTransfer(borrower, rest);
        emit PaymentSplit(payer, amount, repay, rest);
    }
}

/// @notice Deploys one ReceivablesAccount per borrower at a CREATE2 address known before deployment,
/// so a borrower can share their payment address immediately.
contract ReceivablesFactory {
    CreditLine public immutable creditLine;
    mapping(address => address) public accountOf;

    event AccountOpened(address indexed borrower, address account);

    constructor(CreditLine creditLine_) {
        creditLine = creditLine_;
    }

    function open(address borrower) external returns (address account) {
        account = accountOf[borrower];
        if (account != address(0)) return account;
        account = address(new ReceivablesAccount{salt: bytes32(uint256(uint160(borrower)))}(borrower, creditLine));
        accountOf[borrower] = account;
        emit AccountOpened(borrower, account);
    }

    function predict(address borrower) external view returns (address) {
        bytes memory code = abi.encodePacked(type(ReceivablesAccount).creationCode, abi.encode(borrower, creditLine));
        return Create2.computeAddress(bytes32(uint256(uint160(borrower))), keccak256(code));
    }
}
