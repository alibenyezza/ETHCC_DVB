import { AgentConfig } from "../core/AgentConfig";

export function createBnbConfig(): AgentConfig {
  return {
    chain: "BNB",
    chainId: 97,
    rpc: process.env.BNB_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
    privateKey: process.env.AGENT_BNB_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "BNB-AAVE-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 },
        baseData: {
          baseAPY: 4.1,
          utilization: 0.75,
          tvl: 55_000_000,
          totalSupply: 73_333_333,
          totalBorrow: 55_000_000,
          rewardAPY: 0,
        },
      },
      {
        type: "compound_v3",
        name: "venus",
        poolId: "BNB-VENUS-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.01, slope1: 0.045, slope2: 0.80, kink: 0.80 },
        baseData: {
          baseAPY: 5.8,
          utilization: 0.82,
          tvl: 120_000_000,
          totalSupply: 146_341_463,
          totalBorrow: 120_000_000,
          rewardAPY: 1.2,
        },
      },
      {
        type: "compound_v3",
        name: "radiant",
        poolId: "BNB-RADIANT-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.012, slope1: 0.05, slope2: 0.85, kink: 0.82 },
        baseData: {
          baseAPY: 7.2,
          utilization: 0.84,
          tvl: 15_000_000,
          totalSupply: 17_857_143,
          totalBorrow: 15_000_000,
          rewardAPY: 2.5,
        },
      },
    ],
    zg: {
      privateKey: process.env.ZG_PRIVATE_KEY || "",
      rpc: process.env.ZG_RPC || "https://evmrpc-testnet.0g.ai",
      indexerRpc: process.env.ZG_INDEXER_RPC || "https://indexer-storage-testnet-turbo.0g.ai",
    },
    tee: {
      proposalEndpoint: process.env.TEE_PROPOSAL_ENDPOINT || "",
      responseEndpoint: process.env.TEE_RESPONSE_ENDPOINT || "",
    },
    cycleIntervalMs: parseInt(process.env.CYCLE_INTERVAL_MS || "30000"),
    initialCapital: parseInt(process.env.INITIAL_CAPITAL || "50000"),
  };
}
