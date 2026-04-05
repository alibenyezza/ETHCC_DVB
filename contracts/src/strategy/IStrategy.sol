// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IStrategy
/// @notice Common interface for all yield strategy contracts
interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256 actualWithdrawn);
    function withdrawAll() external returns (uint256 totalWithdrawn);
    function balanceOf() external view returns (uint256);
    function estimatedYield() external view returns (uint256); // in bps (100 = 1%)
    function protocolName() external view returns (string memory);
}
