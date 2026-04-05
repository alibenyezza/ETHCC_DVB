import {
  ChainName,
  YieldData,
  RiskScore,
  AllocationSplit,
  AllocationCurvePoint,
  AgentProposal,
  ProposalPosition,
  HarvestPlan,
  PerformanceHistory,
  RiskAlert,
} from "../../core/types";
import { RiskScorer } from "../reasoner/RiskScorer";

/**
 * Constructs the complete JSON proposal that gets sent to the TEE.
 * The format must exactly match the shared schema (shared/proposal.schema.json).
 */
export class ProposalBuilder {
  private riskScorer: RiskScorer;

  constructor(riskScorer: RiskScorer) {
    this.riskScorer = riskScorer;
  }

  /**
   * Build a complete proposal for the TEE.
   */
  build(
    chain: ChainName,
    yieldData: YieldData[],
    riskScores: RiskScore[],
    optimalSplit: AllocationSplit[],
    yieldCurve: AllocationCurvePoint[],
    currentCapital: number,
    optimalCapital: number,
    history: PerformanceHistory
  ): AgentProposal {
    const proposal: AgentProposal = {
      agent: chain,
      timestamp: Math.floor(Date.now() / 1000),

      strategy: {
        positions: this.buildPositions(optimalSplit),
        harvest: this.buildHarvestPlan(yieldData),
      },

      allocation_curve: yieldCurve,

      safety: {
        overall_score: this.riskScorer.computeOverallScore(riskScores),
        protocol_scores: this.riskScorer.buildProtocolScoresMap(riskScores),
        alerts: this.collectAlerts(riskScores),
        chain_health: {
          sequencer: this.getSequencerStatus(riskScores),
          gas_gwei: this.estimateGas(chain),
          recent_reorgs: 0,
        },
      },

      current_capital: currentCapital,
      optimal_capital: optimalCapital,
      min_useful_capital: 5000,
      confidence: Math.min(history.recentAccuracy, 0.95),
      last_7d_actual_yield: history.last7dYield,
      prediction_accuracy_30d: history.accuracy30d,
    };

    console.log(
      `[${chain}][PROPOSE] ` +
        `Safety: ${proposal.safety.overall_score} | ` +
        `Positions: ${proposal.strategy.positions.length} | ` +
        `Capital: $${currentCapital.toLocaleString()}`
    );

    return proposal;
  }

  private buildPositions(splits: AllocationSplit[]): ProposalPosition[] {
    return splits.map((split) => ({
      protocol: split.protocol,
      pool_id: split.poolId,
      action: "deposit" as const,
      amount_pct: split.percentage,
      raw_yield: split.rawYield,
      post_deposit_yield: split.postDepositYield,
      reasoning: split.reasoning,
    }));
  }

  private buildHarvestPlan(yieldData: YieldData[]): HarvestPlan {
    // Estimate pending rewards based on reward APY
    const totalRewardAPY = yieldData.reduce((sum, y) => sum + y.rewardAPY, 0);
    const estimatedPendingUSD = totalRewardAPY * 10; // rough estimate

    return {
      pending_rewards_usd: Math.round(estimatedPendingUSD * 100) / 100,
      harvest_profitable: estimatedPendingUSD > 1.0, // profitable if > $1
      optimal_harvest_time: estimatedPendingUSD > 1.0 ? "now" : "wait",
      reasoning:
        estimatedPendingUSD > 1.0
          ? `$${estimatedPendingUSD.toFixed(2)} in pending rewards — harvest cost < $0.10`
          : `Only $${estimatedPendingUSD.toFixed(2)} pending — waiting for accumulation`,
    };
  }

  private collectAlerts(riskScores: RiskScore[]): RiskAlert[] {
    return riskScores.flatMap((r) => r.alerts);
  }

  private getSequencerStatus(riskScores: RiskScore[]): string {
    for (const score of riskScores) {
      const seqCheck = score.details.find((d) => d.name === "sequencer");
      if (seqCheck && !seqCheck.passed) return "down";
    }
    return "ok";
  }

  private estimateGas(chain: ChainName): number {
    const gasMap: Record<ChainName, number> = {
      ETH: 25.0,
      AVAX: 25.0,
      OP: 0.003,
      ARB: 0.1,
      BASE: 0.002,
      POLY: 30.0,
      UNICHAIN: 0.002,
      LINEA: 0.05,
      SONIC: 0.5,
      WORLD: 0.002,
      SEI: 0.01,
      BNB: 3.0,
      INK: 0.002,
    };
    // Add small random variation
    const base = gasMap[chain] || 1.0;
    return Math.round((base + base * (Math.random() - 0.5) * 0.2) * 1000) / 1000;
  }
}
