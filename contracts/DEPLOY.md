# Guide de Deploy — Adrian Smart Contracts

> Tout est deja deploye. Ce guide est pour reference ou re-deploiement.

## Etat actuel : DEPLOYE ET TESTE

Tous les contrats sont live sur 4 chains. Voir `context.md` pour les adresses.

## Prerequis

1. **Foundry installe** (`forge`, `cast`)
2. **Wallet** avec une private key
3. **Faucets** :
   - Arc Testnet USDC : https://faucet.circle.com → "Arc Testnet"
   - ETH Sepolia ETH : https://faucet.google.com/ethereum-sepolia
   - ETH Sepolia USDC : https://faucet.circle.com → "Ethereum Sepolia"
   - Base Sepolia ETH : bridge depuis Sepolia ou https://faucet.circle.com
   - ARB Sepolia ETH : https://faucet.arbitrum.io

## Setup

```bash
cd contracts
cp .env.example .env
# Editer .env avec ta private key (prefixe 0x)
```

## Deploy sur Arc Testnet

```bash
source .env
forge script script/DeployVault.s.sol:DeployVault \
  --rpc-url $ARC_RPC --broadcast --with-gas-price 160000000000
```

> **Gas minimum sur Arc = 160 Gwei.** Toujours ajouter `--gas-price 160000000000`.

## Deploy Strategies

```bash
TARGET_CHAIN=eth_sepolia forge script script/DeployStrategy.s.sol:DeployStrategy --rpc-url $ETH_SEPOLIA_RPC --broadcast
TARGET_CHAIN=base_sepolia forge script script/DeployStrategy.s.sol:DeployStrategy --rpc-url $BASE_SEPOLIA_RPC --broadcast
TARGET_CHAIN=arb_sepolia forge create src/strategy/AaveStrategy.sol:AaveStrategy --rpc-url $ARB_SEPOLIA_RPC --private-key $PRIVATE_KEY --broadcast --constructor-args <USDC> <POOL> <ATOKEN> <DATA_PROVIDER> <AUTHORIZED>
```

## Deploy CCTPBridge sur chaque chain cible

```bash
forge create src/cctp/CCTPBridge.sol:CCTPBridge --rpc-url <RPC> --private-key $PRIVATE_KEY --broadcast \
  --constructor-args 0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275 <USDC_ADDRESS> <AUTHORIZED>
```

> **IMPORTANT** : Utiliser le MessageTransmitter **V2** `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` (pas l'ancien V1 `0x7865fAfC...`).

## CCTP : Comment bridger USDC entre chains

### Architecture
Le precompile USDC d'Arc bloque `depositForBurn` depuis les contrats. Le flow est :

1. **TEE appelle `vault.allocateToChain(domain, recipient, amount)`** — USDC transfere au TEE wallet
2. **TEE (EOA) appelle `depositForBurn` V2 directement** sur le TokenMessenger
3. **Poll l'attestation** Circle (~1-5 min)
4. **N'importe qui appelle `receiveMessage`** sur le MessageTransmitter V2 de la chain destination

### Commandes

```bash
# 1. allocateToChain (vault → TEE)
cast send $VAULT "allocateToChain(uint32,bytes32,uint256)" \
  6 0x000000000000000000000000<RECIPIENT_NO_0x> 500000 \
  --rpc-url $ARC_RPC --private-key $PRIVATE_KEY --gas-price 160000000000 --gas-limit 500000

# 2. Approve + depositForBurn V2 (TEE → CCTP)
cast send 0x3600000000000000000000000000000000000000 \
  "approve(address,uint256)" 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA 500000 \
  --rpc-url $ARC_RPC --private-key $PRIVATE_KEY --gas-price 160000000000

cast send 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA \
  "depositForBurn(uint256,uint32,bytes32,address,bytes32,uint256,uint32)" \
  500000 6 0x000000000000000000000000<RECIPIENT_NO_0x> \
  0x3600000000000000000000000000000000000000 \
  0x0000000000000000000000000000000000000000000000000000000000000000 0 0 \
  --rpc-url $ARC_RPC --private-key $PRIVATE_KEY --gas-price 160000000000 --gas-limit 500000

# 3. Poll attestation
curl -s "https://iris-api-sandbox.circle.com/v2/messages/26?transactionHash=<TX_HASH>"
# Attendre status=complete, recuperer message + attestation

# 4. Receive on destination (MessageTransmitter V2)
cast send 0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275 \
  "receiveMessage(bytes,bytes)" <MESSAGE> <ATTESTATION> \
  --rpc-url $BASE_SEPOLIA_RPC --private-key $PRIVATE_KEY --gas-limit 500000
```

## Configuration post-deploy

```bash
# Quand Julie fournit l'adresse TEE :
cast send $VAULT "setTEE(address)" <TEE_ADDRESS> \
  --rpc-url $ARC_RPC --private-key $PRIVATE_KEY --gas-price 160000000000

# Quand Ali fournit les adresses agents :
cast send $PAYMASTER "registerAgent(address)" <AGENT_ADDRESS> \
  --rpc-url $ARC_RPC --private-key $PRIVATE_KEY --gas-price 160000000000

# Pour Morpho (quand un market USDC est decouvert) :
cast send <MORPHO_STRATEGY> "setMarketParams((address,address,address,address,uint256))" \
  "(<loanToken>,<collateralToken>,<oracle>,<irm>,<lltv>)" \
  --rpc-url <RPC> --private-key $PRIVATE_KEY
```

## Verification

```bash
# Vault
cast call $VAULT "totalAssets()(uint256)" --rpc-url $ARC_RPC
cast call $VAULT "getLocalBalance()(uint256)" --rpc-url $ARC_RPC
cast call $VAULT "tee()(address)" --rpc-url $ARC_RPC

# Strategy
cast call <STRATEGY> "protocolName()(string)" --rpc-url <RPC>
cast call <STRATEGY> "balanceOf()(uint256)" --rpc-url <RPC>
cast call <STRATEGY> "estimatedYield()(uint256)" --rpc-url <RPC>

# Paymaster
cast call $PAYMASTER "budgetOf(address)(uint256)" <AGENT> --rpc-url $ARC_RPC
```

## ABIs pour Ali et Julie

Apres `forge build`, les ABIs sont dans `contracts/out/` :
- `out/ArcMindVault.sol/ArcMindVault.json` → Julie (dashboard + TEE)
- `out/CCTPBridge.sol/CCTPBridge.json` → Julie (TEE)
- `out/IStrategy.sol/IStrategy.json` → Ali (agents)
- `out/AgentPaymaster.sol/AgentPaymaster.json` → Ali (agents)
