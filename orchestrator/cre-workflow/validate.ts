// ═══════════════════════════════════════════════════════════════
// ArcMind TEE — Proposal Validation (CRE-compatible, pure logic)
//
// Runs inside the DON. Each node validates independently,
// then consensus ensures they all agree on the result.
//
// Security rules enforced:
//   1. Safety threshold (overall_score >= 0.7)
//   2. No critical alerts
//   3. Diversification (max 40% per protocol)
//   4. Yield coherence (post_deposit_yield < raw_yield)
//   5. Capital bounds check
// ═══════════════════════════════════════════════════════════════

export interface ValidationResult {
  agent: string;
  approved: boolean;
  reasons: string[];
  checks: Array<{
    name: string;
    passed: boolean;
    message: string;
  }>;
}

interface Proposal {
  agent: string;
  safety: {
    overall_score: number;
    alerts: Array<{ severity: string; message: string }>;
  };
  strategy: {
    positions: Array<{
      protocol: string;
      amount_pct: number;
      raw_yield: number;
      post_deposit_yield: number;
    }>;
  };
  current_capital: number;
  confidence: number;
}

export function validateProposal(
  proposal: Proposal,
  safetyThreshold: number,
  maxProtocolPct: number
): ValidationResult {
  const checks: ValidationResult["checks"] = [];
  const reasons: string[] = [];

  // 1. Safety threshold
  const safetyPassed = proposal.safety.overall_score >= safetyThreshold;
  checks.push({
    name: "SafetyThreshold",
    passed: safetyPassed,
    message: safetyPassed
      ? `Safety ${proposal.safety.overall_score.toFixed(2)} >= ${safetyThreshold}`
      : `Safety ${proposal.safety.overall_score.toFixed(2)} < ${safetyThreshold}`,
  });
  if (!safetyPassed) reasons.push(`Safety below ${safetyThreshold}`);

  // 2. No critical alerts
  const criticalAlerts = proposal.safety.alerts.filter(
    a => a.severity === "critical" || a.severity === "emergency"
  );
  const noAlerts = criticalAlerts.length === 0;
  checks.push({
    name: "NoCriticalAlerts",
    passed: noAlerts,
    message: noAlerts
      ? "No critical alerts"
      : `${criticalAlerts.length} critical alert(s): ${criticalAlerts.map(a => a.message).join("; ")}`,
  });
  if (!noAlerts) reasons.push("Critical alerts detected");

  // 3. Diversification — no position over maxProtocolPct
  let diversified = true;
  for (const pos of proposal.strategy.positions) {
    if (pos.amount_pct > maxProtocolPct) {
      diversified = false;
      reasons.push(`Position over ${maxProtocolPct}%: ${pos.protocol} at ${pos.amount_pct}%`);
    }
  }
  checks.push({
    name: "Diversification",
    passed: diversified,
    message: diversified
      ? `All positions <= ${maxProtocolPct}%`
      : `Position(s) exceed ${maxProtocolPct}%`,
  });

  // 4. Yield coherence — post_deposit_yield must be < raw_yield
  let yieldCoherent = true;
  for (const pos of proposal.strategy.positions) {
    if (pos.post_deposit_yield >= pos.raw_yield) {
      yieldCoherent = false;
      reasons.push(
        `Incoherent yields: ${pos.protocol} post=${pos.post_deposit_yield} >= raw=${pos.raw_yield}`
      );
    }
  }
  checks.push({
    name: "YieldCoherence",
    passed: yieldCoherent,
    message: yieldCoherent
      ? "All post-deposit yields < raw yields"
      : "Incoherent yields detected",
  });

  // 5. Capital bounds
  const capitalOk = proposal.current_capital > 0 && proposal.current_capital < 100_000_000;
  checks.push({
    name: "CapitalBounds",
    passed: capitalOk,
    message: capitalOk
      ? `Capital $${proposal.current_capital} in bounds`
      : `Capital $${proposal.current_capital} out of bounds`,
  });
  if (!capitalOk) reasons.push("Capital out of bounds");

  return {
    agent: proposal.agent,
    approved: checks.every(c => c.passed),
    reasons,
    checks,
  };
}
