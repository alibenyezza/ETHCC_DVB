import { describe, it, expect } from 'vitest';
import { ProposalValidator } from '../src/tee/ProposalValidator';
import { AgentProposal } from '../../shared/types';
import { SecurityRules } from '../src/tee/SecurityRules';

describe('ProposalValidator', () => {
  const validator = new ProposalValidator();

  const createValidProposal = (): AgentProposal => ({
    agent: "BASE",
    timestamp: Date.now(),
    strategy: {
      positions: [
        {
          protocol: "Aave",
          pool_id: "0x123",
          action: "deposit",
          amount_pct: 35, // < MAX_PROTOCOL_PCT (40)
          raw_yield: 5,
          post_deposit_yield: 4.5, // < raw_yield
          reasoning: "Good yield"
        }
      ],
      harvest: {
        pending_rewards_usd: 10,
        harvest_profitable: true,
        optimal_harvest_time: "now",
        reasoning: "Profitable"
      }
    },
    allocation_curve: [{ capital: 10000, blended_yield: 4.5 }],
    safety: {
      overall_score: 0.8, // > SAFETY_THRESHOLD (0.7)
      protocol_scores: { "Aave": 0.9 },
      alerts: [],
      chain_health: { sequencer: "ok", gas_gwei: 10, recent_reorgs: 0 }
    },
    current_capital: 10000,
    optimal_capital: 15000,
    min_useful_capital: 1000,
    confidence: 0.9,
    last_7d_actual_yield: 4.2,
    prediction_accuracy_30d: 0.85
  });

  it('should approve a perfectly valid proposal', () => {
    const prop = createValidProposal();
    const result = validator.validate(prop);
    expect(result.approved).toBe(true);
  });

  it('should reject a proposal with safety score below threshold', () => {
    const prop = createValidProposal();
    prop.safety.overall_score = 0.5; // Below 0.7
    const result = validator.validate(prop);
    expect(result.approved).toBe(false);
    expect(result.checks.find(c => c.name === "SafetyThreshold")?.passed).toBe(false);
  });

  it('should reject a proposal with critical alerts', () => {
    const prop = createValidProposal();
    prop.safety.alerts.push({
      type: "admin_activity",
      severity: "critical",
      message: "Suspicious admin activity",
      timestamp: Date.now()
    });
    const result = validator.validate(prop);
    expect(result.approved).toBe(false);
    expect(result.checks.find(c => c.name === "CriticalAlerts")?.passed).toBe(false);
  });

  it('should reject a proposal with poor diversification (position > limits)', () => {
    const prop = createValidProposal();
    prop.strategy.positions[0].amount_pct = 50; // Above 40%
    const result = validator.validate(prop);
    expect(result.approved).toBe(false);
    expect(result.checks.find(c => c.name === "Diversification")?.passed).toBe(false);
  });

  it('should reject incoherent yields (post >= raw)', () => {
    const prop = createValidProposal();
    prop.strategy.positions[0].post_deposit_yield = 6; // Greater than raw_yield of 5
    const result = validator.validate(prop);
    expect(result.approved).toBe(false);
    expect(result.checks.find(c => c.name === "YieldCoherence")?.passed).toBe(false);
  });

});
