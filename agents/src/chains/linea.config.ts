import { AgentConfig } from "../core/AgentConfig";

export function createLineaConfig(): AgentConfig {
  return {
    chain: "LINEA",
    chainId: 59141,
    rpc: process.env.LINEA_SEPOLIA_RPC || "https://rpc.sepolia.linea.build",
    privateKey: process.env.AGENT_LINEA_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "LINEA-AAVE-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.012, slope1: 0.042, slope2: 0.78, kink: 0.80 },
        baseData: {
          baseAPY: 5.1,
          utilization: 0.76,
          tvl: 18_000_000,
          totalSupply: 23_684_211,
          totalBorrow: 18_000_000,
          rewardAPY: 0.7,
        },
      },
      {
        type: "compound_v3",
        name: "zerolend",
        poolId: "LINEA-ZEROLEND-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.015, slope1: 0.05, slope2: 0.80, kink: 0.82 },
        baseData: {
          baseAPY: 6.2,
          utilization: 0.81,
          tvl: 8_000_000,
          totalSupply: 9_876_543,
          totalBorrow: 8_000_000,
          rewardAPY: 1.1,
        },
      },
      {
        type: "compound_v3",
        name: "mendi",
        poolId: "LINEA-MENDI-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.011, slope1: 0.04, slope2: 0.72, kink: 0.83 },
        baseData: {
          baseAPY: 4.8,
          utilization: 0.74,
          tvl: 5_000_000,
          totalSupply: 6_756_757,
          totalBorrow: 5_000_000,
          rewardAPY: 0.9,
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
