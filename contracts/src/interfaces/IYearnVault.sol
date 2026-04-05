// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Yearn V3 Vault interface (ERC4626-compatible)
/// @dev Yearn extends ERC4626 with maxLoss and strategies params on withdraw/redeem
interface IYearnVault {
    // --- ERC4626 Core ---
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);

    // --- View ---
    function balanceOf(address account) external view returns (uint256);
    function totalAssets() external view returns (uint256);
    function totalSupply() external view returns (uint256);
    function asset() external view returns (address);
    function pricePerShare() external view returns (uint256);

    // --- Preview ---
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);

    // --- Limits ---
    function maxDeposit(address) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);

    // --- Conversions ---
    function convertToShares(uint256 assets) external view returns (uint256);
    function convertToAssets(uint256 shares) external view returns (uint256);

    // --- ERC20 ---
    function approve(address spender, uint256 amount) external returns (bool);
    function decimals() external view returns (uint256);
}
