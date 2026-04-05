// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCTPBridge} from "../src/cctp/CCTPBridge.sol";

/// @title DeployCCTP
/// @notice Deploys CCTPBridge on target chains
/// @dev Usage:
///      USDC_ADDRESS=<addr> forge script script/DeployCCTP.s.sol:DeployCCTP --rpc-url <rpc> --broadcast
///
///      For AVAX Fuji (different CCTP addresses), also set:
///      CCTP_TOKEN_MESSENGER=0xeb08f243E5d3FCFF26A9E38Ae5520A669f4019d0
///      CCTP_MESSAGE_TRANSMITTER=0xa9fB1b3009DCb79E2fe346c16a604B8Fa8aE0a79
contract DeployCCTP is Script {
    // Default CCTP V2 addresses (Sepolia testnets: ETH, ARB, Base, OP, Unichain, Poly)
    address constant DEFAULT_TOKEN_MESSENGER = 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5;
    address constant DEFAULT_MESSAGE_TRANSMITTER = 0x7865fAfC2db2093669d92c0F33AeEF291086BEFD;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address authorized = vm.envOr("TEE_ADDRESS", msg.sender);
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        // Allow overriding CCTP addresses for chains with different deployments (e.g. AVAX Fuji)
        address tokenMessenger = vm.envOr("CCTP_TOKEN_MESSENGER", DEFAULT_TOKEN_MESSENGER);
        address messageTransmitter = vm.envOr("CCTP_MESSAGE_TRANSMITTER", DEFAULT_MESSAGE_TRANSMITTER);

        vm.startBroadcast(deployerPrivateKey);

        CCTPBridge bridge = new CCTPBridge(
            tokenMessenger,
            messageTransmitter,
            usdcAddress,
            authorized
        );

        vm.stopBroadcast();

        console.log("CCTPBridge deployed:", address(bridge));
        console.log("Chain USDC:", usdcAddress);
        console.log("TokenMessenger:", tokenMessenger);
        console.log("MessageTransmitter:", messageTransmitter);
        console.log("Authorized:", authorized);
    }
}
