// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {AaveStrategy} from "../src/strategy/AaveStrategy.sol";
import {CompoundStrategy} from "../src/strategy/CompoundStrategy.sol";
import {MorphoStrategy} from "../src/strategy/MorphoStrategy.sol";
import {YearnStrategy} from "../src/strategy/YearnStrategy.sol";
import {MarketParams} from "../src/interfaces/IMorpho.sol";

/// @title DeployStrategy
/// @notice Deploys strategy contracts on target chains (ETH/ARB/Base Sepolia)
/// @dev Set TARGET_CHAIN env var before running
///      forge script script/DeployStrategy.s.sol:DeployStrategy --rpc-url $ETH_SEPOLIA_RPC --broadcast
///
///      Protocols available per testnet:
///        ETH Sepolia:  Aave V3, Compound V3, Morpho Blue
///        ARB Sepolia:  Aave V3
///        Base Sepolia: Aave V3, Morpho Blue
///        (Pendle & Fluid: mainnet only — deploy via fork or when testnet available)
contract DeployStrategy is Script {
    // =========================================================================
    // ETH Sepolia
    // =========================================================================
    address constant AAVE_USDC_ETH = 0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8;
    address constant AAVE_POOL_ETH = 0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951;
    address constant AAVE_ATOKEN_ETH = 0x16dA4541aD1807f4443d92D26044C1147406EB80;
    address constant AAVE_DATA_PROVIDER_ETH = 0x3e9708d80f7B3e43118013075F7e95CE3AB31F31;

    address constant COMPOUND_USDC_ETH = 0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238;
    address constant COMPOUND_COMET_ETH = 0xAec1F48e02Cfb822Be958B68C7957156EB3F0b6e;

    address constant MORPHO_ETH = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;

    // Yearn V3 on ETH Sepolia
    address constant YEARN_VAULT_FACTORY_ETH = 0x444045c5C13C246e117eD36437303cac8E250aB0;
    address constant YEARN_VAULT_ORIGINAL_ETH = 0x1ab62413e0cf2eBEb73da7D40C70E7202ae14467;
    address constant YEARN_TOKENIZED_STRATEGY_ETH = 0xBB51273D6c746910C7C06fe718f30c936170feD0;

    // =========================================================================
    // ARB Sepolia
    // =========================================================================
    address constant AAVE_USDC_ARB = 0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d;
    address constant AAVE_POOL_ARB = 0xBfC91D59fdAA134A4ED45f7B584cAf96D7792Eff;
    address constant AAVE_ATOKEN_ARB = 0x460b97BD498E1157530AEb3086301d5225b91216;
    address constant AAVE_DATA_PROVIDER_ARB = 0x12373B5085e3b42D42C1D4ABF3B3Cf4Df0E0Fa01;

    // =========================================================================
    // Base Sepolia
    // =========================================================================
    address constant AAVE_USDC_BASE = 0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f;
    address constant AAVE_POOL_BASE = 0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27;
    address constant AAVE_ATOKEN_BASE = 0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC;
    address constant AAVE_DATA_PROVIDER_BASE = 0xBc9f5b7E248451CdD7cA54e717a2BFe1F32b566b;

    address constant MORPHO_BASE = 0xBBBBBbbBBb9cC5e90e3b3Af64bdAF62C37EEFFCb;

    // =========================================================================
    // OP Sepolia
    // =========================================================================
    address constant AAVE_USDC_OP = 0x5fd84259d66Cd46123540766Be93DFE6D43130D7;
    address constant AAVE_POOL_OP = 0xb50201558B00496A145fE76f7424749556E326D8;
    address constant AAVE_ATOKEN_OP = 0xa818F1B57c201E092C4A2017A91815034326Efd1;
    address constant AAVE_DATA_PROVIDER_OP = 0x501B4c19dd9C2e06E94dA7b6D5Ed4ddA013EC741;

    // =========================================================================
    // AVAX Fuji
    // =========================================================================
    address constant AAVE_USDC_AVAX = 0x6a17716Ce178e84835cfA73AbdB71cb455032456;
    address constant AAVE_POOL_AVAX = 0xf319Bb55994dD1211bC34A7A26A336C6DD0B1b00;
    address constant AAVE_ATOKEN_AVAX = 0x2c4a078f1FC5B545f3103c870d22f9AC5F0F673E;
    address constant AAVE_DATA_PROVIDER_AVAX = 0x0B59871DF373136bB7753A7A2675b47ffA0ccC86;

    // =========================================================================
    // Pendle (mainnet only — no testnet deployment)
    // =========================================================================
    // ETH mainnet Router: 0x888888888889758F76e7103c6CbF23ABbF58F946
    // Deploy PendleStrategy via mainnet fork tests

    // =========================================================================
    // Fluid (mainnet only — no testnet deployment)
    // =========================================================================
    // ETH mainnet fUSDC: 0x9Fb7b4477576Fe5B32be4C1843aFB1e55F251B33
    // ARB mainnet fUSDC: 0x1A996cb54bb95462040408C06122D45D6Cdb6096
    // BASE mainnet fUSDC: 0xf42f5795D9ac7e9D757dB633D693cD548Cfd9169
    // Deploy FluidStrategy via mainnet fork tests

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address authorized = vm.envOr("TEE_ADDRESS", msg.sender);
        string memory chain = vm.envString("TARGET_CHAIN");

        vm.startBroadcast(deployerPrivateKey);

        bytes32 chainHash = keccak256(bytes(chain));

        if (chainHash == keccak256("eth_sepolia")) {
            _deployEthSepolia(authorized);
        } else if (chainHash == keccak256("arb_sepolia")) {
            _deployArbSepolia(authorized);
        } else if (chainHash == keccak256("base_sepolia")) {
            _deployBaseSepolia(authorized);
        } else if (chainHash == keccak256("op_sepolia")) {
            _deployOpSepolia(authorized);
        } else if (chainHash == keccak256("avax_fuji")) {
            _deployAvaxFuji(authorized);
        } else {
            revert("Unknown chain");
        }

        vm.stopBroadcast();
    }

    function _deployEthSepolia(address authorized) internal {
        // Aave V3
        AaveStrategy aave = new AaveStrategy(
            AAVE_USDC_ETH, AAVE_POOL_ETH, AAVE_ATOKEN_ETH, AAVE_DATA_PROVIDER_ETH, authorized
        );
        console.log("AaveStrategy (ETH Sepolia):", address(aave));

        // Compound V3
        CompoundStrategy compound = new CompoundStrategy(
            COMPOUND_USDC_ETH, COMPOUND_COMET_ETH, authorized
        );
        console.log("CompoundStrategy (ETH Sepolia):", address(compound));

        // Morpho Blue (MarketParams configured post-deploy via setMarketParams)
        MarketParams memory emptyParams;
        MorphoStrategy morpho = new MorphoStrategy(
            COMPOUND_USDC_ETH, MORPHO_ETH, emptyParams, authorized
        );
        console.log("MorphoStrategy (ETH Sepolia):", address(morpho));

        // Yearn V3 — requires a specific USDC vault deployed via Yearn's factory
        // Set YEARN_USDC_VAULT env var if a USDC vault exists, otherwise skip
        address yearnVault = vm.envOr("YEARN_USDC_VAULT", address(0));
        if (yearnVault != address(0)) {
            YearnStrategy yearn = new YearnStrategy(
                COMPOUND_USDC_ETH, yearnVault, authorized
            );
            console.log("YearnStrategy (ETH Sepolia):", address(yearn));
        } else {
            console.log("Skipping YearnStrategy: YEARN_USDC_VAULT not set");
        }
    }

    function _deployArbSepolia(address authorized) internal {
        // Aave V3
        AaveStrategy aave = new AaveStrategy(
            AAVE_USDC_ARB, AAVE_POOL_ARB, AAVE_ATOKEN_ARB, AAVE_DATA_PROVIDER_ARB, authorized
        );
        console.log("AaveStrategy (ARB Sepolia):", address(aave));
    }

    function _deployBaseSepolia(address authorized) internal {
        // Aave V3
        AaveStrategy aave = new AaveStrategy(
            AAVE_USDC_BASE, AAVE_POOL_BASE, AAVE_ATOKEN_BASE, AAVE_DATA_PROVIDER_BASE, authorized
        );
        console.log("AaveStrategy (Base Sepolia):", address(aave));

        // Morpho Blue (MarketParams configured post-deploy via setMarketParams)
        MarketParams memory emptyParams;
        MorphoStrategy morpho = new MorphoStrategy(
            AAVE_USDC_BASE, MORPHO_BASE, emptyParams, authorized
        );
        console.log("MorphoStrategy (Base Sepolia):", address(morpho));
    }

    function _deployOpSepolia(address authorized) internal {
        AaveStrategy aave = new AaveStrategy(
            AAVE_USDC_OP, AAVE_POOL_OP, AAVE_ATOKEN_OP, AAVE_DATA_PROVIDER_OP, authorized
        );
        console.log("AaveStrategy (OP Sepolia):", address(aave));
    }

    function _deployAvaxFuji(address authorized) internal {
        AaveStrategy aave = new AaveStrategy(
            AAVE_USDC_AVAX, AAVE_POOL_AVAX, AAVE_ATOKEN_AVAX, AAVE_DATA_PROVIDER_AVAX, authorized
        );
        console.log("AaveStrategy (AVAX Fuji):", address(aave));
    }
}
