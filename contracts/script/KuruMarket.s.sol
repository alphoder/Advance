// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {AdvancePool} from "../src/AdvancePool.sol";
import {TestAUSD} from "../src/TestAUSD.sol";

interface IKuruRouter {
    function deployProxy(
        uint8 marketType,
        address base,
        address quote,
        uint96 sizePrecision,
        uint32 pricePrecision,
        uint32 tickSize,
        uint96 minSize,
        uint96 maxSize,
        uint256 takerFeeBps,
        uint256 makerFeeBps,
        uint96 kuruAmmSpread
    ) external returns (address);
}

interface IKuruOrderBook {
    function getVaultParams() external view returns (address, uint256, uint96, uint256, uint96, uint96, uint96, uint96);
    function bestBidAsk() external view returns (uint256, uint256);
    function placeAndExecuteMarketBuy(uint96 quoteSize, uint256 minAmountOut, bool isMargin, bool isFillOrKill)
        external
        payable
        returns (uint256);
}

interface IKuruVault {
    function deposit(uint256 baseDeposit, uint256 quoteDeposit, uint256 minQuoteConsumed, address receiver)
        external
        payable
        returns (uint256);
}

/// Lists Boost (junior tranche) shares on a Kuru order book, quoted in AUSD, with the AMM vault
/// seeded at the pool's onchain share price so the market opens at fair value.
/// forge script script/KuruMarket.s.sol --rpc-url monad_testnet --broadcast --private-key $PRIVATE_KEY
contract KuruMarket is Script {
    IKuruRouter constant ROUTER = IKuruRouter(0x7EFbE105Ca7415dE98F96622173458ac1c054630); // Kuru v1 Router, Monad testnet

    // Prices: 4 decimals (1 tick = $0.0001). Sizes: 6 decimals, same as advJR.
    uint32 constant PRICE_PRECISION = 1e4;
    uint96 constant SIZE_PRECISION = 1e6;

    function run() external {
        string memory path = string.concat(vm.projectRoot(), "/../app/src/deployments/", vm.toString(block.chainid), ".json");
        string memory json = vm.readFile(path);
        address ausd = vm.parseJsonAddress(json, ".ausd");
        AdvancePool pool = AdvancePool(vm.parseJsonAddress(json, ".pool"));
        address junior = vm.parseJsonAddress(json, ".juniorToken");
        uint256 seedShares = vm.envOr("KURU_SEED_SHARES", uint256(1_000e6));

        vm.startBroadcast();
        // 1. Get Boost shares to seed the book (testnet faucet dollars).
        TestAUSD(ausd).faucet(msg.sender, 3_000e6);
        IERC20(ausd).approve(address(pool), type(uint256).max);
        pool.deposit(AdvancePool.Tranche.Junior, seedShares * 3 / 2);
        uint256 nav = pool.sharePrice(AdvancePool.Tranche.Junior); // AUSD per share, 6 decimals

        // 2. Create the advJR/AUSD market (type 0 = both ERC-20).
        address market = ROUTER.deployProxy(0, junior, ausd, SIZE_PRECISION, PRICE_PRECISION, 1, 1e5, 1e12, 30, 10, 30);
        (address vault,,,,,,,) = IKuruOrderBook(market).getVaultParams();

        // 3. Seed the AMM vault at NAV: the first deposit sets the price to quote/base.
        IERC20(junior).approve(vault, type(uint256).max);
        IERC20(ausd).approve(vault, type(uint256).max);
        IKuruVault(vault).deposit(seedShares, seedShares * nav / 1e6, 0, msg.sender);

        // 4. First trade: buy $2 of Boost shares, so the book has real activity.
        IERC20(ausd).approve(market, type(uint256).max);
        IKuruOrderBook(market).placeAndExecuteMarketBuy(2 * PRICE_PRECISION, 0, false, false);
        vm.stopBroadcast();

        (uint256 bid, uint256 ask) = IKuruOrderBook(market).bestBidAsk();
        console.log("market", market);
        console.log("vault ", vault);
        console.log("NAV (6dp)", nav);
        console.log("best bid / ask (1e18)", bid, ask);

        vm.writeJson(vm.toString(market), path, ".kuruMarket");
        vm.writeJson(vm.toString(vault), path, ".kuruVault");
    }
}
