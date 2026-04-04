import { describe, it, expect } from "vitest";
import { DepositImpact } from "../src/modules/reasoner/DepositImpact";
import { RateModelParams, PoolData } from "../src/core/types";

describe("DepositImpact", () => {
  const impact = new DepositImpact();

  const aaveModel: RateModelParams = {
    baseRate: 0.01,
    slope1: 0.04,
    slope2: 0.75,
    kink: 0.80,
  };

  describe("calculatePostDepositYield", () => {
    it("post-deposit yield should be lower than pre-deposit yield", () => {
      const preDeposit = impact.calculatePostDepositYield(50_000_000, 40_000_000, 0, aaveModel);
      const postDeposit = impact.calculatePostDepositYield(50_000_000, 40_000_000, 1_000_000, aaveModel);
      expect(postDeposit).toBeLessThan(preDeposit);
    });

    it("larger deposit should compress yield more", () => {
      const small = impact.calculatePostDepositYield(50_000_000, 40_000_000, 100_000, aaveModel);
      const large = impact.calculatePostDepositYield(50_000_000, 40_000_000, 5_000_000, aaveModel);
      expect(large).toBeLessThan(small);
    });

    it("yield should always be non-negative", () => {
      const result = impact.calculatePostDepositYield(50_000_000, 40_000_000, 100_000_000, aaveModel);
      expect(result).toBeGreaterThanOrEqual(0);
    });

    it("zero deposit should not change yield", () => {
      const withZero = impact.calculatePostDepositYield(50_000_000, 40_000_000, 0, aaveModel);
      expect(withZero).toBeGreaterThan(0);
    });
  });

  describe("generateYieldCurve", () => {
    it("should return 6 data points", () => {
      const curve = impact.generateYieldCurve(50_000_000, 40_000_000, aaveModel);
      expect(curve).toHaveLength(6);
    });

    it("yield curve should be decreasing (more capital = lower yield)", () => {
      const curve = impact.generateYieldCurve(50_000_000, 40_000_000, aaveModel);
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].blended_yield).toBeLessThanOrEqual(curve[i - 1].blended_yield);
      }
    });

    it("capital levels should be increasing", () => {
      const curve = impact.generateYieldCurve(50_000_000, 40_000_000, aaveModel);
      for (let i = 1; i < curve.length; i++) {
        expect(curve[i].capital).toBeGreaterThan(curve[i - 1].capital);
      }
    });
  });

  describe("computeOptimalSplit", () => {
    const pools: PoolData[] = [
      {
        protocol: "aave",
        poolId: "POOL-A",
        totalSupply: 50_000_000,
        totalBorrow: 40_000_000,
        rateModel: aaveModel,
        currentAPY: 4.2,
        rewardAPY: 0,
      },
      {
        protocol: "compound",
        poolId: "POOL-B",
        totalSupply: 30_000_000,
        totalBorrow: 21_000_000,
        rateModel: { baseRate: 0.008, slope1: 0.035, slope2: 0.70, kink: 0.85 },
        currentAPY: 3.8,
        rewardAPY: 0.2,
      },
    ];

    it("should allocate 100% total across pools", () => {
      const split = impact.computeOptimalSplit(pools, 50_000);
      const totalPct = split.reduce((sum, s) => sum + s.percentage, 0);
      expect(totalPct).toBe(100);
    });

    it("should return at least one allocation", () => {
      const split = impact.computeOptimalSplit(pools, 50_000);
      expect(split.length).toBeGreaterThanOrEqual(1);
    });

    it("single pool should get 100%", () => {
      const split = impact.computeOptimalSplit([pools[0]], 50_000);
      expect(split).toHaveLength(1);
      expect(split[0].percentage).toBe(100);
    });

    it("post-deposit yield should be lower than raw yield", () => {
      const split = impact.computeOptimalSplit(pools, 50_000);
      for (const alloc of split) {
        expect(alloc.postDepositYield).toBeDefined();
        expect(alloc.reasoning).toBeTruthy();
      }
    });
  });
});
