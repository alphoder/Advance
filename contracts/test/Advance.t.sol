// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {AdvancePool} from "../src/AdvancePool.sol";
import {CreditLine} from "../src/CreditLine.sol";
import {ReceivablesAccount, ReceivablesFactory} from "../src/Receivables.sol";

/// @dev Test stand-in for AUSD. receiveWithAuthorization skips signature checks (real AUSD verifies them).
contract MockAUSD is ERC20("AUSD", "AUSD") {
    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 a) external {
        _mint(to, a);
    }

    function receiveWithAuthorization(address from, address to, uint256 value, uint256, uint256, bytes32, uint8, bytes32, bytes32)
        external
    {
        require(msg.sender == to, "caller must be payee");
        _transfer(from, to, value);
    }
}

contract AdvanceTest is Test {
    MockAUSD ausd;
    AdvancePool pool;
    CreditLine credit;
    ReceivablesFactory factory;

    address scorer = makeAddr("scorer");
    address treasury = makeAddr("treasury");
    address seniorLender = makeAddr("senior");
    address juniorLender = makeAddr("junior");
    address priya = makeAddr("priya");
    address client = makeAddr("client");

    function setUp() public {
        ausd = new MockAUSD();
        pool = new AdvancePool(ausd, treasury);
        credit = new CreditLine(pool, scorer);
        pool.setCreditLine(address(credit));
        factory = new ReceivablesFactory(credit);

        _deposit(seniorLender, AdvancePool.Tranche.Senior, 8_000e6);
        _deposit(juniorLender, AdvancePool.Tranche.Junior, 2_000e6);
    }

    function _deposit(address who, AdvancePool.Tranche t, uint256 amt) internal {
        ausd.mint(who, amt);
        vm.startPrank(who);
        ausd.approve(address(pool), amt);
        pool.deposit(t, amt);
        vm.stopPrank();
    }

    function _invariant() internal view {
        assertEq(pool.totalAssets(), ausd.balanceOf(address(pool)) + pool.outstanding(), "pool accounting");
    }

    function test_PriyaJourney() public {
        address acct = factory.predict(priya);
        assertEq(factory.open(priya), acct, "CREATE2 address matches prediction");

        vm.prank(scorer);
        credit.setLimit(priya, 500e6);
        assertEq(credit.creditOf(priya).limit, 50e6, "clamped to tier 0 cap");

        vm.prank(priya);
        credit.draw(50e6);
        assertEq(ausd.balanceOf(priya), 50e6);
        assertEq(credit.owed(priya), 51e6); // 2% fee

        // client pays $100 by plain transfer, anyone sweeps
        ausd.mint(client, 100e6);
        vm.prank(client);
        ausd.transfer(acct, 100e6);
        ReceivablesAccount(acct).sweep();

        assertEq(ausd.balanceOf(acct), 0, "never holds funds");
        assertEq(ausd.balanceOf(priya), 50e6 + 80e6, "80 to borrower");
        assertEq(credit.owed(priya), 31e6, "20 repaid, fee first");
        _invariant();

        // EIP-3009 payment: signature-based, split atomically
        ausd.mint(client, 200e6);
        ReceivablesAccount(acct).payWithAuthorization(client, 200e6, 0, type(uint256).max, bytes32(0), 0, 0, 0);
        assertEq(credit.owed(priya), 0, "fully repaid");
        assertEq(ausd.balanceOf(priya), 130e6 + 169e6, "only 31 taken");

        CreditLine.Credit memory c = credit.creditOf(priya);
        assertEq(c.tier, 1, "tier up after full repayment");
        assertEq(c.repayments, 2);
        assertEq(ausd.balanceOf(treasury), 0.1e6, "10% of 1 AUSD fee");
        assertGt(pool.sharePrice(AdvancePool.Tranche.Junior), pool.sharePrice(AdvancePool.Tranche.Senior));
        _invariant();
    }

    /// Value conservation: borrower + repayment == payment, always; account ends empty.
    function testFuzz_SplitConserves(uint96 payment, uint64 drawAmt, uint16 shareBps) public {
        payment = uint96(bound(payment, 1, 1e15));
        drawAmt = uint64(bound(drawAmt, 0, 50e6));
        shareBps = uint16(bound(shareBps, 2_000, 10_000));

        address acct = factory.open(priya);
        vm.prank(scorer);
        credit.setLimit(priya, 50e6);
        if (drawAmt > 0) {
            vm.prank(priya);
            credit.draw(drawAmt);
        }
        vm.prank(priya);
        ReceivablesAccount(acct).setRepaymentShare(shareBps);

        uint256 owedBefore = credit.owed(priya);
        uint256 priyaBefore = ausd.balanceOf(priya);
        ausd.mint(acct, payment);
        ReceivablesAccount(acct).sweep();

        uint256 repaid = owedBefore - credit.owed(priya);
        uint256 toBorrower = ausd.balanceOf(priya) - priyaBefore;
        assertEq(repaid + toBorrower, payment, "conservation");
        assertLe(repaid, uint256(payment) * shareBps / 10_000, "never takes more than share");
        assertEq(ausd.balanceOf(acct), 0);
        _invariant();
    }

    function test_LossWaterfall_JuniorFirst() public {
        vm.prank(scorer);
        credit.setLimit(priya, 50e6);
        vm.prank(priya);
        credit.draw(50e6);

        vm.warp(block.timestamp + 31 days);
        credit.markDefault(priya);

        assertEq(pool.juniorAssets(), 1_950e6, "junior absorbs");
        assertEq(pool.seniorAssets(), 8_000e6, "senior untouched");
        assertTrue(credit.creditOf(priya).defaulted);
        _invariant();

        vm.prank(scorer);
        vm.expectRevert(CreditLine.IsDefaulted.selector);
        credit.setLimit(priya, 50e6);
    }

    function test_LossWaterfall_SeniorAfterJuniorExhausted() public {
        // fresh pool: tiny junior, so one default exhausts it
        pool = new AdvancePool(ausd, treasury);
        credit = new CreditLine(pool, scorer);
        pool.setCreditLine(address(credit));
        _deposit(seniorLender, AdvancePool.Tranche.Senior, 1_000e6);
        _deposit(juniorLender, AdvancePool.Tranche.Junior, 20e6);

        vm.prank(scorer);
        credit.setLimit(priya, 50e6);
        vm.prank(priya);
        credit.draw(50e6);
        vm.warp(block.timestamp + 31 days);
        credit.markDefault(priya);

        assertEq(pool.juniorAssets(), 0);
        assertEq(pool.seniorAssets(), 970e6);
        _invariant();
    }

    function test_Reverts() public {
        vm.prank(priya);
        vm.expectRevert(CreditLine.OverLimit.selector);
        credit.draw(1);

        vm.expectRevert(CreditLine.OnlyScorer.selector);
        credit.setLimit(priya, 1);

        vm.expectRevert(AdvancePool.OnlyCreditLine.selector);
        pool.fundAdvance(priya, 1);

        vm.prank(scorer);
        credit.setLimit(priya, 50e6);
        vm.prank(priya);
        credit.draw(10e6);
        vm.expectRevert(CreditLine.NotOverdue.selector);
        credit.markDefault(priya);

        address acct = factory.open(priya);
        vm.prank(priya);
        vm.expectRevert(ReceivablesAccount.BadShare.selector);
        ReceivablesAccount(acct).setRepaymentShare(1_999);
    }

    function test_UtilisationCap() public {
        pool = new AdvancePool(ausd, treasury);
        credit = new CreditLine(pool, scorer);
        pool.setCreditLine(address(credit));
        _deposit(juniorLender, AdvancePool.Tranche.Junior, 50e6);

        vm.prank(scorer);
        credit.setLimit(priya, 50e6);
        vm.prank(priya);
        vm.expectRevert(AdvancePool.UtilisationCap.selector);
        credit.draw(46e6); // 90% of 50 = 45
    }

    function test_Withdraw_WithYield() public {
        test_PriyaJourney();
        uint256 shares = pool.juniorToken().balanceOf(juniorLender);
        vm.prank(juniorLender);
        uint256 out = pool.withdraw(AdvancePool.Tranche.Junior, shares);
        assertGt(out, 2_000e6, "junior earned yield");
        _invariant();
    }
}
