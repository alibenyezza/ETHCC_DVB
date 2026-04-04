import { AgentConfig } from "../core/AgentConfig";

export function createEthereumConfig(): AgentConfig {
  return {
    chain: "ETH",
    chainId: 11155111,
    rpc: process.env.ETH_SEPOLIA_RPC || "https://rpc.sepolia.org",
    privateKey: process.env.AGENT_ETH_PRIVATE_KEY || "",
    protocols: [
      {
        type: "aave_v3",
        name: "aave",
        poolId: "ETH-AAVE-USDC",
        usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        rateModel: { baseRate: 0.01, slope1: 0.035, slope2: 0.75, kink: 0.80 },
        baseData: {
          baseAPY: 3.2,
          utilization: 0.81,
          tvl: 120_000_000,
          totalSupply: 148_148_148,
          totalBorrow: 120_000_000,
          rewardAPY: 0,
        },
      },
      {
        type: "compound_v3",
        name: "compound",
        poolId: "ETH-COMP-USDC",
        usdcAddress: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        rateModel: { baseRate: 0.008, slope1: 0.032, slope2: 0.70, kink: 0.85 },
        baseData: {
          baseAPY: 2.8,
          utilization: 0.69,
          tvl: 85_000_000,
          totalSupply: 123_188_406,
          totalBorrow: 85_000_000,
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
