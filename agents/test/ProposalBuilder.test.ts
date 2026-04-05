import { describe, it, expect } from "vitest";
import { ProposalBuilder } from "../src/modules/proposer/ProposalBuilder";
import { RiskScorer } from "../src/modules/reasoner/RiskScorer";
import { YieldData, RiskScore, AllocationSplit, AllocationCurvePoint, PerformanceHistory } from "../src/core/types";

describe("ProposalBuilder", () => {
  const riskScorer = new RiskScorer();
  const builder = new ProposalBuilder(riskScorer);

  const yieldData: YieldData[] = [
    {
      protocol: "aave",
      poolId: "BASE-AAVE-USDC",
      chain: "BASE",
      supplyRateAPY: 4.2,
      borrowRateAPY: 5.9,
      utilization: 0.78,
      totalSupply: 57_692_308,
      totalBorrow: 45_000_000,
      tvl: 45_000_000,
      rewardAPY: 0,
      effectiveAPY: 4.2,
      lastUpdated: Date.now(),
    },
    {
      protocol: "morpho",
      poolId: "BASE-MORPHO-USDC-001",
      chain: "BASE",
      supplyRateAPY: 6.8,
      borrowRateAPY: 9.1,
      utilization: 0.82,
      totalSupply: 14_634_146,
      totalBorrow: 12_000_000,
      tvl: 12_000_000,
      rewardAPY: 0.3,
      effectiveAPY: 7.1,
      lastUpdated: Date.now(),
    },
  ];

  const riskScores: RiskScore[] = [
    {
      protocol: "aave",
      overallScore: 0.95,
      alerts: [],
      details: [],
    },
    {
      protocol: "morpho",
      overallScore: 0.88,
      alerts: [],
      details: [],
    },
  ];

  const splits: AllocationSplit[] = [
    {
      protocol: "morpho",
      poolId: "BASE-MORPHO-USDC-001",
      percentage: 65,
      rawYield: 6.8,
      postDepositYield: 5.9,
      reasoning: "Best risk-adjusted yield",
    },
    {
      protocol: "aave",
      poolId: "BASE-AAVE-USDC",
      percentage: 35,
      rawYield: 4.2,
      postDepositYield: 3.8,
      reasoning: "Diversification buffer",
    },
  ];

  const yieldCurve: AllocationCurvePoint[] = [
    { capital: 10000, blended_yield: 6.5 },
    { capital: 20000, blended_yield: 6.1 },
    { capital: 50000, blended_yield: 5.2 },
  ];

  const history: PerformanceHistory = {
    recentAccuracy: 0.82,
    accuracy30d: 0.78,
    last7dYield: 5.4,
    records: [],
  };

  it("should build a valid proposal with all required fields", () => {
    const proposal = builder.build("BASE", yieldData, riskScores, splits, yieldCurve, 35000, 40000, history);

    expect(proposal.agent).toBe("BASE");
    expect(proposal.timestamp).toBeGreaterThan(0);
    expect(proposal.strategy).toBeDefined();
    expect(proposal.strategy.positions).toHaveLength(2);
    expect(proposal.strategy.harvest).toBeDefined();
    expect(proposal.allocation_curve).toHaveLength(3);
    expect(proposal.safety).toBeDefined();
    expect(proposal.current_capital).toBe(35000);
    expect(proposal.optimal_capital).toBe(40000);
    expect(proposal.min_useful_capital).toBe(5000);
  });

  it("safety score should be between 0 and 1", () => {
    const proposal = builder.build("BASE", yieldData, riskScores, splits, yieldCurve, 35000, 40000, history);
    expect(proposal.safety.overall_score).toBeGreaterThanOrEqual(0);
    expect(proposal.safety.overall_score).toBeLessThanOrEqual(1);
  });

  it("positions percentages should sum to 100", () => {
    const proposal = builder.build("BASE", yieldData, riskScores, splits, yieldCurve, 35000, 40000, history);
    const totalPct = proposal.strategy.positions.reduce((sum, p) => sum + p.amount_pct, 0);
    expect(totalPct).toBe(100);
  });

  it("confidence should be capped at 0.95", () => {
    const highHistory: PerformanceHistory = { ...history, recentAccuracy: 0.99 };
    const proposal = builder.build("BASE", yieldData, riskScores, splits, yieldCurve, 35000, 40000, highHistory);
    expect(proposal.confidence).toBeLessThanOrEqual(0.95);
  });

  it("protocol_scores should include all protocols", () => {
    const proposal = builder.build("BASE", yieldData, riskScores, splits, yieldCurve, 35000, 40000, history);
    expect(proposal.safety.protocol_scores).toHaveProperty("aave");
    expect(proposal.safety.protocol_scores).toHaveProperty("morpho");
  });
});
