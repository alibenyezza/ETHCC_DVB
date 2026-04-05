# ALI — Agents AI + 0G

**Branche :** `develop_adrian`
**Dossier :** `/agents/`

---

## Vue d'ensemble

Tu es responsable de tous les agents autonomes. Chaque agent est un "fund manager AI" pour une chain specifique. Il observe les protocoles DeFi, raisonne sur les opportunites, propose des strategies au TEE, et execute les ordres approuves. Tu integres aussi 0G Compute (inference ML) et 0G Storage (memoire persistante).

---

## Structure de dossiers

```
agents/
  package.json
  tsconfig.json
  .env.example
  src/
    core/
      Agent.ts              # Classe de base agent
      AgentConfig.ts        # Configuration par chain
      Lifecycle.ts          # Boucle observe -> reason -> propose -> execute -> learn
    modules/
      observer/
        YieldObserver.ts    # Lecture on-chain des yields
        RiskObserver.ts     # Surveillance securite
        ProtocolReader.ts   # Multicall pour lire les protocoles
      reasoner/
        YieldModel.ts       # Prediction de yield
        DepositImpact.ts    # Modelisation compression post-depot
        RiskScorer.ts       # Score de securite par protocole
      proposer/
        ProposalBuilder.ts  # Construction du JSON proposal
        YieldCurve.ts       # Generation de la yield curve
        Encryptor.ts        # Chiffrement proposal pour TEE
      executor/
        TxBroadcaster.ts    # Broadcast des TX pre-signees
        RewardHarvester.ts  # Harvest et compound des rewards
        PositionManager.ts  # Gestion des positions actives
      learner/
        PerformanceTracker.ts # Compare predictions vs resultats
        ModelUpdater.ts       # Fine-tune via 0G
    integrations/
      ZeroG.ts              # Client 0G Compute + Storage
      Protocols.ts          # ABIs et adresses des protocoles DeFi
    chains/
      base.config.ts        # Config agent Base
      arbitrum.config.ts    # Config agent Arbitrum
      ethereum.config.ts    # Config agent Ethereum
    index.ts                # Entry point — lance les agents
  test/
    YieldObserver.test.ts
    DepositImpact.test.ts
    ProposalBuilder.test.ts
```

---

## Taches detaillees

### 1. Setup Projet (Jour 1)

```bash
cd agents/
npm init -y
npm install ethers@6 viem @0glabs/0g-ts-sdk dotenv
npm install -D typescript @types/node ts-node vitest
```

`tsconfig.json` :
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true
  },
  "include": ["src"]
}
```

`.env.example` :
```
# RPC
BASE_SEPOLIA_RPC=https://sepolia.base.org
ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ETH_SEPOLIA_RPC=https://rpc.sepolia.org

# Agent wallet (une cle privee par agent)
AGENT_BASE_PRIVATE_KEY=
AGENT_ARB_PRIVATE_KEY=
AGENT_ETH_PRIVATE_KEY=

# 0G
ZG_COMPUTE_ENDPOINT=
ZG_STORAGE_ENDPOINT=

# TEE endpoint (fourni par Julie)
TEE_PROPOSAL_ENDPOINT=
```

---

### 2. Classe Agent de Base (`Agent.ts`)

```typescript
// Agent.ts — squelette
export class Agent {
  readonly chain: string;
  readonly chainId: number;
  readonly rpc: string;
  private provider: ethers.JsonRpcProvider;
  private wallet: ethers.Wallet;
  private strategies: Map<string, StrategyInfo>;
  private currentCapital: number;
  private running: boolean = false;

  constructor(config: AgentConfig) {
    this.chain = config.chain;
    this.chainId = config.chainId;
    this.rpc = config.rpc;
    this.provider = new ethers.JsonRpcProvider(config.rpc);
    this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    this.strategies = new Map();
    this.currentCapital = 0;
  }

  // Boucle principale — tourne toutes les 30 secondes
  async run(): Promise<void> {
    this.running = true;
    while (this.running) {
      try {
        // 1. OBSERVE
        const marketData = await this.observe();

        // 2. REASON
        const analysis = await this.reason(marketData);

        // 3. PROPOSE
        const proposal = await this.propose(analysis);

        // 4. SEND to TEE (chiffre)
        await this.sendProposal(proposal);

        // 5. WAIT for TEE response
        const response = await this.waitForResponse();

        // 6. EXECUTE if approved
        if (response.approved) {
          await this.execute(response.txBlobs);
        }

        // 7. LEARN
        await this.learn();

      } catch (error) {
        console.error(`[${this.chain}] Cycle error:`, error);
      }

      await sleep(30_000); // 30 secondes
    }
  }

  stop(): void { this.running = false; }
}
```

---

### 3. Module Observer — Yield (`YieldObserver.ts`)

Lire les yields de chaque protocole via multicall.

```typescript
// YieldObserver.ts
export class YieldObserver {
  private provider: ethers.JsonRpcProvider;
  private protocols: ProtocolConfig[];

  // Retourne les yields actuels de tous les protocoles sur la chain
  async observe(): Promise<YieldData[]> {
    const results: YieldData[] = [];

    for (const protocol of this.protocols) {
      switch (protocol.type) {
        case "aave_v3":
          results.push(await this.readAaveV3(protocol));
          break;
        case "compound_v3":
          results.push(await this.readCompoundV3(protocol));
          break;
        case "morpho":
          results.push(await this.readMorpho(protocol));
          break;
      }
    }
    return results;
  }

  // Aave V3 : lire via PoolDataProvider
  private async readAaveV3(config: ProtocolConfig): Promise<YieldData> {
    // ABI : getReserveData(address asset) -> (... liquidityRate ...)
    // liquidityRate est en RAY (1e27), convertir en APY %
    // APY = ((1 + rate/SECONDS_PER_YEAR)^SECONDS_PER_YEAR - 1) * 100
    // Aussi lire : totalAToken (supply), totalVariableDebt, utilizationRate
  }

  // Compound V3 : lire via Comet
  private async readCompoundV3(config: ProtocolConfig): Promise<YieldData> {
    // ABI : getSupplyRate(utilization) -> rate per second
    // APY = (1 + ratePerSecond)^SECONDS_PER_YEAR - 1
    // Aussi : totalSupply, totalBorrow, utilization
  }

  // Morpho Blue : lire via Morpho contract
  private async readMorpho(config: ProtocolConfig): Promise<YieldData> {
    // Lire le market state : totalSupplyAssets, totalBorrowAssets
    // Calculer utilization et supply rate
  }
}

// Type de retour
interface YieldData {
  protocol: string;       // "aave_v3", "compound_v3", "morpho"
  poolId: string;         // Identifiant unique du pool
  chain: string;
  supplyRateAPY: number;  // En pourcentage (ex: 5.2)
  borrowRateAPY: number;
  utilization: number;    // 0-1
  totalSupply: number;    // En USDC
  totalBorrow: number;
  tvl: number;
  rewardAPY: number;      // Boost de rewards (COMP, MORPHO, etc.)
  effectiveAPY: number;   // supplyRateAPY + rewardAPY
  lastUpdated: number;    // timestamp
}
```

---

### 4. Module Observer — Risk (`RiskObserver.ts`)

```typescript
export class RiskObserver {

  async assess(protocol: string): Promise<RiskScore> {
    const checks = await Promise.all([
      this.checkTVLChange(protocol),     // Alert si TVL drop > 10% en 1h
      this.checkAdminActivity(protocol), // Transactions admin suspectes
      this.checkOracleHealth(),          // Chainlink feeds actifs
      this.checkSequencerStatus(),       // Pour L2s
      this.checkUSDCPeg(),              // Deviation du peg USDC
    ]);

    return {
      protocol,
      overallScore: this.computeScore(checks), // 0.0 - 1.0
      alerts: checks.filter(c => c.isCritical),
      details: checks
    };
  }

  private async checkTVLChange(protocol: string): Promise<RiskCheck> {
    // Comparer TVL actuel vs TVL il y a 1h (stocke en memoire / 0G Storage)
    // Si drop > 10% -> isCritical = true
    // Si drop > 20% -> EMERGENCY
  }

  private async checkUSDCPeg(): Promise<RiskCheck> {
    // Lire Chainlink USDC/USD price feed
    // Si deviation > 0.5% -> alert
    // Si deviation > 2% -> critical
  }
}

interface RiskScore {
  protocol: string;
  overallScore: number;  // 0.0 (danger) - 1.0 (safe)
  alerts: RiskAlert[];
  details: RiskCheck[];
}

interface RiskAlert {
  type: "tvl_drain" | "admin_activity" | "oracle_failure" | "depeg" | "sequencer_down";
  severity: "warning" | "critical" | "emergency";
  message: string;
  timestamp: number;
}
```

---

### 5. Module Reasoner — Deposit Impact (`DepositImpact.ts`)

C'est un des differenciateurs cles d'ArcMind. Modeliser comment notre depot compresse le yield.

```typescript
export class DepositImpact {

  // Calcule le yield REEL apres notre depot (pas le yield affiche)
  calculatePostDepositYield(
    currentSupply: number,
    currentBorrow: number,
    depositAmount: number,
    rateModel: RateModelParams
  ): number {
    // Nouvelle utilization apres notre depot
    const newSupply = currentSupply + depositAmount;
    const newUtilization = currentBorrow / newSupply;

    // Nouveau supply rate selon le modele de taux
    // La plupart des protocoles utilisent un modele lineaire par morceaux :
    //   si utilization < kink : rate = base + utilization * slope1
    //   si utilization >= kink : rate = base + kink * slope1 + (utilization - kink) * slope2
    const newRate = this.computeRate(newUtilization, rateModel);

    return newRate;
  }

  // Genere la yield curve : combien de capital -> quel yield
  generateYieldCurve(
    currentSupply: number,
    currentBorrow: number,
    rateModel: RateModelParams,
    protocolName: string
  ): AllocationCurvePoint[] {
    const amounts = [10000, 20000, 35000, 50000, 75000, 100000];
    return amounts.map(capital => ({
      capital,
      blendedYield: this.calculatePostDepositYield(
        currentSupply, currentBorrow, capital, rateModel
      )
    }));
  }

  // Calcule le split optimal entre N protocoles
  // pour equaliser le yield marginal
  computeOptimalSplit(
    pools: PoolData[],
    totalCapital: number
  ): AllocationSplit[] {
    // Algorithme : iterer pour trouver le point ou
    // le yield marginal de chaque pool est egal
    // C'est un probleme d'optimisation convexe simple
    // Approche : bisection ou gradient descent
  }
}
```

---

### 6. Module Proposer — Proposal Builder (`ProposalBuilder.ts`)

Construit le JSON de proposal dans le format exact attendu par le TEE (defini dans `/shared/proposal.schema.json`).

```typescript
export class ProposalBuilder {

  build(
    chain: string,
    yieldData: YieldData[],
    riskScores: RiskScore[],
    optimalSplit: AllocationSplit[],
    yieldCurve: AllocationCurvePoint[],
    currentCapital: number,
    performanceHistory: PerformanceHistory
  ): AgentProposal {
    return {
      agent: chain.toUpperCase(),
      timestamp: Math.floor(Date.now() / 1000),

      strategy: {
        positions: optimalSplit.map(split => ({
          protocol: split.protocol,
          pool_id: split.poolId,
          action: "deposit",
          amount_pct: split.percentage,
          raw_yield: split.rawYield,
          post_deposit_yield: split.postDepositYield,
          reasoning: split.reasoning
        })),
        harvest: this.buildHarvestPlan(yieldData)
      },

      allocation_curve: yieldCurve,

      safety: {
        overall_score: this.computeOverallSafety(riskScores),
        protocol_scores: Object.fromEntries(
          riskScores.map(r => [r.protocol, r.overallScore])
        ),
        alerts: riskScores.flatMap(r => r.alerts),
        chain_health: {
          sequencer: "ok", // ou le statut reel
          gas_gwei: 0,     // lire le gas actuel
          recent_reorgs: 0
        }
      },

      current_capital: currentCapital,
      optimal_capital: this.computeOptimalCapital(yieldCurve),
      min_useful_capital: 5000,
      confidence: performanceHistory.recentAccuracy,
      last_7d_actual_yield: performanceHistory.last7dYield,
      prediction_accuracy_30d: performanceHistory.accuracy30d
    };
  }
}

// Ce type DOIT correspondre exactement au schema dans /shared/proposal.schema.json
// Julie (TEE) va deserialiser ce meme format
```

---

### 7. Module Executor (`TxBroadcaster.ts`)

Recoit les TX pre-signees du TEE et les broadcast avec un delai aleatoire.

```typescript
export class TxBroadcaster {
  private provider: ethers.JsonRpcProvider;

  async execute(txBlobs: SignedTxBlob[]): Promise<string[]> {
    const receipts: string[] = [];

    for (const blob of txBlobs) {
      // Delai aleatoire 2-15 minutes (anti-correlation)
      const delay = randomInt(2 * 60 * 1000, 15 * 60 * 1000);
      await sleep(delay);

      // Broadcast la TX pre-signee
      const tx = await this.provider.broadcastTransaction(blob.signedTx);
      const receipt = await tx.wait();
      receipts.push(receipt.hash);

      console.log(`[${this.chain}] TX executed: ${receipt.hash}`);
    }
    return receipts;
  }
}

// Pour le MVP/demo : le delai aleatoire peut etre reduit a 5-30 secondes
```

---

### 8. Integration 0G (`ZeroG.ts`)

```typescript
import { ZGComputeNetworkBroker } from "@0glabs/0g-ts-sdk";

export class ZeroGClient {

  // --- 0G Compute : inference ML ---
  async predict(input: YieldData[]): Promise<YieldPrediction> {
    // Appeler le modele de yield prediction sur 0G Compute
    // API compatible OpenAI
    const response = await fetch(this.computeEndpoint + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        model: "qwen-0.5b-lora-yield",  // Modele fine-tune
        messages: [{
          role: "user",
          content: JSON.stringify({
            task: "yield_prediction",
            data: input,
            horizon: "24h"
          })
        }]
      })
    });
    return response.json();
  }

  // --- 0G Storage : memoire persistante ---
  async store(key: string, data: any): Promise<void> {
    // Stocker yield histories, performance logs, etc.
    // Utiliser 0G Storage SDK
  }

  async retrieve(key: string): Promise<any> {
    // Recuperer les historiques pour le learning
  }
}
```

---

### 9. Config par Chain

```typescript
// chains/base.config.ts
export const BASE_CONFIG: AgentConfig = {
  chain: "base",
  chainId: 84532,
  rpc: process.env.BASE_SEPOLIA_RPC!,
  privateKey: process.env.AGENT_BASE_PRIVATE_KEY!,
  protocols: [
    {
      type: "aave_v3",
      name: "aave",
      pool: "0x...",          // <- adresse du AaveStrategy d'Ali
      dataProvider: "0x...",
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    },
    {
      type: "compound_v3",
      name: "compound",
      comet: "0x...",         // <- adresse du CompoundStrategy d'Ali
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    },
    {
      type: "morpho",
      name: "morpho",
      morpho: "0x...",        // <- adresse du MorphoStrategy d'Ali
      usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e"
    }
  ]
};

// Idem pour arbitrum.config.ts, ethereum.config.ts
```

---

### 10. Entry Point (`index.ts`)

```typescript
import { Agent } from "./core/Agent";
import { BASE_CONFIG } from "./chains/base.config";
import { ARB_CONFIG } from "./chains/arbitrum.config";
import { ETH_CONFIG } from "./chains/ethereum.config";

async function main() {
  const agents = [
    new Agent(BASE_CONFIG),
    new Agent(ARB_CONFIG),
    new Agent(ETH_CONFIG),
  ];

  console.log(`Starting ${agents.length} agents...`);

  // Lancer tous les agents en parallele
  await Promise.all(agents.map(agent => agent.run()));
}

main().catch(console.error);
```

---

## Ce que tu fournis aux autres

| A qui | Quoi | Pourquoi |
|-------|------|----------|
| Julie (TEE) | Format de proposal (conforme a `shared/proposal.schema.json`) | Pour que le TEE sache deserialiser et valider |
| Julie (TEE) | Endpoint ou les agents ecoutent les reponses TEE | Pour la boucle de communication |
| Julie (Dashboard) | Endpoint API ou state des agents (yield courant, strategy, safety) | Pour afficher sur le dashboard |

---

## Ce dont tu as besoin des autres

| De qui | Quoi | Pourquoi |
|--------|------|----------|
| Ali (Contracts) | `deployments.json` + ABIs | Pour savoir quels contracts appeler sur chaque chain |
| Ali (Contracts) | Interface `IStrategy` | Pour savoir les fonctions deposit/withdraw/balanceOf |
| Julie (TEE) | Endpoint TEE pour envoyer les proposals | Pour la communication agent -> TEE |
| Julie (TEE) | Format des TX blobs retournes | Pour savoir comment broadcast les reponses |

---

## Ordre de dev recommande

```
Jour 1 : Setup projet + Agent.ts + YieldObserver (lire les yields on-chain)
Jour 2 : DepositImpact + RiskObserver + RiskScorer
Jour 3 : ProposalBuilder (generer le JSON complet) + YieldCurve
Jour 4 : TxBroadcaster + RewardHarvester + integration 0G basique
Jour 5 : Config multi-chain + tests + support integration avec les autres
```

---

## Checklist finale

- [ ] Agent de base fonctionne (boucle 30s)
- [ ] YieldObserver lit les yields de Aave/Compound/Morpho sur au moins 2 chains
- [ ] DepositImpact modelise correctement la compression de yield
- [ ] RiskObserver detecte les changements de TVL
- [ ] ProposalBuilder genere un JSON conforme au schema partage
- [ ] TxBroadcaster peut broadcaster des TX pre-signees
- [ ] Integration 0G Compute (au moins une inference)
- [ ] Integration 0G Storage (stocker/lire les historiques)
- [ ] 3 agents configures (Base, Arb, ETH)
- [ ] Tests passent
