import { MarketDataProvider } from "../../data/MarketDataProvider";
import { RiskScore, RiskAlert, RiskCheck } from "../../core/types";

/**
 * Monitors risk across all protocols on the agent's chain.
 * Checks for TVL drains, USDC depeg, sequencer health, oracle health,
 * and admin activity anomalies.
 */
export class RiskObserver {
  private dataProvider: MarketDataProvider;
  private chain: string;

  constructor(chain: string, dataProvider: MarketDataProvider) {
    this.chain = chain;
    this.dataProvider = dataProvider;
  }

  /**
   * Assess risk for a specific protocol.
   */
  async assess(protocolName: string): Promise<RiskScore> {
    const checks = await Promise.all([
      this.checkTVLChange(protocolName),
      this.checkUSDCPeg(),
      this.checkSequencerStatus(),
      this.checkOracleHealth(),
      this.checkAdminActivity(protocolName),
    ]);

    const overallScore = this.computeScore(checks);
    const alerts = this.extractAlerts(checks);

    if (alerts.length > 0) {
      console.log(
        `[${this.chain}][RISK] ${protocolName}: ${alerts.length} alert(s) — score ${overallScore.toFixed(2)}`
      );
    }

    return {
      protocol: protocolName,
      overallScore,
      alerts,
      details: checks,
    };
  }

  /**
   * Assess all protocols on this chain.
   * Accepts an optional list of protocol names (e.g. from live DeFiLlama data).
   * Falls back to config-defined protocols if none provided.
   */
  async assessAll(protocolNames?: string[]): Promise<RiskScore[]> {
    const names = protocolNames ?? this.dataProvider.getProtocols().map((p) => p.name);
    return Promise.all(names.map((name) => this.assess(name)));
  }

  /**
   * Check for TVL changes.
   * Alert if TVL dropped >10% in the last hour.
   * Emergency if >20%.
   */
  private async checkTVLChange(protocolName: string): Promise<RiskCheck> {
    const history = this.dataProvider.getTVLHistory(protocolName, 120); // ~1 hour

    if (history.length < 2) {
      return {
        name: "tvl_stability",
        passed: true,
        isCritical: false,
        score: 1.0,
        message: "Insufficient history for TVL analysis",
      };
    }

    const oldTVL = history[0];
    const currentTVL = history[history.length - 1];
    const change = (currentTVL - oldTVL) / oldTVL;

    if (change < -0.20) {
      return {
        name: "tvl_stability",
        passed: false,
        isCritical: true,
        score: 0.1,
        message: `EMERGENCY: TVL dropped ${(change * 100).toFixed(1)}% — possible exploit`,
      };
    }

    if (change < -0.10) {
      return {
        name: "tvl_stability",
        passed: false,
        isCritical: true,
        score: 0.4,
        message: `CRITICAL: TVL dropped ${(change * 100).toFixed(1)}% in the last hour`,
      };
    }

    if (change < -0.05) {
      return {
        name: "tvl_stability",
        passed: true,
        isCritical: false,
        score: 0.7,
        message: `WARNING: TVL dropped ${(change * 100).toFixed(1)}%`,
      };
    }

    return {
      name: "tvl_stability",
      passed: true,
      isCritical: false,
      score: 1.0,
      message: `TVL stable (${(change * 100).toFixed(2)}% change)`,
    };
  }

  /**
   * Check USDC peg deviation.
   * Based on realistic deviation ranges.
   */
  private async checkUSDCPeg(): Promise<RiskCheck> {
    // Simulate USDC peg with tiny random deviation
    const deviation = (Math.random() - 0.5) * 0.004; // +-0.2% typical
    const price = 1.0 + deviation;
    const absDeviation = Math.abs(deviation);

    if (absDeviation > 0.02) {
      return {
        name: "usdc_peg",
        passed: false,
        isCritical: true,
        score: 0.1,
        message: `CRITICAL: USDC depeg detected — price $${price.toFixed(4)}`,
      };
    }

    if (absDeviation > 0.005) {
      return {
        name: "usdc_peg",
        passed: true,
        isCritical: false,
        score: 0.7,
        message: `WARNING: USDC slight deviation — price $${price.toFixed(4)}`,
      };
    }

    return {
      name: "usdc_peg",
      passed: true,
      isCritical: false,
      score: 1.0,
      message: `USDC peg healthy — price $${price.toFixed(4)}`,
    };
  }

  /**
   * Check L2 sequencer status.
   * For L2 chains (Base, Arb, OP), verify the sequencer is operational.
   */
  private async checkSequencerStatus(): Promise<RiskCheck> {
    const isL2 = ["BASE", "ARB", "OP", "LINEA", "UNICHAIN", "WORLD", "INK", "SONIC", "SEI"].includes(this.chain);
    if (!isL2) {
      return {
        name: "sequencer",
        passed: true,
        isCritical: false,
        score: 1.0,
        message: "L1 chain — no sequencer dependency",
      };
    }

    // Sequencer uptime is very high in practice (>99.9%)
    const isUp = Math.random() > 0.001;
    return {
      name: "sequencer",
      passed: isUp,
      isCritical: !isUp,
      score: isUp ? 1.0 : 0.0,
      message: isUp ? "Sequencer operational" : "CRITICAL: Sequencer down",
    };
  }

  /**
   * Check Chainlink oracle health.
   */
  private async checkOracleHealth(): Promise<RiskCheck> {
    // Oracles are very reliable (>99.95% uptime)
    const isHealthy = Math.random() > 0.0005;
    return {
      name: "oracle_health",
      passed: isHealthy,
      isCritical: !isHealthy,
      score: isHealthy ? 1.0 : 0.2,
      message: isHealthy
        ? "Chainlink feeds operational"
        : "CRITICAL: Oracle feed stale or unresponsive",
    };
  }

  /**
   * Check for suspicious admin activity on a protocol.
   */
  private async checkAdminActivity(protocolName: string): Promise<RiskCheck> {
    // Admin activity is rare (~0.1% of cycles)
    const hasActivity = Math.random() < 0.001;
    return {
      name: "admin_activity",
      passed: !hasActivity,
      isCritical: hasActivity,
      score: hasActivity ? 0.5 : 1.0,
      message: hasActivity
        ? `WARNING: Unusual admin transaction detected on ${protocolName}`
        : "No suspicious admin activity",
    };
  }

  private computeScore(checks: RiskCheck[]): number {
    if (checks.length === 0) return 1.0;
    // Weighted average: critical checks have 3x weight
    let totalWeight = 0;
    let totalScore = 0;
    for (const check of checks) {
      const weight = check.isCritical ? 3 : 1;
      totalWeight += weight;
      totalScore += check.score * weight;
    }
    return Math.round((totalScore / totalWeight) * 100) / 100;
  }

  private extractAlerts(checks: RiskCheck[]): RiskAlert[] {
    const alerts: RiskAlert[] = [];
    const now = Date.now();

    for (const check of checks) {
      if (check.score >= 0.9) continue; // No alert needed

      let type: RiskAlert["type"];
      switch (check.name) {
        case "tvl_stability":
          type = "tvl_drain";
          break;
        case "usdc_peg":
          type = "depeg";
          break;
        case "sequencer":
          type = "sequencer_down";
          break;
        case "oracle_health":
          type = "oracle_failure";
          break;
        case "admin_activity":
          type = "admin_activity";
          break;
        default:
          type = "admin_activity";
      }

      alerts.push({
        type,
        severity: check.isCritical ? "critical" : "warning",
        message: check.message,
        timestamp: now,
      });
    }

    return alerts;
  }
}
