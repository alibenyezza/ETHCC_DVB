import { AgentConfig } from "../core/AgentConfig";

export function createWorldChainConfig(): AgentConfig {
  return {
    chain: "WORLD",
    chainId: 4801,
    rpc: process.env.WORLD_TESTNET_RPC || "https://worldchain-sepolia.g.alchemy.com/public",
    privateKey: process.env.AGENT_WORLD_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "WORLD-AAVE-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.012, slope1: 0.045, slope2: 0.78, kink: 0.80 },
        baseData: {
          baseAPY: 5.5,
          utilization: 0.78,
          tvl: 12_000_000,
          totalSupply: 15_384_615,
          totalBorrow: 12_000_000,
          rewardAPY: 1.0,
        },
      },
      {
        type: "morpho",
        name: "morpho",
        poolId: "WORLD-MORPHO-USDC-001",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.014, slope1: 0.048, slope2: 0.80, kink: 0.84 },
        baseData: {
          baseAPY: 6.8,
          utilization: 0.82,
          tvl: 5_000_000,
          totalSupply: 6_097_561,
          totalBorrow: 5_000_000,
          rewardAPY: 0.5,
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
