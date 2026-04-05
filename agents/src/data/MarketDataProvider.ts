import { AgentConfig, ProtocolConfig } from "../core/AgentConfig";
import { YieldData, RateModelParams, ChainName } from "../core/types";
import { ChainDataFeeds, ProtocolSnapshot } from "./ChainDataFeeds";
import { DataSimulator } from "./DataSimulator";
import { DeFiLlamaProvider } from "./DeFiLlamaProvider";

/**
 * Unified market data provider for an agent.
 *
 * Primary source: DeFiLlama API (real-time protocol yields from all chains).
 * Fallback: local baseline data with dynamic simulation when API is unavailable.
 *
 * This hybrid approach ensures agents always have data to work with,
 * while preferring live on-chain data when available.
 */
export class MarketDataProvider {
  private feeds: ChainDataFeeds;
  private simulator: DataSimulator;
  private config: AgentConfig;
  private tvlHistory: Map<string, number[]> = new Map();
  private latestSnapshots: ProtocolSnapshot[] = [];
  private latestYields: YieldData[] = [];

  // Live data from DeFiLlama
  private llamaProvider: DeFiLlamaProvider;
  private useLiveData: boolean = true;
  private liveDataAvailable: boolean = false;

  constructor(config: AgentConfig) {
    this.config = config;
    this.feeds = new ChainDataFeeds(config.chain, config.protocols);
    this.simulator = new DataSimulator();
    this.llamaProvider = new DeFiLlamaProvider(config.chain);
  }

  /**
   * Get current yield data for all protocols on this chain.
   * Tries DeFiLlama first, falls back to local simulation.
   */
  async getYieldData(): Promise<YieldData[]> {
    // Try live data from DeFiLlama
    if (this.useLiveData) {
      try {
        const liveYields = await this.llamaProvider.getYieldData(15);
        if (liveYields.length > 0) {
          this.liveDataAvailable = true;
          this.latestYields = liveYields;

          // Record TVL history
          for (const y of liveYields) {
            const history = this.tvlHistory.get(y.poolId) || [];
            history.push(y.tvl);
            if (history.length > 720) history.shift();
            this.tvlHistory.set(y.poolId, history);
          }

          return liveYields;
        }
      } catch (error: any) {
        console.log(`[${this.config.chain}][DATA] DeFiLlama unavailable, using local data`);
      }
    }

    // Fallback: local baseline + simulation
    this.liveDataAvailable = false;
    const baselines = this.feeds.getBaselineData();
    this.latestSnapshots = this.simulator.evolve(baselines);

    for (const snap of this.latestSnapshots) {
      const history = this.tvlHistory.get(snap.poolId) || [];
      history.push(snap.tvl);
      if (history.length > 720) history.shift();
      this.tvlHistory.set(snap.poolId, history);
    }

    this.latestYields = this.latestSnapshots.map((snap) => ({
      protocol: snap.protocol,
      poolId: snap.poolId,
      chain: snap.chain,
      supplyRateAPY: snap.supplyRateAPY,
      borrowRateAPY: snap.borrowRateAPY,
      utilization: snap.utilization,
      totalSupply: snap.totalSupply,
      totalBorrow: snap.totalBorrow,
      tvl: snap.tvl,
      rewardAPY: snap.rewardAPY,
      effectiveAPY: Math.round((snap.supplyRateAPY + snap.rewardAPY) * 100) / 100,
      lastUpdated: Date.now(),
    }));

    return this.latestYields;
  }

  /**
   * Get rate model parameters for deposit impact calculation.
   * Uses DeFiLlama-estimated params for live protocols, config params for known protocols.
   */
  getRateModelParams(protocolName: string): RateModelParams | undefined {
    // First check config (known protocols)
    const protocol = this.config.protocols.find((p) => p.name === protocolName);
    if (protocol?.rateModel) return protocol.rateModel;

    // For dynamically-discovered protocols, estimate from DeFiLlama data
    if (this.liveDataAvailable) {
      return this.llamaProvider.getRateModelParams(protocolName);
    }

    return undefined;
  }

  /**
   * Get TVL history for risk monitoring.
   */
  getTVLHistory(protocolName: string, maxEntries?: number): number[] {
    // Search by protocol name across all tracked pools
    for (const [poolId, history] of this.tvlHistory.entries()) {
      const yield_ = this.latestYields.find(
        (y) => y.protocol === protocolName || y.poolId === poolId
      );
      if (yield_ && yield_.protocol === protocolName) {
        if (maxEntries) return history.slice(-maxEntries);
        return history;
      }
    }

    // Fallback: check config protocols
    const protocol = this.config.protocols.find((p) => p.name === protocolName);
    if (!protocol) return [];
    const history = this.tvlHistory.get(protocol.poolId) || [];
    if (maxEntries) return history.slice(-maxEntries);
    return history;
  }

  /**
   * Get the latest snapshot for a specific protocol.
   */
  getLatestSnapshot(protocolName: string): ProtocolSnapshot | undefined {
    return this.latestSnapshots.find((s) => s.protocol === protocolName);
  }

  /**
   * Get active event (if any) for a protocol pool.
   */
  getActiveEvent(poolId: string): string | null {
    return this.simulator.getActiveEvent(poolId);
  }

  /**
   * Get all protocol configs for this chain.
   */
  getProtocols(): ProtocolConfig[] {
    return this.config.protocols;
  }

  /**
   * Whether the provider is currently using live DeFiLlama data.
   */
  isUsingLiveData(): boolean {
    return this.liveDataAvailable;
  }

  /**
   * Get a summary of live data status.
   */
  getDataSourceSummary(): string {
    if (this.liveDataAvailable) {
      return `DeFiLlama LIVE — ${this.llamaProvider.getPoolCount()} pools — ${this.llamaProvider.getSummary()}`;
    }
    return `Local data — ${this.config.protocols.length} protocols`;
  }
}
