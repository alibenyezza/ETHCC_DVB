// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IStrategy} from "./IStrategy.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title BaseStrategy
/// @notice Abstract base for all strategy implementations
abstract contract BaseStrategy is IStrategy, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public authorized; // Agent or TEE that can call deposit/withdraw

    event AuthorizedUpdated(address indexed newAuthorized);

    modifier onlyAuthorized() {
        require(
            msg.sender == authorized || msg.sender == owner(),
            "BaseStrategy: unauthorized"
        );
        _;
    }

    constructor(address _usdc, address _authorized) Ownable(msg.sender) {
        usdc = IERC20(_usdc);
        authorized = _authorized;
    }

    function setAuthorized(address _authorized) external onlyOwner {
        authorized = _authorized;
        emit AuthorizedUpdated(_authorized);
    }
}
