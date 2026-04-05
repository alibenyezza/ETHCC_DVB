import { AgentConfig } from "../core/AgentConfig";

export function createAvalancheConfig(): AgentConfig {
  return {
    chain: "AVAX",
    chainId: 43113,
    rpc: process.env.AVAX_FUJI_RPC || "https://api.avax-test.network/ext/bc/C/rpc",
    privateKey: process.env.AGENT_AVAX_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "AVAX-AAVE-USDC",
        usdcAddress: "0x6a17716Ce178e84835cfA73AbdB71cb455032456",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 },
        baseData: {
          baseAPY: 4.8,
          utilization: 0.77,
          tvl: 22_000_000,
          totalSupply: 28_571_429,
          totalBorrow: 22_000_000,
          rewardAPY: 0.3,
        },
      },
      {
        type: "compound_v3",
        name: "benqi",
        poolId: "AVAX-BENQI-USDC",
        usdcAddress: "0x6a17716Ce178e84835cfA73AbdB71cb455032456",
        rateModel: { baseRate: 0.01, slope1: 0.038, slope2: 0.72, kink: 0.82 },
        baseData: {
          baseAPY: 5.3,
          utilization: 0.80,
          tvl: 35_000_000,
          totalSupply: 43_750_000,
          totalBorrow: 35_000_000,
          rewardAPY: 0.9,
        },
      },
      {
        type: "compound_v3",
        name: "compound",
        poolId: "AVAX-COMP-USDC",
        usdcAddress: "0x6a17716Ce178e84835cfA73AbdB71cb455032456",
        rateModel: { baseRate: 0.008, slope1: 0.035, slope2: 0.70, kink: 0.85 },
        baseData: {
          baseAPY: 3.6,
          utilization: 0.70,
          tvl: 18_000_000,
          totalSupply: 25_714_286,
          totalBorrow: 18_000_000,
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
