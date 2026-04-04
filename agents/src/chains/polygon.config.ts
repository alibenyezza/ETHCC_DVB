import { AgentConfig } from "../core/AgentConfig";

export function createPolygonConfig(): AgentConfig {
  return {
    chain: "POLY",
    chainId: 80002,
    rpc: process.env.POLY_AMOY_RPC || "https://rpc-amoy.polygon.technology",
    privateKey: process.env.AGENT_POLY_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "POLY-AAVE-USDC",
        usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 },
        baseData: {
          baseAPY: 3.5,
          utilization: 0.72,
          tvl: 42_000_000,
          totalSupply: 58_333_333,
          totalBorrow: 42_000_000,
          rewardAPY: 0,
        },
      },
      {
        type: "compound_v3",
        name: "compound",
        poolId: "POLY-COMP-USDC",
        usdcAddress: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
        rateModel: { baseRate: 0.008, slope1: 0.035, slope2: 0.70, kink: 0.85 },
        baseData: {
          baseAPY: 2.9,
          utilization: 0.68,
          tvl: 22_000_000,
          totalSupply: 32_352_941,
          totalBorrow: 22_000_000,
          rewardAPY: 0.15,
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
