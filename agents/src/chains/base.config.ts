import { AgentConfig } from "../core/AgentConfig";

export function createBaseConfig(): AgentConfig {
  return {
    chain: "BASE",
    chainId: 84532,
    rpc: process.env.BASE_SEPOLIA_RPC || "https://sepolia.base.org",
    privateKey: process.env.AGENT_BASE_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "BASE-AAVE-USDC",
        usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 },
        baseData: {
          baseAPY: 4.2,
          utilization: 0.78,
          tvl: 45_000_000,
          totalSupply: 57_692_308,
          totalBorrow: 45_000_000,
          rewardAPY: 0,
        },
      },
      {
        type: "morpho",
        name: "morpho",
        poolId: "BASE-MORPHO-USDC-001",
        usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        rateModel: { baseRate: 0.015, slope1: 0.05, slope2: 0.80, kink: 0.85 },
        baseData: {
          baseAPY: 6.8,
          utilization: 0.82,
          tvl: 12_000_000,
          totalSupply: 14_634_146,
          totalBorrow: 12_000_000,
          rewardAPY: 0.3,
        },
      },
      {
        type: "compound_v3",
        name: "compound",
        poolId: "BASE-COMP-USDC",
        usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        rateModel: { baseRate: 0.008, slope1: 0.035, slope2: 0.70, kink: 0.85 },
        baseData: {
          baseAPY: 3.8,
          utilization: 0.71,
          tvl: 38_000_000,
          totalSupply: 53_521_127,
          totalBorrow: 38_000_000,
          rewardAPY: 0.2,
        },
      },
      {
        type: "moonwell",
        name: "moonwell",
        poolId: "BASE-MOON-USDC",
        usdcAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.65, kink: 0.80 },
        baseData: {
          baseAPY: 4.1,
          utilization: 0.68,
          tvl: 8_000_000,
          totalSupply: 11_764_706,
          totalBorrow: 8_000_000,
          rewardAPY: 1.3,
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
