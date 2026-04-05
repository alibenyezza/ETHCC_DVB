# Guide d'Integration — Comment tout assembler

Ce document explique comment les 3 parties se connectent et comment merger le tout.

---

## Architecture des branches

```
main
  |
  +-- develop_ali      -> /contracts/   + /shared/
  +-- develop_adrian   -> /agents/      + /shared/
  +-- develop_julie    -> /orchestrator/ + /dashboard/ + /shared/
  |
  +-- develop          -> branche d'integration (merge des 3)
```

**Regle d'or :** Chacun ne touche QUE son dossier + `/shared/`. Pas de conflits au merge.

---

## Fichiers partages (`/shared/`)

Ces fichiers sont le contrat d'interface entre les 3 parties. Ils doivent etre definis ENSEMBLE au debut et ne changent qu'apres discussion.

### 1. `shared/proposal.schema.json`

Le format exact d'une proposal agent -> TEE. Adrian genere ce format, Julie le deserialise.

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "AgentProposal",
  "type": "object",
  "required": ["agent", "timestamp", "strategy", "allocation_curve", "safety", "current_capital"],
  "properties": {
    "agent": {
      "type": "string",
      "enum": ["ETH", "BASE", "ARB", "OP", "POLY"]
    },
    "timestamp": { "type": "integer" },
    "strategy": {
      "type": "object",
      "properties": {
        "positions": {
          "type": "array",
          "items": {
            "type": "object",
            "required": ["protocol", "pool_id", "action", "amount_pct", "raw_yield", "post_deposit_yield"],
            "properties": {
              "protocol": { "type": "string" },
              "pool_id": { "type": "string" },
              "action": { "type": "string", "enum": ["deposit", "withdraw", "harvest"] },
              "amount_pct": { "type": "number", "minimum": 0, "maximum": 100 },
              "raw_yield": { "type": "number" },
              "post_deposit_yield": { "type": "number" },
              "incentive_boost": { "type": "number" },
              "effective_yield": { "type": "number" },
              "reasoning": { "type": "string" }
            }
          }
        },
        "harvest": {
          "type": "object",
          "properties": {
            "pending_rewards_usd": { "type": "number" },
            "harvest_profitable": { "type": "boolean" },
            "optimal_harvest_time": { "type": "string" },
            "reasoning": { "type": "string" }
          }
        }
      }
    },
    "allocation_curve": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["capital", "blended_yield"],
        "properties": {
          "capital": { "type": "number" },
          "blended_yield": { "type": "number" }
        }
      }
    },
    "safety": {
      "type": "object",
      "required": ["overall_score", "protocol_scores", "alerts", "chain_health"],
      "properties": {
        "overall_score": { "type": "number", "minimum": 0, "maximum": 1 },
        "protocol_scores": {
          "type": "object",
          "additionalProperties": { "type": "number" }
        },
        "alerts": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "type": { "type": "string" },
              "severity": { "type": "string", "enum": ["warning", "critical", "emergency"] },
              "message": { "type": "string" },
              "timestamp": { "type": "integer" }
            }
          }
        },
        "chain_health": {
          "type": "object",
          "properties": {
            "sequencer": { "type": "string" },
            "gas_gwei": { "type": "number" },
            "recent_reorgs": { "type": "integer" }
          }
        }
      }
    },
    "current_capital": { "type": "number" },
    "optimal_capital": { "type": "number" },
    "min_useful_capital": { "type": "number" },
    "confidence": { "type": "number", "minimum": 0, "maximum": 1 },
    "last_7d_actual_yield": { "type": "number" },
    "prediction_accuracy_30d": { "type": "number", "minimum": 0, "maximum": 1 }
  }
}
```

### 2. `shared/deployments.json`

Genere par Ali apres deploy. Utilise par Adrian et Julie. Structure definie dans TASK_ALI.

### 3. `shared/types.ts`

Types TypeScript partages entre agents et orchestrator :

```typescript
// shared/types.ts

// === PROPOSAL (Agent -> TEE) ===

export interface AgentProposal {
  agent: ChainName;
  timestamp: number;
  strategy: Strategy;
  allocation_curve: AllocationCurvePoint[];
  safety: SafetyAssessment;
  current_capital: number;
  optimal_capital: number;
  min_useful_capital: number;
  confidence: number;
  last_7d_actual_yield: number;
  prediction_accuracy_30d: number;
}

export type ChainName = "ETH" | "BASE" | "ARB" | "OP" | "POLY";

export interface Strategy {
  positions: Position[];
  harvest: HarvestPlan;
}

export interface Position {
  protocol: string;
  pool_id: string;
  action: "deposit" | "withdraw" | "harvest";
  amount_pct: number;
  raw_yield: number;
  post_deposit_yield: number;
  incentive_boost?: number;
  effective_yield?: number;
  reasoning: string;
}

export interface HarvestPlan {
  pending_rewards_usd: number;
  harvest_profitable: boolean;
  optimal_harvest_time: string;
  reasoning: string;
}

export interface AllocationCurvePoint {
  capital: number;
  blended_yield: number;
}

export interface SafetyAssessment {
  overall_score: number;
  protocol_scores: Record<string, number>;
  alerts: RiskAlert[];
  chain_health: ChainHealth;
}

export interface RiskAlert {
  type: "tvl_drain" | "admin_activity" | "oracle_failure" | "depeg" | "sequencer_down";
  severity: "warning" | "critical" | "emergency";
  message: string;
  timestamp: number;
}

export interface ChainHealth {
  sequencer: string;
  gas_gwei: number;
  recent_reorgs: number;
}

// === TEE RESPONSE (TEE -> Agent) ===

export interface TEEResponse {
  agent: ChainName;
  approved: boolean;
  txBlobs: SignedTxBlob[];       // TX pre-signees a executer
  newBudget?: number;            // Si reallocation : nouveau budget
  message: string;               // Uniforme en taille
}

export interface SignedTxBlob {
  chain: ChainName;
  signedTx: string;              // Hex encoded
  type: "strategy_execution" | "cctp_bridge" | "harvest" | "noop";
}

// === REALLOCATION ===

export interface ReallocationPlan {
  allocations: ChainAllocation[];
  movements: CCTPMovement[];
  totalCapital: number;
  buffer: number;
  timestamp: number;
}

export interface ChainAllocation {
  chain: ChainName;
  capital: number;
  targetYield: number;
  safetyScore: number;
}

export interface CCTPMovement {
  from: ChainName | "arc";
  to: ChainName | "arc";
  amount: number;
  domainFrom: number;
  domainTo: number;
  cctpCost: number;
  projected24hGain: number;
}

// === CONSTANTS ===

export const DOMAIN_IDS: Record<string, number> = {
  arc: 26,
  ETH: 0,
  BASE: 6,
  ARB: 3,
  OP: 2,    // verifier
  POLY: 7,  // verifier
};

export const CHAIN_IDS: Record<string, number> = {
  arc: 5042002,
  ETH: 11155111,    // Sepolia
  BASE: 84532,      // Base Sepolia
  ARB: 421614,      // Arb Sepolia
};
```

### 4. `shared/constants.ts`

```typescript
// shared/constants.ts

// Adresses USDC par chain (testnet)
export const USDC_ADDRESSES: Record<string, string> = {
  arc: "0x3600000000000000000000000000000000000000",       // 18 decimals!
  ETH: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",     // 6 decimals
  BASE: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",     // 6 decimals
  ARB: "0x...",                                             // a verifier
};

// Decimals USDC par chain
export const USDC_DECIMALS: Record<string, number> = {
  arc: 18,    // ATTENTION : 18 sur Arc, 6 partout ailleurs
  ETH: 6,
  BASE: 6,
  ARB: 6,
};

// CCTP TokenMessenger par chain (testnet)
export const CCTP_TOKEN_MESSENGER: Record<string, string> = {
  ETH: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  BASE: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  ARB: "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5",
  // Arc : verifier docs Circle
};

// Security thresholds
export const SAFETY_THRESHOLD = 0.7;
export const MAX_PROTOCOL_PCT = 40;
export const MAX_CHAIN_PCT = 50;
export const BUFFER_PCT = 10;
export const MIN_REALLOC_GAIN_MULTIPLIER = 2;
export const REALLOC_INTERVAL_HOURS = 6;
export const AGENT_CYCLE_SECONDS = 30;
```

---

## Processus de merge

### Etape 1 : Chacun code sur sa branche (Jours 1-4)

```
Ali     -> develop_ali     : /contracts/ + /shared/deployments.json
Adrian  -> develop_adrian  : /agents/
Julie   -> develop_julie   : /orchestrator/ + /dashboard/
```

Les fichiers `/shared/types.ts`, `/shared/constants.ts`, `/shared/proposal.schema.json` sont crees au Jour 1 par une personne et cherry-picked par les deux autres.

### Etape 2 : Premier sync (Jour 2-3)

Ali deploie les contracts et genere `deployments.json`.
Ali push sur sa branche, les autres font :

```bash
git fetch origin
git checkout develop_adrian
git checkout origin/develop_ali -- shared/deployments.json contracts/out/  # ABIs
```

### Etape 3 : Integration (Jour 4-5)

Merger tout dans `develop` :

```bash
# Personne qui merge (un des trois)
git checkout develop
git merge origin/develop_ali      # Pas de conflit : que /contracts/
git merge origin/develop_adrian   # Pas de conflit : que /agents/
git merge origin/develop_julie    # Pas de conflit : que /orchestrator/ + /dashboard/
```

Normalement ZERO conflit car chacun est dans son dossier.

### Etape 4 : Tests d'integration (Jour 5)

Tester le flux complet :

```
1. Deployer les contracts (Ali)                  -> adresses dans deployments.json
2. Lancer les agents (Adrian)                    -> lisent les yields, generent proposals
3. Lancer l'orchestrator (Julie)                 -> recoit proposals, valide, signe TX
4. Les agents recoivent les TX et les executent   -> capital deploye
5. Le dashboard affiche tout                      -> user voit APY

Test CCTP :
6. Le TEE decide une reallocation                 -> signe les TX CCTP
7. Capital bouge de ETH vers BASE via Arc          -> visible sur les explorers
8. Agent-BASE recoit plus de capital               -> ajuste ses positions
```

---

## Points d'attention critiques

### 1. USDC Decimals
**Arc = 18 decimals. Toutes les autres chains = 6 decimals.**
Quand du USDC transite via CCTP entre Arc et une autre chain, il faut convertir :
- Arc -> Base : diviser par 10^12
- Base -> Arc : multiplier par 10^12

### 2. Communication Agent <-> TEE
Pour le MVP, deux options :
- **Option A (simple) :** API REST. Les agents POST leurs proposals vers un endpoint de Julie. Le TEE repond.
- **Option B (CRE) :** Le CRE Workflow fetch les proposals via Confidential HTTP.

Commencer par Option A pour que ca marche, puis migrer vers Option B si le temps le permet.

### 3. Wallets
Il faut des wallets separes :
- **1 wallet TEE** (Julie le genere, donne l'adresse a Ali pour le onlyTEE)
- **1 wallet par agent** (Adrian les genere, donne les adresses a Ali pour le whitelist)
- **1 wallet deployer** (Ali, pour deployer les contracts)

Chaque wallet a besoin de faucet ETH/USDC sur les testnets concernes.

### 4. Faucets

| Chain | Faucet |
|-------|--------|
| Arc Testnet | `https://faucet.circle.com` |
| Ethereum Sepolia | `https://sepoliafaucet.com` |
| Base Sepolia | `https://faucet.circle.com` (pour USDC) + bridge depuis Sepolia |
| Arbitrum Sepolia | `https://faucet.arbitrum.io` |

### 5. Ordre de communication

```
Jour 1 matin :
  - Les 3 se mettent d'accord sur /shared/ (types, constants, schema)
  - Ali commence les contracts
  - Adrian commence l'agent template
  - Julie commence le ProposalValidator

Jour 2-3 :
  - Ali deploie -> partage deployments.json + ABIs
  - Adrian branche les agents sur les vrais contracts
  - Julie branche le TEE sur le format de proposal reel

Jour 4 :
  - Chacun push sa branche finale
  - Merge dans develop
  - Test d'integration ensemble

Jour 5 :
  - Fix bugs d'integration
  - Polish dashboard
  - Preparer la demo
```

---

## Structure finale du repo apres merge

```
ETHCC_DVB/
  shared/
    types.ts
    constants.ts
    proposal.schema.json
    deployments.json         # Genere par Ali
  contracts/                 # Ali
    foundry.toml
    src/
    test/
    script/
    out/                     # ABIs compiles
  agents/                    # Adrian
    package.json
    src/
    test/
  orchestrator/              # Julie
    package.json
    src/
  dashboard/                 # Julie
    package.json
    src/
  docs/                      # Ce dossier
    TASK_ALI_CONTRACTS.md
    TASK_ADRIAN_AGENTS.md
    TASK_JULIE_TEE_DASHBOARD.md
    INTEGRATION_GUIDE.md
  ArcMind_README.md
  README.md
```

---

## Checklist d'integration finale

- [ ] `/shared/` est identique sur les 3 branches
- [ ] `deployments.json` contient toutes les adresses
- [ ] Les agents envoient des proposals conformes au schema
- [ ] Le TEE recoit et valide les proposals
- [ ] Le TEE signe des TX que les agents peuvent broadcaster
- [ ] Le dashboard lit le vault et affiche les stats
- [ ] Au moins 1 deposit + 1 reallocation CCTP fonctionne end-to-end
- [ ] Les attestations sont ancrees sur 0G Chain
- [ ] La demo tourne sans crash pendant 5 minutes
