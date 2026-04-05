// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Fluid fToken interface (ERC4626-compatible lending token)
/// @dev fUSDC = deposit USDC, receive fUSDC shares, earn lending yield
interface IFToken {
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

    // --- Preview ---
    function previewDeposit(uint256 assets) external view returns (uint256);
    function previewWithdraw(uint256 assets) external view returns (uint256);
    function previewRedeem(uint256 shares) external view returns (uint256);
    function previewMint(uint256 shares) external view returns (uint256);

    // --- Limits ---
    function maxDeposit(address) external view returns (uint256);
    function maxWithdraw(address owner) external view returns (uint256);
    function maxRedeem(address owner) external view returns (uint256);

    // --- Fluid-specific with slippage protection ---
    function deposit(uint256 assets, address receiver, uint256 minAmountOut) external returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner, uint256 maxSharesBurn) external returns (uint256 shares);
}
