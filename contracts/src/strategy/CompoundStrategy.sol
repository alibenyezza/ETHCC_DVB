// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IComet} from "../interfaces/IComet.sol";

/// @title CompoundStrategy
/// @notice Deposits USDC into Compound V3 (Comet)
contract CompoundStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IComet public immutable comet;

    constructor(
        address _usdc,
        address _comet,
        address _authorized
    ) BaseStrategy(_usdc, _authorized) {
        comet = IComet(_comet);
    }

    function deposit(uint256 amount) external override onlyAuthorized {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(comet), amount);
        comet.supply(address(usdc), amount);
    }

    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        comet.withdraw(address(usdc), amount);
        usdc.safeTransfer(msg.sender, amount);
        return amount;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        uint256 balance = comet.balanceOf(address(this));
        if (balance == 0) return 0;
        comet.withdraw(address(usdc), balance);
        usdc.safeTransfer(msg.sender, balance);
        return balance;
    }

    function balanceOf() external view override returns (uint256) {
        return comet.balanceOf(address(this));
    }

    function estimatedYield() external view override returns (uint256) {
        uint256 utilization = comet.getUtilization();
        uint64 supplyRate = comet.getSupplyRate(utilization);
        // supplyRate is per second, convert to annual bps
        // bps = supplyRate * SECONDS_PER_YEAR / 1e14
        return uint256(supplyRate) * 365 days / 1e14;
    }

    function protocolName() external pure override returns (string memory) {
        return "Compound V3";
    }
}
