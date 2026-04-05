import { YieldData, RateModelParams } from "../core/types";
import { ChainName } from "../core/types";

const DEFILLAMA_YIELDS_URL = "https://yields.llama.fi/pools";

// Map our chain names to DeFiLlama chain names
const CHAIN_MAP: Record<ChainName, string> = {
  ETH: "Ethereum",
  AVAX: "Avalanche",
  OP: "Optimism",
  ARB: "Arbitrum",
  BASE: "Base",
  POLY: "Polygon",
  UNICHAIN: "Unichain",
  LINEA: "Linea",
  SONIC: "Sonic",
  WORLD: "World Chain",
  SEI: "Sei",
  BNB: "BSC",
  INK: "Ink",
};

interface LlamaPool {
  chain: string;
  project: string;
  symbol: string;
  tvlUsd: number;
  apy: number;
  apyBase: number | null;
  apyReward: number | null;
  pool: string;
  stablecoin: boolean;
  ilRisk: string;
  exposure: string;
  apyMean30d: number | null;
  apyPct1D: number | null;
  apyPct7D: number | null;
  predictions: { predictedClass: string; predictedProbability: number } | null;
}

/**
 * Fetches LIVE yield data from DeFiLlama for all USDC lending pools
 * on a given chain. No API key needed, free, real-time data.
 *
 * This replaces the hardcoded data feeds with real protocol yields.
 */
export class DeFiLlamaProvider {
  private chain: ChainName;
  private llamaChain: string;
  private cache: LlamaPool[] = [];
  private lastFetch: number = 0;
  private cacheTTL: number = 60_000; // Refresh every 60 seconds (rate-limit friendly)

  constructor(chain: ChainName) {
    this.chain = chain;
    this.llamaChain = CHAIN_MAP[chain] || chain;
  }

  /**
   * Fetch all USDC yield pools on this chain from DeFiLlama.
   * Returns sorted by TVL (highest first), filtered for quality.
   */
  async fetchPools(): Promise<LlamaPool[]> {
    const now = Date.now();
    if (this.cache.length > 0 && now - this.lastFetch < this.cacheTTL) {
      return this.cache;
    }

    try {
      const response = await fetch(DEFILLAMA_YIELDS_URL);
      if (!response.ok) {
        throw new Error(`DeFiLlama API error: ${response.status}`);
      }

      const json = await response.json() as { status: string; data: LlamaPool[] };
      if (json.status !== "success") {
        throw new Error("DeFiLlama returned non-success status");
      }

      // Filter: our chain + USDC + stablecoin + reasonable TVL
      this.cache = json.data
        .filter((p) =>
          p.chain === this.llamaChain &&
          p.stablecoin === true &&
          (p.symbol || "").toUpperCase().includes("USDC") &&
          p.tvlUsd > 100_000 && // Minimum $100K TVL
          p.apy > 0 &&
          p.apy < 100 && // Filter out crazy outliers
          p.ilRisk === "no" // No impermanent loss risk
        )
        .sort((a, b) => b.tvlUsd - a.tvlUsd); // Sort by TVL descending

      this.lastFetch = now;
      console.log(
        `[${this.chain}][DEFILLAMA] Fetched ${this.cache.length} USDC pools on ${this.llamaChain}`
      );

      return this.cache;
    } catch (error: any) {
      console.error(`[${this.chain}][DEFILLAMA] Fetch failed: ${error.message}`);
      return this.cache; // Return stale cache if available
    }
  }

  /**
   * Convert DeFiLlama pools to our YieldData format.
   * Takes the top N pools by TVL.
   */
  async getYieldData(maxPools: number = 10): Promise<YieldData[]> {
    const pools = await this.fetchPools();
    const topPools = pools.slice(0, maxPools);

    return topPools.map((pool) => {
      const supplyAPY = pool.apyBase ?? pool.apy;
      const rewardAPY = pool.apyReward ?? 0;
      const utilization = this.estimateUtilization(supplyAPY);

      return {
        protocol: pool.project,
        poolId: pool.pool,
        chain: this.chain,
        supplyRateAPY: round2(supplyAPY),
        borrowRateAPY: round2(supplyAPY / Math.max(utilization, 0.01) * 1.1),
        utilization: round4(utilization),
        totalSupply: Math.round(pool.tvlUsd / Math.max(utilization, 0.01)),
        totalBorrow: Math.round(pool.tvlUsd),
        tvl: Math.round(pool.tvlUsd),
        rewardAPY: round2(rewardAPY),
        effectiveAPY: round2(pool.apy),
        lastUpdated: Date.now(),
      };
    });
  }

  /**
   * Estimate rate model params from observed APY.
   * Since DeFiLlama doesn't give us the rate model directly,
   * we reverse-engineer approximate params.
   */
  getRateModelParams(protocol: string): RateModelParams {
    const pool = this.cache.find((p) => p.project === protocol);
    const apy = pool?.apy ?? 4.0;

    // Estimate: higher APY usually means steeper slope and higher utilization
    if (apy > 7) {
      return { baseRate: 0.015, slope1: 0.05, slope2: 0.85, kink: 0.82 };
    } else if (apy > 5) {
      return { baseRate: 0.012, slope1: 0.045, slope2: 0.78, kink: 0.83 };
    } else if (apy > 3) {
      return { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 };
    } else {
      return { baseRate: 0.008, slope1: 0.035, slope2: 0.70, kink: 0.85 };
    }
  }

  /**
   * Get pool count on this chain.
   */
  getPoolCount(): number {
    return this.cache.length;
  }

  /**
   * Get summary string for logging.
   */
  getSummary(): string {
    if (this.cache.length === 0) return "No pools loaded";
    const top3 = this.cache.slice(0, 3);
    return top3
      .map((p) => `${p.project}: ${p.apy.toFixed(2)}% ($${(p.tvlUsd / 1e6).toFixed(1)}M)`)
      .join(" | ");
  }

  /**
   * Estimate utilization from supply APY.
   * Higher APY generally means higher utilization.
   */
  private estimateUtilization(supplyAPY: number): number {
    // Rough mapping: 2% APY ≈ 65% util, 5% APY ≈ 78%, 8% APY ≈ 85%
    const u = 0.55 + Math.min(supplyAPY / 100 * 4, 0.40);
    return Math.min(Math.max(u, 0.30), 0.95);
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
