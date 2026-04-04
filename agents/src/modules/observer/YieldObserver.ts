import { MarketDataProvider } from "../../data/MarketDataProvider";
import { YieldData } from "../../core/types";

/**
 * Observes and collects yield data from all protocols on the agent's chain.
 * Maintains an observation log for the learning module.
 */
export class YieldObserver {
  private dataProvider: MarketDataProvider;
  private observationLog: YieldData[][] = [];
  private chain: string;

  constructor(chain: string, dataProvider: MarketDataProvider) {
    this.chain = chain;
    this.dataProvider = dataProvider;
  }

  /**
   * Collect current yield data from all protocols.
   * Each call captures a fresh snapshot of the market.
   */
  async observe(): Promise<YieldData[]> {
    const yields = await this.dataProvider.getYieldData();

    // Log observation for learning
    this.observationLog.push(yields);
    if (this.observationLog.length > 720) {
      this.observationLog.shift();
    }

    this.logObservation(yields);
    return yields;
  }

  /**
   * Get the best yielding protocol from the latest observation.
   */
  getBestYield(yields: YieldData[]): YieldData | undefined {
    return yields.reduce<YieldData | undefined>((best, current) => {
      if (!best || current.effectiveAPY > best.effectiveAPY) return current;
      return best;
    }, undefined);
  }

  /**
   * Get recent observations for trend analysis.
   */
  getRecentObservations(count: number): YieldData[][] {
    return this.observationLog.slice(-count);
  }

  /**
   * Calculate average yield over recent observations for a protocol.
   */
  getAverageYield(protocolName: string, cycles: number = 10): number {
    const recent = this.observationLog.slice(-cycles);
    if (recent.length === 0) return 0;

    let totalYield = 0;
    let count = 0;
    for (const observation of recent) {
      const proto = observation.find((y) => y.protocol === protocolName);
      if (proto) {
        totalYield += proto.effectiveAPY;
        count++;
      }
    }
    return count > 0 ? totalYield / count : 0;
  }

  private logObservation(yields: YieldData[]): void {
    const summary = yields
      .map((y) => `${y.protocol}: ${y.effectiveAPY.toFixed(2)}%`)
      .join(" | ");
    console.log(`[${this.chain}][OBSERVE] ${summary}`);
  }
}
