import { AgentConfig } from "../core/AgentConfig";

export function createSonicConfig(): AgentConfig {
  return {
    chain: "SONIC",
    chainId: 64165,
    rpc: process.env.SONIC_TESTNET_RPC || "https://rpc.testnet.soniclabs.com",
    privateKey: process.env.AGENT_SONIC_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "SONIC-AAVE-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.012, slope1: 0.045, slope2: 0.78, kink: 0.80 },
        baseData: {
          baseAPY: 6.5,
          utilization: 0.80,
          tvl: 10_000_000,
          totalSupply: 12_500_000,
          totalBorrow: 10_000_000,
          rewardAPY: 1.5,
        },
      },
      {
        type: "compound_v3",
        name: "silo",
        poolId: "SONIC-SILO-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.015, slope1: 0.05, slope2: 0.82, kink: 0.83 },
        baseData: {
          baseAPY: 8.1,
          utilization: 0.85,
          tvl: 6_000_000,
          totalSupply: 7_058_824,
          totalBorrow: 6_000_000,
          rewardAPY: 2.0,
        },
      },
      {
        type: "compound_v3",
        name: "sparkdex",
        poolId: "SONIC-SPARK-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.011, slope1: 0.042, slope2: 0.75, kink: 0.81 },
        baseData: {
          baseAPY: 5.4,
          utilization: 0.77,
          tvl: 4_000_000,
          totalSupply: 5_194_805,
          totalBorrow: 4_000_000,
          rewardAPY: 1.8,
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
