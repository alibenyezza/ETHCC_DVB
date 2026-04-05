// ═══════════════════════════════════════════════════════════════
// ArcMind TEE — Cross-Chain Capital Reallocation (CRE-compatible)
//
// Computes optimal capital distribution across chains.
// Runs every 6 hours (not every cycle) to avoid churn.
//
// Rules:
//   - Max 50% per chain (MAX_CHAIN_PCT)
//   - 10% buffer kept liquid (BUFFER_PCT)
//   - Movement must project 2x cost over 24h (MIN_REALLOC_GAIN_MULTIPLIER)
// ═══════════════════════════════════════════════════════════════

export interface ChainAllocation {
  chain: string;
  capital: number;
  targetYield: number;
  safetyScore: number;
}

export interface CCTPMovement {
  from: string;
  to: string;
  amount: number;
  domainFrom: number;
  domainTo: number;
  cctpCost: number;
  projected24hGain: number;
}

export interface ReallocationResult {
  allocations: ChainAllocation[];
  movements: CCTPMovement[];
  totalCapital: number;
  buffer: number;
  timestamp: number;
}

// CCTP V2 domain IDs
const DOMAIN_IDS: Record<string, number> = {
  ETH: 0, AVAX: 1, OP: 2, ARB: 3, BASE: 6,
  POLY: 7, UNICHAIN: 10, LINEA: 11, SONIC: 13,
  WORLD: 14, SEI: 16, BNB: 17, INK: 21,
};

let lastReallocationTime = 0;
const REALLOC_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

export function shouldReallocate(): boolean {
  const now = Date.now();
  if (now - lastReallocationTime >= REALLOC_INTERVAL_MS) {
    lastReallocationTime = now;
    return true;
  }
  return false;
}

interface Proposal {
  agent: string;
  current_capital: number;
  optimal_capital: number;
  safety: { overall_score: number };
  allocation_curve: Array<{ capital: number; blended_yield: number }>;
}

export function computeReallocation(
  proposals: Proposal[],
  maxChainPct: number,
  bufferPct: number
): ReallocationResult {
  const totalCapital = proposals.reduce((sum, p) => sum + p.current_capital, 0);
  const buffer = totalCapital * (bufferPct / 100);
  const deployable = totalCapital - buffer;
  const maxPerChain = totalCapital * (maxChainPct / 100);

  // Score each chain: safety * best yield estimate
  const scored = proposals.map(p => {
    const bestYield = p.allocation_curve.length > 0
      ? p.allocation_curve[0].blended_yield
      : 0;
    return {
      chain: p.agent,
      score: p.safety.overall_score * bestYield,
      safetyScore: p.safety.overall_score,
      bestYield,
      currentCapital: p.current_capital,
      optimalCapital: p.optimal_capital,
    };
  }).sort((a, b) => b.score - a.score);

  // Allocate proportionally to score, capped at maxPerChain
  const totalScore = scored.reduce((sum, s) => sum + s.score, 0);
  const allocations: ChainAllocation[] = [];
  let allocated = 0;

  for (const s of scored) {
    const raw = totalScore > 0
      ? (s.score / totalScore) * deployable
      : deployable / scored.length;
    const capped = Math.min(raw, maxPerChain);
    const capital = Math.min(capped, deployable - allocated);

    allocations.push({
      chain: s.chain,
      capital: Math.round(capital),
      targetYield: s.bestYield,
      safetyScore: s.safetyScore,
    });
    allocated += capital;
  }

  // Compute movements (delta between current and target)
  const movements: CCTPMovement[] = [];
  const sources: Array<{ chain: string; surplus: number }> = [];
  const sinks: Array<{ chain: string; deficit: number }> = [];

  for (const alloc of allocations) {
    const current = scored.find(s => s.chain === alloc.chain)?.currentCapital || 0;
    const delta = alloc.capital - current;
    if (delta < -1000) {
      sources.push({ chain: alloc.chain, surplus: -delta });
    } else if (delta > 1000) {
      sinks.push({ chain: alloc.chain, deficit: delta });
    }
  }

  // Match sources to sinks
  for (const sink of sinks) {
    for (const source of sources) {
      if (source.surplus <= 0 || sink.deficit <= 0) continue;
      const amount = Math.min(source.surplus, sink.deficit);
      const cctpCost = 0.5; // $0.50 per bridge
      const yieldDiff = (
        (scored.find(s => s.chain === sink.chain)?.bestYield || 0) -
        (scored.find(s => s.chain === source.chain)?.bestYield || 0)
      );
      const projected24hGain = (amount * yieldDiff / 100) / 365;

      // Only move if gain > 2x cost
      if (projected24hGain > cctpCost * 2) {
        movements.push({
          from: source.chain,
          to: sink.chain,
          amount: Math.round(amount),
          domainFrom: DOMAIN_IDS[source.chain] || 0,
          domainTo: DOMAIN_IDS[sink.chain] || 0,
          cctpCost,
          projected24hGain: Math.round(projected24hGain * 100) / 100,
        });
        source.surplus -= amount;
        sink.deficit -= amount;
      }
    }
  }

  return {
    allocations,
    movements,
    totalCapital,
    buffer: Math.round(buffer),
    timestamp: Date.now(),
  };
}
