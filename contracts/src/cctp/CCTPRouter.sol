// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {CCTPBridge} from "./CCTPBridge.sol";

/// @title CCTPRouter
/// @notice Routes CCTP transfers between Arc and target chains
/// @dev USDC is 6 decimals on all chains (Arc + others), so no decimal conversion needed
contract CCTPRouter is Ownable {
    CCTPBridge public bridge;
    address public authorized;

    mapping(uint32 => address) public domainRecipients; // domain -> default recipient on that chain

    event RouteExecuted(uint32 indexed destinationDomain, uint256 amount);
    event AuthorizedUpdated(address indexed newAuthorized);
    event RecipientUpdated(uint32 indexed domain, address recipient);

    modifier onlyAuthorized() {
        require(msg.sender == authorized || msg.sender == owner(), "CCTPRouter: unauthorized");
        _;
    }

    constructor(address _bridge) Ownable(msg.sender) {
        bridge = CCTPBridge(_bridge);
    }

    /// @notice Route capital to a destination chain via CCTP
    function routeToChain(
        uint32 destinationDomain,
        bytes32 recipient,
        uint256 amount
    ) external onlyAuthorized returns (uint64 nonce) {
        nonce = bridge.bridgeOut(destinationDomain, recipient, amount);
        emit RouteExecuted(destinationDomain, amount);
    }

    /// @notice Convert an address to bytes32 for CCTP recipient format
    function addressToBytes32(address addr) external pure returns (bytes32) {
        return bytes32(uint256(uint160(addr)));
    }

    function setAuthorized(address _authorized) external onlyOwner {
        authorized = _authorized;
        emit AuthorizedUpdated(_authorized);
    }

    function setBridge(address _bridge) external onlyOwner {
        bridge = CCTPBridge(_bridge);
    }

    function setDomainRecipient(uint32 domain, address recipient) external onlyOwner {
        domainRecipients[domain] = recipient;
        emit RecipientUpdated(domain, recipient);
    }
}
