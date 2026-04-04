import { AgentConfig } from "../core/AgentConfig";

export function createInkConfig(): AgentConfig {
  return {
    chain: "INK",
    chainId: 763373,
    rpc: process.env.INK_TESTNET_RPC || "https://rpc-gel-sepolia.inkonchain.com",
    privateKey: process.env.AGENT_INK_PRIVATE_KEY || "",
    protocols: [
      {
        type: "compound_v3",
        name: "ink-lending",
        poolId: "INK-LENDING-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.014, slope1: 0.048, slope2: 0.80, kink: 0.83 },
        baseData: {
          baseAPY: 6.2,
          utilization: 0.80,
          tvl: 3_500_000,
          totalSupply: 4_375_000,
          totalBorrow: 3_500_000,
          rewardAPY: 1.8,
        },
      },
      {
        type: "morpho",
        name: "morpho",
        poolId: "INK-MORPHO-USDC-001",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.013, slope1: 0.046, slope2: 0.78, kink: 0.84 },
        baseData: {
          baseAPY: 7.1,
          utilization: 0.83,
          tvl: 2_000_000,
          totalSupply: 2_409_639,
          totalBorrow: 2_000_000,
          rewardAPY: 0.8,
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
