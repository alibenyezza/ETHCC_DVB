import { describe, it, expect } from 'vitest';
import { Reallocator } from '../src/tee/Reallocator';
import { AgentProposal } from '../../shared/types';
import { SecurityRules } from '../src/tee/SecurityRules';

describe('Reallocator', () => {
  const reallocator = new Reallocator();

  const createMockProposals = (): AgentProposal[] => [
    {
      agent: "BASE",
      timestamp: Date.now(),
      strategy: { positions: [], harvest: { pending_rewards_usd: 0, harvest_profitable: false, optimal_harvest_time: "", reasoning: "" } },
      allocation_curve: [],
      safety: { overall_score: 0.9, protocol_scores: {}, alerts: [], chain_health: { sequencer: "ok", gas_gwei: 0, recent_reorgs: 0 } },
      current_capital: 100000,
      optimal_capital: 15000,
      min_useful_capital: 1000,
      confidence: 0.9,
      last_7d_actual_yield: 5,
      prediction_accuracy_30d: 0.9
    },
    {
      agent: "ARB",
      timestamp: Date.now(),
      strategy: { positions: [], harvest: { pending_rewards_usd: 0, harvest_profitable: false, optimal_harvest_time: "", reasoning: "" } },
      allocation_curve: [],
      safety: { overall_score: 0.8, protocol_scores: {}, alerts: [], chain_health: { sequencer: "ok", gas_gwei: 0, recent_reorgs: 0 } },
      current_capital: 50000,
      optimal_capital: 15000,
      min_useful_capital: 1000,
      confidence: 0.9,
      last_7d_actual_yield: 4,
      prediction_accuracy_30d: 0.8
    }
  ];

  it('should calculate reallocation properly with buffer on ARC', () => {
    const proposals = createMockProposals();
    const result = reallocator.computeReallocation(proposals);
    
    // totalCapital = 150000
    expect(result.totalCapital).toBe(150000);
    expect(result.buffer).toBe(15000); // 10%
    
    // Test that the allocations array is generated
    expect(result.allocations.length).toBe(2);
    // Arbitrarily checking that it didn't mutate structure but balanced target (mock algorithm test)
    expect(result.allocations[0].capital).toBeLessThanOrEqual(150000 * (SecurityRules.MAX_CHAIN_PCT/100));
  });

});
