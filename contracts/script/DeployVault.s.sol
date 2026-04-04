// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {ArcMindVault} from "../src/vault/ArcMindVault.sol";
import {CCTPBridge} from "../src/cctp/CCTPBridge.sol";
import {CCTPRouter} from "../src/cctp/CCTPRouter.sol";
import {AgentPaymaster} from "../src/nanopay/AgentPaymaster.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title DeployVault
/// @notice Deploys all Arc-side contracts: CCTPBridge, Vault, Router, Paymaster
/// @dev Run: forge script script/DeployVault.s.sol:DeployVault --rpc-url $ARC_RPC --broadcast --with-gas-price 160000000000
contract DeployVault is Script {
    // Arc Testnet addresses
    address constant USDC_ARC = 0x3600000000000000000000000000000000000000;
    address constant TOKEN_MESSENGER_ARC = 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA;
    address constant MESSAGE_TRANSMITTER_ARC = 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address teeAddress = vm.envOr("TEE_ADDRESS", msg.sender); // Default to deployer if TEE not set yet

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy CCTPBridge (authorized = address(0) temporarily)
        CCTPBridge bridge = new CCTPBridge(
            TOKEN_MESSENGER_ARC,
            MESSAGE_TRANSMITTER_ARC,
            USDC_ARC,
            address(0)
        );
        console.log("CCTPBridge:", address(bridge));

        // 2. Deploy Vault
        ArcMindVault vault = new ArcMindVault(
            IERC20(USDC_ARC),
            teeAddress,
            address(bridge)
        );
        console.log("ArcMindVault:", address(vault));

        // 3. Wire bridge authorized to vault
        bridge.setAuthorized(address(vault));

        // 4. Deploy Router
        CCTPRouter router = new CCTPRouter(address(bridge));
        console.log("CCTPRouter:", address(router));

        // 5. Deploy Paymaster
        AgentPaymaster paymaster = new AgentPaymaster(USDC_ARC, address(vault));
        console.log("AgentPaymaster:", address(paymaster));

        // 6. Add supported domains
        vault.addSupportedDomain(0);  // ETH Sepolia
        vault.addSupportedDomain(6);  // Base Sepolia
        vault.addSupportedDomain(3);  // ARB Sepolia

        vm.stopBroadcast();

        console.log("--- Arc Deployment Complete ---");
        console.log("TEE set to:", teeAddress);
    }
}
