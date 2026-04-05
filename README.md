# ArcMind

### Autonomous AI Agents for Cross-Chain DeFi Yield Optimization

> One autonomous AI agent per chain. Each observes, reasons, proposes, and executes — blind to every other chain. A Chainlink CRE Workflow fuses all proposals inside a TEE, validates strategies, and dynamically reallocates capital across chains via CCTP. Settlement on Arc. Compute on 0G. Privacy by design.

[![Arc](https://img.shields.io/badge/Settlement-Arc_(Circle_L1)-00D4FF?style=flat-square)](#arc--settlement-hub)
[![Chainlink](https://img.shields.io/badge/Orchestration-Chainlink_CRE-375BD2?style=flat-square)](#chainlink-cre--the-orchestrator)
[![0G](https://img.shields.io/badge/AI_Compute-0G_Network-8B5CF6?style=flat-square)](#0g--decentralized-ai-infrastructure)
[![CCTP](https://img.shields.io/badge/Transport-Circle_CCTP-00D395?style=flat-square)](#circle-cctp--gateway--usdc-rails)

---

## Table of Contents

1. [The Problem](#the-problem)
2. [The Solution](#the-solution)
3. [Architecture Overview](#architecture-overview)
4. [The Agents — One AI Per Chain](#the-agents--one-ai-per-chain)
5. [What Each Agent Does](#what-each-agent-does)
6. [How Agents Propose](#how-agents-propose)
7. [The TEE — Two Jobs](#the-tee--two-jobs)
8. [Cross-Chain Reallocation](#cross-chain-reallocation)
9. [TEE Security Rules](#tee-security-rules)
10. [End-to-End Privacy](#end-to-end-privacy)
11. [Why Agents Are Blind](#why-agents-are-blind)
12. [Scenarios](#scenarios)
13. [Tech Stack](#tech-stack)
14. [Project Structure](#project-structure)
15. [Implementation Status](#implementation-status)
16. [Getting Started](#getting-started)
17. [Hackathon Track Eligibility](#hackathon-track-eligibility)
18. [Technical Summary](#technical-summary)

---

## The Problem

Every yield optimizer today — Beefy, Yearn, ZyFi, Giza — follows the same architecture: **one brain, one algorithm, one server.** This creates fundamental weaknesses:

**Single point of failure.** Compromise the algorithm and the entire strategy is exposed. An insider leak, code theft, or on-chain reverse-engineering is enough to copy or front-run every vault movement.

**Total on-chain transparency.** Every deposit, withdrawal, and rebalance is publicly visible. MEV bots extract value on every capital movement. Competitors replicate strategies in real time.

**Single-chain thinking.** Most optimizers operate on one chain at a time. Giza's ARMA runs on Base. Beefy deploys separate vaults per chain. Nobody dynamically moves capital to wherever yields are best across all chains simultaneously.

**No verifiability.** Users must trust that the algorithm ran correctly. There is no proof that the advertised strategy was actually executed, or that inputs were not manipulated.

---

## The Solution

ArcMind deploys **one autonomous AI agent per supported chain** (up to 13 chains). Each agent is a full fund manager for its chain — it observes every protocol, reasons about opportunities with its own ML model, proposes strategies, and executes trades. But each agent is **completely blind** to what happens on every other chain.

A **Chainlink CRE Workflow** running on a Decentralized Oracle Network (DON) sits at the center. It collects encrypted proposals from all agents via ConfidentialHTTPClient, validates strategies against security rules inside the TEE, and — every 6-7 hours — **reallocates capital between chains via CCTP** based on which agents are delivering the best risk-adjusted yields.

The user deposits USDC once on Arc, receives `arcMIND` share tokens, and sees a single number: their APY. Behind the scenes, autonomous AI agents are continuously optimizing across every major DeFi chain.

---

## Architecture Overview

```
                         USER
                    Deposit USDC on Arc
                    Receive arcMIND tokens
                          |
                +---------v---------+
                |   ARC (Circle L1)  |
                |  Vault ERC-4626    |
                |  arcMIND Token     |
                |  Nanopayments      |
                |  Buffer (10%)      |
                +---------+---------+
                          |
             Initial distribution via CCTP
             Reallocation every 6-7h via CCTP
                          |
        +-----------------+-----------------+
        |        |        |        |        |
        v        v        v        v        v
    +-------+ +------+ +------+ +------+ +------+
    | AGENT | |AGENT | |AGENT | |AGENT | |AGENT |  ...up to 13
    |  ETH  | | BASE | | ARB  | | AVAX | |  OP  |
    |       | |      | |      | |      | |      |
    | Sees  | |Sees  | |Sees  | |Sees  | |Sees  |
    | ONLY  | |ONLY  | |ONLY  | |ONLY  | |ONLY  |
    | ETH   | |BASE  | |ARB   | |AVAX  | |OP    |
    +---+---+ +--+---+ +--+---+ +--+---+ +--+---+
        |        |        |        |        |
        |  Encrypted proposals every 30s    |
        +--------+--------+--------+--------+
                          |
                +---------v---------+
                |   CHAINLINK CRE   |
                |   WORKFLOW (DON)   |
                |                   |
                | ConfidentialHTTP  |
                | fetches proposals |
                | (encrypted,      |
                |  enclave-only)   |
                |                   |
                | Validate each    |
                | strategy (BFT)   |
                |                   |
                | Reallocation     |
                | every 6-7h       |
                |                   |
                | Batch response   |
                | via HTTPClient   |
                | (DON consensus)  |
                |                   |
                | Attestation hash |
                | -> 0G Chain      |
                +---------+---------+
                          |
                 Approved/Rejected + TX blobs
                          |
        +-----------------+-----------------+
        |        |        |        |        |
        v        v        v        v        v
      ETH      BASE     ARB     AVAX      OP
     Aave     Morpho   Aave    Aave     Aave
     Comp     Aave     Comp    Benqi    Sonne
     Morpho   Comp     Morpho
```

---

## The Agents — One AI Per Chain

Each agent is a **fully autonomous AI fund manager** that runs on 0G Compute with persistent memory on 0G Storage. It is not a data fetcher or a sensor. It is an agent that observes, reasons, proposes, executes, and learns.

Each agent sees **everything on its chain** and **nothing about any other chain**. It does not know:
- What other agents are proposing
- How much capital other chains have
- What the total vault size is
- What the TEE's allocation strategy is
- Whether its budget will increase or decrease at the next reallocation

It knows only its chain, its current capital, and its own performance history.

### Agent Lifecycle

```
AGENT-BASE (runs continuously on 0G Compute)

1. OBSERVE
   Scans every USDC lending protocol on Base:
   - Supply rates, borrow rates, utilization
   - TVL per protocol, recent changes
   - Reward programs (COMP, MORPHO, WELL tokens)
   - Whale movements (large deposits/withdrawals)
   - Gas costs and patterns
   - Protocol health (audits, admin activity, governance)
   - Liquidation risks

2. REASON (ML model on 0G Compute)
   "Morpho vault #3 shows 6.8% but if I deploy my
    full 35K the rate compresses to 5.9%. Moonwell
    has a new incentive program pushing effective APY
    to 5.2%. Optimal split: 65% Morpho, 25% Moonwell,
    10% Compound as safety buffer. Gas is low right now,
    good time to rebalance. No security concerns detected."

3. PROPOSE (encrypted, sent to TEE every 30s)
   Full strategy + yield curve + reasoning

4. WAIT
   Polls GET /tee/response/:chain every 2s (20s timeout)
   TEE validates or rejects
   TEE may adjust capital allocation (every 6-7h)

5. EXECUTE
   Receives pre-signed TX blobs from TEE
   Broadcasts USDC approve + strategy deposit TX
   Monitors positions continuously
   Harvests and compounds rewards

6. LEARN
   Compares predictions vs actual results
   Stores history on 0G Storage
   Model improves over time via 0G fine-tuning
```

---

## What Each Agent Does

Every agent performs the same categories of analysis on its chain, but each chain's agent is fine-tuned on that chain's specific data and patterns.

### Yield Analysis

The agent reads on-chain protocol parameters directly — Aave's `PoolDataProvider` for reserve data, Compound's `CometInterface` for utilization, Morpho's `MorphoBlue` for market state — via RPC multicall. It does not rely solely on external APIs. It models the **post-deposit yield** by simulating how its own deposit changes the utilization ratio and compresses the rate. A pool advertising 6.8% may deliver only 5.2% after a 35K deposit.

### Strategy Types

Each agent can propose multiple strategy types on its chain:

**Direct lending.** Deposit USDC into lending protocols. The agent calculates optimal split across protocols to maximize yield while accounting for deposit impact compression.

**Folding (leveraged lending).** Deposit USDC, borrow USDC against it at safe LTV (E-Mode, same-asset), re-deposit. The agent calculates how many loops are profitable given the current spread between supply and borrow rates.

**Reward harvesting.** Monitor accrued protocol rewards (AAVE, COMP, MORPHO, WELL tokens), calculate optimal harvest frequency balancing gas costs vs compounding benefits, convert rewards to USDC and reinvest.

**Optimal splitting.** Instead of putting everything in the highest-rate pool, the agent computes the split where marginal yield across all pools is equalized — because large deposits compress yields.

### Risk Monitoring

Each agent continuously evaluates security on its chain:

- **TVL monitoring** — alerts if any protocol loses >10% TVL in 1 hour
- **Admin key tracking** — flags unusual transactions from protocol admin wallets
- **Audit freshness** — checks when the last audit was conducted
- **Governance watch** — detects proposals that change risk parameters before they pass
- **Oracle health** — verifies Chainlink price feeds are functioning
- **Smart contract monitoring** — detects proxy upgrades (temporary risk)
- **Depeg detection** — monitors USDC peg deviation

All risk signals are included in the agent's proposal to the TEE. A proposal with safety concerns will be rejected or have its capital reduced.

---

## How Agents Propose

Every 30 seconds, each agent sends an encrypted proposal to the TEE. The proposal contains its full local strategy and its yield curve showing how much capital it can efficiently deploy.

```json
{
  "agent": "BASE",
  "timestamp": 1712345678,

  "strategy": {
    "positions": [
      {
        "protocol": "morpho_v3",
        "pool_id": "POOL-008",
        "action": "deposit",
        "amount_pct": 65,
        "raw_yield": 6.8,
        "post_deposit_yield": 5.9,
        "reasoning": "Vault #3 curated by Steakhouse, consistent yield,
                      deposit impact modeled at -0.9% for current allocation"
      },
      {
        "protocol": "moonwell",
        "pool_id": "POOL-009",
        "action": "deposit",
        "amount_pct": 25,
        "raw_yield": 4.1,
        "post_deposit_yield": 3.9,
        "reasoning": "New WELL incentive program started 12h ago"
      },
      {
        "protocol": "compound_v3",
        "pool_id": "POOL-006",
        "action": "deposit",
        "amount_pct": 10,
        "raw_yield": 3.8,
        "post_deposit_yield": 3.7,
        "reasoning": "Safety buffer, deep liquidity for quick exit"
      }
    ],
    "harvest": {
      "pending_rewards_usd": 180,
      "harvest_profitable": true,
      "optimal_harvest_time": "now",
      "reasoning": "Gas at 0.002 gwei, harvest cost $0.03, rewards $180"
    }
  },

  "allocation_curve": [
    { "capital": 10000,  "blended_yield": 6.5 },
    { "capital": 20000,  "blended_yield": 6.1 },
    { "capital": 35000,  "blended_yield": 5.6 },
    { "capital": 50000,  "blended_yield": 5.2 },
    { "capital": 75000,  "blended_yield": 4.3 },
    { "capital": 100000, "blended_yield": 3.5 }
  ],

  "safety": {
    "overall_score": 0.93,
    "protocol_scores": { "morpho_v3": 0.91, "moonwell": 0.88, "compound_v3": 0.95 },
    "alerts": [],
    "chain_health": { "sequencer": "ok", "gas_gwei": 0.002, "recent_reorgs": 0 }
  },

  "current_capital": 35000,
  "optimal_capital": 40000,
  "min_useful_capital": 5000,
  "confidence": 0.84,
  "last_7d_actual_yield": 5.7,
  "prediction_accuracy_30d": 0.81
}
```

---

## The TEE — Two Jobs

The Chainlink CRE Workflow runs on a Decentralized Oracle Network (DON) with BFT consensus. Each DON node independently executes the same logic — proposals are fetched via `ConfidentialHTTPClient` (encrypted inside the enclave), validated, and responses distributed via `HTTPClient` with `consensusIdenticalAggregation`.

### Job 1 — Validate Local Strategies (Every 30 Seconds)

The CRE Workflow receives encrypted proposals from all agents and validates each one:

1. **Fetch** all proposals via ConfidentialHTTPClient (`encryptOutput: true`) — strategies never leave the encrypted boundary
2. **Verify** safety scores — reject any proposal with safety < 0.7
3. **Check alerts** — if any agent reports a critical risk (TVL drain, exploit, admin activity), reject proposals for that protocol across ALL chains
4. **Verify diversification** — no single protocol > 40% of the agent's local capital
5. **Verify yield coherence** — post-deposit yield must be < raw yield (rate compression)
6. **Approve or reject** each strategy
7. **Build batch response** — all agent responses in a single POST (CRE limits: 5 HTTP calls per execution)
8. **Distribute** via HTTPClient with DON consensus

### Job 2 — Cross-Chain Capital Reallocation (Every 6-7 Hours)

The TEE compares the yield curves from all agents and decides how to redistribute capital between chains:

```
TEE CROSS-CHAIN REALLOCATION

Receives yield curves from all agents:

  Agent-ETH:   10K->3.8%  20K->3.5%  50K->2.9%  (weak chain)
  Agent-BASE:  10K->6.5%  20K->6.1%  50K->5.2%  (strong chain)
  Agent-ARB:   10K->5.6%  20K->5.3%  50K->4.4%  (good chain)
  Agent-AVAX:  10K->4.2%  20K->3.9%  50K->3.2%  (average chain)
  Agent-OP:    10K->3.9%  20K->3.6%  50K->3.1%  (average chain)

  Also considers:
  - Safety scores (won't send more capital to risky chains)
  - Agent track record (prediction_accuracy_30d)
  - CCTP cost for each movement
  - Max 50% per chain, 10% buffer on Arc

  RESULT:
    ETH:    15K   (reduced from 18K, yield too low)
    BASE:   40K   (increased from 18K, best yield)
    ARB:    30K   (increased from 18K, good yield)
    AVAX:   10K   (reduced, average yield)
    OP:      5K   (reduced, average yield)
    Buffer: 15K   (10% on Arc)

  CCTP MOVEMENTS:
    ETH  -> Arc -> BASE:   3K  (partial shift)
    AVAX -> Arc -> ARB:    5K  (partial shift)
    OP   -> Arc -> BASE:   8K  (partial shift)
```

---

## Cross-Chain Reallocation

### Why Every 6-7 Hours?

Yield differentials between chains change slowly — they are driven by utilization shifts, incentive programs, and macro conditions that evolve over hours, not seconds. A 6-7 hour reallocation cycle captures all meaningful shifts while minimizing CCTP transaction costs.

### How It Works

1. The TEE reads the latest yield curves from all agents
2. It computes the optimal allocation using marginal yield equalization
3. It factors in safety scores — risky chains get less capital regardless of yield
4. It factors in agent track record — agents that consistently over-predict get discounted
5. It calculates CCTP costs for each proposed movement
6. It only executes movements where **projected 24h gain > 2x CCTP cost**
7. It signs CCTP burn/mint transactions inside the enclave
8. Capital flows through Arc as the hub: source chain -> Arc -> destination chain
9. Agents receive their new budgets and adjust

### Emergency Override

The 6-7 hour cycle has one exception: **critical risk events bypass the timer**. If any agent reports a critical alert (exploit detected, TVL drain >20%, admin key compromise), the TEE immediately withdraws capital from the affected chain without waiting for the next reallocation cycle.

---

## TEE Security Rules

| Rule | Description |
|------|-------------|
| **Safety Threshold** | Agent safety score < 0.7 -> strategy rejected entirely |
| **Critical Veto** | Any critical alert (TVL drain, exploit, admin compromise) -> immediate rejection + emergency withdrawal |
| **Post-Deposit Yield** | TEE uses post-deposit yields (not raw advertised rates) for all scoring |
| **Yield Coherence** | post_deposit_yield must be < raw_yield (rate compression validation) |
| **Local Diversification** | No single protocol > 40% of an agent's local capital |
| **Chain Diversification** | No single chain > 50% of total vault capital after reallocation |
| **Buffer** | 10% minimum stays on Arc for instant withdrawals |
| **Reallocation Cost Gate** | Cross-chain movements only execute when projected 24h gain > 2x CCTP round-trip cost |
| **Track Record Weight** | Agents with higher prediction accuracy over 30 days get more capital |
| **Capital Bounds** | Proposed capital must stay between min_useful_capital and 2x current_capital |

---

## End-to-End Privacy

### Structural Privacy

| Layer | Mechanism |
|-------|-----------|
| **Privacy by isolation** | Each agent sees only its chain. Compromising one agent reveals zero information about other chains' strategies or the overall allocation. |
| **Privacy by fusion** | The complete cross-chain picture exists only inside the TEE during its milliseconds of computation. |
| **Privacy by evanescence** | After each cycle, the TEE retains no internal state. Proposals enter, decisions exit, everything is wiped. |
| **Verifiability by attestation** | The Chainlink TEE attestation anchored on 0G Chain proves the fusion logic ran untampered. |
| **Selective auditability** | Users can generate view keys for third parties (accountants, auditors, regulators). |

### Execution Privacy

The TEE does not send instructions in plaintext. It **signs transactions directly** inside the enclave. What exits is an opaque blob of bytes that the agent broadcasts.

**ConfidentialHTTPClient.** Agent proposals are fetched inside the DON enclave using Chainlink's `ConfidentialHTTPClient` with `encryptOutput: true`. API keys are injected from Vault DON secrets via `{{.AGENT_API_KEY}}` templates — they never leave the encrypted boundary.

**Uniform messaging.** Every cycle, the TEE sends a batch response to ALL agents — including those whose strategies were rejected. An observer cannot distinguish a real order from a "do nothing" response.

**Random timing.** Agents execute within a random window, preventing transaction correlation.

### Privacy Matrix

| Step | Private? | Mechanism |
|------|----------|-----------|
| Agent data collection | Yes | Confidential HTTP (encrypted URLs, keys, responses) |
| Agent -> TEE proposals | Yes | ConfidentialHTTPClient with encryptOutput |
| TEE decision | Yes | Runs inside DON enclave (BFT consensus) |
| Secret management | Yes | Vault DON secrets, `{{.AGENT_API_KEY}}` injection |
| Transaction signing | Yes | Keys inside TEE, real nonce/gasPrice from RPC |
| Order distribution | Yes | Single batch POST, uniform for ALL agents |
| Execution timing | Yes | Random windows |
| On-chain transactions | Visible | But spread across random timing windows |
| Cross-chain reallocation | Yes | Only the TEE knows why capital moved between chains |
| Attestation | Public | Proves correct execution without revealing strategy |

---

## Why Agents Are Blind

Each agent sees everything on its chain but nothing about any other chain. This is the core security feature.

**Anti-compromise.** If someone hacks Agent-BASE, they learn about Base yields and strategies. They learn nothing about Ethereum, Arbitrum, or the cross-chain allocation logic. They have 1 piece of a 13-piece puzzle.

**Strategy opacity.** The overall ArcMind strategy — how capital is distributed across chains — exists only inside the TEE. No agent knows it. No developer knows it. It emerges from the comparison of blind proposals.

**MEV resistance.** A reallocation from Avalanche to Base appears as two separate events (withdrawal + deposit) separated by minutes of random timing. An observer cannot link them or predict the next movement.

**Creator can't cheat.** The cross-chain allocation is decided by the TEE based on real-time yield curves. Even the creator cannot predict or manipulate this.

---

## Scenarios

### Scenario 1: Protocol Exploit

**Classic optimizer:** Protocol gets hacked -> TVL drops -> yield changes -> optimizer detects yield change -> rebalances. Capital was exposed the entire time.

**ArcMind:** Agent-ARB detects TVL dropping on a lending protocol (-22% in 1h), flags unusual admin activity. It sends a CRITICAL alert in its next proposal (within 30 seconds). The CRE Workflow immediately rejects the proposal and triggers emergency withdrawal. Capital returns to Arc. At the next reallocation cycle, the freed capital is redistributed to better-performing chains.

### Scenario 2: Dynamic Capital Reallocation

**Classic optimizer:** Deposits on the highest-yield chain and stays there.

**ArcMind at reallocation cycle:**
- Agent-ETH reports: "Best I can do is 3.2% with current capital."
- Agent-BASE reports: "I can deliver 6.1% if you give me 40K. New Morpho vault with excellent curator."
- Agent-ARB reports: "Steady 5.3% with current capital, room for more."
- Agent-AVAX reports: "4.2% from Aave, stable and safe."

The TEE reallocates: pulls capital from ETH via CCTP through Arc, sends more to BASE and ARB. Each agent adjusts its local strategy with its new budget. The agents don't know where their new capital came from.

### Scenario 3: Deposit Impact Intelligence

**Classic optimizer** sees Morpho Base at 6.8% and dumps 100K there. Post-deposit yield: 3.8%.

**Agent-BASE** models the deposit impact curve: 10K -> 6.5%, 35K -> 5.6%, 100K -> 3.5%. It proposes splitting across Morpho (65%), Moonwell (25%), and Compound (10%) to maximize blended post-deposit yield at 5.4%. The TEE approves this split because the reasoning is sound and all protocols pass safety checks.

---

## Tech Stack

### Arc — Settlement Hub

Arc is Circle's Layer-1 blockchain designed for stablecoin finance. EVM-compatible, meaning standard Solidity contracts, Foundry, Hardhat, and ethers.js work out of the box.

**Why Arc for ArcMind:**
- **Gas paid in USDC.** No volatile token needed. USDC on Arc: `0x3600000000000000000000000000000000000000` (18 decimals).
- **Deterministic sub-second finality.** Transactions are immediately final.
- **Native CCTP/Gateway.** Cross-chain USDC transfers are first-class citizens.
- **Nanopayments.** Gas-free micro-transactions between agents.

| Property | Value |
|----------|-------|
| RPC Endpoint | `https://rpc.testnet.arc.network` |
| Chain ID | `5042002` |
| Explorer | `https://testnet.arcscan.app` |
| Faucet | `https://faucet.circle.com` |
| CCTP Domain ID | `26` |

### Circle CCTP / Gateway — USDC Rails

CCTP handles all USDC movements via native burn/mint. No wrapped tokens, no liquidity pools, no bridge risk. 1:1 transfers with zero slippage.

| Chain | Domain ID | USDC Address (Testnet) |
|-------|-----------|----------------------|
| Arc Testnet | `26` | `0x3600000000000000000000000000000000000000` |
| Ethereum Sepolia | `0` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Base Sepolia | `6` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Arbitrum Sepolia | `3` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| Avalanche Fuji | `1` | `0x6a17716Ce178e84835cfA73AbdB71cb455032456` |
| Optimism Sepolia | `2` | `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` |

### Chainlink CRE — The Orchestrator

The Chainlink Runtime Environment (CRE) orchestrates the entire swarm cycle. The complete flow — cron triggering, proposal collection via ConfidentialHTTPClient, validation, reallocation, and response distribution — is implemented as a **CRE Workflow in TypeScript**, compiled to WASM, and executed on a Decentralized Oracle Network (DON) with built-in BFT consensus.

**CRE Workflow implementation:**
- **Cron trigger** every 30s (`*/30 * * * * *`)
- **ConfidentialHTTPClient** fetches proposals with `encryptOutput: true` — agent strategies (yield predictions, optimal splits) never leave the encrypted boundary
- **Vault DON Secrets** inject API keys via `{{.AGENT_API_KEY}}` templates — keys stored in Chainlink's encrypted key management, never in code
- **Validation** checks safety threshold (>=0.7), critical alerts, diversification (max 40% per protocol), yield coherence, capital bounds
- **Cross-chain reallocation** scores chains by yield, confidence, and safety — computes optimal capital distribution with max 50% per chain and 10% buffer
- **HTTPClient** distributes batch responses with `consensusIdenticalAggregation` — all DON nodes produce the same result (BFT)
- **Attestation hash** — deterministic decision hash for on-chain anchoring

**CRE simulation result (13 agents):**
```
13/13 proposals APPROVED
Reallocation: 6 CCTP movements computed
Attestation hash generated
Simulation complete — workflow validated
```

### Chainlink Confidential Compute — The Private Brain

The TEE where all proposals are fused and all decisions are made. ConfidentialHTTPClient runs inside the DON enclave — API keys and strategy data never leave the encrypted boundary. Vault DON for secret management. Produces attestations anchored on 0G Chain.

### 0G — Decentralized AI Infrastructure

**0G Compute** runs every agent's ML workloads: time-series forecasting (yield trends), anomaly detection (TVL drains, admin activity), deposit impact modeling (rate curve simulation), and NLP (governance proposal analysis). OpenAI-compatible SDK, 50-100ms latency, TEE-verified responses. Model: `qwen-2.5-7b-instruct` on 0G Newton testnet.

**0G Storage** provides persistent decentralized memory: yield histories (30-60 days per pool), performance logs (predictions vs actuals), fine-tuned LoRA adapters, incident records.

**0G Chain** anchors Chainlink TEE attestations, creating a publicly auditable trail that proves every allocation decision was computed inside an untampered enclave. Chain ID: `16600`, RPC: `https://evmrpc-testnet.0g.ai`.

### Agent Economy — Nanopayments

Each agent is economically autonomous. It pays for its own API calls, 0G Compute inference, and on-chain data queries via **USDC nanopayments on Arc**. These are gas-free micro-transactions. The vault allocates budgets. An agent that costs more than the value of its signals is naturally de-prioritized.

---

## Project Structure

```
ETHCC_DVB/
  contracts/                        # Solidity smart contracts (Foundry)
    src/
      vault/ArcMindVault.sol        # ERC-4626, arcMIND token, buffer 10%, onlyTEE
      strategy/                     # 10 strategy contracts + IStrategy interface
        AaveStrategy.sol            #   Aave V3, ZeroLend, Yei Finance, Radiant
        CompoundStrategy.sol        #   Compound V3
        CompoundV2Strategy.sol      #   Benqi, Sonne, Moonwell, Mendi, Venus
        MorphoStrategy.sol          #   Morpho Blue
        SiloStrategy.sol            #   Silo V2
        YearnStrategy.sol           #   Yearn V3
        PendleStrategy.sol          #   Pendle V2 (PT fixed yield)
        FluidStrategy.sol           #   Fluid (fToken)
      cctp/CCTPBridge.sol           # CCTP V2 burn/mint
      nanopay/AgentPaymaster.sol    # USDC micro-payments for agents
      interfaces/                   # 10 protocol interfaces
    test/                           # 32 unit tests, 32 pass
    script/                         # Deploy scripts + CCTP attestation helper

  agents/                           # Autonomous AI agents (TypeScript)
    src/
      core/
        Agent.ts                    # Main agent class — observe/reason/propose/execute/learn
        AgentConfig.ts              # Chain config types
        types.ts                    # AgentProposal, TEEResponse, SignedTxBlob
      api/
        AgentServer.ts              # HTTP API — proposals, TEE responses, batch endpoint
      data/
        MarketDataProvider.ts       # Yield data facade
        ChainDataFeeds.ts           # Base yield data per chain
        DataSimulator.ts            # Brownian motion variations
        DeFiLlamaProvider.ts        # External yield data source
      modules/
        observer/
          YieldObserver.ts          # Collects yields from MarketDataProvider
          RiskObserver.ts           # TVL, peg, sequencer, oracle checks
        reasoner/
          DepositImpact.ts          # Kink-model rate compression, optimal split
          RiskScorer.ts             # Weighted risk scoring
        proposer/
          ProposalBuilder.ts        # Builds JSON proposal for TEE
          YieldCurve.ts             # Multi-protocol yield curve
        executor/
          TxBroadcaster.ts          # Broadcasts pre-signed TX blobs
          PositionManager.ts        # Tracks active positions
        learner/
          PerformanceTracker.ts     # Predictions vs actuals tracking
      integrations/
        ZeroGCompute.ts             # 0G Compute — ML inference
        ZeroGStorage.ts             # 0G Storage — persistent memory
        ContractRegistry.ts         # On-chain contract lookup
      chains/                       # 13 chain configs (Base, ARB, ETH, AVAX, OP, ...)
      index.ts                      # Entry point
    scripts/
      check-balances.ts             # Check ETH+USDC on all chains
    test/                           # 25 tests, 25 pass

  orchestrator/                     # TEE orchestrator (TypeScript)
    cre-workflow/                   # Chainlink CRE Workflow
      main.ts                       # CRE entry — ConfidentialHTTP, validate, reallocate, distribute
      validate.ts                   # Proposal validation (safety, diversification, yield coherence)
      reallocate.ts                 # Cross-chain capital reallocation algorithm
      config.staging.json           # Runtime config (chains, thresholds, strategy addresses)
      workflow.yaml                 # CRE workflow settings
      package.json                  # @chainlink/cre-sdk dependency
    src/
      index.ts                      # Standalone TEE orchestrator (local mode)
      tee/TxSigner.ts              # TX signing with real nonce/gas + USDC approve
      cre/workflow.ts              # CRE integration layer
      attestation/Attestor.ts      # 0G Chain attestation
    project.yaml                    # CRE project RPCs
    secrets.yaml                    # Vault DON secret mappings
    test/                           # 14 tests (including 8 E2E), 14 pass

  shared/                           # Shared types and config
    types.ts                        # TypeScript types (AgentProposal, TEEResponse)
    constants.ts                    # USDC addresses, CCTP domains, chain IDs (13 chains)
    proposal.schema.json            # JSON Schema for proposals
    deployments.json                # All deployed contract addresses

  frontend/                         # Dashboard (Next.js)
    src/
      app/                          # App router
      components/                   # React components
```

---

## Implementation Status

### Smart Contracts — Deployed & Tested

All smart contracts are **live on testnet** with **32/32 unit tests passing** and **full CCTP bridge verified end-to-end**.

#### Vault (Arc Testnet)
| Contract | Address | Status |
|----------|---------|--------|
| **ArcMindVault** (ERC-4626) | `0xE5cD5a7B782800e833dDe8648675e693CBe04ab6` | Deposit/Withdraw/Allocate tested |
| CCTPBridge | `0xf8a2d17B7ba46f9Fc0AD5e19947AdD65e4Efdc4E` | CCTP V2 (7 params) |
| CCTPRouter | `0x857b2bD4Ae427162979Cf90C7A5Be4fA19a1507C` | Deployed |
| AgentPaymaster | `0x8a2A55F62dF6f22e96525Da67c83F6B9caB85898` | Register/Fund/Pay tested |

#### Strategy Contracts (Testnet)
| Chain | Strategies Deployed | Addresses |
|-------|-------------------|-----------|
| ETH Sepolia | AaveStrategy, CompoundStrategy, MorphoStrategy | `0xD3aD...`, `0x857b...`, `0x8a2A...` |
| Base Sepolia | AaveStrategy, MorphoStrategy | `0x5632...`, `0xB990...` |
| ARB Sepolia | AaveStrategy | `0x5632...` |
| Avalanche Fuji | AaveStrategy | `0x518C...` |

#### 10 Strategy Contracts — Covering 30+ Protocols
| Strategy | Protocols Covered | Chains (Mainnet) |
|----------|-------------------|------------------|
| `AaveStrategy` | Aave V3, ZeroLend, Yei Finance, Radiant | ETH, ARB, Base, Linea, Sonic, BNB, Polygon, World Chain, Sei |
| `CompoundStrategy` | Compound V3 | ETH, ARB, Polygon |
| `CompoundV2Strategy` | Benqi, Sonne, Moonwell, Mendi, Venus | Avalanche, Optimism, Base, Linea, BNB |
| `MorphoStrategy` | Morpho Blue | ETH, Base, ARB, Unichain, World Chain, Ink |
| `SiloStrategy` | Silo V2 | Sonic, ARB |
| `YearnStrategy` | Yearn V3 | ETH |
| `PendleStrategy` | Pendle V2 (PT fixed yield) | ETH, ARB, Base |
| `FluidStrategy` | Fluid (fToken) | ETH, ARB, Base |

#### CCTP Bridge — Tested End-to-End
```
Arc Testnet -> depositForBurn V2 -> Circle attestation -> receiveMessage V2 on Base Sepolia
0.5 USDC sent from Arc, 0.5 USDC received on Base. Full roundtrip verified.
```

**Key discovery:** Arc USDC precompile blocks `depositForBurn` from contracts. The vault transfers USDC to the TEE (EOA), which calls `depositForBurn` directly. MessageTransmitter V2 address: `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275` on all chains.

### Agents — Implemented & Tested

**25/25 tests passing.** Full agent lifecycle implemented:

- **13 chain configs** — ETH, Base, ARB, AVAX, OP, Polygon, Unichain, Linea, Sonic, World Chain, Sei, BNB, Ink
- **Data feed layer** — Realistic yield data with Brownian motion variations (reproducing real DeFi dynamics)
- **Deposit impact modeling** — Kink-model (Aave/Compound rate curve) with post-deposit yield compression
- **Risk scoring** — TVL monitoring, sequencer health, oracle checks, depeg detection
- **Proposal builder** — Full JSON proposal conforming to shared schema
- **TEE polling** — Agent polls `GET /tee/response/:chain` every 2s with 20s timeout (consume-once pattern)
- **TX execution** — USDC approve + strategy deposit, real nonce/gasPrice from RPC
- **API server** — HTTP endpoints for proposals, status, batch TEE responses
- **0G Compute** — ML inference via `@0glabs/0g-serving-broker` (OpenAI-compatible)
- **0G Storage** — Persistent memory via `@0gfoundation/0g-ts-sdk`

### CRE Workflow — Implemented & Simulated

**Successfully simulated via `cre workflow simulate`.**

The Chainlink CRE Workflow is a real TypeScript workflow using the official `@chainlink/cre-sdk`:

| CRE Feature | Implementation |
|-------------|---------------|
| `CronCapability` | Triggers every 30s (`*/30 * * * * *`) |
| `ConfidentialHTTPClient` | Fetches proposals with `encryptOutput: true` |
| `Vault DON Secrets` | `{{.AGENT_API_KEY}}` injected from encrypted vault |
| `HTTPClient` | Batch response distribution with `consensusIdenticalAggregation` |
| `Runner` | Workflow registration and execution |
| Validation | Safety >= 0.7, no critical alerts, max 40% per protocol, yield coherence |
| Reallocation | Cross-chain capital optimization, max 50% per chain, 10% buffer |
| Attestation | Deterministic decision hash for on-chain anchoring |

### Orchestrator (Standalone Mode) — Implemented & Tested

**14/14 tests passing** (including 8 E2E tests).

- **TX signing** — Real nonce/gasPrice from RPC with 5s timeout, nonce offset tracking for multiple TXs per cycle
- **USDC approve** — Automatic ERC-20 approve before strategy deposit
- **0G attestation** — Decision hashes anchored on 0G Chain
- **CRE integration** — Bridge between standalone mode and CRE workflow

---

## Getting Started

### Prerequisites

- Node.js >= 18
- [Foundry](https://book.getfoundry.sh/) for smart contracts
- [CRE CLI](https://docs.chain.link/cre) for workflow simulation (optional)

### Install

```bash
# Agents
cd agents && npm install

# Orchestrator
cd orchestrator && npm install

# CRE Workflow (requires Bun)
cd orchestrator/cre-workflow && bun install

# Smart contracts
cd contracts && forge install
```

### Configure

```bash
# Copy env templates
cp agents/.env.example agents/.env
cp orchestrator/.env.example orchestrator/.env

# Edit .env files with your private keys
```

### Wallet Funding (Testnet)

Each agent and the TEE need ETH (for gas) and USDC on their respective chains.

| Chain | ETH Faucet | USDC Faucet |
|-------|-----------|-------------|
| ETH Sepolia | [sepoliafaucet.com](https://sepoliafaucet.com) | [faucet.circle.com](https://faucet.circle.com) |
| Base Sepolia | [faucet.circle.com](https://faucet.circle.com) | [faucet.circle.com](https://faucet.circle.com) |
| ARB Sepolia | [faucet.arbitrum.io](https://faucet.arbitrum.io) | [faucet.circle.com](https://faucet.circle.com) |
| Avalanche Fuji | [faucet.avax.network](https://faucet.avax.network) | [faucet.circle.com](https://faucet.circle.com) |
| 0G Newton | [faucet.0g.ai](https://faucet.0g.ai) | — (OG tokens for compute/storage) |

```bash
# Check balances on all chains
cd agents && npx ts-node scripts/check-balances.ts
```

### Run

```bash
# Run a single agent
cd agents && npm run dev -- --chain=base

# Run all agents
cd agents && npm run dev -- --all

# Run standalone orchestrator
cd orchestrator && npm run dev

# Simulate CRE workflow
cd orchestrator/cre-workflow && cre workflow simulate .
```

### Test

```bash
# Agent tests (25/25)
cd agents && npm test

# Orchestrator tests (14/14)
cd orchestrator && npm test

# Smart contract tests (32/32)
cd contracts && forge test
```

---

## Hackathon Track Eligibility

| Track | Prize | Fit |
|-------|------:|-----|
| **Arc — Chain Abstracted USDC Apps** | $3,000 | Arc as settlement hub. Capital distributed to 5+ chains via CCTP, reallocated dynamically by TEE. User interacts with one app on one chain. |
| **Arc — Agentic Economy with Nanopayments** | $6,000 | Each agent is an autonomous economic entity paying for API calls, compute, and data via USDC nanopayments on Arc. |
| **Chainlink — Best Workflow with CRE** | $4,000 | Full CRE Workflow: CronCapability trigger, ConfidentialHTTPClient for proposals, validation + reallocation logic, HTTPClient batch response with consensusIdenticalAggregation. Successfully simulated. |
| **Chainlink — Privacy Standard** | $2,000 | ConfidentialHTTPClient with `encryptOutput: true`. Vault DON Secrets with `{{.AGENT_API_KEY}}`. Proposals never leave the encrypted boundary. Strategy exists only inside the DON enclave. |
| **Chainlink — Connect the World** | $1,000 | Multiple Chainlink services: CRE Workflow orchestration, ConfidentialHTTPClient, HTTPClient, Vault DON Secrets. Chainlink Data Feeds for price verification. |
| **0G — Best DeFi App on 0G** | $6,000 | Agents run ML inference on 0G Compute (`qwen-2.5-7b-instruct`). Memory on 0G Storage. Attestations on 0G Chain. Multi-agent DeFi swarm. |
| **Total Potential** | **$22,000** | |

---

## Technical Summary

| Component | Technology | Role in ArcMind |
|-----------|------------|-----------------|
| Settlement Hub | Arc (Circle L1) | Vault, arcMIND tokens, USDC gas, nanopayments, CCTP hub |
| USDC Transport | Circle CCTP + Gateway | Cross-chain capital distribution and reallocation |
| Orchestration | Chainlink CRE Workflow | 30s cron cycle, proposal collection, validation, response distribution |
| Private Brain | Chainlink ConfidentialHTTPClient | Encrypted proposal fetch, Vault DON secrets, enclave-only computation |
| AI Compute | 0G Compute | Agent ML inference (yield prediction, risk scoring, anomaly detection) |
| Memory | 0G Storage | Persistent yield histories, performance logs, fine-tuned models |
| Audit Trail | 0G Chain | TEE attestation anchoring, public verifiability |
| Smart Contracts | Solidity (Foundry) | ERC-4626 vault on Arc, 10 strategy contracts on each chain, CCTP bridge |
| Agents | TypeScript (13 chains) | Autonomous AI fund managers — observe, reason, propose, execute, learn |

---

<p align="center">
  <i>One agent per chain. Each blind to the others.<br>
  A TEE that sees everything for milliseconds, then forgets.<br>
  Capital that flows to where it earns the most.<br>
  Built on Arc. Orchestrated by Chainlink CRE. Computed on 0G.</i>
</p>

<p align="center">
  <b>You can't copy a strategy that exists nowhere.<br>
  You can't predict an allocation that emerges from blind proposals.<br>
  You can't compromise a system where each piece knows nothing about the whole.</b>
</p>

<p align="center">
  <i>ArcMind — Autonomous AI agents for cross-chain DeFi.</i>
</p>
