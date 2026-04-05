import { ProtocolSnapshot } from "./ChainDataFeeds";

/**
 * Applies realistic time-varying dynamics to baseline protocol data.
 *
 * Uses deterministic pseudo-random noise seeded from timestamps
 * to simulate natural DeFi market behavior:
 * - APY fluctuations (Brownian motion)
 * - Utilization drift
 * - TVL changes
 * - Rare events (yield spikes, TVL drains, incentive programs)
 */
export class DataSimulator {
  private state: Map<string, ProtocolState> = new Map();
  private cycleCount: number = 0;

  /**
   * Evolve the market data by one cycle (~30 seconds of simulated market time).
   * Each call produces a new snapshot with realistic variations.
   */
  evolve(baselines: ProtocolSnapshot[]): ProtocolSnapshot[] {
    this.cycleCount++;
    return baselines.map((baseline) => this.evolveProtocol(baseline));
  }

  private evolveProtocol(baseline: ProtocolSnapshot): ProtocolSnapshot {
    const key = baseline.poolId;
    let state = this.state.get(key);

    if (!state) {
      state = {
        apyOffset: 0,
        utilizationOffset: 0,
        tvlMultiplier: 1,
        eventActive: null,
        eventExpiry: 0,
      };
      this.state.set(key, state);
    }

    // Apply Brownian motion to APY (mean-reverting)
    state.apyOffset += this.gaussianNoise() * 0.08 - state.apyOffset * 0.05;
    state.apyOffset = clamp(state.apyOffset, -1.5, 2.0);

    // Utilization drifts slowly
    state.utilizationOffset += this.gaussianNoise() * 0.005 - state.utilizationOffset * 0.03;
    state.utilizationOffset = clamp(state.utilizationOffset, -0.10, 0.10);

    // TVL varies ~0.5% per cycle, mean-reverting
    const tvlDrift = this.gaussianNoise() * 0.003 - (state.tvlMultiplier - 1) * 0.02;
    state.tvlMultiplier = clamp(state.tvlMultiplier + tvlDrift, 0.70, 1.30);

    // Rare events (~1% chance per cycle)
    this.handleRareEvents(state, baseline);

    // Compute evolved values
    const utilization = clamp(baseline.utilization + state.utilizationOffset, 0.05, 0.98);
    const tvl = baseline.tvl * state.tvlMultiplier;
    const totalSupply = baseline.totalSupply * state.tvlMultiplier;
    const totalBorrow = totalSupply * utilization;

    let apyBoost = 0;
    let rewardBoost = 0;
    if (state.eventActive === "incentive_program") {
      rewardBoost = 1.2;
    } else if (state.eventActive === "yield_spike") {
      apyBoost = 1.8;
    }

    const supplyRateAPY = Math.max(0.1, baseline.supplyRateAPY + state.apyOffset + apyBoost);
    const rewardAPY = baseline.rewardAPY + rewardBoost;
    const borrowRateAPY = (supplyRateAPY / utilization) * 1.10;

    return {
      protocol: baseline.protocol,
      poolId: baseline.poolId,
      chain: baseline.chain,
      supplyRateAPY: round2(supplyRateAPY),
      borrowRateAPY: round2(borrowRateAPY),
      utilization: round4(utilization),
      totalSupply: Math.round(totalSupply),
      totalBorrow: Math.round(totalBorrow),
      tvl: Math.round(tvl),
      rewardAPY: round2(rewardAPY),
    };
  }

  private handleRareEvents(state: ProtocolState, baseline: ProtocolSnapshot): void {
    // Clear expired events
    if (state.eventActive && this.cycleCount > state.eventExpiry) {
      state.eventActive = null;
    }

    // Don't stack events
    if (state.eventActive) return;

    const roll = Math.random();

    if (roll < 0.003) {
      // TVL drain event (~0.3% per cycle = roughly once every 2.5 hours)
      state.tvlMultiplier *= 0.85;
      state.eventActive = "tvl_drain";
      state.eventExpiry = this.cycleCount + 20; // lasts ~10 minutes
    } else if (roll < 0.008) {
      // Yield spike (~0.5% per cycle)
      state.eventActive = "yield_spike";
      state.eventExpiry = this.cycleCount + 40; // lasts ~20 minutes
    } else if (roll < 0.012) {
      // New incentive program (~0.4% per cycle)
      state.eventActive = "incentive_program";
      state.eventExpiry = this.cycleCount + 2400; // lasts ~20 hours
    }
  }

  private gaussianNoise(): number {
    // Box-Muller transform for Gaussian noise
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  getActiveEvent(poolId: string): string | null {
    return this.state.get(poolId)?.eventActive || null;
  }

  getCycleCount(): number {
    return this.cycleCount;
  }
}

interface ProtocolState {
  apyOffset: number;
  utilizationOffset: number;
  tvlMultiplier: number;
  eventActive: "tvl_drain" | "yield_spike" | "incentive_program" | null;
  eventExpiry: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
