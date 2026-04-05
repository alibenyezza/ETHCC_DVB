// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {BaseStrategy} from "./BaseStrategy.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ICToken} from "../interfaces/ICToken.sol";

/// @title CompoundV2Strategy
/// @notice Deposits USDC into Compound V2 fork cTokens
/// @dev Works with: Benqi (AVAX), Sonne (OP), Moonwell (Base), Mendi (Linea), Venus (BNB)
///      All Compound V2 forks use the same cToken mint/redeem interface.
///      Deploy one instance per cToken market per chain.
contract CompoundV2Strategy is BaseStrategy {
    using SafeERC20 for IERC20;

    ICToken public immutable cToken;
    string private _protocolName;

    constructor(
        address _usdc,
        address _cToken,
        address _authorized,
        string memory protocolName_
    ) BaseStrategy(_usdc, _authorized) {
        cToken = ICToken(_cToken);
        _protocolName = protocolName_;
    }

    function deposit(uint256 amount) external override onlyAuthorized {
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        usdc.forceApprove(address(cToken), amount);
        uint256 err = cToken.mint(amount);
        require(err == 0, "CompoundV2Strategy: mint failed");
    }

    function withdraw(uint256 amount) external override onlyAuthorized returns (uint256) {
        uint256 err = cToken.redeemUnderlying(amount);
        require(err == 0, "CompoundV2Strategy: redeem failed");
        usdc.safeTransfer(msg.sender, amount);
        return amount;
    }

    function withdrawAll() external override onlyAuthorized returns (uint256) {
        uint256 cBalance = cToken.balanceOf(address(this));
        if (cBalance == 0) return 0;
        uint256 err = cToken.redeem(cBalance);
        require(err == 0, "CompoundV2Strategy: redeem failed");
        uint256 usdcBalance = usdc.balanceOf(address(this));
        usdc.safeTransfer(msg.sender, usdcBalance);
        return usdcBalance;
    }

    function balanceOf() external view override returns (uint256) {
        // cToken balance * exchange rate / 1e18
        uint256 cBalance = cToken.balanceOf(address(this));
        uint256 exchangeRate = cToken.exchangeRateStored();
        return (cBalance * exchangeRate) / 1e18;
    }

    function estimatedYield() external view override returns (uint256) {
        // Try supplyRatePerBlock first (Compound, Moonwell, Benqi)
        // Approximate: rate * blocks_per_year / 1e18 * 10000 (bps)
        // ~2,628,000 blocks/year (assuming 12s blocks)
        try cToken.supplyRatePerBlock() returns (uint256 rate) {
            return (rate * 2628000) / 1e14;
        } catch {
            // Fallback for timestamp-based forks (Sonne, some Moonwell)
            try cToken.supplyRatePerTimestamp() returns (uint256 rate) {
                return (rate * 365 days) / 1e14;
            } catch {
                return 0;
            }
        }
    }

    function protocolName() external view override returns (string memory) {
        return _protocolName;
    }
}
