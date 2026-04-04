// ============================================================
// ArcMind Agent Types
// ============================================================

export type ChainName =
  | "ETH"       // Domain 0 — Ethereum
  | "AVAX"      // Domain 1 — Avalanche
  | "OP"        // Domain 2 — Optimism
  | "ARB"       // Domain 3 — Arbitrum
  | "BASE"      // Domain 6 — Base
  | "POLY"      // Domain 7 — Polygon PoS
  | "UNICHAIN"  // Domain 10 — Unichain
  | "LINEA"     // Domain 11 — Linea
  | "SONIC"     // Domain 13 — Sonic
  | "WORLD"     // Domain 14 — World Chain
  | "SEI"       // Domain 16 — Sei
  | "BNB"       // Domain 17 — BNB Smart Chain
  | "INK";      // Domain 21 — Ink

// === Market Data ===

export interface YieldData {
  protocol: string;
  poolId: string;
  chain: string;
  supplyRateAPY: number;
  borrowRateAPY: number;
  utilization: number;
  totalSupply: number;
  totalBorrow: number;
  tvl: number;
  rewardAPY: number;
  effectiveAPY: number;
  lastUpdated: number;
}

export interface RateModelParams {
  baseRate: number;
  slope1: number;
  slope2: number;
  kink: number;
}

// === Risk ===

export interface RiskCheck {
  name: string;
  passed: boolean;
  isCritical: boolean;
  score: number;
  message: string;
}

export interface RiskAlert {
  type: "tvl_drain" | "admin_activity" | "oracle_failure" | "depeg" | "sequencer_down";
  severity: "warning" | "critical" | "emergency";
  message: string;
  timestamp: number;
}

export interface RiskScore {
  protocol: string;
  overallScore: number;
  alerts: RiskAlert[];
  details: RiskCheck[];
}

// === Strategy ===

export interface AllocationCurvePoint {
  capital: number;
  blended_yield: number;
}

export interface AllocationSplit {
  protocol: string;
  poolId: string;
  percentage: number;
  rawYield: number;
  postDepositYield: number;
  reasoning: string;
}

export interface PoolData {
  protocol: string;
  poolId: string;
  totalSupply: number;
  totalBorrow: number;
  rateModel: RateModelParams;
  currentAPY: number;
  rewardAPY: number;
}

// === Proposal (Agent -> TEE) ===

export interface AgentProposal {
  agent: ChainName;
  timestamp: number;
  strategy: {
    positions: ProposalPosition[];
    harvest: HarvestPlan;
  };
  allocation_curve: AllocationCurvePoint[];
  safety: SafetyAssessment;
  current_capital: number;
  optimal_capital: number;
  min_useful_capital: number;
  confidence: number;
  last_7d_actual_yield: number;
  prediction_accuracy_30d: number;
}

export interface ProposalPosition {
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

export interface SafetyAssessment {
  overall_score: number;
  protocol_scores: Record<string, number>;
  alerts: RiskAlert[];
  chain_health: {
    sequencer: string;
    gas_gwei: number;
    recent_reorgs: number;
  };
}

// === TEE Response (TEE -> Agent) ===

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

// === Performance ===

export interface PredictionRecord {
  predicted: number;
  actual: number;
  timestamp: number;
}

export interface PerformanceHistory {
  recentAccuracy: number;
  accuracy30d: number;
  last7dYield: number;
  records: PredictionRecord[];
}

// === Position Tracking ===

export interface ActivePosition {
  protocol: string;
  poolId: string;
  amount: number;
  entryYield: number;
  entryTimestamp: number;
}
