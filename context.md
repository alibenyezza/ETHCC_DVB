# ArcMind — Context Adrian (Smart Contracts + CCTP)

> Derniere mise a jour : 2026-04-05 — PRET POUR PUSH

## Projet
ArcMind = optimisation de yield DeFi cross-chain avec agents IA autonomes.
- **Vault ERC-4626** sur Arc (Circle L1) — users deposit USDC, recoivent arcMIND
- **Agents IA** (Ali) observent les protocoles DeFi par chain, proposent des strategies
- **TEE Chainlink** (Julie) valide, fusionne, realloue le capital toutes les 6-7h
- **Dashboard** (Julie) — Next.js + wagmi

## Equipe
- **Adrian** (moi) : Smart Contracts + CCTP — branche `develop_adrian`, dossier `/contracts/`
- **Ali** : Agents IA + 0G — dossier `/agents/`
- **Julie** : TEE/CRE + Dashboard — dossier `/orchestrator/` + `/dashboard/`

---

## Decouvertes critiques

1. **USDC sur Arc = 6 decimals** (pas 18 comme le README initial disait). Verifie on-chain via `cast call`.
2. **CCTP sur Arc = V2** avec 7 params : `depositForBurn(amount, domain, recipient, token, destinationCaller, maxFee, minFinalityThreshold)`
3. **Le precompile USDC d'Arc bloque `depositForBurn` depuis les contrats** — le vault transfere au TEE (EOA), qui appelle `depositForBurn` directement.
4. **Le MessageTransmitter V2** est `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` sur toutes les chains. L'ancien V1 (`0x7865fAfC...`) ne fonctionne PAS avec les messages V2 d'Arc.
5. **Aave USDC sur ETH Sepolia** a le supply cap sature — impossible de deposit. Le code est correct (revert Aave erreur 51), c'est une limitation testnet.

---

## Contrats deployes — ADRESSES FINALES

### Arc Testnet (Chain 5042002, Domain 26)
| Contrat | Adresse |
|---------|---------|
| **ArcMindVault** (arcMIND) | `0xE5cD5a7B782800e833dDe8648675e693CBe04ab6` |
| CCTPBridge | `0xf8a2d17B7ba46f9Fc0AD5e19947AdD65e4Efdc4E` |
| CCTPRouter | `0x857b2bD4Ae427162979Cf90C7A5Be4fA19a1507C` |
| AgentPaymaster | `0x8a2A55F62dF6f22e96525Da67c83F6B9caB85898` |

### ETH Sepolia (Chain 11155111, Domain 0)
| Contrat | Adresse |
|---------|---------|
| AaveStrategy | `0xD3aDc9f3d1fCcDE1fFD7dD3cef61d821947F1535` |
| CompoundStrategy | `0x857b2bD4Ae427162979Cf90C7A5Be4fA19a1507C` |
| MorphoStrategy | `0x8a2A55F62dF6f22e96525Da67c83F6B9caB85898` |
| CCTPBridge | `0xfa9fb9B6365f2b801cbCd2304BB1068114C8a6A8` |

### Base Sepolia (Chain 84532, Domain 6)
| Contrat | Adresse |
|---------|---------|
| AaveStrategy | `0x563240428394a42476B98d2eAE5F01A3FcAE80F4` |
| MorphoStrategy | `0xB990d43AF01f0309c51CcB94F036942686507172` |
| CCTPBridge | `0xD3aDc9f3d1fCcDE1fFD7dD3cef61d821947F1535` |

### ARB Sepolia (Chain 421614, Domain 3)
| Contrat | Adresse |
|---------|---------|
| AaveStrategy | `0x563240428394a42476B98d2eAE5F01A3FcAE80F4` |
| CCTPBridge | `0xB990d43AF01f0309c51CcB94F036942686507172` |

---

## Tests end-to-end realises

### Tests unitaires : 32/32 PASS
- 17 ArcMindVault (deposit, withdraw, buffer, TEE, share price, domains)
- 7 CCTPBridge (bridgeOut V2, bridgeIn, auth, rescue)
- 8 AgentPaymaster (register, fund, pay, budget, remove)

### Tests on-chain

| Test | Chain | Resultat |
|------|-------|----------|
| Vault deposit 1 USDC | Arc | **PASS** |
| Vault withdraw 0.5 USDC | Arc | **PASS** |
| allocateToChain 0.5 USDC → ETH | Arc | **PASS** |
| allocateToChain 0.5 USDC → ARB | Arc | **PASS** |
| recallFromChain 0.3 USDC | Arc | **PASS** |
| Buffer enforcement (>90%) | Arc | **PASS** (revert correct) |
| Paymaster registerAgent | Arc | **PASS** |
| Paymaster fundAgent 0.1 USDC | Arc | **PASS** |
| Paymaster pay 0.01 USDC | Arc | **PASS** (budget 100K → 90K) |
| CCTP depositForBurn Arc → Base | Arc | **PASS** (0.5 USDC brule) |
| CCTP attestation Circle API | — | **PASS** (status=complete) |
| CCTP receiveMessage Base | Base | **PASS** (0.5 USDC mint) |
| CompoundStrategy deposit 5 USDC | ETH Sep | **PASS** |
| CompoundStrategy withdraw 2 USDC | ETH Sep | **PASS** (balance 3M, USDC rendu) |
| CompoundStrategy estimatedYield | ETH Sep | **PASS** (16 bps) |
| AaveStrategy reads (yield, name) | ETH Sep | **PASS** (5759 bps) |
| AaveStrategy deposit | ETH Sep | BLOQUE (supply cap testnet sature) |

---

## Architecture

### Fichiers
```
ETHCC_DVB/
  .gitignore
  context.md
  ArcMind_README.md
  README.md
  docs/
    INTEGRATION_GUIDE.md
    TASK_ADRIAN_CONTRACTS.md
    TASK_Ali__AGENTS.md
    TASK_JULIE_TEE_DASHBOARD.md
  contracts/
    foundry.toml              # Solc 0.8.24, optimizer 200
    remappings.txt            # @openzeppelin/contracts/=lib/...
    .env.example              # Template (PAS de secrets)
    DEPLOY.md                 # Guide step-by-step
    src/
      vault/
        ArcMindVault.sol      # ERC-4626, arcMIND, buffer 10%, onlyTEE
      strategy/
        IStrategy.sol         # Interface : deposit/withdraw/balanceOf/estimatedYield/protocolName
        BaseStrategy.sol      # Abstract : Ownable + onlyAuthorized
        AaveStrategy.sol      # Aave V3 — couvre aussi ZeroLend, Yei, Radiant (meme interface)
        CompoundStrategy.sol  # Compound V3 (Comet)
        CompoundV2Strategy.sol# Compound V2 forks — Benqi, Sonne, Moonwell, Mendi, Venus
        MorphoStrategy.sol    # Morpho Blue — setMarketParams() post-deploy
        SiloStrategy.sol      # Silo V2
        YearnStrategy.sol     # Yearn V3 (ERC4626)
        PendleStrategy.sol    # Pendle V2 PT (mainnet only)
        FluidStrategy.sol     # Fluid fToken (mainnet only)
      cctp/
        CCTPBridge.sol        # CCTP V2 burn/mint (7 params)
        CCTPRouter.sol        # Routing helper
      nanopay/
        AgentPaymaster.sol    # Budgets USDC par agent
      interfaces/             # 10 fichiers (IAavePool, ICToken, IComet, IMorpho,
                              #   IPendle, IFluid, IYearnVault, ISilo,
                              #   ITokenMessenger, IMessageTransmitter)
    test/                     # 3 suites, 32 tests, 2 mocks
    script/                   # DeployVault, DeployStrategy, DeployCCTP, cctp-attestation.sh
    deployments/
      deployments.json        # Toutes les adresses deployees + protocoles
  shared/                     # Interface avec Ali et Julie
    types.ts                  # Types TS (AgentProposal, TEEResponse, etc.)
    constants.ts              # Adresses, USDC, domains, thresholds, vault address
    proposal.schema.json      # JSON Schema des proposals agent → TEE
    deployments.json          # Copie du deployments.json
```

### Architecture CCTP (point critique pour Julie)

Le precompile USDC d'Arc bloque `depositForBurn` depuis les contrats.
```
1. TEE appelle vault.allocateToChain(domain, recipient, amount)
2. Vault verifie buffer >= 10%
3. Vault transfere USDC au TEE via safeTransfer
4. Vault met a jour chainAllocations[domain] += amount
5. TEE (EOA) approuve TokenMessenger et appelle depositForBurn V2
6. Circle atteste le message (~1-5 min testnet)
7. N'importe qui appelle receiveMessage() sur le MessageTransmitter V2 de la chain destination
```

**MessageTransmitter V2 = `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`** sur toutes les chains.
**TokenMessenger V2 sur Arc = `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`**
**TokenMessenger V2 sur ETH/Base/ARB = `0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5`**

### Strategies : 10 contrats couvrent 30+ protocoles

| Strategy | Protocoles couverts | Interface |
|----------|---------------------|-----------|
| AaveStrategy | Aave, ZeroLend, Yei, Radiant | IAavePool (supply/withdraw) |
| CompoundStrategy | Compound V3 | IComet (supply/withdraw) |
| CompoundV2Strategy | Benqi, Sonne, Moonwell, Mendi, Venus | ICToken (mint/redeem) |
| MorphoStrategy | Morpho Blue | IMorpho (supply/withdraw + MarketParams) |
| SiloStrategy | Silo V2 | ISilo (deposit/withdraw) |
| YearnStrategy | Yearn V3 | IYearnVault (ERC4626) |
| PendleStrategy | Pendle V2 | IPendleRouter (swapExactTokenForPt) |
| FluidStrategy | Fluid | IFToken (ERC4626) |

---

## Ce qu'Ali et Julie doivent savoir

### Pour Ali (Agents)
- `shared/deployments.json` contient toutes les adresses
- Les ABIs sont dans `contracts/out/` apres `forge build`
- `IStrategy.sol` definit l'interface : `deposit`, `withdraw`, `balanceOf`, `estimatedYield`, `protocolName`
- Chaque strategy est deploye par chain/protocole — utiliser les adresses dans deployments.json
- Les agents appellent les strategies directement

### Pour Julie (TEE/Dashboard)
- Le vault est `0xE5cD5a7B782800e833dDe8648675e693CBe04ab6` sur Arc
- **Le TEE doit gerer les appels CCTP `depositForBurn` lui-meme** (pas via le vault)
- Apres `vault.allocateToChain()`, le USDC arrive dans le wallet TEE → le TEE bridge via CCTP V2
- Pour `bridgeIn`, appeler `receiveMessage` sur `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` (pas l'ancien V1)
- `shared/constants.ts` a l'adresse du vault + paymaster
- `shared/types.ts` a tous les types pour les proposals

### Configuration post-deploy (en attente)
- `vault.setTEE(julieAddress)` — quand Julie fournit l'adresse TEE
- `paymaster.registerAgent(aliAgent)` — quand Ali fournit les adresses agents
- `morphoStrategy.setMarketParams(...)` — quand un market USDC est decouvert sur Morpho testnet

---

## Wallet
- Adresse : `0x000865B64C6951344a9a55bD94396f9C813E6F08`
- TEE = deployer actuellement (a mettre a jour via `vault.setTEE()`)
