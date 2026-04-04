// shared/types.ts — Types TypeScript partages entre agents (Ali) et orchestrator (Julie)

// === PROPOSAL (Agent -> TEE) ===

export interface AgentProposal {
  agent: ChainName;
  timestamp: number;
  strategy: Strategy;
  allocation_curve: AllocationCurvePoint[];
  safety: SafetyAssessment;
  current_capital: number;
  optimal_capital: number;
  min_useful_capital: number;
  confidence: number;
  last_7d_actual_yield: number;
  prediction_accuracy_30d: number;
}

export type ChainName = "ETH" | "BASE" | "ARB";

export interface Strategy {
  positions: Position[];
  harvest: HarvestPlan;
}

export interface Position {
  protocol: string;
  pool_id: string;
  action: "deposit" | "withdraw" | "harvest";
  amount_pct: number;
  raw_yield: number;
  post_deposit_yield: number;
  incentive_boost?: number;
  effective_yield?: number;
  reasoning: string;
}

export interface HarvestPlan {
  pending_rewards_usd: number;
  harvest_profitable: boolean;
  optimal_harvest_time: string;
  reasoning: string;
}

export interface AllocationCurvePoint {
  capital: number;
  blended_yield: number;
}

export interface SafetyAssessment {
  overall_score: number;
  protocol_scores: Record<string, number>;
  alerts: RiskAlert[];
  chain_health: ChainHealth;
}

export interface RiskAlert {
  type: "tvl_drain" | "admin_activity" | "oracle_failure" | "depeg" | "sequencer_down";
  severity: "warning" | "critical" | "emergency";
  message: string;
  timestamp: number;
}

export interface ChainHealth {
  sequencer: string;
  gas_gwei: number;
  recent_reorgs: number;
}

// === TEE RESPONSE (TEE -> Agent) ===

export interface TEEResponse {
  agent: ChainName;
  approved: boolean;
  txBlobs: SignedTxBlob[];
  newBudget?: number;
  message: string;
}

export interface SignedTxBlob {
  chain: ChainName;
  signedTx: string;
  type: "strategy_execution" | "cctp_bridge" | "harvest" | "noop";
}

// === REALLOCATION ===

export interface ReallocationPlan {
  allocations: ChainAllocation[];
  movements: CCTPMovement[];
  totalCapital: number;
  buffer: number;
  timestamp: number;
}

export interface ChainAllocation {
  chain: ChainName;
  capital: number;
  targetYield: number;
  safetyScore: number;
}

export interface CCTPMovement {
  from: ChainName | "arc";
  to: ChainName | "arc";
  amount: number;
  domainFrom: number;
  domainTo: number;
  cctpCost: number;
  projected24hGain: number;
}
