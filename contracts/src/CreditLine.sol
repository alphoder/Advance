// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AdvancePool} from "./AdvancePool.sol";

/// @notice Per-borrower credit lines and a public credit record any app can read.
contract CreditLine is Ownable {
    using SafeERC20 for IERC20;

    struct Credit {
        uint128 limit; // max principal outstanding
        uint128 principal;
        uint128 fee;
        uint128 totalBorrowed;
        uint128 totalRepaid;
        uint64 lastDraw;
        uint32 repayments; // number of repayment events
        uint8 tier;
        bool defaulted;
    }

    uint256 public constant BPS = 10_000;
    uint256 public constant FEE_BPS = 200; // flat 2% fee per advance
    uint256 public constant DEFAULT_AFTER = 30 days;

    IERC20 public immutable asset;
    AdvancePool public immutable pool;

    address public scorer; // scoring service or the Chainlink CRE forwarder
    uint128[4] public tierCaps = [uint128(50e6), 200e6, 1_000e6, 5_000e6]; // AUSD, 6 decimals

    mapping(address => Credit) internal credits;

    event LimitSet(address indexed borrower, uint256 limit, uint8 tier);
    event Drawn(address indexed borrower, uint256 amount, uint256 fee);
    event Repaid(address indexed borrower, address indexed payer, uint256 principal, uint256 fee);
    event TierUp(address indexed borrower, uint8 tier);
    event Defaulted(address indexed borrower, uint256 principalLost);

    error OnlyScorer();
    error ZeroAmount();
    error OverLimit();
    error IsDefaulted();
    error NotOverdue();

    constructor(AdvancePool pool_, address scorer_) Ownable(msg.sender) {
        pool = pool_;
        asset = pool_.asset();
        scorer = scorer_;
    }

    function setScorer(address scorer_) external onlyOwner {
        scorer = scorer_; // set to address(0) to pause limit updates
    }

    /// @notice Limit is clamped to the borrower's tier cap; tiers only rise through full repayment.
    function setLimit(address borrower, uint256 limit) public {
        if (msg.sender != scorer) revert OnlyScorer();
        Credit storage c = credits[borrower];
        if (c.defaulted) revert IsDefaulted();
        uint128 cap = tierCaps[c.tier];
        c.limit = limit > cap ? cap : uint128(limit);
        emit LimitSet(borrower, c.limit, c.tier);
    }

    function draw(uint256 amount) external {
        if (amount == 0) revert ZeroAmount();
        Credit storage c = credits[msg.sender];
        if (c.defaulted) revert IsDefaulted();
        if (c.principal + amount > c.limit) revert OverLimit();
        uint256 fee = amount * FEE_BPS / BPS;
        c.principal += uint128(amount);
        c.fee += uint128(fee);
        c.totalBorrowed += uint128(amount);
        c.lastDraw = uint64(block.timestamp);
        pool.fundAdvance(msg.sender, amount);
        emit Drawn(msg.sender, amount, fee);
    }

    /// @notice Anyone can repay on a borrower's behalf; fee is paid before principal.
    /// @return paid amount actually taken (capped at what is owed)
    function repay(address borrower, uint256 amount) external returns (uint256 paid) {
        Credit storage c = credits[borrower];
        uint256 owed_ = c.principal + c.fee;
        paid = amount > owed_ ? owed_ : amount;
        if (paid == 0) return 0;

        uint256 feePart = paid > c.fee ? c.fee : paid;
        uint256 principalPart = paid - feePart;
        c.fee -= uint128(feePart);
        c.principal -= uint128(principalPart);
        c.totalRepaid += uint128(paid);
        c.repayments++;

        asset.safeTransferFrom(msg.sender, address(pool), paid);
        pool.receiveRepayment(principalPart, feePart);
        emit Repaid(borrower, msg.sender, principalPart, feePart);

        if (c.principal == 0 && c.fee == 0 && c.tier < tierCaps.length - 1) {
            c.tier++;
            emit TierUp(borrower, c.tier);
        }
    }

    /// @notice After DEFAULT_AFTER with debt outstanding, the loss is written off (junior first)
    /// and the default is recorded publicly.
    function markDefault(address borrower) external onlyOwner {
        Credit storage c = credits[borrower];
        if (c.principal == 0 || block.timestamp < c.lastDraw + DEFAULT_AFTER) revert NotOverdue();
        uint256 lost = c.principal;
        c.principal = 0;
        c.fee = 0;
        c.limit = 0;
        c.defaulted = true;
        pool.writeOff(lost);
        emit Defaulted(borrower, lost);
    }

    // ---------- views ----------

    function creditOf(address borrower) external view returns (Credit memory) {
        return credits[borrower];
    }

    function owed(address borrower) external view returns (uint256) {
        Credit storage c = credits[borrower];
        return c.principal + c.fee;
    }

    function available(address borrower) external view returns (uint256) {
        Credit storage c = credits[borrower];
        return c.defaulted || c.principal >= c.limit ? 0 : c.limit - c.principal;
    }
}
