// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IAavePool, IAToken, IPoolDataProvider} from "../interfaces/IAavePool.sol";

/// @title AaveStrategy
/// @notice Deposits USDC into Aave V3 lending pool
contract AaveStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IAavePool public immutable pool;
    IAToken public immutable aToken;
    IPoolDataProvider public immutable dataProvider;

    constructor(
        address _usdc,
        address _pool,
        address _aToken,
        address _dataProvider,
        address _authorized
    ) BaseStrategy(_usdc, _authorized) {
        pool = IAavePool(_pool);
        aToken = IAToken(_aToken);
        dataProvider = IPoolDataProvider(_dataProvider);
    }

    function deposit(uint256 amount) external override onlyAuthorized {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(pool), amount);
        pool.supply(address(usdc), amount, address(this), 0);
    }

    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        uint256 withdrawn = pool.withdraw(address(usdc), amount, msg.sender);
        return withdrawn;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        uint256 balance = aToken.balanceOf(address(this));
        if (balance == 0) return 0;
        uint256 withdrawn = pool.withdraw(address(usdc), type(uint256).max, msg.sender);
        return withdrawn;
    }

    function balanceOf() external view override returns (uint256) {
        return aToken.balanceOf(address(this));
    }

    function estimatedYield() external view override returns (uint256) {
        (,,,,, uint256 liquidityRate,,,,,,) = dataProvider.getReserveData(address(usdc));
        // liquidityRate is in RAY (1e27), convert to bps
        return liquidityRate / 1e23;
    }

    function protocolName() external pure override returns (string memory) {
        return "Aave V3";
    }
}
