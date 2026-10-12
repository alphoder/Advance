// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {TrancheToken} from "./TrancheToken.sol";

/// @notice Two-tranche lending pool. Junior absorbs losses first and earns a larger share of fees.
/// Invariant: seniorAssets + juniorAssets == cash + outstanding.
contract AdvancePool is Ownable {
    using SafeERC20 for IERC20;

    enum Tranche {
        Senior,
        Junior
    }

    uint256 public constant BPS = 10_000;
    uint256 public constant UTILISATION_CAP_BPS = 9_000; // max 90% of assets lent out
    uint256 public constant PROTOCOL_FEE_BPS = 1_000; // 10% of borrower fees to treasury
    uint256 public constant SENIOR_FEE_DISCOUNT_BPS = 7_000; // senior earns 70% of its pro-rata fee share

    IERC20 public immutable asset;
    TrancheToken public immutable seniorToken;
    TrancheToken public immutable juniorToken;

    address public creditLine;
    address public treasury;

    uint256 public seniorAssets;
    uint256 public juniorAssets;
    uint256 public outstanding;

    // lifetime stats for the lender dashboard
    uint256 public totalFeesEarned;
    uint256 public totalLosses;

    event Deposit(address indexed lender, Tranche tranche, uint256 assets, uint256 shares);
    event Withdraw(address indexed lender, Tranche tranche, uint256 assets, uint256 shares);
    event AdvanceFunded(address indexed borrower, uint256 amount);
    event RepaymentReceived(uint256 principal, uint256 fee, uint256 seniorFee, uint256 juniorFee, uint256 protocolFee);
    event WrittenOff(uint256 amount, uint256 juniorLoss, uint256 seniorLoss);

    error OnlyCreditLine();
    error ZeroAmount();
    error InsufficientLiquidity();
    error UtilisationCap();

    modifier onlyCreditLine() {
        if (msg.sender != creditLine) revert OnlyCreditLine();
        _;
    }

    constructor(IERC20 asset_, address treasury_) Ownable(msg.sender) {
        asset = asset_;
        treasury = treasury_;
        seniorToken = new TrancheToken("Advance Senior", "advSR");
        juniorToken = new TrancheToken("Advance Junior", "advJR");
    }

    function setCreditLine(address creditLine_) external onlyOwner {
        creditLine = creditLine_;
    }

    function setTreasury(address treasury_) external onlyOwner {
        treasury = treasury_;
    }

    // ---------- lenders ----------

    function deposit(Tranche t, uint256 assets) external returns (uint256 shares) {
        if (assets == 0) revert ZeroAmount();
        (TrancheToken token, uint256 trancheAssets) = _tranche(t);
        uint256 supply = token.totalSupply();
        // ponytail: internal accounting (not balanceOf) so donations can't inflate share price
        shares = supply == 0 || trancheAssets == 0 ? assets : assets * supply / trancheAssets;
        if (shares == 0) revert ZeroAmount();
        asset.safeTransferFrom(msg.sender, address(this), assets);
        _addAssets(t, assets);
        token.mint(msg.sender, shares);
        emit Deposit(msg.sender, t, assets, shares);
    }

    function withdraw(Tranche t, uint256 shares) external returns (uint256 assets) {
        if (shares == 0) revert ZeroAmount();
        (TrancheToken token, uint256 trancheAssets) = _tranche(t);
        assets = shares * trancheAssets / token.totalSupply();
        if (assets > asset.balanceOf(address(this))) revert InsufficientLiquidity();
        token.burn(msg.sender, shares);
        _subAssets(t, assets);
        asset.safeTransfer(msg.sender, assets);
        emit Withdraw(msg.sender, t, assets, shares);
    }

    // ---------- credit line hooks ----------

    function fundAdvance(address borrower, uint256 amount) external onlyCreditLine {
        if ((outstanding + amount) * BPS > totalAssets() * UTILISATION_CAP_BPS) revert UtilisationCap();
        if (amount > asset.balanceOf(address(this))) revert InsufficientLiquidity();
        outstanding += amount;
        asset.safeTransfer(borrower, amount);
        emit AdvanceFunded(borrower, amount);
    }

    /// @dev CreditLine transfers principal + fee to this contract before calling.
    function receiveRepayment(uint256 principal, uint256 fee) external onlyCreditLine {
        outstanding -= principal;
        uint256 protocolFee = fee * PROTOCOL_FEE_BPS / BPS;
        uint256 lenderFee = fee - protocolFee;
        uint256 total = totalAssets();
        uint256 seniorFee;
        if (juniorAssets == 0) seniorFee = lenderFee;
        else if (total > 0) seniorFee = lenderFee * seniorAssets / total * SENIOR_FEE_DISCOUNT_BPS / BPS;
        uint256 juniorFee = lenderFee - seniorFee;

        seniorAssets += seniorFee;
        juniorAssets += juniorFee;
        totalFeesEarned += lenderFee;
        if (protocolFee > 0) asset.safeTransfer(treasury, protocolFee);
        emit RepaymentReceived(principal, fee, seniorFee, juniorFee, protocolFee);
    }

    /// @notice Loss waterfall: junior first, senior only once junior is exhausted.
    function writeOff(uint256 amount) external onlyCreditLine {
        outstanding -= amount;
        uint256 juniorLoss = amount > juniorAssets ? juniorAssets : amount;
        uint256 seniorLoss = amount - juniorLoss;
        juniorAssets -= juniorLoss;
        seniorAssets -= seniorLoss;
        totalLosses += amount;
        emit WrittenOff(amount, juniorLoss, seniorLoss);
    }

    // ---------- views ----------

    function totalAssets() public view returns (uint256) {
        return seniorAssets + juniorAssets;
    }

    function utilisationBps() external view returns (uint256) {
        uint256 total = totalAssets();
        return total == 0 ? 0 : outstanding * BPS / total;
    }

    /// @notice Asset value of one whole share (1e6 units), for UI and Kuru pricing.
    function sharePrice(Tranche t) external view returns (uint256) {
        (TrancheToken token, uint256 trancheAssets) = _tranche(t);
        uint256 supply = token.totalSupply();
        return supply == 0 ? 1e6 : trancheAssets * 1e6 / supply;
    }

    // ---------- internal ----------

    function _tranche(Tranche t) internal view returns (TrancheToken, uint256) {
        return t == Tranche.Senior ? (seniorToken, seniorAssets) : (juniorToken, juniorAssets);
    }

    function _addAssets(Tranche t, uint256 a) internal {
        if (t == Tranche.Senior) seniorAssets += a;
        else juniorAssets += a;
    }

    function _subAssets(Tranche t, uint256 a) internal {
        if (t == Tranche.Senior) seniorAssets -= a;
        else juniorAssets -= a;
    }
}
