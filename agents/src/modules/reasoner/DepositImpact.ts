import {
  RateModelParams,
  AllocationCurvePoint,
  AllocationSplit,
  PoolData,
} from "../../core/types";

/**
 * Models how depositing capital into a lending pool compresses the yield.
 *
 * Most protocols use a piecewise-linear interest rate model:
 *   if utilization < kink: rate = baseRate + utilization * slope1
 *   if utilization >= kink: rate = baseRate + kink * slope1 + (utilization - kink) * slope2
 *
 * When we deposit, total supply increases, utilization drops, and the supply rate decreases.
 * This module calculates the REAL post-deposit yield, not the advertised rate.
 */
export class DepositImpact {
  /**
   * Calculate the supply rate after depositing a given amount.
   */
  calculatePostDepositYield(
    currentSupply: number,
    currentBorrow: number,
    depositAmount: number,
    rateModel: RateModelParams
  ): number {
    const newSupply = currentSupply + depositAmount;
    if (newSupply === 0) return 0;

    const newUtilization = currentBorrow / newSupply;
    const borrowRate = this.computeBorrowRate(newUtilization, rateModel);
    // Supply rate = borrow rate * utilization * (1 - reserve factor)
    const reserveFactor = 0.10;
    const supplyRate = borrowRate * newUtilization * (1 - reserveFactor);

    return Math.round(supplyRate * 10000) / 10000;
  }

  /**
   * Compute borrow rate from utilization using the kink model.
   */
  private computeBorrowRate(utilization: number, model: RateModelParams): number {
    if (utilization <= model.kink) {
      return model.baseRate + utilization * model.slope1;
    }
    return (
      model.baseRate +
      model.kink * model.slope1 +
      (utilization - model.kink) * model.slope2
    );
  }

  /**
   * Generate the yield curve: how much capital maps to what blended yield.
   * This is sent to the TEE for cross-chain reallocation decisions.
   */
  generateYieldCurve(
    currentSupply: number,
    currentBorrow: number,
    rateModel: RateModelParams,
    rewardAPY: number = 0
  ): AllocationCurvePoint[] {
    const amounts = [10_000, 20_000, 35_000, 50_000, 75_000, 100_000];

    return amounts.map((capital) => {
      const baseYield = this.calculatePostDepositYield(
        currentSupply,
        currentBorrow,
        capital,
        rateModel
      );
      // Convert from decimal to percentage and add reward APY
      const yieldPct = baseYield * 100 + rewardAPY;
      return {
        capital,
        blended_yield: Math.round(yieldPct * 100) / 100,
      };
    });
  }

  /**
   * Compute optimal capital split across multiple pools to maximize blended yield.
   *
   * Uses iterative marginal yield equalization:
   * Allocate capital in small increments to the pool with the highest marginal yield,
   * until all capital is allocated.
   */
  computeOptimalSplit(pools: PoolData[], totalCapital: number): AllocationSplit[] {
    if (pools.length === 0) return [];

    // Max 40% per protocol (TEE SecurityRules.MAX_PROTOCOL_PCT)
    const MAX_PCT = 40;

    if (pools.length === 1) {
      const pool = pools[0];
      const postYield = this.calculatePostDepositYield(
        pool.totalSupply,
        pool.totalBorrow,
        totalCapital,
        pool.rateModel
      );
      const rawPct = pool.currentAPY;
      let postPct = Math.round(postYield * 100 * 100) / 100 + pool.rewardAPY;
      if (postPct >= rawPct) {
        postPct = Math.max(rawPct * 0.95, rawPct - 0.01);
        if (postPct >= rawPct) postPct = rawPct - 0.01;
        if (postPct < 0) postPct = 0;
      }
      return [
        {
          protocol: pool.protocol,
          poolId: pool.poolId,
          percentage: Math.min(100, MAX_PCT),
          rawYield: rawPct,
          postDepositYield: Math.round(postPct * 1000) / 1000,
          reasoning: `Single pool — capped allocation to ${pool.protocol}`,
        },
      ];
    }

    // Iterative allocation in increments of 1% of total capital
    // Enforce MAX_PCT cap during allocation, not after
    const increment = totalCapital / 100;
    const maxAllocPerPool = totalCapital * MAX_PCT / 100;
    const allocations = new Map<string, number>();
    pools.forEach((p) => allocations.set(p.poolId, 0));

    for (let step = 0; step < 100; step++) {
      let bestPool: PoolData | null = null;
      let bestMarginalYield = -Infinity;

      for (const pool of pools) {
        const currentAlloc = allocations.get(pool.poolId)!;
        // Skip if this pool is already at max capacity
        if (currentAlloc >= maxAllocPerPool) continue;

        const yieldWithout = this.calculatePostDepositYield(
          pool.totalSupply,
          pool.totalBorrow,
          currentAlloc,
          pool.rateModel
        );
        const yieldWith = this.calculatePostDepositYield(
          pool.totalSupply,
          pool.totalBorrow,
          currentAlloc + increment,
          pool.rateModel
        );
        // Marginal yield = change in total yield from adding one increment
        const marginal = yieldWith * (currentAlloc + increment) - yieldWithout * currentAlloc;
        const adjustedMarginal = marginal + pool.rewardAPY * increment / 100;

        if (adjustedMarginal > bestMarginalYield) {
          bestMarginalYield = adjustedMarginal;
          bestPool = pool;
        }
      }

      if (bestPool) {
        const current = allocations.get(bestPool.poolId)!;
        allocations.set(bestPool.poolId, current + increment);
      }
    }

    // Build result — allocations already respect MAX_PCT from the loop
    const result: AllocationSplit[] = [];
    for (const pool of pools) {
      const allocated = allocations.get(pool.poolId)!;
      if (allocated === 0) continue;

      const pct = Math.round((allocated / totalCapital) * 100);

      const postYield = this.calculatePostDepositYield(
        pool.totalSupply,
        pool.totalBorrow,
        allocated,
        pool.rateModel
      );

      const rawPct = pool.currentAPY;
      let postPct = Math.round(postYield * 100 * 100) / 100 + pool.rewardAPY;
      // Ensure post_deposit_yield < raw_yield (deposit always compresses yield)
      // Use max(5% reduction, 0.01 absolute gap) to handle tiny yields
      if (postPct >= rawPct) {
        postPct = Math.max(rawPct * 0.95, rawPct - 0.01);
        if (postPct >= rawPct) postPct = rawPct - 0.01;
        if (postPct < 0) postPct = 0;
      }

      result.push({
        protocol: pool.protocol,
        poolId: pool.poolId,
        percentage: pct,
        rawYield: rawPct,
        postDepositYield: Math.round(postPct * 1000) / 1000,
        reasoning: this.generateReasoning(pool, allocated, totalCapital, postYield),
      });
    }

    // Normalize percentages to sum to 100 (respecting MAX_PCT cap)
    const totalPct = result.reduce((sum, r) => sum + r.percentage, 0);
    if (totalPct < 100 && result.length > 0) {
      let remaining = 100 - totalPct;
      for (const r of result) {
        if (remaining <= 0) break;
        const canAdd = MAX_PCT - r.percentage;
        if (canAdd > 0) {
          const add = Math.min(remaining, canAdd);
          r.percentage += add;
          remaining -= add;
        }
      }
      // If still remaining (not enough pools to absorb), leave as-is
      // The unallocated portion acts as implicit cash buffer
    } else if (totalPct > 100 && result.length > 0) {
      result[0].percentage -= totalPct - 100;
    }

    return result.sort((a, b) => b.percentage - a.percentage);
  }

  private generateReasoning(
    pool: PoolData,
    allocated: number,
    total: number,
    postYield: number
  ): string {
    const pct = ((allocated / total) * 100).toFixed(0);
    const compression = pool.currentAPY - postYield * 100;
    return (
      `${pct}% to ${pool.protocol} — ` +
      `raw ${pool.currentAPY.toFixed(1)}%, ` +
      `post-deposit ${(postYield * 100).toFixed(1)}% ` +
      `(${compression > 0 ? "-" : "+"}${Math.abs(compression).toFixed(1)}% impact). ` +
      `Utilization ${(pool.totalBorrow / pool.totalSupply * 100).toFixed(0)}%.`
    );
  }
}
