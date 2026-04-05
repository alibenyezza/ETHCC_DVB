// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ISilo} from "../interfaces/ISilo.sol";

/// @title SiloStrategy
/// @notice Deposits USDC into Silo Finance isolated lending markets
/// @dev Silo V2 uses isolated markets per asset pair. Each Silo contract handles one market.
///      Used on: Sonic, Arbitrum
contract SiloStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    ISilo public immutable silo;
    uint256 private _trackedBalance;

    constructor(
        address _usdc,
        address _silo,
        address _authorized
    ) BaseStrategy(_usdc, _authorized) {
        silo = ISilo(_silo);
    }

    function deposit(uint256 amount) external override onlyAuthorized {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(silo), amount);
        silo.deposit(address(usdc), amount, false);
        _trackedBalance += amount;
    }

    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        (uint256 withdrawn,) = silo.withdraw(address(usdc), amount, false);
        usdc.safeTransfer(msg.sender, withdrawn);
        _trackedBalance = _trackedBalance > withdrawn ? _trackedBalance - withdrawn : 0;
        return withdrawn;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        if (_trackedBalance == 0) return 0;
        (uint256 withdrawn,) = silo.withdraw(address(usdc), _trackedBalance, false);
        usdc.safeTransfer(msg.sender, withdrawn);
        _trackedBalance = 0;
        return withdrawn;
    }

    function balanceOf() external view override returns (uint256) {
        return _trackedBalance;
    }

    function estimatedYield() external pure override returns (uint256) {
        return 0; // Read from Silo's interest rate model in production
    }

    function protocolName() external pure override returns (string memory) {
        return "Silo V2";
    }
}
