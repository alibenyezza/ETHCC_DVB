# JULIE — TEE/CRE Orchestration + Dashboard

**Branche :** `develop_julie`
**Dossier :** `/orchestrator/` + `/dashboard/`

---

## Vue d'ensemble

Tu es responsable du "cerveau central" (TEE + CRE Workflow) et du dashboard utilisateur. Le TEE recoit les proposals des agents, les valide, decide des reallocations cross-chain, et signe les transactions. Le dashboard affiche tout en temps reel.

---

## Structure de dossiers

```
orchestrator/
  package.json
  tsconfig.json
  .env.example
  src/
    cre/
      workflow.ts           # CRE Workflow principal (compile en WASM)
      triggers/
        CronTrigger.ts      # Trigger toutes les 30s
        EmergencyTrigger.ts # Trigger sur alerte critique
    tee/
      TEECore.ts            # Logique principale du TEE
      ProposalValidator.ts  # Job 1 : validation des proposals
      Reallocator.ts        # Job 2 : reallocation cross-chain
      SecurityRules.ts      # Regles de securite
      TxSigner.ts           # Signature des TX dans l'enclave
    cctp/
      CCTPExecutor.ts       # Execution des mouvements CCTP
      RouteCalculator.ts    # Calcul des routes optimales
    attestation/
      Attestor.ts           # Generation et ancrage attestations sur 0G Chain
    types/
      Proposal.ts           # Types des proposals agents (miroir du schema partage)
      Decision.ts           # Types des decisions TEE
  test/
    ProposalValidator.test.ts
    Reallocator.test.ts
    SecurityRules.test.ts

dashboard/
  package.json
  next.config.js
  .env.example
  src/
    app/
      page.tsx              # Page principale
      layout.tsx
    components/
      vault/
        DepositForm.tsx     # Deposit USDC
        WithdrawForm.tsx    # Withdraw USDC
        VaultStats.tsx      # TVL, APY, share price
      agents/
        AgentCard.tsx       # Vue d'un agent (chain, yield, safety)
        AgentGrid.tsx       # Grille de tous les agents
        YieldCurveChart.tsx # Graphe yield curve
      tee/
        TEEDecisions.tsx    # Historique decisions TEE
        ReallocationFlow.tsx# Animation des flux cross-chain
        AttestationLog.tsx  # Trail d'attestations
      common/
        ConnectWallet.tsx   # RainbowKit / wagmi
        Header.tsx
    hooks/
      useVault.ts           # Lire le vault (balance, APY, shares)
      useAgents.ts          # Lire l'etat des agents
      useTEE.ts             # Lire les decisions TEE
    lib/
      contracts.ts          # ABIs + adresses (depuis deployments.json)
      wagmi.ts              # Config wagmi/viem
```

---

## PARTIE 1 : Orchestrator (TEE + CRE)

### 1. Setup Projet (Jour 1)

```bash
cd orchestrator/
npm init -y
npm install ethers@6 viem @chainlink/cre-sdk dotenv
npm install -D typescript @types/node ts-node vitest
```

`.env.example` :
```
# Chainlink CRE
CRE_NODE_URL=
CRE_API_KEY=

# TEE enclave config
TEE_PRIVATE_KEY=          # Cle de signature du TEE (generee dans l'enclave)

# RPC (pour signer les TX cross-chain)
ARC_RPC=https://rpc.testnet.arc.network
BASE_SEPOLIA_RPC=https://sepolia.base.org
ARB_SEPOLIA_RPC=https://sepolia-rollup.arbitrum.io/rpc
ETH_SEPOLIA_RPC=https://rpc.sepolia.org

# 0G Chain (pour attestations)
ZG_CHAIN_RPC=
```

---

### 2. CRE Workflow (`workflow.ts`)

Le workflow orchestre tout le cycle. Il est compile en WASM et tourne sur le DON Chainlink.

```typescript
// workflow.ts — squelette CRE Workflow
import { Workflow, CronTrigger, EventTrigger } from "@chainlink/cre-sdk";

export const arcMindWorkflow = new Workflow({
  name: "arcmind-swarm-cycle",
  triggers: [
    // Trigger 1 : toutes les 30 secondes
    new CronTrigger({ schedule: "*/30 * * * * *" }),

    // Trigger 2 : sur alerte critique d'un agent
    new EventTrigger({
      event: "agent.critical_alert",
      handler: handleEmergency
    })
  ],

  // Cycle normal (30s)
  async execute(context) {
    // 1. Collecter les proposals de tous les agents (Confidential HTTP)
    const proposals = await context.confidentialFetch(
      AGENT_ENDPOINTS.map(endpoint => ({
        url: `${endpoint}/proposal`,
        method: "GET",
        // Confidential HTTP : URLs, headers, responses sont chiffres
      }))
    );

    // 2. Valider chaque proposal dans le TEE
    const decisions = await teeCore.validateProposals(proposals);

    // 3. Verifier si c'est l'heure d'une reallocation (toutes les 6-7h)
    if (teeCore.shouldReallocate()) {
      const reallocation = await teeCore.computeReallocation(proposals);
      decisions.reallocation = reallocation;
    }

    // 4. Signer les TX dans l'enclave
    const signedTxs = await teeCore.signTransactions(decisions);

    // 5. Distribuer les reponses (messages uniformes a TOUS les agents)
    await context.distribute(signedTxs);

    // 6. Generer et ancrer l'attestation sur 0G Chain
    await attestor.anchor(decisions);
  }
});

// Handler d'urgence
async function handleEmergency(alert) {
  // Bypass le cycle de 30s
  // Withdrawal immediat de la chain en alerte
  // < 10 secondes de temps de reponse
}
```

---

### 3. TEE Job 1 — Validation des Proposals (`ProposalValidator.ts`)

```typescript
export class ProposalValidator {
  private securityRules: SecurityRules;

  // Valide une proposal d'agent
  validate(proposal: AgentProposal): ValidationResult {
    const checks: Check[] = [];

    // 1. Verifier la signature de l'agent
    checks.push(this.verifySignature(proposal));

    // 2. Safety score > 0.7
    checks.push(this.checkSafetyThreshold(proposal));
    // Regle : si safety.overall_score < 0.7 -> REJECT entire proposal

    // 3. Alerts critiques
    checks.push(this.checkCriticalAlerts(proposal));
    // Regle : si un alert critique -> REJECT + trigger emergency pour ce protocole
    //         sur TOUTES les chains (pas juste celle de l'agent)

    // 4. Diversification locale
    checks.push(this.checkDiversification(proposal));
    // Regle : aucun protocole > 40% du capital local de l'agent

    // 5. Coherence des yields
    checks.push(this.checkYieldCoherence(proposal));
    // Regle : post_deposit_yield doit etre < raw_yield (sinon l'agent ment)

    const approved = checks.every(c => c.passed);

    return {
      agent: proposal.agent,
      approved,
      checks,
      // Si approve : generer les TX a signer
      // Si rejete : generer un message "do nothing" de meme taille (decoy)
    };
  }
}

// Regles de securite completes
export class SecurityRules {
  static readonly SAFETY_THRESHOLD = 0.7;
  static readonly MAX_PROTOCOL_PCT = 40;        // % max par protocole local
  static readonly MAX_CHAIN_PCT = 50;            // % max par chain du total
  static readonly BUFFER_PCT = 10;               // % minimum sur Arc
  static readonly MIN_REALLOC_GAIN_MULTIPLIER = 2; // gain > 2x cout CCTP
}
```

---

### 4. TEE Job 2 — Reallocation Cross-Chain (`Reallocator.ts`)

```typescript
export class Reallocator {
  private lastReallocation: number = 0;
  private readonly REALLOC_INTERVAL = 6 * 60 * 60 * 1000; // 6 heures

  shouldReallocate(): boolean {
    return Date.now() - this.lastReallocation > this.REALLOC_INTERVAL;
  }

  // Calcule la reallocation optimale
  computeReallocation(proposals: AgentProposal[]): ReallocationPlan {
    // 1. Extraire les yield curves de chaque agent
    const curves = proposals.map(p => ({
      chain: p.agent,
      curve: p.allocation_curve,
      safety: p.safety.overall_score,
      trackRecord: p.prediction_accuracy_30d,
      currentCapital: p.current_capital
    }));

    // 2. Calculer le total de capital disponible
    const totalCapital = curves.reduce((sum, c) => sum + c.currentCapital, 0);
    const buffer = totalCapital * SecurityRules.BUFFER_PCT / 100;
    const allocatable = totalCapital - buffer;

    // 3. Optimisation : equaliser le yield marginal
    //    Pour chaque chain, la yield curve donne f(capital) -> yield
    //    On cherche les allocations a1, a2, ... aN telles que :
    //    f1'(a1) = f2'(a2) = ... = fN'(aN) et sum(ai) = allocatable
    //
    //    Algorithme :
    //    - Interpoler les yield curves
    //    - Calculer les derivees (yield marginal)
    //    - Binary search sur le yield marginal cible lambda
    //    - Pour chaque lambda, trouver le capital ou f'(capital) = lambda
    //    - Ajuster lambda jusqu'a ce que sum(capitals) = allocatable
    const allocations = this.marginalYieldEqualization(curves, allocatable);

    // 4. Appliquer les contraintes
    //    - Max 50% sur une seule chain
    //    - Ponderer par safety score (chains risquees = moins de capital)
    //    - Ponderer par track record (agents imprecis = discount)
    const constrained = this.applyConstraints(allocations, curves);

    // 5. Calculer les mouvements CCTP necessaires
    const movements = this.computeMovements(curves, constrained);

    // 6. Filtrer : ne garder que les mouvements ou gain > 2x cout CCTP
    const profitable = movements.filter(m =>
      m.projected24hGain > 2 * m.cctpCost
    );

    this.lastReallocation = Date.now();

    return {
      allocations: constrained,
      movements: profitable,
      totalCapital,
      buffer,
      timestamp: Date.now()
    };
  }

  // Calcule les routes CCTP
  // Tout transite par Arc : source -> Arc -> destination
  private computeMovements(
    current: ChainAllocation[],
    target: ChainAllocation[]
  ): CCTPMovement[] {
    const movements: CCTPMovement[] = [];

    for (let i = 0; i < current.length; i++) {
      const diff = target[i].capital - current[i].capital;
      if (diff < 0) {
        // Cette chain doit envoyer du capital
        movements.push({
          from: current[i].chain,
          to: "arc",  // Toujours via Arc
          amount: Math.abs(diff),
          domainFrom: DOMAIN_IDS[current[i].chain],
          domainTo: 26, // Arc
          cctpCost: this.estimateCCTPCost(current[i].chain),
          projected24hGain: this.estimateGain(current[i], target[i])
        });
      }
    }

    for (let i = 0; i < target.length; i++) {
      const diff = target[i].capital - current[i].capital;
      if (diff > 0) {
        // Cette chain doit recevoir du capital
        movements.push({
          from: "arc",
          to: target[i].chain,
          amount: diff,
          domainFrom: 26, // Arc
          domainTo: DOMAIN_IDS[target[i].chain],
          cctpCost: this.estimateCCTPCost(target[i].chain),
          projected24hGain: this.estimateGain(current[i], target[i])
        });
      }
    }

    return movements;
  }
}
```

---

### 5. Signature des TX (`TxSigner.ts`)

```typescript
export class TxSigner {
  // La cle privee existe UNIQUEMENT dans l'enclave TEE
  private enclaveSigner: ethers.Wallet;

  // Signe les TX d'execution (pour les agents)
  async signStrategyTx(
    chain: string,
    strategyAddress: string,
    calldata: string
  ): Promise<SignedTxBlob> {
    const provider = new ethers.JsonRpcProvider(RPC_URLS[chain]);
    const tx = {
      to: strategyAddress,
      data: calldata,
      chainId: CHAIN_IDS[chain],
      gasLimit: 500000,
      // ... gas price, nonce, etc.
    };
    const signedTx = await this.enclaveSigner.signTransaction(tx);
    return { chain, signedTx, type: "strategy_execution" };
  }

  // Signe les TX CCTP (pour les reallocations)
  async signCCTPTx(movement: CCTPMovement): Promise<SignedTxBlob> {
    // Signer le depositForBurn sur la chain source
    // Le message CCTP sera ensuite relay par le MessageTransmitter
  }

  // Messages uniformes : meme taille pour TOUS les agents
  // Un agent rejete recoit un blob de meme taille qu'un agent approuve
  // Impossible de distinguer approve vs rejete de l'exterieur
  padToUniformSize(blob: SignedTxBlob): PaddedBlob {
    const TARGET_SIZE = 4096; // bytes
    const padding = crypto.randomBytes(TARGET_SIZE - blob.signedTx.length);
    return { data: Buffer.concat([blob.signedTx, padding]), size: TARGET_SIZE };
  }
}
```

---

### 6. Attestation sur 0G Chain (`Attestor.ts`)

```typescript
export class Attestor {
  private zgChainProvider: ethers.JsonRpcProvider;

  // Apres chaque cycle de decisions, ancrer l'attestation
  async anchor(decisions: TEEDecisions): Promise<string> {
    // 1. Generer le hash des decisions (sans reveler le contenu)
    const decisionHash = ethers.keccak256(
      ethers.toUtf8Bytes(JSON.stringify({
        timestamp: decisions.timestamp,
        agentsValidated: decisions.validations.length,
        reallocation: decisions.reallocation ? true : false,
        // PAS le detail des strategies — juste la preuve
      }))
    );

    // 2. Signer avec la cle TEE (attestation)
    const attestation = await this.enclaveSigner.signMessage(decisionHash);

    // 3. Ancrer sur 0G Chain
    const tx = await this.attestationContract.anchor(
      decisionHash,
      attestation,
      decisions.timestamp
    );

    return tx.hash;
  }
}
```

---

## PARTIE 2 : Dashboard

### 7. Setup Dashboard (Jour 3-4)

```bash
cd dashboard/
npx create-next-app@latest . --typescript --tailwind --app --src-dir
npm install wagmi viem @rainbow-me/rainbowkit @tanstack/react-query
npm install recharts           # Pour les graphes
npm install framer-motion      # Pour les animations de flux
```

`.env.example` :
```
NEXT_PUBLIC_ARC_RPC=https://rpc.testnet.arc.network
NEXT_PUBLIC_VAULT_ADDRESS=     # <- depuis deployments.json d'Ali
NEXT_PUBLIC_ARCMIND_TOKEN=     # <- depuis deployments.json d'Ali
NEXT_PUBLIC_WALLETCONNECT_ID=  # <- WalletConnect project ID
NEXT_PUBLIC_AGENTS_API=        # <- endpoint des agents d'Adrian
```

---

### 8. Config Wagmi (`wagmi.ts`)

```typescript
import { http, createConfig } from "wagmi";
import { defineChain } from "viem";

// Definir la chain Arc Testnet (pas dans wagmi par defaut)
export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] }
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" }
  }
});

export const config = createConfig({
  chains: [arcTestnet],
  transports: {
    [arcTestnet.id]: http()
  }
});
```

---

### 9. Page Principale (`page.tsx`)

Layout de la page :

```
+--------------------------------------------------+
|  ARCMIND          [Connect Wallet]               |
+--------------------------------------------------+
|                                                  |
|  +--------------------+  +--------------------+  |
|  |   YOUR POSITION    |  |    VAULT STATS     |  |
|  |   Balance: $XXX    |  |    TVL: $XXX       |  |
|  |   APY: X.X%        |  |    Share Price: X  |  |
|  |   [Deposit] [Withdraw]|  Chains: 5        |  |
|  +--------------------+  +--------------------+  |
|                                                  |
|  AGENTS                                          |
|  +--------+ +--------+ +--------+ +--------+    |
|  | BASE   | | ARB    | | ETH    | | OP     |    |
|  | APY 5.6| | APY 5.3| | APY 3.2| | APY 3.9|    |
|  | Safe 93| | Safe 91| | Safe 95| | Safe 88|    |
|  | $40K   | | $30K   | | $15K   | | $10K   |    |
|  +--------+ +--------+ +--------+ +--------+    |
|                                                  |
|  TEE DECISIONS                                   |
|  +----------------------------------------------+|
|  | Last reallocation: 2h ago                    ||
|  | BASE +22K | ARB +12K | ETH -3K | POLY -18K  ||
|  | [Animated flow diagram]                      ||
|  +----------------------------------------------+|
|                                                  |
|  ATTESTATION TRAIL                               |
|  +----------------------------------------------+|
|  | #142 | 14:32 | 5 agents | No realloc | 0G ✓ ||
|  | #141 | 14:32 | 5 agents | No realloc | 0G ✓ ||
|  | #140 | 14:01 | 5 agents | REALLOC    | 0G ✓ ||
|  +----------------------------------------------+|
+--------------------------------------------------+
```

---

### 10. Composants cles

#### DepositForm.tsx
```tsx
export function DepositForm() {
  const { address } = useAccount();
  const [amount, setAmount] = useState("");

  // 1. Approve USDC au vault
  const { write: approve } = useContractWrite({
    address: USDC_ARC,
    abi: erc20Abi,
    functionName: "approve",
    args: [VAULT_ADDRESS, parseUnits(amount, 18)] // 18 decimals sur Arc !
  });

  // 2. Deposit dans le vault
  const { write: deposit } = useContractWrite({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "deposit",
    args: [parseUnits(amount, 18), address]
  });

  // UI : input amount + bouton "Deposit"
  // Etape 1 : Approve, puis Etape 2 : Deposit
}
```

#### AgentCard.tsx
```tsx
export function AgentCard({ agent }: { agent: AgentState }) {
  return (
    <div className="border rounded-lg p-4">
      <h3 className="font-bold">{agent.chain}</h3>
      <div>APY: {agent.currentYield.toFixed(1)}%</div>
      <div>Safety: {(agent.safetyScore * 100).toFixed(0)}/100</div>
      <div>Capital: ${agent.capital.toLocaleString()}</div>
      <div className="mt-2">
        {/* Mini yield curve chart */}
        <YieldCurveChart data={agent.yieldCurve} />
      </div>
      <div className="mt-2 text-sm text-gray-500">
        Protocols: {agent.positions.map(p => p.protocol).join(", ")}
      </div>
    </div>
  );
}
```

#### ReallocationFlow.tsx
```tsx
// Animation des flux de capital entre chains
// Utiliser framer-motion pour animer les fleches
// Arc au centre, chains autour
// Fleches vertes = capital entrant, rouges = capital sortant
// Epaisseur proportionnelle au montant

export function ReallocationFlow({ movements }: { movements: CCTPMovement[] }) {
  return (
    <div className="relative h-96">
      {/* Arc au centre */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        ARC HUB
      </div>

      {/* Chains autour */}
      {CHAINS.map((chain, i) => (
        <ChainNode key={chain} chain={chain} position={getPosition(i, CHAINS.length)} />
      ))}

      {/* Fleches animees */}
      {movements.map(m => (
        <AnimatedArrow key={`${m.from}-${m.to}`} movement={m} />
      ))}
    </div>
  );
}
```

---

### 11. Hooks de lecture

```typescript
// hooks/useVault.ts
export function useVault() {
  // Lire les donnees du vault via wagmi/viem
  const tvl = useContractRead({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "totalAssets"
  });

  const sharePrice = useContractRead({
    address: VAULT_ADDRESS,
    abi: vaultAbi,
    functionName: "convertToAssets",
    args: [parseUnits("1", 18)]
  });

  // Balance utilisateur en arcMIND
  const { address } = useAccount();
  const balance = useContractRead({
    address: ARCMIND_TOKEN,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: [address]
  });

  // Calculer APY (basé sur share price growth)
  // APY = (currentSharePrice / sharePriceLastWeek)^(365/7) - 1

  return { tvl, sharePrice, balance, apy };
}

// hooks/useAgents.ts
export function useAgents() {
  // Fetch l'etat des agents depuis l'API d'Adrian
  // ou lire directement les events on-chain
  const { data } = useQuery({
    queryKey: ["agents"],
    queryFn: () => fetch(AGENTS_API + "/status").then(r => r.json()),
    refetchInterval: 30_000 // Refresh toutes les 30s
  });
  return data;
}
```

---

## Ce que tu fournis aux autres

| A qui | Quoi | Pourquoi |
|-------|------|----------|
| Adrian (Agents) | Endpoint TEE pour envoyer les proposals | Communication agent -> TEE |
| Adrian (Agents) | Format des reponses TEE (TX blobs) | Pour que les agents sachent deserialiser |
| Ali (Contracts) | Adresse du TEE wallet | Pour le modifier onlyTEE sur le vault |

---

## Ce dont tu as besoin des autres

| De qui | Quoi | Pourquoi |
|--------|------|----------|
| Ali (Contracts) | `deployments.json` + ABIs du Vault, CCTPBridge | Pour signer les TX et afficher sur le dashboard |
| Adrian (Agents) | Format des proposals (conforme au schema partage) | Pour les deserialiser dans le TEE |
| Adrian (Agents) | API/endpoint pour lire l'etat des agents | Pour le dashboard |

---

## Ordre de dev recommande

```
Jour 1 : Setup orchestrator + ProposalValidator + SecurityRules
Jour 2 : Reallocator + CCTPExecutor + TxSigner
Jour 3 : Setup dashboard Next.js + wagmi + page layout
Jour 4 : DepositForm + WithdrawForm + VaultStats + AgentGrid
Jour 5 : ReallocationFlow animation + AttestationLog + polish + integration
```

---

## Checklist finale

### Orchestrator
- [ ] CRE Workflow squelette fonctionnel
- [ ] ProposalValidator valide/rejette correctement
- [ ] SecurityRules implementees (safety threshold, diversification, buffer)
- [ ] Reallocator calcule les allocations optimales
- [ ] TxSigner signe les TX
- [ ] Messages uniformes (meme taille approve vs reject)
- [ ] Emergency override fonctionne
- [ ] Attestation generee et ancree sur 0G Chain

### Dashboard
- [ ] Connect wallet sur Arc Testnet
- [ ] Deposit USDC -> arcMIND fonctionne
- [ ] Withdraw arcMIND -> USDC fonctionne
- [ ] Affichage TVL, APY, share price
- [ ] Agent cards avec yield, safety, capital
- [ ] Yield curve charts
- [ ] Reallocation flow animation
- [ ] Attestation trail
- [ ] Responsive et propre
