// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IYearnVault} from "../interfaces/IYearnVault.sol";

/// @title YearnStrategy
/// @notice Deposits USDC into a Yearn V3 vault (ERC4626)
/// @dev Yearn V3 on ETH Sepolia:
///      VaultFactory: 0x444045c5C13C246e117eD36437303cac8E250aB0
///      Vault Original: 0x1ab62413e0cf2eBEb73da7D40C70E7202ae14467
///      TokenizedStrategy: 0xBB51273D6c746910C7C06fe718f30c936170feD0
///      The specific USDC vault address depends on what's been deployed via the factory.
contract YearnStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IYearnVault public immutable vault;

    constructor(
        address _usdc,
        address _vault,
        address _authorized
    ) BaseStrategy(_usdc, _authorized) {
        vault = IYearnVault(_vault);
    }

    function deposit(uint256 amount) external override onlyAuthorized {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(vault), amount);
        vault.deposit(amount, address(this));
    }

    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        uint256 shares = vault.previewWithdraw(amount);
        uint256 assets = vault.redeem(shares, msg.sender, address(this));
        return assets;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        uint256 shares = vault.balanceOf(address(this));
        if (shares == 0) return 0;
        uint256 assets = vault.redeem(shares, msg.sender, address(this));
        return assets;
    }

    function balanceOf() external view override returns (uint256) {
        uint256 shares = vault.balanceOf(address(this));
        if (shares == 0) return 0;
        return vault.convertToAssets(shares);
    }

    /// @notice Estimated yield from Yearn vault share price growth
    /// @dev In production, compute from pricePerShare delta over time
    function estimatedYield() external pure override returns (uint256) {
        return 0;
    }

    function protocolName() external pure override returns (string memory) {
        return "Yearn V3";
    }

    function pricePerShare() external view returns (uint256) {
        return vault.pricePerShare();
    }
}
