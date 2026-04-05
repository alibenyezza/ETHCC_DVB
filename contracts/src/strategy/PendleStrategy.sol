// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {
    IPendleRouter,
    IPendleMarket,
    IPendlePT,
    ApproxParams,
    TokenInput,
    TokenOutput,
    SwapData,
    SwapType,
    LimitOrderData
} from "../interfaces/IPendle.sol";

/// @title PendleStrategy
/// @notice Buys Pendle Principal Tokens (PT) for fixed-rate USDC yield
/// @dev PT = fixed yield until expiry. Buy PT-USDC at discount, redeem at par at maturity.
///      Example: buy 100 PT-USDC for 97 USDC -> redeem 100 USDC at expiry = 3% yield
///      No testnet deployment — use via mainnet fork or when Pendle deploys on testnet.
contract PendleStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IPendleRouter public immutable router;
    address public immutable market;
    address public pt;
    uint256 private _ptBalance;

    constructor(
        address _usdc,
        address _router,
        address _market,
        address _authorized
    ) BaseStrategy(_usdc, _authorized) {
        router = IPendleRouter(_router);
        market = _market;
        // Read PT address from market
        (, address _pt,) = IPendleMarket(_market).readTokens();
        pt = _pt;
    }

    /// @notice Buy PT-USDC with USDC (fixed-rate yield)
    function deposit(uint256 amount) external override onlyAuthorized {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(router), amount);

        TokenInput memory input = TokenInput({
            tokenIn: address(usdc),
            netTokenIn: amount,
            tokenMintSy: address(usdc),
            pendleSwap: address(0),
            swapData: SwapData(SwapType.NONE, address(0), "", false)
        });

        ApproxParams memory guess = ApproxParams({
            guessMin: 0,
            guessMax: type(uint256).max,
            guessOffchain: 0,
            maxIteration: 256,
            eps: 1e15 // 0.1%
        });

        LimitOrderData memory emptyLimit;

        (uint256 netPtOut,,) = router.swapExactTokenForPt(
            address(this),
            market,
            0, // minPtOut — set to 0, rely on slippage in production
            guess,
            input,
            emptyLimit
        );

        _ptBalance += netPtOut;
    }

    /// @notice Sell PT-USDC for USDC
    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        IPendlePT(pt).approve(address(router), amount);

        TokenOutput memory output = TokenOutput({
            tokenOut: address(usdc),
            minTokenOut: 0,
            tokenRedeemSy: address(usdc),
            pendleSwap: address(0),
            swapData: SwapData(SwapType.NONE, address(0), "", false)
        });

        LimitOrderData memory emptyLimit;

        (uint256 netTokenOut,,) = router.swapExactPtForToken(
            msg.sender,
            market,
            amount,
            output,
            emptyLimit
        );

        _ptBalance = _ptBalance > amount ? _ptBalance - amount : 0;
        return netTokenOut;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        uint256 balance = IPendlePT(pt).balanceOf(address(this));
        if (balance == 0) return 0;

        IPendlePT(pt).approve(address(router), balance);

        TokenOutput memory output = TokenOutput({
            tokenOut: address(usdc),
            minTokenOut: 0,
            tokenRedeemSy: address(usdc),
            pendleSwap: address(0),
            swapData: SwapData(SwapType.NONE, address(0), "", false)
        });

        LimitOrderData memory emptyLimit;

        (uint256 netTokenOut,,) = router.swapExactPtForToken(
            msg.sender,
            market,
            balance,
            output,
            emptyLimit
        );

        _ptBalance = 0;
        return netTokenOut;
    }

    function balanceOf() external view override returns (uint256) {
        return IPendlePT(pt).balanceOf(address(this));
    }

    /// @notice Estimated yield = implied fixed rate of the PT market
    /// @dev In production, read from market's implied rate. Returns 0 as placeholder.
    function estimatedYield() external pure override returns (uint256) {
        return 0;
    }

    function protocolName() external pure override returns (string memory) {
        return "Pendle V2";
    }

    function isExpired() external view returns (bool) {
        return IPendleMarket(market).isExpired();
    }
}
