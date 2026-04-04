import { ProtocolConfig } from "../core/AgentConfig";
import { ChainName } from "../core/types";

export interface ProtocolSnapshot {
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
}

/**
 * Provides baseline market data for each protocol on each chain.
 * These values reflect realistic DeFi market conditions and serve
 * as the foundation for the DataSimulator's dynamic variations.
 */
export class ChainDataFeeds {
  private chain: ChainName;
  private protocols: ProtocolConfig[];

  constructor(chain: ChainName, protocols: ProtocolConfig[]) {
    this.chain = chain;
    this.protocols = protocols;
  }

  getBaselineData(): ProtocolSnapshot[] {
    return this.protocols.map((p) => {
      const borrowRate = this.deriveBorrowRate(p);
      return {
        protocol: p.name,
        poolId: p.poolId,
        chain: this.chain,
        supplyRateAPY: p.baseData.baseAPY,
        borrowRateAPY: borrowRate,
        utilization: p.baseData.utilization,
        totalSupply: p.baseData.totalSupply,
        totalBorrow: p.baseData.totalBorrow,
        tvl: p.baseData.tvl,
        rewardAPY: p.baseData.rewardAPY,
      };
    });
  }

  getProtocolBaseline(protocolName: string): ProtocolSnapshot | undefined {
    const config = this.protocols.find((p) => p.name === protocolName);
    if (!config) return undefined;

    return {
      protocol: config.name,
      poolId: config.poolId,
      chain: this.chain,
      supplyRateAPY: config.baseData.baseAPY,
      borrowRateAPY: this.deriveBorrowRate(config),
      utilization: config.baseData.utilization,
      totalSupply: config.baseData.totalSupply,
      totalBorrow: config.baseData.totalBorrow,
      tvl: config.baseData.tvl,
      rewardAPY: config.baseData.rewardAPY,
    };
  }

  /**
   * Derive borrow rate from supply rate and utilization.
   * borrowRate = supplyRate / utilization * (1 + reserveFactor)
   * reserveFactor ~10% for most protocols
   */
  private deriveBorrowRate(config: ProtocolConfig): number {
    const reserveFactor = 0.10;
    const u = config.baseData.utilization;
    if (u === 0) return 0;
    return (config.baseData.baseAPY / u) * (1 + reserveFactor);
  }
}
