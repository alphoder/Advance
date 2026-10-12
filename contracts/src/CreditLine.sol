// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {AdvancePool} from "./AdvancePool.sol";

interface IAccounts {
    function accountOf(address borrower) external view returns (address);
}

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

    address public scorer; // scoring service key
    address public forwarder; // Chainlink CRE forwarder: delivers DON-signed score reports
    uint128[4] public tierCaps = [uint128(50e6), 200e6, 1_000e6, 5_000e6]; // AUSD, 6 decimals

    mapping(address => Credit) internal credits;

    // ---------- trust points: a scratch card for every advance repaid by client payments ----------
    // Invariant: the best possible card is worth < the fee paid, so borrowing just to farm cards always loses money.
    struct Cycle {
        uint64 start; // first draw of the current advance
        uint128 fee; // total fee charged this cycle
        uint128 clientPaid; // repaid through the borrower's payment link (client payments)
        uint128 total; // repaid in total this cycle
    }

    uint256 public constant POINT = 1e4; // 1 trust point = $0.01 of the fee (AUSD has 6 decimals)
    address public factory; // ReceivablesFactory: tells client payments apart from self-repayment
    mapping(address => Cycle) public cycles;
    mapping(address => uint256) public trustPoints; // locked, non-transferable; lost on default
    mapping(address => uint32) public cardCount;

    event LimitSet(address indexed borrower, uint256 limit, uint8 tier);
    event Drawn(address indexed borrower, uint256 amount, uint256 fee);
    event Repaid(address indexed borrower, address indexed payer, uint256 principal, uint256 fee);
    event TierUp(address indexed borrower, uint8 tier);
    event Defaulted(address indexed borrower, uint256 principalLost);
    event TrustCard(address indexed borrower, uint32 indexed card, uint256 points, uint16 drawBps, uint16 speedBps, uint16 clientBps);
    event TrustForfeited(address indexed borrower, uint256 points);

    error OnlyScorer();
    error OnlyForwarder();
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

    function setForwarder(address forwarder_) external onlyOwner {
        forwarder = forwarder_;
    }

    function setFactory(address factory_) external onlyOwner {
        factory = factory_;
    }

    function setLimit(address borrower, uint256 limit) external {
        if (msg.sender != scorer) revert OnlyScorer();
        _setLimit(borrower, limit);
    }

    /// @notice Chainlink CRE receiver. report = abi.encode(address borrower, uint256 limit).
    function onReport(bytes calldata, bytes calldata report) external {
        if (msg.sender != forwarder) revert OnlyForwarder();
        (address borrower, uint256 limit) = abi.decode(report, (address, uint256));
        _setLimit(borrower, limit);
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == 0x805f2132 /* IReceiver.onReport */ || id == 0x01ffc9a7; /* IERC165 */
    }

    /// @notice Limit is clamped to the borrower's tier cap; tiers only rise through full repayment.
    function _setLimit(address borrower, uint256 limit) internal {
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
        Cycle storage y = cycles[msg.sender];
        if (c.principal == 0 && c.fee == 0) y.start = uint64(block.timestamp); // a new advance cycle
        y.fee += uint128(fee);
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

        Cycle storage y = cycles[borrower];
        y.total += uint128(paid);
        if (factory != address(0) && IAccounts(factory).accountOf(borrower) == msg.sender) y.clientPaid += uint128(paid);

        asset.safeTransferFrom(msg.sender, address(pool), paid);
        pool.receiveRepayment(principalPart, feePart);
        emit Repaid(borrower, msg.sender, principalPart, feePart);

        if (c.principal == 0 && c.fee == 0) {
            _card(borrower, y);
            if (c.tier < tierCaps.length - 1) {
                c.tier++;
                emit TierUp(borrower, c.tier);
            }
        }
    }

    /// @dev Prize = fee x luck (20%..90%) x speed (100% within 7 days .. 25% by day 30) x share repaid by clients.
    /// Max is 90% of the fee, so a card is cashback, never profit. Timing the draw can't beat that cap.
    function _card(address borrower, Cycle storage y) internal {
        uint256 clientBps = y.total == 0 ? 0 : uint256(y.clientPaid) * BPS / y.total;
        uint256 elapsed = block.timestamp - y.start;
        uint256 speedBps = elapsed <= 7 days ? 10_000 : elapsed <= 14 days ? 7_500 : elapsed <= 21 days ? 5_000 : elapsed <= DEFAULT_AFTER ? 2_500 : 0;
        uint256 r = uint256(keccak256(abi.encode(block.prevrandao, borrower, cardCount[borrower], y.total))) % 100;
        uint256 drawBps = r < 45 ? 2_000 : r < 75 ? 3_500 : r < 90 ? 5_000 : r < 98 ? 7_500 : 9_000;
        uint256 points = uint256(y.fee) * drawBps / BPS * speedBps / BPS * clientBps / BPS / POINT;
        delete cycles[borrower];
        if (clientBps == 0) return; // self-repayment earns no card
        trustPoints[borrower] += points;
        emit TrustCard(borrower, ++cardCount[borrower], points, uint16(drawBps), uint16(speedBps), uint16(clientBps));
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
        uint256 tp = trustPoints[borrower];
        if (tp > 0) {
            trustPoints[borrower] = 0; // unclaimed points are lost on a missed advance
            emit TrustForfeited(borrower, tp);
        }
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
