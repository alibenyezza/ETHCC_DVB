// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IMorpho, MarketParams} from "../interfaces/IMorpho.sol";

/// @title MorphoStrategy
/// @notice Deposits USDC into Morpho Blue markets
/// @dev Morpho Blue core: 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb (ETH + Base Sepolia)
///      MarketParams must be configured post-deploy via setMarketParams()
///      because testnet markets must be discovered on-chain.
contract MorphoStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IMorpho public immutable morpho;
    MarketParams public marketParams;
    bool public marketConfigured;
    uint256 private _trackedBalance;

    event MarketParamsUpdated(address loanToken, address collateralToken, address oracle, address irm, uint256 lltv);

    constructor(
        address _usdc,
        address _morpho,
        MarketParams memory _marketParams,
        address _authorized
    ) BaseStrategy(_usdc, _authorized) {
        morpho = IMorpho(_morpho);
        marketParams = _marketParams;
        marketConfigured = _marketParams.loanToken != address(0);
    }

    /// @notice Update market parameters post-deploy (once testnet market is discovered)
    function setMarketParams(MarketParams memory _marketParams) external onlyOwner {
        marketParams = _marketParams;
        marketConfigured = true;
        emit MarketParamsUpdated(
            _marketParams.loanToken,
            _marketParams.collateralToken,
            _marketParams.oracle,
            _marketParams.irm,
            _marketParams.lltv
        );
    }

    function deposit(uint256 amount) external override onlyAuthorized {
        require(marketConfigured, "MorphoStrategy: market not configured");
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(morpho), amount);
        (uint256 supplied,) = morpho.supply(marketParams, amount, 0, address(this), "");
        _trackedBalance += supplied;
    }

    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        (uint256 withdrawn,) = morpho.withdraw(marketParams, amount, 0, address(this), msg.sender);
        _trackedBalance = _trackedBalance > withdrawn ? _trackedBalance - withdrawn : 0;
        return withdrawn;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        if (_trackedBalance == 0) return 0;
        (uint256 withdrawn,) = morpho.withdraw(
            marketParams, _trackedBalance, 0, address(this), msg.sender
        );
        _trackedBalance = 0;
        return withdrawn;
    }

    function balanceOf() external view override returns (uint256) {
        return _trackedBalance;
    }

    function estimatedYield() external pure override returns (uint256) {
        // Morpho yield requires reading market state — return 0 as placeholder
        return 0;
    }

    function protocolName() external pure override returns (string memory) {
        return "Morpho Blue";
    }
}
