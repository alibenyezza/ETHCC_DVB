// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Silo Finance V2 interface
/// @dev Silo uses isolated lending markets. Each Silo is a separate contract.
interface ISilo {
    function deposit(address _asset, uint256 _amount, bool _collateralOnly) external returns (uint256 collateralAmount, uint256 collateralShare);
    function withdraw(address _asset, uint256 _amount, bool _collateralOnly) external returns (uint256 withdrawnAmount, uint256 withdrawnShare);
    function balanceOf(address _user) external view returns (uint256);
    function assetStorage(address _asset) external view returns (AssetStorage memory);
}

struct AssetStorage {
    address collateralToken;
    address collateralOnlyToken;
    address debtToken;
    uint256 totalDeposits;
    uint256 collateralOnlyDeposits;
    uint256 totalBorrowAmount;
}

/// @notice Silo Repository / Router
interface ISiloRepository {
    function getSilo(address _asset) external view returns (address);
}
