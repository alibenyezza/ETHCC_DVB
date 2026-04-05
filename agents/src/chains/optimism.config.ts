import { AgentConfig } from "../core/AgentConfig";

export function createOptimismConfig(): AgentConfig {
  return {
    chain: "OP",
    chainId: 11155420,
    rpc: process.env.OP_SEPOLIA_RPC || "https://sepolia.optimism.io",
    privateKey: process.env.AGENT_OP_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "OP-AAVE-USDC",
        usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.75, kink: 0.80 },
        baseData: {
          baseAPY: 3.9,
          utilization: 0.74,
          tvl: 28_000_000,
          totalSupply: 37_837_838,
          totalBorrow: 28_000_000,
          rewardAPY: 0.5,
        },
      },
      {
        type: "compound_v3",
        name: "sonne",
        poolId: "OP-SONNE-USDC",
        usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        rateModel: { baseRate: 0.012, slope1: 0.042, slope2: 0.68, kink: 0.82 },
        baseData: {
          baseAPY: 4.5,
          utilization: 0.76,
          tvl: 15_000_000,
          totalSupply: 19_736_842,
          totalBorrow: 15_000_000,
          rewardAPY: 0.8,
        },
      },
      {
        type: "morpho",
        name: "morpho",
        poolId: "OP-MORPHO-USDC-001",
        usdcAddress: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
        rateModel: { baseRate: 0.013, slope1: 0.045, slope2: 0.78, kink: 0.83 },
        baseData: {
          baseAPY: 5.2,
          utilization: 0.79,
          tvl: 6_000_000,
          totalSupply: 7_594_937,
          totalBorrow: 6_000_000,
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
