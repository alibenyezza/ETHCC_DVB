# ADRIAN — Smart Contracts + CCTP

**Branche :** `develop_ali`
**Dossier :** `/contracts/`

---

## Vue d'ensemble

Tu es responsable de toute la couche on-chain : le Vault sur Arc, les strategy contracts sur chaque chain, l'intégration CCTP pour bouger le USDC cross-chain, et les nanopayments. Tu fournis les ABIs et adresses aux deux autres.

---

## Structure de dossiers

```
contracts/
  foundry.toml
  .env.example            # RPC URLs, private keys (jamais commité)
  script/
    DeployVault.s.sol
    DeployStrategy.s.sol
    DeployCCTP.s.sol
  src/
    vault/
      ArcMindVault.sol     # ERC-4626 sur Arc
      ArcMindToken.sol     # arcMIND share token
    strategy/
      IStrategy.sol        # Interface commune
      AaveStrategy.sol     # Deposit/withdraw Aave
      CompoundStrategy.sol # Deposit/withdraw Compound V3
      MorphoStrategy.sol   # Deposit/withdraw Morpho Blue
    cctp/
      CCTPBridge.sol       # Burn/mint USDC via CCTP
      CCTPRouter.sol       # Routing logic Arc <-> chains
    nanopay/
      AgentPaymaster.sol   # Micro-paiements USDC pour agents
  test/
    ArcMindVault.t.sol
    AaveStrategy.t.sol
    CCTPBridge.t.sol
  deployments/
    deployments.json       # ← FICHIER CLE : adresses de tous les contracts
```

---

## Taches detaillees

### 1. Setup Foundry (Jour 1)

```bash
cd contracts/
forge init --no-commit
```

Config `foundry.toml` :
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
solc = "0.8.24"

[rpc_endpoints]
arc_testnet = "${ARC_RPC}"
base_sepolia = "${BASE_SEPOLIA_RPC}"
arb_sepolia = "${ARB_SEPOLIA_RPC}"
eth_sepolia = "${ETH_SEPOLIA_RPC}"
```

RPC URLs a utiliser :
| Chain | RPC | Chain ID |
|-------|-----|----------|
| Arc Testnet | `https://rpc.testnet.arc.network` | `5042002` |
| Ethereum Sepolia | `https://rpc.sepolia.org` | `11155111` |
| Base Sepolia | `https://sepolia.base.org` | `84532` |
| Arbitrum Sepolia | `https://sepolia-rollup.arbitrum.io/rpc` | `421614` |

Installer les deps :
```bash
forge install OpenZeppelin/openzeppelin-contracts
forge install transmissions11/solmate
```

---

### 2. Vault ERC-4626 sur Arc (`ArcMindVault.sol`)

C'est le contrat principal. L'utilisateur deposite USDC, recoit arcMIND.

**Fonctionnalites :**

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC4626} from "@openzeppelin/contracts/token/ERC20/extensions/ERC4626.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract ArcMindVault is ERC4626 {
    // USDC sur Arc = 0x3600000000000000000000000000000000000000 (18 decimals)

    address public tee;           // Adresse du TEE (seul autorise a reallouer)
    uint256 public bufferBps;     // 1000 = 10% buffer sur Arc

    // Mapping chain domain ID -> capital alloue
    mapping(uint32 => uint256) public chainAllocations;

    // --- Fonctions utilisateur ---
    // deposit(uint256 assets, address receiver) -> herite de ERC4626
    // withdraw(uint256 assets, address receiver, address owner) -> herite de ERC4626
    // redeem(uint256 shares, address receiver, address owner) -> herite de ERC4626

    // --- Fonctions TEE only ---
    function allocateToChain(uint32 domainId, uint256 amount) external onlyTEE { }
    function recallFromChain(uint32 domainId, uint256 amount) external onlyTEE { }

    // --- Fonctions internes ---
    function totalAssets() public view override returns (uint256) {
        // USDC sur Arc + somme de toutes les chainAllocations
    }

    // --- Buffer ---
    // Toujours garder 10% sur Arc pour les withdrawals instantanes
    // Si buffer < 10%, bloquer les allocations sortantes
}
```

**Points cles :**
- USDC sur Arc a 18 decimals (pas 6 comme sur les autres chains)
- `totalAssets()` = USDC local + capital deploye sur toutes les chains
- Seul le TEE peut appeler `allocateToChain` / `recallFromChain`
- Le buffer de 10% est non-negociable

**Tests a ecrire :**
- Deposit USDC -> recoit arcMIND au bon ratio
- Withdraw -> recoit USDC + yield
- Buffer enforce (ne peut pas allouer si buffer < 10%)
- Seul TEE peut allouer

---

### 3. Strategy Contracts (un par protocole)

Interface commune que chaque strategy implemente :

```solidity
// IStrategy.sol
interface IStrategy {
    function deposit(uint256 amount) external;
    function withdraw(uint256 amount) external returns (uint256);
    function withdrawAll() external returns (uint256);
    function balanceOf() external view returns (uint256);
    function estimatedYield() external view returns (uint256); // en bps
    function protocolName() external pure returns (string memory);
}
```

#### AaveStrategy.sol
```solidity
// Interagit avec Aave V3 Pool
// deposit: approve USDC -> pool.supply(usdc, amount, address(this), 0)
// withdraw: pool.withdraw(usdc, amount, address(this))
// balanceOf: aToken.balanceOf(address(this))
```

Adresses Aave V3 testnet :
| Chain | Pool | USDC aToken |
|-------|------|-------------|
| Ethereum Sepolia | `0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951` | Check Aave docs |
| Base Sepolia | Verifier disponibilite | - |
| Arbitrum Sepolia | `0xBfC91D59fdAA134A4ED45f7B28502d3E9d9F3192` | Check Aave docs |

#### CompoundStrategy.sol
```solidity
// Interagit avec Compound V3 (Comet)
// deposit: comet.supply(usdc, amount)
// withdraw: comet.withdraw(usdc, amount)
// balanceOf: comet.balanceOf(address(this))
```

#### MorphoStrategy.sol
```solidity
// Interagit avec Morpho Blue
// deposit: morpho.supply(marketParams, amount, 0, address(this), "")
// withdraw: morpho.withdraw(marketParams, amount, 0, address(this), address(this))
```

**Important :** Les strategy contracts sont deployes sur chaque chain cible (Base, Arb, ETH), PAS sur Arc. Arc ne sert que de hub.

---

### 4. CCTP Integration (`CCTPBridge.sol`)

C'est le pont USDC natif. Burn sur une chain, mint sur une autre. Zero slippage.

```solidity
contract CCTPBridge {
    ITokenMessenger public tokenMessenger;  // Contract CCTP officiel
    IERC20 public usdc;

    // Envoyer USDC vers une autre chain
    function bridgeOut(
        uint32 destinationDomain,
        address recipient,
        uint256 amount
    ) external returns (uint64 nonce) {
        usdc.approve(address(tokenMessenger), amount);
        nonce = tokenMessenger.depositForBurn(
            amount,
            destinationDomain,
            bytes32(uint256(uint160(recipient))),
            address(usdc)
        );
    }

    // Recevoir USDC (appele par le MessageTransmitter)
    function bridgeIn(bytes calldata message, bytes calldata attestation) external {
        messageTransmitter.receiveMessage(message, attestation);
    }
}
```

Adresses CCTP V2 Testnet :
| Chain | Domain | TokenMessenger | MessageTransmitter |
|-------|--------|---------------|-------------------|
| Arc Testnet | `26` | Verifier docs Circle | Verifier docs Circle |
| Ethereum Sepolia | `0` | `0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5` | `0x7865fAfC2db2093669d92c0F33AeEF291086BEFD` |
| Base Sepolia | `6` | `0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5` | `0x7865fAfC2db2093669d92c0F33AeEF291086BEFD` |
| Arbitrum Sepolia | `3` | `0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5` | `0x7865fAfC2db2093669d92c0F33AeEF291086BEFD` |

**Flux de reallocation :**
```
1. TEE decide : bouger 10K de ETH vers BASE
2. CCTPBridge sur ETH : burn 10K USDC -> domain 26 (Arc)
3. Arc recoit 10K USDC
4. CCTPBridge sur Arc : burn 10K USDC -> domain 6 (Base)
5. Base recoit 10K USDC
6. Agent-BASE peut maintenant deployer le capital
```

**Tests a ecrire :**
- bridgeOut encode correctement le message
- Seul le TEE peut trigger les bridges de reallocation
- Les montants sont corrects apres bridge (attention 18 vs 6 decimals)

---

### 5. Nanopayments (`AgentPaymaster.sol`)

Permet aux agents de payer pour leurs API calls et compute 0G en micro-USDC sur Arc.

```solidity
contract AgentPaymaster {
    mapping(address => uint256) public agentBudgets;

    // Le vault alloue un budget a chaque agent
    function fundAgent(address agent, uint256 amount) external onlyVault { }

    // L'agent paie pour un service (gas-free sur Arc)
    function pay(address service, uint256 amount) external onlyAgent { }

    // Consulter le budget restant
    function budgetOf(address agent) external view returns (uint256) { }
}
```

---

### 6. Deploy Scripts

Un script Foundry par chain :

```solidity
// script/DeployVault.s.sol
contract DeployVault is Script {
    function run() external {
        vm.startBroadcast();
        // Deploy sur Arc Testnet
        ArcMindVault vault = new ArcMindVault(USDC_ARC, "ArcMind Vault", "arcMIND");
        vm.stopBroadcast();
    }
}

// script/DeployStrategy.s.sol
contract DeployStrategy is Script {
    function run(string memory chain) external {
        vm.startBroadcast();
        // Deploy AaveStrategy, CompoundStrategy, MorphoStrategy
        // selon ce qui est dispo sur la chain
        vm.stopBroadcast();
    }
}
```

---

### 7. Livrable final : `deployments.json`

Ce fichier est LE contrat d'interface avec Adrian et Julie :

```json
{
  "arc_testnet": {
    "chainId": 5042002,
    "rpc": "https://rpc.testnet.arc.network",
    "vault": "0x...",
    "arcMindToken": "0x...",
    "cctpBridge": "0x...",
    "agentPaymaster": "0x...",
    "usdc": "0x3600000000000000000000000000000000000000"
  },
  "base_sepolia": {
    "chainId": 84532,
    "rpc": "https://sepolia.base.org",
    "strategies": {
      "aave": "0x...",
      "compound": "0x...",
      "morpho": "0x..."
    },
    "cctpBridge": "0x...",
    "usdc": "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
  },
  "arb_sepolia": {
    "chainId": 421614,
    "rpc": "https://sepolia-rollup.arbitrum.io/rpc",
    "strategies": {
      "aave": "0x...",
      "compound": "0x..."
    },
    "cctpBridge": "0x...",
    "usdc": "0x..."
  },
  "eth_sepolia": {
    "chainId": 11155111,
    "rpc": "https://rpc.sepolia.org",
    "strategies": {
      "aave": "0x...",
      "compound": "0x..."
    },
    "cctpBridge": "0x...",
    "usdc": "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
  }
}
```

---

## Ce que tu fournis aux autres

| A qui | Quoi | Pourquoi |
|-------|------|----------|
| Adrian (Agents) | `deployments.json` + ABIs dans `contracts/out/` | Pour que les agents puissent appeler les strategy contracts et lire les balances |
| Adrian (Agents) | Interface `IStrategy` | Pour que les agents sachent quelles fonctions appeler |
| Julie (TEE) | `deployments.json` + ABI du Vault et CCTPBridge | Pour que le TEE puisse signer les TX d'allocation et de bridge |
| Julie (Dashboard) | `deployments.json` + ABI du Vault | Pour afficher les balances, TVL, APY |

---

## Ce dont tu as besoin des autres

| De qui | Quoi | Pourquoi |
|--------|------|----------|
| Julie (TEE) | Adresse du TEE wallet | Pour le modifier `onlyTEE` sur le Vault |
| Adrian (Agents) | Adresses des agent wallets | Pour les whitelist dans le Paymaster |

---

## Ordre de dev recommande

```
Jour 1 : Setup Foundry + ArcMindVault.sol + tests
Jour 2 : IStrategy + AaveStrategy + CompoundStrategy + tests
Jour 3 : CCTPBridge + tests d'integration
Jour 4 : Deploy sur testnets + generer deployments.json
Jour 5 : AgentPaymaster + polish + support integration avec les autres
```

---

## Checklist finale

- [ ] Vault ERC-4626 deploye sur Arc Testnet
- [ ] arcMIND token fonctionne (mint/burn)
- [ ] Buffer 10% enforce
- [ ] Au moins 2 strategy contracts deployes (Aave + Compound)
- [ ] CCTP bridge fonctionnel Arc <-> Base Sepolia
- [ ] CCTP bridge fonctionnel Arc <-> Arb Sepolia
- [ ] `deployments.json` complet et a jour
- [ ] ABIs exportes et accessibles
- [ ] Nanopayments basique fonctionnel
- [ ] Tests passent
