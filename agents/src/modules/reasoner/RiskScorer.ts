import { RiskScore } from "../../core/types";

/**
 * Combines individual protocol risk scores into an overall chain-level assessment.
 * Weights by TVL (larger protocols matter more) and penalizes critical alerts.
 */
export class RiskScorer {
  /**
   * Compute a single overall safety score for the chain from all protocol scores.
   * Returns a value between 0.0 (extremely risky) and 1.0 (safe).
   */
  computeOverallScore(riskScores: RiskScore[]): number {
    if (riskScores.length === 0) return 1.0;

    // If ANY protocol has a critical alert, cap the overall score at 0.6
    const hasCritical = riskScores.some((r) =>
      r.alerts.some((a) => a.severity === "critical" || a.severity === "emergency")
    );

    // Weighted average of individual scores
    const total = riskScores.reduce((sum, r) => sum + r.overallScore, 0);
    let avg = total / riskScores.length;

    if (hasCritical) {
      avg = Math.min(avg, 0.6);
    }

    return Math.round(avg * 100) / 100;
  }

  /**
   * Build protocol_scores map for the proposal.
   */
  buildProtocolScoresMap(riskScores: RiskScore[]): Record<string, number> {
    const map: Record<string, number> = {};
    for (const score of riskScores) {
      map[score.protocol] = score.overallScore;
    }
    return map;
  }

  /**
   * Check if the chain is safe enough to operate.
   * Minimum threshold: 0.7
   */
  isSafeToOperate(riskScores: RiskScore[]): boolean {
    const overall = this.computeOverallScore(riskScores);
    return overall >= 0.7;
  }

  /**
   * Get protocols that should be excluded from strategy.
   * Any protocol with score < 0.5 is excluded.
   */
  getExcludedProtocols(riskScores: RiskScore[]): string[] {
    return riskScores
      .filter((r) => r.overallScore < 0.5)
      .map((r) => r.protocol);
  }
}
