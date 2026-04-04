# ArcMind

### Autonomous AI Agents for Cross-Chain DeFi Yield Optimization

> One autonomous AI agent per chain. Each observes, reasons, proposes, and executes — blind to every other chain. A Chainlink TEE fuses all proposals, validates strategies, and dynamically reallocates capital across chains via CCTP. Settlement on Arc. Compute on 0G. Privacy by design.

[![Arc](https://img.shields.io/badge/Settlement-Arc_(Circle_L1)-00D4FF?style=flat-square)](#arc--settlement-hub)
[![Chainlink](https://img.shields.io/badge/Privacy-Chainlink_Confidential_Compute-375BD2?style=flat-square)](#chainlink-confidential-compute--the-private-brain)
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
14. [User Experience](#user-experience)
15. [ArcMind vs Giza](#arcmind-vs-giza)
16. [MVP Scope (Hackathon)](#mvp-scope-hackathon)
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

ArcMind deploys **one autonomous AI agent per supported chain**. Each agent is a full fund manager for its chain — it observes every protocol, reasons about opportunities with its own ML model, proposes strategies, and executes trades. But each agent is **completely blind** to what happens on every other chain.

A **Chainlink Confidential Compute TEE** sits at the center. It receives encrypted proposals from all agents, validates strategies against security rules, and — every 6-7 hours — **reallocates capital between chains via CCTP** based on which agents are delivering the best risk-adjusted yields. Capital flows naturally toward the best-performing chains and away from underperforming ones.

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
    | AGENT | |AGENT | |AGENT | |AGENT | |AGENT |  ...up to 12
    |  ETH  | | BASE | | ARB  | |  OP  | | POLY |
    |       | |      | |      | |      | |      |
    | Sees  | |Sees  | |Sees  | |Sees  | |Sees  |
    | ONLY  | |ONLY  | |ONLY  | |ONLY  | |ONLY  |
    | ETH   | |BASE  | |ARB   | |OP    | |POLY  |
    +---+---+ +--+---+ +--+---+ +--+---+ +--+---+
        |        |        |        |        |
        |  Encrypted proposals every 30s    |
        +--------+--------+--------+--------+
                          |
                +---------v---------+
                |        TEE        |
                |   (Chainlink      |
                |    Confidential   |
                |    Compute)       |
                |                   |
                | JOB 1 (every 30s):|
                |  Validate local   |
                |  strategies       |
                |                   |
                | JOB 2 (every 6-7h)|
                |  Compare agents   |
                |  Reallocate       |
                |  capital via CCTP |
                |                   |
                | Signs all TX      |
                | Attestation ->    |
                |   0G Chain        |
                +---------+---------+
                          |
                 Pre-signed TX blobs
                          |
        +-----------------+-----------------+
        |        |        |        |        |
        v        v        v        v        v
      ETH      BASE     ARB      OP      POLY
     Aave     Morpho   Morpho   Aave    Aave
     Comp     Aave     Aave     Sonne   Comp
     Morpho   Comp     Comp
              Moon
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
   TEE validates or rejects
   TEE may adjust capital allocation (every 6-7h)

5. EXECUTE
   Receives pre-signed TX blobs from TEE
   Deploys capital according to approved strategy
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

```
AGENT-BASE PROPOSAL (encrypted, sent to TEE):

{
  agent: "BASE",
  timestamp: 1712345678,

  // Local strategy
  strategy: {
    positions: [
      {
        protocol: "morpho_v3",
        pool_id: "POOL-008",
        action: "deposit",
        amount_pct: 65,
        raw_yield: 6.8,
        post_deposit_yield: 5.9,
        reasoning: "Vault #3 curated by Steakhouse, consistent yield,
                    deposit impact modeled at -0.9% for current allocation"
      },
      {
        protocol: "moonwell",
        pool_id: "POOL-009",
        action: "deposit",
        amount_pct: 25,
        raw_yield: 4.1,
        post_deposit_yield: 3.9,
        incentive_boost: 1.3,
        effective_yield: 5.2,
        reasoning: "New WELL incentive program started 12h ago,
                    expected duration 30 days based on governance proposal"
      },
      {
        protocol: "compound_v3",
        pool_id: "POOL-006",
        action: "deposit",
        amount_pct: 10,
        raw_yield: 3.8,
        post_deposit_yield: 3.7,
        reasoning: "Safety buffer, deep liquidity for quick exit"
      }
    ],
    harvest: {
      pending_morpho_rewards_usd: 142,
      pending_well_rewards_usd: 38,
      harvest_profitable: true,
      optimal_harvest_time: "now",
      reasoning: "Gas at 0.002 gwei, harvest cost $0.03, rewards $180"
    }
  },

  // Yield curve for cross-chain reallocation (used by TEE every 6-7h)
  allocation_curve: [
    { capital: 10000,  blended_yield: 6.5 },
    { capital: 20000,  blended_yield: 6.1 },
    { capital: 35000,  blended_yield: 5.6 },
    { capital: 50000,  blended_yield: 5.2 },
    { capital: 75000,  blended_yield: 4.3 },
    { capital: 100000, blended_yield: 3.5 }
  ],

  // Risk assessment
  safety: {
    overall_score: 0.93,
    protocol_scores: {
      morpho_v3: 0.91,
      moonwell: 0.88,
      compound_v3: 0.95
    },
    alerts: [],
    chain_health: {
      sequencer: "ok",
      gas_gwei: 0.002,
      recent_reorgs: 0
    }
  },

  // Agent metadata
  current_capital: 35000,
  optimal_capital: 40000,
  min_useful_capital: 5000,
  confidence: 0.84,

  // Performance history
  last_7d_actual_yield: 5.7,
  prediction_accuracy_30d: 0.81
}
```

---

## The TEE — Two Jobs

The Chainlink Confidential Compute TEE is the single point of trust. It runs inside an Intel SGX enclave that no one can inspect — not Chainlink node operators, not the ArcMind creators, not anyone.

### Job 1 — Validate Local Strategies (Every 30 Seconds)

The TEE receives encrypted proposals from all agents and validates each one:

1. **Decrypt** all proposals inside the enclave
2. **Verify** agent signatures — reject any unsigned or tampered proposals
3. **Check safety scores** — reject any proposal with safety < 0.7
4. **Check alerts** — if any agent reports a critical risk (TVL drain, exploit, admin activity), reject proposals for that protocol across ALL chains
5. **Verify diversification** — no single protocol > 40% of the agent's local capital
6. **Approve or reject** each strategy
7. **Sign transactions** — pre-sign the execution TX inside the enclave
8. **Distribute** encrypted responses to all agents (uniform messages, decoys for rejected agents)

### Job 2 — Cross-Chain Capital Reallocation (Every 6-7 Hours)

The TEE compares the yield curves from all agents and decides how to redistribute capital between chains:

```
TEE CROSS-CHAIN REALLOCATION

Receives yield curves from all agents:

  Agent-ETH:   10K->3.8%  20K->3.5%  50K->2.9%  (weak chain)
  Agent-BASE:  10K->6.5%  20K->6.1%  50K->5.2%  (strong chain)
  Agent-ARB:   10K->5.6%  20K->5.3%  50K->4.4%  (good chain)
  Agent-OP:    10K->3.9%  20K->3.6%  50K->3.1%  (average chain)
  Agent-POLY:  10K->2.3%  20K->2.0%  50K->1.5%  (weak chain)

  Also considers:
  - Safety scores (won't send more capital to risky chains)
  - Agent track record (prediction_accuracy_30d)
  - CCTP cost for each movement
  - Current allocation vs optimal

  Optimization: allocate capital so that the marginal yield
  is equalized across all chains, accounting for safety.

  RESULT:
    ETH:    15K   (reduced from 18K, yield too low)
    BASE:   40K   (increased from 18K, best yield)
    ARB:    30K   (increased from 18K, good yield)
    OP:     10K   (reduced from 18K, average yield)
    POLY:    0K   (cut entirely, yield below threshold)
    Buffer: 15K   (10% on Arc)

  CCTP MOVEMENTS:
    POLY -> Arc -> BASE:  18K  (full withdrawal from POLY)
    ETH  -> Arc -> ARB:    3K  (partial shift)
    OP   -> Arc -> BASE:   8K  (partial shift)
    OP   -> Arc -> ARB:    4K  (partial shift)
```

After reallocation, each agent receives a new budget notification:
- Agent-BASE: "Your capital is now 40K. Adjust your positions."
- Agent-POLY: "Your capital is now 0. Withdraw all and return to Arc."

The agents don't know why their budget changed or where the capital came from.

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

The 6-7 hour cycle has one exception: **critical risk events bypass the timer**. If any agent reports a critical alert (exploit detected, TVL drain >20%, admin key compromise), the TEE immediately withdraws capital from the affected chain without waiting for the next reallocation cycle. Response time: under 10 seconds from detection to withdrawal.

---

## TEE Security Rules

| Rule | Description |
|------|-------------|
| **Safety Threshold** | Agent safety score < 0.7 -> strategy rejected entirely |
| **Critical Veto** | Any critical alert (TVL drain, exploit, admin compromise) -> immediate rejection + emergency withdrawal |
| **Post-Deposit Yield** | TEE uses post-deposit yields (not raw advertised rates) for all scoring. A pool showing 8% that drops to 5.2% after deposit is scored at 5.2%. |
| **Local Diversification** | No single protocol > 40% of an agent's local capital |
| **Chain Diversification** | No single chain > 50% of total vault capital after reallocation |
| **Buffer** | 10% minimum stays on Arc for instant withdrawals. Non-negotiable. |
| **Reallocation Cost Gate** | Cross-chain movements only execute when projected 24h gain > 2x CCTP round-trip cost |
| **Track Record Weight** | Agents with higher prediction accuracy over 30 days get more capital at reallocation |
| **Signature Required** | Every proposal must include a valid agent signature. Unsigned proposals are silently dropped. |

---

## End-to-End Privacy

### Structural Privacy

| Layer | Mechanism |
|-------|-----------|
| **Privacy by isolation** | Each agent sees only its chain. Compromising one agent reveals zero information about other chains' strategies or the overall allocation. |
| **Privacy by fusion** | The complete cross-chain picture exists only inside the TEE during its milliseconds of computation. |
| **Privacy by evanescence** | After each cycle, the TEE retains no internal state. Proposals enter, decisions exit, everything is wiped. |
| **Verifiability by attestation** | The Chainlink TEE attestation anchored on 0G Chain proves the fusion logic ran untampered. Publicly auditable without revealing the strategy. |
| **Selective auditability** | Users can generate view keys for third parties (accountants, auditors, regulators). |

### Execution Privacy

The TEE does not send instructions in plaintext. It **signs transactions directly** inside the enclave. What exits is an opaque blob of bytes that the agent broadcasts without understanding its contents.

**Uniform messaging.** Every cycle, the TEE sends an encrypted message to ALL agents — including those whose strategies were rejected. All messages have identical size and timing. An observer cannot distinguish a real order from a "do nothing" decoy.

**Random timing.** Agents execute within a random window (2-15 minutes), preventing transaction correlation.

**Private mempools.** On Ethereum, transactions route through Flashbots Protect. On L2s, sequencers include transactions in arrival order.

### Privacy Matrix

| Step | Private? | Mechanism |
|------|----------|-----------|
| Agent data collection | Yes | Confidential HTTP (encrypted URLs, keys, responses) |
| Agent -> TEE proposals | Yes | Encrypted in transit |
| TEE decision | Yes | Intel SGX enclave |
| Transaction signing | Yes | Keys inside TEE via Vault DON |
| Order distribution | Yes | Uniform messages to ALL agents |
| Execution timing | Yes | Random windows |
| On-chain transactions | Visible | But spread across random timing windows |
| Cross-chain reallocation | Yes | Only the TEE knows why capital moved between chains |
| Attestation | Public | Proves correct execution without revealing strategy |

An observer can see that USDC sits in Morpho on Base. But they cannot know why it is there, how long it will stay, what yield curve analysis led to that chain receiving more capital, when the next reallocation will happen, or what the other agents proposed.

---

## Why Agents Are Blind

Each agent sees everything on its chain but nothing about any other chain. This is the core security feature.

**Anti-compromise.** If someone hacks Agent-BASE, they learn about Base yields and strategies. They learn nothing about Ethereum, Arbitrum, or the cross-chain allocation logic. They have 1 piece of a 12-piece puzzle.

**Strategy opacity.** The overall ArcMind strategy — how capital is distributed across chains — exists only inside the TEE. No agent knows it. No developer knows it. It emerges from the comparison of blind proposals.

**MEV resistance.** A reallocation from Polygon to Base appears as two separate events (withdrawal + deposit) separated by minutes of random timing. An observer cannot link them or predict the next movement.

**Creator can't cheat.** The creator built each agent independently. But the cross-chain allocation — which chain gets more, which gets cut — is decided by the TEE based on real-time yield curves. Even the creator cannot predict or manipulate this.

---

## Scenarios

### Scenario 1: Protocol Exploit

**Classic optimizer:** Protocol gets hacked -> TVL drops -> yield changes -> optimizer detects yield change -> rebalances. Capital was exposed the entire time.

**ArcMind:** Agent-ARB detects TVL dropping on Radiant (-22% in 1h), flags unusual admin activity, sees smart money withdrawing. It sends a CRITICAL alert in its next proposal (within 30 seconds). The TEE immediately triggers emergency withdrawal from Radiant — before the yield even reflects the problem. Capital returns to Arc. At the next reallocation cycle, the TEE redistributes the freed capital to better-performing chains. The incident is logged on 0G Storage for future detection improvement.

### Scenario 2: Dynamic Capital Reallocation

**Classic optimizer:** Deposits on the highest-yield chain and stays there.

**ArcMind at reallocation cycle:**
- Agent-ETH reports: "Best I can do is 3.2% with current capital."
- Agent-BASE reports: "I can deliver 6.1% if you give me 40K. New Morpho vault with excellent curator."
- Agent-ARB reports: "Steady 5.3% with current capital, room for more."
- Agent-POLY reports: "Yields collapsed to 1.5%, not worth keeping capital here."

The TEE reallocates: pulls capital from ETH and POLY via CCTP through Arc, sends more to BASE and ARB. Each agent adjusts its local strategy with its new budget. The agents don't know where their new capital came from.

### Scenario 3: Deposit Impact Intelligence

**Classic optimizer** sees Morpho Base at 6.8% and dumps 100K there. Post-deposit yield: 3.8%.

**Agent-BASE** models the deposit impact curve: 10K -> 6.5%, 35K -> 5.6%, 100K -> 3.5%. It proposes splitting across Morpho (65%), Moonwell (25%), and Compound (10%) to maximize blended post-deposit yield at 5.4%. The TEE approves this split because the reasoning is sound and all protocols pass safety checks.

---

## Tech Stack

### Arc — Settlement Hub

Arc is Circle's Layer-1 blockchain designed for stablecoin finance. EVM-compatible, meaning standard Solidity contracts, Foundry, Hardhat, and ethers.js work out of the box.

**Why Arc for ArcMind:**
- **Gas paid in USDC.** No volatile token needed. Every gas cost is denominated in USDC — ideal for a yield optimizer. USDC on Arc: `0x3600000000000000000000000000000000000000` (18 decimals).
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

#### Vault on Arc

ERC-4626 vault deployed via Foundry. Handles USDC deposits, arcMIND token minting/burning, and interfaces with CCTP for cross-chain capital distribution. Can be deployed with Circle's Dev-Controlled Wallets SDK (SCA wallets with Gas Station sponsorship on testnet).

### Circle CCTP / Gateway — USDC Rails

CCTP handles all USDC movements via native burn/mint. No wrapped tokens, no liquidity pools, no bridge risk. 1:1 transfers with zero slippage. Gateway accelerates to under 500ms.

**Role in ArcMind:** CCTP is the mechanism that enables cross-chain capital reallocation. When the TEE decides to move capital from Polygon to Base, it signs a CCTP burn on Polygon, the USDC transits through Arc, and a CCTP mint delivers it to Base. The agent on Base receives more capital without knowing where it came from.

| Chain | Domain ID | USDC Address (Testnet) |
|-------|-----------|----------------------|
| Arc Testnet | `26` | `0x3600000000000000000000000000000000000000` |
| Ethereum Sepolia | `0` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Base Sepolia | `6` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Avalanche Fuji | `1` | `0x5425890298aed601595a70AB815c96711a31Bc65` |

### Chainlink CRE — The Orchestrator

Chainlink Runtime Environment (CRE) orchestrates the swarm cycle. The complete flow — triggering, signal collection via Confidential HTTP, TEE fusion, instruction generation, on-chain execution — is implemented as a CRE Workflow in TypeScript, compiled to WASM, and run on a Decentralized Oracle Network (DON) with built-in BFT consensus.

The CRE Workflow handles two trigger types:
- **Cron trigger (every 30s):** collects agent proposals, routes to TEE, distributes responses
- **Event trigger (on critical alert):** bypasses the 30s cycle for emergency withdrawals

### Chainlink Confidential Compute — The Private Brain

The TEE where all proposals are fused and all decisions are made. Intel SGX enclave that no one can inspect. Confidential HTTP for encrypted agent communication. Distributed Key Generation (DKG) via Vault DON for secret management. Produces attestations anchored on 0G Chain.

### 0G — Decentralized AI Infrastructure

**0G Compute** runs every agent's ML workloads: time-series forecasting (yield trends), anomaly detection (TVL drains, admin activity), deposit impact modeling (rate curve simulation), and NLP (governance proposal analysis). OpenAI-compatible SDK, 50-100ms latency, TEE-verified responses.

**0G Storage** provides persistent decentralized memory: yield histories (30-60 days per pool), performance logs (predictions vs actuals), fine-tuned LoRA adapters, incident records.

**0G Chain** anchors Chainlink TEE attestations, creating a publicly auditable trail that proves every allocation decision was computed inside an untampered enclave.

**0G Fine-Tuning** lets agents improve over time. Each agent can fine-tune a base model (Qwen 0.5B) on its chain's historical data via 0G's fine-tuning service, producing a specialized LoRA adapter stored on 0G Storage.

### Agent Economy — Nanopayments

Each agent is economically autonomous. It pays for its own API calls, 0G Compute inference, and on-chain data queries via **USDC nanopayments on Arc**. These are gas-free micro-transactions. The vault allocates budgets. An agent that costs more than the value of its signals is naturally de-prioritized — the system is self-regulating.

---

## User Experience

The user sees none of the complexity.

**Deposit.** Connect to ArcMind on Arc. Deposit USDC (gas paid in USDC). Receive `arcMIND` tokens.

**Earn.** Autonomous agents optimize 24/7 across all chains. Yields are harvested and auto-compounded. `arcMIND` tokens increase in value. No action required.

**Withdraw.** Burn `arcMIND` tokens. Receive USDC plus accumulated yield on Arc. Option to receive on any supported chain via CCTP.

**Verify.** Check the Chainlink TEE attestation trail on 0G Chain to confirm every decision was computed inside a secure enclave. No trust required.

---

## ArcMind vs Giza

| | Giza (ARMA) | ArcMind |
|---|---|---|
| **Scope** | Single chain (Base) | All CCTP-compatible chains simultaneously |
| **Agent model** | One centralized ML model | One autonomous AI agent per chain, each specialized |
| **Cross-chain** | None — deposits on one chain | TEE reallocates capital across chains every 6-7h via CCTP |
| **Privacy** | Strategy visible on-chain | Strategy exists nowhere — agents are blind between chains, TEE fuses privately |
| **Deposit impact** | Recent Optimizer upgrade models compression | Each agent models post-deposit yield for its chain's pools |
| **Verifiability** | Execution via EigenLayer AVS | Chainlink TEE attestation anchored on 0G Chain |
| **Insider risk** | Team knows the model | Even the creator doesn't know the cross-chain allocation — it emerges from blind proposals |
| **Resilience** | Single point of failure | One agent goes down, other chains continue. 0G Compute decentralized. |
| **AI compute** | Centralized servers | Decentralized 0G Compute with verifiable inference |
| **Memory** | Centralized database | Decentralized 0G Storage, each agent learns independently |

---

## MVP Scope (Hackathon)

| Component | Scope |
|-----------|-------|
| **Vault** | ERC-4626 on Arc Testnet with arcMIND token |
| **Agents** | 3-5 agents (Base, Arbitrum, Ethereum, optionally OP and Polygon). Same agent template, configured per chain. Each agent: yield analysis, deposit impact modeling, risk monitoring, strategy proposal, execution. |
| **Agent AI** | ML inference on 0G Compute (yield prediction, risk scoring). Memory on 0G Storage. |
| **TEE** | Chainlink Confidential Compute. Job 1: validate strategies every 30s. Job 2: demonstrate one cross-chain reallocation via CCTP. |
| **CRE Workflow** | Orchestrates the 30s cycle. Simulable via CRE CLI. |
| **CCTP** | Real transfers: Arc -> Base Sepolia, Arc -> Arbitrum Sepolia. One live reallocation demo. |
| **Nanopayments** | Agent-to-API payments via Arc nanopayments. |
| **Attestation** | TEE attestation of each cycle anchored on 0G Chain. |
| **Dashboard** | Real-time visualization: each chain's agent showing its current strategy, yield curves, safety scores. TEE decisions visualized. Reallocation flows animated. User sees APY and balance. |

---

## Hackathon Track Eligibility

| Track | Prize | Fit |
|-------|------:|-----|
| **Arc — Chain Abstracted USDC Apps** | $3,000 | Arc as settlement hub. Capital distributed to 5+ chains via CCTP, reallocated dynamically by TEE. User interacts with one app on one chain. Multiple blockchains as one liquidity surface. |
| **Arc — Agentic Economy with Nanopayments** | $6,000 | Each agent is an autonomous economic entity paying for API calls, compute, and data via USDC nanopayments on Arc. Self-regulating budgets. |
| **Chainlink — Best Workflow with CRE** | $4,000 | Full agent cycle as CRE Workflow: cron triggers, Confidential HTTP for agent communication, TEE fusion, on-chain execution. Event triggers for emergencies. |
| **Chainlink — Privacy Standard** | $2,000 | Confidential Compute is the product's core. Without the TEE, agents can't fuse proposals privately and cross-chain allocation can't be hidden. TEE attestation for verifiability. |
| **Chainlink — Connect the World** | $1,000 | Chainlink Data Feeds for decentralized price data. Multiple Chainlink services driving on-chain state changes. |
| **0G — Best DeFi App on 0G** | $6,000 | Agents run ML inference on 0G Compute. Memory on 0G Storage. Models fine-tuned via 0G. Attestations on 0G Chain. 0G's track literally asks for "multi-agent DeFi swarm." |
| **Total Potential** | **$22,000** | |

---

## Technical Summary

| Component | Technology | Role in ArcMind |
|-----------|------------|-----------------|
| Settlement Hub | Arc (Circle L1) | Vault, arcMIND tokens, USDC gas, nanopayments, CCTP hub |
| USDC Transport | Circle CCTP + Gateway | Cross-chain capital distribution and reallocation, <500ms |
| Orchestration | Chainlink CRE | Workflow for 30s agent cycles, event triggers for emergencies |
| Private Brain | Chainlink Confidential Compute | TEE for proposal fusion, strategy validation, cross-chain allocation, TX signing |
| Data Feeds | Chainlink Data Feeds | Decentralized token prices |
| AI Compute | 0G Compute | Agent ML inference (yield prediction, risk scoring, anomaly detection) |
| Memory | 0G Storage | Persistent yield histories, performance logs, fine-tuned models |
| Audit Trail | 0G Chain | TEE attestation anchoring, public verifiability |
| Smart Contracts | Solidity (EVM) | ERC-4626 vault on Arc, strategy contracts on each chain |

---

<p align="center">
  <i>One agent per chain. Each blind to the others.<br>
  A TEE that sees everything for milliseconds, then forgets.<br>
  Capital that flows to where it earns the most.<br>
  Built on Arc. Private by Chainlink. Computed on 0G.</i>
</p>

<p align="center">
  <b>You can't copy a strategy that exists nowhere.<br>
  You can't predict an allocation that emerges from blind proposals.<br>
  You can't compromise a system where each piece knows nothing about the whole.</b>
</p>

<p align="center">
  <i>ArcMind — Autonomous AI agents for cross-chain DeFi.</i>
</p>
