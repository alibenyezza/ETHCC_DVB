// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {CCTPBridge} from "../src/cctp/CCTPBridge.sol";

/// @title DeployCCTP
/// @notice Deploys CCTPBridge on target chains (ETH/ARB/Base Sepolia)
/// @dev These are the return-leg bridges for chain -> Arc transfers
///      forge script script/DeployCCTP.s.sol:DeployCCTP --rpc-url $ETH_SEPOLIA_RPC --broadcast
contract DeployCCTP is Script {
    // CCTP V2 addresses (same on all Sepolia testnets)
    address constant TOKEN_MESSENGER = 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5;
    address constant MESSAGE_TRANSMITTER = 0x7865fAfC2db2093669d92c0F33AeEF291086BEFD;

    // USDC per chain
    address constant USDC_ETH = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant USDC_BASE = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address authorized = vm.envOr("TEE_ADDRESS", msg.sender);
        address usdcAddress = vm.envAddress("USDC_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        CCTPBridge bridge = new CCTPBridge(
            TOKEN_MESSENGER,
            MESSAGE_TRANSMITTER,
            usdcAddress,
            authorized
        );

        vm.stopBroadcast();

        console.log("CCTPBridge deployed:", address(bridge));
        console.log("Chain USDC:", usdcAddress);
        console.log("Authorized:", authorized);
    }
}
