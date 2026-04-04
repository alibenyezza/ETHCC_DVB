import { ChainName, RateModelParams } from "./types";

export interface ProtocolConfig {
  type: "aave_v3" | "compound_v3" | "morpho" | "moonwell";
  name: string;
  poolId: string;
  contractAddress?: string;
  dataProviderAddress?: string;
  usdcAddress: string;
  rateModel: RateModelParams;
  baseData: {
    baseAPY: number;
    utilization: number;
    tvl: number;
    totalSupply: number;
    totalBorrow: number;
    rewardAPY: number;
  };
}

export interface AgentConfig {
  chain: ChainName;
  chainId: number;
  rpc: string;
  privateKey: string;
  protocols: ProtocolConfig[];
  zg: {
    privateKey: string;
    rpc: string;
    indexerRpc: string;
  };
  tee: {
    proposalEndpoint: string;
    responseEndpoint: string;
  };
  cycleIntervalMs: number;
  initialCapital: number;
}
