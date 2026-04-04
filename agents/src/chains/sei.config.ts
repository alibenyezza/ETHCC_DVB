import { AgentConfig } from "../core/AgentConfig";

export function createSeiConfig(): AgentConfig {
  return {
    chain: "SEI",
    chainId: 713715,
    rpc: process.env.SEI_TESTNET_RPC || "https://evm-rpc-testnet.sei-apis.com",
    privateKey: process.env.AGENT_SEI_PRIVATE_KEY || "",
    protocols: [
      {
        type: "compound_v3",
        name: "yei-finance",
        poolId: "SEI-YEI-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.015, slope1: 0.05, slope2: 0.82, kink: 0.82 },
        baseData: {
          baseAPY: 7.5,
          utilization: 0.83,
          tvl: 4_000_000,
          totalSupply: 4_819_277,
          totalBorrow: 4_000_000,
          rewardAPY: 2.2,
        },
      },
      {
        type: "compound_v3",
        name: "takara",
        poolId: "SEI-TAKARA-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.012, slope1: 0.045, slope2: 0.78, kink: 0.81 },
        baseData: {
          baseAPY: 5.8,
          utilization: 0.79,
          tvl: 3_000_000,
          totalSupply: 3_797_468,
          totalBorrow: 3_000_000,
          rewardAPY: 1.5,
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
