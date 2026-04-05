// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Compound V2 cToken interface (used by Benqi, Sonne, Moonwell, Mendi, Venus)
/// @dev All Compound V2 forks share this interface for supply/redeem/balanceOf
interface ICToken {
    function mint(uint256 mintAmount) external returns (uint256); // 0 = success
    function redeem(uint256 redeemTokens) external returns (uint256);
    function redeemUnderlying(uint256 redeemAmount) external returns (uint256);
    function balanceOf(address owner) external view returns (uint256);
    function balanceOfUnderlying(address owner) external returns (uint256);
    function exchangeRateStored() external view returns (uint256);
    function exchangeRateCurrent() external returns (uint256);
    function supplyRatePerBlock() external view returns (uint256);
    function supplyRatePerTimestamp() external view returns (uint256); // Some forks use timestamp
    function underlying() external view returns (address);
}

/// @notice Comptroller interface for Compound V2 forks
interface IComptroller {
    function enterMarkets(address[] calldata cTokens) external returns (uint256[] memory);
    function markets(address cToken) external view returns (bool isListed, uint256 collateralFactorMantissa);
}
