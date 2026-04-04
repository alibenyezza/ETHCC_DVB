// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @notice Mock TokenMessenger that accepts depositForBurn V2 calls and burns USDC
contract MockTokenMessengerForVault {
    uint64 public nonceCounter;
    uint256 public lastAmount;
    uint32 public lastDomain;

    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32,
        address burnToken,
        bytes32,
        uint256,
        uint32
    ) external returns (uint64 nonce) {
        // Simulate CCTP burn: transfer USDC from caller to this contract
        IERC20(burnToken).transferFrom(msg.sender, address(this), amount);
        lastAmount = amount;
        lastDomain = destinationDomain;
        nonceCounter++;
        return nonceCounter;
    }
}

/// @notice Mock CCTP Bridge that exposes tokenMessenger() for the vault
contract MockCCTPBridge {
    IERC20 public usdc;
    MockTokenMessengerForVault public tokenMessenger;

    uint64 public nonceCounter;
    uint32 public lastDestDomain;
    bytes32 public lastRecipient;
    uint256 public lastAmount;

    constructor(address _usdc) {
        usdc = IERC20(_usdc);
        tokenMessenger = new MockTokenMessengerForVault();
    }

    function bridgeOut(
        uint32 destinationDomain,
        bytes32 mintRecipient,
        uint256 amount
    ) external returns (uint64 nonce) {
        lastDestDomain = destinationDomain;
        lastRecipient = mintRecipient;
        lastAmount = amount;
        nonceCounter++;
        return nonceCounter;
    }

    function setAuthorized(address) external {}
}
