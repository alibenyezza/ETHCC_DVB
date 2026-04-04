import { AgentConfig } from "../core/AgentConfig";

export function createArbitrumConfig(): AgentConfig {
  return {
    chain: "ARB",
    chainId: 421614,
    rpc: process.env.ARB_SEPOLIA_RPC || "https://sepolia-rollup.arbitrum.io/rpc",
    privateKey: process.env.AGENT_ARB_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "ARB-AAVE-USDC",
        usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 },
        baseData: {
          baseAPY: 5.1,
          utilization: 0.75,
          tvl: 32_000_000,
          totalSupply: 42_666_667,
          totalBorrow: 32_000_000,
          rewardAPY: 0.4,
        },
      },
      {
        type: "compound_v3",
        name: "compound",
        poolId: "ARB-COMP-USDC",
        usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        rateModel: { baseRate: 0.008, slope1: 0.038, slope2: 0.72, kink: 0.85 },
        baseData: {
          baseAPY: 4.4,
          utilization: 0.73,
          tvl: 25_000_000,
          totalSupply: 34_246_575,
          totalBorrow: 25_000_000,
          rewardAPY: 0.3,
        },
      },
      {
        type: "morpho",
        name: "morpho",
        poolId: "ARB-MORPHO-USDC-001",
        usdcAddress: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
        rateModel: { baseRate: 0.012, slope1: 0.045, slope2: 0.78, kink: 0.82 },
        baseData: {
          baseAPY: 5.6,
          utilization: 0.79,
          tvl: 8_000_000,
          totalSupply: 10_126_582,
          totalBorrow: 8_000_000,
          rewardAPY: 0.2,
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
