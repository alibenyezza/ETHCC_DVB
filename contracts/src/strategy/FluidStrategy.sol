// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IFToken} from "../interfaces/IFluid.sol";

/// @title FluidStrategy
/// @notice Deposits USDC into Fluid fUSDC lending token (ERC4626)
/// @dev fUSDC auto-compounds lending yield. Deposit USDC -> receive fUSDC shares.
///      No testnet deployment — use via mainnet fork or when Fluid deploys on testnet.
///      Mainnet fUSDC addresses:
///        ETH:  0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33
///        ARB:  0x1A996cb54bb95462040408C06122D45D6Cdb6096
///        BASE: 0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169
contract FluidStrategy is BaseStrategy {
    using SafeERC20 for IERC20;

    IFToken public immutable fToken;

    constructor(
        address _usdc,
        address _fToken,
        address _authorized
    ) BaseStrategy(_usdc, _authorized) {
        fToken = IFToken(_fToken);
    }

    function deposit(uint256 amount) external override onlyAuthorized {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(fToken), amount);
        fToken.deposit(amount, address(this));
    }

    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        uint256 shares = fToken.previewWithdraw(amount);
        fToken.redeem(shares, msg.sender, address(this));
        return amount;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        uint256 shares = fToken.balanceOf(address(this));
        if (shares == 0) return 0;
        uint256 assets = fToken.redeem(shares, msg.sender, address(this));
        return assets;
    }

    function balanceOf() external view override returns (uint256) {
        uint256 shares = fToken.balanceOf(address(this));
        return fToken.previewRedeem(shares);
    }

    /// @notice Estimated yield from Fluid lending rate
    /// @dev In production, compute from fToken share price growth. Returns 0 as placeholder.
    function estimatedYield() external pure override returns (uint256) {
        return 0;
    }

    function protocolName() external pure override returns (string memory) {
        return "Fluid";
    }
}
