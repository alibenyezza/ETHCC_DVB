import { AllocationCurvePoint, YieldData, PoolData, RateModelParams } from "../../core/types";
import { DepositImpact } from "../reasoner/DepositImpact";
import { MarketDataProvider } from "../../data/MarketDataProvider";

/**
 * Generates the blended yield curve across all protocols on the chain.
 * The curve shows: "if the TEE gives me X capital, I can deliver Y% blended yield."
 * This is the key input for cross-chain reallocation decisions.
 */
export class YieldCurveGenerator {
  private depositImpact: DepositImpact;
  private dataProvider: MarketDataProvider;

  constructor(dataProvider: MarketDataProvider, depositImpact: DepositImpact) {
    this.dataProvider = dataProvider;
    this.depositImpact = depositImpact;
  }

  /**
   * Generate the blended yield curve across all protocols.
   * For each capital amount, compute the optimal split and resulting blended yield.
   */
  generate(yields: YieldData[]): AllocationCurvePoint[] {
    const capitalLevels = [10_000, 20_000, 35_000, 50_000, 75_000, 100_000];

    return capitalLevels.map((capital) => {
      const blendedYield = this.computeBlendedYield(yields, capital);
      return {
        capital,
        blended_yield: Math.round(blendedYield * 100) / 100,
      };
    });
  }

  /**
   * Compute optimal capital for this chain.
   * The point where marginal yield starts dropping below a threshold.
   */
  computeOptimalCapital(yields: YieldData[]): number {
    const curve = this.generate(yields);
    const minAcceptableYield = 2.0; // 2% minimum

    // Find the highest capital where yield is still above threshold
    let optimal = curve[0].capital;
    for (const point of curve) {
      if (point.blended_yield >= minAcceptableYield) {
        optimal = point.capital;
      }
    }
    return optimal;
  }

  private computeBlendedYield(yields: YieldData[], totalCapital: number): number {
    // Build pool data from yields
    const pools: PoolData[] = yields.map((y) => {
      const rateModel = this.dataProvider.getRateModelParams(y.protocol);
      return {
        protocol: y.protocol,
        poolId: y.poolId,
        totalSupply: y.totalSupply,
        totalBorrow: y.totalBorrow,
        rateModel: rateModel || { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 },
        currentAPY: y.supplyRateAPY,
        rewardAPY: y.rewardAPY,
      };
    });

    // Use deposit impact to compute optimal split
    const split = this.depositImpact.computeOptimalSplit(pools, totalCapital);

    // Weighted average of post-deposit yields
    let blended = 0;
    for (const alloc of split) {
      blended += alloc.postDepositYield * (alloc.percentage / 100);
    }

    return blended;
  }
}
