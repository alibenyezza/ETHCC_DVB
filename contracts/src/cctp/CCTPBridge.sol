// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ITokenMessengerV2} from "../interfaces/ITokenMessenger.sol";
import {IMessageTransmitterV2} from "../interfaces/IMessageTransmitter.sol";

/// @title CCTPBridge
/// @notice Handles USDC bridging via Circle CCTP V2 (burn/mint)
/// @dev Deployed on every chain (Arc + target chains)
contract CCTPBridge is Ownable {
    using SafeERC20 for IERC20;

    ITokenMessengerV2 public immutable tokenMessenger;
    IMessageTransmitterV2 public immutable messageTransmitter;
    IERC20 public immutable usdc;

    address public authorized;

    event BridgeOut(uint32 indexed destinationDomain, bytes32 recipient, uint256 amount, uint64 nonce);
    event BridgeIn(bool success);
    event AuthorizedUpdated(address indexed newAuthorized);

    modifier onlyAuthorized() {
        require(msg.sender == authorized || msg.sender == owner(), "CCTPBridge: unauthorized");
        _;
    }

    constructor(
        address _tokenMessenger,
        address _messageTransmitter,
        address _usdc,
        address _authorized
    ) Ownable(msg.sender) {
        tokenMessenger = ITokenMessengerV2(_tokenMessenger);
        messageTransmitter = IMessageTransmitterV2(_messageTransmitter);
        usdc = IERC20(_usdc);
        authorized = _authorized;
    }

    /// @notice Burn USDC on this chain to mint on destination chain
    /// @param destinationDomain CCTP domain ID of destination chain
    /// @param mintRecipient Recipient address as bytes32
    /// @param amount Amount of USDC to bridge (in local decimals)
    function bridgeOut(
        uint32 destinationDomain,
        bytes32 mintRecipient,
        uint256 amount
    ) external onlyAuthorized returns (uint64 nonce) {
        // Use standard approve — Arc USDC precompile may not support forceApprove pattern
        usdc.approve(address(tokenMessenger), amount);

        nonce = tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            mintRecipient,
            address(usdc),
            bytes32(0),  // destinationCaller: anyone can relay
            0,           // maxFee: no fee limit
            0            // minFinalityThreshold: default finality
        );

        emit BridgeOut(destinationDomain, mintRecipient, amount, nonce);
    }

    /// @notice Receive USDC from another chain (relay the CCTP message)
    /// @dev Anyone can call this — message is verified by MessageTransmitter
    function bridgeIn(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool) {
        bool success = messageTransmitter.receiveMessage(message, attestation);
        require(success, "CCTPBridge: receiveMessage failed");
        emit BridgeIn(success);
        return success;
    }

    function setAuthorized(address _authorized) external onlyOwner {
        authorized = _authorized;
        emit AuthorizedUpdated(_authorized);
    }

    /// @notice Emergency: recover tokens stuck in bridge
    function rescueTokens(address token, uint256 amount) external onlyOwner {
        IERC20(token).safeTransfer(owner(), amount);
    }
}
