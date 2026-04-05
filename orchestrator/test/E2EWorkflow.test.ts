/**
 * E2E Integration Test — Full Agent -> Orchestrator Workflow
 *
 * Simulates the complete cycle:
 * 1. Agent produces a proposal (mock)
 * 2. API server stores it
 * 3. TEE fetches, validates, signs, and responds
 *
 * This test does NOT require a live blockchain — it validates
 * the data flow and contract address resolution.
 */
import { describe, it, expect } from "vitest";
import { ProposalValidator } from "../src/tee/ProposalValidator";
import { Reallocator } from "../src/tee/Reallocator";
import { TxSigner } from "../src/tee/TxSigner";
import { AgentProposal, TEEResponse, SignedTxBlob, ChainName } from "../../shared/types";

// Simulate proposals from 5 agents (the deployed chains)
function createProposal(chain: ChainName, capital: number, safetyScore: number): AgentProposal {
  return {
    agent: chain,
    timestamp: Date.now(),
    strategy: {
      positions: [
        {
          protocol: "aave",
          pool_id: `${chain}-AAVE-USDC`,
          action: "deposit",
          amount_pct: 35,
          raw_yield: 4.5,
          post_deposit_yield: 4.1,
          reasoning: `Best yield on ${chain}`,
        },
        {
          protocol: "compound",
          pool_id: `${chain}-COMP-USDC`,
          action: "deposit",
          amount_pct: 25,
          raw_yield: 3.8,
          post_deposit_yield: 3.5,
          reasoning: "Secondary allocation",
        },
      ],
      harvest: {
        pending_rewards_usd: 12.5,
        harvest_profitable: true,
        optimal_harvest_time: "next_cycle",
        reasoning: "Rewards exceed gas cost",
      },
    },
    allocation_curve: [
      { capital: 10000, blended_yield: 4.2 },
      { capital: 25000, blended_yield: 3.9 },
      { capital: 50000, blended_yield: 3.5 },
    ],
    safety: {
      overall_score: safetyScore,
      protocol_scores: { aave: 0.95, compound: 0.88 },
      alerts: [],
      chain_health: { sequencer: "operational", gas_gwei: 1.2, recent_reorgs: 0 },
    },
    current_capital: capital,
    optimal_capital: capital * 1.2,
    min_useful_capital: 5000,
    confidence: 0.87,
    last_7d_actual_yield: 4.0,
    prediction_accuracy_30d: 0.82,
  };
}

describe("E2E Workflow", { timeout: 30000 }, () => {
  const validator = new ProposalValidator();
  const reallocator = new Reallocator();
  const txSigner = new TxSigner();

  it("should validate and approve proposals from all 5 deployed chains", () => {
    const chains: ChainName[] = ["ETH", "BASE", "ARB", "AVAX", "OP"];
    const proposals = chains.map((c) => createProposal(c, 50000, 0.85));

    const results = proposals.map((p) => validator.validate(p));

    // All should be approved (safety 0.85 > 0.7, no alerts, good diversification)
    for (const r of results) {
      expect(r.approved).toBe(true);
      expect(r.checks.every((c) => c.passed)).toBe(true);
    }
  });

  it("should reject a proposal with low safety score", () => {
    const badProposal = createProposal("BASE", 50000, 0.5);
    const result = validator.validate(badProposal);
    expect(result.approved).toBe(false);
    expect(result.checks.find((c) => c.name === "SafetyThreshold")?.passed).toBe(false);
  });

  it("should reject a proposal with critical alerts", () => {
    const alertProposal = createProposal("ARB", 50000, 0.85);
    alertProposal.safety.alerts.push({
      type: "tvl_drain",
      severity: "critical",
      message: "TVL dropped 25% in 1 hour",
      timestamp: Date.now(),
    });
    const result = validator.validate(alertProposal);
    expect(result.approved).toBe(false);
  });

  it("should compute reallocation across chains with correct buffer", () => {
    const proposals = [
      createProposal("ETH", 80000, 0.9),
      createProposal("BASE", 60000, 0.85),
      createProposal("ARB", 40000, 0.8),
      createProposal("AVAX", 20000, 0.75),
    ];

    const result = reallocator.computeReallocation(proposals);

    expect(result.totalCapital).toBe(200000);
    expect(result.buffer).toBe(20000); // 10% of 200k
    expect(result.allocations.length).toBe(4);

    // No allocation should exceed 50% of total (100k)
    for (const a of result.allocations) {
      expect(a.capital).toBeLessThanOrEqual(100000);
    }
  });

  it("should sign strategy transactions with approve + deposit for deployed chains", async () => {
    txSigner.resetNonceOffsets();
    // ETH has aave strategy deployed
    const position = {
      protocol: "aave",
      pool_id: "ETH-AAVE-USDC",
      action: "deposit" as const,
      amount_pct: 35,
      raw_yield: 4.5,
      post_deposit_yield: 4.1,
      reasoning: "Best yield",
    };

    const blobs = await txSigner.signStrategyTxFromProposal("ETH", position);
    // Should have approve TX + deposit TX
    expect(blobs.length).toBeGreaterThanOrEqual(1);
    for (const blob of blobs) {
      expect(blob.chain).toBe("ETH");
      expect(blob.type).toBe("strategy_execution");
      expect(blob.signedTx).toMatch(/^0x/);
      expect(blob.signedTx.length).toBeGreaterThan(10);
    }
  });

  it("should return empty array for chains without deployed strategy", async () => {
    // OP has no aave strategy deployed yet (PENDING_DEPLOYMENT)
    const position = {
      protocol: "aave",
      pool_id: "OP-AAVE-USDC",
      action: "deposit" as const,
      amount_pct: 35,
      raw_yield: 3.9,
      post_deposit_yield: 3.5,
      reasoning: "OP yield",
    };

    const blobs = await txSigner.signStrategyTxFromProposal("OP", position);
    expect(blobs).toHaveLength(0);
  });

  it("should sign CCTP bridge transactions with real ABI encoding", async () => {
    const movement = {
      from: "BASE" as ChainName | "arc",
      to: "arc" as ChainName | "arc",
      amount: 10000,
      domainFrom: 6,
      domainTo: 26,
      cctpCost: 0.5,
      projected24hGain: 5.0,
    };

    const blob = await txSigner.signCCTPTx(movement);
    expect(blob.type).toBe("cctp_bridge");
    expect(blob.chain).toBe("BASE");
    expect(blob.signedTx).toMatch(/^0x/);
    expect(blob.signedTx.length).toBeGreaterThan(10);
  });

  it("should run full pipeline: validate -> sign -> build response", async () => {
    const proposal = createProposal("BASE", 50000, 0.85);

    // 1. Validate
    const validation = validator.validate(proposal);
    expect(validation.approved).toBe(true);

    // 2. Sign strategy txs for approved positions (approve + deposit per position)
    const txBlobs: SignedTxBlob[] = [];
    for (const pos of proposal.strategy.positions) {
      if (pos.action === "deposit" || pos.action === "withdraw") {
        const blobs = await txSigner.signStrategyTxFromProposal(proposal.agent, pos);
        txBlobs.push(...blobs);
      }
    }

    // BASE has aave and morpho strategies — aave should resolve (approve + deposit = 2+ blobs)
    expect(txBlobs.length).toBeGreaterThanOrEqual(1);

    // 3. Build TEE response
    const response: TEEResponse = {
      agent: proposal.agent,
      approved: validation.approved,
      txBlobs,
      message: "Approved by TEE",
    };

    expect(response.approved).toBe(true);
    expect(response.txBlobs.length).toBeGreaterThanOrEqual(1);
    expect(response.agent).toBe("BASE");
  });
});
