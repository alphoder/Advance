// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {TestAUSD} from "../src/TestAUSD.sol";
import {AgentCreditAdapter} from "../src/AgentCreditAdapter.sol";
import {AdvancePool} from "../src/AdvancePool.sol";
import {CreditLine} from "../src/CreditLine.sol";
import {ReceivablesAccount, ReceivablesFactory} from "../src/Receivables.sol";

contract AdvanceTest is Test {
    TestAUSD ausd;
    AdvancePool pool;
    CreditLine credit;
    ReceivablesFactory factory;

    address scorer = makeAddr("scorer");
    address treasury = makeAddr("treasury");
    address seniorLender = makeAddr("senior");
    address juniorLender = makeAddr("junior");
    address priya = makeAddr("priya");
    address client;
    uint256 clientKey;

    function setUp() public {
        (client, clientKey) = makeAddrAndKey("client");
        ausd = new TestAUSD();
        pool = new AdvancePool(ausd, treasury);
        credit = new CreditLine(pool, scorer);
        pool.setCreditLine(address(credit));
        factory = new ReceivablesFactory(credit);
        credit.setFactory(address(factory));

        _deposit(seniorLender, AdvancePool.Tranche.Senior, 8_000e6);
        _deposit(juniorLender, AdvancePool.Tranche.Junior, 2_000e6);
    }

    function _deposit(address who, AdvancePool.Tranche t, uint256 amt) internal {
        ausd.faucet(who, amt);
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
        ausd.faucet(client, 100e6);
        vm.prank(client);
        ausd.transfer(acct, 100e6);
        ReceivablesAccount(acct).sweep();

        assertEq(ausd.balanceOf(acct), 0, "never holds funds");
        assertEq(ausd.balanceOf(priya), 50e6 + 80e6, "80 to borrower");
        assertEq(credit.owed(priya), 31e6, "20 repaid, fee first");
        _invariant();

        // EIP-3009 payment: client signs, anyone relays, split is atomic
        ausd.faucet(client, 200e6);
        (uint8 v, bytes32 r, bytes32 s) = _signReceive(acct, 200e6, bytes32(uint256(1)));
        ReceivablesAccount(acct).payWithAuthorization(client, 200e6, 0, type(uint256).max, bytes32(uint256(1)), v, r, s);
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
        deal(address(ausd), acct, payment);
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

    function _signReceive(address to, uint256 value, bytes32 nonce) internal view returns (uint8, bytes32, bytes32) {
        bytes32 structHash = keccak256(
            abi.encode(ausd.RECEIVE_WITH_AUTHORIZATION_TYPEHASH(), client, to, value, 0, type(uint256).max, nonce)
        );
        return vm.sign(clientKey, keccak256(abi.encodePacked("\x19\x01", ausd.DOMAIN_SEPARATOR(), structHash)));
    }

    function test_Eip3009_RejectsReplayAndForgery() public {
        address acct = factory.open(priya);
        ausd.faucet(client, 300e6);
        (uint8 v, bytes32 r, bytes32 s) = _signReceive(acct, 100e6, bytes32(uint256(7)));
        ReceivablesAccount(acct).payWithAuthorization(client, 100e6, 0, type(uint256).max, bytes32(uint256(7)), v, r, s);
        assertEq(ausd.balanceOf(priya), 100e6, "no debt: all to borrower");

        vm.expectRevert(TestAUSD.AuthUsed.selector);
        ReceivablesAccount(acct).payWithAuthorization(client, 100e6, 0, type(uint256).max, bytes32(uint256(7)), v, r, s);

        // signature for 100 can't be used to pull 200
        (v, r, s) = _signReceive(acct, 100e6, bytes32(uint256(8)));
        vm.expectRevert(TestAUSD.BadSignature.selector);
        ReceivablesAccount(acct).payWithAuthorization(client, 200e6, 0, type(uint256).max, bytes32(uint256(8)), v, r, s);

        // only the payee contract may redeem a receive authorization
        vm.expectRevert(TestAUSD.CallerMustBePayee.selector);
        ausd.receiveWithAuthorization(client, acct, 100e6, 0, type(uint256).max, bytes32(uint256(8)), v, r, s);
    }

    function test_CreReport_SetsLimit() public {
        address fwd = makeAddr("creForwarder");
        credit.setForwarder(fwd);
        vm.expectRevert(CreditLine.OnlyForwarder.selector);
        credit.onReport("", abi.encode(priya, 40e6));
        vm.prank(fwd);
        credit.onReport("", abi.encode(priya, 40e6));
        assertEq(credit.creditOf(priya).limit, 40e6);
        assertTrue(credit.supportsInterface(0x805f2132));
    }

    function test_AgentLink_OnlyOwner() public {
        MockRegistry reg = new MockRegistry();
        AgentCreditAdapter adapter = new AgentCreditAdapter(reg, factory);
        address owner = makeAddr("agentOwner");
        address agentWallet = makeAddr("agentWallet");
        reg.mint(owner, 42);

        vm.expectRevert(AgentCreditAdapter.NotAgentOwner.selector);
        adapter.linkAgent(42, agentWallet);

        vm.prank(owner);
        address acct = adapter.linkAgent(42, agentWallet);
        assertEq(acct, factory.accountOf(agentWallet));
        assertEq(adapter.agentIdOf(agentWallet), 42);
    }

    // ---------- trust points ----------

    function _advanceAndClientRepays(uint256 drawAmt, uint256 afterSecs) internal returns (address acct) {
        acct = factory.open(priya);
        vm.prank(scorer);
        credit.setLimit(priya, drawAmt);
        vm.prank(priya);
        credit.draw(drawAmt);
        vm.warp(block.timestamp + afterSecs);
        vm.prank(priya);
        ReceivablesAccount(acct).setRepaymentShare(10_000); // repay fully from the next client payment
        uint256 owed_ = credit.owed(priya);
        ausd.faucet(client, owed_);
        vm.prank(client);
        ausd.transfer(acct, owed_);
        ReceivablesAccount(acct).sweep();
    }

    function test_TrustCard_ClientRepaymentEarnsCard() public {
        _advanceAndClientRepays(50e6, 2 days);
        assertEq(credit.cardCount(priya), 1, "one card per advance repaid");
        uint256 pts = credit.trustPoints(priya);
        assertGe(pts, 20, "at least 20% of the $1 fee");
        assertLe(pts, 90, "at most 90% of the $1 fee");
    }

    function test_TrustCard_SelfRepayEarnsNothing() public {
        vm.prank(scorer);
        credit.setLimit(priya, 50e6);
        vm.prank(priya);
        credit.draw(50e6);
        ausd.faucet(priya, 1e6);
        vm.startPrank(priya);
        ausd.approve(address(credit), 51e6);
        credit.repay(priya, 51e6);
        vm.stopPrank();
        assertEq(credit.owed(priya), 0);
        assertEq(credit.cardCount(priya), 0, "no card for paying yourself back");
        assertEq(credit.trustPoints(priya), 0);
    }

    function test_TrustCard_SlowerEarnsLess() public {
        _advanceAndClientRepays(50e6, 25 days); // speed 25%: max 90% x 25% of $1 = 22 points
        assertLe(credit.trustPoints(priya), 22);
    }

    /// The anti-farming invariant: whatever the luck and timing, a card is worth less than the fee paid.
    function testFuzz_TrustCard_NeverExceedsFee(uint256 rand, uint32 secs, uint64 amt) public {
        uint256 drawAmt = bound(amt, 1e6, 50e6);
        vm.prevrandao(bytes32(rand));
        _advanceAndClientRepays(drawAmt, bound(secs, 0, 30 days));
        uint256 fee = drawAmt * 200 / 10_000;
        assertLt(credit.trustPoints(priya) * credit.POINT(), fee, "card < fee");
    }

    function test_TrustPoints_ForfeitedOnDefault() public {
        _advanceAndClientRepays(50e6, 1 days);
        assertGt(credit.trustPoints(priya), 0);
        vm.prank(scorer);
        credit.setLimit(priya, 200e6);
        vm.prank(priya);
        credit.draw(100e6);
        vm.warp(block.timestamp + 31 days);
        credit.markDefault(priya);
        assertEq(credit.trustPoints(priya), 0, "unclaimed points lost on a missed advance");
    }
}

contract MockRegistry is ERC721("Agents", "AGENT") {
    function mint(address to, uint256 id) external {
        _mint(to, id);
    }

}
