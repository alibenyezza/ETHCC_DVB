import { AgentConfig } from "../core/AgentConfig";

export function createUnichainConfig(): AgentConfig {
  return {
    chain: "UNICHAIN",
    chainId: 1301,
    rpc: process.env.UNICHAIN_TESTNET_RPC || "https://sepolia.unichain.org",
    privateKey: process.env.AGENT_UNICHAIN_PRIVATE_KEY || "",
    protocols: [
      {
        type: "compound_v3",
        name: "uniswap-lending",
        poolId: "UNI-LENDING-USDC",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.01, slope1: 0.04, slope2: 0.72, kink: 0.82 },
        baseData: {
          baseAPY: 4.7,
          utilization: 0.76,
          tvl: 25_000_000,
          totalSupply: 32_894_737,
          totalBorrow: 25_000_000,
          rewardAPY: 0.8,
        },
      },
      {
        type: "morpho",
        name: "morpho",
        poolId: "UNI-MORPHO-USDC-001",
        usdcAddress: "0x0000000000000000000000000000000000000000",
        rateModel: { baseRate: 0.013, slope1: 0.048, slope2: 0.80, kink: 0.84 },
        baseData: {
          baseAPY: 5.9,
          utilization: 0.81,
          tvl: 8_000_000,
          totalSupply: 9_876_543,
          totalBorrow: 8_000_000,
          rewardAPY: 0.4,
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
