// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {CCTPBridge} from "../src/cctp/CCTPBridge.sol";
import {MockUSDC} from "./mocks/MockUSDC.sol";
import {ITokenMessengerV2} from "../src/interfaces/ITokenMessenger.sol";
import {IMessageTransmitterV2} from "../src/interfaces/IMessageTransmitter.sol";

/// @notice Mock TokenMessenger for testing
contract MockTokenMessenger {
    uint64 public nonceCounter;
    uint256 public lastAmount;
    uint32 public lastDomain;
    bytes32 public lastRecipient;
    address public lastBurnToken;

    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32,
        uint256,
        uint32
    ) external returns (uint64 nonce) {
        lastAmount = amount;
        lastDomain = destinationDomain;
        lastRecipient = mintRecipient;
        lastBurnToken = burnToken;
        nonceCounter++;
        return nonceCounter;
    }
}

/// @notice Mock MessageTransmitter for testing
contract MockMessageTransmitter {
    bool public shouldSucceed = true;

    function receiveMessage(bytes calldata, bytes calldata) external view returns (bool) {
        return shouldSucceed;
    }

    function setShouldSucceed(bool _val) external {
        shouldSucceed = _val;
    }
}

contract CCTPBridgeTest is Test {
    CCTPBridge public bridge;
    MockUSDC public usdc;
    MockTokenMessenger public messenger;
    MockMessageTransmitter public transmitter;

    address public owner = address(this);
    address public authorized = makeAddr("authorized");

    function setUp() public {
        usdc = new MockUSDC();
        messenger = new MockTokenMessenger();
        transmitter = new MockMessageTransmitter();

        bridge = new CCTPBridge(
            address(messenger),
            address(transmitter),
            address(usdc),
            authorized
        );

        usdc.mint(address(bridge), 10_000e6);
    }

    function test_bridgeOut_authorized() public {
        bytes32 recipient = bytes32(uint256(uint160(makeAddr("recipient"))));

        vm.prank(authorized);
        uint64 nonce = bridge.bridgeOut(6, recipient, 1000e6);

        assertEq(nonce, 1);
        assertEq(messenger.lastAmount(), 1000e6);
        assertEq(messenger.lastDomain(), 6);
        assertEq(messenger.lastRecipient(), recipient);
    }

    function test_bridgeOut_owner() public {
        bytes32 recipient = bytes32(uint256(uint160(makeAddr("recipient"))));

        bridge.bridgeOut(6, recipient, 500e6);

        assertEq(messenger.lastAmount(), 500e6);
    }

    function test_bridgeOut_unauthorized() public {
        bytes32 recipient = bytes32(uint256(uint160(makeAddr("recipient"))));

        vm.prank(makeAddr("random"));
        vm.expectRevert("CCTPBridge: unauthorized");
        bridge.bridgeOut(6, recipient, 500e6);
    }

    function test_bridgeIn() public {
        bool success = bridge.bridgeIn(hex"1234", hex"5678");
        assertTrue(success);
    }

    function test_bridgeIn_fails() public {
        transmitter.setShouldSucceed(false);

        vm.expectRevert("CCTPBridge: receiveMessage failed");
        bridge.bridgeIn(hex"1234", hex"5678");
    }

    function test_setAuthorized() public {
        address newAuth = makeAddr("newAuth");
        bridge.setAuthorized(newAuth);
        assertEq(bridge.authorized(), newAuth);
    }

    function test_rescueTokens() public {
        assertEq(usdc.balanceOf(address(bridge)), 10_000e6);

        bridge.rescueTokens(address(usdc), 5_000e6);
        assertEq(usdc.balanceOf(owner), 5_000e6);
        assertEq(usdc.balanceOf(address(bridge)), 5_000e6);
    }
}
